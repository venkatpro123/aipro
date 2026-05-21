// proxy-live-signals/index.ts
// SCRAPING-FIRST server-side proxy. API keys are LAST RESORT only.
//
// PRIORITY HIERARCHY:
//   Stock:   1. Yahoo Finance chart + summary (no key, unlimited)
//            2. Alpha Vantage (key required, 25/day FREE — fallback only)
//
//   News:    1. Google News RSS   (no key, unlimited)
//            2. Bing News RSS     (no key, unlimited)
//            3. Yahoo Finance RSS (no key, ticker-targeted)
//            4. Reddit JSON       (no key, unlimited)
//            5. NewsAPI           (key required, 100/day FREE — fallback only)
//
//   Hiring:  1. Naukri internal JSON API (no key, scraped)
//            2. Indeed India HTML  (no key, scraped)
//            3. Serper             (paid API — fallback only)
//
// Env vars (set in Supabase dashboard > Edge Functions > Secrets):
//   ALPHAVANTAGE_API_KEY  (optional — only used when Yahoo Finance fails)
//   NEWS_API_KEY          (optional — only used when all RSS sources return 0)
//   SERPER_API_KEY        (optional — only used when Naukri+Indeed both fail)

import { serve }        from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (d: unknown, status = 200) =>
  new Response(JSON.stringify(d), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

// v40 hardening: gate all proxy actions on a valid Supabase JWT. Without
// this, the function is an open relay — anonymous callers can burn Naukri,
// Indeed, Yahoo, Alpha Vantage, NewsAPI and Serper quotas, and scrape
// third-party sites under our project's IP. 401 immediately on bad auth.
async function requireAuth(req: Request): Promise<Response | null> {
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return json({ error: 'Missing Authorization header' }, 401);
  }
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return json({ error: 'Invalid or expired token' }, 401);
  } catch {
    return json({ error: 'Auth check failed' }, 401);
  }
  return null;
}

// Rotating user agents for scraping — reduces bot fingerprinting
const USER_AGENTS = [
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
];
const UA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

// ── Rate-limit helpers ────────────────────────────────────────────────────────
function isAvRateLimit(note: string | undefined): boolean {
  if (!note) return false;
  const l = note.toLowerCase();
  return l.includes('standard api call frequency') || l.includes('25 requests per day') ||
         l.includes('rate limit') || l.includes('premium');
}
function isNewsApiRateLimit(msg: string): boolean {
  const l = msg.toLowerCase();
  return l.includes('ratelimited') || l.includes('too many requests') || l.includes('429');
}
function isSerperRateLimit(status: number, msg: string): boolean {
  return status === 429 || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate limit');
}

// ── Minimal RSS/XML item extractor (no DOMParser in Deno edge runtime) ────────
function extractRSSItems(xml: string): Array<{ title: string; link: string; pubDate: string }> {
  const items: Array<{ title: string; link: string; pubDate: string }> = [];
  const itemRe = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const title   = (/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i.exec(block)
                  ?? /<title>([\s\S]*?)<\/title>/i.exec(block))?.[1]?.trim() ?? '';
    const link    = (/<link>([\s\S]*?)<\/link>/i.exec(block))?.[1]?.trim() ?? '';
    const pubDate = (/<pubDate>([\s\S]*?)<\/pubDate>/i.exec(block))?.[1]?.trim() ?? '';
    if (title || link) items.push({ title, link, pubDate });
  }
  return items;
}

// ── 1. STOCK — Yahoo Finance (primary, no API key) ────────────────────────────

interface StockResult {
  price90DayChange:  number | null;
  revenueGrowthYoY:  number | null;
  marketCap:         number | null;
  peRatio:           number | null;
  employeeCount:     number | null;
  source:            'yahoo-finance' | 'alphavantage';
  errors:            string[];
  rateLimited:       boolean;
}

async function fetchStockYahoo(ticker: string): Promise<StockResult | null> {
  const ua = UA();
  const headers = { 'User-Agent': ua, 'Accept': 'application/json' };
  const errors: string[] = [];

  let price90DayChange: number | null = null;
  let revenueGrowthYoY: number | null = null;
  let marketCap: number | null = null;
  let peRatio: number | null = null;
  let employeeCount: number | null = null;

  // ── Chart API: 90-day price history ─────────────────────────────────────────
  try {
    const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=90d&events=div%2Csplits`;
    const res = await fetch(chartUrl, { headers, signal: AbortSignal.timeout(9_000) });
    if (!res.ok) throw new Error(`Yahoo chart HTTP ${res.status}`);
    const data = await res.json();

    const result = data?.chart?.result?.[0];
    if (!result) throw new Error('Yahoo chart: no result');

    const closes: (number | null)[] = result?.indicators?.quote?.[0]?.close ?? [];
    const valid = closes.filter((c): c is number => typeof c === 'number' && isFinite(c));
    if (valid.length >= 10) {
      const recent = valid[valid.length - 1];
      const old    = valid[0];
      if (old > 0) price90DayChange = Math.round(((recent - old) / old) * 1000) / 10;
    }
    // Meta fields from chart result
    const meta = result?.meta ?? {};
    if (meta.regularMarketPrice && meta.fiftyTwoWeekLow && meta.fiftyTwoWeekHigh) {
      // P/E approximation from trailing PE if available
      peRatio = meta.trailingPE ?? null;
    }
  } catch (e: any) {
    errors.push(`Yahoo chart: ${e.message}`);
  }

  // ── Quote Summary API: financials + profile ──────────────────────────────────
  try {
    const sumUrl = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=financialData%2CdefaultKeyStatistics%2CassetProfile%2CsummaryDetail`;
    const res = await fetch(sumUrl, { headers, signal: AbortSignal.timeout(9_000) });
    if (!res.ok) throw new Error(`Yahoo summary HTTP ${res.status}`);
    const data = await res.json();

    const result0 = data?.quoteSummary?.result?.[0];
    if (result0) {
      const fd = result0.financialData   ?? {};
      const ks = result0.defaultKeyStatistics ?? {};
      const ap = result0.assetProfile    ?? {};
      const sd = result0.summaryDetail   ?? {};

      // Revenue growth YoY (quarterly, expressed as ratio e.g. 0.08 = 8%)
      const rg = fd.revenueGrowth?.raw;
      revenueGrowthYoY = typeof rg === 'number' ? Math.round(rg * 100) : null;

      // Market cap (enterprise value is a better proxy for company health)
      const ev = ks.enterpriseValue?.raw;
      const mc = sd.marketCap?.raw;
      marketCap = ev ?? mc ?? null;

      // P/E ratio
      const pe = sd.trailingPE?.raw ?? ks.forwardPE?.raw;
      peRatio = typeof pe === 'number' && isFinite(pe) ? Math.round(pe * 10) / 10 : null;

      // Full-time employees
      const emp = ap.fullTimeEmployees;
      employeeCount = typeof emp === 'number' && emp > 0 ? emp : null;
    }
  } catch (e: any) {
    errors.push(`Yahoo summary: ${e.message}`);
  }

  // Return null only if BOTH endpoints produced zero data
  if (price90DayChange === null && revenueGrowthYoY === null && marketCap === null) {
    if (errors.length > 0) return null;
  }

  return { price90DayChange, revenueGrowthYoY, marketCap, peRatio, employeeCount, source: 'yahoo-finance', errors, rateLimited: false };
}

// ── Alpha Vantage (fallback when Yahoo Finance fails) ────────────────────────

async function fetchStockAlphaVantage(ticker: string, apiKey: string): Promise<StockResult | null> {
  const errors: string[] = [];
  let avRateLimited = false;
  let price90DayChange: number | null = null;
  let revenueGrowthYoY: number | null = null;
  let marketCap: number | null = null;
  let peRatio: number | null = null;

  try {
    const ovRes = await fetch(
      `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${encodeURIComponent(ticker)}&apikey=${apiKey}`,
      { signal: AbortSignal.timeout(10_000) },
    );
    if (!ovRes.ok) throw new Error(`AV overview HTTP ${ovRes.status}`);
    const ov = await ovRes.json();
    if (ov.Note || ov.Information) {
      const note = ov.Note ?? ov.Information ?? 'Rate limited';
      avRateLimited = isAvRateLimit(note);
      throw new Error(note);
    }
    if (!ov.Symbol) throw new Error(`No symbol in AV response for ${ticker}`);
    revenueGrowthYoY = ov.QuarterlyRevenueGrowthYOY
      ? Math.round(parseFloat(ov.QuarterlyRevenueGrowthYOY) * 100) : null;
    marketCap = ov.MarketCapitalization ? parseInt(ov.MarketCapitalization) : null;
    peRatio = ov.PERatio && ov.PERatio !== 'None' ? parseFloat(ov.PERatio) : null;
  } catch (e: any) {
    errors.push(`AV overview: ${e.message}`);
    if (!avRateLimited) avRateLimited = isAvRateLimit(e.message);
  }

  if (!avRateLimited) {
    try {
      const dailyRes = await fetch(
        `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(ticker)}&outputsize=compact&apikey=${apiKey}`,
        { signal: AbortSignal.timeout(10_000) },
      );
      if (!dailyRes.ok) throw new Error(`AV daily HTTP ${dailyRes.status}`);
      const daily = await dailyRes.json();
      if (daily.Note || daily.Information) {
        const note = daily.Note ?? daily.Information ?? 'Rate limited';
        avRateLimited = isAvRateLimit(note);
        throw new Error(note);
      }
      const series = daily['Time Series (Daily)'];
      if (series) {
        const dates = Object.keys(series).sort().reverse();
        if (dates.length >= 63) {
          const recent = parseFloat(series[dates[0]]['4. close']);
          const old    = parseFloat(series[dates[62]]['4. close']);
          if (old > 0) price90DayChange = Math.round(((recent - old) / old) * 1000) / 10;
        }
      }
    } catch (e: any) {
      errors.push(`AV daily: ${e.message}`);
    }
  }

  if (avRateLimited) return null;
  return { price90DayChange, revenueGrowthYoY, marketCap, peRatio, employeeCount: null, source: 'alphavantage', errors, rateLimited: avRateLimited };
}

