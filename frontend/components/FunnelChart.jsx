'use client'

export default function FunnelChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center',
        padding: '48px', color: 'var(--text-muted)' }}>
        No funnel data yet.
      </div>
    )
  }

  // Find the max users to calculate bar widths as percentages
  const maxUsers = Math.max(...data.map((d) => d.users), 1)

  // Colors for each funnel step
  const stepColors = [
    'var(--accent-cyan)',
    '#818cf8',
    'var(--accent-green)',
    'var(--accent-yellow)',
  ]

  return (
    <div className="card">
      <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)',
        letterSpacing: '1px', textTransform: 'uppercase',
        marginBottom: '24px', fontWeight: 500 }}>
        🔻 Conversion Funnel
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {data.map((step, index) => {
          // Bar width = (this step's users / max users) * 100%
          const widthPercent = maxUsers > 0
            ? (step.users / maxUsers) * 100
            : 0

          const color = stepColors[index % stepColors.length]

          return (
            <div key={step.step}>

              {/* Step label + user count row */}
              <div style={{ display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: '6px' }}>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Step number bubble */}
                  <span style={{
                    width: '20px', height: '20px', borderRadius: '50%',
                    background: color, opacity: 0.8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: 700, color: '#000',
                    flexShrink: 0,
                  }}>
                    {index + 1}
                  </span>

                  {/* Step name — capitalize and replace underscores */}
                  <span style={{ fontSize: '13px', color: 'var(--text-primary)',
                    textTransform: 'capitalize' }}>
                    {step.step.replace(/_/g, ' ')}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Drop-off badge (only show if > 0) */}
                  {step.drop_off_percent > 0 && (
                    <span style={{
                      fontSize: '11px',
                      color: 'var(--accent-red)',
                      background: 'rgba(239,68,68,0.1)',
                      padding: '2px 8px',
                      borderRadius: '99px',
                    }}>
                      ↓ {step.drop_off_percent}% drop
                    </span>
                  )}

                  {/* User count */}
                  <span style={{ fontSize: '14px', fontWeight: 700,
                    fontFamily: 'monospace', color: color }}>
                    {step.users.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{
                height: '6px',
                background: 'var(--bg-secondary)',
                borderRadius: '3px',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${widthPercent}%`,
                  background: color,
                  borderRadius: '3px',
                  transition: 'width 0.6s ease',
                }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}