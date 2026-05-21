import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runBaselineScan } from '@/lib/baseline'

export const maxDuration = 300

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { competitor_id } = await request.json()
    if (!competitor_id) return NextResponse.json({ error: 'competitor_id required' }, { status: 400 })

    const { data: competitor, error: compError } = await supabase
      .from('competitors')
      .select('*')
      .eq('id', competitor_id)
      .eq('user_id', user.id)
      .single()

    if (compError || !competitor) {
      return NextResponse.json({ error: 'Competitor not found' }, { status: 404 })
    }

    const snapshot = await runBaselineScan({
      competitorId: competitor.id,
      competitorName: competitor.name,
      baseUrl: competitor.base_url,
      userId: user.id,
      supabase,
    })

    return NextResponse.json({ snapshot }, { status: 200 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
