import os
import re
import uuid
import threading
from typing import Optional, Tuple
from fastapi import HTTPException, status

DEFAULT_STORAGE_ROOT = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "uploads", "snapshots"
)
MAX_SNAPSHOT_SIZE = 150 * 1024  # 150 KB max per snapshot (320x240 JPEG is ~15-30 KB)
MAX_RAW_BODY_SIZE = 150 * 1024  # 150 KB max for raw binary uploads
MAX_JSON_BODY_SIZE = 220 * 1024  # 220 KB max to accommodate base64 + JSON wrapper
MAX_SNAPSHOTS_PER_ATTEMPT = 20  # Hard cap per attempt to prevent disk abuse

ID_PATTERN = re.compile(r"^[a-zA-Z0-9_\-]+$")
FILENAME_PATTERN = re.compile(r"^[a-zA-Z0-9_\-]+\.(?:jpg|jpeg|png)$", re.IGNORECASE)

snapshot_upload_lock = threading.Lock()


def get_storage_root() -> str:
    """Returns the configured root directory for snapshot storage."""
    root = os.getenv("SNAPSHOT_STORAGE_PATH", DEFAULT_STORAGE_ROOT)
    try:
        os.makedirs(root, exist_ok=True)
    except (OSError, PermissionError):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Snapshot storage service unavailable: storage path is inaccessible or unwritable."
        )
    return os.path.realpath(root)


def validate_attempt_id(attempt_id: str) -> str:
    """Validates that the attempt_id contains only safe alphanumeric/hyphen/underscore characters."""
    if not attempt_id or not ID_PATTERN.match(attempt_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid attempt identifier format."
        )
    return attempt_id


def validate_filename(filename: str) -> str:
    """Validates that the snapshot filename has an allowed extension and no path components."""
    if not filename or not FILENAME_PATTERN.match(filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid snapshot filename format."
        )
    return filename


def validate_image_bytes(data: bytes) -> str:
    """
    Validates file size and image magic bytes.
    Ensures the payload is a valid JPEG or PNG image and does not exceed MAX_SNAPSHOT_SIZE.
    """
    if not data or len(data) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Snapshot image data is empty."
        )

    if len(data) > MAX_SNAPSHOT_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Snapshot exceeds maximum allowed size ({MAX_SNAPSHOT_SIZE // 1024} KB)."
        )

    if len(data) < 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Snapshot file header too small to be a valid image."
        )

    # JPEG magic bytes: \xff\xd8\xff
    if data[:3] == b"\xff\xd8\xff":
        return "image/jpeg"

    # PNG magic bytes: \x89PNG\r\n\x1a\n
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Invalid image format. Snapshots must be valid JPEG or PNG images."
    )


def save_snapshot(attempt_id: str, data: bytes) -> Tuple[str, str]:
    """
    Saves a snapshot byte stream safely for a given attempt.
    Returns a tuple of (filename, relative_url).
    """
    clean_attempt_id = validate_attempt_id(attempt_id)
    mime_type = validate_image_bytes(data)
    ext = "jpg" if mime_type == "image/jpeg" else "png"

    storage_root = get_storage_root()
    attempt_dir = os.path.join(storage_root, clean_attempt_id)
    
    # Path traversal assertion
    real_attempt_dir = os.path.realpath(attempt_dir)
    if not real_attempt_dir.startswith(storage_root):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Path traversal detected."
        )

    try:
        os.makedirs(real_attempt_dir, exist_ok=True)
        safe_filename = f"viol-{uuid.uuid4().hex[:12]}.{ext}"
        target_path = os.path.join(real_attempt_dir, safe_filename)

        with open(target_path, "wb") as f:
            f.write(data)
    except (OSError, PermissionError):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Snapshot storage service unavailable: unable to persist file."
        )

    relative_url = f"/api/attempts/{clean_attempt_id}/snapshots/{safe_filename}"
    return safe_filename, relative_url


def get_snapshot_path(attempt_id: str, filename: str) -> Optional[str]:
    """
    Resolves the physical absolute path for a snapshot file with strict path traversal checks.
    Returns None if the file does not exist.
    """
    clean_attempt_id = validate_attempt_id(attempt_id)
    clean_filename = validate_filename(filename)

    storage_root = get_storage_root()
    target_path = os.path.join(storage_root, clean_attempt_id, clean_filename)
    real_target = os.path.realpath(target_path)

    # Guard against symlinks or directory escapes
    if not real_target.startswith(storage_root):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Path traversal attempt blocked."
        )

    if not os.path.isfile(real_target):
        return None

    return real_target


def delete_attempt_snapshots(attempt_id: str) -> int:
    """
    Safely deletes all snapshot files belonging to an attempt.
    Returns the number of deleted files.
    """
    clean_attempt_id = validate_attempt_id(attempt_id)
    storage_root = get_storage_root()
    attempt_dir = os.path.join(storage_root, clean_attempt_id)
    real_attempt_dir = os.path.realpath(attempt_dir)

    if not real_attempt_dir.startswith(storage_root):
        return 0

    if not os.path.isdir(real_attempt_dir):
        return 0

    deleted_count = 0
    try:
        for fname in os.listdir(real_attempt_dir):
            fpath = os.path.join(real_attempt_dir, fname)
            if os.path.isfile(fpath):
                os.remove(fpath)
                deleted_count += 1
        os.rmdir(real_attempt_dir)
    except Exception:
        pass

    return deleted_count


def list_attempt_snapshots(attempt_id: str) -> list:
    """Returns a list of snapshot filenames belonging to an attempt."""
    clean_attempt_id = validate_attempt_id(attempt_id)
    storage_root = get_storage_root()
    attempt_dir = os.path.join(storage_root, clean_attempt_id)
    real_attempt_dir = os.path.realpath(attempt_dir)

    if not real_attempt_dir.startswith(storage_root) or not os.path.isdir(real_attempt_dir):
        return []

    return [f for f in os.listdir(real_attempt_dir) if os.path.isfile(os.path.join(real_attempt_dir, f))]


def get_attempt_snapshot_count(attempt_id: str) -> int:
    """Returns the count of snapshots stored for an attempt."""
    return len(list_attempt_snapshots(attempt_id))

