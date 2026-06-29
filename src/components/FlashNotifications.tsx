'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Notification {
  id: string
  type: 'correct' | 'wrong' | 'join'
  name: string
  x: number
  y: number
}

interface Props {
  presentationId?: string
  questionId?: string
}

export default function FlashNotifications({ presentationId, questionId }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const addNotification = (type: Notification['type'], name: string) => {
    const id = Date.now().toString() + Math.random()
    const x = 15 + Math.random() * 55
    const y = 15 + Math.random() * 45
    setNotifications(prev => [...prev, { id, type, name, x, y }])
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 2500)
  }

  useEffect(() => {
    const channels: any[] = []

    // Watch for player responses (correct/wrong)
    if (questionId) {
      const ch = supabase
        .channel('flash-responses')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'player_responses' }, async (payload) => {
          const response = payload.new as any
          const { data: player } = await supabase
            .from('players')
            .select('display_name')
            .eq('id', response.player_id)
            .single()

          const name = player?.display_name || 'Player'
          if (response.points_earned > 0) {
            addNotification('correct', name)
            playSound('correct')
          } else {
            addNotification('wrong', name)
          }
        })
        .subscribe()
      channels.push(ch)
    }

    // Watch for new participants joining
    if (presentationId) {
      const ch = supabase
        .channel('flash-joins')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'participants' }, (payload) => {
          const p = payload.new as any
          if (p.display_name && p.display_name !== '(registering)') {
            addNotification('join', p.display_name)
          }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'participants' }, (payload) => {
          const p = payload.new as any
          const old = payload.old as any
          if (old.display_name === '(registering)' && p.display_name !== '(registering)') {
            addNotification('join', p.display_name)
          }
        })
        .subscribe()
      channels.push(ch)
    }

    // Watch for poll responses
    if (presentationId) {
      const ch = supabase
        .channel('flash-poll-responses')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'poll_responses' }, async (payload) => {
          const response = payload.new as any
          const { data: participant } = await supabase
            .from('participants')
            .select('display_name')
            .eq('id', response.participant_id)
            .single()

          const name = participant?.display_name || 'Someone'
          addNotification('correct', name)
          playSound('correct')
        })
        .subscribe()
      channels.push(ch)
    }

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch))
    }
  }, [presentationId, questionId])

  return (
    <>
      {notifications.map(n => (
        <div
          key={n.id}
          className="fixed z-40 pointer-events-none animate-bounce"
          style={{ left: `${n.x}%`, top: `${n.y}%`, transform: 'translate(-50%, -50%)' }}
        >
          <div className={`px-4 py-2 rounded-full text-sm font-bold shadow-lg ${
            n.type === 'correct'
              ? 'bg-green-500 text-white'
              : n.type === 'wrong'
              ? 'bg-red-500 text-white'
              : 'bg-yellow-400 text-[#0f0f3d]'
          }`}>
            {n.type === 'correct' && `🔥 ${n.name}`}
            {n.type === 'wrong' && `❌ ${n.name}`}
            {n.type === 'join' && `👋 ${n.name} joined`}
          </div>
        </div>
      ))}
    </>
  )
}

function playSound(type: 'correct' | 'wrong') {
  try {
    const src = type === 'correct' ? '/sounds/Correct.wav' : '/sounds/Wrong.wav'
    new Audio(src).play()
  } catch {}
}
