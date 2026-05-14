// A single metric card — shows one number with a label and icon

export default function StatsCard({ title, value, icon, color, subtitle }) {
  return (
    <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>

      {/* Subtle glow in the corner matching the card's accent color */}
      <div style={{
        position: 'absolute',
        top: '-20px',
        right: '-20px',
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        background: color || 'var(--accent-cyan)',
        opacity: 0.08,
        filter: 'blur(20px)',
      }} />

      {/* Icon + Title row */}
      <div style={{ display: 'flex', alignItems: 'center',
        gap: '10px', marginBottom: '16px' }}>
        <span style={{ fontSize: '20px' }}>{icon}</span>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)',
          letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 500 }}>
          {title}
        </span>
      </div>

      {/* Main value */}
      <div style={{
        fontSize: '36px',
        fontWeight: 700,
        color: color || 'var(--text-primary)',
        fontFamily: 'monospace',
        lineHeight: 1,
        marginBottom: '8px',
      }}>
        {/* Format large numbers with commas: 1000 → 1,000 */}
        {typeof value === 'number' ? value.toLocaleString() : value ?? '—'}
      </div>

      {/* Optional subtitle */}
      {subtitle && (
        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {subtitle}
        </p>
      )}
    </div>
  )
}