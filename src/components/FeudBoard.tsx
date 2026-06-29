'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Answer {
  id: string
  answer_text: string
  points: number
  display_order: number
  is_revealed: boolean
}

interface FeudQuestion {
  id: string
  question_text: string
  member_name?: string
}

interface Props {
  questionId: string
  isHost?: boolean
  onClose?: () => void
}

export default function FeudBoard({ questionId, isHost = false, onClose }: Props) {
  const [question, setQuestion] = useState<FeudQuestion | null>(null)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [strikes, setStrikes] = useState(0)
  const [totalPoints, setTotalPoints] = useState(0)
  const [showQuestion, setShowQuestion] = useState(true)

  // Load question + answers
  useEffect(() => {
    const load = async () => {
      const { data: q } = await supabase
        .from('questions')
        .select('*, members(name)')
        .eq('id', questionId)
        .single()

      if (q) {
        setQuestion({
          id: q.id,
          question_text: q.question_text,
          member_name: q.members?.name,
        })
      }

      const { data: ans } = await supabase
        .from('question_answers')
        .select('*')
        .eq('question_id', questionId)
        .order('display_order')

      if (ans) {
        setAnswers(ans)
        setTotalPoints(ans.filter((a: Answer) => a.is_revealed).reduce((sum: number, a: Answer) => sum + a.points, 0))
      }
    }

    load()

    // Realtime: watch for answer reveals
    const channel = supabase
      .channel(`feud-${questionId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'question_answers', filter: `question_id=eq.${questionId}` }, (payload) => {
        const updated = payload.new as Answer
        setAnswers(prev => {
          const newAnswers = prev.map(a => a.id === updated.id ? updated : a)
          setTotalPoints(newAnswers.filter(a => a.is_revealed).reduce((sum, a) => sum + a.points, 0))
          return newAnswers
        })
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_state' }, (payload) => {
        setStrikes(payload.new.strikes || 0)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [questionId])

  const revealAnswer = async (answerId: string) => {
    if (!isHost) return
    await supabase.from('question_answers').update({ is_revealed: true }).eq('id', answerId)
  }

  const addStrike = async () => {
    if (!isHost) return
    const newStrikes = Math.min(strikes + 1, 3)
    setStrikes(newStrikes)
    await supabase.from('game_state').update({ strikes: newStrikes }).eq('id', 1)
  }

  const resetStrikes = () => {
    setStrikes(0)
    supabase.from('game_state').update({ strikes: 0 }).eq('id', 1)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a2e] p-4">
      {/* Close button (host only) */}
      {isHost && onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white text-2xl z-50"
        >
          ✕
        </button>
      )}

      <div className="w-full max-w-4xl">
        {/* Points display */}
        <div className="text-center mb-4">
          <div className="inline-block bg-yellow-400 text-[#0f0f3d] font-black text-4xl px-8 py-3 rounded-2xl shadow-lg">
            {totalPoints}
          </div>
        </div>

        {/* Question */}
        <div className="bg-[#1a1a6e] rounded-2xl p-6 mb-6 text-center border-4 border-yellow-400/30">
          {question?.member_name && (
            <p className="text-yellow-400/70 text-sm uppercase tracking-wide mb-2">About {question.member_name}</p>
          )}
          <h2 className="text-white text-2xl md:text-3xl font-bold leading-relaxed">
            {question?.question_text || 'Loading...'}
          </h2>
        </div>

        {/* Answer board — Family Feud style */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {answers.map((ans) => (
            <button
              key={ans.id}
              onClick={() => revealAnswer(ans.id)}
              disabled={!isHost || ans.is_revealed}
              className={`relative rounded-xl p-4 min-h-[70px] flex items-center justify-between border-2 transition-all duration-500 ${
                ans.is_revealed
                  ? 'bg-blue-800 border-blue-400 shadow-lg shadow-blue-500/20'
                  : 'bg-[#1a1a4e] border-white/10 hover:border-yellow-400/50'
              } ${isHost && !ans.is_revealed ? 'cursor-pointer hover:scale-[1.02]' : ''}`}
            >
              {/* Number badge */}
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                ans.is_revealed ? 'bg-blue-600 text-white' : 'bg-white/10 text-white/40'
              }`}>
                {ans.display_order}
              </span>

              {/* Answer text or hidden */}
              <span className={`flex-1 text-center font-bold text-lg ${
                ans.is_revealed ? 'text-white' : 'text-transparent select-none'
              }`}>
                {ans.is_revealed ? ans.answer_text.toUpperCase() : '████████'}
              </span>

              {/* Points */}
              <span className={`text-sm font-bold ${
                ans.is_revealed ? 'text-yellow-400' : 'text-transparent'
              }`}>
                {ans.is_revealed ? ans.points : '00'}
              </span>
            </button>
          ))}
        </div>

        {/* Strikes */}
        <div className="flex items-center justify-center gap-6 mb-4">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className={`text-5xl font-black transition-all duration-300 ${
                i <= strikes
                  ? 'text-red-500 scale-110 animate-pop'
                  : 'text-white/10'
              }`}
            >
              ✗
            </div>
          ))}
        </div>

        {/* Host controls */}
        {isHost && (
          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              onClick={addStrike}
              disabled={strikes >= 3}
              className="bg-red-600 hover:bg-red-500 disabled:opacity-30 text-white font-bold px-6 py-3 rounded-xl transition-colors"
            >
              + Strike
            </button>
            <button
              onClick={resetStrikes}
              className="bg-white/10 hover:bg-white/20 text-white/60 px-4 py-3 rounded-xl transition-colors text-sm"
            >
              Reset Strikes
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="bg-green-700 hover:bg-green-600 text-white font-bold px-6 py-3 rounded-xl transition-colors"
              >
                ✓ End Round
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
