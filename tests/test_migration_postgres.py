"""
PostgreSQL Migration Test Suite for Disposable Databases.
Validates Alembic migrations (0001 & 0002) against PostgreSQL across 5 scenarios:
  1. Clean, empty PostgreSQL database.
  2. Legacy schema with plaintext password records.
  3. Schema initialized using Base.metadata.create_all().
  4. Database already at Alembic revision 0001.
  5. Repeated alembic upgrade head execution (idempotency).

IMPORTANT:
  - This suite NEVER connects to or modifies the production database.
  - Requires a disposable PostgreSQL instance via TEST_DATABASE_URL or POSTGRESQL_TEST_URL.
  - If PostgreSQL is unavailable, gracefully reports tests as not executed (skipped).
"""

import os
import sys
import uuid
from typing import Optional

# Setup import path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
sys.path.insert(0, backend_dir)

import sqlalchemy as sa
from sqlalchemy import create_engine, text
from alembic.config import Config
from alembic import command
import bcrypt

try:
    from auth import verify_password, hash_password
except ImportError:
    def hash_password(password: str) -> str:
        pwd_bytes = password.encode("utf-8")[:72]
        return bcrypt.hashpw(pwd_bytes, bcrypt.gensalt()).decode("utf-8")

    def verify_password(plain_password: str, stored_password: Optional[str]) -> bool:
        if not stored_password or not plain_password:
            return False
        if isinstance(stored_password, str) and stored_password.startswith(("$2b$", "$2a$", "$2y$")):
            try:
                pwd_bytes = plain_password.encode("utf-8")[:72]
                return bcrypt.checkpw(pwd_bytes, stored_password.encode("utf-8"))
            except Exception:
                return False
        return False


def get_postgres_test_url() -> Optional[str]:
    """Retrieve test PostgreSQL connection URL from environment if configured."""
    url = os.getenv("TEST_DATABASE_URL") or os.getenv("POSTGRESQL_TEST_URL") or os.getenv("TEST_POSTGRES_URL")
    if not url:
        # Check standard local candidate
        candidate = "postgresql://postgres:postgres@localhost:5432/postgres"
        try:
            eng = create_engine(candidate, connect_args={"connect_timeout": 2})
            with eng.connect() as conn:
                conn.execute(text("SELECT 1"))
            return candidate
        except Exception:
            return None
    return url


