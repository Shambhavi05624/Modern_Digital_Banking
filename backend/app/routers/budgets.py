import csv
import io
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime
from ..database import get_db
from ..models import BudgetModel, UserModel, TransactionModel
from ..schemas import BudgetResponse, BudgetCreate
from ..auth import get_current_user

router = APIRouter(prefix="/budgets", tags=["budgets"])

@router.get("", response_model=List[BudgetResponse])
@router.get("/", response_model=List[BudgetResponse])
def get_budgets(
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db), 
    user: UserModel = Depends(get_current_user)
):
    query = db.query(BudgetModel).filter(BudgetModel.user_id == user.id)
    
    if month and year:
        query = query.filter(BudgetModel.month == month, BudgetModel.year == year)
    
    budgets = query.all()
    
    for budget in budgets:
        # Calculate spent amount from transactions for that specific category AND month/year
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
        
        budget.spent_amount = float(spent)
        
    return budgets

@router.get("/export/csv")
def export_budgets_csv(db: Session = Depends(get_db), user: UserModel = Depends(get_current_user)):
    """Exports budget performance summary as CSV."""
    budgets = db.query(BudgetModel).filter(BudgetModel.user_id == user.id).order_by(BudgetModel.year.desc(), BudgetModel.month.desc()).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Year", "Month", "Category", "Limit", "Spent", "Performance %"])
    
    for b in budgets:
        # We need to calculate spent for historical ones too if they aren't stored
        start_date = datetime(b.year, b.month, 1)
        if b.month == 12:
            end_date = datetime(b.year + 1, 1, 1)
        else:
            end_date = datetime(b.year, b.month + 1, 1)
            
        spent = db.query(func.sum(TransactionModel.amount)).filter(
            TransactionModel.user_id == user.id,
            TransactionModel.category == b.category,
            TransactionModel.txn_type == 'debit',
            TransactionModel.txn_date >= start_date,
            TransactionModel.txn_date < end_date
        ).scalar() or 0.0
        
        perf = (float(spent) / b.limit_amount * 100) if b.limit_amount > 0 else 0
        
        writer.writerow([
            b.year,
            b.month,
            b.category,
            b.limit_amount,
            float(spent),
            f"{perf:.2f}%"
        ])
    
    output.seek(0)
    filename = f"budget_performance_{datetime.now().strftime('%Y%m%d')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.post("", response_model=BudgetResponse)
@router.post("/", response_model=BudgetResponse)
def create_budget(budget_data: BudgetCreate, db: Session = Depends(get_db), user: UserModel = Depends(get_current_user)):
    now = datetime.utcnow()
    target_month = budget_data.month if budget_data.month is not None else now.month
    target_year = budget_data.year if budget_data.year is not None else now.year
    
    # Check if budget already exists for this category in the target period
    existing = db.query(BudgetModel).filter(
        BudgetModel.user_id == user.id, 
        BudgetModel.category == budget_data.category,
        BudgetModel.month == target_month,
        BudgetModel.year == target_year
    ).first()
    
    if existing:
        existing.limit_amount = budget_data.limit_amount
        db.commit()
        db.refresh(existing)
        return existing

    db_budget = BudgetModel(
        category=budget_data.category,
        limit_amount=budget_data.limit_amount,
        spent_amount=0.0,
        month=target_month,
        year=target_year,
        user_id=user.id
    )
    db.add(db_budget)
    db.commit()
    db.refresh(db_budget)
    return db_budget

@router.delete("/{budget_id}")
def delete_budget(budget_id: int, db: Session = Depends(get_db), user: UserModel = Depends(get_current_user)):
    budget = db.query(BudgetModel).filter(BudgetModel.id == budget_id, BudgetModel.user_id == user.id).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    db.delete(budget)
    db.commit()
    return {"message": "Budget deleted"}