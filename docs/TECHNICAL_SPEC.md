# Technical Spec — World Cup 2026 Companion

**Status:** Living document (v0.2 — pre-implementation)
**Owner:** @timkaboya
**Related:** [`PRODUCT_SPEC.md`](./PRODUCT_SPEC.md) · Reference POC: [`../worldcup2026-eat.html`](../worldcup2026-eat.html)

---

## 1. Purpose & scope

This document defines the **technologies**, **architecture**, and **component interactions**
for the World Cup 2026 Companion app described in the Product Spec. It is written for
engineers and is the basis for review before implementation begins.

Guiding constraints (from the Product Spec):
- **Lightweight, single-tournament, no user accounts, no server-side user data.**
- **Client-first**: static hosting + a thin, read-only edge data layer.
- **Mobile + web**, installable (PWA), timezone-correct for every user.

---

## 2. Architecture at a glance

```
                         ┌─────────────────────────────────────────────┐
                         │                 The Browser                  │
                         │  (mobile + desktop, installable PWA)         │
                         │                                              │
                         │  ┌────────────┐   localStorage:              │
                         │  │  App (SPA/ │   - timezone                 │
                         │  │  islands)  │   - favorites                │
                         │  └─────┬──────┘   - cached snapshots         │
                         │        │  Service Worker (offline cache)     │
                         └────────┼─────────────────────────────────────┘
                                  │ HTTPS (JSON, cached w/ ETag)
                 ┌────────────────┼─────────────────────────────┐
                 │                │                              │
        ┌────────▼────────┐  ┌────▼─────────────┐   ┌────────────▼───────────┐
        │  Static assets  │  │  /api/scores      │   │  /api/news             │
        │  (CDN edge)     │  │  (edge function)  │   │  (edge function)       │
        │  HTML/CSS/JS,   │  │  reads KV cache   │   │  reads KV cache        │
        │  fixtures.json  │  └────┬──────────────┘   └───────────┬────────────┘
        └─────────────────┘       │                              │
                                  │ served from                  │ served from
                          ┌───────▼────────┐             ┌───────▼────────┐
                          │  Edge KV cache │             │  Edge KV cache │
                          │  (scores)      │             │  (news items)  │
                          └───────▲────────┘             └───────▲────────┘
                                  │ written by                   │ written by
                         ┌────────┴─────────┐          ┌─────────┴──────────┐
                         │ Scheduled Worker │          │ Scheduled Worker   │
                         │ (score aggregator)│         │ (news aggregator)  │
                         └────────┬─────────┘          └─────────┬──────────┘
                                  │ fetch/merge                  │ fetch/parse RSS
              ┌───────────────────┼───────────┐        ┌─────────┴───────────────┐
              │ worldcup26.ir  openfootball  ESPN │    │ FIFA / BBC / ESPN / etc. │
              └───────────────────────────────────┘    └──────────────────────────┘
```

**Key idea:** the browser never talks to third-party providers directly. Scheduled edge
workers pull from providers on a cron, **normalize + merge + de-duplicate**, and write compact
JSON to an edge **KV cache**. Read-only edge functions serve that cache to clients with strong
HTTP caching. This isolates provider flakiness/rate-limits/CORS from users and keeps the client
tiny.

> The POC already polls providers directly from the browser (with a CORS proxy fallback). The
> production design moves that aggregation server-side (edge) for reliability, CORS-safety, and
> rate-limit control, while keeping the app itself static.

---

## 3. Technology choices (deliberated)

Each choice lists the decision, the alternatives considered, and the rationale under our
"lightweight / no-accounts / single-tournament" constraints.

### 3.1 Frontend framework — **Astro + lightweight interactive islands**

