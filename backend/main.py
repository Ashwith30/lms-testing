import json
import datetime
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func as sa_func, text
from typing import List, Optional, Dict, Any
from statistics import median as calc_median

try:
    from . import models, schemas
    from .database import engine, get_db
    from .auth import (
        hash_password,
        verify_password,
        create_access_token,
        get_current_user,
        require_roles
    )
except (ImportError, ValueError):
    import models
    import schemas
    from database import engine, get_db
    from auth import (
        hash_password,
        verify_password,
        create_access_token,
        get_current_user,
        require_roles
    )

def now_iso():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()

models.Base.metadata.create_all(bind=engine)

# Ensure scheduleId column exists in attempts table for SQLite backwards-compatibility
try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE attempts ADD COLUMN scheduleId VARCHAR"))
        conn.commit()
except Exception:
    pass

app = FastAPI(title="LMS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === Auth ===

@app.post("/api/auth/login", response_model=schemas.LoginResponse)
def login(creds: dict, db: Session = Depends(get_db)):
    identifier = creds.get("identifier")
    password = creds.get("password")
    
    if not identifier or not password:
        raise HTTPException(status_code=400, detail="Identifier and password required")

    # Check DB user by email or studentId
    user = db.query(models.User).filter(
        (models.User.email == identifier) | (models.User.studentId == identifier)
    ).first()
    
    if user and verify_password(password, user.password):
        token = create_access_token({"sub": user.id, "role": user.role})
        return {
            "token": token,
            "user": user
        }
            
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

@app.post("/api/auth/register/student", response_model=schemas.User)
def register_student(student: dict, db: Session = Depends(get_db)):
    email = student.get("email")
    student_id = student.get("studentId")
    
    if not email:
        raise HTTPException(status_code=400, detail="Email is required.")

    # Check if student with email or studentId already exists
    existing_email = db.query(models.User).filter(models.User.email == email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="A user with this email address already exists.")
        
    if student_id:
        existing_id = db.query(models.User).filter(models.User.studentId == student_id).first()
        if existing_id:
            raise HTTPException(status_code=400, detail="A user with this Student ID already exists.")
        
    raw_password = student.get("password") or "student123"
    hashed_pwd = hash_password(raw_password)

    db_student = models.User(
        id=f"u-student-{int(datetime.datetime.now(datetime.timezone.utc).timestamp() * 1000)}",
        name=student.get("name") or "Student",
        email=email,
        role="student",
        studentId=student_id,
        department=student.get("department"),
        batch=student.get("batch"),
        password=hashed_pwd,
        createdAt=now_iso()
    )
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    return db_student

@app.post("/api/auth/register/trainer", response_model=schemas.User)
def register_trainer(
    trainer: dict, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution"))
):
    email = trainer.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required.")
    
    # Check if trainer with email already exists
    existing_email = db.query(models.User).filter(models.User.email == email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="A user with this email address already exists.")
        
    raw_password = trainer.get("password") or "trainer123"
    hashed_pwd = hash_password(raw_password)

    db_trainer = models.User(
        id=f"u-trainer-{int(datetime.datetime.now(datetime.timezone.utc).timestamp() * 1000)}",
        name=trainer.get("name") or "Trainer",
        email=email,
        role="trainer",
        password=hashed_pwd,
        department=trainer.get("department"),
        createdAt=now_iso()
    )
    db.add(db_trainer)
    db.commit()
    db.refresh(db_trainer)
    return db_trainer

# === Users Directory & Profile ===

@app.get("/api/users", response_model=List[schemas.User])
@app.get("/api/users/all", response_model=List[schemas.User])
def get_all_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer"))
):
    return db.query(models.User).all()

