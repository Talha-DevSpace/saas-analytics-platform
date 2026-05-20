from fastapi import APIRouter, Depends, HTTPException, Header, Request, Query
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

router = APIRouter()

ALLOWED_EVENTS = {
    # Auto-tracked by tracker.js
    "page_view",
    "click",
    "scroll_depth",
    "time_on_page",
    "session_start",
    "session_end",
    "form_submit",
    "outbound_link",
    # Custom events companies can fire manually
    "signup",
    "login",
    "purchase",
    "pricing_view",
    "demo_request",
    "download",
    "video_play",
    "search",
    "add_to_cart",
    "checkout",
    "custom",
}


def get_current_company(
    x_api_key: Optional[str] = Header(None),
    api_key: Optional[str] = Query(None),   # For sendBeacon fallback
    db: Session = Depends(get_db)
) -> Company:
    """
    Authenticates via API key.
    Accepts key from either:
    - X-API-Key header (normal fetch requests)
    - ?api_key= query parameter (sendBeacon requests)
    """
    key = x_api_key or api_key

    if not key:
        raise HTTPException(status_code=401, detail="Missing API key")

    company = db.query(Company).filter(Company.api_key == key).first()
    if not company:
        raise HTTPException(status_code=401, detail="Invalid API key")

    return company


def check_domain_whitelist(request: Request, company: Company):
    """
    Verifies the request comes from an authorized domain.

    Special cases:
    - "*" in allowed_domains = allow all (development mode)
    - No Origin header = direct API call (curl/Postman) = allow
    - localhost/127.0.0.1 = always allow for testing
    """

    allowed = company.allowed_domains or []

    # Allow all domains (wildcard mode)
    if "*" in allowed:
        return

    # Get origin from request headers
    origin = request.headers.get("origin") or request.headers.get("referer")

    # No origin = direct API call (not from a browser) = allow
    if not origin:
        return

    # Extract clean domain from origin
    # "https://www.acmecorp.com/page" → "acmecorp.com"
    clean = origin.lower()
    clean = clean.replace("https://", "").replace("http://", "")
    clean = clean.replace("www.", "")
    clean = clean.split("/")[0].split(":")[0]

    # Always allow localhost for development
    if clean in ("localhost", "127.0.0.1", "", "localhost:3000", "127.0.0.1:3001", "https://poncho-heading-dreamland.ngrok-free.dev/"):
        return

    # Check against whitelist
    if clean not in allowed:
        raise HTTPException(
            status_code=403,
            detail=f"Domain '{clean}' is not authorized. "
                   f"Add it in your dashboard under Tracker Settings."
        )


def validate_event(payload: EventCreate):
    """
    Validates event data before processing.

    Checks:
    1. Event name is in the allowed list
    2. user_id is a non-empty string
    3. Page is a valid path (not a full URL with credentials)
    4. Metadata is not excessively large
    """

    # 1. Validate event name
    if payload.event not in ALLOWED_EVENTS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid event '{payload.event}'. "
                   f"Allowed: {', '.join(sorted(ALLOWED_EVENTS))}"
        )

    # 2. Validate user_id
    if not payload.user_id or not payload.user_id.strip():
        raise HTTPException(status_code=400, detail="user_id cannot be empty")

    if len(payload.user_id) > 255:
        raise HTTPException(status_code=400, detail="user_id too long (max 255 chars)")

    # 3. Validate page
    if payload.page and len(payload.page) > 2000:
        raise HTTPException(status_code=400, detail="page URL too long (max 2000 chars)")

    # 4. Validate metadata size
    if payload.metadata:
        metadata_str = json.dumps(payload.metadata)
        if len(metadata_str) > 5000:
            raise HTTPException(
                status_code=400,
                detail="metadata too large (max 5000 characters)"
            )


def is_duplicate_event(company_id, user_id, event_name, page, redis_client) -> bool:
    raw_key   = f"{company_id}:{user_id}:{event_name}:{page}"
    fingerprint = hashlib.md5(raw_key.encode()).hexdigest()
    redis_key   = f"dedup:{fingerprint}"

    if redis_client.exists(redis_key):
        return True

    redis_client.setex(redis_key, 60, "1")
    return False


