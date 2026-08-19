import json
import datetime
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any

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
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer", "student"))
):
    query = db.query(models.Attempt)
    if current_user.role == "student":
        query = query.filter(models.Attempt.studentId == current_user.id)
    elif studentId:
        query = query.filter(models.Attempt.studentId == studentId)
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
