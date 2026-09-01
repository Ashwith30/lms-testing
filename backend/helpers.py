from sqlalchemy.orm import Session
from typing import Optional
import models

def get_or_create_department(db: Session, dept_name: Optional[str]) -> Optional[str]:
    """Finds or creates a Department by name, returning its id."""
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

def get_or_create_batch(db: Session, batch_name: Optional[str], dept_id: Optional[str]) -> Optional[str]:
    """Finds or creates a Batch by name for a given departmentId, returning its id."""
    if not batch_name or not dept_id:
        return None
    batch = db.query(models.Batch).filter(
        models.Batch.name == batch_name, 
        models.Batch.departmentId == dept_id
    ).first()
    if batch:
        return batch.id
    new_id = models.generate_uuid("batch-")
    new_batch = models.Batch(id=new_id, name=batch_name, departmentId=dept_id)
    db.add(new_batch)
    db.commit()
    db.refresh(new_batch)
    return new_id
