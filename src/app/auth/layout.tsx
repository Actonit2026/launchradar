import Link from 'next/link'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-radar-bg dot-grid flex flex-col">
      {/* Nav */}
      <nav className="px-6 py-4">
        <Link
          href="/"
          className="text-radar-accent font-mono text-base font-semibold radar-text-glow hover:text-radar-accent-dim transition-colors"
        >
          ◎ LaunchRadar
        </Link>
      </nav>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        {children}
      </div>
    </div>
  )
}
