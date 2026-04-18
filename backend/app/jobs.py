
"""
Milestone 3: Bill Reminder Logic (Background Jobs)
Note: This requires a Celery worker and Redis broker to be active.
"""
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from .database import SessionLocal
from .models import BillModel, UserModel

def check_and_send_bill_reminders():
    """
    Logic for Celery Task: Identify bills due in next N days and send alerts.
    """
    db: Session = SessionLocal()
    try:
        now = datetime.utcnow()
        threshold = now + timedelta(days=3)
        
        # 1. Upcoming bills (Due in 3 days)
        upcoming = db.query(BillModel).filter(
            BillModel.status == "upcoming",
            BillModel.due_date <= threshold,
            BillModel.due_date > now
        ).all()
        
        for bill in upcoming:
            # Logic: Send Email/Notification (Mocked)
            print(f"ALARM: Bill '{bill.biller_name}' for ₹{bill.amount_due} is due on {bill.due_date}")
            
        # 2. Overdue bills
        overdue = db.query(BillModel).filter(
            BillModel.status == "overdue"
        ).all()
        
        for bill in overdue:
            print(f"URGENT: Bill '{bill.biller_name}' is OVERDUE by ₹{bill.amount_due}")
            
    finally:
        db.close()


