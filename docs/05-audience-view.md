# Audience Web View

## Overview
Web fallback for audience members who scan the QR code instead of texting. Shows current slide and allows interaction through the browser.

## Route
`/join/[code]`

## Join Flow
1. Audience scans QR code or enters join code
2. Enters their name (optionally phone number for SMS too)
3. Sees the current slide
4. When a game round is active, shows the question + answer buttons
5. Results/leaderboard shown after each round

## Screens

### Join Screen
- Enter join code (or auto-filled from URL)
- Enter display name
- "Join" button

### Waiting Screen
- "Waiting for presentation to start..."
- Shows presentation title
- Participant count

### Slide View
- Current slide image displayed
- Reactions bar (emoji buttons)
- If game round active: question + answer UI overlays

### Game Active Screen
- Question text
- Multiple choice buttons (A/B/C/D) or text input
- Timer countdown
- "Submitted!" confirmation after answering

### Results Screen
- Your score this round
- Leaderboard (top 5)
- "Waiting for next question..."

## Realtime
- Subscribe to `presentations` for `current_slide` changes
- Subscribe to `polls` for `is_open` changes (round start/stop)
- Subscribe to `participants` for count updates

## Technical Notes
- No auth required to join (just name + optional phone)
- `POST /api/presentations/join` — registers participant by join code
- Mobile-first responsive design
- Works alongside SMS — same game round, same leaderboard
- Participants from web and SMS compete together

## Status
- [ ] Join page with code entry
- [ ] Name registration
- [ ] Live slide viewer
- [ ] Game round UI (MC buttons + text input)
- [ ] Results/leaderboard view
- [ ] Emoji reactions
- [ ] QR code generation on presenter screen
