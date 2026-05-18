'use client'

import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Cell
} from 'recharts'

function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null
    const h = parseInt(label)
    const time = h === 0 ? '12:00 AM'
        : h < 12 ? `${h}:00 AM`
            : h === 12 ? '12:00 PM'
                : `${h - 12}:00 PM`

    return (
        <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-accent)',
            borderRadius: '8px', padding: '8px 12px',
        }}>
            <p style={{
                color: 'var(--text-secondary)',
                fontSize: '11px', marginBottom: '2px'
            }}>
                {time}
            </p>
            <p style={{
                color: 'var(--accent-cyan)',
                fontWeight: 700, fontFamily: 'monospace'
            }}>
                {payload[0].value} visits
            </p>
        </div>
    )
}

export default function PeakHoursChart({ data = [] }) {
    const hasData = data.some(d => d.count > 0)
    const maxCount = Math.max(...data.map(d => d.count), 1)

    // Find the peak hour for the label
    const peakHour = data.reduce(
        (max, d) => (d.count > max.count ? d : max),
        { hour: 0, count: 0 }
    )

    function formatHour(h) {
        if (h === 0) return '12a'
        if (h === 12) return '12p'
        return h < 12 ? `${h}a` : `${h - 12}p`
    }

    function peakLabel(h) {
        if (h === 0) return '12:00 AM'
        if (h < 12) return `${h}:00 AM`
        if (h === 12) return '12:00 PM'
        return `${h - 12}:00 PM`
    }

    return (
        <div className="card" style={{ height: '100%' }}>
            <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'flex-start', marginBottom: '16px'
            }}>
                <h3 style={{
                    fontSize: '13px', color: 'var(--text-secondary)',
                    letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 500
                }}>
                    🕐 Peak Hours
                </h3>
                {hasData && (
                    <div style={{ textAlign: 'right' }}>
                        <div style={{
                            fontSize: '13px', fontWeight: 700,
                            color: 'var(--accent-cyan)', fontFamily: 'monospace'
                        }}>
                            {peakLabel(peakHour.hour)}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            peak time
                        </div>
                    </div>
                )}
            </div>

            {!hasData ? (
                <div style={{
                    height: '150px', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    color: 'var(--text-muted)', fontSize: '12px'
                }}>
                    No traffic data yet.
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={data}
                        margin={{ top: 4, right: 4, left: -30, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3"
                            stroke="var(--border)" vertical={false} />
                        <XAxis
                            dataKey="hour"
                            tickFormatter={formatHour}
                            tick={{ fill: 'var(--text-muted)', fontSize: 9 }}
                            axisLine={false} tickLine={false}
                            interval={3}
                        />
                        <YAxis
                            tick={{ fill: 'var(--text-muted)', fontSize: 9 }}
                            axisLine={false} tickLine={false}
                            allowDecimals={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={18}>
                            {data.map((entry) => (
                                <Cell key={entry.hour}
                                    fill={
                                        entry.count === maxCount && entry.count > 0
                                            ? 'var(--accent-cyan)'
                                            : entry.count === 0
                                                ? 'var(--border)'
                                                : 'var(--text-muted)'
                                    }
                                    opacity={entry.count === 0 ? 0.3 : 1}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            )}
        </div>
    )
}