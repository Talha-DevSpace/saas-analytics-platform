'use client'

import { useState, useEffect } from 'react'
import { getLiveEvents } from '@/lib/api'

const EVENT_ICONS = {
    page_view: '👁',
    click: '🖱',
    scroll_depth: '📜',
    time_on_page: '⏱',
    form_submit: '📋',
    signup: '✅',
    purchase: '💰',
    outbound_link: '🔗',
    custom: '⚡',
}

function timeAgo(isoString) {
    try {
        const diff = Math.floor((Date.now() - new Date(isoString)) / 1000)
        if (diff < 5) return 'just now'
        if (diff < 60) return `${diff}s ago`
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
        return `${Math.floor(diff / 86400)}d ago`
    } catch {
        return '—'
    }
}
export default function LiveFeed() {
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)

    async function fetchEvents() {
        try {
            const data = await getLiveEvents()
            setEvents(data)
        } catch {
            // silent fail
        } finally {
            setLoading(false)
        }
    }

    // Fetch on mount, then every 15 seconds
    useEffect(() => {
        fetchEvents()
        const interval = setInterval(fetchEvents, 15000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="card">
            <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: '16px'
            }}>
                <h3 style={{
                    fontSize: '14px', color: 'var(--text-secondary)',
                    letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 500
                }}>
                    ⚡ Live Events
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div className="pulse-dot" />
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        updates every 15s
                    </span>
                </div>
            </div>

            {loading ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                    Loading...
                </p>
            ) : events.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '32px 0',
                    color: 'var(--text-muted)', fontSize: '13px'
                }}>
                    No events yet. Install the tracker on your website.
                </div>
            ) : (
                <div style={{
                    display: 'flex', flexDirection: 'column', gap: '6px',
                    maxHeight: '180px', overflowY: 'auto',
                    paddingRight: '4px',
                }}>                    {events.map((e, i) => (
                    <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '8px 12px',
                        background: i === 0 ? 'rgba(6,182,212,0.06)' : 'var(--bg-secondary)',
                        border: `1px solid ${i === 0 ? 'var(--border-accent)' : 'var(--border)'}`,
                        borderRadius: '8px',
                        transition: 'all 0.3s',
                    }}>
                        {/* Event icon */}
                        <span style={{ fontSize: '16px', flexShrink: 0 }}>
                            {EVENT_ICONS[e.event_name] || '⚡'}
                        </span>

                        {/* Event details */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                                display: 'flex', alignItems: 'center',
                                gap: '8px', marginBottom: '2px'
                            }}>
                                <span style={{
                                    fontSize: '12px', fontWeight: 600,
                                    color: 'var(--text-primary)', textTransform: 'capitalize'
                                }}>
                                    {e.event_name.replace(/_/g, ' ')}
                                </span>
                                {e.metadata?.device && (
                                    <span style={{
                                        fontSize: '10px',
                                        color: 'var(--text-muted)',
                                        background: 'var(--bg-card)',
                                        padding: '1px 6px', borderRadius: '99px',
                                        border: '1px solid var(--border)'
                                    }}>
                                        {e.metadata.device}
                                    </span>
                                )}
                            </div>
                            <span style={{
                                fontSize: '11px', color: 'var(--text-muted)',
                                fontFamily: 'monospace',
                                overflow: 'hidden', textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap', display: 'block'
                            }}>
                                {e.page || '—'}
                            </span>
                        </div>

                        {/* Time */}
                        <span style={{
                            fontSize: '11px', color: 'var(--text-muted)',
                            flexShrink: 0
                        }}>
                            {timeAgo(e.timestamp)}
                        </span>
                    </div>
                ))}
                </div>
            )}
        </div>
    )
}