'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Screen = 'join' | 'waiting' | 'slide' | 'poll' | 'submitted' | 'results'

interface PollOption {
  id: string
  option_text: string
  option_order: number
  vote_count: number
}

interface ActivePoll {
  id: string
  question: string
  poll_type: string
  poll_options: PollOption[]
}

export default function AudiencePage() {
  const params = useParams()
  const code = (params.code as string).toUpperCase()

  const [screen, setScreen] = useState<Screen>('join')
  const [name, setName] = useState('')
  const [participantId, setParticipantId] = useState<string | null>(null)
  const [presentationId, setPresentationId] = useState<string | null>(null)
  const [presentationTitle, setPresentationTitle] = useState('')
  const [currentSlide, setCurrentSlide] = useState(0)
  const [slides, setSlides] = useState<any[]>([])
  const [activePoll, setActivePoll] = useState<ActivePoll | null>(null)
  const [answer, setAnswer] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [participantCount, setParticipantCount] = useState(0)

  // Join the presentation
  const handleJoin = async () => {
    if (!name.trim()) { setError('Enter your name'); return }
    setError('')

    const res = await fetch('/api/presentations/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ join_code: code, display_name: name.trim() }),
    })
    const data = await res.json()

    if (data.error) { setError(data.error); return }

    setParticipantId(data.participant.id)
    setPresentationId(data.presentation.id)
    setPresentationTitle(data.presentation.title)
    setCurrentSlide(data.presentation.current_slide || 0)

    // Load slides
    const slidesRes = await fetch(`/api/presentations/${data.presentation.id}/slides`)
    const slidesData = await slidesRes.json()
    setSlides(slidesData || [])

    setScreen(data.presentation.is_live ? 'slide' : 'waiting')
  }

  // Realtime subscriptions
  useEffect(() => {
    if (!presentationId) return

    const channel = supabase
      .channel('audience-live')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'presentations', filter: `id=eq.${presentationId}` }, (payload) => {
        const p = payload.new as any
        setCurrentSlide(p.current_slide || 0)
        if (p.is_live) {
          setScreen('slide')
        } else {
          setScreen('waiting')
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'polls' }, (payload) => {
        const poll = payload.new as any
        if (poll.is_open) {
          // A poll just opened — load it
          loadActivePoll()
        } else {
          // Poll closed
          setActivePoll(null)
          setScreen('slide')
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'participants' }, () => {
        loadParticipantCount()
      })
      .subscribe()

    loadParticipantCount()
    loadActivePoll()

    return () => { supabase.removeChannel(channel) }
  }, [presentationId])

  const loadParticipantCount = async () => {
    if (!presentationId) return
    const { count } = await supabase
      .from('participants')
      .select('*', { count: 'exact', head: true })
      .eq('presentation_id', presentationId)
      .eq('is_active', true)
    setParticipantCount(count || 0)
  }

  const loadActivePoll = async () => {
    if (!presentationId) return
    const { data } = await supabase
      .from('polls')
      .select('*, poll_options(*), slides!inner(presentation_id)')
      .eq('is_open', true)
      .eq('slides.presentation_id', presentationId)
      .single()

    if (data) {
      setActivePoll({
        id: data.id,
        question: data.question,
        poll_type: data.poll_type,
        poll_options: (data.poll_options || []).sort((a: any, b: any) => a.option_order - b.option_order),
      })
      setScreen('poll')
    }
  }

  const submitAnswer = async (optionId?: string) => {
    if (!participantId || !activePoll) return
    setSubmitting(true)

    await fetch('/api/audience/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        poll_id: activePoll.id,
        participant_id: participantId,
        selected_option: optionId || null,
        text_response: answer || null,
      }),
    })

    setScreen('submitted')
    setAnswer('')
    setSubmitting(false)
  }

  // ── Join screen ─────────────────────────────────────────────────────────
  if (screen === 'join') return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">📊</div>
          <h1 className="text-2xl font-bold text-white mb-1">Join Presentation</h1>
          <p className="text-white/50">Code: <span className="text-yellow-400 font-mono font-bold">{code}</span></p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-white/60 text-sm block mb-1">Your name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              placeholder="Enter your name"
              autoFocus
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-yellow-400"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            onClick={handleJoin}
            className="w-full bg-yellow-400 text-[#0f0f3d] font-bold py-4 rounded-xl text-lg hover:bg-yellow-300"
          >
            Join →
          </button>
        </div>
      </div>
    </div>
  )

  // ── Waiting screen ──────────────────────────────────────────────────────
  if (screen === 'waiting') return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="text-5xl mb-4 animate-bounce">👀</div>
      <h2 className="text-2xl font-bold text-white mb-2">You're in!</h2>
      <p className="text-white/50 mb-2">{presentationTitle}</p>
      <p className="text-white/40 text-sm mb-6">Waiting for the host to start...</p>
      <div className="bg-white/10 rounded-xl px-6 py-3">
        <span className="text-white/50 text-sm">👥 {participantCount} joined</span>
      </div>
    </div>
  )

  // ── Slide view ──────────────────────────────────────────────────────────
  if (screen === 'slide') {
    const slide = slides[currentSlide]
    return (
      <div className="min-h-screen flex flex-col">
        {/* Current slide */}
        <div className="flex-1 flex items-center justify-center p-4">
          {slide?.image_url ? (
            <img src={slide.image_url} alt="" className="max-w-full max-h-[70vh] rounded-xl" />
          ) : slide ? (
            <div className="text-center p-8">
              {slide.title && <h2 className="text-white text-2xl font-bold mb-3">{slide.title}</h2>}
              {slide.body && <p className="text-white/70 text-lg">{slide.body}</p>}
            </div>
          ) : (
            <p className="text-white/40">Waiting for slides...</p>
          )}
        </div>

        {/* Bottom info */}
        <div className="border-t border-white/10 px-4 py-3 flex items-center justify-between">
          <span className="text-white/30 text-sm">{presentationTitle}</span>
          <span className="text-white/30 text-xs">Slide {currentSlide + 1}/{slides.length}</span>
        </div>

        {/* Reaction bar */}
        <div className="border-t border-white/10 px-4 py-2 flex items-center justify-center gap-4">
          {['👍', '❤️', '😂', '🎉', '🤔'].map(emoji => (
            <button
              key={emoji}
              onClick={() => {
                supabase.from('reactions').insert({
                  presentation_id: presentationId,
                  participant_id: participantId,
                  emoji,
                  slide_index: currentSlide,
                })
              }}
              className="text-2xl hover:scale-125 transition-transform active:scale-90"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── Poll/game round ─────────────────────────────────────────────────────
  if (screen === 'poll' && activePoll) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">🎯</div>
          <h2 className="text-xl font-bold text-white leading-relaxed">{activePoll.question}</h2>
        </div>

        {activePoll.poll_type === 'multiple_choice' ? (
          <div className="space-y-3">
            {activePoll.poll_options.map((opt, i) => (
              <button
                key={opt.id}
                onClick={() => submitAnswer(opt.id)}
                disabled={submitting}
                className="w-full bg-white/10 hover:bg-yellow-400/20 border border-white/20 hover:border-yellow-400 rounded-xl px-4 py-4 text-left transition-colors disabled:opacity-50"
              >
                <span className="text-yellow-400 font-bold mr-3">{String.fromCharCode(65 + i)}</span>
                <span className="text-white">{opt.option_text}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <input
              type="text"
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitAnswer()}
              placeholder="Type your answer..."
              autoFocus
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-4 text-white placeholder-white/30 focus:outline-none focus:border-yellow-400 text-lg"
            />
            <button
              onClick={() => submitAnswer()}
              disabled={submitting || !answer.trim()}
              className="w-full bg-yellow-400 disabled:opacity-50 text-[#0f0f3d] font-bold py-4 rounded-xl text-lg"
            >
              {submitting ? 'Sending...' : 'Submit'}
            </button>
          </div>
        )}
      </div>
    </div>
  )

  // ── Submitted screen ────────────────────────────────────────────────────
  if (screen === 'submitted') return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="text-5xl mb-4">✓</div>
      <h2 className="text-2xl font-bold text-green-400 mb-2">Answer submitted!</h2>
      <p className="text-white/50 mb-6">Watch the screen for results</p>
      <button
        onClick={() => setScreen('slide')}
        className="bg-white/10 text-white px-6 py-3 rounded-xl hover:bg-white/20"
      >
        Back to slides
      </button>
    </div>
  )

  return null
}
