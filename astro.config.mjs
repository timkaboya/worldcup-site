import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

import cloudflare from "@astrojs/cloudflare";

// Static-first output. Interactive parts are Preact islands.
// Edge APIs (/api/scores, /api/news) are Cloudflare Pages Functions in /functions.
export default defineConfig({
  integrations: [preact({ compat: true })],
  output: "hybrid",
  site: 'https://worldcup-site.pages.dev',
  adapter: cloudflare()
});