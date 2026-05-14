import './globals.css'

export const metadata = {
  title: 'SaaS Analytics Platform',
  description: 'Track events, understand users, grow faster',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Google Font — DM Sans */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}