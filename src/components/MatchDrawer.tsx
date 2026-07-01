import { useEffect, useRef } from 'preact/hooks';
import type { Match, MatchStats, MatchStatus, TeamMatchStats } from '../lib/types';
import { formatDayHeading, formatTime } from '../lib/time';

function EmojiFlag({ e }: { e: string }) {
  return <span class="ef">{e}</span>;
}

const STAT_ROWS: { key: keyof TeamMatchStats; label: string; pct?: boolean }[] = [
  { key: 'possession', label: 'Possession', pct: true },
  { key: 'shots', label: 'Shots' },
  { key: 'onTarget', label: 'On target' },
  { key: 'corners', label: 'Corners' },
  { key: 'offsides', label: 'Offsides' },
  { key: 'fouls', label: 'Fouls' },
  { key: 'yellow', label: 'Yellow cards' },
  { key: 'red', label: 'Red cards' },
];

function StatBar({ home, away, pct }: { home: number; away: number; pct?: boolean }) {
  const total = home + away || 1;
  const hPct = pct ? home : (home / total) * 100;
  return (
    <div class="stat-row">
      <span class="stat-num">{home}{pct ? '%' : ''}</span>
      <span class="stat-bars">
        <span class="stat-bar h" style={`width:${hPct}%`}></span>
        <span class="stat-bar a" style={`width:${100 - hPct}%`}></span>
      </span>
      <span class="stat-num a">{away}{pct ? '%' : ''}</span>
    </div>
  );
}

export default function MatchDrawer({
  match,
  tz,
  status,
  stats,
  onClose,
}: {
  match: Match;
  tz: string;
  status: MatchStatus;
  stats: MatchStats | null;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

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

  const showScore = (status === 'finished' || status === 'live') && match.score;

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
            </div>
          </div>
          {status === 'live' && <div class="dh-live">● LIVE</div>}
          <div class="dh-venue">{match.venue}</div>
        </div>

        {stats ? (
          <div class="drawer-body">
            {(stats.goals.home.length > 0 || stats.goals.away.length > 0) && (
              <div class="goals-block">
                <div class="goals-col">
                  {stats.goals.home.map((g, i) => (
                    <div class="goal-line" key={i}>
                      <span class="goal-min">{g.minute}</span> ⚽ {g.scorer}
                    </div>
                  ))}
                </div>
                <div class="goals-col a">
                  {stats.goals.away.map((g, i) => (
                    <div class="goal-line a" key={i}>
                      {g.scorer} ⚽ <span class="goal-min">{g.minute}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div class="stats-block">
              {STAT_ROWS.map((r) => (
                <div class="stat-group" key={r.key}>
                  <div class="stat-label">{r.label}</div>
                  <StatBar home={stats.home[r.key]} away={stats.away[r.key]} pct={r.pct} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div class="drawer-body">
            <p class="drawer-empty">
              {status === 'upcoming'
                ? 'Match not started yet — stats will appear once it kicks off.'
                : 'Detailed stats are not available for this match.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
