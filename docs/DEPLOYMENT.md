# Deployment

The app is a static Astro site plus Cloudflare Pages Functions for the read-only edge APIs.

## Hosting: Cloudflare Pages (recommended)

1. Push this repo to GitHub (already done: `timkaboya/worldcup-site`).
2. In the Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
3. Select the `worldcup-site` repo. Build settings:
   - **Framework preset:** Astro
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Deploy. Cloudflare automatically serves `/functions/**` as Pages Functions, so
   `GET /api/scores` runs at the edge (aggregating live sources server-side, edge-cached ~30s).
5. Preview deployments are created automatically for each pull request.

No environment variables or KV bindings are required for the MVP: `/api/scores` aggregates the
public sources at request time and relies on Cloudflare's edge cache. If provider rate limits
become an issue at tournament scale, add a Workers KV binding + a scheduled Worker to refresh a
cached snapshot (see `TECHNICAL_SPEC.md` §3.6/§4.1).

## Fallback: any static host (GitHub Pages, Netlify, etc.)

The site works on any static host without functions: the client falls back to the prerendered
`/fixtures.json` (seeded results). Live in-tournament scores require the `/api/scores` function,
which needs a functions-capable host (Cloudflare Pages, Netlify, Vercel).

## Local development

```bash
npm install
npm run dev       # http://localhost:4321  (uses /fixtures.json fallback; no edge fn locally)
npm run build     # outputs dist/
npm run preview   # serve the production build
```
