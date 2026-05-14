'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getAnalyticsOverview, getInsights, processQueue } from '@/lib/api'
import StatsCard from '@/components/StatsCard'
import EventChart from '@/components/EventChart'
import FunnelChart from '@/components/FunnelChart'
import TopPages from '@/components/TopPages'
import InsightPanel from '@/components/InsightPanel'

export default function DashboardPage() {
  const router = useRouter()

  const [apiKey, setApiKey]       = useState('')
  const [analytics, setAnalytics] = useState(null)
  const [insight, setInsight]     = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [lastRefresh, setLastRefresh] = useState(null)

  // useCallback memoizes the function so it doesn't re-create
  // on every render — important since we use it in useEffect
  const fetchData = useCallback(async (key) => {
    setLoading(true)
    setError('')
    try {
      // Run both requests in parallel with Promise.all
      // Instead of: fetch analytics (wait) → fetch insights (wait) = slow
      // We do:       fetch analytics + fetch insights at same time = fast
      const [analyticsData, insightData] = await Promise.all([
        getAnalyticsOverview(key),
        getInsights(key),
      ])

      setAnalytics(analyticsData)
      setInsight(insightData)
      setLastRefresh(new Date())

    } catch (err) {
      if (err.response?.status === 401) {
        // Invalid API key — send back to login
        localStorage.removeItem('api_key')
        router.push('/')
      } else {
        setError('Failed to load dashboard data.')
      }
    } finally {
      setLoading(false)
    }
  }, [router])

  // On first load — read API key from localStorage
  useEffect(() => {
    const key = localStorage.getItem('api_key')
    if (!key) {
      router.push('/')
      return
    }
    setApiKey(key)
    fetchData(key)
  }, [fetchData, router])

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!apiKey) return
    const interval = setInterval(() => fetchData(apiKey), 60000)
    return () => clearInterval(interval)  // Cleanup on unmount
  }, [apiKey, fetchData])

  function handleLogout() {
    localStorage.removeItem('api_key')
    router.push('/')
  }

  async function handleProcessQueue() {
    try {
      const result = await processQueue(apiKey)
      alert(`Processed: ${result.processed} events`)
      fetchData(apiKey)
    } catch {
      alert('Queue processing failed')
    }
  }

  // ── Loading screen ──
  if (loading && !analytics) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '16px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%',
          border: '3px solid var(--border)',
          borderTopColor: 'var(--accent-cyan)',
          animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
          Loading dashboard...
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>

      {/* ── Top Navigation Bar ── */}
      <nav style={{
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        padding: '0 24px',
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>

        {/* Left — Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="pulse-dot" />
          <span style={{ fontWeight: 700, fontSize: '15px',
            color: 'var(--text-primary)' }}>
            SaaS Analytics
          </span>
        </div>

        {/* Right — Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

          {lastRefresh && (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
          )}

          <button
            onClick={() => fetchData(apiKey)}
            disabled={loading}
            style={{
              padding: '6px 14px',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--text-secondary)',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            {loading ? '...' : '↻ Refresh'}
          </button>

          <button
            onClick={handleProcessQueue}
            style={{
              padding: '6px 14px',
              background: 'transparent',
              border: '1px solid var(--border-accent)',
              borderRadius: '6px',
              color: 'var(--accent-cyan)',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            ⚡ Process Queue
          </button>

          <button
            onClick={handleLogout}
            style={{
              padding: '6px 14px',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--text-muted)',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </div>
      </nav>

      {/* ── Main Content ── */}
      <main style={{ maxWidth: '1200px', margin: '0 auto',
        padding: '32px 24px' }}>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid var(--accent-red)',
            borderRadius: '8px',
            padding: '12px 16px',
            color: 'var(--accent-red)',
            marginBottom: '24px',
            fontSize: '14px',
          }}>
            {error}
          </div>
        )}

        {/* ── Row 1: Stats Cards ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}>
          <div className="animate-in" style={{ animationDelay: '0ms' }}>
            <StatsCard
              title="Total Users"
              value={analytics?.total_users}
              icon="👥"
              color="var(--accent-cyan)"
              subtitle="All time"
            />
          </div>
          <div className="animate-in" style={{ animationDelay: '80ms' }}>
            <StatsCard
              title="Total Events"
              value={analytics?.total_events}
              icon="⚡"
              color="#818cf8"
              subtitle="All time"
            />
          </div>
          <div className="animate-in" style={{ animationDelay: '160ms' }}>
            <StatsCard
              title="Active Today"
              value={analytics?.active_users_today}
              icon="🔥"
              color="var(--accent-green)"
              subtitle="Unique users today"
            />
          </div>
          <div className="animate-in" style={{ animationDelay: '240ms' }}>
            <StatsCard
              title="Top Page"
              value={analytics?.top_pages?.[0]?.page ?? '—'}
              icon="🌐"
              color="var(--accent-yellow)"
              subtitle={
                analytics?.top_pages?.[0]
                  ? `${analytics.top_pages[0].visits} visits`
                  : 'No data yet'
              }
            />
          </div>
        </div>

        {/* ── Row 2: Event Chart ── */}
        <div className="animate-in" style={{
          marginBottom: '24px', animationDelay: '300ms' }}>
          <EventChart data={analytics?.events_over_time ?? []} />
        </div>

        {/* ── Row 3: Funnel + Top Pages side by side ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}>
          <div className="animate-in" style={{ animationDelay: '360ms' }}>
            <FunnelChart data={analytics?.funnel_data ?? []} />
          </div>
          <div className="animate-in" style={{ animationDelay: '420ms' }}>
            <TopPages data={analytics?.top_pages ?? []} />
          </div>
        </div>

        {/* ── Row 4: AI Insight Panel ── */}
        <div className="animate-in" style={{ animationDelay: '480ms' }}>
          <InsightPanel apiKey={apiKey} initialData={insight} />
        </div>
      </main>
    </div>
  )
}