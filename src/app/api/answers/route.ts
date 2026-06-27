import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/game-state
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('game_state')
    .select('*')
    .eq('id', 1)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PATCH /api/game-state
export async function PATCH(req: NextRequest) {
  const body = await req.json()

  const { data, error } = await supabaseAdmin
    .from('game_state')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', 1)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
