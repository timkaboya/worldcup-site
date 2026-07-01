// Build-time news generator: pulls the reputable RSS allow-list, keeps only
// World-Cup-relevant stories, de-dups, sorts newest-first, and writes a static
// snapshot the app serves everywhere (even hosts without the /api/news edge fn).
//
// Output: src/data/news.json  (served by src/pages/news.json.ts)
// Run via `npm run data:news` (wired into prebuild via scripts/prebuild.mjs).

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NEWS_SOURCES } from '../src/data/news-sources.ts';
import { parseFeed, mergeNews, isWorldCupRelevant } from '../src/lib/news.ts';
import type { NewsItem } from '../src/lib/types.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const OUT = resolve(root, 'src/data/news.json');

async function fetchText(url: string, timeoutMs = 8000): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'user-agent': 'worldcup-site/1.0 (+https://github.com/timkaboya/worldcup-site)' },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.text();
  } finally {
    clearTimeout(t);
  }
}

async function main() {
  console.log('Fetching World Cup news…');
  const jobs = NEWS_SOURCES.map(async (s) => {
    try {
      const items = parseFeed(await fetchText(s.url), s.name);
      const kept = s.worldCup ? items : items.filter(isWorldCupRelevant);
      console.log(`  ${s.name}: ${kept.length}/${items.length} relevant`);
      return kept;
    } catch (e) {
      console.warn(`  ${s.name}: failed — ${(e as Error).message}`);
      return [] as NewsItem[];
    }
  });

  const items = mergeNews(await Promise.all(jobs));

  // Never clobber a good snapshot with an empty one on a transient network failure.
  if (items.length === 0 && existsSync(OUT)) {
    console.warn('No items fetched; keeping existing src/data/news.json.');
    return;
  }

  const snap = { version: 1, updatedUtc: new Date().toISOString(), items };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(snap, null, 2) + '\n', 'utf8');
  console.log(`wrote src/data/news.json (${items.length} items)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
