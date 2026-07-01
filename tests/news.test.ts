import { describe, it, expect } from 'vitest';
import { parseFeed, mergeNews, tagTopics, hashId, decodeEntities, isWorldCupRelevant } from '../src/lib/news';

const RSS = `<?xml version="1.0"?>
<rss version="2.0"><channel>
  <title>Example Sport</title>
  <item>
    <title>Star striker scores hat-trick in opener</title>
    <link>https://example.com/a</link>
    <pubDate>Mon, 15 Jun 2026 10:00:00 GMT</pubDate>
    <description><![CDATA[<p>A brilliant <b>goal</b> display.</p>]]></description>
  </item>
  <item>
    <title>Coach confirms squad for World Cup</title>
    <link>https://example.com/b</link>
    <pubDate>Tue, 16 Jun 2026 12:00:00 GMT</pubDate>
    <description>The manager named his 26.</description>
  </item>
</channel></rss>`;

const ATOM = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>Club agrees record transfer</title>
    <link href="https://atom.example.com/x"/>
    <published>2026-06-17T09:30:00Z</published>
    <summary>A big signing.</summary>
  </entry>
</feed>`;

describe('parseFeed', () => {
  it('parses RSS items with titles, links and dates', () => {
    const items = parseFeed(RSS, 'Example Sport');
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe('Star striker scores hat-trick in opener');
    expect(items[0].url).toBe('https://example.com/a');
    expect(items[0].source).toBe('Example Sport');
    expect(items[0].publishedUtc).toBe('2026-06-15T10:00:00.000Z');
    expect(items[0].summary).toContain('brilliant goal display');
  });

  it('parses Atom entries with href links', () => {
    const items = parseFeed(ATOM, 'Atom Source');
    expect(items).toHaveLength(1);
    expect(items[0].url).toBe('https://atom.example.com/x');
    expect(items[0].topics).toContain('clubs');
  });

  it('skips items without a valid http url', () => {
    const bad = `<rss><channel><item><title>No link</title></item></channel></rss>`;
    expect(parseFeed(bad, 'X')).toHaveLength(0);
  });
});

describe('tagTopics', () => {
  it('classifies coaches, clubs and players', () => {
    expect(tagTopics('The coach picked his side')).toContain('coaches');
    expect(tagTopics('Record transfer to a big club')).toContain('clubs');
    expect(tagTopics('Striker suffers injury')).toContain('players');
    expect(tagTopics('Nothing relevant here')).toEqual(['teams']);
  });
});

describe('mergeNews', () => {
  it('de-dups by id and title and sorts newest first', () => {
    const a = parseFeed(RSS, 'A');
    const b = parseFeed(RSS, 'B'); // same urls -> same ids
    const merged = mergeNews([a, b]);
    expect(merged).toHaveLength(2);
    expect(Date.parse(merged[0].publishedUtc)).toBeGreaterThan(Date.parse(merged[1].publishedUtc));
  });

  it('caps the list at the limit', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      id: hashId('u' + i), title: 't' + i, source: 'S', url: 'https://x/' + i,
      publishedUtc: new Date(2026, 0, i + 1).toISOString(),
    }));
    expect(mergeNews([many], 5)).toHaveLength(5);
  });
});

describe('isWorldCupRelevant', () => {
  const mk = (title: string, summary = '') => ({
    id: 'x', title, source: 'S', url: 'https://x', publishedUtc: '2026-06-20T00:00:00Z', summary,
  });
  it('keeps World Cup stories', () => {
    expect(isWorldCupRelevant(mk('England reach World Cup last 16'))).toBe(true);
    expect(isWorldCupRelevant(mk('Transfer news', 'signed ahead of the World Cup 2026'))).toBe(true);
  });
  it('drops non-World-Cup football stories', () => {
    expect(isWorldCupRelevant(mk('Premier League club agrees transfer'))).toBe(false);
  });
  it('drops other-sport World Cups (cricket/rugby)', () => {
    expect(isWorldCupRelevant(mk('England name squad for Cricket World Cup'))).toBe(false);
    expect(isWorldCupRelevant(mk('Rugby World Cup semi-final preview'))).toBe(false);
  });
});

describe('decodeEntities', () => {
  it('decodes named and numeric entities', () => {
    expect(decodeEntities('Fish &amp; Chips &#39;26')).toBe("Fish & Chips '26");
  });
});
