import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// POST /api/audience/answer — submit answer from web audience
export async function POST(req: NextRequest) {
  const { poll_id, participant_id, selected_option, text_response } = await req.json()

  if (!poll_id || !participant_id) {
    return NextResponse.json({ error: 'poll_id and participant_id required' }, { status: 400 })
  }

  // Check if already answered
  const { data: existing } = await supabaseAdmin
    .from('poll_responses')
    .select('id')
    .eq('poll_id', poll_id)
    .eq('participant_id', participant_id)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Already answered' }, { status: 400 })
  }

  // Save response
  const { data, error } = await supabaseAdmin
    .from('poll_responses')
    .insert({
      poll_id,
      participant_id,
      selected_option: selected_option || null,
      text_response: text_response || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update vote count if option selected
  if (selected_option) {
    const { data: option } = await supabaseAdmin
      .from('poll_options')
      .select('vote_count')
      .eq('id', selected_option)
      .single()

    await supabaseAdmin
      .from('poll_options')
      .update({ vote_count: (option?.vote_count || 0) + 1 })
      .eq('id', selected_option)
  }

  return NextResponse.json({ ok: true, response: data })
}
