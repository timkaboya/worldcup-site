// Shared ESPN FIFA World Cup adapter — pure functions, no external deps.
// Runs identically in Node (build-time generator) and Cloudflare Workers (edge fn).
// Maps ESPN's public scoreboard + standings JSON onto our canonical data model.

import type {
  Match,
  MatchDetail,
  MatchEvent,
  MatchEventType,
  MatchStatItem,
  ScoresSnapshot,
  Stage,
  Standing,
  StandingRow,
  Team,
  TeamLineup,
  LineupPlayer,
  FormGame,
  H2HGame,
  Scorer,
} from './types';

export const ESPN_LEAGUE = 'fifa.world';
export const ESPN_BASE = `https://site.api.espn.com/apis/site/v2/sports/soccer/${ESPN_LEAGUE}`;
export const ESPN_STANDINGS = `https://site.api.espn.com/apis/v2/sports/soccer/${ESPN_LEAGUE}/standings`;
export const ESPN_STATISTICS = `${ESPN_BASE}/statistics`;
export const espnSummaryUrl = (event: number | string) => `${ESPN_BASE}/summary?event=${event}`;

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

// Six-day chunks covering the whole tournament (Jun 11 – Jul 19, 2026).
// Shared by the edge function and the browser fallback so both pull the
// identical live window from ESPN.
export const SCORE_RANGES = [
  '20260611-20260616',
  '20260617-20260622',
  '20260623-20260628',
  '20260629-20260704',
  '20260705-20260710',
  '20260711-20260716',
  '20260717-20260719',
];

/**
 * Build a live ScoresSnapshot straight from ESPN's public API. Pure aside from
 * the injected `fetchJson`, so it runs identically in Cloudflare Workers (edge
 * function) and in the browser (client-side fallback for GitHub Pages / offline
 * edge). Never throws for a single failed range — returns whatever ESPN gave.
 */
