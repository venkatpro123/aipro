// rssNewsConnector.ts
// RSS/news signal connector — Economic Times, Google News, Hacker News API.
//
// Zero paid APIs and zero proxies. All sources fetched directly:
//   - Google News RSS (no key, region-aware via hl/gl/ceid params)
//   - Bing News RSS (no key)
//   - Yahoo Finance RSS (no key, ticker-targeted)
//   - Economic Times RSS (direct XML fetch; CORS-blocked feeds silently return [])
//   - APAC feeds: TechInAsia, CNA Business, e27, Reuters Asia (direct XML fetch)
//   - Reddit JSON search API (no key, User-Agent required)
//   - Hacker News Algolia API (no key, no quota)
//
// CORS-blocked feeds (ET, some APAC) return [] from the browser; those sources
// are fully covered server-side by the proxy-live-signals Edge Function action=news.
//
// FIXES APPLIED:
//   1. Glassdoor press RSS removed — provided zero per-company signal.
//   2. Negation detection — "denies layoffs", "no plans to cut" no longer count.
//   3. URL-based deduplication — syndicated articles counted once.
//   4. rss2json proxy removed — was 100/day limited; all feeds now direct.
//   5. Article count cap corrected — based on *matched* articles, not raw feed size.

import { readCache, writeCache } from '../apiResponseCache';

export interface NewsSignal {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  sentiment: 'negative' | 'neutral' | 'positive';
  layoffMentioned: boolean;
  companyMentioned: boolean;
  negationDetected: boolean;
}

export interface NewsSummary {
  company: string;
  signals: NewsSignal[];
  negativeCount: number;
  layoffSignalCount: number;
  sentimentScore: number;
  fetchedAt: string;
}

// ── Minimal RSS XML parser ─────────────────────────────────────────────────
// Shared across all direct-fetch paths. No DOM dependency.

function parseRSSXml(xml: string): Array<{ title: string; link: string; description: string; pubDate: string }> {
  const items: Array<{ title: string; link: string; description: string; pubDate: string }> = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRegex.exec(xml)) !== null) {
    const block = m[1];
    const title       = (/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i.exec(block)
                        ?? /<title>([\s\S]*?)<\/title>/i.exec(block))?.[1]?.trim() ?? '';
    const link        = (/<link>([\s\S]*?)<\/link>/i.exec(block))?.[1]?.trim() ?? '';
    const description = (/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i.exec(block)
                        ?? /<description>([\s\S]*?)<\/description>/i.exec(block))?.[1]?.trim() ?? '';
    const pubDate     = (/<pubDate>([\s\S]*?)<\/pubDate>/i.exec(block))?.[1]?.trim() ?? '';
    if (title || link) items.push({ title, link, description, pubDate });
  }
  return items;
}

/** Direct XML fetch — silently returns [] for CORS-blocked or unreachable feeds. */
async function fetchDirectRSS(url: string, timeoutMs = 6_000): Promise<any[]> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: 'application/rss+xml, application/xml, text/xml, */*' },
    });
    if (!res.ok) return [];
    const text = await res.text();
    return parseRSSXml(text);
  } catch {
    return [];
  }
}

// ── Google News locale table ────────────────────────────────────────────────

const GOOGLE_NEWS_LOCALE: Record<string, { hl: string; gl: string; ceid: string }> = {
  IN:   { hl: 'en-IN', gl: 'IN', ceid: 'IN:en' },
  SG:   { hl: 'en-SG', gl: 'SG', ceid: 'SG:en' },
  UK:   { hl: 'en-GB', gl: 'GB', ceid: 'GB:en' },
  AU:   { hl: 'en-AU', gl: 'AU', ceid: 'AU:en' },
  CA:   { hl: 'en-CA', gl: 'CA', ceid: 'CA:en' },
  DE:   { hl: 'de',    gl: 'DE', ceid: 'DE:de' },
  FR:   { hl: 'fr',    gl: 'FR', ceid: 'FR:fr' },
  AE:   { hl: 'en-AE', gl: 'AE', ceid: 'AE:en' },
  US:   { hl: 'en-US', gl: 'US', ceid: 'US:en' },
};
const DEFAULT_GOOGLE_LOCALE = { hl: 'en', gl: 'US', ceid: 'US:en' };

