
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class UserModel(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    accounts = relationship("AccountModel", back_populates="owner")
    bills = relationship("BillModel", back_populates="owner")
    rewards = relationship("RewardModel", back_populates="owner")
    notifications = relationship("NotificationModel", back_populates="owner")

class AccountModel(Base):
    __tablename__ = "accounts"
    id = Column(Integer, primary_key=True, index=True)
    bank_name = Column(String)
    account_type = Column(String)
    masked_account = Column(String)
    currency = Column(String)
    balance = Column(Float)
    user_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("UserModel", back_populates="accounts")
    transactions = relationship("TransactionModel", back_populates="account")

class TransactionModel(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    description = Column(String)
    category = Column(String)
    amount = Column(Float)
    currency = Column(String)
    txn_type = Column(String)
    merchant = Column(String)
    txn_date = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"))
    # Fixed: Added ondelete="SET NULL" to allow account deletion
    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True)
    account = relationship("AccountModel", back_populates="transactions")

class BudgetModel(Base):
    __tablename__ = "budgets"
    id = Column(Integer, primary_key=True, index=True)
    category = Column(String)
    limit_amount = Column(Float)
    spent_amount = Column(Float, default=0.0)
    month = Column(Integer)
    year = Column(Integer)
    user_id = Column(Integer, ForeignKey("users.id"))

class BillModel(Base):
    __tablename__ = "bills"
    id = Column(Integer, primary_key=True, index=True)
    biller_name = Column(String)
    due_date = Column(DateTime)
    amount_due = Column(Float)
    status = Column(String, default="upcoming") # upcoming, paid, overdue
    auto_pay = Column(Boolean, default=False)
    category = Column(String, default="Utility")
    user_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("UserModel", back_populates="bills")

class RewardModel(Base):
    __tablename__ = "rewards"
    id = Column(Integer, primary_key=True, index=True)
    program_name = Column(String)
    points_balance = Column(Integer, default=0)
    currency = Column(String, default="INR")
    point_value = Column(Float, default=1.0)
    last_updated = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("UserModel", back_populates="rewards")

class NotificationModel(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    message = Column(String)
    alert_type = Column(String) # low_balance, bill_due, budget_exceeded
    type = Column(String) # info, warning, critical
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("UserModel", back_populates="notifications")
