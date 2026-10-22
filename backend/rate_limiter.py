import os
import time
import random
import ipaddress
from typing import Optional, Tuple
from fastapi import Request, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

import models
from auth import verify_password

# Thresholds & Windows
MAX_FAILED_ACCOUNT_ATTEMPTS = 5
ACCOUNT_LOCKOUT_WINDOW = 300.0  # 5 minutes

MAX_IP_LOGIN_ATTEMPTS = 60  # per minute
IP_LOGIN_WINDOW = 60.0      # 1 minute

MAX_REGISTRATIONS_PER_IP = 10  # per minute
REGISTRATION_WINDOW = 60.0     # 1 minute

MAX_ATTEMPT_CREATES_PER_USER = 10  # per minute
ATTEMPT_CREATE_WINDOW = 60.0       # 1 minute

MAX_SYNC_PER_ATTEMPT = 120  # per minute (2 req/sec)
SYNC_WINDOW = 60.0          # 1 minute

MAX_SNAPSHOT_UPLOADS_PER_ATTEMPT = 15  # per minute
SNAPSHOT_UPLOAD_WINDOW = 60.0         # 1 minute

RETENTION_SECONDS = 3600.0  # 1 hour event retention


def is_ip_trusted(ip_str: str) -> bool:
    """Check if an upstream proxy IP is trusted to supply forwarded headers."""
    if not ip_str:
        return False
    if ip_str in ("testclient", "localhost"):
        return True
    try:
        addr = ipaddress.ip_address(ip_str)
    except ValueError:
        return False

    trusted_env = os.getenv("TRUSTED_PROXIES")
    if trusted_env is not None:
        if trusted_env.strip().lower() in ("none", "false", "0"):
            return False
        trusted_list = [item.strip() for item in trusted_env.split(",") if item.strip()]
        for item in trusted_list:
            try:
                net = ipaddress.ip_network(item, strict=False)
                if addr in net:
                    return True
            except ValueError:
                if str(addr) == item:
                    return True
        return False

    # Default: trust loopback and private container/reverse proxy networks
    return addr.is_loopback or addr.is_private


def get_client_ip(request: Optional[Request] = None) -> str:
    """Safely extract client IP address from request, respecting trusted proxies.
    Arbitrary client-supplied forwarding headers from untrusted connections are ignored.
    """
    if request is None:
        return "127.0.0.1"
    peer_ip = request.client.host if (hasattr(request, "client") and request.client) else "127.0.0.1"

    # If immediate peer is not a trusted proxy, use peer socket IP directly
    if not is_ip_trusted(peer_ip):
        return peer_ip

    # If peer is a trusted proxy, inspect trusted headers:
    # 1. Single client headers set by Render or Cloudflare
    for header in ("True-Client-IP", "CF-Connecting-IP"):
        val = request.headers.get(header)
        if val:
            val = val.strip()
            try:
                ipaddress.ip_address(val)
                return val
            except ValueError:
                pass

    # 2. X-Forwarded-For: <client>, <proxy1>, <proxy2>...
    xff = request.headers.get("X-Forwarded-For")
    if xff:
        ips = [ip.strip() for ip in xff.split(",") if ip.strip()]
        # Traverse right-to-left to find first untrusted IP
        for ip in reversed(ips):
            if not is_ip_trusted(ip):
                try:
                    ipaddress.ip_address(ip)
                    return ip
                except ValueError:
                    continue
        if ips:
            try:
                ipaddress.ip_address(ips[0])
                return ips[0]
            except ValueError:
                pass

    return peer_ip


def normalize_identifier(identifier: Optional[str]) -> str:
    """Normalize user identifier (email or student number) consistently."""
    if not identifier:
        return ""
    return identifier.strip().lower()


def resolve_user_and_account_key(identifier: str, db: Session) -> Tuple[Optional[models.User], str]:
    """Resolve normalized identifier to canonical user and rate-limiting key.
    Ensures email casing and student-number aliases map to the same account-level key.
    """
    norm = normalize_identifier(identifier)
    if not norm:
        return None, "anon:empty"

    # 1. Look up by email (case-insensitive)
    user = db.query(models.User).filter(func.lower(models.User.email) == norm).first()

    # 2. Look up by studentNumber (case-insensitive)
    if not user:
        student_profile = db.query(models.StudentProfile).filter(
            func.lower(models.StudentProfile.studentNumber) == norm
        ).first()
        if student_profile and student_profile.user:
            user = student_profile.user

    if user:
        return user, f"account:{user.id}"
    return None, f"anon:{norm}"


