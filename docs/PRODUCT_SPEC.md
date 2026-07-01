# Product Spec — World Cup 2026 Companion

**Status:** Living document (v0.2 — pre-implementation)
**Owner:** @timkaboya
**Related:** [`TECHNICAL_SPEC.md`](./TECHNICAL_SPEC.md) · Reference POC: [`../worldcup2026-eat.html`](../worldcup2026-eat.html)

---

## 1. Summary

A fast, lightweight web app for following the **FIFA World Cup 2026** in real time. Users
can see live scores, match stats, group standings, top scorers, the knockout bracket, and
curated World Cup news — all localized to **their own timezone**, on both mobile and web,
with **no sign-up required**.

The product exists **only for the duration of the 2026 tournament**. It is intentionally
small in scope and infrastructure: a static, installable web app backed by a thin read-only
data layer. When the tournament ends, it winds down to a static archive of final results.

---

## 2. Product principles

1. **Lightweight first.** Prefer static hosting, edge caching, and client-side logic over
   servers and databases. Every added dependency or service must earn its place.
2. **No accounts, ever.** No login, no passwords, no personal data collection. All personal
   state (timezone, favorites) lives in the browser (`localStorage`).
3. **Your time, your schedule.** Kick-off times are always shown in the user's selected
   timezone. This is the app's signature feature.
4. **Mobile and web equal citizens.** Responsive, touch-first, and installable (PWA), while
   remaining fully usable on desktop.
5. **Authentic, attributed content.** Scores and news come from reputable, named sources,
   always with attribution and links back to the origin.
6. **Ephemeral by design.** Built for one tournament; no long-term platform commitments.

---

## 3. Goals & non-goals

### Goals
- Let anyone check "what's on, when, in my time" in under 3 seconds.
- Provide live scores and rich match detail without a page reload.
- Surface standings, top scorers, and the bracket in a glanceable format.
- Aggregate trustworthy World Cup news (players, coaches, clubs) in one place.
- Load fast on a mid-range phone on a slow connection.

