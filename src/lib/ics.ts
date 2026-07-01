import type { Match } from './types';

// Minimal, dependency-free iCalendar (.ics) generation so users can add a match
// (with a reminder alarm) to their own calendar — no accounts, no server, works
// offline. This is the lightweight alternative to server-backed Web Push.

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Format an ISO instant as an iCalendar UTC timestamp: YYYYMMDDTHHMMSSZ. */
export function icsDate(iso: string): string {
  const d = new Date(iso);
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

function esc(s: string): string {
  return s.replace(/([\\,;])/g, '\\$1').replace(/\n/g, '\\n');
}

/**
 * Build a single-event .ics for a match, with a 30-minute reminder alarm.
 * Assumes a 2-hour event window (kickoff → +120min).
 */
export function buildIcs(match: Match, reminderMinutes = 30): string {
  const start = new Date(match.utc);
  const end = new Date(start.getTime() + 120 * 60 * 1000);
  const away = match.away.name ? ` vs ${match.away.name}` : '';
  const summary = `⚽ ${match.home.name}${away}`;
  const stage = match.group ? `Group ${match.group}` : match.stage.toUpperCase();
  const uid = `wc2026-${match.id}@worldcup-site`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//worldcup-site//WC2026//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(start.toISOString())}`,
    `DTEND:${icsDate(end.toISOString())}`,
    `SUMMARY:${esc(summary)}`,
    `DESCRIPTION:${esc(`${stage} · FIFA World Cup 2026`)}`,
    `LOCATION:${esc(match.venue)}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${esc(summary)} kicks off soon`,
    `TRIGGER:-PT${reminderMinutes}M`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  // iCalendar requires CRLF line endings.
  return lines.join('\r\n');
}

export function icsFilename(match: Match): string {
  const slug = `${match.home.id}-${match.away.id || 'tbd'}`;
  return `wc2026-${match.id}-${slug}.ics`;
}
