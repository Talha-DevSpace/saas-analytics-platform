'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'

// Custom tooltip that matches our dark theme
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-accent)',
      borderRadius: '8px',
      padding: '10px 14px',
    }}>
      <p style={{ color: 'var(--text-secondary)', fontSize: '12px',
        marginBottom: '4px' }}>
        {label}
      </p>
      <p style={{ color: 'var(--accent-cyan)', fontWeight: 700,
        fontFamily: 'monospace' }}>
        {payload[0].value} events
      </p>
    </div>
  )
}

export default function EventChart({ data }) {
  // If no data passed, show a placeholder message
  if (!data || data.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center',
        padding: '48px', color: 'var(--text-muted)' }}>
        No event data yet. Start tracking events to see the chart.
      </div>
    )
  }

  return (
    <div className="card">
      <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)',
        letterSpacing: '1px', textTransform: 'uppercase',
        marginBottom: '24px', fontWeight: 500 }}>
        📈 Events Over Time
      </h3>

      {/*
        ResponsiveContainer makes the chart fill its parent's width.
        height={220} fixes the chart height.
      */}
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>

          {/* Grid lines */}
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            vertical={false}
          />

          {/* X axis — dates */}
          <XAxis
            dataKey="date"
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />

          {/* Y axis — event counts */}
          <YAxis
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* The actual line */}
          <Line
            type="monotone"
            dataKey="events"
            stroke="var(--accent-cyan)"
            strokeWidth={2}
            dot={{ fill: 'var(--accent-cyan)', r: 4, strokeWidth: 0 }}
            activeDot={{ r: 6, fill: 'var(--accent-cyan)' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}