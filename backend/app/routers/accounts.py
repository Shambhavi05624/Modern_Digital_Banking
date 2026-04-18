
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import AccountModel, UserModel
from ..schemas import AccountResponse, AccountCreate
from ..auth import get_current_user

router = APIRouter(prefix="/accounts", tags=["accounts"])

@router.get("/", response_model=List[AccountResponse])
def get_accounts(db: Session = Depends(get_db), user: UserModel = Depends(get_current_user)):
    return db.query(AccountModel).filter(AccountModel.user_id == user.id).all()

@router.post("/", response_model=AccountResponse)
def create_account(account: AccountCreate, db: Session = Depends(get_db), user: UserModel = Depends(get_current_user)):
    try:
        db_account = AccountModel(**account.model_dump(), user_id=user.id)
        db.add(db_account)
        db.commit()
        db.refresh(db_account)
        return db_account
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{account_id}", response_model=AccountResponse)
def update_account(account_id: int, account: AccountCreate, db: Session = Depends(get_db), user: UserModel = Depends(get_current_user)):
    db_account = db.query(AccountModel).filter(AccountModel.id == account_id, AccountModel.user_id == user.id).first()
    if not db_account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    try:
        for key, value in account.model_dump().items():
            setattr(db_account, key, value)
        db.commit()
        db.refresh(db_account)
        return db_account
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{account_id}")
def delete_account(account_id: int, db: Session = Depends(get_db), user: UserModel = Depends(get_current_user)):
    db_account = db.query(AccountModel).filter(AccountModel.id == account_id, AccountModel.user_id == user.id).first()
    if not db_account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    try:
        db.delete(db_account)
        db.commit()
        return {"message": "Account successfully disconnected"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Deletion failed: {str(e)}")
