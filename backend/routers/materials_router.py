import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import or_, and_
from sqlalchemy.orm import Session
from typing import List, Optional, Union
import models
import schemas
from database import get_db
from auth import (
    get_current_user,
    require_roles,
    check_student_material_access,
    check_trainer_material_access,
    get_user_institution_id
)

router = APIRouter(prefix="/api/materials", tags=["materials"])

@router.get("", response_model=Union[schemas.PaginatedResponse[schemas.Material], List[schemas.Material]])
def get_materials(
    uploadedBy: Optional[str] = None,
    studentId: Optional[str] = None,
    courseId: Optional[str] = None,
    topicId: Optional[str] = None,
    type: Optional[str] = None,
    page: Optional[int] = None,
    limit: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.Material)

    if current_user.role == "student":
        # Students: strictly enforce release status and access authorization on backend
        # Ignore any client-supplied uploadedBy or studentId spoofing
        now_iso = models.get_utc_now()
        query = query.filter(
            models.Material.isReleased == True,
            or_(models.Material.releasedAt == None, models.Material.releasedAt <= now_iso)
        )
        if courseId:
            query = query.filter(models.Material.courseId == courseId)
        if topicId:
            query = query.filter(models.Material.topicId == topicId)
        if type:
            query = query.filter(models.Material.type.ilike(type))

        all_released = query.order_by(models.Material.createdAt.desc()).all()
        authorized_materials = [
            m for m in all_released
            if check_student_material_access(current_user, m, db)
        ]

        if page is not None:
            p = max(1, page)
            l = max(1, limit) if limit else 50
            total = len(authorized_materials)
            items = authorized_materials[(p - 1) * l : p * l]
            return {"data": items, "total": total, "page": p, "limit": l}
        return authorized_materials

    # Trainers, Admins, Institutions
    if uploadedBy:
        query = query.filter(models.Material.authorId == uploadedBy)
    if courseId:
        query = query.filter(models.Material.courseId == courseId)
    if topicId:
        query = query.filter(models.Material.topicId == topicId)
    if type:
        query = query.filter(models.Material.type.ilike(type))

    if current_user.role == "institution":
        query = query.filter(or_(models.Material.institutionId == current_user.id, models.Material.authorId == current_user.id))

    query = query.order_by(models.Material.createdAt.desc())

    if page is not None:
        p = max(1, page)
        l = max(1, limit) if limit else 50
        total = query.count()
        items = query.offset((p - 1) * l).limit(l).all()
        return {"data": items, "total": total, "page": p, "limit": l}
    return query.all()

@router.get("/{material_id}", response_model=schemas.Material)
def get_material(
    material_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_mat = db.query(models.Material).filter(models.Material.id == material_id).first()
    if not db_mat:
        raise HTTPException(status_code=404, detail="Material not found")

    if current_user.role == "student":
        if not check_student_material_access(current_user, db_mat, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You are not authorized to access this material."
            )

    return db_mat

@router.post("", response_model=schemas.Material)
def create_material(
    material: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer"))
):
    m_id = material.get("id") or models.generate_uuid("mat-")
    
    # If caller is trainer, force author_id to current_user.id to prevent author spoofing
    if current_user.role == "trainer":
        author_id = current_user.id
    else:
        author_id = material.get("uploadedBy") or material.get("authorId") or current_user.id

    content_url = material.get("contentUrl") or material.get("url")
    description = material.get("description") or material.get("content")
    now = models.get_utc_now()
    
    is_released = material.get("isReleased", True)
    inst_id = material.get("institutionId") or (current_user.id if current_user.role == "institution" else get_user_institution_id(current_user, db))

    db_mat = models.Material(
        id=m_id,
        title=material.get("title", "Untitled Material"),
        description=description,
        type=material.get("type", "PDF"),
        courseId=material.get("courseId"),
        topicId=material.get("topicId"),
        contentUrl=content_url,
        authorId=author_id,
        institutionId=inst_id,
        isReleased=is_released,
        releasedAt=now if is_released else None,
        createdAt=material.get("createdAt") or now,
        updatedAt=now
    )
    db.add(db_mat)
    
    # Assign to batch if specified
    assigned_batches = material.get("assignedBatches")
    if not assigned_batches:
        single_b = material.get("assignedBatch")
        if single_b:
            assigned_batches = [single_b]
    if assigned_batches and isinstance(assigned_batches, list):
        for ab in assigned_batches:
            if ab and str(ab).strip().lower() != "all":
                batch = db.query(models.Batch).filter(
                    or_(models.Batch.name == ab, models.Batch.id == ab)
                ).first()
                b_id = batch.id if batch else ab
                db.add(models.MaterialAssignment(
                    id=models.generate_uuid("ma-"),
                    materialId=m_id,
                    assigneeType="batch",
                    assigneeId=b_id
                ))
                if batch:
                    db.add(models.MaterialBatchTarget(
                        materialId=m_id,
                        batchId=batch.id
                    ))

    db.commit()
    db.refresh(db_mat)
    return db_mat

@router.put("/{material_id}", response_model=schemas.Material)
def update_material(
    material_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer"))
):
    db_mat = db.query(models.Material).filter(models.Material.id == material_id).first()
    if not db_mat:
        raise HTTPException(status_code=404, detail="Material not found")

    if current_user.role == "trainer" and db_mat.authorId != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You are not authorized to update materials authored by another trainer."
        )

    for k, v in payload.items():
        if k == "isReleased":
            db_mat.isReleased = bool(v)
            if db_mat.isReleased and not db_mat.releasedAt:
                db_mat.releasedAt = models.get_utc_now()
        elif k in ("url", "contentUrl"):
            db_mat.contentUrl = v
        elif k in ("content", "description"):
            db_mat.description = v
        elif k in ("assignedBatch", "assignedBatches"):
            # Update batch assignment
            for a in list(db_mat.assignments):
                if (a.assigneeType or "").strip().lower() == "batch":
                    db.delete(a)
            db.query(models.MaterialBatchTarget).filter(models.MaterialBatchTarget.materialId == material_id).delete()
            batches_to_add = v if isinstance(v, list) else ([v] if v else [])
            for b_entry in batches_to_add:
                if b_entry and str(b_entry).strip().lower() != "all":
                    batch = db.query(models.Batch).filter(
                        or_(models.Batch.name == b_entry, models.Batch.id == b_entry)
                    ).first()
                    b_id = batch.id if batch else b_entry
                    db.add(models.MaterialAssignment(
                        id=models.generate_uuid("ma-"),
                        materialId=material_id,
                        assigneeType="batch",
                        assigneeId=b_id
                    ))
                    if batch:
                        db.add(models.MaterialBatchTarget(
                            materialId=material_id,
                            batchId=batch.id
                        ))
        elif hasattr(db_mat, k):
            setattr(db_mat, k, v)

    db_mat.updatedAt = models.get_utc_now()
    db.commit()
    db.refresh(db_mat)
    return db_mat

@router.delete("/{material_id}")
def delete_material(
    material_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer"))
):
    db_mat = db.query(models.Material).filter(models.Material.id == material_id).first()
    if not db_mat:
        raise HTTPException(status_code=404, detail="Material not found")

    if current_user.role == "trainer" and db_mat.authorId != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You are not authorized to delete materials authored by another trainer."
        )

    db.delete(db_mat)
    db.commit()
    return {"message": "Deleted"}
