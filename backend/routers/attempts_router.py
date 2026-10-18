import json
import threading
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional, Union
import models
import schemas
from database import get_db
from auth import (
    get_current_user,
    require_roles,
    check_trainer_test_access,
    get_authorized_test_ids_for_trainer
)
import rate_limiter

attempt_creation_lock = threading.Lock()

router = APIRouter(prefix="/api/attempts", tags=["attempts"])

@router.get("", response_model=Union[schemas.PaginatedResponse[schemas.Attempt], List[schemas.Attempt]])
def get_attempts(
    studentId: Optional[str] = None,
    testId: Optional[str] = None,
    scheduleId: Optional[str] = None,
    page: Optional[int] = None,
    limit: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.Attempt)
    
    if current_user.role == "student":
        # Students may strictly list only their own attempts
        query = query.filter(models.Attempt.studentId == current_user.id)
        if scheduleId:
            query = query.filter(models.Attempt.scheduleId == scheduleId)
        if testId:
            matching_schedules = db.query(models.Schedule.id).filter(models.Schedule.testId == testId).all()
            sched_ids = [s[0] for s in matching_schedules]
            if sched_ids:
                query = query.filter(models.Attempt.scheduleId.in_(sched_ids))
            else:
                query = query.filter(False)
    elif current_user.role == "trainer":
        # Trainers must be restricted to attempts for tests they author or are assigned to
        if testId:
            test = db.query(models.Test).filter(models.Test.id == testId).first()
            if not test:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found.")
            if not check_trainer_test_access(current_user, test, db):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Not authorized to access attempts for this assessment.")
            matching_schedules = db.query(models.Schedule.id).filter(models.Schedule.testId == testId).all()
            sched_ids = [s[0] for s in matching_schedules]
            if sched_ids:
                query = query.filter(models.Attempt.scheduleId.in_(sched_ids))
            else:
                query = query.filter(False)
        elif scheduleId:
            sched = db.query(models.Schedule).filter(models.Schedule.id == scheduleId).first()
            if not sched:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found.")
            if not check_trainer_test_access(current_user, sched.test, db, schedule=sched):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Not authorized to access attempts for this schedule.")
            query = query.filter(models.Attempt.scheduleId == scheduleId)
        else:
            # Unfiltered query: scope strictly to all tests this trainer is authorized to manage
            auth_test_ids = get_authorized_test_ids_for_trainer(current_user, db)
            matching_schedules = db.query(models.Schedule.id).filter(models.Schedule.testId.in_(auth_test_ids)).all()
            sched_ids = [s[0] for s in matching_schedules]
            if sched_ids:
                query = query.filter(models.Attempt.scheduleId.in_(sched_ids))
            else:
                query = query.filter(False)

        if studentId:
            query = query.filter(models.Attempt.studentId == studentId)
    elif current_user.role in ("admin", "institution"):
        if studentId:
            query = query.filter(models.Attempt.studentId == studentId)
        if scheduleId:
            query = query.filter(models.Attempt.scheduleId == scheduleId)
        if testId:
            matching_schedules = db.query(models.Schedule.id).filter(models.Schedule.testId == testId).all()
            sched_ids = [s[0] for s in matching_schedules]
            if sched_ids:
                query = query.filter(models.Attempt.scheduleId.in_(sched_ids))
            else:
                query = query.filter(False)
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Role not authorized to view attempts.")
        
    if page is not None:
        p = max(1, page)
        l = max(1, limit) if limit else 50
        total = query.count()
        items = query.offset((p - 1) * l).limit(l).all()
        return {"data": items, "total": total, "page": p, "limit": l}

    return query.all()

