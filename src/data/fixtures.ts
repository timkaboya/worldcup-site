import type { Match, Stage, Team } from '../lib/types';

// Canonical WC2026 fixtures, ported from the original single-file POC.
// Kickoff times are UTC ISO-8601 — the single source of truth for time.
// Team ids are stable slugs derived from the team name.

export function teamId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

interface RawMatch {
  id: number;
  utc: string;
  home: string;
  away: string;
  hf: string;
  af: string;
  grp: string;
  stage: Stage;
  venue: string;
}

const RAW: RawMatch[] = [
  { id: 1, utc: '2026-06-12T01:00:00Z', home: 'Mexico', away: 'South Africa', hf: '🇲🇽', af: '🇿🇦', grp: 'A', stage: 'group', venue: 'Azteca, Mexico City' },
  { id: 2, utc: '2026-06-12T08:00:00Z', home: 'South Korea', away: 'Czechia', hf: '🇰🇷', af: '🇨🇿', grp: 'A', stage: 'group', venue: 'Akron, Zapopan' },
  { id: 3, utc: '2026-06-13T01:00:00Z', home: 'Canada', away: 'Bosnia & Herz.', hf: '🇨🇦', af: '🇧🇦', grp: 'B', stage: 'group', venue: 'BMO Field, Toronto' },
  { id: 4, utc: '2026-06-13T07:00:00Z', home: 'USA', away: 'Paraguay', hf: '🇺🇸', af: '🇵🇾', grp: 'D', stage: 'group', venue: 'SoFi Stadium, Inglewood' },
  { id: 5, utc: '2026-06-14T01:00:00Z', home: 'Qatar', away: 'Switzerland', hf: '🇶🇦', af: '🇨🇭', grp: 'B', stage: 'group', venue: "Levi's Stadium, Santa Clara" },
  { id: 6, utc: '2026-06-14T04:00:00Z', home: 'Brazil', away: 'Morocco', hf: '🇧🇷', af: '🇲🇦', grp: 'C', stage: 'group', venue: 'MetLife Stadium, NJ' },
  { id: 7, utc: '2026-06-14T07:00:00Z', home: 'Haiti', away: 'Scotland', hf: '🇭🇹', af: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', grp: 'C', stage: 'group', venue: 'Gillette, Foxborough' },
  { id: 8, utc: '2026-06-14T17:00:00Z', home: 'Australia', away: 'Türkiye', hf: '🇦🇺', af: '🇹🇷', grp: 'D', stage: 'group', venue: 'BC Place, Vancouver' },
  { id: 9, utc: '2026-06-14T19:00:00Z', home: 'Germany', away: 'Curaçao', hf: '🇩🇪', af: '🇨🇼', grp: 'E', stage: 'group', venue: 'NRG Stadium, Houston' },
  { id: 10, utc: '2026-06-14T20:00:00Z', home: 'Netherlands', away: 'Japan', hf: '🇳🇱', af: '🇯🇵', grp: 'F', stage: 'group', venue: 'AT&T Stadium, Arlington' },
  { id: 11, utc: '2026-06-15T05:00:00Z', home: 'Ivory Coast', away: 'Ecuador', hf: '🇨🇮', af: '🇪🇨', grp: 'E', stage: 'group', venue: 'Lincoln Financial, Philadelphia' },
  { id: 12, utc: '2026-06-15T08:00:00Z', home: 'Sweden', away: 'Tunisia', hf: '🇸🇪', af: '🇹🇳', grp: 'F', stage: 'group', venue: 'Estadio BBVA, Monterrey' },
  { id: 13, utc: '2026-06-15T16:00:00Z', home: 'Spain', away: 'Cape Verde', hf: '🇪🇸', af: '🇨🇻', grp: 'H', stage: 'group', venue: 'Mercedes-Benz, Atlanta' },
  { id: 14, utc: '2026-06-15T19:00:00Z', home: 'Belgium', away: 'Egypt', hf: '🇧🇪', af: '🇪🇬', grp: 'G', stage: 'group', venue: 'Lumen Field, Seattle' },
  { id: 15, utc: '2026-06-15T22:00:00Z', home: 'Saudi Arabia', away: 'Uruguay', hf: '🇸🇦', af: '🇺🇾', grp: 'H', stage: 'group', venue: 'Hard Rock, Miami' },
  { id: 16, utc: '2026-06-16T01:00:00Z', home: 'Iran', away: 'New Zealand', hf: '🇮🇷', af: '🇳🇿', grp: 'G', stage: 'group', venue: 'SoFi Stadium, Inglewood' },
  { id: 17, utc: '2026-06-16T19:00:00Z', home: 'France', away: 'Senegal', hf: '🇫🇷', af: '🇸🇳', grp: 'I', stage: 'group', venue: 'MetLife Stadium, NJ' },
  { id: 18, utc: '2026-06-16T22:00:00Z', home: 'Iraq', away: 'Norway', hf: '🇮🇶', af: '🇳🇴', grp: 'I', stage: 'group', venue: 'Gillette, Foxborough' },
  { id: 19, utc: '2026-06-17T01:00:00Z', home: 'Argentina', away: 'Algeria', hf: '🇦🇷', af: '🇩🇿', grp: 'J', stage: 'group', venue: 'Arrowhead, Kansas City' },
  { id: 20, utc: '2026-06-17T16:00:00Z', home: 'Austria', away: 'Jordan', hf: '🇦🇹', af: '🇯🇴', grp: 'J', stage: 'group', venue: "Levi's, Santa Clara" },
  { id: 21, utc: '2026-06-17T17:00:00Z', home: 'Portugal', away: 'DR Congo', hf: '🇵🇹', af: '🇨🇩', grp: 'K', stage: 'group', venue: 'NRG Stadium, Houston' },
  { id: 22, utc: '2026-06-17T20:00:00Z', home: 'England', away: 'Croatia', hf: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', af: '🇭🇷', grp: 'L', stage: 'group', venue: 'AT&T Stadium, Arlington' },
  { id: 23, utc: '2026-06-17T23:00:00Z', home: 'Ghana', away: 'Panama', hf: '🇬🇭', af: '🇵🇦', grp: 'L', stage: 'group', venue: 'BMO Field, Toronto' },
  { id: 24, utc: '2026-06-18T02:00:00Z', home: 'Uzbekistan', away: 'Colombia', hf: '🇺🇿', af: '🇨🇴', grp: 'K', stage: 'group', venue: 'Azteca, Mexico City' },
  { id: 25, utc: '2026-06-18T16:00:00Z', home: 'Czechia', away: 'South Africa', hf: '🇨🇿', af: '🇿🇦', grp: 'A', stage: 'group', venue: 'Mercedes-Benz, Atlanta' },
  { id: 26, utc: '2026-06-18T19:00:00Z', home: 'Switzerland', away: 'Bosnia & Herz.', hf: '🇨🇭', af: '🇧🇦', grp: 'B', stage: 'group', venue: 'SoFi Stadium, Inglewood' },
  { id: 27, utc: '2026-06-19T01:00:00Z', home: 'Canada', away: 'Qatar', hf: '🇨🇦', af: '🇶🇦', grp: 'B', stage: 'group', venue: 'BC Place, Vancouver' },
  { id: 28, utc: '2026-06-19T04:00:00Z', home: 'Mexico', away: 'South Korea', hf: '🇲🇽', af: '🇰🇷', grp: 'A', stage: 'group', venue: 'Akron, Zapopan' },
  { id: 29, utc: '2026-06-19T19:00:00Z', home: 'USA', away: 'Australia', hf: '🇺🇸', af: '🇦🇺', grp: 'D', stage: 'group', venue: 'Lumen Field, Seattle' },
  { id: 30, utc: '2026-06-20T01:00:00Z', home: 'Scotland', away: 'Morocco', hf: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', af: '🇲🇦', grp: 'C', stage: 'group', venue: 'Gillette, Foxborough' },
  { id: 31, utc: '2026-06-20T04:30:00Z', home: 'Brazil', away: 'Haiti', hf: '🇧🇷', af: '🇭🇹', grp: 'C', stage: 'group', venue: 'Lincoln Financial, Philadelphia' },
  { id: 32, utc: '2026-06-20T06:00:00Z', home: 'Türkiye', away: 'Paraguay', hf: '🇹🇷', af: '🇵🇾', grp: 'D', stage: 'group', venue: "Levi's, Santa Clara" },
  { id: 33, utc: '2026-06-20T17:00:00Z', home: 'Netherlands', away: 'Sweden', hf: '🇳🇱', af: '🇸🇪', grp: 'F', stage: 'group', venue: 'NRG Stadium, Houston' },
  { id: 34, utc: '2026-06-20T20:00:00Z', home: 'Germany', away: 'Ivory Coast', hf: '🇩🇪', af: '🇨🇮', grp: 'E', stage: 'group', venue: 'BMO Field, Toronto' },
  { id: 35, utc: '2026-06-21T05:00:00Z', home: 'Ecuador', away: 'Curaçao', hf: '🇪🇨', af: '🇨🇼', grp: 'E', stage: 'group', venue: 'Arrowhead, Kansas City' },
  { id: 36, utc: '2026-06-21T14:00:00Z', home: 'Tunisia', away: 'Japan', hf: '🇹🇳', af: '🇯🇵', grp: 'F', stage: 'group', venue: 'Estadio BBVA, Monterrey' },
  { id: 37, utc: '2026-06-21T16:00:00Z', home: 'Spain', away: 'Saudi Arabia', hf: '🇪🇸', af: '🇸🇦', grp: 'H', stage: 'group', venue: 'Mercedes-Benz, Atlanta' },
  { id: 38, utc: '2026-06-21T19:00:00Z', home: 'Belgium', away: 'Iran', hf: '🇧🇪', af: '🇮🇷', grp: 'G', stage: 'group', venue: 'SoFi Stadium, Inglewood' },
  { id: 39, utc: '2026-06-21T22:00:00Z', home: 'Uruguay', away: 'Cape Verde', hf: '🇺🇾', af: '🇨🇻', grp: 'H', stage: 'group', venue: 'Hard Rock, Miami' },
  { id: 40, utc: '2026-06-22T01:00:00Z', home: 'New Zealand', away: 'Egypt', hf: '🇳🇿', af: '🇪🇬', grp: 'G', stage: 'group', venue: 'BC Place, Vancouver' },
  { id: 41, utc: '2026-06-22T17:00:00Z', home: 'Argentina', away: 'Austria', hf: '🇦🇷', af: '🇦🇹', grp: 'J', stage: 'group', venue: 'AT&T Stadium, Arlington' },
  { id: 42, utc: '2026-06-22T21:00:00Z', home: 'France', away: 'Iraq', hf: '🇫🇷', af: '🇮🇶', grp: 'I', stage: 'group', venue: 'Lincoln Financial, Philadelphia' },
  { id: 43, utc: '2026-06-23T00:00:00Z', home: 'Norway', away: 'Senegal', hf: '🇳🇴', af: '🇸🇳', grp: 'I', stage: 'group', venue: 'MetLife Stadium, NJ' },
  { id: 44, utc: '2026-06-23T03:00:00Z', home: 'Jordan', away: 'Algeria', hf: '🇯🇴', af: '🇩🇿', grp: 'J', stage: 'group', venue: "Levi's, Santa Clara" },
  { id: 45, utc: '2026-06-23T17:00:00Z', home: 'Portugal', away: 'Uzbekistan', hf: '🇵🇹', af: '🇺🇿', grp: 'K', stage: 'group', venue: 'NRG Stadium, Houston' },
  { id: 46, utc: '2026-06-23T20:00:00Z', home: 'England', away: 'Ghana', hf: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', af: '🇬🇭', grp: 'L', stage: 'group', venue: 'Gillette, Foxborough' },
  { id: 47, utc: '2026-06-23T23:00:00Z', home: 'Panama', away: 'Croatia', hf: '🇵🇦', af: '🇭🇷', grp: 'L', stage: 'group', venue: 'BMO Field, Toronto' },
  { id: 48, utc: '2026-06-24T02:00:00Z', home: 'Colombia', away: 'DR Congo', hf: '🇨🇴', af: '🇨🇩', grp: 'K', stage: 'group', venue: 'Akron, Zapopan' },
  { id: 49, utc: '2026-06-24T19:00:00Z', home: 'Switzerland', away: 'Canada', hf: '🇨🇭', af: '🇨🇦', grp: 'B', stage: 'group', venue: 'BC Place, Vancouver' },
  { id: 50, utc: '2026-06-24T19:00:00Z', home: 'Bosnia & Herz.', away: 'Qatar', hf: '🇧🇦', af: '🇶🇦', grp: 'B', stage: 'group', venue: 'Lumen Field, Seattle' },
  { id: 51, utc: '2026-06-25T01:00:00Z', home: 'Scotland', away: 'Brazil', hf: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', af: '🇧🇷', grp: 'C', stage: 'group', venue: 'Hard Rock, Miami' },
  { id: 52, utc: '2026-06-25T01:00:00Z', home: 'Morocco', away: 'Haiti', hf: '🇲🇦', af: '🇭🇹', grp: 'C', stage: 'group', venue: 'Mercedes-Benz, Atlanta' },
  { id: 53, utc: '2026-06-25T04:00:00Z', home: 'Czechia', away: 'Mexico', hf: '🇨🇿', af: '🇲🇽', grp: 'A', stage: 'group', venue: 'Azteca, Mexico City' },
  { id: 54, utc: '2026-06-25T04:00:00Z', home: 'South Africa', away: 'South Korea', hf: '🇿🇦', af: '🇰🇷', grp: 'A', stage: 'group', venue: 'BBVA, Monterrey' },
  { id: 55, utc: '2026-06-26T02:00:00Z', home: 'Curaçao', away: 'Ivory Coast', hf: '🇨🇼', af: '🇨🇮', grp: 'E', stage: 'group', venue: 'Lincoln Financial, Philadelphia' },
  { id: 56, utc: '2026-06-26T02:00:00Z', home: 'Ecuador', away: 'Germany', hf: '🇪🇨', af: '🇩🇪', grp: 'E', stage: 'group', venue: 'MetLife Stadium, NJ' },
  { id: 57, utc: '2026-06-26T05:00:00Z', home: 'Japan', away: 'Sweden', hf: '🇯🇵', af: '🇸🇪', grp: 'F', stage: 'group', venue: 'AT&T Stadium, Arlington' },
  { id: 58, utc: '2026-06-26T05:00:00Z', home: 'Tunisia', away: 'Netherlands', hf: '🇹🇳', af: '🇳🇱', grp: 'F', stage: 'group', venue: 'Arrowhead, Kansas City' },
  { id: 59, utc: '2026-06-26T08:00:00Z', home: 'Türkiye', away: 'USA', hf: '🇹🇷', af: '🇺🇸', grp: 'D', stage: 'group', venue: 'SoFi Stadium, Inglewood' },
  { id: 60, utc: '2026-06-26T08:00:00Z', home: 'Paraguay', away: 'Australia', hf: '🇵🇾', af: '🇦🇺', grp: 'D', stage: 'group', venue: "Levi's, Santa Clara" },
  { id: 61, utc: '2026-06-26T19:00:00Z', home: 'Norway', away: 'France', hf: '🇳🇴', af: '🇫🇷', grp: 'I', stage: 'group', venue: 'Gillette, Foxborough' },
  { id: 62, utc: '2026-06-26T19:00:00Z', home: 'Senegal', away: 'Iraq', hf: '🇸🇳', af: '🇮🇶', grp: 'I', stage: 'group', venue: 'BMO Field, Toronto' },
  { id: 63, utc: '2026-06-27T00:00:00Z', home: 'Cape Verde', away: 'Saudi Arabia', hf: '🇨🇻', af: '🇸🇦', grp: 'H', stage: 'group', venue: 'NRG Stadium, Houston' },
  { id: 64, utc: '2026-06-27T00:00:00Z', home: 'Uruguay', away: 'Spain', hf: '🇺🇾', af: '🇪🇸', grp: 'H', stage: 'group', venue: 'Akron, Zapopan' },
  { id: 65, utc: '2026-06-27T03:00:00Z', home: 'Egypt', away: 'Iran', hf: '🇪🇬', af: '🇮🇷', grp: 'G', stage: 'group', venue: 'Lumen Field, Seattle' },
  { id: 66, utc: '2026-06-27T03:00:00Z', home: 'New Zealand', away: 'Belgium', hf: '🇳🇿', af: '🇧🇪', grp: 'G', stage: 'group', venue: 'BC Place, Vancouver' },
  { id: 67, utc: '2026-06-27T21:00:00Z', home: 'Panama', away: 'England', hf: '🇵🇦', af: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', grp: 'L', stage: 'group', venue: 'MetLife Stadium, NJ' },
  { id: 68, utc: '2026-06-27T21:00:00Z', home: 'Croatia', away: 'Ghana', hf: '🇭🇷', af: '🇬🇭', grp: 'L', stage: 'group', venue: 'Lincoln Financial, Philadelphia' },
  { id: 69, utc: '2026-06-28T00:30:00Z', home: 'Colombia', away: 'Portugal', hf: '🇨🇴', af: '🇵🇹', grp: 'K', stage: 'group', venue: 'Hard Rock, Miami' },
  { id: 70, utc: '2026-06-28T00:30:00Z', home: 'DR Congo', away: 'Uzbekistan', hf: '🇨🇩', af: '🇺🇿', grp: 'K', stage: 'group', venue: 'Mercedes-Benz, Atlanta' },
  { id: 71, utc: '2026-06-28T02:00:00Z', home: 'Algeria', away: 'Austria', hf: '🇩🇿', af: '🇦🇹', grp: 'J', stage: 'group', venue: 'Arrowhead, Kansas City' },
  { id: 72, utc: '2026-06-28T02:00:00Z', home: 'Jordan', away: 'Argentina', hf: '🇯🇴', af: '🇦🇷', grp: 'J', stage: 'group', venue: 'AT&T Stadium, Arlington' },
  { id: 73, utc: '2026-06-28T19:00:00Z', home: 'Runner-up A', away: 'Runner-up B', hf: '⚽', af: '⚽', grp: '', stage: 'r32', venue: 'SoFi Stadium, Inglewood' },
  { id: 74, utc: '2026-06-29T00:30:00Z', home: 'Winner E', away: 'Best 3rd ABCDF', hf: '⚽', af: '⚽', grp: '', stage: 'r32', venue: 'Gillette, Foxborough' },
  { id: 75, utc: '2026-06-28T21:00:00Z', home: 'Winner F', away: 'Runner-up C', hf: '⚽', af: '⚽', grp: '', stage: 'r32', venue: 'BBVA, Monterrey' },
  { id: 76, utc: '2026-06-29T17:00:00Z', home: 'Winner C', away: 'Runner-up F', hf: '⚽', af: '⚽', grp: '', stage: 'r32', venue: 'NRG Stadium, Houston' },
  { id: 77, utc: '2026-06-30T04:00:00Z', home: 'Winner I', away: 'Best 3rd CDFGH', hf: '⚽', af: '⚽', grp: '', stage: 'r32', venue: 'MetLife Stadium, NJ' },
  { id: 78, utc: '2026-06-30T17:00:00Z', home: 'Runner-up E', away: 'Runner-up I', hf: '⚽', af: '⚽', grp: '', stage: 'r32', venue: 'AT&T Stadium, Arlington' },
  { id: 79, utc: '2026-06-30T23:00:00Z', home: 'Winner A', away: 'Best 3rd CEFHI', hf: '⚽', af: '⚽', grp: '', stage: 'r32', venue: 'Azteca, Mexico City' },
  { id: 80, utc: '2026-07-01T16:00:00Z', home: 'Winner L', away: 'Best 3rd EHIJK', hf: '⚽', af: '⚽', grp: '', stage: 'r32', venue: 'Mercedes-Benz, Atlanta' },
  { id: 81, utc: '2026-07-02T00:00:00Z', home: 'Winner D', away: 'Best 3rd BEFIJ', hf: '⚽', af: '⚽', grp: '', stage: 'r32', venue: "Levi's, Santa Clara" },
  { id: 82, utc: '2026-07-01T20:00:00Z', home: 'Winner G', away: 'Best 3rd AEHIJ', hf: '⚽', af: '⚽', grp: '', stage: 'r32', venue: 'Lumen Field, Seattle' },
  { id: 83, utc: '2026-07-02T23:00:00Z', home: 'Runner-up K', away: 'Runner-up L', hf: '⚽', af: '⚽', grp: '', stage: 'r32', venue: 'BMO Field, Toronto' },
  { id: 84, utc: '2026-07-02T19:00:00Z', home: 'Winner H', away: 'Runner-up J', hf: '⚽', af: '⚽', grp: '', stage: 'r32', venue: 'SoFi Stadium, Inglewood' },
  { id: 85, utc: '2026-07-03T03:00:00Z', home: 'Winner B', away: 'Best 3rd EFGIJ', hf: '⚽', af: '⚽', grp: '', stage: 'r32', venue: 'BC Place, Vancouver' },
  { id: 86, utc: '2026-07-03T22:00:00Z', home: 'Winner J', away: 'Runner-up H', hf: '⚽', af: '⚽', grp: '', stage: 'r32', venue: 'Hard Rock, Miami' },
  { id: 87, utc: '2026-07-04T01:30:00Z', home: 'Winner K', away: 'Best 3rd DEIJL', hf: '⚽', af: '⚽', grp: '', stage: 'r32', venue: 'Arrowhead, Kansas City' },
  { id: 88, utc: '2026-07-03T18:00:00Z', home: 'Runner-up D', away: 'Runner-up G', hf: '⚽', af: '⚽', grp: '', stage: 'r32', venue: 'AT&T Stadium, Arlington' },
  { id: 89, utc: '2026-07-04T20:00:00Z', home: 'W74', away: 'W77', hf: '⚽', af: '⚽', grp: '', stage: 'r16', venue: 'Lincoln Financial, Philadelphia' },
  { id: 90, utc: '2026-07-04T17:00:00Z', home: 'W73', away: 'W75', hf: '⚽', af: '⚽', grp: '', stage: 'r16', venue: 'NRG Stadium, Houston' },
  { id: 91, utc: '2026-07-05T20:00:00Z', home: 'W76', away: 'W78', hf: '⚽', af: '⚽', grp: '', stage: 'r16', venue: 'MetLife Stadium, NJ' },
  { id: 92, utc: '2026-07-06T00:00:00Z', home: 'W79', away: 'W80', hf: '⚽', af: '⚽', grp: '', stage: 'r16', venue: 'Azteca, Mexico City' },
  { id: 93, utc: '2026-07-06T19:00:00Z', home: 'W83', away: 'W84', hf: '⚽', af: '⚽', grp: '', stage: 'r16', venue: 'AT&T Stadium, Arlington' },
  { id: 94, utc: '2026-07-07T00:00:00Z', home: 'W81', away: 'W82', hf: '⚽', af: '⚽', grp: '', stage: 'r16', venue: 'Lumen Field, Seattle' },
  { id: 95, utc: '2026-07-07T16:00:00Z', home: 'W86', away: 'W88', hf: '⚽', af: '⚽', grp: '', stage: 'r16', venue: 'Mercedes-Benz, Atlanta' },
  { id: 96, utc: '2026-07-07T20:00:00Z', home: 'W85', away: 'W87', hf: '⚽', af: '⚽', grp: '', stage: 'r16', venue: 'BC Place, Vancouver' },
  { id: 97, utc: '2026-07-09T20:00:00Z', home: 'W89', away: 'W90', hf: '⚽', af: '⚽', grp: '', stage: 'qf', venue: 'Gillette, Foxborough' },
  { id: 98, utc: '2026-07-10T19:00:00Z', home: 'W93', away: 'W94', hf: '⚽', af: '⚽', grp: '', stage: 'qf', venue: 'SoFi Stadium, Inglewood' },
  { id: 99, utc: '2026-07-11T21:00:00Z', home: 'W91', away: 'W92', hf: '⚽', af: '⚽', grp: '', stage: 'qf', venue: 'Hard Rock, Miami' },
  { id: 100, utc: '2026-07-12T01:00:00Z', home: 'W95', away: 'W96', hf: '⚽', af: '⚽', grp: '', stage: 'qf', venue: 'Arrowhead, Kansas City' },
  { id: 101, utc: '2026-07-14T19:00:00Z', home: 'W97', away: 'W98', hf: '⚽', af: '⚽', grp: '', stage: 'sf', venue: 'AT&T Stadium, Dallas' },
  { id: 102, utc: '2026-07-15T19:00:00Z', home: 'W99', away: 'W100', hf: '⚽', af: '⚽', grp: '', stage: 'sf', venue: 'Mercedes-Benz, Atlanta' },
  { id: 103, utc: '2026-07-18T21:00:00Z', home: '3rd Place Match', away: '', hf: '🥉', af: '', grp: '', stage: 'final', venue: 'Hard Rock, Miami' },
  { id: 104, utc: '2026-07-19T19:00:00Z', home: 'World Cup Final', away: '', hf: '🏆', af: '', grp: '', stage: 'final', venue: 'MetLife Stadium, NJ' },
];

// Confirmed/seeded scores from the POC — baseline until reconciled with live sources.
export const SEED_SCORES: Record<number, { home: number; away: number }> = {
  1: { home: 2, away: 0 }, 2: { home: 2, away: 1 }, 3: { home: 1, away: 1 }, 4: { home: 4, away: 1 },
  5: { home: 1, away: 1 }, 6: { home: 1, away: 1 }, 7: { home: 0, away: 1 }, 8: { home: 2, away: 0 },
  9: { home: 7, away: 1 }, 10: { home: 2, away: 2 }, 11: { home: 1, away: 0 }, 12: { home: 5, away: 1 },
  13: { home: 0, away: 0 }, 14: { home: 1, away: 1 }, 15: { home: 1, away: 1 }, 16: { home: 2, away: 2 },
  17: { home: 3, away: 1 }, 18: { home: 4, away: 1 }, 19: { home: 3, away: 0 },
};

function toTeam(name: string, flag: string, grp: string): Team {
  return { id: teamId(name), name, flag, ...(grp ? { group: grp } : {}) };
}

export const MATCHES: Match[] = RAW.map((m) => ({
  id: m.id,
  utc: m.utc,
  stage: m.stage,
  ...(m.grp ? { group: m.grp } : {}),
  home: toTeam(m.home, m.hf, m.grp),
  away: toTeam(m.away, m.af, m.grp),
  venue: m.venue,
  score: SEED_SCORES[m.id] ?? null,
}));
