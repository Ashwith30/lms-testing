from pydantic import BaseModel
from typing import List, Optional, Dict, Literal

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
    startedAt: str
    expiresAt: str
    submittedAt: Optional[str] = None
    answers: Dict[str, AnswerRecordBase]
    score: Optional[float] = None
    percentage: Optional[float] = None
    violations: int
    status: str

class AttemptUpdate(BaseModel):
    answers: Optional[Dict[str, AnswerRecordBase]] = None
    violations: Optional[int] = None
    status: Optional[str] = None
    submittedAt: Optional[str] = None
    score: Optional[float] = None
    percentage: Optional[float] = None

class Attempt(AttemptBase):
    class Config:
        from_attributes = True

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
