'use client'

const SOURCE_ICONS = {
  direct: '🔗',
  search: '🔍',
  social: '📱',
  email: '📧',
  video: '🎥',
  other: '🌐',
}

const SOURCE_COLORS = {
  direct: 'var(--accent-cyan)',
  search: 'var(--accent-green)',
  social: '#818cf8',
  email: 'var(--accent-yellow)',
  video: 'var(--accent-red)',
  other: 'var(--text-muted)',
}

export default function ReferrerTable({ referrers = [], utmCampaigns = [] }) {
  if (referrers.length === 0 && utmCampaigns.length === 0) {
    return (
      <div className="card" style={{
        textAlign: 'center',
        padding: '48px', color: 'var(--text-muted)'
      }}>
        No referrer data yet.
      </div>
    )
  }

  const maxCount = Math.max(...referrers.map(r => r.count), 1)

  return (
    <div className="card">
      <h3 style={{
        fontSize: '14px', color: 'var(--text-secondary)',
        letterSpacing: '1px', textTransform: 'uppercase',
        marginBottom: '20px', fontWeight: 500
      }}>
        🔀 Traffic Sources
      </h3>

      {/* Referrer sources */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: '10px',
        marginBottom: utmCampaigns.length > 0 ? '20px' : '0'
      }}>
        {referrers.map((ref) => {
          const color = SOURCE_COLORS[ref.source] || 'var(--text-muted)'
          const icon = SOURCE_ICONS[ref.source] || '🌐'
          const pct = Math.round((ref.count / maxCount) * 100)

          return (
            <div key={ref.source}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: '4px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '14px' }}>{icon}</span>
                  <span style={{
                    fontSize: '13px', color: 'var(--text-primary)',
                    textTransform: 'capitalize'
                  }}>
                    {ref.source}
                  </span>
                </div>
                <span style={{
                  fontSize: '13px', fontFamily: 'monospace',
                  fontWeight: 700, color
                }}>
                  {ref.count.toLocaleString()}
                </span>
              </div>
              <div style={{
                height: '4px', background: 'var(--bg-secondary)',
                borderRadius: '2px', overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%', width: `${pct}%`,
                  background: color, borderRadius: '2px',
                  transition: 'width 0.6s ease'
                }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* UTM Campaigns */}
      {utmCampaigns.length > 0 && (
        <>
          <p style={{
            fontSize: '11px', color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '1px',
            marginBottom: '10px'
          }}>
            UTM Campaigns
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {utmCampaigns.map((u, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', padding: '8px 12px',
                background: 'var(--bg-secondary)',
                borderRadius: '6px',
              }}>
                <div>
                  <span style={{
                    fontSize: '12px', color: 'var(--text-primary)',
                    fontWeight: 600
                  }}>
                    {u.campaign || '—'}
                  </span>
                  <span style={{
                    fontSize: '11px', color: 'var(--text-muted)',
                    marginLeft: '8px'
                  }}>
                    {u.source} / {u.medium}
                  </span>
                </div>
                <span style={{
                  fontSize: '12px', fontFamily: 'monospace',
                  color: 'var(--accent-cyan)', fontWeight: 700
                }}>
                  {u.visits}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}