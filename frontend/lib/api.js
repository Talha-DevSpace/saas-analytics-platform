import axios from 'axios'

// Base URL comes from .env.local
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'


function getClient(apiKey) {
  return axios.create({
    baseURL: BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
  })
}

// ─────────────────────────────────────────────
// COMPANY
// ─────────────────────────────────────────────

/**
 * Registers a new company.
 * Returns { id, name, api_key, created_at }
 */
export async function registerCompany(name) {
  const response = await axios.post(`${BASE_URL}/api/companies/register`, {
    name,
  })
  return response.data
}

// ─────────────────────────────────────────────
// ANALYTICS
// ─────────────────────────────────────────────

/**
 * Fetches the full analytics overview for the dashboard.
 * Returns { total_users, total_events, active_users_today,
 *           top_pages, funnel_data, events_over_time }
 */
export async function getAnalyticsOverview(apiKey) {
  const client = getClient(apiKey)
  const response = await client.get('/api/analytics/overview')
  return response.data
}

/**
 * Fetches funnel data only.
 * Returns { funnel: [{ step, users, drop_off_percent }] }
 */
export async function getFunnelData(apiKey) {
  const client = getClient(apiKey)
  const response = await client.get('/api/analytics/funnel')
  return response.data
}

// ─────────────────────────────────────────────
// EVENTS
// ─────────────────────────────────────────────

/**
 * Sends a single event to the backend.
 */
export async function trackEvent(apiKey, eventData) {
  const client = getClient(apiKey)
  const response = await client.post('/api/events/track', eventData)
  return response.data
}

/**
 * Manually triggers queue processing.
 */
export async function processQueue(apiKey) {
  const client = getClient(apiKey)
  const response = await client.post('/api/events/process-queue-direct')
  return response.data
}

// ─────────────────────────────────────────────
// INSIGHTS
// ─────────────────────────────────────────────

/**
 * Generates or returns cached AI insights.
 * Returns { insight, suggestion, confidence, generated_at }
 */
export async function getInsights(apiKey) {
  const client = getClient(apiKey)
  const response = await client.get('/api/insights/generate')
  return response.data
}

/**
 * Returns past AI insights history.
 */
export async function getInsightHistory(apiKey) {
  const client = getClient(apiKey)
  const response = await client.get('/api/insights/history')
  return response.data
}