# World Cup 2026 Companion ⚽

A fast, lightweight web app for following the **FIFA World Cup 2026** in real time — live
scores, match stats, group tables, top scorers, a circular knockout bracket, and curated news —
localized to **your timezone**, on mobile and web, with **no sign-up**.

Static-first, installable (PWA), and backed only by a thin read-only edge data layer.
No accounts, no user data, no tracking.

## 🔗 Live sites

| Environment | URL | Hosting |
| --- | --- | --- |
| **Live (production)** | https://worldcup-site.timothy-kaboya.workers.dev/ | Cloudflare (edge functions for live scores) |
| **Staging** | https://timkaboya.github.io/worldcup-site/ | GitHub Pages (static fallback data) |

Both build from `main`. The Cloudflare **Live** site runs the `/api/*` edge functions that
aggregate live scores server-side; the GitHub Pages **Staging** site is a pure static build that
falls back to the prerendered JSON snapshots, so it's ideal for previewing UI changes.

## ✨ Features

- **Schedule** — every match in your timezone, grouped by day, with an "up next" drawer and live polling.
- **Live scores & match detail** — expandable match view with facts, line-ups, and stats.
- **Group tables** — standings with qualification highlighting.
- **Top scorers** — the Golden Boot race.
- **Bracket** — a circular knockout tree that fills in as matches finish; tap any flag for details.
- **News** — curated, attributed World Cup stories from reputable outlets, newest first.
- **PWA** — installable, offline-tolerant, with a service worker.

## 🧱 Tech stack

- **[Astro](https://astro.build/)** (static output) with **[Preact](https://preactjs.com/)** islands for interactivity.
- **TypeScript** throughout.
- **Cloudflare Pages Functions** (`/functions/**`) for the read-only live-score edge APIs.
- Build-time data fetch from the public **ESPN** FIFA World Cup feeds + RSS news (no API keys).
- **Vitest** (unit) and **Playwright** (e2e) for tests; a bundle-size budget check for perf.

## 🚀 Quick start

```bash
npm install
npm run dev        # http://localhost:4321  (uses static fallback data; no edge fn locally)
npm run build      # outputs dist/
npm run preview    # serve the production build
```

Common scripts:

| Script | What it does |
| --- | --- |
| `npm run typecheck` | Type-check with `tsc --noEmit` |
| `npm test` | Unit tests (Vitest) |
| `npm run e2e` | End-to-end tests (Playwright) |
| `npm run perf` | Enforce the client-JS bundle-size budget (90 KB gzip) |
| `npm run data` / `npm run data:news` | Refresh the static score/news snapshots |

## 📚 Docs

- [Product Spec](./docs/PRODUCT_SPEC.md) — what the product does, user stories, requirements.
- [Technical Spec](./docs/TECHNICAL_SPEC.md) — architecture and how the pieces interact.
- [Deployment](./docs/DEPLOYMENT.md) — hosting on Cloudflare and static fallbacks.
- [Contributing](./CONTRIBUTING.md) — how to propose changes, and the CI guard rails.

## 🤝 Contributing

Contributions are welcome! Please read **[CONTRIBUTING.md](./CONTRIBUTING.md)** first — it covers
the branch/PR workflow and the checks every change must pass (typecheck, tests, build, e2e, and the
bundle-size budget). All pull requests run these automatically via GitHub Actions.

## ☕ Support

A footer **"Support this project"** button lets fans chip in via [Paystack](https://paystack.com/)
(cards, bank & mobile money). It's optional and fully self-hosted — no third-party JS loads until a
visitor actually opens the donation modal.

Configure it with environment variables (see [`.env.example`](./.env.example)):

| Variable | Where | Notes |
| --- | --- | --- |
| `PUBLIC_PAYSTACK_KEY` | build-time (public) | `pk_test_…` / `pk_live_…`. If unset, the button is hidden. |
| `PUBLIC_PAYSTACK_CURRENCY` | build-time (public) | e.g. `NGN`, `KES`, `GHS`, `ZAR`, `USD`. |
| `PAYSTACK_SECRET_KEY` | Cloudflare env **secret** | Powers `/api/verify-payment`; **never committed**. Set with `npx wrangler pages secret put PAYSTACK_SECRET_KEY`. |

On Cloudflare, payments are verified server-side before showing a confirmation. On GitHub Pages
(no edge functions) the app falls back to Paystack's own inline success callback.

## 🧭 Principles

Lightweight first · No accounts · Your timezone · Mobile + web · Authentic, attributed content.

## 📄 License

Released under the [MIT License](./LICENSE).

> Score, fixture, and news data are sourced from public third-party feeds and belong to their
> respective owners. This project is an unofficial fan companion and is not affiliated with FIFA.
