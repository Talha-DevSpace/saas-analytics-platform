'use client'

import { PieChart, Pie, Cell, Tooltip,
  ResponsiveContainer, Legend } from 'recharts'

// Clean up raw values before displaying
function cleanLabel(str) {
  if (!str) return 'Unknown'
  if (str === 'other') return 'Other'
  return str.charAt(0).toUpperCase() + str.slice(1)
}

const DEVICE_COLORS  = ['#06b6d4', '#10b981', '#f59e0b', '#818cf8']
const BROWSER_COLORS = ['#06b6d4', '#10b981', '#818cf8', '#f59e0b', '#ef4444']

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-accent)',
      borderRadius: '8px', padding: '8px 12px',
    }}>
      <p style={{ color: 'var(--text-secondary)',
        fontSize: '12px', marginBottom: '2px' }}>
        {cleanLabel(payload[0].name)}
      </p>
      <p style={{ color: 'var(--accent-cyan)',
        fontWeight: 700, fontFamily: 'monospace', fontSize: '13px' }}>
        {payload[0].value} visits
      </p>
    </div>
  )
}

function MiniPie({ data, colors, title }) {
  // Filter out test/invalid browser values
  const INVALID = ['dashboard', 'test', '']
  const clean   = data.filter(d => !INVALID.includes((d.name || '').toLowerCase()))

  if (clean.length === 0) {
    return (
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '10px', color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '1px',
          marginBottom: '8px' }}>
          {title}
        </p>
        <div style={{ height: '130px', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-muted)', fontSize: '12px' }}>
          No data
        </div>
      </div>
    )
  }

  return (
    <div>
      <p style={{ fontSize: '10px', color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '1px',
        marginBottom: '8px', textAlign: 'center' }}>
        {title}
      </p>
      <ResponsiveContainer width="100%" height={150}>
        <PieChart>
          <Pie data={clean} cx="50%" cy="50%"
            innerRadius={35} outerRadius={55}
            dataKey="value" paddingAngle={3}>
            {clean.map((entry, i) => (
              <Cell key={entry.name}
                fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconSize={8}
            formatter={(v) => (
              <span style={{ color: 'var(--text-secondary)',
                fontSize: '10px' }}>
                {cleanLabel(v)}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function DeviceChart({ devices = [], browsers = [] }) {
  const deviceData  = devices.map(d => ({ name: d.device,  value: d.count }))
  const browserData = browsers.map(b => ({ name: b.browser, value: b.count }))

  const hasData = deviceData.length > 0 || browserData.length > 0

  return (
    <div className="card" style={{ height: '100%' }}>
      <h3 style={{ fontSize: '13px', color: 'var(--text-secondary)',
        letterSpacing: '1px', textTransform: 'uppercase',
        marginBottom: '16px', fontWeight: 500 }}>
        📱 Devices & Browsers
      </h3>

      {!hasData ? (
        <div style={{ textAlign: 'center', padding: '40px 0',
          color: 'var(--text-muted)', fontSize: '12px' }}>
          No device data yet.
          <br />Install the tracker on your website.
        </div>
      ) : (
        <div style={{ display: 'grid',
          gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <MiniPie data={deviceData}
            colors={DEVICE_COLORS}  title="By Device" />
          <MiniPie data={browserData}
            colors={BROWSER_COLORS} title="By Browser" />
        </div>
      )}
    </div>
  )
}