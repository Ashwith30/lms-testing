import time
from typing import Union, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
import models
import schemas
from database import get_db
from auth import hash_password, verify_password, create_access_token, require_roles
from helpers import get_or_create_department, get_or_create_batch
from validators import validate_password
import rate_limiter

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/login", response_model=schemas.LoginResponse)
def login(creds: dict, request: Request = None, db: Session = Depends(get_db)):
    identifier = creds.get("identifier")
    password = creds.get("password")
    
    if not identifier or not password:
        raise HTTPException(status_code=400, detail="Identifier and password required")

    user = rate_limiter.handle_login_attempt(request, db, identifier, password)
    token = create_access_token({"sub": user.id, "role": user.role})
    
    return {
        "token": token,
        "user": user
    }

@router.post("/register/student", response_model=schemas.User)
def register_student(
    student: Union[schemas.StudentRegisterRequest, dict], 
    request: Request = None, 
    db: Session = Depends(get_db)
):
    rate_limiter.check_registration_rate_limit(request, db)

    if isinstance(student, dict):
        student_data = student
    else:
        student_data = student.model_dump()

    # MED-06: Reject client-supplied user IDs; all IDs must be generated exclusively by the server
    if (isinstance(student, dict) and ("id" in student or "userId" in student)) or (getattr(student, "id", None) is not None or getattr(student, "userId", None) is not None):
        raise HTTPException(status_code=400, detail="Client-supplied user ID is not permitted.")

    email = student_data.get("email")
    student_id = student_data.get("studentId") or student_data.get("studentNumber") or student_data.get("rollNo")
    
    if not email or not isinstance(email, str) or not email.strip():
        raise HTTPException(status_code=400, detail="Email is required.")

    email = email.strip().lower()

    existing_email = db.query(models.User).filter(models.User.email.ilike(email)).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="A user with this email address already exists.")
        
    if student_id and isinstance(student_id, str):
        student_id = student_id.strip()
        if student_id:
            existing_id = db.query(models.StudentProfile).filter(models.StudentProfile.studentNumber == student_id).first()
            if existing_id:
                raise HTTPException(status_code=400, detail="A user with this Roll No / Student ID already exists.")
    else:
        student_id = None
        
    # MED-03: Require non-empty password, remove default fallback, and strictly enforce password policy
    raw_password = student_data.get("password")
    if not raw_password or not isinstance(raw_password, str) or not raw_password.strip():
        raise HTTPException(status_code=400, detail="Password is required and cannot be empty.")

    is_valid, err_msg = validate_password(raw_password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=err_msg)

    hashed_pwd = hash_password(raw_password)

    # Server generates user ID exclusively
    user_id = models.generate_uuid("u-student-")
    
    db_user = models.User(
        id=user_id,
        email=email,
        role="student",
        password_hash=hashed_pwd,
        createdAt=models.get_utc_now()
    )
    db.add(db_user)
    
    name = student_data.get("name") or "Student"
    parts = name.strip().split(" ")
    first_name = parts[0]
    last_name = " ".join(parts[1:]) if len(parts) > 1 else "User"

    dept_id = get_or_create_department(db, student_data.get("department"))
    batch_id = get_or_create_batch(db, student_data.get("batch"), dept_id) if dept_id else None

    db_profile = models.StudentProfile(
        userId=user_id,
        firstName=first_name,
        lastName=last_name,
        studentNumber=student_id,
        departmentId=dept_id,
        primaryBatchId=batch_id,
        enrollmentDate=models.get_utc_now()
    )
    db.add(db_profile)
    db.commit()
    rate_limiter.record_registration_event(request, db)
    db.refresh(db_user)
    return db_user

@router.post("/register/trainer", response_model=schemas.User)
def register_trainer(
    trainer: Union[schemas.TrainerRegisterRequest, dict], 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin"))
):
    if isinstance(trainer, dict):
        trainer_data = trainer
    else:
        trainer_data = trainer.model_dump()

    # MED-06: Reject client-supplied user IDs; all IDs must be generated exclusively by the server
    if (isinstance(trainer, dict) and ("id" in trainer or "userId" in trainer)) or (getattr(trainer, "id", None) is not None or getattr(trainer, "userId", None) is not None):
        raise HTTPException(status_code=400, detail="Client-supplied user ID is not permitted.")

    email = trainer_data.get("email")
    if not email or not isinstance(email, str) or not email.strip():
        raise HTTPException(status_code=400, detail="Email is required.")
    
    email = email.strip().lower()

    existing_email = db.query(models.User).filter(models.User.email.ilike(email)).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="A user with this email address already exists.")
        
    # MED-03: Require non-empty password, remove default fallback, and strictly enforce password policy
    raw_password = trainer_data.get("password")
    if not raw_password or not isinstance(raw_password, str) or not raw_password.strip():
        raise HTTPException(status_code=400, detail="Password is required and cannot be empty.")

    is_valid, err_msg = validate_password(raw_password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=err_msg)

    hashed_pwd = hash_password(raw_password)

    # Server generates user ID exclusively
    user_id = models.generate_uuid("u-trainer-")

    db_user = models.User(
        id=user_id,
        email=email,
        role="trainer",
        password_hash=hashed_pwd,
        createdAt=models.get_utc_now()
    )
    db.add(db_user)
    
    name = trainer_data.get("name") or "Trainer"
    parts = name.strip().split(" ")
    first_name = parts[0]
    last_name = " ".join(parts[1:]) if len(parts) > 1 else "User"

    db_profile = models.TrainerProfile(
        userId=user_id,
        firstName=first_name,
        lastName=last_name
    )
    db.add(db_profile)
    
    db.commit()
    db.refresh(db_user)
    return db_user

