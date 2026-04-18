import os
from sqlalchemy import create_engine, exc, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from fastapi import HTTPException

# Database URL pointing to your banking_db
SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql+pg8000://postgres:password123@localhost:5432/banking_db"
)

try:
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10
    )
except Exception as e:
    print(f"CRITICAL: Failed to create engine. Error: {e}")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        # Check connection health immediately
        db.execute(text("SELECT 1"))
    except Exception as e:
        error_msg = str(e)
        print(f"DATABASE CONNECTION ERROR: {error_msg}")
        raise HTTPException(
            status_code=500, 
            detail=f"Database Connection Error: {error_msg}. Ensure Postgres is running and 'banking_db' exists."
        )
    
    try:
        # Yield the session. Endpoint errors occurring here will no longer be 
        # caught by the connection check except block above.
        yield db
    finally:
        db.close()