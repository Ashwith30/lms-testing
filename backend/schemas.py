from pydantic import BaseModel
from typing import List, Optional, Dict, Literal, Any
import datetime

# --- Authentication & Users ---
class UserBase(BaseModel):
    id: str
    email: str
    role: str
    status: str = "active"
    lastLoginAt: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

class UserCreate(BaseModel):
    id: Optional[str] = None
    email: str
    password: str
    role: str

class User(UserBase):
    name: str = "User"
    studentId: Optional[str] = None
    department: Optional[str] = None
    batch: Optional[str] = None
    student_profile: Optional['StudentProfile'] = None
    trainer_profile: Optional['TrainerProfile'] = None
    institution_profile: Optional['InstitutionProfile'] = None
    class Config:
        from_attributes = True

class LoginResponse(BaseModel):
    token: str
    user: User

# --- Profiles ---
class StudentProfileBase(BaseModel):
    userId: str
    firstName: str
    lastName: str
    studentNumber: Optional[str] = None
    phoneNumber: Optional[str] = None
    dateOfBirth: Optional[str] = None
    departmentId: Optional[str] = None
    primaryBatchId: Optional[str] = None
    enrollmentDate: Optional[str] = None

class StudentProfile(StudentProfileBase):
    class Config:
        from_attributes = True

class TrainerProfileBase(BaseModel):
    userId: str
    firstName: str
    lastName: str
    employeeId: Optional[str] = None
    specialization: Optional[str] = None
    phoneNumber: Optional[str] = None
    hireDate: Optional[str] = None

class TrainerProfile(TrainerProfileBase):
    class Config:
        from_attributes = True

class InstitutionProfileBase(BaseModel):
    userId: str
    institutionName: str
    contactPersonName: Optional[str] = None
    supportEmail: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None

class InstitutionProfile(InstitutionProfileBase):
    class Config:
        from_attributes = True

# --- Organization & Curriculum ---
class DepartmentBase(BaseModel):
    id: str
    institutionId: Optional[str] = None
    name: str
    code: Optional[str] = None

class Department(DepartmentBase):
    class Config:
        from_attributes = True

class BatchBase(BaseModel):
    id: str
    departmentId: str
    name: str
    startDate: Optional[str] = None
    endDate: Optional[str] = None

class Batch(BatchBase):
    class Config:
        from_attributes = True