function googleNewsRssUrl(company: string, region?: string): string {
  const loc = (region && GOOGLE_NEWS_LOCALE[region]) ?? DEFAULT_GOOGLE_LOCALE;
  return `https://news.google.com/rss/search?q=${encodeURIComponent(company + ' layoff OR restructuring OR job cut')}&hl=${loc.hl}&gl=${loc.gl}&ceid=${loc.ceid}`;
}

function bingNewsRssUrl(company: string): string {
  return `https://www.bing.com/news/search?q=${encodeURIComponent('"' + company + '" layoff OR restructuring')}&format=RSS`;
}

function yahooFinanceRssUrl(ticker: string): string {
  return `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(ticker)}&region=US&lang=en-US`;
}

// APAC/Singapore-specific static feeds — TechInAsia, CNA Business, e27.
// These break Singapore/SEA layoffs 4-8h before global English press.
const APAC_STATIC_FEEDS = {
  techInAsia:      'https://www.techinasia.com/feed',
  cnaBusinessTech: 'https://www.channelnewsasia.com/rssfeeds/8395986',
  e27:             'https://e27.co/feed/',
  reutersAsia:     'https://feeds.reuters.com/reuters/technologyNews',
};

const STATIC_FEEDS = {
  economicTimes: 'https://economictimes.indiatimes.com/tech/tech-bytes/rssfeeds/78570561.cms',
};

const LAYOFF_KEYWORDS = [
  'layoff', 'laid off', 'lay off', 'lays off', 'retrenchment', 'job cut',
  'job cuts', 'headcount reduction', 'workforce reduction', 'downsizing',
  'redundancy', 'job loss', 'termination', 'reduction in force', 'rif',
  'restructuring', 'cost cutting', 'cost-cutting',
];

const NEGATION_PHRASES = [
  'denies layoff', 'deny layoff', 'no layoff', 'no plans to lay',
  'not laying off', 'rules out layoff', 'refutes layoff', 'no job cut',
  'won\'t cut', 'will not cut', 'not cutting jobs', 'denies job cut',
  'contrary to reports', 'rumour', 'rumor', 'specul',
];

const NEGATIVE_KEYWORDS = [
  ...LAYOFF_KEYWORDS, 'loss', 'decline', 'revenue miss', 'profit warning',
  'bankruptcy', 'shutdown', 'freeze', 'write-off',
];

const POSITIVE_KEYWORDS = [
  'growth', 'profit', 'record', 'expansion', 'hire', 'hiring',
  'launch', 'partnership', 'funded', 'funding round', 'ipo',
];

function detectSentiment(text: string): 'negative' | 'neutral' | 'positive' {
  const neg = NEGATIVE_KEYWORDS.filter(kw => text.includes(kw)).length;
  const pos = POSITIVE_KEYWORDS.filter(kw => text.includes(kw)).length;
  if (neg > pos) return 'negative';
  if (pos > neg) return 'positive';
  return 'neutral';
}

function isNegated(text: string): boolean {
  return NEGATION_PHRASES.some(phrase => text.includes(phrase));
}

// 5-word title fingerprint for deduplication
function titleFingerprint(title: string): string {
  return title.toLowerCase().split(/\s+/).slice(0, 5).join(' ');
}

