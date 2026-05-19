import * as cheerio from 'cheerio'
import { fetchHtml } from './scraper'

export type DiscoveredPageType = 'homepage' | 'pricing' | 'features' | 'changelog'

export interface PageCandidate {
  url: string
  page_type: DiscoveredPageType
  score: number
  source_method: 'homepage' | 'homepage_link' | 'sitemap' | 'fallback'
  anchor_text?: string
}

const SIGNALS: Record<Exclude<DiscoveredPageType, 'homepage'>, { url: string[]; anchor: string[] }> = {
  pricing: {
    url: ['pric', 'plan', 'package', 'subscri', 'billing', 'buy', 'upgrade', 'cost'],
    anchor: ['pricing', 'plans', 'packages', 'subscribe', 'billing', 'upgrade', 'cost', 'buy now', 'get started', 'try free'],
  },
  features: {
    url: ['feature', 'product', 'solution', 'platform', 'capability', 'use-case', 'how-it-works'],
    anchor: ['features', 'product', 'solutions', 'platform', 'capabilities', 'how it works'],
  },
  changelog: {
    url: ['changelog', 'update', 'release', 'news', 'blog', 'whats-new', 'roadmap'],
    anchor: ['changelog', 'updates', 'releases', "what's new", 'blog', 'news', 'latest', 'release notes'],
  },
}

const FALLBACK_PATHS: Record<Exclude<DiscoveredPageType, 'homepage'>, string[]> = {
  pricing: ['/pricing', '/plans', '/packages', '/subscribe', '/billing'],
  features: ['/features', '/product', '/solutions', '/platform'],
  changelog: ['/changelog', '/updates', '/releases', '/blog', '/release-notes', '/whats-new'],
}

function scoreLink(url: string, anchorText: string, type: Exclude<DiscoveredPageType, 'homepage'>): number {
  const urlL = url.toLowerCase()
  const anchorL = anchorText.toLowerCase()
  let score = 0
  for (const kw of SIGNALS[type].url) { if (urlL.includes(kw)) score += 3 }
  for (const kw of SIGNALS[type].anchor) { if (anchorL.includes(kw)) score += 2 }
  return score
}

function normalizeHref(href: string, baseUrl: string): string | null {
  try {
    if (!href) return null
    if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) return null
    if (href.startsWith('javascript:')) return null
    const base = new URL(baseUrl)
    if (href.startsWith('//')) return `${base.protocol}${href}`
    if (href.startsWith('/')) return `${base.protocol}//${base.host}${href}`
    if (href.startsWith('http')) {
      const target = new URL(href)
      if (target.host !== base.host) return null
      return href
    }
    return null
  } catch { return null }
}

function isHomepage(url: string, baseUrl: string): boolean {
  try {
    const base = new URL(baseUrl)
    const target = new URL(url)
    return target.pathname === '/' || target.pathname === ''
  } catch { return false }
}

function discoverFromHomepageLinks(
  html: string,
  baseUrl: string
): Map<Exclude<DiscoveredPageType, 'homepage'>, PageCandidate[]> {
  const $ = cheerio.load(html)
  const results = new Map<Exclude<DiscoveredPageType, 'homepage'>, PageCandidate[]>()
  const types: Exclude<DiscoveredPageType, 'homepage'>[] = ['pricing', 'features', 'changelog']

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? ''
    const anchorText = $(el).text().trim()
    const url = normalizeHref(href, baseUrl)
    if (!url || isHomepage(url, baseUrl)) return

    for (const type of types) {
      const score = scoreLink(url, anchorText, type)
      if (score > 0) {
        const list = results.get(type) ?? []
        if (!list.find(c => c.url === url)) {
          list.push({ url, page_type: type, score, source_method: 'homepage_link', anchor_text: anchorText })
        }
        results.set(type, list)
      }
    }
  })

  return results
}

async function discoverFromSitemap(baseUrl: string): Promise<PageCandidate[]> {
  const candidates: PageCandidate[] = []
  const types: Exclude<DiscoveredPageType, 'homepage'>[] = ['pricing', 'features', 'changelog']

  for (const sitemapPath of ['/sitemap.xml', '/sitemap_index.xml']) {
    try {
      const { html: xml, ok } = await fetchHtml(`${baseUrl}${sitemapPath}`)
      if (!ok || !xml || !xml.includes('<loc>')) continue

      const locMatches = [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)]
      for (const match of locMatches) {
        const url = match[1]?.trim()
        if (!url) continue
        try {
          const base = new URL(baseUrl)
          const target = new URL(url)
          if (target.host !== base.host) continue
        } catch { continue }

        for (const type of types) {
          const score = scoreLink(url, '', type)
          if (score >= 3) {
            candidates.push({ url, page_type: type, score: score - 1, source_method: 'sitemap' })
          }
        }
      }
      if (candidates.length > 0) break
    } catch { continue }
  }

  return candidates
}

async function tryFallbackPaths(
  baseUrl: string,
  missingTypes: Exclude<DiscoveredPageType, 'homepage'>[]
): Promise<PageCandidate[]> {
  const candidates: PageCandidate[] = []
  for (const type of missingTypes) {
    for (const path of FALLBACK_PATHS[type]) {
      const url = `${baseUrl}${path}`
      const { ok } = await fetchHtml(url)
      if (ok) {
        candidates.push({ url, page_type: type, score: 2, source_method: 'fallback' })
        break
      }
    }
  }
  return candidates
}

export async function discoverPages(baseUrl: string, homepageHtml: string): Promise<PageCandidate[]> {
  const result: PageCandidate[] = [
    { url: baseUrl, page_type: 'homepage', score: 10, source_method: 'homepage' },
  ]

  const types: Exclude<DiscoveredPageType, 'homepage'>[] = ['pricing', 'features', 'changelog']
  const homepageCandidates = discoverFromHomepageLinks(homepageHtml, baseUrl)
  const sitemapCandidates = await discoverFromSitemap(baseUrl)

  const allByType = new Map<Exclude<DiscoveredPageType, 'homepage'>, PageCandidate[]>()
  for (const type of types) { allByType.set(type, []) }

  for (const [type, candidates] of homepageCandidates) {
    allByType.set(type, [...(allByType.get(type) ?? []), ...candidates])
  }
  for (const candidate of sitemapCandidates) {
    const type = candidate.page_type as Exclude<DiscoveredPageType, 'homepage'>
    const list = allByType.get(type) ?? []
    if (!list.find(c => c.url === candidate.url)) list.push(candidate)
    allByType.set(type, list)
  }

  const missingTypes = types.filter(t => (allByType.get(t)?.length ?? 0) === 0)
  if (missingTypes.length > 0) {
    const fallbacks = await tryFallbackPaths(baseUrl, missingTypes)
    for (const candidate of fallbacks) {
      const type = candidate.page_type as Exclude<DiscoveredPageType, 'homepage'>
      allByType.set(type, [candidate])
    }
  }

  for (const type of types) {
    const candidates = allByType.get(type) ?? []
    if (candidates.length === 0) continue
    candidates.sort((a, b) => b.score - a.score)
    const best = candidates[0]
    if (best.score >= 2 || best.source_method === 'fallback') {
      result.push(best)
    }
  }

  return result
}
