'use client'

import { useState, useEffect } from 'react'
import { getDomains, addDomain, removeDomain, getCompanyData } from '@/lib/api'

import InstallGuide from '@/components/InstallGuide'
import VerifyInstall from '@/components/VerifyInstall'

export default function SnippetPanel() {
    const [domains, setDomains] = useState([])
    const [newDomain, setNewDomain] = useState('')
    const [loading, setLoading] = useState(true)
    const [adding, setAdding] = useState(false)
    const [copied, setCopied] = useState(false)
    const [error, setError] = useState('')
    const [activeSection, setActiveSection] = useState('snippet')

    const company = getCompanyData()
    const apiKey = company?.api_key || 'YOUR_API_KEY'
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

    const snippet =
        `<!-- SaaS Analytics Tracker -->
<script
  src="${baseUrl}/tracker.js"
  data-key="${apiKey}"
  async>
</script>`

    useEffect(() => {
        fetchDomains()
    }, [])

    async function fetchDomains() {
        setLoading(true)
        try {
            const data = await getDomains()
            setDomains(data.allowed_domains || [])
        } catch {
            setError('Failed to load domains')
        } finally {
            setLoading(false)
        }
    }

    async function handleAddDomain(e) {
        e.preventDefault()
        setError('')
        if (!newDomain.trim()) return
        setAdding(true)
        try {
            const data = await addDomain(newDomain.trim())
            setDomains(data.allowed_domains)
            setNewDomain('')
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to add domain')
        } finally {
            setAdding(false)
        }
    }

    async function handleRemoveDomain(domain) {
        try {
            const data = await removeDomain(domain)
            setDomains(data.allowed_domains)
        } catch {
            setError('Failed to remove domain')
        }
    }

    function handleCopy() {
        navigator.clipboard.writeText(snippet)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const inputStyle = {
        padding: '10px 14px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        color: 'var(--text-primary)',
        fontSize: '13px',
        outline: 'none',
        flex: 1,
    }

    return (

        <div>
            {/* Section tabs */}
            <div style={{
                display: 'flex', gap: '4px',
                borderBottom: '1px solid var(--border)',
                marginBottom: '24px'
            }}>
                {[
                    { key: 'snippet', label: 'Snippet & Domains' },
                    { key: 'guide', label: 'Install Guide' },
                    { key: 'verify', label: 'Verify' },
                ].map(({ key, label }) => (
                    <button key={key} onClick={() => setActiveSection(key)} style={{
                        padding: '10px 18px', background: 'none', border: 'none',
                        cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                        color: activeSection === key
                            ? 'var(--accent-cyan)' : 'var(--text-muted)',
                        borderBottom: activeSection === key
                            ? '2px solid var(--accent-cyan)' : '2px solid transparent',
                        marginBottom: '-1px', transition: 'all 0.2s',
                    }}>
                        {label}
                    </button>
                ))}
            </div>

            {/* Snippet & Domains tab — your existing JSX goes here */}
            {activeSection === 'snippet' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* ── Code Snippet ── */}
                    <div className="card">
                        <div style={{
                            display: 'flex', justifyContent: 'space-between',
                            alignItems: 'center', marginBottom: '16px'
                        }}>
                            <div>
                                <h3 style={{
                                    fontSize: '14px', fontWeight: 700,
                                    color: 'var(--text-primary)', marginBottom: '4px'
                                }}>
                                    🔌 Install Tracker
                                </h3>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                    Paste this before the &lt;/head&gt; tag on your website
                                </p>
                            </div>
                            <button onClick={handleCopy} style={{
                                padding: '8px 16px',
                                background: copied ? 'var(--accent-green)' : 'var(--accent-cyan)',
                                color: '#000', border: 'none', borderRadius: '8px',
                                fontWeight: 700, fontSize: '12px', cursor: 'pointer',
                                transition: 'background 0.2s', flexShrink: 0,
                            }}>
                                {copied ? '✓ Copied!' : 'Copy Snippet'}
                            </button>
                        </div>

                        {/* Snippet code block */}
                        <div style={{
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px', padding: '16px',
                            fontFamily: 'monospace', fontSize: '12px',
                            color: 'var(--accent-cyan)', lineHeight: 1.8,
                            whiteSpace: 'pre', overflowX: 'auto',
                            borderLeft: '3px solid var(--accent-cyan)',
                        }}>
                            {snippet}
                        </div>

                        {/* Custom events note */}
                        <div style={{
                            marginTop: '12px', padding: '12px 14px',
                            background: 'rgba(6,182,212,0.06)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                        }}>
                            <p style={{
                                fontSize: '11px', color: 'var(--text-muted)',
                                marginBottom: '6px', fontWeight: 600,
                                textTransform: 'uppercase', letterSpacing: '1px'
                            }}>
                                Optional — Custom Events
                            </p>
                            <p style={{
                                fontFamily: 'monospace', fontSize: '12px',
                                color: 'var(--text-secondary)', lineHeight: 1.8
                            }}>
                                {`// After the snippet loads, track custom events:\nSaasAnalytics.track("purchase", { value: 99, plan: "pro" });`}
                            </p>
                        </div>
                    </div>

                    {/* ── Domain Whitelist ── */}
                    <div className="card">
                        <h3 style={{
                            fontSize: '14px', fontWeight: 700,
                            color: 'var(--text-primary)', marginBottom: '4px'
                        }}>
                            🌐 Authorized Domains
                        </h3>
                        <p style={{
                            fontSize: '12px', color: 'var(--text-muted)',
                            marginBottom: '16px'
                        }}>
                            Only these domains can send events using your API key.
                            Add every domain where your tracker is installed.
                        </p>

                        {error && (
                            <div style={{
                                color: 'var(--accent-red)', fontSize: '13px',
                                marginBottom: '12px'
                            }}>
                                {error}
                            </div>
                        )}

                        {/* Add domain form */}
                        <form onSubmit={handleAddDomain}
                            style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                            <input
                                type="text"
                                placeholder="acmecorp.com"
                                value={newDomain}
                                onChange={(e) => setNewDomain(e.target.value)}
                                style={inputStyle}
                            />
                            <button type="submit" disabled={adding} style={{
                                padding: '10px 20px',
                                background: 'var(--accent-cyan)', color: '#000',
                                border: 'none', borderRadius: '8px',
                                fontWeight: 700, fontSize: '13px',
                                cursor: adding ? 'not-allowed' : 'pointer',
                                flexShrink: 0,
                            }}>
                                {adding ? '...' : '+ Add'}
                            </button>
                        </form>

                        {/* Domain list */}
                        {loading ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                                Loading...
                            </p>
                        ) : domains.length === 0 ? (
                            <div style={{
                                textAlign: 'center', padding: '24px',
                                color: 'var(--text-muted)', fontSize: '13px',
                                border: '1px dashed var(--border)', borderRadius: '8px'
                            }}>
                                No domains added yet. Add your website domain above.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {domains.map((domain) => (
                                    <div key={domain} style={{
                                        display: 'flex', justifyContent: 'space-between',
                                        alignItems: 'center', padding: '10px 14px',
                                        background: 'var(--bg-secondary)',
                                        border: '1px solid var(--border)', borderRadius: '8px',
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            {/* Status dot */}
                                            <div style={{
                                                width: '8px', height: '8px', borderRadius: '50%',
                                                background: domain === '*'
                                                    ? 'var(--accent-yellow)' : 'var(--accent-green)',
                                                flexShrink: 0,
                                            }} />
                                            <span style={{
                                                fontFamily: 'monospace', fontSize: '13px',
                                                color: domain === '*' ? 'var(--accent-yellow)' : 'var(--text-primary)'
                                            }}>
                                                {domain === '*' ? '* (all domains — development mode)' : domain}
                                            </span>
                                        </div>
                                        <button onClick={() => handleRemoveDomain(domain)} style={{
                                            padding: '4px 12px',
                                            background: 'transparent',
                                            border: '1px solid var(--accent-red)',
                                            borderRadius: '6px', color: 'var(--accent-red)',
                                            fontSize: '11px', cursor: 'pointer',
                                        }}>
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Warning if wildcard is active */}
                        {domains.includes('*') && (
                            <div style={{
                                marginTop: '12px', padding: '10px 14px',
                                background: 'rgba(245,158,11,0.1)',
                                border: '1px solid var(--accent-yellow)',
                                borderRadius: '8px',
                            }}>
                                <p style={{ fontSize: '12px', color: 'var(--accent-yellow)' }}>
                                    ⚠ All domains allowed. Add your specific domains and
                                    remove * before going to production.
                                </p>
                            </div>
                        )}
                    </div>

                </div>
            )}

            {/* Guide tab */}
            {activeSection === 'guide' && <InstallGuide />}

            {/* Verify tab */}
            {activeSection === 'verify' && <VerifyInstall />}

        </div>
    )
}