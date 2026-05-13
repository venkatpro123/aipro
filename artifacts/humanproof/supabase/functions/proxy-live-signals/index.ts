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

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (d: unknown, status = 200) =>
  new Response(JSON.stringify(d), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

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

// ── Main handler ───────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const body = await req.json().catch(() => ({}));
    const { companyName, ticker, action, roleTitle } = body;

    const avKey     = Deno.env.get('ALPHAVANTAGE_API_KEY') ?? Deno.env.get('ALPHAVANTAGE_KEY') ?? null;
    const newsKey   = Deno.env.get('NEWS_API_KEY') ?? Deno.env.get('NEWSAPI_KEY') ?? null;
    const serperKey = Deno.env.get('SERPER_API_KEY') ?? null;

    // ── hiring action ──────────────────────────────────────────────────────────
    if (action === 'hiring') {
      const role    = (roleTitle ?? 'Software Engineer').trim();
      const company = (companyName ?? '').trim();

      // PRIMARY: Direct scraping (no API key)
      const scraped = await fetchHiringDirect(role, company);
      if (scraped) {
        return json({ hiringData: scraped, errors: scraped.errors });
      }

      // FALLBACK: Serper API (paid — only when direct scraping completely failed)
      if (serperKey) {
        const serperResult = await fetchHiringSerper(role, company, serperKey);
        return json({ hiringData: serperResult, errors: serperResult.errors });
      }

      return json({ hiringData: null, errors: ['Direct job-board scraping returned no results and SERPER_API_KEY not configured'] });
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
