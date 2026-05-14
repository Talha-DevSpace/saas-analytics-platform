from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.company import Company
from app.schemas.company import CompanyCreate, CompanyResponse

# APIRouter is like a mini FastAPI app — groups related endpoints together
router = APIRouter()


@router.post("/register", response_model=CompanyResponse, status_code=201)
def register_company(payload: CompanyCreate, db: Session = Depends(get_db)):

    # Check if a company with this name already exists
    existing = db.query(Company).filter(Company.name == payload.name).first()
    if existing:
        # 400 = Bad Request — client sent something invalid
        raise HTTPException(status_code=400, detail="Company name already registered")

    # Create a new Company object (not saved yet — just in memory)
    new_company = Company(name=payload.name)

    # Add to the session (marks it for insertion)
    db.add(new_company)

    # Actually write to PostgreSQL
    db.commit()

    # Refresh to get the auto-generated fields (id, api_key, created_at)
    db.refresh(new_company)

    return new_company


@router.get("/{company_id}", response_model=CompanyResponse)
def get_company(company_id: str, db: Session = Depends(get_db)):

    company = db.query(Company).filter(Company.id == company_id).first()

    if not company:
        # 404 = Not Found
        raise HTTPException(status_code=404, detail="Company not found")

    return company