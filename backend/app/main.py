from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import companies, events, analytics, insights, tracker
from app.logging_config import setup_logging

setup_logging()

app = FastAPI(
    title="SaaS Analytics Platform",
    description="Track user events, analyze behavior, generate AI insights",
    version="1.0.0"
)

# ─────────────────────────────────────────────
# CORS — allow all origins
#
# Why allow_origins=["*"] here?
#
# External websites call POST /api/events/track from their
# visitors' browsers. Those visitors could be on any domain.
# We can't whitelist them all in CORS — instead we handle
# authorization inside the endpoint using:
#   1. API key validation
#   2. Domain whitelisting (our custom check)
#   3. Rate limiting
#
# CORS is the browser's protection mechanism.
# Our domain whitelist is our application-level protection.
# Both serve different purposes.
# ─────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,   # Must be False when allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    companies.router, prefix="/api/companies", tags=["Companies"])
app.include_router(events.router,    prefix="/api/events",    tags=["Events"])
app.include_router(
    analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(insights.router,  prefix="/api/insights",
                   tags=["Insights"])
app.include_router(tracker.router,                            tags=["Tracker"])


@app.get("/")
def health_check():
    return {"status": "running"}
