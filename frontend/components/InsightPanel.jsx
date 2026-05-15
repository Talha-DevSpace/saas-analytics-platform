'use client'

import { useState } from 'react'
import { getInsights } from '@/lib/api'

export default function InsightPanel({ initialData, onRefresh }) {
  const [insight, setInsight] = useState(initialData)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  function getConfidenceColor(score) {
    if (score >= 0.8) return 'var(--accent-green)'
    if (score >= 0.5) return 'var(--accent-yellow)'
    return 'var(--accent-red)'
  }

  async function handleRefresh() {
    setLoading(true)
    setError('')
    try {
      const data = await getInsights()   // no apiKey needed
      setInsight(data)
      if (onRefresh) onRefresh()
    } catch {
      setError('Failed to generate insight. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card card-accent">

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)',
          letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 500 }}>
          🤖 AI Insights
        </h3>
        <button onClick={handleRefresh} disabled={loading} style={{
          padding: '6px 14px', background: 'transparent',
          border: '1px solid var(--border-accent)', borderRadius: '6px',
          color: 'var(--accent-cyan)', fontSize: '12px',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.5 : 1,
        }}>
          {loading ? 'Generating...' : '↻ Refresh'}
        </button>
      </div>

      {error && (
        <p style={{ color: 'var(--accent-red)', fontSize: '13px',
          marginBottom: '12px' }}>
          {error}
        </p>
      )}

      {!insight ? (
        <div style={{ textAlign: 'center', padding: '32px 0',
          color: 'var(--text-muted)' }}>
          <p style={{ marginBottom: '12px' }}>No insights yet.</p>
          <button onClick={handleRefresh} style={{
            padding: '10px 24px', background: 'var(--accent-cyan)',
            color: '#000', border: 'none', borderRadius: '8px',
            fontWeight: 700, cursor: 'pointer', fontSize: '13px',
          }}>
            Generate First Insight
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px',
            padding: '16px', borderLeft: '3px solid var(--accent-cyan)' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)',
              marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Insight
            </p>
            <p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.6 }}>
              {insight.insight}
            </p>
          </div>

          <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px',
            padding: '16px', borderLeft: '3px solid var(--accent-green)' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)',
              marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              💡 Suggestion
            </p>
            <p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.6 }}>
              {insight.suggestion}
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between',
            alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Confidence:
              </span>
              <span style={{ fontSize: '13px', fontWeight: 700,
                fontFamily: 'monospace',
                color: getConfidenceColor(insight.confidence) }}>
                {Math.round((insight.confidence || 0) * 100)}%
              </span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {insight.generated_at
                ? new Date(insight.generated_at).toLocaleString() : ''}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}