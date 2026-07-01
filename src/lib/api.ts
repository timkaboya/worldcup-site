import type { NewsSnapshot, ScoresSnapshot } from './types';

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
