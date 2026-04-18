import os
from celery import Celery

# Get Redis URL from environment or default to local
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Initialize Celery
# We must include "app.tasks" so the worker can discover the task definitions.
celery_app = Celery(
    "digital_bank_worker",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["app.tasks"]
)

# Optional configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    # Ensure task names are strictly followed
    task_name_prefix=None,
)

# Schedule periodic tasks (Celery Beat)
celery_app.conf.beat_schedule = {
    "run-financial-audit-every-hour": {
        "task": "app.tasks.run_system_wide_audit",
        "schedule": 3600.0, # Every hour
    },
}
