"""
Comprehensive Automated Verification Test Suite for SEC-001:
1. Question API & Client Service Expose Exam Answers to Students (Access Control & Sanitization)
2. Test-Level Authorization & Eligibility Enforcement
3. Post-Exam Review Security & Server-Side Graded Review Flow
"""
import os
import sys
import time
import json
import tempfile
import threading
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
    print("RUNNING COMPREHENSIVE SECURITY & AUTHORIZATION TEST SUITE: SEC-001")
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
    admin_id = "user-admin-sec001"
    admin_user = models.User(
        id=admin_id,
        email="admin_sec001@lms.com",
        role="admin",
        password_hash=hash_password("admin_pass_123"),
        status="active",
        createdAt=now
    )
    db.add(admin_user)

    # Trainer User
    trainer_id = "user-trainer-sec001"
    trainer_user = models.User(
        id=trainer_id,
        email="trainer_sec001@lms.com",
        role="trainer",
        password_hash=hash_password("trainer_pass_123"),
        status="active",
        createdAt=now
    )
    db.add(trainer_user)

    # Departments and Batches
    dept = models.Department(id="dept-cs", name="Computer Science", code="CS")
    batch_a = models.Batch(id="batch-alpha", departmentId="dept-cs", name="Batch Alpha")
    batch_b = models.Batch(id="batch-beta", departmentId="dept-cs", name="Batch Beta")
    db.add_all([dept, batch_a, batch_b])

    # Student 1 (Enrolled in Batch Alpha)
    student1_id = "user-student-alpha"
    student1_user = models.User(
        id=student1_id,
        email="student_alpha@lms.com",
        role="student",
        password_hash=hash_password("student_pass_123"),
        status="active",
        createdAt=now
    )
    student1_profile = models.StudentProfile(
        userId=student1_id,
        firstName="Alice",
        lastName="Alpha",
        departmentId="dept-cs",
        primaryBatchId="batch-alpha",
        studentNumber="STU-A-001"
    )
    db.add_all([student1_user, student1_profile])

    # Student 2 (Enrolled in Batch Beta)
    student2_id = "user-student-beta"
    student2_user = models.User(
        id=student2_id,
        email="student_beta@lms.com",
        role="student",
        password_hash=hash_password("student_pass_123"),
        status="active",
        createdAt=now
    )
    student2_profile = models.StudentProfile(
        userId=student2_id,
        firstName="Bob",
        lastName="Beta",
        departmentId="dept-cs",
        primaryBatchId="batch-beta",
        studentNumber="STU-B-002"
    )
    db.add_all([student2_user, student2_profile])

    # Question Bank
    bank_id = "bank-sec001"
    q_bank = models.QuestionBank(
        id=bank_id,
        name="SEC-001 Assessment Bank",
        description="Bank for testing security answer redaction and review",
        ownerId=trainer_id,
        isPublic=False,
        createdAt=now
    )
    db.add(q_bank)

    # Questions
    q1_id = "q-sec001-1"
    q1 = models.Question(
        id=q1_id,
        questionBankId=bank_id,
        type="MCQ",
        text="What is the cryptographic algorithm used for secure token signatures?",
        marks=2.0,
        difficulty="Medium",
        explanation="CONFIDENTIAL_EXPLANATION: HMAC-SHA256 (HS256) or RSA-256 (RS256) is standard.",
        tags=json.dumps(["Security", "Cryptography"])
    )
    db.add(q1)

    opt1_1 = models.QuestionOption(id="opt-1-A", questionId=q1_id, optionText="ROT13", isCorrect=False, orderIndex=0)
    opt1_2 = models.QuestionOption(id="opt-1-B", questionId=q1_id, optionText="HMAC-SHA256", isCorrect=True, orderIndex=1)
    opt1_3 = models.QuestionOption(id="opt-1-C", questionId=q1_id, optionText="MD5", isCorrect=False, orderIndex=2)
    opt1_4 = models.QuestionOption(id="opt-1-D", questionId=q1_id, optionText="Base64", isCorrect=False, orderIndex=3)
    db.add_all([opt1_1, opt1_2, opt1_3, opt1_4])

    q2_id = "q-sec001-2"
    q2 = models.Question(
        id=q2_id,
        questionBankId=bank_id,
        type="MCQ",
        text="Which HTTP status code signifies Forbidden access?",
        marks=1.0,
        difficulty="Easy",
        explanation="CONFIDENTIAL_EXPLANATION: HTTP 403 Forbidden indicates authorization denial.",
        tags=json.dumps(["HTTP"])
    )
    db.add(q2)

    opt2_1 = models.QuestionOption(id="opt-2-A", questionId=q2_id, optionText="200 OK", isCorrect=False, orderIndex=0)
    opt2_2 = models.QuestionOption(id="opt-2-B", questionId=q2_id, optionText="401 Unauthorized", isCorrect=False, orderIndex=1)
    opt2_3 = models.QuestionOption(id="opt-2-C", questionId=q2_id, optionText="403 Forbidden", isCorrect=True, orderIndex=2)
    opt2_4 = models.QuestionOption(id="opt-2-D", questionId=q2_id, optionText="500 Internal Error", isCorrect=False, orderIndex=3)
    db.add_all([opt2_1, opt2_2, opt2_3, opt2_4])

    # Test 1: Published test assigned to Batch Alpha
    test_pub_id = "test-pub-alpha"
    test_pub = models.Test(
        id=test_pub_id,
        title="Batch Alpha Midterm Exam",
        authorId=trainer_id,
        status="Published",
        totalMarks=3.0,
        createdAt=now
    )
    db.add(test_pub)
    db.add(models.TestQuestion(testId=test_pub_id, questionId=q1_id, orderIndex=0))
    db.add(models.TestQuestion(testId=test_pub_id, questionId=q2_id, orderIndex=1))

    # Active Schedule for Batch Alpha (now is within window)
    sched_alpha_id = "sch-active-alpha"
    sched_alpha = models.Schedule(
        id=sched_alpha_id,
        testId=test_pub_id,
        startTime="2020-01-01T00:00:00Z",
        endTime="2099-12-31T23:59:59Z",
        durationMinutes=60,
        attemptsAllowed=1
    )
    db.add(sched_alpha)
    # Assign to Batch Alpha
    db.add(models.ScheduleAssignment(id="sa-alpha", scheduleId=sched_alpha_id, assigneeType="batch", assigneeId="batch-alpha"))

    # Test 2: Draft test (unpublished)
    test_draft_id = "test-draft-final"
    test_draft = models.Test(
        id=test_draft_id,
        title="Unpublished Draft Final Exam",
        authorId=trainer_id,
        status="Draft",
        totalMarks=2.0,
        createdAt=now
    )
    db.add(test_draft)
    db.add(models.TestQuestion(testId=test_draft_id, questionId=q1_id, orderIndex=0))

    # Test 3: Published test assigned ONLY to Batch Beta
    test_beta_id = "test-pub-beta"
    test_beta = models.Test(
        id=test_beta_id,
        title="Batch Beta Only Exam",
        authorId=trainer_id,
        status="Published",
        totalMarks=2.0,
        createdAt=now
    )
    db.add(test_beta)
    db.add(models.TestQuestion(testId=test_beta_id, questionId=q2_id, orderIndex=0))

    sched_beta_id = "sch-active-beta"
    sched_beta = models.Schedule(
        id=sched_beta_id,
        testId=test_beta_id,
        startTime="2020-01-01T00:00:00Z",
        endTime="2099-12-31T23:59:59Z",
        durationMinutes=60,
        attemptsAllowed=1
    )
    db.add(sched_beta)
    db.add(models.ScheduleAssignment(id="sa-beta", scheduleId=sched_beta_id, assigneeType="batch", assigneeId="batch-beta"))

    # Test 4: Future scheduled test
    test_future_id = "test-future"
    test_future = models.Test(
        id=test_future_id,
        title="Future Placement Exam",
        authorId=trainer_id,
        status="Published",
        totalMarks=2.0,
        createdAt=now
    )
    db.add(test_future)
    sched_future = models.Schedule(
        id="sch-future",
        testId=test_future_id,
        startTime="2099-01-01T00:00:00Z",
        endTime="2099-12-31T23:59:59Z",
        durationMinutes=60
    )
    db.add(sched_future)
    # Assigned to student 1
    db.add(models.ScheduleAssignment(id="sa-future", scheduleId="sch-future", assigneeType="student", assigneeId=student1_id))

    # Test 5: Expired scheduled test
    test_expired_id = "test-expired"
    test_expired = models.Test(
        id=test_expired_id,
        title="Expired Practice Test",
        authorId=trainer_id,
        status="Published",
        totalMarks=2.0,
        createdAt=now
    )
    db.add(test_expired)
    sched_expired = models.Schedule(
        id="sch-expired",
        testId=test_expired_id,
        startTime="2020-01-01T00:00:00Z",
        endTime="2020-01-02T00:00:00Z",
        durationMinutes=60
    )
    db.add(sched_expired)
    db.add(models.ScheduleAssignment(id="sa-expired", scheduleId="sch-expired", assigneeType="student", assigneeId=student1_id))

    db.commit()
    db.close()

    # 3. Start local Uvicorn server in background thread
    port = 8799
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

    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    trainer_headers = {"Authorization": f"Bearer {trainer_token}"}
    s1_headers = {"Authorization": f"Bearer {student1_token}"}
    s2_headers = {"Authorization": f"Bearer {student2_token}"}

    try:
        # ==============================================================================
        # PART 1: SEC-001 Question Management Role Restrictions
        # ==============================================================================
        print("\n--- PART 1: Question Management Endpoint Restrictions ---")
        # 1. Unauthenticated request to /questions -> 401
        res_unauth = requests.get(f"{base_url}/questions")
        assert res_unauth.status_code == 401, f"Expected 401, got {res_unauth.status_code}"
        print("  [PASSED] Unauthenticated access to /questions returned 401 Unauthorized")

        # 2. Student access to /questions -> 403 Forbidden
        res_s1_mgmt = requests.get(f"{base_url}/questions", headers=s1_headers)
        assert res_s1_mgmt.status_code == 403, f"Expected 403, got {res_s1_mgmt.status_code}"
        print("  [PASSED] Student access to /questions strictly forbidden (403)")

        # 3. Staff access to /questions -> 200 OK
        res_admin_mgmt = requests.get(f"{base_url}/questions", headers=admin_headers)
        assert res_admin_mgmt.status_code == 200, f"Expected 200, got {res_admin_mgmt.status_code}"
        res_trainer_mgmt = requests.get(f"{base_url}/questions", headers=trainer_headers)
        assert res_trainer_mgmt.status_code == 200, f"Expected 200, got {res_trainer_mgmt.status_code}"
        print("  [PASSED] Admin and Trainer can access /questions and view question metadata")

        # ==============================================================================
        # PART 2: Test-Level Authorization & Eligibility
        # ==============================================================================
        print("\n--- PART 2: Test-Level Authorization & Eligibility Enforcement ---")
        
        # 4. Student cannot retrieve questions for Draft (unpublished) test -> 403
        res_draft = requests.get(f"{base_url}/tests/{test_draft_id}/attempt-questions", headers=s1_headers)
        assert res_draft.status_code == 403, f"Expected 403 for draft test, got {res_draft.status_code}"
        assert "not published" in res_draft.text.lower()
        print("  [PASSED] Student cannot access questions for Draft test (403 Forbidden)")

        # 5. Trainer CAN access questions for Draft test (preview/management) -> 200
        res_tr_draft = requests.get(f"{base_url}/tests/{test_draft_id}/attempt-questions", headers=trainer_headers)
        assert res_tr_draft.status_code == 200, f"Expected 200 for trainer, got {res_tr_draft.status_code}"
        print("  [PASSED] Trainer can preview Draft test questions (200 OK)")

        # 6. Student 1 (Batch Alpha) cannot access test assigned ONLY to Batch Beta -> 403
        res_unassigned_batch = requests.get(f"{base_url}/tests/{test_beta_id}/attempt-questions", headers=s1_headers)
        assert res_unassigned_batch.status_code == 403, f"Expected 403 for unassigned batch, got {res_unassigned_batch.status_code}"
        assert "not assigned" in res_unassigned_batch.text.lower()
        print("  [PASSED] Student blocked from test assigned to another batch (403 Forbidden)")

        # 7. Student 1 cannot access test scheduled in the FUTURE -> 403
        res_future = requests.get(f"{base_url}/tests/{test_future_id}/attempt-questions", headers=s1_headers)
        assert res_future.status_code == 403, f"Expected 403 for future test, got {res_future.status_code}"
        assert "not started yet" in res_future.text.lower()
        print("  [PASSED] Student blocked from test scheduled in the future (403 Forbidden)")

        # 8. Student 1 cannot access test whose schedule has EXPIRED -> 403
        res_expired = requests.get(f"{base_url}/tests/{test_expired_id}/attempt-questions", headers=s1_headers)
        assert res_expired.status_code == 403, f"Expected 403 for expired test, got {res_expired.status_code}"
        assert "expired" in res_expired.text.lower()
        print("  [PASSED] Student blocked from expired test session (403 Forbidden)")

        # 9. Eligible Student (Student 1 on active Batch Alpha test) CAN retrieve questions -> 200
        res_s1_eligible = requests.get(f"{base_url}/tests/{test_pub_id}/attempt-questions", headers=s1_headers)
        assert res_s1_eligible.status_code == 200, f"Expected 200 for eligible student, got {res_s1_eligible.status_code}"
        exam_qs = res_s1_eligible.json()
        assert len(exam_qs) == 2, f"Expected 2 questions, got {len(exam_qs)}"
        print("  [PASSED] Eligible student successfully retrieved questions for active assigned test (200 OK)")

        # 10. Check alternate alias endpoints enforce identical authorization checks
        res_alias1 = requests.get(f"{base_url}/tests/{test_draft_id}/questions", headers=s1_headers)
        assert res_alias1.status_code == 403, f"Alias /tests/{test_draft_id}/questions did not block draft access"
        res_alias2 = requests.get(f"{base_url}/questions/attempt/{test_beta_id}", headers=s1_headers)
        assert res_alias2.status_code == 403, f"Alias /questions/attempt/{test_beta_id} did not block unassigned batch"
        print("  [PASSED] All alternate endpoint aliases strictly enforce authorization guards")

        # ==============================================================================
        # PART 3: Active Exam Sanitization (No Answers/Explanations)
        # ==============================================================================
        print("\n--- PART 3: Active Exam Response Sanitization ---")
        raw_text = res_s1_eligible.text
        assert "CONFIDENTIAL_EXPLANATION" not in raw_text, "LEAK: explanation found in active exam response!"
        assert "isCorrect" not in raw_text, "LEAK: 'isCorrect' found in active exam response!"
        for q in exam_qs:
            assert "correctAnswer" not in q, f"LEAK: correctAnswer in question {q['id']}"
            assert "explanation" not in q, f"LEAK: explanation in question {q['id']}"
            assert isinstance(q["options"], dict)
            for opt_key, opt_val in q["options"].items():
                assert "isCorrect" not in str(opt_val)
        print("  [PASSED] Active exam question response completely excludes answer keys, explanations, and isCorrect flags")

        # ==============================================================================
        # PART 4: Attempt Submission & Post-Exam Review Security
        # ==============================================================================
        print("\n--- PART 4: Attempt Submission & Post-Exam Review ---")

        # 11. Student 1 starts attempt for active test
        res_start = requests.post(f"{base_url}/attempts", json={
            "studentId": student1_id,
            "testId": test_pub_id,
            "scheduleId": sched_alpha_id
        }, headers=s1_headers)
        assert res_start.status_code == 200, f"Start attempt failed: {res_start.text}"
        att_id = res_start.json()["id"]
        print(f"  [PASSED] Student started attempt (ID: {att_id})")

        # 12. Cannot review an in-progress attempt -> 400 Bad Request
        res_inprog_rev = requests.get(f"{base_url}/attempts/{att_id}/review", headers=s1_headers)
        assert res_inprog_rev.status_code == 400, f"Expected 400 for in-progress review, got {res_inprog_rev.status_code}"
        assert "incomplete" in res_inprog_rev.text.lower()
        print("  [PASSED] In-progress attempt review strictly rejected (400 Bad Request)")

        # 13. Student 1 submits attempt with answers: Q1 -> 'B' (correct), Q2 -> 'A' (incorrect)
        res_submit = requests.post(f"{base_url}/attempts/{att_id}/submit", json={
            "answers": {
                q1_id: {"selectedOption": "B"},
                q2_id: {"selectedOption": "A"}
            }
        }, headers=s1_headers)
        assert res_submit.status_code == 200, f"Submit failed: {res_submit.text}"
        submitted_att = res_submit.json()
        assert submitted_att["status"] == "submitted"
        assert submitted_att["score"] == 2.0, f"Expected score 2.0, got {submitted_att['score']}" # Q1 gives 2.0, Q2 gives 0
        print(f"  [PASSED] Server-side grading verified: Score = {submitted_att['score']} / 3.0")

        # 14. Student 2 tries to review Student 1's completed attempt -> 403 Forbidden
        res_cross_review = requests.get(f"{base_url}/attempts/{att_id}/review", headers=s2_headers)
        assert res_cross_review.status_code == 403, f"Expected 403 for cross-student review, got {res_cross_review.status_code}"
        print("  [PASSED] Cross-student attempt review strictly blocked (403 Forbidden)")

        # 15. Student 1 reviews their own completed attempt -> 200 OK
        res_my_review = requests.get(f"{base_url}/attempts/{att_id}/review", headers=s1_headers)
        assert res_my_review.status_code == 200, f"Expected 200 for student review, got {res_my_review.status_code}"
        review_data = res_my_review.json()
        assert len(review_data) == 2, f"Expected 2 review items, got {len(review_data)}"

        rev_q1 = next(item for item in review_data if item["id"] == q1_id)
        assert rev_q1["userSelectedOption"] == "B"
        assert rev_q1["isCorrect"] is True
        assert rev_q1["correctAnswer"] == "B"
        assert "CONFIDENTIAL_EXPLANATION" in rev_q1["explanation"]

        rev_q2 = next(item for item in review_data if item["id"] == q2_id)
        assert rev_q2["userSelectedOption"] == "A"
        assert rev_q2["isCorrect"] is False
        assert rev_q2["correctAnswer"] == "C"

        print("  [PASSED] Post-submission review delivers accurate server-graded results, answers, and explanations")

        # 16. Verify Attempt.answers property includes isCorrect on submitted attempts
        res_att_get = requests.get(f"{base_url}/attempts?studentId={student1_id}", headers=s1_headers).json()
        target_att = next(a for a in res_att_get if a["id"] == att_id)
        assert target_att["answers"][q1_id]["isCorrect"] is True
        assert target_att["answers"][q2_id]["isCorrect"] is False
        print("  [PASSED] Attempt.answers reliably provides server-graded isCorrect status")

        print("\n==================================================================")
        print("ALL SEC-001 SECURITY & AUTHORIZATION TESTS PASSED PERFECTLY (100%)!")
        print("==================================================================")

    finally:
        server.should_exit = True
        try:
            os.remove(db_path)
        except Exception:
            pass

if __name__ == "__main__":
    run_tests()
