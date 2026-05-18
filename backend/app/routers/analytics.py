from fastapi import APIRouter, Depends, Query as QueryParam
from sqlalchemy.orm import Session
from app.database import get_db
from app.cache import get_redis
from app.auth import get_current_company_jwt
from app.models.company import Company
from app.models.event import Event as EventModel
from app.services import analytics_service
from fastapi.responses import StreamingResponse

import csv
import io
import json

router = APIRouter()


@router.get("/overview")
def get_overview(
    db: Session = Depends(get_db),
    redis_client=Depends(get_redis),
    company: Company = Depends(get_current_company_jwt)
):
    cache_key = f"analytics:overview:{company.id}"
    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    data = {
        "total_users":        analytics_service.get_total_users(str(company.id), db),
        "total_events":       analytics_service.get_total_events(str(company.id), db),
        "active_users_today": analytics_service.get_active_users_today(str(company.id), db),
        "top_pages":          analytics_service.get_top_pages(str(company.id), db),
        "funnel_data":        analytics_service.get_funnel_data(str(company.id), db),
        "events_over_time":   analytics_service.get_events_over_time(str(company.id), db),
    }
    redis_client.setex(cache_key, 300, json.dumps(data))
    return data


@router.get("/funnel")
def get_funnel(
    db: Session = Depends(get_db),
    company: Company = Depends(get_current_company_jwt)
):
    return {"funnel": analytics_service.get_funnel_data(str(company.id), db)}


@router.get("/pages")
def get_top_pages(
    db: Session = Depends(get_db),
    company: Company = Depends(get_current_company_jwt)
):
    return {"pages": analytics_service.get_top_pages(str(company.id), db)}


@router.get("/detailed")
def get_detailed(
    db: Session = Depends(get_db),
    redis_client=Depends(get_redis),
    company: Company = Depends(get_current_company_jwt)
):
    cache_key = f"analytics:detailed:{company.id}"
    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    cid = str(company.id)
    data = {
        "devices":         analytics_service.get_device_breakdown(cid, db),
        "browsers":        analytics_service.get_browser_breakdown(cid, db),
        "referrers":       analytics_service.get_top_referrers(cid, db),
        "sessions":        analytics_service.get_session_stats(cid, db),
        "utm_campaigns":   analytics_service.get_utm_stats(cid, db),
        "event_breakdown": analytics_service.get_event_breakdown(cid, db),
    }
    redis_client.setex(cache_key, 300, json.dumps(data))
    return data


@router.get("/realtime")
def get_realtime(
    redis_client=Depends(get_redis),
    company: Company = Depends(get_current_company_jwt)
):
    """
    Returns live visitor count — no caching, always fresh.
    Frontend polls this every 30 seconds.
    """
    count = analytics_service.get_realtime_visitors(
        str(company.id), redis_client
    )
    return {"active_visitors": count}


@router.get("/engagement")
def get_engagement(
    db: Session = Depends(get_db),
    redis_client=Depends(get_redis),
    company: Company = Depends(get_current_company_jwt)
):
    """
    Returns bounce rate, avg session duration, and peak hours.
    Cached for 10 minutes — these metrics change slowly.
    """
    cache_key = f"analytics:engagement:{company.id}"
    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    cid = str(company.id)
    data = {
        "bounce_rate":          analytics_service.get_bounce_rate(cid, db),
        "avg_session_duration": analytics_service.get_avg_session_duration(cid, db),
        "peak_hours":           analytics_service.get_peak_hours(cid, db),
    }
    redis_client.setex(cache_key, 600, json.dumps(data))
    return data


@router.get("/live-events")
def get_live_events(
    db: Session = Depends(get_db),
    company: Company = Depends(get_current_company_jwt)
):
    """
    Returns the 10 most recent events.
    Used by the live feed panel in the dashboard.
    No cache — always shows latest.
    """
    events = (
        db.query(EventModel)
        .filter(EventModel.company_id == company.id)
        .order_by(EventModel.timestamp.desc())
        .limit(10)
        .all()
    )
    return [
        {
            "event_name": e.event_name,
            "page":       e.page,
            "timestamp":  e.timestamp.isoformat(),
            "metadata":   e.metadata_ or {}
        }
        for e in events
    ]



@router.get("/export")
def export_events_csv(
        token: str = QueryParam(None),
    db: Session = Depends(get_db),
    company: Company = Depends(get_current_company_jwt)
):
    """
    Exports all events for this company as a CSV file.
    The browser downloads it directly as a file.
    """
    events = (
        db.query(EventModel)
        .filter(EventModel.company_id == company.id)
        .order_by(EventModel.timestamp.desc())
        .limit(10000)   # Max 10k rows
        .all()
    )

    # Write CSV into memory buffer
    output = io.StringIO()
    writer = csv.writer(output)

    # Header row
    writer.writerow([
        "event_name", "page", "timestamp",
        "device", "browser", "os",
        "referrer_source", "session_id",
        "is_new_visitor", "utm_source",
        "utm_medium", "utm_campaign"
    ])

    # Data rows
    for e in events:
        meta = e.metadata_ or {}
        writer.writerow([
            e.event_name,
            e.page or "",
            e.timestamp.isoformat(),
            meta.get("device", ""),
            meta.get("browser", ""),
            meta.get("os", ""),
            meta.get("referrer_source", ""),
            meta.get("session_id", ""),
            meta.get("is_new_visitor", ""),
            meta.get("utm_source", ""),
            meta.get("utm_medium", ""),
            meta.get("utm_campaign", ""),
        ])

    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition":
                f"attachment; filename=analytics_export.csv"
        }
    )
