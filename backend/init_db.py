"""
Standalone script to initialize and seed the Neon DB.
Run from the backend/ directory: python init_db.py
"""
import sys, os
# Make this runnable standalone (not as a package)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("PYTHONPATH", os.path.dirname(os.path.abspath(__file__)))

import json
import datetime
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import Column, String, Integer, Boolean, Float, ForeignKey, Text
from sqlalchemy.orm import relationship

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL not set in .env")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- Inline Models ---

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True)
    role = Column(String, nullable=False)
    studentId = Column(String, unique=True, index=True, nullable=True)
    department = Column(String, nullable=True)
    batch = Column(String, nullable=True)
    password = Column(String, nullable=True)
    createdAt = Column(String, default=lambda: datetime.datetime.utcnow().isoformat())

class QuestionBank(Base):
    __tablename__ = "question_banks"
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String)
    uploadedBy = Column(String, ForeignKey("users.id"))
    createdAt = Column(String, default=lambda: datetime.datetime.utcnow().isoformat())
    questionCount = Column(Integer, default=0)
    questions = relationship("Question", back_populates="bank")

class Question(Base):
    __tablename__ = "questions"
    id = Column(String, primary_key=True, index=True)
    question = Column(Text, nullable=False)
    optA = Column(String, nullable=False)
    optB = Column(String, nullable=False)
    optC = Column(String, nullable=False)
    optD = Column(String, nullable=False)
    correctAnswer = Column(String, nullable=False)
    category = Column(String, nullable=False)
    difficulty = Column(String, nullable=False)
    marks = Column(Float, default=1.0)
    explanation = Column(Text, nullable=True)
    questionBankId = Column(String, ForeignKey("question_banks.id"))
    bank = relationship("QuestionBank", back_populates="questions")

class Test(Base):
    __tablename__ = "tests"
    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String)
    questionIds = Column(Text, nullable=False)
    totalMarks = Column(Float, default=0.0)
    createdBy = Column(String, ForeignKey("users.id"))
    status = Column(String, nullable=False)
    createdAt = Column(String, default=lambda: datetime.datetime.utcnow().isoformat())
    duration = Column(Integer, default=30)
    attemptsAllowed = Column(Integer, default=1)
    negativeMarking = Column(Boolean, default=False)
    randomizeQuestions = Column(Boolean, default=True)
    randomizeOptions = Column(Boolean, default=True)
    showResultImmediately = Column(Boolean, default=True)
    allowBackNavigation = Column(Boolean, default=True)
    fullscreenRequired = Column(Boolean, default=True)
    autoSubmit = Column(Boolean, default=True)
    enableCalculator = Column(Boolean, default=False)
    enablePalette = Column(Boolean, default=True)

class Schedule(Base):
    __tablename__ = "schedules"
    id = Column(String, primary_key=True, index=True)
    testId = Column(String, ForeignKey("tests.id"))
    startTime = Column(String, nullable=False)
    endTime = Column(String, nullable=False)
    assignedStudents = Column(Text)
    assignedBatch = Column(String, nullable=True)

class Attempt(Base):
    __tablename__ = "attempts"
    id = Column(String, primary_key=True, index=True)
    studentId = Column(String, ForeignKey("users.id"))
    testId = Column(String, ForeignKey("tests.id"))
    startedAt = Column(String, nullable=False)
    expiresAt = Column(String, nullable=False)
    submittedAt = Column(String, nullable=True)
    score = Column(Float, nullable=True)
    percentage = Column(Float, nullable=True)
    violations = Column(Integer, default=0)
    status = Column(String, nullable=False)
    answers = relationship("AnswerRecord", back_populates="attempt")

class AnswerRecord(Base):
    __tablename__ = "answer_records"
    id = Column(String, primary_key=True, index=True)
    attemptId = Column(String, ForeignKey("attempts.id"))
    questionId = Column(String, ForeignKey("questions.id"))
    selectedOption = Column(String, nullable=True)
    status = Column(String, nullable=False)
    attempt = relationship("Attempt", back_populates="answers")

# --- Create all tables ---
print("Creating tables on Neon DB...")
Base.metadata.create_all(bind=engine)
print("Tables created (or already exist).")

# --- Seed Data ---
db = SessionLocal()

if db.query(User).first():
    print("Database already has data — skipping seed.")
    db.close()
    sys.exit(0)

print("Seeding initial data...")

now = datetime.datetime.utcnow().isoformat()

db.add(User(id='u-admin-1', name='System Administrator', email='admin@lms.com', role='admin', password='admin123', createdAt=now))
db.add(User(id='u-trainer-1', name='Admin Trainer', email='trainer@lms.com', role='trainer', password='trainer123', createdAt=now))
db.add(User(id='u-student-1', name='Ashwith', email='ashwith@example.com', role='student', studentId='LMS001', department='CSE', batch='2026', password='student123', createdAt=now))

db.commit()
print("Seed complete! Users created:")
print("  Admin    — admin@lms.com / admin123")
print("  Trainer  — trainer@lms.com / trainer123")
print("  Student  — ashwith@example.com / student123  (studentId: LMS001)")
db.close()
