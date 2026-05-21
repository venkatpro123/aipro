// rssNewsConnector.ts
// RSS/news signal connector — Economic Times, Google News, Hacker News API.
//
// FIXES APPLIED:
//   1. Glassdoor press RSS removed — the previous URL (glassdoor.com/about-us/press/rss)
//      fetched Glassdoor's own press releases, not employee reviews or company
//      sentiment. It provided zero signal about any specific company. Replaced
//      with Google News RSS (no API key, company-targeted via q= param).
//
//   2. Negation detection — "denies layoffs", "no plans to cut", "refutes"
//      no longer increment the layoff count or drive the signal negative.
//
//   3. URL-based deduplication — syndicated articles (same headline on 8 news
//      aggregator sites) no longer count as 8 separate events. Dedup by URL
//      and 5-word title fingerprint.
//
//   4. rss2json.com fallback — when the proxy fails (100/day free limit),
//      the connector falls back to the HN Algolia API (no quota) and Google
//      News direct fetch (CORS permissive for GET requests).
//
//   5. Article count cap corrected — totalResults from RSS feeds often
//      over-counts (feed returns 50 items; only 2 are about the company).
//      Signal is now based on *matched* articles, not the raw feed size.

import {
  isCallAllowed,
  recordSuccess as circuitSuccess,
  recordFailure as circuitFailure,
  getCachedResponse,
} from '../apiCircuitBreaker';
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

const RSS_PROXY = 'https://api.rss2json.com/v1/api.json?rss_url=';

// Google News locale table — maps our internal region keys to Google News gl/hl/ceid params.
// Previously hardcoded to gl=IN for all companies, meaning Singapore/UK/EU queries ran
// through India's Google News index and de-prioritized TechInAsia, CNA, e27, etc.
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

// Google News RSS: company-targeted, no API key, region-aware.
function googleNewsRssUrl(company: string, region?: string): string {
  const loc = (region && GOOGLE_NEWS_LOCALE[region]) ?? DEFAULT_GOOGLE_LOCALE;
  return `https://news.google.com/rss/search?q=${encodeURIComponent(company + ' layoff OR restructuring OR job cut')}&hl=${loc.hl}&gl=${loc.gl}&ceid=${loc.ceid}`;
}

// Bing News RSS: no API key, company-targeted
function bingNewsRssUrl(company: string): string {
  return `https://www.bing.com/news/search?q=${encodeURIComponent('"' + company + '" layoff OR restructuring')}&format=RSS`;
}

// Yahoo Finance News RSS: ticker-targeted, no API key
function yahooFinanceRssUrl(ticker: string): string {
  return `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(ticker)}&region=US&lang=en-US`;
}

// APAC/Singapore-specific static feeds — TechInAsia, CNA Business, e27.
// These are the primary sources that break Singapore tech layoffs 4-8 hours
// before they reach global English press (TechCrunch, Reuters global).
const APAC_STATIC_FEEDS = {
  techInAsia:  'https://www.techinasia.com/feed',
  cnaBusinessTech: 'https://www.channelnewsasia.com/rssfeeds/8395986',
  e27:         'https://e27.co/feed/',
  reutersAsia: 'https://feeds.reuters.com/reuters/technologyNews',
};