def record_event(db: Session, key: str, scope: str, timestamp: Optional[float] = None) -> models.RateLimitEvent:
    """Record a rate limit event atomically in the database."""
    ts = timestamp if timestamp is not None else time.time()
    event = models.RateLimitEvent(
        id=models.generate_uuid("rle-"),
        key=key,
        scope=scope,
        timestamp=ts,
        createdAt=models.get_utc_now()
    )
    db.add(event)
    db.commit()

    # Bounded storage: opportunistic cleanup of old expired records (~2% of writes)
    if random.random() < 0.02:
        try:
            cleanup_old_events(db)
        except Exception:
            pass

    return event


def count_recent_events(
    db: Session,
    key: str,
    scope: str,
    window_seconds: float,
    now: Optional[float] = None
) -> int:
    """Count events for a specific key and scope within a sliding time window."""
    current_time = now if now is not None else time.time()
    cutoff = current_time - window_seconds
    count = db.query(func.count(models.RateLimitEvent.id)).filter(
        models.RateLimitEvent.scope == scope,
        models.RateLimitEvent.key == key,
        models.RateLimitEvent.timestamp >= cutoff
    ).scalar()
    return count or 0


def clear_events(db: Session, key: str, scope: str) -> int:
    """Clear all events for a key and scope (e.g. after successful authentication)."""
    deleted = db.query(models.RateLimitEvent).filter(
        models.RateLimitEvent.scope == scope,
        models.RateLimitEvent.key == key
    ).delete(synchronize_session=False)
    db.commit()
    return deleted


def cleanup_old_events(
    db: Session,
    retention_seconds: float = RETENTION_SECONDS,
    now: Optional[float] = None
) -> int:
    """Prune expired records older than retention period to enforce bounded storage."""
    current_time = now if now is not None else time.time()
    cutoff = current_time - retention_seconds
    deleted = db.query(models.RateLimitEvent).filter(
        models.RateLimitEvent.timestamp < cutoff
    ).delete(synchronize_session=False)
    db.commit()
    return deleted


# Precomputed constant bcrypt hash for timing-attack / user-enumeration mitigation
DUMMY_BCRYPT_HASH = "$2b$12$e8w.K2K6QeMv/e1hZq6j4.l8jFhU1h.f7b8m9m4.8eGgY4c5d6e7"


def handle_login_attempt(
    request: Request,
    db: Session,
    identifier: str,
    password: str
) -> models.User:
    """Authenticate a login attempt under normalized account and aggregate IP rate limiting.

    Policy:
    1. Check aggregate IP velocity: Max 60 login requests/min per client IP.
    2. Resolve canonical user & account key (casing and aliases point to same key).
    3. Check recent failures for account key.
    4. If account has >= 5 failures within 300s:
       - If correct password is provided, allow login and clear failed count (legitimate user is never DoS'd).
       - If incorrect password is provided, reject with HTTP 429 (blocking attacker brute force).
    5. If account has < 5 failures:
       - If correct password is provided, allow login and clear failed count.
       - If incorrect password is provided, record failure and reject with HTTP 401.
    6. Non-existent accounts perform dummy verification and identical throttling to prevent enumeration.
    """
    client_ip = get_client_ip(request)

    # 1. Aggregate IP velocity check (protects against high-velocity brute force and password sprays)
    ip_attempts = count_recent_events(
        db,
        key=f"ip:{client_ip}",
        scope="login_ip",
        window_seconds=IP_LOGIN_WINDOW
    )
    if ip_attempts >= MAX_IP_LOGIN_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts from this network. Please try again in a few moments."
        )

    # 2. Resolve canonical account key
    user, account_key = resolve_user_and_account_key(identifier, db)

    # 3. Check account recent failure count
    account_failures = count_recent_events(
        db,
        key=account_key,
        scope="login_account",
        window_seconds=ACCOUNT_LOCKOUT_WINDOW
    )

    # 4. Verify password
    if user:
        is_valid_pwd = verify_password(password, user.password_hash)
    else:
        # Run dummy verification to ensure identical execution timing
        verify_password(password, DUMMY_BCRYPT_HASH)
        is_valid_pwd = False

    # 5. Evaluate policy
    if account_failures >= MAX_FAILED_ACCOUNT_ATTEMPTS:
        if is_valid_pwd and user:
            # Valid credentials supplied: authenticate legitimate user and reset failures
            clear_events(db, key=account_key, scope="login_account")
            user_status = (user.status or "active").strip().lower()
            if user_status != "active":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Account is inactive, suspended, or archived. Please contact your administrator."
                )
            user.lastLoginAt = models.get_utc_now()
            db.commit()
            return user
        else:
            # Invalid credentials while locked: block attacker with HTTP 429
            record_event(db, key=f"ip:{client_ip}", scope="login_ip")
            record_event(db, key=account_key, scope="login_account")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many failed login attempts. Please try again in a few moments."
            )
    else:
        if is_valid_pwd and user:
            clear_events(db, key=account_key, scope="login_account")
            user_status = (user.status or "active").strip().lower()
            if user_status != "active":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Account is inactive, suspended, or archived. Please contact your administrator."
                )
            user.lastLoginAt = models.get_utc_now()
            db.commit()
            return user
        else:
            # Record failed attempt under account and IP
            record_event(db, key=f"ip:{client_ip}", scope="login_ip")
            record_event(db, key=account_key, scope="login_account")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )


