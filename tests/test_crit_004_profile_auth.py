"""
Comprehensive Automated Verification Test Suite for CRIT-04:
Profile Authorization, Account Status Enforcement, Dynamic Creation Prevention, and Schema Validation

Verifies:
1. Strict UserUpdateRequest schema validation:
   - Extra/unexpected fields rejected with 422 Unprocessable Entity.
2. Profile update authorization:
   - Students may ONLY update 'name' and 'phoneNumber' (200 OK).
   - Students attempting to modify batch, department, studentId/studentNumber, email, role, status rejected with 403 Forbidden.
   - Cross-user updates by students rejected with 403 Forbidden.
   - Trainers cannot update other users' profiles (403 Forbidden).
   - Trainers self-updating cannot change role, status, or institutional fields (403 Forbidden).
3. Batch and Department record integrity:
   - Admin/institution can assign students to existing batches/departments (200 OK).
   - Admin/institution assigning students to non-existent batches/departments rejected with 404 Not Found.
   - Zero dynamic database record creation from arbitrary strings.
4. Account Status Enforcement during Login:
   - Active accounts log in successfully with valid credentials (200 OK).
   - Suspended, inactive, and archived accounts rejected with 403 Forbidden before issuing JWT.
   - Incorrect credentials fail with 401 Unauthorized (SEC-002 preserved).
5. Account Status Enforcement on Authenticated Endpoints (get_current_user):
   - Active user token accesses protected endpoints (200 OK).
   - Disabled/suspended/inactive accounts rejected with 403 Forbidden on protected endpoints.
   - Disabling an active account immediately invalidates previously issued JWTs.
"""
import os
import sys
import time
import tempfile
import threading
import datetime
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
import schemas
from auth import create_access_token, hash_password
from main import app
from database import get_db

