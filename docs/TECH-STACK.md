# BNI Family Feud — Technical Reference

A portable reference for replicating or adapting this project's architecture.

---

## Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js 14 (App Router) | Full-stack React with SSR + API routes |
| Hosting | Vercel | Auto-deploy from GitHub, serverless functions |
| Database | Firebase Firestore | Real-time NoSQL, `onSnapshot` listeners |
| Auth | Firebase Auth (email/password) | Admin panel login |
| SMS | Twilio | Inbound/outbound text messaging |
| AI | DeepSeek (OpenAI-compatible API) | Content generation |
| Styling | Tailwind CSS | Utility-first, custom theme colors |
| Analytics | Vercel Analytics + Speed Insights | Page views, Web Vitals |
| QR Codes | `qrcode` npm package | Generate QR images |
| Fuzzy Matching | Fuse.js | Match player answers to board answers |

---

## Architecture Pattern

```
Browser (Next.js client)
  ├── Firestore onSnapshot → real-time UI updates
  ├── fetch() → Next.js API routes
  └── Audio API → sound effects

Next.js API Routes (serverless)
  ├── Firebase Admin SDK → read/write Firestore
  ├── Twilio SDK → send/receive SMS
  └── OpenAI SDK → AI generation (DeepSeek)

Twilio Webhook
  └── POST /api/twilio → process incoming SMS

Vercel
  ├── Builds from GitHub on push
  ├── Serves SSR + static pages
  └── Runs API routes as serverless functions
```

---

## Key Patterns

### Real-time Updates (Firestore onSnapshot)
```typescript
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'

// Listen for changes — UI updates instantly
const unsub = onSnapshot(
  query(collection(db, 'collection_name'), orderBy('field')),
  (snap) => {
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    setState(data)
  }
)
// Cleanup
return () => unsub()
```

### Lazy Firebase Admin (Vercel-safe)
```typescript
// src/lib/firebaseAdmin.ts
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore, Firestore } from 'firebase-admin/firestore'

let _db: Firestore | null = null

export function getAdminDb(): Firestore {
  if (_db) return _db
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    })
  }
  _db = getFirestore()
  return _db
}

// Proxy pattern for backward compat
export const adminDb = new Proxy({} as Firestore, {
  get(_, prop) {
    const db = getAdminDb()
    const value = (db as any)[prop]
    return typeof value === 'function' ? value.bind(db) : value
  },
})
```

### Twilio SMS Webhook
```typescript
// src/app/api/twilio/route.ts
import twilio from 'twilio'

export async function POST(req: NextRequest) {
  const body = await req.formData()
  const from = body.get('From') as string  // +1234567890
  const message = (body.get('Body') as string).trim()

  const twiml = new twilio.twiml.MessagingResponse()
  twiml.message('Your reply here')

  return new NextResponse(twiml.toString(), {
    headers: { 'Content-Type': 'text/xml' },
  })
}
```

### Sending SMS
```typescript
import twilio from 'twilio'

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
await client.messages.create({
  body: 'Your message',
  from: process.env.TWILIO_PHONE_NUMBER,
  to: '+1234567890',
})
```

### AI Content Generation (DeepSeek / OpenAI-compatible)
```typescript
import OpenAI from 'openai'

const ai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
})

const response = await ai.chat.completions.create({
  model: 'deepseek-chat',
  max_tokens: 1000,
  messages: [{ role: 'user', content: prompt }],
})

const text = response.choices[0]?.message?.content ?? ''
```

### Fuzzy Answer Matching
```typescript
// src/lib/matchAnswer.ts
import Fuse from 'fuse.js'

export function matchAnswer(rawAnswer: string, boardAnswers: any[]) {
  const unrevealed = boardAnswers.filter(a => !a.is_revealed)
  const fuse = new Fuse(unrevealed, {
    keys: ['answer_text'],
    threshold: 0.4,  // lower = stricter
  })
  const results = fuse.search(rawAnswer)
  return results.length > 0 ? results[0].item : null
}
```

### Sound Effects (Browser Audio)
```typescript
// Play on event
try { new Audio('/sounds/Correct.wav').play() } catch {}
```

