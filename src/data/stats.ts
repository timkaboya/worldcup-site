import type { MatchStats } from '../lib/types';

// Per-match stats + goal timelines, ported from the POC drawer data.
// Keyed by fixture id. Only played matches have entries.
export const STATS: Record<number, MatchStats> = {
  9: {
    matchId: 9,
    home: { shots: 26, onTarget: 12, possession: 65, corners: 8, fouls: 10, yellow: 1, red: 0, offsides: 2 },
    away: { shots: 8, onTarget: 2, possession: 35, corners: 3, fouls: 14, yellow: 2, red: 0, offsides: 4 },
    goals: {
      home: [
        { minute: "6'", scorer: 'Nmecha' }, { minute: "38'", scorer: 'Schlotterbeck' },
        { minute: "45+5'", scorer: 'Havertz (pen)' }, { minute: "47'", scorer: 'Musiala' },
        { minute: "68'", scorer: 'Brown' }, { minute: "78'", scorer: 'Undav' }, { minute: "88'", scorer: 'Havertz' },
      ],
      away: [{ minute: "21'", scorer: 'Comenecia' }],
    },
  },
  10: {
    matchId: 10,
    home: { shots: 10, onTarget: 6, possession: 54, corners: 5, fouls: 11, yellow: 2, red: 0, offsides: 3 },
    away: { shots: 9, onTarget: 2, possession: 37, corners: 4, fouls: 12, yellow: 1, red: 0, offsides: 2 },
    goals: {
      home: [{ minute: "50'", scorer: 'Van Dijk' }, { minute: "64'", scorer: 'Summerville' }],
      away: [{ minute: "57'", scorer: 'Nakamura' }, { minute: "89'", scorer: 'Kamada' }],
    },
  },
  11: {
    matchId: 11,
    home: { shots: 14, onTarget: 3, possession: 48, corners: 6, fouls: 13, yellow: 2, red: 0, offsides: 1 },
    away: { shots: 12, onTarget: 4, possession: 44, corners: 5, fouls: 11, yellow: 3, red: 0, offsides: 2 },
    goals: { home: [{ minute: "90'", scorer: 'Diallo' }], away: [] },
  },
  12: {
    matchId: 12,
    home: { shots: 18, onTarget: 7, possession: 60, corners: 7, fouls: 9, yellow: 1, red: 0, offsides: 2 },
    away: { shots: 8, onTarget: 2, possession: 32, corners: 3, fouls: 13, yellow: 2, red: 0, offsides: 3 },
    goals: {
      home: [
        { minute: "7'", scorer: 'Ayari' }, { minute: "30'", scorer: 'Isak' }, { minute: "59'", scorer: 'Gyökeres' },
        { minute: "84'", scorer: 'Svanberg' }, { minute: "90+6'", scorer: 'Ayari' },
      ],
      away: [{ minute: "43'", scorer: 'Rekik' }],
    },
  },
  4: {
    matchId: 4,
    home: { shots: 16, onTarget: 8, possession: 55, corners: 6, fouls: 10, yellow: 1, red: 0, offsides: 2 },
    away: { shots: 7, onTarget: 1, possession: 37, corners: 2, fouls: 15, yellow: 3, red: 0, offsides: 1 },
    goals: {
      home: [
        { minute: "21'", scorer: 'Pulisic' }, { minute: "35'", scorer: 'Balogun' },
        { minute: "53'", scorer: 'Balogun' }, { minute: "75'", scorer: 'McKennie' },
      ],
      away: [{ minute: "62'", scorer: 'Mauricio' }],
    },
  },
  13: {
    matchId: 13,
    home: { shots: 18, onTarget: 4, possession: 68, corners: 9, fouls: 12, yellow: 1, red: 0, offsides: 3 },
    away: { shots: 5, onTarget: 1, possession: 32, corners: 2, fouls: 14, yellow: 2, red: 0, offsides: 1 },
    goals: { home: [], away: [] },
  },
  14: {
    matchId: 14,
    home: { shots: 14, onTarget: 5, possession: 55, corners: 7, fouls: 11, yellow: 2, red: 0, offsides: 2 },
    away: { shots: 10, onTarget: 3, possession: 45, corners: 4, fouls: 13, yellow: 1, red: 0, offsides: 1 },
    goals: {
      home: [{ minute: "66'", scorer: '(OG) Hany' }],
      away: [{ minute: "78'", scorer: 'E. Mohamed' }],
    },
  },
  15: {
    matchId: 15,
    home: { shots: 7, onTarget: 3, possession: 33, corners: 3, fouls: 13, yellow: 2, red: 0, offsides: 1 },
    away: { shots: 28, onTarget: 1, possession: 67, corners: 8, fouls: 10, yellow: 1, red: 0, offsides: 2 },
    goals: {
      home: [{ minute: "41'", scorer: 'Al-Amri' }],
      away: [{ minute: "80'", scorer: 'Araújo' }],
    },
  },
  16: {
    matchId: 16,
    home: { shots: 12, onTarget: 4, possession: 45, corners: 5, fouls: 14, yellow: 3, red: 0, offsides: 2 },
    away: { shots: 16, onTarget: 5, possession: 55, corners: 6, fouls: 11, yellow: 1, red: 0, offsides: 1 },
    goals: {
      home: [{ minute: "32'", scorer: 'Rezaeian' }, { minute: "64'", scorer: 'Mohebbi' }],
      away: [{ minute: "7'", scorer: 'Just' }, { minute: "54'", scorer: 'Just' }],
    },
  },
  17: {
    matchId: 17,
    home: { shots: 20, onTarget: 8, possession: 62, corners: 7, fouls: 11, yellow: 1, red: 0, offsides: 2 },
    away: { shots: 9, onTarget: 3, possession: 38, corners: 4, fouls: 13, yellow: 2, red: 0, offsides: 1 },
    goals: {
      home: [{ minute: "45'", scorer: 'Mbappé' }, { minute: "82'", scorer: 'Barcola' }, { minute: "90+6'", scorer: 'Mbappé' }],
      away: [{ minute: "90+5'", scorer: 'Mbaye' }],
    },
  },
  18: {
    matchId: 18,
    home: { shots: 22, onTarget: 9, possession: 58, corners: 6, fouls: 10, yellow: 1, red: 0, offsides: 3 },
    away: { shots: 10, onTarget: 3, possession: 42, corners: 4, fouls: 14, yellow: 2, red: 0, offsides: 2 },
    goals: {
      home: [
        { minute: "23'", scorer: 'Haaland' }, { minute: "39'", scorer: 'Haaland' },
        { minute: "67'", scorer: 'Nusa' }, { minute: "78'", scorer: 'Sørloth' },
      ],
      away: [{ minute: "51'", scorer: 'Allawi' }],
    },
  },
  19: {
    matchId: 19,
    home: { shots: 18, onTarget: 7, possession: 61, corners: 8, fouls: 9, yellow: 0, red: 0, offsides: 1 },
    away: { shots: 8, onTarget: 2, possession: 39, corners: 3, fouls: 12, yellow: 3, red: 0, offsides: 2 },
    goals: {
      home: [{ minute: "17'", scorer: 'Messi' }, { minute: "55'", scorer: 'Messi' }, { minute: "78'", scorer: 'Messi' }],
      away: [],
    },
  },
};
