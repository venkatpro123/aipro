// routes/layoff.ts
// Layoff Audit Intelligence API — v1.0
// Endpoints: company search, live enrichment, score save, benchmark

import { Router, type Request, type Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
);

const ALPHAVANTAGE_KEY = process.env.ALPHAVANTAGE_KEY || process.env.VITE_ALPHAVANTAGE_KEY || '';
const NEWSAPI_KEY      = process.env.NEWSAPI_KEY      || process.env.VITE_NEWSAPI_KEY      || '';

// ─── Helpers ────────────────────────────────────────────────────────────────

const sizeToEmployeeCount = (size: string): number => {
  const map: Record<string, number> = {
    'startup': 200, 'small': 500, 'mid': 2000, 'medium': 5000,
    'large': 25000, 'enterprise': 100000, 'mega': 500000,
  };
  return map[size?.toLowerCase()] ?? 1000;
};

const aiIndexToSignal = (index: number): 'low' | 'medium' | 'high' | 'very-high' => {
  if (index >= 0.75) return 'very-high';
  if (index >= 0.5)  return 'high';
  if (index >= 0.25) return 'medium';
  return 'low';
};

const mapDbRowToCompanyData = (row: any) => {
  const fin  = row.financial_signals || {};
  const lhist = row.layoff_history   || {};
  const hire = row.hiring_signals    || {};

  return {
    name:                row.company_name,
    // stock_ticker is the canonical column name; row.ticker is a fallback for
    // older rows seeded before the schema settled on stock_ticker.
    ticker:              row.stock_ticker || row.ticker || fin.ticker || fin.stock_ticker || fin.symbol || null,
    isPublic:            row.is_public ?? hire.is_public ?? false,
    industry:            row.industry,
    region:              row.region   || hire.region  || 'US',
    employeeCount:       row.employee_count || sizeToEmployeeCount(row.company_size),
    revenueGrowthYoY:    fin.revenue_growth_yoy   ?? null,
    stock90DayChange:    fin.stock_90d_change      ?? null,
    layoffsLast24Months: lhist.last24months        ?? [],
    layoffRounds:        lhist.rounds              ?? 0,
    lastLayoffPercent:   lhist.last_percent        ?? null,
    revenuePerEmployee:  fin.revenue_per_employee  ?? 250000,
    aiInvestmentSignal:  aiIndexToSignal(row.ai_exposure_index ?? 0.4),
    source:              row.data_source ?? 'Company Intelligence DB',
    lastUpdated:         row.last_updated ?? row.updated_at?.split('T')[0] ?? '2026-01-01',
    lastFundingRound:    hire.last_funding_round   ?? undefined,
    monthsSinceLastFunding: hire.months_since_funding ?? undefined,
    // Extra metadata from the intelligence DB
    _companyRiskScore:   row.company_risk_score,
    _confidenceScore:    row.confidence_score,
    _archetype:          row.archetype,
  };
};

