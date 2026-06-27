import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'
import { supabaseAdmin } from '@/lib/supabase'
import { matchAnswer } from '@/lib/matchAnswer'

const MessagingResponse = twilio.twiml.MessagingResponse

/**
 * POST /api/twilio
 * Twilio sends every inbound SMS here.
 * Handles: player registration, answer submission, help messages.
 */
export async function POST(req: NextRequest) {
  const body = await req.formData()
  const from: string = (body.get('From') as string) || ''
  const rawMessage: string = ((body.get('Body') as string) || '').trim()
  const message = rawMessage.toLowerCase()

  const twiml = new MessagingResponse()

  // ── 1. Look up player by phone number ───────────────────────────────────
  const { data: player } = await supabaseAdmin
    .from('players')
    .select('*')
    .eq('phone_number', from)
    .single()

  // ── 2. HELP command ──────────────────────────────────────────────────────
  if (message === 'help' || message === '?') {
    twiml.message(
      player
        ? `B&I Feud — Hi ${player.display_name}! Your score: ${player.total_score} pts. Just text your answer when a question is open. Text SCORE to see leaderboard.`
        : `B&I Feud — Text your first name to register and join the game!`
    )
    return twimlResponse(twiml)
  }

  // ── 3. SCORE command ─────────────────────────────────────────────────────
  if (message === 'score' || message === 'scores') {
    const { data: top } = await supabaseAdmin
      .from('players')
      .select('display_name, total_score')
      .order('total_score', { ascending: false })
      .limit(5)

    const board = top?.map((p, i) => `${i + 1}. ${p.display_name} — ${p.total_score} pts`).join('\n') || 'No scores yet'
    twiml.message(`🏆 Top 5:\n${board}`)
    return twimlResponse(twiml)
  }

  // ── 4. REGISTRATION — new player ─────────────────────────────────────────
  if (!player) {
    // Their first text = their name
    const displayName = rawMessage.slice(0, 30) // cap at 30 chars

    const { error } = await supabaseAdmin
      .from('players')
      .upsert({
        phone_number: from,
        display_name: displayName,
        total_score: 0,
      }, { onConflict: 'phone_number' })

    if (error) {
      twiml.message('Something went wrong registering you. Try again!')
      return twimlResponse(twiml)
    }

    twiml.message(
      `Welcome ${displayName}! 🎉 You're registered for B&I Family Feud.\n\nWatch the screen for questions and text your answer when a round opens.\n\nGood luck — lunch is on the line! 🏆`
    )
    return twimlResponse(twiml)
  }

  // ── 5. Update name if they text "NAME: ..." ──────────────────────────────
  if (message.startsWith('name:')) {
    const newName = rawMessage.slice(5).trim().slice(0, 30)
    await supabaseAdmin
      .from('players')
      .update({ display_name: newName })
      .eq('phone_number', from)

    twiml.message(`Got it — your name is now ${newName}!`)
    return twimlResponse(twiml)
  }

  // ── 6. ANSWER — check if a question is active ────────────────────────────
  const { data: gameState } = await supabaseAdmin
    .from('game_state')
    .select('*, questions(*)')
    .eq('id', 1)
    .single()

  if (!gameState?.active_question_id || gameState.game_phase !== 'playing') {
    twiml.message(`Hey ${player.display_name}! No question is open right now. Watch the screen! 👀`)
    return twimlResponse(twiml)
  }

  const questionId = gameState.active_question_id

  // ── 7. Check if player already answered this round ───────────────────────
  const { data: existing } = await supabaseAdmin
    .from('player_responses')
    .select('id')
    .eq('player_id', player.id)
    .eq('question_id', questionId)
    .single()

  if (existing) {
    twiml.message(`${player.display_name}, you already answered this round! Wait for the next question. 😄`)
    return twimlResponse(twiml)
  }

  // ── 8. Load board answers and fuzzy match ────────────────────────────────
  const { data: boardAnswers } = await supabaseAdmin
    .from('question_answers')
    .select('*')
    .eq('question_id', questionId)
    .order('display_order')

  const matched = matchAnswer(rawMessage, boardAnswers || [])

  // ── 9. Save the response ─────────────────────────────────────────────────
  await supabaseAdmin.from('player_responses').insert({
    player_id: player.id,
    question_id: questionId,
    raw_answer: rawMessage,
    matched_answer: matched?.answer_text || null,
    points_earned: matched?.points || 0,
  })

  // ── 10. If matched, reveal the answer on the board + update score ─────────
  if (matched) {
    await supabaseAdmin
      .from('question_answers')
      .update({ is_revealed: true })
      .eq('id', matched.id)

    const newScore = player.total_score + matched.points
    await supabaseAdmin
      .from('players')
      .update({ total_score: newScore })
      .eq('id', player.id)

    twiml.message(
      `🔥 MATCH! "${matched.answer_text}" — #${matched.display_order} answer!\n+${matched.points} pts\nYour total: ${newScore} pts`
    )
  } else {
    twiml.message(
      `❌ "${rawMessage}" is not on the board, ${player.display_name}!\nKeep going — next question coming up!`
    )
  }

  return twimlResponse(twiml)
}

function twimlResponse(twiml: twilio.twiml.MessagingResponse) {
  return new NextResponse(twiml.toString(), {
    headers: { 'Content-Type': 'text/xml' },
  })
}
