import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const debugSecret = process.env.DEBUG_SECRET
  if (!debugSecret) return NextResponse.json({ error: 'Debug mode not enabled' }, { status: 403 })
  if (request.headers.get('x-debug-secret') !== debugSecret) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const competitorId = request.nextUrl.searchParams.get('competitor_id')
  if (!competitorId) return NextResponse.json({ error: 'competitor_id param required' }, { status: 400 })

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: snapshot, error } = await supabase
      .from('competitor_snapshots')
      .select('*')
      .eq('competitor_id', competitorId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !snapshot) return NextResponse.json({ error: 'No snapshot found' }, { status: 404 })

    return NextResponse.json({
      meta: { competitor_id: competitorId, created_at: snapshot.created_at, confidence_score: snapshot.confidence_score, pages_discovered: snapshot.pages_discovered, warnings: snapshot.warnings },
      snapshot: { summary: snapshot.summary, pricing_model: snapshot.pricing_model, detected_pricing: snapshot.detected_pricing, positioning: snapshot.positioning, primary_cta: snapshot.primary_cta, secondary_cta: snapshot.secondary_cta, feature_summary: snapshot.feature_summary, changelog_detected: snapshot.changelog_detected },
      debug: snapshot.raw_intelligence,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
