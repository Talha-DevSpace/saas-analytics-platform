from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.company import Company
from app.schemas.company import CompanyRegister, CompanyLogin, CompanyResponse, TokenResponse
from app.auth import hash_password, verify_password, create_access_token, get_current_company_jwt

router = APIRouter()


@router.post("/register", response_model=CompanyResponse, status_code=201)
def register_company(payload: CompanyRegister, db: Session = Depends(get_db)):

    # Check email not taken
    if db.query(Company).filter(Company.email == payload.email.lower()).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Check company name not taken
    if db.query(Company).filter(Company.name == payload.name).first():
        raise HTTPException(
            status_code=400, detail="Company name already taken")

    # Validate password length
    if len(payload.password) < 8:
        raise HTTPException(
            status_code=400, detail="Password must be at least 8 characters")

    new_company = Company(
        name=payload.name,
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password)
    )
    db.add(new_company)
    db.commit()
    db.refresh(new_company)
    return new_company


@router.post("/login", response_model=TokenResponse)
def login(payload: CompanyLogin, db: Session = Depends(get_db)):

    company = db.query(Company).filter(
        Company.email == payload.email.lower()
    ).first()

    if not company or not verify_password(payload.password, company.hashed_password):
        raise HTTPException(
            status_code=401, detail="Incorrect email or password")

    token = create_access_token(data={"cid": str(company.id)})

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        company_id=str(company.id),
        company_name=company.name,
        api_key=company.api_key
    )


@router.get("/me", response_model=CompanyResponse)
def get_me(company: Company = Depends(get_current_company_jwt)):
    return company