def run_tests():
    print("==================================================================")
    print("RUNNING COMPREHENSIVE CRIT-04 VERIFICATION TEST SUITE")
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

    # 2. Seed test fixtures
    db = TestSession()
    
    # Departments & Batches
    dept_cs = models.Department(id="dept-cs", name="Computer Science", code="CS")
    dept_ee = models.Department(id="dept-ee", name="Electrical Engineering", code="EE")
    db.add(dept_cs)
    db.add(dept_ee)

    batch_2025 = models.Batch(id="batch-2025", departmentId=dept_cs.id, name="CS-2025")
    batch_2026 = models.Batch(id="batch-2026", departmentId=dept_cs.id, name="CS-2026")
    db.add(batch_2025)
    db.add(batch_2026)

    # Users
    admin_id = "user-admin-4"
    inst_id = "user-inst-4"
    trainer_id = "user-trainer-4"
    trainer_other_id = "user-trainer-other-4"
    s1_active_id = "user-s1-active-4"
    s2_active_id = "user-s2-active-4"
    s_suspended_id = "user-s-suspended-4"
    s_inactive_id = "user-s-inactive-4"
    s_archived_id = "user-s-archived-4"

    db.add(models.User(id=admin_id, email="admin@lms.com", role="admin", password_hash=hash_password("admin_pass"), status="active"))
    db.add(models.User(id=inst_id, email="inst@lms.com", role="institution", password_hash=hash_password("inst_pass"), status="active"))
    db.add(models.User(id=trainer_id, email="trainer@lms.com", role="trainer", password_hash=hash_password("trainer_pass"), status="active"))
    db.add(models.User(id=trainer_other_id, email="trainer2@lms.com", role="trainer", password_hash=hash_password("trainer_pass"), status="active"))
    
    # Active students
    db.add(models.User(id=s1_active_id, email="student1@lms.com", role="student", password_hash=hash_password("student_pass"), status="active"))
    db.add(models.User(id=s2_active_id, email="student2@lms.com", role="student", password_hash=hash_password("student_pass"), status="active"))
    
    # Disabled students
    db.add(models.User(id=s_suspended_id, email="suspended@lms.com", role="student", password_hash=hash_password("student_pass"), status="suspended"))
    db.add(models.User(id=s_inactive_id, email="inactive@lms.com", role="student", password_hash=hash_password("student_pass"), status="inactive"))
    db.add(models.User(id=s_archived_id, email="archived@lms.com", role="student", password_hash=hash_password("student_pass"), status="archived"))

    # Profiles
    db.add(models.StudentProfile(
        userId=s1_active_id,
        firstName="Alice",
        lastName="Smith",
        studentNumber="STU-001",
        phoneNumber="+1-555-0101",
        departmentId=dept_cs.id,
        primaryBatchId=batch_2025.id
    ))
    db.add(models.StudentProfile(
        userId=s2_active_id,
        firstName="Bob",
        lastName="Jones",
        studentNumber="STU-002",
        phoneNumber="+1-555-0102",
        departmentId=dept_cs.id,
        primaryBatchId=batch_2025.id
    ))
    db.add(models.StudentProfile(
        userId=s_suspended_id,
        firstName="Suspended",
        lastName="User",
        studentNumber="STU-003",
        phoneNumber="+1-555-0103",
        departmentId=dept_cs.id,
        primaryBatchId=batch_2025.id
    ))
    db.add(models.TrainerProfile(
        userId=trainer_id,
        firstName="Tom",
        lastName="Trainer",
        employeeId="EMP-001",
        specialization="Algorithms",
        phoneNumber="+1-555-0201"
    ))
    db.add(models.InstitutionProfile(
        userId=inst_id,
        institutionName="Tech University",
        contactPersonName="Dean Wilson",
        supportEmail="support@techuni.edu"
    ))

    db.commit()
    db.close()

    # 3. Start local Uvicorn server in background thread
    port = 8898
    server_config = uvicorn.Config(app, host="127.0.0.1", port=port, log_level="error")
    server = uvicorn.Server(server_config)
    server_thread = threading.Thread(target=server.run, daemon=True)
    server_thread.start()
    time.sleep(1.2)

    base_url = f"http://127.0.0.1:{port}/api"

    # Pre-generate tokens
    admin_token = create_access_token({"sub": admin_id, "role": "admin"})
    inst_token = create_access_token({"sub": inst_id, "role": "institution"})
    trainer_token = create_access_token({"sub": trainer_id, "role": "trainer"})
    s1_token = create_access_token({"sub": s1_active_id, "role": "student"})
    s2_token = create_access_token({"sub": s2_active_id, "role": "student"})
    suspended_token = create_access_token({"sub": s_suspended_id, "role": "student"})
    inactive_token = create_access_token({"sub": s_inactive_id, "role": "student"})
    archived_token = create_access_token({"sub": s_archived_id, "role": "student"})

    admin_headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    inst_headers = {"Authorization": f"Bearer {inst_token}", "Content-Type": "application/json"}
    trainer_headers = {"Authorization": f"Bearer {trainer_token}", "Content-Type": "application/json"}
    s1_headers = {"Authorization": f"Bearer {s1_token}", "Content-Type": "application/json"}
    s2_headers = {"Authorization": f"Bearer {s2_token}", "Content-Type": "application/json"}
    suspended_headers = {"Authorization": f"Bearer {suspended_token}", "Content-Type": "application/json"}

    test_results = []
    def record(name, passed, detail=""):
        status_str = "PASS" if passed else "FAIL"
        print(f"[{status_str}] {name}: {detail}")
        test_results.append((name, passed, detail))
        if not passed:
            raise AssertionError(f"Test failed: {name} - {detail}")

    try:
        # =================================================================
        # TEST GROUP 1: Student Profile Updates (Permitted Fields)
        # =================================================================
        print("\n--- Test Group 1: Student Permitted Profile Updates ---")

        # 1.1 Student updates own name
        res = requests.put(
            f"{base_url}/users/{s1_active_id}",
            json={"name": "Alice Wonderland"},
            headers=s1_headers
        )
        record(
            "1.1 Student updates own name",
            res.status_code == 200 and res.json().get("name") == "Alice Wonderland",
            f"status={res.status_code}, name={res.json().get('name') if res.status_code == 200 else res.text}"
        )

        # 1.2 Student updates own phoneNumber
        res = requests.put(
            f"{base_url}/users/{s1_active_id}",
            json={"phoneNumber": "+1-555-9999"},
            headers=s1_headers
        )
        record(
            "1.2 Student updates own phoneNumber",
            res.status_code == 200,
            f"status={res.status_code}, response={res.text}"
        )
        # Verify in DB
        verify_db = TestSession()
        prof = verify_db.query(models.StudentProfile).filter_by(userId=s1_active_id).first()
        record(
            "1.2 DB check for phoneNumber",
            prof is not None and prof.phoneNumber == "+1-555-9999",
            f"phoneNumber={prof.phoneNumber if prof else None}"
        )
        verify_db.close()

        # 1.3 Student updates both name and phone together
        res = requests.put(
            f"{base_url}/users/{s1_active_id}",
            json={"name": "Alice W", "phoneNumber": "+1-555-8888"},
            headers=s1_headers
        )
        record(
            "1.3 Student updates both name and phone",
            res.status_code == 200 and res.json().get("name") == "Alice W",
            f"status={res.status_code}, name={res.json().get('name') if res.status_code == 200 else res.text}"
        )

        # =================================================================
        # TEST GROUP 2: Student Forbidden Field Tampering (Rejected with 403)
        # =================================================================
        print("\n--- Test Group 2: Student Forbidden Field Tampering ---")

        # 2.1 Student attempts to change batch
        res = requests.put(
            f"{base_url}/users/{s1_active_id}",
            json={"batch": "CS-2026"},
            headers=s1_headers
        )
        record(
            "2.1 Student cannot change batch",
            res.status_code == 403,
            f"status={res.status_code}, detail={res.text}"
        )

        # 2.2 Student attempts to change department
        res = requests.put(
            f"{base_url}/users/{s1_active_id}",
            json={"department": "Electrical Engineering"},
            headers=s1_headers
        )
        record(
            "2.2 Student cannot change department",
            res.status_code == 403,
            f"status={res.status_code}, detail={res.text}"
        )

        # 2.3 Student attempts to change studentId / studentNumber
        res = requests.put(
            f"{base_url}/users/{s1_active_id}",
            json={"studentId": "HACKED-999"},
            headers=s1_headers
        )
        record(
            "2.3 Student cannot change studentId",
            res.status_code == 403,
            f"status={res.status_code}, detail={res.text}"
        )

        # 2.4 Student attempts to change email
        res = requests.put(
            f"{base_url}/users/{s1_active_id}",
            json={"email": "hacked@lms.com"},
            headers=s1_headers
        )
        record(
            "2.4 Student cannot change email",
            res.status_code == 403,
            f"status={res.status_code}, detail={res.text}"
        )

        # 2.5 Student attempts to elevate role
        res = requests.put(
            f"{base_url}/users/{s1_active_id}",
            json={"role": "admin"},
            headers=s1_headers
        )
        record(
            "2.5 Student cannot change role",
            res.status_code == 403,
            f"status={res.status_code}, detail={res.text}"
        )

        # 2.6 Student attempts to change status
        res = requests.put(
            f"{base_url}/users/{s1_active_id}",
            json={"status": "active"},
            headers=s1_headers
        )
        record(
            "2.6 Student cannot change status",
            res.status_code == 403,
            f"status={res.status_code}, detail={res.text}"
        )

        # 2.7 Student attempts to set trainer employeeId
        res = requests.put(
            f"{base_url}/users/{s1_active_id}",
            json={"employeeId": "EMP-999"},
            headers=s1_headers
        )
        record(
            "2.7 Student cannot change employeeId",
            res.status_code == 403,
            f"status={res.status_code}, detail={res.text}"
        )

        # =================================================================
        # TEST GROUP 3: Strict Schema Validation (Extra Fields Rejected 422)
        # =================================================================
        print("\n--- Test Group 3: Strict Schema Validation (extra='forbid') ---")

        # 3.1 Unknown field rejected with 422
        res = requests.put(
            f"{base_url}/users/{s1_active_id}",
            json={"name": "Alice W", "unknownHackedField": "injected_data"},
            headers=s1_headers
        )
        record(
            "3.1 Extra payload field rejected with 422",
            res.status_code == 422,
            f"status={res.status_code}, detail={res.text}"
        )

        # 3.2 Admin sending unknown field rejected with 422
        res = requests.put(
            f"{base_url}/users/{s1_active_id}",
            json={"isAdmin": True},
            headers=admin_headers
        )
        record(
            "3.2 Admin sending extra payload field rejected with 422",
            res.status_code == 422,
            f"status={res.status_code}, detail={res.text}"
        )

        # =================================================================
        # TEST GROUP 4: Cross-User Updates Blocked
        # =================================================================
        print("\n--- Test Group 4: Cross-User Update Authorization ---")

        # 4.1 Student 1 attempts to update Student 2
        res = requests.put(
            f"{base_url}/users/{s2_active_id}",
            json={"name": "Bob Tampered"},
            headers=s1_headers
        )
        record(
            "4.1 Student cannot update another student (403)",
            res.status_code == 403,
            f"status={res.status_code}, detail={res.text}"
        )

        # 4.2 Student 1 attempts to update Admin
        res = requests.put(
            f"{base_url}/users/{admin_id}",
            json={"name": "Fake Admin"},
            headers=s1_headers
        )
        record(
            "4.2 Student cannot update admin (403)",
            res.status_code == 403,
            f"status={res.status_code}, detail={res.text}"
        )

        # 4.3 Trainer attempts to update Student 1
        res = requests.put(
            f"{base_url}/users/{s1_active_id}",
            json={"name": "Alice By Trainer"},
            headers=trainer_headers
        )
        record(
            "4.3 Trainer cannot update student profile (403)",
            res.status_code == 403,
            f"status={res.status_code}, detail={res.text}"
        )

        # =================================================================
        # TEST GROUP 5: Trainer Self-Update Rules
        # =================================================================
        print("\n--- Test Group 5: Trainer Self-Update Validation ---")

        # 5.1 Trainer updates permitted self fields (name, phone, specialization)
        res = requests.put(
            f"{base_url}/users/{trainer_id}",
            json={"name": "Thomas Trainer", "phoneNumber": "+1-555-7777", "specialization": "Data Structures"},
            headers=trainer_headers
        )
        record(
            "5.1 Trainer updates name, phone, and specialization",
            res.status_code == 200 and res.json().get("name") == "Thomas Trainer",
            f"status={res.status_code}, name={res.json().get('name') if res.status_code == 200 else res.text}"
        )

        # 5.2 Trainer attempts to change own role
        res = requests.put(
            f"{base_url}/users/{trainer_id}",
            json={"role": "admin"},
            headers=trainer_headers
        )
        record(
            "5.2 Trainer cannot change own role (403)",
            res.status_code == 403,
            f"status={res.status_code}, detail={res.text}"
        )

        # 5.3 Trainer attempts to change own status
        res = requests.put(
            f"{base_url}/users/{trainer_id}",
            json={"status": "archived"},
            headers=trainer_headers
        )
        record(
            "5.3 Trainer cannot change own status (403)",
            res.status_code == 403,
            f"status={res.status_code}, detail={res.text}"
        )

        # =================================================================
        # TEST GROUP 6: Admin Updates & Prevention of Dynamic Record Creation
        # =================================================================
        print("\n--- Test Group 6: Administrative Updates & Record Integrity ---")

        # 6.1 Admin assigns student to existing batch
        res = requests.put(
            f"{base_url}/users/{s1_active_id}",
            json={"batch": "CS-2026"},
            headers=admin_headers
        )
        record(
            "6.1 Admin assigns student to existing batch (200)",
            res.status_code == 200,
            f"status={res.status_code}, detail={res.text}"
        )

        # 6.2 Admin attempts to assign student to NON-EXISTENT batch
        res = requests.put(
            f"{base_url}/users/{s1_active_id}",
            json={"batch": "NonExistentBatch999"},
            headers=admin_headers
        )
        record(
            "6.2 Admin assigning non-existent batch rejected with 404",
            res.status_code == 404,
            f"status={res.status_code}, detail={res.text}"
        )
        # Verify in DB that NonExistentBatch999 was NOT created
        verify_db = TestSession()
        b_check = verify_db.query(models.Batch).filter_by(name="NonExistentBatch999").first()
        record(
            "6.2 Verification: No dynamic batch creation occurred",
            b_check is None,
            f"found batch={b_check}"
        )
        verify_db.close()

        # 6.3 Admin attempts to assign student to NON-EXISTENT department
        res = requests.put(
            f"{base_url}/users/{s1_active_id}",
            json={"department": "NonExistentDept999"},
            headers=admin_headers
        )
        record(
            "6.3 Admin assigning non-existent department rejected with 404",
            res.status_code == 404,
            f"status={res.status_code}, detail={res.text}"
        )
        verify_db = TestSession()
        d_check = verify_db.query(models.Department).filter_by(name="NonExistentDept999").first()
        record(
            "6.3 Verification: No dynamic department creation occurred",
            d_check is None,
            f"found dept={d_check}"
        )
        verify_db.close()

        # 6.4 Institution assigns student to existing department
        res = requests.put(
            f"{base_url}/users/{s1_active_id}",
            json={"department": "Electrical Engineering"},
            headers=inst_headers
        )
        record(
            "6.4 Institution assigns student to existing department (200)",
            res.status_code == 200,
            f"status={res.status_code}, detail={res.text}"
        )

        # =================================================================
        # TEST GROUP 7: Account Status Enforcement during Login
        # =================================================================
        print("\n--- Test Group 7: Account Status Enforcement during Login ---")

        # 7.1 Active student logs in successfully
        res = requests.post(
            f"{base_url}/auth/login",
            json={"identifier": "student1@lms.com", "password": "student_pass"}
        )
        record(
            "7.1 Active account login succeeds (200)",
            res.status_code == 200 and "token" in res.json(),
            f"status={res.status_code}, has_token={'token' in res.json() if res.status_code == 200 else False}"
        )

        # 7.2 Suspended student logs in -> 403 Forbidden
        res = requests.post(
            f"{base_url}/auth/login",
            json={"identifier": "suspended@lms.com", "password": "student_pass"}
        )
        record(
            "7.2 Suspended account login rejected with 403",
            res.status_code == 403,
            f"status={res.status_code}, detail={res.text}"
        )

        # 7.3 Inactive student logs in -> 403 Forbidden
        res = requests.post(
            f"{base_url}/auth/login",
            json={"identifier": "inactive@lms.com", "password": "student_pass"}
        )
        record(
            "7.3 Inactive account login rejected with 403",
            res.status_code == 403,
            f"status={res.status_code}, detail={res.text}"
        )

        # 7.4 Archived student logs in -> 403 Forbidden
        res = requests.post(
            f"{base_url}/auth/login",
            json={"identifier": "archived@lms.com", "password": "student_pass"}
        )
        record(
            "7.4 Archived account login rejected with 403",
            res.status_code == 403,
            f"status={res.status_code}, detail={res.text}"
        )

        # 7.5 Suspended student with wrong password -> 401 Unauthorized (does not leak status)
        res = requests.post(
            f"{base_url}/auth/login",
            json={"identifier": "suspended@lms.com", "password": "wrong_password"}
        )
        record(
            "7.5 Suspended account with wrong password returns 401 (SEC-002 preserved)",
            res.status_code == 401,
            f"status={res.status_code}, detail={res.text}"
        )

        # =================================================================
        # TEST GROUP 8: Protected Endpoint Token Status Enforcement (get_current_user)
        # =================================================================
        print("\n--- Test Group 8: Account Status on Protected Endpoints ---")

        # 8.1 Active user token accesses protected endpoint
        res = requests.get(
            f"{base_url}/users/{s1_active_id}",
            headers=s1_headers
        )
        record(
            "8.1 Active user token accesses protected endpoint (200)",
            res.status_code == 200,
            f"status={res.status_code}, email={res.json().get('email') if res.status_code == 200 else res.text}"
        )

        # 8.2 Suspended user token rejected with 403
        res = requests.get(
            f"{base_url}/users/{s_suspended_id}",
            headers=suspended_headers
        )
        record(
            "8.2 Suspended user token rejected with 403",
            res.status_code == 403,
            f"status={res.status_code}, detail={res.text}"
        )

        # 8.3 Inactive user token rejected with 403
        inactive_headers = {"Authorization": f"Bearer {inactive_token}", "Content-Type": "application/json"}
        res = requests.get(
            f"{base_url}/users/{s_inactive_id}",
            headers=inactive_headers
        )
        record(
            "8.3 Inactive user token rejected with 403",
            res.status_code == 403,
            f"status={res.status_code}, detail={res.text}"
        )

        # 8.4 Archived user token rejected with 403
        archived_headers = {"Authorization": f"Bearer {archived_token}", "Content-Type": "application/json"}
        res = requests.get(
            f"{base_url}/users/{s_archived_id}",
            headers=archived_headers
        )
        record(
            "8.4 Archived user token rejected with 403",
            res.status_code == 403,
            f"status={res.status_code}, detail={res.text}"
        )

        # 8.5 Real-time token invalidation: Active user token revoked when status changed to suspended
        # Step a: Student 2 logs in and gets fresh token
        login_res = requests.post(
            f"{base_url}/auth/login",
            json={"identifier": "student2@lms.com", "password": "student_pass"}
        )
        s2_fresh_token = login_res.json()["token"]
        s2_fresh_headers = {"Authorization": f"Bearer {s2_fresh_token}", "Content-Type": "application/json"}

        # Step b: Verify token works
        check_before = requests.get(f"{base_url}/users/{s2_active_id}", headers=s2_fresh_headers)
        record(
            "8.5a Fresh token for Student 2 works initially (200)",
            check_before.status_code == 200,
            f"status={check_before.status_code}"
        )

        # Step c: Admin changes Student 2's status to 'suspended'
        suspend_res = requests.put(
            f"{base_url}/users/{s2_active_id}",
            json={"status": "suspended"},
            headers=admin_headers
        )
        record(
            "8.5b Admin suspends Student 2 account (200)",
            suspend_res.status_code == 200 and suspend_res.json().get("status") == "suspended",
            f"status={suspend_res.status_code}, status_val={suspend_res.json().get('status') if suspend_res.status_code == 200 else suspend_res.text}"
        )

        # Step d: Student 2's previously issued token MUST now be rejected with 403
        check_after = requests.get(f"{base_url}/users/{s2_active_id}", headers=s2_fresh_headers)
        record(
            "8.5c Previously issued token now immediately rejected with 403",
            check_after.status_code == 403,
            f"status={check_after.status_code}, detail={check_after.text}"
        )

        # Step e: Student 2 cannot log in now
        login_after = requests.post(
            f"{base_url}/auth/login",
            json={"identifier": "student2@lms.com", "password": "student_pass"}
        )
        record(
            "8.5d Disabled Student 2 cannot log in anymore (403)",
            login_after.status_code == 403,
            f"status={login_after.status_code}, detail={login_after.text}"
        )

        print("\n==================================================================")
        print(f"ALL {len(test_results)} CRIT-04 VERIFICATION TESTS PASSED SUCCESSFULLY!")
        print("==================================================================")

    finally:
        server.should_exit = True
        server_thread.join(timeout=3)
        if os.path.exists(db_path):
            try:
                os.remove(db_path)
            except Exception:
                pass

if __name__ == "__main__":
    run_tests()
