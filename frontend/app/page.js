'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { registerCompany } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()

  // Controls which tab is active: 'login' or 'register'
  const [activeTab, setActiveTab] = useState('login')

  // Form state
  const [apiKey, setApiKey]         = useState('')
  const [companyName, setCompanyName] = useState('')

  // UI state
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [newCompany, setNewCompany] = useState(null) // Stores registration result

  // ── Handle login with existing API key ──
  function handleLogin(e) {
    e.preventDefault()    // Prevent page reload on form submit
    setError('')

    if (!apiKey.trim()) {
      setError('Please enter your API key')
      return
    }

    // Store API key in localStorage so other pages can use it
    localStorage.setItem('api_key', apiKey.trim())

    // Navigate to dashboard
    router.push('/dashboard')
  }

  // ── Handle new company registration ──
  async function handleRegister(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const company = await registerCompany(companyName.trim())

      // Show the new API key to the user
      setNewCompany(company)

      // Auto-save API key so they can go straight to dashboard
      localStorage.setItem('api_key', company.api_key)

    } catch (err) {
      setError(
        err.response?.data?.detail || 'Registration failed. Try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid-bg flex items-center justify-center p-4">

      {/* ── Centered login box ── */}
      <div className="w-full max-w-md animate-in">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="pulse-dot"></div>
            <span style={{ color: 'var(--accent-cyan)', fontSize: '12px',
              letterSpacing: '3px', textTransform: 'uppercase' }}>
              Live Analytics
            </span>
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: 700,
            color: 'var(--text-primary)', marginBottom: '8px' }}>
            SaaS Analytics
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Track events. Understand users. Grow faster.
          </p>
        </div>

        {/* Card */}
        <div className="card card-accent">

          {/* Tabs */}
          <div style={{ display: 'flex', marginBottom: '24px',
            borderBottom: '1px solid var(--border)', gap: '0' }}>
            {['login', 'register'].map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setError(''); setNewCompany(null) }}
                style={{
                  flex: 1,
                  padding: '10px',
                  fontSize: '14px',
                  fontWeight: 500,
                  textTransform: 'capitalize',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: activeTab === tab ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  borderBottom: activeTab === tab
                    ? '2px solid var(--accent-cyan)'
                    : '2px solid transparent',
                  marginBottom: '-1px',
                  transition: 'all 0.2s',
                }}
              >
                {tab === 'login' ? 'Enter API Key' : 'New Company'}
              </button>
            ))}
          </div>

          {/* ── Login Tab ── */}
          {activeTab === 'login' && (
            <form onSubmit={handleLogin}>
              <label style={{ display: 'block', fontSize: '12px',
                color: 'var(--text-secondary)', marginBottom: '8px',
                letterSpacing: '1px', textTransform: 'uppercase' }}>
                API Key
              </label>
              <input
                type="text"
                placeholder="Paste your API key here"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  marginBottom: '16px',
                  outline: 'none',
                }}
              />
              {error && (
                <p style={{ color: 'var(--accent-red)',
                  fontSize: '13px', marginBottom: '12px' }}>
                  {error}
                </p>
              )}
              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'var(--accent-cyan)',
                  color: '#000',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  letterSpacing: '0.5px',
                }}
              >
                Open Dashboard →
              </button>
            </form>
          )}

          {/* ── Register Tab ── */}
          {activeTab === 'register' && (
            <>
              {/* Show new API key after registration */}
              {newCompany ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>✅</div>
                  <p style={{ color: 'var(--text-primary)',
                    fontWeight: 600, marginBottom: '8px' }}>
                    Company registered!
                  </p>
                  <p style={{ color: 'var(--text-secondary)',
                    fontSize: '13px', marginBottom: '16px' }}>
                    Save your API key — you won&apos;t see it again.
                  </p>
                  <div style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--accent-cyan)',
                    borderRadius: '8px',
                    padding: '12px',
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    color: 'var(--accent-cyan)',
                    wordBreak: 'break-all',
                    marginBottom: '20px',
                  }}>
                    {newCompany.api_key}
                  </div>
                  <button
                    onClick={() => router.push('/dashboard')}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'var(--accent-cyan)',
                      color: '#000',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '14px',
                      cursor: 'pointer',
                    }}
                  >
                    Go to Dashboard →
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRegister}>
                  <label style={{ display: 'block', fontSize: '12px',
                    color: 'var(--text-secondary)', marginBottom: '8px',
                    letterSpacing: '1px', textTransform: 'uppercase' }}>
                    Company Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Corp"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      marginBottom: '16px',
                      outline: 'none',
                    }}
                  />
                  {error && (
                    <p style={{ color: 'var(--accent-red)',
                      fontSize: '13px', marginBottom: '12px' }}>
                      {error}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: loading ? 'var(--text-muted)' : 'var(--accent-cyan)',
                      color: '#000',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '14px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {loading ? 'Registering...' : 'Register Company →'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}