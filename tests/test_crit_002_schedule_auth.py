"""
Comprehensive Automated Verification Test Suite for CRIT-02:
Exam Schedule Authorization & Attempt Creation Integrity

Verifies:
1. Schedule Authorization:
   - Missing/null scheduleId rejects unscheduled tests (403)
   - Auto-creation of 2099 universal schedules is eliminated
   - Unambiguous active schedule is safely resolved when scheduleId is omitted
   - Ambiguous multiple active schedules require explicit scheduleId (400)
   - Nonexistent scheduleId rejected (404)
   - Cross-test schedule injection rejected (400)
   - Schedule start/end time window enforcement (400)
   - Batch & individual student assignment enforcement (403)
2. Test Eligibility:
   - Draft and archived tests rejected for students (403)
   - Staff preview of draft tests preserved (200)
3. Identity & Lifecycle Integrity:
   - Student ID spoofing rejected (403)
   - Client-supplied attempt ID rejected (400)
   - Client-controlled grading/lifecycle fields (score, status, violations) rejected (400)
   - Arbitrary unknown fields rejected by Pydantic extra="forbid" (422)
   - Overwrite/deletion of existing attempts is strictly prevented
   - Existing in-progress attempts are safely resumed (idempotent)
   - Duplicate in-progress attempts under concurrency are strictly prevented
   - Attempt limits (attemptsAllowed) are strictly enforced against completed submissions
   - Legitimate multi-attempt retries and staff workflows work seamlessly
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
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import models
from auth import create_access_token, hash_password
from main import app
from database import get_db

def run_tests():
    print("==================================================================")
    print("RUNNING COMPREHENSIVE CRIT-02 VERIFICATION TEST SUITE")
    print("==================================================================")

    # 1. Setup isolated temporary SQLite test database
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

    # 2. Seed test data
    db = TestSession()
    now = models.get_utc_now()

    # Batches
    batch_alpha = models.Batch(id="batch-alpha", name="Batch-Alpha")
    batch_beta = models.Batch(id="batch-beta", name="Batch-Beta")
    db.add(batch_alpha)
    db.add(batch_beta)

    # Users
    admin_id = "user-admin-c2"
    trainer_id = "user-trainer-c2"
    student1_id = "user-s1-alpha-c2"
    student2_id = "user-s2-beta-c2"
    student3_id = "user-s3-alpha-c2"

    db.add(models.User(id=admin_id, email="admin_c2@lms.com", role="admin", password_hash=hash_password("admin_pass"), status="active"))
    db.add(models.User(id=trainer_id, email="trainer_c2@lms.com", role="trainer", password_hash=hash_password("trainer_pass"), status="active"))
    db.add(models.User(id=student1_id, email="s1_c2@lms.com", role="student", password_hash=hash_password("student_pass"), status="active"))
    db.add(models.User(id=student2_id, email="s2_c2@lms.com", role="student", password_hash=hash_password("student_pass"), status="active"))
    db.add(models.User(id=student3_id, email="s3_c2@lms.com", role="student", password_hash=hash_password("student_pass"), status="active"))

    db.add(models.StudentProfile(userId=student1_id, firstName="Student", lastName="One", primaryBatchId="batch-alpha"))
    db.add(models.StudentProfile(userId=student2_id, firstName="Student", lastName="Two", primaryBatchId="batch-beta"))
    db.add(models.StudentProfile(userId=student3_id, firstName="Student", lastName="Three", primaryBatchId="batch-alpha"))

    # Question Bank & Questions
    bank_id = "qb-crit02"
    db.add(models.QuestionBank(id=bank_id, name="CRIT02 Bank", ownerId=trainer_id, isPublic=False))
    q1_id = "q-crit02-1"
    q2_id = "q-crit02-2"
    db.add(models.Question(id=q1_id, questionBankId=bank_id, text="Q1 Text", difficulty="EASY", marks=1.0))
    db.add(models.Question(id=q2_id, questionBankId=bank_id, text="Q2 Text", difficulty="EASY", marks=1.0))
    db.add(models.QuestionOption(id="opt-q1-a", questionId=q1_id, optionText="Option A", isCorrect=True, orderIndex=0))
    db.add(models.QuestionOption(id="opt-q1-b", questionId=q1_id, optionText="Option B", isCorrect=False, orderIndex=1))
    db.add(models.QuestionOption(id="opt-q2-a", questionId=q2_id, optionText="Option A", isCorrect=True, orderIndex=0))
    db.add(models.QuestionOption(id="opt-q2-b", questionId=q2_id, optionText="Option B", isCorrect=False, orderIndex=1))

    # Test 1: Published Test with valid active schedule for Batch-Alpha
    test_pub_alpha_id = "test-pub-alpha"
    db.add(models.Test(id=test_pub_alpha_id, title="Published Alpha Exam", authorId=trainer_id, status="Published", totalMarks=2.0))
    db.add(models.TestQuestion(testId=test_pub_alpha_id, questionId=q1_id, orderIndex=0))
    sched_alpha_id = "sch-alpha-active"
    db.add(models.Schedule(
        id=sched_alpha_id,
        testId=test_pub_alpha_id,
        startTime="2020-01-01T00:00:00Z",
        endTime="2030-12-31T23:59:59Z",
        durationMinutes=60,
        attemptsAllowed=1
    ))
    db.add(models.ScheduleAssignment(id="sa-alpha-1", scheduleId=sched_alpha_id, assigneeType="batch", assigneeId="Batch-Alpha"))

    # Test 2: Published Test with valid active schedule for Batch-Beta
    test_pub_beta_id = "test-pub-beta"
    db.add(models.Test(id=test_pub_beta_id, title="Published Beta Exam", authorId=trainer_id, status="Published", totalMarks=2.0))
    db.add(models.TestQuestion(testId=test_pub_beta_id, questionId=q2_id, orderIndex=0))
    sched_beta_id = "sch-beta-active"
    db.add(models.Schedule(
        id=sched_beta_id,
        testId=test_pub_beta_id,
        startTime="2020-01-01T00:00:00Z",
        endTime="2030-12-31T23:59:59Z",
        durationMinutes=60,
        attemptsAllowed=1
    ))
    db.add(models.ScheduleAssignment(id="sa-beta-1", scheduleId=sched_beta_id, assigneeType="batch", assigneeId="Batch-Beta"))

    # Test 3: Published Test with NO schedule
    test_unsched_id = "test-no-schedule"
    db.add(models.Test(id=test_unsched_id, title="Unscheduled Exam", authorId=trainer_id, status="Published", totalMarks=10.0))

    # Test 4: Draft Test
    test_draft_id = "test-draft-c2"
    db.add(models.Test(id=test_draft_id, title="Draft Exam", authorId=trainer_id, status="Draft", totalMarks=10.0))

    # Test 5: Archived Test
    test_archived_id = "test-archived-c2"
    db.add(models.Test(id=test_archived_id, title="Archived Exam", authorId=trainer_id, status="Archived", totalMarks=10.0))

    # Test 6: Published Test with Multiple Active Schedules for Batch-Alpha
    test_multi_id = "test-multi-sched"
    db.add(models.Test(id=test_multi_id, title="Multi-Schedule Exam", authorId=trainer_id, status="Published", totalMarks=10.0))
    sched_multi_1 = "sch-multi-1"
    sched_multi_2 = "sch-multi-2"
    db.add(models.Schedule(id=sched_multi_1, testId=test_multi_id, startTime="2020-01-01T00:00:00Z", endTime="2030-12-31T23:59:59Z", attemptsAllowed=1))
    db.add(models.Schedule(id=sched_multi_2, testId=test_multi_id, startTime="2020-01-01T00:00:00Z", endTime="2030-12-31T23:59:59Z", attemptsAllowed=1))
    db.add(models.ScheduleAssignment(id="sa-m1", scheduleId=sched_multi_1, assigneeType="batch", assigneeId="Batch-Alpha"))
    db.add(models.ScheduleAssignment(id="sa-m2", scheduleId=sched_multi_2, assigneeType="batch", assigneeId="Batch-Alpha"))

    # Test 7: Individual-Student Assigned Test (Assigned ONLY to Student 2)
    test_indiv_id = "test-indiv-c2"
    db.add(models.Test(id=test_indiv_id, title="Individual Student Exam", authorId=trainer_id, status="Published", totalMarks=10.0))
    sched_indiv_id = "sch-indiv-1"
    db.add(models.Schedule(id=sched_indiv_id, testId=test_indiv_id, startTime="2020-01-01T00:00:00Z", endTime="2030-12-31T23:59:59Z", attemptsAllowed=1))
    db.add(models.ScheduleAssignment(id="sa-indiv-1", scheduleId=sched_indiv_id, assigneeType="student", assigneeId=student2_id))

    # Test 8: Future Schedule Test
    test_future_id = "test-future-c2"
    db.add(models.Test(id=test_future_id, title="Future Exam", authorId=trainer_id, status="Published", totalMarks=10.0))
    sched_future_id = "sch-future-1"
    db.add(models.Schedule(id=sched_future_id, testId=test_future_id, startTime="2090-01-01T00:00:00Z", endTime="2090-12-31T23:59:59Z", attemptsAllowed=1))
    db.add(models.ScheduleAssignment(id="sa-fut-1", scheduleId=sched_future_id, assigneeType="batch", assigneeId="all"))

    # Test 9: Expired Schedule Test
    test_expired_id = "test-expired-c2"
    db.add(models.Test(id=test_expired_id, title="Expired Exam", authorId=trainer_id, status="Published", totalMarks=10.0))
    sched_expired_id = "sch-expired-1"
    db.add(models.Schedule(id=sched_expired_id, testId=test_expired_id, startTime="2020-01-01T00:00:00Z", endTime="2020-12-31T23:59:59Z", attemptsAllowed=1))
    db.add(models.ScheduleAssignment(id="sa-exp-1", scheduleId=sched_expired_id, assigneeType="batch", assigneeId="all"))

    # Test 10: Multi-Attempt Allowed Test (attemptsAllowed = 2)
    test_retry_id = "test-retry-c2"
    db.add(models.Test(id=test_retry_id, title="Retry Allowed Exam", authorId=trainer_id, status="Published", totalMarks=10.0))
    sched_retry_id = "sch-retry-1"
    db.add(models.Schedule(id=sched_retry_id, testId=test_retry_id, startTime="2020-01-01T00:00:00Z", endTime="2030-12-31T23:59:59Z", attemptsAllowed=2))
    db.add(models.ScheduleAssignment(id="sa-ret-1", scheduleId=sched_retry_id, assigneeType="batch", assigneeId="all"))

    # Test 11: Single-Attempt Test (attemptsAllowed = 1)
    test_single_id = "test-single-c2"
    db.add(models.Test(id=test_single_id, title="Single Attempt Exam", authorId=trainer_id, status="Published", totalMarks=10.0))
    sched_single_id = "sch-single-1"
    db.add(models.Schedule(id=sched_single_id, testId=test_single_id, startTime="2020-01-01T00:00:00Z", endTime="2030-12-31T23:59:59Z", attemptsAllowed=1))
    db.add(models.ScheduleAssignment(id="sa-sin-1", scheduleId=sched_single_id, assigneeType="batch", assigneeId="all"))

    db.commit()
    db.close()

    # 3. Start local Uvicorn server in background thread
    port = 8896
    server_config = uvicorn.Config(app, host="127.0.0.1", port=port, log_level="error")
    server = uvicorn.Server(server_config)
    server_thread = threading.Thread(target=server.run, daemon=True)
    server_thread.start()
    time.sleep(1.2)

    base_url = f"http://127.0.0.1:{port}/api"

    # JWT Tokens
    admin_token = create_access_token({"sub": admin_id, "role": "admin"})
    trainer_token = create_access_token({"sub": trainer_id, "role": "trainer"})
    s1_token = create_access_token({"sub": student1_id, "role": "student"})
    s2_token = create_access_token({"sub": student2_id, "role": "student"})
    s3_token = create_access_token({"sub": student3_id, "role": "student"})

    admin_headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    trainer_headers = {"Authorization": f"Bearer {trainer_token}", "Content-Type": "application/json"}
    s1_headers = {"Authorization": f"Bearer {s1_token}", "Content-Type": "application/json"}
    s2_headers = {"Authorization": f"Bearer {s2_token}", "Content-Type": "application/json"}
    s3_headers = {"Authorization": f"Bearer {s3_token}", "Content-Type": "application/json"}

    passed_count = 0
    total_tests = 24

    # -------------------------------------------------------------
    # SECTION 1: Schedule Authorization & Auto-Creation Elimination
    # -------------------------------------------------------------
    print("\n--- SECTION 1: Schedule Authorization & Validation ---")

    # 1. Missing scheduleId on unscheduled test -> 403 Forbidden
    res = requests.post(f"{base_url}/attempts", json={"testId": test_unsched_id}, headers=s1_headers)
    assert res.status_code == 403, f"Expected 403 for unscheduled test, got {res.status_code}: {res.text}"
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Unscheduled test attempt correctly rejected (403 Forbidden)")

    # 2. Universal 2099 schedule auto-creation is eliminated
    db = TestSession()
    sched_2099 = db.query(models.Schedule).filter(models.Schedule.testId == test_unsched_id).first()
    assert sched_2099 is None, "Rogue schedule was auto-created in database!"
    db.close()
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Verified NO rogue 2099 schedule was auto-created in database")

    # 3. Missing scheduleId on published test with single unambiguous active schedule -> auto-resolves (200 OK)
    res = requests.post(f"{base_url}/attempts", json={"testId": test_pub_alpha_id}, headers=s1_headers)
    assert res.status_code == 200, f"Expected 200 for unambiguous active schedule, got {res.status_code}: {res.text}"
    att_resolved = res.json()
    assert att_resolved["scheduleId"] == sched_alpha_id, f"Expected schedule {sched_alpha_id}, got {att_resolved['scheduleId']}"
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Unambiguous active schedule successfully resolved when scheduleId omitted (200 OK)")

    # 4. Missing scheduleId with multiple active schedules -> 400 Bad Request (Ambiguity)
    res = requests.post(f"{base_url}/attempts", json={"testId": test_multi_id}, headers=s1_headers)
    assert res.status_code == 400, f"Expected 400 for multiple active schedules, got {res.status_code}: {res.text}"
    assert "Multiple active schedules" in res.json().get("detail", ""), f"Unexpected error detail: {res.text}"
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Multiple active schedules correctly require explicit scheduleId (400 Bad Request)")

    # 5. Nonexistent scheduleId -> 404 Not Found
    res = requests.post(f"{base_url}/attempts", json={"testId": test_pub_alpha_id, "scheduleId": "sch-nonexistent-999"}, headers=s1_headers)
    assert res.status_code == 404, f"Expected 404 for nonexistent scheduleId, got {res.status_code}: {res.text}"
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Nonexistent scheduleId correctly rejected (404 Not Found)")

    # 6. Cross-Test Schedule Injection -> 400 Bad Request
    # Student 1 in Batch-Alpha passes valid schedule from Test 2 (Beta) with Test 1 (Alpha)
    res = requests.post(f"{base_url}/attempts", json={"testId": test_pub_alpha_id, "scheduleId": sched_beta_id}, headers=s1_headers)
    assert res.status_code == 400, f"Expected 400 for cross-test schedule mismatch, got {res.status_code}: {res.text}"
    assert "Schedule does not belong" in res.json().get("detail", ""), f"Unexpected error: {res.text}"
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Cross-test schedule injection strictly blocked (400 Bad Request)")

    # 7. Schedule Window: Future test session -> 400 Bad Request
    res = requests.post(f"{base_url}/attempts", json={"testId": test_future_id, "scheduleId": sched_future_id}, headers=s1_headers)
    assert res.status_code == 400, f"Expected 400 for future test session, got {res.status_code}: {res.text}"
    assert "has not started yet" in res.json().get("detail", ""), f"Unexpected error: {res.text}"
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Future test session correctly rejected (400 Bad Request)")

    # 8. Schedule Window: Expired test session -> 400 Bad Request
    res = requests.post(f"{base_url}/attempts", json={"testId": test_expired_id, "scheduleId": sched_expired_id}, headers=s1_headers)
    assert res.status_code == 400, f"Expected 400 for expired test session, got {res.status_code}: {res.text}"
    assert "has already ended" in res.json().get("detail", ""), f"Unexpected error: {res.text}"
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Expired test session correctly rejected (400 Bad Request)")

    # -------------------------------------------------------------
    # SECTION 2: Batch and Student Assignment Authorization
    # -------------------------------------------------------------
    print("\n--- SECTION 2: Batch and Student Assignment Gates ---")

    # 9. Batch mismatch: Student 2 (Beta) attempts Batch-Alpha exam -> 403 Forbidden
    res = requests.post(f"{base_url}/attempts", json={"testId": test_pub_alpha_id, "scheduleId": sched_alpha_id}, headers=s2_headers)
    assert res.status_code == 403, f"Expected 403 for unassigned batch, got {res.status_code}: {res.text}"
    assert "not assigned" in res.json().get("detail", ""), f"Unexpected error: {res.text}"
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Unassigned batch attempt strictly blocked (403 Forbidden)")

    # 10. Individual student assignment: Student 1 attempts exam assigned strictly to Student 2 -> 403 Forbidden
    res = requests.post(f"{base_url}/attempts", json={"testId": test_indiv_id, "scheduleId": sched_indiv_id}, headers=s1_headers)
    assert res.status_code == 403, f"Expected 403 for unassigned individual student, got {res.status_code}: {res.text}"
    assert "not assigned" in res.json().get("detail", ""), f"Unexpected error: {res.text}"
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Unassigned individual student attempt strictly blocked (403 Forbidden)")

    # 11. Assigned individual student (Student 2) successfully starts attempt -> 200 OK
    res = requests.post(f"{base_url}/attempts", json={"testId": test_indiv_id, "scheduleId": sched_indiv_id}, headers=s2_headers)
    assert res.status_code == 200, f"Expected 200 for assigned individual student, got {res.status_code}: {res.text}"
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Assigned individual student attempt successfully started (200 OK)")

    # -------------------------------------------------------------
    # SECTION 3: Test Publishing Status & Eligibility
    # -------------------------------------------------------------
    print("\n--- SECTION 3: Test Status & Eligibility Restrictions ---")

    # 12. Student attempts Draft test -> 403 Forbidden
    res = requests.post(f"{base_url}/attempts", json={"testId": test_draft_id}, headers=s1_headers)
    assert res.status_code == 403, f"Expected 403 for Draft test, got {res.status_code}: {res.text}"
    assert "Test is not published" in res.json().get("detail", ""), f"Unexpected error: {res.text}"
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Draft test attempt strictly blocked for students (403 Forbidden)")

    # 13. Student attempts Archived test -> 403 Forbidden
    res = requests.post(f"{base_url}/attempts", json={"testId": test_archived_id}, headers=s1_headers)
    assert res.status_code == 403, f"Expected 403 for Archived test, got {res.status_code}: {res.text}"
    assert "Test is not published" in res.json().get("detail", ""), f"Unexpected error: {res.text}"
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Archived test attempt strictly blocked for students (403 Forbidden)")

    # 14. Nonexistent testId -> 404 Not Found
    res = requests.post(f"{base_url}/attempts", json={"testId": "test-nonexistent-xyz"}, headers=s1_headers)
    assert res.status_code == 404, f"Expected 404 for nonexistent testId, got {res.status_code}: {res.text}"
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Nonexistent testId correctly rejected (404 Not Found)")

    # -------------------------------------------------------------
    # SECTION 4: Identity, Input Sanitization & Lifecycle Protection
    # -------------------------------------------------------------
    print("\n--- SECTION 4: Identity & Attempt Lifecycle Protection ---")

    # 15. Student ID spoofing: Student 1 attempts to create attempt for Student 2 -> 403 Forbidden
    res = requests.post(f"{base_url}/attempts", json={
        "testId": test_pub_alpha_id,
        "scheduleId": sched_alpha_id,
        "studentId": student2_id
    }, headers=s1_headers)
    assert res.status_code == 403, f"Expected 403 for spoofing studentId, got {res.status_code}: {res.text}"
    assert "Cannot create attempt for another student" in res.json().get("detail", ""), f"Unexpected error: {res.text}"
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Student ID spoofing strictly blocked (403 Forbidden)")

    # 16. Client-supplied attempt ID -> 400 Bad Request
    res = requests.post(f"{base_url}/attempts", json={
        "id": "att-client-forged-123",
        "testId": test_pub_alpha_id,
        "scheduleId": sched_alpha_id
    }, headers=s1_headers)
    assert res.status_code == 400, f"Expected 400 for client-supplied id, got {res.status_code}: {res.text}"
    assert "id" in res.json().get("detail", ""), f"Unexpected error: {res.text}"
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Client-supplied attempt ID strictly rejected (400 Bad Request)")

    # 17. Client-supplied lifecycle/grading fields (status, score, violations) -> 400 Bad Request
    res = requests.post(f"{base_url}/attempts", json={
        "testId": test_pub_alpha_id,
        "scheduleId": sched_alpha_id,
        "score": 100.0,
        "status": "submitted",
        "violations": 0
    }, headers=s1_headers)
    assert res.status_code == 400, f"Expected 400 for client-supplied score/status, got {res.status_code}: {res.text}"
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Client-controlled grading and lifecycle fields rejected (400 Bad Request)")

    # 18. Arbitrary extra fields -> 422 Unprocessable Entity via Pydantic extra="forbid"
    res = requests.post(f"{base_url}/attempts", json={
        "testId": test_pub_alpha_id,
        "scheduleId": sched_alpha_id,
        "arbitraryHackingField": "maliciousValue"
    }, headers=s1_headers)
    assert res.status_code == 422, f"Expected 422 for extra forbidden field, got {res.status_code}: {res.text}"
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Arbitrary unknown fields strictly rejected by Pydantic extra='forbid' (422)")

    # 19. Existing submitted attempt cannot be deleted or reset via creation endpoint
    db = TestSession()
    victim_att_id = "att-victim-submitted-c2"
    db.add(models.Attempt(
        id=victim_att_id,
        studentId=student2_id,
        scheduleId=sched_beta_id,
        status="submitted",
        score=99.0,
        percentage=99.0,
        violations=0
    ))
    db.add(models.Answer(id="ans-vic-1", attemptId=victim_att_id, questionId=q2_id, selectedOptionIds='["A"]', isCorrect=True))
    db.commit()
    db.close()

    # Attacker tries to submit request with victim_att_id
    res = requests.post(f"{base_url}/attempts", json={
        "id": victim_att_id,
        "testId": test_pub_beta_id,
        "scheduleId": sched_beta_id
    }, headers=s1_headers)
    assert res.status_code == 400, f"Expected 400 for passing id, got {res.status_code}: {res.text}"

    # Verify victim attempt and answers in DB are completely untouched
    db = TestSession()
    victim_att = db.query(models.Attempt).filter(models.Attempt.id == victim_att_id).first()
    assert victim_att is not None, "Victim attempt was deleted!"
    assert victim_att.status == "submitted", f"Victim attempt status was altered to {victim_att.status}!"
    assert victim_att.score == 99.0, "Victim attempt score was wiped!"
    ans_vic = db.query(models.Answer).filter(models.Answer.attemptId == victim_att_id).count()
    assert ans_vic == 1, "Victim answers were deleted!"
    db.close()
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Existing submitted attempts and answers are completely immutable against deletion/reset")

    # -------------------------------------------------------------
    # SECTION 5: In-Progress Resumption, Concurrency & Limit Guards
    # -------------------------------------------------------------
    print("\n--- SECTION 5: In-Progress Resumption, Concurrency & Limits ---")

    # 20. Resuming an existing in-progress attempt (Idempotent session return)
    # Student 1 already has an in_progress attempt on sched_alpha_id from Test 3
    res_resume = requests.post(f"{base_url}/attempts", json={
        "testId": test_pub_alpha_id,
        "scheduleId": sched_alpha_id
    }, headers=s1_headers)
    assert res_resume.status_code == 200, f"Expected 200 on resumption, got {res_resume.status_code}: {res_resume.text}"
    assert res_resume.json()["id"] == att_resolved["id"], f"Expected to resume {att_resolved['id']}, got {res_resume.json()['id']}"
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Existing in-progress attempt successfully returned for resumption (200 OK)")

    # 21. Preventing duplicate in-progress attempts under concurrent requests
    # Student 3 sends 5 simultaneous start requests for sched_alpha_id
    concurrent_ids = []
    def make_concurrent_request():
        r = requests.post(f"{base_url}/attempts", json={
            "testId": test_pub_alpha_id,
            "scheduleId": sched_alpha_id
        }, headers=s3_headers)
        return r.status_code, r.json().get("id")

    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(make_concurrent_request) for _ in range(5)]
        results = [f.result() for f in futures]

    for status_code, att_id in results:
        assert status_code == 200, f"Expected 200, got {status_code}"
        concurrent_ids.append(att_id)

    # All 5 requests must yield the exact same attempt ID (idempotent, no duplicates)
    assert len(set(concurrent_ids)) == 1, f"Duplicate attempts created during concurrency: {concurrent_ids}"

    # Verify only 1 attempt exists in DB for student 3 on this schedule
    db = TestSession()
    s3_att_count = db.query(models.Attempt).filter(
        models.Attempt.studentId == student3_id,
        models.Attempt.scheduleId == sched_alpha_id
    ).count()
    assert s3_att_count == 1, f"Expected 1 attempt in DB, found {s3_att_count}!"
    db.close()
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Concurrency tested: 5 simultaneous requests produced exactly 1 attempt ID (No duplicates)")

    # 22. Attempt-Limit Enforcement (Single attempt allowed test)
    # Student 1 starts test-single-c2, submits it, then tries to start again
    res_s_start = requests.post(f"{base_url}/attempts", json={"testId": test_single_id, "scheduleId": sched_single_id}, headers=s1_headers)
    assert res_s_start.status_code == 200, f"Failed to start single attempt test: {res_s_start.text}"
    att_s_id = res_s_start.json()["id"]

    # Submit attempt
    res_s_sub = requests.post(f"{base_url}/attempts/{att_s_id}/submit", json={"isAutoSubmit": False}, headers=s1_headers)
    assert res_s_sub.status_code == 200, f"Submission failed: {res_s_sub.text}"

    # Try to start second attempt -> 400 Bad Request
    res_s_limit = requests.post(f"{base_url}/attempts", json={"testId": test_single_id, "scheduleId": sched_single_id}, headers=s1_headers)
    assert res_s_limit.status_code == 400, f"Expected 400 for exceeded attempt limit, got {res_s_limit.status_code}: {res_s_limit.text}"
    assert "Maximum allowed attempts" in res_s_limit.json().get("detail", ""), f"Unexpected error: {res_s_limit.text}"
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Attempt limit strictly enforced when attemptsAllowed=1 (400 Bad Request)")

    # 23. Legitimate Multi-Attempt Retry Workflow (attemptsAllowed = 2)
    # Student 2 on test_retry_id:
    # 1st attempt: start -> submit
    res_ret_1 = requests.post(f"{base_url}/attempts", json={"testId": test_retry_id, "scheduleId": sched_retry_id}, headers=s2_headers)
    assert res_ret_1.status_code == 200, f"Attempt 1 start failed: {res_ret_1.text}"
    att_ret_1_id = res_ret_1.json()["id"]
    requests.post(f"{base_url}/attempts/{att_ret_1_id}/submit", json={"isAutoSubmit": False}, headers=s2_headers)

    # 2nd attempt: allowed to start -> submit
    res_ret_2 = requests.post(f"{base_url}/attempts", json={"testId": test_retry_id, "scheduleId": sched_retry_id}, headers=s2_headers)
    assert res_ret_2.status_code == 200, f"Attempt 2 start failed: {res_ret_2.text}"
    att_ret_2_id = res_ret_2.json()["id"]
    assert att_ret_1_id != att_ret_2_id, "Attempt 2 must have distinct attempt ID from Attempt 1!"
    requests.post(f"{base_url}/attempts/{att_ret_2_id}/submit", json={"isAutoSubmit": False}, headers=s2_headers)

    # 3rd attempt: blocked -> 400 Bad Request
    res_ret_3 = requests.post(f"{base_url}/attempts", json={"testId": test_retry_id, "scheduleId": sched_retry_id}, headers=s2_headers)
    assert res_ret_3.status_code == 400, f"Expected 400 on 3rd attempt, got {res_ret_3.status_code}: {res_ret_3.text}"
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Multi-attempt retry workflow correctly permits 2nd attempt and blocks 3rd attempt (200 -> 200 -> 400)")

    # -------------------------------------------------------------
    # SECTION 6: Legitimate Staff Workflows
    # -------------------------------------------------------------
    print("\n--- SECTION 6: Authorized Staff Workflows ---")

    # 24. Staff preview of draft test & student delegation
    res_staff_preview = requests.post(f"{base_url}/attempts", json={
        "testId": test_draft_id,
        "studentId": student1_id
    }, headers=trainer_headers)
    assert res_staff_preview.status_code == 200, f"Staff preview of draft test failed: {res_staff_preview.text}"
    assert res_staff_preview.json()["studentId"] == student1_id, "Target studentId not set for staff request!"
    passed_count += 1
    print(f"  [{passed_count}/{total_tests}] Staff preview of Draft test with student delegation succeeded (200 OK)")

    print("\n==================================================================")
    print(f"ALL {passed_count}/{total_tests} CRIT-02 VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("==================================================================")

    # Clean up DB
    try:
        os.unlink(db_path)
    except Exception:
        pass

if __name__ == "__main__":
    run_tests()
