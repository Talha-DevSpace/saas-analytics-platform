import axios from 'axios'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'


// ── Token helpers ──────────────────────────────────────────

export function saveToken(token) {
  localStorage.setItem('access_token', token)
}

export function getToken() {
  return localStorage.getItem('access_token')
}

export function saveCompanyData(data) {
  localStorage.setItem('company_data', JSON.stringify(data))
}

export function getCompanyData() {
  const d = localStorage.getItem('company_data')
  return d ? JSON.parse(d) : null
}

export function clearSession() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('company_data')
}


// ── Authenticated client ────────────────────────────────────

function getAuthClient() {
  const token = getToken()
  return axios.create({
    baseURL: BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  })
}


function getClient(apiKey) {
  return axios.create({
    baseURL: BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
  })
}


// ── Auth API calls ──────────────────────────────────────────

export async function registerCompany(name, email, password) {
  const res = await axios.post(`${BASE_URL}/api/companies/register`, {
    name, email, password,
  })
  return res.data
}

export async function loginCompany(email, password) {
  const res = await axios.post(`${BASE_URL}/api/companies/login`, {
    email, password,
  })
  return res.data
}

export async function getMe() {
  const client = getAuthClient()
  const res = await client.get('/api/companies/me')
  return res.data
}


// ── Analytics ───────────────────────────────────────────────

export async function getAnalyticsOverview() {
  const client = getAuthClient()
  const res = await client.get('/api/analytics/overview')
  return res.data
}

export async function getFunnelData() {
  const client = getAuthClient()
  const res = await client.get('/api/analytics/funnel')
  return res.data
}


// ── Events ──────────────────────────────────────────────────

export async function processQueue(apiKey) {
  const client = getClient(apiKey)
  const res = await client.post('/api/events/process-queue-direct')
  return res.data
}


// ── Insights ────────────────────────────────────────────────

export async function getInsights() {
  const client = getAuthClient()
  const res = await client.get('/api/insights/generate')
  return res.data
}

export async function getInsightHistory() {
  const client = getAuthClient()
  const res = await client.get('/api/insights/history')
  return res.data
}