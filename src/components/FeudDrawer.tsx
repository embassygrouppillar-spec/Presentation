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

interface Props {
  questionId: string
  isHost?: boolean
  onClose?: () => void
}

export default function FeudDrawer({ questionId, isHost = false, onClose }: Props) {
  const [questionText, setQuestionText] = useState('')
  const [answers, setAnswers] = useState<Answer[]>([])
  const [strikes, setStrikes] = useState(0)
  const [totalPoints, setTotalPoints] = useState(0)

  useEffect(() => {
    const load = async () => {
      const { data: q } = await supabase
        .from('questions')
        .select('question_text')
        .eq('id', questionId)
        .single()
      if (q) setQuestionText(q.question_text)

      const { data: ans } = await supabase
        .from('question_answers')
        .select('*')
        .eq('question_id', questionId)
        .order('display_order')
      if (ans) {
        setAnswers(ans)
        setTotalPoints(ans.filter(a => a.is_revealed).reduce((sum, a) => sum + a.points, 0))
      }
    }
    load()

    // Realtime
    const channel = supabase
      .channel(`feud-drawer-${questionId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'question_answers', filter: `question_id=eq.${questionId}` }, (payload) => {
        const updated = payload.new as Answer
        setAnswers(prev => {
          const next = prev.map(a => a.id === updated.id ? updated : a)
          setTotalPoints(next.filter(a => a.is_revealed).reduce((sum, a) => sum + a.points, 0))
          return next
        })
        // Play sound on reveal
        if (updated.is_revealed) {
          try { new Audio('/sounds/Correct.wav').play() } catch {}
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_state' }, (payload) => {
        setStrikes(payload.new.strikes || 0)
      })
      .subscribe()

    // Get current strikes
    supabase.from('game_state').select('strikes').eq('id', 1).single()
      .then(({ data }) => { if (data) setStrikes(data.strikes || 0) })

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
    try { new Audio('/sounds/Wrong.wav').play() } catch {}
  }

  return (
    <div className="border-t-2 border-yellow-400/30 bg-[#0a0a2e] animate-slide-up">
      {/* Question + points bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a6e]/50">
        <p className="text-white font-bold text-sm truncate flex-1 mr-4">{questionText}</p>
        <div className="flex items-center gap-3">
          {/* Strikes */}
          <div className="flex gap-1">
            {[1, 2, 3].map(i => (
              <span key={i} className={`text-lg font-black ${i <= strikes ? 'text-red-500' : 'text-white/15'}`}>✗</span>
            ))}
          </div>
          {/* Points */}
          <span className="bg-yellow-400 text-[#0f0f3d] font-black text-sm px-3 py-1 rounded-lg">{totalPoints}</span>
          {/* Host: strike + close */}
          {isHost && (
            <>
              <button onClick={addStrike} disabled={strikes >= 3} className="bg-red-600/80 hover:bg-red-500 disabled:opacity-30 text-white text-xs font-bold px-2 py-1 rounded">✗</button>
              {onClose && <button onClick={onClose} className="text-white/40 hover:text-white text-sm">✕</button>}
            </>
          )}
        </div>
      </div>

      {/* Answer grid — compact 2x3 */}
      <div className="grid grid-cols-3 gap-2 p-3">
        {answers.map((ans) => (
          <button
            key={ans.id}
            onClick={() => revealAnswer(ans.id)}
            disabled={!isHost || ans.is_revealed}
            className={`rounded-lg px-3 py-2 flex items-center gap-2 border transition-all duration-300 ${
              ans.is_revealed
                ? 'bg-blue-800/80 border-blue-500/50'
                : 'bg-[#1a1a4e] border-white/10'
            } ${isHost && !ans.is_revealed ? 'hover:border-yellow-400/50 cursor-pointer' : ''}`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
              ans.is_revealed ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/30'
            }`}>
              {ans.display_order}
            </span>
            <span className={`text-sm font-bold truncate ${ans.is_revealed ? 'text-white' : 'text-transparent select-none'}`}>
              {ans.is_revealed ? ans.answer_text.toUpperCase() : '██████'}
            </span>
            <span className={`text-xs font-bold ml-auto shrink-0 ${ans.is_revealed ? 'text-yellow-400' : 'text-transparent'}`}>
              {ans.points}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
