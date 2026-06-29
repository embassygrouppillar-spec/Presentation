import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// PATCH /api/presentations/[id]/slides/[slideId] — update a slide
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; slideId: string } }
) {
  const body = await req.json()

  const { data, error } = await supabaseAdmin
    .from('slides')
    .update(body)
    .eq('id', params.slideId)
    .eq('presentation_id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/presentations/[id]/slides/[slideId] — delete a slide
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; slideId: string } }
) {
  const { error } = await supabaseAdmin
    .from('slides')
    .delete()
    .eq('id', params.slideId)
    .eq('presentation_id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
