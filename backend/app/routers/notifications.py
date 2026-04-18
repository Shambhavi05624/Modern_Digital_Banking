
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import NotificationModel, UserModel
from ..auth import get_current_user
from pydantic import BaseModel
from datetime import datetime
import logging

router = APIRouter(prefix="/notifications", tags=["notifications"])

# Setup basic logging for debugging
logger = logging.getLogger(__name__)

class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    type: str
    is_read: bool
    created_at: datetime
    class Config: from_attributes = True

@router.get("/", response_model=List[NotificationResponse])
def get_notifications(db: Session = Depends(get_db), user: UserModel = Depends(get_current_user)):
    return db.query(NotificationModel).filter(
        NotificationModel.user_id == user.id
    ).order_by(NotificationModel.created_at.desc()).limit(50).all()

@router.post("/{note_id}/read")
def mark_as_read(note_id: int, db: Session = Depends(get_db), user: UserModel = Depends(get_current_user)):
    note = db.query(NotificationModel).filter(
        NotificationModel.id == note_id, 
        NotificationModel.user_id == user.id
    ).first()
    if not note:
        raise HTTPException(status_code=404, detail="Notification not found")
    note.is_read = True
    db.commit()
    return {"message": "marked as read"}

@router.post("/read-all")
def mark_all_as_read(db: Session = Depends(get_db), user: UserModel = Depends(get_current_user)):
    db.query(NotificationModel).filter(
        NotificationModel.user_id == user.id,
        NotificationModel.is_read == False
    ).update({NotificationModel.is_read: True})
    db.commit()
    return {"message": "all notifications marked as read"}

@router.post("/trigger-sync")
def trigger_manual_sync(user: UserModel = Depends(get_current_user)):
    """Sends the consolidated audit task to the Celery worker immediately."""
    try:
        # Use absolute import to ensure task identity matches the worker's registry
        from app import tasks
        
        # Verify function existence
        if not hasattr(tasks, 'run_system_wide_audit'):
            raise ImportError("Function run_system_wide_audit missing from app.tasks")
        
        # Dispatch task to queue
        tasks.run_system_wide_audit.delay()
        return {"message": "Full financial audit task queued successfully"}

    except Exception as e:
        error_msg = str(e)
        print(f"--- SYNC TRIGGER FAILED ---")
        print(f"Error: {error_msg}")
        
        if "connection" in error_msg.lower() or "redis" in error_msg.lower():
             raise HTTPException(
                 status_code=503, 
                 detail="Worker Connection Failed: Ensure Redis is running (redis-server)."
             )
        
        raise HTTPException(
            status_code=500, 
            detail=f"Sync Error: {error_msg}"
        )
