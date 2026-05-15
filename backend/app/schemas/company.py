from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class CompanyRegister(BaseModel):
    name: str
    email: str
    password: str


class CompanyLogin(BaseModel):
    email: str
    password: str


class CompanyResponse(BaseModel):
    id: UUID
    name: str
    email: str
    api_key: str
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    company_id: str
    company_name: str
    api_key: str