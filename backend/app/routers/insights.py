from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.database import get_db
from app.cache import get_redis
from app.auth import get_current_company_jwt
from app.models.company import Company
from app.models.insight import Insight
from app.services import analytics_service, ai_service
import json

router = APIRouter()


@router.get("/generate")
def generate_insights(
    db: Session = Depends(get_db),
    redis_client=Depends(get_redis),
    company: Company = Depends(get_current_company_jwt)
):
    cache_key = f"insights:{company.id}"
    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    analytics_data = {
        "total_users":        analytics_service.get_total_users(str(company.id), db),
        "total_events":       analytics_service.get_total_events(str(company.id), db),
        "active_users_today": analytics_service.get_active_users_today(str(company.id), db),
        "top_pages":          analytics_service.get_top_pages(str(company.id), db),
        "funnel_data":        analytics_service.get_funnel_data(str(company.id), db),
    }

    try:
        insight_data = ai_service.generate_insight(analytics_data)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"AI service error: {str(e)}")

    # insight_data["generated_at"] = datetime.now(timezone.utc).isoformat()

    new_insight = Insight(
        company_id=company.id,
        insight_text=insight_data["insight"],
        suggestion=insight_data["suggestion"],
        confidence=insight_data["confidence"]
    )
    db.add(new_insight)
    db.commit()

    redis_client.setex(cache_key, 3600, json.dumps(insight_data))
    return insight_data


@router.get("/history")
def get_insight_history(
    db: Session = Depends(get_db),
    company: Company = Depends(get_current_company_jwt)
):
    insights = (
        db.query(Insight)
        .filter(Insight.company_id == company.id)
        .order_by(Insight.created_at.desc())
        .limit(10)
        .all()
    )

    return [
        {
            "insight":      i.insight_text,
            "suggestion":   i.suggestion,
            "confidence":   i.confidence,
            "generated_at": i.created_at.isoformat()
        }
        for i in insights
    ]
