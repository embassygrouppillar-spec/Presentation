'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Answer { id: string; answer_text: string; points: number; display_order: number; is_revealed: boolean }
interface ActiveQuestion { id: string; question_text: string; member_name: string; member_role: string }
interface Player { display_name: string; total_score: number }

type BoardView = 'game' | 'leaderboard' | 'registration'

export default function BoardPage() {
  const [view, setView] = useState<BoardView>('registration')
  const [activeQuestion, setActiveQuestion] = useState<ActiveQuestion | null>(null)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [strikes, setStrikes] = useState(0)
  const [players, setPlayers] = useState<Player[]>([])
  const [playerCount, setPlayerCount] = useState(0)
  const [roundPoints, setRoundPoints] = useState(0)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const loadAnswers = async (questionId: string) => {
    const { data } = await supabase
      .from('question_answers')
      .select('*')
      .eq('question_id', questionId)
      .order('display_order')
    if (data) {
      setAnswers(data)
      setRoundPoints(data.filter(a => a.is_revealed).reduce((sum, a) => sum + a.points, 0))
    }
  }

  const loadPlayers = async () => {
    const { data } = await supabase
      .from('players')
      .select('display_name, total_score')
      .order('total_score', { ascending: false })
      .limit(10)
    setPlayers(data || [])
    const { count } = await supabase.from('players').select('*', { count: 'exact', head: true })
    setPlayerCount(count || 0)
  }

  useEffect(() => {
    loadPlayers()

    const channel = supabase
      .channel('board-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_state' }, async payload => {
        const gs = payload.new
        setStrikes(gs.strikes || 0)

        if (gs.game_phase === 'playing' && gs.active_question_id) {
          // Load question details
          const { data: q } = await supabase
            .from('questions')
            .select('*, members(name, role)')
            .eq('id', gs.active_question_id)
            .single()

          if (q) {
            setActiveQuestion({
              id: q.id,
              question_text: q.question_text,
              member_name: q.members?.name || '',
              member_role: q.members?.role || '',
            })
            await loadAnswers(gs.active_question_id)
            setView('game')
          }
        } else {
          setView('registration')
          setActiveQuestion(null)
          setAnswers([])
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'question_answers' }, payload => {
        setAnswers(prev => prev.map(a => a.id === payload.new.id ? { ...a, ...payload.new } : a))
        setRoundPoints(prev => {
          if (payload.new.is_revealed && !payload.old.is_revealed) {
            return prev + (payload.new.points || 0)
          }
          return prev
        })
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'players' }, () => {
        loadPlayers()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // ── Registration / waiting screen ────────────────────────────────────────
  if (view === 'registration') return (
    <div className="min-h-screen bg-[#0f0f3d] flex flex-col items-center justify-center text-white p-8">
      <div className="text-center mb-12">
        <div className="text-7xl mb-4">⭐</div>
        <h1 className="text-6xl font-bold text-yellow-400 mb-3">B&I Family Feud</h1>
        <p className="text-white/50 text-2xl">Lunch is on the line</p>
      </div>

      <div className="bg-white/10 rounded-3xl p-8 text-center mb-8 w-full max-w-md">
        <p className="text-white/60 text-lg mb-2">Register to play — scan or visit</p>
        <p className="text-yellow-400 text-3xl font-bold mb-4">{appUrl}/play</p>
        <div className="text-white/40 text-sm">Or text your name to your Twilio number</div>
      </div>

      <div className="text-center">
        <div className="text-5xl font-bold text-yellow-400">{playerCount}</div>
        <div className="text-white/50 text-lg">players registered</div>
        {players.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center mt-4 max-w-lg">
            {players.map((p, i) => (
              <span key={i} className="bg-white/10 text-white text-sm px-3 py-1 rounded-full">{p.display_name}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  // ── Game board ────────────────────────────────────────────────────────────
  if (view === 'game') return (
    <div className="min-h-screen bg-[#0f0f3d] text-white p-6 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-white/50 text-sm uppercase tracking-wide">Question about</div>
          <div className="text-yellow-400 text-2xl font-bold">{activeQuestion?.member_name}</div>
          <div className="text-white/40 text-sm">{activeQuestion?.member_role}</div>
        </div>
        <div className="text-right">
          <div className="text-white/50 text-sm">Round points</div>
          <div className="text-4xl font-bold text-yellow-400">{roundPoints}</div>
        </div>
      </div>

      {/* Question */}
      <div className="bg-[#1a1a6e] rounded-2xl p-6 mb-6 text-center">
        <p className="text-white text-2xl font-medium leading-relaxed">{activeQuestion?.question_text}</p>
      </div>

      {/* Answer board */}
      <div className="grid grid-cols-2 gap-4 mb-6 flex-1">
        {answers.map(ans => (
          <div
            key={ans.id}
            className={`rounded-2xl p-4 flex flex-col justify-between transition-all duration-500 ${ans.is_revealed ? 'bg-green-800' : 'bg-[#8b0000]'}`}
          >
            <div className="text-white/50 text-sm">#{ans.display_order}</div>
            <div className={`text-xl font-bold ${ans.is_revealed ? 'text-white' : 'text-transparent select-none'}`}>
              {ans.is_revealed ? ans.answer_text : '████████████'}
            </div>
            {ans.is_revealed && <div className="text-yellow-400 text-lg font-bold">{ans.points} pts</div>}
          </div>
        ))}
      </div>

      {/* Strikes */}
      <div className="flex items-center justify-center gap-8">
        {[1,2,3].map(i => (
          <span key={i} className={`text-6xl font-bold transition-all ${i <= strikes ? 'text-red-500 scale-110' : 'text-white/20'}`}>✗</span>
        ))}
      </div>
    </div>
  )

  // ── Leaderboard ───────────────────────────────────────────────────────────
  if (view === 'leaderboard') return (
    <div className="min-h-screen bg-[#0f0f3d] text-white p-8 flex flex-col">
      <h1 className="text-5xl font-bold text-yellow-400 text-center mb-10">🏆 Final Leaderboard</h1>
      <div className="max-w-2xl mx-auto w-full space-y-4">
        {players.map((p, i) => (
          <div key={i} className={`flex items-center gap-4 rounded-2xl p-5 ${i === 0 ? 'bg-yellow-400/20 border-2 border-yellow-400' : 'bg-white/10'}`}>
            <div className="text-4xl">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</div>
            <div className="flex-1">
              <div className="text-xl font-bold">{p.display_name}</div>
              {i === 0 && <div className="text-yellow-400 text-sm">🍽 Wins lunch!</div>}
            </div>
            <div className={`text-3xl font-bold ${i === 0 ? 'text-yellow-400' : 'text-white'}`}>{p.total_score}</div>
          </div>
        ))}
      </div>
    </div>
  )

  return null
}
