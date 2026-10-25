"""
Automated Test for Batch Notifications Feature:
Validates targeted notification dispatch, batch-level audience filtering,
global announcements, read receipts, and administrative deletion.
"""
import os
import sys
import time
import socket
import tempfile
import threading
import requests
import uvicorn

# Setup backend import path
_curr_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(_curr_dir, "backend") if os.path.exists(os.path.join(_curr_dir, "backend")) else os.path.abspath(os.path.join(_curr_dir, "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import models
from auth import hash_password
from main import app
from database import get_db

def find_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]

def test_batch_notifications():
    print("==================================================")
    print("TESTING BATCH NOTIFICATIONS DISPATCH & FILTERING")
    print("==================================================")

    # 1. Setup isolated SQLite test database
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path = tmp.name

    test_engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    models.Base.metadata.create_all(bind=test_engine)
    TestSession = sessionmaker(bind=test_engine)

    def override_get_db():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    db = TestSession()
    now = models.get_utc_now()

    # Create admin user
    admin_id = "user-admin-notif"
    admin_user = models.User(
        id=admin_id,
        email="admin@lms.com",
        role="admin",
        password_hash=hash_password("admin123"),
        status="active",
        createdAt=now
    )
    db.add(admin_user)

    # Create Department and Batches
    dept_id = "dept-cse-notif"
    dept = models.Department(id=dept_id, name="Computer Science", code="CSE")
    db.add(dept)

    batch_2026_id = "batch-2026-notif"
    batch_2026 = models.Batch(id=batch_2026_id, name="Class of 2026", departmentId=dept_id)
    db.add(batch_2026)

    batch_2030_id = "batch-2030-notif"
    batch_2030 = models.Batch(id=batch_2030_id, name="Class of 2030", departmentId=dept_id)
    db.add(batch_2030)

    # Create Student 1 (enrolled in Class of 2026)
    student1_id = "user-student1-notif"
    student1_user = models.User(
        id=student1_id,
        email="ashwith@example.com",
        role="student",
        password_hash=hash_password("student123"),
        status="active",
        createdAt=now
    )
    db.add(student1_user)

    student1_profile = models.StudentProfile(
        userId=student1_id,
        firstName="Ashwith",
        lastName="Student",
        studentNumber="STU2026001",
        primaryBatchId=batch_2026_id,
        departmentId=dept_id
    )
    db.add(student1_profile)

    db.commit()
    db.close()

    # Start local uvicorn server on dynamic port
    port = find_free_port()
    server_config = uvicorn.Config(app, host="127.0.0.1", port=port, log_level="error")
    server = uvicorn.Server(server_config)
    server_thread = threading.Thread(target=server.run, daemon=True)
    server_thread.start()
    time.sleep(1.0)

    base_url = f"http://127.0.0.1:{port}/api"

    try:
        # 1. Login Admin
        admin_login = requests.post(f"{base_url}/auth/login", json={"identifier": "admin@lms.com", "password": "admin123"})
        assert admin_login.status_code == 200, f"Admin login failed: {admin_login.text}"
        admin_token = admin_login.json()["token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        print("[PASSED] Admin authenticated successfully")

        # 2. Login Student 1 (Enrolled in batch-2026 / Class of 2026)
        student1_login = requests.post(f"{base_url}/auth/login", json={"identifier": "ashwith@example.com", "password": "student123"})
        assert student1_login.status_code == 200, f"Student 1 login failed: {student1_login.text}"
        student1_token = student1_login.json()["token"]
        student1_headers = {"Authorization": f"Bearer {student1_token}"}
        print(f"[PASSED] Student 1 authenticated (Batch: {student1_login.json()['user'].get('batch')})")

        # 3. Admin creates a targeted notification for 'Class of 2026'
        notif_batch2026_res = requests.post(
            f"{base_url}/notifications",
            json={
                "title": "Aptitude Mock Exam on Saturday",
                "message": "Enrolled students in Class of 2026 must attend the benchmark test at 10 AM.",
                "type": "alert",
                "targetBatch": "Class of 2026",
                "targetRole": "student",
                "link": "/student/tests",
                "priority": "high",
                "sendEmail": True
            },
            headers=admin_headers
        )
        assert notif_batch2026_res.status_code == 201, f"Failed to create batch notification: {notif_batch2026_res.text}"
        notif_batch2026 = notif_batch2026_res.json()
        print(f"[PASSED] Created notification for 'Class of 2026' (ID: {notif_batch2026['id']})")

        # 4. Admin creates a notification for 'All Batches'
        notif_all_res = requests.post(
            f"{base_url}/notifications",
            json={
                "title": "Campus Wide Holiday Notice",
                "message": "Campus will remain closed on Monday for national holiday.",
                "type": "announcement",
                "targetBatch": "all",
                "targetRole": "student",
                "link": "/student/dashboard",
                "priority": "normal",
                "sendEmail": False
            },
            headers=admin_headers
        )
        assert notif_all_res.status_code == 201, f"Failed to create all batches notification: {notif_all_res.text}"
        notif_all = notif_all_res.json()
        print(f"[PASSED] Created notification for 'All Batches' (ID: {notif_all['id']})")

        # 5. Admin creates a notification for a different batch 'Class of 2030'
        notif_batch2030_res = requests.post(
            f"{base_url}/notifications",
            json={
                "title": "Orientation for 2030 Batch",
                "message": "Welcome freshmen to orientation session.",
                "type": "info",
                "targetBatch": "Class of 2030",
                "targetRole": "student",
                "link": "/student/dashboard",
                "priority": "normal",
                "sendEmail": False
            },
            headers=admin_headers
        )
        assert notif_batch2030_res.status_code == 201
        notif_batch2030 = notif_batch2030_res.json()
        print(f"[PASSED] Created notification for 'Class of 2030' (ID: {notif_batch2030['id']})")

        # 6. Student 1 queries notifications
        student1_notifs_res = requests.get(f"{base_url}/notifications", headers=student1_headers)
        assert student1_notifs_res.status_code == 200, f"Student get notifications failed: {student1_notifs_res.text}"
        student1_notifs = student1_notifs_res.json()
        student1_notif_ids = [n["id"] for n in student1_notifs]

        # Verify student 1 receives batch 2026 and all batches, but NOT batch 2030
        assert notif_batch2026["id"] in student1_notif_ids, "Student 1 did not receive Class of 2026 notification"
        assert notif_all["id"] in student1_notif_ids, "Student 1 did not receive All Batches notification"
        assert notif_batch2030["id"] not in student1_notif_ids, "Student 1 received notification for other batch (Class of 2030)!"
        print("[PASSED] Student 1 received only batch-relevant notifications and global announcements")

        # 7. Student 1 marks notification as read
        read_res = requests.post(f"{base_url}/notifications/{notif_batch2026['id']}/read", headers=student1_headers)
        assert read_res.status_code == 200, f"Mark read failed: {read_res.text}"
        student1_notifs_after_read = requests.get(f"{base_url}/notifications", headers=student1_headers).json()
        matched_notif = next(n for n in student1_notifs_after_read if n["id"] == notif_batch2026["id"])
        assert matched_notif["isRead"] is True, "Notification isRead was not updated to True"
        print("[PASSED] Notification marked as read successfully")

        # 8. Admin queries notifications list
        admin_notifs_res = requests.get(f"{base_url}/notifications", headers=admin_headers)
        assert admin_notifs_res.status_code == 200
        admin_notif_ids = [n["id"] for n in admin_notifs_res.json()]
        assert notif_batch2026["id"] in admin_notif_ids
        assert notif_batch2030["id"] in admin_notif_ids
        print(f"[PASSED] Admin sees all broadcast notifications ({len(admin_notifs_res.json())} total)")

        # 9. Admin deletes a notification
        del_res = requests.delete(f"{base_url}/notifications/{notif_batch2030['id']}", headers=admin_headers)
        assert del_res.status_code == 200, f"Delete notification failed: {del_res.text}"
        admin_notifs_after_del = requests.get(f"{base_url}/notifications", headers=admin_headers).json()
        assert notif_batch2030["id"] not in [n["id"] for n in admin_notifs_after_del]
        print("[PASSED] Admin revoked / deleted notification successfully")

        print("\nALL BATCH NOTIFICATION TESTS PASSED SUCCESSFULLY (100%)!")

    finally:
        server.should_exit = True
        app.dependency_overrides.clear()
        try:
            if os.path.exists(db_path):
                os.remove(db_path)
        except Exception:
            pass

if __name__ == "__main__":
    test_batch_notifications()
