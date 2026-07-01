import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Match, MatchStatus, Stage } from '../lib/types';
import { fetchScores } from '../lib/api';
import {
  statusOf,
  kickoffMs,
  dayKey,
  todayKey,
  timeBucket,
  formatTime,
  formatDayHeading,
  formatClock,
  partsInTz,
} from '../lib/time';
import { detectTimezone, loadPrefs, setTimezone, toggleFavorite, tzShortLabel } from '../lib/prefs';
import MatchDrawer from './MatchDrawer';

type Filter = 'all' | 'fav' | 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'final';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'fav', label: '★ Favorites' },
  { id: 'group', label: 'Groups' },
  { id: 'r32', label: 'R32' },
  { id: 'r16', label: 'R16' },
  { id: 'qf', label: 'QF' },
  { id: 'sf', label: 'SF' },
  { id: 'final', label: 'Final' },
];

const COMMON_TZS = [
  'Africa/Nairobi', 'Africa/Lagos', 'Africa/Cairo', 'Africa/Johannesburg',
  'Europe/London', 'Europe/Paris', 'Europe/Moscow',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Sao_Paulo', 'America/Mexico_City',
  'Asia/Dubai', 'Asia/Kolkata', 'Asia/Tokyo', 'Asia/Shanghai',
  'Australia/Sydney', 'Pacific/Auckland', 'UTC',
];

function stageMatchesFilter(stage: Stage, f: Filter): boolean {
  if (f === 'all' || f === 'fav') return true;
  return stage === f;
}

function EmojiFlag({ e }: { e: string }) {
  return <span class="ef">{e}</span>;
}

