// Cloudflare Pages Function: GET /api/scores
// Aggregates live scores from multiple public sources server-side (no browser CORS),
// merges them onto the canonical fixtures, and returns a ScoresSnapshot.
// Relies on Cloudflare edge caching (Cache-Control) to avoid hammering providers.

import { MATCHES } from '../../src/data/fixtures';
import {
  buildSnapshot,
  parseESPN,
  parseOpenFootball,
  parseWC26,
  type SourceResult,
} from '../../src/lib/scores';

const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';
const OPENFOOTBALL =
  'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';
const WC26 = 'https://worldcup26.ir/get/games';

async function fetchJson(url: string, timeoutMs = 6000): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

export const onRequestGet: PagesFunction = async () => {
  const jobs: Array<Promise<SourceResult>> = [
    fetchJson(WC26).then((d) => ({ label: 'worldcup26.ir', matches: parseWC26(d) })),
    fetchJson(OPENFOOTBALL).then((d) => ({ label: 'openfootball', matches: parseOpenFootball(d) })),
    fetchJson(ESPN).then((d) => ({ label: 'ESPN', matches: parseESPN(d) })),
  ];

  const settled = await Promise.allSettled(jobs);
  const sources: SourceResult[] = settled
    .filter((s): s is PromiseFulfilledResult<SourceResult> => s.status === 'fulfilled')
    .map((s) => s.value)
    .filter((s) => s.matches.length > 0);

  const snap = buildSnapshot(MATCHES, sources);

  return new Response(JSON.stringify(snap), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // Edge-cache for 30s, serve stale up to 2min while revalidating.
      'cache-control': 'public, max-age=30, s-maxage=30, stale-while-revalidate=120',
    },
  });
};
