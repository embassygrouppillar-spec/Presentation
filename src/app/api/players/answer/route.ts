import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { matchAnswer } from '@/lib/matchAnswer'

// POST /api/players/answer — web form answer submission (mirrors Twilio webhook logic)
export async function POST(req: NextRequest) {
  const { player_id, question_id, raw_answer } = await req.json()

  if (!player_id || !question_id || !raw_answer) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Check already answered
  const { data: existing } = await supabaseAdmin
    .from('player_responses')
    .select('id')
    .eq('player_id', player_id)
    .eq('question_id', question_id)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Already answered this round', matched: false, points: 0 })
  }

  // Load board answers
  const { data: boardAnswers } = await supabaseAdmin
    .from('question_answers')
    .select('*')
    .eq('question_id', question_id)
    .order('display_order')

  const matched = matchAnswer(raw_answer, boardAnswers || [])

  // Save response
  await supabaseAdmin.from('player_responses').insert({
    player_id,
    question_id,
    raw_answer,
    matched_answer: matched?.answer_text || null,
    points_earned: matched?.points || 0,
  })

  if (matched) {
    // Reveal answer on board
    await supabaseAdmin.from('question_answers').update({ is_revealed: true }).eq('id', matched.id)
    // Update player score
    const { data: player } = await supabaseAdmin.from('players').select('total_score').eq('id', player_id).single()
    await supabaseAdmin.from('players').update({ total_score: (player?.total_score || 0) + matched.points }).eq('id', player_id)
  }

  return NextResponse.json({
    matched: !!matched,
    points: matched?.points || 0,
    answer: matched?.answer_text || null,
  })
}
