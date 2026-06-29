import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// POST /api/presentations/[id]/live — start or stop a live session
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { action, current_slide } = await req.json()

  if (action === 'start') {
    // End any other live presentations first
    await supabaseAdmin
      .from('presentations')
      .update({ is_live: false })
      .neq('id', params.id)

    const { data, error } = await supabaseAdmin
      .from('presentations')
      .update({
        is_live: true,
        current_slide: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Create a session record
    await supabaseAdmin.from('presentation_sessions').insert({
      presentation_id: params.id,
    })

    return NextResponse.json(data)
  }

  if (action === 'stop') {
    const { data, error } = await supabaseAdmin
      .from('presentations')
      .update({
        is_live: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // End the session
    await supabaseAdmin
      .from('presentation_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('presentation_id', params.id)
      .is('ended_at', null)

    return NextResponse.json(data)
  }

  if (action === 'navigate') {
    const { data, error } = await supabaseAdmin
      .from('presentations')
      .update({
        current_slide: current_slide ?? 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  return NextResponse.json({ error: 'Unknown action. Use: start, stop, navigate' }, { status: 400 })
}
