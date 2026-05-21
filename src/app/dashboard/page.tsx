'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Competitor {
  id: string
  name: string
  base_url: string
  created_at: string
  monitored_pages: { count: number }[]
}

interface Change {
  id: string
  diff_summary: string
  severity: 'low' | 'medium' | 'high'
  created_at: string
  monitored_pages: {
    url: string
    page_type: string
    competitors: { name: string; id: string }
  }
}

const SEVERITY_COLOR = {
  high: 'text-radar-warn border-radar-warn/30 bg-radar-warn/10',
  medium: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
  low: 'text-radar-text-muted border-radar-border bg-radar-surface',
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(h / 24)
  if (d > 0) return `${d}d ago`
  if (h > 0) return `${h}h ago`
  return 'just now'
}

export default function DashboardPage() {
  const [user, setUser] = useState<{ email: string } | null>(null)
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [changes, setChanges] = useState<Change[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState<string | null>(null)

  // Add competitor form
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) { router.push('/auth/login'); return }
    setUser({ email: u.email ?? '' })

    const [{ data: comps }, { data: chgs }] = await Promise.all([
      supabase
        .from('competitors')
        .select('*, monitored_pages(count)')
        .eq('user_id', u.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('detected_changes')
        .select('*, monitored_pages(url, page_type, competitors(name, id))')
        .order('created_at', { ascending: false })
        .limit(30),
    ])

    setCompetitors((comps ?? []) as Competitor[])
    // Filter changes to this user's competitors
    const compIds = new Set((comps ?? []).map((c: Competitor) => c.id))
    const userChanges = (chgs ?? []).filter((ch: Change) =>
      ch.monitored_pages?.competitors?.id && compIds.has(ch.monitored_pages.competitors.id)
    )
    setChanges(userChanges as Change[])
    setLoading(false)
  }, [supabase, router])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  async function handleAddCompetitor() {
    if (!newName.trim() || !newUrl.trim()) return
    setAdding(true)
    setAddError(null)

    const res = await fetch('/api/competitors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), base_url: newUrl.trim() }),
    })
    const data = await res.json()

    if (!res.ok) {
      setAddError(data.error ?? 'Failed to add competitor')
      setAdding(false)
      return
    }

    const competitorId = data.competitor.id
    setNewName('')
    setNewUrl('')
    setShowForm(false)
    setAdding(false)
    setScanning(competitorId)

    // Trigger baseline scan in background
    fetch('/api/baseline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ competitor_id: competitorId }),
    }).finally(() => {
      setScanning(null)
      fetchData()
    })

    fetchData()
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this competitor and all its data?')) return
    await supabase.from('competitors').delete().eq('id', id)
    fetchData()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-radar-bg flex items-center justify-center">
        <div className="flex items-center gap-2 text-radar-text-muted font-mono text-sm">
          <span className="w-2 h-2 rounded-full bg-radar-accent animate-pulse-slow" />
          Loading…
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-radar-bg">
      {/* Nav */}
      <nav className="border-b border-radar-border bg-radar-bg/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="text-radar-accent font-mono font-semibold radar-text-glow">◎ LaunchRadar</Link>
          <div className="flex items-center gap-4">
            <span className="text-radar-text-muted text-xs hidden sm:block">{user?.email}</span>
            <button onClick={handleSignOut} className="text-radar-text-muted hover:text-radar-text text-sm transition-colors">
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-radar-text">Dashboard</h1>
            <p className="text-radar-text-muted text-sm mt-0.5">
              {competitors.length} competitor{competitors.length !== 1 ? 's' : ''} tracked
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-radar-accent text-radar-bg text-sm font-semibold px-4 py-2 rounded-lg hover:bg-radar-accent-dim transition-colors radar-glow"
          >
            + Add competitor
          </button>
        </div>

        {/* Add competitor form */}
        {showForm && (
          <div className="border border-radar-accent/30 bg-radar-surface rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-radar-text">New competitor</h2>
            {addError && (
              <div className="border border-radar-warn/30 bg-radar-warn/10 rounded-lg px-3 py-2 text-sm text-radar-warn">
                {addError}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Competitor name"
                className="flex-1 bg-radar-bg border border-radar-border rounded-lg px-3 py-2 text-sm text-radar-text placeholder-radar-text-muted focus:outline-none focus:border-radar-accent transition-colors"
              />
              <input
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
                placeholder="https://competitor.com"
                className="flex-1 bg-radar-bg border border-radar-border rounded-lg px-3 py-2 text-sm text-radar-text placeholder-radar-text-muted focus:outline-none focus:border-radar-accent transition-colors"
              />
              <button
                onClick={handleAddCompetitor}
                disabled={adding || !newName || !newUrl}
                className="bg-radar-accent text-radar-bg text-sm font-semibold px-5 py-2 rounded-lg hover:bg-radar-accent-dim transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {adding ? 'Adding…' : 'Add & scan'}
              </button>
            </div>
            <p className="text-xs text-radar-text-muted">
              LaunchRadar will discover and scan all key pages automatically.
            </p>
          </div>
        )}

        {/* Competitors */}
        <section>
          <h2 className="text-xs font-mono text-radar-text-muted tracking-widest uppercase mb-3">Tracked competitors</h2>
          {competitors.length === 0 ? (
            <div className="border border-dashed border-radar-border rounded-xl p-10 text-center">
              <p className="text-radar-text-muted text-sm">No competitors yet. Add your first one above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {competitors.map(c => {
                const isScanning = scanning === c.id
                const pageCount = c.monitored_pages?.[0]?.count ?? 0
                return (
                  <div key={c.id} className="border border-radar-border bg-radar-surface rounded-xl p-4 hover:border-radar-accent/30 transition-colors group">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0">
                        <Link href={`/dashboard/${c.id}`} className="font-semibold text-radar-text hover:text-radar-accent transition-colors truncate block">
                          {c.name}
                        </Link>
                        <a href={c.base_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-radar-text-muted hover:text-radar-accent transition-colors font-mono truncate block">
                          {c.base_url}
                        </a>
                      </div>
                      <button onClick={() => handleDelete(c.id)}
                        className="text-radar-text-muted hover:text-radar-warn transition-colors text-sm opacity-0 group-hover:opacity-100 flex-shrink-0">
                        ✕
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      {isScanning ? (
                        <span className="flex items-center gap-1.5 text-xs text-radar-accent font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-radar-accent animate-pulse-slow" />
                          Scanning…
                        </span>
                      ) : (
                        <span className="text-xs text-radar-text-muted font-mono">
                          {pageCount} page{pageCount !== 1 ? 's' : ''} monitored
                        </span>
                      )}
                      <Link href={`/dashboard/${c.id}`}
                        className="text-xs text-radar-accent hover:text-radar-accent-dim transition-colors font-mono">
                        View →
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Recent changes */}
        <section>
          <h2 className="text-xs font-mono text-radar-text-muted tracking-widest uppercase mb-3">Recent changes</h2>
          {changes.length === 0 ? (
            <div className="border border-dashed border-radar-border rounded-xl p-10 text-center">
              <p className="text-radar-text-muted text-sm">No changes detected yet. Scans run every 12 hours.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {changes.map(ch => (
                <div key={ch.id} className="border border-radar-border bg-radar-surface rounded-xl p-4 flex gap-4">
                  <div className="flex-shrink-0 pt-0.5">
                    <span className={`inline-block border rounded px-1.5 py-0.5 text-xs font-mono uppercase ${SEVERITY_COLOR[ch.severity] ?? SEVERITY_COLOR.low}`}>
                      {ch.severity}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Link href={`/dashboard/${ch.monitored_pages?.competitors?.id}`}
                        className="text-xs font-semibold text-radar-text hover:text-radar-accent transition-colors">
                        {ch.monitored_pages?.competitors?.name}
                      </Link>
                      <span className="text-xs text-radar-text-muted font-mono">{ch.monitored_pages?.page_type}</span>
                    </div>
                    <p className="text-sm text-radar-text-muted leading-relaxed">{ch.diff_summary}</p>
                  </div>
                  <div className="flex-shrink-0 text-xs text-radar-text-muted font-mono">
                    {timeAgo(ch.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
