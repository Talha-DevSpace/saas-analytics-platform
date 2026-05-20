from app.workers.celery_app import celery_app
from app.database import SessionLocal
from app.models.analytics import AnalyticsDaily
from app.models.company import Company
from app.cache import get_redis
from app.services import analytics_service
from datetime import date, datetime, timezone
import json
import logging

logger = logging.getLogger(__name__)


@celery_app.task(
    name="app.workers.analytics_worker.recalculate_daily_analytics",
    bind=True,
    max_retries=3,
    default_retry_delay=120
)
def recalculate_daily_analytics(self):

    db = SessionLocal()
    redis_client = get_redis()
    today = date.today()
    companies_processed = 0

    try:
        # Get all companies
        companies = db.query(Company).all()

        if not companies:
            logger.info(
                "No companies found. Skipping analytics recalculation.")
            return {"companies_processed": 0}

        logger.info(
            f"Recalculating analytics for {len(companies)} company/companies")

        for company in companies:
            company_id = str(company.id)

            try:
                # ── Calculate all metrics ──
                total_users = analytics_service.get_total_users(company_id, db)
                total_events = analytics_service.get_total_events(
                    company_id, db)
                active_users = analytics_service.get_active_users_today(
                    company_id, db)
                top_pages = analytics_service.get_top_pages(company_id, db)
                funnel_data = analytics_service.get_funnel_data(company_id, db)
                events_over_time = analytics_service.get_events_over_time(
                    company_id, db)

                # ── Save/Update daily snapshot in PostgreSQL ──
                existing_snapshot = db.query(AnalyticsDaily).filter(
                    AnalyticsDaily.company_id == company.id,
                    AnalyticsDaily.date == today
                ).first()

                if existing_snapshot:
                    # Update existing record for today
                    existing_snapshot.active_users = active_users  # type: ignore
                    existing_snapshot.total_events = total_events  # type: ignore
                    existing_snapshot.top_pages = top_pages  # type: ignore
                    existing_snapshot.funnel_data = funnel_data  # type: ignore
                else:
                    # Create new record for today
                    snapshot = AnalyticsDaily(
                        company_id=company.id,
                        date=today,
                        active_users=active_users,
                        total_events=total_events,
                        top_pages=top_pages,
                        funnel_data=funnel_data
                    )
                    db.add(snapshot)

                db.commit()

                # ── Refresh Redis cache ──
                analytics_data = {
                    "total_users": total_users,
                    "total_events": total_events,
                    "active_users_today": active_users,
                    "top_pages": top_pages,
                    "funnel_data": funnel_data,
                    "events_over_time": events_over_time
                }

                cache_key = f"analytics:overview:{company_id}"

                redis_client.setex(
                    cache_key,
                    300,
                    json.dumps(analytics_data)
                )

                companies_processed += 1
                logger.info(f"Analytics updated for company: {company.name}")

            except Exception as company_error:
                db.rollback()
                logger.error(
                    f"Failed to process analytics for "
                    f"company {company.name}: {company_error}"
                )

    except Exception as exc:
        logger.error(f"Critical error in recalculate_daily_analytics: {exc}")
        raise self.retry(exc=exc)

    finally:
        db.close()

    logger.info(
        f"Analytics recalculation done. Companies processed: {companies_processed}")
    return {"companies_processed": companies_processed}


@celery_app.task(name="app.workers.analytics_worker.get_historical_analytics")
def get_historical_analytics(company_id: str, days: int = 7):

    db = SessionLocal()

    try:
        from datetime import timedelta
        start_date = date.today() - timedelta(days=days)

        snapshots = (
            db.query(AnalyticsDaily)
            .filter(
                AnalyticsDaily.company_id == company_id,
                AnalyticsDaily.date >= start_date
            )
            .order_by(AnalyticsDaily.date.asc())
            .all()
        )

        return [
            {
                "date": str(s.date),
                "active_users": s.active_users,
                "total_events": s.total_events,
                "top_pages": s.top_pages,
                "funnel_data": s.funnel_data
            }
            for s in snapshots
        ]

    finally:
        db.close()
