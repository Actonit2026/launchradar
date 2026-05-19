'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="w-full max-w-sm animate-slide-up">
      <div className="border border-radar-border bg-radar-surface rounded-xl p-8">
        <h1 className="text-xl font-bold mb-1">Sign in</h1>
        <p className="text-radar-text-muted text-sm mb-6">
          Welcome back to LaunchRadar
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-radar-text-muted mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-radar-bg border border-radar-border rounded-lg px-3 py-2.5 text-sm text-radar-text placeholder-radar-text-muted focus:outline-none focus:border-radar-accent transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-radar-text-muted mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-radar-bg border border-radar-border rounded-lg px-3 py-2.5 text-sm text-radar-text placeholder-radar-text-muted focus:outline-none focus:border-radar-accent transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-radar-accent text-radar-bg font-semibold py-2.5 rounded-lg hover:bg-radar-accent-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in…' : 'Sign in →'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-radar-text-muted text-sm">
            No account?{' '}
            <Link
              href="/auth/signup"
              className="text-radar-accent hover:text-radar-accent-dim transition-colors"
            >
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
