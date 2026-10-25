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
class LocalStorageBackend:
    """Local filesystem storage backend for snapshots."""

    def __init__(self, root_dir: Optional[str] = None):
        self.root_dir = root_dir or get_storage_root()

    def save(self, attempt_id: str, data: bytes, ext: str) -> Tuple[str, str]:
        attempt_dir = os.path.join(self.root_dir, attempt_id)
        real_attempt_dir = os.path.realpath(attempt_dir)
        if not real_attempt_dir.startswith(self.root_dir):
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

        relative_url = f"/api/attempts/{attempt_id}/snapshots/{safe_filename}"
        return safe_filename, relative_url

    def get_path(self, attempt_id: str, filename: str) -> Optional[str]:
        target_path = os.path.join(self.root_dir, attempt_id, filename)
        real_target = os.path.realpath(target_path)
        if not real_target.startswith(self.root_dir):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Path traversal attempt blocked."
            )
        if not os.path.isfile(real_target):
            return None
        return real_target

    def delete_all(self, attempt_id: str) -> int:
        attempt_dir = os.path.join(self.root_dir, attempt_id)
        real_attempt_dir = os.path.realpath(attempt_dir)
        if not real_attempt_dir.startswith(self.root_dir) or not os.path.isdir(real_attempt_dir):
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

    def list_all(self, attempt_id: str) -> list:
        attempt_dir = os.path.join(self.root_dir, attempt_id)
        real_attempt_dir = os.path.realpath(attempt_dir)
        if not real_attempt_dir.startswith(self.root_dir) or not os.path.isdir(real_attempt_dir):
            return []
        return [f for f in os.listdir(real_attempt_dir) if os.path.isfile(os.path.join(real_attempt_dir, f))]


class S3StorageBackend:
    """AWS S3 / S3-compatible cloud object storage backend."""

    def __init__(self):
        try:
            import boto3
            from botocore.config import Config
        except ImportError:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="S3 storage configured but boto3 package is not installed."
            )

        self.bucket = os.getenv("AWS_S3_BUCKET")
        if not self.bucket:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="AWS_S3_BUCKET environment variable must be set for S3 storage."
            )
        self.region = os.getenv("AWS_REGION", "us-east-1")
        self.endpoint_url = os.getenv("AWS_S3_ENDPOINT_URL")
        
        config = Config(signature_version="s3v4")
        self.client = boto3.client(
            "s3",
            region_name=self.region,
            endpoint_url=self.endpoint_url,
            aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
            config=config
        )

    def _get_key(self, attempt_id: str, filename: str) -> str:
        return f"snapshots/{attempt_id}/{filename}"

    def save(self, attempt_id: str, data: bytes, ext: str) -> Tuple[str, str]:
        safe_filename = f"viol-{uuid.uuid4().hex[:12]}.{ext}"
        content_type = "image/jpeg" if ext == "jpg" else "image/png"
        key = self._get_key(attempt_id, safe_filename)

        try:
            self.client.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=data,
                ContentType=content_type
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Cloud storage upload error: {str(e)}"
            )

        # In S3 mode, the relative or proxy URL continues through the API endpoint
        # which can serve via presigned redirection or stream
        relative_url = f"/api/attempts/{attempt_id}/snapshots/{safe_filename}"
        return safe_filename, relative_url

    def get_path(self, attempt_id: str, filename: str) -> Optional[str]:
        # For S3, returns a presigned URL or None if object doesn't exist
        key = self._get_key(attempt_id, filename)
        try:
            self.client.head_object(Bucket=self.bucket, Key=key)
            presigned_url = self.client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket, "Key": key},
                ExpiresIn=3600
            )
            return presigned_url
        except Exception:
            return None

    def delete_all(self, attempt_id: str) -> int:
        prefix = f"snapshots/{attempt_id}/"
        deleted = 0
        try:
            paginator = self.client.get_paginator("list_objects_v2")
            for page in paginator.paginate(Bucket=self.bucket, Prefix=prefix):
                objects = [{"Key": obj["Key"]} for obj in page.get("Contents", [])]
                if objects:
                    self.client.delete_objects(Bucket=self.bucket, Delete={"Objects": objects})
                    deleted += len(objects)
        except Exception:
            pass
        return deleted

    def list_all(self, attempt_id: str) -> list:
        prefix = f"snapshots/{attempt_id}/"
        keys = []
        try:
            paginator = self.client.get_paginator("list_objects_v2")
            for page in paginator.paginate(Bucket=self.bucket, Prefix=prefix):
                for obj in page.get("Contents", []):
                    keys.append(os.path.basename(obj["Key"]))
        except Exception:
            pass
        return keys


def get_storage_backend():
    """Factory to get the configured storage backend singleton."""
    backend_type = os.getenv("STORAGE_BACKEND", "").lower()
    if backend_type == "s3" or (not backend_type and os.getenv("AWS_S3_BUCKET")):
        return S3StorageBackend()
    return LocalStorageBackend()


def save_snapshot(attempt_id: str, data: bytes) -> Tuple[str, str]:
    """
    Saves a snapshot byte stream safely for a given attempt.
    Returns a tuple of (filename, relative_url).
    """
    clean_attempt_id = validate_attempt_id(attempt_id)
    mime_type = validate_image_bytes(data)
    ext = "jpg" if mime_type == "image/jpeg" else "png"

    backend = get_storage_backend()
    return backend.save(clean_attempt_id, data, ext)


def get_snapshot_path(attempt_id: str, filename: str) -> Optional[str]:
    """
    Resolves the physical absolute path (or URL) for a snapshot file with strict path traversal checks.
    Returns None if the file does not exist.
    """
    clean_attempt_id = validate_attempt_id(attempt_id)
    clean_filename = validate_filename(filename)

    backend = get_storage_backend()
    return backend.get_path(clean_attempt_id, clean_filename)


def delete_attempt_snapshots(attempt_id: str) -> int:
    """
    Safely deletes all snapshot files belonging to an attempt.
    Returns the number of deleted files.
    """
    clean_attempt_id = validate_attempt_id(attempt_id)
    backend = get_storage_backend()
    return backend.delete_all(clean_attempt_id)


def list_attempt_snapshots(attempt_id: str) -> list:
    """Returns a list of snapshot filenames belonging to an attempt."""
    clean_attempt_id = validate_attempt_id(attempt_id)
    backend = get_storage_backend()
    return backend.list_all(clean_attempt_id)


def get_attempt_snapshot_count(attempt_id: str) -> int:
    """Returns the count of snapshots stored for an attempt."""
    return len(list_attempt_snapshots(attempt_id))


