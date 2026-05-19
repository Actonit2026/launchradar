import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import DeleteCompetitorButton from '@/components/dashboard/DeleteCompetitorButton'
import BaselineScanner from './BaselineScanner'
import type { Confidence } from '@/lib/extractor'

interface Props { params: Promise<{ id: string }> }

const SEVERITY_COLORS: Record<string, string> = {
  high: 'text-red-400 bg-red-500/10 border-red-500/30',
  medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  low: 'text-radar-text-muted bg-radar-muted/20 border-radar-border',
}

const CONFIDENCE_BADGE: Record<Confidence, { label: string; class: string }> = {
  high:        { label: 'High confidence',   class: 'text-radar-accent border-radar-accent/30 bg-radar-accent/5' },
  medium:      { label: 'Medium confidence', class: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/5' },
  low:         { label: 'Low confidence',    class: 'text-radar-text-muted border-radar-border bg-radar-muted/20' },
  unavailable: { label: 'Unavailable',       class: 'text-radar-text-muted border-radar-border bg-radar-muted/20' },
}

export default async function CompetitorDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: competitor, error } = await supabase
    .from('competitors')
    .select('*, monitored_pages(*, detected_changes(*))')
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
    .flatMap((p: any) => p.detected_changes.map((c: any) => ({ ...c, page_type: p.page_type, page_url: p.url })))
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const hasBeenScanned = competitor.monitored_pages.some((p: any) => p.last_checked_at)

  const rawIntel = snapshot?.raw_intelligence as Record<string, any> | null
  const pricingConfidence: Confidence = (rawIntel?.selected_pricing?.pricing_confidence as Confidence) ?? 'unavailable'
  const positioningConf: Confidence = (rawIntel?.positioning_data?.confidence as Confidence) ?? 'unavailable'
  const featureCount = (rawIntel?.features_raw as any[])?.length ?? 0
  const scanWarnings = (snapshot?.warnings as string[] | null) ?? []

  return (
    <div className="animate-fade-in pt-14 md:pt-0">
      <div className="mb-8">
        <Link href="/dashboard/competitors" className="text-radar-text-muted text-sm hover:text-radar-accent transition-colors">
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

      {!hasBeenScanned && <BaselineScanner competitorId={id} />}

      {hasBeenScanned && snapshot && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-radar-text">Intelligence snapshot</h2>
              <p className="text-radar-text-muted text-xs mt-0.5">
                {snapshot.pages_discovered ?? competitor.monitored_pages.length} pages discovered ·{' '}
                {new Date(snapshot.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <span className="text-xs font-mono text-radar-accent border border-radar-accent/30 bg-radar-accent/5 px-2 py-1 rounded">
              {Math.round((snapshot.confidence_score ?? 0) * 100)}% confidence
            </span>
          </div>

          {scanWarnings.length > 0 && (
            <div className="border border-yellow-500/20 bg-yellow-500/5 rounded-lg p-3 mb-4">
              <p className="text-xs font-mono text-yellow-400 mb-1">Scan notes</p>
              {scanWarnings.map((w: string, i: number) => (
                <p key={i} className="text-xs text-radar-text-muted">· {w}</p>
              ))}
            </div>
          )}

          {snapshot.summary && (
            <div className="border border-radar-border bg-radar-surface rounded-lg p-4 mb-3">
              <p className="text-xs font-mono text-radar-text-muted uppercase tracking-widest mb-2">Overview</p>
              <p className="text-sm text-radar-text leading-relaxed">{snapshot.summary}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <IntelCard title="Positioning" icon="◐" confidence={positioningConf} source={rawIntel?.positioning_data?.source_url}>
              {snapshot.positioning && positioningConf !== 'unavailable' ? (
                <div>
                  <p className="text-sm text-radar-text font-medium">{snapshot.positioning}</p>
                  {rawIntel?.positioning_data?.subheadline && (
                    <p className="text-xs text-radar-text-muted mt-1">{rawIntel.positioning_data.subheadline}</p>
                  )}
                  {rawIntel?.positioning_data?.main_value_prop && (
                    <p className="text-xs text-radar-text-muted mt-1 italic">{rawIntel.positioning_data.main_value_prop}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-radar-text-muted italic">
                  {positioningConf === 'low' ? 'Positioning unclear from homepage' : 'Not detected'}
                </p>
              )}
            </IntelCard>

            <IntelCard title="Pricing" icon="◈" confidence={pricingConfidence} source={rawIntel?.selected_pricing?.evidence?.source_url}>
              {snapshot.pricing_model && (
                <span className="inline-block text-xs font-mono bg-radar-bg border border-radar-border text-radar-accent px-2 py-0.5 rounded mb-2 capitalize">
                  {snapshot.pricing_model}
                </span>
              )}
              {snapshot.detected_pricing && pricingConfidence !== 'low' && pricingConfidence !== 'unavailable' ? (
                <div>
                  <p className="text-sm text-radar-text font-medium">{snapshot.detected_pricing}</p>
                  {rawIntel?.selected_pricing?.evidence?.raw_text && (
                    <p className="text-xs text-radar-text-muted mt-1 font-mono">&ldquo;{rawIntel.selected_pricing.evidence.raw_text}&rdquo;</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-radar-text-muted italic">
                  {pricingConfidence === 'low' ? 'Pricing unclear — low confidence data' : 'No public pricing detected'}
                </p>
              )}
            </IntelCard>

            <IntelCard title="Calls to action" icon="⊙" confidence={snapshot.primary_cta ? 'medium' : 'unavailable'}>
              {snapshot.primary_cta ? (
                <div className="space-y-1.5">
                  <p className="text-sm text-radar-text"><span className="text-radar-text-muted text-xs mr-1">Primary:</span>{snapshot.primary_cta}</p>
                  {snapshot.secondary_cta && (
                    <p className="text-sm text-radar-text"><span className="text-radar-text-muted text-xs mr-1">Secondary:</span>{snapshot.secondary_cta}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-radar-text-muted italic">Not detected</p>
              )}
            </IntelCard>

            <IntelCard title="Product signals" icon="⊞" confidence={featureCount >= 3 ? 'medium' : featureCount > 0 ? 'low' : 'unavailable'}>
              {snapshot.feature_summary && featureCount >= 3 ? (
                <p className="text-sm text-radar-text leading-relaxed">{snapshot.feature_summary}</p>
              ) : (
                <p className="text-sm text-radar-text-muted italic">Not enough feature data detected</p>
              )}
              <p className="text-xs mt-2">
                <span className={snapshot.changelog_detected ? 'text-radar-accent' : 'text-radar-text-muted'}>
                  {snapshot.changelog_detected ? '◉ Changelog detected' : '○ No changelog found'}
                </span>
              </p>
            </IntelCard>
          </div>

          {allChanges.length === 0 && (
            <div className="border border-radar-accent/20 bg-radar-accent/5 rounded-lg p-4 text-sm text-radar-text-muted">
              <span className="text-radar-accent font-mono mr-2">◉</span>
              Change tracking is active. You'll be alerted when this competitor updates pricing, messaging, or features.
            </div>
          )}
        </div>
      )}

      {hasBeenScanned && (
        <div className="mb-8">
          <h2 className="text-base font-semibold text-radar-text mb-3">Monitored pages</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {competitor.monitored_pages.map((page: any) => (
              <div key={page.id} className="border border-radar-border bg-radar-surface rounded-lg p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono bg-radar-bg border border-radar-border text-radar-text-muted px-2 py-0.5 rounded uppercase tracking-widest">{page.page_type}</span>
                  <span className="text-xs text-radar-text-muted font-mono">{page.detected_changes?.length ?? 0} changes</span>
                </div>
                <p className="text-radar-text-muted text-xs font-mono mt-2 truncate">{page.url}</p>
                <p className="text-radar-text-muted text-xs mt-1">
                  {page.last_checked_at
                    ? `Checked: ${new Date(page.last_checked_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                    : 'Pending'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {allChanges.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-radar-text mb-3">Change history</h2>
          <div className="space-y-3">
            {allChanges.map((change: any) => (
              <div key={change.id} className="border border-radar-border bg-radar-surface rounded-lg p-4 flex items-start gap-4">
                <span className={`mt-0.5 flex-shrink-0 text-xs font-mono font-semibold border rounded px-1.5 py-0.5 uppercase tracking-widest ${SEVERITY_COLORS[change.severity] ?? SEVERITY_COLORS.low}`}>
                  {change.severity}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-radar-text-muted font-mono">{change.page_type}</p>
                  <p className="text-sm text-radar-text mt-0.5 leading-relaxed">{change.diff_summary}</p>
                  <p className="text-radar-text-muted text-xs font-mono mt-1">
                    {new Date(change.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
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

function IntelCard({ title, icon, confidence, source, children }: {
  title: string; icon: string; confidence: Confidence; source?: string; children: React.ReactNode
}) {
  const badge = CONFIDENCE_BADGE[confidence]
  return (
    <div className="border border-radar-border bg-radar-surface rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-radar-accent font-mono text-sm">{icon}</span>
          <p className="text-xs font-mono text-radar-text-muted uppercase tracking-widest">{title}</p>
        </div>
        <span className={`text-xs font-mono border rounded px-1.5 py-0.5 ${badge.class}`}>{badge.label}</span>
      </div>
      {children}
      {source && (
        <a href={source} target="_blank" rel="noopener noreferrer"
          className="block text-xs text-radar-text-muted hover:text-radar-accent font-mono mt-2 truncate transition-colors">
          Source: {source}
        </a>
      )}
    </div>
  )
}
