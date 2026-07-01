# Wind-down & Static Archive

The World Cup 2026 Companion is a **single-tournament** app. After the final
(19 July 2026), it should wind down gracefully into a permanent, zero-cost
static archive of the final results.

## Goals

- Preserve the **final** state (results, standings, scorers, bracket) forever.
- Stop all outbound polling to third-party providers (scores/news feeds).
- Keep hosting cost at zero (static files only; no edge functions running).

## Freeze procedure

1. **Snapshot the final data.** After the final whistle, capture the last live
   snapshot and bake it in as the new static baseline:
   - Fetch `/api/scores` once and commit the JSON as the seed for
     `src/pages/fixtures.json.ts` (replace the fixtures-only baseline with the
     final scores), and update `SEED_SCORES` in `src/data/fixtures.ts`.
   - Fetch `/api/news` once and, if you want a frozen "as it happened" feed,
     commit the items into `src/pages/news.json.ts` (otherwise leave News empty).
2. **Disable live fetching.** Set a build flag (e.g. `PUBLIC_ARCHIVE_MODE=1`) so
   the client skips `/api/*` and reads only the static snapshots. The API
   fallback path already renders the app from `/fixtures.json` and `/news.json`,
   so archive mode = "always use the fallback".
3. **Remove edge functions.** Delete/skip deploying `functions/api/*` so no
   provider calls are made. The site becomes 100% static.
4. **Add an archive banner.** Show a small "Final result — tournament complete"
   note in the header so visitors know the data is frozen.
5. **Freeze the service worker.** Bump the `VERSION` in `public/sw.js` so clients
   pick up the archived shell; precached snapshots make it fully offline-capable.

## Hosting the archive

- Any static host works (Cloudflare Pages, GitHub Pages, Netlify, S3). No
  Workers/KV/cron required once frozen.
- Because there are no functions, the perf and offline story only improves.

## Deferred enhancement: Web Push (Phase 5)

Server-backed **Web Push** (goal alerts / kickoff reminders) was intentionally
**not** shipped. It requires infrastructure that conflicts with the app's
no-accounts, no-server-state, lightweight design:

- **VAPID keys** and a push-sending backend.
- **Durable storage** of every browser's `PushSubscription` (KV/DO) — de facto
  per-device server state.
- A **cron/worker** to trigger pushes at kickoff / on goals.

Instead, the app ships a fully client-side reminder: **Add to calendar (.ics)**
from the match drawer (`src/lib/ics.ts`), which creates a calendar event with a
30-minute alarm using the user's own calendar — no server, no accounts, works
offline. If Web Push is desired later, add it as an optional, additive layer
behind an explicit opt-in; the app must remain fully functional without it.

## Production deploy note

First production deploy (`p1-deploy`) is gated on connecting the repo to a
Cloudflare account — see [DEPLOYMENT.md](./DEPLOYMENT.md). Everything else
(build, tests, e2e, perf budget) runs in CI without that access.
