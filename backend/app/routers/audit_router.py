from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AuditLog, Notification
from app.schemas import AuditLogResponse, NotificationResponse

router = APIRouter(prefix="/api", tags=["Audit & Notifications"])

@router.get("/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(limit: int = 100, db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(AuditLog.id.desc()).limit(limit).all()
    return logs

@router.get("/notifications", response_model=List[NotificationResponse])
def get_notifications(db: Session = Depends(get_db)):
    notifs = db.query(Notification).order_by(Notification.id.desc()).limit(50).all()
    return notifs

@router.put("/notifications/{id}/read")
def mark_read(id: int, db: Session = Depends(get_db)):
    notif = db.query(Notification).filter(Notification.id == id).first()
    if notif:
        notif.is_read = True
        db.commit()
    return {"status": "success"}

@router.put("/notifications/read-all")
def mark_all_read(db: Session = Depends(get_db)):
    db.query(Notification).filter(Notification.is_read == False).update({"is_read": True})
    db.commit()
    return {"status": "success"}

