from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import List, Optional

class Token(BaseModel):
    access_token: str
    token_type: str
    user_name: str

class UserCreate(BaseModel):
    name: str
    email: str
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    password: Optional[str] = None

class AccountBase(BaseModel):
    bank_name: str
    account_type: str
    masked_account: str
    currency: str
    balance: float

class AccountCreate(AccountBase):
    pass

class AccountResponse(AccountBase):
    id: int
    class Config:
        from_attributes = True

class TransactionCreate(BaseModel):
    description: str
    merchant: str
    amount: float
    currency: str = "INR"
    txn_type: str = "debit"
    category: str = "Others"
    txn_date: Optional[datetime] = None
    account_id: Optional[int] = None

class TransactionResponse(BaseModel):
    id: int
    description: str
    category: str
    amount: float
    currency: str
    txn_type: str
    merchant: str
    txn_date: datetime
    account_id: Optional[int] = None
    class Config:
        from_attributes = True

class BudgetCreate(BaseModel):
    category: str
    limit_amount: float
    month: Optional[int] = None
    year: Optional[int] = None

class BudgetResponse(BaseModel):
    id: int
    category: str
    limit_amount: float
    spent_amount: float
    month: int
    year: int
    class Config:
        from_attributes = True

class BillCreate(BaseModel):
    biller_name: str
    due_date: datetime
    amount_due: float
    auto_pay: bool = False
    category: str = "Utility"

class BillResponse(BillCreate):
    id: int
    status: str
    class Config:
        from_attributes = True

class RewardCreate(BaseModel):
    program_name: str
    points_balance: int
    currency: str = "INR"
    point_value: float = 1.0

class RewardResponse(RewardCreate):
    id: int
    last_updated: datetime
    class Config:
        from_attributes = True