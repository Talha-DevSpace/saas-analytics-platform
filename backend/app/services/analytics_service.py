from sqlalchemy.orm import Session
from sqlalchemy import func, distinct
from datetime import date, datetime, timedelta, timezone
from app.models.event import Event
from app.models.user import User
import json


def get_total_users(company_id: str, db: Session) -> int:
    return db.query(User).filter(
        User.company_id == company_id
    ).count()


def get_total_events(company_id: str, db: Session) -> int:
    return db.query(Event).filter(
        Event.company_id == company_id
    ).count()


def get_active_users_today(company_id: str, db: Session) -> int:
   
    today = date.today()

    result = db.query(
        func.count(distinct(Event.user_id))
    ).filter(
        Event.company_id == company_id,
        func.date(Event.timestamp) == today
    ).scalar()  # .scalar() returns the single value, not a row object

    return result or 0


def get_top_pages(company_id: str, db: Session, limit: int = 10) -> list:
 
    results = (
        db.query(
            Event.page,
            func.count(Event.id).label("visits")  # .label() gives it a name
        )
        .filter(
            Event.company_id == company_id,
            Event.page.isnot(None)  # Ignore events with no page
        )
        .group_by(Event.page)
        .order_by(func.count(Event.id).desc())  # Highest count first
        .limit(limit)
        .all()
    )

    return [{"page": r.page, "visits": r.visits} for r in results]


def get_funnel_data(company_id: str, db: Session) -> list:

    # These event names must match what companies actually send
    funnel_steps = [
        "page_view",      # Everyone who visited any page
        "pricing_view",   # Users who visited pricing page
        "signup",         # Users who signed up
        "purchase"        # Users who purchased
    ]

    funnel_data = []
    previous_count = None

    for step in funnel_steps:
        # Count unique users who completed this step
        count = db.query(
            func.count(distinct(Event.user_id))
        ).filter(
            Event.company_id == company_id,
            Event.event_name == step
        ).scalar() or 0

        # Calculate drop-off percentage
        if previous_count and previous_count > 0:
            drop_off = round((previous_count - count) /
                             previous_count * 100, 1)
        else:
            drop_off = 0.0

        funnel_data.append({
            "step": step,
            "users": count,
            "drop_off_percent": drop_off
        })

        previous_count = count

    return funnel_data


def get_events_over_time(company_id: str, db: Session, days: int = 7) -> list:

    start_date = datetime.now(timezone.utc) - timedelta(days=days)

    results = (
        db.query(
            func.date(Event.timestamp).label("day"),
            func.count(Event.id).label("count")
        )
        .filter(
            Event.company_id == company_id,
            Event.timestamp >= start_date
        )
        .group_by(func.date(Event.timestamp))
        .order_by(func.date(Event.timestamp))
        .all()
    )

    return [{"date": str(r.day), "events": r.count} for r in results]
