// Build-time data generator: pulls the real FIFA World Cup 2026 tournament from
// ESPN's public API and writes static JSON consumed by the app (and as the edge
// function's offline fallback). Run via `npm run data` (wired into prebuild).
//
// Outputs:
//   public/fixtures.json    — ScoresSnapshot (all matches, real teams/scores/bracket)
//   public/standings.json   — Standing[] (official group tables)
//   public/scorers.json     — Scorer[] (aggregated golden-boot race)
//   public/assists.json     — Scorer[] (aggregated assist providers)
//   src/data/tournament.json — combined payload for SSG pages

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ESPN_BASE,
  ESPN_STANDINGS,
  ESPN_STATISTICS,
  assignGroups,
  buildLeaders,
  mapScoreboard,
  parseStandings,
} from '../src/lib/espn.ts';
import type { Match, Scorer } from '../src/lib/types.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

async function getJson(url: string, tries = 3): Promise<any> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { 'user-agent': 'worldcup-site/1.0' } });
      if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
      return await r.json();
    } catch (e) {
      lastErr = e;
      await new Promise((res) => setTimeout(res, 400 * (i + 1)));
    }
  }
  throw lastErr;
}

function dateRanges(startISO: string, endISO: string, chunkDays = 6): string[] {
  const out: string[] = [];
  const start = new Date(startISO);
  const end = new Date(endISO);
  let cur = new Date(start);
  while (cur <= end) {
    const from = new Date(cur);
    const to = new Date(cur);
    to.setUTCDate(to.getUTCDate() + chunkDays - 1);
    const fmt = (d: Date) =>
      `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
    out.push(`${fmt(from)}-${fmt(to)}`);
    cur.setUTCDate(cur.getUTCDate() + chunkDays);
  }
  return out;
}

async function fetchAllMatches(): Promise<Match[]> {
  const ranges = dateRanges('2026-06-11', '2026-07-19', 6);
  const payloads = await Promise.all(
    ranges.map((r) => getJson(`${ESPN_BASE}/scoreboard?dates=${r}`).catch(() => ({ events: [] })))
  );
  const byId = new Map<number, Match>();
  for (const p of payloads) {
    for (const m of mapScoreboard(p)) byId.set(m.id, m);
  }
  return Array.from(byId.values()).sort((a, b) => a.utc.localeCompare(b.utc));
}

// Fetch real top scorers AND assist providers from ESPN's aggregated
// `/statistics` endpoint (a single call — see buildLeaders in src/lib/espn.ts).
async function fetchLeaders(): Promise<{ scorers: Scorer[]; assists: Scorer[] }> {
  const stats = await getJson(ESPN_STATISTICS).catch(() => ({}));
  return buildLeaders(stats);
}

function write(rel: string, data: unknown) {
  const p = resolve(root, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`wrote ${rel}`);
}

async function main() {
  console.log('Fetching ESPN World Cup 2026 data…');
  const [matches, standingsJson] = await Promise.all([fetchAllMatches(), getJson(ESPN_STANDINGS).catch(() => ({}))]);
  if (!matches.length) throw new Error('No matches returned from ESPN — aborting to avoid clobbering data.');

  const { standings, groupOf } = parseStandings(standingsJson);
  assignGroups(matches, groupOf);

  const { scorers, assists } = await fetchLeaders().catch((e) => {
    console.warn('leader aggregation failed:', e);
    return { scorers: [] as Scorer[], assists: [] as Scorer[] };
  });

  const updatedUtc = new Date().toISOString();

  // Note: /fixtures.json is served by the prerendered route (src/pages/fixtures.json.ts)
  // from src/data/tournament.json, so we don't write public/fixtures.json here.
  write('public/standings.json', { version: 1, updatedUtc, standings });
  write('public/scorers.json', { version: 1, updatedUtc, scorers });
  write('public/assists.json', { version: 1, updatedUtc, assists });
  write('src/data/tournament.json', { version: 1, updatedUtc, matches, standings, scorers, assists });

  const played = matches.filter((m) => m.score).length;
  console.log(
    `Done: ${matches.length} matches (${played} played), ${standings.length} groups, ${scorers.length} scorers, ${assists.length} assist providers.`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
