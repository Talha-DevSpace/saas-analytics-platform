from app.workers.celery_app import celery_app
from app.database import SessionLocal
from app.models.event import Event
from app.cache import get_redis
import json
import logging
from datetime import datetime, timezone

# ─────────────────────────────────────────────
# What is logging?
# Instead of print() statements, we use Python's logging module.
# It adds timestamps, log levels (INFO, WARNING, ERROR),
# and can write to files in production.
# ─────────────────────────────────────────────
logger = logging.getLogger(__name__)


@celery_app.task(
    name="app.workers.event_worker.process_event_queue",
    bind=True,
    max_retries=3,
    default_retry_delay=60
)
def process_event_queue(self):
    redis_client = get_redis()
    db = SessionLocal()
    total_processed = 0
    total_failed = 0

    try:
        queue_keys = redis_client.keys("event_queue:*")

        if not queue_keys:
            logger.info("No event queues found. Nothing to process.")
            return {"processed": 0, "failed": 0}

        for queue_key in queue_keys:
            events_to_insert = []
            failed_events = []   # Track failed ones separately

            # Pop up to 100 events
            pipe = redis_client.pipeline()
            for _ in range(100):
                pipe.lpop(queue_key)
            raw_events = pipe.execute()
            raw_events = [e for e in raw_events if e is not None]

            if not raw_events:
                continue

            logger.info(f"Popped {len(raw_events)} events from {queue_key}")

            # Parse each event
            for raw_event in raw_events:
                try:
                    event_data = json.loads(raw_event)

                    # Worker generates a fresh UUID — no conflict with existing records
                    event_obj = Event(
                        company_id=event_data["company_id"],
                        user_id=event_data["user_id"],
                        event_name=event_data["event_name"],
                        page=event_data.get("page"),
                        metadata_=event_data.get("metadata"),
                        timestamp=datetime.fromisoformat(
                            event_data["timestamp"]),
                        received_at=datetime.now(timezone.utc)
                    )
                    events_to_insert.append((event_obj, raw_event))

                except (json.JSONDecodeError, KeyError) as e:
                    logger.error(f"Malformed event skipped: {e}")
                    total_failed += 1

            # Bulk insert
            if events_to_insert:
                try:
                    db.add_all([e[0] for e in events_to_insert])
                    db.commit()
                    total_processed += len(events_to_insert)
                    logger.info(
                        f"Inserted {len(events_to_insert)} events into DB")

                except Exception as db_error:
                    db.rollback()
                    logger.error(f"DB insert failed: {db_error}")

                    # Only push back to queue on DB failure
                    # NOT on duplicate — that was the bug before
                    pipe = redis_client.pipeline()
                    for _, raw in events_to_insert:
                        pipe.rpush(queue_key, raw)
                    pipe.execute()

                    total_failed += len(events_to_insert)

    except Exception as exc:
        logger.error(f"Unexpected worker error: {exc}")
        raise self.retry(exc=exc)

    finally:
        db.close()

    logger.info(f"Done. Processed: {total_processed} | Failed: {total_failed}")
    return {"processed": total_processed, "failed": total_failed}




@celery_app.task(name="app.workers.event_worker.cleanup_old_queue_data")
def cleanup_old_queue_data():
    """
    Cleans up any orphaned or stale data from Redis.
    Runs at midnight daily.

    In practice, most keys expire automatically (we set TTLs),
    but this catches anything that slipped through.
    """
    redis_client = get_redis()

    # Find empty queues and delete them
    queue_keys = redis_client.keys("event_queue:*")
    deleted_count = 0

    for key in queue_keys:
        if redis_client.llen(key) == 0:  # llen = list length
            redis_client.delete(key)
            deleted_count += 1

    logger.info(f"Cleanup complete. Deleted {deleted_count} empty queue(s).")
    return {"deleted_queues": deleted_count}
