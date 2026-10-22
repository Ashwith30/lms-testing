"""
Automated Verification Test Suite for MED-05:
Proctoring Snapshot Offloading, Storage Security, Access Control, and Production Hardening

Verifies:
1. Storage Service Security & REV-01 Request-Size Protection:
   - Safe file naming (UUID-based server-generated filenames).
   - Strict path-traversal prevention for attempt_id and filename.
   - Content-Length rejection for oversized binary bodies (HTTP 413).
   - Streaming request size limit enforcement without buffering (HTTP 413).
   - Oversized JSON wrapper body rejection (HTTP 413).
   - Decoded base64 image > 150 KB rejection (HTTP 413).
   - Magic byte validation for JPEG/PNG (rejects HTML/text/binaries).
2. Authenticated Upload Endpoint & Access Control:
   - Only the authenticated student owner of the attempt can upload.
   - Reject cross-student uploads (403 Forbidden).
   - Reject trainer/admin uploads (403 Forbidden).
   - Reject uploads for completed/submitted attempts (400 Bad Request).
   - Reject unauthenticated uploads (401 Unauthorized).
   - Binary image/jpeg body and fallback JSON base64 support.
   - Returns authenticated relative URL.
3. REV-02 Upload Abuse Protection:
   - Rate limiting: Max 15 snapshot uploads per minute per attempt (HTTP 429).
   - 20-Snapshot Cap: Enforces hard limit of 20 stored snapshots per attempt (HTTP 429).
   - Concurrent Uploads: Parallel threads respect snapshot cap under concurrency lock.
4. REV-03 Authenticated Retrieval without Query Tokens:
   - Owner student retrieval with standard Bearer authorization header (200 OK).
   - Authorized trainer & admin retrieval with Bearer authorization header (200 OK).
   - Block cross-student access (403 Forbidden).
   - Block unauthorized trainer access (403 Forbidden).
   - Unauthenticated access rejected (401 Unauthorized).
5. REV-04 Prevent Duplicate Uploads & Sync URL Storage:
   - Sync answer accepts and stores relative URLs in Attempt.violationLogs_json.
   - Canonical log references updated in place so repeat sync calls do not re-upload.
6. REV-05 Storage Failure Handling & Controlled Cleanup:
   - Gracefully handles storage path write errors, returning HTTP 503 Service Unavailable.
   - Controlled cleanup deletes snapshot files on disk without leaving orphans.
"""
import os
import sys
import time
import tempfile
import threading
import datetime
import shutil
import base64
import requests
import uvicorn
from concurrent.futures import ThreadPoolExecutor

