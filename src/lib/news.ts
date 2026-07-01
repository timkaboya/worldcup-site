import type { NewsItem, NewsTopic } from './types';

// Lightweight, dependency-free RSS/Atom parsing that runs both in Node (tests)
// and the Cloudflare Workers runtime (no DOMParser available there).

const ENTITIES: Record<string, string> = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&nbsp;': ' ',
};

export function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&[a-z0-9#]+;/gi, (m) => ENTITIES[m] ?? m);
}

function stripCdata(s: string): string {
  const m = s.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  return (m ? m[1] : s).trim();
}

function stripTags(s: string): string {
  return decodeEntities(stripCdata(s).replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
}

// Some feeds emit the literal strings "null"/"undefined" (or empty) for missing
// fields. Treat those as absent so we never render "null" as a summary.
function cleanText(s: string | null | undefined): string | undefined {
  if (!s) return undefined;
  const t = stripTags(s);
  if (!t || /^(null|undefined)$/i.test(t)) return undefined;
  return t;
}

function tag(block: string, name: string): string | null {
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i');
  const m = block.match(re);
  return m ? stripCdata(m[1]) : null;
}

function attr(block: string, name: string, at: string): string | null {
  const re = new RegExp(`<${name}[^>]*\\b${at}=["']([^"']+)["']`, 'i');
  const m = block.match(re);
  return m ? m[1] : null;
}

// djb2 → base36, stable id from the canonical url.
export function hashId(url: string): string {
  let h = 5381;
  for (let i = 0; i < url.length; i++) h = ((h << 5) + h + url.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

const TOPIC_RULES: { topic: NewsTopic; re: RegExp }[] = [
  { topic: 'coaches', re: /\b(coach|manager|head coach|boss|gaffer|technical director)\b/i },
  { topic: 'clubs', re: /\b(club|transfer|signing|loan|Premier League|LaLiga|Serie A|Bundesliga|contract)\b/i },
  { topic: 'players', re: /\b(striker|midfielder|defender|goalkeeper|winger|captain|injury|injured|hat-?trick|goal)\b/i },
];

export function tagTopics(text: string): NewsTopic[] {
  const topics: NewsTopic[] = [];
  for (const { topic, re } of TOPIC_RULES) if (re.test(text)) topics.push(topic);
  if (topics.length === 0) topics.push('teams');
  return topics;
}

function toIso(raw: string | null): string {
  if (!raw) return new Date().toISOString();
  const t = Date.parse(raw.trim());
  return Number.isNaN(t) ? new Date().toISOString() : new Date(t).toISOString();
}

function blocks(xml: string, name: string): string[] {
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'gi');
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) out.push(m[1]);
  return out;
}

/** Parse an RSS 2.0 or Atom feed into NewsItems attributed to `source`. */
export function parseFeed(xml: string, source: string): NewsItem[] {
  const isAtom = /<feed[\s>]/i.test(xml) && !/<rss[\s>]/i.test(xml);
  const raw = isAtom ? blocks(xml, 'entry') : blocks(xml, 'item');
  const items: NewsItem[] = [];

  for (const b of raw) {
    const title = stripTags(tag(b, 'title') || '');
    let url = '';
    if (isAtom) {
      url = attr(b, 'link', 'href') || tag(b, 'id') || '';
    } else {
      url = (tag(b, 'link') || attr(b, 'link', 'href') || tag(b, 'guid') || '').trim();
    }
    url = decodeEntities(url).trim();
    if (!title || /^(null|undefined)$/i.test(title) || !url || !/^https?:\/\//.test(url)) continue;

    const published = toIso(
      isAtom ? tag(b, 'published') || tag(b, 'updated') : tag(b, 'pubDate') || tag(b, 'date')
    );
    const summaryRaw = isAtom ? tag(b, 'summary') || tag(b, 'content') : tag(b, 'description');
    const summary = cleanText(summaryRaw)?.slice(0, 240);
    const imageUrl =
      attr(b, 'media:content', 'url') || attr(b, 'media:thumbnail', 'url') || attr(b, 'enclosure', 'url') || undefined;

    items.push({
      id: hashId(url),
      title,
      source,
      url,
      publishedUtc: published,
      ...(summary ? { summary } : {}),
      ...(imageUrl ? { imageUrl } : {}),
      topics: tagTopics(`${title} ${summary ?? ''}`),
    });
  }
  return items;
}

/** Matches World-Cup-related headlines/summaries. Used to filter general feeds. */
export const WORLD_CUP_RE = /\bworld[\s-]?cup\b|\bwc[\s-]?2026\b|\bmundial\b/i;

/** Other-sport World Cups (cricket, rugby, etc.) that must NOT leak into a football app. */
export const OTHER_SPORT_RE =
  /\b(cricket|rugby|netball|hockey|wicket|odi|test match|six nations|nrl|nfl|nba|baseball|tennis|golf|formula\s?1|f1)\b/i;

export function isWorldCupRelevant(item: NewsItem): boolean {
  const text = `${item.title} ${item.summary ?? ''}`;
  return WORLD_CUP_RE.test(text) && !OTHER_SPORT_RE.test(text);
}

/** Merge feeds: de-dup by id (and by normalized title), newest first, capped. */
export function mergeNews(lists: NewsItem[][], limit = 60): NewsItem[] {
  const byId = new Map<string, NewsItem>();
  const seenTitles = new Set<string>();
  for (const list of lists) {
    for (const it of list) {
      const tkey = it.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      if (byId.has(it.id) || seenTitles.has(tkey)) continue;
      byId.set(it.id, it);
      seenTitles.add(tkey);
    }
  }
  return Array.from(byId.values())
    .sort((a, b) => Date.parse(b.publishedUtc) - Date.parse(a.publishedUtc))
    .slice(0, limit);
}
