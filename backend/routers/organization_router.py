from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional, Dict, Any
import models
import schemas
from database import get_db
from auth import get_current_user, require_roles, get_user_institution_id, hash_password

router = APIRouter(prefix="/api", tags=["organization"])

# --- Institutions CRUD (for Admin & Management.tsx) ---
@router.get("/institutions")
def get_institutions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution"))
):
    """Lists institutions. Admins see all, institutions see themselves."""
    if current_user.role == "institution":
        profiles = db.query(models.InstitutionProfile).filter(models.InstitutionProfile.userId == current_user.id).all()
    else:
        profiles = db.query(models.InstitutionProfile).all()

    result = []
    for p in profiles:
        student_count = db.query(models.StudentProfile).filter(models.StudentProfile.institutionId == p.userId).count()
        dept_count = db.query(models.Department).filter(models.Department.institutionId == p.userId).count()
        u = db.query(models.User).filter(models.User.id == p.userId).first()
        status_val = u.status if u else "active"
        result.append({
            "id": p.userId,
            "name": p.institutionName,
            "contactPersonName": p.contactPersonName or "",
            "supportEmail": p.supportEmail or (u.email if u else ""),
            "website": p.website or "",
            "address": p.address or "",
            "studentCount": student_count,
            "departmentCount": dept_count,
            "status": status_val,
            "createdAt": u.createdAt if u else None
        })
    return result


@router.post("/institutions", status_code=status.HTTP_201_CREATED)
def create_institution(
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin"))
):
    """Creates a new institution account and profile."""
    name = (payload.get("name") or payload.get("institutionName") or "").strip()
    email = (payload.get("email") or payload.get("supportEmail") or "").strip().lower()
    raw_pwd = payload.get("password") or "Institution@123"

    if not name:
        raise HTTPException(status_code=400, detail="Institution name is required.")
    if not email:
        raise HTTPException(status_code=400, detail="Institution email is required.")

    existing_u = db.query(models.User).filter(models.User.email.ilike(email)).first()
    if existing_u:
        raise HTTPException(status_code=400, detail="A user with this email already exists.")

    u_id = models.generate_uuid("u-inst-")
    user = models.User(
        id=u_id,
        email=email,
        password_hash=hash_password(raw_pwd),
        role="institution",
        status=payload.get("status", "active"),
        createdAt=models.get_utc_now()
    )
    db.add(user)

    profile = models.InstitutionProfile(
        userId=u_id,
        institutionName=name,
        contactPersonName=payload.get("contactPersonName"),
        supportEmail=email,
        website=payload.get("website"),
        address=payload.get("address")
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)

    return {
        "id": profile.userId,
        "name": profile.institutionName,
        "contactPersonName": profile.contactPersonName,
        "supportEmail": profile.supportEmail,
        "website": profile.website,
        "address": profile.address,
        "status": user.status
    }


@router.put("/institutions/{institution_id}")
def update_institution(
    institution_id: str,
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution"))
):
    if current_user.role == "institution" and current_user.id != institution_id:
        raise HTTPException(status_code=403, detail="Access denied")

    profile = db.query(models.InstitutionProfile).filter(models.InstitutionProfile.userId == institution_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Institution not found")

    if "name" in payload or "institutionName" in payload:
        profile.institutionName = (payload.get("name") or payload.get("institutionName") or profile.institutionName).strip()
    if "contactPersonName" in payload:
        profile.contactPersonName = payload.get("contactPersonName")
    if "supportEmail" in payload:
        profile.supportEmail = payload.get("supportEmail")
    if "website" in payload:
        profile.website = payload.get("website")
    if "address" in payload:
        profile.address = payload.get("address")

    if "status" in payload and current_user.role == "admin":
        u = db.query(models.User).filter(models.User.id == institution_id).first()
        if u:
            u.status = payload["status"]

    db.commit()
    db.refresh(profile)
    return {
        "id": profile.userId,
        "name": profile.institutionName,
        "contactPersonName": profile.contactPersonName,
        "supportEmail": profile.supportEmail,
        "website": profile.website,
        "address": profile.address
    }


@router.delete("/institutions/{institution_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_institution(
    institution_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin"))
):
    u = db.query(models.User).filter(models.User.id == institution_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="Institution not found")
    db.delete(u)
    db.commit()
    return None


# --- Departments ---
@router.get("/departments", response_model=List[schemas.Department])
def get_departments(
    institutionId: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.Department)
    if current_user.role == "institution":
        query = query.filter(models.Department.institutionId == current_user.id)
    elif current_user.role in ("trainer", "student"):
        inst_id = get_user_institution_id(current_user, db)
        if inst_id:
            query = query.filter(or_(models.Department.institutionId == inst_id, models.Department.institutionId == None))
    elif current_user.role == "admin" and institutionId:
        query = query.filter(models.Department.institutionId == institutionId)

    return query.all()


@router.post("/departments", response_model=schemas.Department, status_code=status.HTTP_201_CREATED)
def create_department(
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution"))
):
    name = (payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Department name is required.")

    inst_id = payload.get("institutionId") or (current_user.id if current_user.role == "institution" else None)
    d_id = payload.get("id") or models.generate_uuid("dept-")

    dept = models.Department(
        id=d_id,
        name=name,
        code=payload.get("code"),
        institutionId=inst_id
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept


# --- Batches ---
@router.get("/batches", response_model=List[schemas.Batch])
def get_batches(
    departmentId: Optional[str] = None,
    institutionId: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.Batch)
    if current_user.role == "institution":
        query = query.filter(
            or_(
                models.Batch.institutionId == current_user.id,
                models.Batch.department.has(models.Department.institutionId == current_user.id)
            )
        )
    elif current_user.role in ("trainer", "student"):
        inst_id = get_user_institution_id(current_user, db)
        if inst_id:
            query = query.filter(
                or_(
                    models.Batch.institutionId == inst_id,
                    models.Batch.department.has(models.Department.institutionId == inst_id),
                    models.Batch.institutionId == None
                )
            )
    elif current_user.role == "admin" and institutionId:
        query = query.filter(models.Batch.institutionId == institutionId)

    if departmentId:
        query = query.filter(models.Batch.departmentId == departmentId)

    return query.all()


@router.post("/batches", response_model=schemas.Batch, status_code=status.HTTP_201_CREATED)
def create_batch(
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution"))
):
    name = (payload.get("name") or "").strip()
    dept_id = payload.get("departmentId")
    if not name or not dept_id:
        raise HTTPException(status_code=400, detail="Batch name and departmentId are required.")

    dept = db.query(models.Department).filter(models.Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found.")

    inst_id = dept.institutionId or (current_user.id if current_user.role == "institution" else None)
    b_id = payload.get("id") or models.generate_uuid("batch-")

    batch = models.Batch(
        id=b_id,
        name=name,
        departmentId=dept_id,
        institutionId=inst_id,
        startDate=payload.get("startDate"),
        endDate=payload.get("endDate")
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)
    return batch


# --- Courses ---
@router.get("/courses", response_model=List[schemas.Course])
def get_courses(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return db.query(models.Course).all()
