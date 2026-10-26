import base64
import json
import threading
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from fastapi.responses import FileResponse
from fastapi.security import HTTPAuthorizationCredentials
import jwt
from sqlalchemy import or_, and_, select
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional, Union
import models
import schemas
from database import get_db
from auth import (
    get_current_user,
    require_roles,
    check_trainer_test_access,
    get_authorized_test_ids_for_trainer,
    security,
    SECRET_KEY,
    ALGORITHM
)
import rate_limiter
import storage_service

attempt_creation_lock = threading.Lock()

def sync_proctoring_logs(db: Session, attempt_id: str, violation_logs: Any):
    """Saves unstructured violation logs into structured models.ProctoringLog records."""
    if not isinstance(violation_logs, list):
        return
    for item in violation_logs:
        if not isinstance(item, dict):
            continue
        v_type = item.get("type") or item.get("violationType") or "unknown"
        v_ts = item.get("timestamp") or models.get_utc_now()
        v_shot = item.get("screenshotUrl")
        v_sev = item.get("severity") or "warning"
        existing = db.query(models.ProctoringLog).filter(
            models.ProctoringLog.attemptId == attempt_id,
            models.ProctoringLog.violationType == v_type,
            models.ProctoringLog.timestamp == v_ts
        ).first()
        if not existing:
            db.add(models.ProctoringLog(
                id=models.generate_uuid("pl-"),
                attemptId=attempt_id,
                violationType=v_type,
                timestamp=v_ts,
                screenshotUrl=v_shot,
                severity=v_sev
            ))

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
    elif current_user.role == "institution":
        inst_student_ids = select(models.StudentProfile.userId).filter(
            models.StudentProfile.institutionId == current_user.id
        )
        inst_test_ids = select(models.Test.id).filter(
            or_(models.Test.institutionId == current_user.id, models.Test.authorId == current_user.id)
        )
        inst_schedule_ids = select(models.Schedule.id).filter(
            or_(models.Schedule.institutionId == current_user.id, models.Schedule.testId.in_(inst_test_ids))
        )

        query = query.filter(
            or_(
                models.Attempt.studentId.in_(inst_student_ids),
                models.Attempt.testId.in_(inst_test_ids),
                models.Attempt.scheduleId.in_(inst_schedule_ids)
            )
        )
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
    elif current_user.role == "admin":
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
            testId=test.id,
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
                    opt_id = None
                    candidate_id = sel if isinstance(sel, str) else (sel[0] if isinstance(sel, list) and sel and isinstance(sel[0], str) else None)
                    if candidate_id and db.query(models.QuestionOption).filter(models.QuestionOption.id == candidate_id).first():
                        opt_id = candidate_id
                    ans = models.Answer(
                        id=models.generate_uuid("ans-"),
                        attemptId=a_id,
                        questionId=qid,
                        selectedOptionId=opt_id,
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
    elif current_user.role == "institution":
        student_profile = db.query(models.StudentProfile).filter(models.StudentProfile.userId == att.studentId).first()
        is_own_student = student_profile and student_profile.institutionId == current_user.id
        sched = att.schedule
        test = sched.test if sched else (db.query(models.Test).filter(models.Test.id == att.testId).first() if att.testId else None)
        is_own_test = (sched and sched.institutionId == current_user.id) or (test and (test.institutionId == current_user.id or test.authorId == current_user.id))
        if not (is_own_student or is_own_test):
            raise HTTPException(status_code=403, detail="Access denied: Student does not belong to your institution.")
    elif current_user.role == "admin":
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
    elif current_user.role == "institution":
        student_profile = db.query(models.StudentProfile).filter(models.StudentProfile.userId == att.studentId).first()
        is_own_student = student_profile and student_profile.institutionId == current_user.id
        sched = att.schedule
        test = sched.test if sched else (db.query(models.Test).filter(models.Test.id == att.testId).first() if att.testId else None)
        is_own_test = (sched and sched.institutionId == current_user.id) or (test and (test.institutionId == current_user.id or test.authorId == current_user.id))
        if not (is_own_student or is_own_test):
            raise HTTPException(status_code=403, detail="Access denied: Cannot modify attempt for student outside your institution.")
    elif current_user.role == "admin":
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
            sync_proctoring_logs(db, attempt_id, req.violationLogs)
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
                    candidate_id = opt if isinstance(opt, str) else (opt[0] if isinstance(opt, list) and opt and isinstance(opt[0], str) else None)
                    if candidate_id and db.query(models.QuestionOption).filter(models.QuestionOption.id == candidate_id).first():
                        ans.selectedOptionId = candidate_id
                    else:
                        ans.selectedOptionId = None
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
            candidate_id = sel if isinstance(sel, str) else (sel[0] if isinstance(sel, list) and sel and isinstance(sel[0], str) else None)
            if candidate_id and db.query(models.QuestionOption).filter(models.QuestionOption.id == candidate_id).first():
                ans.selectedOptionId = candidate_id
            else:
                ans.selectedOptionId = None

    if payload.violations is not None:
        att.violations = max(att.violations or 0, int(payload.violations))
    if payload.violationLogs is not None:
        att.violationLogs_json = json.dumps(payload.violationLogs)
        sync_proctoring_logs(db, attempt_id, payload.violationLogs)
    if payload.proctoringSummary is not None:
        att.proctoringSummary_json = json.dumps(payload.proctoringSummary)

    db.commit()
    return {"status": "ok"}

def get_snapshot_auth_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db)
) -> models.User:
    """
    Authenticates the caller for snapshot retrieval via either standard
    Bearer header or query token parameter (needed for browser img tags).
    """
    raw_token = None
    if credentials and credentials.credentials:
        raw_token = credentials.credentials
    elif token:
        raw_token = token

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials required",
            headers={"WWW-Authenticate": "Bearer"}
        )

    try:
        payload = jwt.decode(raw_token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": 'Bearer error="invalid_token", error_description="Missing subject claim"'}
            )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": 'Bearer error="invalid_token", error_description="The token has expired"'}
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": 'Bearer error="invalid_token", error_description="Invalid authentication token"'}
        )

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"}
        )
    if (user.status or "active").strip().lower() != "active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is not active")
    return user


