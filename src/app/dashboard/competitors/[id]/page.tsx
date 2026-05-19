import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import DeleteCompetitorButton from '@/components/dashboard/DeleteCompetitorButton'

interface Props {
  params: Promise<{ id: string }>
}

export default async function CompetitorDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: competitor, error } = await supabase
    .from('competitors')
    .select(`
      *,
      monitored_pages(
        *,
        detected_changes(*)
      )
    `)
    .eq('id', id)
    .single()

  if (error || !competitor) notFound()

  const allChanges = competitor.monitored_pages
    .flatMap((p: any) =>
      p.detected_changes.map((c: any) => ({
        ...c,
        page_type: p.page_type,
        page_url: p.url,
      }))
    )
    .sort((a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

  const severityColors: Record<string, string> = {
    high: 'text-red-400 bg-red-500/10 border-red-500/30',
    medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    low: 'text-radar-text-muted bg-radar-muted/20 border-radar-border',
  }

  return (
    <div className="animate-fade-in pt-14 md:pt-0">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/competitors"
          className="text-radar-text-muted text-sm hover:text-radar-accent transition-colors"
        >
          ← Back to competitors
        </Link>
        <div className="flex items-start justify-between mt-3 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-radar-text">{competitor.name}</h1>
            <a
              href={competitor.base_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-radar-text-muted text-sm font-mono hover:text-radar-accent transition-colors"
            >
              {competitor.base_url} ↗
            </a>
          </div>
          <DeleteCompetitorButton id={competitor.id} name={competitor.name} />
        </div>
      </div>

      {/* Monitored pages */}
      <div className="mb-8">
        <h2 className="text-base font-semibold text-radar-text mb-3">Monitored pages</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {competitor.monitored_pages.map((page: any) => (
            <div
              key={page.id}
              className="border border-radar-border bg-radar-surface rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono bg-radar-bg border border-radar-border text-radar-text-muted px-2 py-0.5 rounded uppercase tracking-widest">
                  {page.page_type}
                </span>
                <span className="text-xs text-radar-text-muted font-mono">
                  {page.detected_changes?.length ?? 0} changes
                </span>
              </div>
              <p className="text-radar-text-muted text-xs font-mono mt-2 truncate">
                {page.url}
              </p>
              {page.last_checked_at ? (
                <p className="text-radar-text-muted text-xs mt-1">
                  Last checked:{' '}
                  {new Date(page.last_checked_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              ) : (
                <p className="text-radar-text-muted text-xs mt-1">Not yet scanned</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Change history */}
      <div>
        <h2 className="text-base font-semibold text-radar-text mb-3">Change history</h2>
        {allChanges.length === 0 ? (
          <div className="border border-dashed border-radar-border rounded-lg p-8 text-center">
            <div className="text-2xl mb-2 text-radar-text-muted">◎</div>
            <p className="text-radar-text-muted text-sm">
              No changes detected yet. Pages are scanned every 12 hours.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {allChanges.map((change: any) => (
              <div
                key={change.id}
                className="border border-radar-border bg-radar-surface rounded-lg p-4 flex items-start gap-4"
              >
                <span
                  className={`mt-0.5 flex-shrink-0 text-xs font-mono font-semibold border rounded px-1.5 py-0.5 uppercase tracking-widest ${severityColors[change.severity] ?? severityColors.low}`}
                >
                  {change.severity}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-radar-text-muted font-mono">
                    {change.page_type}
                  </p>
                  <p className="text-sm text-radar-text mt-0.5 leading-relaxed">
                    {change.diff_summary}
                  </p>
                  <p className="text-radar-text-muted text-xs font-mono mt-1">
                    {new Date(change.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
