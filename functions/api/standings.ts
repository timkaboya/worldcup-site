// Cloudflare Pages Function: GET /api/standings
// Returns the official ESPN group standings mapped to our model.

import { ESPN_STANDINGS, parseStandings } from '../../src/lib/espn';

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
  const json = await fetchJson(ESPN_STANDINGS).catch(() => ({}));
  const { standings } = parseStandings(json);
  return new Response(
    JSON.stringify({ version: 1, updatedUtc: new Date().toISOString(), standings }),
    {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
      },
    }
  );
};
