# SMS Game Integration

## Overview
Audience participates in game rounds by texting answers to a Twilio number. This is the core differentiator — zero-friction participation via SMS.

## Join Flow
```
Screen shows: "Text JOIN to (314) 555-1234"

Audience texts → JOIN
System replies → "Welcome to Presentr! Text your name to register."

Audience texts → Mike
System replies → "Hi Mike! You're player #7. Watch the screen for questions — text your answer when a round opens."
```

## Game Round Flow
```
[Presenter triggers a question]
[System texts all participants] → "🎯 Q: What's the capital of France? A) London B) Paris C) Berlin D) Rome"

[Audience texts] → B
[System replies] → "✓ Got it!"

[Timer expires or presenter closes round]
[System texts top 3] → "🏆 Round over! You're in 1st place with 200 pts!"
```

## SMS Commands
| Command | Action |
|---------|--------|
| JOIN | Register for the active presentation |
| [name] | Set display name (first message after JOIN) |
| A/B/C/D | Answer multiple choice |
| [free text] | Answer open-ended question |
| SCORE | See your current score |
| HELP | Get instructions |

## Twilio Webhook Flow
`POST /api/twilio` receives every inbound SMS:
1. Look up participant by phone number
2. If no participant + active presentation → start registration
3. If registering (no name yet) → save name
4. If game round active → process answer
5. If no round active → reply with status

## Scoring
- Correct answer: base points (e.g., 100)
- Speed bonus: faster answers get more points (e.g., +50 for first 5 seconds)
- Streak bonus: consecutive correct answers multiply

## Technical Notes
- Use toll-free Twilio number for MVP (25+ MPS throughput)
- Outbound broadcasts: stagger sends (100 participants = 4 sec at 25 MPS)
- Fuzzy matching for free-text answers (existing `matchAnswer.ts`)
- Store in `poll_responses` table with `participant_id` + `poll_id`

## Schema Tables Used
- `participants` — registered audience members
- `polls` — active game questions
- `poll_options` — answer choices
- `poll_responses` — submitted answers

## Status
- [ ] Updated Twilio webhook for new flow
- [ ] JOIN + name registration
- [ ] Multiple choice answer handling
- [ ] Free-text fuzzy matching
- [ ] Score tracking
- [ ] Outbound question broadcast
- [ ] Speed bonus scoring
