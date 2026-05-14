'use client'

export default function TopPages({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center',
        padding: '48px', color: 'var(--text-muted)' }}>
        No page data yet.
      </div>
    )
  }

  const maxVisits = Math.max(...data.map((d) => d.visits), 1)

  return (
    <div className="card">
      <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)',
        letterSpacing: '1px', textTransform: 'uppercase',
        marginBottom: '24px', fontWeight: 500 }}>
        🌐 Top Pages
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {data.map((page, index) => {
          const barWidth = (page.visits / maxVisits) * 100

          return (
            <div key={page.page} style={{ display: 'flex',
              alignItems: 'center', gap: '12px' }}>

              {/* Rank number */}
              <span style={{ fontSize: '12px', color: 'var(--text-muted)',
                fontFamily: 'monospace', width: '20px', flexShrink: 0 }}>
                {String(index + 1).padStart(2, '0')}
              </span>

              {/* Page path + bar */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between',
                  marginBottom: '4px' }}>
                  {/* Truncate long paths */}
                  <span style={{ fontSize: '13px', color: 'var(--text-primary)',
                    fontFamily: 'monospace', overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    maxWidth: '200px' }}>
                    {page.page}
                  </span>
                  <span style={{ fontSize: '13px', color: 'var(--accent-cyan)',
                    fontFamily: 'monospace', fontWeight: 700, flexShrink: 0,
                    marginLeft: '8px' }}>
                    {page.visits.toLocaleString()}
                  </span>
                </div>

                {/* Thin bar */}
                <div style={{ height: '3px', background: 'var(--bg-secondary)',
                  borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${barWidth}%`,
                    background: index === 0
                      ? 'var(--accent-cyan)'
                      : 'var(--text-muted)',
                    borderRadius: '2px',
                  }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}