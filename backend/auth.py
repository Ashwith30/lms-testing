import os
import datetime
import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List, Optional

try:
    from .database import get_db
    from . import models
except ImportError:
    from database import get_db
    import models

DEFAULT_DEV_SECRET = "dev-only-insecure-key-change-in-production"
SECRET_KEY = os.getenv("JWT_SECRET_KEY", DEFAULT_DEV_SECRET)
if SECRET_KEY in (DEFAULT_DEV_SECRET, "lms-production-secure-jwt-secret-key-super-secure"):
    import sys
    print("[WARNING] Using default/dev JWT_SECRET_KEY. Please set JWT_SECRET_KEY in production.", file=sys.stderr)

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """Hashes a password using bcrypt."""
    if not password:
        return ""
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, stored_password: Optional[str]) -> bool:
    """Verifies a plain password against a stored bcrypt hash.
    
    Strictly requires a valid bcrypt hash format ($2b$, $2a$, or $2y$).
    Rejects unsupported formats, empty values, or plaintext fallbacks.
    """
    if not stored_password or not plain_password:
        return False
    if isinstance(stored_password, str) and stored_password.startswith(("$2b$", "$2a$", "$2y$")):
        try:
            pwd_bytes = plain_password.encode("utf-8")[:72]
            return bcrypt.checkpw(pwd_bytes, stored_password.encode("utf-8"))
        except Exception:
            return False
    return False


def create_access_token(data: dict, expires_delta: Optional[datetime.timedelta] = None) -> str:
    """Creates a signed JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.now(datetime.timezone.utc) + expires_delta
    else:
        expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> models.User:
    """Dependency that authenticates the user via JWT Bearer token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not credentials:
        raise credentials_exception

    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise credentials_exception

    user_status = (user.status or "active").strip().lower()
    if user_status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive, suspended, or archived. Please contact your administrator."
        )
    return user


def require_roles(*allowed_roles: str):
    """Dependency factory that ensures the authenticated user has one of the allowed roles."""
    def role_checker(current_user: models.User = Depends(get_current_user)) -> models.User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted for role '{current_user.role}'. Required: {list(allowed_roles)}"
            )
        return current_user
    return role_checker


def check_trainer_test_access(
    user: Optional[models.User],
    test: Optional[models.Test],
    db: Session,
    schedule: Optional[models.Schedule] = None
) -> bool:
    """
    Verifies whether a user has authorization to view or manage a test and its attempts.
    
    Authorization semantics:
    - Admins and Institutions retain platform-wide administrative access.
    - Trainers must:
      1. Be the author of the test (test.authorId == user.id), OR
      2. Have an active TrainerAssignment specifically matching the test's courseId, topicId, or batchId.
    - Students are NOT authorized to manage tests or attempts through staff endpoints.
    - Fails closed (returns False) if test is None, user is None, or access cannot be proven.
    """
    if not user or not user.role:
        return False
    if user.status and user.status.lower() != "active":
        return False
        
    if user.role in ("admin", "institution"):
        return True
        
    if user.role != "trainer":
        return False
        
    if not test:
        return False

    # 1. Direct author access
    if test.authorId == user.id:
        return True

    # 2. Check TrainerAssignment records
    assignments = db.query(models.TrainerAssignment).filter(
        models.TrainerAssignment.trainerId == user.id
    ).all()
    
    if not assignments:
        return False

    now_iso = models.get_utc_now()

    for a in assignments:
        # Check active time window if configured
        if a.startDate and now_iso < a.startDate:
            continue
        if a.endDate and now_iso > a.endDate:
            continue

        matched_criteria = False

        # Course match
        if a.courseId:
            test_course_id = test.courseId
            if not test_course_id and test.topicId:
                t_obj = db.query(models.Topic).filter(models.Topic.id == test.topicId).first()
                if t_obj:
                    test_course_id = t_obj.courseId
            if not test_course_id or test_course_id != a.courseId:
                continue
            matched_criteria = True

        # Topic match
        if a.topicId:
            if not test.topicId or test.topicId != a.topicId:
                continue
            matched_criteria = True

        # Batch match
        if a.batchId:
            batch_matched = False
            if schedule:
                # Check schedule's direct assignments
                for sa in (schedule.assignments or []):
                    if sa.assigneeType and sa.assigneeType.lower() == "batch" and sa.assigneeId == a.batchId:
                        batch_matched = True
                        break
                if not batch_matched and schedule.assignedBatch:
                    batch_obj = db.query(models.Batch).filter(models.Batch.id == a.batchId).first()
                    if batch_obj and batch_obj.name.strip().lower() == schedule.assignedBatch.strip().lower():
                        batch_matched = True
            else:
                # Check if any schedule for this test is assigned to this batch
                sched_matched = db.query(models.ScheduleAssignment).join(
                    models.Schedule, models.ScheduleAssignment.scheduleId == models.Schedule.id
                ).filter(
                    models.Schedule.testId == test.id,
                    models.ScheduleAssignment.assigneeType.ilike("batch"),
                    models.ScheduleAssignment.assigneeId == a.batchId
                ).first()
                if sched_matched:
                    batch_matched = True
                else:
                    batch_obj = db.query(models.Batch).filter(models.Batch.id == a.batchId).first()
                    if batch_obj:
                        schedules_for_test = db.query(models.Schedule).filter(models.Schedule.testId == test.id).all()
                        for s in schedules_for_test:
                            if s.assignedBatch and s.assignedBatch.strip().lower() == batch_obj.name.strip().lower():
                                batch_matched = True
                                break

            if not batch_matched:
                continue
            matched_criteria = True

        # If assignment specified at least one matching criteria and none conflicted
        if matched_criteria:
            return True

    return False


