from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


# Schema for creating a company — what the CLIENT must send
class CompanyCreate(BaseModel):
    name: str


# Schema for what we send BACK to the client
# Includes fields we generated (id, api_key, created_at)
class CompanyResponse(BaseModel):
    id: UUID
    name: str
    api_key: str
    created_at: datetime

    # This tells Pydantic to read data from SQLAlchemy model attributes
    # Without this, Pydantic would only read plain dicts, not ORM objects
    model_config = {"from_attributes": True}