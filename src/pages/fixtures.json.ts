import type { APIRoute } from 'astro';
import { MATCHES } from '../data/fixtures';
import type { ScoresSnapshot } from '../lib/types';

export const prerender = true;

// Static base snapshot — guarantees the app has data on any host,
// even before/without the /api/scores edge function.
export const GET: APIRoute = () => {
  const snap: ScoresSnapshot = {
    version: 1,
    updatedUtc: new Date().toISOString(),
    matches: MATCHES,
  };
  return new Response(JSON.stringify(snap), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
};
