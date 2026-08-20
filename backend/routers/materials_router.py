import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import models
import schemas
from database import get_db
from auth import get_current_user, require_roles

router = APIRouter(prefix="/api/materials", tags=["materials"])

@router.get("", response_model=List[schemas.Material])
def get_materials(
    uploadedBy: Optional[str] = None,
    studentId: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.Material)
    if uploadedBy:
        query = query.filter(models.Material.authorId == uploadedBy)
    elif studentId:
        # If student requests, show released materials
        query = query.filter(models.Material.isReleased == True)
    return query.all()

@router.post("", response_model=schemas.Material)
def create_material(
    material: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer"))
):
    m_id = material.get("id") or models.generate_uuid("mat-")
    author_id = material.get("uploadedBy") or material.get("authorId") or current_user.id
    content_url = material.get("contentUrl") or material.get("url")
    description = material.get("description") or material.get("content")
    now = models.get_utc_now()
    
    is_released = material.get("isReleased", True)

    db_mat = models.Material(
        id=m_id,
        title=material.get("title", "Untitled Material"),
        description=description,
        type=material.get("type", "PDF"),
        courseId=material.get("courseId"),
        topicId=material.get("topicId"),
        contentUrl=content_url,
        authorId=author_id,
        isReleased=is_released,
        releasedAt=now if is_released else None,
        createdAt=material.get("createdAt") or now,
        updatedAt=now
    )
    db.add(db_mat)
    
    # Assign to batch if specified
    assigned_batch = material.get("assignedBatch")
    if assigned_batch and assigned_batch != "all":
        batch = db.query(models.Batch).filter(models.Batch.name == assigned_batch).first()
        b_id = batch.id if batch else assigned_batch
        db.add(models.MaterialAssignment(
            id=models.generate_uuid("ma-"),
            materialId=m_id,
            assigneeType="batch",
            assigneeId=b_id
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
        
    for k, v in payload.items():
        if k == "isReleased":
            db_mat.isReleased = bool(v)
            if db_mat.isReleased and not db_mat.releasedAt:
                db_mat.releasedAt = models.get_utc_now()
        elif k in ("url", "contentUrl"):
            db_mat.contentUrl = v
        elif k in ("content", "description"):
            db_mat.description = v
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
        
    db.delete(db_mat)
    db.commit()
    return {"message": "Deleted"}
