# AGENTS.md — Developer & AI Agent Guidelines for JZD

Welcome to the **JZD (Jeden z Dziesięciu)** codebase. This document outlines project architecture, coding conventions, domain rules, and testing requirements for autonomous AI agents and human contributors.

---

## 1. Project Philosophy & Core Concepts

JZD is a real-time web application reproducing the Polish television quiz show *Jeden z dziesięciu*. It supports 4–15 contestants and runs in two distinct modes:
1. **Party Mode (Tryb Towarzyski)**: A single Game Master (Host) controls the game from a dashboard, reads questions, and enters verdicts. An optional TV view (`/?tv=ROOM_CODE`) acts as a spectator display for projectors.
2. **Interactive Mode (Pokoje Online)**: Contestants join with their smartphones (by scanning a QR code or entering a 4-character PIN). They type answers on their phones, buzz in using a 10s buzzer in Stage 3, and nominate opponents.

---

## 2. Codebase Structure

```
jzd/
├── data/
│   ├── questions.json          # 11,047 verified Polish quiz questions with answers & aliases
│   └── categories.json         # Quiz categories mapping
├── src/
│   ├── types/
│   │   ├── index.ts            # Domain types (GameState, Player, Question, GameStage, etc.)
│   │   └── socket.ts           # Socket.IO client-server event contracts
│   ├── engine/
│   │   ├── GameEngine.ts       # Pure domain state machine (Stage 1 -> Stage 2 -> Stage 3 -> Finished)
│   │   ├── QuestionsRepository.ts # In-memory question loader, shuffler & category filter
│   │   └── textSimilarity.ts   # Levenshtein & token similarity algorithms for answer matching
│   ├── server/
│   │   ├── app.ts              # Fastify application setup, Helmet CSP, rate limits, static serving
│   │   ├── socketHandlers.ts   # Socket.IO event router & input validation
│   │   ├── RoomManager.ts      # Multi-room memory lifecycle, quotas, and cleanup routines
│   │   ├── ServerTimer.ts      # Drift-free server countdown timer
│   │   └── index.ts            # Server entrypoint (reads PORT and HOST)
│   └── client/
│       ├── App.tsx             # Main client router (HOME, HOST, PLAYER, TV)
│       ├── views/
│       │   ├── HomeView.tsx    # Landing page & join form (handles ?join= pre-fill)
│       │   ├── HostView.tsx    # Game Master dashboard with controls, settings & sound toggles
│       │   ├── PlayerView.tsx  # Responsive contestant phone view with buzzer & input
│       │   └── TvView.tsx      # High-contrast studio TV/projector view with QR code in lobby
│       ├── components/
│       │   ├── ChanceIndicators.tsx # Visual chance lamps (3/2/1/0)
│       │   ├── TimerDisplay.tsx     # Animated countdown circle & bar
│       │   └── WinnerCelebration.tsx# Podium, fireworks & export buttons (CSV, JSON, MD, Print)
│       ├── hooks/
│       │   └── useSocket.ts    # Socket.IO client hook with auto-reconnect
│       └── utils/
│           ├── sound.ts        # Synthesized Web Audio API sound engine (no external assets)
│           └── exportReport.ts # CSV, JSON, and Markdown generation with formula sanitization
├── tests/                      # Vitest unit and integration test suite
├── e2e/                        # Playwright end-to-end tests (headless)
├── docs/                       # Project documentation and specifications
│   └── PLAN.md
├── Dockerfile                  # Multi-stage production container definition
└── package.json
```

---

## 3. Architecture & Security Invariants

When making changes to this codebase, you **MUST ALWAYS** uphold these principles:

### A. Server-Authoritative State & Timing
* **Never trust client clocks**: All timers (answer countdown, buzzer countdown) are run by `ServerTimer` on the server and broadcast via `timer:state` events.
* **Never trust client state transitions**: Game advancement, chance deduction, and score calculations must happen strictly within `GameEngine`.

### B. Answer Masking & Data Leakage Prevention
* Non-host sockets (players and TV spectators) receive `getPublicState()`, where `currentQuestion.answer` is masked with `***` and aliases are stripped.
* Only the `hostSocketId` receives the full state with answers.
* **Never mount `/data/` as a static directory**: `data/questions.json` must remain accessible only in memory on the server.

### C. Input Bounds & Sanitization
* All incoming Socket.IO strings must be sliced:
  * `playerName` $\le$ 30 characters.
  * `answerText` $\le$ 200 characters.
* Numeric adjustments (`delta`, `seconds`, `config`) must be range-checked with `Number.isFinite()`.
* When generating CSVs in `exportReport.ts`, always escape formula triggers (`=`, `+`, `-`, `@`, `\t`, `\r`) with a leading `'` to prevent CSV Formula Injection (CWE-1236).

### D. UI Design Standards
* **Font**: Google Font **Fira Sans** is applied across all views.
* **Palette**: High-contrast dark studio theme:
  * Backgrounds: `#000000` (`bg-theme-black`), `#09090b` (`bg-theme-darker`), `#18181b` (`bg-theme-card`).
  * Status Colors: Cyan (`text-status-active`, glow accents), Emerald (correct / success), Rose (wrong / danger), Amber (buzzer / warnings).
* **Audio**: Sounds are synthesized exclusively via the Web Audio API (`src/client/utils/sound.ts`) without external mp3/wav network requests.

---

## 4. Common Commands & Verification Workflow

Agents modifying code must run these checks before concluding tasks:

```bash
# 1. Typecheck (both client and server tsconfig)
npm run typecheck

# 2. Run unit and integration tests (Vitest)
npm test

# 3. Run end-to-end suite (Headless Playwright)
npm run test:e2e

# 4. Production build check
npm run build
```

---

## 5. Socket.IO Protocol Quick Reference

| Event Name | Direction | Payload | Description |
|---|---|---|---|
| `room:create` | Client $\rightarrow$ Server | `{ config?, isPartyMode? }` | Host creates a new room. Returns `{ success, roomCode }`. |
| `room:join` | Client $\rightarrow$ Server | `{ roomCode, playerName, role }` | Contestant or TV screen joins room. |
| `room:joined` | Server $\rightarrow$ Client | `{ roomCode, role, playerId? }` | Acknowledges join. |
| `game:start` | Host $\rightarrow$ Server | `{ categories?, players?, config? }`| Starts game from lobby. |
| `game:state` | Server $\rightarrow$ Room | `GameState` (full to host, public to others) | Full sync of current game state. |
| `game:buzz` | Player $\rightarrow$ Server | None | Contestant presses buzzer in Stage 3. |
| `game:submit_text_answer`| Player $\rightarrow$ Server | `{ answerText }` | Contestant submits written answer on phone. |
| `game:answer_verdict` | Host $\rightarrow$ Server | `{ isCorrect: boolean }` | Host confirms correct or incorrect answer. |
| `game:nominate` | Player/Host $\rightarrow$ Server| `{ targetPlayerId }` | Designates next player to answer. |
| `timer:state` | Server $\rightarrow$ Room | `TimerState` | Current remaining duration & running flag. |
