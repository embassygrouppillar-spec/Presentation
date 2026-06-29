'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface Answer {
  id?: string
  answer_text: string
  points: number
  display_order: number
  is_revealed: boolean
}

interface Question {
  id: string
  question_text: string
  is_active: boolean
  is_complete: boolean
  question_answers: Answer[]
}

export default function GamesPage() {
  const [user, setUser] = useState<User | null>(null)
  const [checking, setChecking] = useState(true)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showGenerate, setShowGenerate] = useState(false)

  // New question form
  const [newQuestion, setNewQuestion] = useState('')
  const [newAnswers, setNewAnswers] = useState<{ text: string; points: string }[]>([
    { text: '', points: '40' },
    { text: '', points: '25' },
    { text: '', points: '15' },
    { text: '', points: '10' },
    { text: '', points: '6' },
    { text: '', points: '4' },
  ])
  const [saving, setSaving] = useState(false)

  // AI generation
  const [topic, setTopic] = useState('')
  const [context, setContext] = useState('')
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setChecking(false)
    })
  }, [])

  useEffect(() => {
    if (!user) return
    loadQuestions()
  }, [user])

  const loadQuestions = async () => {
    const { data } = await supabase
      .from('questions')
      .select('*, question_answers(*)')
      .order('created_at', { ascending: false })
    setQuestions(data || [])
    setLoading(false)
  }

  const createQuestion = async () => {
    if (!newQuestion.trim()) return
    setSaving(true)

    const res = await fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question_text: newQuestion.trim(),
        answers: newAnswers
          .filter(a => a.text.trim())
          .map((a, i) => ({
            answer_text: a.text.trim(),
            points: parseInt(a.points) || 0,
            display_order: i + 1,
          })),
      }),
    })

    if (res.ok) {
      setShowCreate(false)
      setNewQuestion('')
      setNewAnswers([
        { text: '', points: '40' },
        { text: '', points: '25' },
        { text: '', points: '15' },
        { text: '', points: '10' },
        { text: '', points: '6' },
        { text: '', points: '4' },
      ])
      loadQuestions()
    }
    setSaving(false)
  }

  const generateQuestion = async () => {
    if (!topic.trim()) return
    setGenerating(true)

    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: topic.trim(), context: context.trim() }),
    })
    const data = await res.json()

    if (data.question) {
      setNewQuestion(data.question)
      setNewAnswers(
        data.answers.map((a: any, i: number) => ({
          text: a.text,
          points: String(a.points),
        }))
      )
      setShowGenerate(false)
      setShowCreate(true)
    }
    setGenerating(false)
  }

  const deleteQuestion = async (id: string) => {
    if (!confirm('Delete this question?')) return
    await supabase.from('questions').delete().eq('id', id)
    setQuestions(prev => prev.filter(q => q.id !== id))
  }

  const activateQuestion = async (id: string) => {
    // Deactivate all, activate this one
    await supabase.from('questions').update({ is_active: false }).neq('id', id)
    await supabase.from('questions').update({ is_active: true }).eq('id', id)
    await supabase.from('game_state').update({
      active_question_id: id,
      game_phase: 'playing',
      strikes: 0,
    }).eq('id', 1)
    loadQuestions()
  }

  const deactivateQuestion = async (id: string) => {
    await supabase.from('questions').update({ is_active: false }).eq('id', id)
    await supabase.from('game_state').update({
      active_question_id: null,
      game_phase: 'registration',
    }).eq('id', 1)
    loadQuestions()
  }

  if (checking || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white/50">
          {checking ? 'Loading...' : <a href="/dashboard" className="text-yellow-400 hover:underline">Log in to access games</a>}
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Game Questions</h1>
            <p className="text-white/50 mt-1">Family Feud style — create or AI-generate questions</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowGenerate(true)}
              className="bg-white/10 text-white/80 font-medium px-4 py-2 rounded-xl hover:bg-white/20 text-sm"
            >
              🤖 AI Generate
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="bg-yellow-400 text-[#0f0f3d] font-bold px-5 py-2 rounded-xl hover:bg-yellow-300"
            >
              + New Question
            </button>
          </div>
        </div>

        {/* Back link */}
        <a href="/dashboard" className="text-white/40 hover:text-white text-sm mb-6 inline-block">← Back to Dashboard</a>

        {/* AI Generate Modal */}
        {showGenerate && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={e => { if (e.target === e.currentTarget) setShowGenerate(false) }}>
            <div className="bg-[#1a1a6e] border border-white/20 rounded-2xl w-full max-w-md p-6">
              <h2 className="text-xl font-bold text-white mb-4">🤖 Generate with AI</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-white/60 text-sm block mb-1">Topic</label>
                  <input
                    type="text"
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    placeholder="e.g., Things Gilbert says in meetings"
                    autoFocus
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-yellow-400"
                  />
                </div>
                <div>
                  <label className="text-white/60 text-sm block mb-1">Context (optional)</label>
                  <textarea
                    value={context}
                    onChange={e => setContext(e.target.value)}
                    placeholder="Any extra info to help the AI..."
                    rows={2}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-yellow-400 resize-none"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={generateQuestion}
                    disabled={generating || !topic.trim()}
                    className="flex-1 bg-yellow-400 disabled:opacity-50 text-[#0f0f3d] font-bold py-3 rounded-xl"
                  >
                    {generating ? 'Generating...' : 'Generate'}
                  </button>
                  <button onClick={() => setShowGenerate(false)} className="px-6 bg-white/10 text-white py-3 rounded-xl">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create/Edit Question Modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={e => { if (e.target === e.currentTarget) setShowCreate(false) }}>
            <div className="bg-[#1a1a6e] border border-white/20 rounded-2xl w-full max-w-lg p-6 my-8">
              <h2 className="text-xl font-bold text-white mb-4">New Question</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-white/60 text-sm block mb-1">Question</label>
                  <textarea
                    value={newQuestion}
                    onChange={e => setNewQuestion(e.target.value)}
                    placeholder="We asked 100 people: ..."
                    rows={2}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-yellow-400 resize-none"
                  />
                </div>

                <div>
                  <label className="text-white/60 text-sm block mb-2">Answers (6 max, points should total 100)</label>
                  <div className="space-y-2">
                    {newAnswers.map((a, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-white/30 text-sm w-6 pt-3">{i + 1}.</span>
                        <input
                          type="text"
                          value={a.text}
                          onChange={e => {
                            const updated = [...newAnswers]
                            updated[i].text = e.target.value
                            setNewAnswers(updated)
                          }}
                          placeholder={`Answer ${i + 1}`}
                          className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:border-yellow-400"
                        />
                        <input
                          type="number"
                          value={a.points}
                          onChange={e => {
                            const updated = [...newAnswers]
                            updated[i].points = e.target.value
                            setNewAnswers(updated)
                          }}
                          placeholder="pts"
                          className="w-16 bg-white/10 border border-white/20 rounded-lg px-2 py-2 text-white text-sm text-center placeholder-white/30 focus:outline-none focus:border-yellow-400"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-white/30 text-xs mt-2">
                    Total: {newAnswers.reduce((sum, a) => sum + (parseInt(a.points) || 0), 0)} pts
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={createQuestion}
                    disabled={saving || !newQuestion.trim()}
                    className="flex-1 bg-yellow-400 disabled:opacity-50 text-[#0f0f3d] font-bold py-3 rounded-xl"
                  >
                    {saving ? 'Saving...' : 'Save Question'}
                  </button>
                  <button onClick={() => setShowCreate(false)} className="px-6 bg-white/10 text-white py-3 rounded-xl">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Questions list */}
        {loading && <p className="text-white/30 text-center py-10">Loading questions...</p>}

        {!loading && questions.length === 0 && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🎮</div>
            <h2 className="text-2xl font-bold text-white mb-2">No questions yet</h2>
            <p className="text-white/50 mb-6">Create your first Family Feud question</p>
          </div>
        )}

        {questions.length > 0 && (
          <div className="space-y-4 mt-6">
            {questions.map(q => (
              <div key={q.id} className={`bg-white/5 border rounded-2xl p-5 ${q.is_active ? 'border-green-500' : 'border-white/10'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    {q.is_active && (
                      <span className="bg-green-500/20 text-green-400 text-xs font-medium px-2 py-1 rounded-full mb-2 inline-block">
                        🟢 Active
                      </span>
                    )}
                    <h3 className="text-white font-bold text-lg">{q.question_text}</h3>
                  </div>
                  <button
                    onClick={() => deleteQuestion(q.id)}
                    className="text-white/30 hover:text-red-400 text-sm ml-4"
                  >
                    ✕
                  </button>
                </div>

                {/* Answers grid */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {(q.question_answers || [])
                    .sort((a, b) => a.display_order - b.display_order)
                    .map(a => (
                      <div key={a.id} className="bg-white/5 rounded-lg px-3 py-2 flex items-center justify-between">
                        <span className="text-white/70 text-sm">{a.display_order}. {a.answer_text}</span>
                        <span className="text-yellow-400 text-xs font-bold">{a.points}</span>
                      </div>
                    ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {q.is_active ? (
                    <button
                      onClick={() => deactivateQuestion(q.id)}
                      className="bg-red-500/20 text-red-400 text-sm font-medium px-4 py-2 rounded-lg hover:bg-red-500/30"
                    >
                      Stop Round
                    </button>
                  ) : (
                    <button
                      onClick={() => activateQuestion(q.id)}
                      className="bg-green-500/20 text-green-400 text-sm font-medium px-4 py-2 rounded-lg hover:bg-green-500/30"
                    >
                      ▶ Start Round
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
