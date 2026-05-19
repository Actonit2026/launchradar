'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setDone(true)
  }

  if (done) {
    return (
      <div className="w-full max-w-sm animate-slide-up">
        <div className="border border-radar-border bg-radar-surface rounded-xl p-8 text-center">
          <div className="text-4xl mb-4">◉</div>
          <h1 className="text-xl font-bold mb-2 text-radar-accent">Check your inbox</h1>
          <p className="text-radar-text-muted text-sm leading-relaxed">
            We sent a confirmation link to{' '}
            <span className="text-radar-text font-mono">{email}</span>.
            Click it to activate your account.
          </p>
          <Link
            href="/auth/login"
            className="mt-6 block text-sm text-radar-text-muted hover:text-radar-accent transition-colors"
          >
            ← Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm animate-slide-up">
      <div className="border border-radar-border bg-radar-surface rounded-xl p-8">
        <h1 className="text-xl font-bold mb-1">Create account</h1>
        <p className="text-radar-text-muted text-sm mb-6">
          Start tracking competitors for free
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
              minLength={8}
              className="w-full bg-radar-bg border border-radar-border rounded-lg px-3 py-2.5 text-sm text-radar-text placeholder-radar-text-muted focus:outline-none focus:border-radar-accent transition-colors"
              placeholder="Min. 8 characters"
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
            {loading ? 'Creating account…' : 'Create account →'}
          </button>

          <p className="text-radar-text-muted text-xs text-center">
            By signing up you agree to our terms. No spam, ever.
          </p>
        </form>

        <div className="mt-6 text-center">
          <p className="text-radar-text-muted text-sm">
            Already have an account?{' '}
            <Link
              href="/auth/login"
              className="text-radar-accent hover:text-radar-accent-dim transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
