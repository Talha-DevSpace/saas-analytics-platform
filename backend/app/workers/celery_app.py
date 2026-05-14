from celery import Celery
from celery.schedules import crontab
import os
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

# Create the Celery app
# First argument is the app name (any string, usually project name)
# broker = where tasks are queued
# backend = where results are stored
celery_app = Celery(
    "saas_analytics",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=[
        "app.workers.event_worker",      # Register these task modules
        "app.workers.analytics_worker"
    ]
)

# ─────────────────────────────────────────────
# Celery Configuration
# ─────────────────────────────────────────────
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
    worker_prefetch_multiplier=1,   # Worker takes 1 task at a time (safer for beginners)
    task_acks_late=True,            # Task is acknowledged AFTER completion, not before
                                    # This means if worker crashes mid-task, task is retried
)

# ─────────────────────────────────────────────
# Beat Schedule — Periodic Tasks
#
# Celery Beat is a scheduler that triggers tasks automatically.
# Think of it as a cron job manager inside Celery.
# ─────────────────────────────────────────────
celery_app.conf.beat_schedule = {

    # Process the Redis event queue every 30 seconds
    "process-event-queue": {
        "task": "app.workers.event_worker.process_event_queue",
        "schedule": 30.0,  # Every 30 seconds
    },

    # Recalculate analytics aggregates every 5 minutes
    "recalculate-analytics": {
        "task": "app.workers.analytics_worker.recalculate_daily_analytics",
        "schedule": 300.0,  # Every 300 seconds = 5 minutes
    },

    # Clean up old duplicate-check keys from Redis (runs at midnight)
    "cleanup-redis": {
        "task": "app.workers.event_worker.cleanup_old_queue_data",
        "schedule": crontab(hour=0, minute=0),  # Midnight daily
    },
}