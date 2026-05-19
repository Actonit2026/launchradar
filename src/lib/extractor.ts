import * as cheerio from 'cheerio'

export type Confidence = 'high' | 'medium' | 'low' | 'unavailable'

export interface PricingCandidate {
  amount: number
  currency: string
  billing_period: string | null
  raw_text: string
  surrounding_context: string
  confidence: number
  source_url: string
}

export interface ExtractedPositioning {
  homepage_headline: string | null
  subheadline: string | null
  target_customer: string | null
  main_value_prop: string | null
  primary_cta: string | null
  secondary_cta: string | null
  confidence: Confidence
  source_url: string
  evidence_text: string | null
}

export interface ExtractedFeature {
  name: string
  description: string | null
  source_url: string
  evidence_text: string
  confidence: number
}

export interface ExtractedChangelog {
  detected: boolean
  changelog_url: string | null
  last_visible_update_date: string | null
  confidence: Confidence
  evidence_text: string | null
}

export interface PageExtraction {
  page_type: string
  source_url: string
  pricing_candidates: PricingCandidate[]
  positioning: ExtractedPositioning | null
  features: ExtractedFeature[]
  changelog: ExtractedChangelog
}

const PRICE_RE = /(?:(?:from|starting(?:\s+at)?|just|only|as\s+low\s+as)\s+)?(?<sym>[$€£])\s*(?<amount>\d{1,5}(?:[.,]\d{1,3})?(?:[.,]\d{1,2})?)\s*(?:\/\s*(?<period>mo(?:nth)?|yr|year|user|seat|month|annual(?:ly)?))?/gi
const CODE_RE = /\b(?<amount>\d{1,5}(?:\.\d{1,2})?)\s*(?<code>USD|EUR|GBP)\b/gi
const PRICING_CTX_RE = /\b(?:month(?:ly)?|mo\b|year(?:ly)?|annual(?:ly)?|per\s+(?:month|year|user|seat|mo)|\/mo|\/yr|\/month|plan|plans|pric(?:e|ing)|subscri(?:be|ption)|billing|billed|upgrade|free\s+trial|starter|pro|enterprise)\b/i

function parseAmount(str: string): number {
  const s = str.replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.')
  return parseFloat(s) || 0
}

function getContext(text: string, index: number, radius = 250): string {
  const start = Math.max(0, index - radius)
  const end = Math.min(text.length, index + radius)
  return text.slice(start, end).replace(/\s+/g, ' ').trim()
}

function currencySymToCode(sym: string): string {
  return sym === '$' ? 'USD' : sym === '€' ? 'EUR' : sym === '£' ? 'GBP' : sym
}

export function extractPricingCandidates(html: string, url: string): PricingCandidate[] {
  const $ = cheerio.load(html)
  const pricingSections: string[] = []
  const sectionSelectors = [
    '[class*="pric"]', '[class*="plan"]', '[class*="tier"]', '[class*="package"]',
    '[id*="pric"]', '[id*="plan"]', 'main', 'article', 'section',
  ]
  for (const sel of sectionSelectors) {
    $(sel).each((_, el) => {
      const t = $(el).text()
      if (t.length > 20) pricingSections.push(t)
    })
  }

  const fullText = (pricingSections.join('\n') || $('body').text()).replace(/\s+/g, ' ')
  const candidates: PricingCandidate[] = []
  const seen = new Set<string>()

  PRICE_RE.lastIndex = 0
  for (const m of fullText.matchAll(PRICE_RE)) {
    const sym = m.groups?.sym ?? ''
    const amountStr = m.groups?.amount ?? ''
    const period = m.groups?.period ?? null
    const amount = parseAmount(amountStr)
    if (amount <= 0 || amount > 50_000) continue
    const context = getContext(fullText, m.index ?? 0)
    const hasPricingCtx = PRICING_CTX_RE.test(context)
    if (!period && !hasPricingCtx) continue
    const key = `${sym}${amount}`
    if (seen.has(key)) continue
    seen.add(key)
    let confidence = 0.4
    if (period) confidence += 0.3
    if (hasPricingCtx) confidence += 0.2
    if (/pric|plan|package|subscri/i.test(url)) confidence += 0.1
    confidence = Math.min(1, confidence)
    candidates.push({ amount, currency: currencySymToCode(sym), billing_period: period ?? null, raw_text: m[0].trim(), surrounding_context: context, confidence, source_url: url })
  }

  CODE_RE.lastIndex = 0
  for (const m of fullText.matchAll(CODE_RE)) {
    const amount = parseAmount(m.groups?.amount ?? '')
    const code = m.groups?.code ?? ''
    if (amount <= 0 || amount > 50_000) continue
    const context = getContext(fullText, m.index ?? 0)
    if (!PRICING_CTX_RE.test(context)) continue
    const key = `${code}${amount}`
    if (seen.has(key)) continue
    seen.add(key)
    candidates.push({ amount, currency: code, billing_period: null, raw_text: m[0].trim(), surrounding_context: context, confidence: 0.55, source_url: url })
  }

  return candidates.sort((a, b) => b.confidence - a.confidence).slice(0, 10)
}