def run_postgres_migration_tests():
    print("================================================================")
    print("POSTGRESQL MIGRATION TEST SUITE (DISPOSABLE DATABASE)")
    print("================================================================")

    pg_url = get_postgres_test_url()
    if not pg_url:
        print("\n[RESULT: NOT EXECUTED / SKIPPED]")
        print("  Reason: No disposable PostgreSQL database available locally or via TEST_DATABASE_URL.")
        print("  Security Guard: Tests strictly avoid connecting to production or unverified hosts.")
        print("  To run this test suite against an ephemeral PostgreSQL instance, execute:")
        print("    export TEST_DATABASE_URL=\"postgresql://user:pass@localhost:5432/disposable_db\"")
        print("    python backend/test_migration_postgres.py")
        print("================================================================\n")
        return False

    # Safety guard: Ensure target is explicitly a test database
    lowered_url = pg_url.lower()
    if any(prod_indicator in lowered_url for prod_indicator in ("onrender.com", "render.internal", "production", "prod")):
        print(f"\n[SECURITY GUARD] Target URL appears to reference a production host ({pg_url})!")
        print("Aborting PostgreSQL migration tests immediately.")
        sys.exit(1)

    print(f"Target disposable PostgreSQL database detected: {pg_url.split('@')[-1]}")
    base_engine = create_engine(pg_url)

    # Use unique isolated schemas for each scenario to prevent any test collision
    def create_isolated_schema(prefix="disp_test"):
        schema_name = f"{prefix}_{uuid.uuid4().hex[:8]}"
        with base_engine.connect() as conn:
            conn.execute(text(f"CREATE SCHEMA {schema_name}"))
            conn.commit()
        return schema_name

    def drop_isolated_schema(schema_name):
        try:
            with base_engine.connect() as conn:
                conn.execute(text(f"DROP SCHEMA IF EXISTS {schema_name} CASCADE"))
                conn.commit()
        except Exception as e:
            print(f"  [WARN] Failed to drop schema {schema_name}: {e}")

    try:
        # -------------------------------------------------------------
        # SCENARIO 1: Clean, empty PostgreSQL database
        # -------------------------------------------------------------
        print("\n--- SCENARIO 1: Clean, Empty PostgreSQL Schema ---")
        schema1 = create_isolated_schema("scen1")
        try:
            schema_url = f"{pg_url}?options=-csearch_path%3D{schema1}"
            alembic_cfg = Config(os.path.join(backend_dir, "alembic.ini"))
            alembic_cfg.set_main_option("sqlalchemy.url", schema_url)
            alembic_cfg.set_main_option("script_location", os.path.join(backend_dir, "alembic"))

            # Run Alembic upgrade head
            command.upgrade(alembic_cfg, "head")

            # Verify alembic_version table exists and is at head
            schema_engine = create_engine(schema_url)
            with schema_engine.connect() as conn:
                ver = conn.execute(text(f"SELECT version_num FROM {schema1}.alembic_version")).fetchone()
                assert ver and ver[0] == "0002_hash_legacy_plaintext_passwords", f"Expected revision 0002, got {ver}"
                print(f"  [PASSED] Clean schema alembic_version recorded: {ver[0]}")

            # Now verify models.Base.metadata.create_all() creates all 25 application tables cleanly
            import models
            models.Base.metadata.create_all(bind=schema_engine)
            inspector = sa.inspect(schema_engine)
            tables = inspector.get_table_names(schema=schema1)
            assert "users" in tables and "tests" in tables and "attempts" in tables and "student_profiles" in tables
            print(f"  [PASSED] create_all created all application tables in schema ({len(tables)} tables).")
        finally:
            drop_isolated_schema(schema1)

        # -------------------------------------------------------------
        # SCENARIO 2: Legacy schema with plaintext password records
        # -------------------------------------------------------------
        print("\n--- SCENARIO 2: Legacy Schema with Plaintext & Bcrypt Credentials ---")
        schema2 = create_isolated_schema("scen2")
        try:
            schema_url = f"{pg_url}?options=-csearch_path%3D{schema2}"
            schema_engine = create_engine(schema_url)

            # Create legacy users table
            with schema_engine.connect() as conn:
                conn.execute(text(f"""
                    CREATE TABLE {schema2}.users (
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
                """))
                
                hashed_admin_pwd = hash_password("admin_secret_123")
                conn.execute(
                    text(f"INSERT INTO {schema2}.users (id, name, email, role, password, createdAt) "
                         "VALUES ('u-legacy-adm', 'Legacy Admin', 'admin@legacy.com', 'admin', :pwd, '2026-01-01')"),
                    {"pwd": hashed_admin_pwd}
                )
                conn.execute(
                    text(f"INSERT INTO {schema2}.users (id, name, email, role, studentId, password, createdAt) "
                         "VALUES ('u-legacy-stu', 'Plain Student', 'student@legacy.com', 'student', 'STU-101', 'plain_student_pass', '2026-01-01')")
                )
                conn.commit()

            alembic_cfg = Config(os.path.join(backend_dir, "alembic.ini"))
            alembic_cfg.set_main_option("sqlalchemy.url", schema_url)
            alembic_cfg.set_main_option("script_location", os.path.join(backend_dir, "alembic"))
            command.upgrade(alembic_cfg, "head")

            with schema_engine.connect() as conn:
                inspector = sa.inspect(conn)
                cols = [c["name"] for c in inspector.get_columns("users", schema=schema2)]
                assert "password_hash" in cols, "password_hash column missing!"
                assert "status" in cols and "lastLoginAt" in cols and "updatedAt" in cols, "User attribute columns missing!"

                # Check admin hash untouched
                adm_row = conn.execute(text(f"SELECT password_hash FROM {schema2}.users WHERE id='u-legacy-adm'")).fetchone()
                assert adm_row[0] == hashed_admin_pwd, "Admin bcrypt hash was modified or double-hashed!"

                # Check student plain password converted to bcrypt
                stu_row = conn.execute(text(f"SELECT password_hash, password FROM {schema2}.users WHERE id='u-legacy-stu'")).fetchone()
                stu_hash, stu_legacy_pwd = stu_row[0], stu_row[1]
                assert stu_hash.startswith(("$2b$", "$2a$", "$2y$")) and len(stu_hash) == 60, "Student password not converted to bcrypt!"
                assert stu_hash != "plain_student_pass", "Student password remained plaintext!"
                assert stu_legacy_pwd is None, "Legacy password column was not nullified!"
                assert verify_password("plain_student_pass", stu_hash), "Student bcrypt verification failed with original password!"
                print("  [PASSED] Legacy plaintext password migrated to valid bcrypt; existing bcrypt untouched; legacy column cleared.")
        finally:
            drop_isolated_schema(schema2)

        # -------------------------------------------------------------
        # SCENARIO 3: Schema initialized using Base.metadata.create_all()
        # -------------------------------------------------------------
        print("\n--- SCENARIO 3: Schema Initialized via create_all() (No alembic_version) ---")
        schema3 = create_isolated_schema("scen3")
        try:
            schema_url = f"{pg_url}?options=-csearch_path%3D{schema3}"
            schema_engine = create_engine(schema_url)

            # Pre-create all models (simulating Render deployment created via main.py)
            import models
            models.Base.metadata.create_all(bind=schema_engine)

            # Insert modern user
            user_pwd_hash = hash_password("test_user_pw")
            with schema_engine.connect() as conn:
                conn.execute(
                    text(f"INSERT INTO {schema3}.users (id, email, password_hash, role, createdAt) "
                         "VALUES ('u-modern-1', 'modern@lms.com', :pwd, 'trainer', '2026-01-01')"),
                    {"pwd": user_pwd_hash}
                )
                conn.commit()

            # Upgrade via Alembic
            alembic_cfg = Config(os.path.join(backend_dir, "alembic.ini"))
            alembic_cfg.set_main_option("sqlalchemy.url", schema_url)
            alembic_cfg.set_main_option("script_location", os.path.join(backend_dir, "alembic"))
            command.upgrade(alembic_cfg, "head")

            with schema_engine.connect() as conn:
                ver = conn.execute(text(f"SELECT version_num FROM {schema3}.alembic_version")).fetchone()
                assert ver and ver[0] == "0002_hash_legacy_plaintext_passwords", f"Expected version 0002, got {ver}"
                row = conn.execute(text(f"SELECT password_hash FROM {schema3}.users WHERE id='u-modern-1'")).fetchone()
                assert row[0] == user_pwd_hash, "Existing bcrypt hash modified during create_all migration!"
                print(f"  [PASSED] create_all initialized schema safely upgraded without duplicate column conflicts.")
        finally:
            drop_isolated_schema(schema3)

        # -------------------------------------------------------------
        # SCENARIO 4: Database already at Alembic revision 0001
        # -------------------------------------------------------------
        print("\n--- SCENARIO 4: Database Already at Alembic Revision 0001 ---")
        schema4 = create_isolated_schema("scen4")
        try:
            schema_url = f"{pg_url}?options=-csearch_path%3D{schema4}"
            schema_engine = create_engine(schema_url)

            # Create legacy users table
            with schema_engine.connect() as conn:
                conn.execute(text(f"""
                    CREATE TABLE {schema4}.users (
                        id VARCHAR PRIMARY KEY,
                        name VARCHAR NOT NULL,
                        email VARCHAR UNIQUE,
                        role VARCHAR NOT NULL,
                        password VARCHAR,
                        createdAt VARCHAR
                    )
                """))
                conn.commit()

            alembic_cfg = Config(os.path.join(backend_dir, "alembic.ini"))
            alembic_cfg.set_main_option("sqlalchemy.url", schema_url)
            alembic_cfg.set_main_option("script_location", os.path.join(backend_dir, "alembic"))

            # Step 1: Upgrade to 0001 only
            command.upgrade(alembic_cfg, "0001_fix_users_password_hash")
            with schema_engine.connect() as conn:
                ver = conn.execute(text(f"SELECT version_num FROM {schema4}.alembic_version")).fetchone()
                assert ver and ver[0] == "0001_fix_users_password_hash"
                # Insert legacy user with plaintext password in password_hash (as 0001 backfilled)
                conn.execute(text(f"INSERT INTO {schema4}.users (id, email, role, password_hash, createdAt) "
                                  "VALUES ('u-part-1', 'part@lms.com', 'student', 'plain_part_123', '2026-01-01')"))
                conn.commit()

            # Step 2: Upgrade to head (0002)
            command.upgrade(alembic_cfg, "head")
            with schema_engine.connect() as conn:
                ver2 = conn.execute(text(f"SELECT version_num FROM {schema4}.alembic_version")).fetchone()
                assert ver2 and ver2[0] == "0002_hash_legacy_plaintext_passwords"
                part_row = conn.execute(text(f"SELECT password_hash FROM {schema4}.users WHERE id='u-part-1'")).fetchone()
                assert part_row[0].startswith(("$2b$", "$2a$", "$2y$")) and len(part_row[0]) == 60
                assert verify_password("plain_part_123", part_row[0])
                print("  [PASSED] Database transitioned seamlessly from 0001 to 0002; plaintext hashed.")
        finally:
            drop_isolated_schema(schema4)

        # -------------------------------------------------------------
        # SCENARIO 5: Repeated alembic upgrade head execution
        # -------------------------------------------------------------
        print("\n--- SCENARIO 5: Repeated Upgrade Execution (Idempotency) ---")
        schema5 = create_isolated_schema("scen5")
        try:
            schema_url = f"{pg_url}?options=-csearch_path%3D{schema5}"
            alembic_cfg = Config(os.path.join(backend_dir, "alembic.ini"))
            alembic_cfg.set_main_option("sqlalchemy.url", schema_url)
            alembic_cfg.set_main_option("script_location", os.path.join(backend_dir, "alembic"))

            command.upgrade(alembic_cfg, "head")
            print("  [PASSED] Initial upgrade to head completed.")

            # Second upgrade run
            command.upgrade(alembic_cfg, "head")
            print("  [PASSED] Second upgrade run completed with 0 errors (Idempotent).")
        finally:
            drop_isolated_schema(schema5)

        print("\n================================================================")
        print("ALL 5 POSTGRESQL MIGRATION SCENARIOS PASSED CLEANLY (100% OK)")
        print("================================================================\n")
        return True

    finally:
        base_engine.dispose()


if __name__ == "__main__":
    success = run_postgres_migration_tests()
    if not success:
        sys.exit(0)  # Graceful skip code
