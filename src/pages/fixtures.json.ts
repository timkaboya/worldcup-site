import type { APIRoute } from 'astro';
import tournament from '../data/tournament.json';
import type { Match, ScoresSnapshot } from '../lib/types';

export const prerender = true;

// Static base snapshot generated at build time from ESPN (scripts/fetch-espn.ts).
// Guarantees the app has real data on any host, even before/without the
// /api/scores edge function (e.g. local `astro dev`, offline PWA).
export const GET: APIRoute = () => {
  const snap: ScoresSnapshot = {
    version: 1,
    updatedUtc: tournament.updatedUtc ?? new Date().toISOString(),
    matches: tournament.matches as Match[],
  };
  return new Response(JSON.stringify(snap), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
};
