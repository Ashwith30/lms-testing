import json
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional, Any, Union
import models
import schemas
from database import get_db
from auth import get_current_user, require_roles

router = APIRouter(prefix="/api", tags=["questions"])

@router.get("/question-banks", response_model=List[schemas.QuestionBank])
def get_question_banks(
    uploadedBy: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer"))
):
    query = db.query(models.QuestionBank)
    if uploadedBy:
        query = query.filter(models.QuestionBank.ownerId == uploadedBy)
    return query.all()

@router.post("/question-banks", response_model=schemas.QuestionBank)
def create_question_bank(
    bank: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer"))
):
    bank_id = bank.get("id") or models.generate_uuid("qb-")
    owner_id = bank.get("uploadedBy") or bank.get("ownerId") or current_user.id
    now = models.get_utc_now()
    
    db_bank = models.QuestionBank(
        id=bank_id,
        name=bank.get("name", "Untitled Question Bank"),
        description=bank.get("description"),
        courseId=bank.get("courseId"),
        topicId=bank.get("topicId"),
        ownerId=owner_id,
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
        
    db.delete(db_bank)
    db.commit()
    return {"message": "Deleted"}

@router.get("/questions", response_model=List[schemas.Question])
def get_questions(
    bankId: Optional[str] = None,
    questionBankId: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.Question)
    target_bank = bankId or questionBankId
    if target_bank:
        query = query.filter(models.Question.questionBankId == target_bank)
    return query.all()

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
    if isinstance(body, list):
        created_list = []
        for item in body:
            q = _create_single_question(db, item, default_bank_id=bankId)
            created_list.append(q)
        db.commit()
        for q in created_list:
            db.refresh(q)
        return created_list
    elif isinstance(body, dict):
        q = _create_single_question(db, body, default_bank_id=bankId)
        db.commit()
        db.refresh(q)
        return q
    else:
        raise HTTPException(status_code=400, detail="Invalid request payload format")

@router.delete("/questions/{question_id}")
def delete_question(
    question_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer"))
):
    db_q = db.query(models.Question).filter(models.Question.id == question_id).first()
    if not db_q:
        raise HTTPException(status_code=404, detail="Question not found")
        
    db.delete(db_q)
    db.commit()
    return {"message": "Deleted"}
