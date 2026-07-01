import type { Match, Standing, StandingRow, Team } from './types';

function emptyRow(team: Team): StandingRow {
  return { team, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, qualification: null };
}

function sortRows(rows: StandingRow[]): StandingRow[] {
  return rows.slice().sort(
    (a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.name.localeCompare(b.team.name)
  );
}

/**
 * Compute group standings from group-stage matches that have a score.
 * Marks the top 2 of each group as auto-qualifiers and the best 8 third-placed
 * teams (by pts, gd, gf) as best3rd.
 */
export function computeStandings(matches: Match[]): Standing[] {
  const groups = new Map<string, Map<string, StandingRow>>();

  const ensure = (grp: string, team: Team) => {
    if (!groups.has(grp)) groups.set(grp, new Map());
    const g = groups.get(grp)!;
    if (!g.has(team.id)) g.set(team.id, emptyRow(team));
    return g.get(team.id)!;
  };

  // Register every group team first (so 0-match teams still appear).
  for (const m of matches) {
    if (m.stage !== 'group' || !m.group) continue;
    ensure(m.group, m.home);
    ensure(m.group, m.away);
  }

  // Apply results.
  for (const m of matches) {
    if (m.stage !== 'group' || !m.group || !m.score) continue;
    const h = ensure(m.group, m.home);
    const a = ensure(m.group, m.away);
    const { home, away } = m.score;
    h.p++; a.p++;
    h.gf += home; h.ga += away;
    a.gf += away; a.ga += home;
    if (home > away) { h.w++; h.pts += 3; a.l++; }
    else if (home < away) { a.w++; a.pts += 3; h.l++; }
    else { h.d++; a.d++; h.pts++; a.pts++; }
  }

  const standings: Standing[] = [];
  const thirds: StandingRow[] = [];

  for (const [grp, rowMap] of Array.from(groups.entries()).sort()) {
    const rows = sortRows(Array.from(rowMap.values()));
    rows.forEach((r) => (r.gd = r.gf - r.ga));
    if (rows[0]) rows[0].qualification = 'auto';
    if (rows[1]) rows[1].qualification = 'auto';
    if (rows[2]) thirds.push(rows[2]);
    standings.push({ group: grp, teams: rows });
  }

  // Best 8 third-placed teams advance in the 48-team format.
  sortRows(thirds).slice(0, 8).forEach((r) => (r.qualification = 'best3rd'));

  return standings;
}
