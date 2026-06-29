'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface Presentation {
  id: string
  title: string
  description: string | null
  join_code: string
  is_live: boolean
  current_slide: number
  created_at: string
  updated_at: string
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [checking, setChecking] = useState(true)
  const [presentations, setPresentations] = useState<Presentation[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [creating, setCreating] = useState(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setChecking(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) { setLoading(false); return }
    loadPresentations()
  }, [user])

  const loadPresentations = async () => {
    const { data } = await supabase
      .from('presentations')
      .select('*')
      .order('updated_at', { ascending: false })
    setPresentations(data || [])
    setLoading(false)
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')
    setAuthLoading(true)

    if (authMode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setAuthError(error.message)
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setAuthError(error.message)
    }
    setAuthLoading(false)
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setPresentations([])
    window.location.href = '/'
  }

  const createPresentation = async () => {
    if (!newTitle.trim()) return
    setCreating(true)

    const res = await fetch('/api/presentations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle.trim(), description: newDesc.trim() || null }),
    })
    const data = await res.json()

    if (data.id) {
      window.location.href = `/presentations/${data.id}/edit`
    }
    setCreating(false)
  }

  const deletePresentation = async (id: string) => {
    if (!confirm('Delete this presentation?')) return
    await fetch(`/api/presentations/${id}`, { method: 'DELETE' })
    setPresentations(prev => prev.filter(p => p.id !== id))
  }

  const toggleLive = async (id: string, isLive: boolean) => {
    await fetch(`/api/presentations/${id}/live`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: isLive ? 'stop' : 'start' }),
    })
    loadPresentations()
  }

  if (checking) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-yellow-400 text-xl animate-pulse">Loading...</div>
    </div>
  )

  if (!user) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-yellow-400 rounded-lg flex items-center justify-center mx-auto mb-3">
            <span className="text-[#0f0f3d] font-black text-xl">P</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-white/50 mt-1">Log in to manage presentations</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-yellow-400"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            required
            minLength={6}
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-yellow-400"
          />
          {authError && <p className="text-red-400 text-sm">{authError}</p>}
          <button
            type="submit"
            disabled={authLoading}
            className="w-full bg-yellow-400 disabled:opacity-50 text-[#0f0f3d] font-bold py-3 rounded-xl"
          >
            {authLoading ? '...' : authMode === 'login' ? 'Log In' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center text-white/40 text-sm mt-4">
          {authMode === 'login' ? (
            <>No account? <button onClick={() => setAuthMode('signup')} className="text-yellow-400 hover:underline">Sign up</button></>
          ) : (
            <>Have an account? <button onClick={() => setAuthMode('login')} className="text-yellow-400 hover:underline">Log in</button></>
          )}
        </p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <p className="text-white/50 mt-1">{user.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/dashboard/games"
              className="bg-white/10 text-white/80 font-medium px-4 py-3 rounded-xl hover:bg-white/20 transition-colors text-sm"
            >
              🎮 Games
            </a>
            <button
              onClick={() => setShowCreate(true)}
              className="bg-yellow-400 text-[#0f0f3d] font-bold px-6 py-3 rounded-xl hover:bg-yellow-300 transition-colors"
            >
              + New Presentation
            </button>
            <button
              onClick={logout}
              className="bg-white/10 text-white/60 hover:text-white px-4 py-3 rounded-xl hover:bg-white/20 transition-colors text-sm"
            >
              Logout
            </button>
          </div>
        </div>

        {showCreate && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={e => { if (e.target === e.currentTarget) setShowCreate(false) }}>
            <div className="bg-[#1a1a6e] border border-white/20 rounded-2xl w-full max-w-md p-6">
              <h2 className="text-xl font-bold text-white mb-4">New Presentation</h2>
              <div className="space-y-4">
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Presentation title"
                  autoFocus
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-yellow-400"
                />
                <textarea
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Description (optional)"
                  rows={2}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-yellow-400 resize-none"
                />
                <div className="flex gap-3">
                  <button
                    onClick={createPresentation}
                    disabled={creating || !newTitle.trim()}
                    className="flex-1 bg-yellow-400 disabled:opacity-50 text-[#0f0f3d] font-bold py-3 rounded-xl"
                  >
                    {creating ? 'Creating...' : 'Create'}
                  </button>
                  <button onClick={() => setShowCreate(false)} className="px-6 bg-white/10 text-white py-3 rounded-xl">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {!loading && presentations.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="text-2xl font-bold text-white mb-2">No presentations yet</h2>
            <p className="text-white/50 mb-6">Create your first presentation</p>
            <button onClick={() => setShowCreate(true)} className="bg-yellow-400 text-[#0f0f3d] font-bold px-8 py-3 rounded-xl hover:bg-yellow-300">
              + Create Presentation
            </button>
          </div>
        )}

        {presentations.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {presentations.map(p => (
              <div key={p.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  {p.is_live ? (
                    <span className="bg-green-500/20 text-green-400 text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      Live
                    </span>
                  ) : (
                    <span className="bg-white/10 text-white/40 text-xs px-2 py-1 rounded-full">Draft</span>
                  )}
                  <span className="text-white/30 text-xs font-mono">{p.join_code}</span>
                </div>

                <h3 className="text-lg font-bold text-white mb-1 truncate">{p.title}</h3>
                {p.description && <p className="text-white/40 text-sm mb-4 line-clamp-2">{p.description}</p>}
                {!p.description && <div className="mb-4" />}

                <div className="flex gap-2">
                  <a href={`/presentations/${p.id}/edit`} className="flex-1 bg-white/10 hover:bg-white/20 text-white text-sm font-medium py-2 rounded-lg text-center">
                    Edit
                  </a>
                  <button
                    onClick={() => toggleLive(p.id, p.is_live)}
                    className={`flex-1 text-sm font-bold py-2 rounded-lg text-center ${
                      p.is_live
                        ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                        : 'bg-yellow-400 text-[#0f0f3d] hover:bg-yellow-300'
                    }`}
                  >
                    {p.is_live ? 'Stop' : 'Go Live'}
                  </button>
                  <button
                    onClick={() => deletePresentation(p.id)}
                    className="bg-white/10 hover:bg-red-500/20 text-white/60 hover:text-red-400 text-sm px-3 py-2 rounded-lg"
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-3 pt-3 border-t border-white/5 text-xs text-white/30">
                  Updated {new Date(p.updated_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