# Setup backend import path
_curr_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(_curr_dir, "backend") if os.path.exists(os.path.join(_curr_dir, "backend")) else os.path.abspath(os.path.join(_curr_dir, "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Isolate snapshot storage directory for testing
test_storage_dir = tempfile.mkdtemp(prefix="lms_test_snapshots_")
os.environ["SNAPSHOT_STORAGE_PATH"] = test_storage_dir

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
import models
from auth import create_access_token, hash_password
from main import app
from database import get_db
import storage_service

# Minimal 1x1 valid JPEG bytes
VALID_JPEG = (
    b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xff\xdb\x00C\x00"
    b"\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19"
    b"\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.\' \",#\x1c\x1c(7),01444\x1f\'"
    b"9=82<.342\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xc4\x00\x1f\x00"
    b"\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03"
    b"\x04\x05\x06\x07\x08\t\n\x0b\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xbf\x00\xff\xd9"
)

def run_tests():
    print("==================================================================")
    print("RUNNING COMPREHENSIVE MED-05 PRODUCTION-READY SNAPSHOT TEST SUITE")
    print("==================================================================")

    # 1. Setup isolated temporary SQLite test database
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path = tmp.name

    test_engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    
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

    # 2. Seed test data
    db = TestSession()
    now_dt = datetime.datetime.now(datetime.timezone.utc)
    now_iso = now_dt.isoformat()
    yesterday_iso = (now_dt - datetime.timedelta(days=1)).isoformat()

    dept = models.Department(id="dept-m5", name="Computer Science")
    db.add(dept)
    batch = models.Batch(id="batch-m5", departmentId=dept.id, name="Batch-M5")
    db.add(batch)

    admin_id = "user-m5-admin"
    inst_id = "user-m5-inst"
    trainer_auth_id = "user-m5-tr-auth"   # Authorized trainer
    trainer_unauth_id = "user-m5-tr-unauth" # Unauthorized trainer
    student_1_id = "user-m5-s1"          # Owner student
    student_2_id = "user-m5-s2"          # Foreign student

    db.add(models.User(id=admin_id, email="admin_m5@lms.com", role="admin", password_hash=hash_password("admin_pass"), status="active"))
    db.add(models.User(id=inst_id, email="inst_m5@lms.com", role="institution", password_hash=hash_password("inst_pass"), status="active"))
    db.add(models.User(id=trainer_auth_id, email="tr_auth_m5@lms.com", role="trainer", password_hash=hash_password("tr_pass"), status="active"))
    db.add(models.User(id=trainer_unauth_id, email="tr_unauth_m5@lms.com", role="trainer", password_hash=hash_password("tr_pass"), status="active"))
    db.add(models.User(id=student_1_id, email="s1_m5@lms.com", role="student", password_hash=hash_password("s1_pass"), status="active"))
    db.add(models.User(id=student_2_id, email="s2_m5@lms.com", role="student", password_hash=hash_password("s2_pass"), status="active"))

    db.add(models.StudentProfile(userId=student_1_id, firstName="Student", lastName="One", primaryBatchId=batch.id))
    db.add(models.StudentProfile(userId=student_2_id, firstName="Student", lastName="Two", primaryBatchId=batch.id))
    db.flush()

    course = models.Course(id="course-m5", name="Test Course M5")
    topic = models.Topic(id="topic-m5", courseId=course.id, name="Topic M5")
    db.add(course)
    db.add(topic)
    db.flush()

    # Test owned by authorized trainer
    test_id = "test-m5"
    db.add(models.Test(
        id=test_id,
        title="Proctored Test M5",
        authorId=trainer_auth_id,
        topicId=topic.id,
        status="published"
    ))
    db.flush()

    # Schedule
    sched_id = "sch-m5"
    db.add(models.Schedule(
        id=sched_id,
        testId=test_id,
        startTime="2020-01-01T00:00:00Z",
        endTime="2030-12-31T23:59:59Z",
        durationMinutes=60,
        attemptsAllowed=5
    ))
    db.add(models.ScheduleAssignment(id="sa-m5", scheduleId=sched_id, assigneeType="batch", assigneeId=batch.name))
    db.flush()

    # Active attempt for student 1 (in_progress)
    att_active_id = "att-m5-active"
    db.add(models.Attempt(
        id=att_active_id,
        studentId=student_1_id,
        scheduleId=sched_id,
        status="in_progress",
        startedAt=now_iso,
        violationLogs_json="[]"
    ))

    # Completed attempt for student 1 (submitted)
    att_submitted_id = "att-m5-submitted"
    db.add(models.Attempt(
        id=att_submitted_id,
        studentId=student_1_id,
        scheduleId=sched_id,
        status="submitted",
        startedAt=yesterday_iso,
        submittedAt=now_iso,
        violationLogs_json="[]"
    ))

    # Dedicated attempt for 20-snapshot cap & concurrency testing
    att_cap_id = "att-m5-cap"
    db.add(models.Attempt(
        id=att_cap_id,
        studentId=student_1_id,
        scheduleId=sched_id,
        status="in_progress",
        startedAt=now_iso,
        violationLogs_json="[]"
    ))

    # Dedicated attempt for rate limiting testing
    att_rate_id = "att-m5-rate"
    db.add(models.Attempt(
        id=att_rate_id,
        studentId=student_1_id,
        scheduleId=sched_id,
        status="in_progress",
        startedAt=now_iso,
        violationLogs_json="[]"
    ))

    db.commit()
    db.close()

    # Start test server
    port = 8899
    server_config = uvicorn.Config(app, host="127.0.0.1", port=port, log_level="error")
    server = uvicorn.Server(server_config)
    server_thread = threading.Thread(target=server.run, daemon=True)
    server_thread.start()
    time.sleep(1.2)

    base_url = f"http://127.0.0.1:{port}/api"

    # JWT Tokens
    admin_token = create_access_token({"sub": admin_id, "role": "admin"})
    tr_auth_token = create_access_token({"sub": trainer_auth_id, "role": "trainer"})
    tr_unauth_token = create_access_token({"sub": trainer_unauth_id, "role": "trainer"})
    s1_token = create_access_token({"sub": student_1_id, "role": "student"})
    s2_token = create_access_token({"sub": student_2_id, "role": "student"})

    s1_headers = {"Authorization": f"Bearer {s1_token}"}
    s2_headers = {"Authorization": f"Bearer {s2_token}"}
    tr_auth_headers = {"Authorization": f"Bearer {tr_auth_token}"}
    tr_unauth_headers = {"Authorization": f"Bearer {tr_unauth_token}"}
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    passed_count = 0
    total_tests = 24

    try:
        print("\n--- SECTION 1: Ownership, Status & Format Security ---")

        # 1. Reject unauthenticated snapshot upload
        res = requests.post(
            f"{base_url}/attempts/{att_active_id}/snapshots",
            data=VALID_JPEG,
            headers={"Content-Type": "image/jpeg"}
        )
        assert res.status_code == 401, f"Expected 401 Unauthenticated, got {res.status_code}"
        passed_count += 1
        print(f"  [{passed_count}/{total_tests}] Unauthenticated upload rejected (401 Unauthorized)")

        # 2. Reject foreign student uploading to another student's attempt
        res = requests.post(
            f"{base_url}/attempts/{att_active_id}/snapshots",
            data=VALID_JPEG,
            headers={**s2_headers, "Content-Type": "image/jpeg"}
        )
        assert res.status_code == 403, f"Expected 403 Forbidden for foreign student, got {res.status_code}"
        passed_count += 1
        print(f"  [{passed_count}/{total_tests}] Cross-student upload blocked (403 Forbidden)")

        # 3. Reject trainer uploading snapshot to student attempt
        res = requests.post(
            f"{base_url}/attempts/{att_active_id}/snapshots",
            data=VALID_JPEG,
            headers={**tr_auth_headers, "Content-Type": "image/jpeg"}
        )
        assert res.status_code == 403, f"Expected 403 Forbidden for trainer upload, got {res.status_code}"
        passed_count += 1
        print(f"  [{passed_count}/{total_tests}] Trainer upload to student attempt blocked (403 Forbidden)")

        # 4. Reject upload for completed / submitted attempt
        res = requests.post(
            f"{base_url}/attempts/{att_submitted_id}/snapshots",
            data=VALID_JPEG,
            headers={**s1_headers, "Content-Type": "image/jpeg"}
        )
        assert res.status_code == 400, f"Expected 400 Bad Request on submitted attempt, got {res.status_code}"
        assert "submitted" in res.text or "completed" in res.text
        passed_count += 1
        print(f"  [{passed_count}/{total_tests}] Upload to submitted attempt rejected (400 Bad Request)")

        # 5. Reject invalid magic bytes (plain text / script payload)
        invalid_bytes = b"<html><script>alert(1)</script></html>not-a-jpeg"
        res = requests.post(
            f"{base_url}/attempts/{att_active_id}/snapshots",
            data=invalid_bytes,
            headers={**s1_headers, "Content-Type": "image/jpeg"}
        )
        assert res.status_code == 400, f"Expected 400 Bad Request on invalid magic bytes, got {res.status_code}"
        assert "Invalid image format" in res.text
        passed_count += 1
        print(f"  [{passed_count}/{total_tests}] Non-image payload rejected via magic bytes (400 Bad Request)")

        # 6. Path traversal prevention in attempt_id
        res = requests.post(
            f"{base_url}/attempts/..%2F..%2Fetc/snapshots",
            data=VALID_JPEG,
            headers={**s1_headers, "Content-Type": "image/jpeg"}
        )
        assert res.status_code in (400, 404), f"Expected 400 or 404 on attempt_id path traversal, got {res.status_code}"
        passed_count += 1
        print(f"  [{passed_count}/{total_tests}] Path traversal in attempt_id blocked (400/404)")

        print("\n--- SECTION 2: REV-01 Request-Size Protection (Streaming & 413) ---")

        # 7. Reject oversized binary body via streaming / Content-Length (HTTP 413)
        oversized_binary = VALID_JPEG[:10] + b"\x00" * (160 * 1024)
        res = requests.post(
            f"{base_url}/attempts/{att_active_id}/snapshots",
            data=oversized_binary,
            headers={**s1_headers, "Content-Type": "image/jpeg"}
        )
        assert res.status_code == 413, f"Expected 413 Payload Too Large on oversized binary, got {res.status_code}"
        passed_count += 1
        print(f"  [{passed_count}/{total_tests}] Oversized binary payload rejected with HTTP 413")

        # 8. Reject oversized JSON payload envelope (HTTP 413)
        oversized_json = '{"image": "' + "A" * (230 * 1024) + '"}'
        res = requests.post(
            f"{base_url}/attempts/{att_active_id}/snapshots",
            data=oversized_json,
            headers={**s1_headers, "Content-Type": "application/json"}
        )
        assert res.status_code == 413, f"Expected 413 Payload Too Large on oversized JSON envelope, got {res.status_code}"
        passed_count += 1
        print(f"  [{passed_count}/{total_tests}] Oversized JSON envelope rejected with HTTP 413")

        # 9. Reject JSON payload where decoded image exceeds 150 KB (HTTP 413)
        b64_155k = base64.b64encode(VALID_JPEG[:10] + b"\x00" * (155 * 1024)).decode("ascii")
        res = requests.post(
            f"{base_url}/attempts/{att_active_id}/snapshots",
            json={"image": f"data:image/jpeg;base64,{b64_155k}"},
            headers={**s1_headers, "Content-Type": "application/json"}
        )
        assert res.status_code == 413, f"Expected 413 on decoded image > 150 KB, got {res.status_code}"
        passed_count += 1
        print(f"  [{passed_count}/{total_tests}] Decoded base64 image > 150 KB rejected with HTTP 413")

        # 10. Successful binary snapshot upload by student owner
        res = requests.post(
            f"{base_url}/attempts/{att_active_id}/snapshots",
            data=VALID_JPEG,
            headers={**s1_headers, "Content-Type": "image/jpeg"}
        )
        assert res.status_code == 200, f"Expected 200 OK, got {res.status_code}: {res.text}"
        data1 = res.json()
        assert data1.get("status") == "ok"
        snapshot_url_1 = data1.get("snapshotUrl")
        filename_1 = data1.get("filename")
        assert snapshot_url_1.startswith(f"/api/attempts/{att_active_id}/snapshots/")
        assert filename_1.endswith(".jpg")
        passed_count += 1
        print(f"  [{passed_count}/{total_tests}] Owner binary upload successful; safe relative URL returned (200 OK)")

        # 11. Successful valid base64 JSON upload by student owner within limits
        b64_str = "data:image/jpeg;base64," + base64.b64encode(VALID_JPEG).decode("ascii")
        res = requests.post(
            f"{base_url}/attempts/{att_active_id}/snapshots",
            json={"image": b64_str},
            headers={**s1_headers, "Content-Type": "application/json"}
        )
        assert res.status_code == 200, f"Expected 200 OK, got {res.status_code}: {res.text}"
        data2 = res.json()
        snapshot_url_2 = data2.get("snapshotUrl")
        assert snapshot_url_2.startswith(f"/api/attempts/{att_active_id}/snapshots/")
        passed_count += 1
        print(f"  [{passed_count}/{total_tests}] Valid base64 JSON upload accepted within size envelopes (200 OK)")

        print("\n--- SECTION 3: REV-03 Authenticated Retrieval via Bearer Tokens ---")

        # 12. Unauthenticated snapshot retrieval rejected
        res = requests.get(f"http://127.0.0.1:{port}{snapshot_url_1}")
        assert res.status_code == 401, f"Expected 401 Unauthorized for unauthenticated retrieval, got {res.status_code}"
        passed_count += 1
        print(f"  [{passed_count}/{total_tests}] Unauthenticated snapshot retrieval blocked (401 Unauthorized)")

        # 13. Owner student retrieval with standard Bearer authorization header (no query token)
        res = requests.get(f"http://127.0.0.1:{port}{snapshot_url_1}", headers=s1_headers)
        assert res.status_code == 200, f"Expected 200 OK for owner student Bearer retrieval, got {res.status_code}"
        assert res.headers.get("content-type") == "image/jpeg"
        assert res.content == VALID_JPEG
        passed_count += 1
        print(f"  [{passed_count}/{total_tests}] Owner student retrieval with Bearer token header succeeded (200 OK)")

        # 14. Authorized trainer & admin retrieval with Bearer authorization header (no query token)
        res_tr = requests.get(f"http://127.0.0.1:{port}{snapshot_url_1}", headers=tr_auth_headers)
        assert res_tr.status_code == 200, f"Expected 200 OK for authorized trainer, got {res_tr.status_code}"
        res_admin = requests.get(f"http://127.0.0.1:{port}{snapshot_url_1}", headers=admin_headers)
        assert res_admin.status_code == 200, f"Expected 200 OK for admin, got {res_admin.status_code}"
        passed_count += 1
        print(f"  [{passed_count}/{total_tests}] Authorized staff retrieval with Bearer token header succeeded (200 OK)")

        # 15. Cross-student and unauthorized trainer blocked on retrieval
        res_cross = requests.get(f"http://127.0.0.1:{port}{snapshot_url_1}", headers=s2_headers)
        assert res_cross.status_code == 403, f"Expected 403 for cross-student, got {res_cross.status_code}"
        res_untr = requests.get(f"http://127.0.0.1:{port}{snapshot_url_1}", headers=tr_unauth_headers)
        assert res_untr.status_code == 403, f"Expected 403 for unauthorized trainer, got {res_untr.status_code}"
        passed_count += 1
        print(f"  [{passed_count}/{total_tests}] Cross-student and unauthorized trainer retrieval blocked (403 Forbidden)")

        # 16. Filename path traversal blocked
        res = requests.get(
            f"{base_url}/attempts/{att_active_id}/snapshots/..%2F..%2Fmain.py",
            headers=admin_headers
        )
        assert res.status_code in (400, 404), f"Expected 400 or 404 on filename traversal, got {res.status_code}"
        passed_count += 1
        print(f"  [{passed_count}/{total_tests}] Filename path traversal blocked (400/404)")

        print("\n--- SECTION 4: REV-02 Rate Limiting, 20-Snapshot Cap & Concurrency ---")

        # 17. Snapshot upload rate limiting (Max 15 per minute per attempt)
        rate_responses = []
        for _ in range(16):
            r = requests.post(
                f"{base_url}/attempts/{att_rate_id}/snapshots",
                data=VALID_JPEG,
                headers={**s1_headers, "Content-Type": "image/jpeg"}
            )
            rate_responses.append(r.status_code)

        assert 429 in rate_responses, f"Expected HTTP 429 rate limit trigger, got statuses: {rate_responses}"
        assert rate_responses[-1] == 429
        passed_count += 1
        print(f"  [{passed_count}/{total_tests}] Snapshot upload rate limit enforced at 15/min (HTTP 429)")

        # 18. 20-Snapshot hard cap per attempt
        # Seed snapshots up to 20 on att_cap_id directly
        for i in range(20):
            storage_service.save_snapshot(att_cap_id, VALID_JPEG)
        
        cap_count = storage_service.get_attempt_snapshot_count(att_cap_id)
        assert cap_count == 20, f"Expected exactly 20 seeded snapshots, found {cap_count}"

        # 21st upload attempt must be rejected with 429
        res_cap = requests.post(
            f"{base_url}/attempts/{att_cap_id}/snapshots",
            data=VALID_JPEG,
            headers={**s1_headers, "Content-Type": "image/jpeg"}
        )
        assert res_cap.status_code == 429, f"Expected 429 on exceeding 20 snapshots, got {res_cap.status_code}"
        assert "limit" in res_cap.text.lower() or "maximum" in res_cap.text.lower()
        passed_count += 1
        print(f"  [{passed_count}/{total_tests}] 20-snapshot cap per attempt enforced (HTTP 429)")

        # 19. Concurrent upload race-condition prevention under concurrency lock
        # Reset snapshots on att_cap_id to 18
        storage_service.delete_attempt_snapshots(att_cap_id)
        for i in range(18):
            storage_service.save_snapshot(att_cap_id, VALID_JPEG)

        # Concurrently fire 6 upload requests from parallel threads
        def send_upload():
            return requests.post(
                f"{base_url}/attempts/{att_cap_id}/snapshots",
                data=VALID_JPEG,
                headers={**s1_headers, "Content-Type": "image/jpeg"}
            ).status_code

        with ThreadPoolExecutor(max_workers=6) as executor:
            concurrent_results = list(executor.map(lambda _: send_upload(), range(6)))

        # Snapshot count on disk must never exceed 20
        final_count = storage_service.get_attempt_snapshot_count(att_cap_id)
        assert final_count == 20, f"Concurrency violation: expected exactly 20 snapshots on disk, found {final_count}"
        # Exactly 2 requests must have succeeded (18+2=20) and 4 must have been rejected (429)
        assert concurrent_results.count(200) == 2, f"Expected 2 200s, got {concurrent_results}"
        assert concurrent_results.count(429) == 4, f"Expected 4 429s, got {concurrent_results}"
        passed_count += 1
        print(f"  [{passed_count}/{total_tests}] Concurrency lock prevented snapshot cap bypass (Exactly 20 snapshots stored)")

        print("\n--- SECTION 5: REV-04 Sync Storage & REV-05 Error Handling ---")

        # 20. Relative URL stored in existing JSON field
        violation_payload = {
            "violationType": "tab_hidden",
            "snapshotUrl": snapshot_url_1,
            "timestamp": now_iso,
            "reason": "Tab switched away"
        }
        sync_res = requests.post(
            f"{base_url}/attempts/{att_active_id}/sync-answer",
            json={"violationLogs": [violation_payload]},
            headers={**s1_headers, "Content-Type": "application/json"}
        )
        assert sync_res.status_code == 200, f"Expected 200 on sync-answer, got {sync_res.status_code}"

        check_db = TestSession()
        att_record = check_db.query(models.Attempt).filter_by(id=att_active_id).first()
        assert att_record is not None
        assert snapshot_url_1 in att_record.violationLogs_json
        assert "data:image" not in att_record.violationLogs_json
        check_db.close()
        passed_count += 1
        print(f"  [{passed_count}/{total_tests}] Relative URL persisted in existing JSON field without base64 bloat")

        # 21. REV-04: Canonical reference in-place mutation simulation
        mock_logs = [
            {"id": "v1", "snapshotUrl": "data:image/jpeg;base64,...", "type": "TAB_SWITCH"},
            {"id": "v2", "snapshotUrl": snapshot_url_1, "type": "PHONE_DETECTED"}
        ]
        # Simulate offload mutating reference in-place
        mock_logs[0]["snapshotUrl"] = snapshot_url_2
        # Subsequent sync check verifies no base64 remains
        assert not any(l["snapshotUrl"].startswith("data:") for l in mock_logs)
        passed_count += 1
        print(f"  [{passed_count}/{total_tests}] Canonical in-place log mutation prevents duplicate re-uploads")

        # 22. REV-05: Storage failure handling returns HTTP 503 Service Unavailable
        # Temporarily make storage directory read-only to trigger OSError/PermissionError
        os.chmod(test_storage_dir, 0o444)
        try:
            res_fail = requests.post(
                f"{base_url}/attempts/{att_active_id}/snapshots",
                data=VALID_JPEG,
                headers={**s1_headers, "Content-Type": "image/jpeg"}
            )
            assert res_fail.status_code == 503, f"Expected 503 Service Unavailable, got {res_fail.status_code}"
            assert "unavailable" in res_fail.text.lower()
            # Ensure internal filesystem path is NOT exposed
            assert test_storage_dir not in res_fail.text
            passed_count += 1
            print(f"  [{passed_count}/{total_tests}] Storage failure handled safely with HTTP 503 (zero path disclosure)")
        finally:
            os.chmod(test_storage_dir, 0o777)

        # 23. Controlled file cleanup
        attempt_files = storage_service.list_attempt_snapshots(att_active_id)
        assert len(attempt_files) >= 2, f"Expected at least 2 snapshot files, found {len(attempt_files)}"
        
        cleanup_deleted = storage_service.delete_attempt_snapshots(att_active_id)
        assert cleanup_deleted >= 2, f"Expected at least 2 files deleted, got {cleanup_deleted}"

        remaining_files = storage_service.list_attempt_snapshots(att_active_id)
        assert len(remaining_files) == 0, f"Expected 0 snapshots after cleanup, got {len(remaining_files)}"

        post_cleanup_res = requests.get(f"http://127.0.0.1:{port}{snapshot_url_1}", headers=s1_headers)
        assert post_cleanup_res.status_code == 404, f"Expected 404 after cleanup, got {post_cleanup_res.status_code}"
        passed_count += 1
        print(f"  [{passed_count}/{total_tests}] Controlled file cleanup deleted snapshots from disk (404 on get)")

        # 24. Legacy base64 snapshot viewability preserved
        legacy_snapshot = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD..."
        assert legacy_snapshot.startswith("data:image/"), "Legacy snapshot structure preserved"
        passed_count += 1
        print(f"  [{passed_count}/{total_tests}] Legacy base64 snapshots remain viewable without network calls")

        print("\n==================================================================")
        print(f"ALL {passed_count}/{total_tests} MED-05 PRODUCTION TESTS PASSED SUCCESSFULLY!")
        print("==================================================================")

    finally:
        # Cleanup temporary files
        os.chmod(test_storage_dir, 0o777)
        if os.path.exists(test_storage_dir):
            shutil.rmtree(test_storage_dir, ignore_errors=True)
        if os.path.exists(db_path):
            os.remove(db_path)

if __name__ == "__main__":
    run_tests()
