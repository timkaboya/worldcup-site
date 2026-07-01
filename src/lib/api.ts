import type { MatchDetail, NewsSnapshot, ScoresSnapshot, Standing } from './types';
import { espnSummaryUrl, mapSummary } from './espn';

export interface FetchResult {
  snapshot: ScoresSnapshot;
  live: boolean; // true if from /api/scores, false if from static fallback
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
 * Fetch the scores snapshot. Tries the live edge function first,
 * falls back to the static base snapshot so the app always renders.
 */
export async function fetchScores(): Promise<FetchResult> {
  try {
    const snapshot = await getJson('/api/scores');
    const sources = Array.from(
      new Set(snapshot.matches.flatMap((m) => m.sources ?? []))
    );
    return { snapshot, live: true, sources };
  } catch {
    const snapshot = await getJson('/fixtures.json');
    return { snapshot, live: false, sources: [] };
  }
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
    return { standings: await get('/api/standings'), live: true };
  } catch {
    try {
      return { standings: await get('/standings.json'), live: false };
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
    const snapshot = await get('/api/news');
    if (!snapshot.items?.length) throw new Error('empty');
    return { snapshot, live: true };
  } catch {
    const snapshot = await get('/news.json').catch(
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
    const r = await withTimeout(`/api/match?event=${eventId}`);
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
