import json
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
import models
import schemas
from database import get_db
from auth import get_current_user, require_roles

router = APIRouter(prefix="/api/attempts", tags=["attempts"])

@router.get("", response_model=List[schemas.Attempt])
def get_attempts(
    studentId: Optional[str] = None,
    testId: Optional[str] = None,
    scheduleId: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.Attempt)
    
    if current_user.role == "student":
        query = query.filter(models.Attempt.studentId == current_user.id)
    elif studentId:
        query = query.filter(models.Attempt.studentId == studentId)
        
    if scheduleId:
        query = query.filter(models.Attempt.scheduleId == scheduleId)
    if testId:
        # Filter attempts where schedule.testId == testId
        query = query.join(models.Schedule, isouter=True).filter(
            (models.Schedule.testId == testId) | (models.Attempt.scheduleId == None)
        )
        
    return query.all()

@router.post("", response_model=schemas.Attempt)
def create_attempt(
    attempt: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    a_id = attempt.get("id") or models.generate_uuid("att-")
    st_id = attempt.get("studentId") or current_user.id
    
    schedule_id = attempt.get("scheduleId")
    test_id = attempt.get("testId")

    # If testId is provided without scheduleId, find or link an active schedule
    if not schedule_id and test_id:
        active_sched = db.query(models.Schedule).filter(models.Schedule.testId == test_id).first()
        if active_sched:
            schedule_id = active_sched.id
        else:
            # Create a default schedule for direct test attempts
            now = models.get_utc_now()
            end = "2099-12-31T23:59:59Z"
            schedule_id = models.generate_uuid("sch-")
            new_sched = models.Schedule(
                id=schedule_id,
                testId=test_id,
                startTime=now,
                endTime=end,
                durationMinutes=60,
                attemptsAllowed=1
            )
            db.add(new_sched)
            db.commit()

    now = models.get_utc_now()
    initial_status = attempt.get("status") or "in_progress"
    # Normalize to lowercase
    if initial_status.lower() in ("started", "in_progress"):
        initial_status = "in_progress"

    existing_att = db.query(models.Attempt).filter(models.Attempt.id == a_id).first()
    if existing_att:
        db.query(models.Answer).filter(models.Answer.attemptId == a_id).delete()
        db.delete(existing_att)
        db.commit()

    db_att = models.Attempt(
        id=a_id,
        studentId=st_id,
        scheduleId=schedule_id,
        status=initial_status,
        startedAt=attempt.get("startedAt") or now,
        violations=int(attempt.get("violations", 0))
    )
    db.add(db_att)
    
    # Save initial answers if provided
    answers_data = attempt.get("answers", {})
    if isinstance(answers_data, dict):
        for qid, ans_item in answers_data.items():
            sel = ans_item.get("selectedOption") if isinstance(ans_item, dict) else ans_item
            if sel is not None:
                sel_json = json.dumps([sel] if isinstance(sel, str) else sel)
                ans = models.Answer(
                    id=models.generate_uuid("ans-"),
                    attemptId=a_id,
                    questionId=qid,
                    selectedOptionIds=sel_json
                )
                db.add(ans)

    db.commit()
    db.refresh(db_att)
    return db_att

@router.get("/{attempt_id}", response_model=schemas.Attempt)
def get_attempt(
    attempt_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    att = db.query(models.Attempt).filter(models.Attempt.id == attempt_id).first()
    if not att:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if current_user.role == "student" and att.studentId != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    return att

@router.put("/{attempt_id}")
def update_attempt(
    attempt_id: str,
    updates: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    att = db.query(models.Attempt).filter(models.Attempt.id == attempt_id).first()
    if not att:
        raise HTTPException(status_code=404, detail="Attempt not found")
        
    for k, v in updates.items():
        if k == "answers" and isinstance(v, dict):
            for qid, ans_data in v.items():
                ans = db.query(models.Answer).filter(
                    models.Answer.attemptId == attempt_id,
                    models.Answer.questionId == qid
                ).first()
                if not ans:
                    ans = models.Answer(
                        id=models.generate_uuid("ans-"),
                        attemptId=attempt_id,
                        questionId=qid
                    )
                    db.add(ans)
                opt = ans_data.get("selectedOption") if isinstance(ans_data, dict) else ans_data
                if opt is not None:
                    ans.selectedOptionIds = json.dumps([opt] if isinstance(opt, str) else opt)
        elif k == "violations":
            att.violations = int(v)
        elif k == "violationLogs":
            att.violationLogs_json = json.dumps(v)
        elif k == "proctoringSummary":
            att.proctoringSummary_json = json.dumps(v)
        elif hasattr(att, k):
            setattr(att, k, v)
            
    db.commit()
    db.refresh(att)
    return {"message": "Updated", "attempt": att}

@router.post("/{attempt_id}/sync-answer")
def sync_answer(
    attempt_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    att = db.query(models.Attempt).filter(models.Attempt.id == attempt_id).first()
    if not att:
        raise HTTPException(status_code=404, detail="Attempt not found")

    qid = payload.get("questionId")
    if qid:
        ans = db.query(models.Answer).filter(
            models.Answer.attemptId == attempt_id,
            models.Answer.questionId == qid
        ).first()
        if not ans:
            ans = models.Answer(
                id=models.generate_uuid("ans-"),
                attemptId=attempt_id,
                questionId=qid
            )
            db.add(ans)
        sel = payload.get("selectedOption")
        if sel is not None:
            ans.selectedOptionIds = json.dumps([sel] if isinstance(sel, str) else sel)

    if "violations" in payload and payload["violations"] is not None:
        att.violations = int(payload["violations"])
    if "violationLogs" in payload and payload["violationLogs"] is not None:
        att.violationLogs_json = json.dumps(payload["violationLogs"])
    if "proctoringSummary" in payload and payload["proctoringSummary"] is not None:
        att.proctoringSummary_json = json.dumps(payload["proctoringSummary"])

    db.commit()
    return {"status": "ok"}

@router.post("/{attempt_id}/submit", response_model=schemas.Attempt)
def submit_attempt(
    attempt_id: str,
    data: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    att = db.query(models.Attempt).filter(models.Attempt.id == attempt_id).first()
    if not att:
        raise HTTPException(status_code=404, detail="Attempt not found")
        
    is_auto = data.get("isAutoSubmit", False)
    att.status = "auto_submitted" if is_auto else "submitted"
    att.submittedAt = models.get_utc_now()
    
    if "violations" in data and data["violations"] is not None:
        att.violations = int(data["violations"])
    if "violationLogs" in data and data["violationLogs"] is not None:
        att.violationLogs_json = json.dumps(data["violationLogs"])
    if "proctoringSummary" in data and data["proctoringSummary"] is not None:
        att.proctoringSummary_json = json.dumps(data["proctoringSummary"])

    # Extract answers from payload (supports both 'answers' and 'currentAnswers')
    submitted_answers = data.get("answers") or data.get("currentAnswers") or {}
    if isinstance(submitted_answers, dict):
        for qid, ans_data in submitted_answers.items():
            ans = db.query(models.Answer).filter(
                models.Answer.attemptId == attempt_id,
                models.Answer.questionId == qid
            ).first()
            if not ans:
                ans = models.Answer(
                    id=models.generate_uuid("ans-"),
                    attemptId=attempt_id,
                    questionId=qid
                )
                db.add(ans)
            opt = ans_data.get("selectedOption") if isinstance(ans_data, dict) else ans_data
            if opt is not None:
                ans.selectedOptionIds = json.dumps([opt] if isinstance(opt, str) else opt)

    db.commit()
    
    # Calculate score against questions
    score = 0.0
    total = 0.0
    
    # If the attempt has a linked test via schedule or test_questions, calculate total from test
    test = None
    if att.schedule and att.schedule.test:
        test = att.schedule.test
        
    all_answers = db.query(models.Answer).filter(models.Answer.attemptId == attempt_id).all()
    answered_qids = set()

    for ans in all_answers:
        answered_qids.add(ans.questionId)
        q = db.query(models.Question).filter(models.Question.id == ans.questionId).first()
        if q:
            total += q.marks
            if ans.selectedOptionIds:
                try:
                    opts = json.loads(ans.selectedOptionIds)
                    selected_val = opts[0] if isinstance(opts, list) and opts else opts
                    # Compare selected option letter or text with correct answer
                    is_match = False
                    if selected_val and q.correctAnswer:
                        if str(selected_val).strip().upper() == str(q.correctAnswer).strip().upper():
                            is_match = True
                        elif q.question_options:
                            # Check if selected_val matches the optionText of a correct option
                            for opt_row in q.question_options:
                                if opt_row.isCorrect and opt_row.optionText.strip().lower() == str(selected_val).strip().lower():
                                    is_match = True
                                    break
                    if is_match:
                        score += q.marks
                        ans.isCorrect = True
                    else:
                        ans.isCorrect = False
                except Exception:
                    ans.isCorrect = False

    # If test has other questions that weren't answered, include their marks in total
    if test and test.test_questions:
        for tq in test.test_questions:
            if tq.questionId not in answered_qids:
                q_unans = db.query(models.Question).filter(models.Question.id == tq.questionId).first()
                if q_unans:
                    total += q_unans.marks

    att.score = round(score, 2)
    att.percentage = round((score / total) * 100, 1) if total > 0 else 0.0
        
    db.commit()
    db.refresh(att)
    return att
