import type { Match, MatchStatus, TimeBucket } from './types';

// A match is considered "live" from kickoff until this many ms afterward.
// 110 minutes covers regulation + stoppage (ported from the POC).
export const LIVE_BUFFER_MS = 110 * 60 * 1000;

export function kickoffMs(match: Pick<Match, 'utc'>): number {
  return new Date(match.utc).getTime();
}

/** Derive match status from kickoff time + live buffer. */
export function statusOf(match: Pick<Match, 'utc'>, now: number = Date.now()): MatchStatus {
  const ko = kickoffMs(match);
  if (now < ko) return 'upcoming';
  if (now < ko + LIVE_BUFFER_MS) return 'live';
  return 'finished';
}

/** Break a UTC ISO time into wall-clock parts for a given IANA timezone (DST-correct). */
export function partsInTz(
  utc: string,
  timeZone: string
): { year: number; month: number; day: number; hour: number; minute: number } {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = dtf.formatToParts(new Date(utc));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '0';
  let hour = parseInt(get('hour'), 10);
  if (hour === 24) hour = 0; // some engines emit "24" for midnight
  return {
    year: parseInt(get('year'), 10),
    month: parseInt(get('month'), 10),
    day: parseInt(get('day'), 10),
    hour,
    minute: parseInt(get('minute'), 10),
  };
}

/** Calendar day key (YYYY-MM-DD) for a match in the given timezone. */
export function dayKey(utc: string, timeZone: string): string {
  const p = partsInTz(utc, timeZone);
  const mm = String(p.month).padStart(2, '0');
  const dd = String(p.day).padStart(2, '0');
  return `${p.year}-${mm}-${dd}`;
}

/** Today's day key in the given timezone. */
export function todayKey(timeZone: string, now: number = Date.now()): string {
  return dayKey(new Date(now).toISOString(), timeZone);
}

/** Time-of-day bucket used for kick-off color coding. */
export function timeBucket(hour: number): TimeBucket {
  if (hour >= 5 && hour < 12) return 't-mo';
  if (hour >= 12 && hour < 18) return 't-af';
  if (hour >= 18 && hour < 22) return 't-ev';
  return 't-ni';
}

/** Formatted kickoff clock time (e.g. "7:00 PM") in the given timezone. */
export function formatTime(utc: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(utc));
}

/** Formatted day heading (e.g. "Fri, Jun 12") in the given timezone. */
export function formatDayHeading(utc: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(utc));
}

/** Short relative-source timestamp for "last updated" lines. */
export function formatClock(now: number, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(now));
}