export default function Schedule() {
  const [tz, setTz] = useState<string>('UTC');
  const [matches, setMatches] = useState<Match[]>([]);
  const [now, setNow] = useState<number>(Date.now());
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [live, setLive] = useState<boolean>(false);
  const [sources, setSources] = useState<string[]>([]);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [pollState, setPollState] = useState<'ok' | 'pend' | 'err'>('pend');
  const [selected, setSelected] = useState<Match | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);

  // Init timezone + favorites from prefs.
  useEffect(() => {
    const p = loadPrefs();
    setTz(p.timezone || detectTimezone());
    setFavorites(p.favorites);
  }, []);

  function onToggleFav(teamId: string) {
    setFavorites(toggleFavorite(teamId).favorites);
  }

  async function refresh() {
    setPollState('pend');
    try {
      const res = await fetchScores();
      setMatches(res.snapshot.matches);
      setLive(res.live);
      setSources(res.sources);
      setUpdatedAt(new Date(res.snapshot.updatedUtc).getTime());
      setPollState(res.live ? 'ok' : 'err');
    } catch {
      setPollState('err');
    } finally {
      setLoading(false);
    }
  }

  // Initial load + polling + status ticking.
  useEffect(() => {
    refresh();
    const poll = setInterval(refresh, 60_000);
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, []);

  // Reflect live state + tz label into the header.
  const anyLive = useMemo(
    () => matches.some((m) => statusOf(m, now) === 'live'),
    [matches, now]
  );
  useEffect(() => {
    const pill = document.getElementById('live-pill');
    if (pill) pill.classList.toggle('on', anyLive);
    const lbl = document.getElementById('tz-label');
    if (lbl) lbl.textContent = tzShortLabel(tz);
  }, [anyLive, tz]);

  function onTzChange(e: Event) {
    const next = (e.target as HTMLSelectElement).value;
    setTz(next);
    setTimezone(next);
  }

  const favSet = useMemo(() => new Set(favorites), [favorites]);

  const filtered = useMemo(
    () =>
      matches.filter((m) => {
        if (!stageMatchesFilter(m.stage, filter)) return false;
        if (filter === 'fav') return favSet.has(m.home.id) || favSet.has(m.away.id);
        return true;
      }),
    [matches, filter, favSet]
  );

  // Group by day (in selected tz), sorted.
  const days = useMemo(() => {
    const byDay = new Map<string, Match[]>();
    for (const m of filtered) {
      const k = dayKey(m.utc, tz);
      if (!byDay.has(k)) byDay.set(k, []);
      byDay.get(k)!.push(m);
    }
    const keys = Array.from(byDay.keys()).sort();
    return keys.map((k) => ({
      key: k,
      heading: formatDayHeading(byDay.get(k)![0].utc, tz),
      matches: byDay.get(k)!.slice().sort((a, b) => kickoffMs(a) - kickoffMs(b)),
    }));
  }, [filtered, tz]);

  const today = todayKey(tz, now);

  // Auto-scroll focus: today's matches, else the most recent past day.
  const focusKey = useMemo(() => {
    if (days.length === 0) return null;
    const keys = days.map((d) => d.key);
    if (keys.includes(today)) return today;
    const past = keys.filter((k) => k <= today);
    if (past.length) return past[past.length - 1];
    return keys[0];
  }, [days, today]);

  const scrolledRef = useRef(false);
  useEffect(() => {
    if (loading || scrolledRef.current || !focusKey) return;
    const el = document.getElementById(`day-${focusKey}`);
    if (el) {
      el.scrollIntoView({ block: 'start' });
      scrolledRef.current = true;
    }
  }, [loading, focusKey]);

  // "Up next": next live/upcoming matches.
  const upNext = useMemo(() => {
    return matches
      .map((m) => ({ m, st: statusOf(m, now) }))
      .filter((x) => x.st !== 'finished')
      .sort((a, b) => kickoffMs(a.m) - kickoffMs(b.m))
      .slice(0, 6);
  }, [matches, now]);

  const pollMsg = loading
    ? 'Loading…'
    : pollState === 'ok'
      ? `✓ Updated ${updatedAt ? formatClock(updatedAt, tz) : ''}${sources.length ? ' · ' + sources.join(', ') : ''}`
      : live
        ? 'Showing snapshot'
        : '⚠ Live sources unreachable · showing confirmed results';

  return (
    <div>
      <div class="banner">
        <div class="banner-top">
          <div>
            <div class="banner-lbl">Match Schedule</div>
            <div class="banner-date">Times shown in {tzShortLabel(tz)}</div>
          </div>
          <div style="display:flex;gap:.5rem;align-items:center;">
            <select class="tz-select" aria-label="Select timezone" value={tz} onChange={onTzChange}>
              {(COMMON_TZS.includes(tz) ? COMMON_TZS : [tz, ...COMMON_TZS]).map((z) => (
                <option value={z}>{tzShortLabel(z)}</option>
              ))}
            </select>
            <button
              class={`refresh-btn${pollState === 'pend' ? ' spin' : ''}`}
              onClick={refresh}
              disabled={pollState === 'pend'}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M1 4v6h6" /><path d="M23 20v-6h-6" />
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>
        <div class="poll-row" role="status" aria-live="polite">
          <span class={`pdot ${pollState}`}></span>
          <span>{pollMsg}</span>
        </div>
        {upNext.length > 0 && (
          <>
            <div class="next-lbl">⚡ Up next</div>
            <div class="next-row">
              {upNext.map(({ m, st }) => {
                const showScore = st === 'live' && m.score;
                return (
                  <button
                    type="button"
                    class={`nc${st === 'live' ? ' live' : ''}`}
                    key={m.id}
                    onClick={() => setSelected(m)}
                    aria-label={`${m.home.name} versus ${m.away.name || 'TBD'} — view details`}
                  >
                    <div class={`nc-time${st === 'live' ? ' live' : ''}`}>
                      {st === 'live' ? 'LIVE' : formatTime(m.utc, tz)}
                    </div>
                    {showScore ? (
                      <div class="nc-match">
                        <EmojiFlag e={m.home.flag} /> {m.home.name} {m.score!.home}–{m.score!.away} {m.away.name} <EmojiFlag e={m.away.flag} />
                      </div>
                    ) : (
                      <div class="nc-match">
                        <EmojiFlag e={m.home.flag} /> {m.home.name}
                        {m.away.name ? <> v {m.away.name} <EmojiFlag e={m.away.flag} /></> : null}
                      </div>
                    )}
                    <div class="nc-meta">{formatDayHeading(m.utc, tz)}</div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div class="legend">
        <span class="leg-lbl">Kick-off</span>
        <span class="leg-i"><span class="leg-dot" style="background:var(--green)"></span>Morning</span>
        <span class="leg-i"><span class="leg-dot" style="background:var(--gold)"></span>Afternoon</span>
        <span class="leg-i"><span class="leg-dot" style="background:var(--orange)"></span>Evening</span>
        <span class="leg-i"><span class="leg-dot" style="background:var(--purple)"></span>Night</span>
      </div>

      <div class="filter-row" role="tablist" aria-label="Filter by stage">
        {FILTERS.map((f) => (
          <button
            class={`fb${filter === f.id ? ' active' : ''}`}
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div id="sched-list">
        {days.length === 0 && !loading && (
          <div class="sched-empty">
            {filter === 'fav'
              ? 'No favorite teams yet. Open a match and tap ☆ to follow a team.'
              : 'No matches for this filter.'}
          </div>
        )}
        {days.map((d) => {
          const isToday = d.key === today;
          const isPast = d.key < today;
          return (
            <div id={`day-${d.key}`} class={`day-block${isToday ? ' today' : ''}${isPast ? ' past' : ''}`} key={d.key}>
              <div class="day-hdr">
                <span class="day-name">{d.heading}</span>
                {isToday && <span class="day-pill">Today</span>}
                <span class="day-pill">{d.matches.length} {d.matches.length === 1 ? 'match' : 'matches'}</span>
              </div>
              <div class="matches">
                {d.matches.map((m) => (
                  <MatchCard m={m} tz={tz} st={statusOf(m, now)} fav={favSet} onOpen={() => setSelected(m)} key={m.id} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <MatchDrawer
          match={selected}
          tz={tz}
          status={statusOf(selected, now)}
          favorites={favSet}
          onToggleFav={onToggleFav}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function MatchCard({ m, tz, st, fav, onOpen }: { m: Match; tz: string; st: MatchStatus; fav: Set<string>; onOpen: () => void }) {
  const hour = partsInTz(m.utc, tz).hour;
  const bucket = timeBucket(hour);
  const showScore = (st === 'finished' || st === 'live') && m.score;
  const isFav = fav.has(m.home.id) || fav.has(m.away.id);
  return (
    <button
      type="button"
      class={`mc ${bucket}${st === 'finished' ? ' past' : ''}${st === 'live' ? ' live-m' : ''}${isFav ? ' fav' : ''}`}
      onClick={onOpen}
      aria-label={`${m.home.name} versus ${m.away.name || 'TBD'} — view details`}
    >
      <div class="mc-time">
        <div class="mc-tmain">{formatTime(m.utc, tz)}</div>
        {st === 'live' && <span class="mc-live-tag">LIVE</span>}
      </div>
      <div>
        {showScore ? (
          <div class="mc-score">
            <EmojiFlag e={m.home.flag} /> {m.home.name} {m.score!.home} – {m.score!.away} {m.away.name} <EmojiFlag e={m.away.flag} />
          </div>
        ) : (
          <div class="mc-teams">
            <EmojiFlag e={m.home.flag} /> {m.home.name}
            {m.away.name ? <> <span style="color:var(--text4)">v</span> {m.away.name} <EmojiFlag e={m.away.flag} /></> : null}
          </div>
        )}
        <div class="mc-meta">
          {m.group ? <span class="mc-grp">Grp {m.group}</span> : <span class={`mc-grp ko`}>{m.stage.toUpperCase()}</span>}
          {isFav && <span class="mc-fav" aria-label="Favorite team">★</span>}
          <span class="mc-venue">{m.venue}</span>
        </div>
      </div>
      <span class="mc-chev" aria-hidden="true">›</span>
    </button>
  );
}