@router.post("", response_model=schemas.Attempt)
def create_attempt(
    req: schemas.AttemptCreateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    rate_limiter.check_attempt_creation_rate_limit(current_user.id, db)
    now = models.get_utc_now()
    provided_fields = getattr(req, "model_fields_set", None) or getattr(req, "__fields_set__", set())

    # 1. Reject client-controlled attempt identity, lifecycle, and grading fields
    FORBIDDEN_CREATE_FIELDS = {"id", "status", "score", "percentage", "violations", "violationLogs", "proctoringSummary"}
    forbidden_sent = provided_fields.intersection(FORBIDDEN_CREATE_FIELDS)
    if forbidden_sent:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Client-controlled fields ({', '.join(sorted(forbidden_sent))}) cannot be specified when creating an attempt."
        )

    # 2. Strict identity verification
    if current_user.role == "student":
        if req.studentId and req.studentId != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot create attempt for another student."
            )
        st_id = current_user.id
    else:
        # Staff (admin, trainer, institution) can specify target student
        st_id = req.studentId or current_user.id

    # 3. Test verification & publishing requirements
    test = db.query(models.Test).filter(models.Test.id == req.testId).first()
    if not test:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test not found."
        )

    if current_user.role == "student":
        if (test.status or "").lower() != "published":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Test is not published."
            )

    # 4. Schedule resolution & validation
    sched = None
    if req.scheduleId:
        sched = db.query(models.Schedule).filter(models.Schedule.id == req.scheduleId).first()
        if not sched:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Schedule not found."
            )
        if sched.testId != test.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Schedule does not belong to the specified test."
            )
    else:
        # Schedule omitted: resolve unambiguous, active assigned schedule
        if current_user.role == "student":
            all_scheds = db.query(models.Schedule).filter(models.Schedule.testId == test.id).all()
            eligible_scheds = []
            for s in all_scheds:
                # Check student batch & individual assignment
                assigned_batch = s.assignedBatch
                assigned_students = s.assignedStudents
                is_assigned = True
                if assigned_batch and str(assigned_batch).strip().lower() != "all":
                    if not current_user.batch or current_user.batch.strip().lower() != str(assigned_batch).strip().lower():
                        is_assigned = False
                if assigned_students and len(assigned_students) > 0 and "all" not in assigned_students:
                    if current_user.id not in assigned_students:
                        is_assigned = False

                if is_assigned and s.startTime <= now <= s.endTime:
                    eligible_scheds.append(s)

            if len(eligible_scheds) == 1:
                sched = eligible_scheds[0]
            elif len(eligible_scheds) == 0:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="This test is not currently scheduled."
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Multiple active schedules found for this test; please specify scheduleId."
                )
        else:
            # Staff without scheduleId
            sched = db.query(models.Schedule).filter(models.Schedule.testId == test.id).first()

    schedule_id = sched.id if sched else None

    # Verify trainer authorization before creating/previewing attempt
    if current_user.role == "trainer":
        if not check_trainer_test_access(current_user, test, db, schedule=sched):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Not authorized to create attempts for this assessment."
            )

    # 5. Student Schedule Validation (Gates, Window, Limits, Resumption)
    with attempt_creation_lock:
        if current_user.role == "student":
            if not sched:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="This test is not currently scheduled."
                )

            # Check if student already has an in-progress attempt for this schedule (Session Resumption)
            in_prog = db.query(models.Attempt).filter(
                models.Attempt.studentId == st_id,
                models.Attempt.scheduleId == schedule_id,
                models.Attempt.status == "in_progress"
            ).first()
            if in_prog:
                return in_prog

            if now < sched.startTime:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Scheduled test has not started yet."
                )
            if now > sched.endTime:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Scheduled test has already ended."
                )

            # Check student batch / individual assignment
            assigned_batch = sched.assignedBatch
            assigned_students = sched.assignedStudents
            is_assigned = True
            if assigned_batch and str(assigned_batch).strip().lower() != "all":
                if not current_user.batch or current_user.batch.strip().lower() != str(assigned_batch).strip().lower():
                    is_assigned = False
            if assigned_students and len(assigned_students) > 0 and "all" not in assigned_students:
                if current_user.id not in assigned_students:
                    is_assigned = False
            if not is_assigned:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Student is not assigned to this scheduled test session."
                )

            # Check attempt limits against completed attempts
            submitted_count = db.query(models.Attempt).filter(
                models.Attempt.studentId == st_id,
                models.Attempt.scheduleId == schedule_id,
                models.Attempt.status.in_(["submitted", "auto_submitted", "completed"])
            ).count()
            allowed = sched.attemptsAllowed or 1
            if submitted_count >= allowed:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Maximum allowed attempts ({allowed}) reached for this test."
                )

        # 6. Generate fresh attempt ID (never client-supplied, never overwrite or delete existing)
        a_id = models.generate_uuid("att-")
        db_att = models.Attempt(
            id=a_id,
            studentId=st_id,
            scheduleId=schedule_id,
            status="in_progress",
            startedAt=now,
            violations=0
        )
        db.add(db_att)
        
        # Save initial answers if provided
        answers_data = req.answers or {}
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
        rate_limiter.record_attempt_creation_event(current_user.id, db)
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
    if current_user.role == "student":
        if att.studentId != current_user.id:
            raise HTTPException(status_code=403, detail="Forbidden")
    elif current_user.role == "trainer":
        test = att.schedule.test if att.schedule else None
        if not test and att.testId:
            test = db.query(models.Test).filter(models.Test.id == att.testId).first()
        if not check_trainer_test_access(current_user, test, db, schedule=att.schedule):
            raise HTTPException(status_code=403, detail="Access denied: You are not authorized to view attempts for this assessment.")
    elif current_user.role in ("admin", "institution"):
        pass
    else:
        raise HTTPException(status_code=403, detail="Forbidden")
    return att

