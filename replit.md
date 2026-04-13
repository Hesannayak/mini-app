# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Mini — Voice Finance App (`artifacts/mobile`)

India's voice-first AI financial companion. Dark-premium design targeting Hindi/Tamil/Telugu speakers.

### Design System
- Background: `#080812` (deep midnight)
- Surface: `#0F0F1E`
- Card: `#14142A`
- Border: `#1E2040`
- Primary: `#6366F1` (indigo)
- Accent: `#F59E0B` (amber gold)
- Success: `#10B981` (emerald)
- Danger: `#EF4444`
- Text: `#EEF2FF`
- Muted: `#8B8BAD`
- Font: Inter (400/500/600/700)

### Architecture
- **Navigation**: Expo Router file-based routing with custom tab bar
- **State**: Zustand (`store/authStore.ts`, `store/userStore.ts`, `store/voiceStore.ts`)
- **Auth**: AsyncStorage (web: localStorage) with token persistence
- **Charts**: `react-native-svg` for circular score ring
- **Animations**: `react-native-reanimated` for voice pulse rings & waveform
- **Icons**: `@expo/vector-icons` (Feather only — no emojis)

### Screens (5 tabs + login)
| Screen | Route | Key Feature |
|--------|-------|-------------|
| Login | `/login` | OTP flow, 3-step (phone → OTP → name), demo bypass |
| Home/Chat | `/(tabs)/` | AI chat interface, payment confirmation, suggestion chips |
| Spending | `/(tabs)/spending` | Period selector, animated category bars, recent transactions |
| Voice | `/(tabs)/voice` | Pulsing rings (Reanimated), waveform, transcript display |
| Bills | `/(tabs)/bills` | BBPS-style dark cards, urgency indicators, pay flow |
| Score | `/(tabs)/score` | SVG ring chart (ScoreRing.tsx), animated breakdown bars |

### Components
- `MiniLogo.tsx` — animated spinning logo
- `PaymentConfirm.tsx` — bottom sheet payment modal
- `PinInput.tsx` — 4-digit PIN with shake animation + 3-try lockout
- `ScoreRing.tsx` — SVG circular arc ring chart

### Mock Data (demo mode)
- Balance: ₹42,350
- Mini Score: 72/100
- Bills: Tata Power ₹1,420 (2d), ACT Fibernet ₹699 (5d), Jio ₹499 (9d), Water ₹180 (13d), HDFC CC ₹8,450 (18d)
- Spending (today): ₹1,240 across food/transport/shopping/other
