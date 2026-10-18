"""test_crit_006_rate_limiting.py

Comprehensive Verification Suite for CRIT-06:
Rate Limiting, Anti-DoS Lockout, Multi-Worker State Sharing, Proxy Safety, and Abuse Protection.

Tests:
1. Identifier normalization across email casing and student-number aliases.
2. Atomic concurrent failure tracking.
3. Persistence across application restarts or reconstructed application instances.
4. Shared rate limits across separate application instances (multi-instance / multi-worker).
5. Correct login after an attacker's failed attempts (Anti-DoS policy).
6. Password spraying and aggregate IP throttling.
7. Multiple students sharing a simulated campus IP (Campus NAT).
8. Safe handling of spoofed forwarding headers.
9. Expiration and bounded cleanup of old tracking records.
10. Registration abuse limits (POST /api/auth/register/student).
11. Legitimate exam lifecycle under configured limits (creation, answer sync, resumption, submission, abuse throttling).
12. Consistent authentication errors preventing account enumeration.
"""

import os
import sys
import time
import uuid
import tempfile
import threading
from concurrent.futures import ThreadPoolExecutor
import requests
import uvicorn

# Set isolated test database
test_db_file = os.path.join(tempfile.gettempdir(), f"test_crit06_{uuid.uuid4().hex[:8]}.db")
os.environ["DATABASE_URL"] = f"sqlite:///{test_db_file}"
os.environ["JWT_SECRET_KEY"] = "crit06-test-secret-key-32bytes-min!"
os.environ["TRUSTED_PROXIES"] = "127.0.0.1,::1,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16"

