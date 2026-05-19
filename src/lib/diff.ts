import { createHash } from 'crypto'

export function hashText(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

export function hasChanged(oldHash: string, newHash: string): boolean {
  return oldHash !== newHash
}

// Calculate rough % of content that changed
export function changeRatio(oldText: string, newText: string): number {
  if (!oldText) return 1
  const oldWords = new Set(oldText.split(' ').filter(Boolean))
  const newWords = new Set(newText.split(' ').filter(Boolean))

  let removed = 0
  oldWords.forEach(w => { if (!newWords.has(w)) removed++ })
  let added = 0
  newWords.forEach(w => { if (!oldWords.has(w)) added++ })

  const total = Math.max(oldWords.size, newWords.size, 1)
  return (removed + added) / (total * 2)
}

export type Severity = 'low' | 'medium' | 'high'

export function scoreSeverity(
  pageType: string,
  ratio: number
): Severity {
  // Pricing changes always high
  if (pageType === 'pricing') return 'high'
  // Changelog changes always medium+ (they're meant to signal new things)
  if (pageType === 'changelog') return ratio > 0.1 ? 'high' : 'medium'
  // Major content rewrites
  if (ratio > 0.3) return 'high'
  if (ratio > 0.1) return 'medium'
  return 'low'
}

// Generate a simple placeholder summary — replaced by AI in Phase 6
export function buildSummary(
  pageType: string,
  ratio: number,
  competitorName: string
): string {
  const pct = Math.round(ratio * 100)

  const templates: Record<string, string> = {
    pricing: `${competitorName} updated their pricing page — ${pct}% of content changed. Review for plan or price changes.`,
    features: `${competitorName} changed their features page (${pct}% changed). New or removed features may be present.`,
    changelog: `${competitorName} published a changelog update. Check for new releases or announcements.`,
    homepage: `${competitorName} updated their homepage messaging (${pct}% changed). Positioning or CTA may have shifted.`,
  }

  return templates[pageType] ?? `${competitorName}'s ${pageType} page changed (${pct}% of content).`
}
