'use client'

import { useState, useEffect } from 'react'
import { verifyInstallation, sendTestEvent, processQueue } from '@/lib/api'

export default function VerifyInstall() {
    const [status, setStatus] = useState(null)
    const [loading, setLoading] = useState(true)
    const [testing, setTesting] = useState(false)
    const [testMsg, setTestMsg] = useState('')


    async function checkStatus() {
        setLoading(true)
        try {
            const data = await verifyInstallation()
            setStatus(data)
        } catch {
            setStatus(null)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { checkStatus() }, [])

    async function handleTestEvent() {

        setTesting(true)
        setTestMsg('')
        try {
            const d = localStorage.getItem('company_data')
            const companyData = d ? JSON.parse(d) : null
            await sendTestEvent()
            setTestMsg('queued')

            // Auto-process queue and refresh status
            await processQueue(companyData?.api_key)
            await checkStatus()
            setTestMsg('success')
        } catch {
            setTestMsg('error')
        } finally {
            setTesting(false)
        }
    }

    const isInstalled = status?.installed === true

    return (
        <div className="card">
            <h3 style={{
                fontSize: '14px', fontWeight: 700,
                color: 'var(--text-primary)', marginBottom: '16px'
            }}>
                🔍 Verify Installation
            </h3>

            {/* Status badge */}
            {loading ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                    Checking...
                </div>
            ) : (
                <>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '16px',
                        background: isInstalled
                            ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                        border: `1px solid ${isInstalled
                            ? 'var(--accent-green)' : 'var(--accent-red)'}`,
                        borderRadius: '10px', marginBottom: '16px',
                    }}>
                        <span style={{ fontSize: '28px' }}>
                            {isInstalled ? '✅' : '⚠️'}
                        </span>
                        <div>
                            <p style={{
                                fontSize: '14px', fontWeight: 700,
                                color: isInstalled
                                    ? 'var(--accent-green)' : 'var(--accent-red)',
                                marginBottom: '4px'
                            }}>
                                {isInstalled
                                    ? 'Tracker is working!'
                                    : 'No events received yet'}
                            </p>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                {isInstalled
                                    ? `${status.events_last_24h} events in the last 24 hours`
                                    : 'Add the snippet to your website, then send a test event below.'}
                            </p>
                        </div>
                    </div>

                    {/* Stats row */}
                    {isInstalled && status && (
                        <div style={{
                            display: 'flex', gap: '12px',
                            marginBottom: '16px', flexWrap: 'wrap'
                        }}>
                            {[
                                { label: 'Events (24h)', value: status.events_last_24h },
                                {
                                    label: 'Domains',
                                    value: status.domains
                                        .filter(d => d !== '*').length || '* (all)'
                                },
                                {
                                    label: 'Last Event',
                                    value: status.last_event_at
                                        ? new Date(status.last_event_at).toLocaleTimeString()
                                        : '—'
                                },
                            ].map(({ label, value }) => (
                                <div key={label} style={{
                                    flex: 1, minWidth: '100px',
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '8px', padding: '10px 14px',
                                }}>
                                    <div style={{
                                        fontSize: '16px', fontWeight: 700,
                                        color: 'var(--accent-cyan)', fontFamily: 'monospace',
                                        marginBottom: '4px'
                                    }}>
                                        {value}
                                    </div>
                                    <div style={{
                                        fontSize: '10px', color: 'var(--text-muted)',
                                        textTransform: 'uppercase', letterSpacing: '1px'
                                    }}>
                                        {label}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Active domains */}
                    {status?.domains?.length > 0 && (
                        <div style={{ marginBottom: '16px' }}>
                            <p style={{
                                fontSize: '11px', color: 'var(--text-muted)',
                                textTransform: 'uppercase', letterSpacing: '1px',
                                marginBottom: '8px'
                            }}>
                                Authorized Domains
                            </p>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {status.domains.map((d) => (
                                    <span key={d} style={{
                                        padding: '3px 10px',
                                        background: d === '*'
                                            ? 'rgba(245,158,11,0.1)' : 'rgba(6,182,212,0.1)',
                                        border: `1px solid ${d === '*'
                                            ? 'var(--accent-yellow)' : 'var(--border-accent)'}`,
                                        borderRadius: '99px', fontSize: '12px',
                                        fontFamily: 'monospace',
                                        color: d === '*'
                                            ? 'var(--accent-yellow)' : 'var(--accent-cyan)',
                                    }}>
                                        {d === '*' ? '* all domains' : d}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tracked events list */}
                    <div style={{ marginBottom: '16px' }}>
                        <p style={{
                            fontSize: '11px', color: 'var(--text-muted)',
                            textTransform: 'uppercase', letterSpacing: '1px',
                            marginBottom: '8px'
                        }}>
                            Auto-Tracked Events
                        </p>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {[
                                '👁 page_view', '🖱 click', '📜 scroll_depth',
                                '⏱ time_on_page', '📋 form_submit', '🔗 outbound_link',
                            ].map((item) => (
                                <span key={item} style={{
                                    padding: '3px 10px',
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '99px', fontSize: '11px',
                                    color: 'var(--text-secondary)',
                                }}>
                                    {item}
                                </span>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* Test event button */}
            <div style={{
                borderTop: '1px solid var(--border)',
                paddingTop: '16px',
            }}>
                <p style={{
                    fontSize: '12px', color: 'var(--text-muted)',
                    marginBottom: '10px'
                }}>
                    Not seeing data? Send a test event to verify your setup:
                </p>
                <div style={{
                    display: 'flex', gap: '10px', alignItems: 'center',
                    flexWrap: 'wrap'
                }}>
                    <button onClick={handleTestEvent} disabled={testing} style={{
                        padding: '8px 20px',
                        background: testing ? 'var(--text-muted)' : 'var(--bg-secondary)',
                        border: '1px solid var(--border-accent)',
                        borderRadius: '8px', color: 'var(--accent-cyan)',
                        fontSize: '13px', fontWeight: 600,
                        cursor: testing ? 'not-allowed' : 'pointer',
                    }}>
                        {testing ? 'Sending...' : '⚡ Send Test Event'}
                    </button>

                    {testMsg === 'success' && (
                        <span style={{ fontSize: '13px', color: 'var(--accent-green)' }}>
                            ✅ Test event received! Check your analytics.
                        </span>
                    )}
                    {testMsg === 'error' && (
                        <span style={{ fontSize: '13px', color: 'var(--accent-red)' }}>
                            ❌ Failed. Check your server is running.
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}