- **Decision:** [Astro](https://astro.build) as the site framework, shipping mostly static HTML
  with **islands** of interactivity (Preact or Svelte) only where needed (live schedule, match
  drawer, timezone selector, refresh). Content-heavy areas (News list, static bracket/tables
  shells) ship **zero JS**.
- **Alternatives considered:**
  - *Vanilla single-file (as in POC):* simplest, zero build — but hard to scale to 5 views +
    news + PWA + tests without becoming unmaintainable.
  - *SvelteKit:* excellent DX and small bundles; great fit. Slightly more "app server" oriented
    than we need for a static-first site.
  - *Next.js / React SPA:* heaviest; SSR/runtime we don't need; larger bundles. Rejected as
    over-weight for a single-tournament site.
- **Rationale:** Astro's islands architecture directly serves the "lightweight first" principle
  — content ships as HTML, interactivity is opt-in and small. Great Lighthouse scores by
  default, first-class static output, and it can consume the fixtures dataset at build time.
- **Fallback option:** if the team prefers a single interactive paradigm, **SvelteKit in
  static-adapter mode** is the recommended alternative and would not change the rest of this
  architecture.

### 3.2 Language — **TypeScript**

- **Decision:** TypeScript across app and edge functions.
- **Rationale:** shared types for the canonical data model (Match, Team, Standing, Scorer,
  NewsItem) between the aggregators and the client prevent drift; cheap safety for a small team.

### 3.3 Interactive island runtime — **Preact (or Svelte)**

- **Decision:** Preact for islands (3KB React-compatible) unless the team standardizes on
  Svelte.
- **Rationale:** minimal runtime cost for the few interactive components; familiar API.

### 3.4 Styling — **Plain CSS with design tokens (POC-derived), optional utility layer**

- **Decision:** Carry over the POC's **CSS custom-property design system** (color tokens,
  radii, shadows, typography scale) as the source of truth; scope component styles via CSS
  Modules / Astro scoped styles.
- **Alternatives:** Tailwind (fast to build, but adds a toolchain and utility noise); CSS-in-JS
  (runtime cost — rejected for a static-first app).
- **Rationale:** the POC already has a coherent, attractive token system; reusing it is the
  lightest path and preserves the established look. Tailwind remains an option if the team
  prefers it — it would not affect architecture.
- **Fonts:** keep Bebas Neue / Inter / Noto Color Emoji, self-hosted or `font-display: swap`
  to protect performance; ensure emoji flags render via the Noto Color Emoji fallback (as the
  POC already handles).

### 3.5 Build tooling — **Vite (via Astro)**

- **Decision:** Vite, provided by Astro. Fast dev server, small production bundles, easy env
  handling.

### 3.6 Static hosting + edge functions — **Cloudflare Pages + Workers (+ Workers KV + Cron Triggers)**

- **Decision:** Deploy static output to **Cloudflare Pages**; implement `/api/scores` and
  `/api/news` as **Pages Functions / Workers**; use **Workers KV** as the shared cache;
  aggregation runs on **Cron Triggers** (scheduled Workers).
- **Alternatives considered:**
  - *GitHub Pages:* free static hosting but **no edge functions/cron** — would force provider
    calls back into the browser (CORS + rate-limit + flakiness). Rejected for the data layer,
    though usable as a pure-static fallback host.
  - *Vercel / Netlify:* both offer edge functions + scheduled functions and are viable
    equivalents. Cloudflare chosen for a generous free tier, global edge, integrated KV, and
    cron — ideal for a low-cost, bursty, single-tournament workload.
- **Rationale:** matches "lightweight" (no VMs, no DB servers, no ops), scales to tournament
  peaks via edge caching, and keeps recurring cost near zero.

### 3.7 Persistence — **Edge KV cache only; no database, no user store**

- **Decision:** the only server-side storage is a small KV cache of the latest normalized
  scores and news JSON. **No relational/NoSQL database. No user data store.**
- **Rationale:** there are no accounts and no per-user state to persist server-side; user state
  is entirely client-side (`localStorage`). This is the biggest infra simplification.

### 3.8 Client state — **`localStorage` + in-memory**

