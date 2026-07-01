import { describe, it, expect } from 'vitest';
import { MATCHES, SEED_SCORES, teamId } from '../src/data/fixtures';

describe('fixtures', () => {
  it('has all 104 matches with unique ids', () => {
    expect(MATCHES).toHaveLength(104);
    const ids = new Set(MATCHES.map((m) => m.id));
    expect(ids.size).toBe(104);
  });

  it('has valid ISO kickoff times', () => {
    for (const m of MATCHES) {
      expect(Number.isNaN(new Date(m.utc).getTime())).toBe(false);
    }
  });

  it('assigns seeded scores to the right matches', () => {
    for (const [id, s] of Object.entries(SEED_SCORES)) {
      const m = MATCHES.find((x) => x.id === Number(id))!;
      expect(m.score).toEqual(s);
    }
  });

  it('slugifies team ids stably', () => {
    expect(teamId('South Korea')).toBe('south-korea');
    expect(teamId('Bosnia & Herz.')).toBe('bosnia-herz');
    expect(teamId('Côte')).toBe('c-te');
  });

  it('tags group-stage matches with a group', () => {
    const groupMatches = MATCHES.filter((m) => m.stage === 'group');
    expect(groupMatches.length).toBe(72);
    for (const m of groupMatches) expect(m.group).toBeTruthy();
  });
});