// ── 2. NEWS — Scraped RSS primary, NewsAPI fallback ───────────────────────────

const LAYOFF_KW = ['layoff', 'laid off', 'lay off', 'job cut', 'job cuts', 'workforce reduction',
  'restructuring', 'headcount reduction', 'downsizing', 'retrenchment', 'redundancy',
  'reduction in force', 'rif ', 'cost cut', 'cost-cut'];
const NEGATION_KW = ['denies', 'deny', 'no layoff', 'no plans', 'not laying', 'rules out',
  'refutes', 'contrary to', 'rumour', 'rumor', 'speculation'];

function hasLayoffSignal(text: string): boolean {
  const l = text.toLowerCase();
  if (NEGATION_KW.some(k => l.includes(k))) return false;
  return LAYOFF_KW.some(k => l.includes(k));
}

function extractPercent(text: string): number | null {
  // Must have a workforce keyword nearby
  if (!/\b(workforce|employees|staff|headcount|jobs|roles|workers)\b/i.test(text)) return null;
  const m = text.match(/(\d+(?:\.\d+)?)\s*%\s*(?:of\s+(?:its\s+)?(?:global\s+)?(?:workforce|employees|staff|headcount)|(?:cut|lay|reduc|eliminat|slash))/i);
  if (!m) return null;
  const raw = parseFloat(m[1]);
  if (!isFinite(raw) || raw < 0.5 || raw > 35) return null;
  return raw;
}

interface NewsResult {
  recentHeadlineCount: number;
  sentimentSignal:     number;
  latestLayoffEvent:   any | null;
  fetchedAt:           string;
  errors:              string[];
  newsRateLimited:     boolean;
  scrapedSources:      string[];
}

async function fetchNewsRSS(companyName: string, ticker?: string | null): Promise<NewsResult> {
  const errors: string[] = [];
  const scrapedSources: string[] = [];
  const ua = UA();
  const headers = { 'User-Agent': ua, 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' };

  const allArticles: Array<{ title: string; url: string; pubDate: string; source: string }> = [];

  // ── Google News RSS ──────────────────────────────────────────────────────────
  try {
    const q = encodeURIComponent(`"${companyName}" layoff OR restructuring OR "job cut" OR "workforce reduction"`);
    const url = `https://news.google.com/rss/search?q=${q}&hl=en&gl=US&ceid=US:en`;
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(7_000) });
    if (res.ok) {
      const xml = await res.text();
      const items = extractRSSItems(xml);
      for (const item of items) {
        allArticles.push({ title: item.title, url: item.link, pubDate: item.pubDate, source: 'Google News' });
      }
      if (items.length > 0) scrapedSources.push('Google News RSS');
    }
  } catch (e: any) {
    errors.push(`Google News RSS: ${e.message}`);
  }

  // ── Bing News RSS ─────────────────────────────────────────────────────────────
  try {
    const q = encodeURIComponent(`"${companyName}" layoff restructuring`);
    const url = `https://www.bing.com/news/search?q=${q}&format=RSS`;
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(7_000) });
    if (res.ok) {
      const xml = await res.text();
      const items = extractRSSItems(xml);
      for (const item of items) {
        allArticles.push({ title: item.title, url: item.link, pubDate: item.pubDate, source: 'Bing News' });
      }
      if (items.length > 0) scrapedSources.push('Bing News RSS');
    }
  } catch (e: any) {
    errors.push(`Bing News RSS: ${e.message}`);
  }

  // ── Yahoo Finance News RSS (ticker-targeted) ─────────────────────────────────
  if (ticker) {
    try {
      const url = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(ticker)}&region=US&lang=en-US`;
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(6_000) });
      if (res.ok) {
        const xml = await res.text();
        const items = extractRSSItems(xml);
        for (const item of items) {
          allArticles.push({ title: item.title, url: item.link, pubDate: item.pubDate, source: 'Yahoo Finance' });
        }
        if (items.length > 0) scrapedSources.push('Yahoo Finance RSS');
      }
    } catch (e: any) {
      errors.push(`Yahoo Finance RSS: ${e.message}`);
    }
  }

  // ── Reddit JSON (r/layoffs + general company search) ─────────────────────────
  try {
    const q = encodeURIComponent(`${companyName} layoff`);
    const url = `https://www.reddit.com/search.json?q=${q}&sort=new&limit=25&t=month`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'HumanProof Intelligence/1.0 (company layoff research; contact@humanproof.ai)' },
      signal: AbortSignal.timeout(6_000),
    });
    if (res.ok) {
      const data = await res.json();
      const posts: any[] = data?.data?.children ?? [];
      let count = 0;
      for (const post of posts) {
        const pd = post?.data ?? {};
        const title = pd.title ?? '';
        if (!title) continue;
        allArticles.push({
          title,
          url: `https://reddit.com${pd.permalink ?? ''}`,
          pubDate: pd.created_utc ? new Date(pd.created_utc * 1000).toISOString() : '',
          source: `Reddit r/${pd.subreddit ?? 'layoffs'}`,
        });
        count++;
      }
      if (count > 0) scrapedSources.push('Reddit');
    }
  } catch (e: any) {
    errors.push(`Reddit: ${e.message}`);
  }

  // ── Deduplicate by title fingerprint + URL ────────────────────────────────────
  const seen = new Set<string>();
  const companyLower = companyName.toLowerCase();
  const unique = allArticles.filter(a => {
    const fp = a.title.toLowerCase().split(/\s+/).slice(0, 5).join(' ');
    const key = a.url || fp;
    if (seen.has(key)) return false;
    seen.add(key);
    // Must mention the company
    return a.title.toLowerCase().includes(companyLower) ||
           companyLower.split(/\s+/).some(w => w.length > 3 && a.title.toLowerCase().includes(w));
  });

  // ── Identify layoff articles and most recent event ───────────────────────────
  let latestLayoffEvent: any | null = null;
  let layoffCount = 0;
  for (const art of unique) {
    if (!hasLayoffSignal(art.title)) continue;
    layoffCount++;
    if (!latestLayoffEvent && art.pubDate) {
      const pct = extractPercent(art.title);
      latestLayoffEvent = {
        companyName,
        date:       art.pubDate.slice(0, 10),
        headline:   art.title,
        percentCut: pct ?? 0,
        source:     art.source,
        url:        art.url,
        affectedDepartments: [],
      };
    }
  }

  return {
    recentHeadlineCount: unique.length,
    sentimentSignal:     Math.min(1, layoffCount / 5),
    latestLayoffEvent,
    fetchedAt:           new Date().toISOString(),
    errors,
    newsRateLimited:     false,
    scrapedSources,
  };
}