export function selectBestPricing(candidates: PricingCandidate[]): {
  detected_pricing: string | null
  pricing_confidence: Confidence
  pricing_model_hint: string | null
  evidence: PricingCandidate | null
} {
  if (candidates.length === 0) {
    return { detected_pricing: null, pricing_confidence: 'unavailable', pricing_model_hint: null, evidence: null }
  }
  const highConf = candidates.filter(c => c.confidence >= 0.65)
  const pool = highConf.length > 0 ? highConf : candidates
  const sym: Record<string, string> = { USD: '$', EUR: '€', GBP: '£' }
  const sorted = [...pool].sort((a, b) => a.amount - b.amount)
  const lowest = sorted[0]
  const highest = sorted[sorted.length - 1]
  const s = sym[lowest.currency] ?? lowest.currency
  const period = lowest.billing_period ? `/${lowest.billing_period}` : ''
  let displayValue: string
  if (lowest.amount !== highest.amount && pool.length > 1) {
    const s2 = sym[highest.currency] ?? highest.currency
    displayValue = `${s}${lowest.amount}–${s2}${highest.amount}${period}`
  } else {
    displayValue = `${s}${lowest.amount}${period}`
  }
  const maxConf = Math.max(...candidates.map(c => c.confidence))
  const confidence: Confidence = maxConf >= 0.8 ? 'high' : maxConf >= 0.55 ? 'medium' : 'low'
  const allContext = candidates.map(c => c.surrounding_context).join(' ')
  let pricing_model_hint: string | null = null
  if (/\bfree\s+(?:plan|forever|tier)\b/i.test(allContext)) pricing_model_hint = 'freemium'
  else if (candidates.length > 0) pricing_model_hint = 'paid'
  return { detected_pricing: displayValue, pricing_confidence: confidence, pricing_model_hint, evidence: lowest }
}

export function extractPositioning(html: string, url: string): ExtractedPositioning {
  const $ = cheerio.load(html)
  const title = $('title').first().text().trim()
  const metaDesc = $('meta[name="description"]').attr('content')?.trim() ?? null
  const ogDesc = $('meta[property="og:description"]').attr('content')?.trim() ?? null
  const h1 = $('h1').first().text().trim() || null
  let subheadline: string | null = null
  const subSelectors = ['[class*="hero"] h2', '[class*="hero"] p', 'header h2', 'section:first-of-type h2', 'h2']
  for (const sel of subSelectors) {
    const text = $(sel).first().text().trim()
    if (text && text.length > 10 && text.length < 250 && text !== h1) { subheadline = text; break }
  }
  const ctaTexts: string[] = []
  const ctaSelectors = ['[class*="hero"] a', '[class*="cta"] a', 'header a[class*="btn"]', 'a[class*="primary"]', 'a[class*="cta"]', '.hero a', 'header a', '[class*="hero"] button', '[class*="cta"] button']
  for (const sel of ctaSelectors) {
    $(sel).each((_, el) => {
      const text = $(el).text().trim()
      if (text && text.length > 2 && text.length < 60 && !ctaTexts.includes(text)) ctaTexts.push(text)
    })
    if (ctaTexts.length >= 2) break
  }
  const headline = h1 ?? title ?? null
  const isGenericTitle = !headline || headline.length < 5
  const hasGoodData = !isGenericTitle && (!!metaDesc || !!subheadline)
  let confidence: Confidence
  if (hasGoodData && h1) confidence = 'high'
  else if (h1 || metaDesc) confidence = 'medium'
  else if (title) confidence = 'low'
  else confidence = 'unavailable'
  return {
    homepage_headline: isGenericTitle ? null : headline,
    subheadline,
    target_customer: null,
    main_value_prop: metaDesc ?? ogDesc ?? null,
    primary_cta: ctaTexts[0] ?? null,
    secondary_cta: ctaTexts[1] ?? null,
    confidence,
    source_url: url,
    evidence_text: [headline, subheadline].filter(Boolean).slice(0, 2).join(' · ') || null,
  }
}

