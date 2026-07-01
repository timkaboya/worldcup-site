import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type {
  LineupPlayer,
  Match,
  MatchDetail,
  MatchEvent,
  MatchStatus,
  TeamLineup,
} from '../lib/types';
import { formatDayHeading, formatTime } from '../lib/time';
import { buildIcs, icsFilename } from '../lib/ics';
import { fetchMatchDetail } from '../lib/api';

function EmojiFlag({ e }: { e: string }) {
  return <span class="ef">{e}</span>;
}

type TabId = 'facts' | 'lineup' | 'stats' | 'commentary' | 'h2h';

const TAB_LABEL: Record<TabId, string> = {
  facts: 'Facts',
  lineup: 'Lineup',
  stats: 'Stats',
  commentary: 'Commentary',
  h2h: 'Form & H2H',
};

// ── helpers ───────────────────────────────────────────────────────────────

function goalSummary(events: MatchEvent[] | undefined, side: 'home' | 'away'): string {
  if (!events) return '';
  const byPlayer = new Map<string, string[]>();
  for (const e of events) {
    if (e.type !== 'goal' || e.side !== side) continue;
    const p = e.players[0] || 'Goal';
    if (!byPlayer.has(p)) byPlayer.set(p, []);
    byPlayer.get(p)!.push(e.min);
  }
  return Array.from(byPlayer.entries())
    .map(([p, mins]) => `${p} ${mins.join(', ')}`)
    .join(' · ');
}

/** Group starters into formation lines: [GK, DEF, MID, …, FWD]. */
function toLines(l: TeamLineup): LineupPlayer[][] {
  const s = l.starters;
  if (!s.length) return [];
  const sizes = l.formation ? [1, ...l.formation.split('-').map((n) => parseInt(n, 10))] : null;
  if (sizes && sizes.every((n) => n > 0) && sizes.reduce((a, b) => a + b, 0) === s.length) {
    const lines: LineupPlayer[][] = [];
    let i = 0;
    for (const n of sizes) {
      lines.push(s.slice(i, i + n));
      i += n;
    }
    return lines;
  }
  // Fallback: bucket by first letter of position.
  const buckets: Record<string, LineupPlayer[]> = { G: [], D: [], M: [], F: [] };
  for (const p of s) (buckets[(p.pos || 'M')[0]] || buckets.M).push(p);
  return ['G', 'D', 'M', 'F'].map((k) => buckets[k]).filter((line) => line.length);
}

function PlayerChip({ p }: { p: LineupPlayer }) {
  return (
    <div class="pl-chip" title={`${p.num ? '#' + p.num + ' ' : ''}${p.name}`}>
      <span class="pl-dot">{p.num || '·'}</span>
      <span class="pl-name">
        {p.name.split(' ').slice(-1)[0]}
        {p.goals ? <span class="pl-mk"> ⚽{p.goals > 1 ? p.goals : ''}</span> : null}
        {p.yellow ? <span class="pl-mk">🟨</span> : null}
        {p.red ? <span class="pl-mk">🟥</span> : null}
        {p.subOut ? <span class="pl-sub">↓</span> : null}
      </span>
    </div>
  );
}

