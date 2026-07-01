import { describe, it, expect } from 'vitest';
import { buildIcs, icsDate, icsFilename } from '../src/lib/ics';
import type { Match } from '../src/lib/types';

const match: Match = {
  id: 19,
  utc: '2026-06-17T01:00:00Z',
  stage: 'group',
  group: 'J',
  home: { id: 'argentina', name: 'Argentina', flag: '🇦🇷', group: 'J' },
  away: { id: 'algeria', name: 'Algeria', flag: '🇩🇿', group: 'J' },
  venue: 'Arrowhead, Kansas City',
  score: { home: 3, away: 0 },
};

describe('icsDate', () => {
  it('formats an ISO instant as a UTC iCalendar stamp', () => {
    expect(icsDate('2026-06-17T01:00:00Z')).toBe('20260617T010000Z');
  });
});

describe('buildIcs', () => {
  const ics = buildIcs(match);

  it('produces a valid single VEVENT with a 2h window', () => {
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('DTSTART:20260617T010000Z');
    expect(ics).toContain('DTEND:20260617T030000Z');
    expect(ics).toContain('SUMMARY:⚽ Argentina vs Algeria');
    expect(ics).toContain('LOCATION:Arrowhead\\, Kansas City');
    expect(ics).toMatch(/END:VCALENDAR$/);
  });

  it('includes a reminder alarm', () => {
    expect(ics).toContain('BEGIN:VALARM');
    expect(ics).toContain('TRIGGER:-PT30M');
  });

  it('uses CRLF line endings', () => {
    expect(ics.includes('\r\n')).toBe(true);
  });
});

describe('icsFilename', () => {
  it('builds a stable, slugged filename', () => {
    expect(icsFilename(match)).toBe('wc2026-19-argentina-algeria.ics');
  });
});
