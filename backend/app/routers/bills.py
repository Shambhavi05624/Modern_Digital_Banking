
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import case
from typing import List, Optional
from datetime import datetime
from ..database import get_db
from ..models import BillModel, UserModel
from ..schemas import BillResponse, BillCreate
from ..auth import get_current_user

router = APIRouter(prefix="/bills", tags=["bills"])

@router.get("", response_model=List[BillResponse])
@router.get("/", response_model=List[BillResponse])
def get_bills(
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db), 
    user: UserModel = Depends(get_current_user)
):
    query = db.query(BillModel).filter(BillModel.user_id == user.id)
    
    if month and year:
        # Filter by month and year of the due date
        # Note: In SQLite/Postgres extract(month from date) or strftime might differ, 
        # using Python logic for broad compatibility here or standard SQL if preferred.
        start_date = datetime(year, month, 1)
        if month == 12:
            end_date = datetime(year + 1, 1, 1)
        else:
            end_date = datetime(year, month + 1, 1)
        query = query.filter(BillModel.due_date >= start_date, BillModel.due_date < end_date)

    # Priority sorting logic: Overdue (0), Upcoming (1), Paid (2)
    status_order = case(
        (BillModel.status == "overdue", 0),
        (BillModel.status == "upcoming", 1),
        (BillModel.status == "paid", 2),
        else_=3
    )
    
    bills = query.order_by(status_order.asc(), BillModel.due_date.asc()).all()
    
    # Lazy update status based on current time
    now = datetime.utcnow()
    changed = False
    for bill in bills:
        if bill.status == "upcoming" and bill.due_date < now:
            bill.status = "overdue"
            changed = True
    
    if changed:
        db.commit()
        # Re-fetch after status updates to maintain order
        bills = query.order_by(status_order.asc(), BillModel.due_date.asc()).all()
        
    return bills

@router.post("", response_model=BillResponse)
@router.post("/", response_model=BillResponse)
def create_bill(bill_data: BillCreate, db: Session = Depends(get_db), user: UserModel = Depends(get_current_user)):
    db_bill = BillModel(
        **bill_data.dict(),
        status="upcoming",
        user_id=user.id
    )
    db.add(db_bill)
    db.commit()
    db.refresh(db_bill)
    return db_bill

@router.put("/{bill_id}", response_model=BillResponse)
def update_bill(bill_id: int, bill_data: BillCreate, db: Session = Depends(get_db), user: UserModel = Depends(get_current_user)):
    """Updates an existing bill's details."""
    bill = db.query(BillModel).filter(BillModel.id == bill_id, BillModel.user_id == user.id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    for key, value in bill_data.dict().items():
        setattr(bill, key, value)
    
    # Reset status if date is in the future and it was overdue
    if bill.due_date > datetime.utcnow() and bill.status == "overdue":
        bill.status = "upcoming"
        
    db.commit()
    db.refresh(bill)
    return bill

@router.post("/{bill_id}/pay", response_model=BillResponse)
def pay_bill(bill_id: int, db: Session = Depends(get_db), user: UserModel = Depends(get_current_user)):
    bill = db.query(BillModel).filter(BillModel.id == bill_id, BillModel.user_id == user.id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    bill.status = "paid"
    db.commit()
    db.refresh(bill)
    return bill

@router.delete("/{bill_id}")
def delete_bill(bill_id: int, db: Session = Depends(get_db), user: UserModel = Depends(get_current_user)):
    bill = db.query(BillModel).filter(BillModel.id == bill_id, BillModel.user_id == user.id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    db.delete(bill)
    db.commit()
    return {"message": "Deleted"}
