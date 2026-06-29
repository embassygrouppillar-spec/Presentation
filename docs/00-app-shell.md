# App Shell

## Overview
The persistent frame around all pages — header, footer, layout wrapper. Built by WebTek. Brand: **Presentr**.

## Components

### Header (`src/components/Header.tsx`)
- Sticky top, blurred background
- Left: Logo (yellow "P" square + "Presentr" wordmark)
- Right: Nav links (Dashboard when logged in, Logout button)
- Collapses cleanly on mobile

```
┌─────────────────────────────────────────────────┐
│  [P] Presentr                    Dashboard  Logout │
└─────────────────────────────────────────────────┘
```

### Footer (`src/components/Footer.tsx`)
- Bottom border, subtle
- Left: "Presentr" text + "Built by WebTek"
- Right: "Login" link (opens auth modal)
- Login modal: email/password, login/signup toggle, Supabase Auth

```
┌─────────────────────────────────────────────────┐
│  Presentr · Built by WebTek                Login │
└─────────────────────────────────────────────────┘
```

### Layout (`src/app/layout.tsx`)
- `<html>` + `<body>` wrapper
- Flex column, min-height screen
- Header at top
- `<main>` flex-1 for page content
- Footer at bottom
- Global CSS import

## Branding
- **Name**: Presentr
- **Logo**: Yellow square with "P" (placeholder — swap for real logo later)
- **Favicon**: Same yellow P square
- **Colors**:
  - Background: `#0f0f3d` (deep navy)
  - Accent: `yellow-400` (Tailwind)
  - Cards/surfaces: `white/5`, `white/10`
  - Text: white, `white/60` for secondary, `white/30` for muted
  - Active/live: `green-400`
  - Danger: `red-400`
- **Font**: System font stack (already set in globals.css)
- **Built by**: WebTek (shown in footer)

## Auth Flow in Shell
- Header shows nav links when logged in
- Footer shows "Login" when not logged in
- Login modal uses `supabase.auth.signInWithPassword()`
- Signup uses `supabase.auth.signUp()`
- On success: redirect to `/` (dashboard)
- `onAuthStateChange` keeps header/footer in sync

## Responsive Behavior
- Mobile: logo only in header, hamburger menu (future)
- Tablet+: full nav shown
- Footer: stacks vertically on small screens

## Files
- `src/app/layout.tsx` — root layout
- `src/components/Header.tsx` — header component
- `src/components/Footer.tsx` — footer + login modal
- `src/app/globals.css` — base styles, Tailwind layers

## Status
- [x] Layout wrapper (flex column, min-h-screen)
- [x] Footer with login modal
- [x] Header with logo + nav
- [ ] "Built by WebTek" in footer
- [ ] Favicon (yellow P)
- [ ] Mobile responsive hamburger (V2)
- [ ] Dark/light mode toggle (V2)
