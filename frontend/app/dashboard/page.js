'use client'


import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

import {
  getRealtimeVisitors, getEngagementStats, getLiveEvents,
  getAnalyticsOverview, getInsights, getDetailedAnalytics,
  processQueue, clearSession, getCompanyData
} from '@/lib/api'

import StatsCard from '@/components/StatsCard'
import EventChart from '@/components/EventChart'
import FunnelChart from '@/components/FunnelChart'
import TopPages from '@/components/TopPages'
import InsightPanel from '@/components/InsightPanel'
import SnippetPanel from '@/components/SnippetPanel'
import DeviceChart from '@/components/DeviceChart'
import ReferrerTable from '@/components/ReferrerTable'
import SessionStats from '@/components/SessionStats'
import LiveFeed from '@/components/LiveFeed'
import PeakHoursChart from '@/components/PeakHoursChart'


export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('analytics')
  const router = useRouter()
  const [company, setCompany] = useState(null)   // { company_name, api_key }
  const [analytics, setAnalytics] = useState(null)
  const [insight, setInsight] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastRefresh, setLastRefresh] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [detailed, setDetailed] = useState(null)
  const [engagement, setEngagement] = useState(null)
  const [realtimeCount, setRealtimeCount] = useState(0)


  // ── Fetch all dashboard data ──────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [analyticsData, insightData, detailedData, engagementData] =
        await Promise.all([
          getAnalyticsOverview(),
          getInsights(),
          getDetailedAnalytics(),
          getEngagementStats(),
        ])
      setAnalytics(analyticsData)
      setInsight(insightData)
      setDetailed(detailedData)
      setEngagement(engagementData)
      setLastRefresh(new Date())
    } catch (err) {
      if (err.response?.status === 401) {
        clearSession()
        router.push('/')
      } else {
        setError('Failed to load dashboard data.')
      }
    } finally {
      setLoading(false)
    }
  }, [router])

  // ── On mount: check token, load company info ──────────
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/')
      return
    }
    const companyData = getCompanyData()
    setCompany(companyData)
    fetchData()
  }, [fetchData, router])

  // ── Auto-refresh every 60 seconds ────────────────────
  useEffect(() => {
    const interval = setInterval(() => fetchData(), 60000)
    return () => clearInterval(interval)
  }, [fetchData])


  // Poll real-time visitor count every 30 seconds
  useEffect(() => {
    async function fetchRealtime() {
      try {
        const data = await getRealtimeVisitors()
        setRealtimeCount(data.active_visitors)
      } catch {
        // silent fail
      }
    }
    fetchRealtime()
    const interval = setInterval(fetchRealtime, 30000)
    return () => clearInterval(interval)
  }, [])

  // ── Logout ────────────────────────────────────────────
  function handleLogout() {
    clearSession()
    router.push('/')
  }

  // ── Process queue ─────────────────────────────────────
  async function handleProcessQueue() {
    setProcessing(true)
    try {
      const result = await processQueue(company.api_key)
      alert(`✅ Processed: ${result.processed} events`)
      fetchData()
    } catch {
      alert('Queue processing failed')
    } finally {
      setProcessing(false)
    }
  }

  // ── Loading screen ────────────────────────────────────
  if (loading && !analytics) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexDirection: 'column', gap: '16px',
        background: 'var(--bg-primary)'
      }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%',
          border: '3px solid var(--border)',
          borderTopColor: 'var(--accent-cyan)',
          animation: 'spin 0.8s linear infinite'
        }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
          Loading dashboard...
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>

      {/* ── Navbar ── */}
      <nav style={{
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        padding: '0 24px', height: '56px',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100,
      }}>

        {/* Left */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="pulse-dot" />
          <span style={{
            fontWeight: 700, fontSize: '15px',
            color: 'var(--text-primary)'
          }}>
            SaaS Analytics
          </span>
          {company?.company_name && (
            <span style={{
              fontSize: '12px', color: 'var(--text-muted)',
              background: 'var(--bg-card)', padding: '3px 10px',
              borderRadius: '99px', border: '1px solid var(--border)'
            }}>
              {company.company_name}
            </span>
          )}
        </div>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {lastRefresh && (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
          )}

          <button onClick={() => fetchData()} disabled={loading}
            style={{
              padding: '6px 12px', background: 'transparent',
              border: '1px solid var(--border)', borderRadius: '6px',
              color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer',
            }}>
            {loading ? '...' : '↻ Refresh'}
          </button>

          <button
            onClick={() => {
              const token = localStorage.getItem('access_token')
              const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
              window.open(`${base}/api/analytics/export?token=${token}`, '_blank')
            }}
            style={{
              padding: '6px 12px', background: 'transparent',
              border: '1px solid var(--border)', borderRadius: '6px',
              color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer',
            }}>
            ⬇ Export CSV
          </button>

          <button onClick={handleProcessQueue} disabled={processing}
            style={{
              padding: '6px 12px', background: 'transparent',
              border: '1px solid var(--border-accent)', borderRadius: '6px',
              color: 'var(--accent-cyan)', fontSize: '12px', cursor: 'pointer',
            }}>
            {processing ? 'Processing...' : '⚡ Process Queue'}
          </button>

          <button onClick={handleLogout}
            style={{
              padding: '6px 12px', background: 'transparent',
              border: '1px solid var(--border)', borderRadius: '6px',
              color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer',
            }}>
            Logout
          </button>
        </div>
      </nav>

      {/* ── Main Content ── */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>

        {/* Error banner */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid var(--accent-red)',
            borderRadius: '8px', padding: '12px 16px', color: 'var(--accent-red)',
            marginBottom: '24px', fontSize: '14px',
          }}>
            {error}
          </div>
        )}

        {/* API key reminder bar */}
        {company?.api_key && (
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: '8px', padding: '10px 16px', marginBottom: '24px',
            display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
          }}>
            <span style={{
              fontSize: '11px', color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '1px', flexShrink: 0
            }}>
              Event Tracking Key
            </span>
            <span style={{
              fontFamily: 'monospace', fontSize: '12px',
              color: 'var(--accent-cyan)', flex: 1, wordBreak: 'break-all'
            }}>
              {company.api_key}
            </span>
            <button
              onClick={() => navigator.clipboard.writeText(company.api_key)}
              style={{
                padding: '4px 10px', background: 'transparent',
                border: '1px solid var(--border)', borderRadius: '6px',
                color: 'var(--text-muted)', fontSize: '11px', cursor: 'pointer',
                flexShrink: 0,
              }}>
              Copy
            </button>
          </div>
        )}

        {/* ── Tab Bar ── */}
        <div style={{
          display: 'flex', gap: '4px', marginBottom: '28px',
          borderBottom: '1px solid var(--border)', paddingBottom: '0',
        }}>
          {[
            { key: 'analytics', label: 'Analytics' },
            { key: 'tracker', label: 'Install Tracker' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setActiveTab(key)} style={{
              padding: '10px 20px', background: 'none', border: 'none',
              cursor: 'pointer', fontSize: '13px', fontWeight: 600,
              color: activeTab === key ? 'var(--accent-cyan)' : 'var(--text-muted)',
              borderBottom: activeTab === key
                ? '2px solid var(--accent-cyan)' : '2px solid transparent',
              marginBottom: '-1px', transition: 'all 0.2s',
            }}>
              {label}
            </button>
          ))}
        </div>


        {/* ── Analytics Tab ── */}
        {activeTab === 'analytics' && (
          <>

            {/* ── Row 1: Stats ── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '16px', marginBottom: '24px',
            }}>
              <StatsCard title="Total Users" value={analytics?.total_users}
                icon="👥" color="var(--accent-cyan)" subtitle="All time" />

              <StatsCard title="Total Events" value={analytics?.total_events}
                icon="⚡" color="#818cf8" subtitle="All time" />

              <StatsCard title="Active Today" value={analytics?.active_users_today}
                icon="🔥" color="var(--accent-green)" subtitle="Unique users today" />

              <StatsCard title="Live Now" value={realtimeCount}
                icon="🟢" color="var(--accent-green)"
                subtitle="Active in last 5 min" />

              <StatsCard title="Bounce Rate"
                value={engagement?.bounce_rate != null
                  ? `${engagement.bounce_rate}%` : '—'}
                icon="↩" color="var(--accent-yellow)"
                subtitle={
                  engagement?.avg_session_duration
                    ? `Avg ${engagement.avg_session_duration}s/session`
                    : 'No session data yet'
                }
              />
            </div>

            {/* ── Row 2: Event Chart ── */}
            <div className="animate-in" style={{ marginBottom: '24px', animationDelay: '300ms' }}>
              <EventChart data={analytics?.events_over_time ?? []} />
            </div>

            {/* ── Row 3: Funnel + Top Pages ── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '16px', marginBottom: '24px',
            }}>
              <div className="animate-in" style={{ animationDelay: '360ms' }}>
                <FunnelChart data={analytics?.funnel_data ?? []} />
              </div>
              <div className="animate-in" style={{ animationDelay: '420ms' }}>
                <TopPages data={analytics?.top_pages ?? []} />
              </div>
            </div>

            {/* ── Row 4: Sessions + Devices + Referrers ── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px', marginBottom: '24px',
              alignItems: 'stretch',
            }}>
              <div className="animate-in" style={{ animationDelay: '460ms', display: 'flex', flexDirection: 'column', height: '100%' }}>
                <SessionStats
                  sessions={detailed?.sessions ?? {}}
                  eventBreakdown={detailed?.event_breakdown ?? []}
                />
              </div>
              <div className="animate-in" style={{ animationDelay: '500ms', display: 'flex', flexDirection: 'column', height: '100%' }}>
                <DeviceChart
                  devices={detailed?.devices ?? []}
                  browsers={detailed?.browsers ?? []}
                />
              </div>
              <div className="animate-in" style={{ animationDelay: '540ms', display: 'flex', flexDirection: 'column', height: '100%' }}>
                <ReferrerTable
                  referrers={detailed?.referrers ?? []}
                  utmCampaigns={detailed?.utm_campaigns ?? []}
                />
              </div>
            </div>

            {/* ── Row 5: Peak Hours + Live Feed ── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '5fr 7fr',
              gap: '16px',
              marginBottom: '24px',
            }}>
              <div className="animate-in" style={{ animationDelay: '560ms' }}>
                <PeakHoursChart data={engagement?.peak_hours ?? []} />
              </div>
              <div className="animate-in" style={{ animationDelay: '600ms' }}>
                <LiveFeed />
              </div>
            </div>

            {/* ── Row 5: AI Insight ── */}
            <div className="animate-in" style={{ animationDelay: '480ms' }}>
              <InsightPanel initialData={insight} onRefresh={fetchData} />
            </div>

          </>
        )}

        {/* ── Tracker Tab ── */}
        {activeTab === 'tracker' && (
          <SnippetPanel />
        )}

      </main>
    </div>
  )
}