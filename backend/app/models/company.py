from sqlalchemy import Column, String, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
import uuid
from datetime import datetime, timezone


class Company(Base):
    __tablename__ = "companies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)

    api_key = Column(
        String(64), unique=True,
        nullable=False, default=lambda: str(uuid.uuid4()).replace("-", "")
    )

    # List of authorized domains e.g. ["acmecorp.com", "www.acmecorp.com"]
    # Events from unlisted domains are rejected
    # Empty list = tracking disabled
    # ["*"] = allow all domains (development mode)
    allowed_domains = Column(JSON, default=lambda: ["*"])

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    users = relationship("User", back_populates="company")
    events = relationship("Event", back_populates="company")
    insights = relationship("Insight", back_populates="company")
