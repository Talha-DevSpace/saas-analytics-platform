from celery import Celery
from celery.schedules import crontab
import os
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

# Create the Celery app
celery_app = Celery(
    "saas_analytics",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=[
        "app.workers.event_worker",
        "app.workers.analytics_worker"
    ]
)

# Celery Configuration
celery_app.conf.update(
    # Timezone for scheduled tasks
    timezone="UTC",

    # How task results are serialized (JSON is readable and safe)
    result_serializer="json",
    accept_content=["json"],
    task_serializer="json",

    # How long to keep task results in Redis (1 hour)
    result_expires=3600,

    # Worker settings
    worker_prefetch_multiplier=1,
    task_acks_late=True,
)

# Beat Schedule — Periodic Tasks
celery_app.conf.beat_schedule = {

    "process-event-queue": {
        "task": "app.workers.event_worker.process_event_queue",
        "schedule": 30.0,
    },

    "recalculate-analytics": {
        "task": "app.workers.analytics_worker.recalculate_daily_analytics",
        "schedule": 300.0,
    },

    "cleanup-redis": {
        "task": "app.workers.event_worker.cleanup_old_queue_data",
        "schedule": crontab(hour=0, minute=0),
    },
}