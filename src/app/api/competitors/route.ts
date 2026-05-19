import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Pages to auto-create for every competitor
const DEFAULT_PAGE_TYPES = [
  { path: '/', page_type: 'homepage' },
  { path: '/pricing', page_type: 'pricing' },
  { path: '/features', page_type: 'features' },
  { path: '/changelog', page_type: 'changelog' },
] as const

function normalizeUrl(url: string): string {
  let normalized = url.trim()
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized
  }
  // Remove trailing slash
  normalized = normalized.replace(/\/$/, '')
  return normalized
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, base_url } = body

    if (!name?.trim() || !base_url?.trim()) {
      return NextResponse.json({ error: 'Name and URL are required' }, { status: 400 })
    }

    const normalizedUrl = normalizeUrl(base_url)

    // Check competitor limit (free plan: 2)
    const { count } = await supabase
      .from('competitors')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if ((count ?? 0) >= 2) {
      return NextResponse.json(
        { error: 'Free plan limit reached. Upgrade to Pro to add more competitors.' },
        { status: 403 }
      )
    }

    // Insert competitor
    const { data: competitor, error: competitorError } = await supabase
      .from('competitors')
      .insert({
        user_id: user.id,
        name: name.trim(),
        base_url: normalizedUrl,
      })
      .select()
      .single()

    if (competitorError) throw competitorError

    // Create default monitored pages
    const pages = DEFAULT_PAGE_TYPES.map(({ path, page_type }) => ({
      competitor_id: competitor.id,
      url: normalizedUrl + path,
      page_type,
    }))

    const { error: pagesError } = await supabase
      .from('monitored_pages')
      .insert(pages)

    if (pagesError) throw pagesError

    return NextResponse.json({ competitor }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: competitors, error } = await supabase
      .from('competitors')
      .select(`*, monitored_pages(*)`)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ competitors })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