export async function buildScoresSnapshot(
  fetchJson: (url: string) => Promise<any>
): Promise<ScoresSnapshot> {
  const [scoreboards, standingsJson] = await Promise.all([
    Promise.all(
      SCORE_RANGES.map((r) =>
        fetchJson(`${ESPN_BASE}/scoreboard?dates=${r}`).catch(() => ({ events: [] }))
      )
    ),
    fetchJson(ESPN_STANDINGS).catch(() => ({})),
  ]);

  const byId = new Map<number, Match>();
  for (const sb of scoreboards) {
    for (const m of mapScoreboard(sb)) byId.set(m.id, m);
  }
  const matches = Array.from(byId.values()).sort((a, b) => a.utc.localeCompare(b.utc));

  const { groupOf } = parseStandings(standingsJson);
  assignGroups(matches, groupOf);

  return { version: 1, updatedUtc: new Date().toISOString(), matches };
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

// ── Match detail (ESPN summary endpoint) ──────────────────────────────────

// Curated stat rows in display order: ESPN statistic name -> label / format.
const STAT_MAP: { name: string; label: string; pct?: boolean }[] = [
  { name: 'possessionPct', label: 'Possession', pct: true },
  { name: 'totalShots', label: 'Shots' },
  { name: 'shotsOnTarget', label: 'Shots on target' },
  { name: 'wonCorners', label: 'Corners' },
  { name: 'offsides', label: 'Offsides' },
  { name: 'foulsCommitted', label: 'Fouls' },
  { name: 'yellowCards', label: 'Yellow cards' },
  { name: 'redCards', label: 'Red cards' },
  { name: 'saves', label: 'Saves' },
  { name: 'totalPasses', label: 'Passes' },
  { name: 'passPct', label: 'Pass accuracy', pct: true },
  { name: 'accurateCrosses', label: 'Accurate crosses' },
  { name: 'totalTackles', label: 'Tackles' },
  { name: 'interceptions', label: 'Interceptions' },
];

function eventType(text: string | undefined): MatchEventType {
  const t = (text || '').toLowerCase();
  if (t.includes('red card')) return 'red';
  if (t.includes('yellow card')) return 'yellow';
  if (t.includes('substitution')) return 'sub';
  if (t.includes('goal')) return 'goal';
  return 'other';
}

function sideOf(teamId: string, homeId: string, awayId: string): 'home' | 'away' | '' {
  if (teamId && teamId === homeId) return 'home';
  if (teamId && teamId === awayId) return 'away';
  return '';
}

function subMinute(p: any): string {
  const play = (p.plays ?? []).find((x: any) => /substitution/i.test(x.type?.text || x.text || ''));
  return play?.clock?.displayValue || 'out';
}

function mapLineup(rosterEntry: any): TeamLineup {
  const players: LineupPlayer[] = (rosterEntry?.roster ?? []).map((p: any): LineupPlayer => {
    const st = p.stats ?? [];
    const statVal = (abbr: string) => {
      const s = st.find((x: any) => x.abbreviation === abbr || x.name === abbr);
      return Number(s?.value ?? parseFloat(String(s?.displayValue ?? '0')) ?? 0) || 0;
    };
    return {
      num: String(p.jersey ?? ''),
      name: p.athlete?.displayName || p.athlete?.shortName || '',
      pos: p.position?.abbreviation || '',
      fp: Number(p.formationPlace ?? 0),
      starter: !!p.starter,
      goals: statVal('G') || undefined,
      yellow: statVal('YC') > 0 || undefined,
      red: statVal('RC') > 0 || undefined,
      subOut: p.subbedOut ? subMinute(p) : undefined,
      subIn: p.subbedIn ? subMinute(p) : undefined,
    };
  });
  return {
    formation: rosterEntry?.formation || undefined,
    starters: players.filter((p) => p.starter).sort((a, b) => a.fp - b.fp),
    subs: players.filter((p) => !p.starter),
  };
}

function mapFormList(entry: any, teamName: string): FormGame[] {
  const evs: any[] = entry?.events ?? [];
  return evs.slice(0, 5).map((e): FormGame => ({
    date: e.gameDate || '',
    opponent: e.opponent?.abbreviation || e.opponent?.displayName || '',
    score: e.score || `${e.homeTeamScore}-${e.awayTeamScore}`,
    result: (e.gameResult as 'W' | 'D' | 'L') || '',
    competition: e.leagueAbbreviation || e.competitionName || '',
  }));
}

/**
 * Map an ESPN match-summary payload to canonical MatchDetail.
 * Pure — runs in Node, Workers and the browser. Returns partial data
 * gracefully (upcoming matches have no lineups/stats/commentary).
 */
export function mapSummary(json: any, fallbackId?: number | string): MatchDetail {
  const comp = json?.header?.competitions?.[0];
  const cs: any[] = comp?.competitors ?? [];
  const homeC = cs.find((c) => c.homeAway === 'home');
  const awayC = cs.find((c) => c.homeAway === 'away');
  const homeId = homeC?.team?.id || homeC?.id || '';
  const awayId = awayC?.team?.id || awayC?.id || '';
  const state = comp?.status?.type?.state;
  const status = statusFromState(state);

  const detail: MatchDetail = {
    id: Number(comp?.id ?? fallbackId ?? 0),
    status,
    clock: comp?.status?.type?.shortDetail || comp?.status?.type?.description || undefined,
    info: {},
  };

  // Authoritative scoreline from the summary header — lets the drawer show the
  // real score even when the list snapshot hasn't refreshed yet.
  const hs = parseInt(homeC?.score, 10);
  const as = parseInt(awayC?.score, 10);
  if ((state === 'in' || state === 'post') && Number.isFinite(hs) && Number.isFinite(as)) {
    detail.score = { home: hs, away: as };
    if (homeC?.winner === true) detail.winner = 'home';
    else if (awayC?.winner === true) detail.winner = 'away';
  }

  // Game info: venue, attendance, referee, odds.
  const gi = json?.gameInfo ?? {};
  detail.info.venue = gi.venue?.fullName || undefined;
  detail.info.attendance = Number(gi.attendance) || undefined;
  const ref = (gi.officials ?? []).find((o: any) => /referee/i.test(o.position?.displayName || ''));
  detail.info.referee = ref?.displayName || undefined;
  detail.info.odds = json?.odds?.[0]?.details || undefined;

  // Lineups.
  const rosters: any[] = json?.rosters ?? [];
  const hR = rosters.find((r) => r.homeAway === 'home');
  const aR = rosters.find((r) => r.homeAway === 'away');
  if (hR?.roster?.length && aR?.roster?.length) {
    detail.lineups = { home: mapLineup(hR), away: mapLineup(aR) };
  }

  // Statistics.
  const teams: any[] = json?.boxscore?.teams ?? [];
  const hT = teams.find((t) => t.homeAway === 'home') ?? teams[0];
  const aT = teams.find((t) => t.homeAway === 'away') ?? teams[1];
  if (hT?.statistics?.length && aT?.statistics?.length) {
    // ESPN team stats expose `displayValue` (string); percentage stats are
    // inconsistent (possession "60.5" but passPct "0.9"), so normalise ratios.
    const val = (t: any, name: string, pct?: boolean): number => {
      const raw = t.statistics.find((s: any) => s.name === name)?.displayValue;
      let n = parseFloat(String(raw ?? '').replace('%', ''));
      if (!Number.isFinite(n)) return 0;
      if (pct && n <= 1) n *= 100;
      return pct ? Math.round(n) : n;
    };
    const stats: MatchStatItem[] = STAT_MAP.map((r) => ({
      key: r.name,
      label: r.label,
      home: val(hT, r.name, r.pct),
      away: val(aT, r.name, r.pct),
      pct: r.pct,
    })).filter((s) => s.home || s.away);
    if (stats.length) detail.stats = stats;
  }

  // Timeline (goals/cards/subs).
  const keyEvents: any[] = json?.keyEvents ?? [];
  const events: MatchEvent[] = keyEvents
    .map((e): MatchEvent => ({
      min: e.clock?.displayValue || '',
      type: eventType(e.type?.text),
      side: sideOf(e.team?.id || '', homeId, awayId),
      text: e.text || e.type?.text || '',
      players: (e.participants ?? []).map((p: any) => p.athlete?.displayName).filter(Boolean),
    }))
    .filter((e) => e.type !== 'other');
  if (events.length) detail.events = events;

  // Commentary (newest first).
  const commentary: any[] = json?.commentary ?? [];
  const comm = commentary
    .filter((c) => c.text)
    .map((c) => ({ min: c.time?.displayValue || '', text: c.text as string }));
  if (comm.length) detail.commentary = comm;

  // Recent form (last 5).
  const lfg: any[] = json?.lastFiveGames ?? [];
  const hForm = lfg.find((x) => x.team?.id === homeId) ?? lfg[0];
  const aForm = lfg.find((x) => x.team?.id === awayId) ?? lfg[1];
  if (hForm || aForm) {
    detail.form = {
      home: mapFormList(hForm, homeC?.team?.displayName),
      away: mapFormList(aForm, awayC?.team?.displayName),
    };
  }

  // Head-to-head (from home team's perspective).
  const h2hEntry = (json?.headToHeadGames ?? [])[0];
  const h2h: H2HGame[] = (h2hEntry?.events ?? []).slice(0, 6).map((e: any): H2HGame => ({
    date: e.gameDate || '',
    opponent: e.opponent?.abbreviation || e.opponent?.displayName || '',
    score: e.score || `${e.homeTeamScore}-${e.awayTeamScore}`,
    result: (e.gameResult as 'W' | 'D' | 'L') || '',
    competition: e.leagueAbbreviation || e.competitionName || '',
  }));
  if (h2h.length) detail.h2h = h2h;

  return detail;
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

// ── Leaders (ESPN statistics endpoint) ────────────────────────────────────
// The `/statistics` endpoint returns aggregated tournament leaders in a single
// call: `stats[]` holds a `goalsLeaders` and an `assistsLeaders` category, and
// every leader entry carries the athlete's full `statistics[]` (totalGoals +
// goalAssists). We ingest athletes from both categories, keyed by id, so each
// player's exact goals AND assists are captured, then derive the two boards.
export function buildLeaders(statsJson: any): { scorers: Scorer[]; assists: Scorer[] } {
  const categories: any[] = statsJson?.stats ?? [];
  const byId = new Map<string, Scorer>();

  const ingest = (leaders: any[] | undefined) => {
    for (const ld of leaders ?? []) {
      const ath = ld?.athlete;
      const name: string = ath?.displayName || ath?.shortName || '';
      if (!name) continue;
      const id = String(ath?.id ?? name);
      if (byId.has(id)) continue;
      const stats: any[] = ath?.statistics ?? [];
      const statVal = (n: string): number =>
        Number(stats.find((s) => s?.name === n)?.value ?? 0) || 0;
      const t = ath?.team ?? {};
      const teamName: string = t.displayName || t.name || t.abbreviation || '';
      byId.set(id, {
        name,
        team: { id: teamId(teamName), name: teamName, flag: flagEmoji(t.abbreviation || '') },
        goals: statVal('totalGoals'),
        assists: statVal('goalAssists'),
      });
    }
  };

  for (const c of categories) {
    const cname = String(c?.name || '');
    if (/goal/i.test(cname) || /assist/i.test(cname)) ingest(c?.leaders);
  }

  const all = Array.from(byId.values());
  const scorers = all
    .filter((s) => s.goals > 0)
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists || a.name.localeCompare(b.name))
    .slice(0, 30);
  const assists = all
    .filter((s) => s.assists > 0)
    .sort((a, b) => b.assists - a.assists || b.goals - a.goals || a.name.localeCompare(b.name))
    .slice(0, 30);
  return { scorers, assists };
}
