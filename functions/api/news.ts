// Cloudflare Pages Function: GET /api/news
// Fetches the RSS allow-list server-side (no browser CORS), normalizes to
// NewsItem[], de-dups, sorts newest-first, and returns a NewsSnapshot.
// Edge-cached so we don't hammer publishers.

import { NEWS_SOURCES } from '../../src/data/news-sources';
import { parseFeed, mergeNews } from '../../src/lib/news';
import type { NewsItem } from '../../src/lib/types';

async function fetchText(url: string, timeoutMs = 6000): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'user-agent': 'worldcup-site/1.0 (+https://github.com/timkaboya/worldcup-site)' },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.text();
  } finally {
    clearTimeout(t);
  }
}

export const onRequestGet: PagesFunction = async () => {
  const jobs = NEWS_SOURCES.map((s) =>
    fetchText(s.url).then((xml) => parseFeed(xml, s.name))
  );
  const settled = await Promise.allSettled(jobs);
  const lists: NewsItem[][] = settled
    .filter((r): r is PromiseFulfilledResult<NewsItem[]> => r.status === 'fulfilled')
    .map((r) => r.value);

  const items = mergeNews(lists);
  const snap = { version: 1, updatedUtc: new Date().toISOString(), items };

  return new Response(JSON.stringify(snap), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // Cache 5 min at the edge; serve stale up to 30 min while revalidating.
      'cache-control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=1800',
    },
  });
};
