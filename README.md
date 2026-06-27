# ⭐ B&I Family Feud

Family Feud game for your B&I networking group. 18 members, 18 personalized AI-generated questions, SMS answers via Twilio, real-time board on the projector. Lunch goes to the winner.

---

## Three URLs

| URL | Who uses it | What it does |
|-----|-------------|--------------|
| `/host` | You (on your laptop) | Control panel — open rounds, see live answers, add strikes |
| `/play` | Members (on their phones) | Register + submit answers via web form |
| `/board` | Projector | Full-screen game board, auto-updates in real time |

---

## Setup (one time, ~30 minutes)

### 1. Clone and install
```bash
git clone <your-repo>
cd bi-feud
npm install
```

### 2. Create a Supabase project
- Go to supabase.com → New project
- In the SQL editor, run `supabase/migrations/001_schema.sql`
- Then run `supabase/migrations/002_seed_members.sql`
- **Edit the seed file first** with your actual 18 members' names, roles, and fun facts

### 3. Get a Twilio number
- twilio.com → Buy a phone number
- Set the webhook URL to: `https://your-app.vercel.app/api/twilio`
- Method: HTTP POST

### 4. Set environment variables
```bash
cp .env.local.example .env.local
# Fill in all values
```

Required:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX
ANTHROPIC_API_KEY=
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
HOST_PASSWORD=pick-something-secret
```

### 5. Generate the 18 questions (run once before the meeting)
```bash
npm run generate-questions
```
This calls the Anthropic API for each member and saves personalized questions to Supabase.
**Review and edit them** in the Supabase dashboard before the meeting — swap anything that doesn't land.

### 6. Deploy to Vercel
```bash
npx vercel --prod
```
Add all env vars in the Vercel dashboard too.

---

## Night-before checklist

- [ ] Run `generate-questions` script and review all 18 in Supabase
- [ ] Text the Twilio number to all 18 members: *"Save this number — we're playing a game tomorrow. Text your name to register!"*
- [ ] Test the full flow: register on `/play`, open a round on `/host`, check `/board` updates
- [ ] Make sure `/board` is open on the laptop you'll plug into the projector

---

## Day-of flow

**Before you start (2 min)**
1. Open `/board` on the projector laptop — members see the registration screen and player count
2. Open `/host` on your phone or a separate device
3. Tell everyone: *"Scan the QR or visit [url]/play and register with your name and phone number"*

**Running a round**
1. Tap a member's tile on `/host`
2. The modal opens with their question, QR code, and answer board
3. Tap **Open Round** — the board goes live, members can now answer
4. Watch answers roll in on the left side; matched answers flip green on the projector
5. After the round, read the funniest wrong answers out loud
6. Tap **Mark Complete** — next member

**Ending the game**
- After your chosen rounds, flip the projector to leaderboard view
- Announce the winner — make them stand up
- Hand them the lunch prize 🏆

---

## SMS commands members can use

| Text | Response |
|------|----------|
| `[Your name]` | Registers you (first text only) |
| `[Your answer]` | Submits answer to active question |
| `SCORE` | Returns top 5 leaderboard |
| `HELP` | Returns your score and instructions |
| `NAME: [new name]` | Updates your display name |

---

## Project structure

```
bi-feud/
├── src/
│   ├── app/
│   │   ├── host/page.tsx          ← Host control panel
│   │   ├── play/page.tsx          ← Mobile player page
│   │   ├── board/page.tsx         ← Projector display
│   │   └── api/
│   │       ├── twilio/route.ts    ← SMS webhook
│   │       ├── questions/route.ts
│   │       ├── players/
│   │       │   ├── route.ts
│   │       │   └── answer/route.ts
│   │       ├── answers/route.ts
│   │       └── leaderboard/route.ts
│   └── lib/
│       ├── supabase.ts            ← DB clients
│       └── matchAnswer.ts         ← Fuzzy answer matching
├── scripts/
│   └── generate-questions.ts     ← AI question generator
└── supabase/
    └── migrations/
        ├── 001_schema.sql         ← Full DB schema
        └── 002_seed_members.sql   ← 18 member seed data
```

---

## Tech stack

- **Next.js 14** — frontend + API routes
- **Supabase** — Postgres database + real-time subscriptions
- **Twilio** — inbound SMS (registration + answers)
- **Anthropic API** — AI question generation (pre-game script only)
- **Fuse.js** — fuzzy answer matching
- **Vercel** — deployment