export function extractFeatures(html: string, url: string): ExtractedFeature[] {
  const $ = cheerio.load(html)
  const features: ExtractedFeature[] = []
  const seen = new Set<string>()
  const cardSelectors = ['[class*="feature"]', '[class*="benefit"]', '[class*="capability"]', '[class*="card"]', '[class*="item"]', '[class*="module"]']
  for (const sel of cardSelectors) {
    const els = $(sel)
    if (els.length >= 3 && els.length <= 30) {
      els.each((_, el) => {
        const heading = $(el).find('h2, h3, h4, strong, b').first().text().trim()
        const desc = $(el).find('p').first().text().trim()
        if (!heading || heading.length < 3 || heading.length > 100) return
        if (seen.has(heading.toLowerCase())) return
        seen.add(heading.toLowerCase())
        features.push({ name: heading, description: desc.length > 10 ? desc.substring(0, 200) : null, source_url: url, evidence_text: heading, confidence: els.length >= 5 ? 0.8 : 0.65 })
      })
      if (features.length >= 4) break
    }
  }
  if (features.length < 3) {
    $('h3, h4').each((_, el) => {
      const name = $(el).text().trim()
      if (!name || name.length < 3 || name.length > 80) return
      if (seen.has(name.toLowerCase())) return
      seen.add(name.toLowerCase())
      const desc = $(el).next('p').text().trim()
      features.push({ name, description: desc.length > 10 ? desc.substring(0, 200) : null, source_url: url, evidence_text: name, confidence: 0.5 })
    })
  }
  return features.filter(f => f.confidence >= 0.5).slice(0, 12)
}

const DATE_RE = /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4}|\d{4}-\d{2}-\d{2}/gi
const RELEASE_RE = /\b(?:released?|shipped|launched|version|v\d+\.\d|bug\s+fix|new\s+feature|update[d]?|improved?)\b/gi

export function extractChangelog(html: string, url: string): ExtractedChangelog {
  const $ = cheerio.load(html)
  const text = $('body').text()
  const title = $('title').text()
  const dates = [...text.matchAll(DATE_RE)].map(m => m[0]).slice(0, 5)
  const releaseWordCount = [...text.matchAll(RELEASE_RE)].length
  const urlSignal = /changelog|update|release|blog|news/i.test(url)
  const titleSignal = /changelog|update|release|news/i.test(title)
  const detected = urlSignal || titleSignal || (dates.length >= 2 && releaseWordCount >= 3)
  let confidence: Confidence = 'unavailable'
  if (detected) confidence = (urlSignal || titleSignal) && dates.length >= 1 ? 'high' : 'medium'
  return {
    detected,
    changelog_url: detected ? url : null,
    last_visible_update_date: dates[0] ?? null,
    confidence,
    evidence_text: dates.length > 0 ? `Dates found: ${dates.slice(0, 3).join(', ')}` : releaseWordCount > 0 ? `${releaseWordCount} release keywords found` : null,
  }
}

export function extractFromPage(html: string, url: string, page_type: string): PageExtraction {
  return {
    page_type,
    source_url: url,
    pricing_candidates: (page_type === 'pricing' || page_type === 'homepage') ? extractPricingCandidates(html, url) : [],
    positioning: page_type === 'homepage' ? extractPositioning(html, url) : null,
    features: (page_type === 'features' || page_type === 'homepage') ? extractFeatures(html, url) : [],
    changelog: page_type === 'changelog' ? extractChangelog(html, url) : { detected: false, changelog_url: null, last_visible_update_date: null, confidence: 'unavailable', evidence_text: null },
  }
}
