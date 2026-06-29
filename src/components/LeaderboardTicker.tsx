'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Player {
  id: string
  display_name: string
  total_score: number
}

export default function LeaderboardTicker({ presentationId }: { presentationId?: string }) {
  const [players, setPlayers] = useState<Player[]>([])

  const loadPlayers = async () => {
    // Load participants with scores for the active presentation
    if (presentationId) {
      const { data } = await supabase
        .from('participants')
        .select('id, display_name')
        .eq('presentation_id', presentationId)
        .eq('is_active', true)
        .order('joined_at', { ascending: false })
      // For now use participants — scoring will come from poll_responses
      setPlayers((data || []).map(p => ({ ...p, total_score: 0 })))
    } else {
      // Fallback to legacy players table
      const { data } = await supabase
        .from('players')
        .select('id, display_name, total_score')
        .order('total_score', { ascending: false })
        .limit(20)
      setPlayers(data || [])
    }
  }

  useEffect(() => {
    loadPlayers()

    const channel = supabase
      .channel('leaderboard-ticker')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, () => {
        loadPlayers()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => {
        loadPlayers()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [presentationId])

  if (players.length === 0) return (
    <div className="bg-[#1a1a6e]/50 border-b border-white/5 py-2 px-4">
      <p className="text-white/30 text-sm text-center">Waiting for players to join...</p>
    </div>
  )

  return (
    <div className="bg-[#1a1a6e]/50 border-b border-white/5 py-2 overflow-hidden">
      <div className="flex animate-scroll gap-6 whitespace-nowrap">
        {/* Duplicate for seamless loop */}
        {[...players, ...players].map((player, i) => (
          <div key={`${player.id}-${i}`} className="flex items-center gap-2 shrink-0">
            {player.total_score > 0 && (
              <span className="text-yellow-400 font-bold text-sm">
                {i % players.length < 3 ? ['🥇', '🥈', '🥉'][i % players.length] : `#${(i % players.length) + 1}`}
              </span>
            )}
            <span className="text-white/80 text-sm font-medium">{player.display_name}</span>
            {player.total_score > 0 && (
              <span className="text-yellow-400/70 text-xs">{player.total_score}pts</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
