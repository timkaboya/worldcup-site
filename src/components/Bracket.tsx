import { useEffect, useMemo, useState } from 'preact/hooks';
import type { Match, Stage, Team } from '../lib/types';
import { fetchScores } from '../lib/api';
import { statusOf } from '../lib/time';
import { detectTimezone, loadPrefs, toggleFavorite } from '../lib/prefs';
import MatchDrawer from './MatchDrawer';

// ── Geometry (radial bracket, viewBox 0..1000) ───────────────────────────────
const CX = 500;
const CY = 500;
const RADIUS: Record<number, number> = { 0: 430, 1: 344, 2: 260, 3: 178, 4: 98, 5: 0 };
const STEP = 360 / 32; // angular slot per outer flag
const STAGE_LEVEL: Record<Stage, number> = { group: 0, r32: 1, r16: 2, qf: 3, sf: 4, final: 5 };

const PLACEHOLDER_RE = /^(rd32|rd16|qf|sf)-[wl]\d+$/;
const SLOT_RE = /^(rd32|rd16|qf|sf)-w(\d+)$/;

function isReal(t: Team | undefined | null): boolean {
  return !!t && !!t.id && !PLACEHOLDER_RE.test(t.id);
}

function winnerTeam(m: Match | undefined): Team | null {
  if (!m) return null;
  if (m.winner === 'home') return m.home;
  if (m.winner === 'away') return m.away;
  if (m.score) {
    if (m.score.home > m.score.away) return m.home;
    if (m.score.away > m.score.home) return m.away;
  }
  return null;
}

const ISO_OVERRIDE: Record<string, string> = {
  england: 'gb-eng', scotland: 'gb-sct', wales: 'gb-wls', 'northern-ireland': 'gb-nir',
};
function flagISO(t: Team): string {
  if (ISO_OVERRIDE[t.id]) return ISO_OVERRIDE[t.id];
  const cps = [...(t.flag || '')].map((c) => c.codePointAt(0) || 0);
  const letters = cps
    .filter((cp) => cp >= 0x1f1e6 && cp <= 0x1f1ff)
    .map((cp) => String.fromCharCode(cp - 0x1f1e6 + 97));
  return letters.length === 2 ? letters.join('') : '';
}
function flagUrl(t: Team, w = 'w160'): string {
  const iso = flagISO(t);
  return iso ? `https://flagcdn.com/${w}/${iso}.png` : '';
}

// polar → screen point
function pt(r: number, angDeg: number): [number, number] {
  const a = (angDeg * Math.PI) / 180;
  return [CX + r * Math.sin(a), CY - r * Math.cos(a)];
}

function shortName(name: string): string {
  return name.length > 13 ? name.slice(0, 12) + '…' : name;
}

type NodeFlag = {
  key: string;
  x: number;
  y: number;
  team: Team;
  level: number;
  eliminated: boolean;
  isWin: boolean;
  match: Match;
};

type Label = { x: number; y: number; rot: number; anchor: 'start' | 'end'; text: string };

