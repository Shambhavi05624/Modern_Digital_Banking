from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, extract, case
from datetime import datetime, timedelta
from typing import List, Dict, Any
from ..database import get_db
from ..models import TransactionModel, UserModel
from ..auth import get_current_user

router = APIRouter(prefix="/insights", tags=["insights"])

@router.get("/summary")
def get_insights_summary(db: Session = Depends(get_db), user: UserModel = Depends(get_current_user)):
    now = datetime.utcnow()
    first_of_month = datetime(now.year, now.month, 1)
    
    # 1. Monthly Cash Flow (Current Month)
    cash_flow_query = db.query(
        func.sum(case((TransactionModel.txn_type == 'credit', TransactionModel.amount), else_=0)).label('income'),
        func.sum(case((TransactionModel.txn_type == 'debit', TransactionModel.amount), else_=0)).label('expense')
    ).filter(
        TransactionModel.user_id == user.id,
        TransactionModel.txn_date >= first_of_month
    ).first()
    
    income = float(cash_flow_query.income or 0.0) if cash_flow_query else 0.0
    expense = float(cash_flow_query.expense or 0.0) if cash_flow_query else 0.0
    savings = income - abs(expense)

    # 2. Top Merchants (Top 5 by absolute spend)
    top_merchants_query = db.query(
        TransactionModel.merchant,
        func.sum(func.abs(TransactionModel.amount)).label('total_spend')
    ).filter(
        TransactionModel.user_id == user.id,
        TransactionModel.txn_type == 'debit',
        TransactionModel.txn_date >= first_of_month
    ).group_by(TransactionModel.merchant).order_by(desc('total_spend')).limit(5).all()

    # 3. Category Summary
    category_summary_query = db.query(
        TransactionModel.category,
        func.sum(func.abs(TransactionModel.amount)).label('total_amount')
    ).filter(
        TransactionModel.user_id == user.id,
        TransactionModel.txn_type == 'debit',
        TransactionModel.txn_date >= first_of_month
    ).group_by(TransactionModel.category).all()

    # 4. Burn Rate (Average monthly spend over last 3 months)
    three_months_ago = now - timedelta(days=90)
    total_debits_3m = db.query(
        func.sum(func.abs(TransactionModel.amount))
    ).filter(
        TransactionModel.user_id == user.id,
        TransactionModel.txn_type == 'debit',
        TransactionModel.txn_date >= three_months_ago
    ).scalar() or 0.0
    
    monthly_burn_rate = float(total_debits_3m) / 3.0

    return {
        "cash_flow": {
            "total_credits": income,
            "total_debits": abs(expense),
            "net_savings": savings
        },
        "top_merchants": [{"merchant": m[0], "amount": float(m[1])} for m in top_merchants_query] if top_merchants_query else [],
        "category_spending": [{"category": c[0], "amount": float(c[1])} for c in category_summary_query] if category_summary_query else [],
        "burn_rate": monthly_burn_rate,
        "calculation_date": now
    }