- **Decision:** timezone, favorites, "last seen" news, and cached snapshots persist in
  `localStorage`; transient UI state in memory. No cookies for tracking.

### 3.9 Timezone handling — **native `Intl` / Temporal-style tz, IANA zones**

- **Decision:** use the browser's `Intl.DateTimeFormat` with IANA timezone IDs for all
  formatting; store all fixture times as **UTC ISO-8601** (as the POC does) and convert on the
  client. Auto-detect via `Intl.DateTimeFormat().resolvedOptions().timeZone`; allow override.
- **Rationale:** replaces the POC's hardcoded `+3h` arithmetic with correct, DST-aware
  conversion for any user, with **zero extra dependencies** (a small tz label/list is the only
  addition; a library like `@date-fns/tz` or Luxon may be used if richer formatting is needed).

### 3.10 News aggregation — **scheduled RSS/Atom fetch + normalize, server-side**

- **Decision:** a scheduled Worker fetches **RSS/Atom feeds** from a curated allow-list of
  authentic outlets, parses and normalizes them to `NewsItem`, de-duplicates by URL/title
  similarity, sorts newest-first, trims to a bounded count, and writes to KV. `/api/news`
  serves it.
- **Candidate sources (to finalize w/ attribution/licensing review):** official FIFA news feed,
  BBC Sport (football), ESPN (soccer), The Guardian (football), Reuters/AP sports. Only
  **headline + source + timestamp + summary + link** are stored/shown; full articles are never
  republished.
- **Alternatives:** a paid aggregator API (e.g., NewsAPI) — adds keys, cost, and quota; direct
  RSS keeps us dependency-light and free. Optional `P1`: enrich with Open Graph image/summary.
- **Attribution rule:** every item links out to the origin and names its source, satisfying the
  Product Spec's authenticity/attribution requirement and respecting publisher terms.

### 3.11 Live-score aggregation — **scheduled multi-source merge, server-side**

- **Decision:** port the POC's multi-source strategy (worldcup26.ir → openfootball → ESPN) into
  a scheduled Worker that queries all sources, **merges** results (max coverage), reconciles by
  **stable match identity**, and writes a single normalized scores snapshot to KV. Replace the
  POC's fragile name-prefix matching with a **fixture-ID mapping table** per source.
- **Rationale:** server-side merge removes browser CORS proxies, centralizes rate-limiting, and
  gives every client a consistent, fast, cached snapshot.

### 3.12 PWA / offline — **service worker + web app manifest**

- **Decision:** precache the app shell + fixtures; runtime-cache `/api/scores` and `/api/news`
  with a stale-while-revalidate strategy so the schedule and last-known scores/news work
  offline. Web App Manifest for installability. (Workbox optional; a hand-rolled SW is fine
  given the small surface.)

### 3.13 Notifications (optional, `P2`) — **Web Push, no accounts**

- **Decision:** if implemented, use the **Web Push API** with a `PushSubscription` stored
  client-side and delivered via a stateless push endpoint keyed by subscription only — **no user
  account or profile store**. Kept out of the critical path; app is fully functional without it.

### 3.14 Testing — **Vitest (unit) + Playwright (e2e), Lighthouse CI (perf/a11y)**

- **Decision:** Vitest for pure logic (timezone conversion, status state machine, standings
  computation, news de-dup); Playwright for key flows (schedule renders, tab switching, drawer,
  timezone change); Lighthouse CI to enforce the performance/accessibility budget in CI.

### 3.15 CI/CD — **GitHub Actions → Cloudflare Pages**

- **Decision:** GitHub Actions runs typecheck + unit + e2e + Lighthouse on PRs; Cloudflare Pages
  builds and deploys on merge to `main`, with preview deployments per PR.

---

## 4. Component interactions (data flows)

### 4.1 Live scores
1. **Cron Worker** (e.g., every 60–90s during match windows, throttled otherwise) fetches all
   score sources in parallel (`Promise.allSettled`), applies each source's adapter, merges into
   the canonical `Match[]` snapshot, and writes `scores.json` to KV with a version/timestamp.
