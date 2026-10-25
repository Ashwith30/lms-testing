import json
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional, Any, Union
import models
import schemas
from database import get_db
from auth import (
    get_current_user,
    require_roles,
    check_trainer_question_bank_access,
    check_trainer_question_access,
    get_user_institution_id
)

router = APIRouter(prefix="/api", tags=["questions"])

@router.get("/question-banks", response_model=Union[schemas.PaginatedResponse[schemas.QuestionBank], List[schemas.QuestionBank]])
def get_question_banks(
    uploadedBy: Optional[str] = None,
    page: Optional[int] = None,
    limit: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer"))
):
    query = db.query(models.QuestionBank)
    if uploadedBy:
        query = query.filter(models.QuestionBank.ownerId == uploadedBy)

    if current_user.role == "institution":
        query = query.filter(
            or_(
                models.QuestionBank.isPublic == True,
                models.QuestionBank.institutionId == current_user.id,
                models.QuestionBank.ownerId == current_user.id
            )
        )
    elif current_user.role == "trainer" and not uploadedBy:
        trainer_inst = get_user_institution_id(current_user, db)
        query = query.filter(
            or_(
                models.QuestionBank.isPublic == True,
                models.QuestionBank.ownerId == current_user.id,
                (models.QuestionBank.institutionId == trainer_inst) if trainer_inst else False
            )
        )

    if page is not None:
        p = max(1, page)
        l = max(1, limit) if limit else 50
        total = query.count()
        items = query.offset((p - 1) * l).limit(l).all()
        return {"data": items, "total": total, "page": p, "limit": l}
    return query.all()

@router.post("/question-banks", response_model=schemas.QuestionBank)
def create_question_bank(
    bank: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer"))
):
    bank_id = bank.get("id") or models.generate_uuid("qb-")
    # Prevent trainer identity spoofing: trainers always own their created question banks
    if current_user.role == "trainer":
        owner_id = current_user.id
    else:
        owner_id = bank.get("uploadedBy") or bank.get("ownerId") or current_user.id
    now = models.get_utc_now()
    inst_id = bank.get("institutionId") or (current_user.id if current_user.role == "institution" else get_user_institution_id(current_user, db))
    
    db_bank = models.QuestionBank(
        id=bank_id,
        name=bank.get("name", "Untitled Question Bank"),
        description=bank.get("description"),
        courseId=bank.get("courseId"),
        topicId=bank.get("topicId"),
        ownerId=owner_id,
        institutionId=inst_id,
        isPublic=bank.get("isPublic", False),
        createdAt=bank.get("createdAt") or now,
        updatedAt=now
    )
    db.add(db_bank)
    db.commit()
    db.refresh(db_bank)
    return db_bank

@router.delete("/question-banks/{bank_id}")
def delete_question_bank(
    bank_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer"))
):
    db_bank = db.query(models.QuestionBank).filter(models.QuestionBank.id == bank_id).first()
    if not db_bank:
        raise HTTPException(status_code=404, detail="Question bank not found")
        
    if current_user.role == "trainer":
        if not check_trainer_question_bank_access(current_user, db_bank, db, for_deletion=True):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You are not authorized to delete this question bank."
            )

    # Integrity check: do not cascade delete if any questions are assigned to tests or have student answers
    q_ids = [row[0] for row in db.query(models.Question.id).filter(models.Question.questionBankId == bank_id).all()]
    if q_ids:
        existing_tq = db.query(models.TestQuestion).filter(models.TestQuestion.questionId.in_(q_ids)).first()
        if existing_tq:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cannot delete question bank containing questions currently assigned to one or more assessments."
            )

        existing_ans = db.query(models.Answer).filter(models.Answer.questionId.in_(q_ids)).first()
        if existing_ans:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cannot delete question bank containing questions with existing assessment attempts. Completed attempts are permanent assessment records."
            )

    db.delete(db_bank)
    db.commit()
    return {"message": "Deleted"}

@router.get("/questions", response_model=Union[schemas.PaginatedResponse[schemas.Question], List[schemas.Question]])
def get_questions(
    bankId: Optional[str] = None,
    questionBankId: Optional[str] = None,
    page: Optional[int] = None,
    limit: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer"))
):
    query = db.query(models.Question)
    target_bank = bankId or questionBankId
    if target_bank:
        query = query.filter(models.Question.questionBankId == target_bank)
    if page is not None:
        p = max(1, page)
        l = max(1, limit) if limit else 50
        total = query.count()
        items = query.offset((p - 1) * l).limit(l).all()
        return {"data": items, "total": total, "page": p, "limit": l}
    return query.all()