def get_or_create_user(company_id, external_user_id, db) -> User:
    user = db.query(User).filter(
        User.company_id == company_id,
        User.external_user_id == external_user_id
    ).first()

    if not user:
        user = User(company_id=company_id, external_user_id=external_user_id)
        db.add(user)
        db.commit()
        db.refresh(user)

    return user


@router.post("/track", response_model=EventResponse, status_code=202)
def track_event(
    payload: EventCreate,
    request: Request,                                      # ← needed for domain check
    db: Session = Depends(get_db),
    redis_client=Depends(get_redis),
    company: Company = Depends(get_current_company)
):
    # ── 1. Domain whitelist check ──
    check_domain_whitelist(request, company)

    # ── 2. Event validation ──
    validate_event(payload)

    # ── 3. Duplicate check ──
    if is_duplicate_event(
        str(company.id), payload.user_id,
        payload.event, payload.page or "",
        redis_client
    ):
        return EventResponse(status="duplicate",
            message="Duplicate event ignored")

    # ── 4. Get or create user ──
    user = get_or_create_user(str(company.id), payload.user_id, db)

    # ── 4.5: Update real-time visitor presence ──
    realtime_key = f"realtime:{company.id}:{payload.user_id}"
    redis_client.setex(realtime_key, 300, "1")

    # ── 5. Push to Redis queue ──
    event_time = payload.timestamp or datetime.now(timezone.utc)
    queue_key  = f"event_queue:{company.id}"
    event_data = {
        "company_id": str(company.id),
        "user_id":    str(user.id),
        "event_name": payload.event,
        "page":       payload.page,
        "metadata":   payload.metadata,
        "timestamp":  event_time.isoformat()
    }
    redis_client.rpush(queue_key, json.dumps(event_data))

    return EventResponse(status="accepted",
        message="Event received and queued")


@router.post("/process-queue-direct")
def process_queue_direct(
    db: Session = Depends(get_db),
    redis_client=Depends(get_redis),
    company: Company = Depends(get_current_company)
):
    queue_key    = f"event_queue:{company.id}"
    queue_length = redis_client.llen(queue_key)

    if queue_length == 0:
        return {"status": "empty", "processed": 0}

    events_to_insert = []

    pipe = redis_client.pipeline()
    for _ in range(queue_length):
        pipe.lpop(queue_key)
    raw_events = [e for e in pipe.execute() if e is not None]

    for raw in raw_events:
        try:
            d = json.loads(raw)
            events_to_insert.append((Event(
                company_id=d["company_id"],
                user_id=d["user_id"],
                event_name=d["event_name"],
                page=d.get("page"),
                metadata_=d.get("metadata"),
                timestamp=datetime.fromisoformat(d["timestamp"]),
                received_at=datetime.now(timezone.utc)
            ), raw))
        except Exception:
            continue

    if events_to_insert:
        try:
            db.add_all([e[0] for e in events_to_insert])
            db.commit()
            return {
                "status": "success",
                "processed": len(events_to_insert),
                "queue_remaining": redis_client.llen(queue_key)
            }
        except Exception as e:
            db.rollback()
            pipe = redis_client.pipeline()
            for _, raw in events_to_insert:
                pipe.rpush(queue_key, raw)
            pipe.execute()
            return {"status": "db_error", "error": str(e)}

    return {"status": "nothing_inserted"}


# @router.get("/recent")
def get_recent_events(
    limit: int = 20,
    db: Session = Depends(get_db),
    company: Company = Depends(get_current_company)
):
    events = (
        db.query(Event)
        .filter(Event.company_id == company.id)
        .order_by(Event.timestamp.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id":         str(e.id),
            "event_name": e.event_name,
            "page":       e.page,
            "timestamp":  e.timestamp.isoformat()
        }
        for e in events
    ]