def get_authorized_test_ids_for_trainer(user: Optional[models.User], db: Session) -> List[str]:
    """Returns a list of test IDs that the user is authorized to manage."""
    if not user or not user.role:
        return []
    if user.status and user.status.lower() != "active":
        return []

    if user.role in ("admin", "institution"):
        return [row[0] for row in db.query(models.Test.id).all()]

    if user.role != "trainer":
        return []
        
    authorized_ids = set()
    
    # 1. Tests authored by the trainer
    authored_tests = db.query(models.Test.id).filter(models.Test.authorId == user.id).all()
    for row in authored_tests:
        authorized_ids.add(row[0])
        
    # 2. Tests matching active TrainerAssignments
    assignments = db.query(models.TrainerAssignment).filter(
        models.TrainerAssignment.trainerId == user.id
    ).all()
    
    now_iso = models.get_utc_now()
    for a in assignments:
        if a.startDate and now_iso < a.startDate:
            continue
        if a.endDate and now_iso > a.endDate:
            continue
            
        q = db.query(models.Test.id)
        has_filter = False
        if a.courseId and a.topicId:
            q = q.outerjoin(models.Topic, models.Test.topicId == models.Topic.id).filter(
                models.Test.topicId == a.topicId,
                (models.Test.courseId == a.courseId) | (models.Topic.courseId == a.courseId)
            )
            has_filter = True
        elif a.courseId:
            q = q.outerjoin(models.Topic, models.Test.topicId == models.Topic.id).filter(
                (models.Test.courseId == a.courseId) | (models.Topic.courseId == a.courseId)
            )
            has_filter = True
        elif a.topicId:
            q = q.filter(models.Test.topicId == a.topicId)
            has_filter = True
            
        if has_filter:
            for row in q.all():
                authorized_ids.add(row[0])
                
        if a.batchId:
            batch_scheds = db.query(models.Schedule.testId).join(
                models.ScheduleAssignment, models.ScheduleAssignment.scheduleId == models.Schedule.id
            ).filter(
                models.ScheduleAssignment.assigneeType.ilike("batch"),
                models.ScheduleAssignment.assigneeId == a.batchId
            ).all()
            for row in batch_scheds:
                if row[0]:
                    authorized_ids.add(row[0])
                    
    return list(authorized_ids)


def check_trainer_question_bank_access(
    user: Optional[models.User],
    bank: Optional[models.QuestionBank],
    db: Session,
    for_deletion: bool = False
) -> bool:
    """
    Verifies whether a user has authorization to view, manage, or delete a question bank.
    
    Authorization semantics:
    - Admins and Institutions retain platform-wide administrative access.
    - Active account check: Inactive/suspended users are strictly rejected.
    - Trainers:
      1. Direct owner access: bank.ownerId == user.id can always manage and delete.
      2. When for_deletion=True: ONLY direct owner (bank.ownerId == user.id) or admin/institution may delete.
         A trainer can NEVER delete another trainer's question bank, even with course/topic assignments.
      3. When for_deletion=False: An assigned trainer with an active TrainerAssignment specifically matching
         the bank's courseId or topicId may contribute/manage questions within the bank.
    - Fails closed (returns False) if bank is None, user is None, or access cannot be proven.
    """
    if not user or not user.role:
        return False
    if user.status and user.status.strip().lower() != "active":
        return False

    if user.role in ("admin", "institution"):
        return True

    if user.role != "trainer":
        return False

    if not bank:
        return False

    # 1. Direct owner access
    if bank.ownerId == user.id:
        return True

    # 2. Deletion is strictly reserved for the owner (or admin/institution)
    if for_deletion:
        return False

    # 3. For non-deletion management, check active TrainerAssignment on courseId or topicId
    if not bank.courseId and not bank.topicId:
        return False

    assignments = db.query(models.TrainerAssignment).filter(
        models.TrainerAssignment.trainerId == user.id
    ).all()

    if not assignments:
        return False

    now_iso = models.get_utc_now()
    for a in assignments:
        if a.startDate and now_iso < a.startDate:
            continue
        if a.endDate and now_iso > a.endDate:
            continue

        if a.courseId and bank.courseId and a.courseId == bank.courseId:
            return True
        if a.topicId and bank.topicId and a.topicId == bank.topicId:
            return True

    return False


