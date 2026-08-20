import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
import models
import schemas
from database import get_db
from auth import get_current_user, require_roles

router = APIRouter(prefix="/api", tags=["tests"])

@router.get("/tests", response_model=List[schemas.Test])
def get_tests(
    createdBy: Optional[str] = None,
    authorId: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.Test)
    target_author = createdBy or authorId
    if target_author:
        query = query.filter(models.Test.authorId == target_author)
    return query.all()

@router.get("/tests/{test_id}", response_model=schemas.Test)
def get_test(
    test_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    test = db.query(models.Test).filter(models.Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    return test

@router.post("/tests", response_model=schemas.Test)
def create_test(
    test: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer"))
):
    test_id = test.get("id") or models.generate_uuid("test-")
    author_id = test.get("createdBy") or test.get("authorId") or current_user.id
    now = models.get_utc_now()
    
    profile = db.query(models.ProctoringProfile).first()
    
    settings_data = test.get("settings")
    settings_json = json.dumps(settings_data) if settings_data is not None else None

    db_test = models.Test(
        id=test_id,
        title=test.get("title", "New Test"),
        description=test.get("description", ""),
        courseId=test.get("courseId"),
        topicId=test.get("topicId"),
        passingPercentage=test.get("passingPercentage"),
        totalMarks=float(test.get("totalMarks", 0.0)),
        authorId=author_id,
        status=test.get("status", "Draft"),
        proctoringProfileId=test.get("proctoringProfileId") or (profile.id if profile else None),
        settings_json=settings_json,
        createdAt=test.get("createdAt") or now
    )
    db.add(db_test)
    
    # Handle question mappings
    questionIds = test.get("questionIds", [])
    for i, qid in enumerate(questionIds):
        db.add(models.TestQuestion(testId=test_id, questionId=qid, orderIndex=i))
        
    db.commit()
    db.refresh(db_test)
    return db_test

@router.put("/tests/{test_id}", response_model=schemas.Test)
def update_test(
    test_id: str,
    test: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer"))
):
    db_test = db.query(models.Test).filter(models.Test.id == test_id).first()
    if not db_test:
        raise HTTPException(status_code=404, detail="Test not found")
        
    # Standard column fields
    columns_to_update = ["title", "description", "courseId", "topicId", "passingPercentage", "totalMarks", "status", "proctoringProfileId"]
    for col in columns_to_update:
        if col in test:
            setattr(db_test, col, test[col])
            
    if "settings" in test:
        db_test.settings_json = json.dumps(test["settings"]) if test["settings"] is not None else None
        
    if "questionIds" in test:
        # Replace mapping
        db.query(models.TestQuestion).filter(models.TestQuestion.testId == test_id).delete()
        for i, qid in enumerate(test["questionIds"]):
            db.add(models.TestQuestion(testId=test_id, questionId=qid, orderIndex=i))

    db.commit()
    db.refresh(db_test)
    return db_test

@router.delete("/tests/{test_id}")
def delete_test(
    test_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer"))
):
    db_test = db.query(models.Test).filter(models.Test.id == test_id).first()
    if not db_test:
        raise HTTPException(status_code=404, detail="Test not found")
        
    db.query(models.TestQuestion).filter(models.TestQuestion.testId == test_id).delete()
    db.delete(db_test)
    db.commit()
    return {"message": "Deleted"}

@router.post("/tests/{test_id}/clone", response_model=schemas.Test)
def clone_test(
    test_id: str,
    payload: Optional[dict] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer"))
):
    orig = db.query(models.Test).filter(models.Test.id == test_id).first()
    if not orig:
        raise HTTPException(status_code=404, detail="Test not found")
        
    custom_title = (payload or {}).get("title") or f"{orig.title} (Copy)"
    new_id = models.generate_uuid("test-")
    now = models.get_utc_now()
    
    cloned_test = models.Test(
        id=new_id,
        title=custom_title,
        description=orig.description,
        courseId=orig.courseId,
        topicId=orig.topicId,
        passingPercentage=orig.passingPercentage,
        totalMarks=orig.totalMarks,
        authorId=current_user.id,
        status="Draft",
        proctoringProfileId=orig.proctoringProfileId,
        settings_json=orig.settings_json,
        createdAt=now
    )
    db.add(cloned_test)
    
    for tq in orig.test_questions:
        db.add(models.TestQuestion(testId=new_id, questionId=tq.questionId, orderIndex=tq.orderIndex))
        
    db.commit()
    db.refresh(cloned_test)
    return cloned_test

@router.post("/tests/{test_id}/reconduct")
def reconduct_test(
    test_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer"))
):
    orig = db.query(models.Test).filter(models.Test.id == test_id).first()
    if not orig:
        raise HTTPException(status_code=404, detail="Test not found")

    target_test_id = test_id
    cloned_test_obj = None

    if payload.get("cloneTest"):
        title = payload.get("newTestTitle") or f"{orig.title} (Reconduct)"
        new_test_id = models.generate_uuid("test-")
        now = models.get_utc_now()
        cloned_test_obj = models.Test(
            id=new_test_id,
            title=title,
            description=orig.description,
            courseId=orig.courseId,
            topicId=orig.topicId,
            passingPercentage=orig.passingPercentage,
            totalMarks=orig.totalMarks,
            authorId=current_user.id,
            status="Draft",
            proctoringProfileId=orig.proctoringProfileId,
            settings_json=orig.settings_json,
            createdAt=now
        )
        db.add(cloned_test_obj)
        for tq in orig.test_questions:
            db.add(models.TestQuestion(testId=new_test_id, questionId=tq.questionId, orderIndex=tq.orderIndex))
        target_test_id = new_test_id

    # Create schedule
    s_id = models.generate_uuid("sch-")
    sched = models.Schedule(
        id=s_id,
        testId=target_test_id,
        startTime=payload.get("startTime", models.get_utc_now()),
        endTime=payload.get("endTime", models.get_utc_now()),
        durationMinutes=payload.get("durationMinutes", 60),
        attemptsAllowed=payload.get("attemptsAllowed", 1)
    )
    db.add(sched)

    assigned_batch = payload.get("assignedBatch")
    assigned_students = payload.get("assignedStudents", [])

    if assigned_batch and assigned_batch != "all":
        batch = db.query(models.Batch).filter(models.Batch.name == assigned_batch).first()
        b_id = batch.id if batch else assigned_batch
        db.add(models.ScheduleAssignment(
            id=models.generate_uuid("sa-"),
            scheduleId=s_id,
            assigneeType="batch",
            assigneeId=b_id
        ))

    if assigned_students:
        for st_id in assigned_students:
            db.add(models.ScheduleAssignment(
                id=models.generate_uuid("sa-"),
                scheduleId=s_id,
                assigneeType="student",
                assigneeId=st_id
            ))

    db.commit()
    db.refresh(sched)
    if cloned_test_obj:
        db.refresh(cloned_test_obj)

    return {
        "schedule": sched,
        "clonedTest": cloned_test_obj,
        "message": "Test reconducted and scheduled successfully."
    }

# --- Schedules CRUD ---
@router.get("/tests/{test_id}/schedules", response_model=List[schemas.Schedule])
def get_test_schedules(
    test_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return db.query(models.Schedule).filter(models.Schedule.testId == test_id).all()

@router.get("/schedules", response_model=List[schemas.Schedule])
def get_schedules(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return db.query(models.Schedule).all()

@router.get("/schedules/{schedule_id}", response_model=schemas.Schedule)
def get_schedule(
    schedule_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    sched = db.query(models.Schedule).filter(models.Schedule.id == schedule_id).first()
    if not sched:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return sched

@router.post("/schedules", response_model=schemas.Schedule)
def create_schedule(
    sched: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer"))
):
    s_id = sched.get("id") or models.generate_uuid("sch-")
    db_sched = models.Schedule(
        id=s_id,
        testId=sched.get("testId"),
        startTime=sched.get("startTime"),
        endTime=sched.get("endTime"),
        durationMinutes=sched.get("durationMinutes"),
        attemptsAllowed=int(sched.get("attemptsAllowed", 1))
    )
    db.add(db_sched)
    
    assigned_batch = sched.get("assignedBatch")
    assigned_students = sched.get("assignedStudents", [])
    
    if assigned_batch and assigned_batch != "all":
        batch = db.query(models.Batch).filter(models.Batch.name == assigned_batch).first()
        b_id = batch.id if batch else assigned_batch
        db.add(models.ScheduleAssignment(
            id=models.generate_uuid("sa-"),
            scheduleId=s_id,
            assigneeType="batch",
            assigneeId=b_id
        ))
            
    if assigned_students:
        for st_id in assigned_students:
            db.add(models.ScheduleAssignment(
                id=models.generate_uuid("sa-"),
                scheduleId=s_id,
                assigneeType="student",
                assigneeId=st_id
            ))

    db.commit()
    db.refresh(db_sched)
    return db_sched

@router.put("/schedules/{schedule_id}", response_model=schemas.Schedule)
def update_schedule(
    schedule_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer"))
):
    db_sched = db.query(models.Schedule).filter(models.Schedule.id == schedule_id).first()
    if not db_sched:
        raise HTTPException(status_code=404, detail="Schedule not found")
        
    for k in ["testId", "startTime", "endTime", "durationMinutes", "attemptsAllowed"]:
        if k in payload:
            setattr(db_sched, k, payload[k])
            
    if "assignedBatch" in payload or "assignedStudents" in payload:
        db.query(models.ScheduleAssignment).filter(models.ScheduleAssignment.scheduleId == schedule_id).delete()
        assigned_batch = payload.get("assignedBatch")
        assigned_students = payload.get("assignedStudents", [])
        if assigned_batch and assigned_batch != "all":
            batch = db.query(models.Batch).filter(models.Batch.name == assigned_batch).first()
            b_id = batch.id if batch else assigned_batch
            db.add(models.ScheduleAssignment(
                id=models.generate_uuid("sa-"),
                scheduleId=schedule_id,
                assigneeType="batch",
                assigneeId=b_id
            ))
        if assigned_students:
            for st_id in assigned_students:
                db.add(models.ScheduleAssignment(
                    id=models.generate_uuid("sa-"),
                    scheduleId=schedule_id,
                    assigneeType="student",
                    assigneeId=st_id
                ))

    db.commit()
    db.refresh(db_sched)
    return db_sched

@router.delete("/schedules/{schedule_id}")
def delete_schedule(
    schedule_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer"))
):
    db_sched = db.query(models.Schedule).filter(models.Schedule.id == schedule_id).first()
    if not db_sched:
        raise HTTPException(status_code=404, detail="Schedule not found")
        
    db.delete(db_sched)
    db.commit()
    return {"message": "Deleted"}
