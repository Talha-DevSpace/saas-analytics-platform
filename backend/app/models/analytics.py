from sqlalchemy import Column, DateTime, Integer, ForeignKey, JSON, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
import uuid
from datetime import datetime, timezone


class AnalyticsDaily(Base):
    __tablename__ = "analytics_daily"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    company_id = Column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False
    )

    date = Column(Date, nullable=False)

    active_users = Column(Integer, default=0)
    total_events = Column(Integer, default=0)

    top_pages = Column(JSON, nullable=True)

    # e.g., [{"step": "landing", "users": 500}, {"step": "pricing", "users": 300}]
    funnel_data = Column(JSON, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )