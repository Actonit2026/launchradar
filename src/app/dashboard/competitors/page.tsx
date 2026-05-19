import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function CompetitorsPage() {
  const supabase = await createClient()

  const { data: competitors, error } = await supabase
    .from('competitors')
    .select(`
      *,
      monitored_pages(id, page_type, last_checked_at)
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="animate-fade-in pt-14 md:pt-0">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-radar-text">Competitors</h1>
          <p className="text-radar-text-muted text-sm mt-1">
            {competitors?.length ?? 0} tracked
          </p>
        </div>
        <Link
          href="/dashboard/competitors/new"
          className="bg-radar-accent text-radar-bg font-semibold px-4 py-2 rounded-lg hover:bg-radar-accent-dim transition-colors text-sm"
        >
          + Add competitor
        </Link>
      </div>

      {error && (
        <div className="border border-red-500/30 bg-red-500/10 rounded-lg p-4 text-red-400 text-sm mb-6">
          {error.message}
        </div>
      )}

      {!competitors || competitors.length === 0 ? (
        <div className="border border-dashed border-radar-border rounded-xl p-12 text-center">
          <div className="text-4xl mb-4 text-radar-text-muted">⊞</div>
          <h2 className="text-lg font-semibold text-radar-text mb-2">
            No competitors yet
          </h2>
          <p className="text-radar-text-muted text-sm mb-6 max-w-sm mx-auto">
            Add a competitor URL and we&apos;ll discover their key pages and
            start monitoring them automatically.
          </p>
          <Link
            href="/dashboard/competitors/new"
            className="inline-block bg-radar-accent text-radar-bg font-semibold px-5 py-2.5 rounded-lg hover:bg-radar-accent-dim transition-colors text-sm"
          >
            Add first competitor →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {competitors.map(c => (
            <div
              key={c.id}
              className="border border-radar-border bg-radar-surface rounded-lg p-5 hover:border-radar-accent/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-radar-text">{c.name}</h3>
                  <a
                    href={c.base_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-radar-text-muted text-sm font-mono hover:text-radar-accent transition-colors"
                  >
                    {c.base_url}
                  </a>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {c.monitored_pages?.map((p: any) => (
                      <span
                        key={p.id}
                        className="text-xs font-mono bg-radar-bg border border-radar-border text-radar-text-muted px-2 py-0.5 rounded"
                      >
                        {p.page_type}
                      </span>
                    ))}
                    {(!c.monitored_pages || c.monitored_pages.length === 0) && (
                      <span className="text-xs text-radar-text-muted">
                        No pages monitored yet
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link
                    href={`/dashboard/competitors/${c.id}`}
                    className="text-xs text-radar-text-muted hover:text-radar-accent transition-colors px-3 py-1.5 border border-radar-border rounded hover:border-radar-accent/30"
                  >
                    View →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
