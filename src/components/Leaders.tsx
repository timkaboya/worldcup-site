import { useEffect, useMemo, useState } from 'preact/hooks';
import type { Scorer } from '../lib/types';
import { fetchLeaders } from '../lib/api';

interface Props {
  kind: 'scorers' | 'assists';
  initial: Scorer[];
}

interface Ranked extends Scorer {
  rank: number;
}

// Rank a leaderboard by its primary stat, sharing a rank across ties.
function rankRows(rows: Scorer[], primary: (s: Scorer) => number): Ranked[] {
  let rank = 0;
  let prev = -1;
  return rows.map((s, i) => {
    const v = primary(s);
    if (v !== prev) rank = i + 1;
    prev = v;
    return { ...s, rank };
  });
}

export default function Leaders({ kind, initial }: Props) {
  const [rows, setRows] = useState<Scorer[]>(initial);

  async function refresh() {
    try {
      const res = await fetchLeaders();
      const next = kind === 'scorers' ? res.scorers : res.assists;
      if (next.length) setRows(next);
    } catch {
      /* keep last render */
    }
  }

  useEffect(() => {
    refresh();
    const poll = setInterval(refresh, 60_000);
    return () => clearInterval(poll);
  }, []);

  const primary = (s: Scorer) => (kind === 'scorers' ? s.goals : s.assists);
  const ranked = useMemo(() => rankRows(rows, primary), [rows]);
  const max = useMemo(() => Math.max(...ranked.map(primary), 1), [ranked]);

  if (!ranked.length) {
    return (
      <p class="page-sub" style="margin-top:1rem">
        No {kind === 'scorers' ? 'goals' : 'assists'} recorded yet — check back after the next
        round of matches.
      </p>
    );
  }

  return (
    <ol class="scorer-list">
      {ranked.map((s) => {
        const val = primary(s);
        const lbl =
          kind === 'scorers' ? (val === 1 ? 'goal' : 'goals') : val === 1 ? 'assist' : 'assists';
        const secondary = kind === 'scorers' ? s.assists : s.goals;
        const secondaryUnit = kind === 'scorers' ? 'A' : 'G';
        return (
          <li class={`scorer-row${s.rank === 1 ? ' lead' : ''}`}>
            <span class="sc-rank">{s.rank}</span>
            <span class="sc-flag ef">{s.team.flag}</span>
            <span class="sc-name">
              <span class="sc-player">{s.name}</span>
              <span class="sc-team">{s.team.name}</span>
            </span>
            <span class="sc-bar-wrap">
              <span class="sc-bar" style={`width:${(val / max) * 100}%`}></span>
            </span>
            <span class="sc-stat">
              <span class="sc-goals">{val}</span>
              <span class="sc-goals-lbl">{lbl}</span>
              {secondary > 0 && (
                <span class="sc-ast">
                  {secondary} {secondaryUnit}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