export default function Bracket() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [tz, setTz] = useState('UTC');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selected, setSelected] = useState<Match | null>(null);

  useEffect(() => {
    const p = loadPrefs();
    setTz(p.timezone || detectTimezone());
    setFavorites(p.favorites);
  }, []);

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
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, []);

  function onToggleFav(teamId: string) {
    setFavorites(toggleFavorite(teamId).favorites);
  }

  const model = useMemo(() => buildModel(matches), [matches]);

  if (loading) return <div class="sched-empty">Loading bracket…</div>;
  if (!model) return <div class="sched-empty">Bracket appears once the knockout stage is set.</div>;

  const { flags, connectors, dots, centerLines, labels, champion, finalMatch, thirdPlace } = model;

  return (
    <div>
      {!live && (
        <p class="tbl-note bracket-note">Live sources unreachable · showing last confirmed bracket.</p>
      )}

      <div class="rbracket">
        <div class="rbracket-stage" aria-label="World Cup 2026 knockout bracket">
          <svg viewBox="0 0 1000 1000" class="rbracket-svg" role="img">
            {connectors.map((d, i) => (
              <path class="rb-conn" d={d} key={`c${i}`} />
            ))}
            {centerLines.map((l, i) => (
              <line class="rb-conn" x1={l[0]} y1={l[1]} x2={l[2]} y2={l[3]} key={`l${i}`} />
            ))}
            {dots.map((dd, i) => (
              <circle class="rb-dot" cx={dd[0]} cy={dd[1]} r={3.6} key={`d${i}`} />
            ))}
            {labels.map((lb, i) => (
              <text
                class="rb-label"
                x={lb.x}
                y={lb.y}
                text-anchor={lb.anchor}
                transform={`rotate(${lb.rot} ${lb.x} ${lb.y})`}
                key={`t${i}`}
              >
                {lb.text}
              </text>
            ))}
            <circle class="rb-champ-ring" cx={CX} cy={CY} r={62} />
          </svg>

          {flags.map((f) => {
            const url = flagUrl(f.team);
            return (
              <button
                type="button"
                key={f.key}
                class={`rb-flag lvl${f.level}${f.eliminated ? ' out' : ''}${f.isWin ? ' win' : ''}`}
                style={{ left: `${f.x / 10}%`, top: `${f.y / 10}%` }}
                title={f.team.name}
                aria-label={`${f.team.name} — open match details`}
                onClick={() => setSelected(f.match)}
              >
                {url ? (
                  <img src={url} alt={f.team.name} loading="lazy" width={64} height={64} />
                ) : (
                  <span class="ef">{f.team.flag}</span>
                )}
              </button>
            );
          })}

          <div class="rb-center">
            {champion ? (
              <button
                type="button"
                class="rb-champ"
                title={champion.name}
                onClick={() => finalMatch && setSelected(finalMatch)}
              >
                {flagUrl(champion) ? (
                  <img src={flagUrl(champion)} alt={champion.name} width={72} height={72} />
                ) : (
                  <span class="ef">{champion.flag}</span>
                )}
                <span class="rb-champ-name">🏆 {champion.name}</span>
              </button>
            ) : (
              <button
                type="button"
                class="rb-champ rb-champ-tbd"
                onClick={() => finalMatch && setSelected(finalMatch)}
              >
                <span class="rb-trophy">🏆</span>
                <span class="rb-champ-name">Final</span>
              </button>
            )}
          </div>
        </div>

        {thirdPlace && (
          <div class="rb-third">
            <div class="rb-third-hdr">🥉 Third-place play-off</div>
            <ThirdTie m={thirdPlace} onOpen={() => setSelected(thirdPlace)} />
          </div>
        )}

        <p class="rb-hint">Tap any flag to see match details, line-ups and stats.</p>
      </div>

      {selected && (
        <MatchDrawer
          match={selected}
          tz={tz}
          status={statusOf(selected, now)}
          favorites={new Set(favorites)}
          onToggleFav={onToggleFav}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function ThirdTie({ m, onOpen }: { m: Match; onOpen: () => void }) {
  const played = !!m.score;
  const w = winnerTeam(m);
  const row = (t: Team, win: boolean, sc?: number) => (
    <div class={`rb-third-row${win ? ' win' : ''}`}>
      {flagUrl(t) ? (
        <img class="rb-third-flag" src={flagUrl(t, 'w40')} alt="" />
      ) : (
        <span class="ef">{t.flag}</span>
      )}
      <span class="rb-third-name">{isReal(t) ? t.name : 'TBD'}</span>
      {played && <span class="rb-third-score">{sc}</span>}
    </div>
  );
  return (
    <button type="button" class="rb-third-card" onClick={onOpen}>
      {row(m.home, played && w?.id === m.home.id, m.score?.home)}
      {row(m.away, played && w?.id === m.away.id, m.score?.away)}
    </button>
  );
}

// ── Model builder: derives the bracket tree from the data itself ──────────────
function buildModel(matches: Match[]) {
  // The third-place play-off is mislabelled 'r32' in the feed and sits outside
  // the radial tree — identify it by its SF-loser placeholders and exclude it.
  const thirdPlace =
    matches.find((m) => /^sf-l\d+$/.test(m.home.id) || /^sf-l\d+$/.test(m.away.id)) || undefined;

  const knockout = matches.filter(
    (m) => ['r32', 'r16', 'qf', 'sf', 'final'].includes(m.stage) && m.id !== thirdPlace?.id,
  );
  if (knockout.length < 30) return null;

  const BASE = Math.min(...knockout.map((m) => m.id)) - 73;
  const numOf = (m: Match) => m.id - BASE;
  const byNum = new Map<number, Match>();
  for (const m of knockout) byNum.set(numOf(m), m);

  const stageMin: Partial<Record<Stage, number>> = {};
  for (const st of ['r32', 'r16', 'qf', 'sf', 'final'] as Stage[]) {
    const nums = knockout.filter((m) => m.stage === st).map(numOf);
    if (nums.length) stageMin[st] = Math.min(...nums);
  }
  const ROOT = stageMin.final;
  if (ROOT == null) return null;
  const R32SET = new Set(knockout.filter((m) => m.stage === 'r32').map(numOf));

  const prefixStage: Record<string, Stage> = { rd32: 'r32', rd16: 'r16', qf: 'qf', sf: 'sf' };

  // Slot-math guess for a placeholder like "rd32-w8" → child match number.
  // ESPN's W-slot numbering does NOT always match our id ordering, so this is
  // only a hint; real team placements take priority (see below).
  function slotGuess(side: Team): number | null {
    const mW = side.id.match(SLOT_RE);
    if (!mW) return null;
    const base = stageMin[prefixStage[mW[1]]];
    return base == null ? null : base + (parseInt(mW[2], 10) - 1);
  }

  // Build CHILDREN[parentNum] = [homeChildNum, awayChildNum] one round at a time
  // as a bijection: assign authoritative real-team edges first, then fill the
  // remaining slots from the pool of unused child matches (preferring each
  // placeholder's slot-math hint when still free). This is robust to stale
  // placeholder labels left behind when a decided team is moved by the source.
  const CHILDREN = new Map<number, [number, number]>();
  const roundPairs: [Stage, Stage][] = [
    ['r16', 'r32'],
    ['qf', 'r16'],
    ['sf', 'qf'],
    ['final', 'sf'],
  ];
  for (const [pStage, cStage] of roundPairs) {
    const parents = knockout.filter((m) => m.stage === pStage).sort((a, b) => numOf(a) - numOf(b));
    const pool = new Set(knockout.filter((m) => m.stage === cStage).map(numOf));
    const assign = new Map<number, [number | null, number | null]>();

    // pass 1 — authoritative real-team edges
    for (const m of parents) {
      const arr: [number | null, number | null] = [null, null];
      [m.home, m.away].forEach((side, si) => {
        if (isReal(side)) {
          const cm = knockout.find((x) => x.stage === cStage && winnerTeam(x)?.id === side.id);
          if (cm && pool.has(numOf(cm))) {
            arr[si] = numOf(cm);
            pool.delete(numOf(cm));
          }
        }
      });
      assign.set(numOf(m), arr);
    }
    // pass 2 — placeholder slot-math hints, when the target is still free
    for (const m of parents) {
      const arr = assign.get(numOf(m))!;
      [m.home, m.away].forEach((side, si) => {
        if (arr[si] != null) return;
        const g = slotGuess(side);
        if (g != null && pool.has(g)) {
          arr[si] = g;
          pool.delete(g);
        }
      });
    }
    // pass 3 — fill any leftover slots from the remaining pool (ascending)
    const remaining = [...pool].sort((a, b) => a - b);
    for (const m of parents) {
      const arr = assign.get(numOf(m))!;
      for (let si = 0; si < 2; si++) if (arr[si] == null) arr[si] = remaining.shift() ?? null;
      if (arr[0] != null && arr[1] != null) CHILDREN.set(numOf(m), [arr[0], arr[1]]);
    }
  }

  const FLAG_ORDER: { num: number; slot: 0 | 1 }[] = [];
  (function dfs(num: number) {
    if (R32SET.has(num)) {
      FLAG_ORDER.push({ num, slot: 0 }, { num, slot: 1 });
      return;
    }
    const kids = CHILDREN.get(num);
    if (!kids) return;
    dfs(kids[0]);
    dfs(kids[1]);
  })(ROOT);
  if (FLAG_ORDER.length !== 32) return null;

  const flagAngle = (i: number) => (i < 16 ? -(i + 0.5) * STEP : (i - 16 + 0.5) * STEP);

  const angleMemo = new Map<number, number>();
  function angleOf(num: number): number {
    const cached = angleMemo.get(num);
    if (cached != null) return cached;
    let a: number;
    if (R32SET.has(num)) {
      const idx: number[] = [];
      FLAG_ORDER.forEach((f, i) => {
        if (f.num === num) idx.push(i);
      });
      a = (flagAngle(idx[0]) + flagAngle(idx[1])) / 2;
    } else {
      const kids = CHILDREN.get(num)!;
      a = (angleOf(kids[0]) + angleOf(kids[1])) / 2;
    }
    angleMemo.set(num, a);
    return a;
  }

  function childFlagAngle(num: number, slot: 0 | 1): number {
    for (let i = 0; i < FLAG_ORDER.length; i++) {
      if (FLAG_ORDER[i].num === num && FLAG_ORDER[i].slot === slot) return flagAngle(i);
    }
    return 0;
  }

  function connectorPath(num: number): string {
    const m = byNum.get(num)!;
    const lvl = STAGE_LEVEL[m.stage];
    const Rc = RADIUS[lvl - 1];
    const Rp = RADIUS[lvl];
    let a1: number;
    let a2: number;
    if (R32SET.has(num)) {
      a1 = childFlagAngle(num, 0);
      a2 = childFlagAngle(num, 1);
    } else {
      const kids = CHILDREN.get(num)!;
      a1 = angleOf(kids[0]);
      a2 = angleOf(kids[1]);
    }
    const ap = angleOf(num);
    const A1 = pt(Rp, a1);
    const A2 = pt(Rp, a2);
    const C1 = pt(Rc, a1);
    const C2 = pt(Rc, a2);
    const P = pt(Rp, ap);
    const ctrl = [2 * P[0] - 0.5 * (A1[0] + A2[0]), 2 * P[1] - 0.5 * (A1[1] + A2[1])];
    return `M${C1[0]} ${C1[1]} L${A1[0]} ${A1[1]} Q${ctrl[0]} ${ctrl[1]} ${A2[0]} ${A2[1]} L${C2[0]} ${C2[1]}`;
  }

  const flags: NodeFlag[] = [];
  const labels: Label[] = [];
  const connectors: string[] = [];
  const dots: [number, number][] = [];

  // Outer flags (32) + radial name labels.
  FLAG_ORDER.forEach((f, i) => {
    const m = byNum.get(f.num)!;
    const team = f.slot === 0 ? m.home : m.away;
    if (!isReal(team)) return;
    const ang = flagAngle(i);
    const [x, y] = pt(RADIUS[0], ang);
    const win = winnerTeam(m);
    const eliminated = !!win && win.id !== team.id;
    flags.push({
      key: `o-${f.num}-${f.slot}`,
      x, y, team, level: 0, eliminated, isWin: !!win && win.id === team.id, match: m,
    });
    const [lx, ly] = pt(468, ang);
    const rad = (ang * Math.PI) / 180;
    const dirDeg = (Math.atan2(-Math.cos(rad), Math.sin(rad)) * 180) / Math.PI;
    const leftHalf = Math.sin(rad) < 0;
    labels.push({
      x: lx,
      y: ly,
      rot: leftHalf ? dirDeg + 180 : dirDeg,
      anchor: leftHalf ? 'end' : 'start',
      text: shortName(team.name),
    });
  });

  // Connectors: r32 nodes → their two outer flags, and every inner node → children.
  for (const num of R32SET) connectors.push(connectorPath(num));
  for (const [num] of CHILDREN) {
    const m = byNum.get(num)!;
    if (STAGE_LEVEL[m.stage] <= 4) connectors.push(connectorPath(num));
  }

  // Winner flags on rings 1..4 (r32..sf); dots for undecided nodes.
  for (const [num, m] of byNum) {
    if (m.stage === 'final') continue;
    const lvl = STAGE_LEVEL[m.stage];
    const [x, y] = pt(RADIUS[lvl], angleOf(num));
    const w = winnerTeam(m);
    if (w && isReal(w)) {
      flags.push({ key: `w-${num}`, x, y, team: w, level: lvl, eliminated: false, isWin: true, match: m });
    } else {
      dots.push([x, y]);
    }
  }

  // Center spokes to the two semi-finals.
  const centerLines: [number, number, number, number][] = [];
  for (const [num, m] of byNum) {
    if (m.stage !== 'sf') continue;
    const p = pt(RADIUS[4], angleOf(num));
    centerLines.push([CX, CY, p[0], p[1]]);
  }

  const finalMatch = byNum.get(ROOT);
  const champ = finalMatch ? winnerTeam(finalMatch) : null;
  const champion = champ && isReal(champ) ? champ : null;

  return { flags, labels, connectors, dots, centerLines, champion, finalMatch, thirdPlace };
}
