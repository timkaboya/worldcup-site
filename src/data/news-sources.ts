// News RSS allow-list. Only reputable, freely-syndicated football feeds.
// Attribution is preserved (source name + outbound link) per each publisher's
// RSS terms; we link out to the origin and never republish full articles.

export interface NewsSource {
  name: string;
  url: string;
  /** true = feed is already World-Cup-scoped; false/undefined = apply keyword filter. */
  worldCup?: boolean;
}

export const NEWS_SOURCES: NewsSource[] = [
  // World-Cup-scoped feeds — every item is relevant, no keyword filter needed.
  { name: 'BBC Sport', url: 'https://feeds.bbci.co.uk/sport/football/world-cup/rss.xml', worldCup: true },
  { name: 'The Guardian', url: 'https://www.theguardian.com/football/world-cup-2026/rss', worldCup: true },
  // General football feeds — filtered down to World-Cup-relevant stories only.
  { name: 'ESPN FC', url: 'https://www.espn.com/espn/rss/soccer/news' },
  { name: 'Sky Sports', url: 'https://www.skysports.com/rss/11095' },
];
