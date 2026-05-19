import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import DeleteCompetitorButton from '@/components/dashboard/DeleteCompetitorButton'
import BaselineScanner from './BaselineScanner'

interface Props {
  params: Promise<{ id: string }>
}

export default async function CompetitorDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: competitor, error } = await supabase
    .from('competitors')
    .select(`*, monitored_pages(*, detected_changes(*))`)
    .eq('id', id)
    .single()

  if (error || !competitor) notFound()

  const { data: snapshot } = await supabase
    .from('competitor_snapshots')
    .select('*')
    .eq('competitor_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const allChanges = competitor.monitored_pages
    .flatMap((p: any) => p.detected_changes.map((c: any) => ({
      ...c, page_type: p.page_type, page_url: p.url,
    })))
    .sort((a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

  const hasBeenScanned = competitor.monitored_pages.some((p: any) => p.last_checked_at)

  const severityColors: Record<string, string> = {
    high: 'text-red-400 bg-red-500/10 border-red-500/30',
    medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    low: 'text-radar-text-muted bg-radar-muted/20 border-radar-border',
  }

  return (
    <div className="animate-fade-in pt-14 md:pt-0">
      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard/competitors"
          className="text-radar-text-muted text-sm hover:text-radar-accent transition-colors">
          ← Back to competitors
        </Link>
        <div className="flex items-start justify-between mt-3 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-radar-text">{competitor.name}</h1>
            <a href={competitor.base_url} target="_blank" rel="noopener noreferrer"
              className="text-radar-text-muted text-sm font-mono hover:text-radar-accent transition-colors">
              {competitor.base_url} ↗
            </a>
          </div>
          <DeleteCompetitorButton id={competitor.id} name={competitor.name} />
        </div>
      </div>

      {/* State 1: Baseline scan in progress */}
      {!hasBeenScanned && <BaselineScanner competitorId={id} />}

      {/* State 2: Baseline done — show intelligence snapshot */}
      {hasBeenScanned && snapshot && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-radar-text">Initial competitor snapshot</h2>
              <p className="text-radar-text-muted text-xs mt-0.5">
                Baseline captured ·{' '}
                {new Date(snapshot.created_at).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </div>
            <span className="text-xs font-mono text-radar-accent border border-radar-accent/30 bg-radar-accent/5 px-2 py-1 rounded">
              {Math.round((snapshot.confidence_score ?? 0) * 100)}% confidence
            </span>
          </div>

          {/* Summary */}
          {snapshot.summary && (
            <div className="border border-radar-border bg-radar-surface rounded-lg p-4 mb-3">
              <p className="text-xs font-mono text-radar-text-muted uppercase tracking-widest mb-2">Overview</p>
              <p className="text-sm text-radar-text leading-relaxed">{snapshot.summary}</p>
            </div>
          )}

          {/* Intelligence cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <IntelCard title="Positioning" icon="◐">
              {snapshot.positioning
                ? <p className="text-sm text-radar-text">{snapshot.positioning}</p>
                : <p className="text-sm text-radar-text-muted italic">Not detected</p>}
            </IntelCard>

            <IntelCard title="Pricing" icon="◈">
              {snapshot.pricing_model && (
                <span className="inline-block text-xs font-mono bg-radar-bg border border-radar-border text-radar-accent px-2 py-0.5 rounded mb-2 capitalize">
                  {snapshot.pricing_model}
                </span>
              )}
              {snapshot.detected_pricing
                ? <p className="text-sm text-radar-text">{snapshot.detected_pricing}</p>
                : <p className="text-sm text-radar-text-muted italic">No pricing data found</p>}
            </IntelCard>

            <IntelCard title="Calls to action" icon="⊙">
              {snapshot.primary_cta ? (
                <div className="space-y-1">
                  <p className="text-sm text-radar-text">
                    <span className="text-radar-text-muted text-xs">Primary: </span>
                    {snapshot.primary_cta}
                  </p>
                  {snapshot.secondary_cta && (
                    <p className="text-sm text-radar-text">
                      <span className="text-radar-text-muted text-xs">Secondary: </span>
                      {snapshot.secondary_cta}
                    </p>
                  )}
                </div>
              ) : <p className="text-sm text-radar-text-muted italic">Not detected</p>}
            </IntelCard>

            <IntelCard title="Product signals" icon="⊞">
              {snapshot.feature_summary
                ? <p className="text-sm text-radar-text leading-relaxed">{snapshot.feature_summary}</p>
                : <p className="text-sm text-radar-text-muted italic">Not detected</p>}
              <p className="text-xs mt-2">
                <span className={snapshot.changelog_detected ? 'text-radar-accent' : 'text-radar-text-muted'}>
                  {snapshot.changelog_detected ? '◉ Changelog detected' : '○ No changelog found'}
                </span>
              </p>
            </IntelCard>
          </div>

          {/* Monitoring active banner */}
          {allChanges.length === 0 && (
            <div className="border border-radar-accent/20 bg-radar-accent/5 rounded-lg p-4 text-sm text-radar-text-muted">
              <span className="text-radar-accent font-mono mr-2">◉</span>
              Change tracking is active. You'll be alerted when this competitor updates pricing, messaging, or features.
            </div>
          )}
        </div>
      )}

      {/* Monitored pages grid */}
      {hasBeenScanned && (
        <div className="mb-8">
          <h2 className="text-base font-semibold text-radar-text mb-3">Monitored pages</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {competitor.monitored_pages.map((page: any) => (
              <div key={page.id} className="border border-radar-border bg-radar-surface rounded-lg p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono bg-radar-bg border border-radar-border text-radar-text-muted px-2 py-0.5 rounded uppercase tracking-widest">
                    {page.page_type}
                  </span>
                  <span className="text-xs text-radar-text-muted font-mono">
                    {page.detected_changes?.length ?? 0} changes
                  </span>
                </div>
                <p className="text-radar-text-muted text-xs font-mono mt-2 truncate">{page.url}</p>
                <p className="text-radar-text-muted text-xs mt-1">
                  {page.last_checked_at
                    ? `Last checked: ${new Date(page.last_checked_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                    : 'Not yet scanned'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Change history */}
      {allChanges.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-radar-text mb-3">Change history</h2>
          <div className="space-y-3">
            {allChanges.map((change: any) => (
              <div key={change.id} className="border border-radar-border bg-radar-surface rounded-lg p-4 flex items-start gap-4">
                <span className={`mt-0.5 flex-shrink-0 text-xs font-mono font-semibold border rounded px-1.5 py-0.5 uppercase tracking-widest ${severityColors[change.severity] ?? severityColors.low}`}>
                  {change.severity}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-radar-text-muted font-mono">{change.page_type}</p>
                  <p className="text-sm text-radar-text mt-0.5 leading-relaxed">{change.diff_summary}</p>
                  <p className="text-radar-text-muted text-xs font-mono mt-1">
                    {new Date(change.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function IntelCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="border border-radar-border bg-radar-surface rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-radar-accent font-mono text-sm">{icon}</span>
        <p className="text-xs font-mono text-radar-text-muted uppercase tracking-widest">{title}</p>
      </div>
      {children}
    </div>
  )
}