2. **Client** requests `/api/scores`; the edge function returns the KV snapshot with `ETag` +
   `Cache-Control`. Client polls on an interval and on manual refresh, using conditional
   requests (`If-None-Match`) to stay cheap.
3. **Client** recomputes match **status** (`upcoming`/`live`/`finished`) locally from kickoff +
   buffer (ported from POC `status()`), so live/finished styling is correct even between polls.
4. **Standings, scorers, bracket** are derived on the client from the same snapshot (+ seeded
   fixture data) — no separate endpoints needed.

### 4.2 News
1. **Cron Worker** (e.g., every 10–15 min) fetches the RSS allow-list, normalizes to
   `NewsItem[]`, de-duplicates, sorts, trims, writes `news.json` to KV.
2. **Client** requests `/api/news`, renders the attributed feed, and caches it via the service
   worker for offline/last-known display.

### 4.3 Timezone
1. On first load, client auto-detects IANA tz; user can override via selector.
2. All UTC fixture/news timestamps are formatted through `Intl` in the selected tz; selection
   persists in `localStorage` and re-renders affected views.

---

## 5. Canonical data model (shared TypeScript types)

```ts
type Stage = 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'final';
type MatchStatus = 'upcoming' | 'live' | 'finished';

interface Team { id: string; name: string; flag: string; group?: string; }

interface Match {
  id: number;               // stable fixture id
  utc: string;              // ISO-8601 kickoff (UTC) — source of truth for time
  stage: Stage;
  group?: string;           // 'A'..'L' for group stage
  home: Team; away: Team;
  venue: string;
  score?: { home: number; away: number } | null;
  status?: MatchStatus;     // derived client-side; may be cached
  sources?: string[];       // which providers contributed the score
}

interface MatchStats {      // optional, when available
  matchId: number;
  home: TeamMatchStats; away: TeamMatchStats;
  goals: { home: GoalEvent[]; away: GoalEvent[] };
}
interface TeamMatchStats { shots:number; onTarget:number; possession:number;
  corners:number; fouls:number; yellow:number; red:number; offsides:number; }
interface GoalEvent { minute: string; scorer: string; note?: string; }

interface Standing { group: string; teams: StandingRow[]; }
interface StandingRow { team: Team; p:number; w:number; d:number; l:number;
  gf:number; ga:number; gd:number; pts:number; qualification?: 'auto'|'best3rd'|null; }

interface Scorer { name:string; team:Team; goals:number; assists:number; }

interface NewsItem {
  id: string;               // hash of canonical url
  title: string;
  source: string;           // e.g., 'BBC Sport'
  url: string;              // outbound link to origin
  publishedUtc: string;     // ISO-8601
  summary?: string;
  imageUrl?: string;
  topics?: ('players'|'coaches'|'clubs'|'teams')[];
}

// Snapshots written to KV / served by edge functions:
interface ScoresSnapshot { version:number; updatedUtc:string; matches: Match[]; stats?: MatchStats[]; }
interface NewsSnapshot   { version:number; updatedUtc:string; items: NewsItem[]; }
```

Client-only (never sent to any server):
```ts
interface UserPrefs { timezone: string; favorites: string[]; lastSeenNewsUtc?: string; }
// persisted in localStorage
```

---

## 6. API surface (read-only edge functions)

| Endpoint | Method | Returns | Caching |
|---|---|---|---|
| `/api/scores` | GET | `ScoresSnapshot` | `ETag`, `Cache-Control: public, max-age=30, stale-while-revalidate=120` |
| `/api/news` | GET | `NewsSnapshot` | `ETag`, `Cache-Control: public, max-age=300, stale-while-revalidate=900` |
| `/fixtures.json` | GET (static) | seed `Match[]` | long-lived, immutable per deploy |

- No write endpoints, no auth, no cookies. All mutation happens in scheduled workers.
- Clients use conditional GET (`If-None-Match`) to minimize transfer.

