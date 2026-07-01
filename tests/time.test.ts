import { describe, it, expect } from 'vitest';
import {
  statusOf,
  timeBucket,
  dayKey,
  partsInTz,
  LIVE_BUFFER_MS,
} from '../src/lib/time';

const KO = '2026-06-12T19:00:00Z';
const koMs = new Date(KO).getTime();

describe('statusOf', () => {
  it('is upcoming before kickoff', () => {
    expect(statusOf({ utc: KO }, koMs - 1000)).toBe('upcoming');
  });
  it('is live at kickoff', () => {
    expect(statusOf({ utc: KO }, koMs)).toBe('live');
  });
  it('is live within the buffer', () => {
    expect(statusOf({ utc: KO }, koMs + LIVE_BUFFER_MS - 1)).toBe('live');
  });
  it('is finished after the buffer', () => {
    expect(statusOf({ utc: KO }, koMs + LIVE_BUFFER_MS)).toBe('finished');
  });
});

describe('timeBucket', () => {
  it('buckets by part of day', () => {
    expect(timeBucket(6)).toBe('t-mo');
    expect(timeBucket(13)).toBe('t-af');
    expect(timeBucket(19)).toBe('t-ev');
    expect(timeBucket(23)).toBe('t-ni');
    expect(timeBucket(2)).toBe('t-ni');
  });
});

describe('timezone conversion', () => {
  it('converts UTC to the correct wall-clock day across timezones', () => {
    // 01:00 UTC on Jun 12 is still Jun 11 in New York.
    expect(dayKey('2026-06-12T01:00:00Z', 'America/New_York')).toBe('2026-06-11');
    // ...but Jun 12 in Nairobi (UTC+3).
    expect(dayKey('2026-06-12T01:00:00Z', 'Africa/Nairobi')).toBe('2026-06-12');
  });
  it('extracts local hour correctly (DST-aware)', () => {
    // 19:00 UTC in New York in June (EDT, UTC-4) => 15:00.
    expect(partsInTz('2026-06-12T19:00:00Z', 'America/New_York').hour).toBe(15);
    // 19:00 UTC in Nairobi (UTC+3) => 22:00.
    expect(partsInTz('2026-06-12T19:00:00Z', 'Africa/Nairobi').hour).toBe(22);
  });
});
