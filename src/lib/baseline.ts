import type { SupabaseClient } from '@supabase/supabase-js'
import { scrapePage } from './scraper'
import { hashText } from './diff'
import { generateIntelligenceSnapshot, type IntelligenceSnapshot } from './ai'

interface Page {
  id: string
  url: string
  page_type: string
}

interface BaselineInput {
  competitorId: string
  competitorName: string
  baseUrl: string
  pages: Page[]
  userId: string
  supabase: SupabaseClient
}

export async function runBaselineScan(
  input: BaselineInput
): Promise<IntelligenceSnapshot & { id: string; created_at: string }> {
  const { competitorId, competitorName, baseUrl, pages, userId, supabase } = input

  const scrapedPages: Array<{ page_type: string; url: string; text: string }> = []

  // Scrape all pages in parallel — best effort, no failures break the pipeline
  await Promise.allSettled(
    pages.map(async (page) => {
      const { text, ok } = await scrapePage(page.url)
      if (!ok || !text) return

      const hash = hashText(text)

      // Save baseline snapshot — deliberately NO detected_changes created here
      await supabase.from('snapshots').insert({
        monitored_page_id: page.id,
        raw_text: text,
        hash,
      })

      await supabase
        .from('monitored_pages')
        .update({ last_checked_at: new Date().toISOString() })
        .eq('id', page.id)

      scrapedPages.push({ page_type: page.page_type, url: page.url, text })
    })
  )

  if (scrapedPages.length === 0) {
    throw new Error('No pages could be scraped for this competitor')
  }

  // Generate intelligence from all scraped content
  const intelligence = await generateIntelligenceSnapshot({
    competitorName,
    baseUrl,
    pages: scrapedPages,
  })

  // Persist the intelligence snapshot
  const { data, error } = await supabase
    .from('competitor_snapshots')
    .insert({ competitor_id: competitorId, user_id: userId, ...intelligence })
    .select()
    .single()

  if (error) throw error

  return data as IntelligenceSnapshot & { id: string; created_at: string }
}
