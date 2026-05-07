// proxy-live-signals/index.ts
// Server-side proxy for all external live data APIs.
// API keys NEVER leave this function — the browser receives only the parsed result.
//
// Supported actions:
//   stock  — Alpha Vantage: 90-day price return + revenue growth + market cap + P/E
//   news   — NewsAPI: layoff headlines in last 30 days
//   both   — stock + news in parallel
//   hiring — Serper API: Naukri/LinkedIn job-count for role at company
//
// Env vars (set in Supabase dashboard > Edge Functions > Secrets):
//   ALPHAVANTAGE_API_KEY
//   NEWS_API_KEY
//   SERPER_API_KEY

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (d: unknown, status = 200) =>
  new Response(JSON.stringify(d), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

// ── Alpha Vantage ──────────────────────────────────────────────────────────

// ── Rate-limit detection helpers ──────────────────────────────────────────────
function isAvRateLimit(note: string | undefined): boolean {
  if (!note) return false;
  const lower = note.toLowerCase();
  return lower.includes('standard api call frequency') || lower.includes('25 requests per day') ||
         lower.includes('rate limit') || lower.includes('premium');
}
function isNewsApiRateLimit(msg: string): boolean {
  const lower = msg.toLowerCase();
  return lower.includes('ratelimited') || lower.includes('too many requests') || lower.includes('429');
}
function isSerperRateLimit(status: number, msg: string): boolean {
  return status === 429 || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate limit');
}

async function fetchStock(ticker: string, apiKey: string) {
  const errors: string[] = [];
  // Tagged rate-limit flags — returned so the client records the correct service
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
    if (!ovRes.ok) throw new Error(`Alpha Vantage overview HTTP ${ovRes.status}`);
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
      if (!avRateLimited) avRateLimited = isAvRateLimit(e.message);
    }
  }

  return { price90DayChange, revenueGrowthYoY, marketCap, peRatio, errors, avRateLimited };
}

// ── NewsAPI ──────────────────────────────────────────────────────────────────

