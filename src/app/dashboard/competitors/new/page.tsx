'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewCompetitorPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, base_url: url }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong')
        setLoading(false)
        return
      }

      router.push(`/dashboard/competitors/${data.competitor.id}`)
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="animate-slide-up pt-14 md:pt-0 max-w-lg">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/competitors"
          className="text-radar-text-muted text-sm hover:text-radar-accent transition-colors"
        >
          ← Back to competitors
        </Link>
        <h1 className="text-2xl font-bold text-radar-text mt-3">Add competitor</h1>
        <p className="text-radar-text-muted text-sm mt-1">
          We&apos;ll automatically monitor their homepage, pricing, features, and changelog.
        </p>
      </div>

      {/* Form */}
      <div className="border border-radar-border bg-radar-surface rounded-xl p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-radar-text-muted mb-1.5">
              Competitor name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full bg-radar-bg border border-radar-border rounded-lg px-3 py-2.5 text-sm text-radar-text placeholder-radar-text-muted focus:outline-none focus:border-radar-accent transition-colors"
              placeholder="e.g. Acme Corp"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-radar-text-muted mb-1.5">
              Website URL
            </label>
            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              required
              className="w-full bg-radar-bg border border-radar-border rounded-lg px-3 py-2.5 text-sm text-radar-text placeholder-radar-text-muted focus:outline-none focus:border-radar-accent transition-colors font-mono"
              placeholder="https://acme.com"
            />
            <p className="text-radar-text-muted text-xs mt-1.5">
              Just the domain — we&apos;ll discover the pages automatically.
            </p>
          </div>

          {/* Pages preview */}
          <div className="bg-radar-bg rounded-lg border border-radar-border p-4">
            <p className="text-xs font-mono text-radar-text-muted uppercase tracking-widest mb-3">
              Pages we&apos;ll monitor
            </p>
            <div className="space-y-1.5">
              {['/', '/pricing', '/features', '/changelog'].map(path => (
                <div key={path} className="flex items-center gap-2">
                  <span className="text-radar-accent text-xs font-mono">◉</span>
                  <span className="text-radar-text-muted text-xs font-mono">
                    {url ? url.replace(/\/$/, '') + path : 'your-competitor.com' + path}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2.5 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-radar-accent text-radar-bg font-semibold py-2.5 rounded-lg hover:bg-radar-accent-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Adding competitor…' : 'Add competitor →'}
          </button>
        </form>
      </div>
    </div>
  )
}
