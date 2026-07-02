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
  assignGroups,
  flagEmoji,
  mapScoreboard,
  parseStandings,
  teamId,
} from '../src/lib/espn.ts';
import type { Match, Scorer, Team } from '../src/lib/types.ts';

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

// Aggregate real top scorers AND assist providers from finished-match key events.
async function fetchLeaders(matches: Match[]): Promise<{ scorers: Scorer[]; assists: Scorer[] }> {
  const finished = matches.filter((m) => m.status === 'finished');
  const tally = new Map<string, Scorer>();
  const teamByName = (name: string, flag: string): Team => ({ id: teamId(name), name, flag });

  // Limited concurrency to be a good API citizen.
  const queue = [...finished];
  const worker = async () => {
    while (queue.length) {
      const m = queue.shift()!;
      let sum: any;
      try {
        sum = await getJson(`${ESPN_BASE}/summary?event=${m.id}`);
      } catch {
        continue;
      }
      const events: any[] = sum?.keyEvents ?? [];
      for (const ev of events) {
        const typeText: string = ev?.type?.text || '';
        if (!/goal/i.test(typeText)) continue;
        if (/own goal/i.test(typeText)) continue;
        const isPen = /penalty/i.test(typeText);
        // Skip shootout goals (they don't count as tournament goals).
        if (ev?.shootout === true) continue;
        const teamName: string = ev?.team?.displayName || '';
        const athlete = ev?.participants?.[0]?.athlete;
        const scorer: string =
          athlete?.displayName || (ev?.shortText || '').replace(/\s+Goal.*$/i, '').trim();
        if (!scorer) continue;
        const flag =
          (m.home.name === teamName && m.home.flag) ||
          (m.away.name === teamName && m.away.flag) ||
          '⚽';
        const key = `${scorer}::${teamName}`;
        const row = tally.get(key) ?? {
          name: scorer,
          team: teamByName(teamName, flag as string),
          goals: 0,
          assists: 0,
        };
        row.goals += 1;
        // First assist provider, if present.
        const assist = ev?.participants?.[1]?.athlete?.displayName;
        if (assist) {
          const akey = `${assist}::${teamName}`;
          const arow = tally.get(akey) ?? {
            name: assist,
            team: teamByName(teamName, flag as string),
            goals: 0,
            assists: 0,
          };
          arow.assists += 1;
          tally.set(akey, arow);
        }
        tally.set(key, row);
      }
    }
  };
  await Promise.all(Array.from({ length: 5 }, worker));

  const all = Array.from(tally.values());
  const scorers = all
    .filter((s) => s.goals > 0)
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists || a.name.localeCompare(b.name))
    .slice(0, 30);
  const assists = all
    .filter((s) => s.assists > 0)
    .sort((a, b) => b.assists - a.assists || b.goals - a.goals || a.name.localeCompare(b.name))
    .slice(0, 30);
  return { scorers, assists };
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

  const { scorers, assists } = await fetchLeaders(matches).catch((e) => {
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
