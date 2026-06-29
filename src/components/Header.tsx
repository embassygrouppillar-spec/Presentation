'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export default function Header() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <header className="border-b border-white/10 py-3 px-6">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-yellow-400 rounded-md flex items-center justify-center">
            <span className="text-[#0f0f3d] font-black text-xs">P</span>
          </div>
          <span className="text-white/80 font-bold text-sm">Presentr</span>
        </a>

        {/* Minimal nav — only shows for logged in users */}
        {user && (
          <a href="/dashboard" className="text-white/40 hover:text-white/70 text-sm transition-colors">
            Dashboard
          </a>
        )}
      </div>
    </header>
  )
}
