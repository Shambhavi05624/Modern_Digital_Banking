
from datetime import datetime, timedelta
from .celery_app import celery_app
from .database import SessionLocal
from .models import BillModel, NotificationModel, UserModel, AccountModel, BudgetModel, TransactionModel
from sqlalchemy import func

@celery_app.task(name="app.tasks.run_system_wide_audit")
def run_system_wide_audit():
    """
    Consolidated Background Task: Performs a full financial audit for all users
    and generates appropriate alerts/notifications with strict deduplication.
    """
    db = SessionLocal()
    try:
        users = db.query(UserModel).all()
        now = datetime.utcnow()
        
        for user in users:
            # 1. CHECK BILL DEADLINES (alert_type: bill_due)
            three_days_later = now + timedelta(days=3)
            upcoming_bills = db.query(BillModel).filter(
                BillModel.user_id == user.id,
                BillModel.status == "upcoming",
                BillModel.due_date <= three_days_later,
                BillModel.due_date > now
            ).all()
            
            for bill in upcoming_bills:
                _create_unique_notification(
                    db, user.id, "bill_due", 
                    "Upcoming Bill Reminder",
                    f"Your bill for {bill.biller_name} (₹{bill.amount_due}) is due on {bill.due_date.strftime('%Y-%m-%d')}.",
                    "warning"
                )

            overdue_bills = db.query(BillModel).filter(
                BillModel.user_id == user.id,
                BillModel.status == "upcoming",
                BillModel.due_date < now
            ).all()
            
            for bill in overdue_bills:
                bill.status = "overdue"
                _create_unique_notification(
                    db, user.id, "bill_due",
                    "Bill Overdue!",
                    f"The bill for {bill.biller_name} was due on {bill.due_date.strftime('%Y-%m-%d')} and is now OVERDUE.",
                    "critical"
                )

            # 2. CHECK LOW BALANCES (alert_type: low_balance)
            low_balance_accounts = db.query(AccountModel).filter(
                AccountModel.user_id == user.id,
                AccountModel.balance < 1000.0,
                AccountModel.balance > 0 
            ).all()

            for acc in low_balance_accounts:
                _create_unique_notification(
                    db, user.id, "low_balance",
                    "Low Balance Alert",
                    f"Your {acc.bank_name} account ({acc.masked_account[-4:]}) is below ₹1,000 threshold. Current: ₹{acc.balance:.2f}",
                    "warning"
                )

            # 3. CHECK BUDGET EXCEEDANCE (alert_type: budget_exceeded)
            budgets = db.query(BudgetModel).filter(
                BudgetModel.user_id == user.id,
                BudgetModel.month == now.month,
                BudgetModel.year == now.year
            ).all()

            for budget in budgets:
                start_date = datetime(budget.year, budget.month, 1)
                if budget.month == 12:
                    end_date = datetime(budget.year + 1, 1, 1)
                else:
                    end_date = datetime(budget.year, budget.month + 1, 1)

                spent = db.query(func.sum(TransactionModel.amount)).filter(
                    TransactionModel.user_id == user.id,
                    TransactionModel.category == budget.category,
                    TransactionModel.txn_type == 'debit',
                    TransactionModel.txn_date >= start_date,
                    TransactionModel.txn_date < end_date
                ).scalar() or 0.0
                
                if float(spent) > budget.limit_amount:
                    _create_unique_notification(
                        db, user.id, "budget_exceeded",
                        "Budget Limit Breached",
                        f"Target exceeded for {budget.category}. Spent: ₹{spent:.2f} / Limit: ₹{budget.limit_amount:.2f}",
                        "critical"
                    )

        db.commit()
    except Exception as e:
        print(f"Audit Task Error: {e}")
        db.rollback()
    finally:
        db.close()

def _create_unique_notification(db, user_id, alert_type, title, message, severity):
    """
    Helper with deduplication: Only create one notification of the same type 
    with the same title for a user per day to prevent system spam.
    """
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    existing = db.query(NotificationModel).filter(
        NotificationModel.user_id == user_id,
        NotificationModel.alert_type == alert_type,
        NotificationModel.title == title,
        NotificationModel.created_at >= today_start
    ).first()
    
    if not existing:
        new_note = NotificationModel(
            title=title,
            message=message,
            alert_type=alert_type,
            type=severity, 
            user_id=user_id
        )
        db.add(new_note)
