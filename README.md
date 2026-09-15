# Phoenix SWS — Live Interactive Survey Platform

> **Real-time audience • stage projector • moderator console in one seamless experience.**

**Brand:** Phoenix Team — Developed by **[Neka.NG](https://neka.ng)**  
**Live Demo:** `SWS-329` / `https://your-domain.vercel.app`  
**Stack:** React 19 + Vite 6 + Express 4 + `ws` + Neon PostgreSQL + Tailwind 4

<p align="center">
  <img src="https://img.shields.io/badge/Phoenix%20SWS-Live%20Survey-%230a1936?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Powered%20by-Neka.NG-red?style=for-the-badge&labelColor=%23dc2626" />
  <a href="https://neka.ng"><img src="https://img.shields.io/badge/Visit-neka.ng-black?style=for-the-badge" /></a>
</p>

---

### ✨ Overview

Phoenix SWS is a **single-codebase, DB-driven live survey platform** for conferences, trainings and large halls.  
Audience joins on phones (no install) via **QR / link** (`/`), projector shows live animated results on stage (`/project`), and moderator controls everything from `/admin`.

All state is **seeded and pulled directly from Neon PostgreSQL** — no mock data after initial seed. Every question, vote, participant identity, gift winning and aggregate is persisted and re-broadcast via WebSocket so **audience ↔ projector ↔ admin stay perfectly in sync**.

---

### 🎯 Key Features

**Audience (`/`) — light, fun, mobile-first**
- Subtle top progress bar `AudienceView.tsx:98` — `Question 2 of 4 · 2 remaining` (fixed `z-[60]`, `role="progressbar"`)
- Identity capture (optional/required) `AudienceView.tsx:130` — admin chooses `name / email / phone`; each attendee gets a stable `PHX-XXXXXX` ID for tracking
- Completion-only gift lottery `AudienceView.tsx:563` — gift revealed **only after final question** (`isFinalCompletion`), persistent card + modal + `Claim — Meet Coordinator` (`attendee/coordinator/admin`)
- Confetti, reactions (👏🔥❤️💡🚀), timer, voting lock

**Projector (`/project`) — stage dark theme**
- QR card `ProjectorView.tsx:539` — QR = `window.location.origin + "/"` (default join link, high-contrast `260px`, `bg-white` card)
- Live animated bar / stars / NPS / feedback wall with auto-scroll `ProjectorView.tsx:80`
- Theme switch `ProjectorView.tsx:156` — `Palette` button toggles `stage-dark | bright-conference (light) | neon-indigo | clean-minimal` via `session.theme` (`updateSessionSettings`)
- Timer, live count, `QR / Auto-Scroll / Lock / Reveal / Fullscreen`

**Admin (`/admin`) — moderator console (email `moderator@phoenix.sws` / `admin123`)**
- Single-survey rule: `Setup New Survey` `AdminDashboard.tsx:209` issues fresh `SWS-###` + `projectorPasskey` and wipes old `responses/participants/gift_winnings` (DB + broadcast)
- Add/edit/delete questions, `Project Live`, `Clear votes`, moderation of open-text (approve/hide/edit)
- Passkey, identity config (`captureName/Email/Phone`, `required`), **Gift lottery** `AdminDashboard.tsx:1107` — enable, `winRatio 5-100%` (cap ratio), up to 5 gifts (`emoji, name, description, quantity 1-500`), claim instructions, live winners table (`giftWinnings` with `Mark Claimed` for coordinator) + `Export CSV`
- Analytics, participants registry (`PHX-*` + `responseCount`), `Export CSV`, `Danger Zone`

**Platform**
- Header nav hidden by default `App.tsx:22` (`isNavBarVisible=false`, `sessionStorage`), floating pill `Show Nav` (`z-50`) to reveal — clean stage everywhere

---

### 🧰 Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, Vite 6, Tailwind 4, `lucide-react`, `motion`, `qrcode` |
| Backend | Express 4, `ws` 8, `tsx`, `esbuild` |
| DB | Neon PostgreSQL (`pg` 8) with `embedded-store` fallback; `sessions/questions/responses/participants/gift_winnings` |
| Realtime | WebSocket `/ws` (`INITIAL_STATE`, `SESSION_UPDATE`, `QUESTIONS_UPDATE`, `AGGREGATES_UPDATE`, `PARTICIPANTS_UPDATE`, `GIFT_WINNINGS_UPDATE`, `GIFT_WIN`, `GIFT_CLAIMED`, `TIMER_UPDATE`, `REACTION_PULSE`, `AUDIENCE_COUNT`) + REST `/api/*` |
| Deploy | `dist/server.cjs` (Express static + API + WS), `vercel.json` for Vercel, or persistent Node on Render/Railway/Fly |

---

### 📁 Project Structure

```
/
├── server/
│   └── db.ts               # Neon + memory fallback, session/questions/responses/participants/gift_winnings
├── src/
│   ├── App.tsx             # hidden header, role routing, auth guards
│   ├── types.ts            # Question, SurveySession, AudienceParticipant, Gift, GiftConfig, GiftWinning
│   ├── context/
│   │   └── LiveSurveyContext.tsx  # voterToken, session, WS, aggregates, gift lottery, identity
│   └── components/
│       ├── AudienceView.tsx      # progress bar, identity gate, voting, completion + gift claim
│       ├── ProjectorView.tsx     # stage, QR (origin), theme switch, auto-scroll
│       ├── AdminDashboard.tsx    # questions/moderation/analytics/gifts/settings, Setup New Survey
│       ├── NavigationHeader.tsx  # hidden by default, role switch, QR/Share
│       ├── QRCodeModal.tsx
│       └── ConfettiOverlay.tsx
├── server.ts               # Express + WS + Vite middleware, /api/*, gift/id assignment after final
├── vite.config.ts
├── vercel.json
├── .env.example
└── package.json            # phoenix-sws-live-survey
```

**Roles & Routes**

| Path | Role | Auth |
|------|------|------|
| `/` | `audience` | optional identity gate |
| `/project` | `projector` | `session.projectorPasskey` (default `8920`, WS `phoenix_projector_auth`) |
| `/admin` | `admin` | `moderator@phoenix.sws / admin123` (`phoenix_admin_auth`) |

---

### 🚀 Quick Start (Local)

1. **Install**
   ```bash
   npm install
   ```
2. **Env** — copy `.env.example` → `.env` (or `.env.local`)
   ```
   DATABASE_URL=postgresql://user:pass@ep-xyz.neon.tech/neondb?sslmode=require&channel_binding=require
   GEMINI_API_KEY= # optional
   ```
3. **Run**
   ```bash
   npm run dev      # http://localhost:3000  (Express + Vite + WS /ws)
   npm run build    # vite build + esbuild server.ts → dist/server.cjs
   npm start        # node dist/server.cjs  (production)
   npm run lint     # tsc --noEmit
   ```

---

### 🔐 Environment

| Var | Required | Notes |
|-----|----------|-------|
| `DATABASE_URL` | **yes for prod** | Neon pooled URL `?sslmode=require&channel_binding=require`. Falls back to in-memory `embedded-store` if empty (dev only). |
| `GEMINI_API_KEY` | no | optional AI |
| `PORT` | no | default `3000` |
| `VERCEL` | auto | set by Vercel, switches `server.ts` to serverless export |

---

### 🗄️ Database — Seeded, No Mock

`server/db.ts:125 initDatabase()`:

- Creates `sessions / questions / responses / participants / gift_winnings` (with `BIGINT order_index` fix for `Date.now()`)
- Seeds **once** if `sessions` empty: `defaultSession` `SWS-LIVE` + 4 `defaultQuestions` (rating, multiple_choice, open_text, NPS) — **no `voter-seed` responses** (deleted `DELETE WHERE voter_token LIKE 'voter-seed-%'`)
- `gift_config` JSONB default (`☕12/👕8/🎟️3`, `winRatio 35`) seeded

**All reads are DB-first:**

```ts
if (pool && connected) return pool.query('SELECT * FROM ...');
return memoryFallback;
```

`LiveSurveyContext:187 refreshData()` fetches `/api/session /questions /participants /gifts/winnings /analytics` from DB; `WS INITIAL_STATE:271` pushes `session/questions/aggregates/participants/giftWinnings` from DB. No mock after seed.

---

### 🔄 Real-time Sync — Seamless Across Devices

Every mutation **writes to DB then broadcasts**:

- `POST /api/responses` → `submitResponse()` (stable id, `voter+question` dedup) → `getResponses()` → `computeQuestionAggregates` → `broadcast('AGGREGATES_UPDATE')`
- `POST /api/session` (theme, voting lock, timer, identity/gift config) → `updateSession()` → `broadcast('SESSION_UPDATE')` (+ `PARTICIPANTS_UPDATE` / `GIFT_WINNINGS_UPDATE`)
- `POST /api/participants` → `registerParticipant()` (unique `PHX-*` via `memory+DB` set) → `broadcast('PARTICIPANTS_UPDATE')`
- `POST /api/gifts/*` → `assignRandomGift()` **only when `uniqueAnswered >= totalQs`** (`isFinalCompletion`) → `broadcast('GIFT_WINNINGS_UPDATE')` / `GIFT_WIN`
- `POST /api/questions` / `PUT /:id` / `DELETE /:id` → `broadcast('QUESTIONS_UPDATE')`

Clients reconcile via `LiveSurveyContext:284` WS handlers + `refreshData()` fallback + `setInterval` heartbeat (`PING/PONG`, `broadcastAudienceCount` on stale). Result: **admin changes, projector, and every phone see the same DB truth instantly**.

---

### ☁️ Deployment — Is Vercel Perfect?

**Current architecture = persistent Node + WebSocket (`ws` on `http.createServer`) + in-memory heartbeat.**

- **Vercel (serverless)** is **not ideal as-is**: serverless functions are stateless, cold-start, and don't keep a long-lived `ws` server. `vercel.json` in this repo builds `dist/server.cjs` as a function, but `ws` will **not stay connected** across invocations. It *can* work for the REST part (`/api/*`, static `dist/index.html`), but realtime will be degraded (polling fallback needed).

**Recommended for live events (persistent WS):**

| Platform | Why | Command |
|----------|-----|---------|
| **Render** | Native Node + WS, free Neon | `npm run build && npm start` with `DATABASE_URL` |
| **Railway / Fly.io / DigitalOcean App Platform / Cyclic** | same | `PORT` auto, `DATABASE_URL` |

**If you must use Vercel:**

1. Deploy **frontend** on Vercel, **backend + WS** on Render/Railway and set `VITE_API_URL` (or proxy).
2. Or keep single deploy but replace `ws` with a managed realtime layer (Pusher, Ably, PartyKit) and keep DB as source of truth — `server.ts` already abstracts `broadcast()` so swap is trivial.
3. The included `vercel.json` + `server.ts` `export default app; if (!process.env.VERCEL) start();` lets the build **succeed** on Vercel for the static + API part; WS will still try to run but may drop. Add `DATABASE_URL` in Vercel Env (`@database-url`).

**Vercel Env Setup**

```
DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require&channel_binding=require
```

`vercel.json` already rewrites `/ws`, `/api/*` → `dist/server.cjs` and `/*` → `index.html`.

---

### 📡 API (selected)

```
GET  /api/session            # current SurveySession (with identityConfig + giftConfig)
POST /api/session            # {theme, isVotingOpen, areResultsRevealed, timerSeconds, identityConfig, giftConfig}
POST /api/surveys/setup      # {title, questionTitle, questionType, options, allowMultiple, identityConfig, giftConfig} → new SWS-### + passkey
GET/POST /api/questions  PUT/DELETE /api/questions/:id
POST /api/responses           # {questionId, voterToken, selectedOptionIds|ratingValue|textValue} → {saved, giftWinning, isFinalCompletion}
GET  /api/participants   POST /api/participants {voterToken, name, email, phone}
GET  /api/gifts/config   POST /api/gifts/config {giftConfig}
GET  /api/gifts/winnings      GET /api/gifts/mine?voterToken=
POST /api/gifts/claim    {winningId|voterToken, claimedBy: attendee|coordinator|admin}
POST /api/gifts/clear
POST /api/projector/verify {code, passkey}
```

---

### 🏷️ Brand

> **Phoenix SWS Live Survey** is a product of the **Phoenix Team**, engineered and maintained by **[Neka.NG](https://neka.ng)** — *We build fast, real-time tools for African teams and global stages.*

- **Studio:** Neka.NG — https://neka.ng
- **Contact:** hello@neka.ng
- **License:** Apache-2.0 (see `App.tsx:2`)

*Built with care in Lagos — for live rooms that deserve zero lag.*

---

**Local checklist before going live:**

```bash
npm run lint   # no mock, types ok
npm run build  # 4 Qs, gift after final, QR = origin, theme toggle, Setup New Survey → SWS-xxx
# Set DATABASE_URL on host, deploy dist/server.cjs, open /admin, Setup New Survey, enable gift lottery, test phone on / → /project shows QR + live results.
```
