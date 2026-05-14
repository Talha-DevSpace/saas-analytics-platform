from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import companies, events, analytics, insights
from app.logging_config import setup_logging

setup_logging()

app = FastAPI(
    title="SaaS Analytics Platform",
    description="Track user events, analyze behavior, generate AI insights",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],    # GET, POST, PUT, DELETE, etc.
    allow_headers=["*"],    # All headers including X-API-Key
)

app.include_router(
    companies.router, prefix="/api/companies", tags=["Companies"])
app.include_router(events.router, prefix="/api/events", tags=["Events"])
app.include_router(
    analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(insights.router, prefix="/api/insights", tags=["Insights"])


# Health check endpoint — useful to quickly verify the server is running
@app.get("/")
def health_check():
    return {"status": "running", "message": "SaaS Analytics API is live"}