---

## 7. Repository structure (proposed)

```
worldcup-site/
├─ docs/
│  ├─ PRODUCT_SPEC.md
│  └─ TECHNICAL_SPEC.md
├─ worldcup2026-eat.html         # original POC (kept for reference)
├─ src/                          # Astro app (added at implementation time)
│  ├─ pages/                     # schedule (index), tables, scorers, bracket, news
│  ├─ components/                # islands + static components
│  ├─ lib/                       # tz, status state machine, standings, dedup (shared TS)
│  ├─ data/fixtures.ts|json      # canonical seed fixtures
│  └─ styles/tokens.css          # design tokens from POC
├─ functions/ (or workers/)      # /api/scores, /api/news, scheduled aggregators
│  ├─ scores.ts                  # edge function
│  ├─ news.ts                    # edge function
│  └─ cron/                      # scheduled aggregators + source adapters
├─ tests/                        # vitest + playwright
├─ public/                       # manifest, icons, service worker
├─ .github/workflows/ci.yml
└─ README.md
```

---

## 8. Non-functional requirements

- **Performance budget (target):** initial JS < ~80KB gzipped for the default Schedule view;
  LCP < 2.5s and TTI < 3.5s on a mid-range mobile over 4G; zero layout shift on tab switches.
  Enforced by Lighthouse CI.
- **Availability:** static app + KV-cached endpoints served from edge; schedule/tables/bracket
  remain viewable even if all upstream providers fail (last-known snapshot + client-derived
  status).
- **Security:** HTTPS only; strict Content-Security-Policy; no secrets in the client; provider
  API keys (if any) live only in Worker environment variables.
- **Privacy:** no accounts, no PII, no third-party tracking; analytics (if any) are
  cookieless/aggregate. Complies with the Product Spec's no-accounts principle.
- **Accessibility:** WCAG AA color contrast; keyboard operable; ARIA live region for score
  updates; focus management for the match detail overlay.
- **Cost:** designed to run within free tiers for a single tournament's traffic.

---

## 9. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Free score sources are flaky or rate-limited | Server-side multi-source merge + KV cache + last-known fallback; throttle cron outside match windows. |
| News source terms/licensing | Use RSS headlines + links + attribution only; maintain an allow-list; legal review before launch. |
| Fragile name-based match matching (POC) | Replace with per-source fixture-ID mapping tables. |
| Provider CORS restrictions | All provider calls happen server-side in Workers, never in the browser. |
| Scope creep beyond single tournament | Enforce non-goals; plan M4 wind-down to static archive. |

---

## 10. Open questions (engineering)

1. Confirm **Cloudflare** vs Vercel/Netlify as host (all viable; affects function/cron syntax).
2. Confirm **Astro + Preact** vs **SvelteKit static** as the framework.
3. Finalize the **news source allow-list** and refresh cadence (with Product/legal).
4. Determine reliable **live-stats** availability from free sources (drives US-6 depth).
5. Decide whether **Web Push notifications** (P2) are in v1 scope.

---

## 11. Summary of decisions

| Area | Decision |
|---|---|
| Framework | Astro + Preact/Svelte islands (fallback: SvelteKit static) |
| Language | TypeScript |
| Styling | POC CSS design tokens + scoped CSS (Tailwind optional) |
| Hosting | Cloudflare Pages (static) |
| Data layer | Cloudflare Workers + KV + Cron Triggers (read-only `/api/*`) |
| Persistence | Edge KV cache only; **no database**, **no user store** |
| Client state | `localStorage` (timezone, favorites) |
| Timezone | UTC storage + `Intl` IANA conversion, DST-correct |
| News | Scheduled RSS aggregation, normalized + attributed |
| PWA | Service worker + manifest, offline last-known view |
| Testing | Vitest + Playwright + Lighthouse CI |
| CI/CD | GitHub Actions → Cloudflare Pages |
| Accounts | **None** |