@router.put("/{attempt_id}")
def update_attempt(
    attempt_id: str,
    req: schemas.AttemptUpdateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    att = db.query(models.Attempt).filter(models.Attempt.id == attempt_id).first()
    if not att:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if current_user.role == "student":
        if att.studentId != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
    elif current_user.role == "trainer":
        test = att.schedule.test if att.schedule else None
        if not test and att.testId:
            test = db.query(models.Test).filter(models.Test.id == att.testId).first()
        if not check_trainer_test_access(current_user, test, db, schedule=att.schedule):
            raise HTTPException(status_code=403, detail="Access denied: You are not authorized to modify attempts for this assessment.")
    elif current_user.role in ("admin", "institution"):
        pass
    else:
        raise HTTPException(status_code=403, detail="Access denied")

    provided_fields = getattr(req, "model_fields_set", None) or getattr(req, "__fields_set__", set())

    # 1. Structural and identity fields are immutable across all roles
    IMMUTABLE_FIELDS = {"id", "studentId", "scheduleId", "startedAt", "submittedAt"}
    immutable_sent = provided_fields.intersection(IMMUTABLE_FIELDS)
    if immutable_sent:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Attempt identity, schedule, and timestamp fields ({', '.join(sorted(immutable_sent))}) are immutable."
        )

    # 2. Student restrictions
    if current_user.role == "student":
        # Cannot update completed/submitted attempt
        if att.status in ("submitted", "auto_submitted", "completed"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot modify a completed or submitted attempt."
            )

        FORBIDDEN_STUDENT_FIELDS = {
            "score", "percentage", "violations", "violationLogs", "proctoringSummary", "status"
        }
        forbidden_sent = provided_fields.intersection(FORBIDDEN_STUDENT_FIELDS)
        if forbidden_sent:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Students are not permitted to modify server-managed fields: {', '.join(sorted(forbidden_sent))}"
            )

        # Allow genuine in-progress updates: answers, deviceInfo, ipAddress
        if "answers" in provided_fields and req.answers and isinstance(req.answers, dict):
            for qid, ans_data in req.answers.items():
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

        if "deviceInfo" in provided_fields:
            att.deviceInfo = req.deviceInfo
        if "ipAddress" in provided_fields:
            att.ipAddress = req.ipAddress

    else:
        # Trainer / Admin updates (manual grading, violation reviews)
        if "score" in provided_fields:
            att.score = req.score
        if "percentage" in provided_fields:
            att.percentage = req.percentage
        if "violations" in provided_fields:
            att.violations = req.violations
        if "violationLogs" in provided_fields:
            att.violationLogs_json = json.dumps(req.violationLogs)
        if "proctoringSummary" in provided_fields:
            att.proctoringSummary_json = json.dumps(req.proctoringSummary)
        if "status" in provided_fields:
            att.status = req.status
        if "answers" in provided_fields and req.answers and isinstance(req.answers, dict):
            for qid, ans_data in req.answers.items():
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
        if "deviceInfo" in provided_fields:
            att.deviceInfo = req.deviceInfo
        if "ipAddress" in provided_fields:
            att.ipAddress = req.ipAddress

    db.commit()
    db.refresh(att)
    return {"message": "Updated", "attempt": att}