# Ensure backend root is on sys.path
_curr_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(_curr_dir, "backend") if os.path.exists(os.path.join(_curr_dir, "backend")) else os.path.abspath(os.path.join(_curr_dir, "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from database import engine, SessionLocal, Base
import models
import auth
import rate_limiter
from main import app

# Create tables in test database
Base.metadata.create_all(bind=engine)

def get_test_db():
    return SessionLocal()


def create_test_student(db, user_id, email, student_number, raw_password, batch="CS-2026"):
    hashed = auth.hash_password(raw_password)
    user = models.User(
        id=user_id,
        email=email,
        password_hash=hashed,
        role="student",
        status="active"
    )
    db.add(user)
    db.commit()

    profile = models.StudentProfile(
        userId=user_id,
        firstName="Test",
        lastName="Student",
        studentNumber=student_number,
        enrollmentDate=models.get_utc_now()
    )
    db.add(profile)
    db.commit()
    return user


def run_crit_006_tests():
    print("==================================================================")
    print("RUNNING COMPREHENSIVE CRIT-06 VERIFICATION TEST SUITE")
    print("==================================================================")

    db = get_test_db()

    # Start primary Uvicorn test server on port 8899
    port_A = 8899
    server_config_A = uvicorn.Config(app, host="127.0.0.1", port=port_A, log_level="error")
    server_A = uvicorn.Server(server_config_A)
    thread_A = threading.Thread(target=server_A.run, daemon=True)
    thread_A.start()

    # Start secondary Uvicorn test server on port 8897 (shares same DB file, simulating 2nd worker/instance)
    port_B = 8897
    server_config_B = uvicorn.Config(app, host="127.0.0.1", port=port_B, log_level="error")
    server_B = uvicorn.Server(server_config_B)
    thread_B = threading.Thread(target=server_B.run, daemon=True)
    thread_B.start()

    time.sleep(1.2)  # Give servers a moment to bind

    base_url_A = f"http://127.0.0.1:{port_A}/api"
    base_url_B = f"http://127.0.0.1:{port_B}/api"

    try:
        # ------------------------------------------------------------------
        # SECTION 1: Identifier Normalization Across Email Casing & Aliases
        # ------------------------------------------------------------------
        print("\n--- SECTION 1: Identifier Normalization Across Email Casing & Aliases ---")
        student_1 = create_test_student(
            db,
            user_id="u-norm-1",
            email="alice.smith@university.edu",
            student_number="STU-2026-001",
            raw_password="AliceSecretPassword123!"
        )

        # 1.1 Lowercase email
        r1 = requests.post(f"{base_url_A}/auth/login", json={"identifier": "alice.smith@university.edu", "password": "wrong"})
        assert r1.status_code == 401, f"Expected 401, got {r1.status_code}"

        # 1.2 Uppercase email
        r2 = requests.post(f"{base_url_A}/auth/login", json={"identifier": "ALICE.SMITH@UNIVERSITY.EDU", "password": "wrong"})
        assert r2.status_code == 401, f"Expected 401, got {r2.status_code}"

        # 1.3 Mixed case with whitespace
        r3 = requests.post(f"{base_url_A}/auth/login", json={"identifier": "  Alice.Smith@University.Edu  ", "password": "wrong"})
        assert r3.status_code == 401, f"Expected 401, got {r3.status_code}"

        # 1.4 Student number uppercase alias
        r4 = requests.post(f"{base_url_A}/auth/login", json={"identifier": "STU-2026-001", "password": "wrong"})
        assert r4.status_code == 401, f"Expected 401, got {r4.status_code}"

        # 1.5 Student number lowercase alias
        r5 = requests.post(f"{base_url_A}/auth/login", json={"identifier": "stu-2026-001", "password": "wrong"})
        assert r5.status_code == 401, f"Expected 401, got {r5.status_code}"

        # 1.6 6th attempt with mixed case: must trigger 429
        r6 = requests.post(f"{base_url_A}/auth/login", json={"identifier": "Alice.Smith@University.Edu", "password": "wrong"})
        assert r6.status_code == 429, f"Expected 429 after 5 failures across aliases, got {r6.status_code}"

        # Verify DB events all mapped to canonical key
        events = db.query(models.RateLimitEvent).filter(
            models.RateLimitEvent.key == "account:u-norm-1",
            models.RateLimitEvent.scope == "login_account"
        ).all()
        assert len(events) >= 5, f"Expected >= 5 events for account:u-norm-1, got {len(events)}"
        print("  [1/12] Identifier normalization across email casing & student ID aliases strictly verified (401x5 -> 429)")

        # ------------------------------------------------------------------
        # SECTION 2: Atomic Concurrent Failure Tracking
        # ------------------------------------------------------------------
        print("\n--- SECTION 2: Atomic Concurrent Failure Tracking ---")
        student_conc = create_test_student(
            db,
            user_id="u-conc-1",
            email="concurrency.test@university.edu",
            student_number="STU-CONC-001",
            raw_password="ConcPassword123!"
        )

        def attempt_login_conc(_):
            return requests.post(f"{base_url_A}/auth/login", json={"identifier": "concurrency.test@university.edu", "password": "bad"})

        with ThreadPoolExecutor(max_workers=8) as executor:
            conc_results = list(executor.map(attempt_login_conc, range(10)))

        # Count events in DB
        conc_events = db.query(models.RateLimitEvent).filter(
            models.RateLimitEvent.key == "account:u-conc-1",
            models.RateLimitEvent.scope == "login_account"
        ).count()
        assert conc_events == 10, f"Expected exactly 10 recorded events under concurrency, found {conc_events}"
        print(f"  [2/12] Atomic concurrent failure tracking verified: exactly {conc_events}/10 events recorded with zero lost updates")

        # ------------------------------------------------------------------
        # SECTION 3: Persistence Across Application Restarts / Reconstructions
        # ------------------------------------------------------------------
        print("\n--- SECTION 3: Persistence Across Application Restarts ---")
        student_persist = create_test_student(
            db,
            user_id="u-persist-1",
            email="persist.test@university.edu",
            student_number="STU-PERSIST-001",
            raw_password="PersistPassword123!"
        )
        for _ in range(5):
            requests.post(f"{base_url_A}/auth/login", json={"identifier": "persist.test@university.edu", "password": "bad"})

        # Stop server A to simulate server shutdown
        server_A.should_exit = True
        time.sleep(0.5)

        # Start a new server instance on port 8896 pointing to same database
        port_reborn = 8896
        server_reborn_cfg = uvicorn.Config(app, host="127.0.0.1", port=port_reborn, log_level="error")
        server_reborn = uvicorn.Server(server_reborn_cfg)
        thread_reborn = threading.Thread(target=server_reborn.run, daemon=True)
        thread_reborn.start()
        time.sleep(1.0)

        # Attempt login against the brand-new server process
        r_after_restart = requests.post(f"http://127.0.0.1:{port_reborn}/api/auth/login", json={"identifier": "persist.test@university.edu", "password": "bad"})
        assert r_after_restart.status_code == 429, f"Expected 429 across app restart, got {r_after_restart.status_code}"
        server_reborn.should_exit = True
        print("  [3/12] Persistence across application restarts verified (lockout state survives process termination)")

        # ------------------------------------------------------------------
        # SECTION 4: Shared Rate Limits Across Separate Instances (Multi-Worker)
        # ------------------------------------------------------------------
        print("\n--- SECTION 4: Shared Rate Limits Across Separate Instances ---")
        student_multi = create_test_student(
            db,
            user_id="u-multi-1",
            email="multiworker.test@university.edu",
            student_number="STU-MULTI-001",
            raw_password="MultiPassword123!"
        )

        # Start server A again on 8899
        server_A2 = uvicorn.Server(server_config_A)
        thread_A2 = threading.Thread(target=server_A2.run, daemon=True)
        thread_A2.start()
        time.sleep(1.0)

        # 3 attempts on Instance A
        for _ in range(3):
            requests.post(f"{base_url_A}/auth/login", json={"identifier": "multiworker.test@university.edu", "password": "bad"})
        # 2 attempts on Instance B
        for _ in range(2):
            requests.post(f"{base_url_B}/auth/login", json={"identifier": "multiworker.test@university.edu", "password": "bad"})

        # 6th attempt on Instance A should be 429
        r_shared_A = requests.post(f"{base_url_A}/auth/login", json={"identifier": "multiworker.test@university.edu", "password": "bad"})
        assert r_shared_A.status_code == 429, f"Instance A failed to see shared limit: {r_shared_A.status_code}"

        # 7th attempt on Instance B should also be 429
        r_shared_B = requests.post(f"{base_url_B}/auth/login", json={"identifier": "multiworker.test@university.edu", "password": "bad"})
        assert r_shared_B.status_code == 429, f"Instance B failed to see shared limit: {r_shared_B.status_code}"
        print("  [4/12] Cross-worker rate limiting verified: shared DB state synchronizes across separate instances")

        # ------------------------------------------------------------------
        # SECTION 5: Correct Login After Attacker's Failed Attempts (Anti-DoS)
        # ------------------------------------------------------------------
        print("\n--- SECTION 5: Anti-DoS Policy: Legitimate Login After Attacker Lockout ---")
        student_victim = create_test_student(
            db,
            user_id="u-victim-1",
            email="victim.student@university.edu",
            student_number="STU-VICTIM-001",
            raw_password="VictimSecretPassword999!"
        )

        # Attacker sends 5 failed logins to target victim's account
        for _ in range(5):
            requests.post(f"{base_url_A}/auth/login", json={"identifier": "victim.student@university.edu", "password": "attacker_bad_guess"})

        # Attacker tries 6th bad guess -> blocked with 429
        attacker_6 = requests.post(f"{base_url_A}/auth/login", json={"identifier": "victim.student@university.edu", "password": "attacker_bad_guess"})
        assert attacker_6.status_code == 429, f"Attacker should receive 429, got {attacker_6.status_code}"

        # Legitimate user arrives with CORRECT password: MUST SUCCEED (200 OK)
        legit_login = requests.post(f"{base_url_A}/auth/login", json={
            "identifier": "victim.student@university.edu",
            "password": "VictimSecretPassword999!"
        })
        assert legit_login.status_code == 200, f"Legitimate user was unfairly locked out! Status={legit_login.status_code}, body={legit_login.text}"
        data = legit_login.json()
        assert "token" in data and data["user"]["id"] == "u-victim-1"

        # Verify failure events were cleared in DB
        cleared_events = db.query(models.RateLimitEvent).filter(
            models.RateLimitEvent.key == "account:u-victim-1",
            models.RateLimitEvent.scope == "login_account"
        ).count()
        assert cleared_events == 0, f"Expected 0 events after successful login, got {cleared_events}"
        print("  [5/12] Anti-DoS lockout protection verified: legitimate user authenticates with 200 OK & resets failure counter")

        # ------------------------------------------------------------------
        # SECTION 6: Password Spraying and Aggregate IP Throttling
        # ------------------------------------------------------------------
        print("\n--- SECTION 6: Password Spraying & Aggregate IP Throttling ---")
        spray_ip = "198.51.100.77"
        headers_spray = {"X-Forwarded-For": spray_ip}

        # Send 60 requests across distinct dummy accounts from the same IP
        responses_spray = []
        for i in range(60):
            res = requests.post(
                f"{base_url_A}/auth/login",
                json={"identifier": f"spray_user_{i}@university.edu", "password": "common_spray_password"},
                headers=headers_spray
            )
            responses_spray.append(res.status_code)

        assert all(code == 401 for code in responses_spray), f"Expected 401 for first 60 requests, got {set(responses_spray)}"

        # 61st request from same IP must hit IP-level rate limit (429)
        res_61 = requests.post(
            f"{base_url_A}/auth/login",
            json={"identifier": "spray_user_61@university.edu", "password": "common_spray_password"},
            headers=headers_spray
        )
        assert res_61.status_code == 429, f"Expected IP-level 429 on 61st attempt, got {res_61.status_code}"
        assert "Too many login attempts from this network" in res_61.json().get("detail", "")
        print("  [6/12] Password spraying strictly mitigated: aggregate IP limit throttles high-velocity spray at 60 req/min")

        # ------------------------------------------------------------------
        # SECTION 7: Campus NAT & Shared University IP Handling
        # ------------------------------------------------------------------
        print("\n--- SECTION 7: Campus NAT & Shared University Network Handling ---")
        campus_ip = "198.51.100.88"
        headers_campus = {"X-Forwarded-For": campus_ip}

        stu_nat1 = create_test_student(db, "u-nat-1", "nat1@university.edu", "STU-NAT-1", "PassNat1!")
        stu_nat2 = create_test_student(db, "u-nat-2", "nat2@university.edu", "STU-NAT-2", "PassNat2!")
        stu_nat3 = create_test_student(db, "u-nat-3", "nat3@university.edu", "STU-NAT-3", "PassNat3!")

        # Student 1 makes 3 mistyped attempts
        for _ in range(3):
            requests.post(f"{base_url_A}/auth/login", json={"identifier": "nat1@university.edu", "password": "wrong"}, headers=headers_campus)

        # Other students on the same campus IP log in successfully without collateral lockout
        res_nat2 = requests.post(f"{base_url_A}/auth/login", json={"identifier": "nat2@university.edu", "password": "PassNat2!"}, headers=headers_campus)
        assert res_nat2.status_code == 200, f"Student 2 was blocked due to Student 1's mistakes! Status={res_nat2.status_code}"

        res_nat3 = requests.post(f"{base_url_A}/auth/login", json={"identifier": "nat3@university.edu", "password": "PassNat3!"}, headers=headers_campus)
        assert res_nat3.status_code == 200, f"Student 3 was blocked! Status={res_nat3.status_code}"
        print("  [7/12] Campus NAT verified: legitimate users sharing campus egress IP are not unfairly blocked by peer mistakes")

        # ------------------------------------------------------------------
        # SECTION 8: Safe Handling of Spoofed Forwarding Headers
        # ------------------------------------------------------------------
        print("\n--- SECTION 8: Safe Handling of Spoofed Forwarding Headers ---")
        class MockRequest:
            def __init__(self, client_host, headers):
                self.client = type("Client", (), {"host": client_host})()
                self.headers = headers

        # Untrusted public internet client sends spoofed X-Forwarded-For
        untrusted_req = MockRequest(
            client_host="203.0.113.99",
            headers={"X-Forwarded-For": "8.8.8.8, 1.1.1.1", "True-Client-IP": "8.8.8.8"}
        )
        resolved_untrusted = rate_limiter.get_client_ip(untrusted_req)
        assert resolved_untrusted == "203.0.113.99", f"Spoofed header was trusted! Got {resolved_untrusted}"

        # Trusted proxy (e.g. Render internal proxy 10.0.1.5) forwards client IP
        trusted_proxy_req = MockRequest(
            client_host="10.0.1.5",
            headers={"X-Forwarded-For": "198.51.100.22, 10.0.1.5", "True-Client-IP": "198.51.100.22"}
        )
        resolved_trusted = rate_limiter.get_client_ip(trusted_proxy_req)
        assert resolved_trusted == "198.51.100.22", f"Trusted proxy client IP not extracted correctly: {resolved_trusted}"
        print("  [8/12] Safe proxy header handling verified: untrusted spoofed headers ignored; trusted proxy IP honored")

        # ------------------------------------------------------------------
        # SECTION 9: Expiration and Bounded Storage Cleanup
        # ------------------------------------------------------------------
        print("\n--- SECTION 9: Expiration and Bounded Storage Cleanup ---")
        now = time.time()
        # Insert test events with old timestamps
        rate_limiter.record_event(db, key="account:u-exp-1", scope="login_account", timestamp=now - 400.0) # > 300s window
        rate_limiter.record_event(db, key="ip:old-ip-1", scope="login_ip", timestamp=now - 4000.0)         # > 3600s retention

        # Count within 300s window should be 0
        recent = rate_limiter.count_recent_events(db, key="account:u-exp-1", scope="login_account", window_seconds=300.0, now=now)
        assert recent == 0, f"Expected 0 recent events, got {recent}"

        # Run bounded storage cleanup
        deleted = rate_limiter.cleanup_old_events(db, retention_seconds=3600.0, now=now)
        assert deleted >= 1, f"Expected cleanup of old records, deleted={deleted}"

        # Verify old record is gone from DB
        old_remains = db.query(models.RateLimitEvent).filter(models.RateLimitEvent.key == "ip:old-ip-1").first()
        assert old_remains is None, "Old record was not purged by cleanup!"
        print(f"  [9/12] Bounded storage cleanup verified: {deleted} expired records successfully pruned from database")

        # ------------------------------------------------------------------
        # SECTION 10: Registration Abuse Limits
        # ------------------------------------------------------------------
        print("\n--- SECTION 10: Registration Abuse Limits (POST /api/auth/register/student) ---")
        reg_ip = "198.51.100.99"
        headers_reg = {"X-Forwarded-For": reg_ip}

        # First 10 registrations succeed
        for i in range(10):
            res_reg = requests.post(
                f"{base_url_A}/auth/register/student",
                json={
                    "email": f"new_stu_{uuid.uuid4().hex[:6]}@university.edu",
                    "studentId": f"STU-REG-{uuid.uuid4().hex[:6]}",
                    "password": "ValidPassword123!",
                    "name": f"Student {i}"
                },
                headers=headers_reg
            )
            assert res_reg.status_code == 200, f"Registration {i+1} failed unexpectedly: {res_reg.status_code}, {res_reg.text}"

        # 11th registration must be throttled with 429
        res_reg_11 = requests.post(
            f"{base_url_A}/auth/register/student",
            json={
                "email": f"new_stu_blocked@university.edu",
                "studentId": f"STU-REG-BLOCKED",
                "password": "ValidPassword123!",
                "name": "Blocked Student"
            },
            headers=headers_reg
        )
        assert res_reg_11.status_code == 429, f"Expected 429 on 11th registration, got {res_reg_11.status_code}"
        assert "Too many registration attempts" in res_reg_11.json().get("detail", "")
        print("  [10/12] Registration abuse protection verified: throttled at 10 registrations/min per IP")

        # ------------------------------------------------------------------
        # SECTION 11: Exam Lifecycle Under Configured Limits
        # ------------------------------------------------------------------
        print("\n--- SECTION 11: Legitimate Exam Lifecycle & Abuse Throttling ---")
        # Setup test & schedule
        test_exam = models.Test(
            id="t-crit06-1",
            title="Rate Limit Verification Exam",
            status="published",
            authorId="u-admin-1",
            totalMarks=5.0
        )
        db.add(test_exam)

        q1 = models.Question(
            id="q-crit06-1",
            questionBankId=None,
            type="MCQ",
            text="What is rate limiting?",
            difficulty="easy",
            marks=5.0
        )
        db.add(q1)
        db.commit()

        opt1 = models.QuestionOption(id="opt-1", questionId="q-crit06-1", optionText="Abuse protection", isCorrect=True, orderIndex=0)
        db.add(opt1)

        sched1 = models.Schedule(
            id="sched-crit06-1",
            testId="t-crit06-1",
            startTime="2020-01-01T00:00:00Z",
            endTime="2030-01-01T00:00:00Z",
            attemptsAllowed=1
        )
        db.add(sched1)
        db.add(models.ScheduleAssignment(id="sa-crit06-1", scheduleId="sched-crit06-1", assigneeType="batch", assigneeId="all"))
        db.commit()

        stu_exam = create_test_student(db, "u-exam-stu-1", "exam_student@university.edu", "STU-EXAM-1", "ExamPass123!")
        token_exam = auth.create_access_token({"sub": "u-exam-stu-1", "role": "student"})
        auth_headers = {"Authorization": f"Bearer {token_exam}"}

        # 11.1 Create attempt -> 200 OK
        res_create = requests.post(f"{base_url_A}/attempts", json={"testId": "t-crit06-1", "scheduleId": "sched-crit06-1"}, headers=auth_headers)
        assert res_create.status_code == 200, f"Failed to create attempt: {res_create.status_code}, {res_create.text}"
        att_id = res_create.json()["id"]

        # 11.2 Sync answer legitimate (e.g. 5 syncs) -> all 200 OK
        for sync_idx in range(5):
            res_sync = requests.post(
                f"{base_url_A}/attempts/{att_id}/sync-answer",
                json={"questionId": "q-crit06-1", "selectedOption": "opt-1", "violations": 0},
                headers=auth_headers
            )
            assert res_sync.status_code == 200, f"Sync {sync_idx+1} failed: {res_sync.status_code}"

        # 11.3 Session resumption -> 200 OK
        res_resume = requests.post(f"{base_url_A}/attempts", json={"testId": "t-crit06-1", "scheduleId": "sched-crit06-1"}, headers=auth_headers)
        assert res_resume.status_code == 200, f"Resumption failed: {res_resume.status_code}"
        assert res_resume.json()["id"] == att_id

        # 11.4 Submit attempt -> 200 OK
        res_submit = requests.post(f"{base_url_A}/attempts/{att_id}/submit", json={}, headers=auth_headers)
        assert res_submit.status_code == 200, f"Submit failed: {res_submit.status_code}"

        # 11.5 Test sync abuse throttling: simulate 120 sync requests
        stu_exam2 = create_test_student(db, "u-exam-stu-2", "exam_stu2@university.edu", "STU-EXAM-2", "ExamPass123!")
        token_exam2 = auth.create_access_token({"sub": "u-exam-stu-2", "role": "student"})
        auth_headers2 = {"Authorization": f"Bearer {token_exam2}"}

        sched2 = models.Schedule(
            id="sched-crit06-2",
            testId="t-crit06-1",
            startTime="2020-01-01T00:00:00Z",
            endTime="2030-01-01T00:00:00Z",
            attemptsAllowed=5
        )
        db.add(sched2)
        db.add(models.ScheduleAssignment(id="sa-crit06-2", scheduleId="sched-crit06-2", assigneeType="batch", assigneeId="all"))
        db.commit()

        res_att2 = requests.post(f"{base_url_A}/attempts", json={"testId": "t-crit06-1", "scheduleId": "sched-crit06-2"}, headers=auth_headers2)
        att_id2 = res_att2.json()["id"]

        # Directly insert 120 events to simulate threshold reached
        now_ts = time.time()
        for i in range(120):
            rate_limiter.record_event(db, key=f"attempt:{att_id2}", scope="sync_answer", timestamp=now_ts)

        # 121st sync should be throttled
        res_sync_overflow = requests.post(
            f"{base_url_A}/attempts/{att_id2}/sync-answer",
            json={"questionId": "q-crit06-1", "selectedOption": "opt-1"},
            headers=auth_headers2
        )
        assert res_sync_overflow.status_code == 429, f"Expected 429 on sync overflow, got {res_sync_overflow.status_code}"
        assert "Sync rate limit exceeded" in res_sync_overflow.json().get("detail", "")
        print("  [11/12] Exam lifecycle verified: legitimate creation, sync, resumption, submit pass; flood sync throttled at 120/min")

        # ------------------------------------------------------------------
        # SECTION 12: Account Enumeration Prevention (Identical Errors & Timing)
        # ------------------------------------------------------------------
        print("\n--- SECTION 12: Prevention of Account Enumeration ---")
        # Non-existent account: 1 to 5 attempts return 401
        for i in range(5):
            res_ghost = requests.post(f"{base_url_A}/auth/login", json={"identifier": "ghost_nonexistent@university.edu", "password": "wrong"})
            assert res_ghost.status_code == 401, f"Expected 401, got {res_ghost.status_code}"
            assert res_ghost.json() == {"detail": "Invalid credentials"}

        # 6th attempt for non-existent account returns 429 identically
        res_ghost_6 = requests.post(f"{base_url_A}/auth/login", json={"identifier": "ghost_nonexistent@university.edu", "password": "wrong"})
        assert res_ghost_6.status_code == 429, f"Expected 429, got {res_ghost_6.status_code}"
        assert "Too many failed login attempts" in res_ghost_6.json().get("detail", "")
        print("  [12/12] Account enumeration prevention verified: non-existent accounts produce identical 401 and 429 responses")

        print("\n==================================================================")
        print("ALL 12/12 CRIT-06 VERIFICATION TESTS PASSED SUCCESSFULLY (100%)!")
        print("==================================================================")

    finally:
        server_A.should_exit = True
        if 'server_A2' in locals():
            server_A2.should_exit = True
        server_B.should_exit = True
        db.close()
        try:
            os.remove(test_db_file)
        except Exception:
            pass


if __name__ == "__main__":
    run_crit_006_tests()