### Flash Notifications (scattered positions)
```typescript
const [notifications, setNotifications] = useState([])

// Add notification at random position
const nid = Date.now().toString()
const x = 15 + Math.random() * 55  // % from left
const y = 15 + Math.random() * 45  // % from top
setNotifications(prev => [...prev, { id: nid, type, name, x, y }])
setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== nid)), 2000)

// Render
{notifications.map(n => (
  <div key={n.id} className="fixed z-40 pointer-events-none animate-bounce"
    style={{ left: `${n.x}%`, top: `${n.y}%`, transform: 'translate(-50%, -50%)' }}>
    ...
  </div>
))}
```

### Scrolling Ticker (CSS)
```css
@keyframes ticker {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
.animate-scroll {
  animation: ticker 10s linear infinite;
}
```
```jsx
<div className="overflow-hidden">
  <div className="animate-scroll flex whitespace-nowrap gap-8">
    {items.map(...)}
    {/* Duplicate for seamless loop */}
    {items.map(...)}
  </div>
</div>
```

### Force Dynamic API Routes (Vercel)
```typescript
// Prevents Next.js from pre-rendering at build time
export const dynamic = 'force-dynamic'
```

---

## Environment Variables

```bash
# Firebase Client (public — used in browser)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (secret — server only)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=  # multiline, no quotes on Vercel

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=+1...
NEXT_PUBLIC_TWILIO_PHONE=+1...

# AI
DEEPSEEK_API_KEY=

# App
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
HOST_PASSWORD=
```

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Home (QR + instructions)
│   ├── host/page.tsx         # Game controller
│   ├── play/page.tsx         # Player registration (web)
│   ├── board/page.tsx        # Display board
│   ├── admin/page.tsx        # Admin panel (auth protected)
│   ├── components/
│   │   ├── Navbar.tsx
│   │   └── Footer.tsx
│   ├── api/
│   │   ├── players/route.ts       # GET/POST players
│   │   ├── players/answer/route.ts # POST answer
│   │   ├── questions/route.ts     # GET/PATCH questions
│   │   ├── answers/route.ts       # GET responses / PATCH reveal
│   │   ├── twilio/route.ts        # SMS webhook
│   │   └── admin/
│   │       ├── reset/route.ts     # POST reset game
│   │       ├── generate/route.ts  # POST regenerate questions
│   │       ├── edit/route.ts      # POST edit question
│   │       ├── edit-player/route.ts # POST/DELETE player
│   │       ├── congrats/route.ts  # POST text winner
│   │       └── analytics/route.ts # GET game stats
│   └── globals.css
├── lib/
│   ├── firebase.ts           # Client SDK init
│   ├── firebaseAdmin.ts      # Admin SDK (lazy init)
│   └── matchAnswer.ts        # Fuse.js fuzzy matching
scripts/
├── seed-firestore.ts         # Seed members
├── generate-questions.ts     # AI question generation
├── clear-game.js             # Reset for fresh game
└── check-db.js               # Debug helper
public/
├── img/TB-QR.png             # Registration QR code
└── sounds/
    ├── Correct.wav
    └── Wrong.wav
```

---

## Deployment

### Vercel (auto-deploy)
- Connect GitHub repo
- Add all env vars in project settings
- Push to `main` → auto-builds and deploys
- API routes become serverless functions

### Firebase Setup
1. Create project on Firebase Console
2. Enable Firestore + Auth (Email/Password)
3. Generate service account key (Admin SDK)
4. Deploy Firestore rules: `firebase deploy --only firestore:rules`

### Twilio Setup
1. Get phone number
2. Set webhook URL: `https://your-app.vercel.app/api/twilio` (HTTP POST)

---

## Reusable for Other Projects

This architecture works for any:
- **Live event/game** — trivia, polls, auctions, raffles
- **SMS-based interaction** — surveys, RSVP, notifications
- **Real-time dashboard** — scores, metrics, monitoring
- **AI-powered content** — personalized messages, generation
- **Admin panel** — CRUD with auth, analytics

Just swap the game logic for your domain logic. The infrastructure (Firestore real-time, Twilio SMS, AI generation, Vercel deploy) stays the same.

---

## Dependencies

```json
{
  "next": "14.x",
  "react": "^18",
  "firebase": "^10",
  "firebase-admin": "^12",
  "twilio": "^5",
  "openai": "^4",
  "fuse.js": "^7",
  "qrcode": "^1.5",
  "@vercel/analytics": "^1",
  "@vercel/speed-insights": "^1",
  "tailwindcss": "^3"
}
```
