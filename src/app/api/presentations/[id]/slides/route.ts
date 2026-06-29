import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET /api/presentations/[id]/slides — list slides for a presentation
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await supabaseAdmin
    .from('slides')
    .select('*, polls(*, poll_options(*))')
    .eq('presentation_id', params.id)
    .order('slide_order')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/presentations/[id]/slides — add a slide
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()

  // Get the next slide_order
  const { data: existing } = await supabaseAdmin
    .from('slides')
    .select('slide_order')
    .eq('presentation_id', params.id)
    .order('slide_order', { ascending: false })
    .limit(1)

  const nextOrder = existing && existing.length > 0 ? existing[0].slide_order + 1 : 0

  const { data, error } = await supabaseAdmin
    .from('slides')
    .insert({
      presentation_id: params.id,
      slide_order: body.slide_order ?? nextOrder,
      slide_type: body.slide_type || 'content',
      title: body.title || null,
      body: body.body || null,
      image_url: body.image_url || null,
      settings: body.settings || {},
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PATCH /api/presentations/[id]/slides — reorder slides (batch update)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { slides } = await req.json() // [{ id, slide_order }]

  if (!Array.isArray(slides)) {
    return NextResponse.json({ error: 'slides array required' }, { status: 400 })
  }

  // Update each slide's order
  for (const s of slides) {
    await supabaseAdmin
      .from('slides')
      .update({ slide_order: s.slide_order })
      .eq('id', s.id)
      .eq('presentation_id', params.id)
  }

  return NextResponse.json({ ok: true })
}
