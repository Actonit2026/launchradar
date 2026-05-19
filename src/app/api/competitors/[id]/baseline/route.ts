import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runBaselineScan } from '@/lib/baseline'

export const maxDuration = 60

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: competitor, error } = await supabase
      .from('competitors')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !competitor) return NextResponse.json({ error: 'Competitor not found' }, { status: 404 })

    const { data: existing } = await supabase
      .from('competitor_snapshots')
      .select('id')
      .eq('competitor_id', id)
      .maybeSingle()

    if (existing) return NextResponse.json({ alreadyDone: true })

    const snapshot = await runBaselineScan({
      competitorId: id,
      competitorName: competitor.name,
      baseUrl: competitor.base_url,
      userId: user.id,
      supabase,
    })

    return NextResponse.json({ snapshot })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Scan failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const debugSecret = process.env.DEBUG_SECRET
  if (!debugSecret || request.headers.get('x-debug-secret') !== debugSecret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: snapshot } = await supabase
      .from('competitor_snapshots')
      .select('raw_intelligence, warnings, pages_discovered, confidence_score, created_at')
      .eq('competitor_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!snapshot) return NextResponse.json({ error: 'No snapshot found' }, { status: 404 })
    return NextResponse.json({ debug: snapshot.raw_intelligence, meta: { warnings: snapshot.warnings, pages_discovered: snapshot.pages_discovered, confidence_score: snapshot.confidence_score, created_at: snapshot.created_at } })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
