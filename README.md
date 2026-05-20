# SaaS Analytics Platform

A lightweight, multi-tenant SaaS analytics system that tracks user events, analyzes behavior patterns, and generates AI-powered insights using Gemini.

---

## Table of Contents

- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup & Installation](#setup--installation)
- [Event Flow Explanation](#event-flow-explanation)
- [API Endpoints](#api-endpoints)
- [Analytics Logic](#analytics-logic)
- [AI Insight Generation](#ai-insight-generation)
- [Background Workers](#background-workers)
- [Multi-Tenancy Design](#multi-tenancy-design)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Next.js)                         │
│              Dashboard · Charts · AI Insights Panel             │
└────────────────────────────┬────────────────────────────────────┘
                             │  HTTP requests with X-API-Key
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     FASTAPI BACKEND                             │
│   /companies   /events   /analytics   /insights                 │
└──────────┬─────────────────┬───────────────────────────────────┘
           │                 │
           ▼                 ▼
┌──────────────────┐  ┌──────────────────────────────────────────┐
│   POSTGRESQL     │  │              REDIS                       │
│                  │  │                                          │
│  companies       │  │  event_queue:{company_id}  ← event jobs  │
│  users           │  │  dedup:{hash}              ← dedup keys  │
│  events          │  │  analytics:overview:{id}   ← cache       │
│  analytics_daily │  │  insights:{id}             ← AI cache    │
│  insights        │  │                                          │
└──────────────────┘  └──────────────┬───────────────────────────┘
                                     │  reads queue
                                     ▼
                      ┌──────────────────────────────────────────┐
                      │         CELERY WORKERS                   │
                      │                                          │
                      │  event_worker    → bulk insert to DB     │
                      │  analytics_worker→ recalculate metrics   │
                      │  celery beat     → runs tasks on schedule│
                      └──────────────────────────────────────────┘
```

---

## Tech Stack

| Layer      | Technology              | Purpose                          |
|------------|-------------------------|----------------------------------|
| Backend    | FastAPI (Python)        | REST API, request handling       |
| Database   | PostgreSQL              | Persistent event + analytics storage |
| Cache/Queue| Redis                   | Event queue, deduplication, caching |
| Workers    | Celery + Celery Beat    | Async background processing      |
| AI         | Google Gemini API    | Behavior insights + suggestions  |
| Frontend   | Next.js + Recharts      | Dashboard and visualizations     |

---

## Project Structure

```
saas-analytics/
├── backend/
│   ├── app/
│   │   ├── main.py              # App entry point, CORS, router registration
│   │   ├── database.py          # SQLAlchemy engine + session factory
│   │   ├── cache.py             # Redis client
│   │   ├── logging_config.py    # Logging setup
│   │   ├── models/
│   │   │   ├── company.py       # Companies table
│   │   │   ├── user.py          # Users table
│   │   │   ├── event.py         # Events table
│   │   │   ├── analytics.py     # Daily analytics snapshots
│   │   │   └── insight.py       # AI insights history
│   │   ├── schemas/
│   │   │   ├── company.py       # Pydantic request/response shapes
│   │   │   └── event.py         # Event payload validation
│   │   ├── routers/
│   │   │   ├── companies.py     # POST /register, GET /{id}
│   │   │   ├── events.py        # POST /track, GET /recent
│   │   │   ├── analytics.py     # GET /overview, /funnel, /pages
│   │   │   └── insights.py      # GET /generate, /history
│   │   ├── services/
│   │   │   ├── analytics_service.py  # SQL aggregation functions
│   │   │   └── ai_service.py         # Claude API integration
│   │   └── workers/
│   │       ├── celery_app.py    # Celery config + beat schedule
│   │       ├── event_worker.py  # Bulk insert events from queue
│   │       └── analytics_worker.py  # Recalculate daily snapshots
│   ├── migrations/              # Alembic migration files
│   ├── .env                     # Secrets (not committed to git)
│   └── requirements.txt
└── frontend/
    ├── app/
    │   ├── layout.js            # Root layout + fonts
    │   ├── page.js              # Login / register page
    │   ├── globals.css          # Global styles + CSS variables
    │   └── dashboard/
    │       └── page.js          # Main dashboard
    ├── components/
    │   ├── StatsCard.jsx        # Single metric card
    │   ├── EventChart.jsx       # Line chart (events over time)
    │   ├── FunnelChart.jsx      # Funnel with drop-off %
    │   ├── TopPages.jsx         # Most visited pages
    │   └── InsightPanel.jsx     # AI insight display
    ├── lib/
    │   └── api.js               # All backend API calls
    └── .env.local               # Frontend env vars
```

---

## Setup & Installation

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+
- Docker (for Redis)

### Backend Setup

```bash
# 1. Clone the repository
git clone https://github.com/Talha-DevSpace/saas-analytics-platform.git
cd saas-analytics/backend

# 2. Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac/Linux

# 3. Install dependencies
pip install -r requirements.txt

# 4. Create .env file
cp .env.example .env
# Edit .env and fill in your values

# 5. Create PostgreSQL database
psql -U postgres -c "CREATE DATABASE saas_analytics;"

# 6. Run database migrations
alembic upgrade head
```

### Frontend Setup

```bash
cd saas-analytics/frontend
npm install
```

### Environment Variables

**backend/.env**
```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/saas_analytics
REDIS_URL=redis://localhost:6379/0
GEMINI_API_KEY=your_gemini_key_here
```

**frontend/.env.local**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Running the App

Start Redis first:
```bash
docker start redis
# or first time: docker run -d -p 6379:6379 --name redis redis:latest
```

Then open 4 terminals:

```bash
# Terminal 1 — FastAPI server
cd backend && uvicorn app.main:app --reload --port 8000

# Terminal 2 — Celery worker
cd backend && celery -A app.workers.celery_app worker --loglevel=info --pool=solo -c 1

# Terminal 3 — Celery beat scheduler
cd backend && celery -A app.workers.celery_app beat --loglevel=info

# Terminal 4 — Next.js frontend
cd frontend && npm run dev
```

Open **http://localhost:3000**

---

## Event Flow Explanation

This is the core of the system. Here is exactly what happens when a company tracks an event:

```
1. Company sends POST /api/events/track
   {
     "user_id": "U123",
     "event": "button_click",
     "page": "/pricing",
     "timestamp": "2026-05-11T12:00:00Z"
   }
   Headers: { X-API-Key: "company_api_key" }

2. FastAPI authenticates the API key
   → Finds matching company in PostgreSQL
   → Returns 401 if key is invalid

3. Deduplication check (Redis)
   → Hash = MD5(company_id + user_id + event + page)
   → If hash exists in Redis → return "duplicate" (reject)
   → If hash doesn't exist → store in Redis with 60s TTL

4. Get or create user
   → Check if external_user_id exists for this company
   → If not → create new User record in PostgreSQL

5. Push event to Redis queue
   → Key: event_queue:{company_id}
   → Value: JSON-serialized event data
   → Return 202 Accepted immediately (fast response)

6. Celery worker picks up the queue (every 30 seconds)
   → Pops up to 100 events from Redis list
   → Bulk inserts into PostgreSQL events table
   → Logs results

7. Analytics worker recalculates metrics (every 5 minutes)
   → Runs aggregation queries on events table
   → Saves snapshot to analytics_daily table
   → Refreshes Redis cache for dashboard
```

**Why queue instead of direct DB save?**
Direct saves work for low traffic but fail under load. A queue absorbs traffic bursts — the API always responds fast, the worker processes at a steady rate.

---

## API Endpoints

### Companies

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/companies/register` | None | Register a new company, receive API key |
| GET | `/api/companies/{company_id}` | None | Fetch company details |

**Register example:**
```bash
curl -X POST http://localhost:8000/api/companies/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Acme Corp"}'
```

Response:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Acme Corp",
  "api_key": "a3f9b2c1d4e5f6...",
  "created_at": "2026-05-11T12:00:00Z"
}
```

---

### Events

All event endpoints require `X-API-Key` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/events/track` | Track a user event |
| GET | `/api/events/recent` | Get recent events (for debugging) |
| POST | `/api/events/process-queue-direct` | Manually trigger queue processing |

**Track event example:**
```bash
curl -X POST http://localhost:8000/api/events/track \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "user_id": "U123",
    "event": "page_view",
    "page": "/pricing"
  }'
```

Response:
```json
{ "status": "accepted", "message": "Event received and queued for processing" }
```

Duplicate response:
```json
{ "status": "duplicate", "message": "Event already received within the last 60 seconds" }
```

---

### Analytics

All analytics endpoints require `X-API-Key` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/overview` | Full dashboard metrics |
| GET | `/api/analytics/funnel` | Funnel with drop-off percentages |
| GET | `/api/analytics/pages` | Top visited pages |

**Overview response:**
```json
{
  "total_users": 1240,
  "total_events": 8320,
  "active_users_today": 47,
  "top_pages": [
    { "page": "/pricing", "visits": 320 },
    { "page": "/home", "visits": 210 }
  ],
  "funnel_data": [
    { "step": "page_view",    "users": 500, "drop_off_percent": 0.0 },
    { "step": "pricing_view", "users": 300, "drop_off_percent": 40.0 },
    { "step": "signup",       "users": 180, "drop_off_percent": 40.0 },
    { "step": "purchase",     "users": 80,  "drop_off_percent": 55.6 }
  ],
  "events_over_time": [
    { "date": "2026-05-10", "events": 420 },
    { "date": "2026-05-11", "events": 590 }
  ]
}
```

---

### Insights

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/insights/generate` | Generate or return cached AI insight |
| GET | `/api/insights/history` | Past 10 insights |

**Insight response:**
```json
{
  "insight": "Most users drop off at the pricing page — 40% leave without proceeding to signup.",
  "suggestion": "Consider adding a free trial option or simplifying the pricing layout to reduce friction.",
  "confidence": 0.85,
  "generated_at": "2026-05-11T12:00:00Z"
}
```

---

## Analytics Logic

### Daily Active Users
Counts distinct users who triggered at least one event on a given date:
```sql
SELECT COUNT(DISTINCT user_id)
FROM events
WHERE company_id = :id
AND DATE(timestamp) = TODAY
```

### Top Pages
Groups events by page, counts visits, sorts descending:
```sql
SELECT page, COUNT(*) as visits
FROM events
WHERE company_id = :id
GROUP BY page
ORDER BY visits DESC
LIMIT 10
```

### Funnel Drop-off
Defined funnel steps: `page_view → pricing_view → signup → purchase`

For each step, counts unique users who reached it:
```
Step 1: page_view    → 500 users  (0% drop)
Step 2: pricing_view → 300 users  (40% drop from step 1)
Step 3: signup       → 180 users  (40% drop from step 2)
Step 4: purchase     → 80 users   (55% drop from step 3)

drop_off % = (prev_step - current_step) / prev_step * 100
```

### Caching Strategy
Analytics results are cached in Redis with a 5-minute TTL. The Celery analytics worker refreshes the cache proactively every 5 minutes, so dashboards always show fresh data without hitting PostgreSQL on every request.

---

## AI Insight Generation

The system sends a structured analytics summary to Gemini and requests a JSON response:

```
Input → { total_users, total_events, active_users_today, top_pages, funnel_data }

Prompt → "Analyze this SaaS product data. Return insight, suggestion, confidence as JSON."

Output → { insight: "...", suggestion: "...", confidence: 0.85 }
```

Insights are cached in Redis for 1 hour to avoid unnecessary API calls. Every generated insight is also saved to PostgreSQL for historical reference.

---

## Background Workers

### event_worker — runs every 30 seconds
1. Scans Redis for all `event_queue:*` keys
2. Pops up to 100 events per company queue
3. Parses JSON event data
4. Bulk inserts into PostgreSQL (single transaction per batch)
5. On DB failure: pushes events back to queue

### analytics_worker — runs every 5 minutes
1. Fetches all companies from DB
2. Runs aggregation queries for each company
3. Saves/updates today's record in `analytics_daily` table
4. Refreshes Redis cache for each company

### cleanup_worker — runs at midnight
1. Finds empty event queues in Redis
2. Deletes them to free memory

---

## Multi-Tenancy Design

Every database table includes a `company_id` foreign key. Every query filters by `company_id`. The API key authentication ensures a company can only access its own data.

```
Request → API Key → Company → company_id → All queries filtered by company_id
```

Companies are completely isolated:
- Company A cannot read Company B's events
- Company A's analytics never include Company B's users
- Company A's AI insights are generated from Company A's data only
