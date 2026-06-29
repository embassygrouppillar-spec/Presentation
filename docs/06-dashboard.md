# Dashboard

## Overview
Home page for authenticated presenters. List, create, manage, and launch presentations.

## Route
`/` (requires login)

## Features
- List all presentations (grid view)
- Create new presentation
- Edit existing presentation
- Launch into presenter mode
- Delete presentation
- See live status (which one is currently live)
- Quick stats (participant count, last presented)

## Layout
```
┌─────────────────────────────────────────────────┐
│  Presentr            [+ New Presentation] [Logout] │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│  │ Team    │  │ Q3      │  │ Onboard │       │
│  │ Meeting │  │ Review  │  │ Session │       │
│  │         │  │         │  │         │       │
│  │ 🟢 Live │  │ Draft   │  │ Draft   │       │
│  │ ABC123  │  │ XYZ789  │  │ QWE456  │       │
│  │         │  │         │  │         │       │
│  │[Edit][▶]│  │[Edit][▶]│  │[Edit][▶]│       │
│  └─────────┘  └─────────┘  └─────────┘       │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Auth Flow
- Not logged in → landing page with "Login" prompt in footer
- Footer modal: email/password login via Supabase Auth
- After login → dashboard renders with user's presentations
- Logout button in header

## Current State
- [x] Auth check (show landing vs dashboard)
- [x] Login modal in footer
- [x] Presentation grid with cards
- [x] Create presentation modal
- [x] Delete presentation
- [ ] Quick stats per card (participant count, slides count)
- [ ] Last presented date
- [ ] Duplicate presentation

## API
- `GET /api/presentations` — list all
- `POST /api/presentations` — create new
- `DELETE /api/presentations/[id]` — delete
