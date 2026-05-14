from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timezone
import hashlib
import json

from app.database import get_db
from app.cache import get_redis
from app.models.company import Company
from app.models.user import User
from app.models.event import Event
from app.schemas.event import EventCreate, EventResponse


from app.workers.event_worker import process_event_queue
from app.workers.analytics_worker import recalculate_daily_analytics

router = APIRouter()


# ─────────────────────────────────────────────
# HELPER: Authenticate company by API key
# ─────────────────────────────────────────────

def get_current_company(
    x_api_key: Optional[str] = Header(None),  # Reads "X-Api-Key" header
    db: Session = Depends(get_db)
) -> Company:
    """
    Every event endpoint needs to know WHICH company is sending data.
    This function reads the API key from the request header,
    finds the matching company, and returns it.

    If API key is missing or wrong → 401 Unauthorized.

    We reuse this function across multiple endpoints using Depends().
    """
    if not x_api_key:
        raise HTTPException(
            status_code=401,
            detail="Missing X-API-Key header"
        )

    company = db.query(Company).filter(
        Company.api_key == x_api_key
    ).first()

    if not company:
        raise HTTPException(
            status_code=401,
            detail="Invalid API key"
        )

    return company


# ─────────────────────────────────────────────
# HELPER: Deduplicate events using Redis
# ─────────────────────────────────────────────

def is_duplicate_event(
    company_id: str,
    user_id: str,
    event_name: str,
    page: str,
    redis_client
) -> bool:
    """
    Prevents the same event from being recorded multiple times
    if a client accidentally sends it twice.

    How it works:
    1. Create a unique fingerprint (hash) from event properties
    2. Check if this fingerprint exists in Redis
    3. If yes → duplicate, reject it
    4. If no → store fingerprint in Redis for 60 seconds, then allow

    Why 60 seconds?
    If the same exact event comes in within 60 seconds, it's a duplicate.
    After 60 seconds, the same action is probably intentional.
    """

    # Combine all identifying fields into one string
    raw_key = f"{company_id}:{user_id}:{event_name}:{page}"

    # Hash it to a fixed-length string (saves Redis memory)
    # MD5 is fine here — we don't need cryptographic security
    fingerprint = hashlib.md5(raw_key.encode()).hexdigest()

    # Redis key format: "dedup:abc123def456..."
    redis_key = f"dedup:{fingerprint}"

    # Check if this key already exists in Redis
    if redis_client.exists(redis_key):
        return True  # It's a duplicate

    # Store it with 60-second expiry
    # setex = SET with EXpiry
    # Arguments: key, time_in_seconds, value
    redis_client.setex(redis_key, 60, "1")

    return False  # Not a duplicate


# ─────────────────────────────────────────────
# HELPER: Get or create user
# ─────────────────────────────────────────────