async function fetchNews(companyName: string, apiKey: string) {
  const errors: string[] = [];
  let newsRateLimited = false;
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const from = thirtyDaysAgo.toISOString().split('T')[0];
    const q = encodeURIComponent(`"${companyName}" AND (layoff OR "job cuts" OR restructuring OR "workforce reduction")`);
    const url = `https://newsapi.org/v2/everything?q=${q}&from=${from}&sortBy=publishedAt&language=en&pageSize=10&apiKey=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) {
      newsRateLimited = isNewsApiRateLimit(`HTTP ${res.status}`);
      throw new Error(`NewsAPI HTTP ${res.status}`);
    }
    const data = await res.json();
    if (data.status !== 'ok') {
      newsRateLimited = isNewsApiRateLimit(data.message ?? '');
      throw new Error(data.message ?? 'NewsAPI error');
    }

    const articles: any[] = data.articles ?? [];
    const LAYOFF_KW = ['layoff', 'laid off', 'job cuts', 'workforce reduction', 'restructuring'];
    let latestLayoffEvent: any = null;
    for (const art of articles) {
      const t = (art.title ?? '').toLowerCase();
      if (LAYOFF_KW.some(kw => t.includes(kw)) && art.publishedAt) {
        const pct = (art.title + ' ' + (art.description ?? '')).match(/(\d+(?:\.\d+)?)\s*%/);
        latestLayoffEvent = {
          companyName,
          date:        art.publishedAt.slice(0, 10),
          headline:    art.title,
          percentCut:  pct ? parseFloat(pct[1]) : 5,
          source:      art.source?.name ?? 'NewsAPI',
          url:         art.url ?? '',
          affectedDepartments: [],
        };
        break;
      }
    }

    return {
      recentHeadlineCount: articles.length,
      sentimentSignal:     Math.min(1, articles.length / 5),
      latestLayoffEvent,
      fetchedAt:         new Date().toISOString(),
      errors:            [],
      newsRateLimited:   false,
    };
  } catch (e: any) {
    errors.push(`NewsAPI: ${e.message}`);
    if (!newsRateLimited) newsRateLimited = isNewsApiRateLimit(e.message);
    return { recentHeadlineCount: 0, sentimentSignal: 0, latestLayoffEvent: null, fetchedAt: new Date().toISOString(), errors, newsRateLimited };
  }
}

// ── Serper (Naukri / LinkedIn job counts) ────────────────────────────────────
//
// Returns live job-posting counts from Naukri (India) and LinkedIn (global).
// Called when action = 'hiring'. The Serper key is held server-side only.

interface HiringResult {
  estimatedOpenings:    number | null;
  demandTrend:          'rising' | 'stable' | 'falling';
  hiringFreezeScore:    number;
  naukriOpenings:       number | null;
  linkedinOpenings:     number | null;
  isLive:               true;
  source:               'Serper API';
  fetchedAt:            string;
  errors:               string[];
  serperRateLimited:    boolean;
}

async function fetchHiring(roleTitle: string, companyName: string, serperKey: string): Promise<HiringResult> {
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
      // Extract count from organic snippets: "12,345 jobs"
      const snippets: string[] = (data?.organic ?? []).slice(0, 3).map((r: any) => r?.snippet ?? '');
      for (const s of snippets) {
        const m = s.match(/(\d[\d,]+)\s+(?:jobs?|openings?|positions?|vacancies)/i);
        if (m) return parseInt(m[1].replace(/,/g, ''), 10);
      }
      // Fallback: count organic results that look job-related
      const jobResults = (data?.organic ?? []).filter((r: any) =>
        /jobs?|openings?|hiring|career/i.test(r.title ?? ''),
      ).length;
      return jobResults > 0 ? jobResults : null;
    } catch (e: any) {
      errors.push(`Serper: ${e.message}`);
      return null;
    }
  }

  const naukriQ  = `"${roleTitle}" jobs ${companyName} site:naukri.com`;
  const linkedinQ = `"${roleTitle}" jobs ${companyName} site:linkedin.com/jobs`;

  const [naukriCount, linkedinCount] = await Promise.all([
    serperCount(naukriQ),
    serperCount(linkedinQ),
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
    isLive:             true,
    source:             'Serper API',
    fetchedAt:          new Date().toISOString(),
    errors,
    serperRateLimited,
  };
}

// ── Main handler ───────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const body = await req.json().catch(() => ({}));
    const { companyName, ticker, action, roleTitle } = body;

    const avKey     = Deno.env.get('ALPHAVANTAGE_API_KEY') ?? Deno.env.get('ALPHAVANTAGE_KEY') ?? null;
    const newsKey   = Deno.env.get('NEWS_API_KEY') ?? Deno.env.get('NEWSAPI_KEY') ?? null;
    const serperKey = Deno.env.get('SERPER_API_KEY') ?? null;

    // ── hiring action ──
    if (action === 'hiring') {
      if (!serperKey) {
        return json({ hiringData: null, errors: ['SERPER_API_KEY not configured'] });
      }
      const hiringData = await fetchHiring(roleTitle ?? 'Software Engineer', companyName ?? '', serperKey);
      return json({ hiringData, errors: hiringData.errors });
    }

    // ── stock / news / both actions ──
    // rateLimitFlags are returned to the client so it can record the CORRECT
    // service in apiDegradationMonitor (alphavantage vs newsapi vs serper),
    // not the generic 'supabase_osint' that was previously recorded for all failures.
    const errors: string[] = [];
    const rateLimitFlags: { avRateLimited?: boolean; newsRateLimited?: boolean } = {};
    let stockData = null;
    let newsData  = null;

    if ((action === 'stock' || action === 'both') && avKey && ticker) {
      const s = await fetchStock(ticker, avKey);
      errors.push(...s.errors);
      rateLimitFlags.avRateLimited = s.avRateLimited;
      if (!s.avRateLimited) {
        stockData = {
          price90DayChange: s.price90DayChange,
          revenueGrowthYoY: s.revenueGrowthYoY,
          marketCap:        s.marketCap,
          peRatio:          s.peRatio,
        };
      }
    } else if ((action === 'stock' || action === 'both') && !avKey) {
      errors.push('ALPHAVANTAGE_API_KEY not configured');
    } else if ((action === 'stock' || action === 'both') && !ticker) {
      errors.push(`No ticker for "${companyName}" — private company or unmapped`);
    }

    if ((action === 'news' || action === 'both') && newsKey) {
      const n = await fetchNews(companyName ?? '', newsKey);
      errors.push(...n.errors);
      rateLimitFlags.newsRateLimited = n.newsRateLimited;
      newsData = n;
    } else if ((action === 'news' || action === 'both') && !newsKey) {
      errors.push('NEWS_API_KEY not configured');
    }

    // Include rateLimitFlags so liveDataService.ts can record alphavantage/newsapi
    // specifically rather than the generic 'supabase_osint' service name.
    return json({ stockData, newsData, errors, rateLimitFlags });
  } catch (e: any) {
    return json({ stockData: null, newsData: null, hiringData: null, errors: [String(e?.message ?? e)] }, 500);
  }
});
