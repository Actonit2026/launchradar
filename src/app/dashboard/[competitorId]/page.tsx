'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Competitor {
  id: string
  name: string
  base_url: string
  created_at: string
}

interface MonitoredPage {
  id: string
  url: string
  page_type: string
  last_checked_at: string | null
}

interface Snapshot {
  id: string
  summary: string | null
  pricing_model: string | null
  detected_pricing: string | null
  positioning: string | null
  primary_cta: string | null
  secondary_cta: string | null
  feature_summary: string | null
  changelog_detected: boolean
  confidence_score: number
  pages_discovered: number
  warnings: string[]
  created_at: string
}

interface Change {
  id: string
  diff_summary: string
  severity: 'low' | 'medium' | 'high'
  created_at: string
  monitored_pages: { url: string; page_type: string }
}

const SEVERITY_COLOR = {
  high: 'text-radar-warn border-radar-warn/30 bg-radar-warn/10',
  medium: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
  low: 'text-radar-text-muted border-radar-border bg-radar-surface',
}

const PAGE_ICON: Record<string, string> = {
  homepage: '◎',
  pricing: '◈',
  features: '⊞',
  changelog: '⊙',
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(h / 24)
  if (d > 0) return `${d}d ago`
  if (h > 0) return `${h}h ago`
  return 'just now'
}

function ConfidenceBar({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const color = pct >= 60 ? 'bg-radar-accent' : pct >= 35 ? 'bg-yellow-400' : 'bg-radar-warn'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-radar-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-radar-text-muted">{pct}%</span>
    </div>
  )
}

