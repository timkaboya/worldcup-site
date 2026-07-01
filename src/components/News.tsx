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
      timeZone: tz, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toUTCString();
  }
}

function NewsReader({ item, tz, onClose }: { item: NewsItem; tz: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div class="drawer-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={item.title}>
      <article class="drawer news-reader" onClick={(e) => e.stopPropagation()}>
        <div class="drawer-grab" />
        <button class="drawer-close" onClick={onClose} aria-label="Close article">✕</button>

        {item.imageUrl && (
          <img class="news-reader-img" src={item.imageUrl} alt="" loading="lazy" decoding="async" />
        )}
        <div class="news-reader-meta">
          <span class="news-source">{item.source}</span>
          <span class="news-dot">·</span>
          <span>{fmtDate(item.publishedUtc, tz)}</span>
        </div>
        <h2 class="news-reader-title">{item.title}</h2>
        {item.topics && item.topics.filter((t) => t !== 'teams').length > 0 && (
          <div class="news-reader-tags">
            {item.topics.filter((t) => t !== 'teams').map((t) => (
              <span class="news-tag" key={t}>{t}</span>
            ))}
          </div>
        )}
        {item.summary && <p class="news-reader-body">{item.summary}</p>}
        <a class="news-read-btn" href={item.url} target="_blank" rel="noopener noreferrer">
          Read full article on {item.source}
          <span aria-hidden="true"> ↗</span>
        </a>
        <p class="news-reader-note">Full articles open on the publisher’s site.</p>
      </article>
    </div>
  );
}

export default function News() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [topic, setTopic] = useState<'all' | NewsTopic>('all');
  const [tz, setTz] = useState('UTC');
  const [selected, setSelected] = useState<NewsItem | null>(null);

  useEffect(() => {
    setTz(loadPrefs().timezone || detectTimezone());
  }, []);

  async function refresh() {
    try {
      const res = await fetchNews();
      // Newest first — the snapshot is pre-sorted, but guard against source order.
      setItems(
        [...res.snapshot.items].sort((a, b) => Date.parse(b.publishedUtc) - Date.parse(a.publishedUtc))
      );
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
          The latest World Cup 2026 stories from BBC Sport, The Guardian, ESPN and Sky Sports — newest first.
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
          {items.length
            ? 'No stories for this topic yet — check back soon.'
            : 'No World Cup stories right now. Please try again shortly.'}
        </div>
      ) : (
        <ul class="news-list">
          {filtered.map((n) => (
            <li class="news-card" key={n.id}>
              <button class="news-link" type="button" onClick={() => setSelected(n)}>
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
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && <NewsReader item={selected} tz={tz} onClose={() => setSelected(null)} />}
    </div>
  );
}
