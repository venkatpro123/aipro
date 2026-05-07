// rssNewsConnector.ts
// RSS/news signal connector — Economic Times, Glassdoor, HN, Hacker News API.
// All free, no API key required (ET RSS + HN official API).

export interface NewsSignal {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  sentiment: 'negative' | 'neutral' | 'positive';
  layoffMentioned: boolean;
  companyMentioned: boolean;
}

export interface NewsSummary {
  company: string;
  signals: NewsSignal[];
  negativeCount: number;
  layoffSignalCount: number;
  sentimentScore: number; // -1 (very negative) to +1 (very positive)
  fetchedAt: string;
}

// Free RSS→JSON proxy (no key needed)
const RSS_PROXY = 'https://api.rss2json.com/v1/api.json?rss_url=';

const FEEDS = {
  economicTimes: 'https://economictimes.indiatimes.com/tech/tech-bytes/rssfeeds/78570561.cms',
  hnTop: 'https://hnrss.org/frontpage',
  glassdoor: 'https://www.glassdoor.com/about-us/press/rss',
};

const LAYOFF_KEYWORDS = ['layoff', 'laid off', 'retrenchment', 'job cut', 'headcount reduction',
  'workforce reduction', 'downsizing', 'redundancy', 'job loss', 'termination'];
const NEGATIVE_KEYWORDS = [...LAYOFF_KEYWORDS, 'loss', 'decline', 'revenue miss', 'profit warning',
  'bankruptcy', 'shutdown', 'freeze', 'restructure', 'write-off'];

async function fetchRSSFeed(url: string): Promise<any[]> {
  try {
    const res = await fetch(`${RSS_PROXY}${encodeURIComponent(url)}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.items ?? [];
  } catch {
    return [];
  }
}

// HN Algolia API — free, official
async function fetchHNMentions(company: string): Promise<NewsSignal[]> {
  try {
    const res = await fetch(
      `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(company)}&tags=story&hitsPerPage=10`,
      { signal: AbortSignal.timeout(4000) },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.hits ?? []).map((hit: any): NewsSignal => {
      const title = hit.title ?? '';
      const lower = title.toLowerCase();
      return {
        title,
        source: 'Hacker News',
        url: hit.url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`,
        publishedAt: hit.created_at ?? '',
        sentiment: detectSentiment(lower),
        layoffMentioned: LAYOFF_KEYWORDS.some(kw => lower.includes(kw)),
        companyMentioned: true,
      };
    });
  } catch {
    return [];
  }
}

function detectSentiment(text: string): 'negative' | 'neutral' | 'positive' {
  const neg = NEGATIVE_KEYWORDS.filter(kw => text.includes(kw)).length;
  const pos = ['growth', 'profit', 'record', 'expansion', 'hire', 'launch'].filter(kw => text.includes(kw)).length;
  if (neg > pos) return 'negative';
  if (pos > neg) return 'positive';
  return 'neutral';
}

export async function fetchCompanyNewsSignals(company: string): Promise<NewsSummary> {
  const emptyResult: NewsSummary = {
    company, signals: [], negativeCount: 0, layoffSignalCount: 0,
    sentimentScore: 0, fetchedAt: new Date().toISOString(),
  };
  try {
  const companyLower = company.toLowerCase();

  const [etItems, hnSignals] = await Promise.allSettled([
    fetchRSSFeed(FEEDS.economicTimes),
    fetchHNMentions(company),
  ]).then(results => [
    results[0].status === 'fulfilled' ? results[0].value : [] as any[],
    results[1].status === 'fulfilled' ? results[1].value : [] as NewsSignal[],
  ]);

  const etSignals: NewsSignal[] = etItems
    .filter((item: any) => {
      const text = `${item.title} ${item.description}`.toLowerCase();
      return text.includes(companyLower);
    })
    .map((item: any): NewsSignal => {
      const text = `${item.title} ${item.description ?? ''}`.toLowerCase();
      return {
        title: item.title,
        source: 'Economic Times',
        url: item.link ?? '',
        publishedAt: item.pubDate ?? '',
        sentiment: detectSentiment(text),
        layoffMentioned: LAYOFF_KEYWORDS.some(kw => text.includes(kw)),
        companyMentioned: true,
      };
    });

  const allSignals = [...etSignals, ...hnSignals];
  const negCount = allSignals.filter(s => s.sentiment === 'negative').length;
  const posCount = allSignals.filter(s => s.sentiment === 'positive').length;
  const layoffCount = allSignals.filter(s => s.layoffMentioned).length;
  const total = allSignals.length || 1;

  return {
    company,
    signals: allSignals.slice(0, 20),
    negativeCount: negCount,
    layoffSignalCount: layoffCount,
    sentimentScore: (posCount - negCount) / total,
    fetchedAt: new Date().toISOString(),
  };
  } catch (err: any) {
    console.warn('[RSSConnector] fetchCompanyNewsSignals failed:', err?.message);
    return emptyResult;
  }
}
