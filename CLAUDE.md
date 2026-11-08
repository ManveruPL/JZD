# CLAUDE.md — Claude Code Guidelines for JZD

> **Canonical Documentation**: For comprehensive architecture, security invariants, and Socket.IO protocol details, always refer to [AGENTS.md](AGENTS.md).

---

## 1. Project Overview
**JZD (Jeden z Dziesięciu)** is a real-time web multiplayer game based on the legendary Polish television quiz show. It supports 4–15 players across two primary modes:
- **Party Mode**: Game Master assistant on desktop/tablet with keyboard shortcuts + dedicated TV screen (`/?tv=ROOM_CODE`).
- **Interactive Mode**: Mobile-responsive contestant client with real-time buzzer, open-text answers, and QR-code lobby joining.

---

## 2. Essential Commands

```bash
# Development (runs server on 3001 and Vite client on 3000)
npm run dev

# Testing & Quality Gates (Must pass before committing)
npm run typecheck      # Type checking for client and server
npm test               # Run Vitest test suite (50+ unit/integration tests)
npm run test:e2e       # Run Playwright E2E tests (builds client & runs headless)

# Production Build & Runtime
npm run build          # Builds dist/server (tsc) and dist/client (vite)
npm run start:prod     # Starts compiled Fastify production server
```

---

## 3. Architecture & Code Map
- **Domain Engine** (`src/engine/`): Pure TypeScript state machine (`GameEngine.ts`) and question repository (`QuestionsRepository.ts`). Independent of UI and transport layers.
- **Server** (`src/server/`): Fastify server with `@fastify/helmet` (CSP), `@fastify/rate-limit`, and Socket.IO handlers (`socketHandlers.ts`).
- **Client** (`src/client/`): React 19 + Tailwind CSS + Lucide Icons. Core views in `src/client/views/` (`HomeView.tsx`, `HostView.tsx`, `PlayerView.tsx`, `TvView.tsx`).
- **Questions Database** (`data/`): `questions.json` (11,047 verified questions). Kept server-side in-memory only.

---

## 4. Key Rules & Invariants
1. **Server Authority**: Timers, answer checks, and stage transitions are strictly authoritative on the server. Never trust client clocks.
2. **Answer Confidentiality**: `getPublicState()` masks question answers (`***`) for players and TV spectators. Only the host socket receives unmasked answers.
3. **Audio Synthesis**: Sound effects are generated via Web Audio API (`src/client/utils/sound.ts`). Do not load external audio files over the network.
4. **Styling**: Maintain the high-contrast dark theme (black background, Fira Sans font, cyan/emerald/amber/rose status accents).
5. **Security**: Validate and slice all Socket.IO input strings, escape CSV formula triggers (`='...`) in exports, and never expose `data/` statically.
