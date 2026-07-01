import { useEffect, useState } from 'preact/hooks';
import type { Match, Standing } from '../lib/types';
import { fetchScores, fetchStandings } from '../lib/api';
import { computeStandings } from '../lib/standings';

function EmojiFlag({ e }: { e: string }) {
  return <span class="ef">{e}</span>;
}

export default function Tables() {
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);

  async function refresh() {
    try {
      // Prefer the official (ESPN) standings — correct tiebreakers & advancement.
      const res = await fetchStandings();
      if (res.standings.length) {
        setStandings(res.standings);
        setLive(res.live);
      } else {
        // Fall back to computing from live match scores.
        const s = await fetchScores();
        setStandings(computeStandings(s.snapshot.matches as Match[]));
        setLive(s.live);
      }
    } catch {
      /* keep last render */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    const poll = setInterval(refresh, 60_000);
    return () => clearInterval(poll);
  }, []);

  if (loading) return <div class="sched-empty">Loading tables…</div>;

  return (
    <div>
      <div class="tbl-intro">
        <p>
          Top 2 of each group <span class="q-auto">■</span> plus the 8 best third-placed teams
          <span class="q-b3">■</span> advance to the Round of 32.
          {!live && <span class="tbl-note"> · Live sources unreachable, showing confirmed results.</span>}
        </p>
      </div>
      <div class="tbl-grid">
        {standings.map((s) => (
          <div class="grp-card" key={s.group}>
            <div class="grp-hdr">Group {s.group}</div>
            <table class="grp-tbl">
              <thead>
                <tr>
                  <th class="c-pos">#</th>
                  <th class="c-team">Team</th>
                  <th>P</th><th>W</th><th>D</th><th>L</th>
                  <th class="hide-sm">GF</th><th class="hide-sm">GA</th>
                  <th>GD</th><th class="c-pts">Pts</th>
                </tr>
              </thead>
              <tbody>
                {s.teams.map((r, i) => (
                  <tr
                    class={r.qualification === 'auto' ? 'q-row-auto' : r.qualification === 'best3rd' ? 'q-row-b3' : ''}
                    key={r.team.id}
                  >
                    <td class="c-pos">{i + 1}</td>
                    <td class="c-team"><EmojiFlag e={r.team.flag} /> {r.team.name}</td>
                    <td>{r.p}</td><td>{r.w}</td><td>{r.d}</td><td>{r.l}</td>
                    <td class="hide-sm">{r.gf}</td><td class="hide-sm">{r.ga}</td>
                    <td>{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                    <td class="c-pts">{r.pts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
