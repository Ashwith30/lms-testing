from sqlalchemy.orm import Session
from typing import Optional
import models

def get_or_create_department(db: Session, dept_name: Optional[str], institution_id: Optional[str] = None) -> Optional[str]:
    """Finds or creates a Department by name, strictly scoped within an institution when provided."""
    if not dept_name or not dept_name.strip():
        return None
    dept_name = dept_name.strip()
    
    query = db.query(models.Department).filter(models.Department.name.ilike(dept_name))
    if institution_id:
        dept = query.filter(models.Department.institutionId == institution_id).first()
        if dept:
            return dept.id
        # Institution specified but department doesn't exist for this tenant: create fresh tenant-scoped department
        new_id = models.generate_uuid("dept-")
        new_dept = models.Department(id=new_id, name=dept_name, institutionId=institution_id)
        db.add(new_dept)
        db.commit()
        db.refresh(new_dept)
        return new_id

    # If no institution_id was specified (legacy / unscoped fallback)
    dept = query.first()
    if dept:
        return dept.id

    new_id = models.generate_uuid("dept-")
    new_dept = models.Department(id=new_id, name=dept_name, institutionId=None)
    db.add(new_dept)
    db.commit()
    db.refresh(new_dept)
    return new_id


def get_or_create_batch(db: Session, batch_name: Optional[str], dept_id: Optional[str], institution_id: Optional[str] = None) -> Optional[str]:
    """Finds or creates a Batch by name for a given departmentId, returning its id."""
    if not batch_name or not batch_name.strip() or not dept_id:
        return None
    batch_name = batch_name.strip()
    batch = db.query(models.Batch).filter(
        models.Batch.name.ilike(batch_name), 
        models.Batch.departmentId == dept_id
    ).first()
    if batch:
        return batch.id

    inst_id = institution_id
    if not inst_id:
        dept = db.query(models.Department).filter(models.Department.id == dept_id).first()
        if dept and dept.institutionId:
            inst_id = dept.institutionId

    new_id = models.generate_uuid("batch-")
    new_batch = models.Batch(id=new_id, name=batch_name, departmentId=dept_id, institutionId=inst_id)
    db.add(new_batch)
    db.commit()
    db.refresh(new_batch)
    return new_id
