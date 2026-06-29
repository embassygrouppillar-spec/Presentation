'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'

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
  description: string | null
  join_code: string
  is_live: boolean
  current_slide: number
  slides: Slide[]
}

export default function EditPresentationPage() {
  const params = useParams()
  const id = params.id as string

  const [presentation, setPresentation] = useState<Presentation | null>(null)
  const [slides, setSlides] = useState<Slide[]>([])
  const [selectedSlide, setSelectedSlide] = useState<Slide | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)

  const loadPresentation = useCallback(async () => {
    const res = await fetch(`/api/presentations/${id}`)
    const data = await res.json()
    if (data.error) return
    setPresentation(data)
    setSlides(data.slides || [])
    setTitle(data.title)
    if (data.slides?.length > 0 && !selectedSlide) {
      setSelectedSlide(data.slides[0])
    }
    setLoading(false)
  }, [id])

  useEffect(() => {
    loadPresentation()
  }, [loadPresentation])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)

    const formData = new FormData()
    for (let i = 0; i < files.length; i++) {
      formData.append('slides', files[i])
    }

    const res = await fetch(`/api/presentations/${id}/upload`, {
      method: 'POST',
      body: formData,
    })
    const data = await res.json()

    if (data.slides) {
      await loadPresentation()
    }
    setUploading(false)
    e.target.value = ''
  }

  const deleteSlide = async (slideId: string) => {
    await fetch(`/api/presentations/${id}/slides/${slideId}`, { method: 'DELETE' })
    setSlides(prev => prev.filter(s => s.id !== slideId))
    if (selectedSlide?.id === slideId) {
      setSelectedSlide(slides.find(s => s.id !== slideId) || null)
    }
  }

  const saveTitle = async () => {
    if (!title.trim() || title === presentation?.title) return
    setSaving(true)
    await fetch(`/api/presentations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim() }),
    })
    setSaving(false)
  }

  const moveSlide = async (slideId: string, direction: 'up' | 'down') => {
    const idx = slides.findIndex(s => s.id === slideId)
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === slides.length - 1) return

    const newSlides = [...slides]
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    ;[newSlides[idx], newSlides[swapIdx]] = [newSlides[swapIdx], newSlides[idx]]

    const reordered = newSlides.map((s, i) => ({ ...s, slide_order: i }))
    setSlides(reordered)

    await fetch(`/api/presentations/${id}/slides`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slides: reordered.map(s => ({ id: s.id, slide_order: s.slide_order })) }),
    })
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-yellow-400 text-xl animate-pulse">Loading presentation...</div>
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <div className="border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/" className="text-white/40 hover:text-white text-sm">← Back</a>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={saveTitle}
            className="bg-transparent text-white font-bold text-lg border-b border-transparent hover:border-white/20 focus:border-yellow-400 focus:outline-none px-1"
          />
          {saving && <span className="text-white/30 text-xs">Saving...</span>}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white/30 text-xs font-mono">Code: {presentation?.join_code}</span>
          <a
            href={`/present/${id}`}
            className="bg-yellow-400 text-[#0f0f3d] font-bold px-4 py-2 rounded-lg text-sm hover:bg-yellow-300"
          >
            Present →
          </a>
        </div>
      </div>

      {/* Main editor area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — slide list */}
        <div className="w-56 border-r border-white/10 overflow-y-auto p-3 space-y-2">
          {slides.map((slide, i) => (
            <div
              key={slide.id}
              onClick={() => setSelectedSlide(slide)}
              className={`rounded-lg p-2 cursor-pointer border transition-all ${
                selectedSlide?.id === slide.id
                  ? 'border-yellow-400 bg-yellow-400/10'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-white/40 text-xs">{i + 1}</span>
                <div className="flex gap-1">
                  <button onClick={(e) => { e.stopPropagation(); moveSlide(slide.id, 'up') }} className="text-white/30 hover:text-white text-xs">▲</button>
                  <button onClick={(e) => { e.stopPropagation(); moveSlide(slide.id, 'down') }} className="text-white/30 hover:text-white text-xs">▼</button>
                  <button onClick={(e) => { e.stopPropagation(); deleteSlide(slide.id) }} className="text-white/30 hover:text-red-400 text-xs">✕</button>
                </div>
              </div>
              {slide.image_url ? (
                <img src={slide.image_url} alt="" className="w-full aspect-video object-cover rounded" />
              ) : (
                <div className="w-full aspect-video bg-white/10 rounded flex items-center justify-center">
                  <span className="text-white/30 text-xs">{slide.slide_type}</span>
                </div>
              )}
              {slide.title && <p className="text-white/50 text-xs mt-1 truncate">{slide.title}</p>}
            </div>
          ))}

          {/* Upload button */}
          <label className="block rounded-lg border border-dashed border-white/20 p-4 text-center cursor-pointer hover:border-yellow-400/50 hover:bg-white/5 transition-colors">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleUpload}
              className="hidden"
            />
            {uploading ? (
              <span className="text-yellow-400 text-sm animate-pulse">Uploading...</span>
            ) : (
              <>
                <div className="text-white/40 text-xl mb-1">+</div>
                <span className="text-white/40 text-xs">Upload Slides</span>
              </>
            )}
          </label>
        </div>

        {/* Center — slide preview */}
        <div className="flex-1 flex items-center justify-center p-8 bg-black/20">
          {selectedSlide ? (
            <div className="w-full max-w-4xl aspect-video bg-[#1a1a6e] rounded-2xl overflow-hidden shadow-2xl">
              {selectedSlide.image_url ? (
                <img src={selectedSlide.image_url} alt="" className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8">
                  {selectedSlide.title && (
                    <h2 className="text-white text-3xl font-bold mb-4">{selectedSlide.title}</h2>
                  )}
                  {selectedSlide.body && (
                    <p className="text-white/70 text-lg text-center">{selectedSlide.body}</p>
                  )}
                  {!selectedSlide.title && !selectedSlide.body && (
                    <p className="text-white/30">Empty slide</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center">
              <div className="text-5xl mb-4">📎</div>
              <h3 className="text-white text-xl font-bold mb-2">No slides yet</h3>
              <p className="text-white/50 mb-4">Upload images to create your slide deck</p>
              <label className="bg-yellow-400 text-[#0f0f3d] font-bold px-6 py-3 rounded-xl cursor-pointer hover:bg-yellow-300 inline-block">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleUpload}
                  className="hidden"
                />
                {uploading ? 'Uploading...' : 'Upload Slides'}
              </label>
            </div>
          )}
        </div>

        {/* Right panel — slide properties */}
        {selectedSlide && (
          <div className="w-64 border-l border-white/10 overflow-y-auto p-4 space-y-4">
            <div>
              <h3 className="text-white/60 text-xs uppercase tracking-wide mb-2">Slide Properties</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-white/40 text-xs block mb-1">Type</label>
                  <div className="text-white text-sm bg-white/10 rounded-lg px-3 py-2">
                    {selectedSlide.slide_type}
                  </div>
                </div>
                <div>
                  <label className="text-white/40 text-xs block mb-1">Order</label>
                  <div className="text-white text-sm bg-white/10 rounded-lg px-3 py-2">
                    Slide {selectedSlide.slide_order + 1} of {slides.length}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 pt-4">
              <h3 className="text-white/60 text-xs uppercase tracking-wide mb-2">Game Round</h3>
              <p className="text-white/30 text-xs mb-3">Attach a game question to this slide</p>
              <button className="w-full bg-white/10 hover:bg-white/20 text-white/60 text-sm py-2 rounded-lg transition-colors">
                + Add Game Round
              </button>
            </div>

            <div className="border-t border-white/10 pt-4">
              <button
                onClick={() => deleteSlide(selectedSlide.id)}
                className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm py-2 rounded-lg transition-colors"
              >
                Delete Slide
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
