import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET /api/questions — all questions with answers
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('questions')
    .select('*, question_answers(*)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/questions — create a question with answers
export async function POST(req: NextRequest) {
  const { question_text, answers, member_id } = await req.json()

  if (!question_text?.trim()) {
    return NextResponse.json({ error: 'question_text required' }, { status: 400 })
  }

  const { data: question, error: qError } = await supabaseAdmin
    .from('questions')
    .insert({
      question_text: question_text.trim(),
      member_id: member_id || null,
      is_active: false,
      is_complete: false,
    })
    .select()
    .single()

  if (qError) return NextResponse.json({ error: qError.message }, { status: 500 })

  if (answers && Array.isArray(answers) && answers.length > 0) {
    const answerRows = answers.map((a: any, i: number) => ({
      question_id: question.id,
      answer_text: a.answer_text,
      points: a.points || 0,
      display_order: a.display_order || i + 1,
      is_revealed: false,
    }))

    const { error: aError } = await supabaseAdmin
      .from('question_answers')
      .insert(answerRows)

    if (aError) return NextResponse.json({ error: aError.message }, { status: 500 })
  }

  return NextResponse.json(question)
}

// PATCH /api/questions — activate/deactivate/complete
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
