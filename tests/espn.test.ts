import { describe, it, expect } from 'vitest';
import {
  assignGroups,
  flagEmoji,
  mapScoreboard,
  mapSummary,
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

// (mapSummary tests appended below)

const summary = {
  header: {
    competitions: [
      {
        id: '760415',
        status: { type: { state: 'post', shortDetail: 'FT', description: 'Full Time' } },
        competitors: [
          { homeAway: 'home', team: { id: '203', displayName: 'Mexico' } },
          { homeAway: 'away', team: { id: '467', displayName: 'South Africa' } },
        ],
      },
    ],
  },
  gameInfo: {
    venue: { fullName: 'Estadio Banorte' },
    attendance: 80824,
    officials: [{ displayName: 'W. Sampaio', position: { displayName: 'Referee' } }],
  },
  odds: [{ details: 'MEX -1.5' }],
  rosters: [
    {
      homeAway: 'home',
      formation: '4-1-4-1',
      roster: [
        { jersey: '1', starter: true, formationPlace: '1', position: { abbreviation: 'G' }, athlete: { displayName: 'R. Rangel' }, stats: [] },
        { jersey: '9', starter: true, formationPlace: '11', position: { abbreviation: 'F' }, athlete: { displayName: 'J. Quiñones' }, stats: [{ abbreviation: 'G', value: 1 }] },
        { jersey: '17', starter: false, subbedIn: true, position: { abbreviation: 'M' }, athlete: { displayName: 'Sub Guy' }, stats: [], plays: [] },
      ],
    },
    {
      homeAway: 'away',
      formation: '4-4-2',
      roster: [
        { jersey: '1', starter: true, formationPlace: '1', position: { abbreviation: 'G' }, athlete: { displayName: 'A. Keeper' }, stats: [] },
      ],
    },
  ],
  boxscore: {
    teams: [
      { homeAway: 'home', statistics: [{ name: 'possessionPct', displayValue: '60.5' }, { name: 'totalShots', displayValue: '16' }, { name: 'passPct', displayValue: '0.9' }] },
      { homeAway: 'away', statistics: [{ name: 'possessionPct', displayValue: '39.5' }, { name: 'totalShots', displayValue: '6' }, { name: 'passPct', displayValue: '0.8' }] },
    ],
  },
  keyEvents: [
    { clock: { displayValue: "9'" }, type: { text: 'Goal' }, team: { id: '203' }, text: 'Goal! Mexico 1', participants: [{ athlete: { displayName: 'J. Quiñones' } }] },
    { clock: { displayValue: "30'" }, type: { text: 'Yellow Card' }, team: { id: '467' }, text: 'Yellow', participants: [{ athlete: { displayName: 'Someone' } }] },
    { clock: { displayValue: "1'" }, type: { text: 'Kickoff' }, team: {}, text: 'Kickoff' },
  ],
  commentary: [
    { time: { displayValue: "9'" }, text: 'Goal for Mexico!' },
    { time: { displayValue: '' }, text: 'Lineups announced.' },
  ],
  lastFiveGames: [
    { team: { id: '203' }, events: [{ gameDate: '2026-03-29', score: '0-0', gameResult: 'D', opponent: { abbreviation: 'POR' }, leagueAbbreviation: 'Friendly' }] },
    { team: { id: '467' }, events: [{ gameDate: '2026-03-20', score: '1-2', gameResult: 'L', opponent: { abbreviation: 'NGA' }, leagueAbbreviation: 'Friendly' }] },
  ],
  headToHeadGames: [
    { team: { id: '203' }, events: [{ gameDate: '2010-06-11', score: '1-1', gameResult: 'D', opponent: { abbreviation: 'RSA' }, leagueAbbreviation: 'WC' }] },
  ],
};

describe('mapSummary', () => {
  const d = mapSummary(summary);

  it('extracts core info: id, status, venue, referee, odds', () => {
    expect(d.id).toBe(760415);
    expect(d.status).toBe('finished');
    expect(d.info.venue).toBe('Estadio Banorte');
    expect(d.info.attendance).toBe(80824);
    expect(d.info.referee).toBe('W. Sampaio');
    expect(d.info.odds).toBe('MEX -1.5');
  });

  it('parses lineups with formation, starters, subs and goal markers', () => {
    expect(d.lineups!.home.formation).toBe('4-1-4-1');
    expect(d.lineups!.home.starters).toHaveLength(2);
    expect(d.lineups!.home.starters[0].pos).toBe('G'); // GK sorted first
    expect(d.lineups!.home.subs).toHaveLength(1);
    expect(d.lineups!.home.starters.find((p) => p.name === 'J. Quiñones')!.goals).toBe(1);
  });

  it('maps curated statistics in order and normalises percentages', () => {
    const poss = d.stats!.find((s) => s.key === 'possessionPct');
    expect(poss!.home).toBe(61); // rounded from 60.5
    expect(poss!.pct).toBe(true);
    const pass = d.stats!.find((s) => s.key === 'passPct');
    expect(pass!.home).toBe(90); // ratio 0.9 -> 90%
  });

  it('filters keyEvents to goals/cards/subs with side attribution', () => {
    expect(d.events!.every((e) => e.type !== 'other')).toBe(true);
    const goal = d.events!.find((e) => e.type === 'goal');
    expect(goal!.side).toBe('home');
    expect(goal!.players[0]).toBe('J. Quiñones');
  });

  it('keeps commentary and recent form and head-to-head', () => {
    expect(d.commentary!.length).toBe(2);
    expect(d.form!.home[0].result).toBe('D');
    expect(d.form!.away[0].result).toBe('L');
    expect(d.h2h![0].opponent).toBe('RSA');
  });

  it('degrades gracefully for an upcoming match with no rich data', () => {
    const up = mapSummary({
      header: { competitions: [{ id: '1', status: { type: { state: 'pre' } }, competitors: [] }] },
    });
    expect(up.status).toBe('upcoming');
    expect(up.lineups).toBeUndefined();
    expect(up.stats).toBeUndefined();
    expect(up.events).toBeUndefined();
  });
});
