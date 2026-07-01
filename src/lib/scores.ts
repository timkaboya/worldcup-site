import type { Match, ScoresSnapshot } from './types';

// Normalized shape every provider adapter emits.
export interface ProviderMatch {
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
}

/** Lowercase a-z only, for tolerant cross-source name matching. */
export function normName(s: string): string {
  return (s || '').toLowerCase().replace(/[^a-z]/g, '');
}

/** Two names match if their normalized 5-char prefixes agree (POC heuristic). */
function namesMatch(a: string, b: string): boolean {
  const na = normName(a);
  const nb = normName(b);
  if (!na || !nb) return false;
  return na.slice(0, 5) === nb.slice(0, 5) || na.slice(0, 4) === nb.slice(0, 4);
}

// ---- Provider parsers: raw JSON -> ProviderMatch[] (finished/in-progress only) ----

export function parseOpenFootball(data: any): ProviderMatch[] {
  const ms: any[] = data?.matches ?? [];
  const out: ProviderMatch[] = [];
  for (const g of ms) {
    if (!g?.score?.ft) continue;
    const [h, a] = g.score.ft;
    if (typeof h !== 'number' || typeof a !== 'number') continue;
    out.push({ home: g.team1 ?? '', away: g.team2 ?? '', homeScore: h, awayScore: a });
  }
  return out;
}

export function parseWC26(data: any): ProviderMatch[] {
  const g: any[] = data?.games ?? (Array.isArray(data) ? data : []);
  const out: ProviderMatch[] = [];
  for (const game of g) {
    const finished = game?.finished === 'TRUE' || game?.finished === true;
    if (!finished) continue;
    const h = parseInt(game?.home_score, 10);
    const a = parseInt(game?.away_score, 10);
    if (Number.isNaN(h) || Number.isNaN(a)) continue;
    out.push({ home: game?.home_team ?? '', away: game?.away_team ?? '', homeScore: h, awayScore: a });
  }
  return out;
}

export function parseESPN(data: any): ProviderMatch[] {
  const evs: any[] = data?.events ?? [];
  const out: ProviderMatch[] = [];
  for (const ev of evs) {
    const comp = ev?.competitions?.[0];
    if (!comp) continue;
    const cs: any[] = comp.competitors ?? [];
    const hc = cs.find((c) => c.homeAway === 'home');
    const ac = cs.find((c) => c.homeAway === 'away');
    if (!hc || !ac) continue;
    const st = ev?.status?.type?.name ?? '';
    if (st !== 'STATUS_FINAL' && st !== 'STATUS_IN_PROGRESS') continue;
    const h = parseInt(hc.score ?? '-1', 10);
    const a = parseInt(ac.score ?? '-1', 10);
    if (h < 0 || a < 0) continue;
    out.push({
      home: hc.team?.shortDisplayName || hc.team?.displayName || '',
      away: ac.team?.shortDisplayName || ac.team?.displayName || '',
      homeScore: h,
      awayScore: a,
    });
  }
  return out;
}

export interface SourceResult {
  label: string;
  matches: ProviderMatch[];
}

/**
 * Merge provider results into the canonical fixtures, producing a ScoresSnapshot.
 * Only group-stage fixtures are reconciled (knockout teams are TBD).
 * Base matches keep their seeded scores unless a provider supplies a value.
 */
export function buildSnapshot(base: Match[], sources: SourceResult[], now: number = Date.now()): ScoresSnapshot {
  const matches: Match[] = base.map((m) => ({
    ...m,
    home: { ...m.home },
    away: { ...m.away },
    score: m.score ? { ...m.score } : m.score,
    sources: [],
  }));

  for (const src of sources) {
    for (const pm of src.matches) {
      for (const m of matches) {
        if (m.stage !== 'group') continue;
        if (namesMatch(m.home.name, pm.home) && namesMatch(m.away.name, pm.away)) {
          m.score = { home: pm.homeScore, away: pm.awayScore };
          if (!m.sources!.includes(src.label)) m.sources!.push(src.label);
        }
      }
    }
  }

  return {
    version: 1,
    updatedUtc: new Date(now).toISOString(),
    matches,
  };
}
