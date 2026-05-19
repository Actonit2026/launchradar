import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { scrapePage } from '@/lib/scraper'
import { hashText, hasChanged, changeRatio, scoreSeverity, buildSummary } from '@/lib/diff'

// Vercel Cron calls GET /api/scan with Authorization: Bearer <CRON_SECRET>
export const maxDuration = 60

export async function GET(request: NextRequest) {
  // Auth check — allow cron secret OR manual trigger with same secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const results = { scanned: 0, changed: 0, errors: 0 }

  try {
    // Get all monitored pages with competitor info
    const { data: pages, error } = await supabase
      .from('monitored_pages')
      .select(`
        id,
        url,
        page_type,
        competitor_id,
        competitors(id, name, user_id)
      `)

    if (error) throw error
    if (!pages || pages.length === 0) {
      return NextResponse.json({ message: 'No pages to scan', ...results })
    }

    for (const page of pages) {
      try {
        results.scanned++

        // Scrape the page
        const { text, ok, error: scrapeError } = await scrapePage(page.url)
        if (!ok) {
          console.error(`Scrape failed for ${page.url}: ${scrapeError}`)
          results.errors++
          continue
        }

        const newHash = hashText(text)

        // Get latest snapshot for this page
        const { data: lastSnapshot } = await supabase
          .from('snapshots')
          .select('hash, raw_text')
          .eq('monitored_page_id', page.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        const isFirstScan = !lastSnapshot
        const changed = isFirstScan || hasChanged(lastSnapshot.hash, newHash)

        if (changed && !isFirstScan) {
          // Calculate how much changed
          const ratio = changeRatio(lastSnapshot.raw_text, text)
          const competitor = Array.isArray(page.competitors)
            ? page.competitors[0]
            : page.competitors as any
          const competitorName = competitor?.name ?? 'Competitor'
          const severity = scoreSeverity(page.page_type, ratio)
          const summary = buildSummary(page.page_type, ratio, competitorName)

          // Save change record
          await supabase.from('detected_changes').insert({
            monitored_page_id: page.id,
            diff_summary: summary,
            severity,
          })

          results.changed++
        }

        // Always save new snapshot (first scan or changed)
        if (changed) {
          await supabase.from('snapshots').insert({
            monitored_page_id: page.id,
            raw_text: text,
            hash: newHash,
          })
        }

        // Update last_checked_at
        await supabase
          .from('monitored_pages')
          .update({ last_checked_at: new Date().toISOString() })
          .eq('id', page.id)

      } catch (pageError) {
        console.error(`Error processing page ${page.url}:`, pageError)
        results.errors++
      }
    }

    return NextResponse.json({
      message: 'Scan complete',
      ...results,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// Allow manual POST trigger from dashboard
export async function POST(request: NextRequest) {
  return GET(request)
}