function Pitch({ lineups }: { lineups: NonNullable<MatchDetail['lineups']> }) {
  const away = toLines(lineups.away); // [GK…FWD] rendered top→center
  const home = toLines(lineups.home); // reversed so GK at bottom

  return (
    <div class="pitch" aria-label="Line-ups on pitch">
      <div class="pitch-half away">
        {away.map((line, i) => (
          <div class="pitch-line" key={`a${i}`}>
            {line.map((p) => (
              <PlayerChip p={p} key={p.num + p.name} />
            ))}
          </div>
        ))}
      </div>
      <div class="pitch-mid" aria-hidden="true"></div>
      <div class="pitch-half home">
        {home
          .slice()
          .reverse()
          .map((line, i) => (
            <div class="pitch-line" key={`h${i}`}>
              {line.map((p) => (
                <PlayerChip p={p} key={p.num + p.name} />
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}

function SubsList({ team, l }: { team: string; l: TeamLineup }) {
  if (!l.subs.length) return null;
  return (
    <div class="subs-col">
      <div class="subs-hd">{team} · subs</div>
      {l.subs.map((p) => (
        <div class="sub-row" key={p.num + p.name}>
          <span class="sub-num">{p.num}</span>
          <span class="sub-name">
            {p.name}
            {p.goals ? <span class="pl-mk"> ⚽</span> : null}
            {p.subIn ? (
              <span class="pl-in"> ↑{p.subIn !== 'out' && p.subIn !== 'in' ? ' ' + p.subIn : ''}</span>
            ) : null}
          </span>
        </div>
      ))}
    </div>
  );
}

function StatBar({ home, away, pct }: { home: number; away: number; pct?: boolean }) {
  const total = home + away || 1;
  const hPct = (home / total) * 100;
  return (
    <span class="stat-bars">
      <span class="stat-bar h" style={`width:${hPct}%`}></span>
      <span class="stat-bar a" style={`width:${100 - hPct}%`}></span>
    </span>
  );
}

const EVENT_ICON: Record<MatchEvent['type'], string> = {
  goal: '⚽',
  yellow: '🟨',
  red: '🟥',
  sub: '🔁',
  other: '•',
};

function Timeline({ events }: { events: MatchEvent[] }) {
  return (
    <div class="timeline">
      {events.map((e, i) => (
        <div class={`tl-row ${e.side || 'mid'}`} key={i}>
          <span class="tl-min">{e.min}</span>
          <span class="tl-ic">{EVENT_ICON[e.type]}</span>
          <span class="tl-txt">{e.players.length ? e.players.join(', ') : e.text}</span>
        </div>
      ))}
    </div>
  );
}

function formPill(r: 'W' | 'D' | 'L' | '') {
  return <span class={`form-pill ${r.toLowerCase() || 'na'}`}>{r || '–'}</span>;
}

// ── component ───────────────────────────────────────────────────────────────

export default function MatchDrawer({
  match,
  tz,
  status,
  favorites,
  onToggleFav,
  onClose,
}: {
  match: Match;
  tz: string;
  status: MatchStatus;
  favorites?: Set<string>;
  onToggleFav?: (teamId: string) => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [detail, setDetail] = useState<MatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>('facts');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  // Lazy-load rich detail when the drawer opens.
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setDetail(null);
    setTab('facts');
    fetchMatchDetail(match.id).then((d) => {
      if (!alive) return;
      setDetail(d);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [match.id]);

  const tabs = useMemo<TabId[]>(() => {
    const t: TabId[] = ['facts'];
    if (detail?.lineups) t.push('lineup');
    if (detail?.stats) t.push('stats');
    if (detail?.commentary) t.push('commentary');
    if (detail?.form || detail?.h2h) t.push('h2h');
    return t;
  }, [detail]);

  useEffect(() => {
    if (!tabs.includes(tab)) setTab('facts');
  }, [tabs, tab]);

  const showScore = (status === 'finished' || status === 'live') && match.score;

  function addToCalendar() {
    const blob = new Blob([buildIcs(match)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = icsFilename(match);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const favBtn = (teamId: string, teamName: string) => {
    if (!onToggleFav || !teamName) return null;
    const on = favorites?.has(teamId) ?? false;
    return (
      <button
        class={`fav-btn${on ? ' on' : ''}`}
        onClick={() => onToggleFav(teamId)}
        aria-pressed={on}
        aria-label={`${on ? 'Unfollow' : 'Follow'} ${teamName}`}
        title={on ? 'Unfollow' : 'Follow'}
      >
        {on ? '★' : '☆'}
      </button>
    );
  };

  const homeGoals = goalSummary(detail?.events, 'home');
  const awayGoals = goalSummary(detail?.events, 'away');

  return (
    <div class="drawer-overlay" onClick={onClose}>
      <div
        class="drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`${match.home.name} versus ${match.away.name || 'TBD'}`}
        tabIndex={-1}
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div class="drawer-grab" aria-hidden="true"></div>
        <button class="drawer-close" onClick={onClose} aria-label="Close">✕</button>

        <div class="drawer-head">
          <div class="dh-meta">
            {match.group ? `Group ${match.group}` : match.stage.toUpperCase()} ·{' '}
            {formatDayHeading(match.utc, tz)} · {formatTime(match.utc, tz)}
          </div>
          <div class="dh-teams">
            <div class="dh-team">
              <EmojiFlag e={match.home.flag} />
              <span>{match.home.name}</span>
              {favBtn(match.home.id, match.home.name)}
            </div>
            <div class="dh-score">
              {showScore ? (
                <>
                  <span>{match.score!.home}</span>
                  <span class="dh-dash">–</span>
                  <span>{match.score!.away}</span>
                </>
              ) : (
                <span class="dh-vs">v</span>
              )}
            </div>
            <div class="dh-team a">
              <EmojiFlag e={match.away.flag} />
              <span>{match.away.name || 'TBD'}</span>
              {favBtn(match.away.id, match.away.name)}
            </div>
          </div>
          {(homeGoals || awayGoals) && (
            <div class="dh-scorers">
              <span class="dh-sc h">{homeGoals}</span>
              <span class="dh-sc-ic">⚽</span>
              <span class="dh-sc a">{awayGoals}</span>
            </div>
          )}
          {status === 'live' && (
            <div class="dh-live">● LIVE{detail?.clock ? ` · ${detail.clock}` : ''}</div>
          )}
          {match.note && <div class="dh-note">{match.note}</div>}
          <div class="dh-venue">{detail?.info.venue || match.venue}</div>
          {status === 'upcoming' && (
            <button class="cal-btn" onClick={addToCalendar}>
              <span aria-hidden="true">📅</span> Add to calendar
            </button>
          )}
        </div>

        {tabs.length > 1 && (
          <div class="drawer-tabs" role="tablist" aria-label="Match detail sections">
            {tabs.map((t) => (
              <button
                class={`dtab${tab === t ? ' active' : ''}`}
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                key={t}
              >
                {TAB_LABEL[t]}
              </button>
            ))}
          </div>
        )}

        <div class="drawer-body">
          {loading ? (
            <div class="detail-load">
              <span class="spinner" aria-hidden="true"></span> Loading match detail…
            </div>
          ) : (
            <>
              {tab === 'facts' && (
                <div class="tab-pane">
                  {detail?.events ? (
                    <Timeline events={detail.events} />
                  ) : (
                    <p class="drawer-empty">
                      {status === 'upcoming'
                        ? 'Match not started yet — line-ups, live stats and commentary will appear once it kicks off. Recent form and head-to-head are below.'
                        : 'No timeline available for this match.'}
                    </p>
                  )}
                  <div class="fact-info">
                    {detail?.info.venue && (
                      <div class="fact-row">
                        <span class="fact-k">Stadium</span>
                        <span class="fact-v">{detail.info.venue}</span>
                      </div>
                    )}
                    {detail?.info.referee && (
                      <div class="fact-row">
                        <span class="fact-k">Referee</span>
                        <span class="fact-v">{detail.info.referee}</span>
                      </div>
                    )}
                    {detail?.info.attendance ? (
                      <div class="fact-row">
                        <span class="fact-k">Attendance</span>
                        <span class="fact-v">{detail.info.attendance.toLocaleString()}</span>
                      </div>
                    ) : null}
                    {detail?.info.odds && (
                      <div class="fact-row">
                        <span class="fact-k">Odds</span>
                        <span class="fact-v">{detail.info.odds}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {tab === 'lineup' && detail?.lineups && (
                <div class="tab-pane">
                  <div class="lineup-hd">
                    <span>
                      <EmojiFlag e={match.home.flag} /> {detail.lineups.home.formation || ''}
                    </span>
                    <span>
                      {detail.lineups.away.formation || ''} {match.away.name}{' '}
                      <EmojiFlag e={match.away.flag} />
                    </span>
                  </div>
                  <Pitch lineups={detail.lineups} />
                  <div class="subs-wrap">
                    <SubsList team={match.home.name} l={detail.lineups.home} />
                    <SubsList team={match.away.name} l={detail.lineups.away} />
                  </div>
                </div>
              )}

              {tab === 'stats' && detail?.stats && (
                <div class="tab-pane stats-block">
                  {detail.stats.map((s) => (
                    <div class="stat-group" key={s.key}>
                      <div class="stat-row">
                        <span class="stat-num">
                          {s.home}
                          {s.pct ? '%' : ''}
                        </span>
                        <span class="stat-label">{s.label}</span>
                        <span class="stat-num a">
                          {s.away}
                          {s.pct ? '%' : ''}
                        </span>
                      </div>
                      <StatBar home={s.home} away={s.away} pct={s.pct} />
                    </div>
                  ))}
                </div>
              )}

              {tab === 'commentary' && detail?.commentary && (
                <div class="tab-pane commentary">
                  {detail.commentary.map((c, i) => (
                    <div class="cm-row" key={i}>
                      {c.min && <span class="cm-min">{c.min}</span>}
                      <span class="cm-txt">{c.text}</span>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'h2h' && (
                <div class="tab-pane">
                  {detail?.form && (
                    <div class="form-wrap">
                      {(['home', 'away'] as const).map((side) => {
                        const team = side === 'home' ? match.home : match.away;
                        const games = detail.form![side];
                        if (!games.length) return null;
                        return (
                          <div class="form-col" key={side}>
                            <div class="form-hd">
                              <EmojiFlag e={team.flag} /> {team.name} · recent form
                            </div>
                            {games.map((g, i) => (
                              <div class="form-row" key={i}>
                                {formPill(g.result)}
                                <span class="form-opp">v {g.opponent}</span>
                                <span class="form-score">{g.score}</span>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {detail?.h2h && detail.h2h.length > 0 && (
                    <div class="h2h-block">
                      <div class="form-hd">
                        Head-to-head · {match.home.name} v {match.away.name}
                      </div>
                      {detail.h2h.map((g, i) => (
                        <div class="form-row" key={i}>
                          {formPill(g.result)}
                          <span class="form-opp">v {g.opponent}</span>
                          <span class="form-score">{g.score}</span>
                          <span class="form-comp">{g.competition}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {!detail?.form && !detail?.h2h && (
                    <p class="drawer-empty">No form or head-to-head data available.</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
