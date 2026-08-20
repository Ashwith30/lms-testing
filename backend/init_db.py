"""
Database initialization and reset script.
Run from backend/ directory: python init_db.py
"""
import sys
import os
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import engine, SessionLocal, Base
import models
from auth import hash_password

def reset_and_seed():
    print("Resetting database tables and removing mock data...")
    # Drop all existing tables to ensure a clean slate
    models.Base.metadata.drop_all(bind=engine)
    models.Base.metadata.create_all(bind=engine)
    print("Database schema created cleanly.")

    db = SessionLocal()
    now = models.get_utc_now()

    print("Seeding standard baseline authenticated accounts with secure bcrypt hashing...")

    # Create baseline users
    admin_user = models.User(
        id="u-admin-1",
        email="admin@lms.com",
        role="admin",
        password_hash=hash_password("admin123"),
        createdAt=now
    )
    
    inst_user = models.User(
        id="u-inst-1",
        email="institution@lms.com",
        role="institution",
        password_hash=hash_password("institution123"),
        createdAt=now
    )
    
    trainer_user = models.User(
        id="u-trainer-1",
        email="trainer@lms.com",
        role="trainer",
        password_hash=hash_password("trainer123"),
        createdAt=now
    )
    
    student_user_1 = models.User(
        id="u-student-1",
        email="ashwith@example.com",
        role="student",
        password_hash=hash_password("student123"),
        createdAt=now
    )
    
    student_user_2 = models.User(
        id="u-student-2",
        email="student@lms.com",
        role="student",
        password_hash=hash_password("student123"),
        createdAt=now
    )

    db.add_all([admin_user, inst_user, trainer_user, student_user_1, student_user_2])
    db.commit()

    # Seed Organization Structure
    print("Seeding organization structure (Departments, Batches)...")
    
    inst_profile = models.InstitutionProfile(
        userId="u-inst-1",
        institutionName="Apex Engineering Institute",
        contactPersonName="John Doe",
        supportEmail="support@apex.edu"
    )
    
    dept_cse = models.Department(
        id="dept-cse-1",
        institutionId="u-inst-1",
        name="Computer Science and Engineering",
        code="CSE"
    )
    
    batch_2026 = models.Batch(
        id="batch-2026",
        departmentId="dept-cse-1",
        name="Class of 2026",
        startDate=now
    )
    
    db.add_all([inst_profile, dept_cse, batch_2026])
    db.commit()

    print("Seeding role-specific profiles...")
    
    trainer_profile = models.TrainerProfile(
        userId="u-trainer-1",
        firstName="Admin",
        lastName="Trainer",
        employeeId="EMP-001",
        specialization="Computer Science"
    )
    
    student_profile_1 = models.StudentProfile(
        userId="u-student-1",
        firstName="Ashwith",
        lastName="User",
        studentNumber="LMS001",
        departmentId="dept-cse-1",
        primaryBatchId="batch-2026",
        enrollmentDate=now
    )
    
    student_profile_2 = models.StudentProfile(
        userId="u-student-2",
        firstName="Student",
        lastName="User",
        studentNumber="LMS002",
        departmentId="dept-cse-1",
        primaryBatchId="batch-2026",
        enrollmentDate=now
    )
    
    db.add_all([trainer_profile, student_profile_1, student_profile_2])
    db.commit()

    print("Seeding curriculum (Courses, Topics, Assignments)...")
    
    course_fs = models.Course(
        id="course-fs-1",
        name="Full Stack Development",
        description="Comprehensive full stack engineering course",
        durationWeeks=12
    )
    
    topic_react = models.Topic(
        id="topic-react-1",
        courseId="course-fs-1",
        name="React.js Framework",
        orderIndex=1
    )
    
    trainer_assignment = models.TrainerAssignment(
        id="assignment-1",
        trainerId="u-trainer-1",
        batchId="batch-2026",
        courseId="course-fs-1",
        startDate=now
    )
    
    student_enroll_1 = models.StudentEnrollment(
        id="enr-1",
        studentId="u-student-1",
        courseId="course-fs-1"
    )
    
    student_enroll_2 = models.StudentEnrollment(
        id="enr-2",
        studentId="u-student-2",
        courseId="course-fs-1"
    )

    db.add_all([course_fs, topic_react, trainer_assignment, student_enroll_1, student_enroll_2])
    db.commit()

    # Seed Proctoring Profile
    print("Seeding proctoring profile...")
    proctor_profile = models.ProctoringProfile(
        id="proc-default-1",
        name="Standard AI Proctoring",
        fullscreenRequired=True,
        cameraRequired=True,
        microphoneRequired=False,
        tabSwitchLimit=3,
        requireIDVerification=False
    )
    db.add(proctor_profile)
    db.commit()

    # Seed Sample Material
    material_1 = models.Material(
        id="mat-sample-1",
        title="React & Full Stack Master Reference",
        description="Comprehensive study notes covering React hooks, state management, and backend REST APIs.",
        type="PDF",
        courseId="course-fs-1",
        topicId="topic-react-1",
        contentUrl="https://example.com/materials/react-guide.pdf",
        authorId="u-trainer-1",
        isReleased=True,
        releasedAt=now,
        createdAt=now
    )
    db.add(material_1)
    db.commit()

    db.close()
    print("Reset complete! Clean database initialized with baseline accounts and structure:")
    print("  - Admin:        admin@lms.com / admin123")
    print("  - Institution:  institution@lms.com / institution123")
    print("  - Trainer:      trainer@lms.com / trainer123")
    print("  - Student:      ashwith@example.com / student123 (ID: LMS001)")
    print("  - Student Alt:  student@lms.com / student123 (ID: LMS002)")

if __name__ == "__main__":
    reset_and_seed()