@router.post("/{attempt_id}/sync-answer")
def sync_answer(
    attempt_id: str,
    payload: schemas.SyncAnswerRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    att = db.query(models.Attempt).filter(models.Attempt.id == attempt_id).first()
    if not att:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if current_user.role != "student" or att.studentId != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Only the student actively taking the exam can sync answers."
        )

    if att.status in ("submitted", "auto_submitted", "completed"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot sync answers for an attempt that is already completed."
        )
    if att.status != "in_progress":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot sync answers for an attempt that is not in progress."
        )

    rate_limiter.check_sync_answer_rate_limit(attempt_id, db)

    qid = payload.questionId
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
        sel = payload.selectedOption
        if sel is not None:
            ans.selectedOptionIds = json.dumps([sel] if isinstance(sel, str) else sel)

    if payload.violations is not None:
        att.violations = max(att.violations or 0, int(payload.violations))
    if payload.violationLogs is not None:
        att.violationLogs_json = json.dumps(payload.violationLogs)
    if payload.proctoringSummary is not None:
        att.proctoringSummary_json = json.dumps(payload.proctoringSummary)

    db.commit()
    return {"status": "ok"}

def evaluate_answer_correctness(question: Optional[models.Question], selected_raw: Any) -> bool:
    """
    Evaluates whether a student's submitted answer is correct for a given question.
    Requirements:
    1. Returns False if no answer was provided (None, empty list, empty string).
    2. Correctly grades option-based MCQs even when question.correctAnswer is NULL or empty,
       using QuestionOption records (where isCorrect == True).
    3. Supports matching by:
       - Option ID (e.g. 'opt-1234')
       - Option letter (e.g. 'A', 'B', 'C', 'D')
       - Option text (e.g. 'Paris', 'Encapsulation')
       - Option index (e.g. 0, 1, 2)
       - Direct question.correctAnswer matching
    4. Ensures incorrect answers, unanswered questions, and malformed option data cannot receive unintended marks.
    5. Purely server-side evaluation.
    """
    if not question or selected_raw is None:
        return False

    # Extract parsed options from raw selection
    if isinstance(selected_raw, str):
        selected_trimmed = selected_raw.strip()
        if not selected_trimmed or selected_trimmed.lower() in ("null", "none", "[]", "{}"):
            return False
        try:
            parsed = json.loads(selected_trimmed)
        except Exception:
            parsed = selected_trimmed
    else:
        parsed = selected_raw

    if parsed is None:
        return False

    # Handle lists vs single values
    if isinstance(parsed, list):
        if len(parsed) == 0:
            return False
        selected_items = [str(item).strip() for item in parsed if item is not None and str(item).strip()]
        if not selected_items:
            return False
    else:
        val_str = str(parsed).strip()
        if not val_str or val_str.lower() in ("null", "none"):
            return False
        selected_items = [val_str]

    letters = ["A", "B", "C", "D", "E", "F", "G", "H"]
    q_options = question.question_options or []

    # Identify correct option records
    correct_options = [opt for opt in q_options if opt.isCorrect]

    raw_correct = question.correctAnswer
    if isinstance(raw_correct, str):
        raw_correct = raw_correct.strip()
    elif raw_correct is not None:
        raw_correct = str(raw_correct).strip()

    if not correct_options and raw_correct and q_options:
        for idx, opt in enumerate(q_options):
            opt_letter = letters[opt.orderIndex] if opt.orderIndex is not None and 0 <= opt.orderIndex < len(letters) else letters[idx] if idx < len(letters) else None
            if opt_letter and raw_correct.upper() == opt_letter:
                correct_options.append(opt)
            elif str(opt.orderIndex) == raw_correct or str(idx) == raw_correct:
                correct_options.append(opt)
            elif opt.optionText and opt.optionText.strip().lower() == raw_correct.lower():
                correct_options.append(opt)

    # 1. Multi-select question handling
    if (question.type or "").upper() == "MULTI_SELECT" and correct_options:
        matched_correct_indices = set()
        for sel in selected_items:
            sel_upper = sel.upper()
            sel_lower = sel.lower()
            found = False
            for c_idx, c_opt in enumerate(correct_options):
                c_letter = letters[c_opt.orderIndex] if c_opt.orderIndex is not None and 0 <= c_opt.orderIndex < len(letters) else letters[c_idx] if c_idx < len(letters) else None
                if (c_opt.id and str(c_opt.id).strip() == sel) or \
                   (c_letter and sel_upper == c_letter) or \
                   (c_opt.optionText and c_opt.optionText.strip().lower() == sel_lower):
                    matched_correct_indices.add(c_idx)
                    found = True
                    break
            if not found:
                return False  # Selected an incorrect option

        return len(matched_correct_indices) == len(correct_options)

    # 2. Standard single-choice MCQ handling
    selected_val = selected_items[0]
    sel_upper = selected_val.upper()
    sel_lower = selected_val.lower()

    # Check match against identified correct options
    if correct_options:
        for idx, opt in enumerate(q_options):
            if not opt.isCorrect and opt not in correct_options:
                continue

            # Check 1: Option ID match (exact match against opt.id)
            if opt.id and str(opt.id).strip() == selected_val:
                return True

            # Check 2: Option Letter match (A, B, C, D)
            opt_letter = letters[opt.orderIndex] if opt.orderIndex is not None and 0 <= opt.orderIndex < len(letters) else letters[idx] if idx < len(letters) else None
            if opt_letter and sel_upper == opt_letter:
                return True

            # Check 3: Option Text match
            if opt.optionText and opt.optionText.strip() and opt.optionText.strip().lower() == sel_lower:
                return True

            # Check 4: Option Order index match
            if opt.orderIndex is not None and str(opt.orderIndex) == selected_val:
                return True
            if str(idx) == selected_val:
                return True

    # Check match against raw question.correctAnswer if present
    if raw_correct:
        if sel_upper == raw_correct.upper():
            return True
        if sel_lower == raw_correct.lower():
            return True

    return False


