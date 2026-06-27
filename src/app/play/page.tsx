'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type Screen = 'register' | 'waiting' | 'answer' | 'submitted' | 'results'

interface ActiveQuestion {
  id: string
  question_text: string
  member_name: string
}

export default function PlayPage() {
  const [screen, setScreen] = useState<Screen>('register')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [answer, setAnswer] = useState('')
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [playerName, setPlayerName] = useState('')
  const [playerScore, setPlayerScore] = useState(0)
  const [activeQuestion, setActiveQuestion] = useState<ActiveQuestion | null>(null)
  const [lastResult, setLastResult] = useState<{ matched: boolean; points: number; answer: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Watch game state for active questions
  useEffect(() => {
    const checkGameState = async () => {
      const { data } = await supabase
        .from('game_state')
        .select('*, questions(question_text, members(name))')
        .eq('id', 1)
        .single()

      if (data?.game_phase === 'playing' && data?.active_question_id) {
        setActiveQuestion({
          id: data.active_question_id,
          question_text: data.questions?.question_text || '',
          member_name: data.questions?.members?.name || '',
        })
        if (playerId) setScreen('answer')
      } else {
        setActiveQuestion(null)
        if (playerId) setScreen('waiting')
      }
    }

    checkGameState()

    const channel = supabase
      .channel('play-game-state')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_state' }, () => {
        checkGameState()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [playerId])

  const register = async () => {
    setError('')
    if (!name.trim()) { setError('Enter your name'); return }
    if (!phone.trim()) { setError('Enter your phone number'); return }

    const res = await fetch('/api/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: name.trim(), phone_number: phone.trim() }),
    })
    const data = await res.json()
    if (data.error) { setError(data.error); return }

    setPlayerId(data.id)
    setPlayerName(data.display_name)
    setPlayerScore(data.total_score || 0)
    setScreen(activeQuestion ? 'answer' : 'waiting')
  }

  const submitAnswer = async () => {
    if (!answer.trim() || !playerId || !activeQuestion) return
    setSubmitting(true)

    const res = await fetch('/api/players/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player_id: playerId,
        question_id: activeQuestion.id,
        raw_answer: answer.trim(),
      }),
    })
    const data = await res.json()
    setLastResult(data)
    if (data.points > 0) setPlayerScore(s => s + data.points)
    setAnswer('')
    setScreen('submitted')
    setSubmitting(false)
  }

  // ── Screens ───────────────────────────────────────────────────────────────

  if (screen === 'register') return (
    <div className="min-h-screen bg-[#0f0f3d] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">⭐</div>
          <h1 className="text-3xl font-bold text-yellow-400">B&I Family Feud</h1>
          <p className="text-white/60 mt-2">Register to play — lunch is on the line!</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-white/60 text-sm block mb-1">Your name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="First name or full name"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-yellow-400"
            />
          </div>
          <div>
            <label className="text-white/60 text-sm block mb-1">Your phone number</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="(314) 555-1234"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-yellow-400"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={register}
            className="w-full bg-yellow-400 text-[#0f0f3d] font-bold py-4 rounded-xl text-lg"
          >
            Join the Game →
          </button>

          <p className="text-white/30 text-xs text-center">
            You can also register by texting your name to {process.env.NEXT_PUBLIC_TWILIO_PHONE || 'our game number'}
          </p>
        </div>
      </div>
    </div>
  )

  if (screen === 'waiting') return (
    <div className="min-h-screen bg-[#0f0f3d] flex flex-col items-center justify-center p-6 text-center">
      <div className="text-5xl mb-4 animate-bounce">👀</div>
      <h2 className="text-2xl font-bold text-yellow-400 mb-2">You're in, {playerName}!</h2>
      <p className="text-white/60 mb-6">Watch the screen — a question will open soon.</p>
      <div className="bg-white/10 rounded-xl px-6 py-3">
        <span className="text-white/50 text-sm">Your score: </span>
        <span className="text-yellow-400 font-bold text-xl">{playerScore} pts</span>
      </div>
      <p className="text-white/30 text-xs mt-8">This page will update automatically when a round opens</p>
    </div>
  )

  if (screen === 'answer') return (
    <div className="min-h-screen bg-[#0f0f3d] flex flex-col p-6">
      <div className="text-center mb-6">
        <div className="text-sm text-white/50 uppercase tracking-wide mb-1">Question about</div>
        <div className="text-yellow-400 font-bold text-lg">{activeQuestion?.member_name}</div>
      </div>

      <div className="bg-[#1a1a6e] rounded-2xl p-5 mb-6 flex-1 flex items-center justify-center">
        <p className="text-white text-xl font-medium text-center leading-relaxed">
          {activeQuestion?.question_text}
        </p>
      </div>

      <div className="space-y-3">
        <input
          type="text"
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submitAnswer()}
          placeholder="Type your answer..."
          autoFocus
          className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-4 text-white text-lg placeholder-white/30 focus:outline-none focus:border-yellow-400"
        />
        <button
          onClick={submitAnswer}
          disabled={submitting || !answer.trim()}
          className="w-full bg-yellow-400 disabled:opacity-50 text-[#0f0f3d] font-bold py-4 rounded-xl text-lg"
        >
          {submitting ? 'Sending...' : 'Submit Answer →'}
        </button>
        <p className="text-white/30 text-xs text-center">Score: {playerScore} pts</p>
      </div>
    </div>
  )

  if (screen === 'submitted') return (
    <div className="min-h-screen bg-[#0f0f3d] flex flex-col items-center justify-center p-6 text-center">
      {lastResult?.matched ? (
        <>
          <div className="text-6xl mb-4">🔥</div>
          <h2 className="text-3xl font-bold text-green-400 mb-2">Match!</h2>
          <p className="text-white/70 mb-2">"{lastResult.answer}"</p>
          <p className="text-yellow-400 text-4xl font-bold mb-1">+{lastResult.points}</p>
          <p className="text-white/50 text-sm mb-6">Total: {playerScore} pts</p>
        </>
      ) : (
        <>
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-3xl font-bold text-red-400 mb-2">Not on the board!</h2>
          <p className="text-white/50 mb-6">Nice try — watch for the next question</p>
        </>
      )}
      <button onClick={() => setScreen('waiting')} className="bg-white/10 text-white px-8 py-3 rounded-xl">
        Back to waiting room
      </button>
    </div>
  )

  return null
}
