import { useEffect, useState } from 'preact/hooks';
import type { Match, Stage } from '../lib/types';
import { fetchScores } from '../lib/api';

const COLS: { stage: Stage; label: string }[] = [
  { stage: 'r32', label: 'Round of 32' },
  { stage: 'r16', label: 'Round of 16' },
  { stage: 'qf', label: 'Quarter-finals' },
  { stage: 'sf', label: 'Semi-finals' },
  { stage: 'final', label: 'Final' },
];

function TeamRow({
  flag,
  name,
  score,
  win,
  show,
}: {
  flag: string;
  name: string;
  score?: number;
  win: boolean;
  show: boolean;
}) {
  return (
    <div class={`br-team${win ? ' br-win' : ''}`}>
      <span class="br-flag ef">{flag}</span>
      <span class="br-name">{name}</span>
      {show && <span class="br-score">{score}</span>}
    </div>
  );
}

export default function Bracket() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);

  async function refresh() {
    try {
      const res = await fetchScores();
      setMatches(res.snapshot.matches as Match[]);
      setLive(res.live);
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

  if (loading) return <div class="sched-empty">Loading bracket…</div>;

  const byStage = (s: Stage) =>
    matches.filter((m) => m.stage === s).sort((a, b) => a.utc.localeCompare(b.utc));

  return (
    <div>
      {!live && (
        <p class="tbl-note bracket-note">Live sources unreachable · showing last confirmed bracket.</p>
      )}
      <div class="bracket-scroll">
        <div class="bracket">
          {COLS.map((col) => (
            <div class="br-col" key={col.stage}>
              <div class="br-col-hdr">{col.label}</div>
              <div class="br-col-body">
                {byStage(col.stage).map((m) => {
                  const played = !!m.score;
                  const homeWin = m.winner === 'home' || (played && m.score!.home > m.score!.away);
                  const awayWin = m.winner === 'away' || (played && m.score!.away > m.score!.home);
                  return (
                    <div class={`br-tie${played ? ' played' : ''}${m.status === 'live' ? ' br-live' : ''}`} key={m.id}>
                      <TeamRow flag={m.home.flag} name={m.home.name} score={m.score?.home} win={homeWin} show={played} />
                      {m.away.name && (
                        <TeamRow flag={m.away.flag} name={m.away.name} score={m.score?.away} win={awayWin} show={played} />
                      )}
                      {m.note && <div class="br-note">{m.note}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
