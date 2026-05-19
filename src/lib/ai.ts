const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

interface SummaryInput {
  competitorName: string
  pageType: string
  pageUrl: string
  oldText: string
  newText: string
}

interface SummaryOutput {
  summary: string
  severity: 'low' | 'medium' | 'high'
  why_it_matters: string
}

export async function generateAISummary(input: SummaryInput): Promise<SummaryOutput | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null
  const prompt = `You are a competitive intelligence analyst. A SaaS competitor's website page changed.

Competitor: ${input.competitorName}
Page: ${input.pageType} (${input.pageUrl})

BEFORE: ${input.oldText.substring(0, 2000)}
AFTER: ${input.newText.substring(0, 2000)}

Respond ONLY with a JSON object, no markdown:
{"summary":"One sentence describing what changed","severity":"low|medium|high","why_it_matters":"One sentence on strategic importance"}

high=pricing/major features, medium=new features/messaging, low=minor copy`

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 256, messages: [{ role: 'user', content: prompt }] }),
    })
    if (!response.ok) return null
    const data = await response.json()
    const parsed = JSON.parse(data.content?.[0]?.text ?? '') as SummaryOutput
    if (!parsed.summary || !['low', 'medium', 'high'].includes(parsed.severity)) return null
    return parsed
  } catch { return null }
}

export interface StructuredIntelligence {
  competitorName: string
  baseUrl: string
  pricing: {
    detected_pricing: string | null
    pricing_confidence: string
    pricing_model_hint: string | null
    evidence_text: string | null
  }
  positioning: {
    headline: string | null
    subheadline: string | null
    main_value_prop: string | null
    primary_cta: string | null
    secondary_cta: string | null
    confidence: string
  }
  features: Array<{ name: string; description: string | null }>
  changelog: {
    detected: boolean
    last_date: string | null
    confidence: string
  }
  pages_analyzed: string[]
  warnings: string[]
}

export interface IntelligenceSummary {
  summary: string | null
  pricing_summary: string | null
  positioning_summary: string | null
  cta_summary: string | null
  feature_summary: string | null
  confidence_score: number
  warnings: string[]
}

const GENERIC_PHRASES = [
  'is a saas product', 'software solutions', 'helps businesses',
  'improve productivity', 'comprehensive platform', 'all-in-one solution',
]

function isGenericSummary(text: string): boolean {
  const lower = text.toLowerCase()
  return GENERIC_PHRASES.some(p => lower.includes(p))
}

function buildFallbackSummary(data: StructuredIntelligence): IntelligenceSummary {
  const parts: string[] = []
  const warnings = [...data.warnings]
  if (data.positioning.headline) parts.push(`Homepage headline: "${data.positioning.headline}".`)
  if (data.positioning.main_value_prop) parts.push(data.positioning.main_value_prop)
  if (data.pricing.detected_pricing && data.pricing.pricing_confidence !== 'low') {
    parts.push(`Pricing starts at ${data.pricing.detected_pricing}.`)
  } else if (!data.pricing.detected_pricing) {
    warnings.push('No reliable pricing found on public pages')
  }
  if (data.changelog.detected) parts.push('Active changelog detected.')

  return {
    summary: parts.length > 0 ? parts.join(' ') : 'Initial scan completed, but public data was limited for this competitor.',
    pricing_summary: data.pricing.detected_pricing,
    positioning_summary: data.positioning.headline ?? data.positioning.main_value_prop,
    cta_summary: data.positioning.primary_cta,
    feature_summary: data.features.length >= 3 ? data.features.slice(0, 6).map(f => f.name).join(', ') : null,
    confidence_score: data.pricing.detected_pricing && data.positioning.headline ? 0.55 : 0.3,
    warnings,
  }
}

export async function summarizeStructuredIntelligence(data: StructuredIntelligence): Promise<IntelligenceSummary> {
  const fallback = buildFallbackSummary(data)
  if (!process.env.ANTHROPIC_API_KEY) return fallback

  const prompt = `You are summarizing verified extracted facts about a competitor website. Do NOT infer beyond the data provided. If data is missing or null, say it is unknown. Never invent pricing, features, target customers, or CTAs.

Verified extracted data:
${JSON.stringify(data, null, 2)}

Respond ONLY with a JSON object, no markdown, no preamble:
{
  "summary": "2-3 specific sentences based ONLY on the data above. If data is weak, say: 'Initial scan completed, but public data was limited for this competitor.' NEVER write generic phrases like 'this is a SaaS product' or 'helps businesses'.",
  "pricing_summary": "Specific detected pricing with confidence level, or null",
  "positioning_summary": "Specific headline or value prop found, or null",
  "cta_summary": "Observed CTA text, or null",
  "feature_summary": "Comma-separated features if 3+ found, or null",
  "confidence_score": 0.0,
  "warnings": []
}

Rules: values under 150 chars each. confidence_score reflects actual evidence strength.`

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 600, messages: [{ role: 'user', content: prompt }] }),
    })
    if (!response.ok) return fallback
    const responseData = await response.json()
    const text = responseData.content?.[0]?.text ?? ''
    const parsed = JSON.parse(text.trim()) as IntelligenceSummary
    if (!parsed.summary || isGenericSummary(parsed.summary)) return fallback
    return { ...parsed, warnings: parsed.warnings ?? [] }
  } catch { return fallback }
}
