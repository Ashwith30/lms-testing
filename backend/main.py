import json
import datetime
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

from . import models, schemas
from .database import engine, get_db

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

@app.post("/api/auth/login", response_model=schemas.User)
def login(creds: dict, db: Session = Depends(get_db)):
    identifier = creds.get("identifier")
    password = creds.get("password")
    
    # Check DB user by email or studentId
    user = db.query(models.User).filter(
        (models.User.email == identifier) | (models.User.studentId == identifier)
    ).first()
    
    if user:
        if user.password == password:
            return user
            
    raise HTTPException(status_code=401, detail="Invalid credentials")

@app.post("/api/auth/register/student", response_model=schemas.User)
def register_student(student: dict, db: Session = Depends(get_db)):
    email = student.get("email")
    student_id = student.get("studentId")
    
    # Check if student with email or studentId already exists
    existing_email = db.query(models.User).filter(models.User.email == email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="A user with this email address already exists.")
        
    existing_id = db.query(models.User).filter(models.User.studentId == student_id).first()
    if existing_id:
        raise HTTPException(status_code=400, detail="A user with this Student ID already exists.")
        
    db_student = models.User(
        id=f"u-student-{int(datetime.datetime.utcnow().timestamp() * 1000)}",
        name=student.get("name"),
        email=email,
        role="student",
        studentId=student_id,
        department=student.get("department"),
        batch=student.get("batch"),
        password=student.get("password"),
        createdAt=datetime.datetime.utcnow().isoformat()
    )
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    return db_student

@app.post("/api/auth/register/trainer", response_model=schemas.User)
def register_trainer(trainer: dict, db: Session = Depends(get_db)):
    email = trainer.get("email")
    
    # Check if trainer with email already exists
    existing_email = db.query(models.User).filter(models.User.email == email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="A user with this email address already exists.")
        
    db_trainer = models.User(
        id=f"u-trainer-{int(datetime.datetime.utcnow().timestamp() * 1000)}",
        name=trainer.get("name"),
        email=email,
        role="trainer",
        password=trainer.get("password"),
        createdAt=datetime.datetime.utcnow().isoformat()
    )
    db.add(db_trainer)
    db.commit()
    db.refresh(db_trainer)
    return db_trainer

@app.get("/api/users", response_model=List[schemas.User])
@app.get("/api/users/all", response_model=List[schemas.User])
def get_all_users(db: Session = Depends(get_db)):
    return db.query(models.User).all()

@app.get("/api/users/{user_id}", response_model=schemas.User)
def get_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# === Questions ===

@app.get("/api/question-banks", response_model=List[schemas.QuestionBank])
def get_question_banks(uploadedBy: str = None, db: Session = Depends(get_db)):
    query = db.query(models.QuestionBank)
    if uploadedBy:
        query = query.filter(models.QuestionBank.uploadedBy == uploadedBy)
    return query.all()

@app.post("/api/question-banks", response_model=schemas.QuestionBank)
def create_question_bank(bank: schemas.QuestionBankCreate, db: Session = Depends(get_db)):
    db_bank = models.QuestionBank(**bank.model_dump())
    db.add(db_bank)
    db.commit()
    db.refresh(db_bank)
    return db_bank

@app.get("/api/questions", response_model=List[schemas.Question])
def get_all_questions(db: Session = Depends(get_db)):
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
def create_questions(questions: List[schemas.QuestionCreate], db: Session = Depends(get_db)):
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

# === Tests ===

def format_test(t: models.Test):
    return {
        "id": t.id,
        "title": t.title,
        "description": t.description,
        "questionIds": json.loads(t.questionIds),
        "totalMarks": t.totalMarks,
        "createdBy": t.createdBy,
        "status": t.status,
        "createdAt": t.createdAt,
        "settings": {
            "duration": t.duration,
            "attemptsAllowed": t.attemptsAllowed,
            "negativeMarking": t.negativeMarking,
            "randomizeQuestions": t.randomizeQuestions,
            "randomizeOptions": t.randomizeOptions,
            "showResultImmediately": t.showResultImmediately,
            "allowBackNavigation": t.allowBackNavigation,
            "fullscreenRequired": t.fullscreenRequired,
            "autoSubmit": t.autoSubmit,
            "enableCalculator": t.enableCalculator,
            "enablePalette": t.enablePalette
        }
    }

