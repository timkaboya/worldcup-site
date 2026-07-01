// Cloudflare Pages Function: GET /api/match?event=<id>
// Returns rich per-match detail (lineups, stats, timeline, commentary,
// recent form and head-to-head) from ESPN's match-summary endpoint.

import { espnSummaryUrl, mapSummary } from '../../src/lib/espn';

async function fetchJson(url: string, timeoutMs = 7000): Promise<any> {
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

export const onRequestGet: PagesFunction = async ({ request }) => {
  const event = new URL(request.url).searchParams.get('event');
  if (!event || !/^\d+$/.test(event)) {
    return new Response(JSON.stringify({ error: 'missing or invalid event id' }), {
      status: 400,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  }
  const json = await fetchJson(espnSummaryUrl(event)).catch(() => null);
  if (!json) {
    return new Response(JSON.stringify({ error: 'upstream unavailable' }), {
      status: 502,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  }
  const detail = mapSummary(json, event);
  return new Response(JSON.stringify(detail), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=30, s-maxage=30, stale-while-revalidate=120',
    },
  });
};