def check_registration_rate_limit(request: Request, db: Session):
    """Rate limit student registration: Max 10 registrations per minute per IP."""
    client_ip = get_client_ip(request)
    recent = count_recent_events(
        db,
        key=f"ip:{client_ip}",
        scope="register_ip",
        window_seconds=REGISTRATION_WINDOW
    )
    if recent >= MAX_REGISTRATIONS_PER_IP:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many registration attempts from this network. Please try again later."
        )


def record_registration_event(request: Request, db: Session):
    """Record successful registration for IP rate limiting."""
    client_ip = get_client_ip(request)
    record_event(db, key=f"ip:{client_ip}", scope="register_ip")


def check_attempt_creation_rate_limit(user_id: str, db: Session):
    """Rate limit exam attempt creation: Max 10 attempt creations per minute per user."""
    recent = count_recent_events(
        db,
        key=f"user:{user_id}",
        scope="attempt_create",
        window_seconds=ATTEMPT_CREATE_WINDOW
    )
    if recent >= MAX_ATTEMPT_CREATES_PER_USER:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many attempt creation requests. Please wait a moment before starting another attempt."
        )


def record_attempt_creation_event(user_id: str, db: Session):
    """Record attempt creation event."""
    record_event(db, key=f"user:{user_id}", scope="attempt_create")


def check_sync_answer_rate_limit(attempt_id: str, db: Session):
    """Rate limit telemetry answer synchronization: Max 120 syncs per minute per attempt.
    Allows rapid legitimate exam answers/telemetry while preventing automated flood DoS.
    """
    recent = count_recent_events(
        db,
        key=f"attempt:{attempt_id}",
        scope="sync_answer",
        window_seconds=SYNC_WINDOW
    )
    if recent >= MAX_SYNC_PER_ATTEMPT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Sync rate limit exceeded. Please wait a moment before syncing again."
        )
    record_event(db, key=f"attempt:{attempt_id}", scope="sync_answer")


def check_snapshot_upload_rate_limit(attempt_id: str, db: Session):
    """Rate limit snapshot uploads: Max 15 uploads per minute per attempt.
    Permits rapid legitimate proctoring triggers while preventing automated flood DoS.
    """
    recent = count_recent_events(
        db,
        key=f"attempt:{attempt_id}",
        scope="snapshot_upload",
        window_seconds=SNAPSHOT_UPLOAD_WINDOW
    )
    if recent >= MAX_SNAPSHOT_UPLOADS_PER_ATTEMPT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Snapshot upload rate limit exceeded. Please wait a moment before uploading another snapshot."
        )
    record_event(db, key=f"attempt:{attempt_id}", scope="snapshot_upload")

