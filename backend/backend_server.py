
import uvicorn
import os
from app.main import app

# This file acts as a root-level entry point for the backend.
# It imports the fully configured FastAPI app from the /app directory.

if __name__ == "__main__":
    # Ensure the database and tables are ready before starting
    # (Migration logic is handled inside app/main.py)
    
    print("--- DigitalBank Pro Backend Initialization ---")
    print("Point your browser to http://localhost:8000/docs for API documentation")
    
    port = int(os.getenv("PORT", 8000))
    # Binding to 0.0.0.0 ensures accessibility across all network interfaces
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