@app.get("/api/batches", response_model=List[str])
def get_batches(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    users = db.query(models.User).filter(models.User.role == "student").all()
    batches = sorted(list(set(u.batch for u in users if u.batch)))
    return batches

@app.get("/api/users/{user_id}", response_model=schemas.User)
def get_user(
    user_id: str, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role not in ("admin", "institution", "trainer") and current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.put("/api/users/{user_id}", response_model=schemas.User)
def update_user(
    user_id: str,
    updates: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role not in ("admin", "institution") and current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if updates.name is not None:
        user.name = updates.name
    if updates.email is not None:
        # Check uniqueness if changed
        if updates.email != user.email:
            existing = db.query(models.User).filter(models.User.email == updates.email).first()
            if existing:
                raise HTTPException(status_code=400, detail="Email is already taken")
            user.email = updates.email
    if updates.department is not None:
        user.department = updates.department
    if updates.batch is not None:
        user.batch = updates.batch
    if updates.studentId is not None:
        if updates.studentId != user.studentId:
            existing = db.query(models.User).filter(models.User.studentId == updates.studentId).first()
            if existing:
                raise HTTPException(status_code=400, detail="Student ID is already taken")
            user.studentId = updates.studentId
    if updates.password is not None and updates.password.strip():
        # If user is changing their own password, optionally check currentPassword if provided
        if current_user.id == user_id and updates.currentPassword:
            if not verify_password(updates.currentPassword, user.password):
                raise HTTPException(status_code=400, detail="Current password does not match")
        user.password = hash_password(updates.password)

    db.commit()
    db.refresh(user)
    return user

@app.delete("/api/users/{user_id}")
def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution"))
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Delete related attempts and answer records
    attempts = db.query(models.Attempt).filter(models.Attempt.studentId == user_id).all()
    for a in attempts:
        db.query(models.AnswerRecord).filter(models.AnswerRecord.attemptId == a.id).delete()
        db.delete(a)

    db.delete(user)
    db.commit()
    return {"status": "deleted"}

# === Questions & Banks ===

@app.get("/api/question-banks", response_model=List[schemas.QuestionBank])
def get_question_banks(
    uploadedBy: str = None, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer"))
):
    query = db.query(models.QuestionBank)
    if uploadedBy:
        query = query.filter(models.QuestionBank.uploadedBy == uploadedBy)
    return query.all()

@app.post("/api/question-banks", response_model=schemas.QuestionBank)
def create_question_bank(
    bank: schemas.QuestionBankCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer"))
):
    db_bank = models.QuestionBank(**bank.model_dump())
    db.add(db_bank)
    db.commit()
    db.refresh(db_bank)
    return db_bank

@app.delete("/api/question-banks/{bank_id}")
def delete_question_bank(
    bank_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer"))
):
    bank = db.query(models.QuestionBank).filter(models.QuestionBank.id == bank_id).first()
    if not bank:
        raise HTTPException(status_code=404, detail="Question bank not found")
    
    # Delete all associated questions
    db.query(models.Question).filter(models.Question.questionBankId == bank_id).delete()
    db.delete(bank)
    db.commit()
    return {"status": "deleted"}

@app.get("/api/questions", response_model=List[schemas.Question])
def get_all_questions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer", "student"))
):
    db_qs = db.query(models.Question).all()
    res = []
    for q in db_qs:
        res.append({
            "id": q.id,
            "question": q.question,
            "options": {"A": q.optA, "B": q.optB, "C": q.optC, "D": q.optD},
            "correctAnswer": q.correctAnswer,
            "category": q.category,
            "difficulty": q.difficulty,
            "marks": q.marks,
            "explanation": q.explanation,
            "questionBankId": q.questionBankId
        })
    return res

@app.post("/api/questions")
def create_questions(
    questions: List[schemas.QuestionCreate], 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer"))
):
    for q in questions:
        db_q = models.Question(
            id=q.id,
            question=q.question,
            optA=q.options.A,
            optB=q.options.B,
            optC=q.options.C,
            optD=q.options.D,
            correctAnswer=q.correctAnswer,
            category=q.category,
            difficulty=q.difficulty,
            marks=q.marks,
            explanation=q.explanation,
            questionBankId=q.questionBankId
        )
        db.add(db_q)
    db.commit()
    return {"status": "ok"}

@app.delete("/api/questions/{question_id}")
def delete_question(
    question_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer"))
):
    q = db.query(models.Question).filter(models.Question.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Update question count in bank if applicable
    bank = db.query(models.QuestionBank).filter(models.QuestionBank.id == q.questionBankId).first()
    if bank and bank.questionCount > 0:
        bank.questionCount -= 1

    db.delete(q)
    db.commit()
    return {"status": "deleted"}

# === Tests ===

def format_test(t: models.Test):
    q_ids = []
    if t.questionIds:
        try:
            q_ids = json.loads(t.questionIds)
        except Exception:
            q_ids = [x.strip() for x in t.questionIds.split(",") if x.strip()]

    return {
        "id": t.id,
        "title": t.title,
        "description": t.description or "",
        "questionIds": q_ids,
        "totalMarks": t.totalMarks or 0.0,
        "createdBy": t.createdBy,
        "status": t.status,
        "createdAt": t.createdAt,
        "settings": {
            "duration": t.duration or 30,
            "attemptsAllowed": t.attemptsAllowed or 1,
            "negativeMarking": bool(t.negativeMarking),
            "randomizeQuestions": bool(t.randomizeQuestions),
            "randomizeOptions": bool(t.randomizeOptions),
            "showResultImmediately": bool(t.showResultImmediately),
            "allowBackNavigation": bool(t.allowBackNavigation),
            "fullscreenRequired": bool(t.fullscreenRequired),
            "autoSubmit": bool(t.autoSubmit),
            "enableCalculator": bool(t.enableCalculator),
            "enablePalette": bool(t.enablePalette)
        }
    }

@app.get("/api/tests", response_model=List[schemas.Test])
def get_tests(
    createdBy: str = None, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer", "student"))
):
    query = db.query(models.Test)
    if createdBy:
        query = query.filter(models.Test.createdBy == createdBy)
    tests = query.all()
    return [format_test(t) for t in tests]

@app.get("/api/tests/{test_id}", response_model=schemas.Test)
def get_test(
    test_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer", "student"))
):
    t = db.query(models.Test).filter(models.Test.id == test_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Test not found")
    return format_test(t)

@app.post("/api/tests", response_model=schemas.Test)
def create_test(
    test: schemas.TestCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer"))
):
    db_test = models.Test(
        id=test.id,
        title=test.title,
        description=test.description,
        questionIds=json.dumps(test.questionIds),
        totalMarks=test.totalMarks,
        createdBy=test.createdBy or current_user.id,
        status=test.status,
        createdAt=test.createdAt or now_iso(),
        duration=test.settings.duration,
        attemptsAllowed=test.settings.attemptsAllowed,
        negativeMarking=test.settings.negativeMarking,
        randomizeQuestions=test.settings.randomizeQuestions,
        randomizeOptions=test.settings.randomizeOptions,
        showResultImmediately=test.settings.showResultImmediately,
        allowBackNavigation=test.settings.allowBackNavigation,
        fullscreenRequired=test.settings.fullscreenRequired,
        autoSubmit=test.settings.autoSubmit,
        enableCalculator=test.settings.enableCalculator,
        enablePalette=test.settings.enablePalette
    )
    db.add(db_test)
    db.commit()
    db.refresh(db_test)
    return format_test(db_test)

@app.put("/api/tests/{test_id}", response_model=schemas.Test)
def update_test(
    test_id: str, 
    updates: schemas.TestUpdate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer"))
):
    db_test = db.query(models.Test).filter(models.Test.id == test_id).first()
    if not db_test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    if updates.title is not None:
        db_test.title = updates.title
    if updates.description is not None:
        db_test.description = updates.description
    if updates.questionIds is not None:
        db_test.questionIds = json.dumps(updates.questionIds)
    if updates.totalMarks is not None:
        db_test.totalMarks = updates.totalMarks
    if updates.status is not None:
        db_test.status = updates.status
    if updates.settings is not None:
        s = updates.settings
        db_test.duration = s.duration
        db_test.attemptsAllowed = s.attemptsAllowed
        db_test.negativeMarking = s.negativeMarking
        db_test.randomizeQuestions = s.randomizeQuestions
        db_test.randomizeOptions = s.randomizeOptions
        db_test.showResultImmediately = s.showResultImmediately
        db_test.allowBackNavigation = s.allowBackNavigation
        db_test.fullscreenRequired = s.fullscreenRequired
        db_test.autoSubmit = s.autoSubmit
        db_test.enableCalculator = s.enableCalculator
        db_test.enablePalette = s.enablePalette

    db.commit()
    db.refresh(db_test)
    return format_test(db_test)

@app.delete("/api/tests/{test_id}")
def delete_test(
    test_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer"))
):
    db_test = db.query(models.Test).filter(models.Test.id == test_id).first()
    if not db_test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    # Delete related schedules
    db.query(models.Schedule).filter(models.Schedule.testId == test_id).delete()
    
    # Delete related attempts and answer records
    attempts = db.query(models.Attempt).filter(models.Attempt.testId == test_id).all()
    for a in attempts:
        db.query(models.AnswerRecord).filter(models.AnswerRecord.attemptId == a.id).delete()
        db.delete(a)

    db.delete(db_test)
    db.commit()
    return {"status": "deleted"}

@app.post("/api/tests/{test_id}/clone", response_model=schemas.Test)
def clone_test(
    test_id: str,
    payload: Optional[schemas.CloneTestRequest] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer"))
):
    """Duplicates a test with its full question set and settings for independent administration."""
    original = db.query(models.Test).filter(models.Test.id == test_id).first()
    if not original:
        raise HTTPException(status_code=404, detail="Test not found")
    
    new_title = payload.title if (payload and payload.title) else f"{original.title} (Copy)"
    new_desc = payload.description if (payload and payload.description is not None) else original.description
    new_id = f"test-{int(datetime.datetime.now().timestamp() * 1000)}"

    db_clone = models.Test(
        id=new_id,
        title=new_title,
        description=new_desc,
        questionIds=original.questionIds,
        totalMarks=original.totalMarks,
        createdBy=current_user.id,
        status="Draft",
        createdAt=now_iso(),
        duration=original.duration,
        attemptsAllowed=original.attemptsAllowed,
        negativeMarking=original.negativeMarking,
        randomizeQuestions=original.randomizeQuestions,
        randomizeOptions=original.randomizeOptions,
        showResultImmediately=original.showResultImmediately,
        allowBackNavigation=original.allowBackNavigation,
        fullscreenRequired=original.fullscreenRequired,
        autoSubmit=original.autoSubmit,
        enableCalculator=original.enableCalculator,
        enablePalette=original.enablePalette
    )
    db.add(db_clone)
    db.commit()
    db.refresh(db_clone)
    return format_test(db_clone)

@app.get("/api/tests/{test_id}/schedules", response_model=List[schemas.Schedule])
def get_test_schedules(
    test_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer", "student"))
):
    """Retrieves all scheduled sessions (past, live, upcoming) for a specific test."""
    schedules = db.query(models.Schedule).filter(models.Schedule.testId == test_id).all()
    return [format_schedule(s) for s in schedules]

@app.post("/api/tests/{test_id}/reconduct")
def reconduct_test(
    test_id: str,
    payload: schemas.ReconductTestRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer"))
):
    """Reconducts an assessment by scheduling a new session window (or creating a clone with a new schedule)."""
    target_test_id = test_id
    cloned_test_info = None

    if payload.cloneTest:
        original = db.query(models.Test).filter(models.Test.id == test_id).first()
        if not original:
            raise HTTPException(status_code=404, detail="Original test not found")
        
        new_title = payload.newTestTitle or f"{original.title} - Reconduct ({payload.assignedBatch or 'All'})"
        target_test_id = f"test-{int(datetime.datetime.now().timestamp() * 1000)}"

        db_clone = models.Test(
            id=target_test_id,
            title=new_title,
            description=original.description,
            questionIds=original.questionIds,
            totalMarks=original.totalMarks,
            createdBy=current_user.id,
            status="Scheduled",
            createdAt=now_iso(),
            duration=original.duration,
            attemptsAllowed=original.attemptsAllowed,
            negativeMarking=original.negativeMarking,
            randomizeQuestions=original.randomizeQuestions,
            randomizeOptions=original.randomizeOptions,
            showResultImmediately=original.showResultImmediately,
            allowBackNavigation=original.allowBackNavigation,
            fullscreenRequired=original.fullscreenRequired,
            autoSubmit=original.autoSubmit,
            enableCalculator=original.enableCalculator,
            enablePalette=original.enablePalette
        )
        db.add(db_clone)
        db.commit()
        db.refresh(db_clone)
        cloned_test_info = format_test(db_clone)
    else:
        db_test = db.query(models.Test).filter(models.Test.id == test_id).first()
        if not db_test:
            raise HTTPException(status_code=404, detail="Test not found")
        db_test.status = "Scheduled"

    # Create new schedule session
    new_sched_id = f"s-{int(datetime.datetime.now().timestamp() * 1000)}"
    db_sched = models.Schedule(
        id=new_sched_id,
        testId=target_test_id,
        startTime=payload.startTime,
        endTime=payload.endTime,
        assignedStudents=json.dumps(payload.assignedStudents or ["all"]),
        assignedBatch=payload.assignedBatch
    )
    db.add(db_sched)
    db.commit()
    db.refresh(db_sched)

    return {
        "schedule": format_schedule(db_sched),
        "clonedTest": cloned_test_info,
        "message": "Test session scheduled / reconducted successfully"
    }

# === Schedules ===

def format_schedule(s: models.Schedule):
    assigned = []
    if s.assignedStudents:
        try:
            assigned = json.loads(s.assignedStudents)
        except Exception:
            assigned = [x.strip() for x in s.assignedStudents.split(",") if x.strip()]
            
    return {
        "id": s.id,
        "testId": s.testId,
        "startTime": s.startTime,
        "endTime": s.endTime,
        "assignedStudents": assigned,
        "assignedBatch": s.assignedBatch
    }

@app.get("/api/schedules", response_model=List[schemas.Schedule])
def get_schedules(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer", "student"))
):
    schedules = db.query(models.Schedule).all()
    return [format_schedule(s) for s in schedules]

@app.post("/api/schedules", response_model=schemas.Schedule)
def create_schedule(
    schedule: schemas.ScheduleCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer"))
):
    db_sched = models.Schedule(
        id=schedule.id,
        testId=schedule.testId,
        startTime=schedule.startTime,
        endTime=schedule.endTime,
        assignedStudents=json.dumps(schedule.assignedStudents),
        assignedBatch=schedule.assignedBatch
    )
    db.add(db_sched)

    # Update test status to Scheduled
    db_test = db.query(models.Test).filter(models.Test.id == schedule.testId).first()
    if db_test:
        db_test.status = "Scheduled"

    db.commit()
    db.refresh(db_sched)
    return format_schedule(db_sched)

@app.get("/api/schedules/{schedule_id}", response_model=schemas.Schedule)
def get_schedule(
    schedule_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer", "student"))
):
    db_sched = db.query(models.Schedule).filter(models.Schedule.id == schedule_id).first()
    if not db_sched:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return format_schedule(db_sched)

@app.put("/api/schedules/{schedule_id}", response_model=schemas.Schedule)
def update_schedule(
    schedule_id: str,
    updates: schemas.ScheduleUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer"))
):
    db_sched = db.query(models.Schedule).filter(models.Schedule.id == schedule_id).first()
    if not db_sched:
        raise HTTPException(status_code=404, detail="Schedule not found")

    if updates.startTime is not None:
        db_sched.startTime = updates.startTime
    if updates.endTime is not None:
        db_sched.endTime = updates.endTime
    if updates.assignedStudents is not None:
        db_sched.assignedStudents = json.dumps(updates.assignedStudents)
    if updates.assignedBatch is not None:
        db_sched.assignedBatch = updates.assignedBatch

    db.commit()
    db.refresh(db_sched)
    return format_schedule(db_sched)

@app.delete("/api/schedules/{schedule_id}")
def delete_schedule(
    schedule_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer"))
):
    db_sched = db.query(models.Schedule).filter(models.Schedule.id == schedule_id).first()
    if not db_sched:
        raise HTTPException(status_code=404, detail="Schedule not found")
    db.delete(db_sched)
    db.commit()
    return {"status": "deleted"}

# === Attempts & Secure Grading ===

def format_attempt(a: models.Attempt, db: Session):
    ans_records = db.query(models.AnswerRecord).filter(models.AnswerRecord.attemptId == a.id).all()
    answers = {}
    for r in ans_records:
        answers[r.questionId] = {
            "questionId": r.questionId,
            "selectedOption": r.selectedOption,
            "status": r.status
        }
        
    v_logs = []
    if a.violationLogs:
        try:
            v_logs = json.loads(a.violationLogs)
        except Exception:
            v_logs = []

    p_summary = None
    if a.proctoringSummary:
        try:
            p_summary = json.loads(a.proctoringSummary)
        except Exception:
            p_summary = None

    return {
        "id": a.id,
        "studentId": a.studentId,
        "testId": a.testId,
        "scheduleId": getattr(a, "scheduleId", None),
        "startedAt": a.startedAt,
        "expiresAt": a.expiresAt,
        "submittedAt": a.submittedAt,
        "score": a.score,
        "percentage": a.percentage,
        "violations": a.violations or 0,
        "violationLogs": v_logs,
        "proctoringSummary": p_summary,
        "status": a.status,
        "answers": answers
    }

@app.get("/api/attempts", response_model=List[schemas.AttemptBase])
def get_attempts(
    studentId: str = None, 
    testId: str = None,
    scheduleId: str = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer", "student"))
):
    query = db.query(models.Attempt)
    if current_user.role == "student":
        query = query.filter(models.Attempt.studentId == current_user.id)
    elif studentId:
        query = query.filter(models.Attempt.studentId == studentId)
    if testId:
        query = query.filter(models.Attempt.testId == testId)
    if scheduleId:
        query = query.filter(models.Attempt.scheduleId == scheduleId)
    attempts = query.all()
    return [format_attempt(a, db) for a in attempts]

@app.post("/api/attempts", response_model=schemas.AttemptBase)
def create_attempt(
    attempt: schemas.AttemptBase, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("student"))
):
    # Ensure students can only create attempts for themselves
    if attempt.studentId != current_user.id:
        attempt.studentId = current_user.id

    v_logs_json = json.dumps(attempt.violationLogs) if attempt.violationLogs else None
    p_summary_json = json.dumps(attempt.proctoringSummary) if attempt.proctoringSummary else None

    db_attempt = models.Attempt(
        id=attempt.id,
        studentId=attempt.studentId,
        testId=attempt.testId,
        scheduleId=attempt.scheduleId,
        startedAt=attempt.startedAt,
        expiresAt=attempt.expiresAt,
        status=attempt.status,
        violations=attempt.violations or 0,
        violationLogs=v_logs_json,
        proctoringSummary=p_summary_json
    )
    db.add(db_attempt)
    
    for qId, ans in attempt.answers.items():
        db_ans = models.AnswerRecord(
            id=f"{attempt.id}-{qId}",
            attemptId=attempt.id,
            questionId=qId,
            selectedOption=ans.selectedOption,
            status=ans.status
        )
        db.add(db_ans)
        
    db.commit()
    db.refresh(db_attempt)
    return format_attempt(db_attempt, db)

@app.get("/api/attempts/{attempt_id}", response_model=schemas.AttemptBase)
def get_attempt(
    attempt_id: str, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_attempt = db.query(models.Attempt).filter(models.Attempt.id == attempt_id).first()
    if not db_attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
        
    if current_user.role == "student" and db_attempt.studentId != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return format_attempt(db_attempt, db)

@app.put("/api/attempts/{attempt_id}")
def update_attempt(
    attempt_id: str, 
    updates: schemas.AttemptUpdate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_attempt = db.query(models.Attempt).filter(models.Attempt.id == attempt_id).first()
    if not db_attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
        
    if current_user.role == "student" and db_attempt.studentId != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    if updates.scheduleId is not None:
        db_attempt.scheduleId = updates.scheduleId

    if updates.violations is not None:
        db_attempt.violations = updates.violations
    if updates.violationLogs is not None:
        db_attempt.violationLogs = json.dumps(updates.violationLogs)
    if updates.proctoringSummary is not None:
        db_attempt.proctoringSummary = json.dumps(updates.proctoringSummary)
    if updates.status is not None:
        db_attempt.status = updates.status
    if updates.submittedAt is not None:
        db_attempt.submittedAt = updates.submittedAt
    if updates.score is not None:
        db_attempt.score = updates.score
    if updates.percentage is not None:
        db_attempt.percentage = updates.percentage
        
    if updates.answers:
        for qId, ans in updates.answers.items():
            db_ans = db.query(models.AnswerRecord).filter(
                models.AnswerRecord.attemptId == attempt_id,
                models.AnswerRecord.questionId == qId
            ).first()
            if db_ans:
                db_ans.selectedOption = ans.selectedOption
                db_ans.status = ans.status
            else:
                db_ans = models.AnswerRecord(
                    id=f"{attempt_id}-{qId}",
                    attemptId=attempt_id,
                    questionId=qId,
                    selectedOption=ans.selectedOption,
                    status=ans.status
                )
                db.add(db_ans)
                
    db.commit()
    return format_attempt(db_attempt, db)

# Direct fast online answer sync endpoint
@app.post("/api/attempts/{attempt_id}/sync-answer")
def sync_answer_direct(
    attempt_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_attempt = db.query(models.Attempt).filter(models.Attempt.id == attempt_id).first()
    if not db_attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
        
    if current_user.role == "student" and db_attempt.studentId != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    question_id = payload.get("questionId")
    selected_option = payload.get("selectedOption")
    ans_status = payload.get("status", "answered")

    if question_id:
        db_ans = db.query(models.AnswerRecord).filter(
            models.AnswerRecord.attemptId == attempt_id,
            models.AnswerRecord.questionId == question_id
        ).first()
        if db_ans:
            db_ans.selectedOption = selected_option
            db_ans.status = ans_status
        else:
            db_ans = models.AnswerRecord(
                id=f"{attempt_id}-{question_id}",
                attemptId=attempt_id,
                questionId=question_id,
                selectedOption=selected_option,
                status=ans_status
            )
            db.add(db_ans)

    if "violations" in payload and payload["violations"] is not None:
        db_attempt.violations = payload["violations"]

    if "violationLogs" in payload and payload["violationLogs"] is not None:
        db_attempt.violationLogs = json.dumps(payload["violationLogs"])

    if "proctoringSummary" in payload and payload["proctoringSummary"] is not None:
        db_attempt.proctoringSummary = json.dumps(payload["proctoringSummary"])

    db.commit()
    return {"status": "synced", "timestamp": now_iso()}

# Server-Side Scoring & Submission
@app.post("/api/attempts/{attempt_id}/submit")
def submit_attempt_secure(
    attempt_id: str,
    payload: Optional[schemas.AttemptSubmitRequest] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_attempt = db.query(models.Attempt).filter(models.Attempt.id == attempt_id).first()
    if not db_attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
        
    if current_user.role == "student" and db_attempt.studentId != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    # Update any answers sent in payload
    if payload and payload.answers:
        for qId, ans in payload.answers.items():
            db_ans = db.query(models.AnswerRecord).filter(
                models.AnswerRecord.attemptId == attempt_id,
                models.AnswerRecord.questionId == qId
            ).first()
            if db_ans:
                db_ans.selectedOption = ans.selectedOption
                db_ans.status = ans.status
            else:
                db_ans = models.AnswerRecord(
                    id=f"{attempt_id}-{qId}",
                    attemptId=attempt_id,
                    questionId=qId,
                    selectedOption=ans.selectedOption,
                    status=ans.status
                )
                db.add(db_ans)

    if payload and payload.violations is not None:
        db_attempt.violations = payload.violations

    if payload and payload.violationLogs is not None:
        db_attempt.violationLogs = json.dumps(payload.violationLogs)

    if payload and payload.proctoringSummary is not None:
        db_attempt.proctoringSummary = json.dumps(payload.proctoringSummary)

    # Fetch test details for scoring
    test = db.query(models.Test).filter(models.Test.id == db_attempt.testId).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test associated with attempt not found")

    # Parse question IDs
    try:
        q_ids = json.loads(test.questionIds)
    except Exception:
        q_ids = [x.strip() for x in test.questionIds.split(",") if x.strip()]

    # Fetch questions from database
    questions = db.query(models.Question).filter(models.Question.id.in_(q_ids)).all()
    q_map = {q.id: q for q in questions}

    # Fetch all recorded answers for this attempt
    ans_records = db.query(models.AnswerRecord).filter(models.AnswerRecord.attemptId == attempt_id).all()
    ans_map = {r.questionId: r for r in ans_records}

    # Server-Side Scoring Logic
    calculated_score = 0.0
    total_max_marks = test.totalMarks if test.totalMarks > 0 else sum(q.marks for q in questions)

    for q in questions:
        ans_rec = ans_map.get(q.id)
        if ans_rec and ans_rec.selectedOption:
            if ans_rec.selectedOption == q.correctAnswer:
                calculated_score += q.marks
            elif test.negativeMarking:
                calculated_score -= (q.marks * 0.25)

    # Ensure score does not drop below zero
    final_score = max(0.0, round(calculated_score, 2))
    final_percentage = round((final_score / total_max_marks * 100), 1) if total_max_marks > 0 else 0.0

    is_auto = payload.isAutoSubmit if payload else False
    db_attempt.status = "auto_submitted" if is_auto else "submitted"
    db_attempt.submittedAt = now_iso()
    db_attempt.score = final_score
    db_attempt.percentage = final_percentage

    db.commit()
    db.refresh(db_attempt)
    return format_attempt(db_attempt, db)

# === Student Dashboard & Tests ===

@app.get("/api/student/dashboard/{student_id}")
def get_student_dashboard(
    student_id: str, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role == "student" and current_user.id != student_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    student_user = db.query(models.User).filter(models.User.id == student_id).first()
    attempts = db.query(models.Attempt).filter(models.Attempt.studentId == student_id).all()
    schedules = db.query(models.Schedule).all()
    tests = db.query(models.Test).all()
    tests_map = {t.id: t for t in tests}

    now = now_iso()
    attempts_map = {a.testId: a for a in attempts}

    upcoming = []
    for s in schedules:
        test = tests_map.get(s.testId)
        if not test:
            continue
        attempt = attempts_map.get(s.testId)
        
        assigned = []
        if s.assignedStudents:
            try:
                assigned = json.loads(s.assignedStudents)
            except Exception:
                assigned = [x.strip() for x in s.assignedStudents.split(",") if x.strip()]
        
        # Test Assignment Check
        is_assigned = (
            "all" in assigned or
            student_id in assigned or
            (student_user and student_user.batch and student_user.batch == s.assignedBatch) or
            (not assigned and not s.assignedBatch)
        )
        if not is_assigned:
            continue
            
        is_available = now >= s.startTime and now <= s.endTime and (not attempt or attempt.status not in ('submitted', 'auto_submitted'))
        upcoming.append({
            "schedule": format_schedule(s),
            "test": format_test(test),
            "attempt": format_attempt(attempt, db) if attempt else None,
            "isAvailable": is_available
        })

    past_exams = []
    submitted_attempts = [a for a in attempts if a.status in ('submitted', 'auto_submitted')]
    for a in submitted_attempts:
        test = tests_map.get(a.testId)
        if not test:
            continue
        past_exams.append({
            "attempt": format_attempt(a, db),
            "test": format_test(test)
        })

    past_exams.sort(key=lambda x: x["attempt"]["submittedAt"] or "", reverse=True)

    percentages = [a.percentage for a in submitted_attempts if a.percentage is not None]
    stats = {
        "totalCompleted": len(submitted_attempts),
        "averageScore": round(sum(percentages) / len(percentages), 1) if percentages else 0,
        "highestScore": round(max(percentages), 1) if percentages else 0,
    }

    return {
        "upcoming_tests": upcoming,
        "past_exams": past_exams,
        "stats": stats
    }

# === Student Performance Analytics Endpoint ===

@app.get("/api/student/analytics/{student_id}")
def get_student_analytics(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role == "student" and current_user.id != student_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    attempts = db.query(models.Attempt).filter(models.Attempt.studentId == student_id).all()
    submitted_attempts = [a for a in attempts if a.status in ('submitted', 'auto_submitted')]
    tests = db.query(models.Test).all()
    tests_map = {t.id: t for t in tests}

    percentages = [a.percentage for a in submitted_attempts if a.percentage is not None]
    total_attempts = len(submitted_attempts)
    avg_score = round(sum(percentages) / total_attempts, 1) if total_attempts else 0
    highest_score = round(max(percentages), 1) if percentages else 0
    tests_passed = len([p for p in percentages if p >= 60])
    pass_rate = round((tests_passed / total_attempts * 100), 1) if total_attempts else 0
    total_violations = sum(a.violations or 0 for a in attempts)
    integrity_rating = max(0, 100 - (total_violations * 5))

    # Progression Timeline
    progression = []
    for a in sorted(submitted_attempts, key=lambda x: x.submittedAt or x.startedAt):
        test = tests_map.get(a.testId)
        progression.append({
            "attemptId": a.id,
            "testId": a.testId,
            "testTitle": test.title if test else "Assessment",
            "score": a.score or 0,
            "totalMarks": test.totalMarks if test else 0,
            "percentage": a.percentage or 0,
            "date": a.submittedAt or a.startedAt,
            "violations": a.violations or 0,
            "status": a.status
        })

    # Category & Difficulty Mastery
    cat_counts: Dict[str, Dict[str, int]] = {}
    diff_counts: Dict[str, Dict[str, int]] = {"Easy": {"total": 0, "correct": 0}, "Medium": {"total": 0, "correct": 0}, "Hard": {"total": 0, "correct": 0}}

    for a in submitted_attempts:
        records = db.query(models.AnswerRecord).filter(models.AnswerRecord.attemptId == a.id).all()
        for r in records:
            q = db.query(models.Question).filter(models.Question.id == r.questionId).first()
            if not q:
                continue
            cat = q.category or "General"
            if cat not in cat_counts:
                cat_counts[cat] = {"total": 0, "correct": 0}
            cat_counts[cat]["total"] += 1
            if r.selectedOption == q.correctAnswer:
                cat_counts[cat]["correct"] += 1

            diff = q.difficulty or "Medium"
            if diff in diff_counts:
                diff_counts[diff]["total"] += 1
                if r.selectedOption == q.correctAnswer:
                    diff_counts[diff]["correct"] += 1

    categories_list = []
    for cat, val in cat_counts.items():
        acc = round((val["correct"] / val["total"] * 100), 1) if val["total"] else 0
        categories_list.append({
            "category": cat,
            "totalQuestions": val["total"],
            "correctQuestions": val["correct"],
            "accuracy": acc
        })

    difficulties_list = []
    for diff in ["Easy", "Medium", "Hard"]:
        val = diff_counts[diff]
        acc = round((val["correct"] / val["total"] * 100), 1) if val["total"] else 0
        difficulties_list.append({
            "difficulty": diff,
            "totalQuestions": val["total"],
            "correctQuestions": val["correct"],
            "accuracy": acc
        })

    return {
        "kpis": {
            "totalAttempts": total_attempts,
            "avgScore": avg_score,
            "passRate": pass_rate,
            "highestScore": highest_score,
            "testsPassed": tests_passed,
            "integrityRating": integrity_rating
        },
        "progression": progression,
        "categories": categories_list,
        "difficulties": difficulties_list
    }

# === System & Admin Analytics Summary ===

@app.get("/api/analytics/summary")
def get_analytics_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer"))
):
    users = db.query(models.User).all()
    students = [u for u in users if u.role == "student"]
    trainers = [u for u in users if u.role == "trainer"]
    
    tests = db.query(models.Test).all()
    questions = db.query(models.Question).all()
    attempts = db.query(models.Attempt).all()
    submitted_attempts = [a for a in attempts if a.status in ('submitted', 'auto_submitted')]
    
    # Calculate score distribution brackets
    score_brackets = {
        '80-100': 0,
        '60-79': 0,
        '40-59': 0,
        '0-39': 0
    }
    
    for a in submitted_attempts:
        pct = a.percentage or 0
        if pct >= 80:
            score_brackets['80-100'] += 1
        elif pct >= 60:
            score_brackets['60-79'] += 1
        elif pct >= 40:
            score_brackets['40-59'] += 1
        else:
            score_brackets['0-39'] += 1

    # Role counts
    role_counts = {
        "student": len(students),
        "trainer": len(trainers),
        "institution": len([u for u in users if u.role == "institution"]),
        "admin": len([u for u in users if u.role == "admin"])
    }

    # Question difficulty breakdown
    question_difficulty = {
        "Easy": len([q for q in questions if q.difficulty == "Easy"]),
        "Medium": len([q for q in questions if q.difficulty == "Medium"]),
        "Hard": len([q for q in questions if q.difficulty == "Hard"])
    }

    # Department and batch counts
    dept_counts: Dict[str, int] = {}
    batch_counts: Dict[str, int] = {}
    for u in users:
        d = u.department or "General"
        dept_counts[d] = dept_counts.get(d, 0) + 1
        if u.role == "student":
            b = u.batch or "General"
            batch_counts[b] = batch_counts.get(b, 0) + 1

    # KPIs
    total_submissions = len(submitted_attempts)
    avg_score = round(sum(a.percentage or 0 for a in submitted_attempts) / total_submissions, 1) if total_submissions else 0
    pass_count = len([a for a in submitted_attempts if (a.percentage or 0) >= 60])
    pass_rate = round((pass_count / total_submissions * 100), 1) if total_submissions else 0
    highest_score = round(max((a.percentage or 0 for a in submitted_attempts), default=0), 1)
    total_violations = sum(a.violations or 0 for a in attempts)

    # Department breakdown with performance
    dept_map = {}
    for s in students:
        dept = s.department or "General"
        if dept not in dept_map:
            dept_map[dept] = {"students": [], "attempts": []}
        dept_map[dept]["students"].append(s)

    student_id_to_dept = {s.id: s.department or "General" for s in students}
    for a in submitted_attempts:
        dept = student_id_to_dept.get(a.studentId, "General")
        if dept in dept_map:
            dept_map[dept]["attempts"].append(a)

    departments_data = []
    for dept, val in dept_map.items():
        d_attempts = val["attempts"]
        d_subs = len(d_attempts)
        d_avg = round(sum(a.percentage or 0 for a in d_attempts) / d_subs, 1) if d_subs else 0
        d_pass = round(len([a for a in d_attempts if (a.percentage or 0) >= 60]) / d_subs * 100, 1) if d_subs else 0
        departments_data.append({
            "name": dept,
            "studentCount": len(val["students"]),
            "avgScore": d_avg,
            "passRate": d_pass,
            "testsTaken": d_subs
        })

    # Batch breakdown with performance
    batch_map = {}
    for s in students:
        batch = s.batch or "General"
        if batch not in batch_map:
            batch_map[batch] = {"students": [], "attempts": []}
        batch_map[batch]["students"].append(s)

    student_id_to_batch = {s.id: s.batch or "General" for s in students}
    for a in submitted_attempts:
        batch = student_id_to_batch.get(a.studentId, "General")
        if batch in batch_map:
            batch_map[batch]["attempts"].append(a)

    batches_data = []
    for batch, val in batch_map.items():
        b_attempts = val["attempts"]
        b_subs = len(b_attempts)
        b_avg = round(sum(a.percentage or 0 for a in b_attempts) / b_subs, 1) if b_subs else 0
        b_pass = round(len([a for a in b_attempts if (a.percentage or 0) >= 60]) / b_subs * 100, 1) if b_subs else 0
        batches_data.append({
            "name": batch,
            "studentCount": len(val["students"]),
            "avgScore": b_avg,
            "passRate": b_pass
        })

    # Test Summaries
    test_summaries = []
    for t in tests:
        t_attempts = [a for a in submitted_attempts if a.testId == t.id]
        subs = len(t_attempts)
        t_avg = round(sum(a.percentage or 0 for a in t_attempts) / subs, 1) if subs else 0
        t_pass = round(len([a for a in t_attempts if (a.percentage or 0) >= 60]) / subs * 100, 1) if subs else 0
        t_viols = sum(a.violations or 0 for a in t_attempts)
        test_summaries.append({
            "id": t.id,
            "title": t.title,
            "submissionsCount": subs,
            "avgScore": t_avg,
            "passRate": t_pass,
            "violations": t_viols
        })

    return {
        "kpis": {
            "totalStudents": len(students),
            "totalTrainers": len(trainers),
            "totalUsers": len(users),
            "totalTests": len(tests),
            "totalQuestions": len(questions),
            "totalSubmissions": total_submissions,
            "submittedAttempts": total_submissions,
            "avgScore": avg_score,
            "passRate": pass_rate,
            "highestScore": highest_score,
            "totalViolations": total_violations
        },
        "roleCounts": role_counts,
        "departmentCounts": dept_counts,
        "batchCounts": batch_counts,
        "questionDifficulty": question_difficulty,
        "departments": departments_data,
        "batches": batches_data,
        "scoreBrackets": score_brackets,
        "testSummaries": test_summaries
    }

# === Materials ===

def format_material(m: models.Material):
    return {
        "id": m.id,
        "title": m.title,
        "description": m.description or "",
        "type": m.type,
        "url": m.url or "",
        "content": m.content or "",
        "uploadedBy": m.uploadedBy,
        "isReleased": bool(m.isReleased),
        "releasedAt": m.releasedAt,
        "assignedBatch": m.assignedBatch,
        "createdAt": m.createdAt,
    }

@app.get("/api/materials")
def get_materials(
    uploadedBy: str = None,
    studentId: str = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer", "student"))
):
    query = db.query(models.Material)
    if current_user.role == "student":
        student = db.query(models.User).filter(models.User.id == current_user.id).first()
        query = query.filter(models.Material.isReleased == True)
        if student and student.batch:
            query = query.filter(
                (models.Material.assignedBatch == None) |
                (models.Material.assignedBatch == student.batch)
            )
        else:
            query = query.filter(models.Material.assignedBatch == None)
    elif uploadedBy:
        query = query.filter(models.Material.uploadedBy == uploadedBy)
    elif studentId:
        student = db.query(models.User).filter(models.User.id == studentId).first()
        query = query.filter(models.Material.isReleased == True)
        if student and student.batch:
            query = query.filter(
                (models.Material.assignedBatch == None) |
                (models.Material.assignedBatch == student.batch)
            )
        else:
            query = query.filter(models.Material.assignedBatch == None)
    return [format_material(m) for m in query.all()]

@app.post("/api/materials")
def create_material(
    material: schemas.MaterialCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer"))
):
    db_mat = models.Material(
        id=material.id,
        title=material.title,
        description=material.description,
        type=material.type,
        url=material.url,
        content=material.content,
        uploadedBy=material.uploadedBy or current_user.id,
        isReleased=False,
        assignedBatch=material.assignedBatch,
        createdAt=material.createdAt or now_iso(),
    )
    db.add(db_mat)
    db.commit()
    db.refresh(db_mat)
    return format_material(db_mat)

@app.put("/api/materials/{material_id}")
def update_material(
    material_id: str, 
    updates: schemas.MaterialUpdate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer"))
):
    db_mat = db.query(models.Material).filter(models.Material.id == material_id).first()
    if not db_mat:
        raise HTTPException(status_code=404, detail="Material not found")
    if updates.title is not None:
        db_mat.title = updates.title
    if updates.description is not None:
        db_mat.description = updates.description
    if updates.url is not None:
        db_mat.url = updates.url
    if updates.content is not None:
        db_mat.content = updates.content
    if updates.isReleased is not None:
        db_mat.isReleased = updates.isReleased
        if updates.isReleased and not db_mat.releasedAt:
            db_mat.releasedAt = now_iso()
        elif not updates.isReleased:
            db_mat.releasedAt = None
    if updates.assignedBatch is not None:
        db_mat.assignedBatch = updates.assignedBatch
    db.commit()
    return format_material(db_mat)

@app.delete("/api/materials/{material_id}")
def delete_material(
    material_id: str, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer"))
):
    db_mat = db.query(models.Material).filter(models.Material.id == material_id).first()
    if not db_mat:
        raise HTTPException(status_code=404, detail="Material not found")
    db.delete(db_mat)
    db.commit()
    return {"status": "deleted"}

# === Analytics ===

def _score_brackets(attempts):
    """Compute score distribution brackets from a list of attempts."""
    brackets = {"80-100": 0, "60-79": 0, "40-59": 0, "0-39": 0}
    for a in attempts:
        p = a.percentage or 0
        if p >= 80:
            brackets["80-100"] += 1
        elif p >= 60:
            brackets["60-79"] += 1
        elif p >= 40:
            brackets["40-59"] += 1
        else:
            brackets["0-39"] += 1
    return brackets


def _parse_duration_minutes(started_at: str, submitted_at: str) -> float:
    """Return duration in minutes between two ISO timestamps, or 0 on error."""
    try:
        s = datetime.datetime.fromisoformat(started_at.replace("Z", "+00:00"))
        e = datetime.datetime.fromisoformat(submitted_at.replace("Z", "+00:00"))
        return max(0, (e - s).total_seconds() / 60)
    except Exception:
        return 0


@app.get("/api/analytics/admin")
def analytics_admin(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin"))
):
    """Platform-wide analytics for the admin role."""
    # --- User counts ---
    total_users = db.query(sa_func.count(models.User.id)).scalar() or 0
    total_students = db.query(sa_func.count(models.User.id)).filter(models.User.role == "student").scalar() or 0
    total_trainers = db.query(sa_func.count(models.User.id)).filter(models.User.role == "trainer").scalar() or 0
    total_institutions = db.query(sa_func.count(models.User.id)).filter(models.User.role == "institution").scalar() or 0

    # --- Content counts ---
    total_tests = db.query(sa_func.count(models.Test.id)).scalar() or 0
    total_questions = db.query(sa_func.count(models.Question.id)).scalar() or 0

    # --- Attempt stats ---
    all_attempts = db.query(models.Attempt).all()
    submitted = [a for a in all_attempts if a.status in ("submitted", "auto_submitted")]
    total_attempts = len(all_attempts)
    submitted_count = len(submitted)
    scores = [a.percentage for a in submitted if a.percentage is not None]
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0
    total_violations = sum(a.violations or 0 for a in all_attempts)
    completion_rate = round(submitted_count / total_attempts * 100, 1) if total_attempts > 0 else 0

    # Avg duration
    durations = []
    for a in submitted:
        if a.startedAt and a.submittedAt:
            d = _parse_duration_minutes(a.startedAt, a.submittedAt)
            if d > 0:
                durations.append(d)
    avg_duration = round(sum(durations) / len(durations), 1) if durations else 0

    # Materials
    materials_published = db.query(sa_func.count(models.Material.id)).filter(models.Material.isReleased == True).scalar() or 0

    # --- Department & Batch counts ---
    dept_rows = db.query(models.User.department, sa_func.count(models.User.id)).filter(
        models.User.role == "student", models.User.department.isnot(None)
    ).group_by(models.User.department).all()
    department_counts = {d: c for d, c in dept_rows if d}

    batch_rows = db.query(models.User.batch, sa_func.count(models.User.id)).filter(
        models.User.role == "student", models.User.batch.isnot(None)
    ).group_by(models.User.batch).all()
    batch_counts = {b: c for b, c in batch_rows if b}

    # --- Score brackets ---
    score_brackets = _score_brackets(submitted)

    # --- Question difficulty ---
    diff_rows = db.query(models.Question.difficulty, sa_func.count(models.Question.id)).group_by(models.Question.difficulty).all()
    question_difficulty = {d: c for d, c in diff_rows}

    # --- Question categories ---
    cat_rows = db.query(models.Question.category, sa_func.count(models.Question.id)).group_by(models.Question.category).all()
    question_categories = [{"category": c, "count": n} for c, n in cat_rows if c]

    # --- Role distribution ---
    role_rows = db.query(models.User.role, sa_func.count(models.User.id)).group_by(models.User.role).all()
    role_distribution = {r: c for r, c in role_rows}

    # --- Auto-submit rate ---
    auto_submitted_count = len([a for a in submitted if a.status == "auto_submitted"])
    manual_submitted_count = submitted_count - auto_submitted_count

    # --- Top / bottom tests ---
    tests = db.query(models.Test).all()
    test_stats = []
    for t in tests:
        t_attempts = [a for a in submitted if a.testId == t.id]
        if not t_attempts:
            continue
        t_scores = [a.percentage for a in t_attempts if a.percentage is not None]
        t_avg = round(sum(t_scores) / len(t_scores), 1) if t_scores else 0
        t_pass = round(len([s for s in t_scores if s >= 60]) / len(t_scores) * 100, 1) if t_scores else 0
        test_stats.append({
            "id": t.id, "title": t.title,
            "avgScore": t_avg, "passRate": t_pass,
            "submissions": len(t_attempts)
        })
    test_stats.sort(key=lambda x: x["avgScore"], reverse=True)
    top_tests = test_stats[:5]
    bottom_tests = list(reversed(test_stats[-5:])) if len(test_stats) >= 5 else list(reversed(test_stats))

    # --- User growth by month ---
    users = db.query(models.User).filter(models.User.role.in_(["student", "trainer"])).all()
    growth_map: Dict[str, Dict[str, int]] = {}
    for u in users:
        try:
            month = u.createdAt[:7] if u.createdAt else "unknown"
        except Exception:
            month = "unknown"
        if month not in growth_map:
            growth_map[month] = {"students": 0, "trainers": 0}
        if u.role == "student":
            growth_map[month]["students"] += 1
        else:
            growth_map[month]["trainers"] += 1
    user_growth = [{"month": m, **v} for m, v in sorted(growth_map.items())]

    # --- Test activity by date ---
    activity_map: Dict[str, Dict[str, int]] = {}
    for a in submitted:
        try:
            date = a.submittedAt[:10] if a.submittedAt else a.startedAt[:10]
        except Exception:
            continue
        if date not in activity_map:
            activity_map[date] = {"submitted": 0, "autoSubmitted": 0}
        if a.status == "auto_submitted":
            activity_map[date]["autoSubmitted"] += 1
        else:
            activity_map[date]["submitted"] += 1
    test_activity = [{"date": d, **v} for d, v in sorted(activity_map.items())]

    return {
        "kpis": {
            "totalUsers": total_users,
            "totalStudents": total_students,
            "totalTrainers": total_trainers,
            "totalInstitutions": total_institutions,
            "totalTests": total_tests,
            "totalQuestions": total_questions,
            "totalAttempts": total_attempts,
            "submittedAttempts": submitted_count,
            "avgScore": avg_score,
            "totalViolations": total_violations,
            "completionRate": completion_rate,
            "avgDuration": avg_duration,
            "materialsPublished": materials_published,
        },
        "departmentCounts": department_counts,
        "batchCounts": batch_counts,
        "scoreBrackets": score_brackets,
        "questionDifficulty": question_difficulty,
        "questionCategories": question_categories,
        "roleDistribution": role_distribution,
        "autoSubmitRate": {"submitted": manual_submitted_count, "autoSubmitted": auto_submitted_count},
        "topTests": top_tests,
        "bottomTests": bottom_tests,
        "userGrowth": user_growth,
        "testActivity": test_activity,
    }


@app.get("/api/analytics/institution")
def analytics_institution(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("institution"))
):
    """Campus-level analytics for the institution role."""
    # --- User counts ---
    total_students = db.query(sa_func.count(models.User.id)).filter(models.User.role == "student").scalar() or 0
    total_trainers = db.query(sa_func.count(models.User.id)).filter(models.User.role == "trainer").scalar() or 0

    # --- Attempt stats ---
    all_attempts = db.query(models.Attempt).all()
    submitted = [a for a in all_attempts if a.status in ("submitted", "auto_submitted")]
    total_submissions = len(submitted)
    scores = [a.percentage for a in submitted if a.percentage is not None]
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0
    pass_count = len([s for s in scores if s >= 60])
    pass_rate = round(pass_count / len(scores) * 100, 1) if scores else 0
    total_violations = sum(a.violations or 0 for a in all_attempts)

    # Active tests
    now = now_iso()
    active_tests = db.query(sa_func.count(models.Schedule.id)).filter(
        models.Schedule.startTime <= now, models.Schedule.endTime >= now
    ).scalar() or 0

    # Avg attempts per student
    unique_students = len(set(a.studentId for a in all_attempts))
    avg_attempts_per_student = round(len(all_attempts) / unique_students, 1) if unique_students > 0 else 0

    # --- Department breakdown ---
    students = db.query(models.User).filter(models.User.role == "student").all()
    student_map = {s.id: s for s in students}

    dept_data: Dict[str, Dict[str, Any]] = {}
    for s in students:
        dept = s.department or "Unassigned"
        if dept not in dept_data:
            dept_data[dept] = {"students": 0, "attempts": 0, "scores": [], "pass_count": 0}
        dept_data[dept]["students"] += 1

    for a in submitted:
        s = student_map.get(a.studentId)
        dept = (s.department if s else None) or "Unassigned"
        if dept not in dept_data:
            dept_data[dept] = {"students": 0, "attempts": 0, "scores": [], "pass_count": 0}
        dept_data[dept]["attempts"] += 1
        if a.percentage is not None:
            dept_data[dept]["scores"].append(a.percentage)
            if a.percentage >= 60:
                dept_data[dept]["pass_count"] += 1

    departments = []
    for dept, d in dept_data.items():
        dept_scores = d["scores"]
        departments.append({
            "department": dept,
            "students": d["students"],
            "attempts": d["attempts"],
            "avgScore": round(sum(dept_scores) / len(dept_scores), 1) if dept_scores else 0,
            "passRate": round(d["pass_count"] / len(dept_scores) * 100, 1) if dept_scores else 0,
        })

    # --- Batch breakdown ---
    batch_data: Dict[str, Dict[str, Any]] = {}
    for s in students:
        b = s.batch or "Unassigned"
        if b not in batch_data:
            batch_data[b] = {"students": 0, "attempts": 0, "scores": [], "pass_count": 0}
        batch_data[b]["students"] += 1

    for a in submitted:
        s = student_map.get(a.studentId)
        b = (s.batch if s else None) or "Unassigned"
        if b not in batch_data:
            batch_data[b] = {"students": 0, "attempts": 0, "scores": [], "pass_count": 0}
        batch_data[b]["attempts"] += 1
        if a.percentage is not None:
            batch_data[b]["scores"].append(a.percentage)
            if a.percentage >= 60:
                batch_data[b]["pass_count"] += 1

    batches = []
    for batch, d in batch_data.items():
        b_scores = d["scores"]
        batches.append({
            "batch": batch,
            "students": d["students"],
            "attempts": d["attempts"],
            "avgScore": round(sum(b_scores) / len(b_scores), 1) if b_scores else 0,
            "passRate": round(d["pass_count"] / len(b_scores) * 100, 1) if b_scores else 0,
        })

    # --- Score brackets ---
    score_brackets = _score_brackets(submitted)

    # --- Trainer effectiveness ---
    trainers = db.query(models.User).filter(models.User.role == "trainer").all()
    tests = db.query(models.Test).all()
    test_map = {t.id: t for t in tests}
    trainer_eff = []
    for tr in trainers:
        tr_tests = [t for t in tests if t.createdBy == tr.id]
        tr_test_ids = {t.id for t in tr_tests}
        tr_attempts = [a for a in submitted if a.testId in tr_test_ids]
        tr_scores = [a.percentage for a in tr_attempts if a.percentage is not None]
        trainer_eff.append({
            "id": tr.id,
            "name": tr.name,
            "testsCreated": len(tr_tests),
            "submissions": len(tr_attempts),
            "avgStudentScore": round(sum(tr_scores) / len(tr_scores), 1) if tr_scores else 0,
            "passRate": round(len([s for s in tr_scores if s >= 60]) / len(tr_scores) * 100, 1) if tr_scores else 0,
        })

    # --- Material stats ---
    materials = db.query(models.Material).all()
    material_stats = {
        "total": len(materials),
        "released": len([m for m in materials if m.isReleased]),
        "byType": {
            "pdf": len([m for m in materials if m.type == "pdf"]),
            "video": len([m for m in materials if m.type == "video"]),
            "link": len([m for m in materials if m.type == "link"]),
            "note": len([m for m in materials if m.type == "note"]),
        }
    }

    # --- At-risk students (avg < 40% or violations > 3) ---
    at_risk = []
    for s in students:
        s_attempts = [a for a in submitted if a.studentId == s.id]
        s_scores = [a.percentage for a in s_attempts if a.percentage is not None]
        s_avg = round(sum(s_scores) / len(s_scores), 1) if s_scores else 0
        s_violations = sum(a.violations or 0 for a in s_attempts)
        last_active = max((a.submittedAt or a.startedAt for a in s_attempts), default=None) if s_attempts else None
        if s_avg < 40 or s_violations > 3 or (not s_attempts):
            at_risk.append({
                "id": s.id,
                "name": s.name,
                "studentId": s.studentId,
                "department": s.department or "—",
                "batch": s.batch or "—",
                "avgScore": s_avg,
                "attempts": len(s_attempts),
                "violations": s_violations,
                "lastActive": last_active,
            })

    return {
        "kpis": {
            "totalStudents": total_students,
            "totalTrainers": total_trainers,
            "totalSubmissions": total_submissions,
            "avgScore": avg_score,
            "passRate": pass_rate,
            "totalViolations": total_violations,
            "activeTests": active_tests,
            "avgAttemptsPerStudent": avg_attempts_per_student,
        },
        "departments": departments,
        "batches": batches,
        "scoreBrackets": score_brackets,
        "trainerEffectiveness": trainer_eff,
        "materialStats": material_stats,
        "atRiskStudents": at_risk,
    }


@app.get("/api/analytics/trainer")
def analytics_trainer(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("trainer", "admin", "institution"))
):
    """Assessment-level analytics scoped to the current trainer's tests."""
    trainer_id = current_user.id

    # --- Trainer's tests ---
    my_tests = db.query(models.Test).filter(models.Test.createdBy == trainer_id).all()
    my_test_ids = {t.id for t in my_tests}

    # --- All attempts on trainer's tests ---
    all_attempts = db.query(models.Attempt).filter(models.Attempt.testId.in_(my_test_ids)).all() if my_test_ids else []
    submitted = [a for a in all_attempts if a.status in ("submitted", "auto_submitted")]
    scores = [a.percentage for a in submitted if a.percentage is not None]

    avg_score = round(sum(scores) / len(scores), 1) if scores else 0
    pass_rate = round(len([s for s in scores if s >= 60]) / len(scores) * 100, 1) if scores else 0
    highest = round(max(scores), 1) if scores else 0
    lowest = round(min(scores), 1) if scores else 0
    median_score = round(calc_median(scores), 1) if scores else 0
    total_violations = sum(a.violations or 0 for a in all_attempts)

    # Avg duration
    durations = []
    for a in submitted:
        if a.startedAt and a.submittedAt:
            d = _parse_duration_minutes(a.startedAt, a.submittedAt)
            if d > 0:
                durations.append(d)
    avg_duration = round(sum(durations) / len(durations), 1) if durations else 0

    # Questions created by this trainer
    my_banks = db.query(models.QuestionBank).filter(models.QuestionBank.uploadedBy == trainer_id).all()
    my_bank_ids = {b.id for b in my_banks}
    questions_created = db.query(sa_func.count(models.Question.id)).filter(
        models.Question.questionBankId.in_(my_bank_ids)
    ).scalar() if my_bank_ids else 0

    # --- Per-test summaries ---
    test_summaries = []
    for t in my_tests:
        t_attempts = [a for a in submitted if a.testId == t.id]
        t_scores = [a.percentage for a in t_attempts if a.percentage is not None]
        t_avg = round(sum(t_scores) / len(t_scores), 1) if t_scores else 0
        t_pass = round(len([s for s in t_scores if s >= 60]) / len(t_scores) * 100, 1) if t_scores else 0
        t_violations = sum(a.violations or 0 for a in t_attempts)
        t_durations = []
        for a in t_attempts:
            if a.startedAt and a.submittedAt:
                d = _parse_duration_minutes(a.startedAt, a.submittedAt)
                if d > 0:
                    t_durations.append(d)
        t_avg_dur = round(sum(t_durations) / len(t_durations), 1) if t_durations else 0
        test_summaries.append({
            "id": t.id, "title": t.title,
            "submissionsCount": len(t_attempts),
            "avgScore": t_avg, "passRate": t_pass,
            "violations": t_violations,
            "avgDuration": t_avg_dur,
        })

    # --- Score brackets ---
    score_brackets = _score_brackets(submitted)

    # --- Question-level analysis ---
    # Gather all question IDs from trainer's tests
    all_q_ids = set()
    for t in my_tests:
        try:
            qids = [q.strip() for q in (t.questionIds or "").split(",") if q.strip()]
            all_q_ids.update(qids)
        except Exception:
            pass

    questions = db.query(models.Question).filter(models.Question.id.in_(all_q_ids)).all() if all_q_ids else []
    question_map = {q.id: q for q in questions}

    # Get all answer records for submitted attempts
    submitted_ids = [a.id for a in submitted]
    answer_records = db.query(models.AnswerRecord).filter(
        models.AnswerRecord.attemptId.in_(submitted_ids)
    ).all() if submitted_ids else []

    # Group answer records by question
    q_answers: Dict[str, list] = {}
    for ar in answer_records:
        if ar.questionId not in q_answers:
            q_answers[ar.questionId] = []
        q_answers[ar.questionId].append(ar)

    question_analysis = []
    for qid in all_q_ids:
        q = question_map.get(qid)
        if not q:
            continue
        answers = q_answers.get(qid, [])
        total_ans = len(answers)
        if total_ans == 0:
            continue
        correct = len([a for a in answers if a.selectedOption == q.correctAnswer])
        wrong = len([a for a in answers if a.selectedOption and a.selectedOption != q.correctAnswer])
        skipped = len([a for a in answers if not a.selectedOption])
        opt_dist = {"A": 0, "B": 0, "C": 0, "D": 0}
        for a in answers:
            if a.selectedOption in opt_dist:
                opt_dist[a.selectedOption] += 1
        question_analysis.append({
            "id": q.id,
            "questionText": q.question[:120] + ("..." if len(q.question) > 120 else ""),
            "category": q.category,
            "difficulty": q.difficulty,
            "correctRate": round(correct / total_ans * 100, 1),
            "wrongRate": round(wrong / total_ans * 100, 1),
            "skipRate": round(skipped / total_ans * 100, 1),
            "optionDistribution": opt_dist,
            "correctAnswer": q.correctAnswer,
            "totalResponses": total_ans,
        })

    # --- Category performance ---
    cat_perf: Dict[str, Dict[str, Any]] = {}
    for qa in question_analysis:
        cat = qa["category"]
        if cat not in cat_perf:
            cat_perf[cat] = {"totalQuestions": 0, "correctRates": []}
        cat_perf[cat]["totalQuestions"] += 1
        cat_perf[cat]["correctRates"].append(qa["correctRate"])
    category_performance = []
    for cat, d in cat_perf.items():
        rates = d["correctRates"]
        category_performance.append({
            "category": cat,
            "totalQuestions": d["totalQuestions"],
            "avgScore": round(sum(rates) / len(rates), 1) if rates else 0,
            "correctRate": round(sum(rates) / len(rates), 1) if rates else 0,
        })

    # --- Attempt status breakdown ---
    attempt_status = {
        "submitted": len([a for a in all_attempts if a.status == "submitted"]),
        "autoSubmitted": len([a for a in all_attempts if a.status == "auto_submitted"]),
        "inProgress": len([a for a in all_attempts if a.status == "in_progress"]),
    }

    # --- Answer status breakdown ---
    answer_status = {"answered": 0, "notVisited": 0, "visited": 0, "marked": 0}
    for ar in answer_records:
        if ar.status == "answered":
            answer_status["answered"] += 1
        elif ar.status == "not_visited":
            answer_status["notVisited"] += 1
        elif ar.status == "visited":
            answer_status["visited"] += 1
        elif ar.status == "marked":
            answer_status["marked"] += 1

    # --- Time distribution (5-min buckets) ---
    time_buckets: Dict[int, int] = {}
    for d in durations:
        bucket = int(d // 5) * 5
        time_buckets[bucket] = time_buckets.get(bucket, 0) + 1
    time_distribution = [{"minutes": m, "count": c} for m, c in sorted(time_buckets.items())]

    return {
        "kpis": {
            "totalTests": len(my_tests),
            "totalSubmissions": len(submitted),
            "avgScore": avg_score,
            "passRate": pass_rate,
            "highestScore": highest,
            "lowestScore": lowest,
            "medianScore": median_score,
            "avgDuration": avg_duration,
            "totalViolations": total_violations,
            "questionsCreated": questions_created,
        },
        "testSummaries": test_summaries,
        "scoreBrackets": score_brackets,
        "questionAnalysis": question_analysis,
        "categoryPerformance": category_performance,
        "attemptStatusBreakdown": attempt_status,
        "answerStatusBreakdown": answer_status,
        "timeDistribution": time_distribution,
    }


# === Student Endpoints ===

@app.get("/api/student/dashboard/{student_id}")
def get_student_dashboard(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer", "student"))
):
    student = db.query(models.User).filter(models.User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Get student attempts
    attempts = db.query(models.Attempt).filter(models.Attempt.studentId == student_id).all()
    submitted_attempts = [a for a in attempts if a.status in ("submitted", "auto_submitted")]
    
    # Get all tests & schedules
    tests = db.query(models.Test).all()
    test_map = {t.id: t for t in tests}
    schedules = db.query(models.Schedule).all()
    
    now = now_iso()
    
    # Upcoming & Live tests assigned to this student / student's batch
    upcoming_tests = []
    for s in schedules:
        test = test_map.get(s.testId)
        if not test:
            continue
        
        # Check batch/student assignment
        if s.assignedBatch and s.assignedBatch != "all" and student.batch and student.batch != s.assignedBatch:
            continue
        
        assigned_students = []
        if s.assignedStudents:
            try:
                assigned_students = json.loads(s.assignedStudents)
            except Exception:
                assigned_students = [x.strip() for x in s.assignedStudents.split(",") if x.strip()]
        
        if assigned_students and "all" not in assigned_students and student_id not in assigned_students:
            continue

        # Check attempt
        attempt = next((a for a in attempts if (getattr(a, "scheduleId", None) == s.id) or (a.testId == s.testId and a.startedAt >= s.startTime)), None)
        if not attempt:
            attempt = next((a for a in attempts if a.testId == s.testId), None)
            
        is_completed = attempt and attempt.status in ("submitted", "auto_submitted")
        is_available = s.startTime <= now <= s.endTime and not is_completed

        upcoming_tests.append({
            "schedule": format_schedule(s),
            "test": format_test(test),
            "attempt": format_attempt(attempt, db) if attempt else None,
            "isAvailable": is_available
        })

    # Past exams
    past_exams = []
    for a in submitted_attempts:
        test = test_map.get(a.testId)
        if test:
            past_exams.append({
                "attempt": format_attempt(a, db),
                "test": format_test(test)
            })

    # Stats
    scores = [a.percentage for a in submitted_attempts if a.percentage is not None]
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0
    highest_score = round(max(scores), 1) if scores else 0

    return {
        "upcoming_tests": upcoming_tests,
        "past_exams": past_exams,
        "stats": {
            "totalCompleted": len(submitted_attempts),
            "averageScore": avg_score,
            "highestScore": highest_score
        }
    }


@app.get("/api/student/analytics/{student_id}")
def get_student_analytics(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer", "student"))
):
    student = db.query(models.User).filter(models.User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    attempts = db.query(models.Attempt).filter(models.Attempt.studentId == student_id).all()
    submitted = [a for a in attempts if a.status in ("submitted", "auto_submitted")]
    scores = [a.percentage for a in submitted if a.percentage is not None]
    
    tests = db.query(models.Test).all()
    test_map = {t.id: t for t in tests}

    history = []
    for a in submitted:
        test = test_map.get(a.testId)
        history.append({
            "testTitle": test.title if test else "Assessment",
            "score": a.score,
            "percentage": a.percentage,
            "submittedAt": a.submittedAt or a.startedAt,
            "violations": a.violations or 0
        })

    return {
        "totalCompleted": len(submitted),
        "avgScore": round(sum(scores) / len(scores), 1) if scores else 0,
        "highestScore": round(max(scores), 1) if scores else 0,
        "totalViolations": sum(a.violations or 0 for a in attempts),
        "history": history
    }
