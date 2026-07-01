// News RSS allow-list. Only reputable, freely-syndicated football feeds.
// Attribution is preserved (source name + outbound link) per each publisher's
// RSS terms; we link out to the origin and never republish full articles.

export interface NewsSource {
  name: string;
  url: string;
}

export const NEWS_SOURCES: NewsSource[] = [
  { name: 'BBC Sport', url: 'https://feeds.bbci.co.uk/sport/football/rss.xml' },
  { name: 'The Guardian', url: 'https://www.theguardian.com/football/rss' },
  { name: 'ESPN FC', url: 'https://www.espn.com/espn/rss/soccer/news' },
  { name: 'Sky Sports', url: 'https://www.skysports.com/rss/12040' },
  { name: 'FourFourTwo', url: 'https://www.fourfourtwo.com/feeds/all' },
];
