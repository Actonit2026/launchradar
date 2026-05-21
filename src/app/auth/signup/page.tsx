'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSignup() {
    if (!email || !password) return
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setDone(true)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-radar-bg dot-grid flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="text-radar-accent font-mono text-xl font-semibold radar-text-glow mb-8">◎ LaunchRadar</div>
          <div className="border border-radar-border bg-radar-surface rounded-xl p-8">
            <div className="text-3xl mb-4">✉️</div>
            <h2 className="text-radar-text font-semibold mb-2">Check your inbox</h2>
            <p className="text-radar-text-muted text-sm leading-relaxed">
              We sent a confirmation link to <span className="text-radar-text">{email}</span>.
              Click it to activate your account.
            </p>
          </div>
          <p className="text-center text-sm text-radar-text-muted mt-4">
            Already confirmed?{' '}
            <Link href="/auth/login" className="text-radar-accent hover:text-radar-accent-dim transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-radar-bg dot-grid flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-radar-accent font-mono text-xl font-semibold radar-text-glow">
            ◎ LaunchRadar
          </Link>
          <p className="text-radar-text-muted text-sm mt-2">Create your free account</p>
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
              onKeyDown={e => e.key === 'Enter' && handleSignup()}
              placeholder="8+ characters"
              className="w-full bg-radar-bg border border-radar-border rounded-lg px-3 py-2.5 text-sm text-radar-text placeholder-radar-text-muted focus:outline-none focus:border-radar-accent transition-colors"
            />
          </div>
          <button
            onClick={handleSignup}
            disabled={loading || !email || !password}
            className="w-full bg-radar-accent text-radar-bg font-semibold py-2.5 rounded-lg hover:bg-radar-accent-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {loading ? 'Creating account…' : 'Start tracking free →'}
          </button>
          <p className="text-xs text-radar-text-muted text-center">
            2 competitors free · No credit card
          </p>
        </div>

        <p className="text-center text-sm text-radar-text-muted mt-4">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-radar-accent hover:text-radar-accent-dim transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
