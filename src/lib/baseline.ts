import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchHtml } from './scraper'
import { discoverPages } from './discovery'
import {
  extractFromPage,
  selectBestPricing,
  type PricingCandidate,
  type ExtractedPositioning,
  type ExtractedChangelog,
} from './extractor'
import { summarizeStructuredIntelligence } from './ai'
import { hashText } from './diff'
import * as cheerio from 'cheerio'

interface BaselineInput {
  competitorId: string
  competitorName: string
  baseUrl: string
  userId: string
  supabase: SupabaseClient
}

export async function runBaselineScan(input: BaselineInput) {
  const { competitorId, competitorName, baseUrl, userId, supabase } = input

  const warnings: string[] = []
  const errors: string[] = []
  const debug: Record<string, unknown> = {
    pages_discovered: [],
    pages_crawled: [],
    pricing_candidates: [],
    selected_pricing: null,
    positioning_data: null,
    features_raw: [],
    changelog_data: null,
    ai_input: null,
    ai_output: null,
    warnings,
    errors,
  }

  const { html: homepageHtml, ok: homepageOk, error: homepageError } = await fetchHtml(baseUrl)
  if (!homepageOk || !homepageHtml) {
    throw new Error(`Cannot reach ${baseUrl}: ${homepageError ?? 'Unknown error'}`)
  }

  const discoveredPages = await discoverPages(baseUrl, homepageHtml)
  debug.pages_discovered = discoveredPages

  const { data: savedPages, error: pagesError } = await supabase
    .from('monitored_pages')
    .insert(discoveredPages.map(p => ({
      competitor_id: competitorId,
      url: p.url,
      page_type: p.page_type,
    })))
    .select()

  if (pagesError) throw pagesError

  const allPricingCandidates: PricingCandidate[] = []
  let bestPositioning: ExtractedPositioning | null = null
  const allFeatures: Array<{
    name: string
    description: string | null
    source_url: string
    evidence_text: string
    confidence: number
  }> = []
  let changelogResult: ExtractedChangelog = {
    detected: false,
    changelog_url: null,
    last_visible_update_date: null,
    confidence: 'unavailable',
    evidence_text: null,
  }
  const crawledPages: { url: string; page_type: string; status: string; error?: string }[] = []

  for (const page of discoveredPages) {
    let html = page.page_type === 'homepage' ? homepageHtml : ''

    if (page.page_type !== 'homepage') {
      const { html: fetchedHtml, ok, error } = await fetchHtml(page.url)
      if (!ok || !fetchedHtml) {
        crawledPages.push({ url: page.url, page_type: page.page_type, status: 'failed', error: error ?? 'Unknown' })
        warnings.push(`Failed to fetch ${page.url}: ${error}`)
        continue
      }
      html = fetchedHtml
    }

    crawledPages.push({ url: page.url, page_type: page.page_type, status: 'success' })

    const savedPage = savedPages?.find((p: { url: string }) => p.url === page.url)
    if (savedPage) {
      const $ = cheerio.load(html)
      const text = $('body').text().replace(/\s+/g, ' ').trim().toLowerCase().substring(0, 50_000)
      const hash = hashText(text)
      await supabase.from('snapshots').insert({ monitored_page_id: savedPage.id, raw_text: text, hash })
      await supabase.from('monitored_pages').update({ last_checked_at: new Date().toISOString() }).eq('id', savedPage.id)
    }

    const extraction = extractFromPage(html, page.url, page.page_type)

    if (extraction.pricing_candidates.length > 0) {
      allPricingCandidates.push(...extraction.pricing_candidates)
      ;(debug.pricing_candidates as unknown[]).push(...extraction.pricing_candidates)
    }
    if (extraction.positioning && !bestPositioning) {
      bestPositioning = extraction.positioning
      debug.positioning_data = extraction.positioning
    }
    if (extraction.features.length > 0) {
      allFeatures.push(...extraction.features)
      ;(debug.features_raw as unknown[]).push(...extraction.features)
    }
    if (extraction.changelog.detected) {
      changelogResult = extraction.changelog
      debug.changelog_data = extraction.changelog
    }
  }

  debug.pages_crawled = crawledPages

  const { detected_pricing, pricing_confidence, pricing_model_hint, evidence: pricingEvidence } =
    selectBestPricing(allPricingCandidates)
  debug.selected_pricing = { detected_pricing, pricing_confidence, evidence: pricingEvidence }

  const seenNames = new Set<string>()
  const uniqueFeatures = allFeatures.filter(f => {
    if (seenNames.has(f.name.toLowerCase())) return false
    seenNames.add(f.name.toLowerCase())
    return true
  }).slice(0, 12)

  if (!bestPositioning) warnings.push('Homepage positioning could not be extracted')
  if (!detected_pricing) warnings.push(`No reliable pricing found (confidence: ${pricing_confidence})`)
  if (uniqueFeatures.length < 3) warnings.push(`Only ${uniqueFeatures.length} features detected with confidence`)
  if (discoveredPages.length < 2) warnings.push('Could only discover homepage — limited intelligence available')

  const aiInput = {
    competitorName,
    baseUrl,
    pricing: {
      detected_pricing,
      pricing_confidence,
      pricing_model_hint,
      evidence_text: pricingEvidence?.raw_text ?? null,
    },
    positioning: {
      headline: bestPositioning?.homepage_headline ?? null,
      subheadline: bestPositioning?.subheadline ?? null,
      main_value_prop: bestPositioning?.main_value_prop ?? null,
      primary_cta: bestPositioning?.primary_cta ?? null,
      secondary_cta: bestPositioning?.secondary_cta ?? null,
      confidence: bestPositioning?.confidence ?? 'unavailable',
    },
    features: uniqueFeatures.slice(0, 8).map(f => ({ name: f.name, description: f.description })),
    changelog: {
      detected: changelogResult.detected,
      last_date: changelogResult.last_visible_update_date,
      confidence: changelogResult.confidence,
    },
    pages_analyzed: discoveredPages.map(p => p.url),
    warnings,
  }

  debug.ai_input = aiInput
  const resolvedPositioning = bestPositioning as unknown as ExtractedPositioning | null
  const aiSummary = await summarizeStructuredIntelligence(aiInput)
  debug.ai_output = aiSummary

  const { data: snapshot, error: snapshotError } = await supabase
    .from('competitor_snapshots')
    .insert({
      competitor_id: competitorId,
      user_id: userId,
      summary: aiSummary.summary,
      pricing_model: pricing_model_hint,
      detected_pricing: aiSummary.pricing_summary ?? detected_pricing,
      positioning: aiSummary.positioning_summary ?? resolvedPositioning?.homepage_headline,
      primary_cta: resolvedPositioning?.primary_cta,
      secondary_cta: resolvedPositioning?.secondary_cta,
      feature_summary: aiSummary.feature_summary,
      changelog_detected: changelogResult.detected,
      confidence_score: aiSummary.confidence_score,
      raw_intelligence: debug,
      warnings: aiSummary.warnings,
      pages_discovered: discoveredPages.length,
    })
    .select()
    .single()

  if (snapshotError) throw snapshotError
  return snapshot
}
