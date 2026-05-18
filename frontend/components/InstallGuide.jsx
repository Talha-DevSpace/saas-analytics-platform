'use client'

import { useState } from 'react'
import { getCompanyData } from '@/lib/api'

const PLATFORMS = ['HTML', 'React / Next.js', 'WordPress', 'Webflow']

export default function InstallGuide() {
    const [active, setActive] = useState('HTML')
    const company = getCompanyData()
    const apiKey = company?.api_key || 'YOUR_API_KEY'
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

    const guides = {
        'HTML': {
            steps: [
                'Open your HTML file',
                'Find the </head> closing tag',
                'Paste the snippet just before it',
                'Save and deploy your file',
            ],
            code:
                `<!-- Paste before </head> -->
<script
  src="${baseUrl}/tracker.js"
  data-key="${apiKey}"
  async>
</script>`,
            note: 'Works on any static HTML website.'
        },

        'React / Next.js': {
            steps: [
                'Open your root layout file',
                'For Next.js: app/layout.js or pages/_app.js',
                'For React: public/index.html or your root component',
                'Add the script tag inside <head>',
            ],
            code:
                `// app/layout.js (Next.js App Router)
export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <script
          src="${baseUrl}/tracker.js"
          data-key="${apiKey}"
          async
        />
      </head>
      <body>{children}</body>
    </html>
  )
}`,
            note: 'The tracker auto-detects SPA route changes — no extra setup needed.'
        },

        'WordPress': {
            steps: [
                'Log in to your WordPress dashboard',
                'Go to Appearance → Theme Editor',
                'Open header.php',
                'Paste the snippet before </head>',
                'Click Update File',
            ],
            code:
                `<!-- Paste in header.php before </head> -->
<script
  src="${baseUrl}/tracker.js"
  data-key="${apiKey}"
  async>
</script>`,
            note: 'Or use a plugin like "Insert Headers and Footers" to add it without editing theme files.'
        },

        'Webflow': {
            steps: [
                'Open your Webflow project',
                'Go to Project Settings → Custom Code',
                'Paste the snippet in the Head Code section',
                'Click Save Changes and Publish',
            ],
            code:
                `<!-- Paste in Project Settings → Head Code -->
<script
  src="${baseUrl}/tracker.js"
  data-key="${apiKey}"
  async>
</script>`,
            note: 'You can also add it per-page under Page Settings → Custom Code.'
        },
    }

    const [copied, setCopied] = useState(false)

    function handleCopy() {
        navigator.clipboard.writeText(guides[active].code)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const guide = guides[active]

    return (
        <div className="card">
            <h3 style={{
                fontSize: '14px', fontWeight: 700,
                color: 'var(--text-primary)', marginBottom: '4px'
            }}>
                📖 Installation Guide
            </h3>
            <p style={{
                fontSize: '12px', color: 'var(--text-muted)',
                marginBottom: '16px'
            }}>
                Choose your platform for specific instructions.
            </p>

            {/* Platform tabs */}
            <div style={{
                display: 'flex', gap: '6px',
                flexWrap: 'wrap', marginBottom: '20px'
            }}>
                {PLATFORMS.map((p) => (
                    <button key={p} onClick={() => { setActive(p); setCopied(false) }}
                        style={{
                            padding: '6px 14px',
                            background: active === p
                                ? 'var(--accent-cyan)' : 'var(--bg-secondary)',
                            color: active === p ? '#000' : 'var(--text-secondary)',
                            border: `1px solid ${active === p
                                ? 'var(--accent-cyan)' : 'var(--border)'}`,
                            borderRadius: '99px', fontSize: '12px',
                            fontWeight: active === p ? 700 : 400,
                            cursor: 'pointer', transition: 'all 0.2s',
                        }}>
                        {p}
                    </button>
                ))}
            </div>

            {/* Steps */}
            <div style={{ marginBottom: '16px' }}>
                {guide.steps.map((step, i) => (
                    <div key={i} style={{
                        display: 'flex', gap: '12px',
                        alignItems: 'flex-start', marginBottom: '8px'
                    }}>
                        <span style={{
                            width: '22px', height: '22px', borderRadius: '50%',
                            background: 'var(--accent-cyan)', color: '#000',
                            display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: '11px',
                            fontWeight: 700, flexShrink: 0,
                        }}>
                            {i + 1}
                        </span>
                        <span style={{
                            fontSize: '13px', color: 'var(--text-secondary)',
                            lineHeight: 1.5, paddingTop: '2px'
                        }}>
                            {step}
                        </span>
                    </div>
                ))}
            </div>

            {/* Code block */}
            <div style={{ position: 'relative', marginBottom: '12px' }}>
                <pre style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderLeft: '3px solid var(--accent-cyan)',
                    borderRadius: '8px', padding: '16px',
                    fontSize: '11.5px', color: 'var(--accent-cyan)',
                    fontFamily: 'monospace', lineHeight: 1.8,
                    overflowX: 'auto', margin: 0,
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                    {guide.code}
                </pre>
                <button onClick={handleCopy} style={{
                    position: 'absolute', top: '10px', right: '10px',
                    padding: '4px 12px',
                    background: copied ? 'var(--accent-green)' : 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px', fontSize: '11px',
                    color: copied ? '#000' : 'var(--text-muted)',
                    cursor: 'pointer', fontWeight: copied ? 700 : 400,
                    transition: 'all 0.2s',
                }}>
                    {copied ? '✓ Copied' : 'Copy'}
                </button>
            </div>

            {/* Note */}
            <div style={{
                padding: '10px 14px',
                background: 'rgba(6,182,212,0.06)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
            }}>
                <p style={{
                    fontSize: '12px', color: 'var(--text-secondary)',
                    lineHeight: 1.5
                }}>
                    💡 {guide.note}
                </p>
            </div>
        </div>
    )
}