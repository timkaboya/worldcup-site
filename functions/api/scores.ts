// Cloudflare Pages Function: GET /api/scores
// ESPN is the source of truth. We fetch the full tournament scoreboard (in
// parallel date chunks) plus the official standings, map everything onto the
// canonical model, tag group-stage matches with their group, and return a
// ScoresSnapshot. Edge-cached briefly so live matches update without hammering.

import { buildScoresSnapshot } from '../../src/lib/espn';

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

export const onRequestGet: PagesFunction = async () => {
  const snap = await buildScoresSnapshot(fetchJson);

  return new Response(JSON.stringify(snap), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // Edge-cache for 30s, serve stale up to 2min while revalidating.
      'cache-control': 'public, max-age=30, s-maxage=30, stale-while-revalidate=120',
    },
  });
};
