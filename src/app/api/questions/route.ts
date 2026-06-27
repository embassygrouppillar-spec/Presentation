import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/questions — all questions with member + answers
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('questions')
    .select(`
      *,
      members(*),
      question_answers(*)
    `)
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PATCH /api/questions — set active question + open the round
export async function PATCH(req: NextRequest) {
  const { question_id, action } = await req.json()

  if (action === 'activate') {
    // Deactivate all others first
    await supabaseAdmin
      .from('questions')
      .update({ is_active: false })
      .neq('id', question_id)

    await supabaseAdmin
      .from('questions')
      .update({ is_active: true })
      .eq('id', question_id)

    await supabaseAdmin
      .from('game_state')
      .update({
        active_question_id: question_id,
        game_phase: 'playing',
        strikes: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)

    return NextResponse.json({ ok: true })
  }

  if (action === 'complete') {
    await supabaseAdmin
      .from('questions')
      .update({ is_active: false, is_complete: true })
      .eq('id', question_id)

    await supabaseAdmin
      .from('game_state')
      .update({
        active_question_id: null,
        game_phase: 'registration',
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
