import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { scrapePage } from '@/lib/scraper'
import { hashText, hasChanged, changeRatio, scoreSeverity, buildSummary } from '@/lib/diff'
import { generateAISummary } from '@/lib/ai'
import { sendAlertEmail } from '@/lib/email'

export const maxDuration = 60

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const results = { scanned: 0, changed: 0, errors: 0, emails_sent: 0 }

  try {
    const { data: pages, error } = await supabase
      .from('monitored_pages')
      .select(`id, url, page_type, competitor_id, competitors(id, name, user_id)`)

    if (error) throw error
    if (!pages || pages.length === 0) {
      return NextResponse.json({ message: 'No pages to scan', ...results })
    }

    const userChanges: Record<string, { email: string; competitorName: string; changes: Array<{ page_type: string; page_url: string; diff_summary: string; severity: string; created_at: string }> }[]> = {}

    for (const page of pages) {
      try {
        results.scanned++
        const { text, ok, error: scrapeError } = await scrapePage(page.url)
        if (!ok) { results.errors++; continue }

        const newHash = hashText(text)
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
          const ratio = changeRatio(lastSnapshot.raw_text, text)
          const competitor = Array.isArray(page.competitors) ? page.competitors[0] : page.competitors as any
          const competitorName = competitor?.name ?? 'Competitor'
          const userId = competitor?.user_id

          let summary = buildSummary(page.page_type, ratio, competitorName)
          let severity = scoreSeverity(page.page_type, ratio)

          const aiResult = await generateAISummary({
            competitorName, pageType: page.page_type, pageUrl: page.url,
            oldText: lastSnapshot.raw_text, newText: text,
          })
          if (aiResult) {
            summary = aiResult.summary + ' ' + aiResult.why_it_matters
            severity = aiResult.severity
          }

          await supabase.from('detected_changes').insert({
            monitored_page_id: page.id, diff_summary: summary, severity,
          })
          results.changed++

          if (userId) {
            const { data: userData } = await supabase.auth.admin.getUserById(userId)
            const email = userData?.user?.email
            if (email) {
              if (!userChanges[userId]) userChanges[userId] = []
              const existing = userChanges[userId].find(u => u.competitorName === competitorName)
              const changeEntry = { page_type: page.page_type, page_url: page.url, diff_summary: summary, severity, created_at: new Date().toISOString() }
              if (existing) { existing.changes.push(changeEntry) }
              else { userChanges[userId].push({ email, competitorName, changes: [changeEntry] }) }
            }
          }
        }

        if (changed) {
          await supabase.from('snapshots').insert({ monitored_page_id: page.id, raw_text: text, hash: newHash })
        }
        await supabase.from('monitored_pages').update({ last_checked_at: new Date().toISOString() }).eq('id', page.id)

      } catch (pageError) {
        results.errors++
      }
    }

    for (const userId in userChanges) {
      for (const entry of userChanges[userId]) {
        try {
          await sendAlertEmail({ toEmail: entry.email, competitorName: entry.competitorName, changes: entry.changes })
          results.emails_sent++
        } catch {}
      }
    }

    return NextResponse.json({ message: 'Scan complete', ...results })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
