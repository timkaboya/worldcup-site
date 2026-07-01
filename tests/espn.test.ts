import { describe, it, expect } from 'vitest';
import {
  assignGroups,
  flagEmoji,
  mapScoreboard,
  parseStandings,
  stageFromSlug,
  statusFromState,
  teamId,
} from '../src/lib/espn';

describe('flagEmoji', () => {
  it('maps alpha-2 codes to regional-indicator emoji', () => {
    expect(flagEmoji('BRA')).toBe('🇧🇷');
    expect(flagEmoji('USA')).toBe('🇺🇸');
    expect(flagEmoji('JPN')).toBe('🇯🇵');
  });
  it('handles subdivision flags and unknowns', () => {
    expect(flagEmoji('ENG')).toContain('🏴');
    expect(flagEmoji('SCO')).toContain('🏴');
    expect(flagEmoji('ZZZ')).toBe('⚽');
  });
});

describe('stageFromSlug / statusFromState', () => {
  it('maps ESPN slugs to stages', () => {
    expect(stageFromSlug('group-stage')).toBe('group');
    expect(stageFromSlug('round-of-32')).toBe('r32');
    expect(stageFromSlug('round-of-16')).toBe('r16');
    expect(stageFromSlug('quarterfinals')).toBe('qf');
    expect(stageFromSlug('semifinals')).toBe('sf');
    expect(stageFromSlug('final')).toBe('final');
  });
  it('maps ESPN states to statuses', () => {
    expect(statusFromState('pre')).toBe('upcoming');
    expect(statusFromState('in')).toBe('live');
    expect(statusFromState('post')).toBe('finished');
  });
});

const scoreboard = {
  events: [
    {
      id: '999001',
      date: '2026-06-15T16:00Z',
      season: { slug: 'group-stage' },
      status: { type: { state: 'post' } },
      competitions: [
        {
          venue: { fullName: 'Mercedes-Benz', address: { city: 'Atlanta' } },
          notes: [],
          competitors: [
            { homeAway: 'home', score: '4', winner: true, team: { shortDisplayName: 'Spain', abbreviation: 'ESP' } },
            { homeAway: 'away', score: '0', winner: false, team: { shortDisplayName: 'Cape Verde', abbreviation: 'CPV' } },
          ],
        },
      ],
    },
    {
      id: '999002',
      date: '2026-06-29T20:30Z',
      season: { slug: 'round-of-32' },
      status: { type: { state: 'post' } },
      competitions: [
        {
          venue: { fullName: 'NRG Stadium', address: { city: 'Houston' } },
          notes: [{ headline: 'Paraguay advance 4-3 on penalties' }],
          competitors: [
            { homeAway: 'home', score: '1', winner: false, team: { shortDisplayName: 'Germany', abbreviation: 'GER' } },
            { homeAway: 'away', score: '1', winner: true, team: { shortDisplayName: 'Paraguay', abbreviation: 'PAR' } },
          ],
        },
      ],
    },
    {
      id: '999003',
      date: '2026-07-04T17:00Z',
      season: { slug: 'round-of-16' },
      status: { type: { state: 'pre' } },
      competitions: [
        {
          venue: { fullName: 'NRG Stadium', address: { city: 'Houston' } },
          competitors: [
            { homeAway: 'home', score: '0', team: { shortDisplayName: 'Canada', abbreviation: 'CAN' } },
            { homeAway: 'away', score: '0', team: { shortDisplayName: 'Morocco', abbreviation: 'MAR' } },
          ],
        },
      ],
    },
  ],
};

describe('mapScoreboard', () => {
  const matches = mapScoreboard(scoreboard);

  it('maps every event to a Match', () => {
    expect(matches).toHaveLength(3);
  });

  it('captures real scores, stages, venues and flags', () => {
    const esp = matches.find((m) => m.id === 999001)!;
    expect(esp.stage).toBe('group');
    expect(esp.home.name).toBe('Spain');
    expect(esp.home.flag).toBe('🇪🇸');
    expect(esp.score).toEqual({ home: 4, away: 0 });
    expect(esp.status).toBe('finished');
    expect(esp.venue).toBe('Mercedes-Benz, Atlanta');
    expect(esp.winner).toBe('home');
  });

  it('captures penalty-shootout notes and winner on the losing scoreline', () => {
    const ger = matches.find((m) => m.id === 999002)!;
    expect(ger.stage).toBe('r32');
    expect(ger.note).toMatch(/penalties/);
    expect(ger.winner).toBe('away');
  });

  it('leaves upcoming matches without a score', () => {
    const r16 = matches.find((m) => m.id === 999003)!;
    expect(r16.status).toBe('upcoming');
    expect(r16.score).toBeNull();
  });
});

const standings = {
  children: [
    {
      name: 'Group A',
      standings: {
        entries: [
          {
            team: { shortDisplayName: 'Mexico', displayName: 'Mexico', abbreviation: 'MEX' },
            stats: [
              { name: 'gamesPlayed', value: 3 }, { name: 'wins', value: 3 }, { name: 'ties', value: 0 },
              { name: 'losses', value: 0 }, { name: 'pointsFor', value: 6 }, { name: 'pointsAgainst', value: 0 },
              { name: 'pointDifferential', value: 6 }, { name: 'points', value: 9 }, { name: 'rank', value: 1 },
              { name: 'advanced', value: 1 },
            ],
          },
          {
            team: { shortDisplayName: 'Czechia', displayName: 'Czechia', abbreviation: 'CZE' },
            stats: [
              { name: 'gamesPlayed', value: 3 }, { name: 'wins', value: 0 }, { name: 'ties', value: 1 },
              { name: 'losses', value: 2 }, { name: 'pointsFor', value: 2 }, { name: 'pointsAgainst', value: 6 },
              { name: 'pointDifferential', value: -4 }, { name: 'points', value: 1 }, { name: 'rank', value: 4 },
            ],
          },
        ],
      },
    },
  ],
};

describe('parseStandings', () => {
  const { standings: rows, groupOf } = parseStandings(standings);

  it('parses group tables with points and rank ordering', () => {
    expect(rows).toHaveLength(1);
    expect(rows[0].group).toBe('A');
    expect(rows[0].teams[0].team.name).toBe('Mexico');
    expect(rows[0].teams[0].pts).toBe(9);
    expect(rows[0].teams[0].qualification).toBe('auto');
    expect(rows[0].teams[0].advanced).toBe(true);
  });

  it('builds a team-id -> group lookup used to tag matches', () => {
    expect(groupOf[teamId('Mexico')]).toBe('A');
    const tagged = assignGroups(mapScoreboard(scoreboard), groupOf);
    // The group-stage Spain match has no team in group A, so it stays untagged here.
    expect(tagged.find((m) => m.id === 999001)!.group).toBeUndefined();
  });
});
