'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { registerCompany, loginCompany, saveToken, saveCompanyData } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [registered, setRegistered] = useState(null)

  // Login form state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Register form state
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)


  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await loginCompany(loginEmail, loginPassword)
      saveToken(data.access_token)
      saveCompanyData({
        company_id: data.company_id,
        company_name: data.company_name,
        api_key: data.api_key,
      })
      router.push('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }


  async function handleRegister(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await registerCompany(regName, regEmail, regPassword)
      setRegistered(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }


  // ── Input style (reused) ──
  const inputStyle = {
    width: '100%',
    padding: '11px 14px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    fontSize: '14px',
    outline: 'none',
    marginBottom: '12px',
  }

  const btnStyle = (disabled) => ({
    width: '100%',
    padding: '12px',
    background: disabled ? 'var(--text-muted)' : 'var(--accent-cyan)',
    color: '#000',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 700,
    fontSize: '14px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    marginTop: '4px',
  })

  const labelStyle = {
    display: 'block',
    fontSize: '11px',
    color: 'var(--text-secondary)',
    marginBottom: '6px',
    letterSpacing: '1px',
    textTransform: 'uppercase',
  }


  return (
    <div className="min-h-screen grid-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-in">

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center',
            gap: '8px', marginBottom: '12px'
          }}>
            <div className="pulse-dot" />
            <span style={{
              color: 'var(--accent-cyan)', fontSize: '11px',
              letterSpacing: '3px', textTransform: 'uppercase'
            }}>
              Live Analytics
            </span>
          </div>
          <h1 style={{
            fontSize: '28px', fontWeight: 700,
            color: 'var(--text-primary)', marginBottom: '6px'
          }}>
            SaaS Analytics
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Track events · Understand users · Grow faster
          </p>
        </div>

        {/* Card */}
        <div className="card card-accent">

          {/* Tabs */}
          <div style={{
            display: 'flex', borderBottom: '1px solid var(--border)',
            marginBottom: '24px'
          }}>
            {[['login', 'Login'], ['register', 'Register']].map(([key, label]) => (
              <button key={key}
                onClick={() => { setActiveTab(key); setError(''); setRegistered(null) }}
                style={{
                  flex: 1, padding: '10px', fontSize: '13px', fontWeight: 600,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: activeTab === key ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  borderBottom: activeTab === key
                    ? '2px solid var(--accent-cyan)' : '2px solid transparent',
                  marginBottom: '-1px', transition: 'all 0.2s',
                }}>
                {label}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid var(--accent-red)', borderRadius: '8px',
              padding: '10px 14px', color: 'var(--accent-red)',
              fontSize: '13px', marginBottom: '16px'
            }}>
              {error}
            </div>
          )}

          {/* ── LOGIN FORM ── */}
          {activeTab === 'login' && (
            <form onSubmit={handleLogin}>
              <label style={labelStyle}>Email</label>
              <input type="email" placeholder="company@example.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                style={inputStyle} required />

              <label style={labelStyle}>Password</label>
              <div style={{ position: 'relative', marginBottom: '20px' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  style={{ ...inputStyle, marginBottom: 0, paddingRight: '44px' }}
                  required
                />
                <button type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%',
                    transform: 'translateY(-50%)', background: 'none',
                    border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', fontSize: '16px'
                  }}>
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>

              <button type="submit" disabled={loading} style={btnStyle(loading)}>
                {loading ? 'Logging in...' : 'Login to Dashboard →'}
              </button>
            </form>
          )}

          {/* ── REGISTER FORM ── */}
          {activeTab === 'register' && (
            <>
              {registered ? (
                // Success state — show API key
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '40px', marginBottom: '10px' }}>✅</div>
                  <p style={{
                    color: 'var(--text-primary)', fontWeight: 700,
                    fontSize: '16px', marginBottom: '6px'
                  }}>
                    Company Registered!
                  </p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px',
                    marginBottom: '16px', lineHeight: 1.5 }}>
                    Save your API key below — use it to track events from your website.
                  </p>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={labelStyle}>Your Event Tracking API Key</label>
                    <div style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--accent-cyan)',
                      borderRadius: '8px', padding: '12px 14px',
                      fontFamily: 'monospace', fontSize: '12px',
                      color: 'var(--accent-cyan)', wordBreak: 'break-all',
                      textAlign: 'left',
                    }}>
                      {registered.api_key}
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '11px',
                      marginTop: '6px', textAlign: 'left' }}>
                      Use this key in X-API-Key header when sending events.
                    </p>
                  </div>

                  <button
                    onClick={() => { setActiveTab('login'); setRegistered(null) }}
                    style={btnStyle(false)}>
                    Go to Login →
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRegister}>
                  <label style={labelStyle}>Company Name</label>
                  <input type="text" placeholder="Acme Corp"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    style={inputStyle} required />

                  <label style={labelStyle}>Email</label>
                  <input type="email" placeholder="company@example.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    style={inputStyle} required />

                  <label style={labelStyle}>Password</label>
                  <div style={{ position: 'relative', marginBottom: '20px' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Minimum 8 characters"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      style={{ ...inputStyle, marginBottom: 0, paddingRight: '44px' }}
                      required minLength={8}
                    />
                    <button type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute', right: '12px', top: '50%',
                        transform: 'translateY(-50%)', background: 'none',
                        border: 'none', cursor: 'pointer',
                        color: 'var(--text-muted)', fontSize: '16px'
                      }}>
                      {showPassword ? '🙈' : '👁'}
                    </button>
                  </div>

                  <button type="submit" disabled={loading} style={btnStyle(loading)}>
                    {loading ? 'Registering...' : 'Create Account →'}
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