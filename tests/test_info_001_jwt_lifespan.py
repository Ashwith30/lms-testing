"""
Automated Verification Test Suite for INFO-01:
Configurable JWT Lifespan and Token-Expiry Handling

Covers:
1. Configuration Validation & Lifespan Logic (get_access_token_expire_minutes):
   - Missing environment variable falls back to default 24h (1440 minutes).
   - Empty or whitespace environment variable falls back to default 24h.
   - Valid integer inputs within range [5, 43200] return the configured integer.
   - Non-integer / malformed values safely fall back to default with warning.
   - Zero, negative, and out-of-range values (< 5 or > 43200) safely fall back to default with warning.
   - Boundary tests for minimum (5m) and maximum (43200m / 30d).

2. JWT Claims Generation & Algorithm (create_access_token):
   - Generated tokens contain exp, iat, and nbf claims.
   - iat and nbf reflect generation time.
   - exp claim is correctly computed based on configured lifespan (default or custom).
   - Backward-compatible expires_delta parameter is respected when provided.
   - Alg header is strictly HS256.

3. Protected Endpoint Authentication (get_current_user):
   - Valid token returns HTTP 200 with user data.
   - Expired token returns HTTP 401 with detail 'Token has expired' and RFC 6750 WWW-Authenticate header.
   - Malformed token returns HTTP 401 with detail 'Could not validate credentials' and RFC 6750 header.
   - Tampered token (wrong secret key) returns HTTP 401 with detail 'Could not validate credentials' and RFC 6750 header.
   - Missing subject ('sub') token returns HTTP 401 with detail 'Could not validate credentials' and RFC 6750 header.
   - Premature token (nbf in future) returns HTTP 401.
   - Non-existent user id in token returns HTTP 401.
   - Disabled/inactive user returns HTTP 403.
   - Missing credentials return HTTP 401.

4. Snapshot Endpoint Authentication (get_snapshot_auth_user):
   - Valid token via Bearer header or query param passes authentication.
   - Expired token returns HTTP 401 with detail 'Token has expired' and RFC 6750 WWW-Authenticate header.
   - Malformed token returns HTTP 401 with detail 'Could not validate credentials' and RFC 6750 header.
   - Tampered token returns HTTP 401 with detail 'Could not validate credentials' and RFC 6750 header.
   - Missing subject token returns HTTP 401 with detail 'Could not validate credentials' and RFC 6750 header.
   - Missing credentials return HTTP 401 with detail 'Authentication credentials required'.
"""
import os
import sys
import time
import socket
import datetime
import tempfile
import threading
import requests
import uvicorn
import jwt
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

