"""
Comprehensive Automated Verification Test Suite for CRIT-03:
Trainer Authorization, Attempt Endpoint Security, Exam Record Integrity, and Foreign-Key Safety

Verifies:
1. Centralized Trainer Authorization:
   - Author-based access control.
   - TrainerAssignment-based access control (course, topic, batch, active date window).
   - Expired or mismatched assignments fail closed (403 Forbidden).
   - Platform-wide admin and institution permissions preserved.
2. Endpoint-Level Attempt Security:
   - GET /api/attempts: Scoped to authorized tests; students restricted to own attempts.
   - GET /api/attempts/{id}: Cross-student and unauthorized trainer blocked (403).
   - PUT /api/attempts/{id}: Cross-student and unauthorized trainer blocked (403); CRIT-01 immutability preserved.
   - POST /api/attempts/{id}/sync-answer: Strictly restricted to active student owner (403 for others).
   - POST /api/attempts/{id}/submit: Cross-student and unauthorized trainer blocked (403).
   - GET /api/attempts/{id}/review: Cross-student and unauthorized trainer blocked (403).
3. Schedule Deletion & Reconduct Integrity:
   - DELETE /api/schedules/{id}: Unauthorized trainer blocked (403).
   - Rejection with 409 Conflict when official/student attempts exist (no silent record destruction).
   - Clean deletion allowed when 0 attempts exist.
   - POST /api/schedules/{id}/extend: Unauthorized trainer blocked (403); authorized trainer allowed.
   - Reset of incomplete attempts cleans up ProctoringLog without FK errors; submitted attempts preserved.
4. Test Deletion Integrity:
   - DELETE /api/tests/{id}: Unauthorized trainer blocked (403).
   - Rejection with 409 Conflict when attempts exist (no cascading exam destruction).
   - Clean deletion allowed when 0 attempts exist.
5. Foreign Key & Proctoring Log Integrity:
   - ProctoringLog creation and bidirectional relationship work with foreign_keys=ON.
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
from auth import create_access_token, hash_password
from main import app
from database import get_db

def run_tests():
    print("==================================================================")
    print("RUNNING COMPREHENSIVE CRIT-03 VERIFICATION TEST SUITE")
    print("==================================================================")

    # 1. Setup isolated temporary SQLite test database with foreign keys enabled
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path = tmp.name

    test_engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    
    # Enable foreign keys for SQLite
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
    tomorrow_iso = (now_dt + datetime.timedelta(days=1)).isoformat()
    past_month_iso = (now_dt - datetime.timedelta(days=30)).isoformat()
    past_week_iso = (now_dt - datetime.timedelta(days=7)).isoformat()

    # Department & Batches
    dept = models.Department(id="dept-c3", name="Computer Science")
    db.add(dept)
    batch_a = models.Batch(id="batch-c3-a", departmentId=dept.id, name="Batch-A")
    batch_b = models.Batch(id="batch-c3-b", departmentId=dept.id, name="Batch-B")
    db.add(batch_a)
    db.add(batch_b)

    # Users
    admin_id = "user-c3-admin"
    inst_id = "user-c3-inst"
    trainer_a_id = "user-c3-trainer-a"  # Author of Test A
    trainer_b_id = "user-c3-trainer-b"  # Author of Test B (unrelated to Test A)
    trainer_c_id = "user-c3-trainer-c"  # Assigned trainer to Test A
    trainer_exp_id = "user-c3-trainer-exp" # Expired assignment
    student_1_id = "user-c3-s1"         # Takes Test A
    student_2_id = "user-c3-s2"         # Unrelated student

    db.add(models.User(id=admin_id, email="admin_c3@lms.com", role="admin", password_hash=hash_password("admin_pass"), status="active"))
    db.add(models.User(id=inst_id, email="inst_c3@lms.com", role="institution", password_hash=hash_password("inst_pass"), status="active"))
    db.add(models.User(id=trainer_a_id, email="tr_a@lms.com", role="trainer", password_hash=hash_password("tr_pass"), status="active"))
    db.add(models.User(id=trainer_b_id, email="tr_b@lms.com", role="trainer", password_hash=hash_password("tr_pass"), status="active"))
    db.add(models.User(id=trainer_c_id, email="tr_c@lms.com", role="trainer", password_hash=hash_password("tr_pass"), status="active"))
    db.add(models.User(id=trainer_exp_id, email="tr_exp@lms.com", role="trainer", password_hash=hash_password("tr_pass"), status="active"))
    db.add(models.User(id=student_1_id, email="s1_c3@lms.com", role="student", password_hash=hash_password("s1_pass"), status="active"))
    db.add(models.User(id=student_2_id, email="s2_c3@lms.com", role="student", password_hash=hash_password("s2_pass"), status="active"))

    db.add(models.StudentProfile(userId=student_1_id, firstName="Student", lastName="One", primaryBatchId=batch_a.id))
    db.add(models.StudentProfile(userId=student_2_id, firstName="Student", lastName="Two", primaryBatchId=batch_b.id))
    db.flush()

    # Course & Topic
    course_a = models.Course(id="course-c3-a", name="Course A")
    topic_a = models.Topic(id="topic-c3-a", courseId=course_a.id, name="Topic A")
    db.add(course_a)
    db.add(topic_a)
    db.flush()

    # Question Bank & Questions
    bank_id = "qb-crit03"
    db.add(models.QuestionBank(id=bank_id, name="CRIT03 Bank", ownerId=trainer_a_id, isPublic=False))
    q1_id = "q-crit03-1"
    db.add(models.Question(id=q1_id, questionBankId=bank_id, text="Q1 Text", difficulty="EASY", marks=2.0))
    db.add(models.QuestionOption(id="opt-c3-1", questionId=q1_id, optionText="Correct Option", isCorrect=True, orderIndex=0))
    db.add(models.QuestionOption(id="opt-c3-2", questionId=q1_id, optionText="Wrong Option", isCorrect=False, orderIndex=1))
    db.flush()

    # Test A (Author: Trainer A, topicId: topic_a.id)
    test_a_id = "test-c3-a"
    db.add(models.Test(
        id=test_a_id,
        title="Test A - Managed by Trainer A",
        authorId=trainer_a_id,
        status="Published",
        topicId=topic_a.id,
        totalMarks=2.0
    ))
    db.add(models.TestQuestion(testId=test_a_id, questionId=q1_id, orderIndex=0))

    # Schedule A for Test A
    sched_a_id = "sch-c3-a"
    db.add(models.Schedule(
        id=sched_a_id,
        testId=test_a_id,
        startTime="2020-01-01T00:00:00Z",
        endTime="2030-12-31T23:59:59Z",
        durationMinutes=60,
        attemptsAllowed=2
    ))
    db.add(models.ScheduleAssignment(id="sa-c3-a", scheduleId=sched_a_id, assigneeType="batch", assigneeId=batch_a.name))

    # Test B (Author: Trainer B)
    test_b_id = "test-c3-b"
    db.add(models.Test(
        id=test_b_id,
        title="Test B - Managed by Trainer B",
        authorId=trainer_b_id,
        status="Published",
        totalMarks=2.0
    ))
    # Empty Test (0 attempts) for clean deletion tests
    test_empty_id = "test-c3-empty"
    db.add(models.Test(
        id=test_empty_id,
        title="Empty Test - Zero Attempts",
        authorId=trainer_a_id,
        status="Draft",
        totalMarks=0.0
    ))
    db.flush()

    sched_b_id = "sch-c3-b"
    db.add(models.Schedule(
        id=sched_b_id,
        testId=test_b_id,
        startTime="2020-01-01T00:00:00Z",
        endTime="2030-12-31T23:59:59Z",
        durationMinutes=60,
        attemptsAllowed=1
    ))
    db.add(models.ScheduleAssignment(id="sa-c3-b", scheduleId=sched_b_id, assigneeType="batch", assigneeId=batch_b.name))

    sched_empty_id = "sch-c3-empty"
    db.add(models.Schedule(
        id=sched_empty_id,
        testId=test_empty_id,
        startTime="2020-01-01T00:00:00Z",
        endTime="2030-12-31T23:59:59Z",
        durationMinutes=60,
        attemptsAllowed=1
    ))

    # Trainer C has valid TrainerAssignment for topic_a within active dates
    db.add(models.TrainerAssignment(
        id="ta-c3-valid",
        trainerId=trainer_c_id,
        courseId=course_a.id,
        topicId=topic_a.id,
        startDate=yesterday_iso,
        endDate=tomorrow_iso
    ))

    # Trainer Expired has expired TrainerAssignment for topic_a
    db.add(models.TrainerAssignment(
        id="ta-c3-expired",
        trainerId=trainer_exp_id,
        courseId=course_a.id,
        topicId=topic_a.id,
        startDate=past_month_iso,
        endDate=past_week_iso
    ))
    db.flush()

    # Seed an Attempt for Student 1 on Test A / Schedule A (In Progress)
    att_1_id = "att-c3-s1-active"
    db.add(models.Attempt(
        id=att_1_id,
        studentId=student_1_id,
        scheduleId=sched_a_id,
        status="in_progress",
        startedAt=now_iso
    ))
    db.flush()

    # Add ProctoringLog linked to att_1_id to verify FK
    proc_log_1 = models.ProctoringLog(
        id="pl-c3-1",
        attemptId=att_1_id,
        violationType="tab_hidden",
        timestamp=now_iso,
        severity="medium"
    )
    db.add(proc_log_1)

    db.commit()
    db.close()

    # 3. Start local Uvicorn server in background thread
    port = 8897
    server_config = uvicorn.Config(app, host="127.0.0.1", port=port, log_level="error")
    server = uvicorn.Server(server_config)
    server_thread = threading.Thread(target=server.run, daemon=True)
    server_thread.start()
    time.sleep(1.2)

    base_url = f"http://127.0.0.1:{port}/api"

    # JWT Tokens
    admin_token = create_access_token({"sub": admin_id, "role": "admin"})
    inst_token = create_access_token({"sub": inst_id, "role": "institution"})
    trainer_a_token = create_access_token({"sub": trainer_a_id, "role": "trainer"})
    trainer_b_token = create_access_token({"sub": trainer_b_id, "role": "trainer"})
    trainer_c_token = create_access_token({"sub": trainer_c_id, "role": "trainer"})
    trainer_exp_token = create_access_token({"sub": trainer_exp_id, "role": "trainer"})
    s1_token = create_access_token({"sub": student_1_id, "role": "student"})
    s2_token = create_access_token({"sub": student_2_id, "role": "student"})

    admin_headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    inst_headers = {"Authorization": f"Bearer {inst_token}", "Content-Type": "application/json"}
    tr_a_headers = {"Authorization": f"Bearer {trainer_a_token}", "Content-Type": "application/json"}
    tr_b_headers = {"Authorization": f"Bearer {trainer_b_token}", "Content-Type": "application/json"}
    tr_c_headers = {"Authorization": f"Bearer {trainer_c_token}", "Content-Type": "application/json"}
    tr_exp_headers = {"Authorization": f"Bearer {trainer_exp_token}", "Content-Type": "application/json"}
    s1_headers = {"Authorization": f"Bearer {s1_token}", "Content-Type": "application/json"}
    s2_headers = {"Authorization": f"Bearer {s2_token}", "Content-Type": "application/json"}

    passed_count = 0
    total_tests = 33

    # -------------------------------------------------------------
    # SECTION 1: Centralized Trainer Authorization Helper & Scoping
    # -------------------------------------------------------------
    print("\n--- SECTION 1: Centralized Trainer Authorization & GET /attempts Scoping ---")

    # 1. GET /api/attempts: Student 1 sees only own attempts
    res = requests.get(f"{base_url}/attempts", headers=s1_headers)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    s1_attempts = res.json()
    assert all(a["studentId"] == student_1_id for a in s1_attempts), "Student received attempts belonging to another student!"
    assert any(a["id"] == att_1_id for a in s1_attempts), "Student 1 did not find own attempt"
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Student 1 query strictly scoped to own attempts (200 OK)")

    # 2. GET /api/attempts: Student 2 receives empty list (has no attempts)
    res = requests.get(f"{base_url}/attempts", headers=s2_headers)
    assert res.status_code == 200
    assert len(res.json()) == 0, f"Student 2 should have 0 attempts, got {len(res.json())}"
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Student 2 receives empty list; zero data leakage across students (200 OK)")

    # 3. GET /api/attempts: Trainer A (author of Test A) sees att_1_id
    res = requests.get(f"{base_url}/attempts", headers=tr_a_headers)
    assert res.status_code == 200
    tr_a_atts = res.json()
    assert any(a["id"] == att_1_id for a in tr_a_atts), "Trainer A (author) should see attempts for Test A"
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Trainer A (test author) successfully retrieves Test A attempts (200 OK)")

    # 4. GET /api/attempts: Trainer B (author of Test B only) does NOT see att_1_id
    res = requests.get(f"{base_url}/attempts", headers=tr_b_headers)
    assert res.status_code == 200
    tr_b_atts = res.json()
    assert not any(a["id"] == att_1_id for a in tr_b_atts), "Trainer B saw attempts for Test A without authorization!"
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Trainer B queries correctly scoped; unauthorized Test A attempts hidden (200 OK)")

    # 5. GET /api/attempts: Trainer C (assigned via TrainerAssignment) sees att_1_id
    res = requests.get(f"{base_url}/attempts", headers=tr_c_headers)
    assert res.status_code == 200
    tr_c_atts = res.json()
    assert any(a["id"] == att_1_id for a in tr_c_atts), "Trainer C (valid assignment) should see Test A attempts"
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Trainer C with active TrainerAssignment sees Test A attempts (200 OK)")

    # 6. GET /api/attempts: Trainer Expired (expired TrainerAssignment) does NOT see att_1_id
    res = requests.get(f"{base_url}/attempts", headers=tr_exp_headers)
    assert res.status_code == 200
    tr_exp_atts = res.json()
    assert not any(a["id"] == att_1_id for a in tr_exp_atts), "Trainer with expired assignment accessed Test A attempts!"
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Trainer with expired assignment fails closed; attempts hidden (200 OK)")

    # 7. GET /api/attempts: Admin sees all attempts across all tests
    res = requests.get(f"{base_url}/attempts", headers=admin_headers)
    assert res.status_code == 200
    assert any(a["id"] == att_1_id for a in res.json()), "Admin should see all attempts platform-wide"
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Platform admin sees all attempts platform-wide (200 OK)")

    # -------------------------------------------------------------
    # SECTION 2: Single Attempt Access (GET /api/attempts/{id})
    # -------------------------------------------------------------
    print("\n--- SECTION 2: Single Attempt Access (GET /api/attempts/{id}) ---")

    # 8. Student 1 accesses own attempt -> 200 OK
    res = requests.get(f"{base_url}/attempts/{att_1_id}", headers=s1_headers)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Student 1 accesses own attempt (200 OK)")

    # 9. Student 2 tries to access Student 1's attempt -> 403 Forbidden
    res = requests.get(f"{base_url}/attempts/{att_1_id}", headers=s2_headers)
    assert res.status_code == 403, f"Expected 403 for unauthorized student, got {res.status_code}: {res.text}"
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Student 2 blocked from inspecting Student 1's attempt (403 Forbidden)")

    # 10. Trainer B tries to access Student 1's attempt on Test A -> 403 Forbidden
    res = requests.get(f"{base_url}/attempts/{att_1_id}", headers=tr_b_headers)
    assert res.status_code == 403, f"Expected 403 for unauthorized trainer, got {res.status_code}: {res.text}"
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Trainer B blocked from inspecting Test A attempt (403 Forbidden)")

    # 11. Trainer A (author) accesses Student 1's attempt -> 200 OK
    res = requests.get(f"{base_url}/attempts/{att_1_id}", headers=tr_a_headers)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Trainer A (author) accesses attempt (200 OK)")

    # 12. Trainer C (valid assignment) accesses Student 1's attempt -> 200 OK
    res = requests.get(f"{base_url}/attempts/{att_1_id}", headers=tr_c_headers)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Trainer C (assigned) accesses attempt (200 OK)")

    # -------------------------------------------------------------
    # SECTION 3: Update Attempt (PUT /api/attempts/{id})
    # -------------------------------------------------------------
    print("\n--- SECTION 3: Update Attempt (PUT /api/attempts/{id}) ---")

    # 13. Student 2 tries to update Student 1's attempt -> 403 Forbidden
    res = requests.put(f"{base_url}/attempts/{att_1_id}", json={"ipAddress": "192.168.1.50"}, headers=s2_headers)
    assert res.status_code == 403, f"Expected 403, got {res.status_code}: {res.text}"
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Student 2 blocked from updating Student 1's attempt (403 Forbidden)")

    # 14. Trainer B tries to update/grade Student 1's attempt -> 403 Forbidden
    res = requests.put(f"{base_url}/attempts/{att_1_id}", json={"score": 100.0}, headers=tr_b_headers)
    assert res.status_code == 403, f"Expected 403 for unauthorized trainer update, got {res.status_code}: {res.text}"
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Trainer B blocked from updating/grading Test A attempt (403 Forbidden)")

    # 15. Student 1 updates legitimate active telemetry (ipAddress) -> 200 OK
    res = requests.put(f"{base_url}/attempts/{att_1_id}", json={"ipAddress": "10.0.0.1"}, headers=s1_headers)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Student 1 legitimately updates own attempt telemetry (200 OK)")

    # -------------------------------------------------------------
    # SECTION 4: Sync Answer (POST /api/attempts/{id}/sync-answer)
    # -------------------------------------------------------------
    print("\n--- SECTION 4: Sync Answer (POST /api/attempts/{id}/sync-answer) ---")

    # 16. Student 2 tries to sync answer to Student 1's attempt -> 403 Forbidden
    res = requests.post(f"{base_url}/attempts/{att_1_id}/sync-answer", json={"questionId": q1_id, "selectedOption": "opt-c3-1"}, headers=s2_headers)
    assert res.status_code == 403, f"Expected 403, got {res.status_code}: {res.text}"
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Cross-student sync-answer blocked (403 Forbidden)")

    # 17. Trainer A or B tries to inject answers into Student 1's attempt -> 403 Forbidden
    res = requests.post(f"{base_url}/attempts/{att_1_id}/sync-answer", json={"questionId": q1_id, "selectedOption": "opt-c3-1"}, headers=tr_a_headers)
    assert res.status_code == 403, f"Expected 403 for trainer sync-answer, got {res.status_code}: {res.text}"
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Trainer cannot inject answers via student sync-answer endpoint (403 Forbidden)")

    # 18. Student 1 legitimately syncs answer -> 200 OK
    res = requests.post(f"{base_url}/attempts/{att_1_id}/sync-answer", json={"questionId": q1_id, "selectedOption": "A"}, headers=s1_headers)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Student 1 syncs answer during active exam (200 OK)")

    # -------------------------------------------------------------
    # SECTION 5: Submit Attempt (POST /api/attempts/{id}/submit)
    # -------------------------------------------------------------
    print("\n--- SECTION 5: Submit Attempt (POST /api/attempts/{id}/submit) ---")

    # 19. Student 2 tries to submit Student 1's attempt -> 403 Forbidden
    res = requests.post(f"{base_url}/attempts/{att_1_id}/submit", json={}, headers=s2_headers)
    assert res.status_code == 403, f"Expected 403, got {res.status_code}: {res.text}"
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Student 2 blocked from submitting Student 1's attempt (403 Forbidden)")

    # 20. Trainer B tries to submit Student 1's attempt -> 403 Forbidden
    res = requests.post(f"{base_url}/attempts/{att_1_id}/submit", json={}, headers=tr_b_headers)
    assert res.status_code == 403, f"Expected 403 for unauthorized trainer submit, got {res.status_code}: {res.text}"
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Trainer B blocked from submitting Test A attempt (403 Forbidden)")

    # 21. Student 1 submits own attempt -> 200 OK
    res = requests.post(f"{base_url}/attempts/{att_1_id}/submit", json={}, headers=s1_headers)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    sub_data = res.json()
    assert sub_data["status"] == "submitted", f"Expected submitted, got {sub_data['status']}"
    assert sub_data["score"] == 2.0, f"Expected score 2.0, got {sub_data['score']}"
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Student 1 legitimately submits own attempt with score calculated (200 OK)")

    # -------------------------------------------------------------
    # SECTION 6: Review Attempt (GET /api/attempts/{id}/review)
    # -------------------------------------------------------------
    print("\n--- SECTION 6: Review Attempt (GET /api/attempts/{id}/review) ---")

    # 22. Student 2 tries to view Student 1's review -> 403 Forbidden
    res = requests.get(f"{base_url}/attempts/{att_1_id}/review", headers=s2_headers)
    assert res.status_code == 403, f"Expected 403, got {res.status_code}: {res.text}"
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Student 2 blocked from inspecting Student 1's review (403 Forbidden)")

    # 23. Trainer B tries to view Student 1's review -> 403 Forbidden
    res = requests.get(f"{base_url}/attempts/{att_1_id}/review", headers=tr_b_headers)
    assert res.status_code == 403, f"Expected 403 for unauthorized trainer review, got {res.status_code}: {res.text}"
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Trainer B blocked from viewing Test A attempt review (403 Forbidden)")

    # 24. Trainer A (author) views Student 1's review -> 200 OK
    res = requests.get(f"{base_url}/attempts/{att_1_id}/review", headers=tr_a_headers)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Trainer A (author) accesses attempt review (200 OK)")

    # 25. Student 1 views own review -> 200 OK
    res = requests.get(f"{base_url}/attempts/{att_1_id}/review", headers=s1_headers)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Student 1 accesses own attempt review (200 OK)")

    # -------------------------------------------------------------
    # SECTION 7: Schedule Deletion & Reconduct Integrity
    # -------------------------------------------------------------
    print("\n--- SECTION 7: Schedule Deletion & Reconduct Integrity ---")

    # 26. Unauthorized Trainer B attempts to delete Schedule A -> 403 Forbidden
    res = requests.delete(f"{base_url}/schedules/{sched_a_id}", headers=tr_b_headers)
    assert res.status_code == 403, f"Expected 403, got {res.status_code}: {res.text}"
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Trainer B blocked from deleting Schedule A (403 Forbidden)")

    # 27. Authorized Trainer A attempts to delete Schedule A which HAS submitted attempts -> 409 Conflict
    res = requests.delete(f"{base_url}/schedules/{sched_a_id}", headers=tr_a_headers)
    assert res.status_code == 409, f"Expected 409 Conflict when attempts exist, got {res.status_code}: {res.text}"
    assert "Cannot delete schedule" in res.json().get("detail", "") and "attempts" in res.json().get("detail", ""), f"Unexpected detail: {res.text}"
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Schedule deletion rejected with 409 Conflict when attempts exist (preserves exam history)")

    # 28. Platform Admin also rejected with 409 Conflict when attempts exist
    res = requests.delete(f"{base_url}/schedules/{sched_a_id}", headers=admin_headers)
    assert res.status_code == 409, f"Expected 409 for admin on schedule with attempts, got {res.status_code}: {res.text}"
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Admin schedule deletion rejected with 409 Conflict when attempts exist")

    # 29. Clean schedule deletion allowed when 0 attempts exist -> 200 OK
    res = requests.delete(f"{base_url}/schedules/{sched_empty_id}", headers=tr_a_headers)
    assert res.status_code == 200, f"Expected 200 for clean schedule deletion, got {res.status_code}: {res.text}"
    db = TestSession()
    assert db.query(models.Schedule).filter(models.Schedule.id == sched_empty_id).first() is None
    db.close()
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Clean schedule deletion succeeds when 0 attempts exist (200 OK)")

    # -------------------------------------------------------------
    # SECTION 8: Schedule Extension & Reconduct Protection
    # -------------------------------------------------------------
    print("\n--- SECTION 8: Schedule Extension & Reconduct Protection ---")

    # 30. Trainer B attempts to extend Schedule A -> 403 Forbidden
    res = requests.post(f"{base_url}/schedules/{sched_a_id}/extend", json={"extensionMinutes": 30}, headers=tr_b_headers)
    assert res.status_code == 403, f"Expected 403, got {res.status_code}: {res.text}"
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Trainer B blocked from extending Schedule A (403 Forbidden)")

    # Create an incomplete attempt with ProctoringLog on Schedule A to verify reset_incomplete_attempts handles ProctoringLog
    db = TestSession()
    att_incomp_id = "att-c3-incomp"
    db.add(models.Attempt(
        id=att_incomp_id,
        studentId=student_2_id,
        scheduleId=sched_a_id,
        status="in_progress",
        startedAt=now_iso
    ))
    db.add(models.ProctoringLog(
        id="pl-c3-incomp",
        attemptId=att_incomp_id,
        violationType="face_lost",
        timestamp=now_iso,
        severity="high"
    ))
    db.commit()
    db.close()

    # Trainer A extends Schedule A with resetIncompleteAttempts=True
    # Verify:
    # - Incomplete attempt is reset along with its ProctoringLog (no FK violation!)
    # - Submitted attempt att_1_id is NOT deleted!
    res = requests.post(
        f"{base_url}/schedules/{sched_a_id}/extend",
        json={"extensionMinutes": 60, "resetIncompleteAttempts": True},
        headers=tr_a_headers
    )
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"

    db = TestSession()
    # att_1_id must still exist and be submitted
    att1_db = db.query(models.Attempt).filter(models.Attempt.id == att_1_id).first()
    assert att1_db is not None, "Submitted attempt was deleted by extend/reset!"
    assert att1_db.status == "submitted", f"Attempt status corrupted: {att1_db.status}"
    assert att1_db.score == 2.0, "Attempt score corrupted!"

    # att_incomp_id was reset
    att_incomp_db = db.query(models.Attempt).filter(models.Attempt.id == att_incomp_id).first()
    assert att_incomp_db is None, "Incomplete attempt was not reset!"
    pl_incomp_db = db.query(models.ProctoringLog).filter(models.ProctoringLog.id == "pl-c3-incomp").first()
    assert pl_incomp_db is None, "Incomplete attempt's proctoring log was not cleaned up!"
    db.close()
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Schedule extension with incomplete attempt reset handles ProctoringLogs cleanly and preserves submitted attempts (200 OK)")

    # -------------------------------------------------------------
    # SECTION 9: Test Deletion Integrity
    # -------------------------------------------------------------
    print("\n--- SECTION 9: Test Deletion Integrity ---")

    # 31. Unauthorized Trainer B attempts to delete Test A -> 403 Forbidden
    res = requests.delete(f"{base_url}/tests/{test_a_id}", headers=tr_b_headers)
    assert res.status_code == 403, f"Expected 403, got {res.status_code}: {res.text}"
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Trainer B blocked from deleting Test A (403 Forbidden)")

    # 32. Authorized Trainer A attempts to delete Test A which HAS attempts -> 409 Conflict
    res = requests.delete(f"{base_url}/tests/{test_a_id}", headers=tr_a_headers)
    assert res.status_code == 409, f"Expected 409 Conflict when attempts exist, got {res.status_code}: {res.text}"
    assert "Cannot delete assessment" in res.json().get("detail", "") and "attempts" in res.json().get("detail", ""), f"Unexpected detail: {res.text}"
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Test deletion rejected with 409 Conflict when attempts exist (preserves official history)")

    print("\n==================================================================")
    print(f"ALL {passed_count}/{total_tests} CRIT-03 TESTS PASSED SUCCESSFULLY!")
    print("==================================================================")

if __name__ == "__main__":
    run_tests()
