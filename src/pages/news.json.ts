import type { APIRoute } from 'astro';
import type { NewsSnapshot } from '../lib/types';

export const prerender = true;

// Static fallback for the News feed so the page renders (empty state) on any
// host without the /api/news edge function. Live items come from /api/news.
export const GET: APIRoute = () => {
  const snap: NewsSnapshot = {
    version: 1,
    updatedUtc: new Date().toISOString(),
    items: [],
  };
  return new Response(JSON.stringify(snap), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
};
