from pydantic import BaseModel
from typing import List, Optional, Dict, Literal, Any

class UserBase(BaseModel):
    id: str
    name: str
    email: str
    role: str
    studentId: Optional[str] = None
    department: Optional[str] = None
    batch: Optional[str] = None
    password: Optional[str] = None
    createdAt: str

class UserCreate(UserBase):
    pass

class User(UserBase):
    class Config:
        from_attributes = True

class LoginResponse(BaseModel):
    token: str
    user: User

class QuestionOptions(BaseModel):
    A: str
    B: str
    C: str
    D: str

class QuestionBase(BaseModel):
    id: str
    question: str
    options: QuestionOptions
    correctAnswer: str
    category: str
    difficulty: str
    marks: float
    explanation: Optional[str] = None
    questionBankId: str

class QuestionCreate(QuestionBase):
    pass

class Question(QuestionBase):
    class Config:
        from_attributes = True

class QuestionBankBase(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    uploadedBy: str
    createdAt: str
    questionCount: int

class QuestionBankCreate(QuestionBankBase):
    pass

class QuestionBank(QuestionBankBase):
    class Config:
        from_attributes = True

class TestSettingsBase(BaseModel):
    duration: int
    attemptsAllowed: int
    negativeMarking: bool
    randomizeQuestions: bool
    randomizeOptions: bool
    showResultImmediately: bool
    allowBackNavigation: bool
    fullscreenRequired: bool
    autoSubmit: bool
    enableCalculator: bool
    enablePalette: bool

class TestBase(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    questionIds: List[str]
    totalMarks: float
    settings: TestSettingsBase
    createdBy: str
    status: str
    createdAt: str

class TestCreate(TestBase):
    pass

class Test(TestBase):
    class Config:
        from_attributes = True

class ScheduleBase(BaseModel):
    id: str
    testId: str
    startTime: str
    endTime: str
    assignedStudents: List[str]
    assignedBatch: Optional[str] = None

class ScheduleCreate(ScheduleBase):
    pass

class ScheduleUpdate(BaseModel):
    startTime: Optional[str] = None
    endTime: Optional[str] = None
    assignedStudents: Optional[List[str]] = None
    assignedBatch: Optional[str] = None

class Schedule(ScheduleBase):
    class Config:
        from_attributes = True

class AnswerRecordBase(BaseModel):
    questionId: str
    selectedOption: Optional[str] = None
    status: str

class AttemptBase(BaseModel):
    id: str
    studentId: str
    testId: str
    scheduleId: Optional[str] = None
    startedAt: str
    expiresAt: str
    submittedAt: Optional[str] = None
    answers: Dict[str, AnswerRecordBase]
    score: Optional[float] = None
    percentage: Optional[float] = None
    violations: int
    violationLogs: Optional[List[Dict[str, Any]]] = None
    proctoringSummary: Optional[Dict[str, Any]] = None
    status: str

class AttemptUpdate(BaseModel):
    answers: Optional[Dict[str, AnswerRecordBase]] = None
    scheduleId: Optional[str] = None
    violations: Optional[int] = None
    violationLogs: Optional[List[Dict[str, Any]]] = None
    proctoringSummary: Optional[Dict[str, Any]] = None
    status: Optional[str] = None
    submittedAt: Optional[str] = None
    score: Optional[float] = None
    percentage: Optional[float] = None

class Attempt(AttemptBase):
    class Config:
        from_attributes = True

class TestUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    questionIds: Optional[List[str]] = None
    totalMarks: Optional[float] = None
    settings: Optional[TestSettingsBase] = None
    status: Optional[str] = None

class CloneTestRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None

class ReconductTestRequest(BaseModel):
    startTime: str
    endTime: str
    assignedStudents: Optional[List[str]] = None
    assignedBatch: Optional[str] = None
    cloneTest: Optional[bool] = False
    newTestTitle: Optional[str] = None

class AttemptSubmitRequest(BaseModel):
    isAutoSubmit: Optional[bool] = False
    violations: Optional[int] = None
    violationLogs: Optional[List[Dict[str, Any]]] = None
    proctoringSummary: Optional[Dict[str, Any]] = None
    answers: Optional[Dict[str, AnswerRecordBase]] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    department: Optional[str] = None
    batch: Optional[str] = None
    studentId: Optional[str] = None
    password: Optional[str] = None
    currentPassword: Optional[str] = None

class MaterialBase(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    type: str  # 'pdf' | 'video' | 'link' | 'note'
    url: Optional[str] = None
    content: Optional[str] = None
    uploadedBy: str
    isReleased: bool = False
    releasedAt: Optional[str] = None
    assignedBatch: Optional[str] = None
    createdAt: str

class MaterialCreate(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    type: str
    url: Optional[str] = None
    content: Optional[str] = None
    uploadedBy: str
    assignedBatch: Optional[str] = None
    createdAt: str

class MaterialUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    url: Optional[str] = None
    content: Optional[str] = None
    isReleased: Optional[bool] = None
    releasedAt: Optional[str] = None
    assignedBatch: Optional[str] = None

class Material(MaterialBase):
    class Config:
        from_attributes = True
