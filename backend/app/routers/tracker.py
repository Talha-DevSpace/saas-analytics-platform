from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.auth import get_current_company_jwt
from app.cache import get_redis

from app.models.company import Company
from app.models.user import User
from app.models.event import Event

from app.schemas.company import DomainAdd, DomainListResponse

from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
import json
import os


load_dotenv()

router = APIRouter()

TRACKER_BASE_URL = os.getenv("TRACKER_BASE_URL", "http://localhost:8000")

script_path = os.path.join(os.path.dirname(__file__), "script.js")
print("Path: ", script_path)
with open(script_path, "r", encoding="utf-8") as f:
    SCRIPT_JS = f.read()


@router.get("/tracker.js", include_in_schema=False)
def serve_tracker(request: Request):

    script = SCRIPT_JS.replace(
        "__TRACKER_BASE_URL__", TRACKER_BASE_URL).strip()
    return Response(
        content=script,
        media_type="application/javascript",
        headers={
            "Cache-Control": "public, max-age=3600",  # Cache 1 hour
            # "Access-Control-Allow-Origin": "*",
            # "Cross-Origin-Resource-Policy": "cross-origin",   # ← ADD
            # "X-Content-Type-Options": "nosniff",
        }
    )

# DOMAIN MANAGEMENT ENDPOINTS
# Protected by JWT — only the company can manage their domains

@router.get("/api/tracker/domains", response_model=DomainListResponse)
def get_domains(company: Company = Depends(get_current_company_jwt)):
    """Returns the list of domains authorized to send events."""
    return DomainListResponse(allowed_domains=company.allowed_domains or [])  # type: ignore


@router.post("/api/tracker/domains", response_model=DomainListResponse)
def add_domain(
    payload: DomainAdd,
    db: Session = Depends(get_db),
    company: Company = Depends(get_current_company_jwt)
):
    """
    Adds a domain to the company's whitelist.
    Cleans the input — strips https://, www., trailing slashes.
    """

    # Clean the domain input
    domain = payload.domain.strip().lower()
    domain = domain.replace("https://", "").replace("http://", "")
    domain = domain.replace("www.", "")
    domain = domain.rstrip("/").split("/")[0]  # Remove paths

    if not domain:
        raise HTTPException(status_code=400, detail="Invalid domain")

    current_domains = list(company.allowed_domains or [])

    if domain in current_domains:
        raise HTTPException(status_code=400, detail="Domain already added")

    # Remove wildcard if a real domain is being added
    if "*" in current_domains and domain != "*":
        current_domains.remove("*")

    current_domains.append(domain)

    # SQLAlchemy doesn't detect in-place list mutations
    # We must reassign to trigger the update
    company.allowed_domains = current_domains
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(company, "allowed_domains")

    db.commit()
    db.refresh(company)

    return DomainListResponse(allowed_domains=company.allowed_domains)


@router.delete("/api/tracker/domains/{domain}", response_model=DomainListResponse)
def remove_domain(
    domain: str,
    db: Session = Depends(get_db),
    company: Company = Depends(get_current_company_jwt)
):
    """Removes a domain from the whitelist."""

    current_domains = list(company.allowed_domains or [])

    if domain not in current_domains:
        raise HTTPException(status_code=404, detail="Domain not found")

    current_domains.remove(domain)

    # If all domains removed, disable tracking
    if not current_domains:
        current_domains = []

    company.allowed_domains = current_domains
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(company, "allowed_domains")

    db.commit()
    db.refresh(company)

    return DomainListResponse(allowed_domains=company.allowed_domains)


@router.get("/api/tracker/verify")
def verify_installation(
    db: Session = Depends(get_db),
    company: Company = Depends(get_current_company_jwt)
):
    """
    Checks if the tracker has received any real events
    in the last 24 hours. Used by the dashboard to show
    installation status — green tick or red warning.
    """

    since = datetime.now(timezone.utc) - timedelta(hours=24)

    # Count events from tracker (page_view is always the first event)
    recent_count = (
        db.query(func.count(Event.id))
        .filter(
            Event.company_id == company.id,
            Event.timestamp >= since,
            Event.event_name == 'page_view'
        )
        .scalar() or 0
    )

    # Get the most recent event timestamp
    last_event = (
        db.query(Event.timestamp)
        .filter(Event.company_id == company.id)
        .order_by(Event.timestamp.desc())
        .first()
    )

    return {
        "installed":          recent_count > 0,
        "events_last_24h":    recent_count,
        "last_event_at":      last_event[0].isoformat() if last_event else None,
        "domains":            company.allowed_domains or [],
    }


@router.post("/api/tracker/test-event")
def send_test_event(
    db: Session = Depends(get_db),
    redis_client=Depends(get_redis),
    company: Company = Depends(get_current_company_jwt)
):
    """
    Sends a test event on behalf of the company.
    Confirms the full pipeline works:
      API → Redis queue → worker → PostgreSQL → dashboard

    The event is tagged with is_test: true in metadata
    so it can be identified in the events table.
    """

    TEST_USER_ID = "test_user_dashboard"

    # Get or create a test user
    user = db.query(User).filter(
        User.company_id == company.id,
        User.external_user_id == TEST_USER_ID
    ).first()

    if not user:
        user = User(
            company_id=company.id,
            external_user_id=TEST_USER_ID
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Push test event directly to Redis queue
    queue_key = f"event_queue:{company.id}"
    event_data = {
        "company_id": str(company.id),
        "user_id":    str(user.id),
        "event_name": "page_view",
        "page":       "/tracker-test",
        "metadata":   {
            "is_test":        True,
            "device":         "desktop",
            "browser":        "dashboard",
            "referrer_source": "direct",
            "title":          "Tracker Test Event",
        },
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    redis_client.rpush(queue_key, json.dumps(event_data))

    return {
        "status":  "queued",
        "message": "Test event queued. Process the queue to see it in analytics.",
        "user_id": TEST_USER_ID
    }
