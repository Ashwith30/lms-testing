from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import models
import schemas
from database import get_db
from auth import get_current_user, require_roles

router = APIRouter(prefix="/api", tags=["organization"])

@router.get("/batches", response_model=List[schemas.Batch])
def get_batches(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return db.query(models.Batch).all()

@router.get("/departments", response_model=List[schemas.Department])
def get_departments(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return db.query(models.Department).all()

@router.get("/courses", response_model=List[schemas.Course])
def get_courses(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return db.query(models.Course).all()
