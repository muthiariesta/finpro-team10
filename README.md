# SafeHer — Frontend

Women's safety web app: plan a route with a risk assessment attached, keep a
guardian watching while you travel, and report incidents anonymously.

SISTECH 2026 final project · Team 10 · Next.js frontend.
The machine-learning service lives in a separate repository
([RiskScore-API](https://riskscore-api.onrender.com/docs)).

---

## The one thing to understand first

The risk model is trained on the **Chicago Open Data** crime dataset. Every
coordinate outside that dataset — all of Indonesia included — returns
`match_type: "no_data"`.

The API answers `no_data` with `risk_score: 0.0` and `level: "Low"`. Rendered
literally, Jakarta would appear as a green **"Safe 100%"** route. On a safety
product that is not a cosmetic bug: it invents reassurance where there is no
evidence.

So the client never exposes a raw level. `fetchRiskScore()` returns a
discriminated union that makes the unsafe states impossible to ignore:

```ts
type RiskResult =
  | { status: 'ok';      score: number; level: RiskLevel; source: 'model' | 'admin'; /* … */ }
  | { status: 'no_data'; disclaimer: string }
  | { status: 'error';   message: string }
```

TypeScript will not let a caller read `.score` without first narrowing
`status`. That single decision is why "no data" shows up as a grey **"Not
scored"** card everywhere instead of a green one, and it shapes most of the UI
below.

Three rules follow from it, applied throughout:

- **A route's score is its worst segment, not its average.** One dangerous
  stretch does not become safe because the rest of the trip is calm.
- **Unknown is its own state.** Safe points show `OPEN` / `CLOSED` /
  `HOURS N/A` — never two states where the third is quietly folded into "open".
- **Human judgement is labelled as such.** Admin-assessed areas render
  *"Assessed by SafeHer, not by the historical model."*

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router, Turbopack) | Server components for admin pages, route handlers as the API layer |
| Language | TypeScript 5 | The `RiskResult` union only works if the compiler enforces it |
| UI | Tailwind CSS 4, lucide-react | Utility styling; one icon set across DOM *and* Leaflet markers |
| Maps | Leaflet 1.9 + react-leaflet 5, leaflet.heat | Open source, no API key, no per-tile billing |
| Database | Neon Postgres via Prisma 7 (`@prisma/adapter-neon`) | Serverless driver over HTTP — no connection pool to exhaust on Vercel |
| Auth | `jose` (JWT) + bcryptjs, httpOnly cookie | `jose` runs on the edge runtime, so `proxy.ts` can verify sessions |
| Files | Vercel Blob | Evidence uploads |
| Hosting | Vercel (app) + Render (ML API) | Both free tiers |

### External services (no keys required)

| Service | Used for |
|---|---|
| [OSRM](https://project-osrm.org/) | Road geometry, duration, alternative routes |
| [Nominatim](https://nominatim.org/) | Geocoding, autocomplete, reverse geocoding |
| [Overpass](https://overpass-api.de/) | Safe points from OpenStreetMap |
| RiskScore API | Risk scores (own team, FastAPI on Render) |

---

## Features

**Safe Route** (`/`) — Enter origin and destination, pick a departure hour.
OSRM returns up to three real alternatives; each is sampled at several points
and scored independently. Cards are selectable and the map redraws — unselected
routes stay visible as grey lines you can click. Routes are ordered by safety,
and an unscored route never outranks a scored one.

**Risk heatmap** — Grid-samples the visible viewport and paints scored cells.
Areas outside the dataset stay blank; that emptiness is the honest answer.

**Safe points** — Police, hospitals, pharmacies, fuel and convenience stores
along the route, from OpenStreetMap. Evaluated against your **estimated
arrival** (departure + OSRM duration), not departure — a place that closes
before you get there is not a refuge. `opening_hours` is parsed for the common
forms including ranges past midnight; anything unrecognised reports
`HOURS N/A` rather than guessing.

**In-Trip Protection** (`/in-trip`) — Live GPS tracking against the planned
route with an ETA countdown. If the ETA passes with no confirmation, a
10-minute grace timer runs, then guardians are alerted. Falls back to simulated
movement along the path when GPS is unavailable, and says so.

**SOS** (`SosButton`) — Three-second hold to arm, so a pocket brush cannot fire
it. Sends location and guardian details via WhatsApp/SMS.

**Report an incident** (`/report/new`) — Anonymous, ownership held by a token.
Location can come from device GPS, a draggable map pin, or plain typing; the
source is stored so admins know how precise it is. Up to five attachments.

**Emergency contacts** (`/emergency`) — Guardians with per-contact channel
preferences.

**Admin panel** (`/admin`) — Review queue, published feed, safe-point registry,
and the risk-area table that fills the Indonesia data gap.

---

## Safety and privacy decisions

These are deliberate; please do not "simplify" them away.

- **`ownerToken` never leaves the server.** It is the only proof of ownership
  for an anonymous report, so no query selects it into a response.
- **Only `VERIFIED` reports reach the public feed.** Unreviewed reports must
  not shape how people see a neighbourhood.
- **Login errors are identical** for an unknown account and a wrong password —
  otherwise the form becomes an account-existence oracle.
- **SOS states when it is simulated.** Without `FONNTE_TOKEN` the endpoint
  returns `simulated: true` and the UI must say so. Claiming "sent to 2
  contacts" when nothing was sent could stop someone from seeking other help.
- **Deleting a report deletes every attachment**, not just the first.

---

## Getting started

```bash
git clone <repo-url> && cd finpro-team10
npm install                  # postinstall runs `prisma generate`
cp .env.example .env.local   # then fill it in — see below
npx prisma db push           # create the tables
npx tsx prisma/seed.ts       # demo accounts
npm run dev
```

Open <http://localhost:3000>. Login is the entry point; `proxy.ts` redirects
anonymous visitors there.

### Demo accounts

| Role | Identifier | Password |
|---|---|---|
| User | `user@safeher.org` | `safeher123` |
| Admin | `admin@safeher.org` | `admin123456` |

Admins land on `/admin` and are kept out of the user app — an admin account has
no guardians or trips, so those pages would render empty.

### Environment

| Variable | Required | Without it |
|---|---|---|
| `DATABASE_URL` | yes | App throws at startup with a message naming the cause |
| `AUTH_SECRET` | yes | App refuses to start (≥16 chars; anyone holding it can forge admin sessions) |
| `NEXT_PUBLIC_RISK_API_URL` | yes | Falls back to `http://localhost:8000` |
| `BLOB_READ_WRITE_TOKEN` | no | Evidence upload fails; reports still submit without files |
| `FONNTE_TOKEN` | no | SOS reports itself as simulated |

Generate a secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

> **Windows:** File Explorer hides extensions, so a file saved as
> `.env.local.txt` looks correct and silently does nothing.

---

## Using the RiskScore API

The browser never calls the ML service directly. It calls
`/api/risk-score`, a route handler that reads `NEXT_PUBLIC_RISK_API_URL`
server-side — so there is no CORS, no upstream URL inlined into the bundle,
and one place to change when the model moves.

### Direct call

```
GET https://riskscore-api.onrender.com/risk-score
      ?lat=41.8781&lon=-87.6298&datetime=2026-08-12T21:30:00
```

```jsonc
{
  "risk_score": 62.4,
  "level": "High",
  "match_type": "exact",     // "exact" | "nearest" | "no_data"
  "distance_km": null,
  "model_version": "v1.2.0",
  "disclaimer": "Estimasi berbasis pola kejahatan historis…",
  "latency_ms": 12.3
}
```

`datetime` is ISO 8601 **without a timezone**. Use local components, not
`toISOString()` — otherwise a 21:30 departure is scored as mid-afternoon UTC.
`toApiDatetime()` in `src/lib/riskApi.ts` handles this.

The hour matters. The API filters crime history by `(day_of_week, hour)`
before predicting, and feeds `hour_sin/cos` to the model — so the same street
scores differently at 08:00 and 02:00.

### From the app

```ts
import { fetchRouteRisk, fetchRiskAreas, toApiDatetime } from '@/lib/riskApi';

const areas = await fetchRiskAreas();               // admin fallback assessments
const risk  = await fetchRouteRisk(
  path,                                             // LatLng[] from OSRM
  toApiDatetime('21:30'),
  6,                                                // sample points
  areas
);

if (risk.overall.status === 'ok') {
  console.log(risk.overall.level, risk.overall.source);
} // else: 'no_data' or 'error' — must be handled, never rendered as safe
```

`fetchRouteRisk` scores points **sequentially, on purpose**. Firing them in
parallel triggers simultaneous DNS lookups that fail together on Windows
(`getaddrinfo ENOTFOUND`). Once the server is warm a point costs ~12 ms, so six
points still finish well under a second.

> **Render free tier sleeps after ~15 minutes idle.** The first request takes
> roughly 50 seconds while it wakes. Timeouts are set to 90–100 s and the UI
> explains the wait. Hit `/health` before a demo to warm it up.

---

## Reusable pieces

Self-contained and free of SafeHer-specific assumptions:

| Module | What it does |
|---|---|
| `lib/openingHours.ts` | Parses OSM `opening_hours` → `'open' \| 'closed' \| 'unknown'`. Handles day ranges, multiple windows, past-midnight, `off`. Returns `unknown` on anything unrecognised instead of guessing. |
| `components/LocationInput.tsx` | Nominatim autocomplete. Renders through a portal with fixed positioning, so no ancestor `overflow` can clip the dropdown. |
| `components/IncidentLocationPicker.tsx` | GPS + draggable map pin + free text, with reverse geocoding. |
| `components/DateTimePicker.tsx` | Custom calendar; no dependency, no native styling. |
| `components/HeatmapLayer.tsx` | react-leaflet wrapper for `leaflet.heat`. |
| `lib/trip.ts` | Trip session in `sessionStorage`, plus `pointAlongPath()` for interpolating along a polyline. |
| `components/admin/AdminCard.tsx` | `AdminCard` / `AdminTable` shells with empty states. |

**A note on `leaflet.heat`:** it predates modules — it exports nothing and
attaches to a global `L`. Importing it through the bundler silently fails, no
matter how early you set `window.L`, because module scope never resolves to it.
The file is therefore copied to `public/vendor/` and loaded via a `<script>`
tag. If the heatmap ever goes blank, check that `proxy.ts` is not redirecting
`/vendor/*` to `/login`.

---

## Project layout

```
src/
├── app/
│   ├── page.tsx              Safe Route (home)
│   ├── report/               Report list · /new  submission form
│   ├── emergency/            Guardians + SOS
│   ├── in-trip/              Live tracking
│   ├── login/ · register/
│   ├── admin/                Review · public-feed · safe-points · risk-areas
│   └── api/                  Route handlers (see below)
├── components/               Shared UI · admin/  admin-only
├── lib/                      Domain logic, no JSX
├── generated/prisma/         Prisma client (generated — do not edit)
└── proxy.ts                  Route guarding by role
```

`proxy.ts` is Next.js 16's replacement for `middleware.ts`. Its matcher must
keep excluding static assets, or files under `public/` get redirected to
`/login`.

### API routes

| Route | Purpose |
|---|---|
| `GET  /api/risk-score` | Proxy to the ML service |
| `POST /api/risk-grid` | Grid sampling for the heatmap |
| `POST /api/safe-points` | Overpass proxy |
| `GET POST /api/reports` · `PATCH DELETE /api/reports/[id]` · `GET /api/reports/mine` | Incident reports |
| `GET POST /api/guardians` · `DELETE /api/guardians/[id]` | Emergency contacts |
| `POST /api/sos` | Alert dispatch |
| `/api/auth/login · register · logout · me` | Sessions |
| `/api/admin/*` | Admin operations, guarded by `requireAdmin()` |

Middleware skips `/api`, so **every admin route calls `requireAdmin()`
itself.** Do not rely on `proxy.ts` for API authorisation.

---

## Notes for the team

- Code comments are in Indonesian; user-facing copy is in English.
- Comments explain *why*, especially where the obvious approach was tried and
  failed. The Overpass handler documents which query shapes get rejected; the
  sequential scoring loop documents the DNS failure. Deleting those comments
  invites the same day of debugging again.
- After changing `prisma/schema.prisma`: `npx prisma db push && npx prisma generate`,
  then **restart the dev server** — a server started before generation holds a
  stale client and reports models as `undefined`.
- Run `npx tsc --noEmit` and `npm run build` before pushing. The build catches
  what dev mode does not, such as `useSearchParams` outside a `Suspense`
  boundary.
