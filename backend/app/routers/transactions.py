import csv
import io
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Body
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import TransactionModel, UserModel, AccountModel
from ..schemas import TransactionResponse, TransactionCreate
from ..auth import get_current_user

router = APIRouter(prefix="/transactions", tags=["transactions"])

@router.get("/", response_model=List[TransactionResponse])
def get_transactions(db: Session = Depends(get_db), user: UserModel = Depends(get_current_user)):
    return db.query(TransactionModel).filter(TransactionModel.user_id == user.id).order_by(TransactionModel.txn_date.desc()).all()

@router.get("/export/csv")
def export_transactions_csv(db: Session = Depends(get_db), user: UserModel = Depends(get_current_user)):
    """Exports all transactions for the current user as a CSV file."""
    transactions = db.query(TransactionModel).filter(TransactionModel.user_id == user.id).order_by(TransactionModel.txn_date.desc()).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow(["ID", "Date", "Merchant", "Description", "Category", "Amount", "Currency", "Type"])
    
    for txn in transactions:
        writer.writerow([
            txn.id,
            txn.txn_date.strftime("%Y-%m-%d %H:%M:%S"),
            txn.merchant,
            txn.description,
            txn.category,
            txn.amount,
            txn.currency,
            txn.txn_type
        ])
    
    output.seek(0)
    
    filename = f"transactions_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.post("/", response_model=TransactionResponse)
def create_transaction(txn_data: TransactionCreate, db: Session = Depends(get_db), user: UserModel = Depends(get_current_user)):
    """Manually creates a new transaction and updates linked account balance."""
    account = None
    if txn_data.account_id:
        account = db.query(AccountModel).filter(AccountModel.id == txn_data.account_id, AccountModel.user_id == user.id).first()
        if not account:
            raise HTTPException(status_code=404, detail="Selected account not found")
        
        if txn_data.txn_type == "debit":
            account.balance -= txn_data.amount
        else:
            account.balance += txn_data.amount

    db_txn = TransactionModel(
        description=txn_data.description,
        merchant=txn_data.merchant,
        amount=txn_data.amount,
        currency=txn_data.currency,
        txn_type=txn_data.txn_type,
        category=txn_data.category,
        txn_date=txn_data.txn_date or datetime.utcnow(),
        user_id=user.id,
        account_id=txn_data.account_id
    )
    db.add(db_txn)
    db.commit()
    db.refresh(db_txn)
    return db_txn

@router.post("/upload")
async def upload_transactions(file: UploadFile = File(...), db: Session = Depends(get_db), user: UserModel = Depends(get_current_user)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")
    
    try:
        contents = await file.read()
        decoded = contents.decode('utf-8')
        reader = csv.DictReader(io.StringIO(decoded))
        
        count = 0
        for row in reader:
            try:
                txn = TransactionModel(
                    description=row.get('description', 'Manual Upload'),
                    category=row.get('category', 'Others'),
                    amount=float(row.get('amount', 0)),
                    currency=row.get('currency', 'INR'),
                    txn_type=row.get('txn_type', 'debit').lower(),
                    merchant=row.get('merchant', row.get('description', 'Unknown')),
                    txn_date=datetime.utcnow(),
                    user_id=user.id
                )
                db.add(txn)
                count += 1
            except (ValueError, TypeError):
                continue
        
        db.commit()
        return {"message": f"Successfully imported {count} transactions"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")

@router.post("/{txn_id}/category")
def update_category(txn_id: int, category_data: dict = Body(...), db: Session = Depends(get_db), user: UserModel = Depends(get_current_user)):
    txn = db.query(TransactionModel).filter(TransactionModel.id == txn_id, TransactionModel.user_id == user.id).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    new_category = category_data.get("category")
    if not new_category:
        raise HTTPException(status_code=400, detail="Category name is required")
        
    txn.category = new_category
    db.commit()
    return {"message": "Category updated", "id": txn_id, "category": new_category}

@router.delete("/{txn_id}")
def delete_transaction(txn_id: int, db: Session = Depends(get_db), user: UserModel = Depends(get_current_user)):
    txn = db.query(TransactionModel).filter(TransactionModel.id == txn_id, TransactionModel.user_id == user.id).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    db.delete(txn)
    db.commit()
    return {"message": "Deleted"}