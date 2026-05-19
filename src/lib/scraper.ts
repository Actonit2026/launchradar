import * as cheerio from 'cheerio'

const FETCH_TIMEOUT_MS = 10_000

// Elements to strip before extracting text
const NOISE_SELECTORS = [
  'script', 'style', 'noscript', 'svg', 'iframe', 'img',
  'nav', 'footer', 'header',
  '[class*="cookie"]', '[id*="cookie"]',
  '[class*="banner"]', '[class*="popup"]',
  '[class*="modal"]',  '[class*="sidebar"]',
  '[class*="newsletter"]', '[class*="subscribe"]',
  '[aria-hidden="true"]',
  'time', '[class*="timestamp"]', '[class*="date"]',
].join(', ')

export interface ScrapeResult {
  text: string
  ok: boolean
  error?: string
}

export async function scrapePage(url: string): Promise<ScrapeResult> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; LaunchRadar/1.0; +https://launchradar.app)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    })

    clearTimeout(timer)

    if (!response.ok) {
      return { text: '', ok: false, error: `HTTP ${response.status}` }
    }

    const html = await response.text()
    const text = extractText(html)

    return { text, ok: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    const isTimeout = msg.includes('abort') || msg.includes('timeout')
    return { text: '', ok: false, error: isTimeout ? 'Timeout' : msg }
  }
}

function extractText(html: string): string {
  const $ = cheerio.load(html)

  // Remove noise
  $(NOISE_SELECTORS).remove()

  // Focus on meaningful content sections
  const contentSelectors = [
    'main', 'article', '[role="main"]',
    'h1, h2, h3, h4',
    '[class*="price"]', '[class*="pricing"]', '[class*="plan"]',
    '[class*="feature"]',
    '[class*="hero"]', '[class*="headline"]',
    'button', '[class*="cta"]',
    '[class*="benefit"]', '[class*="value"]',
  ]

  // Try to get targeted content first
  const targeted: string[] = []
  contentSelectors.forEach(sel => {
    $(sel).each((_, el) => {
      const t = $(el).text().trim()
      if (t.length > 3) targeted.push(t)
    })
  })

  // Fall back to full body text if targeted is too sparse
  const fullText = $('body').text()
  const raw = targeted.length > 50
    ? targeted.join(' ')
    : fullText

  return normalizeText(raw)
}

function normalizeText(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')       // collapse whitespace
    .replace(/\n+/g, ' ')       // remove newlines
    .trim()
    .toLowerCase()
    .substring(0, 50_000)       // cap at 50k chars
}
