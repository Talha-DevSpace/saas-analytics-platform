from sqlalchemy.orm import Session
from sqlalchemy import func, distinct, text
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
        print(f"Step: {step}, Previous Count: {previous_count}, Users: {count}, Drop-off: {drop_off}%")

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


def get_device_breakdown(company_id, db):
    results = db.execute(text("""
        SELECT
            metadata->>'device' as device,
            COUNT(*) as count
        FROM events
        WHERE company_id = :company_id
        AND event_name   = 'page_view'
        AND metadata->>'device' IS NOT NULL
        GROUP BY metadata->>'device'
        ORDER BY count DESC
    """), {"company_id": str(company_id)}).fetchall()

    return [{"device": r[0], "count": r[1]} for r in results]


def get_browser_breakdown(company_id, db):
    results = db.execute(text("""
        SELECT
            metadata->>'browser' as browser,
            COUNT(*) as count
        FROM events
        WHERE company_id = :company_id
        AND event_name   = 'page_view'
        AND metadata->>'browser' IS NOT NULL
        GROUP BY metadata->>'browser'
        ORDER BY count DESC
    """), {"company_id": str(company_id)}).fetchall()

    return [{"browser": r[0], "count": r[1]} for r in results]


def get_top_referrers(company_id, db, limit=10):
    results = db.execute(text("""
        SELECT
            metadata->>'referrer_source' as source,
            COUNT(*) as count
        FROM events
        WHERE company_id = :company_id
        AND event_name   = 'page_view'
        AND metadata->>'referrer_source' IS NOT NULL
        AND metadata->>'referrer_source' != 'internal'
        GROUP BY metadata->>'referrer_source'
        ORDER BY count DESC
        LIMIT :limit
    """), {"company_id": str(company_id), "limit": limit}).fetchall()

    return [{"source": r[0], "count": r[1]} for r in results]


def get_session_stats(company_id, db):
    # Count unique sessions
    result = db.execute(text("""
        SELECT COUNT(DISTINCT metadata->>'session_id') as total_sessions
        FROM events
        WHERE company_id = :company_id
        AND metadata->>'session_id' IS NOT NULL
    """), {"company_id": str(company_id)}).fetchone()

    total_sessions = result[0] if result else 0

    # Count new vs returning visitors
    new_result = db.execute(text("""
        SELECT
            SUM(CASE WHEN metadata->>'is_new_visitor' = 'true' THEN 1 ELSE 0 END) as new_visitors,
            SUM(CASE WHEN metadata->>'is_new_visitor' = 'false' THEN 1 ELSE 0 END) as returning_visitors
        FROM events
        WHERE company_id = :company_id
        AND event_name   = 'page_view'
        AND metadata->>'is_new_visitor' IS NOT NULL
    """), {"company_id": str(company_id)}).fetchone()

    new_visitors = int(new_result[0] or 0)
    returning_visitors = int(new_result[1] or 0)

    return {
        "total_sessions":      total_sessions,
        "new_visitors":        new_visitors,
        "returning_visitors":  returning_visitors,
    }


def get_utm_stats(company_id, db):
    results = db.execute(text("""
        SELECT
            metadata->>'utm_source'   as utm_source,
            metadata->>'utm_medium'   as utm_medium,
            metadata->>'utm_campaign' as utm_campaign,
            COUNT(*) as visits
        FROM events
        WHERE company_id = :company_id
        AND event_name   = 'page_view'
        AND metadata->>'utm_source' IS NOT NULL
        GROUP BY utm_source, utm_medium, utm_campaign
        ORDER BY visits DESC
        LIMIT 10
    """), {"company_id": str(company_id)}).fetchall()

    return [
        {
            "source":   r[0], "medium":   r[1],
            "campaign": r[2], "visits":   r[3]
        }
        for r in results
    ]


def get_event_breakdown(company_id, db):
    results = (
        db.query(Event.event_name, func.count(Event.id).label("count"))
        .filter(Event.company_id == company_id)
        .group_by(Event.event_name)
        .order_by(func.count(Event.id).desc())
        .all()
    )
    return [{"event": r.event_name, "count": r.count} for r in results]


def get_realtime_visitors(company_id, redis_client):
    """
    Counts visitors active in the last 5 minutes.
    Scans Redis for keys matching realtime:{company_id}:*
    Each key represents one active visitor (auto-expires after 5 min).
    """
    pattern = f"realtime:{company_id}:*"
    keys = redis_client.keys(pattern)
    return len(keys)


def get_bounce_rate(company_id, db):
    """
    Bounce rate = sessions where user only visited ONE page.

    We count sessions with only 1 page_view event,
    divide by total sessions, multiply by 100.
    """
    result = db.execute(text("""
        WITH session_page_counts AS (
            SELECT
                metadata->>'session_id' as session_id,
                COUNT(*) as page_count
            FROM events
            WHERE company_id  = :company_id
            AND event_name    = 'page_view'
            AND metadata->>'session_id' IS NOT NULL
            GROUP BY metadata->>'session_id'
        )
        SELECT
            COUNT(*) as total_sessions,
            SUM(CASE WHEN page_count = 1 THEN 1 ELSE 0 END) as bounced_sessions
        FROM session_page_counts
    """), {"company_id": str(company_id)}).fetchone()

    total = result[0] if result else 0
    bounced = result[1] if result else 0

    if total == 0:
        return 0.0

    return round((bounced / total) * 100, 1)


def get_avg_session_duration(company_id, db):
    """
    Average time users spend per session.
    Calculated from time_on_page events — we sum seconds
    per session_id, then average across sessions.
    """
    result = db.execute(text("""
        WITH session_durations AS (
            SELECT
                metadata->>'session_id' as session_id,
                SUM(CAST(metadata->>'seconds' AS FLOAT)) as total_seconds
            FROM events
            WHERE company_id  = :company_id
            AND event_name    = 'time_on_page'
            AND metadata->>'seconds' IS NOT NULL
            AND metadata->>'session_id' IS NOT NULL
            GROUP BY metadata->>'session_id'
        )
        SELECT AVG(total_seconds) as avg_seconds
        FROM session_durations
    """), {"company_id": str(company_id)}).fetchone()

    avg = result[0] if result and result[0] else 0
    return round(avg, 1)


def get_peak_hours(company_id, db):
    """
    Returns event counts grouped by hour of day (0-23).
    Shows which hours get the most traffic.
    Uses EXTRACT(HOUR FROM timestamp) in PostgreSQL.
    """
    results = db.execute(text("""
        SELECT
            EXTRACT(HOUR FROM timestamp)::int as hour,
            COUNT(*) as count
        FROM events
        WHERE company_id = :company_id
        AND event_name   = 'page_view'
        GROUP BY hour
        ORDER BY hour ASC
    """), {"company_id": str(company_id)}).fetchall()

    # Build full 24-hour list, filling 0 for hours with no traffic
    hours = {r[0]: r[1] for r in results}
    return [
        {"hour": h, "count": hours.get(h, 0)}
        for h in range(24)
    ]
