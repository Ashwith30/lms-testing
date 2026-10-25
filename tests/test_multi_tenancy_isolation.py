"""
Automated Multi-Tenancy & Tenant Isolation Verification Suite:
Validates strict scoping across Institutions, Trainers, and Students:
- Multi-college user isolation
- Roll number reuse across colleges with scoped uniqueness per institution
- Test and Schedule tenant scoping
- Question Bank tenant isolation
- Attempt and Proctoring security barrier across institutions
- Material and Notification tenant scoping
- Institutional Analytics strict query scoping
- Admin role universal governance
"""
import os
import sys
import uuid
import time
import socket
import threading
import requests
import uvicorn

# Setup backend import path
_curr_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(_curr_dir, "backend") if os.path.exists(os.path.join(_curr_dir, "backend")) else os.path.abspath(os.path.join(_curr_dir, "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import models
import schemas
from database import SessionLocal, engine, Base
from main import app
from auth import create_access_token, hash_password

def find_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]

def run_tests():
    db = SessionLocal()
    prefix = f"mt-{uuid.uuid4().hex[:6]}"

    print(f"\n=======================================================")
    print(f"STARTING MULTI-TENANCY ISOLATION VERIFICATION ({prefix})")
    print(f"=======================================================")

    student_a_id = None
    student_b_id = None
    trainer_a_user = None
    trainer_b_user = None
    inst_a_user = None
    inst_b_user = None

    try:
        # -------------------------------------------------------------
        # STEP 1: Provision Multi-Tenant Ecosystem (College A & College B)
        # -------------------------------------------------------------
        print("\n--- STEP 1: Provisioning College A and College B Tenants ---")

        # Admin
        admin_user = models.User(
            id=f"{prefix}-admin",
            email=f"{prefix}-admin@platform.com",
            password_hash=hash_password("AdminPass@123"),
            role="admin",
            status="active",
            createdAt=models.get_utc_now()
        )
        db.add(admin_user)

        # College A Institution
        inst_a_user = models.User(
            id=f"{prefix}-inst-a",
            email=f"{prefix}-inst-a@college-a.edu",
            password_hash=hash_password("InstPass@123"),
            role="institution",
            status="active",
            createdAt=models.get_utc_now()
        )
        db.add(inst_a_user)
        inst_a_profile = models.InstitutionProfile(
            userId=inst_a_user.id,
            institutionName=f"Apex University A {prefix}",
            supportEmail=inst_a_user.email,
            address="Campus Alpha"
        )
        db.add(inst_a_profile)

        # College B Institution
        inst_b_user = models.User(
            id=f"{prefix}-inst-b",
            email=f"{prefix}-inst-b@college-b.edu",
            password_hash=hash_password("InstPass@123"),
            role="institution",
            status="active",
            createdAt=models.get_utc_now()
        )
        db.add(inst_b_user)
        inst_b_profile = models.InstitutionProfile(
            userId=inst_b_user.id,
            institutionName=f"Beacon University B {prefix}",
            supportEmail=inst_b_user.email,
            address="Campus Beta"
        )
        db.add(inst_b_profile)

        # College A Department & Batch
        dept_a = models.Department(
            id=f"{prefix}-dept-a",
            institutionId=inst_a_user.id,
            name="Computer Science A",
            code="CSE-A"
        )
        db.add(dept_a)
        batch_a = models.Batch(
            id=f"{prefix}-batch-a",
            departmentId=dept_a.id,
            institutionId=inst_a_user.id,
            name="2026-A"
        )
        db.add(batch_a)

        # College B Department & Batch
        dept_b = models.Department(
            id=f"{prefix}-dept-b",
            institutionId=inst_b_user.id,
            name="Computer Science B",
            code="CSE-B"
        )
        db.add(dept_b)
        batch_b = models.Batch(
            id=f"{prefix}-batch-b",
            departmentId=dept_b.id,
            institutionId=inst_b_user.id,
            name="2026-B"
        )
        db.add(batch_b)

        # College A Trainer
        trainer_a_user = models.User(
            id=f"{prefix}-trainer-a",
            email=f"{prefix}-trainer-a@college-a.edu",
            password_hash=hash_password("TrainerPass@123"),
            role="trainer",
            status="active",
            createdAt=models.get_utc_now()
        )
        db.add(trainer_a_user)
        trainer_a_profile = models.TrainerProfile(
            userId=trainer_a_user.id,
            firstName="Professor",
            lastName="Alpha",
            institutionId=inst_a_user.id,
            departmentId=dept_a.id
        )
        db.add(trainer_a_profile)

        # College B Trainer
        trainer_b_user = models.User(
            id=f"{prefix}-trainer-b",
            email=f"{prefix}-trainer-b@college-b.edu",
            password_hash=hash_password("TrainerPass@123"),
            role="trainer",
            status="active",
            createdAt=models.get_utc_now()
        )
        db.add(trainer_b_user)
        trainer_b_profile = models.TrainerProfile(
            userId=trainer_b_user.id,
            firstName="Professor",
            lastName="Beta",
            institutionId=inst_b_user.id,
            departmentId=dept_b.id
        )
        db.add(trainer_b_profile)

        db.commit()

        # Spin up test server in background thread
        port = find_free_port()
        config = uvicorn.Config(app, host="127.0.0.1", port=port, log_level="error")
        server = uvicorn.Server(config)
        thread = threading.Thread(target=server.run, daemon=True)
        thread.start()
        time.sleep(1.2)
        base_url = f"http://127.0.0.1:{port}/api"

        # Token generators
        token_admin = create_access_token({"sub": admin_user.id, "role": "admin"})
        token_inst_a = create_access_token({"sub": inst_a_user.id, "role": "institution"})
        token_inst_b = create_access_token({"sub": inst_b_user.id, "role": "institution"})
        token_trainer_a = create_access_token({"sub": trainer_a_user.id, "role": "trainer"})
        token_trainer_b = create_access_token({"sub": trainer_b_user.id, "role": "trainer"})

        print("  [PASS] Tenants and accounts initialized successfully")

        # -------------------------------------------------------------
        # STEP 2: Student Registration & Scoped Roll Number Uniqueness
        # -------------------------------------------------------------
        print("\n--- STEP 2: Student Registration & Roll Number Uniqueness ---")

        # Student A in College A with Roll No "21CS001"
        res_reg_a = requests.post(f"{base_url}/auth/register/student", json={
            "name": "Alice Alpha",
            "email": f"{prefix}-alice@student.com",
            "password": "Password@123",
            "rollNo": "21CS001",
            "college": inst_a_profile.institutionName,
            "department": "CSE-A",
            "batch": "2026-A",
            "institutionId": inst_a_user.id
        })
        assert res_reg_a.status_code == 200, f"Expected 200, got {res_reg_a.status_code}: {res_reg_a.text}"
        student_a_id = res_reg_a.json()["id"]
        token_student_a = create_access_token({"sub": student_a_id, "role": "student"})
        print("  [PASS] Student A registered in College A with Roll No 21CS001")

        # Student B in College B with the SAME Roll No "21CS001" (Cross-college reuse must SUCCEED)
        res_reg_b = requests.post(f"{base_url}/auth/register/student", json={
            "name": "Bob Beta",
            "email": f"{prefix}-bob@student.com",
            "password": "Password@123",
            "rollNo": "21CS001",
            "college": inst_b_profile.institutionName,
            "department": "CSE-B",
            "batch": "2026-B",
            "institutionId": inst_b_user.id
        })
        assert res_reg_b.status_code == 200, f"Expected 200, got {res_reg_b.status_code}: {res_reg_b.text}"
        student_b_id = res_reg_b.json()["id"]
        token_student_b = create_access_token({"sub": student_b_id, "role": "student"})
        print("  [PASS] Student B registered in College B with SAME Roll No 21CS001 (Multi-college roll number reuse verified!)")

        # Duplicate Student in College A with SAME Roll No "21CS001" (Same-college collision must FAIL)
        res_reg_dup = requests.post(f"{base_url}/auth/register/student", json={
            "name": "Alice Clone",
            "email": f"{prefix}-alice-clone@student.com",
            "password": "Password@123",
            "rollNo": "21CS001",
            "college": inst_a_profile.institutionName,
            "department": "CSE-A",
            "batch": "2026-A",
            "institutionId": inst_a_user.id
        })
        assert res_reg_dup.status_code == 400, f"Expected 400 for duplicate roll number in same college, got {res_reg_dup.status_code}"
        assert "already exists" in res_reg_dup.text.lower(), f"Unexpected error detail: {res_reg_dup.text}"
        print("  [PASS] Intra-college roll number duplicate properly rejected with 400 Bad Request")

        # -------------------------------------------------------------
        # STEP 3: Users Scoping (/api/users)
        # -------------------------------------------------------------
        print("\n--- STEP 3: Users Scoping Across Tenants ---")
        res_users_a = requests.get(f"{base_url}/users", headers={"Authorization": f"Bearer {token_trainer_a}"})
        assert res_users_a.status_code == 200
        user_ids_a = [u["id"] for u in res_users_a.json()]
        assert student_a_id in user_ids_a, "Trainer A must see Student A"
        assert student_b_id not in user_ids_a, "Trainer A must NOT see Student B"

        res_users_b = requests.get(f"{base_url}/users", headers={"Authorization": f"Bearer {token_trainer_b}"})
        assert res_users_b.status_code == 200
        user_ids_b = [u["id"] for u in res_users_b.json()]
        assert student_b_id in user_ids_b, "Trainer B must see Student B"
        assert student_a_id not in user_ids_b, "Trainer B must NOT see Student A"
        print("  [PASS] User rosters strictly scoped by institution")

        # -------------------------------------------------------------
        # STEP 4: Question Banks Isolation (/api/question-banks)
        # -------------------------------------------------------------
        print("\n--- STEP 4: Question Banks Isolation ---")
        qb_a = models.QuestionBank(
            id=f"{prefix}-qb-a",
            name="Aptitude Bank A",
            ownerId=trainer_a_user.id,
            institutionId=inst_a_user.id,
            createdAt=models.get_utc_now()
        )
        db.add(qb_a)

        qb_b = models.QuestionBank(
            id=f"{prefix}-qb-b",
            name="Algorithms Bank B",
            ownerId=trainer_b_user.id,
            institutionId=inst_b_user.id,
            createdAt=models.get_utc_now()
        )
        db.add(qb_b)
        db.commit()

        res_qb_a = requests.get(f"{base_url}/question-banks", headers={"Authorization": f"Bearer {token_trainer_a}"})
        assert res_qb_a.status_code == 200
        qb_ids_a = [q["id"] for q in res_qb_a.json()]
        assert qb_a.id in qb_ids_a, "Trainer A must see QB A"
        assert qb_b.id not in qb_ids_a, "Trainer A must NOT see QB B"

        res_qb_b = requests.get(f"{base_url}/question-banks", headers={"Authorization": f"Bearer {token_trainer_b}"})
        assert res_qb_b.status_code == 200
        qb_ids_b = [q["id"] for q in res_qb_b.json()]
        assert qb_b.id in qb_ids_b, "Trainer B must see QB B"
        assert qb_a.id not in qb_ids_b, "Trainer B must NOT see QB A"
        print("  [PASS] Question Banks strictly isolated per college")

        # -------------------------------------------------------------
        # STEP 5: Tests & Schedules Isolation
        # -------------------------------------------------------------
        print("\n--- STEP 5: Tests & Assessment Schedules Isolation ---")
        test_a = models.Test(
            id=f"{prefix}-test-a",
            title="Midterm Assessment A",
            authorId=trainer_a_user.id,
            institutionId=inst_a_user.id,
            totalMarks=100,
            status="Scheduled",
            createdAt=models.get_utc_now()
        )
        db.add(test_a)

        test_b = models.Test(
            id=f"{prefix}-test-b",
            title="Midterm Assessment B",
            authorId=trainer_b_user.id,
            institutionId=inst_b_user.id,
            totalMarks=100,
            status="Scheduled",
            createdAt=models.get_utc_now()
        )
        db.add(test_b)
        db.commit()

        sched_a = models.Schedule(
            id=f"{prefix}-sched-a",
            testId=test_a.id,
            institutionId=inst_a_user.id,
            startTime=models.get_utc_now(),
            endTime=models.get_utc_now(),
            durationMinutes=60,
            attemptsAllowed=1
        )
        db.add(sched_a)
        db.add(models.ScheduleBatchTarget(scheduleId=sched_a.id, batchId=batch_a.id))

        sched_b = models.Schedule(
            id=f"{prefix}-sched-b",
            testId=test_b.id,
            institutionId=inst_b_user.id,
            startTime=models.get_utc_now(),
            endTime=models.get_utc_now(),
            durationMinutes=60,
            attemptsAllowed=1
        )
        db.add(sched_b)
        db.add(models.ScheduleBatchTarget(scheduleId=sched_b.id, batchId=batch_b.id))
        db.commit()

        # Trainer A queries tests
        res_tests_a = requests.get(f"{base_url}/tests", headers={"Authorization": f"Bearer {token_trainer_a}"})
        assert res_tests_a.status_code == 200
        test_ids_a = [t["id"] for t in res_tests_a.json()]
        assert test_a.id in test_ids_a, "Trainer A must see Test A"
        assert test_b.id not in test_ids_a, "Trainer A must NOT see Test B"

        # Trainer B attempts to directly fetch Test A
        res_test_leak = requests.get(f"{base_url}/tests/{test_a.id}", headers={"Authorization": f"Bearer {token_trainer_b}"})
        assert res_test_leak.status_code == 403, f"Expected 403 Forbidden for cross-institution test access, got {res_test_leak.status_code}"
        print("  [PASS] Cross-institution test access strictly forbidden (403)")

        # Schedules endpoint
        res_sched_a = requests.get(f"{base_url}/schedules", headers={"Authorization": f"Bearer {token_trainer_a}"})
        assert res_sched_a.status_code == 200
        sched_ids_a = [s["id"] for s in res_sched_a.json()]
        assert sched_a.id in sched_ids_a, "Trainer A must see Schedule A"
        assert sched_b.id not in sched_ids_a, "Trainer A must NOT see Schedule B"
        print("  [PASS] Schedules strictly scoped by institution")

        # -------------------------------------------------------------
        # STEP 6: Student Assessment Attempts & Proctoring Security
        # -------------------------------------------------------------
        print("\n--- STEP 6: Student Attempts & Proctoring Access Guard ---")
        att_a = models.Attempt(
            id=f"{prefix}-att-a",
            testId=test_a.id,
            studentId=student_a_id,
            scheduleId=sched_a.id,
            status="submitted",
            score=85,
            percentage=85.0,
            startedAt=models.get_utc_now()
        )
        db.add(att_a)

        att_b = models.Attempt(
            id=f"{prefix}-att-b",
            testId=test_b.id,
            studentId=student_b_id,
            scheduleId=sched_b.id,
            status="submitted",
            score=90,
            percentage=90.0,
            startedAt=models.get_utc_now()
        )
        db.add(att_b)
        db.commit()

        # Trainer A queries attempts
        res_att_list_a = requests.get(f"{base_url}/attempts", headers={"Authorization": f"Bearer {token_trainer_a}"})
        assert res_att_list_a.status_code == 200
        att_ids_a = [a["id"] for a in res_att_list_a.json()]
        assert att_a.id in att_ids_a, "Trainer A must see Attempt A"
        assert att_b.id not in att_ids_a, "Trainer A must NOT see Attempt B"

        # Trainer B attempts to access Attempt A details
        res_att_leak = requests.get(f"{base_url}/attempts/{att_a.id}", headers={"Authorization": f"Bearer {token_trainer_b}"})
        assert res_att_leak.status_code == 403, f"Expected 403 Forbidden for cross-institution attempt access, got {res_att_leak.status_code}"

        # Trainer B attempts to access Attempt A review
        res_rev_leak = requests.get(f"{base_url}/attempts/{att_a.id}/review", headers={"Authorization": f"Bearer {token_trainer_b}"})
        assert res_rev_leak.status_code == 403, f"Expected 403 Forbidden for cross-institution attempt review, got {res_rev_leak.status_code}"

        # Trainer B attempts to fetch Attempt A snapshot
        res_snap_leak = requests.get(f"{base_url}/attempts/{att_a.id}/snapshots/sample.jpg", headers={"Authorization": f"Bearer {token_trainer_b}"})
        assert res_snap_leak.status_code == 403, f"Expected 403 Forbidden for cross-institution snapshot access, got {res_snap_leak.status_code}"
        print("  [PASS] Attempts, reviews, and proctoring evidence completely isolated and forbidden across tenants")

        # -------------------------------------------------------------
        # STEP 7: Materials Isolation
        # -------------------------------------------------------------
        print("\n--- STEP 7: Learning Materials Isolation ---")
        mat_a = models.Material(
            id=f"{prefix}-mat-a",
            title="Syllabus College A",
            authorId=trainer_a_user.id,
            institutionId=inst_a_user.id,
            type="pdf",
            contentUrl="/uploads/a.pdf",
            createdAt=models.get_utc_now()
        )
        db.add(mat_a)

        mat_b = models.Material(
            id=f"{prefix}-mat-b",
            title="Syllabus College B",
            authorId=trainer_b_user.id,
            institutionId=inst_b_user.id,
            type="pdf",
            contentUrl="/uploads/b.pdf",
            createdAt=models.get_utc_now()
        )
        db.add(mat_b)
        db.commit()

        # Student A gets materials
        res_mat_a = requests.get(f"{base_url}/materials", headers={"Authorization": f"Bearer {token_student_a}"})
        assert res_mat_a.status_code == 200
        mat_ids_a = [m["id"] for m in res_mat_a.json()]
        assert mat_a.id in mat_ids_a, "Student A must see Material A"
        assert mat_b.id not in mat_ids_a, "Student A must NOT see Material B"

        # Student B gets materials
        res_mat_b = requests.get(f"{base_url}/materials", headers={"Authorization": f"Bearer {token_student_b}"})
        assert res_mat_b.status_code == 200
        mat_ids_b = [m["id"] for m in res_mat_b.json()]
        assert mat_b.id in mat_ids_b, "Student B must see Material B"
        assert mat_a.id not in mat_ids_b, "Student B must NOT see Material A"
        print("  [PASS] Learning materials strictly scoped to student's institution")

        # -------------------------------------------------------------
        # STEP 8: Notifications Isolation
        # -------------------------------------------------------------
        print("\n--- STEP 8: Announcements & Notifications Isolation ---")
        notif_a = models.Notification(
            id=f"{prefix}-notif-a",
            title="College A Placement Notice",
            message="Campus drive tomorrow",
            senderId=inst_a_user.id,
            institutionId=inst_a_user.id,
            targetBatch=batch_a.name,
            createdAt=models.get_utc_now()
        )
        db.add(notif_a)

        notif_b = models.Notification(
            id=f"{prefix}-notif-b",
            title="College B Placement Notice",
            message="Campus drive next week",
            senderId=inst_b_user.id,
            institutionId=inst_b_user.id,
            targetBatch=batch_b.name,
            createdAt=models.get_utc_now()
        )
        db.add(notif_b)
        db.commit()

        res_notif_a = requests.get(f"{base_url}/notifications", headers={"Authorization": f"Bearer {token_student_a}"})
        assert res_notif_a.status_code == 200
        notif_ids_a = [n["id"] for n in res_notif_a.json()]
        assert notif_a.id in notif_ids_a, "Student A must see Notification A"
        assert notif_b.id not in notif_ids_a, "Student A must NOT see Notification B"

        res_notif_b = requests.get(f"{base_url}/notifications", headers={"Authorization": f"Bearer {token_student_b}"})
        assert res_notif_b.status_code == 200
        notif_ids_b = [n["id"] for n in res_notif_b.json()]
        assert notif_b.id in notif_ids_b, "Student B must see Notification B"
        assert notif_a.id not in notif_ids_b, "Student B must NOT see Notification A"
        print("  [PASS] Notifications strictly isolated by college cohort")

        # -------------------------------------------------------------
        # STEP 9: Institutional Analytics Scoping
        # -------------------------------------------------------------
        print("\n--- STEP 9: Institutional Analytics Query Scoping ---")
        res_analytics_a = requests.get(f"{base_url}/analytics/institution", headers={"Authorization": f"Bearer {token_inst_a}"})
        assert res_analytics_a.status_code == 200
        data_a = res_analytics_a.json()
        assert data_a["kpis"]["totalEnrolled"] == 1, f"Expected 1 student for College A, got {data_a['kpis']['totalEnrolled']}"
        assert data_a["kpis"]["testsCount"] == 1, f"Expected 1 assessment for College A, got {data_a['kpis']['testsCount']}"

        res_analytics_b = requests.get(f"{base_url}/analytics/institution", headers={"Authorization": f"Bearer {token_inst_b}"})
        assert res_analytics_b.status_code == 200
        data_b = res_analytics_b.json()
        assert data_b["kpis"]["totalEnrolled"] == 1, f"Expected 1 student for College B, got {data_b['kpis']['totalEnrolled']}"
        assert data_b["kpis"]["testsCount"] == 1, f"Expected 1 assessment for College B, got {data_b['kpis']['testsCount']}"
        print("  [PASS] Institutional analytics queries strictly scoped to current institution")

        # -------------------------------------------------------------
        # STEP 10: Admin Universal Visibility
        # -------------------------------------------------------------
        print("\n--- STEP 10: Admin Universal Access Check ---")
        res_admin_insts = requests.get(f"{base_url}/institutions", headers={"Authorization": f"Bearer {token_admin}"})
        assert res_admin_insts.status_code == 200
        admin_inst_ids = [i["id"] for i in res_admin_insts.json()]
        assert inst_a_user.id in admin_inst_ids and inst_b_user.id in admin_inst_ids, "Admin must see all institutions"

        res_admin_users = requests.get(f"{base_url}/users", headers={"Authorization": f"Bearer {token_admin}"})
        assert res_admin_users.status_code == 200
        admin_u_ids = [u["id"] for u in res_admin_users.json()]
        assert student_a_id in admin_u_ids and student_b_id in admin_u_ids, "Admin must see students across all colleges"
        print("  [PASS] Admin role maintains universal visibility and governance")

        print("\n=======================================================")
        print("ALL 10 MULTI-TENANCY ISOLATION VERIFICATION CHECKS PASSED!")
        print("=======================================================")

    finally:
        # Cleanup test records
        try:
            db.query(models.Notification).filter(models.Notification.id.startswith(prefix)).delete()
            db.query(models.Material).filter(models.Material.id.startswith(prefix)).delete()
            db.query(models.Attempt).filter(models.Attempt.id.startswith(prefix)).delete()
            db.query(models.Schedule).filter(models.Schedule.id.startswith(prefix)).delete()
            db.query(models.Test).filter(models.Test.id.startswith(prefix)).delete()
            db.query(models.QuestionBank).filter(models.QuestionBank.id.startswith(prefix)).delete()
            if student_a_id and student_b_id:
                db.query(models.StudentProfile).filter(models.StudentProfile.userId.in_([student_a_id, student_b_id])).delete()
            if trainer_a_user and trainer_b_user:
                db.query(models.TrainerProfile).filter(models.TrainerProfile.userId.in_([trainer_a_user.id, trainer_b_user.id])).delete()
            if inst_a_user and inst_b_user:
                db.query(models.InstitutionProfile).filter(models.InstitutionProfile.userId.in_([inst_a_user.id, inst_b_user.id])).delete()
            db.query(models.Batch).filter(models.Batch.id.startswith(prefix)).delete()
            db.query(models.Department).filter(models.Department.id.startswith(prefix)).delete()
            db.query(models.User).filter(models.User.id.startswith(prefix)).delete()
            db.commit()
        except Exception:
            pass
        db.close()

if __name__ == "__main__":
    run_tests()
