import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'LaunchRadar — Track every move your competitors make',
  description:
    'Get alerted when competitors change pricing, messaging, or launch features. Know exactly what changed before your customers do.',
  openGraph: {
    title: 'LaunchRadar',
    description: 'Track every move your competitors make.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300..700;1,9..40,300..700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-radar-bg text-radar-text font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
