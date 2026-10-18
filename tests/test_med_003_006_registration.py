"""
Automated Verification Test Suite for MED-03 and MED-06:
Registration Security: Password Policy Enforcement, Default Password Fallback Removal,
Client ID Rejection, and Exclusive Server-Side ID Generation.
"""
import os
import sys
import time
import uuid
import socket
import threading
import sqlite3
import requests
import uvicorn
from pydantic import ValidationError

# Setup backend import path
_curr_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(_curr_dir, "backend") if os.path.exists(os.path.join(_curr_dir, "backend")) else os.path.abspath(os.path.join(_curr_dir, "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import models
import schemas
from database import get_db, SessionLocal, engine
from main import app
from auth import create_access_token, hash_password, verify_password
from routers.auth_router import register_student, register_trainer

def find_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]

def run_tests():
    print("==================================================================")
    print("RUNNING COMPREHENSIVE MED-03 & MED-06 REGISTRATION SECURITY SUITE")
    print("==================================================================")

    # -------------------------------------------------------------
    # SECTION 1: Schema-Level Validation (Pydantic Models)
    # -------------------------------------------------------------
    print("\n--- SECTION 1: Pydantic Schema-Level Password & ID Enforcement ---")

    # 1.1 UserCreate requires non-empty password and rejects missing password
    try:
        schemas.UserCreate(email="user@test.com", role="student")
        assert False, "UserCreate should have rejected missing password"
    except ValidationError:
        print("  [1/24] UserCreate rejects missing password")

    # 1.2 UserCreate rejects empty password
    try:
        schemas.UserCreate(email="user@test.com", password="", role="student")
        assert False, "UserCreate should have rejected empty password"
    except ValidationError:
        print("  [2/24] UserCreate rejects empty password")

    # 1.3 UserCreate rejects whitespace-only password
    try:
        schemas.UserCreate(email="user@test.com", password="   ", role="student")
        assert False, "UserCreate should have rejected whitespace password"
    except ValidationError:
        print("  [3/24] UserCreate rejects whitespace-only password")

    # 1.4 UserCreate forbids extra client-supplied fields like 'id'
    try:
        schemas.UserCreate(id="custom-user-id", email="user@test.com", password="Password123!", role="student")
        assert False, "UserCreate should have forbidden client-supplied id"
    except ValidationError:
        print("  [4/24] UserCreate strictly forbids client-supplied 'id' field")

    # 1.5 StudentRegisterRequest requires non-empty password
    try:
        schemas.StudentRegisterRequest(email="stu@test.com")
        assert False, "StudentRegisterRequest should have rejected missing password"
    except ValidationError:
        print("  [5/24] StudentRegisterRequest rejects missing password")

    try:
        schemas.StudentRegisterRequest(email="stu@test.com", password="")
        assert False, "StudentRegisterRequest should have rejected empty password"
    except ValidationError:
        print("  [6/24] StudentRegisterRequest rejects empty password")

    try:
        schemas.StudentRegisterRequest(email="stu@test.com", password="   ")
        assert False, "StudentRegisterRequest should have rejected whitespace password"
    except ValidationError:
        print("  [7/24] StudentRegisterRequest rejects whitespace-only password")

    # 1.6 TrainerRegisterRequest requires non-empty password
    try:
        schemas.TrainerRegisterRequest(email="trainer@test.com")
        assert False, "TrainerRegisterRequest should have rejected missing password"
    except ValidationError:
        print("  [8/24] TrainerRegisterRequest rejects missing password")

    try:
        schemas.TrainerRegisterRequest(email="trainer@test.com", password="")
        assert False, "TrainerRegisterRequest should have rejected empty password"
    except ValidationError:
        print("  [9/24] TrainerRegisterRequest rejects empty password")

    try:
        schemas.TrainerRegisterRequest(email="trainer@test.com", password="   ")
        assert False, "TrainerRegisterRequest should have rejected whitespace password"
    except ValidationError:
        print("  [10/24] TrainerRegisterRequest rejects whitespace-only password")

    # -------------------------------------------------------------
    # SECTION 2: Live HTTP Server Tests
    # -------------------------------------------------------------
    port = find_free_port()
    base_url = f"http://127.0.0.1:{port}/api"

    config = uvicorn.Config(app, host="127.0.0.1", port=port, log_level="error")
    server = uvicorn.Server(config)
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()

    time.sleep(1.5)

    try:
        # Create an admin user in DB for trainer registration endpoint authorization
        db = SessionLocal()
        admin_email = f"admin_{uuid.uuid4().hex[:6]}@lms.com"
        admin_id = models.generate_uuid("u-admin-")
        admin_user = models.User(
            id=admin_id,
            email=admin_email,
            role="admin",
            password_hash=hash_password("AdminPass123!"),
            createdAt=models.get_utc_now()
        )
        db.add(admin_user)
        db.commit()
        db.close()

        admin_token = create_access_token({"sub": admin_id, "role": "admin"})
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        # -------------------------------------------------------------
        # Missing and Empty Passwords over HTTP (MED-03)
        # -------------------------------------------------------------
        print("\n--- SECTION 2: HTTP Missing & Empty Password Rejection (MED-03) ---")

        # 2.1 Student registration with missing password
        res_stu_missing = requests.post(f"{base_url}/auth/register/student", json={
            "email": f"stu_nopw_{uuid.uuid4().hex[:6]}@test.com",
            "name": "No Password Student"
        })
        assert res_stu_missing.status_code in (400, 422), f"Expected 400 or 422, got {res_stu_missing.status_code}"
        print("  [11/24] Student registration without password rejected (400/422)")

        # 2.2 Student registration with empty password
        res_stu_empty = requests.post(f"{base_url}/auth/register/student", json={
            "email": f"stu_emptypw_{uuid.uuid4().hex[:6]}@test.com",
            "name": "Empty Password Student",
            "password": ""
        })
        assert res_stu_empty.status_code in (400, 422), f"Expected 400 or 422, got {res_stu_empty.status_code}"
        print("  [12/24] Student registration with empty password rejected (400/422)")

        # 2.3 Trainer registration with missing password
        res_tr_missing = requests.post(f"{base_url}/auth/register/trainer", json={
            "email": f"tr_nopw_{uuid.uuid4().hex[:6]}@test.com",
            "name": "No Password Trainer"
        }, headers=admin_headers)
        assert res_tr_missing.status_code in (400, 422), f"Expected 400 or 422, got {res_tr_missing.status_code}"
        print("  [13/24] Trainer registration without password rejected (400/422)")

        # 2.4 Trainer registration with empty password
        res_tr_empty = requests.post(f"{base_url}/auth/register/trainer", json={
            "email": f"tr_emptypw_{uuid.uuid4().hex[:6]}@test.com",
            "name": "Empty Password Trainer",
            "password": ""
        }, headers=admin_headers)
        assert res_tr_empty.status_code in (400, 422), f"Expected 400 or 422, got {res_tr_empty.status_code}"
        print("  [14/24] Trainer registration with empty password rejected (400/422)")

        # -------------------------------------------------------------
        # Password Policy Enforcement on All Registration Paths (MED-03)
        # -------------------------------------------------------------
        print("\n--- SECTION 3: Password Policy Enforcement on Registration (MED-03) ---")

        # 3.1 Student registration with < 8 chars password
        res_short = requests.post(f"{base_url}/auth/register/student", json={
            "email": f"stu_short_{uuid.uuid4().hex[:6]}@test.com",
            "name": "Short Student",
            "password": "Pass1"
        })
        assert res_short.status_code == 400
        assert "8 characters" in res_short.json().get("detail", "")
        print("  [15/24] Student password < 8 chars rejected with HTTP 400")

        # 3.2 Student registration with no numbers
        res_no_num = requests.post(f"{base_url}/auth/register/student", json={
            "email": f"stu_nonum_{uuid.uuid4().hex[:6]}@test.com",
            "name": "No Num Student",
            "password": "PasswordOnlyLetters"
        })
        assert res_no_num.status_code == 400
        assert "number" in res_no_num.json().get("detail", "")
        print("  [16/24] Student password without digits rejected with HTTP 400")

        # 3.3 Trainer registration with no letters
        res_no_letters = requests.post(f"{base_url}/auth/register/trainer", json={
            "email": f"tr_nolet_{uuid.uuid4().hex[:6]}@test.com",
            "name": "No Letters Trainer",
            "password": "1234567890"
        }, headers=admin_headers)
        assert res_no_letters.status_code == 400
        assert "letter" in res_no_letters.json().get("detail", "")
        print("  [17/24] Trainer password without letters rejected with HTTP 400")

        # -------------------------------------------------------------
        # Client-Supplied User ID Rejection (MED-06)
        # -------------------------------------------------------------
        print("\n--- SECTION 4: Client-Supplied User ID Rejection (MED-06) ---")

        # 4.1 Student registration with client 'id'
        attacker_id = "u-admin-impersonated-999"
        res_stu_id = requests.post(f"{base_url}/auth/register/student", json={
            "id": attacker_id,
            "email": f"attacker_{uuid.uuid4().hex[:6]}@test.com",
            "password": "ValidPassword123!",
            "name": "Attacker Student"
        })
        assert res_stu_id.status_code == 400, f"Expected 400, got {res_stu_id.status_code}: {res_stu_id.text}"
        assert "Client-supplied user ID is not permitted" in res_stu_id.json().get("detail", "")
        print("  [18/24] Student registration with client 'id' rejected with HTTP 400")

        # 4.2 Student registration with client 'userId'
        res_stu_userid = requests.post(f"{base_url}/auth/register/student", json={
            "userId": attacker_id,
            "email": f"attacker2_{uuid.uuid4().hex[:6]}@test.com",
            "password": "ValidPassword123!",
            "name": "Attacker Student 2"
        })
        assert res_stu_userid.status_code == 400, f"Expected 400, got {res_stu_userid.status_code}: {res_stu_userid.text}"
        assert "Client-supplied user ID is not permitted" in res_stu_userid.json().get("detail", "")
        print("  [19/24] Student registration with client 'userId' rejected with HTTP 400")

        # 4.3 Trainer registration with client 'id'
        res_tr_id = requests.post(f"{base_url}/auth/register/trainer", json={
            "id": attacker_id,
            "email": f"attacker_tr_{uuid.uuid4().hex[:6]}@test.com",
            "password": "ValidPassword123!",
            "name": "Attacker Trainer"
        }, headers=admin_headers)
        assert res_tr_id.status_code == 400, f"Expected 400, got {res_tr_id.status_code}: {res_tr_id.text}"
        assert "Client-supplied user ID is not permitted" in res_tr_id.json().get("detail", "")
        print("  [20/24] Trainer registration with client 'id' rejected with HTTP 400")

        # -------------------------------------------------------------
        # Valid Registrations, Server-Generated IDs, and Bcrypt Hash
        # -------------------------------------------------------------
        print("\n--- SECTION 5: Legitimate Registration & Hash Verification ---")

        valid_stu_email = f"legit_stu_{uuid.uuid4().hex[:6]}@university.edu"
        valid_stu_id = f"STU-MED-{uuid.uuid4().hex[:6].upper()}"
        valid_password = "SecureStudentPass2026!"

        res_legit_stu = requests.post(f"{base_url}/auth/register/student", json={
            "email": valid_stu_email,
            "name": "Legit Student",
            "studentId": valid_stu_id,
            "department": "Computer Science",
            "batch": "Batch 2026",
            "password": valid_password
        })
        assert res_legit_stu.status_code == 200, f"Failed: {res_legit_stu.status_code}: {res_legit_stu.text}"
        stu_data = res_legit_stu.json()
        assert stu_data["id"].startswith("u-student-"), f"Expected u-student- prefix, got {stu_data['id']}"
        assert "password" not in stu_data and "password_hash" not in stu_data

        # Verify password in DB is a secure bcrypt hash
        db = SessionLocal()
        created_user = db.query(models.User).filter(models.User.email == valid_stu_email).first()
        assert created_user is not None
        assert created_user.password_hash.startswith(("$2b$", "$2a$", "$2y$"))
        assert len(created_user.password_hash) == 60
        assert verify_password(valid_password, created_user.password_hash)
        assert not verify_password("student123", created_user.password_hash)
        db.close()
        print("  [21/24] Legitimate student registered: server-generated ID and secure bcrypt hash verified")

        # Legitimate Trainer registration
        valid_tr_email = f"legit_tr_{uuid.uuid4().hex[:6]}@university.edu"
        valid_tr_password = "SecureTrainerPass2026!"
        res_legit_tr = requests.post(f"{base_url}/auth/register/trainer", json={
            "email": valid_tr_email,
            "name": "Legit Trainer",
            "password": valid_tr_password
        }, headers=admin_headers)
        assert res_legit_tr.status_code == 200, f"Failed: {res_legit_tr.status_code}: {res_legit_tr.text}"
        tr_data = res_legit_tr.json()
        assert tr_data["id"].startswith("u-trainer-")

        db = SessionLocal()
        created_tr = db.query(models.User).filter(models.User.email == valid_tr_email).first()
        assert created_tr is not None
        assert created_tr.password_hash.startswith(("$2b$", "$2a$", "$2y$"))
        assert verify_password(valid_tr_password, created_tr.password_hash)
        assert not verify_password("trainer123", created_tr.password_hash)
        db.close()
        print("  [22/24] Legitimate trainer registered: server-generated ID and secure bcrypt hash verified")

        # -------------------------------------------------------------
        # Duplicate Accounts (Email and Student ID)
        # -------------------------------------------------------------
        print("\n--- SECTION 6: Duplicate Account Rejection ---")

        # Duplicate email
        res_dup_email = requests.post(f"{base_url}/auth/register/student", json={
            "email": valid_stu_email.upper(),  # case-insensitive collision check
            "name": "Duplicate Student",
            "studentId": f"STU-{uuid.uuid4().hex[:6]}",
            "password": "ValidPassword123!"
        })
        assert res_dup_email.status_code == 400
        assert "already exists" in res_dup_email.json().get("detail", "")

        # Duplicate student ID
        res_dup_stuid = requests.post(f"{base_url}/auth/register/student", json={
            "email": f"different_email_{uuid.uuid4().hex[:6]}@test.com",
            "name": "Duplicate ID Student",
            "studentId": valid_stu_id,
            "password": "ValidPassword123!"
        })
        assert res_dup_stuid.status_code == 400
        assert "Student ID already exists" in res_dup_stuid.json().get("detail", "")
        print("  [23/24] Duplicate email (case-insensitive) and duplicate student number rejected (400)")

        # -------------------------------------------------------------
        # Subsequent Login Verification
        # -------------------------------------------------------------
        print("\n--- SECTION 7: Subsequent Login Verification ---")

        # Login with email
        res_login_email = requests.post(f"{base_url}/auth/login", json={
            "identifier": valid_stu_email,
            "password": valid_password
        })
        assert res_login_email.status_code == 200
        assert "token" in res_login_email.json()

        # Login with studentId (student number)
        res_login_stuid = requests.post(f"{base_url}/auth/login", json={
            "identifier": valid_stu_id,
            "password": valid_password
        })
        assert res_login_stuid.status_code == 200
        assert "token" in res_login_stuid.json()

        # Login with old default fallback password must fail
        res_login_fallback = requests.post(f"{base_url}/auth/login", json={
            "identifier": valid_stu_email,
            "password": "student123"
        })
        assert res_login_fallback.status_code == 401
        print("  [24/24] Subsequent logins succeed with valid credentials and reject default password fallbacks")

        print("\n==================================================================")
        print("ALL 24 MED-03 & MED-06 VERIFICATION CHECKS PASSED (100% SUCCESS)")
        print("==================================================================")

    finally:
        server.should_exit = True

if __name__ == "__main__":
    run_tests()