class CourseBase(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    durationWeeks: Optional[int] = None

class Course(CourseBase):
    class Config:
        from_attributes = True

class TopicBase(BaseModel):
    id: str
    courseId: str
    name: str
    orderIndex: int

class Topic(TopicBase):
    class Config:
        from_attributes = True

class TrainerAssignmentBase(BaseModel):
    id: str
    trainerId: str
    batchId: Optional[str] = None
    institutionId: Optional[str] = None
    topicId: Optional[str] = None
    courseId: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None

class TrainerAssignment(TrainerAssignmentBase):
    class Config:
        from_attributes = True

class StudentEnrollmentBase(BaseModel):
    id: str
    studentId: str
    courseId: str
    status: str
    enrollmentDate: str
    completionDate: Optional[str] = None

class StudentEnrollment(StudentEnrollmentBase):
    class Config:
        from_attributes = True

# --- Question Banks & Questions ---
class QuestionBankBase(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    courseId: Optional[str] = None
    topicId: Optional[str] = None
    ownerId: str
    isPublic: bool = False
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None
    questionCount: Optional[int] = 0
    uploadedBy: Optional[str] = None

class QuestionBank(QuestionBankBase):
    class Config:
        from_attributes = True

class QuestionOptionBase(BaseModel):
    id: str
    questionId: str
    optionText: str
    isCorrect: bool = False
    orderIndex: int = 0

class QuestionOption(QuestionOptionBase):
    class Config:
        from_attributes = True

class QuestionBase(BaseModel):
    id: str
    questionBankId: str
    type: str = "MCQ"
    text: str
    mediaUrl: Optional[str] = None
    difficulty: str = "Medium"
    marks: float = 1.0
    explanation: Optional[str] = None
    tags: Optional[str] = None

class Question(QuestionBase):
    options: Any = None
    question: Optional[str] = None
    category: Optional[str] = None
    correctAnswer: Optional[str] = None
    class Config:
        from_attributes = True

class QuestionCreate(BaseModel):
    type: Optional[str] = "MCQ"
    text: Optional[str] = None
    question: Optional[str] = None # Support 'question' alias for text
    mediaUrl: Optional[str] = None
    difficulty: Optional[str] = "Medium"
    marks: Optional[float] = 1.0
    explanation: Optional[str] = None
    tags: Optional[str] = None
    category: Optional[str] = None
    correctAnswer: Optional[str] = None
    options: Optional[Any] = None # List[Dict] or Dict[str, str]

# --- Tests & Scheduling ---
class ProctoringProfileBase(BaseModel):
    id: str
    name: str
    fullscreenRequired: bool = True
    cameraRequired: bool = False
    microphoneRequired: bool = False
    tabSwitchLimit: int = 3
    requireIDVerification: bool = False

class ProctoringProfile(ProctoringProfileBase):
    class Config:
        from_attributes = True

class TestBase(BaseModel):
    id: str
    title: str
    courseId: Optional[str] = None
    topicId: Optional[str] = None
    description: Optional[str] = None
    passingPercentage: Optional[float] = None
    totalMarks: float = 0.0
    authorId: str
    status: str = "Draft"
    proctoringProfileId: Optional[str] = None
    createdAt: Optional[str] = None
    questionIds: Optional[List[str]] = None
    settings: Optional[Dict[str, Any]] = None
    createdBy: Optional[str] = None

class Test(TestBase):
    class Config:
        from_attributes = True

class ScheduleBase(BaseModel):
    id: str
    testId: str
    startTime: str
    endTime: str
    durationMinutes: Optional[int] = None
    attemptsAllowed: int = 1
    assignedBatch: Optional[str] = None
    assignedStudents: Optional[List[str]] = None

class Schedule(ScheduleBase):
    class Config:
        from_attributes = True

class ScheduleAssignmentBase(BaseModel):
    id: str
    scheduleId: str
    assigneeType: str
    assigneeId: str

class ScheduleAssignment(ScheduleAssignmentBase):
    class Config:
        from_attributes = True

# --- Attempts & Answers ---
class AttemptBase(BaseModel):
    id: str
    studentId: str
    scheduleId: Optional[str] = None
    status: str = "in_progress"
    startedAt: str
    expiresAt: Optional[str] = None
    submittedAt: Optional[str] = None
    score: Optional[float] = None
    percentage: Optional[float] = None
    testId: Optional[str] = None
    violations: Optional[int] = 0
    ipAddress: Optional[str] = None
    deviceInfo: Optional[str] = None
    answers: Optional[Dict[str, Any]] = None
    violationLogs: Optional[List[Any]] = None
    proctoringSummary: Optional[Dict[str, Any]] = None

class Attempt(AttemptBase):
    class Config:
        from_attributes = True

class ProctoringLogBase(BaseModel):
    id: str
    attemptId: str
    timestamp: str
    violationType: str
    screenshotUrl: Optional[str] = None
    severity: Optional[str] = None

class ProctoringLog(ProctoringLogBase):
    class Config:
        from_attributes = True

class AnswerBase(BaseModel):
    id: str
    attemptId: str
    questionId: str
    selectedOptionIds: Optional[str] = None
    subjectiveText: Optional[str] = None
    timeTakenSeconds: Optional[int] = None
    isCorrect: Optional[bool] = None

class Answer(AnswerBase):
    class Config:
        from_attributes = True

# --- Materials ---
class MaterialBase(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    type: str
    courseId: Optional[str] = None
    topicId: Optional[str] = None
    contentUrl: Optional[str] = None
    authorId: str
    isReleased: Optional[bool] = True
    releasedAt: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None
    uploadedBy: Optional[str] = None
    url: Optional[str] = None
    content: Optional[str] = None

class Material(MaterialBase):
    class Config:
        from_attributes = True
