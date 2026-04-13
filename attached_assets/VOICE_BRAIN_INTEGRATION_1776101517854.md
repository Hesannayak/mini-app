# Backend Update: Claude Voice-Brain Integration

## What changed

A new unified endpoint `POST /api/v1/coach/voice` has been pushed to the repo. This replaces the old regex-based intent classifier with Claude as the primary brain for ALL user input — voice and text.

**Pull latest:**
```bash
git pull origin main
```

## New/Modified files

| File | What |
|------|------|
| `services/coach/routes/voice_brain.py` | **NEW** — unified Claude brain endpoint |
| `services/coach/prompts.py` | **MODIFIED** — added `VOICE_BRAIN_PROMPT` with structured JSON output |
| `services/coach/main.py` | **MODIFIED** — registered `voice_brain_router` |
| `services/coach/routes/coach.py` | **MODIFIED** — fixed indentation issue |

## The endpoint

```
POST /api/v1/coach/voice
Content-Type: application/json

{
  "transcript": "mummy ko 500 bhej do",
  "language": "hi",
  "user_id": "user_123"
}
```

Response (always structured JSON):
```json
{
  "intent": "send_money",
  "entities": { "amount": 500, "contact_name": "mummy" },
  "action": "confirm",
  "response_text": "Mummy ko ₹500 bhejne hain?",
  "requires_pin": false
}
```

## How to integrate in the frontend

**Replace all calls to `/voice/text` and `/coach/message` with a single call to `/coach/voice`.**

The old flow (broken):
```
User input → /voice/text (regex intent) → fails on "hi", "yes", "हाँ"
                    ↓ fallback
              /coach/message (Claude) → only for low-confidence
```

The new flow (working):
```
User input → /coach/voice (Claude brain) → handles EVERYTHING
```

**In VoiceScreen.tsx**, wherever you call the voice or coach API, replace with:

```typescript
const response = await fetch(`${API_BASE}/api/v1/coach/voice`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    transcript: userText,      // what the user said (from Sarvam ASR or typed)
    language: 'hi',            // user's language
    user_id: uniqueUserId,     // per-user — maintains conversation context server-side
  }),
});

const data = await response.json();
// data.intent    → "send_money" | "greeting" | "confirmation" | "rejection" | "general_chat" | etc.
// data.action    → "execute" | "confirm" | "respond" | "cancel"
// data.entities  → { amount, contact_name, bill_type }
// data.response_text → what to show/speak to user
// data.requires_pin  → true/false
```

**Handle the response based on `action`:**

```typescript
switch (data.action) {
  case 'confirm':
    // Show confirmation UI: "Mummy ko ₹500 bhejne hain?"
    // User's next "yes"/"haan" will be sent to same endpoint
    // Claude remembers the context — no need to pass pending_context
    break;

  case 'execute':
    // Payment confirmed! Show success: "₹500 mummy ko bhej diya!"
    // If data.requires_pin → show PIN input first
    break;

  case 'cancel':
    // User said "no"/"cancel" — show: "Theek hai, cancel kar diya."
    break;

  case 'respond':
    // General response — greeting, spending query, advice
    // Just display data.response_text
    break;
}
```

## Key point: conversation context is SERVER-SIDE

You do NOT need `pendingContextRef` or any client-side context management. The server maintains conversation history per `user_id`. When user says "yes" after a payment confirm, Claude sees the full conversation and knows what "yes" refers to.

**Just send every user input to `/coach/voice` with the same `user_id`. Claude handles the rest.**

## What this fixes

- "Hi" / "how are you" → Claude responds naturally (was: "samajh nahi aaya")
- "यस" / "हाँ" / "ok" after confirm → Claude executes payment (was: failed regex match)
- Any general conversation → Claude handles it (was: only 8 hardcoded intents worked)
- Mixed Hindi/English → Claude understands natively (was: separate regex per language)

## Environment requirement

The coach service needs `ANTHROPIC_API_KEY` in the environment. It's already in `.env` locally. For Replit, set it as a Replit Secret:
```
ANTHROPIC_API_KEY=<the key from .env>
```

## Tested scenarios (all passing)

| # | Input | Result |
|---|-------|--------|
| 1 | "Hi, kaise ho?" | `intent: greeting` — "Namaste! Main bilkul theek hun." |
| 2 | "mummy ko 500 bhej do" | `intent: send_money, action: confirm, requires_pin: false` |
| 3 | "हाँ" (after confirm) | `intent: confirmation, action: execute` — "₹500 mummy ko bhej diya!" |
| 4 | "nahi rehne do" | `intent: rejection, action: cancel` — "Theek hai, cancel kar diya." |
| 5 | "aaj kitna kharch hua?" | `intent: spending_summary` — "₹1,250 kharch hua" |
| 6 | "mutual fund mein invest karna hai" | `intent: guardrail` — "Financial advisor se baat karo." |
| 7 | "यस" (Sarvam transcription) | `intent: confirmation, action: execute` — works because Claude understands context |
