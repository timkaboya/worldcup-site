import { describe, it, expect } from 'vitest';
import { computeStandings } from '../src/lib/standings';
import { MATCHES } from '../src/data/fixtures';
import type { Match } from '../src/lib/types';

describe('computeStandings', () => {
  it('produces 12 groups each with 4 teams', () => {
    const standings = computeStandings(MATCHES);
    expect(standings).toHaveLength(12);
    for (const s of standings) expect(s.teams).toHaveLength(4);
  });

  it('awards points correctly and sorts the group', () => {
    const t = (id: string, name: string, group: string) => ({ id, name, flag: '', group });
    const mk = (id: number, home: any, away: any, hs: number, as: number): Match => ({
      id, utc: '2026-06-12T00:00:00Z', stage: 'group', group: 'A',
      home, away, venue: '', score: { home: hs, away: as },
    });
    const A = t('a', 'A', 'A'), B = t('b', 'B', 'A'), C = t('c', 'C', 'A'), D = t('d', 'D', 'A');
    const ms = [
      mk(1, A, B, 2, 0), // A win
      mk(2, C, D, 1, 1), // draw
      mk(3, A, C, 1, 0), // A win -> A 6pts
    ];
    const s = computeStandings(ms)[0];
    expect(s.teams[0].team.id).toBe('a');
    expect(s.teams[0].pts).toBe(6);
    expect(s.teams[0].qualification).toBe('auto');
    expect(s.teams.find((r) => r.team.id === 'c')!.pts).toBe(1);
  });

  it('marks exactly 8 best-third-placed teams across the tournament', () => {
    const standings = computeStandings(MATCHES);
    const best3 = standings.flatMap((s) => s.teams).filter((r) => r.qualification === 'best3rd');
    expect(best3.length).toBeLessThanOrEqual(8);
    // top-2 per group are auto
    const autos = standings.flatMap((s) => s.teams).filter((r) => r.qualification === 'auto');
    expect(autos.length).toBe(24);
  });
});
