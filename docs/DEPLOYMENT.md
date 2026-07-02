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

### Automated deploys via GitHub Actions (fallback)

Cloudflare's Git integration occasionally stops picking up new commits. The
`.github/workflows/deploy-cloudflare.yml` workflow is a reliable fallback: on every
push to `main` it builds the site and runs `wrangler pages deploy dist
--project-name=worldcup-site --branch=main`, updating the **same** Live Pages project.

It is a safe no-op until you enable it — the deploy step only runs when the
`CLOUDFLARE_API_TOKEN` secret is present. To turn it on, add two **repository secrets**
(Settings → Secrets and variables → Actions):

| Secret | How to get it |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Cloudflare dashboard → My Profile → API Tokens → Create Token → **Cloudflare Pages: Edit** template. |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → Workers & Pages → right sidebar **Account ID**. |

The public Paystack build vars are read from repository **Variables**
(`PUBLIC_PAYSTACK_KEY`, `PUBLIC_PAYSTACK_CURRENCY`); the Paystack secret key stays in the
Cloudflare project environment (runtime only). After adding the secrets, re-run the workflow
(Actions → Deploy to Cloudflare Pages → Run workflow) or push any commit.

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
