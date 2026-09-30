"""
Automated Test for Batch Notifications Feature
"""
import requests

BASE_URL = "http://localhost:8000/api"

def test_batch_notifications():
    print("==================================================")
    print("TESTING BATCH NOTIFICATIONS DISPATCH & FILTERING")
    print("==================================================")

    # 1. Login Admin
    admin_login = requests.post(f"{BASE_URL}/auth/login", json={"identifier": "admin@lms.com", "password": "admin123"})
    assert admin_login.status_code == 200, f"Admin login failed: {admin_login.text}"
    admin_token = admin_login.json()["token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("[PASSED] Admin authenticated successfully")

    # 2. Login Student 1 (Enrolled in batch-2026 / Class of 2026)
    student1_login = requests.post(f"{BASE_URL}/auth/login", json={"identifier": "ashwith@example.com", "password": "student123"})
    assert student1_login.status_code == 200, f"Student 1 login failed: {student1_login.text}"
    student1_token = student1_login.json()["token"]
    student1_headers = {"Authorization": f"Bearer {student1_token}"}
    print(f"[PASSED] Student 1 authenticated (Batch: {student1_login.json()['user'].get('batch')})")

    # 3. Admin creates a targeted notification for 'Class of 2026'
    notif_batch2026_res = requests.post(
        f"{BASE_URL}/notifications",
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
        f"{BASE_URL}/notifications",
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
        f"{BASE_URL}/notifications",
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
    student1_notifs_res = requests.get(f"{BASE_URL}/notifications", headers=student1_headers)
    assert student1_notifs_res.status_code == 200, f"Student get notifications failed: {student1_notifs_res.text}"
    student1_notifs = student1_notifs_res.json()
    student1_notif_ids = [n["id"] for n in student1_notifs]

    # Verify student 1 receives batch 2026 and all batches, but NOT batch 2030
    assert notif_batch2026["id"] in student1_notif_ids, "Student 1 did not receive Class of 2026 notification"
    assert notif_all["id"] in student1_notif_ids, "Student 1 did not receive All Batches notification"
    assert notif_batch2030["id"] not in student1_notif_ids, "Student 1 received notification for other batch (Class of 2030)!"
    print("[PASSED] Student 1 received only batch-relevant notifications and global announcements")

    # 7. Student 1 marks notification as read
    read_res = requests.post(f"{BASE_URL}/notifications/{notif_batch2026['id']}/read", headers=student1_headers)
    assert read_res.status_code == 200, f"Mark read failed: {read_res.text}"
    student1_notifs_after_read = requests.get(f"{BASE_URL}/notifications", headers=student1_headers).json()
    matched_notif = next(n for n in student1_notifs_after_read if n["id"] == notif_batch2026["id"])
    assert matched_notif["isRead"] is True, "Notification isRead was not updated to True"
    print("[PASSED] Notification marked as read successfully")

    # 8. Admin queries notifications list
    admin_notifs_res = requests.get(f"{BASE_URL}/notifications", headers=admin_headers)
    assert admin_notifs_res.status_code == 200
    admin_notif_ids = [n["id"] for n in admin_notifs_res.json()]
    assert notif_batch2026["id"] in admin_notif_ids
    assert notif_batch2030["id"] in admin_notif_ids
    print(f"[PASSED] Admin sees all broadcast notifications ({len(admin_notifs_res.json())} total)")

    # 9. Admin deletes a notification
    del_res = requests.delete(f"{BASE_URL}/notifications/{notif_batch2030['id']}", headers=admin_headers)
    assert del_res.status_code == 200, f"Delete notification failed: {del_res.text}"
    admin_notifs_after_del = requests.get(f"{BASE_URL}/notifications", headers=admin_headers).json()
    assert notif_batch2030["id"] not in [n["id"] for n in admin_notifs_after_del]
    print("[PASSED] Admin revoked / deleted notification successfully")

    print("\nALL BATCH NOTIFICATION TESTS PASSED SUCCESSFULLY! 🎉")

if __name__ == "__main__":
    test_batch_notifications()
