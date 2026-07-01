// Shared ESPN FIFA World Cup adapter — pure functions, no external deps.
// Runs identically in Node (build-time generator) and Cloudflare Workers (edge fn).
// Maps ESPN's public scoreboard + standings JSON onto our canonical data model.

import type { Match, Stage, Standing, StandingRow, Team } from './types';

export const ESPN_LEAGUE = 'fifa.world';
export const ESPN_BASE = `https://site.api.espn.com/apis/site/v2/sports/soccer/${ESPN_LEAGUE}`;
export const ESPN_STANDINGS = `https://site.api.espn.com/apis/v2/sports/soccer/${ESPN_LEAGUE}/standings`;

// ESPN 3-letter code -> ISO-3166 alpha-2 (for regional-indicator emoji).
const CODE_TO_A2: Record<string, string> = {
  NED: 'NL', SWE: 'SE', GER: 'DE', CIV: 'CI', ECU: 'EC', CUW: 'CW', TUN: 'TN',
  JPN: 'JP', ESP: 'ES', KSA: 'SA', BEL: 'BE', IRN: 'IR', URU: 'UY', CPV: 'CV',
  NZL: 'NZ', EGY: 'EG', ARG: 'AR', AUT: 'AT', FRA: 'FR', IRQ: 'IQ', NOR: 'NO',
  SEN: 'SN', JOR: 'JO', ALG: 'DZ', POR: 'PT', UZB: 'UZ', GHA: 'GH', PAN: 'PA',
  CRO: 'HR', COL: 'CO', COD: 'CD', BIH: 'BA', QAT: 'QA', SUI: 'CH', CAN: 'CA',
  MAR: 'MA', HAI: 'HT', BRA: 'BR', CZE: 'CZ', MEX: 'MX', RSA: 'ZA', KOR: 'KR',
  TUR: 'TR', USA: 'US', PAR: 'PY', AUS: 'AU', COD_: 'CD',
  // Extra teams that could appear in qualification / friendlies fallbacks.
  ITA: 'IT', NGA: 'NG', CMR: 'CM', GRE: 'GR', UKR: 'UA', POL: 'PL', DEN: 'DK',
  SRB: 'RS', WAL: 'GB-WLS', SVN: 'SI', SVK: 'SK', ROU: 'RO', HUN: 'HU',
  SCO: 'GB-SCT', ENG: 'GB-ENG', NIR: 'GB-NIR',
};

// Subdivision flags with no alpha-2 (regional-indicator) representation.
const SPECIAL_FLAG: Record<string, string> = {
  ENG: '🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}',
  SCO: '🏴\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}',
  WAL: '🏴\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}',
};

/** Convert an ESPN 3-letter team code to an emoji flag. Falls back to ⚽. */
export function flagEmoji(code: string): string {
  const c = (code || '').toUpperCase();
  if (SPECIAL_FLAG[c]) return SPECIAL_FLAG[c];
  const a2 = CODE_TO_A2[c];
  if (!a2 || a2.length !== 2) return '⚽';
  const A = 0x1f1e6;
  return String.fromCodePoint(A + (a2.charCodeAt(0) - 65)) + String.fromCodePoint(A + (a2.charCodeAt(1) - 65));
}

const SLUG_TO_STAGE: Record<string, Stage> = {
  'group-stage': 'group',
  'round-of-32': 'r32',
  'round-of-16': 'r16',
  quarterfinals: 'qf',
  'quarter-finals': 'qf',
  semifinals: 'sf',
  'semi-finals': 'sf',
  final: 'final',
  'third-place': 'final',
};

export function stageFromSlug(slug: string | undefined): Stage {
  if (!slug) return 'group';
  return SLUG_TO_STAGE[slug] ?? (slug.includes('group') ? 'group' : 'r32');
}

export function statusFromState(state: string | undefined): 'upcoming' | 'live' | 'finished' {
  if (state === 'post') return 'finished';
  if (state === 'in') return 'live';
  return 'upcoming';
}

