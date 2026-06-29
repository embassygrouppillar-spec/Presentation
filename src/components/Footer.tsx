'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Footer() {
  const [showLogin, setShowLogin] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    if (mode === 'login') {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) {
        setError(authError.message)
      } else {
        setSuccess('Logged in!')
        setShowLogin(false)
        window.location.href = '/dashboard'
      }
    } else {
      const { error: authError } = await supabase.auth.signUp({ email, password })
      if (authError) {
        setError(authError.message)
      } else {
        setSuccess('Check your email to confirm your account')
      }
    }
    setLoading(false)
  }

  return (
    <footer className="border-t border-white/10 py-4 px-6">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-white/30 text-sm">Presentr</span>
          <span className="text-white/15 text-sm">·</span>
          <a href="https://webtek.ai" target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-white/60 text-xs transition-colors">Built by WebTek</a>
        </div>
        <button
          onClick={() => setShowLogin(!showLogin)}
          className="text-white/40 hover:text-white/70 text-sm transition-colors"
        >
          Login
        </button>
      </div>

      {showLogin && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center p-4 z-50" onClick={e => { if (e.target === e.currentTarget) setShowLogin(false) }}>
          <div className="bg-[#1a1a6e] border border-white/20 rounded-2xl w-full max-w-sm p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">{mode === 'login' ? 'Log In' : 'Sign Up'}</h2>
              <button onClick={() => setShowLogin(false)} className="text-white/40 hover:text-white text-xl">×</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
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

              {error && <p className="text-red-400 text-sm">{error}</p>}
              {success && <p className="text-green-400 text-sm">{success}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-yellow-400 disabled:opacity-50 text-[#0f0f3d] font-bold py-3 rounded-xl"
              >
                {loading ? '...' : mode === 'login' ? 'Log In' : 'Sign Up'}
              </button>
            </form>

            <p className="text-center text-white/40 text-sm mt-4">
              {mode === 'login' ? (
                <>No account? <button onClick={() => { setMode('signup'); setError('') }} className="text-yellow-400 hover:underline">Sign up</button></>
              ) : (
                <>Have an account? <button onClick={() => { setMode('login'); setError('') }} className="text-yellow-400 hover:underline">Log in</button></>
              )}
            </p>
          </div>
        </div>
      )}
    </footer>
  )
}
