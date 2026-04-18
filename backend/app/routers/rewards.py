from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from ..database import get_db
from ..models import RewardModel, UserModel, AccountModel
from ..schemas import RewardResponse, RewardCreate
from ..auth import get_current_user

router = APIRouter(prefix="/rewards", tags=["rewards"])

@router.get("", response_model=List[RewardResponse])
def get_rewards(db: Session = Depends(get_db), user: UserModel = Depends(get_current_user)):
    return db.query(RewardModel).filter(RewardModel.user_id == user.id).all()

@router.post("", response_model=RewardResponse)
def add_reward_program(reward: RewardCreate, db: Session = Depends(get_db), user: UserModel = Depends(get_current_user)):
    existing = db.query(RewardModel).filter(
        RewardModel.user_id == user.id, 
        RewardModel.program_name == reward.program_name
    ).first()
    
    if existing:
        existing.points_balance = reward.points_balance
        existing.currency = reward.currency
        existing.point_value = reward.point_value
        existing.last_updated = datetime.utcnow()
        db_reward = existing
    else:
        db_reward = RewardModel(**reward.dict(), user_id=user.id)
        db.add(db_reward)
    
    db.commit()
    db.refresh(db_reward)
    return db_reward

@router.get("/currency-summary")
def get_currency_summary(db: Session = Depends(get_db), user: UserModel = Depends(get_current_user)):
    accounts = db.query(AccountModel).filter(AccountModel.user_id == user.id).all()
    rewards = db.query(RewardModel).filter(RewardModel.user_id == user.id).all()
    
    # Mock exchange rates (Base: INR)
    rates = {"INR": 1.0, "USD": 83.25, "EUR": 90.10, "GBP": 105.40}
    
    account_breakdown = []
    total_net_worth_inr = 0
    for acc in accounts:
        curr = acc.currency.upper()
        rate = rates.get(curr, 83.0) 
        val_inr = acc.balance * rate
        total_net_worth_inr += val_inr
        
        account_breakdown.append({
            "currency": curr,
            "balance": acc.balance,
            "rate_to_inr": rate,
            "value_in_inr": val_inr
        })
    
    reward_worth_inr = 0
    for r in rewards:
        curr = r.currency.upper()
        rate = rates.get(curr, 1.0)
        # worth = balance * value_per_point * exchange_rate
        worth_inr = r.points_balance * r.point_value * rate
        reward_worth_inr += worth_inr
        
    return {
        "breakdown": account_breakdown,
        "total_inr": total_net_worth_inr,
        "reward_worth_inr": reward_worth_inr,
        "rates": rates,
        "last_updated": datetime.utcnow()
    }