### Non-goals (v1)
- User accounts, social features, comments, or predictions/fantasy games.
- Historical tournaments or non-World-Cup competitions.
- Video streaming or highlights hosting (we link out, we don't host).
- Server-side storage of any user data.
- Editorial/original journalism (we aggregate and attribute, we don't author news).

---

## 4. Personas

| Persona | Description | Primary need |
|---|---|---|
| **Casual viewer** | Follows the tournament loosely, wants to know what's on tonight. | Simple, timezone-correct schedule + live scores. |
| **Superfan** | Watches everything, cares about stats and standings. | Deep match stats, tables, scorers, bracket, favorites. |
| **Diaspora / expat** | Living far from home, odd local kick-off times. | Correct local times, favorite-team tracking, news from home. |
| **News follower** | Cares about players/coaches/clubs storylines. | Curated, credible, up-to-date news feed. |

---

## 5. User stories & requirements

Format: **US-#** user story → **acceptance criteria** (testable). Priority: `P0` must-have
for launch, `P1` fast-follow, `P2` nice-to-have.

### 5.1 Schedule & live scores (`P0`)

- **US-1** — *As a user, I can see all matches grouped by day so I can plan what to watch.*
  - AC: Matches are grouped by calendar day **in the user's selected timezone**; each day
    shows date and match count.
  - AC: Each match card shows kick-off time (in local tz), both teams + flags, group/stage,
    and venue.
  - AC: Matches are visually marked as **upcoming**, **live**, or **finished**.

- **US-2** — *As a user, I can see live scores update automatically during matches.*
  - AC: A match that has kicked off and is within the live window shows a **LIVE** indicator
    and current score.
  - AC: Scores refresh automatically at a bounded interval (see Technical Spec) and via a
    manual **Refresh** control, without a full page reload.
  - AC: The refresh control shows last-updated time and source(s); on total source failure it
    shows the last known scores with a clear "showing last confirmed results" state.

- **US-3** — *As a user, I can see what's coming up next at a glance.*
  - AC: An "Up next" rail lists the next N upcoming (or currently live) matches, tappable to
    open detail.

- **US-4** — *As a user, I can filter the schedule by stage.*
  - AC: Filter chips for All / Groups / R32 / R16 / QF / SF / Final; selecting one narrows the
    list; state is preserved while navigating within the session.

- **US-5** — *As a user, I can visually distinguish kick-off times by part of day.*
  - AC: Match cards are color-coded by local time-of-day bucket (morning/afternoon/evening/
    night), with a visible legend.

### 5.2 Match stats (`P0` for finished/live; stat depth `P1`)

- **US-6** — *As a user, I can tap a match to see detailed stats.*
  - AC: Tapping a card opens a detail view (bottom sheet on mobile, panel/modal on web) with:
    final/live score, goal timeline (scorer + minute), and team stat comparison (shots,
    shots on target, possession, corners, fouls, yellow/red cards, offsides).
  - AC: For upcoming matches, the detail view shows kick-off info, venue, and group context
    instead of stats.
  - AC: The detail view is dismissible via swipe-down (mobile), close button, overlay tap, and
    Esc (web).

### 5.3 Standings / tables (`P0`)

- **US-7** — *As a user, I can view group standings.*
  - AC: All 12 groups shown with each team's P/W/D/L/GF/GA/GD/Pts.
  - AC: Qualification is indicated visually (top-2 auto-qualify; best-3rd-place highlighted).
  - AC: Standings reflect results from the live data layer.

### 5.4 Top scorers (`P0`)

- **US-8** — *As a user, I can view the Golden Boot race.*
  - AC: Ranked list of scorers with player, team + flag, goals, and assists.
  - AC: Ranking is by goals, ties broken by assists; top rank(s) visually emphasized.

### 5.5 Bracket (`P0`)

- **US-9** — *As a user, I can view the knockout bracket.*
  - AC: Shows R32 → R16 → QF → SF → Final progression with a trophy/final node.
  - AC: Undetermined fixtures show clear TBD placeholders; determined fixtures show teams and
    (when played) scores and the advancing side.
  - AC: Horizontally scrollable on small screens without breaking layout.

### 5.6 World Cup news (`P0`)

- **US-10** — *As a user, I can read the latest World Cup news about players, coaches, and clubs.*
  - AC: A **News** section lists recent articles aggregated from **authentic, named sources**
    (e.g., official FIFA, and reputable outlets such as BBC Sport, ESPN, The Guardian, Reuters/AP —
    final source list in Technical Spec).
  - AC: Each item shows headline, source name, published time (in user's tz), and an optional
    thumbnail/summary, and links out to the original article in a new tab.
  - AC: Items are sorted newest-first and de-duplicated across sources.
  - AC: Content is clearly attributed to its source; the app does not present aggregated news as
    its own reporting.
  - AC: `P1` — optional topic filters (Players / Coaches / Clubs / Teams).
  - AC: On feed failure, the section degrades gracefully (shows last cached items or an empty
    state), never a broken page.

### 5.7 Timezone & localization (`P0`)

- **US-11** — *As a user, the app shows times in my timezone automatically, and I can change it.*
  - AC: On first load, the app detects the device timezone and uses it for all times.
  - AC: A timezone selector lets the user pick any IANA timezone; the choice persists across
    visits (`localStorage`).
  - AC: All schedule, live, news, and detail timestamps reflect the selected timezone, including
    correct DST handling.

### 5.8 Favorites & personalization (`P1`, no accounts)

- **US-12** — *As a user, I can favorite teams to find their matches quickly.*
  - AC: I can mark/unmark teams as favorites; favorites persist in `localStorage`.
  - AC: A favorites filter/section surfaces upcoming and recent matches for favorited teams.

- **US-13** *(P2)* — *As a user, I can opt in to match reminders / goal alerts.*
  - AC: Optional browser notifications (Web Push / local notifications) with explicit opt-in;
    fully functional app without them; no server-side account required.

### 5.9 Cross-cutting UX (`P0`)

- **US-14** — *As a user, the app works well on my phone and my laptop.*
  - AC: Responsive from ~320px to desktop widths; primary actions reachable with one thumb on
    mobile.
  - AC: Meets accessibility basics: sufficient color contrast, keyboard navigability on web,
    focus states, screen-reader labels for interactive controls and live regions for score
    updates.
  - AC: Installable as a PWA and provides a usable offline/last-known view of the schedule.
  - AC: First meaningful content renders quickly on a mid-range mobile device (perf budget in
    Technical Spec).

---

## 6. Information architecture

Primary navigation (persistent tab bar / top nav):

1. **Schedule** (default) — day-grouped list, live scores, up-next rail, stage filters, legend.
2. **Tables** — group standings.
3. **Scorers** — Golden Boot race.
4. **Bracket** — knockout tree.
5. **News** — aggregated, attributed feed.

Global elements: brand/header, **timezone selector**, **live** indicator, refresh/last-updated
status. Match **detail** is an overlay reachable from Schedule, Bracket, and Favorites.

---

## 7. Content & data sources

- **Fixtures / schedule:** canonical fixture dataset for WC2026 (seeded, then reconciled with
  live sources). Baseline exists in the POC.
- **Live scores & stats:** aggregated from multiple public sources for resilience (see POC:
  worldcup26.ir, openfootball, ESPN). Reconciliation and source selection defined in the
  Technical Spec.
- **News:** RSS/API feeds from official and reputable outlets, normalized and attributed.
  The authoritative source list, refresh cadence, and licensing/attribution rules live in the
  Technical Spec. Only headlines/summaries + links are shown — no republishing of full articles.

All external content is displayed **with attribution and outbound links**; the app hosts no
copyrighted media.

---

## 8. Success metrics

- **Speed:** p75 first-contentful-paint under target on mid-range mobile (see perf budget).
- **Freshness:** live scores reflect real results within the polling interval during matches.
- **Engagement (privacy-light, aggregate only):** returning-visit rate during the tournament;
  share of sessions that open a match detail or read a news item.
- **Reliability:** schedule/tables/bracket remain viewable even when all live sources fail.

> Analytics are privacy-preserving and aggregate; no personal identifiers, consistent with the
> no-accounts principle.

---

## 9. Milestones (phased, dependency-ordered — no dates)

- **M0 — Harden the POC:** extract data model, fix known gaps, define canonical schema.
- **M1 — Core app + timezone:** Schedule, live scores, tables, scorers, bracket with
  **user-selectable timezone** and a thin read-only score data layer.
- **M2 — News + polish:** News aggregation section, favorites, PWA/offline, accessibility pass.
- **M3 — Scale & optional alerts:** tournament-peak caching hardening; optional opt-in
  notifications.
- **M4 — Wind-down:** freeze to a static archive of final results after the final.

---

## 10. Open questions

1. Final authoritative **news source list** and any licensing constraints (owned by Technical
   Spec / legal check).
2. Depth of **live stats** available reliably from free sources (may limit US-6 stat richness).
3. Whether **opt-in notifications** (US-13) make v1 or stay a fast-follow.
4. Exact **polling cadence** balancing freshness vs. source rate limits (Technical Spec).

---

## 11. Appendix — POC baseline

The reference POC (`worldcup2026-eat.html`) already implements, hardcoded to East Africa Time:
day-grouped schedule, stage filters, time-of-day color coding, up-next rail, live pill,
tap-to-open match stat drawer (goals + stat bars), 12 group tables with qualification
indicators, Golden Boot list, knockout bracket, and multi-source live polling with graceful
fallback. This spec generalizes that POC to **any timezone**, adds a **News** section, and
formalizes it as a lightweight, installable, no-accounts product.
