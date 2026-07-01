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
