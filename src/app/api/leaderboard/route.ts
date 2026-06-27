import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/leaderboard — players + their responses for results view
export async function GET() {
  const { data: players, error } = await supabaseAdmin
    .from('players')
    .select(`
      *,
      player_responses(
        raw_answer,
        matched_answer,
        points_earned,
        received_at,
        questions(question_text, members(name))
      )
    `)
    .order('total_score', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(players)
}
