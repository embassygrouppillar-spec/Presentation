# Presenter View

## Overview
The main presentation screen. Shows slides full-screen with controls to navigate and trigger game rounds.

## Route
`/present/[id]`

## User Flow
1. Presenter clicks "Present" from dashboard
2. Full-screen slide viewer loads
3. Navigate with arrow keys, click, or on-screen buttons
4. At any slide, can trigger a game round (poll, trivia, Q&A)
5. Live participant count + reactions overlay
6. Shows join code/QR persistently in corner

## Layout
```
┌─────────────────────────────────────────────┐
│ [Join: ABCD12]          [5 participants] 👥  │
├─────────────────────────────────────────────┤
│                                             │
│              SLIDE CONTENT                  │
│          (image or game board)              │
│                                             │
├─────────────────────────────────────────────┤
│  ◀ Prev  │  Slide 3/12  │  Next ▶  │ 🎮   │
└─────────────────────────────────────────────┘
```

## Game Overlay
When a game round is active, the slide area shows:
- The question text
- Answer options (for multiple choice) or response feed (for open-ended)
- Live scoreboard / results chart
- Timer (optional)

## Controls
- Arrow keys / spacebar: navigate slides
- `G` key or 🎮 button: open game panel
- `F` key: toggle fullscreen
- `L` key: show leaderboard
- `Esc`: exit presenter mode

## Realtime
- Supabase subscription on `presentations` table for current_slide updates
- Subscription on `poll_responses` for live result updates
- Subscription on `participants` for join/leave events
- Subscription on `reactions` for emoji bursts

## Technical Notes
- `POST /api/presentations/[id]/live` with action: 'start' when entering
- `POST /api/presentations/[id]/live` with action: 'navigate' on slide change
- `POST /api/presentations/[id]/live` with action: 'stop' on exit

## Status
- [ ] Slide viewer component
- [ ] Keyboard navigation
- [ ] Game trigger panel
- [ ] Live participant count
- [ ] QR code + join code display
- [ ] Fullscreen mode
- [ ] Reaction overlay
