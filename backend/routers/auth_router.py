import time
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import models
import schemas
from database import get_db
from auth import hash_password, verify_password, create_access_token, require_roles
from helpers import get_or_create_department, get_or_create_batch
from validators import validate_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Rate limiter: tracks failed login attempts: {identifier: [timestamp, ...]}
FAILED_ATTEMPTS = {}
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_SECONDS = 300  # 5 minutes

def check_login_rate_limit(identifier: str):
    now = time.time()
    attempts = FAILED_ATTEMPTS.get(identifier, [])
    # Filter attempts within the lockout window
    recent_attempts = [t for t in attempts if now - t < LOCKOUT_SECONDS]
    FAILED_ATTEMPTS[identifier] = recent_attempts
    if len(recent_attempts) >= MAX_FAILED_ATTEMPTS:
        remaining = int(LOCKOUT_SECONDS - (now - recent_attempts[0]))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many failed login attempts. Please try again in {max(1, remaining)} seconds."
        )

def record_failed_login(identifier: str):
    now = time.time()
    if identifier not in FAILED_ATTEMPTS:
        FAILED_ATTEMPTS[identifier] = []
    FAILED_ATTEMPTS[identifier].append(now)

def clear_failed_login(identifier: str):
    if identifier in FAILED_ATTEMPTS:
        del FAILED_ATTEMPTS[identifier]

@router.post("/login", response_model=schemas.LoginResponse)
def login(creds: dict, db: Session = Depends(get_db)):
    identifier = creds.get("identifier")
    password = creds.get("password")
    
    if not identifier or not password:
        raise HTTPException(status_code=400, detail="Identifier and password required")

    check_login_rate_limit(identifier)

    # Find by email or studentNumber (in StudentProfile)
    user = db.query(models.User).filter(models.User.email == identifier).first()
    
    if not user:
        student_profile = db.query(models.StudentProfile).filter(models.StudentProfile.studentNumber == identifier).first()
        if student_profile:
            user = student_profile.user

    if user and verify_password(password, user.password_hash):
        clear_failed_login(identifier)
        user.lastLoginAt = models.get_utc_now()
        db.commit()
        token = create_access_token({"sub": user.id, "role": user.role})
        
        return {
            "token": token,
            "user": user
        }
            
    record_failed_login(identifier)
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

@router.post("/register/student", response_model=schemas.User)
def register_student(student: dict, db: Session = Depends(get_db)):
    email = student.get("email")
    student_id = student.get("studentId")
    
    if not email:
        raise HTTPException(status_code=400, detail="Email is required.")

    existing_email = db.query(models.User).filter(models.User.email == email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="A user with this email address already exists.")
        
    if student_id:
        existing_id = db.query(models.StudentProfile).filter(models.StudentProfile.studentNumber == student_id).first()
        if existing_id:
            raise HTTPException(status_code=400, detail="A user with this Student ID already exists.")
        
    raw_password = student.get("password") or "student123"
    if student.get("password"):
        is_valid, err_msg = validate_password(raw_password)
        if not is_valid:
            raise HTTPException(status_code=400, detail=err_msg)

    hashed_pwd = hash_password(raw_password)

    user_id = student.get("id") or models.generate_uuid("u-student-")
    
    db_user = models.User(
        id=user_id,
        email=email,
        role="student",
        password_hash=hashed_pwd,
        createdAt=models.get_utc_now()
    )
    db.add(db_user)
    
    name = student.get("name", "Student")
    parts = name.split(" ")
    first_name = parts[0]
    last_name = " ".join(parts[1:]) if len(parts) > 1 else "User"

    dept_id = get_or_create_department(db, student.get("department"))
    batch_id = get_or_create_batch(db, student.get("batch"), dept_id) if dept_id else None

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
    db.refresh(db_user)
    return db_user

@router.post("/register/trainer", response_model=schemas.User)
def register_trainer(
    trainer: dict, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin"))
):
    email = trainer.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required.")
    
    existing_email = db.query(models.User).filter(models.User.email == email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="A user with this email address already exists.")
        
    raw_password = trainer.get("password") or "trainer123"
    if trainer.get("password"):
        is_valid, err_msg = validate_password(raw_password)
        if not is_valid:
            raise HTTPException(status_code=400, detail=err_msg)

    hashed_pwd = hash_password(raw_password)

    user_id = trainer.get("id") or models.generate_uuid("u-trainer-")

    db_user = models.User(
        id=user_id,
        email=email,
        role="trainer",
        password_hash=hashed_pwd,
        createdAt=models.get_utc_now()
    )
    db.add(db_user)
    
    name = trainer.get("name", "Trainer")
    parts = name.split(" ")
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
