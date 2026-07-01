import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

// Static-first output. Interactive parts are Preact islands.
// Edge APIs (/api/scores, /api/news) are Cloudflare Pages Functions in /functions.
//
// Deploy targets:
//   • Cloudflare Worker (default): served at the site root  → base '/'.
//   • GitHub Pages (project site): served under a subpath    → set BASE_PATH,
//     e.g. BASE_PATH=/worldcup-site/  SITE_URL=https://timkaboya.github.io
const base = process.env.BASE_PATH || '/';
const site = process.env.SITE_URL || 'https://worldcup-site.timothy-kaboya.workers.dev';

export default defineConfig({
  integrations: [preact({ compat: true })],
  output: 'static',
  site,
  base,
});
