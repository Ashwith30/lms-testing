import datetime
from sqlalchemy import Column, String, Integer, Boolean, Float, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
try:
    from .database import Base
except (ImportError, ValueError):
    from database import Base

def get_utc_now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True)
    role = Column(String, nullable=False) # 'admin', 'institution', 'trainer', 'student'
    studentId = Column(String, unique=True, index=True, nullable=True)
    department = Column(String, nullable=True)
    batch = Column(String, nullable=True)
    password = Column(String, nullable=True)
    createdAt = Column(String, default=get_utc_now)

class QuestionBank(Base):
    __tablename__ = "question_banks"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String)
    uploadedBy = Column(String, ForeignKey("users.id"))
    createdAt = Column(String, default=get_utc_now)
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
    correctAnswer = Column(String, nullable=False) # 'A', 'B', 'C', 'D'
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
    questionIds = Column(Text, nullable=False) # comma-separated list of IDs
    totalMarks = Column(Float, default=0.0)
    createdBy = Column(String, ForeignKey("users.id"))
    status = Column(String, nullable=False) # 'Draft', 'Scheduled', etc.
    createdAt = Column(String, default=get_utc_now)
    
    # Settings stored as individual columns or JSON. SQLite doesn't have native JSON before 3.38 mostly.
    # We'll use individual columns for simplicity.
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
    assignedStudents = Column(Text) # comma-separated or JSON
    assignedBatch = Column(String, nullable=True)

class Attempt(Base):
    __tablename__ = "attempts"
    
    id = Column(String, primary_key=True, index=True)
    studentId = Column(String, ForeignKey("users.id"))
    testId = Column(String, ForeignKey("tests.id"))
    scheduleId = Column(String, ForeignKey("schedules.id"), nullable=True)
    startedAt = Column(String, nullable=False)
    expiresAt = Column(String, nullable=False)
    submittedAt = Column(String, nullable=True)
    score = Column(Float, nullable=True)
    percentage = Column(Float, nullable=True)
    violations = Column(Integer, default=0)
    violationLogs = Column(Text, nullable=True) # JSON list of violation records
    proctoringSummary = Column(Text, nullable=True) # JSON object of proctoring metrics
    status = Column(String, nullable=False) # 'in_progress', 'submitted', 'auto_submitted'
    
    answers = relationship("AnswerRecord", back_populates="attempt")

class AnswerRecord(Base):
    __tablename__ = "answer_records"
    
    id = Column(String, primary_key=True, index=True)
    attemptId = Column(String, ForeignKey("attempts.id"))
    questionId = Column(String, ForeignKey("questions.id"))
    selectedOption = Column(String, nullable=True) # 'A', 'B', 'C', 'D' or null
    status = Column(String, nullable=False) # 'not_visited', 'visited', 'answered', 'marked'
    
    attempt = relationship("Attempt", back_populates="answers")

class Material(Base):
    __tablename__ = "materials"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    type = Column(String, nullable=False)  # 'pdf' | 'video' | 'link' | 'note'
    url = Column(Text, nullable=True)      # external URL or link
    content = Column(Text, nullable=True)  # text content for 'note' type
    uploadedBy = Column(String, ForeignKey("users.id"), nullable=False)
    isReleased = Column(Boolean, default=False)
    releasedAt = Column(String, nullable=True)
    assignedBatch = Column(String, nullable=True)  # None = all batches
    createdAt = Column(String, default=get_utc_now)
