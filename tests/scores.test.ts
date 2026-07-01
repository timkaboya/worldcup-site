import { describe, it, expect } from 'vitest';
import {
  parseOpenFootball,
  parseESPN,
  parseWC26,
  buildSnapshot,
  normName,
  type SourceResult,
} from '../src/lib/scores';
import { MATCHES } from '../src/data/fixtures';

describe('provider parsers', () => {
  it('parses openfootball finished matches', () => {
    const data = {
      matches: [
        { team1: 'Mexico', team2: 'South Africa', score: { ft: [2, 0] } },
        { team1: 'A', team2: 'B' }, // no score -> skipped
      ],
    };
    const out = parseOpenFootball(data);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ home: 'Mexico', away: 'South Africa', homeScore: 2, awayScore: 0 });
  });

  it('parses ESPN final/in-progress only', () => {
    const data = {
      events: [
        {
          status: { type: { name: 'STATUS_FINAL' } },
          competitions: [
            {
              competitors: [
                { homeAway: 'home', score: '3', team: { shortDisplayName: 'France' } },
                { homeAway: 'away', score: '1', team: { shortDisplayName: 'Senegal' } },
              ],
            },
          ],
        },
        {
          status: { type: { name: 'STATUS_SCHEDULED' } },
          competitions: [{ competitors: [{ homeAway: 'home', score: '0' }, { homeAway: 'away', score: '0' }] }],
        },
      ],
    };
    const out = parseESPN(data);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ home: 'France', away: 'Senegal', homeScore: 3, awayScore: 1 });
  });

  it('parses worldcup26.ir finished games', () => {
    const data = {
      games: [
        { home_team: 'Germany', away_team: 'Curacao', home_score: '7', away_score: '1', finished: 'TRUE' },
        { home_team: 'X', away_team: 'Y', finished: 'FALSE' },
      ],
    };
    const out = parseWC26(data);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ homeScore: 7, awayScore: 1 });
  });
});

describe('normName', () => {
  it('strips non-letters and lowercases', () => {
    expect(normName('Bosnia & Herz.')).toBe('bosniaherz');
    expect(normName('Côte')).toBe('cte');
  });
});

describe('buildSnapshot', () => {
  it('applies provider scores to matching group fixtures and tracks sources', () => {
    const sources: SourceResult[] = [
      { label: 'openfootball', matches: [{ home: 'Mexico', away: 'South Africa', homeScore: 5, awayScore: 5 }] },
    ];
    const snap = buildSnapshot(MATCHES, sources, Date.parse('2026-06-20T00:00:00Z'));
    const m1 = snap.matches.find((m) => m.id === 1)!;
    expect(m1.score).toEqual({ home: 5, away: 5 });
    expect(m1.sources).toContain('openfootball');
    expect(snap.version).toBe(1);
    expect(snap.updatedUtc).toBe('2026-06-20T00:00:00.000Z');
  });

  it('does not mutate the base fixtures array', () => {
    const before = MATCHES.find((m) => m.id === 1)!.score;
    buildSnapshot(MATCHES, [
      { label: 'x', matches: [{ home: 'Mexico', away: 'South Africa', homeScore: 9, awayScore: 9 }] },
    ]);
    expect(MATCHES.find((m) => m.id === 1)!.score).toEqual(before);
  });

  it('leaves knockout fixtures untouched', () => {
    const snap = buildSnapshot(MATCHES, [
      { label: 'x', matches: [{ home: 'Winner E', away: 'Best 3rd ABCDF', homeScore: 1, awayScore: 0 }] },
    ]);
    const r32 = snap.matches.find((m) => m.stage === 'r32')!;
    expect(r32.score).toBeNull();
  });
});
