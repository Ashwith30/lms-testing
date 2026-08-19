"""
Database initialization and reset script.
Run from backend/ directory: python init_db.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import engine, SessionLocal, Base
import models
from auth import hash_password
import datetime

def reset_and_seed():
    print("Resetting database tables and removing mock data...")
    # Drop all existing tables to ensure a clean slate
    models.Base.metadata.drop_all(bind=engine)
    models.Base.metadata.create_all(bind=engine)
    print("Database schema created cleanly.")

    db = SessionLocal()
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    print("Seeding standard baseline authenticated accounts with secure bcrypt hashing...")

    baseline_users = [
        models.User(
            id="u-admin-1",
            name="System Administrator",
            email="admin@lms.com",
            role="admin",
            password=hash_password("admin123"),
            department="Administration",
            createdAt=now
        ),
        models.User(
            id="u-inst-1",
            name="Apex Engineering Institute",
            email="institution@lms.com",
            role="institution",
            password=hash_password("institution123"),
            department="Institutional Oversight",
            createdAt=now
        ),
        models.User(
            id="u-trainer-1",
            name="Admin Trainer",
            email="trainer@lms.com",
            role="trainer",
            password=hash_password("trainer123"),
            department="Computer Science",
            createdAt=now
        ),
        models.User(
            id="u-student-1",
            name="Ashwith",
            email="ashwith@example.com",
            role="student",
            studentId="LMS001",
            department="CSE",
            batch="2026",
            password=hash_password("student123"),
            createdAt=now
        ),
        models.User(
            id="u-student-2",
            name="Student User",
            email="student@lms.com",
            role="student",
            studentId="LMS002",
            department="CSE",
            batch="2026",
            password=hash_password("student123"),
            createdAt=now
        )
    ]

    for user in baseline_users:
        db.add(user)

    db.commit()
    db.close()
    print("Reset complete! Clean database initialized with baseline accounts:")
    print("  - Admin:        admin@lms.com / admin123")
    print("  - Institution:  institution@lms.com / institution123")
    print("  - Trainer:      trainer@lms.com / trainer123")
    print("  - Student:      ashwith@example.com / student123 (ID: LMS001)")
    print("  - Student Alt:  student@lms.com / student123 (ID: LMS002)")

if __name__ == "__main__":
    reset_and_seed()
