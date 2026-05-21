'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleLogin() {
    if (!email || !password) return
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-radar-bg dot-grid flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-radar-accent font-mono text-xl font-semibold radar-text-glow">
            ◎ LaunchRadar
          </Link>
          <p className="text-radar-text-muted text-sm mt-2">Sign in to your account</p>
        </div>

        <div className="border border-radar-border bg-radar-surface rounded-xl p-6 space-y-4">
          {error && (
            <div className="border border-radar-warn/30 bg-radar-warn/10 rounded-lg px-4 py-3 text-sm text-radar-warn">
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-mono text-radar-text-muted mb-1.5 tracking-widest">EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-radar-bg border border-radar-border rounded-lg px-3 py-2.5 text-sm text-radar-text placeholder-radar-text-muted focus:outline-none focus:border-radar-accent transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-radar-text-muted mb-1.5 tracking-widest">PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••"
              className="w-full bg-radar-bg border border-radar-border rounded-lg px-3 py-2.5 text-sm text-radar-text placeholder-radar-text-muted focus:outline-none focus:border-radar-accent transition-colors"
            />
          </div>
          <button
            onClick={handleLogin}
            disabled={loading || !email || !password}
            className="w-full bg-radar-accent text-radar-bg font-semibold py-2.5 rounded-lg hover:bg-radar-accent-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {loading ? 'Signing in…' : 'Sign in →'}
          </button>
        </div>

        <p className="text-center text-sm text-radar-text-muted mt-4">
          No account?{' '}
          <Link href="/auth/signup" className="text-radar-accent hover:text-radar-accent-dim transition-colors">
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  )
}
