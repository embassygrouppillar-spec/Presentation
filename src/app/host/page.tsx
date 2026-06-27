'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import QRCode from 'qrcode'

interface Member { id: string; name: string; role: string; company: string; display_order: number }
interface Answer { id: string; answer_text: string; points: number; display_order: number; is_revealed: boolean }
interface Question { id: string; member_id: string; question_text: string; is_active: boolean; is_complete: boolean; members: Member; question_answers: Answer[] }
interface Player { id: string; display_name: string; phone_number: string; total_score: number }
interface Response { id: string; raw_answer: string; matched_answer: string | null; points_earned: number; display_name?: string }

export default function HostPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [responses, setResponses] = useState<Response[]>([])
  const [selected, setSelected] = useState<Question | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [strikes, setStrikes] = useState(0)
  const [gamePhase, setGamePhase] = useState('registration')
  const [loading, setLoading] = useState(true)
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const loadData = useCallback(async () => {
    const [qRes, pRes] = await Promise.all([
      fetch('/api/questions'),
      fetch('/api/players'),
    ])
    setQuestions(await qRes.json())
    setPlayers(await pRes.json())
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()

    // Realtime: watch for new responses
    const channel = supabase
      .channel('host-responses')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'player_responses' }, () => {
        loadResponses()
        loadData()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_state' }, payload => {
        setStrikes(payload.new.strikes || 0)
        setGamePhase(payload.new.game_phase)
        setActiveQuestionId(payload.new.active_question_id)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [loadData])

  const loadResponses = async () => {
    if (!activeQuestionId) return
    const { data } = await supabase
      .from('player_responses')
      .select('*, players(display_name)')
      .eq('question_id', activeQuestionId)
      .order('received_at', { ascending: false })
    setResponses((data || []).map((r: any) => ({ ...r, display_name: r.players?.display_name })))
  }

  useEffect(() => { loadResponses() }, [activeQuestionId])

  const openModal = async (q: Question) => {
    setSelected(q)
    const url = `${appUrl}/play`
    const dataUrl = await QRCode.toDataURL(url, { width: 180, margin: 1, color: { dark: '#1a1a6e', light: '#ffffff' } })
    setQrDataUrl(dataUrl)
  }

  const activateQuestion = async (q: Question) => {
    await fetch('/api/questions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question_id: q.id, action: 'activate' }),
    })
    setActiveQuestionId(q.id)
    setGamePhase('playing')
    setStrikes(0)
    setResponses([])
    loadData()
  }

  const completeQuestion = async (q: Question) => {
    await fetch('/api/questions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question_id: q.id, action: 'complete' }),
    })
    setSelected(null)
    setActiveQuestionId(null)
    setGamePhase('registration')
    loadData()
  }

  const addStrike = async () => {
    const newStrikes = Math.min(strikes + 1, 3)
    setStrikes(newStrikes)
    await fetch('/api/answers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strikes: newStrikes }),
    })
  }

  const revealAnswer = async (answerId: string) => {
    await supabase.from('question_answers').update({ is_revealed: true }).eq('id', answerId)
    loadData()
  }

  const completed = questions.filter(q => q.is_complete).length
  const total = questions.length

  if (loading) return (
    <div className="min-h-screen bg-[#0f0f3d] flex items-center justify-center">
      <p className="text-yellow-400 text-xl animate-pulse">Loading B&I Feud...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0f0f3d] text-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-yellow-400">⭐ B&I Family Feud</h1>
          <p className="text-white/60 text-sm">Host Control Panel</p>
        </div>
        <div className="text-right">
          <div className="text-white/50 text-xs">Progress</div>
          <div className="text-xl font-bold">{completed}/{total}</div>
          <div className="text-white/50 text-xs">{players.length} players registered</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-white/10 rounded-full h-2 mb-6">
        <div className="bg-yellow-400 h-2 rounded-full transition-all" style={{ width: `${total ? (completed / total) * 100 : 0}%` }} />
      </div>

      {/* Status bar */}
      <div className={`rounded-xl p-3 mb-6 text-center text-sm font-medium ${gamePhase === 'playing' ? 'bg-green-800/50 text-green-300' : 'bg-white/10 text-white/60'}`}>
        {gamePhase === 'playing'
          ? `🟢 ROUND OPEN — answers coming in via SMS`
          : `⏸ Waiting — click a member to open their round`}
      </div>

      {/* Member grid */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {questions.map(q => (
          <button
            key={q.id}
            onClick={() => openModal(q)}
            className={`rounded-xl p-3 text-center transition-all border ${
              q.is_complete
                ? 'bg-green-900/40 border-green-600 opacity-75'
                : q.is_active
                ? 'bg-yellow-500/20 border-yellow-400 ring-2 ring-yellow-400'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mx-auto mb-2 ${q.is_complete ? 'bg-green-600' : 'bg-[#1a1a6e]'}`}>
              {q.is_complete ? '✓' : q.members?.name?.split(' ').map((n: string) => n[0]).join('')}
            </div>
            <div className="text-xs font-medium truncate">{q.members?.name}</div>
            <div className="text-xs text-white/40 truncate">{q.members?.role}</div>
            {q.is_active && <div className="text-xs text-yellow-400 mt-1">ACTIVE</div>}
          </button>
        ))}
      </div>

      {/* Live buzz feed */}
      {responses.length > 0 && (
        <div className="bg-white/5 rounded-xl p-4 mb-6">
          <div className="text-xs text-white/50 uppercase tracking-wide mb-3">Live Answers</div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {responses.map(r => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <span><span className="font-medium">{r.display_name}</span>: "{r.raw_answer}"</span>
                {r.matched_answer
                  ? <span className="text-green-400 text-xs">+{r.points_earned} ✓</span>
                  : <span className="text-red-400 text-xs">miss</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Players registered */}
      <div className="bg-white/5 rounded-xl p-4">
        <div className="text-xs text-white/50 uppercase tracking-wide mb-3">Registered Players ({players.length})</div>
        <div className="flex flex-wrap gap-2">
          {players.map(p => (
            <span key={p.id} className="bg-[#1a1a6e] text-yellow-400 text-xs px-2 py-1 rounded-full">
              {p.display_name} · {p.total_score}pts
            </span>
          ))}
        </div>
        {players.length === 0 && <p className="text-white/40 text-sm">Waiting for players to text in...</p>}
      </div>

      {/* Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={e => { if (e.target === e.currentTarget) setSelected(null) }}>
          <div className="bg-[#0f0f3d] border border-white/20 rounded-2xl w-full max-w-md overflow-hidden">

            {/* Modal header */}
            <div className="bg-[#1a1a6e] p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-yellow-400 flex items-center justify-center text-[#1a1a6e] font-bold text-lg">
                {selected.members?.name?.split(' ').map((n: string) => n[0]).join('')}
              </div>
              <div className="flex-1">
                <div className="font-bold text-lg">{selected.members?.name}</div>
                <div className="text-white/60 text-sm">{selected.members?.role} · {selected.members?.company}</div>
              </div>
              <button onClick={() => setSelected(null)} className="text-white/40 hover:text-white text-2xl">×</button>
            </div>

            <div className="p-4 space-y-4">
              {/* Question */}
              <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-xl p-3">
                <div className="text-xs text-yellow-400/70 uppercase tracking-wide mb-1">The Question</div>
                <p className="text-yellow-100 font-medium">{selected.question_text}</p>
              </div>

              {/* QR + phone number */}
              <div className="flex gap-3 bg-white/5 rounded-xl p-3">
                {qrDataUrl && <img src={qrDataUrl} alt="QR code" className="w-20 h-20 rounded-lg" />}
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1">Members scan to play</p>
                  <p className="text-white/50 text-xs mb-2">Or text your answer to:</p>
                  <p className="text-yellow-400 font-bold">{process.env.NEXT_PUBLIC_APP_URL?.replace('https://', '') || 'bi-feud.app/play'}</p>
                  <p className="text-white/40 text-xs mt-1">Twilio: {process.env.TWILIO_PHONE_NUMBER}</p>
                </div>
              </div>

              {/* Strikes */}
              <div className="flex items-center justify-between">
                <div className="flex gap-3">
                  {[1,2,3].map(i => (
                    <span key={i} className={`text-3xl font-bold transition-colors ${i <= strikes ? 'text-red-500' : 'text-white/20'}`}>✗</span>
                  ))}
                </div>
                <button onClick={addStrike} className="bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
                  + Strike
                </button>
              </div>

              {/* Answer board */}
              <div>
                <div className="text-xs text-white/50 uppercase tracking-wide mb-2">Answer Board (tap to reveal)</div>
                <div className="grid grid-cols-2 gap-2">
                  {[...selected.question_answers].sort((a, b) => a.display_order - b.display_order).map(ans => (
                    <button
                      key={ans.id}
                      onClick={() => revealAnswer(ans.id)}
                      className={`rounded-lg p-2 text-left transition-all ${ans.is_revealed ? 'bg-green-800' : 'bg-red-900 hover:bg-red-800'}`}
                    >
                      <div className="text-xs text-white/50">#{ans.display_order}</div>
                      <div className={`text-sm font-medium ${ans.is_revealed ? 'text-white' : 'text-transparent select-none bg-white/10 rounded'}`}>
                        {ans.is_revealed ? ans.answer_text : '██████████'}
                      </div>
                      <div className="text-xs text-yellow-400">{ans.points} pts</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-2">
                {!selected.is_active && !selected.is_complete && (
                  <button onClick={() => activateQuestion(selected)} className="flex-1 bg-yellow-400 text-[#1a1a6e] font-bold py-3 rounded-xl">
                    🟢 Open Round
                  </button>
                )}
                {selected.is_active && (
                  <button onClick={() => completeQuestion(selected)} className="flex-1 bg-green-700 hover:bg-green-600 text-white font-bold py-3 rounded-xl">
                    ✓ Mark Complete
                  </button>
                )}
                <button onClick={() => setSelected(null)} className="px-4 bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
