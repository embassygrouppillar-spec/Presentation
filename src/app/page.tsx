'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import LeaderboardTicker from '@/components/LeaderboardTicker'

interface Slide {
  id: string
  slide_order: number
  slide_type: string
  title: string | null
  body: string | null
  image_url: string | null
}

interface Presentation {
  id: string
  title: string
  join_code: string
  is_live: boolean
  current_slide: number
}

export default function HomePage() {
  const [presentation, setPresentation] = useState<Presentation | null>(null)
  const [slides, setSlides] = useState<Slide[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null)

  // Find the live presentation
  useEffect(() => {
    const loadLive = async () => {
      const { data } = await supabase
        .from('presentations')
        .select('*')
        .eq('is_live', true)
        .single()

      if (data) {
        setPresentation(data)
        setCurrentIndex(data.current_slide || 0)

        const { data: slideData } = await supabase
          .from('slides')
          .select('*')
          .eq('presentation_id', data.id)
          .order('slide_order')
        setSlides(slideData || [])
      }
      setLoading(false)
    }

    loadLive()

    // Realtime: listen for presentation updates
    const channel = supabase
      .channel('home-live')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'presentations' }, (payload) => {
        const p = payload.new as any
        if (p.is_live) {
          setPresentation(p)
          setCurrentIndex(p.current_slide || 0)
        } else if (p.id === presentation?.id) {
          setPresentation(null)
          setSlides([])
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // Navigate slides
  const goToSlide = async (index: number) => {
    if (index < 0 || index >= slides.length) return
    setCurrentIndex(index)

    // Update the presentation's current_slide in the DB so audience sees it too
    if (presentation) {
      await fetch(`/api/presentations/${presentation.id}/live`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'navigate', current_slide: index }),
      })
    }
  }

  const nextSlide = () => goToSlide(currentIndex + 1)
  const prevSlide = () => goToSlide(currentIndex - 1)

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); nextSlide() }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prevSlide() }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [currentIndex, slides.length])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-yellow-400 text-xl animate-pulse">Loading...</div>
    </div>
  )

  // No live presentation
  if (!presentation) return (
    <div className="flex flex-col flex-1">
      <LeaderboardTicker />
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-4">📊</div>
        <h1 className="text-4xl font-bold text-white mb-3">Presentr</h1>
        <p className="text-white/50 text-lg max-w-md">
          No presentation is live right now. Check back when the host starts one.
        </p>
      </div>
    </div>
  )

  const currentSlide = slides[currentIndex]

  return (
    <div className="flex flex-col flex-1">
      {/* Leaderboard ticker */}
      <LeaderboardTicker presentationId={presentation.id} />

      {/* Family Feud drawer — slides up from bottom when game round active */}
      {activeQuestionId && (
        <FeudDrawer
          questionId={activeQuestionId}
          isHost={true}
          onClose={() => setActiveQuestionId(null)}
        />
      )}

      {/* Presentation area with arrows */}
      <div className={`flex-1 flex items-center justify-center relative px-4 py-6 ${activeQuestionId ? 'max-h-[45vh]' : ''}`}>
        {/* Left arrow */}
        <button
          onClick={prevSlide}
          disabled={currentIndex === 0}
          className={`absolute left-4 z-10 w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all ${
            currentIndex === 0
              ? 'bg-white/5 text-white/20 cursor-not-allowed'
              : 'bg-white/10 hover:bg-yellow-400/20 text-white hover:text-yellow-400 hover:scale-110'
          }`}
        >
          ◀
        </button>

        {/* Slide content */}
        <div className="w-full max-w-6xl mx-16 aspect-video bg-[#1a1a6e] rounded-2xl overflow-hidden shadow-2xl">
          {currentSlide?.image_url ? (
            <img
              src={currentSlide.image_url}
              alt={currentSlide.title || `Slide ${currentIndex + 1}`}
              className="w-full h-full object-contain"
            />
          ) : currentSlide ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-12">
              {currentSlide.title && (
                <h1 className="text-white text-5xl font-bold mb-6 text-center">{currentSlide.title}</h1>
              )}
              {currentSlide.body && (
                <p className="text-white/70 text-2xl text-center leading-relaxed max-w-3xl">{currentSlide.body}</p>
              )}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-white/30 text-lg">No slides</p>
            </div>
          )}
        </div>

        {/* Right arrow */}
        <button
          onClick={nextSlide}
          disabled={currentIndex === slides.length - 1}
          className={`absolute right-4 z-10 w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all ${
            currentIndex === slides.length - 1
              ? 'bg-white/5 text-white/20 cursor-not-allowed'
              : 'bg-white/10 hover:bg-yellow-400/20 text-white hover:text-yellow-400 hover:scale-110'
          }`}
        >
          ▶
        </button>
      </div>

      {/* Bottom bar — slide dots + join code */}
      <div className="border-t border-white/10 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-white/40 text-sm">Join:</span>
          <span className="text-yellow-400 font-bold font-mono text-lg">{presentation.join_code}</span>
        </div>

        {/* Slide dots */}
        <div className="flex items-center gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goToSlide(i)}
              className={`rounded-full transition-all ${
                i === currentIndex
                  ? 'bg-yellow-400 w-6 h-2.5'
                  : 'bg-white/20 hover:bg-white/40 w-2.5 h-2.5'
              }`}
            />
          ))}
        </div>

        <span className="text-white/30 text-sm">{currentIndex + 1} / {slides.length}</span>
      </div>
    </div>
  )
}
