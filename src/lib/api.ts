import type { MatchDetail, NewsSnapshot, ScoresSnapshot, Standing } from './types';
import { buildScoresSnapshot, espnSummaryUrl, mapSummary } from './espn';
import { withBase } from './base';

export interface FetchResult {
  snapshot: ScoresSnapshot;
  live: boolean; // true if from live source (edge fn or direct ESPN), false if static fallback
  sources: string[];
}

async function getJson(url: string, timeoutMs = 8000): Promise<ScoresSnapshot> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return (await r.json()) as ScoresSnapshot;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Fetch arbitrary JSON with a timeout — used for the direct-to-ESPN browser
 * fallback. ESPN's public API sends `Access-Control-Allow-Origin: *`, so these
 * requests succeed from the browser on any host (GitHub Pages, local dev).
 */
async function fetchAny(url: string, timeoutMs = 8000): Promise<any> {
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

/**
 * Fetch the scores snapshot. Order of preference:
 *   1. Live edge function (`/api/scores`) — present on Cloudflare.
 *   2. Direct ESPN from the browser — works everywhere (GitHub Pages, dev),
 *      so recently-ended matches always show fresh scores on load.
 *   3. Static build-time snapshot (`/fixtures.json`) — last-known fallback.
 */
export async function fetchScores(): Promise<FetchResult> {
  // 1) Edge function (Cloudflare Pages Function).
  try {
    const snapshot = await getJson(withBase('/api/scores'));
    if (snapshot.matches?.length) {
      const sources = Array.from(new Set(snapshot.matches.flatMap((m) => m.sources ?? [])));
      return { snapshot, live: true, sources };
    }
  } catch {
    /* fall through to direct ESPN */
  }

  // 2) Direct ESPN from the browser (CORS *) — same builder the edge fn uses.
  try {
    const snapshot = await buildScoresSnapshot((url) => fetchAny(url));
    if (snapshot.matches?.length) {
      return { snapshot, live: true, sources: ['ESPN'] };
    }
  } catch {
    /* fall through to static snapshot */
  }

  // 3) Static build-time snapshot — always renders something.
  const snapshot = await getJson(withBase('/fixtures.json'));
  return { snapshot, live: false, sources: [] };
}

export interface StandingsResult {
  standings: Standing[];
  live: boolean;
}

/**
 * Fetch official group standings. Tries the live edge function first, falls back
 * to the build-time static snapshot so the Tables page always renders real data.
 */
export async function fetchStandings(): Promise<StandingsResult> {
  const get = async (url: string): Promise<Standing[]> => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    try {
      const r = await fetch(url, { signal: ctrl.signal });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as { standings?: Standing[] };
      if (!j.standings?.length) throw new Error('empty');
      return j.standings;
    } finally {
      clearTimeout(t);
    }
  };
  try {
    return { standings: await get(withBase('/api/standings')), live: true };
  } catch {
    try {
      return { standings: await get(withBase('/standings.json')), live: false };
    } catch {
      return { standings: [], live: false };
    }
  }
}

export interface NewsResult {
  snapshot: NewsSnapshot;
  live: boolean;
}

/**
 * Fetch the news snapshot. Tries the live edge function first, falls back to
 * the static (empty) snapshot so the News page always renders.
 */
export async function fetchNews(): Promise<NewsResult> {
  const get = async (url: string): Promise<NewsSnapshot> => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    try {
      const r = await fetch(url, { signal: ctrl.signal });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return (await r.json()) as NewsSnapshot;
    } finally {
      clearTimeout(t);
    }
  };
  try {
    const snapshot = await get(withBase('/api/news'));
    if (!snapshot.items?.length) throw new Error('empty');
    return { snapshot, live: true };
  } catch {
    const snapshot = await get(withBase('/news.json')).catch(
      () => ({ version: 1, updatedUtc: new Date().toISOString(), items: [] }) as NewsSnapshot
    );
    return { snapshot, live: false };
  }
}

/**
 * Fetch rich per-match detail for the drawer. Tries the live edge function
 * first; if unavailable (e.g. local `astro dev`, where /api/* is Cloudflare-
 * only), falls back to calling ESPN's summary endpoint directly — its CORS
 * policy is `*`, so the same shared mapper runs in the browser.
 */
export async function fetchMatchDetail(eventId: number): Promise<MatchDetail | null> {
  const withTimeout = async (url: string, ms = 8000): Promise<Response> => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try {
      return await fetch(url, { signal: ctrl.signal });
    } finally {
      clearTimeout(t);
    }
  };
  try {
    const r = await withTimeout(withBase(`/api/match?event=${eventId}`));
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return (await r.json()) as MatchDetail;
  } catch {
    try {
      const r = await withTimeout(espnSummaryUrl(eventId));
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return mapSummary(await r.json(), eventId);
    } catch {
      return null;
    }
  }
}
