import type { APIRoute } from 'astro';
import news from '../data/news.json';
import type { NewsItem, NewsSnapshot } from '../lib/types';

export const prerender = true;

// Static base snapshot generated at build time (scripts/fetch-news.ts) from the
// reputable World-Cup RSS allow-list. Guarantees the News page has real, relevant
// stories on any host — even without the /api/news edge function (Worker deploy,
// offline PWA, local `astro dev`). Live refresh comes from /api/news when present.
export const GET: APIRoute = () => {
  const src = news as { updatedUtc?: string; items?: NewsItem[] };
  const snap: NewsSnapshot = {
    version: 1,
    updatedUtc: src.updatedUtc ?? new Date().toISOString(),
    items: src.items ?? [],
  };
  return new Response(JSON.stringify(snap), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
};