def get_or_create_user(
    company_id: str,
    external_user_id: str,
    db: Session
) -> User:

    # Try to find existing user
    user = db.query(User).filter(
        User.company_id == company_id,
        User.external_user_id == external_user_id
    ).first()

    # Create if not found
    if not user:
        user = User(
            company_id=company_id,
            external_user_id=external_user_id
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return user


# ─────────────────────────────────────────────
# ENDPOINT: Track an event
# ─────────────────────────────────────────────

@router.post("/track", response_model=EventResponse, status_code=202)
def track_event(
    payload: EventCreate,
    db: Session = Depends(get_db),
    redis_client=Depends(get_redis),
    company: Company = Depends(get_current_company)
):
    # ── Step 1: Duplicate check ──
    is_dup = is_duplicate_event(
        company_id=str(company.id),
        user_id=payload.user_id,
        event_name=payload.event,
        page=payload.page or "",
        redis_client=redis_client
    )

    if is_dup:
        return EventResponse(
            status="duplicate",
            message="Event already received within the last 60 seconds"
        )

    # ── Step 2: Get or create user (still needed for user_id) ──
    user = get_or_create_user(
        company_id=str(company.id),
        external_user_id=payload.user_id,
        db=db
    )

    # ── Step 3: Determine timestamp ──
    event_time = payload.timestamp or datetime.now(timezone.utc)

    # ── Step 4: Push to Redis queue ONLY — no DB save here ──
    queue_key = f"event_queue:{company.id}"
    event_data = {
        "company_id": str(company.id),
        "user_id": str(user.id),
        "event_name": payload.event,
        "page": payload.page,
        "metadata": payload.metadata,
        "timestamp": event_time.isoformat()
    }
    redis_client.rpush(queue_key, json.dumps(event_data))

    return EventResponse(
        status="accepted",
        message="Event received and queued for processing"
    )

# ─────────────────────────────────────────────
# ENDPOINT: Get recent events (for debugging)
# ─────────────────────────────────────────────

@router.get("/recent")
def get_recent_events(
    limit: int = 20,
    db: Session = Depends(get_db),
    company: Company = Depends(get_current_company)
):
    """
    Returns the most recent events for this company.
    The 'limit' query parameter controls how many to return.
    URL example: GET /api/events/recent?limit=50
    """

    events = (
        db.query(Event)
        .filter(Event.company_id == company.id)
        .order_by(Event.timestamp.desc())  # Newest first
        .limit(limit)
        .all()
    )

    return [
        {
            "id": str(e.id),
            "event_name": e.event_name,
            "page": e.page,
            "timestamp": e.timestamp.isoformat()
        }
        for e in events
    ]




# ------------------------------------------------------

@router.post("/process-queue")
def trigger_queue_processing(
    company: Company = Depends(get_current_company)
):
    """
    Manually triggers the event queue worker.
    Useful for testing without waiting for the scheduled run.

    .delay() tells Celery to run this task asynchronously in the background.
    It returns immediately without waiting for the task to finish.
    """
    task = process_event_queue.delay() # type: ignore

    return {
        "message": "Queue processing started",
        "task_id": task.id   # You can use this ID to check task status
    }


@router.get("/task-status/{task_id}")
def get_task_status(task_id: str):

    from app.workers.celery_app import celery_app
    from celery.result import AsyncResult

    result = AsyncResult(task_id, app=celery_app)

    return {
        "task_id": task_id,
        "status": result.status,           # PENDING, STARTED, SUCCESS, FAILURE
        "result": result.result if result.ready() else None
    }

# =========================================================
# =========================================================

@router.post("/process-queue-direct")
def process_queue_direct(
    db: Session = Depends(get_db),
    redis_client=Depends(get_redis),
    company: Company = Depends(get_current_company)
):
    """
    Processes the event queue DIRECTLY — no Celery needed.
    
    Use this for:
    - Testing queue processing works
    - Debugging worker issues
    - Development on Windows where Celery has issues

    This runs synchronously — it waits until done then returns results.
    """

    queue_key = f"event_queue:{company.id}"

    # Check how many items are in the queue
    queue_length = redis_client.llen(queue_key)

    if queue_length == 0:
        return {
            "status": "empty",
            "message": "No events in queue",
            "processed": 0
        }

    events_to_insert = []
    failed = []

    # Pop ALL items currently in the queue
    pipe = redis_client.pipeline()
    for _ in range(queue_length):
        pipe.lpop(queue_key)
    raw_events = pipe.execute()
    raw_events = [e for e in raw_events if e is not None]

    # Parse each event
    for raw_event in raw_events:
        try:
            event_data = json.loads(raw_event)

            event_obj = Event(
                company_id=event_data["company_id"],
                user_id=event_data["user_id"],
                event_name=event_data["event_name"],
                page=event_data.get("page"),
                metadata_=event_data.get("metadata"),
                timestamp=datetime.fromisoformat(event_data["timestamp"]),
                received_at=datetime.now(timezone.utc)
            )
            events_to_insert.append((event_obj, raw_event))

        except Exception as e:
            failed.append({"raw": raw_event, "error": str(e)})

    # Bulk insert into DB
    if events_to_insert:
        try:
            db.add_all([e[0] for e in events_to_insert])
            db.commit()

            return {
                "status": "success",
                "processed": len(events_to_insert),
                "failed": len(failed),
                "queue_remaining": redis_client.llen(queue_key)
            }

        except Exception as db_error:
            db.rollback()

            # Put events back in queue on DB failure
            pipe = redis_client.pipeline()
            for _, raw in events_to_insert:
                pipe.rpush(queue_key, raw)
            pipe.execute()

            return {
                "status": "db_error",
                "error": str(db_error),
                "events_returned_to_queue": len(events_to_insert)
            }

    return {
        "status": "nothing_inserted",
        "failed_to_parse": len(failed),
        "failures": failed
    }
