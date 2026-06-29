import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Generate a random 6-char join code
function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no I/O/0/1 to avoid confusion
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// GET /api/presentations — list all presentations
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('presentations')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/presentations — create a new presentation
export async function POST(req: NextRequest) {
  const { title, description } = await req.json()

  if (!title?.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  // Generate unique join code
  let join_code = generateJoinCode()
  let attempts = 0
  while (attempts < 10) {
    const { data: existing } = await supabaseAdmin
      .from('presentations')
      .select('id')
      .eq('join_code', join_code)
      .single()
    if (!existing) break
    join_code = generateJoinCode()
    attempts++
  }

  const { data, error } = await supabaseAdmin
    .from('presentations')
    .insert({
      title: title.trim(),
      description: description || null,
      join_code,
      is_live: false,
      current_slide: 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