@router.post("/{attempt_id}/submit", response_model=schemas.Attempt)
def submit_attempt(
    attempt_id: str,
    data: schemas.AttemptSubmitRequest = schemas.AttemptSubmitRequest(),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    att = db.query(models.Attempt).filter(models.Attempt.id == attempt_id).first()
    if not att:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if current_user.role == "student":
        if att.studentId != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    elif current_user.role == "trainer":
        test = att.schedule.test if att.schedule else None
        if not test and att.testId:
            test = db.query(models.Test).filter(models.Test.id == att.testId).first()
        if not check_trainer_test_access(current_user, test, db, schedule=att.schedule):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: You are not authorized to submit attempts for this assessment.")
    elif current_user.role in ("admin", "institution"):
        pass
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        
    if att.status in ("submitted", "auto_submitted", "completed"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Attempt has already been submitted."
        )

    is_auto = bool(data.isAutoSubmit)
    new_status = "auto_submitted" if is_auto else "submitted"
    now_ts = models.get_utc_now()

    # Atomic status update to prevent race conditions during concurrent submissions
    rows_updated = db.query(models.Attempt).filter(
        models.Attempt.id == attempt_id,
        models.Attempt.status == "in_progress"
    ).update(
        {
            models.Attempt.status: new_status,
            models.Attempt.submittedAt: now_ts
        },
        synchronize_session=False
    )
    if rows_updated == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Attempt has already been submitted or is not in progress."
        )
    db.commit()
    db.refresh(att)
    
    if data.violations is not None:
        att.violations = max(att.violations or 0, int(data.violations))
    if data.violationLogs is not None:
        att.violationLogs_json = json.dumps(data.violationLogs)
    if data.proctoringSummary is not None:
        att.proctoringSummary_json = json.dumps(data.proctoringSummary)

    # Extract answers from payload (supports both 'answers' and 'currentAnswers')
    submitted_answers = data.answers or data.currentAnswers or {}
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
                    is_match = evaluate_answer_correctness(q, ans.selectedOptionIds)
                    if is_match:
                        score += q.marks
                        ans.isCorrect = True
                    else:
                        ans.isCorrect = False
                except Exception:
                    ans.isCorrect = False
            else:
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

