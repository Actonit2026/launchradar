'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface Props {
  user: User
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview', icon: '◎' },
  { href: '/dashboard/competitors', label: 'Competitors', icon: '⊞' },
]

export default function DashboardNav({ user }: Props) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-60 border-r border-radar-border bg-radar-surface z-40">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-radar-border">
          <Link
            href="/dashboard"
            className="text-radar-accent font-mono font-semibold text-base radar-text-glow"
          >
            ◎ LaunchRadar
          </Link>
        </div>

        {/* Nav links */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === item.href
                  ? 'bg-radar-accent/10 text-radar-accent border border-radar-accent/20'
                  : 'text-radar-text-muted hover:text-radar-text hover:bg-radar-muted/40'
              }`}
            >
              <span className="font-mono">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User / signout */}
        <div className="p-3 border-t border-radar-border">
          <div className="px-3 py-2 mb-1">
            <p className="text-xs text-radar-text-muted font-mono truncate">
              {user.email}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-radar-text-muted hover:text-radar-warn hover:bg-radar-warn/10 transition-colors"
          >
            <span className="font-mono">⊗</span>
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 border-b border-radar-border bg-radar-surface/95 backdrop-blur-sm px-4 h-14 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="text-radar-accent font-mono font-semibold radar-text-glow"
        >
          ◎ LaunchRadar
        </Link>
        <div className="flex items-center gap-2">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                pathname === item.href
                  ? 'bg-radar-accent/10 text-radar-accent'
                  : 'text-radar-text-muted hover:text-radar-text'
              }`}
            >
              {item.label}
            </Link>
          ))}
          <button
            onClick={handleSignOut}
            className="px-3 py-1.5 rounded text-xs text-radar-text-muted hover:text-radar-warn transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </>
  )
}
