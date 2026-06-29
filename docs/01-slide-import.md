# Slide Import

## Overview
Allow presenters to import slides from Google Slides or upload images/PDF to create a presentation deck.

## User Flow
1. Presenter clicks "New Presentation" or "Import Slides" on dashboard
2. Options: paste a Google Slides URL, or drag/drop images/PDF
3. System exports slides as images and creates the presentation

## Google Slides Import
- User pastes a public Google Slides URL
- Backend calls Google Slides API `presentations.pages.getThumbnail` for each slide
- Each thumbnail is stored (Supabase Storage or external URL)
- Slides are created in the `slides` table with `slide_type: 'image'` and `image_url` set

## Manual Upload
- User drags/drops images (PNG, JPG) or a PDF
- PDF gets split into individual page images server-side
- Each image becomes a slide

## Technical Notes
- Google Slides API requires OAuth or API key for public presentations
- For MVP: support "Published to Web" presentations (no auth needed, scrape embed images)
- Fallback: manual image upload always works
- Store images in Supabase Storage bucket `slides`

## Schema
```sql
slides.image_url — URL to the slide image
slides.slide_type — 'image' for imported slides
slides.slide_order — sequential order
```

## API
- `POST /api/presentations` — create presentation
- `POST /api/presentations/[id]/import` — import from Google Slides URL
- `POST /api/presentations/[id]/slides` — add individual slide (upload)

## Status
- [ ] Google Slides URL parsing
- [ ] Thumbnail export
- [ ] Image upload to Supabase Storage
- [ ] PDF split (nice-to-have for V2)
