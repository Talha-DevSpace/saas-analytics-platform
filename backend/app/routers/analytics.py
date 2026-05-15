from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.cache import get_redis
from app.auth import get_current_company_jwt
from app.models.company import Company
from app.services import analytics_service
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