# Slide Editor

## Overview
Create and edit presentations. Manage slides, reorder them, and attach interactive game rounds to specific slides.

## Route
`/presentations/[id]/edit`

## User Flow
1. Left sidebar: slide thumbnails (reorderable via drag)
2. Center: active slide preview/editor
3. Right panel: slide properties + game round config
4. Top bar: presentation title, save status, "Present" button

## Layout
```
┌──────┬────────────────────────────────┬──────────┐
│      │        [Title]    [Present →]  │          │
├──────┼────────────────────────────────┼──────────┤
│  1.  │                                │ Type:    │
│ ┌──┐ │                                │ [Image]  │
│ │  │ │     SLIDE PREVIEW / EDITOR     │          │
│ └──┘ │                                │ Game:    │
│  2.  │                                │ [None ▾] │
│ ┌──┐ │                                │          │
│ │  │ │                                │ Question │
│ └──┘ │                                │ Options  │
│  3.  │                                │ Timer    │
│ ┌──┐ │                                │          │
│ └──┘ │                                │          │
│      │                                │          │
│ [+]  │                                │ [Save]   │
└──────┴────────────────────────────────┴──────────┘
```

## Slide Types
- **Image** — imported slide (display only)
- **Content** — text/markdown slide (editable title + body)
- **Title** — big title card
- **Poll** — multiple choice question
- **Trivia** — scored question with correct answer
- **Q&A** — open audience questions
- **Word Cloud** — free-text responses visualized

## Attaching a Game Round
For any slide, the presenter can:
1. Toggle "Game Round" on
2. Choose game type (trivia, poll, word cloud)
3. Enter the question
4. Add answer options (for MC) or set correct answer (for trivia)
5. Set timer duration (optional)

## API Calls
- `GET /api/presentations/[id]` — load presentation + slides
- `POST /api/presentations/[id]/slides` — add slide
- `PATCH /api/presentations/[id]/slides/[slideId]` — update slide content
- `DELETE /api/presentations/[id]/slides/[slideId]` — remove slide
- `PATCH /api/presentations/[id]/slides` — batch reorder
- `POST /api/presentations/[id]/import` — import from Google Slides

## Status
- [ ] Slide list sidebar with thumbnails
- [ ] Drag-to-reorder
- [ ] Add slide (type picker)
- [ ] Slide content editor (title, body, image)
- [ ] Game round attachment panel
- [ ] Question + options editor
- [ ] Timer config
- [ ] Save/autosave
- [ ] Import button
