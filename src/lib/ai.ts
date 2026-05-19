const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

// ─── Change diff summary (existing) ──────────────────────────────────────────

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

  const prompt = `You are a competitive intelligence analyst. A SaaS competitor's page changed.

Competitor: ${input.competitorName}
Page: ${input.pageType} (${input.pageUrl})

BEFORE: ${input.oldText.substring(0, 2000)}

AFTER: ${input.newText.substring(0, 2000)}

Respond ONLY with a JSON object, no markdown:
{
  "summary": "One sentence describing what changed",
  "severity": "low|medium|high",
  "why_it_matters": "One sentence on strategic importance"
}

high=pricing/major features, medium=new features/messaging, low=minor copy`

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!response.ok) return null
    const data = await response.json()
    const text = data.content?.[0]?.text ?? ''
    const parsed = JSON.parse(text.trim()) as SummaryOutput
    if (!parsed.summary || !['low', 'medium', 'high'].includes(parsed.severity)) return null
    return parsed
  } catch {
    return null
  }
}

// ─── Intelligence snapshot for first scan (new) ───────────────────────────────

export interface IntelligenceSnapshot {
  summary: string | null
  pricing_model: string | null
  detected_pricing: string | null
  positioning: string | null
  primary_cta: string | null
  secondary_cta: string | null
  feature_summary: string | null
  changelog_detected: boolean
  confidence_score: number
}

interface IntelligenceInput {
  competitorName: string
  baseUrl: string
  pages: Array<{ page_type: string; url: string; text: string }>
}

function buildFallbackSnapshot(input: IntelligenceInput): IntelligenceSnapshot {
  const allText = input.pages.map(p => p.text).join(' ')
  const prices = allText.match(/[\$€£]\d+(?:[,\d]*)?(?:\/(?:mo(?:nth)?|yr(?:ear)?|user|seat))?/gi) ?? []
  const hasFree = /\bfree\b/i.test(allText)
  const hasChangelog = input.pages.some(p => p.page_type === 'changelog' && p.text.length > 200)
  const hasPricing = input.pages.some(p => p.page_type === 'pricing' && p.text.length > 200)

  return {
    summary: `${input.competitorName} is a SaaS product at ${input.baseUrl}.${hasPricing ? ' Pricing information was detected.' : ''}${hasChangelog ? ' An active changelog was found.' : ''}`,
    pricing_model: hasFree ? 'freemium' : hasPricing ? 'paid' : null,
    detected_pricing: prices.length > 0 ? prices.slice(0, 4).join(', ') : null,
    positioning: null,
    primary_cta: null,
    secondary_cta: null,
    feature_summary: null,
    changelog_detected: hasChangelog,
    confidence_score: 0.3,
  }
}

export async function generateIntelligenceSnapshot(
  input: IntelligenceInput
): Promise<IntelligenceSnapshot> {
  if (!process.env.ANTHROPIC_API_KEY) return buildFallbackSnapshot(input)

  const pagesContent = input.pages
    .map(p => `### ${p.page_type.toUpperCase()} (${p.url})\n${p.text.substring(0, 1800)}`)
    .join('\n\n')

  const prompt = `You are a competitive intelligence analyst for SaaS founders. Analyze these scraped pages and extract structured intelligence.

Competitor: ${input.competitorName}
Base URL: ${input.baseUrl}

${pagesContent}

Respond ONLY with a JSON object, no markdown, no preamble:
{
  "summary": "2-3 sentence overview: what they do, who they target, market position",
  "pricing_model": "one of: free|freemium|paid|usage-based|enterprise|unknown",
  "detected_pricing": "specific prices like '$29/mo starter, $99/mo pro' — null if none found",
  "positioning": "core value proposition and target audience in one sentence",
  "primary_cta": "main CTA button text — null if not found",
  "secondary_cta": "secondary CTA text — null if not found",
  "feature_summary": "comma-separated key features detected",
  "changelog_detected": true or false,
  "confidence_score": 0.0 to 1.0 based on data richness
}

Rules: use null for missing data, never invent, keep values under 120 chars each.`

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) return buildFallbackSnapshot(input)

    const data = await response.json()
    const rawText = data.content?.[0]?.text ?? ''
    const parsed = JSON.parse(rawText.trim()) as IntelligenceSnapshot

    if (typeof parsed.changelog_detected !== 'boolean') parsed.changelog_detected = false
    if (typeof parsed.confidence_score !== 'number') parsed.confidence_score = 0.5

    return parsed
  } catch {
    return buildFallbackSnapshot(input)
  }
}
