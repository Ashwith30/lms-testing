import datetime
import json
import uuid
from sqlalchemy import Column, String, Integer, Boolean, Float, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship, object_session
try:
    from .database import Base
except (ImportError, ValueError):
    from database import Base

def get_utc_now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()

def generate_uuid(prefix=""):
    u = str(uuid.uuid4())
    return f"{prefix}{u}" if prefix else u

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False) # 'admin', 'institution', 'trainer', 'student'
    status = Column(String, default='active') # 'active', 'suspended', 'archived'
    lastLoginAt = Column(String, nullable=True)
    createdAt = Column(String, default=get_utc_now)
    updatedAt = Column(String, default=get_utc_now, onupdate=get_utc_now)

    student_profile = relationship("StudentProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    trainer_profile = relationship("TrainerProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    institution_profile = relationship("InstitutionProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")

    @property
    def name(self):
        if self.role == 'student' and self.student_profile:
            return f"{self.student_profile.firstName} {self.student_profile.lastName}".strip() or "Student"
        elif self.role == 'trainer' and self.trainer_profile:
            return f"{self.trainer_profile.firstName} {self.trainer_profile.lastName}".strip() or "Trainer"
        elif self.role == 'institution' and self.institution_profile:
            return self.institution_profile.institutionName or "Institution"
        return "User"

    @property
    def studentId(self):
        return self.student_profile.studentNumber if self.student_profile else None
        
    @property
    def department(self):
        if self.student_profile and getattr(self.student_profile, "department", None):
            return self.student_profile.department.name
        return self.student_profile.departmentId if self.student_profile else None
        
    @property
    def batch(self):
        if self.student_profile and self.student_profile.primaryBatch:
            return self.student_profile.primaryBatch.name
        return self.student_profile.primaryBatchId if self.student_profile else None


class InstitutionProfile(Base):
    __tablename__ = "institution_profiles"
    userId = Column(String, ForeignKey("users.id"), primary_key=True)
    institutionName = Column(String, nullable=False)
    contactPersonName = Column(String, nullable=True)
    supportEmail = Column(String, nullable=True)
    website = Column(String, nullable=True)
    address = Column(Text, nullable=True)

    user = relationship("User", back_populates="institution_profile")
    departments = relationship("Department", back_populates="institution")


class Department(Base):
    __tablename__ = "departments"
    id = Column(String, primary_key=True, index=True)
    institutionId = Column(String, ForeignKey("institution_profiles.userId"), nullable=True)
    name = Column(String, nullable=False)
    code = Column(String, nullable=True)

    institution = relationship("InstitutionProfile", back_populates="departments")
    batches = relationship("Batch", back_populates="department")


class Batch(Base):
    __tablename__ = "batches"
    id = Column(String, primary_key=True, index=True)
    departmentId = Column(String, ForeignKey("departments.id"))
    name = Column(String, nullable=False)
    startDate = Column(String, nullable=True)
    endDate = Column(String, nullable=True)

    department = relationship("Department", back_populates="batches")
    students = relationship("StudentProfile", back_populates="primaryBatch")


class StudentProfile(Base):
    __tablename__ = "student_profiles"
    userId = Column(String, ForeignKey("users.id"), primary_key=True)
    firstName = Column(String, nullable=False)
    lastName = Column(String, nullable=False)
    studentNumber = Column(String, unique=True, index=True, nullable=True)
    phoneNumber = Column(String, nullable=True)
    dateOfBirth = Column(String, nullable=True)
    departmentId = Column(String, ForeignKey("departments.id"), nullable=True)
    primaryBatchId = Column(String, ForeignKey("batches.id"), nullable=True)
    enrollmentDate = Column(String, nullable=True)

    user = relationship("User", back_populates="student_profile")
    primaryBatch = relationship("Batch", back_populates="students")
    department = relationship("Department")


class TrainerProfile(Base):
    __tablename__ = "trainer_profiles"
    userId = Column(String, ForeignKey("users.id"), primary_key=True)
    firstName = Column(String, nullable=False)
    lastName = Column(String, nullable=False)
    employeeId = Column(String, unique=True, index=True, nullable=True)
    specialization = Column(String, nullable=True)
    phoneNumber = Column(String, nullable=True)
    hireDate = Column(String, nullable=True)

    user = relationship("User", back_populates="trainer_profile")


class Course(Base):
    __tablename__ = "courses"
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    durationWeeks = Column(Integer, nullable=True)

    topics = relationship("Topic", back_populates="course")


class Topic(Base):
    __tablename__ = "topics"
    id = Column(String, primary_key=True, index=True)
    courseId = Column(String, ForeignKey("courses.id"))
    name = Column(String, nullable=False)
    orderIndex = Column(Integer, default=0)

    course = relationship("Course", back_populates="topics")


class TrainerAssignment(Base):
    __tablename__ = "trainer_assignments"
    id = Column(String, primary_key=True, index=True)
    trainerId = Column(String, ForeignKey("users.id"), nullable=False)
    batchId = Column(String, ForeignKey("batches.id"), nullable=True)
    institutionId = Column(String, ForeignKey("users.id"), nullable=True)
    topicId = Column(String, ForeignKey("topics.id"), nullable=True)
    courseId = Column(String, ForeignKey("courses.id"), nullable=True)
    startDate = Column(String, nullable=True)
    endDate = Column(String, nullable=True)


class StudentEnrollment(Base):
    __tablename__ = "student_enrollments"
    id = Column(String, primary_key=True, index=True)
    studentId = Column(String, ForeignKey("users.id"), nullable=False)
    courseId = Column(String, ForeignKey("courses.id"), nullable=False)
    status = Column(String, default="Enrolled") # Enrolled, In Progress, Completed, Dropped
    enrollmentDate = Column(String, default=get_utc_now)
    completionDate = Column(String, nullable=True)


class QuestionBank(Base):
    __tablename__ = "question_banks"
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    courseId = Column(String, ForeignKey("courses.id"), nullable=True)
    topicId = Column(String, ForeignKey("topics.id"), nullable=True)
    ownerId = Column(String, ForeignKey("users.id"), nullable=False)
    isPublic = Column(Boolean, default=False)
    createdAt = Column(String, default=get_utc_now)
    updatedAt = Column(String, default=get_utc_now, onupdate=get_utc_now)
    
    questions = relationship("Question", back_populates="bank", cascade="all, delete-orphan")

    @property
    def questionCount(self):
        return len(self.questions) if self.questions is not None else 0

    @property
    def uploadedBy(self):
        return self.ownerId


class Question(Base):
    __tablename__ = "questions"
    id = Column(String, primary_key=True, index=True)
    questionBankId = Column(String, ForeignKey("question_banks.id"))
    type = Column(String, default="MCQ") # MCQ, MULTI_SELECT, TRUE_FALSE, SUBJECTIVE
    text = Column(Text, nullable=False)
    mediaUrl = Column(Text, nullable=True)
    difficulty = Column(String, nullable=False)
    marks = Column(Float, default=1.0)
    explanation = Column(Text, nullable=True)
    tags = Column(Text, nullable=True) # JSON array of tags
    
    bank = relationship("QuestionBank", back_populates="questions")
    question_options = relationship("QuestionOption", back_populates="question", cascade="all, delete-orphan", order_by="QuestionOption.orderIndex")

    @property
    def question(self):
        return self.text
        
    @property
    def category(self):
        if self.tags:
            try:
                tags_list = json.loads(self.tags)
                if isinstance(tags_list, list) and tags_list:
                    return tags_list[0]
                if isinstance(tags_list, str):
                    return tags_list
            except Exception:
                return self.tags
        return "General"
        
    @property
    def options(self):
        letters = ["A", "B", "C", "D", "E", "F", "G", "H"]
        res = {}
        if self.question_options:
            for i, opt in enumerate(self.question_options):
                if i < len(letters):
                    res[letters[i]] = opt.optionText
        return res
        
    @property
    def correctAnswer(self):
        letters = ["A", "B", "C", "D", "E", "F", "G", "H"]
        if self.question_options:
            for i, opt in enumerate(self.question_options):
                if opt.isCorrect and i < len(letters):
                    return letters[i]
        return "A"


class QuestionOption(Base):
    __tablename__ = "question_options"
    id = Column(String, primary_key=True, index=True)
    questionId = Column(String, ForeignKey("questions.id"))
    optionText = Column(Text, nullable=False)
    isCorrect = Column(Boolean, default=False)
    orderIndex = Column(Integer, default=0)

    question = relationship("Question", back_populates="question_options")


class ProctoringProfile(Base):
    __tablename__ = "proctoring_profiles"
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    fullscreenRequired = Column(Boolean, default=True)
    cameraRequired = Column(Boolean, default=False)
    microphoneRequired = Column(Boolean, default=False)
    tabSwitchLimit = Column(Integer, default=3)
    requireIDVerification = Column(Boolean, default=False)


class Test(Base):
    __tablename__ = "tests"
    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    courseId = Column(String, ForeignKey("courses.id"), nullable=True)
    topicId = Column(String, ForeignKey("topics.id"), nullable=True)
    description = Column(Text, nullable=True)
    passingPercentage = Column(Float, nullable=True)
    totalMarks = Column(Float, default=0.0)
    authorId = Column(String, ForeignKey("users.id"))
    status = Column(String, nullable=False, default="Draft") # 'Draft', 'Published', 'Archived'
    proctoringProfileId = Column(String, ForeignKey("proctoring_profiles.id"), nullable=True)
    settings_json = Column(Text, nullable=True)
    createdAt = Column(String, default=get_utc_now)
    
    test_questions = relationship("TestQuestion", backref="test", cascade="all, delete-orphan", order_by="TestQuestion.orderIndex")
    schedules = relationship("Schedule", back_populates="test", cascade="all, delete-orphan")
    
    @property
    def questionIds(self):
        return [tq.questionId for tq in self.test_questions]

    @property
    def createdBy(self):
        return self.authorId
        
    @property
    def settings(self):
        default_settings = {
            "duration": 60,
            "attemptsAllowed": 1,
            "negativeMarking": False,
            "randomizeQuestions": False,
            "randomizeOptions": False,
            "showResultImmediately": True,
            "allowBackNavigation": True,
            "fullscreenRequired": True,
            "autoSubmit": True,
            "enableCalculator": False,
            "enablePalette": True
        }
        if self.settings_json:
            try:
                parsed = json.loads(self.settings_json)
                if isinstance(parsed, dict):
                    default_settings.update(parsed)
            except Exception:
                pass
        return default_settings


class TestQuestion(Base):
    __tablename__ = "test_questions"
    testId = Column(String, ForeignKey("tests.id"), primary_key=True)
    questionId = Column(String, ForeignKey("questions.id"), primary_key=True)
    orderIndex = Column(Integer, default=0)


class Schedule(Base):
    __tablename__ = "schedules"
    id = Column(String, primary_key=True, index=True)
    testId = Column(String, ForeignKey("tests.id"))
    startTime = Column(String, nullable=False)
    endTime = Column(String, nullable=False)
    durationMinutes = Column(Integer, nullable=True)
    attemptsAllowed = Column(Integer, default=1)
    
    test = relationship("Test", back_populates="schedules")
    assignments = relationship("ScheduleAssignment", back_populates="schedule", cascade="all, delete-orphan")
    attempts = relationship("Attempt", back_populates="schedule")

    @property
    def assignedBatch(self):
        if self.assignments:
            for a in self.assignments:
                if a.assigneeType.lower() == "batch":
                    # Check if there is an associated batch name or return assigneeId
                    db = object_session(self)
                    if db:
                        batch = db.query(Batch).filter(Batch.id == a.assigneeId).first()
                        if batch:
                            return batch.name
                    return a.assigneeId
        return None
        
    @property
    def assignedStudents(self):
        students = []
        if self.assignments:
            for a in self.assignments:
                if a.assigneeType.lower() == "student":
                    students.append(a.assigneeId)
        return students


class ScheduleAssignment(Base):
    __tablename__ = "schedule_assignments"
    id = Column(String, primary_key=True, index=True)
    scheduleId = Column(String, ForeignKey("schedules.id"))
    assigneeType = Column(String, nullable=False) # 'Student', 'Batch', 'Institution'
    assigneeId = Column(String, nullable=False)

    schedule = relationship("Schedule", back_populates="assignments")


class Attempt(Base):
    __tablename__ = "attempts"
    id = Column(String, primary_key=True, index=True)
    studentId = Column(String, ForeignKey("users.id"))
    scheduleId = Column(String, ForeignKey("schedules.id"), nullable=True)
    status = Column(String, nullable=False, default="in_progress") # 'in_progress', 'submitted', 'auto_submitted', 'terminated_violation'
    startedAt = Column(String, nullable=False, default=get_utc_now)
    submittedAt = Column(String, nullable=True)
    score = Column(Float, nullable=True)
    percentage = Column(Float, nullable=True)
    violations = Column(Integer, default=0)
    violationLogs_json = Column(Text, nullable=True)
    proctoringSummary_json = Column(Text, nullable=True)
    ipAddress = Column(String, nullable=True)
    deviceInfo = Column(Text, nullable=True)
    
    schedule = relationship("Schedule", back_populates="attempts")
    student = relationship("User", foreign_keys=[studentId])
    answers_records = relationship("Answer", back_populates="attempt", cascade="all, delete-orphan")
    
    @property
    def testId(self):
        return self.schedule.testId if self.schedule else None

    @property
    def expiresAt(self):
        duration = 60
        if self.schedule and self.schedule.durationMinutes:
            duration = self.schedule.durationMinutes
        elif self.schedule and self.schedule.test and self.schedule.test.settings:
            duration = self.schedule.test.settings.get("duration", 60)
        try:
            if not self.startedAt:
                return None
            start_clean = self.startedAt.replace("Z", "+00:00")
            start = datetime.datetime.fromisoformat(start_clean)
            exp = start + datetime.timedelta(minutes=duration)
            return exp.isoformat()
        except Exception:
            return None

    @property
    def answers(self):
        result = {}
        if self.answers_records:
            for ans in self.answers_records:
                selected_opt = None
                if ans.selectedOptionIds:
                    try:
                        parsed = json.loads(ans.selectedOptionIds)
                        if isinstance(parsed, list) and parsed:
                            selected_opt = parsed[0]
                        elif isinstance(parsed, str):
                            selected_opt = parsed
                    except Exception:
                        selected_opt = ans.selectedOptionIds
                result[ans.questionId] = {
                    "questionId": ans.questionId,
                    "selectedOption": selected_opt,
                    "status": "answered" if selected_opt else "not_visited"
                }
        return result

    @property
    def violationLogs(self):
        if self.violationLogs_json:
            try:
                return json.loads(self.violationLogs_json)
            except Exception:
                pass
        return []

    @property
    def proctoringSummary(self):
        if self.proctoringSummary_json:
            try:
                return json.loads(self.proctoringSummary_json)
            except Exception:
                pass
        return {
            "tabSwitches": 0,
            "windowBlurs": 0,
            "appSwitchGestures": 0,
            "fullscreenExits": 0,
            "faceMissingIncidents": 0,
            "multipleFacesIncidents": 0,
            "phoneDetectedIncidents": 0,
            "devtoolsIncidents": 0,
            "shortcutsBlocked": 0,
            "totalViolations": self.violations or 0,
            "trustScore": max(0, 100 - (self.violations or 0) * 15)
        }


class ProctoringLog(Base):
    __tablename__ = "proctoring_logs"
    id = Column(String, primary_key=True, index=True)
    attemptId = Column(String, ForeignKey("attempts.id"))
    timestamp = Column(String, nullable=False)
    violationType = Column(String, nullable=False)
    screenshotUrl = Column(Text, nullable=True)
    severity = Column(String, nullable=True)


class Answer(Base):
    __tablename__ = "answers"
    id = Column(String, primary_key=True, index=True)
    attemptId = Column(String, ForeignKey("attempts.id"))
    questionId = Column(String, ForeignKey("questions.id"))
    selectedOptionIds = Column(Text, nullable=True) # JSON array or string
    subjectiveText = Column(Text, nullable=True)
    timeTakenSeconds = Column(Integer, nullable=True)
    isCorrect = Column(Boolean, nullable=True)

    attempt = relationship("Attempt", back_populates="answers_records")
    question = relationship("Question")


class Material(Base):
    __tablename__ = "materials"
    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    type = Column(String, nullable=False) # 'PDF', 'Video', 'Link', 'Note'
    courseId = Column(String, ForeignKey("courses.id"), nullable=True)
    topicId = Column(String, ForeignKey("topics.id"), nullable=True)
    contentUrl = Column(Text, nullable=True)
    authorId = Column(String, ForeignKey("users.id"), nullable=False)
    isReleased = Column(Boolean, default=True)
    releasedAt = Column(String, nullable=True)
    createdAt = Column(String, default=get_utc_now)
    updatedAt = Column(String, default=get_utc_now, onupdate=get_utc_now)

    author = relationship("User", foreign_keys=[authorId])
    assignments = relationship("MaterialAssignment", back_populates="material", cascade="all, delete-orphan")

    @property
    def uploadedBy(self):
        return self.authorId

    @property
    def url(self):
        return self.contentUrl

    @property
    def content(self):
        return self.description


class MaterialAssignment(Base):
    __tablename__ = "material_assignments"
    id = Column(String, primary_key=True, index=True)
    materialId = Column(String, ForeignKey("materials.id"))
    assigneeType = Column(String, nullable=False) # 'Student', 'Batch', 'Institution', 'Course'
    assigneeId = Column(String, nullable=False)
    releaseDate = Column(String, nullable=True)

    material = relationship("Material", back_populates="assignments")
