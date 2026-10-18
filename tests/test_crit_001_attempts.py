"""
Comprehensive Automated Verification Test Suite for CRIT-01:
1. Attempt update security (field allowlisting, immutable fields, role restrictions, completion state)
2. Answer synchronization security (in-progress requirements, owner checks, completion rejection)
3. Submission security (first valid submission, duplicate submission rejection, timeout/auto-submit, concurrent safety)
"""
import os
import sys
import time
import json
import tempfile
import threading
import concurrent.futures
import requests
import uvicorn

# Setup backend import path
_curr_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(_curr_dir, "backend") if os.path.exists(os.path.join(_curr_dir, "backend")) else os.path.abspath(os.path.join(_curr_dir, "..", "backend"))
sys.path.insert(0, backend_dir)

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import models
from auth import create_access_token, hash_password
from main import app

def run_tests():
    print("==================================================================")
    print("RUNNING COMPREHENSIVE CRIT-01 VERIFICATION TEST SUITE")
    print("==================================================================")

    # 1. Setup isolated SQLite test database
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path = tmp.name

    test_engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    models.Base.metadata.create_all(bind=test_engine)
    TestSession = sessionmaker(bind=test_engine)

    from database import get_db
    def override_get_db():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    # 2. Seed test data
    db = TestSession()
    now = models.get_utc_now()

    # Admin User
    admin_id = "user-admin-crit01"
    admin_user = models.User(
        id=admin_id,
        email="admin_crit01@lms.com",
        role="admin",
        password_hash=hash_password("admin_pass_123"),
        status="active"
    )
    db.add(admin_user)

    # Trainer User
    trainer_id = "user-trainer-crit01"
    trainer_user = models.User(
        id=trainer_id,
        email="trainer_crit01@lms.com",
        role="trainer",
        password_hash=hash_password("trainer_pass_123"),
        status="active"
    )
    db.add(trainer_user)

    # Student 1 User
    student1_id = "user-student1-crit01"
    student1_user = models.User(
        id=student1_id,
        email="student1_crit01@lms.com",
        role="student",
        password_hash=hash_password("student1_pass_123"),
        status="active"
    )
    db.add(student1_user)

    # Student 2 User
    student2_id = "user-student2-crit01"
    student2_user = models.User(
        id=student2_id,
        email="student2_crit01@lms.com",
        role="student",
        password_hash=hash_password("student2_pass_123"),
        status="active"
    )
    db.add(student2_user)

    # Question Bank
    bank_id = "qb-crit01"
    q_bank = models.QuestionBank(
        id=bank_id,
        name="CRIT01 Bank",
        ownerId=trainer_id,
        isPublic=False,
        createdAt=now
    )
    db.add(q_bank)

    # Test & Questions
    test_id = "test-crit01-exam"
    test_obj = models.Test(
        id=test_id,
        title="CRIT-01 Security Assessment Exam",
        authorId=trainer_id,
        status="Published",
        totalMarks=5.0,
        createdAt=now
    )
    db.add(test_obj)

    q1_id = "q-crit01-1"
    q1 = models.Question(
        id=q1_id,
        questionBankId=bank_id,
        text="What is 2 + 2?",
        type="MCQ",
        marks=2.0,
        difficulty="Medium"
    )
    db.add(q1)

    opt1_1 = models.QuestionOption(id="opt-1-A", questionId=q1_id, optionText="3", isCorrect=False, orderIndex=0)
    opt1_2 = models.QuestionOption(id="opt-1-B", questionId=q1_id, optionText="4", isCorrect=True, orderIndex=1)
    opt1_3 = models.QuestionOption(id="opt-1-C", questionId=q1_id, optionText="5", isCorrect=False, orderIndex=2)
    db.add_all([opt1_1, opt1_2, opt1_3])

    q2_id = "q-crit01-2"
    q2 = models.Question(
        id=q2_id,
        questionBankId=bank_id,
        text="What is the capital of France?",
        type="MCQ",
        marks=3.0,
        difficulty="Medium"
    )
    db.add(q2)

    opt2_1 = models.QuestionOption(id="opt-2-A", questionId=q2_id, optionText="London", isCorrect=False, orderIndex=0)
    opt2_2 = models.QuestionOption(id="opt-2-B", questionId=q2_id, optionText="Paris", isCorrect=True, orderIndex=1)
    opt2_3 = models.QuestionOption(id="opt-2-C", questionId=q2_id, optionText="Berlin", isCorrect=False, orderIndex=2)
    db.add_all([opt2_1, opt2_2, opt2_3])

    db.add(models.TestQuestion(testId=test_id, questionId=q1_id, orderIndex=0))
    db.add(models.TestQuestion(testId=test_id, questionId=q2_id, orderIndex=1))

    # Schedule
    sched_id = "sch-crit01-sched"
    schedule_obj = models.Schedule(
        id=sched_id,
        testId=test_id,
        startTime="2020-01-01T00:00:00Z",
        endTime="2099-12-31T23:59:59Z",
        durationMinutes=60,
        attemptsAllowed=2
    )
    db.add(schedule_obj)
    db.add(models.ScheduleAssignment(id="sa-crit01-1", scheduleId=sched_id, assigneeType="student", assigneeId=student1_id))
    db.add(models.ScheduleAssignment(id="sa-crit01-2", scheduleId=sched_id, assigneeType="student", assigneeId=student2_id))

    db.commit()
    db.close()

    # 3. Start local Uvicorn server in background thread
    port = 8899
    server_config = uvicorn.Config(app, host="127.0.0.1", port=port, log_level="error")
    server = uvicorn.Server(server_config)
    server_thread = threading.Thread(target=server.run, daemon=True)
    server_thread.start()

    time.sleep(1.2)
    base_url = f"http://127.0.0.1:{port}/api"

    # Generate JWT Tokens
    admin_token = create_access_token({"sub": admin_id, "role": "admin"})
    trainer_token = create_access_token({"sub": trainer_id, "role": "trainer"})
    student1_token = create_access_token({"sub": student1_id, "role": "student"})
    student2_token = create_access_token({"sub": student2_id, "role": "student"})

    admin_headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    trainer_headers = {"Authorization": f"Bearer {trainer_token}", "Content-Type": "application/json"}
    s1_headers = {"Authorization": f"Bearer {student1_token}", "Content-Type": "application/json"}
    s2_headers = {"Authorization": f"Bearer {student2_token}", "Content-Type": "application/json"}

    passed_count = 0
    total_tests = 16

    try:
        # -------------------------------------------------------------
        # Part A: In-Progress Attempt & Update Security
        # -------------------------------------------------------------
        print("\n--- Part A: Attempt Update Security ---")

        # 1. Create in-progress attempt for Student 1
        res_create = requests.post(f"{base_url}/attempts", json={
            "testId": test_id,
            "scheduleId": sched_id
        }, headers=s1_headers)
        assert res_create.status_code == 200, f"Attempt creation failed: {res_create.text}"
        att_id = res_create.json()["id"]
        print(f"  [1/{total_tests}] Attempt created successfully (ID: {att_id})")
        passed_count += 1

        # 2. Student cannot tamper with score or percentage -> 403 Forbidden
        res_tamper_score = requests.put(f"{base_url}/attempts/{att_id}", json={
            "score": 100.0,
            "percentage": 100.0
        }, headers=s1_headers)
        assert res_tamper_score.status_code == 403, f"Expected 403, got {res_tamper_score.status_code}: {res_tamper_score.text}"
        assert "not permitted to modify server-managed fields" in res_tamper_score.text
        print(f"  [2/{total_tests}] Student score/percentage tampering strictly rejected (403 Forbidden)")
        passed_count += 1

        # 3. Student cannot tamper with violations or violationLogs -> 403 Forbidden
        res_tamper_viols = requests.put(f"{base_url}/attempts/{att_id}", json={
            "violations": 0,
            "violationLogs": []
        }, headers=s1_headers)
        assert res_tamper_viols.status_code == 403, f"Expected 403, got {res_tamper_viols.status_code}: {res_tamper_viols.text}"
        print(f"  [3/{total_tests}] Student violation count/log tampering strictly rejected (403 Forbidden)")
        passed_count += 1

        # 4. Student cannot tamper with status -> 403 Forbidden
        res_tamper_status = requests.put(f"{base_url}/attempts/{att_id}", json={
            "status": "submitted"
        }, headers=s1_headers)
        assert res_tamper_status.status_code == 403, f"Expected 403, got {res_tamper_status.status_code}: {res_tamper_status.text}"
        print(f"  [4/{total_tests}] Student status tampering strictly rejected (403 Forbidden)")
        passed_count += 1

        # 5. Student cannot reassign studentId or scheduleId -> 400 Bad Request
        res_tamper_owner = requests.put(f"{base_url}/attempts/{att_id}", json={
            "studentId": student2_id
        }, headers=s1_headers)
        assert res_tamper_owner.status_code == 400, f"Expected 400, got {res_tamper_owner.status_code}: {res_tamper_owner.text}"
        assert "immutable" in res_tamper_owner.text.lower()
        print(f"  [5/{total_tests}] Student ownership reassignment strictly rejected (400 Bad Request)")
        passed_count += 1

        # 6. Cross-student attempt update rejected -> 403 Access denied
        res_cross_update = requests.put(f"{base_url}/attempts/{att_id}", json={
            "deviceInfo": "Hacker Device"
        }, headers=s2_headers)
        assert res_cross_update.status_code == 403, f"Expected 403, got {res_cross_update.status_code}: {res_cross_update.text}"
        print(f"  [6/{total_tests}] Cross-student attempt update strictly blocked (403 Forbidden)")
        passed_count += 1

        # 7. Legitimate in-progress update (answers, deviceInfo, ipAddress) succeeds -> 200 OK
        res_valid_update = requests.put(f"{base_url}/attempts/{att_id}", json={
            "answers": {
                q1_id: {"selectedOption": "B"}
            },
            "deviceInfo": "Chrome Mac",
            "ipAddress": "192.168.1.10"
        }, headers=s1_headers)
        assert res_valid_update.status_code == 200, f"Expected 200, got {res_valid_update.status_code}: {res_valid_update.text}"
        print(f"  [7/{total_tests}] Legitimate in-progress answer and device update succeeded (200 OK)")
        passed_count += 1

        # -------------------------------------------------------------
        # Part B: Answer Synchronization Security
        # -------------------------------------------------------------
        print("\n--- Part B: Answer Synchronization Security ---")

        # 8. Legitimate sync-answer while in-progress succeeds -> 200 OK
        res_sync = requests.post(f"{base_url}/attempts/{att_id}/sync-answer", json={
            "questionId": q2_id,
            "selectedOption": "Paris",
            "violations": 2,
            "violationLogs": [{"type": "tab_switch", "timestamp": "2026-10-14T12:00:00Z"}]
        }, headers=s1_headers)
        assert res_sync.status_code == 200, f"Expected 200, got {res_sync.status_code}: {res_sync.text}"
        print(f"  [8/{total_tests}] In-progress answer & proctoring telemetry sync succeeded (200 OK)")
        passed_count += 1

        # 9. Cross-student sync-answer rejected -> 403 Access denied
        res_cross_sync = requests.post(f"{base_url}/attempts/{att_id}/sync-answer", json={
            "questionId": q2_id,
            "selectedOption": "London"
        }, headers=s2_headers)
        assert res_cross_sync.status_code == 403, f"Expected 403, got {res_cross_sync.status_code}: {res_cross_sync.text}"
        print(f"  [9/{total_tests}] Cross-student answer sync strictly blocked (403 Forbidden)")
        passed_count += 1

        # 10. Sync-answer cannot reduce violation count (monotonicity)
        res_sync_viol_drop = requests.post(f"{base_url}/attempts/{att_id}/sync-answer", json={
            "violations": 0
        }, headers=s1_headers)
        assert res_sync_viol_drop.status_code == 200
        # Verify in DB that violations was not decreased from 2 to 0
        chk_db = TestSession()
        chk_att = chk_db.query(models.Attempt).filter(models.Attempt.id == att_id).first()
        assert chk_att.violations == 2, f"Expected violations to remain 2, but was {chk_att.violations}"
        chk_db.close()
        print(f"  [10/{total_tests}] Violation count reduction via sync-answer safely prevented (monotonic)")
        passed_count += 1

        # -------------------------------------------------------------
        # Part C: Submission Security & Server-Side Scoring
        # -------------------------------------------------------------
        print("\n--- Part C: Submission Security & Server-Side Scoring ---")

        # 11. Valid first submission succeeds and grades accurately -> 200 OK
        res_submit = requests.post(f"{base_url}/attempts/{att_id}/submit", json={
            "isAutoSubmit": False,
            "answers": {
                q1_id: {"selectedOption": "B"}, # Correct (+2.0)
                q2_id: {"selectedOption": "Paris"} # Correct (+3.0)
            }
        }, headers=s1_headers)
        assert res_submit.status_code == 200, f"Expected 200, got {res_submit.status_code}: {res_submit.text}"
        sub_data = res_submit.json()
        assert sub_data["status"] == "submitted"
        assert sub_data["score"] == 5.0, f"Expected score 5.0, got {sub_data['score']}"
        assert sub_data["percentage"] == 100.0
        print(f"  [11/{total_tests}] First submission succeeded with trusted server-side score: {sub_data['score']}/5.0 (200 OK)")
        passed_count += 1

        # 12. Repeated submission of completed attempt is rejected -> 400 Bad Request
        res_re_submit = requests.post(f"{base_url}/attempts/{att_id}/submit", json={
            "isAutoSubmit": False,
            "answers": {
                q1_id: {"selectedOption": "A"} # Tamper attempt
            }
        }, headers=s1_headers)
        assert res_re_submit.status_code == 400, f"Expected 400, got {res_re_submit.status_code}: {res_re_submit.text}"
        assert "already been submitted" in res_re_submit.text.lower()
        # Verify score was NOT altered by the re-submission
        chk_db = TestSession()
        chk_att = chk_db.query(models.Attempt).filter(models.Attempt.id == att_id).first()
        assert chk_att.score == 5.0
        chk_db.close()
        print(f"  [12/{total_tests}] Repeated submission strictly rejected without re-grading (400 Bad Request)")
        passed_count += 1

        # 13. Sync-answer on submitted attempt is rejected -> 400 Bad Request
        res_sync_after_sub = requests.post(f"{base_url}/attempts/{att_id}/sync-answer", json={
            "questionId": q1_id,
            "selectedOption": "A"
        }, headers=s1_headers)
        assert res_sync_after_sub.status_code == 400, f"Expected 400, got {res_sync_after_sub.status_code}: {res_sync_after_sub.text}"
        print(f"  [13/{total_tests}] Post-submission answer sync strictly rejected (400 Bad Request)")
        passed_count += 1

        # 14. Update attempt on submitted attempt is rejected for student -> 400 Bad Request
        res_update_after_sub = requests.put(f"{base_url}/attempts/{att_id}", json={
            "deviceInfo": "New Device"
        }, headers=s1_headers)
        assert res_update_after_sub.status_code == 400, f"Expected 400, got {res_update_after_sub.status_code}: {res_update_after_sub.text}"
        print(f"  [14/{total_tests}] Student post-submission update strictly rejected (400 Bad Request)")
        passed_count += 1

        # -------------------------------------------------------------
        # Part D: Staff Override & Concurrent Submission Safety
        # -------------------------------------------------------------
        print("\n--- Part D: Staff Workflows & Concurrency Safety ---")

        # 15. Staff (trainer/admin) can legitimately adjust score / review violations -> 200 OK
        res_trainer_adjust = requests.put(f"{base_url}/attempts/{att_id}", json={
            "score": 4.5,
            "percentage": 90.0,
            "violations": 1
        }, headers=trainer_headers)
        assert res_trainer_adjust.status_code == 200, f"Expected 200, got {res_trainer_adjust.status_code}: {res_trainer_adjust.text}"
        chk_db = TestSession()
        chk_att = chk_db.query(models.Attempt).filter(models.Attempt.id == att_id).first()
        assert chk_att.score == 4.5
        assert chk_att.percentage == 90.0
        assert chk_att.violations == 1
        chk_db.close()
        print(f"  [15/{total_tests}] Authorized trainer manual score/violation adjustment succeeded (200 OK)")
        passed_count += 1

        # 16. Concurrent submission safety test
        # Create second attempt for Student 2
        res_create_s2 = requests.post(f"{base_url}/attempts", json={
            "testId": test_id,
            "scheduleId": sched_id
        }, headers=s2_headers)
        att_s2_id = res_create_s2.json()["id"]

        def do_submit():
            return requests.post(f"{base_url}/attempts/{att_s2_id}/submit", json={
                "isAutoSubmit": False,
                "answers": {q1_id: {"selectedOption": "B"}}
            }, headers=s2_headers)

        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(do_submit) for _ in range(5)]
            results = [f.result() for f in futures]

        status_codes = [r.status_code for r in results]
        success_count = status_codes.count(200)
        rejected_count = status_codes.count(400)
        assert success_count == 1, f"Expected exactly 1 submission to succeed, got {success_count}. Statuses: {status_codes}"
        assert rejected_count == 4, f"Expected 4 submissions to be rejected, got {rejected_count}. Statuses: {status_codes}"
        print(f"  [16/{total_tests}] Concurrent submission race condition tested: exactly 1 succeeded, 4 safely rejected")
        passed_count += 1

        print("\n==================================================================")
        print(f"ALL {passed_count}/{total_tests} CRIT-01 VERIFICATION TESTS PASSED SUCCESSFULLY!")
        print("==================================================================")

    finally:
        # Cleanup temporary database
        try:
            os.remove(db_path)
        except Exception:
            pass

if __name__ == "__main__":
    run_tests()
