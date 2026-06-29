'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import LeaderboardTicker from '@/components/LeaderboardTicker'

interface Slide {
  id: string
  slide_order: number
  slide_type: string
  title: string | null
  body: string | null
  image_url: string | null
  settings: any
}

interface Presentation {
  id: string
  title: string
  join_code: string
  is_live: boolean
  current_slide: number
  slides: Slide[]
}

export default function PresenterPage() {
  const params = useParams()
  const id = params.id as string

  const [presentation, setPresentation] = useState<Presentation | null>(null)
  const [slides, setSlides] = useState<Slide[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [participantCount, setParticipantCount] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const loadPresentation = useCallback(async () => {
    const res = await fetch(`/api/presentations/${id}`)
    const data = await res.json()
    if (data.error) return
    setPresentation(data)
    setSlides(data.slides || [])
    setCurrentIndex(data.current_slide || 0)
    setLoading(false)
  }, [id])

  // Start live session on mount
  useEffect(() => {
    loadPresentation().then(() => {
      fetch(`/api/presentations/${id}/live`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      })
    })

    // Load participant count
    const loadCount = async () => {
      const { count } = await supabase
        .from('participants')
        .select('*', { count: 'exact', head: true })
        .eq('presentation_id', id)
        .eq('is_active', true)
      setParticipantCount(count || 0)
    }
    loadCount()

    // Realtime: participant joins
    const channel = supabase
      .channel('presenter-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'participants' }, () => {
        loadCount()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      // Stop live session on unmount
      fetch(`/api/presentations/${id}/live`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' }),
      })
    }
  }, [id, loadPresentation])

  // Navigate slides
  const goToSlide = async (index: number) => {
    if (index < 0 || index >= slides.length) return
    setCurrentIndex(index)
    await fetch(`/api/presentations/${id}/live`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'navigate', current_slide: index }),
    })
  }

  const nextSlide = () => goToSlide(currentIndex + 1)
  const prevSlide = () => goToSlide(currentIndex - 1)

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); nextSlide() }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prevSlide() }
      if (e.key === 'f' || e.key === 'F') { toggleFullscreen() }
      if (e.key === 'Escape' && isFullscreen) { exitFullscreen() }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [currentIndex, slides.length, isFullscreen])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const exitFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-yellow-400 text-xl animate-pulse">Loading presentation...</div>
    </div>
  )

  if (!slides.length) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="text-5xl mb-4">📎</div>
      <h2 className="text-2xl font-bold text-white mb-2">No slides yet</h2>
      <p className="text-white/50 mb-6">Add slides in the editor first</p>
      <a href={`/presentations/${id}/edit`} className="bg-yellow-400 text-[#0f0f3d] font-bold px-6 py-3 rounded-xl">
        Go to Editor
      </a>
    </div>
  )

  const currentSlide = slides[currentIndex]

  return (
    <div className="min-h-screen flex flex-col bg-[#0f0f3d]">
      {/* Leaderboard ticker */}
      <LeaderboardTicker presentationId={id} />

      {/* Join info bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white/5">
        <div className="flex items-center gap-4">
          <span className="text-white/40 text-sm">Join:</span>
          <span className="text-yellow-400 font-bold font-mono text-lg">{presentation?.join_code}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-white/50 text-sm">👥 {participantCount} joined</span>
          <span className="text-white/30 text-sm">{currentIndex + 1} / {slides.length}</span>
        </div>
      </div>

      {/* Slide area */}
      <div className="flex-1 flex items-center justify-center p-4 relative">
        {/* Slide content */}
        <div className="w-full max-w-5xl aspect-video bg-[#1a1a6e] rounded-2xl overflow-hidden shadow-2xl relative">
          {currentSlide.image_url ? (
            <img
              src={currentSlide.image_url}
              alt={currentSlide.title || `Slide ${currentIndex + 1}`}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-12">
              {currentSlide.title && (
                <h1 className="text-white text-4xl font-bold mb-6 text-center">{currentSlide.title}</h1>
              )}
              {currentSlide.body && (
                <p className="text-white/70 text-xl text-center leading-relaxed max-w-2xl">{currentSlide.body}</p>
              )}
            </div>
          )}
        </div>

        {/* Navigation arrows */}
        {currentIndex > 0 && (
          <button
            onClick={prevSlide}
            className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white text-xl transition-colors"
          >
            ◀
          </button>
        )}
        {currentIndex < slides.length - 1 && (
          <button
            onClick={nextSlide}
            className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white text-xl transition-colors"
          >
            ▶
          </button>
        )}
      </div>

      {/* Bottom control bar */}
      <div className="border-t border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <a href={`/presentations/${id}/edit`} className="text-white/40 hover:text-white text-sm transition-colors">
            ← Editor
          </a>
        </div>

        {/* Slide dots */}
        <div className="flex items-center gap-1">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goToSlide(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === currentIndex ? 'bg-yellow-400 w-4' : 'bg-white/20 hover:bg-white/40'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleFullscreen}
            className="text-white/40 hover:text-white text-sm transition-colors"
          >
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
          <button className="bg-yellow-400/20 text-yellow-400 text-sm font-medium px-3 py-1 rounded-lg hover:bg-yellow-400/30 transition-colors">
            🎮 Game
          </button>
        </div>
      </div>
    </div>
  )
}
