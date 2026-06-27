import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/players — all registered players sorted by score
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('players')
    .select('*')
    .order('total_score', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/players — manual registration (QR web form fallback)
export async function POST(req: NextRequest) {
  const { phone_number, display_name } = await req.json()

  if (!phone_number || !display_name) {
    return NextResponse.json({ error: 'phone_number and display_name required' }, { status: 400 })
  }

  // Normalize phone to E.164
  const normalized = phone_number.replace(/\D/g, '')
  const e164 = normalized.startsWith('1') ? `+${normalized}` : `+1${normalized}`

  const { data, error } = await supabaseAdmin
    .from('players')
    .upsert({ phone_number: e164, display_name, total_score: 0 }, { onConflict: 'phone_number' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
