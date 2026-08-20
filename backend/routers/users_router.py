import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import models
import schemas
from database import get_db
from auth import get_current_user, require_roles

router = APIRouter(prefix="/api/users", tags=["users"])

def get_or_create_department(db: Session, dept_name: str) -> Optional[str]:
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

def get_or_create_batch(db: Session, batch_name: str, dept_id: Optional[str]) -> Optional[str]:
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

@router.get("", response_model=List[schemas.User])
@router.get("/all", response_model=List[schemas.User])
def get_all_users(
    role: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer"))
):
    query = db.query(models.User)
    if role:
        query = query.filter(models.User.role == role)
    return query.all()

@router.get("/{user_id}", response_model=schemas.User)
def get_user(
    user_id: str, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role not in ("admin", "institution", "trainer") and current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/{user_id}", response_model=schemas.User)
def update_user(
    user_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role not in ("admin", "institution") and current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if "email" in payload and payload["email"]:
        # Check uniqueness if changed
        existing = db.query(models.User).filter(models.User.email == payload["email"], models.User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        user.email = payload["email"]

    if "status" in payload and current_user.role in ("admin", "institution"):
        user.status = payload["status"]

    # Update profile based on role
    name = payload.get("name")
    first_name = name.split(" ")[0] if name else None
    last_name = " ".join(name.split(" ")[1:]) if name and len(name.split(" ")) > 1 else "User"

    if user.role == "student":
        if not user.student_profile:
            user.student_profile = models.StudentProfile(
                userId=user.id,
                firstName=first_name or "Student",
                lastName=last_name or "User"
            )
            db.add(user.student_profile)
        if first_name:
            user.student_profile.firstName = first_name
            user.student_profile.lastName = last_name
        if "studentId" in payload or "studentNumber" in payload:
            user.student_profile.studentNumber = payload.get("studentId") or payload.get("studentNumber")
        if "phoneNumber" in payload:
            user.student_profile.phoneNumber = payload.get("phoneNumber")

        dept_name = payload.get("department")
        batch_name = payload.get("batch")
        if dept_name:
            dept_id = get_or_create_department(db, dept_name)
            user.student_profile.departmentId = dept_id
            if batch_name:
                batch_id = get_or_create_batch(db, batch_name, dept_id)
                user.student_profile.primaryBatchId = batch_id

    elif user.role == "trainer":
        if not user.trainer_profile:
            user.trainer_profile = models.TrainerProfile(
                userId=user.id,
                firstName=first_name or "Trainer",
                lastName=last_name or "User"
            )
            db.add(user.trainer_profile)
        if first_name:
            user.trainer_profile.firstName = first_name
            user.trainer_profile.lastName = last_name
        if "specialization" in payload:
            user.trainer_profile.specialization = payload.get("specialization")
        if "employeeId" in payload:
            user.trainer_profile.employeeId = payload.get("employeeId")

    elif user.role == "institution":
        if not user.institution_profile:
            user.institution_profile = models.InstitutionProfile(
                userId=user.id,
                institutionName=name or "Institution"
            )
            db.add(user.institution_profile)
        if name:
            user.institution_profile.institutionName = name
        if "contactPersonName" in payload:
            user.institution_profile.contactPersonName = payload.get("contactPersonName")
        if "supportEmail" in payload:
            user.institution_profile.supportEmail = payload.get("supportEmail")

    user.updatedAt = models.get_utc_now()
    db.commit()
    db.refresh(user)
    return user
