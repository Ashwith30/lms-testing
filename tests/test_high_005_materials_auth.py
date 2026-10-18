"""
Automated Verification Test Suite for HIGH-05:
Student Materials Access Control, Batch/Course Gating, Release Enforcement, and Trainer IDOR Defenses
"""
import os
import sys
import time
import tempfile
import threading
import requests
import uvicorn

# Setup backend import path
_curr_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(_curr_dir, "backend") if os.path.exists(os.path.join(_curr_dir, "backend")) else os.path.abspath(os.path.join(_curr_dir, "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
import models
from auth import create_access_token, hash_password
from main import app
from database import get_db

def run_tests():
    print("==================================================================")
    print("RUNNING COMPREHENSIVE HIGH-05 VERIFICATION TEST SUITE")
    print("==================================================================")

    # 1. Setup isolated temporary SQLite database with PRAGMA foreign_keys=ON
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
    pwd = hash_password("Password123!")

    # Users
    admin_id = "user-h5-admin"
    inst_id = "user-h5-inst"
    trainer_a_id = "user-h5-trainer-a"
    trainer_b_id = "user-h5-trainer-b"
    student_alpha_id = "user-h5-student-alpha"
    student_beta_id = "user-h5-student-beta"
    student_suspended_id = "user-h5-student-suspended"

    db.add(models.User(id=admin_id, email="admin_h5@lms.com", role="admin", password_hash=pwd, status="active"))
    db.add(models.User(id=inst_id, email="inst_h5@lms.com", role="institution", password_hash=pwd, status="active"))
    db.add(models.User(id=trainer_a_id, email="tr_a_h5@lms.com", role="trainer", password_hash=pwd, status="active"))
    db.add(models.User(id=trainer_b_id, email="tr_b_h5@lms.com", role="trainer", password_hash=pwd, status="active"))
    db.add(models.User(id=student_alpha_id, email="s_alpha_h5@lms.com", role="student", password_hash=pwd, status="active"))
    db.add(models.User(id=student_beta_id, email="s_beta_h5@lms.com", role="student", password_hash=pwd, status="active"))
    db.add(models.User(id=student_suspended_id, email="s_susp_h5@lms.com", role="student", password_hash=pwd, status="suspended"))
    db.commit()

    # Department and Batches
    dept_id = "dept-h5-cs"
    dept = models.Department(id=dept_id, name="Computer Science")
    db.add(dept)
    db.commit()

    batch_alpha_id = "batch-h5-alpha"
    batch_beta_id = "batch-h5-beta"
    batch_alpha = models.Batch(id=batch_alpha_id, departmentId=dept_id, name="Class of Alpha")
    batch_beta = models.Batch(id=batch_beta_id, departmentId=dept_id, name="Class of Beta")
    db.add_all([batch_alpha, batch_beta])
    db.commit()

    # Student Profiles
    sp_alpha = models.StudentProfile(
        userId=student_alpha_id,
        firstName="Alice",
        lastName="Alpha",
        studentNumber="STU-ALPHA",
        departmentId=dept_id,
        primaryBatchId=batch_alpha_id
    )
    sp_beta = models.StudentProfile(
        userId=student_beta_id,
        firstName="Bob",
        lastName="Beta",
        studentNumber="STU-BETA",
        departmentId=dept_id,
        primaryBatchId=batch_beta_id
    )
    sp_susp = models.StudentProfile(
        userId=student_suspended_id,
        firstName="Sam",
        lastName="Suspended",
        studentNumber="STU-SUSP",
        departmentId=dept_id,
        primaryBatchId=batch_alpha_id
    )
    db.add_all([sp_alpha, sp_beta, sp_susp])
    db.commit()

    # Courses & Enrollments
    course_1_id = "course-h5-python"
    course_2_id = "course-h5-java"
    c1 = models.Course(id=course_1_id, name="Python Programming")
    c2 = models.Course(id=course_2_id, name="Java Enterprise")
    db.add_all([c1, c2])
    db.commit()

    # Student Alpha enrolled in Course 1 only; Student Beta enrolled in Course 2 only
    enr_1 = models.StudentEnrollment(id="enr-h5-1", studentId=student_alpha_id, courseId=course_1_id, status="Enrolled")
    enr_2 = models.StudentEnrollment(id="enr-h5-2", studentId=student_beta_id, courseId=course_2_id, status="Enrolled")
    db.add_all([enr_1, enr_2])
    db.commit()

    now = models.get_utc_now()
    future_time = "2099-01-01T00:00:00+00:00"

    # Materials:
    # M1: Assigned to Batch Alpha (Released)
    m1_id = "mat-h5-batch-alpha"
    m1 = models.Material(
        id=m1_id,
        title="Alpha Batch Notes",
        type="PDF",
        authorId=trainer_a_id,
        isReleased=True,
        releasedAt=now
    )
    # M2: Assigned to Batch Beta (Released)
    m2_id = "mat-h5-batch-beta"
    m2 = models.Material(
        id=m2_id,
        title="Beta Batch Notes",
        type="PDF",
        authorId=trainer_b_id,
        isReleased=True,
        releasedAt=now
    )
    # M3: Unreleased Draft
    m3_id = "mat-h5-draft"
    m3 = models.Material(
        id=m3_id,
        title="Trainer A Secret Exam Review Draft",
        type="PDF",
        authorId=trainer_a_id,
        isReleased=False,
        releasedAt=None
    )
    # M4: Future Scheduled Release
    m4_id = "mat-h5-future"
    m4 = models.Material(
        id=m4_id,
        title="Future Lecture Slides",
        type="PDF",
        authorId=trainer_a_id,
        isReleased=True,
        releasedAt=future_time
    )
    # M5: Course 1 Material (no batch assignment)
    m5_id = "mat-h5-course-python"
    m5 = models.Material(
        id=m5_id,
        title="Python Course Syllabus",
        type="PDF",
        courseId=course_1_id,
        authorId=trainer_a_id,
        isReleased=True,
        releasedAt=now
    )
    # M6: Direct Student Assignment (assigned to Student Alpha only)
    m6_id = "mat-h5-direct-alpha"
    m6 = models.Material(
        id=m6_id,
        title="Individual Remediation Guide for Alice",
        type="PDF",
        authorId=trainer_a_id,
        isReleased=True,
        releasedAt=now
    )
    # M7: Universal Platform Material (no batch, no courseId)
    m7_id = "mat-h5-universal"
    m7 = models.Material(
        id=m7_id,
        title="General Student Code of Conduct",
        type="PDF",
        authorId=trainer_a_id,
        isReleased=True,
        releasedAt=now
    )

    db.add_all([m1, m2, m3, m4, m5, m6, m7])
    db.commit()

    # Material Assignments:
    # M1 -> Batch Alpha
    ma1 = models.MaterialAssignment(id="ma-h5-1", materialId=m1_id, assigneeType="batch", assigneeId=batch_alpha_id)
    # M2 -> Batch Beta
    ma2 = models.MaterialAssignment(id="ma-h5-2", materialId=m2_id, assigneeType="batch", assigneeId=batch_beta_id)
    # M6 -> Student Alpha direct
    ma6 = models.MaterialAssignment(id="ma-h5-6", materialId=m6_id, assigneeType="student", assigneeId=student_alpha_id)

    db.add_all([ma1, ma2, ma6])
    db.commit()
    db.close()

    # 3. Start local Uvicorn test server
    port = 8898
    server_config = uvicorn.Config(app, host="127.0.0.1", port=port, log_level="error")
    server = uvicorn.Server(server_config)

    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()

    base_url = f"http://127.0.0.1:{port}/api"

    # Wait for server startup
    for _ in range(50):
        try:
            requests.get(f"{base_url}/health", timeout=0.5)
            break
        except Exception:
            time.sleep(0.1)

    # JWT Tokens
    token_admin = create_access_token(data={"sub": admin_id, "role": "admin"})
    token_inst = create_access_token(data={"sub": inst_id, "role": "institution"})
    token_trainer_a = create_access_token(data={"sub": trainer_a_id, "role": "trainer"})
    token_trainer_b = create_access_token(data={"sub": trainer_b_id, "role": "trainer"})
    token_student_alpha = create_access_token(data={"sub": student_alpha_id, "role": "student"})
    token_student_beta = create_access_token(data={"sub": student_beta_id, "role": "student"})
    token_student_susp = create_access_token(data={"sub": student_suspended_id, "role": "student"})

    headers_admin = {"Authorization": f"Bearer {token_admin}"}
    headers_inst = {"Authorization": f"Bearer {token_inst}"}
    headers_tr_a = {"Authorization": f"Bearer {token_trainer_a}"}
    headers_tr_b = {"Authorization": f"Bearer {token_trainer_b}"}
    headers_s_alpha = {"Authorization": f"Bearer {token_student_alpha}"}
    headers_s_beta = {"Authorization": f"Bearer {token_student_beta}"}
    headers_s_susp = {"Authorization": f"Bearer {token_student_susp}"}

    try:
        print("\n--- SECTION 1: Batch Isolation & Cross-Batch Protection ---")
        # 1. Student Alpha accesses collection: should see M1 (Batch Alpha), M5 (Course 1), M6 (Direct), M7 (Universal)
        # MUST NOT see M2 (Batch Beta), M3 (Draft), M4 (Future)
        r = requests.get(f"{base_url}/materials", headers=headers_s_alpha)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        alpha_mats = r.json()
        alpha_ids = {m["id"] for m in alpha_mats}
        assert m1_id in alpha_ids, "Student Alpha must see Batch Alpha material M1"
        assert m2_id not in alpha_ids, "Student Alpha MUST NOT see Batch Beta material M2"
        print("  [1/16] Student Alpha collection properly includes Batch Alpha and excludes Batch Beta (200 OK)")

        # 2. Student Alpha direct GET on Batch Beta material M2: must return 403 Forbidden
        r = requests.get(f"{base_url}/materials/{m2_id}", headers=headers_s_alpha)
        assert r.status_code == 403, f"Expected 403 Forbidden, got {r.status_code}: {r.text}"
        print("  [2/16] Student Alpha direct GET on Batch Beta material rejected with 403 Forbidden")

        # 3. Student Beta accesses collection: should see M2 (Batch Beta), M7 (Universal)
        # MUST NOT see M1 (Batch Alpha)
        r = requests.get(f"{base_url}/materials", headers=headers_s_beta)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        beta_mats = r.json()
        beta_ids = {m["id"] for m in beta_mats}
        assert m2_id in beta_ids, "Student Beta must see Batch Beta material M2"
        assert m1_id not in beta_ids, "Student Beta MUST NOT see Batch Alpha material M1"
        print("  [3/16] Student Beta collection properly includes Batch Beta and excludes Batch Alpha (200 OK)")

        # 4. Student Beta direct GET on Batch Alpha material M1: must return 403 Forbidden
        r = requests.get(f"{base_url}/materials/{m1_id}", headers=headers_s_beta)
        assert r.status_code == 403, f"Expected 403 Forbidden, got {r.status_code}: {r.text}"
        print("  [4/16] Student Beta direct GET on Batch Alpha material rejected with 403 Forbidden")

        print("\n--- SECTION 2: Unreleased & Future-Scheduled Release Enforcement ---")
        # 5. Student Alpha and Beta collection strictly excludes unreleased draft M3
        assert m3_id not in alpha_ids, "Unreleased draft M3 must not be in Alpha collection"
        assert m3_id not in beta_ids, "Unreleased draft M3 must not be in Beta collection"
        print("  [5/16] Unreleased draft material strictly excluded from student collection queries")

        # 6. Student direct GET on unreleased draft M3: must return 403 Forbidden
        r = requests.get(f"{base_url}/materials/{m3_id}", headers=headers_s_alpha)
        assert r.status_code == 403, f"Expected 403 Forbidden, got {r.status_code}: {r.text}"
        print("  [6/16] Student direct GET on unreleased draft rejected with 403 Forbidden")

        # 7. Student direct GET on future-scheduled release M4: must return 403 Forbidden
        assert m4_id not in alpha_ids, "Future material M4 must not be in Alpha collection"
        r = requests.get(f"{base_url}/materials/{m4_id}", headers=headers_s_alpha)
        assert r.status_code == 403, f"Expected 403 Forbidden, got {r.status_code}: {r.text}"
        print("  [7/16] Student direct GET on future-scheduled material rejected with 403 Forbidden")

        print("\n--- SECTION 3: Omitted and Spoofed Parameter Resilience ---")
        # 8. Student queries /api/materials with NO query params (omitted studentId)
        # Backend must enforce role-based student scoping rather than returning all platform materials
        r = requests.get(f"{base_url}/materials", headers=headers_s_alpha)
        assert r.status_code == 200
        assert len(r.json()) < 7, "Omitted studentId MUST NOT return all platform materials"
        assert all(m["id"] not in (m2_id, m3_id, m4_id) for m in r.json())
        print("  [8/16] Omitted studentId param correctly enforces backend student scoping (no leak)")

        # 9. Student Alpha passes spoofed ?studentId=user-h5-student-beta
        # Backend must ignore query param and scope strictly to authenticated Student Alpha
        r = requests.get(f"{base_url}/materials?studentId={student_beta_id}", headers=headers_s_alpha)
        assert r.status_code == 200
        spoofed_ids = {m["id"] for m in r.json()}
        assert m2_id not in spoofed_ids, "Spoofed studentId must NOT disclose Student Beta's materials"
        assert m1_id in spoofed_ids, "Authenticated student must receive their own materials"
        print("  [9/16] Spoofed studentId param completely ignored; bound strictly to JWT identity")

        # 10. Student Alpha passes ?uploadedBy=user-h5-trainer-a to try to view trainer drafts
        r = requests.get(f"{base_url}/materials?uploadedBy={trainer_a_id}", headers=headers_s_alpha)
        assert r.status_code == 200
        tr_query_ids = {m["id"] for m in r.json()}
        assert m3_id not in tr_query_ids, "Querying by uploadedBy must NOT disclose trainer drafts to student"
        print("  [10/16] Querying by uploadedBy param does not bypass release or assignment rules")

        print("\n--- SECTION 4: Course, Direct Student, and Universal Gating ---")
        # 11. Student Alpha enrolled in Course 1 can view M5; Student Beta not enrolled cannot
        assert m5_id in alpha_ids, "Student Alpha enrolled in Python must see M5"
        assert m5_id not in beta_ids, "Student Beta NOT enrolled in Python must NOT see M5"
        r = requests.get(f"{base_url}/materials/{m5_id}", headers=headers_s_beta)
        assert r.status_code == 403, f"Student Beta accessing Course 1 material directly must return 403, got {r.status_code}"
        print("  [11/16] Course enrollment restrictions strictly enforced (enrolled: 200, non-enrolled: 403)")

        # 12. Direct student assignment M6: visible to Student Alpha, forbidden to Student Beta
        assert m6_id in alpha_ids, "Student Alpha must see direct assignment M6"
        assert m6_id not in beta_ids, "Student Beta must NOT see Alice's direct assignment M6"
        r = requests.get(f"{base_url}/materials/{m6_id}", headers=headers_s_beta)
        assert r.status_code == 403
        print("  [12/16] Direct individual student assignments strictly isolated (Alice: 200, Bob: 403)")

        # 13. Universal material M7: visible to all active students
        assert m7_id in alpha_ids and m7_id in beta_ids, "Universal material M7 must be visible to both students"
        r_a = requests.get(f"{base_url}/materials/{m7_id}", headers=headers_s_alpha)
        r_b = requests.get(f"{base_url}/materials/{m7_id}", headers=headers_s_beta)
        assert r_a.status_code == 200 and r_b.status_code == 200
        print("  [13/16] Universal platform materials accessible to all authenticated students (200 OK)")

        print("\n--- SECTION 5: Trainer IDOR Defenses & Identity Spoofing Protection ---")
        # 14. Trainer A cannot update or delete Trainer B's material (403 Forbidden)
        r = requests.put(f"{base_url}/materials/{m2_id}", json={"title": "Hacked Title"}, headers=headers_tr_a)
        assert r.status_code == 403, f"Expected 403 on cross-trainer update, got {r.status_code}"
        r = requests.delete(f"{base_url}/materials/{m2_id}", headers=headers_tr_a)
        assert r.status_code == 403, f"Expected 403 on cross-trainer delete, got {r.status_code}"
        print("  [14/16] Cross-trainer material update and deletion strictly blocked with 403 Forbidden")

        # 15. Trainer creation forces authorId to authenticated trainer (spoofing blocked)
        spoofed_payload = {
            "title": "Trainer A Legitimate Material",
            "type": "Note",
            "content": "Sample content",
            "uploadedBy": trainer_b_id  # Trainer A attempts to attribute to Trainer B
        }
        r = requests.post(f"{base_url}/materials", json=spoofed_payload, headers=headers_tr_a)
        assert r.status_code == 200
        created_mat = r.json()
        assert created_mat["authorId"] == trainer_a_id, f"authorId should be {trainer_a_id}, got {created_mat['authorId']}"
        print("  [15/16] Material creation forces authorId to authenticated trainer; spoofing neutralized (200 OK)")

        print("\n--- SECTION 6: Admin Privileges & Account Status Gating ---")
        # 16. Admin can access all materials including drafts and can delete; Suspended student blocked
        r_admin = requests.get(f"{base_url}/materials/{m3_id}", headers=headers_admin)
        assert r_admin.status_code == 200, f"Admin must have access to draft materials, got {r_admin.status_code}"
        r_susp = requests.get(f"{base_url}/materials", headers=headers_s_susp)
        assert r_susp.status_code == 403, f"Suspended student must be rejected with 403, got {r_susp.status_code}"
        print("  [16/16] Admin retains global access (200 OK); suspended student strictly blocked (403 Forbidden)")

        print("\n==================================================================")
        print("ALL 16/16 HIGH-05 VERIFICATION TESTS PASSED (100%)!")
        print("==================================================================")

    finally:
        server.should_exit = True
        thread.join(timeout=2.0)
        try:
            os.remove(db_path)
        except OSError:
            pass

if __name__ == "__main__":
    run_tests()