// ─── Route: GET /api/v1/layoff/company/search ────────────────────────────────
// Query company_intelligence table. Supports fuzzy name + ticker search.
router.get('/company/search', async (req: Request, res: Response) => {
  try {
    const { q, limit = 8 } = req.query;
    if (!q || (q as string).length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }

    // Sanitize the user input before passing to PostgREST .or() — commas, parens,
    // and double-quotes act as filter-grammar metacharacters and would let an
    // attacker break out of the ilike clause. Whitelist alphanumerics + a few
    // safe symbols (space, dot, dash, underscore) which cover real company names.
    const safeQuery = (q as string).toLowerCase().trim().replace(/[^a-z0-9 \.\-_]/g, '');
    if (safeQuery.length < 2) {
      return res.status(400).json({ error: 'Query must contain at least 2 valid characters' });
    }

    const { data, error } = await supabase
      .from('company_intelligence')
      .select('*')
      .or(`company_name.ilike.%${safeQuery}%,ticker.ilike.${safeQuery}`)
      .order('confidence_score', { ascending: false })
      .limit(Number(limit));

    if (error) {
      console.error('[layoff/company/search] Supabase error:', error.message);
      return res.status(500).json({ error: 'Database error', details: error.message });
    }

    const companies = (data || []).map(mapDbRowToCompanyData);
    return res.json({ companies, source: 'company_intelligence', count: companies.length });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// ─── Route: GET /api/v1/layoff/company/:name/live ───────────────────────────
// Fetch live stock price change from AlphaVantage + recent news from NewsAPI
// and return an enriched CompanyData snapshot.
router.get('/company/:name/live', async (req: Request, res: Response) => {
  const nameParam = req.params.name;
  const name: string = Array.isArray(nameParam) ? nameParam[0] : nameParam;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Company name is required' });
  }

  try {
    // 1. Load base data from company_intelligence — try exact first, then prefix fuzzy
    let { data: dbRows } = await supabase
      .from('company_intelligence')
      .select('*')
      .ilike('company_name', name.trim())
      .limit(1);

    if (!dbRows || dbRows.length === 0) {
      const fuzzyResult = await supabase
        .from('company_intelligence')
        .select('*')
        .ilike('company_name', `%${name.trim()}%`)
        .order('confidence_score', { ascending: false })
        .limit(1);
      dbRows = fuzzyResult.data;
    }

    const base = dbRows?.[0] ? mapDbRowToCompanyData(dbRows[0]) : null;

    // 2. Enrich with live stock data (AlphaVantage TIME_SERIES_DAILY for true 90d change)
    //    Previous implementation extrapolated daily % × 60 — mathematically invalid;
    //    a 1% intraday move is not equivalent to a 60% quarterly trend. Use the daily
    //    series and compute the actual 90-day return.
    let stockChange: number | null = null;
    let stockSource: 'alpha_vantage_90d' | null = null;
    const ticker = base?.ticker || null;

    if (ticker && ALPHAVANTAGE_KEY) {
      try {
        const avUrl = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${encodeURIComponent(ticker)}&outputsize=compact&apikey=${ALPHAVANTAGE_KEY}`;
        const avRes = await fetch(avUrl, { signal: AbortSignal.timeout(8000) });
        if (avRes.ok) {
          const avData = (await avRes.json()) as Record<string, any>;
          const series = avData?.['Time Series (Daily)'] as Record<string, any> | undefined;
          if (series) {
            const dates = Object.keys(series).sort((a, b) => (a < b ? 1 : -1));
            if (dates.length >= 2) {
              const latest = Number(series[dates[0]]?.['4. close']);
              const olderIdx = Math.min(89, dates.length - 1);
              const older = Number(series[dates[olderIdx]]?.['4. close']);
              if (Number.isFinite(latest) && Number.isFinite(older) && older > 0) {
                stockChange = Math.round(((latest - older) / older) * 1000) / 10;
                stockSource = 'alpha_vantage_90d';
              }
            }
          }
        }
      } catch (e) {
        console.warn('[layoff/live] AlphaVantage fetch failed:', (e as Error).message);
      }
    }

    // 3. Fetch recent layoff news (NewsAPI). Parse the actual percent_cut from the
    //    headline/description — never default to a hardcoded percentage, because
    //    that fabricates a layoff event from a single news mention.
    interface LiveNewsItem {
      headline: string;
      date: string;
      source: string;
      url: string;
      percentCut: number | null;
    }
    let newsItems: LiveNewsItem[] = [];
    if (NEWSAPI_KEY) {
      try {
        const newsUrl = `https://newsapi.org/v2/everything?q=${encodeURIComponent(`"${name}" layoff OR "laid off" OR "job cuts"`)}&sortBy=publishedAt&pageSize=5&language=en&apiKey=${NEWSAPI_KEY}`;
        const newsRes = await fetch(newsUrl, { signal: AbortSignal.timeout(6000) });
        if (newsRes.ok) {
          const newsData = (await newsRes.json()) as { articles?: Array<Record<string, any>> };
          const articles = Array.isArray(newsData.articles) ? newsData.articles : [];
          newsItems = articles.slice(0, 3).map((a) => {
            const text = `${a.title ?? ''} ${a.description ?? ''}`;
            const pctMatch = text.match(/(\d+(?:\.\d+)?)\s*%/);
            return {
              headline: a.title ?? '',
              date: typeof a.publishedAt === 'string'
                ? a.publishedAt.split('T')[0]
                : new Date().toISOString().split('T')[0],
              source: a.source?.name ?? 'NewsAPI',
              url: a.url ?? '',
              percentCut: pctMatch ? parseFloat(pctMatch[1]) : null,
            };
          });
        }
      } catch (e) {
        console.warn('[layoff/live] NewsAPI fetch failed:', (e as Error).message);
      }
    }

    // 4. Cache fresh news events in Supabase layoff_news_events.
    //    Drop `.throwOnError().catch()` — Postgrest builders don't expose `.catch`
    //    and the previous code silently swallowed errors as a side-effect of TS
    //    coercion. await + try/catch is honest about success/failure.
    if (newsItems.length > 0) {
      const newsRows = newsItems.map((n) => ({
        company_name: name,
        headline: n.headline,
        event_date: n.date,
        source_name: n.source,
        source_url: n.url,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }));
      try {
        await supabase
          .from('layoff_news_events')
          .upsert(newsRows, { onConflict: 'headline' });
      } catch (e) {
        console.warn('[layoff/live] news cache upsert failed:', (e as Error).message);
      }
    }

    // 5. Assemble enriched response
    const enriched = {
      ...(base || { name, source: 'Live Fetch', lastUpdated: new Date().toISOString().split('T')[0] }),
      ...(stockChange !== null
        ? { stock90DayChange: stockChange, _stockIsLive: true, _stockSource: stockSource }
        : {}),
      _liveNews: newsItems,
      _enrichedAt: new Date().toISOString(),
    };

    return res.json({ company: enriched, hasLiveStock: stockChange !== null, newsCount: newsItems.length });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// ─── Route: GET /api/v1/layoff/news ─────────────────────────────────────────
// Return layoff news events from DB cache + optionally fetch fresh from NewsAPI
router.get('/news', async (req: Request, res: Response) => {
  try {
    const { company, days = 90, limit = 20 } = req.query;

    let query = supabase
      .from('layoff_news_events')
      .select('*')
      .gt('expires_at', new Date().toISOString())
      .order('event_date', { ascending: false })
      .limit(Number(limit));

    if (company) {
      query = query.ilike('company_name', `%${company}%`);
    }

    const since = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    query = query.gte('event_date', since);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    return res.json({
      events: data || [],
      count: data?.length || 0,
      source: 'layoff_news_events',
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// ─── Route: POST /api/v1/layoff/score ───────────────────────────────────────
// Save an anonymized layoff score for benchmarking.
// No user PII — industry/role/department only.
router.post('/score', async (req: Request, res: Response) => {
  try {
    const {
      industry, roleCategory, department, companySizeBucket, region,
      score, tier, confidence, confidencePercent,
      l1, l2, l3, l4, l5,
    } = req.body;

    if (!industry || score === undefined || !tier) {
      return res.status(400).json({ error: 'industry, score, and tier are required' });
    }

    const { data, error } = await supabase
      .from('layoff_scores')
      .insert({
        industry,
        role_category: roleCategory || 'unknown',
        department: department || 'Unknown',
        company_size_bucket: companySizeBucket || 'mid',
        region: region || 'US',
        score: Math.round(score),
        tier,
        confidence: confidence || 'Medium',
        confidence_percent: confidencePercent || 50,
        l1_company_health: l1,
        l2_layoff_history: l2,
        l3_role_exposure: l3,
        l4_market_conditions: l4,
        l5_employee_factors: l5,
      })
      .select('id')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, id: data?.id });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// ─── Route: GET /api/v1/layoff/benchmark ────────────────────────────────────
// Returns industry percentile data and tier distribution.
router.get('/benchmark', async (req: Request, res: Response) => {
  try {
    const { industry, role, score, days = 90 } = req.query;
    if (!industry) return res.status(400).json({ error: 'industry is required' });

    // Get aggregate benchmark
    const { data: benchData, error: benchErr } = await supabase.rpc('get_layoff_benchmark', {
      p_industry: industry,
      p_role_category: role || null,
      p_days: Number(days),
    });
    if (benchErr) return res.status(500).json({ error: benchErr.message });

    // Get percentile if score provided
    let percentileData = null;
    if (score !== undefined) {
      const { data: pData, error: pErr } = await supabase.rpc('get_score_percentile', {
        p_score: Number(score),
        p_industry: industry,
        p_days: Number(days),
      });
      if (!pErr) percentileData = pData;
    }

    return res.json({
      benchmark: benchData,
      percentile: percentileData,
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// ─── Route: GET /api/v1/layoff/report-data ──────────────────────────────────
// Returns structured data for PDF report generation (done client-side with jspdf)
router.get('/report-data', async (req: Request, res: Response) => {
  try {
    const { industry, score, tier, role, company } = req.query;

    // Fetch benchmark context for the report
    let benchmark = null;
    if (industry) {
      const { data } = await supabase.rpc('get_layoff_benchmark', {
        p_industry: industry,
        p_role_category: null,
        p_days: 90,
      });
      benchmark = data;
    }

    // Fetch recent news for the company
    let news: any[] = [];
    if (company) {
      const { data } = await supabase
        .from('layoff_news_events')
        .select('*')
        .ilike('company_name', `%${company}%`)
        .gt('expires_at', new Date().toISOString())
        .order('event_date', { ascending: false })
        .limit(3);
      news = data || [];
    }

    return res.json({
      generatedAt: new Date().toISOString(),
      benchmark,
      recentNews: news,
      reportMeta: {
        industry,
        score: score ? Number(score) : null,
        tier,
        role,
        company,
      },
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;