@app.get("/api/tests", response_model=List[schemas.Test])
def get_tests(createdBy: str = None, db: Session = Depends(get_db)):
    query = db.query(models.Test)
    if createdBy:
        query = query.filter(models.Test.createdBy == createdBy)
    tests = query.all()
    return [format_test(t) for t in tests]

@app.post("/api/tests", response_model=schemas.Test)
def create_test(test: schemas.TestCreate, db: Session = Depends(get_db)):
    db_test = models.Test(
        id=test.id,
        title=test.title,
        description=test.description,
        questionIds=json.dumps(test.questionIds),
        totalMarks=test.totalMarks,
        createdBy=test.createdBy,
        status=test.status,
        createdAt=test.createdAt,
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

@app.put("/api/tests/{test_id}")
def update_test(test_id: str, updates: dict, db: Session = Depends(get_db)):
    db_test = db.query(models.Test).filter(models.Test.id == test_id).first()
    if not db_test:
        raise HTTPException(status_code=404, detail="Test not found")
    if 'status' in updates:
        db_test.status = updates['status']
    db.commit()
    return {"status": "ok"}

# === Schedules ===

def format_schedule(s: models.Schedule):
    return {
        "id": s.id,
        "testId": s.testId,
        "startTime": s.startTime,
        "endTime": s.endTime,
        "assignedStudents": json.loads(s.assignedStudents),
        "assignedBatch": s.assignedBatch
    }

@app.get("/api/schedules", response_model=List[schemas.Schedule])
def get_schedules(db: Session = Depends(get_db)):
    schedules = db.query(models.Schedule).all()
    return [format_schedule(s) for s in schedules]

@app.post("/api/schedules", response_model=schemas.Schedule)
def create_schedule(schedule: schemas.ScheduleCreate, db: Session = Depends(get_db)):
    db_sched = models.Schedule(
        id=schedule.id,
        testId=schedule.testId,
        startTime=schedule.startTime,
        endTime=schedule.endTime,
        assignedStudents=json.dumps(schedule.assignedStudents),
        assignedBatch=schedule.assignedBatch
    )
    db.add(db_sched)
    db.commit()
    db.refresh(db_sched)
    return format_schedule(db_sched)

# === Attempts ===

def format_attempt(a: models.Attempt, db: Session):
    ans_records = db.query(models.AnswerRecord).filter(models.AnswerRecord.attemptId == a.id).all()
    answers = {}
    for r in ans_records:
        answers[r.questionId] = {
            "questionId": r.questionId,
            "selectedOption": r.selectedOption,
            "status": r.status
        }
        
    return {
        "id": a.id,
        "studentId": a.studentId,
        "testId": a.testId,
        "startedAt": a.startedAt,
        "expiresAt": a.expiresAt,
        "submittedAt": a.submittedAt,
        "score": a.score,
        "percentage": a.percentage,
        "violations": a.violations,
        "status": a.status,
        "answers": answers
    }

@app.get("/api/attempts", response_model=List[schemas.AttemptBase])
def get_attempts(studentId: str = None, db: Session = Depends(get_db)):
    query = db.query(models.Attempt)
    if studentId:
        query = query.filter(models.Attempt.studentId == studentId)
    attempts = query.all()
    return [format_attempt(a, db) for a in attempts]

@app.post("/api/attempts", response_model=schemas.AttemptBase)
def create_attempt(attempt: schemas.AttemptBase, db: Session = Depends(get_db)):
    db_attempt = models.Attempt(
        id=attempt.id,
        studentId=attempt.studentId,
        testId=attempt.testId,
        startedAt=attempt.startedAt,
        expiresAt=attempt.expiresAt,
        status=attempt.status,
        violations=attempt.violations
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
def get_attempt(attempt_id: str, db: Session = Depends(get_db)):
    db_attempt = db.query(models.Attempt).filter(models.Attempt.id == attempt_id).first()
    if not db_attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    return format_attempt(db_attempt, db)

@app.get("/api/student/dashboard/{student_id}")
def get_student_dashboard(student_id: str, db: Session = Depends(get_db)):
    """
    Returns all data needed for the student dashboard in a single call:
    - upcoming_tests: schedules/tests not yet completed
    - past_exams: submitted attempts enriched with test info
    - stats: summary stats (avg score, highest score, total completed)
    """
    # Fetch all attempts for this student
    attempts = db.query(models.Attempt).filter(models.Attempt.studentId == student_id).all()

    # Fetch all schedules and tests
    schedules = db.query(models.Schedule).all()
    tests = db.query(models.Test).all()
    tests_map = {t.id: t for t in tests}

    now = datetime.datetime.utcnow().isoformat()
    attempts_map = {a.testId: a for a in attempts}

    # Build upcoming tests
    upcoming = []
    for s in schedules:
        test = tests_map.get(s.testId)
        if not test:
            continue
        attempt = attempts_map.get(s.testId)
        assigned = json.loads(s.assignedStudents) if s.assignedStudents else []
        # Show test if student is assigned (by ID or batch) and it's not fully submitted
        student_user = db.query(models.User).filter(models.User.id == student_id).first()
        is_assigned = (
            student_id in assigned or
            (student_user and student_user.batch and student_user.batch == s.assignedBatch)
        )
        if not is_assigned:
            continue
        is_available = now >= s.startTime and now <= s.endTime and (not attempt or attempt.status not in ('submitted', 'auto_submitted'))
        upcoming.append({
            "schedule": {
                "id": s.id,
                "testId": s.testId,
                "startTime": s.startTime,
                "endTime": s.endTime,
                "assignedStudents": assigned,
                "assignedBatch": s.assignedBatch
            },
            "test": format_test(test),
            "attempt": format_attempt(attempt, db) if attempt else None,
            "isAvailable": is_available
        })

    # Build past exams (submitted attempts)
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

    # Sort past exams newest first
    past_exams.sort(key=lambda x: x["attempt"]["submittedAt"] or "", reverse=True)

    # Stats
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

@app.put("/api/attempts/{attempt_id}")
def update_attempt(attempt_id: str, updates: schemas.AttemptUpdate, db: Session = Depends(get_db)):
    db_attempt = db.query(models.Attempt).filter(models.Attempt.id == attempt_id).first()
    if not db_attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
        
    if updates.violations is not None:
        db_attempt.violations = updates.violations
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
                
    db.commit()
    return format_attempt(db_attempt, db)

# === Materials ===

def format_material(m: models.Material):
    return {
        "id": m.id,
        "title": m.title,
        "description": m.description,
        "type": m.type,
        "url": m.url,
        "content": m.content,
        "uploadedBy": m.uploadedBy,
        "isReleased": m.isReleased,
        "releasedAt": m.releasedAt,
        "assignedBatch": m.assignedBatch,
        "createdAt": m.createdAt,
    }

@app.get("/api/materials")
def get_materials(
    uploadedBy: str = None,
    studentId: str = None,
    db: Session = Depends(get_db)
):
    """
    - Trainer: pass uploadedBy=trainer_id → returns all materials by that trainer.
    - Student: pass studentId=student_id → returns only released materials for that student's batch.
    """
    query = db.query(models.Material)
    if uploadedBy:
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
def create_material(material: schemas.MaterialCreate, db: Session = Depends(get_db)):
    db_mat = models.Material(
        id=material.id,
        title=material.title,
        description=material.description,
        type=material.type,
        url=material.url,
        content=material.content,
        uploadedBy=material.uploadedBy,
        isReleased=False,
        assignedBatch=material.assignedBatch,
        createdAt=material.createdAt,
    )
    db.add(db_mat)
    db.commit()
    db.refresh(db_mat)
    return format_material(db_mat)

@app.put("/api/materials/{material_id}")
def update_material(material_id: str, updates: schemas.MaterialUpdate, db: Session = Depends(get_db)):
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
            db_mat.releasedAt = datetime.datetime.utcnow().isoformat()
        elif not updates.isReleased:
            db_mat.releasedAt = None
    if updates.assignedBatch is not None:
        db_mat.assignedBatch = updates.assignedBatch
    db.commit()
    return format_material(db_mat)

@app.delete("/api/materials/{material_id}")
def delete_material(material_id: str, db: Session = Depends(get_db)):
    db_mat = db.query(models.Material).filter(models.Material.id == material_id).first()
    if not db_mat:
        raise HTTPException(status_code=404, detail="Material not found")
    db.delete(db_mat)
    db.commit()
    return {"status": "deleted"}
