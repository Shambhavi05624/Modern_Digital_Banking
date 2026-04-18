from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text, inspect, func
import os
import redis
from .database import engine, Base, get_db
from .routers import auth, accounts, transactions, budgets, bills, rewards, notifications, insights, reports
from .models import TransactionModel, BillModel, UserModel, AccountModel, NotificationModel

# --- DATABASE MIGRATIONS ---
try:
    # First ensure all tables defined in models exist
    Base.metadata.create_all(bind=engine)
    
    inspector = inspect(engine)
    with engine.connect() as conn:
        # 1. Update Transactions Table
        t_cols = [c['name'] for c in inspector.get_columns('transactions')]
        t_missing = {
            "user_id": "INTEGER REFERENCES users(id)",
            "currency": "VARCHAR DEFAULT 'INR'",
            "txn_type": "VARCHAR DEFAULT 'debit'",
            "merchant": "VARCHAR DEFAULT 'Unknown'",
            "txn_date": "TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP",
            "category": "VARCHAR DEFAULT 'Others'",
            "account_id": "INTEGER REFERENCES accounts(id)"
        }
        for col, definition in t_missing.items():
            if col not in t_cols:
                conn.execute(text(f"ALTER TABLE transactions ADD COLUMN {col} {definition};"))
        
        # 2. Update Rewards Table
        r_cols = [c['name'] for c in inspector.get_columns('rewards')]
        if "currency" not in r_cols:
             conn.execute(text("ALTER TABLE rewards ADD COLUMN currency VARCHAR DEFAULT 'INR';"))
        if "point_value" not in r_cols:
             conn.execute(text("ALTER TABLE rewards ADD COLUMN point_value FLOAT DEFAULT 1.0;"))

        # 3. Update Notifications Table (FIX FOR ALERT CENTER)
        n_cols = [c['name'] for c in inspector.get_columns('notifications')]
        if "alert_type" not in n_cols:
             # Adding the missing column identified in the traceback
             print("Migration: Adding missing column 'alert_type' to notifications table...")
             conn.execute(text("ALTER TABLE notifications ADD COLUMN alert_type VARCHAR;"))
        
        conn.commit()
except Exception as e:
    print(f"Warning: Manual migration failed: {e}")

app = FastAPI(title="DigitalBank Pro API")

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173","https://your-app-name.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all modular routers
app.include_router(auth.router)
app.include_router(accounts.router)
app.include_router(transactions.router)
app.include_router(budgets.router)
app.include_router(bills.router)
app.include_router(rewards.router)
app.include_router(notifications.router)
app.include_router(insights.router)
app.include_router(reports.router)

@app.get("/")
def read_root():
    return {"status": "DigitalBank Pro API is live", "version": "1.1.0"}

@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database Connection Error: {str(e)}")

@app.get("/health/services")
def services_health(db: Session = Depends(get_db)):
    """Comprehensive health check for API, DB, and Redis with data stats."""
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    redis_status = "offline"
    db_status = "offline"
    
    stats = {
        "transactions": 0,
        "bills": 0,
        "accounts": 0
      }
    
    try:
        db.execute(text("SELECT 1"))
        db_status = "online"
        # Gather basic metrics for the dashboard
        stats["transactions"] = db.query(TransactionModel).count()
        stats["bills"] = db.query(BillModel).count()
        stats["accounts"] = db.query(AccountModel).count()
    except Exception:
        pass
    
    try:
        r = redis.from_url(redis_url, socket_connect_timeout=1)
        if r.ping():
            redis_status = "online"
    except Exception:
        pass
    
    return {
        "api": "online",
        "database": db_status,
        "redis": redis_status,
        "stats": stats
    }