// ── NewsAPI fallback (key required, 100/day) ────────────────────────────────────
async function fetchNewsAPI(companyName: string, apiKey: string): Promise<NewsResult> {
  const errors: string[] = [];
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const from = thirtyDaysAgo.toISOString().split('T')[0];
    const q = encodeURIComponent(`"${companyName}" AND (layoff OR "job cuts" OR restructuring OR "workforce reduction")`);
    const url = `https://newsapi.org/v2/everything?q=${q}&from=${from}&sortBy=publishedAt&language=en&pageSize=10&apiKey=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) {
      const rateLimited = isNewsApiRateLimit(`HTTP ${res.status}`);
      return { recentHeadlineCount: 0, sentimentSignal: 0, latestLayoffEvent: null, fetchedAt: new Date().toISOString(), errors: [`NewsAPI HTTP ${res.status}`], newsRateLimited: rateLimited, scrapedSources: [] };
    }
    const data = await res.json();
    if (data.status !== 'ok') {
      return { recentHeadlineCount: 0, sentimentSignal: 0, latestLayoffEvent: null, fetchedAt: new Date().toISOString(), errors: [data.message ?? 'NewsAPI error'], newsRateLimited: isNewsApiRateLimit(data.message ?? ''), scrapedSources: [] };
    }
    const articles: any[] = data.articles ?? [];
    let latestLayoffEvent: any = null;
    for (const art of articles) {
      if (!hasLayoffSignal(art.title ?? '') || !art.publishedAt) continue;
      const pct = extractPercent((art.title ?? '') + ' ' + (art.description ?? ''));
      latestLayoffEvent = { companyName, date: art.publishedAt.slice(0, 10), headline: art.title, percentCut: pct ?? 0, source: art.source?.name ?? 'NewsAPI', url: art.url ?? '', affectedDepartments: [] };
      break;
    }
    return { recentHeadlineCount: articles.length, sentimentSignal: Math.min(1, articles.length / 5), latestLayoffEvent, fetchedAt: new Date().toISOString(), errors: [], newsRateLimited: false, scrapedSources: ['NewsAPI'] };
  } catch (e: any) {
    errors.push(`NewsAPI: ${e.message}`);
    return { recentHeadlineCount: 0, sentimentSignal: 0, latestLayoffEvent: null, fetchedAt: new Date().toISOString(), errors, newsRateLimited: isNewsApiRateLimit(e.message), scrapedSources: [] };
  }
}

// ── 3. HIRING — Naukri+Indeed direct scraping primary, Serper fallback ─────────

interface HiringResult {
  estimatedOpenings:  number | null;
  demandTrend:        'rising' | 'stable' | 'falling';
  hiringFreezeScore:  number;
  naukriOpenings:     number | null;
  linkedinOpenings:   number | null;
  indeedOpenings:     number | null;
  isLive:             true;
  scrapeSource:       'scraped' | 'serper';
  source:             string;
  fetchedAt:          string;
  errors:             string[];
  serperRateLimited:  boolean;
}

// Naukri unofficial internal API — stable since 2020, returns JSON job count
async function fetchNaukriDirect(roleTitle: string, companyName: string): Promise<number | null> {
  const keyword = `${roleTitle} ${companyName}`.trim().replace(/\s+/g, ' ');
  try {
    const url = 'https://www.naukri.com/jobapi/v3/search?' + new URLSearchParams({
      noOfResults: '5',
      urlType: 'search_by_key_loc',
      searchType: 'adv',
      src: 'jobsearchDesk',
      key: keyword,
      location: 'india',
      pageNo: '0',
    }).toString();
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA(),
        'appid': '109',
        'systemid': 'Naukri',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Referer': 'https://www.naukri.com/',
      },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const count = data?.noOfJobs ?? data?.noOfResults ?? null;
    return typeof count === 'number' ? count : (typeof count === 'string' ? parseInt(count, 10) || null : null);
  } catch {
    return null;
  }
}

// Indeed India HTML scraping — parse job count from page title or heading
async function fetchIndeedDirect(roleTitle: string, companyName: string): Promise<number | null> {
  try {
    const q = encodeURIComponent(`${roleTitle} ${companyName}`);
    const url = `https://in.indeed.com/jobs?q=${q}&l=India&limit=1`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA(),
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    // Extract count from heading: "1,234 Software Engineer jobs in India"
    // or from <title>: "1234 Software Engineer Jobs in India - Indeed.com"
    const titleMatch = html.match(/<title>[\s\S]*?(\d[\d,]+)\s+[\w\s]+jobs?\s+in/i);
    const headingMatch = html.match(/<[^>]+class="[^"]*jobCount[^"]*"[^>]*>[\s\S]*?(\d[\d,]+)/i)
                      ?? html.match(/(\d[\d,]+)\s+(?:Software|Data|Cloud|ML|AI|Frontend|Backend|Full|Product|QA|DevOps|Cyber)?[\s\w]*jobs?\s+in\s+India/i);
    const match = titleMatch ?? headingMatch;
    if (!match) return null;
    const n = parseInt(match[1].replace(/,/g, ''), 10);
    return isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

// LinkedIn public job search (partial — often blocked but fast when it works)
async function fetchLinkedInDirect(roleTitle: string, companyName: string): Promise<number | null> {
  try {
    const keywords = encodeURIComponent(`${roleTitle} ${companyName}`);
    const url = `https://www.linkedin.com/jobs/search/?keywords=${keywords}&location=India&geoId=102713980`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA(),
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    // LinkedIn embeds result count in JSON-LD or page heading
    const countMatch = html.match(/"totalJobCount"\s*:\s*(\d+)/)
                    ?? html.match(/(\d[\d,]+)\s+(?:results?|jobs?)/i);
    if (!countMatch) return null;
    const n = parseInt(countMatch[1].replace(/,/g, ''), 10);
    return isFinite(n) && n < 100_000 ? n : null;
  } catch {
    return null;
  }
}

async function fetchHiringDirect(roleTitle: string, companyName: string): Promise<HiringResult | null> {
  const errors: string[] = [];

  // Run Naukri, Indeed, and LinkedIn concurrently — independent, no interdependencies
  const [naukriCount, indeedCount, linkedinCount] = await Promise.all([
    fetchNaukriDirect(roleTitle, companyName).catch(() => null),
    fetchIndeedDirect(roleTitle, companyName).catch(() => null),
    fetchLinkedInDirect(roleTitle, companyName).catch(() => null),
  ]);

  // Need at least one source to return a live result
  const anyLive = naukriCount !== null || indeedCount !== null || linkedinCount !== null;
  if (!anyLive) return null;

  // Weight Naukri higher (India-primary), then Indeed, then LinkedIn
  const naukriW = naukriCount ?? 0;
  const indeedW = indeedCount ?? 0;
  const linkedinW = linkedinCount ?? 0;
  const total = naukriW + indeedW + linkedinW;

  const demandTrend: 'rising' | 'stable' | 'falling' =
    total > 15 ? 'rising' : total > 4 ? 'stable' : 'falling';
  const hiringFreezeScore = total === 0 ? 0.85 : total < 3 ? 0.65 : total < 8 ? 0.40 : 0.15;

  return {
    estimatedOpenings:  total > 0 ? total : null,
    demandTrend,
    hiringFreezeScore,
    naukriOpenings:     naukriCount,
    linkedinOpenings:   linkedinCount,
    indeedOpenings:     indeedCount,
    isLive:             true,
    scrapeSource:       'scraped',
    source:             'Naukri+Indeed+LinkedIn (scraped)',
    fetchedAt:          new Date().toISOString(),
    errors,
    serperRateLimited:  false,
  };
}

// ── Market connector types (mirrors client-side HiringMarket) ─────────────────

type HiringMarket = 'india' | 'us' | 'uk' | 'germany' | 'singapore' | 'australia' | 'canada' | 'latam' | 'mena';

interface MarketHiringResult extends HiringResult {
  /** Per-connector outcome for client-side circuit tracking. */
  connectorResults: Record<string, { openings: number | null; failed: boolean }>;
  /** The market that was used for connector routing. */
  market: HiringMarket;
}

// ── LinkedIn: unified with per-market geoId ───────────────────────────────────

const LINKEDIN_GEO: Record<HiringMarket, { geoId: string; location: string }> = {
  india:     { geoId: '102713980', location: 'India' },
  us:        { geoId: '103644278', location: 'United States' },
  uk:        { geoId: '101165590', location: 'United Kingdom' },
  germany:   { geoId: '101282230', location: 'Germany' },
  singapore: { geoId: '102454443', location: 'Singapore' },
  australia: { geoId: '101452733', location: 'Australia' },
  canada:    { geoId: '101174742', location: 'Canada' },
  latam:     { geoId: '106057199', location: 'Brazil' },
  mena:      { geoId: '104305776', location: 'United Arab Emirates' },
};

async function fetchLinkedInMarket(roleTitle: string, companyName: string, market: HiringMarket): Promise<number | null> {
  const { geoId } = LINKEDIN_GEO[market];
  try {
    const keywords = encodeURIComponent(`${roleTitle} ${companyName}`);
    const url = `https://www.linkedin.com/jobs/search/?keywords=${keywords}&geoId=${geoId}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': UA(), 'Accept': 'text/html,application/xhtml+xml' },
      signal: AbortSignal.timeout(9_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const m = html.match(/"totalJobCount"\s*:\s*(\d+)/)
           ?? html.match(/(\d[\d,]+)\s+(?:results?|jobs?)/i);
    if (!m) return null;
    const n = parseInt(m[1].replace(/,/g, ''), 10);
    return isFinite(n) && n < 500_000 ? n : null;
  } catch {
    return null;
  }
}

// ── Indeed: unified with per-market locale ─────────────────────────────────────

const INDEED_LOCALE: Record<HiringMarket, { host: string; location: string }> = {
  india:     { host: 'in.indeed.com',  location: 'India' },
  us:        { host: 'www.indeed.com', location: 'United+States' },
  uk:        { host: 'uk.indeed.com',  location: 'United+Kingdom' },
  germany:   { host: 'de.indeed.com',  location: 'Deutschland' },
  singapore: { host: 'sg.indeed.com',  location: 'Singapore' },
  australia: { host: 'au.indeed.com',  location: 'Australia' },
  canada:    { host: 'ca.indeed.com',  location: 'Canada' },
  latam:     { host: 'www.indeed.com', location: 'Brazil' },
  mena:      { host: 'www.indeed.com', location: 'United+Arab+Emirates' },
};

async function fetchIndeedMarket(roleTitle: string, companyName: string, market: HiringMarket): Promise<number | null> {
  const { host, location } = INDEED_LOCALE[market];
  try {
    const q = encodeURIComponent(`${roleTitle} ${companyName}`);
    const url = `https://${host}/jobs?q=${q}&l=${location}&limit=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': UA(), 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'en-US,en;q=0.9' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const m = html.match(/<title>[\s\S]*?(\d[\d,]+)\s+[\w\s]+jobs?\s+in/i)
           ?? html.match(/(\d[\d,]+)\s+(?:\w[\w\s]*?\s+)?jobs?\s+in\s+[\w\s]+/i)
           ?? html.match(/"totalResults"\s*:\s*(\d+)/);
    if (!m) return null;
    const n = parseInt(m[1].replace(/,/g, ''), 10);
    return isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

// ── UK: Reed ──────────────────────────────────────────────────────────────────

async function fetchReedDirect(roleTitle: string, companyName: string): Promise<number | null> {
  try {
    const q = encodeURIComponent(`${roleTitle} ${companyName}`);
    const url = `https://www.reed.co.uk/jobs?keywords=${q}&location=uk&proximity=20`;
    const res = await fetch(url, {
      headers: { 'User-Agent': UA(), 'Accept': 'text/html,application/xhtml+xml' },
      signal: AbortSignal.timeout(9_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    // "<strong>1,234</strong> jobs found" or "Found 1,234 jobs"
    const m = html.match(/>(\d[\d,]+)<\/strong>\s*jobs?\s+found/i)
           ?? html.match(/found\s+(\d[\d,]+)\s+jobs?/i)
           ?? html.match(/"totalResults"\s*:\s*(\d+)/)
           ?? html.match(/(\d[\d,]+)\s+jobs?\s+matching/i);
    if (!m) return null;
    const n = parseInt(m[1].replace(/,/g, ''), 10);
    return isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

// ── UK: Jobsite / Totaljobs ────────────────────────────────────────────────────

async function fetchJobsiteDirect(roleTitle: string, companyName: string): Promise<number | null> {
  try {
    const q = encodeURIComponent(`${roleTitle} ${companyName}`);
    const url = `https://www.totaljobs.com/jobs/${encodeURIComponent(roleTitle.toLowerCase().replace(/\s+/g, '-'))}?keywords=${q}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': UA(), 'Accept': 'text/html,application/xhtml+xml' },
      signal: AbortSignal.timeout(9_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const m = html.match(/(\d[\d,]+)\s+jobs?\s+found/i)
           ?? html.match(/"totalJobCount"\s*:\s*(\d+)/)
           ?? html.match(/>(\d[\d,]+)<\/[^>]+>\s*(?:jobs?|results?)/i);
    if (!m) return null;
    const n = parseInt(m[1].replace(/,/g, ''), 10);
    return isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

// ── Germany: StepStone ────────────────────────────────────────────────────────

async function fetchStepstoneDirect(roleTitle: string, companyName: string): Promise<number | null> {
  try {
    const q = encodeURIComponent(`${roleTitle} ${companyName}`);
    const url = `https://www.stepstone.de/jobs/${encodeURIComponent(roleTitle.toLowerCase().replace(/\s+/g, '-'))}?q=${q}&action=facet_selected%3Bkeyword%3B${encodeURIComponent(roleTitle)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': UA(), 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8' },
      signal: AbortSignal.timeout(9_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    // StepStone embeds result count in JSON-LD: "numberOfItems":1234
    const m = html.match(/"numberOfItems"\s*:\s*(\d+)/)
           ?? html.match(/(\d[\d.]+)\s+(?:Stellen|Jobs|Treffer)/i)
           ?? html.match(/"totalCount"\s*:\s*(\d+)/);
    if (!m) return null;
    const n = parseInt(m[1].replace(/[.,]/g, ''), 10);
    return isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

// ── Germany: Xing ─────────────────────────────────────────────────────────────

async function fetchXingDirect(roleTitle: string, companyName: string): Promise<number | null> {
  try {
    const q = encodeURIComponent(`${roleTitle} ${companyName}`);
    const url = `https://www.xing.com/jobs/search?keywords=${q}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': UA(), 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'de-DE,de;q=0.9' },
      signal: AbortSignal.timeout(9_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const m = html.match(/"totalCount"\s*:\s*(\d+)/)
           ?? html.match(/(\d[\d,]+)\s+(?:Jobs?|Stellen)/i);
    if (!m) return null;
    const n = parseInt(m[1].replace(/,/g, ''), 10);
    return isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

// ── Singapore: JobsDB ─────────────────────────────────────────────────────────

async function fetchJobsDBDirect(roleTitle: string, companyName: string): Promise<number | null> {
  try {
    const q = encodeURIComponent(`${roleTitle} ${companyName}`);
    const url = `https://sg.jobsdb.com/j?sp=search&q=${q}&l=Singapore`;
    const res = await fetch(url, {
      headers: { 'User-Agent': UA(), 'Accept': 'text/html,application/xhtml+xml' },
      signal: AbortSignal.timeout(9_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const m = html.match(/"totalCount"\s*:\s*(\d+)/)
           ?? html.match(/(\d[\d,]+)\s+jobs?/i)
           ?? html.match(/__NEXT_DATA__[\s\S]*?"totalCount"\s*:\s*(\d+)/);
    if (!m) return null;
    const n = parseInt(m[1].replace(/,/g, ''), 10);
    return isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

// ── Singapore: MyCareersFuture (government portal) ────────────────────────────

async function fetchMyCareersFutureDirect(roleTitle: string, companyName: string): Promise<number | null> {
  try {
    // MyCareersFuture exposes a public search API
    const params = new URLSearchParams({
      search: `${roleTitle} ${companyName}`,
      sortBy: 'new_posting_date',
      limit: '1',
      page: '0',
    });
    const url = `https://api.mycareersfuture.gov.sg/v2/jobs?${params}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': UA(), 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const total = data?.total ?? data?.data?.meta?.total ?? null;
    return typeof total === 'number' ? total : null;
  } catch {
    return null;
  }
}

// ── Australia: SEEK ───────────────────────────────────────────────────────────

async function fetchSeekDirect(roleTitle: string, companyName: string): Promise<number | null> {
  try {
    const keywords = encodeURIComponent(`${roleTitle} ${companyName}`);
    const url = `https://www.seek.com.au/jobs?keywords=${keywords}&where=Australia`;
    const res = await fetch(url, {
      headers: { 'User-Agent': UA(), 'Accept': 'text/html,application/xhtml+xml' },
      signal: AbortSignal.timeout(9_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    // SEEK embeds count in window.__SEEK_DATA__ or page heading
    const m = html.match(/"totalCount"\s*:\s*(\d+)/)
           ?? html.match(/(\d[\d,]+)\s+jobs?\s+(?:found|matching|in Australia)/i)
           ?? html.match(/"count"\s*:\s*(\d+)/);
    if (!m) return null;
    const n = parseInt(m[1].replace(/,/g, ''), 10);
    return isFinite(n) && n < 200_000 ? n : null;
  } catch {
    return null;
  }
}

// ── Australia: Jora ───────────────────────────────────────────────────────────

async function fetchJoraDirect(roleTitle: string, companyName: string): Promise<number | null> {
  try {
    const q = encodeURIComponent(`${roleTitle} ${companyName}`);
    const url = `https://au.jora.com/j?q=${q}&l=Australia`;
    const res = await fetch(url, {
      headers: { 'User-Agent': UA(), 'Accept': 'text/html,application/xhtml+xml' },
      signal: AbortSignal.timeout(9_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const m = html.match(/(\d[\d,]+)\s+jobs?/i)
           ?? html.match(/"totalResults"\s*:\s*(\d+)/);
    if (!m) return null;
    const n = parseInt(m[1].replace(/,/g, ''), 10);
    return isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

// ── Canada: Job Bank (government) ─────────────────────────────────────────────

async function fetchJobBankDirect(roleTitle: string, companyName: string): Promise<number | null> {
  try {
    // Job Bank exposes a public REST search endpoint
    const params = new URLSearchParams({
      searchstring: `${roleTitle} ${companyName}`,
      locationstring: 'Canada',
      sort: 'M',
      num: '1',
    });
    const url = `https://www.jobbank.gc.ca/jobsearch/jobsearch?${params}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': UA(), 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'en-CA,en;q=0.9' },
      signal: AbortSignal.timeout(9_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    // "Showing results 1 - 25 of 1,234 results"
    const m = html.match(/of\s+(\d[\d,]+)\s+results?/i)
           ?? html.match(/(\d[\d,]+)\s+jobs?\s+(?:found|matching|available)/i);
    if (!m) return null;
    const n = parseInt(m[1].replace(/,/g, ''), 10);
    return isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

// ── LatAm: Bumeran ───────────────────────────────────────────────────────────

async function fetchBumeranDirect(roleTitle: string, companyName: string): Promise<number | null> {
  try {
    const q = encodeURIComponent(`${roleTitle} ${companyName}`);
    // Bumeran covers AR/PE/VE/EC/PA; use the root domain (redirects to nearest regional)
    const url = `https://www.bumeran.com.ar/empleos/?q=${q}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': UA(), 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'es-AR,es;q=0.9' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const m = html.match(/(\d[\d,.]+)\s+(?:empleos?|resultados?|ofertas?)/i)
           ?? html.match(/"totalCount"\s*:\s*(\d+)/)
           ?? html.match(/"count"\s*:\s*(\d+)/);
    if (!m) return null;
    const n = parseInt(m[1].replace(/[.,]/g, ''), 10);
    return isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

// ── LatAm: Computrabajo ───────────────────────────────────────────────────────

async function fetchComputrabajoDirect(roleTitle: string, companyName: string): Promise<number | null> {
  try {
    const q = encodeURIComponent(`${roleTitle} ${companyName}`);
    // Use Colombia as base — Computrabajo covers MX/CO/AR/CL/PE/VE/EC and more
    const url = `https://co.computrabajo.com/ofertas-de-trabajo?q=${q}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': UA(), 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'es-CO,es;q=0.9' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const m = html.match(/(\d[\d.,]+)\s+(?:ofertas?|vacantes?|empleos?)/i)
           ?? html.match(/"totalOfertas"\s*:\s*(\d+)/)
           ?? html.match(/(\d[\d.,]+)\s+results?/i);
    if (!m) return null;
    const n = parseInt(m[1].replace(/[.,]/g, ''), 10);
    return isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

// ── US: Glassdoor Jobs ─────────────────────────────────────────────────────────

async function fetchGlassdoorJobsDirect(roleTitle: string, companyName: string): Promise<number | null> {
  try {
    const q = encodeURIComponent(`${roleTitle} ${companyName}`);
    const url = `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${q}&locT=N&locId=1&jobType=all`;
    const res = await fetch(url, {
      headers: { 'User-Agent': UA(), 'Accept': 'text/html,application/xhtml+xml' },
      signal: AbortSignal.timeout(9_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const m = html.match(/"totalJobCount"\s*:\s*(\d+)/)
           ?? html.match(/(\d[\d,]+)\s+(?:Jobs?|results?)/i);
    if (!m) return null;
    const n = parseInt(m[1].replace(/,/g, ''), 10);
    return isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

// ── MENA: Bayt ────────────────────────────────────────────────────────────────

async function fetchBaytDirect(roleTitle: string, companyName: string): Promise<number | null> {
  try {
    const q = encodeURIComponent(`${roleTitle} ${companyName}`);
    const url = `https://www.bayt.com/en/international/jobs/?q=${q}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': UA(), 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'en-AE,en;q=0.9' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const m = html.match(/(\d[\d,]+)\s+(?:jobs?|vacancies|positions)/i)
           ?? html.match(/"totalCount"\s*:\s*(\d+)/)
           ?? html.match(/<span[^>]*class="[^"]*count[^"]*"[^>]*>(\d[\d,]+)<\/span>/i);
    if (!m) return null;
    const n = parseInt(m[1].replace(/,/g, ''), 10);
    return isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

// ── MENA: NaukriGulf ──────────────────────────────────────────────────────────

async function fetchNaukriGulfDirect(roleTitle: string, companyName: string): Promise<number | null> {
  try {
    // NaukriGulf exposes a similar internal JSON API to Naukri India
    const keyword = `${roleTitle} ${companyName}`.trim();
    const url = 'https://www.naukrigulf.com/mnljobs/v1/search?' + new URLSearchParams({
      noOfResults: '5',
      searchType: 'adv',
      key: keyword,
      pageNo: '0',
    }).toString();
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA(),
        'Accept': 'application/json',
        'Referer': 'https://www.naukrigulf.com/',
      },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const count = data?.noOfJobs ?? data?.totalJobCount ?? null;
    return typeof count === 'number' ? count : (typeof count === 'string' ? parseInt(count, 10) || null : null);
  } catch {
    return null;
  }
}

// ── Market hiring orchestrator ─────────────────────────────────────────────────
//
// Routes to the right combination of job boards for the given market.
// Skips connectors listed in skipConnectors (client-reported open circuits).
// Returns connectorResults so the client can update per-connector circuit state.

async function fetchHiringForMarket(
  roleTitle: string,
  companyName: string,
  market: HiringMarket,
  skipConnectors: string[],
): Promise<MarketHiringResult | null> {
  const skip = new Set(skipConnectors);
  const errors: string[] = [];
  const connectorResults: Record<string, { openings: number | null; failed: boolean }> = {};

  // Helper: run a scraper, record result and failure in connectorResults
  async function run(id: string, fn: () => Promise<number | null>): Promise<number | null> {
    if (skip.has(id)) {
      connectorResults[id] = { openings: null, failed: false }; // skipped ≠ failed
      return null;
    }
    try {
      const count = await fn();
      connectorResults[id] = { openings: count, failed: count === null };
      return count;
    } catch {
      connectorResults[id] = { openings: null, failed: true };
      return null;
    }
  }

  type CountMap = Record<string, number | null>;
  let counts: CountMap = {};

  if (market === 'india') {
    // Existing Naukri path re-used for India — fetchHiringDirect already handles this
    // but we go through per-connector accounting here for consistency.
    const [naukri, indeed, linkedin] = await Promise.all([
      run('naukri',         () => fetchNaukriDirect(roleTitle, companyName)),
      run('indeed-india',   () => fetchIndeedMarket(roleTitle, companyName, 'india')),
      run('linkedin-india', () => fetchLinkedInMarket(roleTitle, companyName, 'india')),
    ]);
    counts = { naukri, 'indeed-india': indeed, 'linkedin-india': linkedin };

  } else if (market === 'us') {
    const [linkedin, indeed, glassdoor] = await Promise.all([
      run('linkedin-us',    () => fetchLinkedInMarket(roleTitle, companyName, 'us')),
      run('indeed-us',      () => fetchIndeedMarket(roleTitle, companyName, 'us')),
      run('glassdoor-jobs', () => fetchGlassdoorJobsDirect(roleTitle, companyName)),
    ]);
    counts = { 'linkedin-us': linkedin, 'indeed-us': indeed, 'glassdoor-jobs': glassdoor };

  } else if (market === 'uk') {
    const [linkedin, indeed, reed, jobsite] = await Promise.all([
      run('linkedin-uk', () => fetchLinkedInMarket(roleTitle, companyName, 'uk')),
      run('indeed-uk',   () => fetchIndeedMarket(roleTitle, companyName, 'uk')),
      run('reed',        () => fetchReedDirect(roleTitle, companyName)),
      run('jobsite',     () => fetchJobsiteDirect(roleTitle, companyName)),
    ]);
    counts = { 'linkedin-uk': linkedin, 'indeed-uk': indeed, reed, jobsite };

  } else if (market === 'germany') {
    const [stepstone, linkedin, xing] = await Promise.all([
      run('stepstone',   () => fetchStepstoneDirect(roleTitle, companyName)),
      run('linkedin-de', () => fetchLinkedInMarket(roleTitle, companyName, 'germany')),
      run('xing',        () => fetchXingDirect(roleTitle, companyName)),
    ]);
    counts = { stepstone, 'linkedin-de': linkedin, xing };

  } else if (market === 'singapore') {
    const [linkedin, jobsdb, mcf] = await Promise.all([
      run('linkedin-sg',     () => fetchLinkedInMarket(roleTitle, companyName, 'singapore')),
      run('jobsdb',          () => fetchJobsDBDirect(roleTitle, companyName)),
      run('mycareersfuture', () => fetchMyCareersFutureDirect(roleTitle, companyName)),
    ]);
    counts = { 'linkedin-sg': linkedin, jobsdb, mycareersfuture: mcf };

  } else if (market === 'australia') {
    const [seek, linkedin, jora] = await Promise.all([
      run('seek',        () => fetchSeekDirect(roleTitle, companyName)),
      run('linkedin-au', () => fetchLinkedInMarket(roleTitle, companyName, 'australia')),
      run('jora',        () => fetchJoraDirect(roleTitle, companyName)),
    ]);
    counts = { seek, 'linkedin-au': linkedin, jora };

  } else if (market === 'canada') {
    const [linkedin, indeed, jobbank] = await Promise.all([
      run('linkedin-ca', () => fetchLinkedInMarket(roleTitle, companyName, 'canada')),
      run('indeed-ca',   () => fetchIndeedMarket(roleTitle, companyName, 'canada')),
      run('job-bank',    () => fetchJobBankDirect(roleTitle, companyName)),
    ]);
    counts = { 'linkedin-ca': linkedin, 'indeed-ca': indeed, 'job-bank': jobbank };

  } else if (market === 'latam') {
    const [linkedin, bumeran, computrabajo] = await Promise.all([
      run('linkedin-latam', () => fetchLinkedInMarket(roleTitle, companyName, 'latam')),
      run('bumeran',        () => fetchBumeranDirect(roleTitle, companyName)),
      run('computrabajo',   () => fetchComputrabajoDirect(roleTitle, companyName)),
    ]);
    counts = { 'linkedin-latam': linkedin, bumeran, computrabajo };

  } else if (market === 'mena') {
    const [bayt, linkedin, naukrigulf] = await Promise.all([
      run('bayt',          () => fetchBaytDirect(roleTitle, companyName)),
      run('linkedin-mena', () => fetchLinkedInMarket(roleTitle, companyName, 'mena')),
      run('naukrigulf',    () => fetchNaukriGulfDirect(roleTitle, companyName)),
    ]);
    counts = { bayt, 'linkedin-mena': linkedin, naukrigulf };
  }

  // Aggregate: sum all non-null counts; require at least one live result
  const presentCounts = Object.values(counts).filter((v): v is number => v !== null && v >= 0);
  if (presentCounts.length === 0) return null;

  const total = presentCounts.reduce((a, b) => a + b, 0);

  // Source label — list which connectors returned data
  const activeSources = Object.entries(counts)
    .filter(([, v]) => v !== null)
    .map(([id]) => id)
    .join('+');

  const demandTrend: 'rising' | 'stable' | 'falling' =
    total > 15 ? 'rising' : total > 4 ? 'stable' : 'falling';
  const hiringFreezeScore = total === 0 ? 0.85 : total < 3 ? 0.65 : total < 8 ? 0.40 : 0.15;

  return {
    estimatedOpenings:  total > 0 ? total : null,
    demandTrend,
    hiringFreezeScore,
    naukriOpenings:     counts['naukri'] ?? counts['naukrigulf'] ?? null,
    linkedinOpenings:   counts['linkedin-us'] ?? counts['linkedin-uk'] ?? counts['linkedin-de']
                     ?? counts['linkedin-sg'] ?? counts['linkedin-au'] ?? counts['linkedin-ca']
                     ?? counts['linkedin-latam'] ?? counts['linkedin-mena'] ?? counts['linkedin-india'] ?? null,
    indeedOpenings:     counts['indeed-us'] ?? counts['indeed-uk'] ?? counts['indeed-ca']
                     ?? counts['indeed-india'] ?? null,
    isLive:             true,
    scrapeSource:       'scraped',
    source:             `${activeSources} (scraped)`,
    fetchedAt:          new Date().toISOString(),
    errors,
    serperRateLimited:  false,
    connectorResults,
    market,
  };
}

// ── Serper fallback (paid, used only when direct scraping completely fails) ────

async function fetchHiringSerper(roleTitle: string, companyName: string, serperKey: string): Promise<HiringResult> {
  const errors: string[] = [];
  let serperRateLimited = false;

  async function serperCount(query: string): Promise<number | null> {
    try {
      const res = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: query, num: 10 }),
        signal: AbortSignal.timeout(6_000),
      });
      if (!res.ok) {
        if (isSerperRateLimit(res.status, `HTTP ${res.status}`)) serperRateLimited = true;
        throw new Error(`Serper HTTP ${res.status}`);
      }
      const data = await res.json();
      const snippets: string[] = (data?.organic ?? []).slice(0, 3).map((r: any) => r?.snippet ?? '');
      for (const s of snippets) {
        const m = s.match(/(\d[\d,]+)\s+(?:jobs?|openings?|positions?|vacancies)/i);
        if (m) return parseInt(m[1].replace(/,/g, ''), 10);
      }
      const jobResults = (data?.organic ?? []).filter((r: any) =>
        /jobs?|openings?|hiring|career/i.test(r.title ?? ''),
      ).length;
      return jobResults > 0 ? jobResults : null;
    } catch (e: any) {
      errors.push(`Serper: ${e.message}`);
      return null;
    }
  }

  const [naukriCount, linkedinCount] = await Promise.all([
    serperCount(`"${roleTitle}" jobs ${companyName} site:naukri.com`),
    serperCount(`"${roleTitle}" jobs ${companyName} site:linkedin.com/jobs`),
  ]);

  const total = (naukriCount ?? 0) + (linkedinCount ?? 0);
  const demandTrend: 'rising' | 'stable' | 'falling' =
    total > 10 ? 'rising' : total > 3 ? 'stable' : 'falling';
  const hiringFreezeScore = total === 0 ? 0.85 : total < 3 ? 0.60 : total < 8 ? 0.35 : 0.15;

  return {
    estimatedOpenings:  total > 0 ? total : null,
    demandTrend,
    hiringFreezeScore,
    naukriOpenings:     naukriCount,
    linkedinOpenings:   linkedinCount,
    indeedOpenings:     null,
    isLive:             true,
    scrapeSource:       'serper',
    source:             'Serper API',
    fetchedAt:          new Date().toISOString(),
    errors,
    serperRateLimited,
  };
}

// ── 4. SCRAPE — Wikipedia + Career Page + Glassdoor (no key, server-side) ─────
//
// CRITICAL: This handler was silently dropped during the v27.0 rewrite, breaking
// ALL company enrichment scraping (Wikipedia headcount, career page freeze,
// Glassdoor sentiment) since May 2026. Restored in v30.0 with all 3 parsers
// hardened against current DOM structures.

interface ScrapeResult {
  wikiEmployeeCount: number | null;
  careerPage: { hiringActive: boolean; jobCount: number | null; signals: string[] } | null;
  glassdoor:  { rating: number | null; reviewCount: number | null; ceoApproval: number | null } | null;
  fetchedAt:  string;
  errors:     string[];
}

// Slugify company name for Wikipedia + career page URLs (e.g. "Tata Consultancy Services" → "Tata_Consultancy_Services")
const wikiSlug = (name: string) =>
  name.trim().replace(/\s+/g, '_').replace(/[^\w._-]/g, '');

// Career page URL inference — try the most common patterns
const careerUrls = (companyName: string): string[] => {
  const slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
  return [
    `https://www.${slug}.com/careers`,
    `https://${slug}.com/careers`,
    `https://www.${slug}.com/jobs`,
    `https://careers.${slug}.com`,
  ];
};

// Glassdoor Overview URL inference (works for most companies)
const glassdoorUrl = (companyName: string): string => {
  const slug = companyName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
  return `https://www.glassdoor.com/Overview/Working-at-${slug}-EI_IE0.htm`;
};

// ── Wikipedia headcount extraction — multi-language with Wikidata fallback ──
//
// Fetch order:
//   1. English Wikipedia — direct slug (fast path for US/EU/India companies)
//   2. English Wikipedia — OpenSearch correction (handles "Rappi" → "Rappi (company)")
//   3. Language-specific Wikipedia editions — ES/PT/FR/AR with matching infobox fields
//   4. Wikidata P1082 — language-agnostic structured fallback (Flutterwave, Careem, etc.)
//
// This covers LatAm (Rappi, Kavak, Loft), Middle East (Careem, Anghami, Souq),
// and Africa (Flutterwave, Andela, Jumia) where en.wikipedia.org is either absent,
// a stub without the infobox field, or the data lives on a non-English edition.

// Infobox employee-count field names by Wikipedia language edition.
// English: num_employees  Spanish: num_empleados  Portuguese: funcionários / num_funcionários
// French: effectifs  German: mitarbeiter  Arabic: عدد الموظفين (Unicode-safe via broad digits match)
const WIKI_EMP_FIELDS: Array<{ regex: RegExp }> = [
  { regex: /\|\s*num_employees\s*=\s*(?:\{\{[^}]*\}\}\s*)?(?:~|circa\s*)?([\d,\s.]+)/i },
  { regex: /\|\s*num_empleados\s*=\s*(?:\{\{[^}]*\}\}\s*)?(?:~|circa\s*)?([\d,\s.]+)/i },
  { regex: /\|\s*(?:num_funcionários|funcionários)\s*=\s*(?:\{\{[^}]*\}\}\s*)?(?:~|circa\s*)?([\d,\s.]+)/i },
  { regex: /\|\s*effectifs\s*=\s*(?:\{\{[^}]*\}\}\s*)?(?:~|circa\s*)?([\d,\s.]+)/i },
  { regex: /\|\s*mitarbeiter\s*=\s*(?:\{\{[^}]*\}\}\s*)?(?:~|circa\s*)?([\d,\s.]+)/i },
  // Broad fallback: any infobox field ending in _employees / _workforce / _staff
  { regex: /\|\s*\w*(?:employees|workforce|staff|headcount)\s*=\s*(?:\{\{[^}]*\}\}\s*)?(?:~|circa\s*)?([\d,\s.]+)/i },
];

function parseEmployeeCount(wikitext: string): number | null {
  for (const { regex } of WIKI_EMP_FIELDS) {
    const m = wikitext.match(regex);
    if (!m) continue;
    const raw = m[1].replace(/[,\s.]/g, '');
    const n = parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 10 && n <= 5_000_000) return n;
  }
  return null;
}

async function fetchWikitextForPage(host: string, title: string): Promise<string | null> {
  try {
    const url = `https://${host}/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=wikitext&format=json&origin=*`;
    const res = await fetch(url, {
      headers: { 'User-Agent': UA(), 'Accept': 'application/json' },
      signal: AbortSignal.timeout(7_000),
    });
    if (!res.ok) return null;
    const d = await res.json();
    return d?.parse?.wikitext?.['*'] ?? null;
  } catch { return null; }
}

// Wikipedia OpenSearch: find the canonical page title when direct slug fails.
// Handles "Rappi" → "Rappi (empresa)" or "Rappi (company)" title mismatches.
async function wikiOpenSearchTitle(host: string, query: string): Promise<string | null> {
  try {
    const url = `https://${host}/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=5&namespace=0&format=json`;
    const res = await fetch(url, {
      headers: { 'User-Agent': UA() },
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return null;
    const [, titles] = await res.json();
    // Prefer titles that include the company name and a company-context qualifier
    const exact = (titles as string[]).find(t =>
      t.toLowerCase().startsWith(query.toLowerCase()) ||
      t.toLowerCase().includes(query.toLowerCase())
    );
    return exact ?? (titles as string[])[0] ?? null;
  } catch { return null; }
}

// Wikidata P1082 (number of employees) — language-agnostic, structured.
// Works for any company that has a Wikidata entry regardless of Wikipedia coverage.
async function fetchWikidataEmployeeCount(companyName: string): Promise<number | null> {
  try {
    // Step 1: search for the entity
    const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(companyName)}&language=en&type=item&format=json&limit=5`;
    const searchRes = await fetch(searchUrl, {
      headers: { 'User-Agent': UA() },
      signal: AbortSignal.timeout(6_000),
    });
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const entities: Array<{ id: string; label?: string; description?: string }> =
      searchData?.search ?? [];
    if (entities.length === 0) return null;

    // Prefer entities whose description contains 'company' / 'corporation' / 'enterprise'
    const companyEntity = entities.find(e =>
      /\b(company|corporation|enterprise|startup|tech|conglomerate|group)\b/i.test(e.description ?? '')
    ) ?? entities[0];

    // Step 2: fetch P1082 (number of employees) from entity claims
    const entityUrl = `https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${companyEntity.id}&property=P1082&format=json`;
    const entityRes = await fetch(entityUrl, {
      headers: { 'User-Agent': UA() },
      signal: AbortSignal.timeout(6_000),
    });
    if (!entityRes.ok) return null;
    const entityData = await entityRes.json();

    const claims: any[] = entityData?.claims?.P1082 ?? [];
    if (claims.length === 0) return null;

    // Take the most recent value — claims may have multiple time-qualified entries.
    // Sort by qualifiers P585 (point in time) desc if present; otherwise use first.
    const sorted = [...claims].sort((a, b) => {
      const tA = a.qualifiers?.P585?.[0]?.datavalue?.value?.time ?? '';
      const tB = b.qualifiers?.P585?.[0]?.datavalue?.value?.time ?? '';
      return tB.localeCompare(tA);
    });
    const amount = sorted[0]?.mainsnak?.datavalue?.value?.amount;
    if (!amount) return null;

    const n = Math.abs(parseInt(String(amount).replace(/\+/, ''), 10));
    if (!Number.isFinite(n) || n < 10 || n > 5_000_000) return null;
    return n;
  } catch { return null; }
}

// Wikipedia employee count extraction — parses infobox JSON via Wikipedia API
async function fetchWikipediaHeadcount(companyName: string): Promise<number | null> {
  const slug = wikiSlug(companyName);

  // ── Step 1: English Wikipedia direct slug ───────────────────────────────────
  try {
    const summaryRes = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}`,
      { headers: { 'User-Agent': UA(), 'Accept': 'application/json' }, signal: AbortSignal.timeout(6_000) },
    );
    if (summaryRes.ok) {
      const summary = await summaryRes.json();
      if (summary.type !== 'disambiguation') {
        const wt = await fetchWikitextForPage('en.wikipedia.org', slug);
        if (wt) {
          const n = parseEmployeeCount(wt);
          if (n !== null) return n;
        }
      }
    }
  } catch { /* fall through */ }

  // ── Step 2: English Wikipedia OpenSearch correction ─────────────────────────
  // Handles "Rappi (empresa)" / "Grab (company)" / "Careem (company)" title mismatches.
  try {
    const correctedTitle = await wikiOpenSearchTitle('en.wikipedia.org', companyName);
    if (correctedTitle && correctedTitle.toLowerCase() !== slug.toLowerCase().replace(/_/g, ' ')) {
      const wt = await fetchWikitextForPage('en.wikipedia.org', correctedTitle);
      if (wt) {
        const n = parseEmployeeCount(wt);
        if (n !== null) return n;
      }
    }
  } catch { /* fall through */ }

  // ── Step 3: Language-specific Wikipedia editions ────────────────────────────
  // Spanish (LatAm), Portuguese (Brazil), French (Francophone Africa), Arabic (MENA).
  // Each edition may have an employee count even when the English page is a stub.
  const langEditions = [
    { host: 'es.wikipedia.org' },  // Rappi, Kavak, Loft, MercadoLibre, OLX LatAm
    { host: 'pt.wikipedia.org' },  // Brazilian companies
    { host: 'fr.wikipedia.org' },  // Francophone Africa, Maghreb
    { host: 'ar.wikipedia.org' },  // MENA: Careem, Anghami, Talabat, Souq
  ];
  for (const { host } of langEditions) {
    try {
      const title = await wikiOpenSearchTitle(host, companyName);
      if (!title) continue;
      const wt = await fetchWikitextForPage(host, title);
      if (!wt) continue;
      const n = parseEmployeeCount(wt);
      if (n !== null) return n;
    } catch { /* try next edition */ }
  }

  // ── Step 4: Wikidata P1082 fallback ─────────────────────────────────────────
  // Language-agnostic structured data — works for Flutterwave, Andela, Jumia, Grab,
  // Careem, and any company that has a Wikidata entry regardless of Wikipedia depth.
  return await fetchWikidataEmployeeCount(companyName);
}

// Career page scraping — detect hiring freeze and job count
async function fetchCareerPage(companyName: string): Promise<ScrapeResult['careerPage']> {
  const signals: string[] = [];
  let hiringActive = true;
  let jobCount: number | null = null;

  for (const url of careerUrls(companyName)) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA(), 'Accept': 'text/html,application/xhtml+xml' },
        signal: AbortSignal.timeout(7_000),
        redirect: 'follow',
      });
      if (!res.ok) continue;
      const html = await res.text();

      // Freeze signals — page-level keywords
      const freezeKw = /\b(hiring\s+(?:freeze|paused|on\s+hold)|no\s+(?:open\s+)?positions|currently\s+not\s+hiring|workforce\s+reduction)\b/i;
      if (freezeKw.test(html)) {
        signals.push('freeze_detected');
        hiringActive = false;
      }

      // Job count extraction — patterns:
      //   "247 open positions", "1,234 jobs", "showing 50 of 320 results", JSON-LD aggregateRating
      const jobCountPatterns = [
        /(\d[\d,]+)\s+(?:open\s+)?(?:positions?|roles?|jobs?|openings?|opportunities)/i,
        /showing\s+\d+\s+(?:of\s+)?(\d[\d,]+)/i,
        /"totalJobCount"\s*:\s*(\d+)/,
        /"numberOfJobs"\s*:\s*(\d+)/,
      ];
      for (const pat of jobCountPatterns) {
        const m = html.match(pat);
        if (m) {
          const n = parseInt(m[1].replace(/,/g, ''), 10);
          if (isFinite(n) && n < 100_000) {
            jobCount = n;
            break;
          }
        }
      }

      // No-openings detection
      if (jobCount === 0 || /no\s+open(?:ings)?(?:\s+at\s+(?:this\s+)?time)?/i.test(html)) {
        signals.push('no_openings');
        hiringActive = false;
      } else if (jobCount !== null && jobCount < 10) {
        signals.push('very_low_postings');
      }

      // Found a working career page — stop trying other URL patterns
      return { hiringActive, jobCount, signals };
    } catch {
      // Try next URL pattern
      continue;
    }
  }

  // All career URL patterns failed
  return null;
}

// Glassdoor scraping — rating, review count, CEO approval
async function fetchGlassdoor(companyName: string): Promise<ScrapeResult['glassdoor']> {
  try {
    // Use Glassdoor company search API endpoint (public, no key)
    const searchUrl = `https://www.glassdoor.com/Search/results.htm?keyword=${encodeURIComponent(companyName)}`;
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': UA(),
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(8_000),
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Glassdoor embeds rating data in JSON-LD or data attributes
    // Pattern 1: "ratingValue":4.1,"reviewCount":12345
    const ratingMatch = html.match(/"ratingValue"\s*:\s*"?(\d+(?:\.\d+)?)"?/);
    const reviewMatch = html.match(/"reviewCount"\s*:\s*"?(\d[\d,]*)"?/);
    // Pattern 2: data-test="rating-info"
    const altRatingMatch = html.match(/data-test=["']rating-info["'][^>]*>([\d.]+)/);
    // Pattern 3: CEO approval — "ceoApproval":85 or "ceoApprovalRating":85
    const ceoMatch = html.match(/"ceoApprovalR?at?i?n?g?"?\s*:\s*(\d+)/);

    const rating = ratingMatch ? parseFloat(ratingMatch[1])
                 : altRatingMatch ? parseFloat(altRatingMatch[1])
                 : null;
    const reviewCount = reviewMatch ? parseInt(reviewMatch[1].replace(/,/g, ''), 10) : null;
    const ceoApproval = ceoMatch ? parseInt(ceoMatch[1], 10) : null;

    // Sanity checks
    const validRating = rating && rating >= 1 && rating <= 5 ? rating : null;
    const validReview = reviewCount && reviewCount > 0 && reviewCount < 1_000_000 ? reviewCount : null;
    const validCeo    = ceoApproval && ceoApproval >= 0 && ceoApproval <= 100 ? ceoApproval : null;

    if (validRating == null && validReview == null && validCeo == null) return null;
    return { rating: validRating, reviewCount: validReview, ceoApproval: validCeo };
  } catch {
    return null;
  }
}

async function fetchScrapeData(companyName: string, timeoutMs?: number): Promise<ScrapeResult> {
  const errors: string[] = [];
  const start = Date.now();

  // Run all 3 scrapers concurrently — independent, no dependencies
  const [wiki, career, glassdoor] = await Promise.all([
    fetchWikipediaHeadcount(companyName).catch(e => { errors.push(`wiki: ${e?.message}`); return null; }),
    fetchCareerPage(companyName).catch(e => { errors.push(`career: ${e?.message}`); return null; }),
    fetchGlassdoor(companyName).catch(e => { errors.push(`glassdoor: ${e?.message}`); return null; }),
  ]);

  const elapsed = Date.now() - start;
  if (timeoutMs && elapsed > timeoutMs) {
    errors.push(`scrape elapsed ${elapsed}ms exceeded budget ${timeoutMs}ms`);
  }

  return {
    wikiEmployeeCount: wiki,
    careerPage:        career,
    glassdoor:         glassdoor,
    fetchedAt:         new Date().toISOString(),
    errors,
  };
}

// ── Main handler ───────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const authFail = await requireAuth(req);
  if (authFail) return authFail;

  try {
    const body = await req.json().catch(() => ({}));
    const { companyName, ticker, action, roleTitle } = body;

    const avKey     = Deno.env.get('ALPHAVANTAGE_API_KEY') ?? Deno.env.get('ALPHAVANTAGE_KEY') ?? null;
    const newsKey   = Deno.env.get('NEWS_API_KEY') ?? Deno.env.get('NEWSAPI_KEY') ?? null;
    const serperKey = Deno.env.get('SERPER_API_KEY') ?? null;

    // ── scrape action ──────────────────────────────────────────────────────────
    // Wikipedia + career page + Glassdoor scraping. No API keys. Server-side
    // execution bypasses browser CORS restrictions. Restored in v30.0 — was
    // silently dropped during v27.0 rewrite, breaking all enrichment scraping.
    if (action === 'scrape') {
      const company = (companyName ?? '').trim();
      if (!company) {
        return json({ scrapeData: null, errors: ['companyName required'] });
      }
      const customTimeout = typeof body.timeoutMs === 'number' ? body.timeoutMs : undefined;
      const scrapeData = await fetchScrapeData(company, customTimeout);
      return json({ scrapeData, fetchedAt: scrapeData.fetchedAt, errors: scrapeData.errors });
    }

    // ── hiring action ──────────────────────────────────────────────────────────
    if (action === 'hiring') {
      const role    = (roleTitle ?? 'Software Engineer').trim();
      const company = (companyName ?? '').trim();

      // Market routing: client sends the resolved HiringMarket (defaults 'india'
      // for backwards-compat). skipConnectors lists circuit-OPEN IDs from the
      // client so the EF skips known-bad job boards without burning a timeout.
      const market: HiringMarket = (['india','us','uk','germany','singapore','australia','canada','latam','mena'] as const)
        .includes(body.market as HiringMarket)
        ? (body.market as HiringMarket)
        : 'india';
      const skipConnectors: string[] = Array.isArray(body.skipConnectors) ? body.skipConnectors : [];

      // PRIMARY: Market-appropriate direct scraping (no API key)
      const scraped = await fetchHiringForMarket(role, company, market, skipConnectors);
      if (scraped) {
        return json({
          hiringData:       scraped,
          connectorResults: scraped.connectorResults,
          market:           scraped.market,
          errors:           scraped.errors,
        });
      }

      // SECONDARY: India-specific Naukri+Indeed+LinkedIn path for india market
      // when fetchHiringForMarket returned null (all connectors returned null).
      // For non-india markets this path is intentionally skipped — Naukri data
      // for a Singapore company is noise, not signal.
      if (market === 'india') {
        const indiaScraped = await fetchHiringDirect(role, company);
        if (indiaScraped) {
          return json({ hiringData: indiaScraped, connectorResults: {}, market: 'india', errors: indiaScraped.errors });
        }
      }

      // FALLBACK: Serper API (paid — only when all direct scraping completely failed)
      if (serperKey) {
        const serperResult = await fetchHiringSerper(role, company, serperKey);
        return json({ hiringData: serperResult, connectorResults: {}, market, errors: serperResult.errors });
      }

      return json({ hiringData: null, connectorResults: {}, market, errors: ['No job-board connectors returned data for this market and SERPER_API_KEY not configured'] });
    }

    // ── stock / news / both actions ────────────────────────────────────────────
    const errors: string[] = [];
    const rateLimitFlags: { avRateLimited?: boolean; newsRateLimited?: boolean } = {};
    let stockData = null;
    let newsData  = null;

    // STOCK: Yahoo Finance primary → Alpha Vantage fallback
    if ((action === 'stock' || action === 'both') && ticker) {
      const yahoo = await fetchStockYahoo(ticker);
      if (yahoo && (yahoo.price90DayChange !== null || yahoo.revenueGrowthYoY !== null)) {
        // Yahoo Finance succeeded
        stockData = {
          price90DayChange: yahoo.price90DayChange,
          revenueGrowthYoY: yahoo.revenueGrowthYoY,
          marketCap:        yahoo.marketCap,
          peRatio:          yahoo.peRatio,
          employeeCount:    yahoo.employeeCount,
          source:           'yahoo-finance',
        };
        errors.push(...(yahoo.errors.length > 0 ? yahoo.errors : []));
      } else {
        // Yahoo Finance returned empty data — try Alpha Vantage fallback
        if (avKey) {
          errors.push('Yahoo Finance returned no data — trying Alpha Vantage fallback');
          const av = await fetchStockAlphaVantage(ticker, avKey);
          if (av && !av.rateLimited) {
            stockData = {
              price90DayChange: av.price90DayChange,
              revenueGrowthYoY: av.revenueGrowthYoY,
              marketCap:        av.marketCap,
              peRatio:          av.peRatio,
              employeeCount:    null,
              source:           'alphavantage',
            };
            rateLimitFlags.avRateLimited = av.rateLimited;
          } else if (av?.rateLimited) {
            rateLimitFlags.avRateLimited = true;
            errors.push('Alpha Vantage rate limited');
          } else {
            errors.push('Both Yahoo Finance and Alpha Vantage failed to return stock data');
          }
        } else {
          errors.push(`Yahoo Finance returned no data for ${ticker} and ALPHAVANTAGE_API_KEY not configured`);
        }
      }
    } else if ((action === 'stock' || action === 'both') && !ticker) {
      errors.push(`No ticker for "${companyName}" — private company or unmapped`);
    }

    // NEWS: Multi-source RSS primary → NewsAPI fallback
    if (action === 'news' || action === 'both') {
      const rssResult = await fetchNewsRSS(companyName ?? '', ticker ?? null);
      errors.push(...rssResult.errors);

      if (rssResult.recentHeadlineCount > 0 || rssResult.scrapedSources.length > 0) {
        // RSS scraping produced results — use them directly
        newsData = rssResult;
      } else if (newsKey) {
        // RSS returned nothing and we have a NewsAPI key — use as fallback
        errors.push(`All ${rssResult.errors.length} RSS sources returned 0 articles — trying NewsAPI fallback`);
        const apiResult = await fetchNewsAPI(companyName ?? '', newsKey);
        errors.push(...apiResult.errors);
        rateLimitFlags.newsRateLimited = apiResult.newsRateLimited;
        newsData = apiResult;
      } else {
        // No RSS results and no API key — return empty news (honest null)
        errors.push('All RSS sources returned 0 articles; NEWS_API_KEY not configured');
        newsData = rssResult; // empty but with scrapedSources for transparency
      }
    }

    return json({ stockData, newsData, errors, rateLimitFlags });
  } catch (e: any) {
    return json({ stockData: null, newsData: null, hiringData: null, errors: [String(e?.message ?? e)] }, 500);
  }
});
