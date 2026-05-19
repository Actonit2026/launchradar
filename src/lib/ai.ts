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
    if (!parsed.summary || !['low','medium','high'].includes(parsed.severity)) return null
    return parsed
  } catch {
    return null
  }
}
