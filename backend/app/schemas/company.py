from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import List


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
    allowed_domains: List[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    company_id: str
    company_name: str
    api_key: str


# Domain management schemas
class DomainAdd(BaseModel):
    domain: str       # e.g. "acmecorp.com"


class DomainListResponse(BaseModel):
    allowed_domains: List[str]