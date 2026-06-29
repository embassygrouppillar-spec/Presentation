import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// POST /api/presentations/[id]/upload — upload slide images
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const formData = await req.formData()
  const files = formData.getAll('slides') as File[]

  if (!files.length) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 })
  }

  // Get current max slide_order
  const { data: existing } = await supabaseAdmin
    .from('slides')
    .select('slide_order')
    .eq('presentation_id', params.id)
    .order('slide_order', { ascending: false })
    .limit(1)

  let nextOrder = existing && existing.length > 0 ? existing[0].slide_order + 1 : 0
  const uploaded: any[] = []

  for (const file of files) {
    // Upload to Supabase Storage
    const ext = file.name.split('.').pop() || 'png'
    const fileName = `${params.id}/${nextOrder}-${Date.now()}.${ext}`

    const { data: storageData, error: storageError } = await supabaseAdmin.storage
      .from('slides')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      })

    if (storageError) {
      // If bucket doesn't exist, create it and retry
      if (storageError.message.includes('not found') || storageError.message.includes('Bucket')) {
        await supabaseAdmin.storage.createBucket('slides', { public: true })
        const { data: retryData, error: retryError } = await supabaseAdmin.storage
          .from('slides')
          .upload(fileName, file, { contentType: file.type, upsert: false })
        if (retryError) {
          return NextResponse.json({ error: retryError.message }, { status: 500 })
        }
      } else {
        return NextResponse.json({ error: storageError.message }, { status: 500 })
      }
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('slides')
      .getPublicUrl(fileName)

    // Create slide record
    const { data: slide, error: slideError } = await supabaseAdmin
      .from('slides')
      .insert({
        presentation_id: params.id,
        slide_order: nextOrder,
        slide_type: 'image',
        title: file.name.replace(/\.[^/.]+$/, ''),
        image_url: urlData.publicUrl,
        settings: {},
      })
      .select()
      .single()

    if (slideError) {
      return NextResponse.json({ error: slideError.message }, { status: 500 })
    }

    uploaded.push(slide)
    nextOrder++
  }

  // Update presentation timestamp
  await supabaseAdmin
    .from('presentations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', params.id)

  return NextResponse.json({ slides: uploaded, count: uploaded.length })
}
