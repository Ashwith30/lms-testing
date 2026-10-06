"""
Comprehensive test suite for validating Alembic migration on simulated legacy database,
partial column existence, full login/registration flows, studentNumber login, and health checks.
"""
import os
import sys
import sqlite3
import tempfile

# Setup import path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from alembic.config import Config
from alembic import command
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import models
from auth import verify_password, hash_password, create_access_token
from helpers import get_or_create_department, get_or_create_batch
from main import app

def test_migration_and_auth():
    print("================================================================")
    print("TEST SUITE: COMPREHENSIVE MIGRATION & AUTH LIFECYCLE AUDIT")
    print("================================================================")

    # -------------------------------------------------------------
    # SCENARIO 1: Pure legacy database with old schema
    # -------------------------------------------------------------
    print("\n--- SCENARIO 1: Pure Legacy Schema (with plaintext & bcrypt passwords) ---")
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path = tmp.name

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
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
    
    hashed_pwd = hash_password("secret_hashed_123")
    cur.execute("""
        INSERT INTO users (id, name, email, role, studentId, department, batch, password, createdAt)
        VALUES ('u-legacy-1', 'Hashed Admin', 'admin@legacy.com', 'admin', NULL, 'AdminDept', '2026', ?, '2026-01-01T00:00:00Z')
    """, (hashed_pwd,))
    
    cur.execute("""
        INSERT INTO users (id, name, email, role, studentId, department, batch, password, createdAt)
        VALUES ('u-legacy-2', 'Plain Student', 'student@legacy.com', 'student', 'STU-100', 'CSE', '2026', 'secret_plain_123', '2026-01-01T00:00:00Z')
    """)
    conn.commit()
    conn.close()

    alembic_cfg = Config(os.path.join(backend_dir, "alembic.ini"))
    alembic_cfg.set_main_option("sqlalchemy.url", f"sqlite:///{db_path}")
    alembic_cfg.set_main_option("script_location", os.path.join(backend_dir, "alembic"))
    
    command.upgrade(alembic_cfg, "head")
    print("  [PASSED] Alembic upgrade head executed.")

    # Check alembic_version table
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    ver = cur.execute("SELECT version_num FROM alembic_version").fetchone()
    assert ver and ver[0] == "0001_fix_users_password_hash", f"Expected version 0001_fix_users_password_hash, got {ver}"
    print(f"  [PASSED] alembic_version recorded: {ver[0]}")
    conn.close()

    # -------------------------------------------------------------
    # SCENARIO 2: Partial Schema (some columns already exist)
    # -------------------------------------------------------------
    print("\n--- SCENARIO 2: Partially Migrated Database ---")
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp2:
        db_path_partial = tmp2.name

    conn2 = sqlite3.connect(db_path_partial)
    cur2 = conn2.cursor()
    cur2.execute("""
        CREATE TABLE users (
            id VARCHAR PRIMARY KEY,
            name VARCHAR,
            email VARCHAR UNIQUE,
            role VARCHAR NOT NULL,
            status VARCHAR DEFAULT 'active',
            password VARCHAR,
            createdAt VARCHAR
        )
    """)
    cur2.execute("""
        INSERT INTO users (id, name, email, role, status, password, createdAt)
        VALUES ('u-part-1', 'Partial User', 'part@lms.com', 'trainer', 'active', 'trainer_pwd_123', '2026-01-01T00:00:00Z')
    """)
    conn2.commit()
    conn2.close()

    alembic_cfg_partial = Config(os.path.join(backend_dir, "alembic.ini"))
    alembic_cfg_partial.set_main_option("sqlalchemy.url", f"sqlite:///{db_path_partial}")
    alembic_cfg_partial.set_main_option("script_location", os.path.join(backend_dir, "alembic"))
    
    command.upgrade(alembic_cfg_partial, "head")
    
    conn2 = sqlite3.connect(db_path_partial)
    cur2 = conn2.cursor()
    cols_partial = [c[1] for c in cur2.execute("PRAGMA table_info(users)").fetchall()]
    assert "password_hash" in cols_partial and "status" in cols_partial and "lastLoginAt" in cols_partial
    migrated_row = cur2.execute("SELECT password_hash FROM users WHERE id='u-part-1'").fetchone()
    assert migrated_row[0] == "trainer_pwd_123"
    conn2.close()
    print("  [PASSED] Partial schema upgraded without conflict; legacy password backfilled.")

    # -------------------------------------------------------------
    # SCENARIO 3: Full End-to-End API Registration & Login Testing
    # -------------------------------------------------------------
    print("\n--- SCENARIO 3: Full Registration & Login Flows with Router Functions ---")
    from routers.auth_router import login, register_student, register_trainer
    from main import health_check
    
    # 1. Health check verification
    health_resp = health_check()
    assert health_resp.get("status") == "ok", f"Health check failed: {health_resp}"
    print(f"  [PASSED] /health endpoint returns {health_resp}")

    # Use the migrated session from database, and create any missing tables (same as startup create_all)
    migrated_engine = create_engine(f"sqlite:///{db_path}")
    models.Base.metadata.create_all(bind=migrated_engine)
    MigratedSession = sessionmaker(bind=migrated_engine)
    db = MigratedSession()

    # 2. Login with migrated bcrypt account (admin)
    res_admin = login({"identifier": "admin@legacy.com", "password": "secret_hashed_123"}, db=db)
    assert "token" in res_admin and res_admin["user"].role == "admin"
    admin_user = res_admin["user"]
    print("  [PASSED] Standard legacy admin login (bcrypt)")

    # 3. Login with migrated plaintext account (student)
    res_student_legacy = login({"identifier": "student@legacy.com", "password": "secret_plain_123"}, db=db)
    assert "token" in res_student_legacy and res_student_legacy["user"].role == "student"
    print("  [PASSED] Standard legacy student login (plaintext)")

    # 4. Register a new student via auth router
    student_payload = {
        "email": "teststudent_new@example.com",
        "name": "Alex Mercer",
        "studentId": "STU-2026-99",
        "password": "Password123!",
        "department": "Computer Science",
        "batch": "Class of 2026"
    }
    new_student = register_student(student_payload, db=db)
    assert new_student.email == "teststudent_new@example.com"
    print("  [PASSED] Student registration with profile relationship")

    # 5. Login using student email
    res_stu_email = login({"identifier": "teststudent_new@example.com", "password": "Password123!"}, db=db)
    assert "token" in res_stu_email and res_stu_email["user"].id == new_student.id
    print("  [PASSED] Student login via Email")

    # 6. Login using studentId (Student Number)
    res_stu_id = login({"identifier": "STU-2026-99", "password": "Password123!"}, db=db)
    assert "token" in res_stu_id and res_stu_id["user"].id == new_student.id
    print("  [PASSED] Student login via Student Number (studentId)")

    # 7. Register a new trainer (admin protected)
    trainer_payload = {
        "email": "trainer_new@example.com",
        "name": "Sarah Connor",
        "password": "Password123!"
    }
    new_trainer = register_trainer(trainer_payload, db=db, current_user=admin_user)
    assert new_trainer.email == "trainer_new@example.com"
    print("  [PASSED] Trainer registration by Admin")

    # 8. Login with trainer
    res_tr = login({"identifier": "trainer_new@example.com", "password": "Password123!"}, db=db)
    assert "token" in res_tr and res_tr["user"].id == new_trainer.id
    print("  [PASSED] Trainer login via Email")

    db.close()

    # Clean up test databases
    for p in (db_path, db_path_partial):
        if os.path.exists(p):
            os.remove(p)

    print("\n================================================================")
    print("ALL 3 SCENARIOS AND LIFECYCLE AUDITS PASSED CLEANLY (100% OK)")
    print("================================================================")

if __name__ == "__main__":
    test_migration_and_auth()


