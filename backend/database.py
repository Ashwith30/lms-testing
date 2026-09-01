import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

# Load .env from the backend directory
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./lms.db")

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
    # Ensure SSL is enabled for remote cloud Postgres (Neon, Supabase, AWS, etc.)
    is_remote = not any(h in DATABASE_URL for h in ("localhost", "127.0.0.1", "0.0.0.0"))
    if is_remote and "sslmode" not in DATABASE_URL:
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
