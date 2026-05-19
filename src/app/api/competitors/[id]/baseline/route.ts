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

    // Verify ownership and get pages
    const { data: competitor, error } = await supabase
      .from('competitors')
      .select('*, monitored_pages(*)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !competitor) {
      return NextResponse.json({ error: 'Competitor not found' }, { status: 404 })
    }

    // Idempotent — skip if baseline already exists
    const { data: existing } = await supabase
      .from('competitor_snapshots')
      .select('id')
      .eq('competitor_id', id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ alreadyDone: true })
    }

    const snapshot = await runBaselineScan({
      competitorId: id,
      competitorName: competitor.name,
      baseUrl: competitor.base_url,
      pages: competitor.monitored_pages,
      userId: user.id,
      supabase,
    })

    return NextResponse.json({ snapshot })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Scan failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