# Setup backend import path
_curr_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(_curr_dir, "backend") if os.path.exists(os.path.join(_curr_dir, "backend")) else os.path.abspath(os.path.join(_curr_dir, "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import models
from database import get_db
from main import app
from auth import (
    SECRET_KEY,
    ALGORITHM,
    DEFAULT_ACCESS_TOKEN_EXPIRE_MINUTES,
    MIN_ACCESS_TOKEN_EXPIRE_MINUTES,
    MAX_ACCESS_TOKEN_EXPIRE_MINUTES,
    get_access_token_expire_minutes,
    create_access_token,
    hash_password,
)


def find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]


def run_tests():
    print("==================================================================")
    print("RUNNING COMPREHENSIVE INFO-01 JWT LIFESPAN & EXPIRY TEST SUITE")
    print("==================================================================")

    # Preserve initial environment
    orig_env = os.environ.get("JWT_ACCESS_TOKEN_EXPIRE_MINUTES")

    total_tests = 0
    passed_tests = 0

    def assert_true(condition: bool, description: str):
        nonlocal total_tests, passed_tests
        total_tests += 1
        if condition:
            passed_tests += 1
            print(f"  [PASS] {description}")
        else:
            print(f"  [FAIL] {description}")
            raise AssertionError(f"Test failed: {description}")

    try:
        # =============================================================
        # SECTION 1: Configuration Validation & Lifespan Logic
        # =============================================================
        print("\n--- SECTION 1: Configuration Validation & Lifespan Logic ---")

        # 1.1 Absent env var -> default 1440
        if "JWT_ACCESS_TOKEN_EXPIRE_MINUTES" in os.environ:
            del os.environ["JWT_ACCESS_TOKEN_EXPIRE_MINUTES"]
        assert_true(
            get_access_token_expire_minutes() == DEFAULT_ACCESS_TOKEN_EXPIRE_MINUTES,
            f"Absent env var returns default {DEFAULT_ACCESS_TOKEN_EXPIRE_MINUTES} minutes (24h)"
        )

        # 1.2 Empty or whitespace env var -> default 1440
        os.environ["JWT_ACCESS_TOKEN_EXPIRE_MINUTES"] = ""
        assert_true(
            get_access_token_expire_minutes() == DEFAULT_ACCESS_TOKEN_EXPIRE_MINUTES,
            "Empty string env var returns default 1440 minutes"
        )
        os.environ["JWT_ACCESS_TOKEN_EXPIRE_MINUTES"] = "   "
        assert_true(
            get_access_token_expire_minutes() == DEFAULT_ACCESS_TOKEN_EXPIRE_MINUTES,
            "Whitespace string env var returns default 1440 minutes"
        )

        # 1.3 Valid custom integer values
        os.environ["JWT_ACCESS_TOKEN_EXPIRE_MINUTES"] = "60"
        assert_true(get_access_token_expire_minutes() == 60, "Configured '60' returns 60 minutes")

        os.environ["JWT_ACCESS_TOKEN_EXPIRE_MINUTES"] = "  120  "
        assert_true(get_access_token_expire_minutes() == 120, "Configured '  120  ' with whitespace returns 120 minutes")

        os.environ["JWT_ACCESS_TOKEN_EXPIRE_MINUTES"] = "10080"
        assert_true(get_access_token_expire_minutes() == 10080, "Configured 7 days ('10080') returns 10080 minutes")

        # 1.4 Boundary values
        os.environ["JWT_ACCESS_TOKEN_EXPIRE_MINUTES"] = str(MIN_ACCESS_TOKEN_EXPIRE_MINUTES)
        assert_true(
            get_access_token_expire_minutes() == MIN_ACCESS_TOKEN_EXPIRE_MINUTES,
            f"Lower bound '{MIN_ACCESS_TOKEN_EXPIRE_MINUTES}' returns minimum valid minutes"
        )

        os.environ["JWT_ACCESS_TOKEN_EXPIRE_MINUTES"] = str(MAX_ACCESS_TOKEN_EXPIRE_MINUTES)
        assert_true(
            get_access_token_expire_minutes() == MAX_ACCESS_TOKEN_EXPIRE_MINUTES,
            f"Upper bound '{MAX_ACCESS_TOKEN_EXPIRE_MINUTES}' returns maximum valid minutes (30 days)"
        )

        # 1.5 Malformed integer values (fall back safely to default)
        os.environ["JWT_ACCESS_TOKEN_EXPIRE_MINUTES"] = "invalid_string"
        assert_true(
            get_access_token_expire_minutes() == DEFAULT_ACCESS_TOKEN_EXPIRE_MINUTES,
            "Non-numeric string 'invalid_string' safely falls back to default 1440 minutes"
        )

        os.environ["JWT_ACCESS_TOKEN_EXPIRE_MINUTES"] = "12.5"
        assert_true(
            get_access_token_expire_minutes() == DEFAULT_ACCESS_TOKEN_EXPIRE_MINUTES,
            "Float string '12.5' safely falls back to default 1440 minutes"
        )

        os.environ["JWT_ACCESS_TOKEN_EXPIRE_MINUTES"] = "60mins"
        assert_true(
            get_access_token_expire_minutes() == DEFAULT_ACCESS_TOKEN_EXPIRE_MINUTES,
            "String with unit suffix '60mins' safely falls back to default 1440 minutes"
        )

        # 1.6 Zero, negative, and out-of-range values
        os.environ["JWT_ACCESS_TOKEN_EXPIRE_MINUTES"] = "0"
        assert_true(
            get_access_token_expire_minutes() == DEFAULT_ACCESS_TOKEN_EXPIRE_MINUTES,
            "Zero ('0') is out-of-range (< 5) and safely falls back to default 1440 minutes"
        )

        os.environ["JWT_ACCESS_TOKEN_EXPIRE_MINUTES"] = "-30"
        assert_true(
            get_access_token_expire_minutes() == DEFAULT_ACCESS_TOKEN_EXPIRE_MINUTES,
            "Negative value ('-30') is out-of-range and safely falls back to default 1440 minutes"
        )

        os.environ["JWT_ACCESS_TOKEN_EXPIRE_MINUTES"] = str(MIN_ACCESS_TOKEN_EXPIRE_MINUTES - 1)
        assert_true(
            get_access_token_expire_minutes() == DEFAULT_ACCESS_TOKEN_EXPIRE_MINUTES,
            f"Value below minimum ('{MIN_ACCESS_TOKEN_EXPIRE_MINUTES - 1}') safely falls back to default"
        )

        os.environ["JWT_ACCESS_TOKEN_EXPIRE_MINUTES"] = str(MAX_ACCESS_TOKEN_EXPIRE_MINUTES + 1)
        assert_true(
            get_access_token_expire_minutes() == DEFAULT_ACCESS_TOKEN_EXPIRE_MINUTES,
            f"Value above maximum ('{MAX_ACCESS_TOKEN_EXPIRE_MINUTES + 1}') safely falls back to default"
        )

        # =============================================================
        # SECTION 2: Claims Generation & Algorithm
        # =============================================================
        print("\n--- SECTION 2: Claims Generation & Algorithm ---")

        # 2.1 Default token claims
        del os.environ["JWT_ACCESS_TOKEN_EXPIRE_MINUTES"]
        before_gen = int(datetime.datetime.now(datetime.timezone.utc).timestamp())
        token_def = create_access_token({"sub": "user-test-1", "role": "student"})
        after_gen = int(datetime.datetime.now(datetime.timezone.utc).timestamp())

        # Check algorithm in header
        unverified_header = jwt.get_unverified_header(token_def)
        assert_true(unverified_header.get("alg") == "HS256", "Token header specifies alg='HS256'")
        assert_true(unverified_header.get("typ") == "JWT", "Token header specifies typ='JWT'")

        # Decode token
        payload_def = jwt.decode(token_def, SECRET_KEY, algorithms=["HS256"])
        assert_true("exp" in payload_def, "Token contains 'exp' claim")
        assert_true("iat" in payload_def, "Token contains 'iat' claim")
        assert_true("nbf" in payload_def, "Token contains 'nbf' claim")
        assert_true(payload_def.get("sub") == "user-test-1", "Token preserves 'sub' claim")
        assert_true(payload_def.get("role") == "student", "Token preserves 'role' claim")

        # Verify claim timestamps
        iat = payload_def["iat"]
        nbf = payload_def["nbf"]
        exp = payload_def["exp"]
        assert_true(before_gen <= iat <= after_gen + 1, "Token 'iat' is current timestamp")
        assert_true(nbf == iat, "Token 'nbf' matches 'iat' timestamp")
        assert_true(exp - iat == DEFAULT_ACCESS_TOKEN_EXPIRE_MINUTES * 60, f"Token lifespan matches default {DEFAULT_ACCESS_TOKEN_EXPIRE_MINUTES} minutes")

        # 2.2 Custom environment variable lifespan in created token
        os.environ["JWT_ACCESS_TOKEN_EXPIRE_MINUTES"] = "90"
        t_custom = create_access_token({"sub": "user-custom", "role": "trainer"})
        p_custom = jwt.decode(t_custom, SECRET_KEY, algorithms=["HS256"])
        assert_true(
            p_custom["exp"] - p_custom["iat"] == 90 * 60,
            "create_access_token dynamically honours configured 90-minute lifespan"
        )

        # 2.3 Explicit expires_delta compatibility
        t_delta = create_access_token(
            {"sub": "user-delta", "role": "admin"},
            expires_delta=datetime.timedelta(minutes=15)
        )
        p_delta = jwt.decode(t_delta, SECRET_KEY, algorithms=["HS256"])
        assert_true(
            p_delta["exp"] - p_delta["iat"] == 15 * 60,
            "create_access_token with expires_delta=15m overrides default lifespan"
        )

        # 2.4 Zero expires_delta produces expired/immediate token
        t_zero = create_access_token(
            {"sub": "user-zero", "role": "student"},
            expires_delta=datetime.timedelta(seconds=0)
        )
        p_zero = jwt.decode(t_zero, SECRET_KEY, algorithms=["HS256"], options={"verify_exp": False})
        assert_true(
            p_zero["exp"] == p_zero["iat"],
            "create_access_token with expires_delta=0 correctly produces exp == iat"
        )

        # Reset env
        if "JWT_ACCESS_TOKEN_EXPIRE_MINUTES" in os.environ:
            del os.environ["JWT_ACCESS_TOKEN_EXPIRE_MINUTES"]

        # =============================================================
        # SECTION 3: HTTP Endpoint Authentication & Protected Routes
        # =============================================================
        print("\n--- SECTION 3: HTTP Endpoint Authentication (get_current_user) ---")

        # Setup isolated database for testing
        with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
            test_db_path = tmp.name

        test_engine = create_engine(f"sqlite:///{test_db_path}", connect_args={"check_same_thread": False})

        @event.listens_for(test_engine, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

        models.Base.metadata.create_all(bind=test_engine)
        TestSession = sessionmaker(bind=test_engine)

        def override_get_db():
            db = TestSession()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db

        # Seed fixtures
        db = TestSession()
        user_active_id = "user-active-info01"
        user_active_role = "student"
        user_suspended_id = "user-suspended-info01"
        user_suspended_role = "student"
        user_trainer_id = "user-trainer-info01"
        user_trainer_role = "trainer"
        attempt_id = "att-info01"

        user_active = models.User(
            id=user_active_id,
            email="active_info01@lms.com",
            role=user_active_role,
            password_hash=hash_password("password123"),
            status="active"
        )
        user_suspended = models.User(
            id=user_suspended_id,
            email="suspended_info01@lms.com",
            role=user_suspended_role,
            password_hash=hash_password("password123"),
            status="suspended"
        )
        user_trainer = models.User(
            id=user_trainer_id,
            email="trainer_info01@lms.com",
            role=user_trainer_role,
            password_hash=hash_password("password123"),
            status="active"
        )
        db.add(user_active)
        db.add(user_suspended)
        db.add(user_trainer)

        course_obj = models.Course(id="course-info01", name="Course INFO01")
        db.add(course_obj)
        topic_obj = models.Topic(id="topic-info01", courseId=course_obj.id, name="Topic INFO01")
        db.add(topic_obj)
        db.flush()

        # Seed test attempt for snapshot route test
        test_obj = models.Test(
            id="test-info01",
            title="INFO-01 Test",
            authorId=user_trainer_id,
            topicId=topic_obj.id,
            status="published"
        )
        db.add(test_obj)
        db.flush()

        sched_obj = models.Schedule(
            id="sched-info01",
            testId=test_obj.id,
            startTime="2020-01-01T00:00:00Z",
            endTime="2030-12-31T23:59:59Z",
            durationMinutes=60,
            attemptsAllowed=5
        )
        db.add(sched_obj)
        db.flush()

        attempt_obj = models.Attempt(
            id=attempt_id,
            studentId=user_active_id,
            scheduleId=sched_obj.id,
            status="in_progress"
        )
        db.add(attempt_obj)

        db.commit()
        db.close()

        # Start background server
        port = find_free_port()
        server_config = uvicorn.Config(app, host="127.0.0.1", port=port, log_level="error")
        server = uvicorn.Server(server_config)
        server_thread = threading.Thread(target=server.run, daemon=True)
        server_thread.start()
        time.sleep(1.2)

        base_url = f"http://127.0.0.1:{port}/api"

        # 3.1 Valid token accesses protected endpoint
        valid_token = create_access_token({"sub": user_active_id, "role": user_active_role})
        r_valid = requests.get(
            f"{base_url}/users/{user_active_id}",
            headers={"Authorization": f"Bearer {valid_token}"}
        )
        assert_true(r_valid.status_code == 200, f"Valid token returns HTTP 200 OK (got {r_valid.status_code})")
        assert_true(r_valid.json().get("id") == user_active_id, "Valid token returns user record")

        # 3.2 Expired token returns HTTP 401 with RFC 6750 WWW-Authenticate header
        expired_token = create_access_token(
            {"sub": user_active_id, "role": user_active_role},
            expires_delta=datetime.timedelta(minutes=-10)
        )
        r_exp = requests.get(
            f"{base_url}/users/{user_active_id}",
            headers={"Authorization": f"Bearer {expired_token}"}
        )
        assert_true(r_exp.status_code == 401, f"Expired token returns HTTP 401 Unauthorized (got {r_exp.status_code})")
        assert_true(r_exp.json().get("detail") == "Token has expired", "Expired token returns detail 'Token has expired'")
        www_auth = r_exp.headers.get("WWW-Authenticate", "")
        assert_true(
            'Bearer error="invalid_token"' in www_auth and 'The token has expired' in www_auth,
            f"Expired token includes RFC 6750 header: {www_auth}"
        )

        # 3.3 Malformed token string
        r_mal = requests.get(
            f"{base_url}/users/{user_active_id}",
            headers={"Authorization": "Bearer not-a-valid-jwt.token.here"}
        )
        assert_true(r_mal.status_code == 401, f"Malformed token returns HTTP 401 (got {r_mal.status_code})")
        assert_true(r_mal.json().get("detail") == "Could not validate credentials", "Malformed token returns generic credential error")
        www_auth_mal = r_mal.headers.get("WWW-Authenticate", "")
        assert_true(
            'Bearer error="invalid_token"' in www_auth_mal and 'Invalid authentication token' in www_auth_mal,
            f"Malformed token includes RFC 6750 header: {www_auth_mal}"
        )

        # 3.4 Tampered token (wrong secret key)
        tampered_token = jwt.encode(
            {
                "sub": user_active_id,
                "role": user_active_role,
                "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=1),
                "iat": datetime.datetime.now(datetime.timezone.utc),
                "nbf": datetime.datetime.now(datetime.timezone.utc),
            },
            "completely-wrong-secret-key-attacker",
            algorithm="HS256"
        )
        r_tamp = requests.get(
            f"{base_url}/users/{user_active_id}",
            headers={"Authorization": f"Bearer {tampered_token}"}
        )
        assert_true(r_tamp.status_code == 401, f"Tampered token returns HTTP 401 (got {r_tamp.status_code})")
        assert_true(r_tamp.json().get("detail") == "Could not validate credentials", "Tampered token returns generic credential error")
        assert_true('Bearer error="invalid_token"' in r_tamp.headers.get("WWW-Authenticate", ""), "Tampered token includes RFC 6750 header")

        # 3.5 Missing subject ('sub') claim
        no_sub_token = jwt.encode(
            {
                "role": "student",
                "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=1),
                "iat": datetime.datetime.now(datetime.timezone.utc),
                "nbf": datetime.datetime.now(datetime.timezone.utc),
            },
            SECRET_KEY,
            algorithm=ALGORITHM
        )
        r_nosub = requests.get(
            f"{base_url}/users/{user_active_id}",
            headers={"Authorization": f"Bearer {no_sub_token}"}
        )
        assert_true(r_nosub.status_code == 401, f"Missing-subject token returns HTTP 401 (got {r_nosub.status_code})")
        assert_true(r_nosub.json().get("detail") == "Could not validate credentials", "Missing-subject returns generic credential error")
        assert_true('Missing subject claim' in r_nosub.headers.get("WWW-Authenticate", ""), "Missing-subject has descriptive RFC 6750 header")

        # 3.6 Premature token (nbf in future)
        future_nbf_token = jwt.encode(
            {
                "sub": user_active_id,
                "role": user_active_role,
                "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=2),
                "iat": datetime.datetime.now(datetime.timezone.utc),
                "nbf": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=1),
            },
            SECRET_KEY,
            algorithm=ALGORITHM
        )
        r_premature = requests.get(
            f"{base_url}/users/{user_active_id}",
            headers={"Authorization": f"Bearer {future_nbf_token}"}
        )
        assert_true(r_premature.status_code == 401, f"Future nbf token returns HTTP 401 (got {r_premature.status_code})")

        # 3.7 Non-existent user id in subject
        ghost_token = create_access_token({"sub": "user-does-not-exist-9999", "role": "student"})
        r_ghost = requests.get(
            f"{base_url}/users/user-does-not-exist-9999",
            headers={"Authorization": f"Bearer {ghost_token}"}
        )
        assert_true(r_ghost.status_code == 401, f"Non-existent user token returns HTTP 401 (got {r_ghost.status_code})")

        # 3.8 Suspended/inactive user
        suspended_token = create_access_token({"sub": user_suspended_id, "role": user_suspended_role})
        r_susp = requests.get(
            f"{base_url}/users/{user_suspended_id}",
            headers={"Authorization": f"Bearer {suspended_token}"}
        )
        assert_true(r_susp.status_code == 403, f"Suspended account returns HTTP 403 Forbidden (got {r_susp.status_code})")

        # 3.9 Missing authorization header
        r_noauth = requests.get(f"{base_url}/users/{user_active_id}")
        assert_true(r_noauth.status_code == 401, f"Unauthenticated request returns HTTP 401 (got {r_noauth.status_code})")

        # =============================================================
        # SECTION 4: Snapshot Endpoint Authentication (get_snapshot_auth_user)
        # =============================================================
        print("\n--- SECTION 4: Snapshot Endpoint Authentication Consistency ---")

        snapshot_url = f"{base_url}/attempts/{attempt_id}/snapshots/snapshot-123.jpg"

        # 4.1 Valid Bearer token passes auth (reaches 404 for missing file rather than 401 auth error)
        r_snap_valid = requests.get(snapshot_url, headers={"Authorization": f"Bearer {valid_token}"})
        assert_true(
            r_snap_valid.status_code in (200, 404),
            f"Valid token passes snapshot authentication (got {r_snap_valid.status_code})"
        )

        # 4.2 Valid query parameter token passes auth
        r_snap_query = requests.get(f"{snapshot_url}?token={valid_token}")
        assert_true(
            r_snap_query.status_code in (200, 404),
            f"Valid query token passes snapshot authentication (got {r_snap_query.status_code})"
        )

        # 4.3 Expired token via Bearer header
        r_snap_exp = requests.get(snapshot_url, headers={"Authorization": f"Bearer {expired_token}"})
        assert_true(r_snap_exp.status_code == 401, f"Expired token on snapshot returns HTTP 401 (got {r_snap_exp.status_code})")
        assert_true(r_snap_exp.json().get("detail") == "Token has expired", "Snapshot expired token returns detail 'Token has expired'")
        assert_true(
            'Bearer error="invalid_token"' in r_snap_exp.headers.get("WWW-Authenticate", "") and
            'The token has expired' in r_snap_exp.headers.get("WWW-Authenticate", ""),
            "Snapshot expired token returns RFC 6750 header"
        )

        # 4.4 Expired token via query parameter
        r_snap_exp_query = requests.get(f"{snapshot_url}?token={expired_token}")
        assert_true(r_snap_exp_query.status_code == 401, f"Expired query token on snapshot returns HTTP 401 (got {r_snap_exp_query.status_code})")
        assert_true(r_snap_exp_query.json().get("detail") == "Token has expired", "Snapshot query expired token returns detail 'Token has expired'")

        # 4.5 Malformed token on snapshot
        r_snap_mal = requests.get(snapshot_url, headers={"Authorization": "Bearer bad.token.val"})
        assert_true(r_snap_mal.status_code == 401, f"Malformed token on snapshot returns HTTP 401 (got {r_snap_mal.status_code})")
        assert_true(r_snap_mal.json().get("detail") == "Could not validate credentials", "Snapshot malformed token returns generic error")

        # 4.6 Tampered token on snapshot
        r_snap_tamp = requests.get(snapshot_url, headers={"Authorization": f"Bearer {tampered_token}"})
        assert_true(r_snap_tamp.status_code == 401, f"Tampered token on snapshot returns HTTP 401 (got {r_snap_tamp.status_code})")
        assert_true(r_snap_tamp.json().get("detail") == "Could not validate credentials", "Snapshot tampered token returns generic error")

        # 4.7 Missing subject claim on snapshot
        r_snap_nosub = requests.get(snapshot_url, headers={"Authorization": f"Bearer {no_sub_token}"})
        assert_true(r_snap_nosub.status_code == 401, f"Missing subject on snapshot returns HTTP 401 (got {r_snap_nosub.status_code})")
        assert_true(r_snap_nosub.json().get("detail") == "Could not validate credentials", "Snapshot missing subject returns generic error")

        # 4.8 Missing credentials entirely on snapshot
        r_snap_none = requests.get(snapshot_url)
        assert_true(r_snap_none.status_code == 401, f"No credentials on snapshot returns HTTP 401 (got {r_snap_none.status_code})")
        assert_true(r_snap_none.json().get("detail") == "Authentication credentials required", "Snapshot without credentials returns required message")

        # Cleanup test db
        if os.path.exists(test_db_path):
            try:
                os.remove(test_db_path)
            except Exception:
                pass

        print("\n==================================================================")
        print(f"INFO-01 VERIFICATION SUMMARY: {passed_tests}/{total_tests} ASSERTIONS PASSED")
        print("==================================================================")

    finally:
        # Restore environment
        if orig_env is not None:
            os.environ["JWT_ACCESS_TOKEN_EXPIRE_MINUTES"] = orig_env
        elif "JWT_ACCESS_TOKEN_EXPIRE_MINUTES" in os.environ:
            del os.environ["JWT_ACCESS_TOKEN_EXPIRE_MINUTES"]


if __name__ == "__main__":
    run_tests()
