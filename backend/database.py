import os
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

# Enforce SQLite foreign keys on all connections (LOW-02)
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if type(dbapi_connection).__module__.startswith("sqlite3"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

# Load .env from the backend directory
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./lms.db")

# Canonicalize relative SQLite database URLs to the backend directory to prevent duplicate root databases
if DATABASE_URL.startswith("sqlite:///") and not DATABASE_URL.startswith("sqlite:////"):
    db_relative_path = DATABASE_URL.replace("sqlite:///", "", 1)
    if not os.path.isabs(db_relative_path):
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        DATABASE_URL = f"sqlite:///{os.path.normpath(os.path.join(backend_dir, db_relative_path))}"

# Neon & Supabase often provide URLs starting with postgres:// instead of postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
    db_type = "SQLite"
else:
    connect_args = {}
    # Ensure SSL is enabled for external remote cloud Postgres (Neon, Supabase, etc.)
    # Note: Render internal PostgreSQL hosts (dpg-*) connect over internal private network
    is_internal = any(h in DATABASE_URL for h in ("localhost", "127.0.0.1", "0.0.0.0", "dpg-", ".render.internal", ".internal"))
    if not is_internal and "sslmode" not in DATABASE_URL and ("neon.tech" in DATABASE_URL or "supabase" in DATABASE_URL or "aws" in DATABASE_URL):
        connect_args["sslmode"] = "require"

    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=300,
        pool_size=10,
        max_overflow=20,
        connect_args=connect_args
    )
    db_type = "PostgreSQL"

print(f"[Database] Engine initialized successfully ({db_type}).")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
