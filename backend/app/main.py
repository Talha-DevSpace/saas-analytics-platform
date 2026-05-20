from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import companies, events, analytics, insights, tracker


app = FastAPI(
    title="SaaS Analytics Platform",
    description="Track user events, analyze behavior, generate AI insights",
    version="1.0.0"
)

# CORS — Cross-Origin Resource Sharing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(companies.router, prefix="/api/companies", tags=["Companies"])
app.include_router(events.router,    prefix="/api/events", tags=["Events"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(insights.router,  prefix="/api/insights", tags=["Insights"])
app.include_router(tracker.router, tags=["Tracker"])


@app.get("/")
def health_check():
    return {"status": "running"}