// Reddit search — no API key, company layoff mentions
async function fetchRedditMentions(company: string): Promise<NewsSignal[]> {
  try {
    const q = encodeURIComponent(company + ' layoff');
    const res = await fetch(
      `https://www.reddit.com/search.json?q=${q}&sort=new&limit=15&t=month`,
      {
        headers: { 'User-Agent': 'HumanProofIntelligence/1.0 (layoff research; non-commercial)' },
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.data?.children ?? []).map((post: any): NewsSignal => {
      const d = post?.data ?? {};
      const title = d.title ?? '';
      const lower = title.toLowerCase();
      const negated = isNegated(lower);
      return {
        title,
        source: `Reddit r/${d.subreddit ?? 'layoffs'}`,
        url: d.url ?? `https://reddit.com${d.permalink ?? ''}`,
        publishedAt: d.created_utc ? new Date(d.created_utc * 1000).toISOString() : '',
        sentiment: negated ? 'neutral' : detectSentiment(lower),
        layoffMentioned: !negated && LAYOFF_KEYWORDS.some(kw => lower.includes(kw)),
        companyMentioned: true,
        negationDetected: negated,
      };
    }).filter((s: NewsSignal) => s.title.length > 0);
  } catch {
    return [];
  }
}

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
      const negated = isNegated(lower);
      return {
        title,
        source: 'Hacker News',
        url: hit.url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`,
        publishedAt: hit.created_at ?? '',
        sentiment: negated ? 'neutral' : detectSentiment(lower),
        layoffMentioned: !negated && LAYOFF_KEYWORDS.some(kw => lower.includes(kw)),
        companyMentioned: true,
        negationDetected: negated,
      };
    });
  } catch {
    return [];
  }
}

/**
 * fetchCompanyNewsSignals — scraping-first, zero paid APIs, zero proxies.
 *
 * Sources:
 *   - Google News RSS (region-aware, no key)
 *   - Bing News RSS (no key)
 *   - Yahoo Finance RSS (ticker-targeted, no key)
 *   - Economic Times RSS (direct; CORS-blocked feeds silently return [])
 *   - Hacker News Algolia API (no key, no quota)
 *   - Reddit JSON (no key, User-Agent required)
 *   - For SG/AU/APAC: TechInAsia, CNA Business, e27, Reuters Asia (direct fetch)
 *
 * @param region  Optional ISO region code (SG, IN, UK, AU, DE, CA, US, …).
 *                Controls Google News geo-locale and whether APAC feeds are included.
 */
export async function fetchCompanyNewsSignals(company: string, ticker?: string, region?: string): Promise<NewsSummary> {
  const emptyResult: NewsSummary = {
    company, signals: [], negativeCount: 0, layoffSignalCount: 0,
    sentimentScore: 0, fetchedAt: new Date().toISOString(),
  };
  try {
    const companyLower = company.toLowerCase();

    const isApac = region === 'SG' || region === 'AU' || region === 'MY' || region === 'ID' || region === 'PH';
    const isIndia = region === 'IN';

    // Launch all sources concurrently — no quotas, no keys.
    const fetches: Promise<any>[] = [
      isIndia || !region
        ? fetchDirectRSS(STATIC_FEEDS.economicTimes)   // 0: ET (India / default)
        : Promise.resolve([]),
      fetchDirectRSS(googleNewsRssUrl(company, region)), // 1: Google News (region-aware)
      fetchHNMentions(company),                          // 2: Hacker News
      fetchDirectRSS(bingNewsRssUrl(company)),           // 3: Bing News
      fetchRedditMentions(company),                      // 4: Reddit
    ];
    if (ticker) fetches.push(fetchDirectRSS(yahooFinanceRssUrl(ticker))); // 5: Yahoo Finance RSS
    if (isApac) {
      fetches.push(fetchDirectRSS(APAC_STATIC_FEEDS.techInAsia));      // 6
      fetches.push(fetchDirectRSS(APAC_STATIC_FEEDS.cnaBusinessTech)); // 7
      fetches.push(fetchDirectRSS(APAC_STATIC_FEEDS.e27));             // 8
      fetches.push(fetchDirectRSS(APAC_STATIC_FEEDS.reutersAsia));     // 9
    }

    const settled = await Promise.allSettled(fetches);
    const [etItems, gnItems, hnSignals, bingItems, redditSignals] = [
      settled[0].status === 'fulfilled' ? settled[0].value : [] as any[],
      settled[1].status === 'fulfilled' ? settled[1].value : [] as any[],
      settled[2].status === 'fulfilled' ? settled[2].value : [] as NewsSignal[],
      settled[3].status === 'fulfilled' ? settled[3].value : [] as any[],
      settled[4].status === 'fulfilled' ? settled[4].value : [] as NewsSignal[],
    ];
    const yfItems = ticker && settled[5]?.status === 'fulfilled' ? settled[5].value as any[] : [];
    const apacItems: any[] = isApac
      ? [6, 7, 8, 9].flatMap(i => settled[i]?.status === 'fulfilled' ? settled[i].value : [])
      : [];

    const seenUrls = new Set<string>();
    const seenFingerprints = new Set<string>();
    const allSignals: NewsSignal[] = [];

    const processItem = (item: any, sourceName: string): NewsSignal | null => {
      const title = String(item.title ?? '');
      const description = String(item.description ?? item.summary ?? '').replace(/<[^>]+>/g, ' ');
      const url = String(item.link ?? item.url ?? '');
      const combined = `${title} ${description}`.toLowerCase();

      // URL dedup
      if (url && seenUrls.has(url)) return null;
      // Title fingerprint dedup
      const fp = titleFingerprint(title);
      if (fp.length > 8 && seenFingerprints.has(fp)) return null;

      // Company relevance: company name must appear in title or description
      if (!combined.includes(companyLower)) return null;

      if (url) seenUrls.add(url);
      if (fp) seenFingerprints.add(fp);

      const negated = isNegated(combined);
      const layoffMentioned = !negated && LAYOFF_KEYWORDS.some(kw => combined.includes(kw));

      return {
        title,
        source: sourceName,
        url,
        publishedAt: String(item.pubDate ?? item.isoDate ?? ''),
        sentiment: negated ? 'neutral' : detectSentiment(combined),
        layoffMentioned,
        companyMentioned: true,
        negationDetected: negated,
      };
    };

    // Economic Times
    for (const item of etItems) {
      const sig = processItem(item, 'Economic Times');
      if (sig) allSignals.push(sig);
    }

    // Google News
    for (const item of gnItems) {
      const sig = processItem(item, 'Google News');
      if (sig) allSignals.push(sig);
    }

    // Bing News
    for (const item of bingItems) {
      const sig = processItem(item, 'Bing News');
      if (sig) allSignals.push(sig);
    }

    // Yahoo Finance RSS
    for (const item of yfItems) {
      const sig = processItem(item, 'Yahoo Finance');
      if (sig) allSignals.push(sig);
    }

    // APAC supplemental (TechInAsia, CNA, e27, Reuters Asia)
    for (const item of apacItems) {
      const link = String(item.link ?? item.url ?? '');
      const sourceName = link.includes('techinasia') ? 'TechInAsia'
        : link.includes('channelnewsasia') ? 'CNA Business'
        : link.includes('e27') ? 'e27'
        : link.includes('reuters') ? 'Reuters Asia'
        : 'APAC Press';
      const sig = processItem(item, sourceName);
      if (sig) allSignals.push(sig);
    }

    // Hacker News (pre-typed as NewsSignal)
    for (const hn of hnSignals as NewsSignal[]) {
      const url = hn.url;
      const fp = titleFingerprint(hn.title);
      if (url && seenUrls.has(url)) continue;
      if (fp.length > 8 && seenFingerprints.has(fp)) continue;
      if (url) seenUrls.add(url);
      if (fp) seenFingerprints.add(fp);
      allSignals.push(hn);
    }

    // Reddit (pre-typed as NewsSignal)
    for (const r of redditSignals as NewsSignal[]) {
      const url = r.url;
      const fp = titleFingerprint(r.title);
      if (url && seenUrls.has(url)) continue;
      if (fp.length > 8 && seenFingerprints.has(fp)) continue;
      if (url) seenUrls.add(url);
      if (fp) seenFingerprints.add(fp);
      allSignals.push(r);
    }

    const negCount    = allSignals.filter(s => s.sentiment === 'negative').length;
    const posCount    = allSignals.filter(s => s.sentiment === 'positive').length;
    const layoffCount = allSignals.filter(s => s.layoffMentioned).length;
    const total       = allSignals.length || 1;

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
