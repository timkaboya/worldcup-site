// Cloudflare Pages Function: GET /api/leaders
// Returns the tournament's top scorers and assist providers, aggregated from
// ESPN's `/statistics` endpoint (a single call) and mapped to our Scorer model.

import { ESPN_STATISTICS, buildLeaders } from '../../src/lib/espn';

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
  const json = await fetchJson(ESPN_STATISTICS).catch(() => ({}));
  const { scorers, assists } = buildLeaders(json);
  return new Response(
    JSON.stringify({ version: 1, updatedUtc: new Date().toISOString(), scorers, assists }),
    {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        // Leaders change only when goals are scored; cache a little longer.
        'cache-control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
      },
    }
  );
};
