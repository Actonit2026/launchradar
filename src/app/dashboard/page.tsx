import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch competitor count
  const { count: competitorCount } = await supabase
    .from('competitors')
    .select('*', { count: 'exact', head: true })

  // Fetch recent changes
  const { data: recentChanges } = await supabase
    .from('detected_changes')
    .select(`
      *,
      monitored_page:monitored_pages(
        url,
        page_type,
        competitor:competitors(name)
      )
    `)
    .order('created_at', { ascending: false })
    .limit(5)

  const hasCompetitors = (competitorCount ?? 0) > 0

  return (
    <div className="animate-fade-in mt-0 md:mt-0 pt-14 md:pt-0">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-radar-text">Overview</h1>
        <p className="text-radar-text-muted text-sm mt-1">
          {user?.email} ·{' '}
          <span className="font-mono text-radar-accent">
            {competitorCount ?? 0}
          </span>{' '}
          competitor{competitorCount !== 1 ? 's' : ''} tracked
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Competitors" value={String(competitorCount ?? 0)} />
        <StatCard label="Pages monitored" value="—" />
        <StatCard label="Changes detected" value="—" />
        <StatCard label="Last scan" value="—" />
      </div>

      {/* Empty state or recent changes */}
      {!hasCompetitors ? (
        <div className="border border-dashed border-radar-border rounded-xl p-12 text-center">
          <div className="text-4xl mb-4 text-radar-text-muted">◎</div>
          <h2 className="text-lg font-semibold text-radar-text mb-2">
            No competitors tracked yet
          </h2>
          <p className="text-radar-text-muted text-sm mb-6">
            Add your first competitor and LaunchRadar will start monitoring
            their pages immediately.
          </p>
          <Link
            href="/dashboard/competitors"
            className="inline-block bg-radar-accent text-radar-bg font-semibold px-5 py-2.5 rounded-lg hover:bg-radar-accent-dim transition-colors text-sm"
          >
            Add competitor →
          </Link>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-radar-text">
              Recent changes
            </h2>
            <Link
              href="/dashboard/competitors"
              className="text-sm text-radar-accent hover:text-radar-accent-dim transition-colors"
            >
              Manage competitors →
            </Link>
          </div>

          {recentChanges && recentChanges.length > 0 ? (
            <div className="space-y-3">
              {recentChanges.map(change => (
                <ChangeCard key={change.id} change={change} />
              ))}
            </div>
          ) : (
            <div className="border border-radar-border rounded-lg p-6 text-center text-radar-text-muted text-sm">
              No changes detected yet. Scans run every 12 hours.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-radar-border bg-radar-surface rounded-lg p-4">
      <p className="text-radar-text-muted text-xs font-mono uppercase tracking-widest mb-1">
        {label}
      </p>
      <p className="text-2xl font-bold text-radar-text font-mono">{value}</p>
    </div>
  )
}

function ChangeCard({ change }: { change: any }) {
  const severityColors: Record<string, string> = {
    high: 'text-red-400 bg-red-500/10 border-red-500/30',
    medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    low: 'text-radar-text-muted bg-radar-muted/20 border-radar-border',
  }

  const colorClass = severityColors[change.severity] ?? severityColors.low
  const competitorName = change.monitored_page?.competitor?.name ?? 'Unknown'
  const pageType = change.monitored_page?.page_type ?? ''

  return (
    <div className="border border-radar-border bg-radar-surface rounded-lg p-4 flex items-start gap-4">
      <span
        className={`mt-0.5 flex-shrink-0 text-xs font-mono font-semibold border rounded px-1.5 py-0.5 uppercase tracking-widest ${colorClass}`}
      >
        {change.severity}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-radar-text">
          <span className="font-semibold">{competitorName}</span>
          {pageType && (
            <span className="text-radar-text-muted"> · {pageType}</span>
          )}
        </p>
        <p className="text-radar-text-muted text-sm mt-0.5 leading-relaxed">
          {change.diff_summary}
        </p>
        <p className="text-radar-text-muted text-xs font-mono mt-1">
          {new Date(change.created_at).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  )
}