@router.post("/{attempt_id}/snapshots")
async def upload_attempt_snapshot(
    attempt_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Uploads a proctoring webcam snapshot.
    Requirement 3: Permit uploads only for the authenticated owner of an in-progress attempt.
    """
    att = db.query(models.Attempt).filter(models.Attempt.id == attempt_id).first()
    if not att:
        raise HTTPException(status_code=404, detail="Attempt not found")

    if current_user.role != "student" or att.studentId != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Only the student actively taking the exam can upload snapshots."
        )

    if att.status != "in_progress":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot upload snapshots for completed or submitted attempt: Attempt is not in progress."
        )

    # REV-02: Rate limit snapshot uploads (Max 15 per minute per attempt)
    rate_limiter.check_snapshot_upload_rate_limit(attempt_id, db)

    # REV-01: Request-size protection (Content-Length check & streaming read)
    content_type = request.headers.get("content-type", "").lower()
    is_json = "application/json" in content_type
    max_allowed_bytes = storage_service.MAX_JSON_BODY_SIZE if is_json else storage_service.MAX_RAW_BODY_SIZE

    content_length = request.headers.get("content-length")
    if content_length:
        try:
            if int(content_length) > max_allowed_bytes:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"Request body exceeds maximum allowed size ({max_allowed_bytes // 1024} KB)."
                )
        except ValueError:
            pass

    # Stream chunks without loading unbounded data into memory
    chunks = []
    total_bytes = 0
    async for chunk in request.stream():
        total_bytes += len(chunk)
        if total_bytes > max_allowed_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Request body exceeds maximum allowed size ({max_allowed_bytes // 1024} KB)."
            )
        chunks.append(chunk)

    full_body = b"".join(chunks)
    raw_data: bytes = b""

    if is_json:
        try:
            body = json.loads(full_body.decode("utf-8"))
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid JSON payload.")
        raw_b64 = body.get("image") or body.get("snapshot") or body.get("snapshotUrl") or ""
        if not raw_b64:
            raise HTTPException(status_code=400, detail="Missing snapshot image data in request.")
        if "," in raw_b64:
            raw_b64 = raw_b64.split(",", 1)[1]
        try:
            raw_data = base64.b64decode(raw_b64)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid base64 encoding.")
        if len(raw_data) > storage_service.MAX_SNAPSHOT_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Decoded snapshot image exceeds maximum allowed size ({storage_service.MAX_SNAPSHOT_SIZE // 1024} KB)."
            )
    else:
        raw_data = full_body
        if len(raw_data) > storage_service.MAX_SNAPSHOT_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Snapshot exceeds maximum allowed size ({storage_service.MAX_SNAPSHOT_SIZE // 1024} KB)."
            )

    # REV-02: Enforce 20-snapshot cap under concurrency lock
    with storage_service.snapshot_upload_lock:
        existing_count = storage_service.get_attempt_snapshot_count(attempt_id)
        if existing_count >= storage_service.MAX_SNAPSHOTS_PER_ATTEMPT:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Maximum snapshot limit ({storage_service.MAX_SNAPSHOTS_PER_ATTEMPT} snapshots) reached for this assessment attempt."
            )
        try:
            filename, relative_url = storage_service.save_snapshot(attempt_id, raw_data)
        except OSError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Storage service unavailable. Could not save snapshot."
            )

    return {
        "status": "ok",
        "snapshotUrl": relative_url,
        "filename": filename
    }


@router.get("/{attempt_id}/snapshots/{filename}")
def get_attempt_snapshot(
    attempt_id: str,
    filename: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_snapshot_auth_user)
):
    """
    Retrieves a proctoring webcam snapshot.
    Requirement 4: Restrict image retrieval to the owner and staff authorized to access that attempt.
    """
    att = db.query(models.Attempt).filter(models.Attempt.id == attempt_id).first()
    if not att:
        raise HTTPException(status_code=404, detail="Attempt not found")

    if current_user.role == "student":
        if att.studentId != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: You cannot view snapshots belonging to another student."
            )
    elif current_user.role == "trainer":
        test = att.schedule.test if att.schedule else None
        if not test and att.testId:
            test = db.query(models.Test).filter(models.Test.id == att.testId).first()
        if not check_trainer_test_access(current_user, test, db, schedule=att.schedule):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You are not authorized to view proctoring evidence for this assessment."
            )
    elif current_user.role == "institution":
        student_profile = db.query(models.StudentProfile).filter(models.StudentProfile.userId == att.studentId).first()
        is_own_student = student_profile and student_profile.institutionId == current_user.id
        sched = att.schedule
        test = sched.test if sched else (db.query(models.Test).filter(models.Test.id == att.testId).first() if att.testId else None)
        is_own_test = (sched and sched.institutionId == current_user.id) or (test and (test.institutionId == current_user.id or test.authorId == current_user.id))
        if not (is_own_student or is_own_test):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You are not authorized to view proctoring evidence for students outside your institution."
            )
    elif current_user.role == "admin":
        pass
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    file_path = storage_service.get_snapshot_path(attempt_id, filename)
    if not file_path:
        raise HTTPException(status_code=404, detail="Snapshot not found")

    if file_path.startswith("http://") or file_path.startswith("https://"):
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url=file_path)

    return FileResponse(file_path, media_type="image/jpeg")

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
        sync_proctoring_logs(db, attempt_id, data.violationLogs)
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
                candidate_id = opt if isinstance(opt, str) else (opt[0] if isinstance(opt, list) and opt and isinstance(opt[0], str) else None)
                if candidate_id and db.query(models.QuestionOption).filter(models.QuestionOption.id == candidate_id).first():
                    ans.selectedOptionId = candidate_id
                else:
                    ans.selectedOptionId = None

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
    elif current_user.role == "institution":
        student_profile = db.query(models.StudentProfile).filter(models.StudentProfile.userId == att.studentId).first()
        is_own_student = student_profile and student_profile.institutionId == current_user.id
        sched = att.schedule
        is_own_test = (sched and sched.institutionId == current_user.id) or (test and (test.institutionId == current_user.id or test.authorId == current_user.id))
        if not (is_own_student or is_own_test):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Student does not belong to your institution.")
    elif current_user.role == "admin":
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