def check_trainer_question_access(
    user: Optional[models.User],
    question: Optional[models.Question],
    db: Session,
    for_deletion: bool = False
) -> bool:
    """
    Verifies whether a user has authorization to manage or delete a question.
    Derives authorization from the question's associated QuestionBank.
    """
    if not question:
        return False
    bank = question.bank
    if not bank and question.questionBankId:
        bank = db.query(models.QuestionBank).filter(models.QuestionBank.id == question.questionBankId).first()
    return check_trainer_question_bank_access(user, bank, db, for_deletion=for_deletion)


def check_student_material_access(
    user: Optional[models.User],
    material: Optional[models.Material],
    db: Session
) -> bool:
    """
    Verifies whether a student has authorization to view a specific material.
    Requirements:
    1. Account must be active (not suspended/archived).
    2. Material must be released (isReleased == True).
    3. If releasedAt is set, it cannot be in the future.
    4. If material has courseId, student must be enrolled in that course.
    5. If material has MaterialAssignments:
       Student must match at least one active assignment:
       - 'all': open to all students
       - 'student': assigneeId matches user.id
       - 'batch': assigneeId matches student's primaryBatchId or batch name
       - 'course': assigneeId matches one of student's enrolled course IDs
    6. If material has NO MaterialAssignments:
       - If courseId is set, enrolled students may view it.
       - If courseId is NULL, it is a universal platform material viewable by all students.
    """
    if not user or not user.role:
        return False

    if user.status and user.status.lower() != "active":
        return False

    if user.role in ("admin", "institution"):
        return True

    if user.role == "trainer":
        return check_trainer_material_access(user, material, db, for_mutation=False)

    if user.role != "student":
        return False

    if not material:
        return False

    # 1. Release check
    if not material.isReleased:
        return False

    now_iso = models.get_utc_now()
    if material.releasedAt and material.releasedAt > now_iso:
        return False

    # 2. Student context
    profile = user.student_profile
    batch_id = profile.primaryBatchId if profile else None
    batch_name = profile.primaryBatch.name if profile and profile.primaryBatch else None

    allowed_batches = {"all"}
    if batch_id:
        allowed_batches.add(str(batch_id).strip().lower())
    if batch_name:
        allowed_batches.add(str(batch_name).strip().lower())
    if user.batch:
        allowed_batches.add(str(user.batch).strip().lower())

    enrolled_courses = {
        row[0] for row in db.query(models.StudentEnrollment.courseId).filter(
            models.StudentEnrollment.studentId == user.id,
            models.StudentEnrollment.status.in_(["Enrolled", "In Progress", "Completed"])
        ).all()
    }

    # 3. Course restriction check
    if material.courseId and material.courseId not in enrolled_courses:
        return False

    # 4. Assignments check
    assignments = material.assignments
    if not assignments:
        # No assignments: if courseId matched (or was None), permitted
        return True

    for a in assignments:
        atype = (a.assigneeType or "").strip().lower()
        aid = str(a.assigneeId).strip() if a.assigneeId else ""

        # Check assignment release date if present
        if a.releaseDate and a.releaseDate > now_iso:
            continue

        if atype == "all":
            return True
        elif atype == "student" and aid == user.id:
            return True
        elif atype == "batch" and aid.lower() in allowed_batches:
            return True
        elif atype == "course" and aid in enrolled_courses:
            return True

    return False


def check_trainer_material_access(
    user: Optional[models.User],
    material: Optional[models.Material],
    db: Session,
    for_mutation: bool = False
) -> bool:
    """
    Verifies whether a trainer has authorization to access, modify, or delete a material.
    """
    if not user or not user.role:
        return False

    if user.status and user.status.lower() != "active":
        return False

    if user.role in ("admin", "institution"):
        return True

    if user.role != "trainer":
        return False

    if not material:
        return False

    # Author always has full access
    if material.authorId == user.id:
        return True

    # Mutating (updating/deleting) materials authored by someone else is strictly reserved for admins/institutions
    if for_mutation:
        return False

    # For viewing/reading: check if trainer has active assignment for the course/topic/batch
    if not material.courseId and not material.topicId:
        return True  # General material readable by staff

    assignments = db.query(models.TrainerAssignment).filter(
        models.TrainerAssignment.trainerId == user.id
    ).all()

    now_iso = models.get_utc_now()
    for a in assignments:
        if a.startDate and now_iso < a.startDate:
            continue
        if a.endDate and now_iso > a.endDate:
            continue

        if a.courseId and material.courseId and a.courseId == material.courseId:
            return True
        if a.topicId and material.topicId and a.topicId == material.topicId:
            return True

    return False



