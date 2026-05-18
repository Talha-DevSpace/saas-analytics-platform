'use client'

export default function SessionStats({ sessions = {}, eventBreakdown = [] }) {
    const total = sessions.total_sessions || 0
    const newV = sessions.new_visitors || 0
    const returning = sessions.returning_visitors || 0
    const totalV = newV + returning
    const newPct = totalV > 0 ? Math.round((newV / totalV) * 100) : 0
    const retPct = 100 - newPct

    const maxEvents = Math.max(...eventBreakdown.map(e => e.count), 1)

    return (
        <div className="card" style={{ height: '100%' }}>
            <h3 style={{
                fontSize: '13px', color: 'var(--text-secondary)',
                letterSpacing: '1px', textTransform: 'uppercase',
                marginBottom: '16px', fontWeight: 500
            }}>
                🔄 Sessions
            </h3>

            {/* Total sessions — big number */}
            <div style={{
                marginBottom: '16px',
                paddingBottom: '16px', borderBottom: '1px solid var(--border)'
            }}>
                <div style={{
                    fontSize: '32px', fontWeight: 700,
                    fontFamily: 'monospace', color: 'var(--accent-cyan)',
                    lineHeight: 1, marginBottom: '4px'
                }}>
                    {total.toLocaleString()}
                </div>
                <div style={{
                    fontSize: '11px', color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: '1px'
                }}>
                    Total Sessions
                </div>
            </div>

            {/* New vs Returning — only show if we have data */}
            {totalV > 0 ? (
                <div style={{
                    marginBottom: '16px',
                    paddingBottom: '16px', borderBottom: '1px solid var(--border)'
                }}>
                    <div style={{
                        display: 'flex', justifyContent: 'space-between',
                        marginBottom: '8px'
                    }}>
                        <div>
                            <span style={{
                                fontSize: '15px', fontWeight: 700,
                                color: 'var(--accent-green)', fontFamily: 'monospace'
                            }}>
                                {newPct}%
                            </span>
                            <span style={{
                                fontSize: '11px', color: 'var(--text-muted)',
                                marginLeft: '6px'
                            }}>
                                New
                            </span>
                        </div>
                        <div>
                            <span style={{
                                fontSize: '15px', fontWeight: 700,
                                color: '#818cf8', fontFamily: 'monospace'
                            }}>
                                {retPct}%
                            </span>
                            <span style={{
                                fontSize: '11px', color: 'var(--text-muted)',
                                marginLeft: '6px'
                            }}>
                                Returning
                            </span>
                        </div>
                    </div>
                    {/* Split bar */}
                    <div style={{
                        height: '6px', borderRadius: '3px',
                        overflow: 'hidden', display: 'flex',
                        background: 'var(--bg-secondary)'
                    }}>
                        <div style={{
                            width: `${newPct}%`,
                            background: 'var(--accent-green)',
                            transition: 'width 0.6s ease'
                        }} />
                        <div style={{ flex: 1, background: '#818cf8' }} />
                    </div>
                </div>
            ) : (
                <p style={{
                    fontSize: '12px', color: 'var(--text-muted)',
                    marginBottom: '16px', paddingBottom: '16px',
                    borderBottom: '1px solid var(--border)'
                }}>
                    No session data yet. Install the tracker to see visitor breakdown.
                </p>
            )}

            {/* Event type breakdown */}
            {eventBreakdown.length > 0 && (
                <div>
                    <p style={{
                        fontSize: '10px', color: 'var(--text-muted)',
                        textTransform: 'uppercase', letterSpacing: '1px',
                        marginBottom: '10px'
                    }}>
                        Event Types
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                        {eventBreakdown.slice(0, 5).map((e) => (
                            <div key={e.event} style={{
                                display: 'flex',
                                alignItems: 'center', gap: '8px'
                            }}>
                                <span style={{
                                    fontSize: '11px', color: 'var(--text-muted)',
                                    fontFamily: 'monospace', width: '90px',
                                    flexShrink: 0, textTransform: 'capitalize',
                                    overflow: 'hidden', textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {e.event.replace(/_/g, ' ')}
                                </span>
                                <div style={{
                                    flex: 1, height: '4px',
                                    background: 'var(--bg-secondary)', borderRadius: '2px'
                                }}>
                                    <div style={{
                                        height: '100%', borderRadius: '2px',
                                        background: 'var(--accent-cyan)',
                                        width: `${Math.round((e.count / maxEvents) * 100)}%`,
                                        transition: 'width 0.6s ease',
                                    }} />
                                </div>
                                <span style={{
                                    fontSize: '11px', color: 'var(--accent-cyan)',
                                    fontFamily: 'monospace', fontWeight: 700,
                                    minWidth: '28px', textAlign: 'right'
                                }}>
                                    {e.count}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}