"""
Automated Verification Test Suite for HIGH-03:
Question Bank and Question Authorization, Ownership Integrity, and Conflict Safety
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
    print("RUNNING COMPREHENSIVE HIGH-03 VERIFICATION TEST SUITE")
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

    admin_id = "user-h3-admin"
    inst_id = "user-h3-inst"
    trainer_a_id = "user-h3-trainer-a"
    trainer_b_id = "user-h3-trainer-b"
    student_id = "user-h3-student"

    db.add(models.User(id=admin_id, email="admin_h3@lms.com", role="admin", password_hash=pwd, status="active"))
    db.add(models.User(id=inst_id, email="inst_h3@lms.com", role="institution", password_hash=pwd, status="active"))
    db.add(models.User(id=trainer_a_id, email="tr_a_h3@lms.com", role="trainer", password_hash=pwd, status="active"))
    db.add(models.User(id=trainer_b_id, email="tr_b_h3@lms.com", role="trainer", password_hash=pwd, status="active"))
    db.add(models.User(id=student_id, email="s_h3@lms.com", role="student", password_hash=pwd, status="active"))
    db.commit()

    # Seed Question Bank B owned by Trainer B
    bank_b_id = "qb-h3-trainer-b"
    bank_b = models.QuestionBank(
        id=bank_b_id,
        name="Trainer B Private Question Bank",
        ownerId=trainer_b_id
    )
    # Seed Question Bank A owned by Trainer A (clean for authorized deletion)
    bank_a_id = "qb-h3-trainer-a-clean"
    bank_a = models.QuestionBank(
        id=bank_a_id,
        name="Trainer A Clean Bank",
        ownerId=trainer_a_id
    )
    # Seed Bank and Question linked to an active Test
    bank_linked_test_id = "qb-h3-linked-test"
    bank_linked_test = models.QuestionBank(id=bank_linked_test_id, name="Bank Linked to Test", ownerId=trainer_a_id)
    # Seed Bank and Question linked to a Student Attempt
    bank_linked_ans_id = "qb-h3-linked-ans"
    bank_linked_ans = models.QuestionBank(id=bank_linked_ans_id, name="Bank Linked to Answers", ownerId=trainer_a_id)

    db.add_all([bank_b, bank_a, bank_linked_test, bank_linked_ans])
    db.commit()

    q_b_id = "q-h3-trainer-b-1"
    q_b = models.Question(
        id=q_b_id,
        questionBankId=bank_b_id,
        text="What is encapsulation in OOP?",
        difficulty="Medium",
        marks=2.0
    )
    q_a1_id = "q-h3-trainer-a-1"
    q_a2_id = "q-h3-trainer-a-2"
    q_a1 = models.Question(id=q_a1_id, questionBankId=bank_a_id, text="Q1", difficulty="Easy", marks=1.0)
    q_a2 = models.Question(id=q_a2_id, questionBankId=bank_a_id, text="Q2", difficulty="Easy", marks=1.0)

    q_in_test_id = "q-h3-in-test"
    q_in_test = models.Question(id=q_in_test_id, questionBankId=bank_linked_test_id, text="Question In Active Test", difficulty="Hard", marks=5.0)

    q_answered_id = "q-h3-answered"
    q_answered = models.Question(id=q_answered_id, questionBankId=bank_linked_ans_id, text="Answered Question", difficulty="Medium", marks=3.0)

    db.add_all([q_b, q_a1, q_a2, q_in_test, q_answered])
    db.commit()

    test_id = "test-h3-linked"
    test_obj = models.Test(id=test_id, title="Assessment Linked to Q", authorId=trainer_a_id, status="Published")
    db.add(test_obj)
    db.commit()

    tq = models.TestQuestion(testId=test_id, questionId=q_in_test_id, orderIndex=0)
    db.add(tq)
    db.commit()

    att_id = "att-h3-submitted"
    att = models.Attempt(id=att_id, studentId=student_id, status="submitted")
    db.add(att)
    db.commit()

    ans = models.Answer(id="ans-h3-record", attemptId=att_id, questionId=q_answered_id, selectedOptionIds='["A"]')
    db.add(ans)
    db.commit()
    db.close()

    # 3. Start local Uvicorn test server
    port = 8899
    server_config = uvicorn.Config(app, host="127.0.0.1", port=port, log_level="error")
    server = uvicorn.Server(server_config)
    server_thread = threading.Thread(target=server.run, daemon=True)
    server_thread.start()
    time.sleep(1.2)

    base_url = f"http://127.0.0.1:{port}/api"

    # JWT Tokens & Headers
    admin_headers = {"Authorization": f"Bearer {create_access_token({'sub': admin_id, 'role': 'admin'})}", "Content-Type": "application/json"}
    inst_headers = {"Authorization": f"Bearer {create_access_token({'sub': inst_id, 'role': 'institution'})}", "Content-Type": "application/json"}
    tr_a_headers = {"Authorization": f"Bearer {create_access_token({'sub': trainer_a_id, 'role': 'trainer'})}", "Content-Type": "application/json"}
    tr_b_headers = {"Authorization": f"Bearer {create_access_token({'sub': trainer_b_id, 'role': 'trainer'})}", "Content-Type": "application/json"}
    student_headers = {"Authorization": f"Bearer {create_access_token({'sub': student_id, 'role': 'student'})}", "Content-Type": "application/json"}

    passed_count = 0
    total_count = 14

    try:
        # Test 1: Trainer A cannot delete Trainer B's question bank
        print("\n--- SECTION 1: Trainer Ownership Enforcement on Question Banks ---")
        res1 = requests.delete(f"{base_url}/question-banks/{bank_b_id}", headers=tr_a_headers)
        assert res1.status_code == 403, f"Expected 403, got {res1.status_code}: {res1.text}"
        assert "Access denied" in res1.json()["detail"]
        print("  [1/14] Trainer A cannot delete Trainer B's question bank (403 Forbidden)")
        passed_count += 1

        # Test 2: Database integrity check: Bank B remains intact
        db_check = TestSession()
        persisted_b = db_check.query(models.QuestionBank).filter(models.QuestionBank.id == bank_b_id).first()
        assert persisted_b is not None, "Bank B was erroneously deleted!"
        print("  [2/14] Database verified: Trainer B's question bank remains intact after unauthorized attempt")
        passed_count += 1

        # Test 3: Trainer A cannot delete Trainer B's question
        print("\n--- SECTION 2: Trainer Ownership Enforcement on Individual Questions ---")
        res3 = requests.delete(f"{base_url}/questions/{q_b_id}", headers=tr_a_headers)
        assert res3.status_code == 403, f"Expected 403, got {res3.status_code}: {res3.text}"
        assert "Access denied" in res3.json()["detail"]
        print("  [3/14] Trainer A cannot delete Trainer B's question (403 Forbidden)")
        passed_count += 1

        # Test 4: Database integrity check: Question B remains intact
        persisted_q = db_check.query(models.Question).filter(models.Question.id == q_b_id).first()
        assert persisted_q is not None, "Question B was erroneously deleted!"
        print("  [4/14] Database verified: Trainer B's question remains intact after unauthorized attempt")
        passed_count += 1

        # Test 5: Trainer A cannot inject questions into Trainer B's question bank
        print("\n--- SECTION 3: Question Creation & Identity Spoofing Protection ---")
        res5 = requests.post(f"{base_url}/questions", json={
            "questionBankId": bank_b_id,
            "text": "Maliciously injected question",
            "type": "MCQ",
            "options": {"A": "Yes", "B": "No"}
        }, headers=tr_a_headers)
        assert res5.status_code == 403, f"Expected 403, got {res5.status_code}: {res5.text}"
        assert "Access denied" in res5.json()["detail"]
        print("  [5/14] Trainer A cannot add questions to Trainer B's question bank (403 Forbidden)")
        passed_count += 1

        # Test 6: Trainer bank creation forces ownerId to current_user.id
        res6 = requests.post(f"{base_url}/question-banks", json={
            "name": "Spoof Owner Attempt",
            "uploadedBy": admin_id,
            "ownerId": admin_id
        }, headers=tr_a_headers)
        assert res6.status_code == 200, f"Expected 200, got {res6.status_code}: {res6.text}"
        created_data = res6.json()
        assert created_data["ownerId"] == trainer_a_id, f"Spoofed owner accepted! Got {created_data['ownerId']}"
        print("  [6/14] Bank creation forces ownerId to authenticated trainer; spoofing blocked (200 OK)")
        passed_count += 1

        # Test 7: Authorized trainer can delete their own question and question bank
        print("\n--- SECTION 4: Legitimate Authorized Deletion Workflows ---")
        res7_q = requests.delete(f"{base_url}/questions/{q_a1_id}", headers=tr_a_headers)
        assert res7_q.status_code == 200, f"Expected 200, got {res7_q.status_code}: {res7_q.text}"
        assert res7_q.json()["message"] == "Deleted"
        assert db_check.query(models.Question).filter(models.Question.id == q_a1_id).first() is None

        res7_b = requests.delete(f"{base_url}/question-banks/{bank_a_id}", headers=tr_a_headers)
        assert res7_b.status_code == 200, f"Expected 200, got {res7_b.status_code}: {res7_b.text}"
        assert res7_b.json()["message"] == "Deleted"
        assert db_check.query(models.QuestionBank).filter(models.QuestionBank.id == bank_a_id).first() is None
        assert db_check.query(models.Question).filter(models.Question.id == q_a2_id).first() is None
        print("  [7/14] Authorized trainer successfully deleted own question and question bank (200 OK)")
        passed_count += 1

        # Test 8: Admin permissions preserved
        # Create disposable bank for admin deletion
        res8_create = requests.post(f"{base_url}/question-banks", json={"name": "Bank For Admin Delete"}, headers=tr_b_headers)
        adm_target_id = res8_create.json()["id"]
        res8_del = requests.delete(f"{base_url}/question-banks/{adm_target_id}", headers=admin_headers)
        assert res8_del.status_code == 200, f"Admin delete failed: {res8_del.text}"
        print("  [8/14] Admin permissions preserved: can delete question banks across trainers (200 OK)")
        passed_count += 1

        # Test 9: Institution permissions preserved
        res9_create = requests.post(f"{base_url}/question-banks", json={"name": "Bank For Inst Delete"}, headers=tr_b_headers)
        inst_target_id = res9_create.json()["id"]
        res9_del = requests.delete(f"{base_url}/question-banks/{inst_target_id}", headers=inst_headers)
        assert res9_del.status_code == 200, f"Institution delete failed: {res9_del.text}"
        print("  [9/14] Institution permissions preserved: can delete question banks across trainers (200 OK)")
        passed_count += 1

        # Test 10: Students cannot delete question banks or questions
        print("\n--- SECTION 5: Role-Based Route Guarding ---")
        res10_b = requests.delete(f"{base_url}/question-banks/{bank_b_id}", headers=student_headers)
        assert res10_b.status_code == 403
        res10_q = requests.delete(f"{base_url}/questions/{q_b_id}", headers=student_headers)
        assert res10_q.status_code == 403
        print("  [10/14] Student attempts to delete question bank or question strictly forbidden (403)")
        passed_count += 1

        # Test 11: Unauthenticated requests return 401
        res11_b = requests.delete(f"{base_url}/question-banks/{bank_b_id}")
        assert res11_b.status_code == 401
        res11_q = requests.delete(f"{base_url}/questions/{q_b_id}")
        assert res11_q.status_code == 401
        print("  [11/14] Unauthenticated attempts to delete return 401 Unauthorized")
        passed_count += 1

        # Test 12: Cannot delete question assigned to an active test (409 Conflict)
        print("\n--- SECTION 6: Assessment & Exam History Integrity (Conflict Checks) ---")
        res12 = requests.delete(f"{base_url}/questions/{q_in_test_id}", headers=tr_a_headers)
        assert res12.status_code == 409, f"Expected 409 Conflict, got {res12.status_code}: {res12.text}"
        assert "currently assigned to one or more assessments" in res12.json()["detail"]
        assert db_check.query(models.Question).filter(models.Question.id == q_in_test_id).first() is not None
        print("  [12/14] Deleting question assigned to test rejected with 409 Conflict (assessment protected)")
        passed_count += 1

        # Test 13: Cannot delete question with existing student answers (409 Conflict)
        res13 = requests.delete(f"{base_url}/questions/{q_answered_id}", headers=tr_a_headers)
        assert res13.status_code == 409, f"Expected 409 Conflict, got {res13.status_code}: {res13.text}"
        assert "existing assessment attempts" in res13.json()["detail"]
        assert db_check.query(models.Question).filter(models.Question.id == q_answered_id).first() is not None
        print("  [13/14] Deleting question with student answers rejected with 409 Conflict (answers protected)")
        passed_count += 1

        # Test 14: Cannot delete question bank containing questions used in tests or answers (409 Conflict)
        res14_test = requests.delete(f"{base_url}/question-banks/{bank_linked_test_id}", headers=tr_a_headers)
        assert res14_test.status_code == 409, f"Expected 409 Conflict, got {res14_test.status_code}: {res14_test.text}"
        assert "currently assigned to one or more assessments" in res14_test.json()["detail"]

        res14_ans = requests.delete(f"{base_url}/question-banks/{bank_linked_ans_id}", headers=admin_headers)
        assert res14_ans.status_code == 409, f"Expected 409 Conflict, got {res14_ans.status_code}: {res14_ans.text}"
        assert "existing assessment attempts" in res14_ans.json()["detail"]

        assert db_check.query(models.QuestionBank).filter(models.QuestionBank.id == bank_linked_test_id).first() is not None
        assert db_check.query(models.QuestionBank).filter(models.QuestionBank.id == bank_linked_ans_id).first() is not None
        print("  [14/14] Deleting question bank containing test/attempt questions rejected with 409 Conflict")
        passed_count += 1

        db_check.close()

    finally:
        server.should_exit = True
        try:
            os.remove(db_path)
        except Exception:
            pass

    print("\n==================================================================")
    print(f"ALL {passed_count}/{total_count} HIGH-03 VERIFICATION TESTS PASSED (100%)!")
    print("==================================================================")

if __name__ == "__main__":
    run_tests()
