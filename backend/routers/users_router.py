import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Union
import models
import schemas
from database import get_db
from auth import get_current_user, require_roles

router = APIRouter(prefix="/api/users", tags=["users"])

@router.get("", response_model=Union[schemas.PaginatedResponse[schemas.User], List[schemas.User]])
@router.get("/all", response_model=Union[schemas.PaginatedResponse[schemas.User], List[schemas.User]])
def get_all_users(
    role: Optional[str] = None,
    page: Optional[int] = None,
    limit: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer"))
):
    query = db.query(models.User)
    if role:
        query = query.filter(models.User.role == role)
    if page is not None:
        p = max(1, page)
        l = max(1, limit) if limit else 50
        total = query.count()
        items = query.offset((p - 1) * l).limit(l).all()
        return {"data": items, "total": total, "page": p, "limit": l}
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
    req: schemas.UserUpdateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role not in ("admin", "institution") and current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 1. Role-based field allowlist and authorization enforcement
    if current_user.role == "student":
        # Students may ONLY update name and phoneNumber
        unauthorized_fields = [
            ("batch", req.batch),
            ("department", req.department),
            ("studentId", req.studentId),
            ("studentNumber", req.studentNumber),
            ("email", req.email),
            ("role", req.role),
            ("status", req.status),
            ("specialization", req.specialization),
            ("employeeId", req.employeeId),
            ("contactPersonName", req.contactPersonName),
            ("supportEmail", req.supportEmail)
        ]
        attempted = [name for name, val in unauthorized_fields if val is not None]
        if attempted:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Students are not authorized to modify academic, institutional, or account authorization fields: {attempted}."
            )

    elif current_user.role == "trainer":
        # Trainers updating own profile may only update name, phoneNumber, and specialization
        unauthorized_fields = [
            ("batch", req.batch),
            ("department", req.department),
            ("studentId", req.studentId),
            ("studentNumber", req.studentNumber),
            ("email", req.email),
            ("role", req.role),
            ("status", req.status),
            ("employeeId", req.employeeId),
            ("contactPersonName", req.contactPersonName),
            ("supportEmail", req.supportEmail)
        ]
        attempted = [name for name, val in unauthorized_fields if val is not None]
        if attempted:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Trainers are not authorized to modify role, status, or institutional fields: {attempted}."
            )

    # 2. Administrative updates (admin and institution)
    if current_user.role in ("admin", "institution"):
        if req.role is not None:
            if current_user.role != "admin":
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only administrators can modify user roles.")
            if req.role not in ("admin", "institution", "trainer", "student"):
                raise HTTPException(status_code=400, detail="Invalid role specified.")
            user.role = req.role

        if req.status is not None:
            norm_status = req.status.strip().lower()
            if norm_status not in ("active", "suspended", "archived", "inactive"):
                raise HTTPException(status_code=400, detail="Invalid status specified.")
            user.status = norm_status

        if req.email is not None and req.email.strip() and req.email.strip() != user.email:
            existing = db.query(models.User).filter(models.User.email == req.email.strip(), models.User.id != user_id).first()
            if existing:
                raise HTTPException(status_code=400, detail="Email already in use")
            user.email = req.email.strip()

        # Department assignment for students (resolve existing only; no dynamic creation)
        if req.department is not None and user.role == "student":
            dept = db.query(models.Department).filter(
                (models.Department.id == req.department) | (models.Department.name.ilike(req.department.strip()))
            ).first()
            if not dept:
                raise HTTPException(status_code=404, detail=f"Department '{req.department}' does not exist.")
            if not user.student_profile:
                user.student_profile = models.StudentProfile(userId=user.id, firstName="Student", lastName="User")
                db.add(user.student_profile)
            user.student_profile.departmentId = dept.id

        # Batch assignment for students (resolve existing only; no dynamic creation)
        if req.batch is not None and user.role == "student":
            batch = db.query(models.Batch).filter(
                (models.Batch.id == req.batch) | (models.Batch.name.ilike(req.batch.strip()))
            ).first()
            if not batch:
                raise HTTPException(status_code=404, detail=f"Batch '{req.batch}' does not exist.")
            if not user.student_profile:
                user.student_profile = models.StudentProfile(userId=user.id, firstName="Student", lastName="User")
                db.add(user.student_profile)
            user.student_profile.primaryBatchId = batch.id

        # StudentNumber update
        student_num = req.studentId or req.studentNumber
        if student_num is not None and user.role == "student":
            if not user.student_profile:
                user.student_profile = models.StudentProfile(userId=user.id, firstName="Student", lastName="User")
                db.add(user.student_profile)
            user.student_profile.studentNumber = student_num.strip()

        # EmployeeId update
        if req.employeeId is not None and user.role == "trainer":
            if not user.trainer_profile:
                user.trainer_profile = models.TrainerProfile(userId=user.id, firstName="Trainer", lastName="User")
                db.add(user.trainer_profile)
            user.trainer_profile.employeeId = req.employeeId.strip()

    # 3. Common profile fields
    if req.name is not None and req.name.strip():
        parts = req.name.strip().split()
        first_name = parts[0]
        last_name = " ".join(parts[1:]) if len(parts) > 1 else ""

        if user.role == "student":
            if not user.student_profile:
                user.student_profile = models.StudentProfile(userId=user.id, firstName=first_name, lastName=last_name)
                db.add(user.student_profile)
            else:
                user.student_profile.firstName = first_name
                user.student_profile.lastName = last_name
        elif user.role == "trainer":
            if not user.trainer_profile:
                user.trainer_profile = models.TrainerProfile(userId=user.id, firstName=first_name, lastName=last_name)
                db.add(user.trainer_profile)
            else:
                user.trainer_profile.firstName = first_name
                user.trainer_profile.lastName = last_name
        elif user.role == "institution":
            if not user.institution_profile:
                user.institution_profile = models.InstitutionProfile(userId=user.id, institutionName=req.name.strip())
                db.add(user.institution_profile)
            else:
                user.institution_profile.institutionName = req.name.strip()

    if req.phoneNumber is not None:
        clean_phone = req.phoneNumber.strip()
        if user.role == "student":
            if not user.student_profile:
                user.student_profile = models.StudentProfile(userId=user.id, firstName="Student", lastName="User")
                db.add(user.student_profile)
            user.student_profile.phoneNumber = clean_phone
        elif user.role == "trainer":
            if not user.trainer_profile:
                user.trainer_profile = models.TrainerProfile(userId=user.id, firstName="Trainer", lastName="User")
                db.add(user.trainer_profile)
            user.trainer_profile.phoneNumber = clean_phone

    if req.specialization is not None and user.role == "trainer":
        if not user.trainer_profile:
            user.trainer_profile = models.TrainerProfile(userId=user.id, firstName="Trainer", lastName="User")
            db.add(user.trainer_profile)
        user.trainer_profile.specialization = req.specialization.strip()

    if req.contactPersonName is not None and user.role == "institution":
        if not user.institution_profile:
            user.institution_profile = models.InstitutionProfile(userId=user.id, institutionName="Institution")
            db.add(user.institution_profile)
        user.institution_profile.contactPersonName = req.contactPersonName.strip()

    if req.supportEmail is not None and user.role == "institution":
        if not user.institution_profile:
            user.institution_profile = models.InstitutionProfile(userId=user.id, institutionName="Institution")
            db.add(user.institution_profile)
        user.institution_profile.supportEmail = req.supportEmail.strip()

    user.updatedAt = models.get_utc_now()
    db.commit()
    db.refresh(user)
    return user
