import type { Scorer } from '../lib/types';
import { teamId } from './fixtures';

// Golden Boot data, ported from the POC. Ranked by goals, ties broken by assists.
const RAW: { name: string; team: string; flag: string; goals: number; assists: number }[] = [
  { name: 'Lionel Messi', team: 'Argentina', flag: '🇦🇷', goals: 3, assists: 0 },
  { name: 'Erling Haaland', team: 'Norway', flag: '🇳🇴', goals: 2, assists: 0 },
  { name: 'Kylian Mbappé', team: 'France', flag: '🇫🇷', goals: 2, assists: 0 },
  { name: 'Folarin Balogun', team: 'USA', flag: '🇺🇸', goals: 2, assists: 0 },
  { name: 'Kai Havertz', team: 'Germany', flag: '🇩🇪', goals: 2, assists: 1 },
  { name: 'Yasin Ayari', team: 'Sweden', flag: '🇸🇪', goals: 2, assists: 0 },
  { name: 'Elijah Just', team: 'New Zealand', flag: '🇳🇿', goals: 2, assists: 1 },
  { name: 'Bradley Barcola', team: 'France', flag: '🇫🇷', goals: 1, assists: 0 },
  { name: 'Alexander Isak', team: 'Sweden', flag: '🇸🇪', goals: 1, assists: 1 },
  { name: 'Viktor Gyökéres', team: 'Sweden', flag: '🇸🇪', goals: 1, assists: 0 },
  { name: 'Amad Diallo', team: 'Ivory Coast', flag: '🇨🇮', goals: 1, assists: 0 },
  { name: 'Raül Jiménez', team: 'Mexico', flag: '🇲🇽', goals: 1, assists: 0 },
  { name: 'A. Al-Amri', team: 'Saudi Arabia', flag: '🇸🇦', goals: 1, assists: 0 },
  { name: 'Maxi Araújo', team: 'Uruguay', flag: '🇺🇾', goals: 1, assists: 0 },
  { name: 'Ramin Rezaeian', team: 'Iran', flag: '🇮🇷', goals: 1, assists: 0 },
  { name: 'M. Mohebbi', team: 'Iran', flag: '🇮🇷', goals: 1, assists: 0 },
];

export const SCORERS: Scorer[] = RAW.map((s) => ({
  name: s.name,
  team: { id: teamId(s.team), name: s.team, flag: s.flag },
  goals: s.goals,
  assists: s.assists,
})).sort((a, b) => b.goals - a.goals || b.assists - a.assists || a.name.localeCompare(b.name));