/** Stable team id from a display name (mirrors data/fixtures.teamId). */
export function teamId(name: string): string {
  return (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function competitor(comp: any, side: 'home' | 'away'): any | undefined {
  const cs: any[] = comp?.competitors ?? [];
  return cs.find((c) => c.homeAway === side);
}

function toTeam(c: any, group?: string): Team {
  const t = c?.team ?? {};
  const name = t.shortDisplayName || t.displayName || t.name || t.abbreviation || 'TBD';
  const code = t.abbreviation || '';
  return {
    id: teamId(name),
    name,
    flag: flagEmoji(code),
    ...(group ? { group } : {}),
  };
}

function venueOf(comp: any): string {
  const v = comp?.venue;
  if (!v) return '';
  const city = v.address?.city;
  return city ? `${v.fullName}, ${city}` : v.fullName || '';
}

/** Map a single ESPN scoreboard event to a canonical Match (no group yet). */
export function mapEvent(ev: any): Match | null {
  const comp = ev?.competitions?.[0];
  if (!comp) return null;
  const hc = competitor(comp, 'home');
  const ac = competitor(comp, 'away');
  if (!hc || !ac) return null;

  const state = ev?.status?.type?.state;
  const status = statusFromState(state);
  const hs = parseInt(hc.score, 10);
  const as = parseInt(ac.score, 10);
  const hasScore = (state === 'in' || state === 'post') && Number.isFinite(hs) && Number.isFinite(as);

  const note: string | undefined =
    (Array.isArray(comp.notes) ? comp.notes[0]?.headline : comp.notes?.headline) || undefined;

  const m: Match = {
    id: Number(ev.id),
    utc: ev.date,
    stage: stageFromSlug(ev.season?.slug),
    home: toTeam(hc),
    away: toTeam(ac),
    venue: venueOf(comp),
    score: hasScore ? { home: hs, away: as } : null,
    status,
    sources: ['ESPN'],
    ...(note ? { note } : {}),
    ...(hc.winner === true ? { winner: 'home' as const } : ac.winner === true ? { winner: 'away' as const } : {}),
  };
  return m;
}

/** Map a full ESPN scoreboard payload to Match[]. */
export function mapScoreboard(json: any): Match[] {
  const evs: any[] = json?.events ?? [];
  return evs.map(mapEvent).filter((m): m is Match => m !== null);
}

/**
 * Parse ESPN standings JSON into (a) canonical Standing[] and
 * (b) a team-name -> group-letter lookup used to tag group-stage matches.
 */
export function parseStandings(json: any): { standings: Standing[]; groupOf: Record<string, string> } {
  const children: any[] = json?.children ?? [];
  const standings: Standing[] = [];
  const groupOf: Record<string, string> = {};
  const thirds: StandingRow[] = [];

  for (const child of children) {
    const groupName: string = child?.name || child?.abbreviation || '';
    const letter = (groupName.match(/Group\s+([A-L])/i)?.[1] || '').toUpperCase();
    if (!letter) continue;
    const entries: any[] = child?.standings?.entries ?? [];
    const rows: StandingRow[] = [];
    for (const e of entries) {
      const stat = (name: string) => Number(e.stats?.find((s: any) => s.name === name)?.value ?? 0);
      const name = e.team?.shortDisplayName || e.team?.displayName || e.team?.name || '';
      const code = e.team?.abbreviation || '';
      const team: Team = { id: teamId(name), name, flag: flagEmoji(code), group: letter };
      groupOf[team.id] = letter;
      groupOf[teamId(e.team?.displayName || name)] = letter;
      const advanced = stat('advanced') > 0 || e.stats?.find((s: any) => s.name === 'advanced')?.value === true;
      rows.push({
        team,
        p: stat('gamesPlayed'),
        w: stat('wins'),
        d: stat('ties'),
        l: stat('losses'),
        gf: stat('pointsFor'),
        ga: stat('pointsAgainst'),
        gd: stat('pointDifferential'),
        pts: stat('points'),
        qualification: null,
        rank: stat('rank') || rows.length + 1,
        advanced: !!advanced,
      });
    }
    rows.sort((a, b) => (a.rank || 99) - (b.rank || 99) || b.pts - a.pts || b.gd - a.gd);
    if (rows[0]) rows[0].qualification = 'auto';
    if (rows[1]) rows[1].qualification = 'auto';
    if (rows[2]) thirds.push(rows[2]);
    standings.push({ group: letter, teams: rows });
  }

  // Best 8 third-placed teams advance in the 48-team format.
  thirds
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
    .slice(0, 8)
    .forEach((r) => (r.qualification = 'best3rd'));

  standings.sort((a, b) => a.group.localeCompare(b.group));
  return { standings, groupOf };
}

/** Tag group-stage matches with their group letter using the standings lookup. */
export function assignGroups(matches: Match[], groupOf: Record<string, string>): Match[] {
  for (const m of matches) {
    if (m.stage !== 'group') continue;
    const g = groupOf[m.home.id] || groupOf[m.away.id];
    if (g) {
      m.group = g;
      m.home.group = g;
      m.away.group = g;
    }
  }
  return matches;
}
