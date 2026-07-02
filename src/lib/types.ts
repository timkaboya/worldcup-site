// Canonical shared data model — see docs/TECHNICAL_SPEC.md §5.
// Used by the client app and the Cloudflare Pages Functions / cron workers.

export type Stage = 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'final';
export type MatchStatus = 'upcoming' | 'live' | 'finished';
export type TimeBucket = 't-mo' | 't-af' | 't-ev' | 't-ni';

export interface Team {
  id: string;
  name: string;
  flag: string;
  group?: string;
}

export interface Match {
  id: number; // stable fixture id
  utc: string; // ISO-8601 kickoff (UTC) — source of truth for time
  stage: Stage;
  group?: string; // 'A'..'L' for group stage
  home: Team;
  away: Team;
  venue: string;
  score?: { home: number; away: number } | null;
  status?: MatchStatus; // derived client-side
  sources?: string[]; // providers that contributed the score
  note?: string; // e.g. penalty-shootout result
  winner?: 'home' | 'away'; // knockout winner, when decided
}

export interface GoalEvent {
  minute: string;
  scorer: string;
  note?: string;
}

export interface TeamMatchStats {
  shots: number;
  onTarget: number;
  possession: number;
  corners: number;
  fouls: number;
  yellow: number;
  red: number;
  offsides: number;
}

export interface MatchStats {
  matchId: number;
  home: TeamMatchStats;
  away: TeamMatchStats;
  goals: { home: GoalEvent[]; away: GoalEvent[] };
}

export interface StandingRow {
  team: Team;
  p: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
  qualification?: 'auto' | 'best3rd' | null;
  rank?: number; // official ESPN rank within group
  advanced?: boolean; // official qualification flag from source
}

export interface Standing {
  group: string;
  teams: StandingRow[];
}

export interface Scorer {
  name: string;
  team: Team;
  goals: number;
  assists: number;
}

export type NewsTopic = 'players' | 'coaches' | 'clubs' | 'teams';

export interface NewsItem {
  id: string; // hash of canonical url
  title: string;
  source: string; // e.g. 'BBC Sport'
  url: string; // outbound link to origin
  publishedUtc: string; // ISO-8601
  summary?: string;
  imageUrl?: string;
  topics?: NewsTopic[];
}

// ── Rich per-match detail (ESPN summary endpoint) ─────────────────────────
export interface LineupPlayer {
  num: string; // shirt number
  name: string;
  pos: string; // position abbreviation (G/D/M/F ...)
  fp: number; // formationPlace 1..11 (1 = GK)
  starter: boolean;
  subOut?: string; // minute subbed out, e.g. "75'"
  subIn?: string; // minute subbed in
  goals?: number;
  yellow?: boolean;
  red?: boolean;
}

export interface TeamLineup {
  formation?: string; // e.g. "4-2-3-1"
  starters: LineupPlayer[];
  subs: LineupPlayer[];
}

export interface MatchStatItem {
  key: string;
  label: string;
  home: number;
  away: number;
  pct?: boolean; // render as % and split bar by value
}

export type MatchEventType = 'goal' | 'yellow' | 'red' | 'sub' | 'other';

export interface MatchEvent {
  min: string; // display minute, e.g. "45+2'"
  type: MatchEventType;
  side: 'home' | 'away' | '';
  text: string;
  players: string[];
}

export interface CommentaryItem {
  min: string;
  text: string;
}

export interface FormGame {
  date: string; // ISO
  opponent: string;
  score: string; // "2-1"
  result: 'W' | 'D' | 'L' | '';
  competition?: string;
}

export interface H2HGame {
  date: string;
  opponent: string; // opponent of the home team
  score: string;
  result: 'W' | 'D' | 'L' | '';
  competition?: string;
}

export interface MatchDetail {
  id: number;
  status: MatchStatus;
  clock?: string; // live clock / "Full time" etc.
  score?: { home: number; away: number } | null; // authoritative live/final score
  winner?: 'home' | 'away'; // knockout winner, when decided
  info: { venue?: string; attendance?: number; referee?: string; odds?: string };
  lineups?: { home: TeamLineup; away: TeamLineup };
  stats?: MatchStatItem[];
  events?: MatchEvent[]; // goals/cards/subs timeline
  commentary?: CommentaryItem[];
  form?: { home: FormGame[]; away: FormGame[] };
  h2h?: H2HGame[];
}

// Snapshots written to KV / served by edge functions.
export interface ScoresSnapshot {
  version: number;
  updatedUtc: string;
  matches: Match[];
  stats?: MatchStats[];
}

export interface NewsSnapshot {
  version: number;
  updatedUtc: string;
  items: NewsItem[];
}

// Client-only state (localStorage) — never sent to any server.
export interface UserPrefs {
  timezone: string;
  favorites: string[]; // team ids
  lastSeenNewsUtc?: string;
}
