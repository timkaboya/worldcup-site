// Cloudflare Pages Function: GET /api/scores
// ESPN is the source of truth. We fetch the full tournament scoreboard (in
// parallel date chunks) plus the official standings, map everything onto the
// canonical model, tag group-stage matches with their group, and return a
// ScoresSnapshot. Edge-cached briefly so live matches update without hammering.

import { ESPN_BASE, ESPN_STANDINGS, assignGroups, mapScoreboard, parseStandings } from '../../src/lib/espn';
import type { Match } from '../../src/lib/types';

async function fetchJson(url: string, timeoutMs = 6000): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { 'user-agent': 'worldcup-site/1.0' } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

// Six-day chunks covering the whole tournament (Jun 11 – Jul 19, 2026).
const RANGES = [
  '20260611-20260616',
  '20260617-20260622',
  '20260623-20260628',
  '20260629-20260704',
  '20260705-20260710',
  '20260711-20260716',
  '20260717-20260719',
];

export const onRequestGet: PagesFunction = async () => {
  const [scoreboards, standingsJson] = await Promise.all([
    Promise.all(
      RANGES.map((r) => fetchJson(`${ESPN_BASE}/scoreboard?dates=${r}`).catch(() => ({ events: [] })))
    ),
    fetchJson(ESPN_STANDINGS).catch(() => ({})),
  ]);

  const byId = new Map<number, Match>();
  for (const sb of scoreboards) {
    for (const m of mapScoreboard(sb)) byId.set(m.id, m);
  }
  const matches = Array.from(byId.values()).sort((a, b) => a.utc.localeCompare(b.utc));

  const { groupOf } = parseStandings(standingsJson);
  assignGroups(matches, groupOf);

  const snap = {
    version: 1,
    updatedUtc: new Date().toISOString(),
    matches,
  };

  return new Response(JSON.stringify(snap), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // Edge-cache for 30s, serve stale up to 2min while revalidating.
      'cache-control': 'public, max-age=30, s-maxage=30, stale-while-revalidate=120',
    },
  });
};
