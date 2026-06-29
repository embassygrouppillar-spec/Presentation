import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// POST /api/presentations/join — join a presentation by code
export async function POST(req: NextRequest) {
  const { join_code, display_name, phone_number } = await req.json()

  if (!join_code || !display_name) {
    return NextResponse.json({ error: 'join_code and display_name required' }, { status: 400 })
  }

  // Find presentation by join code
  const { data: presentation, error: findError } = await supabaseAdmin
    .from('presentations')
    .select('id, title, is_live, current_slide')
    .eq('join_code', join_code.toUpperCase())
    .single()

  if (findError || !presentation) {
    return NextResponse.json({ error: 'Invalid join code' }, { status: 404 })
  }

  // Create or update participant
  const participantData: any = {
    presentation_id: presentation.id,
    display_name: display_name.trim().slice(0, 30),
    is_active: true,
  }
  if (phone_number) {
    participantData.phone_number = phone_number
  }

  const { data: participant, error: joinError } = await supabaseAdmin
    .from('participants')
    .upsert(
      { ...participantData, phone_number: phone_number || `web_${Date.now()}_${Math.random().toString(36).slice(2)}` },
      { onConflict: 'presentation_id,phone_number' }
    )
    .select()
    .single()

  if (joinError) {
    return NextResponse.json({ error: joinError.message }, { status: 500 })
  }

  return NextResponse.json({
    participant,
    presentation: {
      id: presentation.id,
      title: presentation.title,
      is_live: presentation.is_live,
      current_slide: presentation.current_slide,
    },
  })
}
