import * as cheerio from 'cheerio'

const FETCH_TIMEOUT_MS = 10_000

const NOISE_SELECTORS = [
  'script', 'style', 'noscript', 'svg', 'iframe', 'img',
  'nav', 'footer',
  '[class*="cookie"]', '[id*="cookie"]',
  '[class*="banner"]', '[class*="popup"]',
  '[class*="modal"]', '[class*="newsletter"]',
  '[aria-hidden="true"]',
].join(', ')

export interface ScrapeResult {
  text: string
  html: string
  title: string
  metaDescription: string | null
  ok: boolean
  error?: string
}

export async function fetchHtml(url: string): Promise<{ html: string; ok: boolean; error?: string }> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LaunchRadar/1.0; +https://launchradar.app)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    })
    clearTimeout(timer)
    if (!response.ok) return { html: '', ok: false, error: `HTTP ${response.status}` }
    const html = await response.text()
    return { html, ok: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return { html: '', ok: false, error: msg.includes('abort') ? 'Timeout' : msg }
  }
}

export async function scrapePage(url: string): Promise<ScrapeResult> {
  const { html, ok, error } = await fetchHtml(url)
  if (!ok || !html) return { text: '', html: '', title: '', metaDescription: null, ok: false, error }

  const $ = cheerio.load(html)
  const title = $('title').text().trim()
  const metaDescription = $('meta[name="description"]').attr('content')?.trim() ?? null

  $(NOISE_SELECTORS).remove()

  const contentSelectors = [
    'main', 'article', '[role="main"]',
    'h1, h2, h3, h4',
    '[class*="price"]', '[class*="pricing"]', '[class*="plan"]',
    '[class*="feature"]', '[class*="hero"]',
    'button', '[class*="cta"]',
  ]

  const targeted: string[] = []
  contentSelectors.forEach(sel => {
    $(sel).each((_, el) => {
      const t = $(el).text().trim()
      if (t.length > 3) targeted.push(t)
    })
  })

  const raw = targeted.length > 50 ? targeted.join(' ') : $('body').text()
  const text = raw.replace(/\s+/g, ' ').replace(/\n+/g, ' ').trim().toLowerCase().substring(0, 50_000)

  return { text, html, title, metaDescription, ok: true }
}