@router.get("/{attempt_id}/review", response_model=List[schemas.ReviewQuestion])
def get_attempt_review(
    attempt_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Dedicated post-submission review endpoint.
    Allows students to review only their own completed attempt.
    Verifies that the attempt is submitted and review policy allows immediate review.
    Returns trusted server-graded question results with answer keys and explanations.
    """
    att = db.query(models.Attempt).filter(models.Attempt.id == attempt_id).first()
    if not att:
        raise HTTPException(status_code=404, detail="Attempt not found")

    # Enforce completion - cannot review an active or incomplete attempt
    if att.status not in ("submitted", "auto_submitted"):
        raise HTTPException(status_code=400, detail="Cannot review an incomplete attempt.")

    # Resolve linked test
    test = None
    if att.schedule and att.schedule.test:
        test = att.schedule.test
    elif att.testId:
        test = db.query(models.Test).filter(models.Test.id == att.testId).first()

    # Enforce role-based access
    if current_user.role == "student":
        if att.studentId != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Cannot review another student's attempt.")
        if test and test.settings:
            if not test.settings.get("showResultImmediately", True):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Detailed review is disabled for this assessment.")
    elif current_user.role == "trainer":
        if not check_trainer_test_access(current_user, test, db, schedule=att.schedule):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: You are not authorized to review attempts for this assessment.")
    elif current_user.role in ("admin", "institution"):
        pass
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    # Retrieve mapped test questions
    questions = []
    if test:
        test_questions = db.query(models.TestQuestion).filter(
            models.TestQuestion.testId == test.id
        ).order_by(models.TestQuestion.orderIndex).all()
        for tq in test_questions:
            q = db.query(models.Question).filter(models.Question.id == tq.questionId).first()
            if q:
                questions.append(q)

    # If no test_questions mapped, fall back to questions present in answers
    if not questions and att.answers_records:
        for ans in att.answers_records:
            q = db.query(models.Question).filter(models.Question.id == ans.questionId).first()
            if q and q not in questions:
                questions.append(q)

    review_list = []
    for q in questions:
        ans_record = db.query(models.Answer).filter(
            models.Answer.attemptId == attempt_id,
            models.Answer.questionId == q.id
        ).first()

        user_selected = None
        is_correct = None
        if ans_record:
            if ans_record.selectedOptionIds:
                try:
                    opts = json.loads(ans_record.selectedOptionIds)
                    user_selected = opts[0] if isinstance(opts, list) and opts else opts
                except Exception:
                    user_selected = ans_record.selectedOptionIds
            is_correct = ans_record.isCorrect

        review_list.append({
            "id": q.id,
            "type": q.type or "MCQ",
            "text": q.text,
            "question": q.question or q.text,
            "mediaUrl": q.mediaUrl,
            "difficulty": q.difficulty or "Medium",
            "marks": float(q.marks or 1.0),
            "category": q.category,
            "options": q.options or {},
            "userSelectedOption": user_selected,
            "isCorrect": is_correct,
            "correctAnswer": q.correctAnswer,
            "explanation": q.explanation
        })

    return review_list

