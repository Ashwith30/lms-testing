import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import models
import schemas
from database import get_db
from auth import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/api/auth", tags=["auth"])

def get_or_create_department(db: Session, dept_name: str) -> str:
    if not dept_name:
        return None
    dept = db.query(models.Department).filter(models.Department.name == dept_name).first()
    if dept:
        return dept.id
    new_id = models.generate_uuid("dept-")
    new_dept = models.Department(id=new_id, name=dept_name)
    db.add(new_dept)
    db.commit()
    db.refresh(new_dept)
    return new_id

def get_or_create_batch(db: Session, batch_name: str, dept_id: str) -> str:
    if not batch_name or not dept_id:
        return None
    batch = db.query(models.Batch).filter(models.Batch.name == batch_name, models.Batch.departmentId == dept_id).first()
    if batch:
        return batch.id
    new_id = models.generate_uuid("batch-")
    new_batch = models.Batch(id=new_id, name=batch_name, departmentId=dept_id)
    db.add(new_batch)
    db.commit()
    db.refresh(new_batch)
    return new_id

@router.post("/login", response_model=schemas.LoginResponse)
def login(creds: dict, db: Session = Depends(get_db)):
    identifier = creds.get("identifier")
    password = creds.get("password")
    
    if not identifier or not password:
        raise HTTPException(status_code=400, detail="Identifier and password required")

    # Find by email or studentNumber (in StudentProfile)
    user = db.query(models.User).filter(models.User.email == identifier).first()
    
    if not user:
        student_profile = db.query(models.StudentProfile).filter(models.StudentProfile.studentNumber == identifier).first()
        if student_profile:
            user = student_profile.user

    if user and verify_password(password, user.password_hash):
        user.lastLoginAt = models.get_utc_now()
        db.commit()
        token = create_access_token({"sub": user.id, "role": user.role})
        
        return {
            "token": token,
            "user": user
        }
            
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
def register_trainer(trainer: dict, db: Session = Depends(get_db)):
    email = trainer.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required.")
    
    existing_email = db.query(models.User).filter(models.User.email == email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="A user with this email address already exists.")
        
    raw_password = trainer.get("password") or "trainer123"
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