export default function CompetitorDetailPage() {
  const params = useParams()
  const router = useRouter()
  const competitorId = params.competitorId as string

  const [competitor, setCompetitor] = useState<Competitor | null>(null)
  const [pages, setPages] = useState<MonitoredPage[]>([])
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [changes, setChanges] = useState<Change[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)

  const supabase = createClient()

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const [{ data: comp }, { data: pgs }, { data: snaps }, { data: chgs }] = await Promise.all([
      supabase.from('competitors').select('*').eq('id', competitorId).eq('user_id', user.id).single(),
      supabase.from('monitored_pages').select('*').eq('competitor_id', competitorId).order('page_type'),
      supabase.from('competitor_snapshots').select('*').eq('competitor_id', competitorId).order('created_at', { ascending: false }).limit(1),
      supabase.from('detected_changes')
        .select('*, monitored_pages(url, page_type)')
        .in('monitored_page_id', (await supabase.from('monitored_pages').select('id').eq('competitor_id', competitorId)).data?.map(p => p.id) ?? [])
        .order('created_at', { ascending: false })
        .limit(50),
    ])

    if (!comp) { router.push('/dashboard'); return }
    setCompetitor(comp)
    setPages((pgs ?? []) as MonitoredPage[])
    setSnapshot((snaps?.[0] ?? null) as Snapshot | null)
    setChanges((chgs ?? []) as Change[])
    setLoading(false)
  }, [supabase, router, competitorId])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleRescan() {
    setScanning(true)
    setScanError(null)
    const res = await fetch('/api/baseline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ competitor_id: competitorId }),
    })
    if (!res.ok) {
      const d = await res.json()
      setScanError(d.error ?? 'Scan failed')
    } else {
      fetchData()
    }
    setScanning(false)
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

  if (!competitor) return null

  return (
    <div className="min-h-screen bg-radar-bg">
      {/* Nav */}
      <nav className="border-b border-radar-border bg-radar-bg/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/dashboard" className="text-radar-text-muted hover:text-radar-text transition-colors text-sm">← Dashboard</Link>
          <span className="text-radar-border">/</span>
          <span className="text-radar-text font-semibold">{competitor.name}</span>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-radar-text">{competitor.name}</h1>
            <a href={competitor.base_url} target="_blank" rel="noopener noreferrer"
              className="text-sm text-radar-accent hover:text-radar-accent-dim font-mono transition-colors">
              {competitor.base_url} ↗
            </a>
          </div>
          <button
            onClick={handleRescan}
            disabled={scanning}
            className="border border-radar-border bg-radar-surface hover:border-radar-accent/50 text-radar-text text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 flex-shrink-0"
          >
            {scanning ? (
              <><span className="w-1.5 h-1.5 rounded-full bg-radar-accent animate-pulse-slow" /> Scanning…</>
            ) : '⟳ Re-scan'}
          </button>
        </div>

        {scanError && (
          <div className="border border-radar-warn/30 bg-radar-warn/10 rounded-lg px-4 py-3 text-sm text-radar-warn">
            {scanError}
          </div>
        )}

        {/* Intelligence snapshot */}
        {snapshot ? (
          <div className="border border-radar-border bg-radar-surface rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-mono text-radar-text-muted tracking-widest uppercase">Intelligence snapshot</h2>
              <span className="text-xs text-radar-text-muted font-mono">{timeAgo(snapshot.created_at)}</span>
            </div>

            {snapshot.summary && (
              <p className="text-sm text-radar-text leading-relaxed border-l-2 border-radar-accent pl-3">
                {snapshot.summary}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {snapshot.detected_pricing && (
                <div className="bg-radar-bg rounded-lg p-3">
                  <div className="text-xs font-mono text-radar-text-muted mb-1">PRICING</div>
                  <div className="text-sm text-radar-text font-semibold">{snapshot.detected_pricing}</div>
                  {snapshot.pricing_model && <div className="text-xs text-radar-text-muted mt-0.5">{snapshot.pricing_model}</div>}
                </div>
              )}
              {snapshot.positioning && (
                <div className="bg-radar-bg rounded-lg p-3">
                  <div className="text-xs font-mono text-radar-text-muted mb-1">POSITIONING</div>
                  <div className="text-sm text-radar-text">{snapshot.positioning}</div>
                </div>
              )}
              {snapshot.primary_cta && (
                <div className="bg-radar-bg rounded-lg p-3">
                  <div className="text-xs font-mono text-radar-text-muted mb-1">PRIMARY CTA</div>
                  <div className="text-sm text-radar-text">{snapshot.primary_cta}</div>
                  {snapshot.secondary_cta && <div className="text-xs text-radar-text-muted mt-0.5">{snapshot.secondary_cta}</div>}
                </div>
              )}
              {snapshot.feature_summary && (
                <div className="bg-radar-bg rounded-lg p-3">
                  <div className="text-xs font-mono text-radar-text-muted mb-1">KEY FEATURES</div>
                  <div className="text-sm text-radar-text">{snapshot.feature_summary}</div>
                </div>
              )}
            </div>

            <div>
              <div className="text-xs font-mono text-radar-text-muted mb-1.5">DATA CONFIDENCE</div>
              <ConfidenceBar score={snapshot.confidence_score} />
            </div>

            {snapshot.warnings?.length > 0 && (
              <div className="space-y-1">
                {snapshot.warnings.map((w, i) => (
                  <p key={i} className="text-xs text-radar-text-muted font-mono">⚠ {w}</p>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="border border-dashed border-radar-border rounded-xl p-8 text-center">
            <p className="text-radar-text-muted text-sm">No scan data yet. Click Re-scan to run a baseline scan.</p>
          </div>
        )}

        {/* Monitored pages */}
        {pages.length > 0 && (
          <section>
            <h2 className="text-xs font-mono text-radar-text-muted tracking-widest uppercase mb-3">Monitored pages</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {pages.map(p => (
                <div key={p.id} className="border border-radar-border bg-radar-surface rounded-lg p-3 flex items-center gap-3">
                  <span className="text-radar-accent font-mono">{PAGE_ICON[p.page_type] ?? '◦'}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-mono text-radar-text-muted uppercase">{p.page_type}</div>
                    <a href={p.url} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-radar-text hover:text-radar-accent transition-colors truncate block font-mono">
                      {p.url}
                    </a>
                  </div>
                  {p.last_checked_at && (
                    <span className="text-xs text-radar-text-muted font-mono flex-shrink-0">{timeAgo(p.last_checked_at)}</span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Changes history */}
        <section>
          <h2 className="text-xs font-mono text-radar-text-muted tracking-widest uppercase mb-3">
            Change history {changes.length > 0 && <span className="text-radar-text">({changes.length})</span>}
          </h2>
          {changes.length === 0 ? (
            <div className="border border-dashed border-radar-border rounded-xl p-8 text-center">
              <p className="text-radar-text-muted text-sm">No changes detected yet.</p>
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
                    <div className="text-xs text-radar-text-muted font-mono mb-1">{ch.monitored_pages?.page_type} · {ch.monitored_pages?.url}</div>
                    <p className="text-sm text-radar-text-muted leading-relaxed">{ch.diff_summary}</p>
                  </div>
                  <div className="flex-shrink-0 text-xs text-radar-text-muted font-mono">{timeAgo(ch.created_at)}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
