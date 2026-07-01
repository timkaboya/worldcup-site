import { useEffect, useState } from 'preact/hooks';
import type { Match, Stage } from '../lib/types';
import { fetchScores } from '../lib/api';

type Side = 'left' | 'right';

const ROUNDS: { stage: Stage; label: string }[] = [
  { stage: 'r32', label: 'Round of 32' },
  { stage: 'r16', label: 'Round of 16' },
  { stage: 'qf', label: 'Quarters' },
  { stage: 'sf', label: 'Semis' },
];

function Tie({ m }: { m: Match }) {
  const played = !!m.score;
  const homeWin = m.winner === 'home' || (played && m.score!.home > m.score!.away);
  const awayWin = m.winner === 'away' || (played && m.score!.away > m.score!.home);
  return (
    <div class={`br-tie${played ? ' played' : ''}${m.status === 'live' ? ' br-live' : ''}`}>
      <div class={`br-team${homeWin ? ' br-win' : ''}`}>
        <span class="br-flag ef">{m.home.flag}</span>
        <span class="br-name">{m.home.name}</span>
        {played && <span class="br-score">{m.score!.home}</span>}
      </div>
      {m.away.name && (
        <div class={`br-team${awayWin ? ' br-win' : ''}`}>
          <span class="br-flag ef">{m.away.flag}</span>
          <span class="br-name">{m.away.name}</span>
          {played && <span class="br-score">{m.score!.away}</span>}
        </div>
      )}
      {m.note && <div class="br-note">{m.note}</div>}
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

  // Split each round in half: first half feeds the left side, second the right.
  const half = (s: Stage, side: Side) => {
    const all = byStage(s);
    const mid = Math.ceil(all.length / 2);
    return side === 'left' ? all.slice(0, mid) : all.slice(mid);
  };

  const finals = byStage('final');
  // Latest final-stage match is the Final; an earlier one (if any) is 3rd place.
  const finalMatch = finals[finals.length - 1];
  const thirdPlace = finals.length > 1 ? finals[0] : undefined;

  const SideCols = ({ side }: { side: Side }) => {
    const rounds = side === 'left' ? ROUNDS : [...ROUNDS].reverse();
    return (
      <div class={`br-side br-side-${side}`}>
        {rounds.map((r) => {
          const ms = half(r.stage, side);
          if (!ms.length) return null;
          return (
            <div class="br-col" key={`${side}-${r.stage}`}>
              <div class="br-col-hdr">{r.label}</div>
              <div class="br-col-body">
                {ms.map((m) => (
                  <Tie m={m} key={m.id} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      {!live && (
        <p class="tbl-note bracket-note">Live sources unreachable · showing last confirmed bracket.</p>
      )}
      <div class="bracket-scroll">
        <div class="bracket2">
          <SideCols side="left" />
          <div class="br-final-col">
            <div class="br-col-hdr br-final-hdr">🏆 Final</div>
            {finalMatch ? <Tie m={finalMatch} /> : <div class="br-tie br-tbd">TBD</div>}
            {thirdPlace && (
              <>
                <div class="br-col-hdr br-third-hdr">🥉 Third place</div>
                <Tie m={thirdPlace} />
              </>
            )}
          </div>
          <SideCols side="right" />
        </div>
      </div>
    </div>
  );
}