@router.get("/tests/{test_id}/attempt-questions", response_model=List[schemas.ExamQuestion])
@router.get("/tests/{test_id}/questions", response_model=List[schemas.ExamQuestion])
@router.get("/questions/attempt/{test_id}", response_model=List[schemas.ExamQuestion])
def get_exam_attempt_questions(
    test_id: str,
    scheduleId: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Dedicated exam-attempt endpoint for students taking a test.
    Returns only sanitized questions and permitted options (letters and text).
    Never exposes correctAnswer, explanation, or isCorrect flags.
    Enforces test publishing status, student batch/student assignment, and schedule time window.
    """
    test = db.query(models.Test).filter(models.Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    # If student, enforce authorization, assignment, and schedule window
    if current_user.role == "student":
        if (test.status or "").lower() != "published":
            raise HTTPException(status_code=403, detail="Test is not published.")

        sched_query = db.query(models.Schedule).filter(models.Schedule.testId == test_id)
        if scheduleId:
            sched_query = sched_query.filter(models.Schedule.id == scheduleId)
        
        all_schedules = sched_query.all()
        if not all_schedules:
            raise HTTPException(status_code=403, detail="This test is not currently scheduled.")

        # Filter schedules assigned to this student
        assigned_schedules = []
        for s in all_schedules:
            assigned_batch = s.assignedBatch
            assigned_students = s.assignedStudents
            
            is_assigned = True
            if assigned_batch and str(assigned_batch).strip().lower() != "all":
                if not current_user.batch or current_user.batch.strip().lower() != str(assigned_batch).strip().lower():
                    is_assigned = False
            
            if assigned_students and len(assigned_students) > 0 and "all" not in assigned_students:
                if current_user.id not in assigned_students:
                    is_assigned = False

            if is_assigned:
                assigned_schedules.append(s)

        if not assigned_schedules:
            raise HTTPException(status_code=403, detail="Student is not assigned to this scheduled test session.")

        # Check time window and attempts on assigned schedules
        now = models.get_utc_now()
        active_sched = None
        has_future_schedule = False
        has_expired_schedule = False

        for s in assigned_schedules:
            # Check if student has an existing in-progress attempt for this test/schedule
            in_prog = db.query(models.Attempt).filter(
                models.Attempt.studentId == current_user.id,
                models.Attempt.scheduleId == s.id,
                models.Attempt.status == "in_progress"
            ).first()

            # Check attempt limit
            submitted_count = db.query(models.Attempt).filter(
                models.Attempt.studentId == current_user.id,
                models.Attempt.scheduleId == s.id,
                models.Attempt.status.in_(["submitted", "auto_submitted"])
            ).count()

            if submitted_count >= (s.attemptsAllowed or 1) and not in_prog:
                continue

            if in_prog:
                active_sched = s
                break

            if now < s.startTime:
                has_future_schedule = True
            elif now > s.endTime:
                has_expired_schedule = True
            else:
                active_sched = s
                break

        if not active_sched:
            if has_future_schedule:
                raise HTTPException(status_code=403, detail="Scheduled test has not started yet.")
            elif has_expired_schedule:
                raise HTTPException(status_code=403, detail="Scheduled test session has expired.")
            else:
                raise HTTPException(status_code=403, detail="Maximum allowed attempts reached for this test.")

    test_questions = db.query(models.TestQuestion).filter(
        models.TestQuestion.testId == test_id
    ).order_by(models.TestQuestion.orderIndex).all()

    sanitized_questions = []
    for tq in test_questions:
        q = db.query(models.Question).filter(models.Question.id == tq.questionId).first()
        if not q:
            continue

        # Extract only permitted option mappings (e.g. {"A": "Text", "B": "Text"}), never isCorrect
        safe_options = {}
        if q.question_options:
            letters = ["A", "B", "C", "D", "E", "F", "G", "H"]
            for idx, opt in enumerate(q.question_options):
                if idx < len(letters):
                    safe_options[letters[idx]] = opt.optionText
        elif isinstance(q.options, dict):
            safe_options = q.options

        sanitized_questions.append({
            "id": q.id,
            "type": q.type or "MCQ",
            "text": q.text,
            "question": q.question or q.text,
            "mediaUrl": q.mediaUrl,
            "difficulty": q.difficulty or "Medium",
            "marks": float(q.marks or 1.0),
            "category": q.category,
            "options": safe_options
        })

    return sanitized_questions

def _create_single_question(db: Session, q_data: dict, default_bank_id: Optional[str] = None) -> models.Question:
    target_bank_id = q_data.get("questionBankId") or default_bank_id
    if not target_bank_id:
        raise HTTPException(status_code=400, detail="questionBankId or bankId required for question creation")
        
    q_id = q_data.get("id") or models.generate_uuid("q-")
    text = q_data.get("text") or q_data.get("question") or "Question"
    
    tags = q_data.get("tags")
    category = q_data.get("category")
    if not tags and category:
        tags = json.dumps([category])
    elif isinstance(tags, list):
        tags = json.dumps(tags)

    db_q = models.Question(
        id=q_id,
        questionBankId=target_bank_id,
        type=q_data.get("type", "MCQ"),
        text=text,
        mediaUrl=q_data.get("mediaUrl"),
        difficulty=q_data.get("difficulty", "Medium"),
        marks=float(q_data.get("marks", 1.0)),
        explanation=q_data.get("explanation"),
        tags=tags
    )
    db.add(db_q)

    # Process options: support dict {"A": "text", "B": "text"} or list [{"optionText": "text", "isCorrect": bool}]
    raw_options = q_data.get("options")
    correct_ans = q_data.get("correctAnswer") # e.g. "B" or option index

    if isinstance(raw_options, dict):
        letters = ["A", "B", "C", "D", "E", "F", "G", "H"]
        # Ensure ordered items
        ordered_keys = sorted(raw_options.keys()) if all(k in letters for k in raw_options.keys()) else list(raw_options.keys())
        for idx, key in enumerate(ordered_keys):
            opt_val = raw_options[key]
            opt_text = opt_val if isinstance(opt_val, str) else str(opt_val)
            is_corr = (str(correct_ans).upper() == str(key).upper())
            db_opt = models.QuestionOption(
                id=f"opt-{q_id}-{idx}",
                questionId=q_id,
                optionText=opt_text,
                isCorrect=is_corr,
                orderIndex=idx
            )
            db.add(db_opt)

    elif isinstance(raw_options, list):
        for idx, opt in enumerate(raw_options):
            if isinstance(opt, dict):
                opt_text = opt.get("optionText") or opt.get("text") or ""
                is_corr = opt.get("isCorrect", False)
                if not is_corr and correct_ans is not None:
                    letters = ["A", "B", "C", "D", "E", "F", "G", "H"]
                    if idx < len(letters) and str(correct_ans).upper() == letters[idx]:
                        is_corr = True
                    elif str(correct_ans) == str(idx):
                        is_corr = True
                db_opt = models.QuestionOption(
                    id=f"opt-{q_id}-{idx}",
                    questionId=q_id,
                    optionText=opt_text,
                    isCorrect=is_corr,
                    orderIndex=idx
                )
                db.add(db_opt)
            elif isinstance(opt, str):
                letters = ["A", "B", "C", "D", "E", "F", "G", "H"]
                is_corr = (idx < len(letters) and str(correct_ans).upper() == letters[idx])
                db_opt = models.QuestionOption(
                    id=f"opt-{q_id}-{idx}",
                    questionId=q_id,
                    optionText=opt,
                    isCorrect=is_corr,
                    orderIndex=idx
                )
                db.add(db_opt)

    return db_q

@router.post("/questions")
async def create_questions(
    request: Request,
    bankId: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer"))
):
    body = await request.json()
    items = body if isinstance(body, list) else [body] if isinstance(body, dict) else None
    if items is None:
        raise HTTPException(status_code=400, detail="Invalid request payload format")

    # Validate bank existence and trainer ownership/authorization for all items before insertion
    validated_banks = {}
    for item in items:
        target_bank_id = item.get("questionBankId") or bankId
        if not target_bank_id:
            raise HTTPException(status_code=400, detail="questionBankId or bankId required for question creation")
        
        if target_bank_id not in validated_banks:
            bank = db.query(models.QuestionBank).filter(models.QuestionBank.id == target_bank_id).first()
            if not bank:
                raise HTTPException(status_code=404, detail=f"Question bank '{target_bank_id}' not found")

            if current_user.role == "trainer":
                if not check_trainer_question_bank_access(current_user, bank, db, for_deletion=False):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Access denied: You are not authorized to add questions to this question bank."
                    )
            validated_banks[target_bank_id] = bank

    created_list = []
    for item in items:
        q = _create_single_question(db, item, default_bank_id=bankId)
        created_list.append(q)
    db.commit()
    for q in created_list:
        db.refresh(q)
    return created_list if isinstance(body, list) else created_list[0]

@router.delete("/questions/{question_id}")
def delete_question(
    question_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer"))
):
    db_q = db.query(models.Question).filter(models.Question.id == question_id).first()
    if not db_q:
        raise HTTPException(status_code=404, detail="Question not found")
        
    bank = db_q.bank
    if not bank and db_q.questionBankId:
        bank = db.query(models.QuestionBank).filter(models.QuestionBank.id == db_q.questionBankId).first()

    if current_user.role == "trainer":
        if not check_trainer_question_bank_access(current_user, bank, db, for_deletion=True):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You are not authorized to delete questions from this question bank."
            )

    # Check if question is currently assigned to any tests/assessments
    existing_tq = db.query(models.TestQuestion).filter(models.TestQuestion.questionId == question_id).first()
    if existing_tq:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete question that is currently assigned to one or more assessments."
        )

    # Check if question has student answers in attempts
    existing_ans = db.query(models.Answer).filter(models.Answer.questionId == question_id).first()
    if existing_ans:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete question with existing assessment attempts. Completed attempts are permanent assessment records."
        )

    db.delete(db_q)
    db.commit()
    return {"message": "Deleted"}