const STATIC_FEEDS = {
  economicTimes: 'https://economictimes.indiatimes.com/tech/tech-bytes/rssfeeds/78570561.cms',
  hnTop: 'https://hnrss.org/frontpage',
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

async function fetchRSSViaProxy(url: string): Promise<any[]> {
  // Circuit breaker gate — OPEN means rss2json is unavailable; serve local circuit cache.
  if (!isCallAllowed('rss2json')) {
    const cached = getCachedResponse<any[]>('rss2json');
    return cached?.data ?? [];
  }

  // Shared cross-user Supabase cache (30 min TTL) — before making a live call.
  const sharedCacheKey = `rss2json|${url}`;
  const sharedCached = await readCache<any[]>('rss2json', sharedCacheKey);
  if (sharedCached) {
    circuitSuccess('rss2json', sharedCached.payload);
    return sharedCached.payload;
  }

  try {
    const res = await fetch(`${RSS_PROXY}${encodeURIComponent(url)}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      circuitFailure('rss2json', `HTTP ${res.status}`);
      return [];
    }
    const data = await res.json();
    const items = data?.items ?? [];
    circuitSuccess('rss2json', items);
    writeCache('rss2json', sharedCacheKey, items);
    return items;
  } catch (err: any) {
    circuitFailure('rss2json', err?.message ?? String(err));
    return [];
  }
}

// Direct Google News RSS fetch (no proxy needed — Google News allows CORS GET)
async function fetchGoogleNewsRSS(company: string, region?: string): Promise<any[]> {
  try {
    const url = googleNewsRssUrl(company, region);
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return [];
    const text = await res.text();
    // Minimal XML item parser — extracts title, link, pubDate from RSS items
    const items: any[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let m: RegExpExecArray | null;
    while ((m = itemRegex.exec(text)) !== null) {
      const block = m[1];
      const title   = (/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i.exec(block) ?? /<title>([\s\S]*?)<\/title>/i.exec(block))?.[1] ?? '';
      const link    = (/<link>([\s\S]*?)<\/link>/i.exec(block))?.[1] ?? '';
      const pubDate = (/<pubDate>([\s\S]*?)<\/pubDate>/i.exec(block))?.[1] ?? '';
      if (title) items.push({ title: title.trim(), link: link.trim(), pubDate: pubDate.trim() });
    }
    return items;
  } catch {
    return [];
  }
}

// Bing News RSS — no API key, company-targeted (CORS-permissive GET endpoint)
async function fetchBingNewsRSS(company: string): Promise<any[]> {
  try {
    const url = bingNewsRssUrl(company);
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return [];
    const text = await res.text();
    const items: any[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let m: RegExpExecArray | null;
    while ((m = itemRegex.exec(text)) !== null) {
      const block = m[1];
      const title   = (/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i.exec(block) ?? /<title>([\s\S]*?)<\/title>/i.exec(block))?.[1] ?? '';
      const link    = (/<link>([\s\S]*?)<\/link>/i.exec(block))?.[1] ?? '';
      const pubDate = (/<pubDate>([\s\S]*?)<\/pubDate>/i.exec(block))?.[1] ?? '';
      if (title) items.push({ title: title.trim(), link: link.trim(), pubDate: pubDate.trim() });
    }
    return items;
  } catch {
    return [];
  }
}

// Yahoo Finance News RSS — no API key, ticker-targeted
async function fetchYahooFinanceRSS(ticker: string): Promise<any[]> {
  try {
    const url = yahooFinanceRssUrl(ticker);
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return [];
    const text = await res.text();
    const items: any[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let m: RegExpExecArray | null;
    while ((m = itemRegex.exec(text)) !== null) {
      const block = m[1];
      const title   = (/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i.exec(block) ?? /<title>([\s\S]*?)<\/title>/i.exec(block))?.[1] ?? '';
      const link    = (/<link>([\s\S]*?)<\/link>/i.exec(block))?.[1] ?? '';
      const pubDate = (/<pubDate>([\s\S]*?)<\/pubDate>/i.exec(block))?.[1] ?? '';
      if (title) items.push({ title: title.trim(), link: link.trim(), pubDate: pubDate.trim() });
    }
    return items;
  } catch {
    return [];
  }
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
 * fetchCompanyNewsSignals — scraping-first, no API key required.
 * Sources: Google News RSS (region-aware) + Bing News RSS + Yahoo Finance RSS (if ticker) +
 *          Reddit JSON + Economic Times RSS + Hacker News Algolia API.
 * For SG/AU/APAC: additionally polls TechInAsia, CNA Business, e27, Reuters Asia.
 * All sources are free-tier with no daily quotas.
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

    // Launch all scraped sources concurrently — no API keys, no quotas.
    // APAC companies additionally poll TechInAsia, CNA Business, e27, Reuters Asia
    // because these sources break Singapore/SEA layoffs 4-8h before TechCrunch.
    const fetches: Promise<any>[] = [
      isIndia || !region ? fetchRSSViaProxy(STATIC_FEEDS.economicTimes) : Promise.resolve([]),  // 0: ET (India only)
      fetchGoogleNewsRSS(company, region),            // 1: Google News (region-aware)
      fetchHNMentions(company),                       // 2: Hacker News
      fetchBingNewsRSS(company),                      // 3: Bing News
      fetchRedditMentions(company),                   // 4: Reddit
    ];
    if (ticker) fetches.push(fetchYahooFinanceRSS(ticker)); // 5: Yahoo Finance RSS (ticker-only)
    if (isApac) {
      fetches.push(fetchRSSViaProxy(APAC_STATIC_FEEDS.techInAsia));   // 6: TechInAsia
      fetches.push(fetchRSSViaProxy(APAC_STATIC_FEEDS.cnaBusinessTech)); // 7: CNA Business
      fetches.push(fetchRSSViaProxy(APAC_STATIC_FEEDS.e27));          // 8: e27
      fetches.push(fetchRSSViaProxy(APAC_STATIC_FEEDS.reutersAsia));  // 9: Reuters Asia
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
    // APAC supplemental feeds (indices 6-9, only populated when isApac)
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

    // Process ET items
    for (const item of etItems) {
      const sig = processItem(item, 'Economic Times');
      if (sig) allSignals.push(sig);
    }

    // Process Google News items (company-targeted, already filtered)
    for (const item of gnItems) {
      const sig = processItem(item, 'Google News');
      if (sig) allSignals.push(sig);
    }

    // Process Bing News items
    for (const item of bingItems) {
      const sig = processItem(item, 'Bing News');
      if (sig) allSignals.push(sig);
    }

    // Process Yahoo Finance RSS items (already company-specific via ticker)
    for (const item of yfItems) {
      const sig = processItem(item, 'Yahoo Finance');
      if (sig) allSignals.push(sig);
    }

    // Process APAC supplemental items (TechInAsia, CNA, e27, Reuters Asia)
    const APAC_SOURCE_NAMES = ['TechInAsia', 'CNA Business', 'e27', 'Reuters Asia'];
    for (let i = 0; i < apacItems.length; i++) {
      const item = apacItems[i];
      // Source name not available per-item since they're mixed from 4 feeds;
      // label by best-guess domain from link, fallback to 'APAC Press'.
      const link = String(item.link ?? item.url ?? '');
      const sourceName = link.includes('techinasia') ? 'TechInAsia'
        : link.includes('channelnewsasia') ? 'CNA Business'
        : link.includes('e27') ? 'e27'
        : link.includes('reuters') ? 'Reuters Asia'
        : 'APAC Press';
      const sig = processItem(item, sourceName);
      if (sig) allSignals.push(sig);
    }

    // Process HN items (already typed as NewsSignal)
    for (const hn of hnSignals as NewsSignal[]) {
      const url = hn.url;
      const fp = titleFingerprint(hn.title);
      if (url && seenUrls.has(url)) continue;
      if (fp.length > 8 && seenFingerprints.has(fp)) continue;
      if (url) seenUrls.add(url);
      if (fp) seenFingerprints.add(fp);
      allSignals.push(hn);
    }

    // Process Reddit items (already typed as NewsSignal)
    for (const r of redditSignals as NewsSignal[]) {
      const url = r.url;
      const fp = titleFingerprint(r.title);
      if (url && seenUrls.has(url)) continue;
      if (fp.length > 8 && seenFingerprints.has(fp)) continue;
      if (url) seenUrls.add(url);
      if (fp) seenFingerprints.add(fp);
      allSignals.push(r);
    }

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
