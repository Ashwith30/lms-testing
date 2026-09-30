import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
import models
import schemas
from database import get_db
from auth import get_current_user, require_roles

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

def format_relative_time(created_at_iso: Optional[str]) -> str:
    """Formats an ISO timestamp into human-readable relative time."""
    if not created_at_iso:
        return "Just now"
    try:
        created_dt = datetime.datetime.fromisoformat(created_at_iso.replace("Z", "+00:00"))
        now_dt = datetime.datetime.now(datetime.timezone.utc)
        diff = now_dt - created_dt
        seconds = int(diff.total_seconds())

        if seconds < 60:
            return "Just now"
        elif seconds < 3600:
            mins = seconds // 60
            return f"{mins} min{'s' if mins > 1 else ''} ago"
        elif seconds < 86400:
            hours = seconds // 3600
            return f"{hours} hour{'s' if hours > 1 else ''} ago"
        else:
            days = seconds // 86400
            return f"{days} day{'s' if days > 1 else ''} ago"
    except Exception:
        return "Recent"


@router.post("", response_model=schemas.NotificationResponse, status_code=status.HTTP_201_CREATED)
def create_notification(
    payload: schemas.NotificationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer"))
):
    """
    Broadcasts a notification to a specific batch or all batches.
    Accessible by Admin, Institution, and Trainer accounts.
    """
    if not payload.title or not payload.title.strip():
        raise HTTPException(status_code=400, detail="Notification title cannot be empty.")
    if not payload.message or not payload.message.strip():
        raise HTTPException(status_code=400, detail="Notification message cannot be empty.")

    new_id = models.generate_uuid("notif-")
    now_iso = models.get_utc_now()

    notification = models.Notification(
        id=new_id,
        title=payload.title.strip(),
        message=payload.message.strip(),
        type=payload.type or "info",
        targetBatch=payload.targetBatch.strip() if payload.targetBatch else "all",
        targetRole=payload.targetRole or "student",
        link=payload.link.strip() if payload.link else None,
        priority=payload.priority or "normal",
        sendEmail=bool(payload.sendEmail),
        senderId=current_user.id,
        senderName=current_user.name,
        createdAt=now_iso
    )

    db.add(notification)
    db.commit()
    db.refresh(notification)

    return schemas.NotificationResponse(
        id=notification.id,
        title=notification.title,
        message=notification.message,
        description=notification.message,
        type=notification.type,
        targetBatch=notification.targetBatch,
        targetRole=notification.targetRole,
        link=notification.link,
        priority=notification.priority,
        sendEmail=notification.sendEmail,
        senderId=notification.senderId,
        senderName=notification.senderName,
        createdAt=notification.createdAt,
        isRead=False,
        time=format_relative_time(notification.createdAt)
    )


@router.get("", response_model=List[schemas.NotificationResponse])
def get_notifications(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Retrieves notifications tailored to the current user.
    - Admins see all announcements and notifications.
    - Students see notifications targeted to 'all' or matching their assigned batch.
    - Trainers and Institutions see relevant broadcasts.
    """
    read_ids = {
        r.notificationId
        for r in db.query(models.NotificationRead).filter(models.NotificationRead.userId == current_user.id).all()
    }

    if current_user.role == "admin":
        notifications = db.query(models.Notification).order_by(models.Notification.createdAt.desc()).all()
    elif current_user.role == "student":
        student_batch = current_user.batch or ""
        student_batch_id = current_user.student_profile.primaryBatchId if current_user.student_profile else ""
        
        filters = [
            models.Notification.targetBatch == "all",
            models.Notification.targetBatch == None,
            models.Notification.targetBatch == ""
        ]
        if student_batch:
            filters.append(models.Notification.targetBatch.ilike(f"%{student_batch}%"))
            filters.append(models.Notification.targetBatch == student_batch)
        if student_batch_id and student_batch_id != student_batch:
            filters.append(models.Notification.targetBatch == student_batch_id)

        role_filters = [
            models.Notification.targetRole == "student",
            models.Notification.targetRole == "all",
            models.Notification.targetRole == None
        ]

        notifications = (
            db.query(models.Notification)
            .filter(or_(*filters))
            .filter(or_(*role_filters))
            .order_by(models.Notification.createdAt.desc())
            .all()
        )
    else:
        role_filters = [
            models.Notification.targetRole == current_user.role,
            models.Notification.targetRole == "all",
            models.Notification.targetRole == None
        ]
        notifications = (
            db.query(models.Notification)
            .filter(or_(*role_filters))
            .order_by(models.Notification.createdAt.desc())
            .all()
        )

    result = []
    for n in notifications:
        result.append(schemas.NotificationResponse(
            id=n.id,
            title=n.title,
            message=n.message,
            description=n.message,
            type=n.type,
            targetBatch=n.targetBatch,
            targetRole=n.targetRole,
            link=n.link,
            priority=n.priority,
            sendEmail=n.sendEmail,
            senderId=n.senderId,
            senderName=n.senderName,
            createdAt=n.createdAt,
            isRead=(n.id in read_ids),
            time=format_relative_time(n.createdAt)
        ))

    return result


@router.post("/{notification_id}/read")
def mark_notification_as_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Marks an individual notification as read for the authenticated user."""
    existing = db.query(models.NotificationRead).filter(
        models.NotificationRead.notificationId == notification_id,
        models.NotificationRead.userId == current_user.id
    ).first()

    if not existing:
        read_record = models.NotificationRead(
            id=models.generate_uuid("read-"),
            notificationId=notification_id,
            userId=current_user.id,
            readAt=models.get_utc_now()
        )
        db.add(read_record)
        db.commit()

    return {"status": "success", "notificationId": notification_id, "isRead": True}


@router.post("/read-all")
def mark_all_notifications_as_read(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Marks all notifications applicable to the authenticated user as read."""
    user_notifications = get_notifications(db=db, current_user=current_user)
    now_iso = models.get_utc_now()
    existing_reads = {
        r.notificationId
        for r in db.query(models.NotificationRead).filter(models.NotificationRead.userId == current_user.id).all()
    }

    new_reads = []
    for notif in user_notifications:
        if notif.id not in existing_reads:
            new_reads.append(models.NotificationRead(
                id=models.generate_uuid("read-"),
                notificationId=notif.id,
                userId=current_user.id,
                readAt=now_iso
            ))

    if new_reads:
        db.add_all(new_reads)
        db.commit()

    return {"status": "success", "count": len(new_reads)}


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin"))
):
    """Deletes or revokes a broadcast notification. Restricted to Admin."""
    notification = db.query(models.Notification).filter(models.Notification.id == notification_id).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found.")

    db.delete(notification)
    db.commit()
    return {"status": "deleted", "id": notification_id}
