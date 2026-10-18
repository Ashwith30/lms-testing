"""
Comprehensive Automated Verification Test Suite for SEC-002:
1. Strict Cryptographic Verification in verify_password() (No Plaintext Fallback)
2. Safe Legacy Account Migration (Alembic 0002)
3. Zero Account Lockout for Migrated Accounts
4. Prevention of Double-Hashing (Idempotency)
5. Safe Failure Modes for Malformed / Missing / Unsupported Hashes
6. End-to-End Role Authentication (Admin, Trainer, Institution, Student)
7. Eradication of Plaintext Storage
"""
import os
import sys
import tempfile
import sqlite3
import re
import bcrypt

# Setup backend import path
_curr_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(_curr_dir, "backend") if os.path.exists(os.path.join(_curr_dir, "backend")) else os.path.abspath(os.path.join(_curr_dir, "..", "backend"))
sys.path.insert(0, backend_dir)

from alembic.config import Config
from alembic import command
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import models
from auth import verify_password, hash_password, create_access_token
import threading
import time
import requests
import uvicorn
from main import app


def run_sec_002_tests():
    print("==================================================================")
    print("RUNNING COMPREHENSIVE SECURITY & MIGRATION TEST SUITE: SEC-002")
    print("==================================================================")

    # ==============================================================================
    # PART 1: Unit Verification of verify_password()
    # ==============================================================================
    print("\n--- PART 1: Cryptographic Password Verification Enforcement ---")

    # 1. Valid $2b$ bcrypt hash
    salt_2b = bcrypt.gensalt(prefix=b"2b", rounds=10)
    hash_2b = bcrypt.hashpw(b"CorrectPassword123!", salt_2b).decode("utf-8")
    assert verify_password("CorrectPassword123!", hash_2b) is True
    assert verify_password("WrongPassword!", hash_2b) is False
    print("  [PASSED] Valid $2b$ hash correctly verified and rejected")

    # 2. Valid $2a$ bcrypt hash (legacy compatible)
    salt_2a = bcrypt.gensalt(prefix=b"2a", rounds=10)
    hash_2a = bcrypt.hashpw(b"Legacy2aPassword123!", salt_2a).decode("utf-8")
    assert verify_password("Legacy2aPassword123!", hash_2a) is True
    assert verify_password("WrongPassword!", hash_2a) is False
    print("  [PASSED] Valid $2a$ hash correctly verified and rejected")

    # 3. Valid $2y$ bcrypt hash (PHP / crypt compatible)
    # Generate $2b$ and replace prefix with $2y$ to simulate $2y$ hash
    hash_2y = "$2y$" + hash_2b[4:]
    assert verify_password("CorrectPassword123!", hash_2y) is True
    assert verify_password("WrongPassword!", hash_2y) is False
    print("  [PASSED] Valid $2y$ hash correctly verified and rejected")

    # 4. Strict rejection of plaintext comparison fallback
    plaintext_stored = "plainPassword123!"
    assert verify_password("plainPassword123!", plaintext_stored) is False
    assert verify_password("wrong", plaintext_stored) is False
    print("  [PASSED] Plaintext stored password strictly rejected (zero fallback)")

    # 5. Missing / None / Empty password handling
    assert verify_password("", hash_2b) is False
    assert verify_password("password", "") is False
    assert verify_password("password", None) is False
    assert verify_password("", "") is False
    assert verify_password("", None) is False
    print("  [PASSED] Missing, None, and empty passwords safely return False")

    # 6. Malformed and corrupted hashes fail safely without unhandled exceptions
    assert verify_password("test", "$2b$") is False
    assert verify_password("test", "$2b$invalid_short_hash") is False
    assert verify_password("test", "$2b$99$invalidroundsformatcharacterslength...") is False
    assert verify_password("test", "$2b$12$?????????????????????????????????????????????????????") is False
    print("  [PASSED] Malformed and corrupted hashes fail safely")

    # 7. Unsupported hash algorithms fail safely
    assert verify_password("test", "$1$md5hashformat") is False
    assert verify_password("test", "$5$sha256hashformat") is False
    assert verify_password("test", "$6$sha512hashformat") is False
    assert verify_password("test", "pbkdf2:sha256:260000$salt$hash") is False
    print("  [PASSED] Unsupported hash algorithms safely rejected")

    # ==============================================================================
    # PART 2: Safe Alembic Migration & Non-Destructive Data Upgrade
    # ==============================================================================
    print("\n--- PART 2: Safe Alembic Migration (0002) Verification ---")

    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path = tmp.name

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    # Create legacy schema table
    cur.execute("""
        CREATE TABLE users (
            id VARCHAR PRIMARY KEY,
            name VARCHAR NOT NULL,
            email VARCHAR UNIQUE,
            role VARCHAR NOT NULL,
            studentId VARCHAR UNIQUE,
            department VARCHAR,
            batch VARCHAR,
            password VARCHAR,
            createdAt VARCHAR
        )
    """)

    # Seed User A: already hashed with bcrypt
    existing_bcrypt_admin = hash_password("AdminSecurePassword123!")
    cur.execute("""
        INSERT INTO users (id, name, email, role, studentId, department, batch, password, createdAt)
        VALUES ('u-mig-admin', 'Admin User', 'admin_mig@lms.com', 'admin', NULL, 'IT', 'Staff', ?, '2026-01-01T00:00:00Z')
    """, (existing_bcrypt_admin,))

    # Seed User B: legacy plaintext student password in 'password'
    cur.execute("""
        INSERT INTO users (id, name, email, role, studentId, department, batch, password, createdAt)
        VALUES ('u-mig-stu1', 'Plain Student', 'student_mig1@lms.com', 'student', 'STU-MIG-01', 'CS', '2026', 'plainStudentPassword1!', '2026-01-01T00:00:00Z')
    """)

    # Seed User C: legacy plaintext trainer password in 'password'
    cur.execute("""
        INSERT INTO users (id, name, email, role, studentId, department, batch, password, createdAt)
        VALUES ('u-mig-tr1', 'Plain Trainer', 'trainer_mig1@lms.com', 'trainer', NULL, 'CS', 'Staff', 'plainTrainerPassword2!', '2026-01-01T00:00:00Z')
    """)

    conn.commit()
    conn.close()

    # Run Alembic upgrade head
    alembic_cfg = Config(os.path.join(backend_dir, "alembic.ini"))
    alembic_cfg.set_main_option("sqlalchemy.url", f"sqlite:///{db_path}")
    alembic_cfg.set_main_option("script_location", os.path.join(backend_dir, "alembic"))

    command.upgrade(alembic_cfg, "head")

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # 1. Verify revision is 0002_hash_legacy_plaintext_passwords or later
    ver = cur.execute("SELECT version_num FROM alembic_version").fetchone()
    assert ver and ver[0] in ("0002_hash_legacy_plaintext_passwords", "0003_add_rate_limit_events"), f"Expected version 0002 or later, got {ver}"
    print(f"  [PASSED] Alembic migrated successfully to {ver[0]}")

    # 2. Verify User A (already bcrypt) was NOT double-hashed
    admin_row = cur.execute("SELECT password_hash FROM users WHERE id='u-mig-admin'").fetchone()
    assert admin_row[0] == existing_bcrypt_admin, "Existing bcrypt hash was altered or double-hashed!"
    print("  [PASSED] Existing bcrypt hashes were preserved and NOT double-hashed")

    # 3. Verify User B and C have valid bcrypt hashes
    stu_row = cur.execute("SELECT password_hash FROM users WHERE id='u-mig-stu1'").fetchone()
    stu_hash = stu_row[0]
    assert stu_hash.startswith(("$2b$", "$2a$", "$2y$")) and len(stu_hash) == 60, f"Invalid hash: {stu_hash}"
    assert stu_hash != "plainStudentPassword1!", "Student password was not hashed!"

    tr_row = cur.execute("SELECT password_hash FROM users WHERE id='u-mig-tr1'").fetchone()
    tr_hash = tr_row[0]
    assert tr_hash.startswith(("$2b$", "$2a$", "$2y$")) and len(tr_hash) == 60, f"Invalid hash: {tr_hash}"
    assert tr_hash != "plainTrainerPassword2!", "Trainer password was not hashed!"
    print("  [PASSED] Legacy plaintext passwords converted to valid bcrypt hashes")

    # 4. Verify legacy 'password' column was purged
    cols = [c[1] for c in cur.execute("PRAGMA table_info(users)").fetchall()]
    if "password" in cols:
        plain_values = cur.execute("SELECT password FROM users WHERE password IS NOT NULL").fetchall()
        assert len(plain_values) == 0, f"Plaintext column still contains values: {plain_values}"
        print("  [PASSED] Plaintext credentials purged from legacy password column")

    conn.close()

    # 5. Verify migration idempotency (safe to rerun)
    command.upgrade(alembic_cfg, "head")
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    stu_row_after = cur.execute("SELECT password_hash FROM users WHERE id='u-mig-stu1'").fetchone()
    assert stu_row_after[0] == stu_hash, "Migration is not idempotent: rerun altered hashes!"
    conn.close()
    print("  [PASSED] Migration idempotency verified (rerun does not alter existing hashes)")

    # ==============================================================================
    # PART 3: End-to-End API Authentication for Migrated Accounts
    # ==============================================================================
    print("\n--- PART 3: End-to-End API Authentication for Migrated Accounts ---")

    migrated_engine = create_engine(f"sqlite:///{db_path}")
    models.Base.metadata.create_all(bind=migrated_engine)
    Session = sessionmaker(bind=migrated_engine)

    from database import get_db
    def override_get_db():
        s = Session()
        try:
            yield s
        finally:
            s.close()

    app.dependency_overrides[get_db] = override_get_db

    # Start local test server
    port = 8796
    server_config = uvicorn.Config(app, host="127.0.0.1", port=port, log_level="error")
    server = uvicorn.Server(server_config)
    server_thread = threading.Thread(target=server.run, daemon=True)
    server_thread.start()
    time.sleep(1.2)
    base_url = f"http://127.0.0.1:{port}/api"

    try:
        # 1. Admin login with existing bcrypt password
        res_admin = requests.post(f"{base_url}/auth/login", json={"identifier": "admin_mig@lms.com", "password": "AdminSecurePassword123!"})
        assert res_admin.status_code == 200, f"Admin login failed: {res_admin.text}"
        assert "token" in res_admin.json()
        assert res_admin.json()["user"]["role"] == "admin"
        print("  [PASSED] Migrated admin authenticated successfully with original password")

        # 2. Migrated Student login with original password
        res_stu = requests.post(f"{base_url}/auth/login", json={"identifier": "student_mig1@lms.com", "password": "plainStudentPassword1!"})
        assert res_stu.status_code == 200, f"Student login failed: {res_stu.text}"
        assert "token" in res_stu.json()
        assert res_stu.json()["user"]["role"] == "student"
        print("  [PASSED] Migrated student authenticated successfully with original password")

        # 3. Migrated Student login via studentNumber
        # First ensure StudentProfile exists for studentNumber lookup
        db_test = Session()
        prof = db_test.query(models.StudentProfile).filter(models.StudentProfile.userId == "u-mig-stu1").first()
        if not prof:
            prof = models.StudentProfile(
                userId="u-mig-stu1",
                firstName="Plain",
                lastName="Student",
                studentNumber="STU-MIG-01"
            )
            db_test.add(prof)
            db_test.commit()
        db_test.close()

        res_stu_num = requests.post(f"{base_url}/auth/login", json={"identifier": "STU-MIG-01", "password": "plainStudentPassword1!"})
        assert res_stu_num.status_code == 200, f"StudentNumber login failed: {res_stu_num.text}"
        assert "token" in res_stu_num.json()
        print("  [PASSED] Migrated student authenticated successfully using studentNumber")

        # 4. Migrated Trainer login with original password
        res_tr = requests.post(f"{base_url}/auth/login", json={"identifier": "trainer_mig1@lms.com", "password": "plainTrainerPassword2!"})
        assert res_tr.status_code == 200, f"Trainer login failed: {res_tr.text}"
        assert "token" in res_tr.json()
        assert res_tr.json()["user"]["role"] == "trainer"
        print("  [PASSED] Migrated trainer authenticated successfully with original password")

        # 5. Incorrect password strictly rejected (HTTP 401)
        res_bad = requests.post(f"{base_url}/auth/login", json={"identifier": "student_mig1@lms.com", "password": "IncorrectPassword123!"})
        assert res_bad.status_code == 401, f"Expected 401, got {res_bad.status_code}"
        print("  [PASSED] Incorrect password rejected with HTTP 401 Unauthorized")

        # 6. Attacker trying to supply the raw bcrypt hash as password strictly rejected
        res_hash_attack = requests.post(f"{base_url}/auth/login", json={"identifier": "student_mig1@lms.com", "password": stu_hash})
        assert res_hash_attack.status_code == 401
        print("  [PASSED] Submitting raw bcrypt hash as password strictly rejected (401)")

        # 7. Non-existent identifier rejected (HTTP 401)
        res_no_user = requests.post(f"{base_url}/auth/login", json={"identifier": "nobody@lms.com", "password": "AnyPassword123!"})
        assert res_no_user.status_code == 401
        print("  [PASSED] Non-existent identifier rejected with HTTP 401 Unauthorized")

        # 8. Check rate limiting (5 bad attempts -> 429)
        test_ident = "rate_limit_test@lms.com"
        for _ in range(5):
            requests.post(f"{base_url}/auth/login", json={"identifier": test_ident, "password": "bad"})
        res_rate = requests.post(f"{base_url}/auth/login", json={"identifier": test_ident, "password": "bad"})
        assert res_rate.status_code == 429, f"Expected 429, got {res_rate.status_code}"
        print("  [PASSED] Login rate limiting (HTTP 429 after 5 failed attempts) remains active")

    finally:
        server.should_exit = True
        try:
            os.remove(db_path)
        except Exception:
            pass

    print("\n==================================================================")
    print("ALL SEC-002 SECURITY & MIGRATION TESTS PASSED PERFECTLY (100%)!")
    print("==================================================================")


if __name__ == "__main__":
    run_sec_002_tests()
