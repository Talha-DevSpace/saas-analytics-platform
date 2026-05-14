from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime
from uuid import UUID


# What the company sends us when tracking an event
class EventCreate(BaseModel):
    user_id: str                        # Their internal user ID (e.g., "U123")
    event: str                          # Event name (e.g., "button_click")
    page: Optional[str] = None         # Which page it happened on
    timestamp: Optional[datetime] = None  # When it happened (we default to now)
    metadata: Optional[dict] = None    # Any extra data


# What we send back after receiving an event
class EventResponse(BaseModel):
    status: str        # "accepted" or "duplicate"
    message: str


# Schema for analytics overview response
class AnalyticsOverview(BaseModel):
    total_users: int
    total_events: int
    active_users_today: int
    top_pages: list
    funnel_data: list


# Schema for AI insight response
class InsightResponse(BaseModel):
    insight: str
    suggestion: str
    confidence: float
    generated_at: datetime