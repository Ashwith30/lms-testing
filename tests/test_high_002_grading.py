"""
Automated Verification Test Suite for HIGH-02:
Option-Based MCQ Grading, Option ID Matching, Missing correctAnswer Handling, and Server-Side Scoring Integrity
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
    print("RUNNING COMPREHENSIVE HIGH-02 VERIFICATION TEST SUITE")
    print("==================================================================")

    # 1. Isolated temporary SQLite database
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
    now = models.get_utc_now()

    admin_id = "user-h2-admin"
    trainer_id = "user-h2-trainer"
    student_id = "user-h2-student"

    db.add(models.User(id=admin_id, email="admin_h2@lms.com", role="admin", password_hash=pwd, status="active"))
    db.add(models.User(id=trainer_id, email="trainer_h2@lms.com", role="trainer", password_hash=pwd, status="active"))
    db.add(models.User(id=student_id, email="student_h2@lms.com", role="student", password_hash=pwd, status="active"))
    db.commit()

    # Question Bank
    bank_id = "qb-h2-bank"
    bank = models.QuestionBank(id=bank_id, name="HIGH-02 Evaluation Bank", ownerId=trainer_id)
    db.add(bank)
    db.commit()

    # Q1: Option-based MCQ (marks=2.0). Option B is correct (id="opt-h2-q1-b", text="4").
    q1_id = "q-h2-1"
    q1 = models.Question(id=q1_id, questionBankId=bank_id, text="What is 2 + 2?", type="MCQ", marks=2.0, difficulty="Easy")
    db.add(q1)
    db.commit()

    opt1_a = models.QuestionOption(id="opt-h2-q1-a", questionId=q1_id, optionText="3", isCorrect=False, orderIndex=0)
    opt1_b = models.QuestionOption(id="opt-h2-q1-b", questionId=q1_id, optionText="4", isCorrect=True, orderIndex=1)
    opt1_c = models.QuestionOption(id="opt-h2-q1-c", questionId=q1_id, optionText="5", isCorrect=False, orderIndex=2)
    db.add_all([opt1_a, opt1_b, opt1_c])
    db.commit()

    # Q2: Option-based MCQ (marks=3.0). Option C is correct (id="opt-h2-q2-c", text="Paris").
    q2_id = "q-h2-2"
    q2 = models.Question(id=q2_id, questionBankId=bank_id, text="What is the capital of France?", type="MCQ", marks=3.0, difficulty="Medium")
    db.add(q2)
    db.commit()

    opt2_a = models.QuestionOption(id="opt-h2-q2-a", questionId=q2_id, optionText="London", isCorrect=False, orderIndex=0)
    opt2_b = models.QuestionOption(id="opt-h2-q2-b", questionId=q2_id, optionText="Berlin", isCorrect=False, orderIndex=1)
    opt2_c = models.QuestionOption(id="opt-h2-q2-c", questionId=q2_id, optionText="Paris", isCorrect=True, orderIndex=2)
    db.add_all([opt2_a, opt2_b, opt2_c])
    db.commit()

    # Q3: Multi-select question (marks=4.0). Options A and C are correct.
    q3_id = "q-h2-3"
    q3 = models.Question(id=q3_id, questionBankId=bank_id, text="Select all compiled/hybrid languages", type="MULTI_SELECT", marks=4.0, difficulty="Hard")
    db.add(q3)
    db.commit()

    opt3_a = models.QuestionOption(id="opt-h2-q3-a", questionId=q3_id, optionText="C++", isCorrect=True, orderIndex=0)
    opt3_b = models.QuestionOption(id="opt-h2-q3-b", questionId=q3_id, optionText="HTML", isCorrect=False, orderIndex=1)
    opt3_c = models.QuestionOption(id="opt-h2-q3-c", questionId=q3_id, optionText="Java", isCorrect=True, orderIndex=2)
    db.add_all([opt3_a, opt3_b, opt3_c])
    db.commit()

    # Q4: Malformed question - NO option marked correct (marks=1.0)
    q4_id = "q-h2-4"
    q4 = models.Question(id=q4_id, questionBankId=bank_id, text="Unkeyed question with no correct answer", type="MCQ", marks=1.0, difficulty="Easy")
    db.add(q4)
    db.commit()

    opt4_a = models.QuestionOption(id="opt-h2-q4-a", questionId=q4_id, optionText="Choice 1", isCorrect=False, orderIndex=0)
    opt4_b = models.QuestionOption(id="opt-h2-q4-b", questionId=q4_id, optionText="Choice 2", isCorrect=False, orderIndex=1)
    db.add_all([opt4_a, opt4_b])
    db.commit()

    # Test 1: Standard Exam with Q1 and Q2 (Total marks = 5.0)
    test_1_id = "test-h2-standard"
    t1 = models.Test(id=test_1_id, title="Standard MCQ Assessment", authorId=trainer_id, status="Published", totalMarks=5.0)
    db.add(t1)
    db.commit()

    tq1_1 = models.TestQuestion(testId=test_1_id, questionId=q1_id, orderIndex=0)
    tq1_2 = models.TestQuestion(testId=test_1_id, questionId=q2_id, orderIndex=1)
    db.add_all([tq1_1, tq1_2])
    db.commit()

    sched_1_id = "sched-h2-standard"
    s1 = models.Schedule(
        id=sched_1_id,
        testId=test_1_id,
        startTime="2020-01-01T00:00:00+00:00",
        endTime="2099-01-01T00:00:00+00:00",
        durationMinutes=60,
        attemptsAllowed=10
    )
    db.add(s1)
    db.commit()

    # Test 2: Exam with Multi-Select Q3 and Malformed Q4
    test_2_id = "test-h2-advanced"
    t2 = models.Test(id=test_2_id, title="Advanced Assessment", authorId=trainer_id, status="Published", totalMarks=5.0)
    db.add(t2)
    db.commit()

    tq2_1 = models.TestQuestion(testId=test_2_id, questionId=q3_id, orderIndex=0)
    tq2_2 = models.TestQuestion(testId=test_2_id, questionId=q4_id, orderIndex=1)
    db.add_all([tq2_1, tq2_2])
    db.commit()

    sched_2_id = "sched-h2-advanced"
    s2 = models.Schedule(
        id=sched_2_id,
        testId=test_2_id,
        startTime="2020-01-01T00:00:00+00:00",
        endTime="2099-01-01T00:00:00+00:00",
        durationMinutes=60,
        attemptsAllowed=10
    )
    db.add(s2)
    db.commit()
    db.close()

    # 3. Start local Uvicorn test server
    port = 8897
    server_config = uvicorn.Config(app, host="127.0.0.1", port=port, log_level="error")
    server = uvicorn.Server(server_config)

    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()

    base_url = f"http://127.0.0.1:{port}/api"

    for _ in range(50):
        try:
            requests.get(f"{base_url}/health", timeout=0.5)
            break
        except Exception:
            time.sleep(0.1)

    token_student = create_access_token(data={"sub": student_id, "role": "student"})
    headers_student = {"Authorization": f"Bearer {token_student}"}

    def create_attempt(sched_id, test_id):
        db_s = TestSession()
        att_id = models.generate_uuid("att-h2-")
        att = models.Attempt(
            id=att_id,
            studentId=student_id,
            scheduleId=sched_id,
            status="in_progress",
            startedAt=models.get_utc_now()
        )
        db_s.add(att)
        db_s.commit()
        db_s.close()
        return att_id

    try:
        print("\n--- SECTION 1: Option-Based MCQ Correct Answer Formats ---")
        # 1. Correct answers submitted as Option Letters ("B" for Q1, "C" for Q2)
        att1 = create_attempt(sched_1_id, test_1_id)
        payload1 = {
            "answers": {
                q1_id: {"selectedOption": "B"},
                q2_id: {"selectedOption": "C"}
            }
        }
        r1 = requests.post(f"{base_url}/attempts/{att1}/submit", json=payload1, headers=headers_student)
        assert r1.status_code == 200, f"Submit failed: {r1.text}"
        res1 = r1.json()
        assert res1["score"] == 5.0, f"Expected 5.0, got {res1['score']}"
        assert res1["percentage"] == 100.0, f"Expected 100.0%, got {res1['percentage']}"
        print("  [1/12] Option letters ('B', 'C') correctly scored: 5.0 / 5.0 (100.0%)")

        # 2. Correct answers submitted as Option IDs ("opt-h2-q1-b", "opt-h2-q2-c")
        # This directly validates fixing the bug where option IDs were silently scored 0 marks!
        att2 = create_attempt(sched_1_id, test_1_id)
        payload2 = {
            "answers": {
                q1_id: {"selectedOption": "opt-h2-q1-b"},
                q2_id: {"selectedOption": "opt-h2-q2-c"}
            }
        }
        r2 = requests.post(f"{base_url}/attempts/{att2}/submit", json=payload2, headers=headers_student)
        assert r2.status_code == 200, f"Submit failed: {r2.text}"
        res2 = r2.json()
        assert res2["score"] == 5.0, f"Expected 5.0 for option IDs, got {res2['score']} (Bug: scored 0)"
        assert res2["percentage"] == 100.0
        print("  [2/12] Option IDs ('opt-h2-q1-b', 'opt-h2-q2-c') correctly scored: 5.0 / 5.0 (100.0%)")

        # 3. Correct answers submitted as Option Text ("4", "Paris")
        att3 = create_attempt(sched_1_id, test_1_id)
        payload3 = {
            "answers": {
                q1_id: {"selectedOption": "4"},
                q2_id: {"selectedOption": "Paris"}
            }
        }
        r3 = requests.post(f"{base_url}/attempts/{att3}/submit", json=payload3, headers=headers_student)
        assert r3.status_code == 200
        res3 = r3.json()
        assert res3["score"] == 5.0, f"Expected 5.0 for option texts, got {res3['score']}"
        print("  [3/12] Option Text values ('4', 'Paris') correctly scored: 5.0 / 5.0 (100.0%)")

        # 4. Correct answers submitted as Option orderIndex (1 for Q1, 2 for Q2)
        att4 = create_attempt(sched_1_id, test_1_id)
        payload4 = {
            "answers": {
                q1_id: {"selectedOption": "1"},
                q2_id: {"selectedOption": "2"}
            }
        }
        r4 = requests.post(f"{base_url}/attempts/{att4}/submit", json=payload4, headers=headers_student)
        assert r4.status_code == 200
        res4 = r4.json()
        assert res4["score"] == 5.0
        print("  [4/12] Option orderIndex ('1', '2') correctly scored: 5.0 / 5.0 (100.0%)")

        print("\n--- SECTION 2: Incorrect Answers & Zero-Mark Enforcement ---")
        # 5. Incorrect Option Letters ("A" for Q1, "A" for Q2)
        att5 = create_attempt(sched_1_id, test_1_id)
        payload5 = {
            "answers": {
                q1_id: {"selectedOption": "A"},
                q2_id: {"selectedOption": "A"}
            }
        }
        r5 = requests.post(f"{base_url}/attempts/{att5}/submit", json=payload5, headers=headers_student)
        assert r5.status_code == 200
        res5 = r5.json()
        assert res5["score"] == 0.0, f"Expected 0.0 for wrong answers, got {res5['score']}"
        assert res5["percentage"] == 0.0
        print("  [5/12] Incorrect Option letters ('A', 'A') strictly receive 0.0 marks (0.0%)")

        # 6. Incorrect Option IDs ("opt-h2-q1-a", "opt-h2-q2-b")
        att6 = create_attempt(sched_1_id, test_1_id)
        payload6 = {
            "answers": {
                q1_id: {"selectedOption": "opt-h2-q1-a"},
                q2_id: {"selectedOption": "opt-h2-q2-b"}
            }
        }
        r6 = requests.post(f"{base_url}/attempts/{att6}/submit", json=payload6, headers=headers_student)
        assert r6.status_code == 200
        res6 = r6.json()
        assert res6["score"] == 0.0
        print("  [6/12] Incorrect Option IDs strictly receive 0.0 marks (0.0%)")

        print("\n--- SECTION 3: Unanswered, Partial, and Malformed Submissions ---")
        # 7. Partial submission: Q1 answered correctly ("B" -> 2.0), Q2 left unanswered
        att7 = create_attempt(sched_1_id, test_1_id)
        payload7 = {
            "answers": {
                q1_id: {"selectedOption": "B"}
            }
        }
        r7 = requests.post(f"{base_url}/attempts/{att7}/submit", json=payload7, headers=headers_student)
        assert r7.status_code == 200
        res7 = r7.json()
        assert res7["score"] == 2.0, f"Expected 2.0, got {res7['score']}"
        assert res7["percentage"] == 40.0, f"Expected 40.0% (2/5), got {res7['percentage']}"
        print("  [7/12] Unanswered questions included in total marks but receive 0: 2.0 / 5.0 (40.0%)")

        # 8. Malformed / empty selection values: None, empty list, string 'null'
        att8 = create_attempt(sched_1_id, test_1_id)
        payload8 = {
            "answers": {
                q1_id: {"selectedOption": None},
                q2_id: {"selectedOption": "null"}
            }
        }
        r8 = requests.post(f"{base_url}/attempts/{att8}/submit", json=payload8, headers=headers_student)
        assert r8.status_code == 200
        res8 = r8.json()
        assert res8["score"] == 0.0
        print("  [8/12] Malformed selection values (None, 'null') safely evaluate to False: 0.0 marks")

        # 9. Malformed question Q4 (no option marked correct anywhere):
        # Selecting any option on Q4 must NOT award free marks
        att9 = create_attempt(sched_2_id, test_2_id)
        payload9 = {
            "answers": {
                q4_id: {"selectedOption": "A"}
            }
        }
        r9 = requests.post(f"{base_url}/attempts/{att9}/submit", json=payload9, headers=headers_student)
        assert r9.status_code == 200
        res9 = r9.json()
        assert res9["score"] == 0.0, f"Malformed question must not award marks, got {res9['score']}"
        print("  [9/12] Malformed question with no correct answer never awards unintended marks")

        print("\n--- SECTION 4: Multi-Select & Server-Side Security ---")
        # 10. Multi-select question Q3:
        # Full correct selections ['C++', 'Java'] -> 4.0 marks
        att10 = create_attempt(sched_2_id, test_2_id)
        payload10 = {
            "answers": {
                q3_id: {"selectedOption": ["opt-h2-q3-a", "opt-h2-q3-c"]}
            }
        }
        r10 = requests.post(f"{base_url}/attempts/{att10}/submit", json=payload10, headers=headers_student)
        assert r10.status_code == 200
        res10 = r10.json()
        assert res10["score"] == 4.0, f"Expected 4.0 for multi-select, got {res10['score']}"
        print("  [10/12] Multi-select question scored correctly when all correct options selected (4.0 / 5.0)")

        # 11. Client tampering protection:
        # 11a: Client attempting to inject top-level score/percentage is rejected with 422 Unprocessable Entity
        att11a = create_attempt(sched_1_id, test_1_id)
        tampered_root_payload = {
            "score": 100.0,
            "percentage": 100.0,
            "answers": {
                q1_id: {"selectedOption": "A"}
            }
        }
        r11a = requests.post(f"{base_url}/attempts/{att11a}/submit", json=tampered_root_payload, headers=headers_student)
        assert r11a.status_code == 422, f"Client-supplied top-level score must be rejected with 422, got {r11a.status_code}"

        # 11b: Client attempting to claim isCorrect=True and marks=50 in answers dict is strictly server-graded as 0.0
        att11b = create_attempt(sched_1_id, test_1_id)
        tampered_answers_payload = {
            "answers": {
                q1_id: {"selectedOption": "A", "isCorrect": True, "marks": 50.0},
                q2_id: {"selectedOption": "A", "isCorrect": True, "marks": 50.0}
            }
        }
        r11b = requests.post(f"{base_url}/attempts/{att11b}/submit", json=tampered_answers_payload, headers=headers_student)
        assert r11b.status_code == 200
        res11b = r11b.json()
        assert res11b["score"] == 0.0, f"Server MUST NOT trust client-supplied marks, got {res11b['score']}"
        assert res11b["percentage"] == 0.0
        print("  [11/12] Client-supplied fake score and isCorrect flags strictly rejected/ignored; server-graded 0.0")

        print("\n--- SECTION 5: Post-Submission Review Verification ---")
        # 12. Review endpoint delivers trusted server-graded isCorrect status
        r12 = requests.get(f"{base_url}/attempts/{att1}/review", headers=headers_student)
        assert r12.status_code == 200, f"Review failed: {r12.text}"
        review_data = r12.json()
        assert len(review_data) == 2
        rev_q1 = next(item for item in review_data if item["id"] == q1_id)
        rev_q2 = next(item for item in review_data if item["id"] == q2_id)
        assert rev_q1["isCorrect"] is True
        assert rev_q1["correctAnswer"] == "B"
        assert rev_q2["isCorrect"] is True
        assert rev_q2["correctAnswer"] == "C"
        print("  [12/12] Post-submission review confirms accurate server-graded isCorrect and correct answers")

        print("\n==================================================================")
        print("ALL 12/12 HIGH-02 VERIFICATION TESTS PASSED (100%)!")
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
