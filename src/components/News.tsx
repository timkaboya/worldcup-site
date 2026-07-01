import { useEffect, useMemo, useState } from 'preact/hooks';
import type { NewsItem, NewsTopic } from '../lib/types';
import { fetchNews } from '../lib/api';
import { loadPrefs, detectTimezone } from '../lib/prefs';

const TOPICS: { id: 'all' | NewsTopic; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'players', label: 'Players' },
  { id: 'coaches', label: 'Coaches' },
  { id: 'clubs', label: 'Clubs' },
  { id: 'teams', label: 'Teams' },
];

function timeAgo(iso: string): string {
  const diff = Date.now() - Date.parse(iso);
  const m = Math.round(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

function fmtDate(iso: string, tz: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: tz, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toUTCString();
  }
}

export default function News() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [topic, setTopic] = useState<'all' | NewsTopic>('all');
  const [tz, setTz] = useState('UTC');

  useEffect(() => {
    setTz(loadPrefs().timezone || detectTimezone());
  }, []);

  async function refresh() {
    try {
      const res = await fetchNews();
      setItems(res.snapshot.items);
      setLive(res.live);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    const poll = setInterval(refresh, 300_000);
    return () => clearInterval(poll);
  }, []);

  const filtered = useMemo(
    () => (topic === 'all' ? items : items.filter((i) => i.topics?.includes(topic))),
    [items, topic]
  );

  return (
    <div>
      <div class="page-head">
        <h1 class="page-title">World Cup News</h1>
        <p class="page-sub">
          Headlines from trusted football sources. Links open the original article.
        </p>
      </div>

      <div class="filter-row" role="tablist" aria-label="Filter news by topic" style="padding-left:0;padding-right:0;">
        {TOPICS.map((t) => (
          <button
            class={`fb${topic === t.id ? ' active' : ''}`}
            role="tab"
            aria-selected={topic === t.id}
            onClick={() => setTopic(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div class="sched-empty">Loading news…</div>
      ) : filtered.length === 0 ? (
        <div class="news-empty">
          {live
            ? 'No stories for this topic yet — check back soon.'
            : 'Live news is unavailable right now. Please try again shortly.'}
        </div>
      ) : (
        <ul class="news-list">
          {filtered.map((n) => (
            <li class="news-card" key={n.id}>
              <a class="news-link" href={n.url} target="_blank" rel="noopener noreferrer">
                {n.imageUrl && (
                  <img class="news-img" src={n.imageUrl} alt="" loading="lazy" decoding="async" />
                )}
                <div class="news-body">
                  <h2 class="news-title">{n.title}</h2>
                  {n.summary && <p class="news-summary">{n.summary}</p>}
                  <div class="news-meta">
                    <span class="news-source">{n.source}</span>
                    <span class="news-dot">·</span>
                    <span class="news-time" title={fmtDate(n.publishedUtc, tz)}>
                      {timeAgo(n.publishedUtc)}
                    </span>
                    {n.topics?.filter((t) => t !== 'teams').slice(0, 2).map((t) => (
                      <span class="news-tag" key={t}>{t}</span>
                    ))}
                  </div>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
