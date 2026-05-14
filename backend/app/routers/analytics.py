from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.cache import get_redis
from app.routers.events import get_current_company
from app.models.company import Company
from app.services import analytics_service
import json

router = APIRouter()


@router.get("/overview")
def get_overview(
    db: Session = Depends(get_db),
    redis_client=Depends(get_redis),
    company: Company = Depends(get_current_company)
):
    """
    Returns all key metrics for the dashboard.

    Caching strategy:
    1. First check Redis for a cached result (key: "analytics:{company_id}")
    2. If found → return immediately (fast, no DB query)
    3. If not found → query DB, store result in Redis for 5 minutes
    4. Next request within 5 minutes hits Redis, not DB

    This is called "cache-aside" pattern.
    """

    cache_key = f"analytics:overview:{company.id}"

    # Check cache first
    cached = redis_client.get(cache_key)
    if cached:
        # json.loads converts the JSON string back to a Python dict
        return json.loads(cached)

    # Cache miss — fetch from DB
    data = {
        "total_users": analytics_service.get_total_users(str(company.id), db),
        "total_events": analytics_service.get_total_events(str(company.id), db),
        "active_users_today": analytics_service.get_active_users_today(str(company.id), db),
        "top_pages": analytics_service.get_top_pages(str(company.id), db),
        "funnel_data": analytics_service.get_funnel_data(str(company.id), db),
        "events_over_time": analytics_service.get_events_over_time(str(company.id), db)
    }

    # Store in Redis for 5 minutes (300 seconds)
    redis_client.setex(cache_key, 300, json.dumps(data))

    return data


@router.get("/funnel")
def get_funnel(
    db: Session = Depends(get_db),
    company: Company = Depends(get_current_company)
):
    """Returns funnel data only."""
    return {
        "funnel": analytics_service.get_funnel_data(str(company.id), db)
    }


@router.get("/pages")
def get_top_pages(
    db: Session = Depends(get_db),
    company: Company = Depends(get_current_company)
):
    """Returns top pages only."""
    return {
        "pages": analytics_service.get_top_pages(str(company.id), db)
    }