import requests
import sys

BASE_URL = "http://localhost:8000/api"

def print_step(step_num, desc):
    print(f"\n[{step_num}] {desc}")

def run_tests():
    try:
        # Step 1: Register Trainer
        print_step(1, "Registering Trainer")
        trainer_data = {
            "name": "E2E Trainer",
            "email": "e2etrainer@test.com",
            "password": "password123"
        }
        res = requests.post(f"{BASE_URL}/auth/register/trainer", json=trainer_data)
        if res.status_code != 200 and res.status_code != 400:
            print(f"Failed to register trainer: {res.text}")
            sys.exit(1)
        
        # Step 2: Login as Trainer
        print_step(2, "Logging in as Trainer")
        login_data = {"identifier": "e2etrainer@test.com", "password": "password123"}
        res = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        if res.status_code != 200:
            print(f"Failed to login trainer: {res.text}")
            sys.exit(1)
        trainer_token = res.json()["token"]
        trainer_headers = {"Authorization": f"Bearer {trainer_token}"}
        
        # Step 3: Register Student
        print_step(3, "Registering Student")
        student_data = {
            "name": "E2E Student",
            "email": "e2estudent@test.com",
            "studentId": "E2ESTU01",
            "department": "Computer Science",
            "batch": "Batch 2026",
            "password": "password123"
        }
        res = requests.post(f"{BASE_URL}/auth/register/student", json=student_data)
        if res.status_code != 200 and res.status_code != 400:
            print(f"Failed to register student: {res.text}")
            sys.exit(1)
            
        # Step 4: Login as Student
        print_step(4, "Logging in as Student")
        login_data = {"identifier": "e2estudent@test.com", "password": "password123"}
        res = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        if res.status_code != 200:
            print(f"Failed to login student: {res.text}")
            sys.exit(1)
        student_token = res.json()["token"]
        student_headers = {"Authorization": f"Bearer {student_token}"}
        
        # Step 5: Trainer creates a Question Bank
        print_step(5, "Trainer creating Question Bank")
        qb_data = {
            "name": "E2E Test Bank",
            "description": "Bank for E2E Tests",
            "isPublic": True
        }
        res = requests.post(f"{BASE_URL}/question-banks", json=qb_data, headers=trainer_headers)
        if res.status_code != 200:
            print(f"Failed to create Question Bank: {res.text}")
            sys.exit(1)
        bank_id = res.json()["id"]
        
        # Step 6: Trainer creates a Question
        print_step(6, "Trainer creating Question")
        q_data = {
            "type": "MCQ",
            "text": "What is 2 + 2?",
            "difficulty": "Easy",
            "marks": 2.0,
            "options": [
                {"optionText": "3", "isCorrect": False},
                {"optionText": "4", "isCorrect": True}
            ]
        }
        res = requests.post(f"{BASE_URL}/questions?bankId={bank_id}", json=q_data, headers=trainer_headers)
        if res.status_code != 200:
            print(f"Failed to create Question: {res.text}")
            sys.exit(1)
        q_id = res.json()["id"]
        
        # Step 7: Trainer creates a Test
        print_step(7, "Trainer creating Test")
        test_data = {
            "title": "E2E Math Test",
            "description": "Simple Math Test",
            "passingPercentage": 50.0,
            "totalMarks": 2.0,
            "questionIds": [q_id]
        }
        res = requests.post(f"{BASE_URL}/tests", json=test_data, headers=trainer_headers)
        if res.status_code != 200:
            print(f"Failed to create Test: {res.text}")
            sys.exit(1)
        test_id = res.json()["id"]
        
        # Step 8: Trainer schedules the Test for the Student's Batch
        print_step(8, "Trainer scheduling Test")
        schedule_data = {
            "testId": test_id,
            "startTime": "2026-08-01T10:00:00Z",
            "endTime": "2026-12-31T10:00:00Z",
            "durationMinutes": 60,
            "attemptsAllowed": 1,
            "assignedBatch": "Batch 2026"
        }
        res = requests.post(f"{BASE_URL}/schedules", json=schedule_data, headers=trainer_headers)
        if res.status_code != 200:
            print(f"Failed to schedule Test: {res.text}")
            sys.exit(1)
        schedule_id = res.json()["id"]
        
        # Step 9: Student fetches their upcoming tests
        print_step(9, "Student fetching assigned tests (Schedules)")
        res = requests.get(f"{BASE_URL}/schedules", headers=student_headers)
        if res.status_code != 200:
            print(f"Failed to get schedules: {res.text}")
            sys.exit(1)
        schedules = res.json()
        print(f"Found {len(schedules)} schedules overall.")
        
        # We'll just start the attempt for the one we made
        
        # Step 10: Student starts Test Attempt
        print_step(10, "Student starting attempt")
        attempt_data = {
            "testId": test_id,
            "scheduleId": schedule_id
        }
        res = requests.post(f"{BASE_URL}/attempts", json=attempt_data, headers=student_headers)
        if res.status_code != 200:
            print(f"Failed to start attempt: {res.text}")
            sys.exit(1)
        attempt_id = res.json()["id"]
        
        # Step 11: Student Submits Answer
        print_step(11, "Student submitting answer")
        ans_data = {
            "answers": {
                q_id: {
                    "questionId": q_id,
                    "selectedOption": "B",
                    "status": "answered"
                }
            }
        }
        res = requests.put(f"{BASE_URL}/attempts/{attempt_id}", json=ans_data, headers=student_headers)
        if res.status_code != 200:
            print(f"Failed to submit answer: {res.text}")
            sys.exit(1)
            
        # Step 12: Student Completes Attempt
        print_step(12, "Student completing attempt")
        res = requests.post(f"{BASE_URL}/attempts/{attempt_id}/submit", json={"isAutoSubmit": False, "currentAnswers": ans_data["answers"]}, headers=student_headers)
        if res.status_code != 200:
            print(f"Failed to complete attempt: {res.text}")
            sys.exit(1)
            
        final_score = res.json().get("score")
        print(f"Attempt Completed! Final Score: {final_score}")
        
        print("\n[OK] All E2E Core Flows passed successfully!")
        
    except Exception as e:
        print(f"E2E Test failed with Exception: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_tests()
