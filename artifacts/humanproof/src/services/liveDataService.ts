// liveDataService.ts
// Central live data fetcher — scraping-first, zero paid API keys required.
// PRIORITY: Yahoo Finance (no key) → 12-source free RSS (no key) →
//           Naukri/Indeed/LinkedIn + 20 market job boards (no key, scraped) →
//           Wikipedia/Glassdoor/career-page enrichment (no key, server-side)
// All sources are free and unlimited. Paid APIs (Alpha Vantage, NewsAPI, Serper) removed.

import { injectLayoffEvent, LayoffNewsEvent } from '../data/layoffNewsCache';
import { runScrapingPipeline, applyScrapingEnrichment } from './scrapingOrchestrator';
import type { CompanyData } from '../data/companyDatabase';
import { enrichCompanySignals } from './dataConnectors/index';
import { supabase as _supabase } from '../utils/supabase';
import { invokeEdgeFunction } from '../infrastructure/requestId';
import {
  recordApiDegradation,
  isRateLimitError,
} from './apiDegradationMonitor';
import {
  isCallAllowed,
  recordSuccess as circuitSuccess,
  recordFailure as circuitFailure,
  getCachedResponse,
  getCircuitSnapshot,
  stockCircuitKeyForTicker,
} from './apiCircuitBreaker';
import type { PipelineTimerInstance } from './pipelineTimer';
// WS3 — Evidence hierarchy veto for reconcileCompanySignals (Audit Issue #7).
import { classifySourceToTier, shouldVetoOverride } from './evidenceHierarchy';
import { evaluateFlagSync } from '../config/featureFlags';
// WS9 + WS10 — confidence caps come from DB (with bootstrap fallback),
// and the "we capped you" event is observable in layer_fallback_log.
import { getConstant } from './calibration/calibrationConstants';
import { markFallback } from './observability/withFallback';
// v40.0 Task 4.1: entity resolver is now the canonical source for ticker lookup.
// The local TICKER_MAP below acts as a fallback for companies not yet in the resolver.
import { resolveEntity } from './companyEntityResolver';

// ── Types ────────────────────────────────────────────────────────────────────

export interface StockLiveData {
  price90DayChange: number | null;
  revenueGrowthYoY: number | null;
  marketCap: number | null;
  peRatio: number | null;
  /** Full-time employee count from Yahoo Finance assetProfile.fullTimeEmployees */
  employeeCount: number | null;
  /**
   * yahoo-finance = scraped directly from Yahoo Finance API (no key, unlimited) — PRIMARY
   * yahoo-finance+sec-edgar = Yahoo chart + SEC EDGAR fundamentals (US stocks)
   * yahoo-finance+finnhub   = Yahoo chart + Finnhub fundamentals (global/Indian stocks)
   * finnhub       = Finnhub only (fallback when Yahoo chart also fails)
   * bse-india     = BSE India API (no key, India-listed companies)
   * nse-india     = NSE India API (no key, India-listed companies)
   * heuristic     = static baseline (no live data available)
   */
  source: 'yahoo-finance' | 'yahoo-finance+sec-edgar' | 'yahoo-finance+finnhub' | 'finnhub' | 'bse-india' | 'nse-india' | 'heuristic';
  fetchedAt: string;
}

export interface NewsLiveData {
  latestLayoffEvent: LayoffNewsEvent | null;
  recentHeadlineCount: number;  // layoff-related articles in last 30 days
  sentimentSignal: number;      // 0–1, higher = more negative/risky
  source: 'scraped-rss' | 'static-cache' | 'google-news-rss' | 'bing-news-rss' | 'hackernews' | 'reddit' | 'gnews' | 'none';
  fetchedAt: string;
}

export interface HiringLiveData {
  freezeScore: number | null;   // 0–1, higher = more frozen
  postingTrend: 'growing' | 'stable' | 'declining' | 'frozen' | 'unknown';
  /** Estimated open postings for the user's role at this company. Only
   *  populated when a live job-board scraper returned a count; null for
   *  heuristic baselines so the UI does not present a fake number. */
  estimatedOpenings: number | null;
  /** Naukri-specific count (live only). */
  naukriOpenings: number | null;
  /** LinkedIn-specific count (live only). */
  linkedinOpenings: number | null;
  /**
   * true  = live job-board scraping (Naukri/Indeed/LinkedIn/etc.) succeeded.
   * false = ROLE_DEMAND_BASE static prior from Q1 2026; NOT live data.
   * UI must show "heuristic" qualifier when false.
   */
  isLive: boolean;
  /** Disclosure text for "heuristic" tooltip when isLive = false. */
  disclosure: string;
  source: 'supabase-osint' | 'heuristic';
  fetchedAt: string;
}

export type SignalSourceKind = 'live' | 'db' | 'heuristic' | 'user_input';
export type SignalFreshnessState = 'fresh' | 'degraded' | 'invalid';

export interface ProvenancedSignal<T = unknown> {
  key: string;
  value: T | null;
  source: SignalSourceKind;
  sourceName: string;
  observedAt: string;
  fetchedAt: string;
  freshnessDays: number;
  freshnessState: SignalFreshnessState;
  confidence: number;
  supersedes?: string[];
  conflictWith?: string[];
}

export interface SignalConflict {
  signalType: string;
  descriptions: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  conflictingSources: Array<{
    source: string;
    value: number;
    timestamp: string;
  }>;
  recommendedResolution?: string;
}

export interface ReconciliationSummary {
  liveWonKeys: string[];
  dbWonKeys: string[];
  conflictedKeys: string[];
  degradedKeys: string[];
  ignoredLiveKeys?: string[];
  confidenceCapsApplied?: string[];
  hardFailures?: string[];
}

export interface ReconciledCompanySignals {
  active: CompanyData;
  signals: Record<string, ProvenancedSignal<any>>;
  conflicts: SignalConflict[];
  liveSignalCount: number;
  informativeLiveSignalCount: number;
  degradedLiveSignalCount: number;
  degradedSignalClasses: string[];
  hardFailures: string[];
  missingDataFallbacks: string[];
  confidenceCap?: number;
  confidenceCapsApplied: string[];
  summary: ReconciliationSummary;
}

export interface LiveDataResult {
  stockData: StockLiveData | null;
  newsData: NewsLiveData | null;
  hiringData: HiringLiveData | null;
  overallSource: 'full-live' | 'partial-live' | 'heuristic' | 'unknown-company';
  liveSignalCount: number;          // API calls that returned non-null data
  heuristicSignalCount: number;     // static/inferred signals
  /**
   * [AUDIT FIX]: Signals that came from LIVE external API calls in this session only.
   * Does NOT include stale DB values that were returned by the EF and labeled as "live".
   * Used to display honest "X live API signals" vs the inflated liveSignalCount.
   * Stock from Yahoo Finance = 1-2 genuine, news from free RSS = 1 genuine, hiring = 1 if scraped.
   */
  genuineLiveApiSignals: number;
  /**
   * Signals that actually changed companyData vs the static DB baseline.
   * A field counted here was null in the DB and non-null from the live API.
   * Use this for confidence interval calculations — not liveSignalCount.
   *
   * Example: TCS has stock90DayChange: 15 in static DB. Alpha Vantage returns 15.
   *   liveSignalCount = 1 (API returned non-null)
   *   informativeLiveSignals = 0 (DB guard prevented write — no new information)
   */
  informativeLiveSignals: number;
  fetchedAt: string;
  apiErrors: string[];           // non-fatal errors for transparency
  /**
   * High-confidence layoff events derived from regulatory or news sources
   * (SEC EDGAR 8-K, WARN Act, India press) — surfaced separately so
   * `reconcileCompanySignals` can backfill `layoffsLast24Months` when the
   * base CompanyData record is missing it.
   *
   * `affectedCount`: raw worker count from regulatory filings (WARN Act).
   * When present and companyData.employeeCount is known, `reconcileCompanySignals`
   * computes the percentCut instead of storing 0, restoring L2 severity scoring.
   */
  derivedLayoffEvents: { date: string; percentCut: number; source: string; affectedCount?: number }[];
  reconciled?: ReconciledCompanySignals;
  degradedSignalClasses: string[];
  hardFailures: string[];
  _connectorSignals?: any;
  _scrapingResult?:   any;
}

// ── Server-side proxy call (Yahoo Finance + multi-source RSS — no keys) ───────

const fetchViaProxy = async (
  companyName: string,
  ticker: string | null,
  action: 'stock' | 'news' | 'both',
): Promise<{ stockData: any; newsData: any; errors: string[] }> => {
  if (!_supabase) return { stockData: null, newsData: null, errors: ['Supabase client not initialised'] };

  const { data, error } = await invokeEdgeFunction<any>('proxy-live-signals', {
    body: { companyName, ticker, action },
  });

  if (error) throw new Error(`proxy-live-signals: ${error.message}`);
  return {
    stockData: data?.stockData ?? null,
    newsData: data?.newsData ?? null,
    errors: data?.errors ?? [],
  };
};

// ── Text extraction helpers ───────────────────────────────────────────────────

// Strict workforce-% extractor — mirrors WORKFORCE_PCT_RE in the
// fetch-company-data Edge Function, with an extra gate: the headline must
// ALSO contain a workforce keyword somewhere. The previous loose `/(\d+)%/`
// regex would match interest rates, discounts, stock moves and fabricate a
// 5% default — corrupting L2 severity scoring.
//
// Rules:
//   1. Match only headlines (passed in) — descriptions add noise.
//   2. Headline must contain a workforce keyword (workforce/employees/staff/...).
//   3. Match a % near a workforce noun OR near a cut/reduce verb.
//   4. Sanity-gate to 0.5–35% — outside this band almost certainly mis-parsed.
const WORKFORCE_KEYWORD_RE =
  /\b(workforce|employees|staff|headcount|jobs|roles|workers|positions|layoffs?|head\s*count|workforce\s+reduction|job\s*cuts)\b/i;
const WORKFORCE_PCT_RE =
  /(\d+(?:\.\d+)?)\s*%\s*(?:of\s+(?:its\s+)?(?:global\s+)?(?:workforce|employees|staff|headcount|jobs|roles|workers|positions))|(?:cut|cuts|lay(?:ed)?\s*off|reduc(?:e|ed|ing)|eliminat(?:e|ed)|slash(?:ed)?|trim(?:med)?)\s+(?:\w+\s+){0,4}(\d+(?:\.\d+)?)\s*%/i;

const extractWorkforcePercent = (headline: string): number | null => {
  if (!WORKFORCE_KEYWORD_RE.test(headline)) return null;
  const m = headline.match(WORKFORCE_PCT_RE);
  if (!m) return null;
  const raw = parseFloat(m[1] ?? m[2] ?? '0');
  if (!Number.isFinite(raw) || raw < 0.5 || raw > 35) return null;
  return raw;
};

const DEPT_KEYWORDS: Record<string, string> = {
  engineering: 'engineering', sales: 'sales', marketing: 'marketing',
  hr: 'hr', support: 'support', operations: 'operations',
  recruiting: 'recruiting', product: 'product', design: 'design',
  finance: 'finance', legal: 'legal', research: 'research',
};

const extractDepartmentsFromText = (text: string): string[] => {
  const lower = text.toLowerCase();
  return Object.entries(DEPT_KEYWORDS)
    .filter(([kw]) => lower.includes(kw))
    .map(([, dept]) => dept);
};

// ── Primary Entry Point ───────────────────────────────────────────────────────

/**
 * fetchLiveCompanyData — Fetches all available live signals for a company.
 *
 * @param companyName  Human-readable company name (e.g. "Google")
 * @param ticker       Stock ticker if known (e.g. "GOOGL"). Pass null for private companies.
 * @param _timer       Optional pipeline timer for performance tracking.
 * @param roleTitle    User's role title — passed to job-board scrapers so Naukri/Indeed/LinkedIn
 *                     return role-specific hiring counts instead of company-wide defaults.
 * @param industry     Company industry — passed to connectors for sector-level layoff counts.
 */
export const fetchLiveCompanyData = async (
  companyName: string,
  ticker?: string | null,
  _timer?: PipelineTimerInstance,
  roleTitle?: string,
  industry?: string,
  isUnknownCompany?: boolean,
  region?: string,
): Promise<LiveDataResult> => {
  const errors: string[] = [];
  let liveCount = 0;
  let heuristicCount = 0;
  const derivedLayoffEvents: { date: string; percentCut: number; source: string; affectedCount?: number }[] = [];
  const degradedSignalClasses: string[] = [];
  const hardFailures: string[] = [];
  let connectorSignals: any = null;

  // Ticker resolution — no API keys in the browser
  // Only PUBLIC companies with real exchange-listed tickers belong here.
  // Private companies (Stripe, Rippling, Anthropic etc.) must NOT have entries —
  // a fake ticker like 'STRIP' triggers Yahoo Finance fetch failures, which trip
  // the circuit breaker and block stock signals for all subsequent companies.
  const TICKER_MAP: Record<string, string> = {
    // ── US public — NYSE / NASDAQ ──────────────────────────────────────────
    amazon: 'AMZN', google: 'GOOGL', alphabet: 'GOOGL',
    microsoft: 'MSFT', apple: 'AAPL', meta: 'META', facebook: 'META',
    tesla: 'TSLA', netflix: 'NFLX', nvidia: 'NVDA',
    salesforce: 'CRM', oracle: 'ORCL', ibm: 'IBM',
    intel: 'INTC', amd: 'AMD', qualcomm: 'QCOM', cisco: 'CSCO',
    uber: 'UBER', airbnb: 'ABNB', lyft: 'LYFT', doordash: 'DASH',
    spotify: 'SPOT', shopify: 'SHOP', adobe: 'ADBE', snap: 'SNAP',
    palantir: 'PLTR', snowflake: 'SNOW', coinbase: 'COIN',
    datadog: 'DDOG', cloudflare: 'NET', twilio: 'TWLO',
    samsara: 'IOT', okta: 'OKTA', crowdstrike: 'CRWD', zscaler: 'ZS',
    servicenow: 'NOW', workday: 'WDAY', zoom: 'ZM', dropbox: 'DBX',
    'paycom software': 'PAYC', paycom: 'PAYC',
    intuit: 'INTU', autodesk: 'ADSK', veeva: 'VEEV',
    mongodb: 'MDB', gitlab: 'GTLB', hashicorp: 'HCP',
    // Additional US tech
    'c3.ai': 'AI', 'c3 ai': 'AI',
    splunk: 'SPLK', 'palo alto': 'PANW', fortinet: 'FTNT',
    'elastic': 'ESTC', confluent: 'CFLT', 'unity software': 'U',
    roblox: 'RBLX', robinhood: 'HOOD', affirm: 'AFRM',
    'toast': 'TOST', 'bill.com': 'BILL', braze: 'BRZE',
    hubspot: 'HUBS', zendesk: 'ZEN', 'box': 'BOX',
    'mongodb atlas': 'MDB',
    twitch: 'AMZN', // amazon subsidiary
    'x.com': 'N/A', // private
    linkedin: 'MSFT', // microsoft subsidiary
    github: 'MSFT',  // microsoft subsidiary
    slack: 'CRM',    // salesforce subsidiary
    // US Financial / Fintech
    stripe: 'N/A',   // private — must NOT map to a fake ticker
    'square': 'XYZ', // now Block
    block: 'XYZ', 'cash app': 'XYZ',
    'sofi': 'SOFI', 'nubank': 'NU',
    visa: 'V', mastercard: 'MA',
    'american express': 'AXP', amex: 'AXP',
    jpmorgan: 'JPM', 'bank of america': 'BAC',
    goldman: 'GS', 'morgan stanley': 'MS', wells: 'WFC',
    // US Healthcare / Biotech
    johnson: 'JNJ', pfizer: 'PFE', 'abbvie': 'ABBV',
    'unitedhealth': 'UNH', cvs: 'CVS', 'cigna': 'CI',
    moderna: 'MRNA', biontech: 'BNTX',
    // US Media / Retail
    disney: 'DIS', 'comcast': 'CMCSA', 'paramount': 'PARA',
    walmart: 'WMT', target: 'TGT', 'home depot': 'HD',
    costco: 'COST', kroger: 'KR', 'dollar tree': 'DLTR',
    // US Manufacturing / Auto / EV
    ford: 'F', 'general motors': 'GM', gm: 'GM',
    rivian: 'RIVN', lucid: 'LCID',
    boeing: 'BA', lockheed: 'LMT', raytheon: 'RTX',
    // ── India — NSE (suffix .NS for Yahoo Finance) ─────────────────────────
    infosys: 'INFY',                    // US-listed ADR; INFY.NS on NSE
    wipro: 'WIT',                       // US-listed ADR
    'tata consultancy': 'TCS.NS', tcs: 'TCS.NS',
    hcl: 'HCLTECH.NS', 'hcl technologies': 'HCLTECH.NS',
    'tech mahindra': 'TECHM.NS',
    mphasis: 'MPHASIS.NS',
    persistent: 'PERSISTENT.NS',
    ltimindtree: 'LTIM.NS', lti: 'LTIM.NS',
    coforge: 'COFORGE.NS',
    hexaware: 'HEXAWARE.NS',
    'l&t technology': 'LTTS.NS', ltts: 'LTTS.NS',
    kpit: 'KPITTECH.NS', 'kpit technologies': 'KPITTECH.NS',
    'zensar': 'ZENSARTECH.NS',
    mindtree: 'LTIM.NS',  // merged into LTIMindtree
    // India Banks & Finance
    hdfc: 'HDFCBANK.NS', 'hdfc bank': 'HDFCBANK.NS',
    icici: 'ICICIBANK.NS', 'icici bank': 'ICICIBANK.NS',
    'axis bank': 'AXISBANK.NS', axis: 'AXISBANK.NS',
    sbi: 'SBIN.NS', 'state bank': 'SBIN.NS',
    kotak: 'KOTAKBANK.NS', 'kotak mahindra': 'KOTAKBANK.NS',
    bajajfinserv: 'BAJAJFINSV.NS', 'bajaj finserv': 'BAJAJFINSV.NS',
    'bajaj finance': 'BAJFINANCE.NS',
    paytm: 'ONE97.NS', 'one97': 'ONE97.NS',
    policybazaar: 'POLICYBZR.NS',
    nykaa: 'FSN.NS',
    // India Telecom / Consumer
    'reliance': 'RELIANCE.NS', jio: 'RELIANCE.NS',
    airtel: 'BHARTIARTL.NS', 'bharti airtel': 'BHARTIARTL.NS',
    tata: 'TCS.NS',  // resolve to TCS as most common Tata tech search
    // India E-commerce / Logistics
    zomato: 'ZOMATO.NS',
    swiggy: 'N/A',   // recently listed, may not have data yet
    'delhivery': 'DELHIVERY.NS',
    'indiamart': 'INDIAMART.NS',
    // India-origin US-listed
    cognizant: 'CTSH', accenture: 'ACN',
    // ── China / APAC — ADRs ──────────────────────────────────────────────
    alibaba: 'BABA', 'jd.com': 'JD', jd: 'JD',
    baidu: 'BIDU', tencent: '0700.HK',
    'sea limited': 'SE', sea: 'SE',
    grab: 'GRAB', 'goto': 'N/A',
    samsung: '005930.KS',
    // ── Europe ───────────────────────────────────────────────────────────
    sap: 'SAP', nokia: 'NOK', asml: 'ASML',
    siemens: 'SIEGY', 'siemens energy': 'SMEGF',
    'capgemini': 'CAPMF', 'atos': 'ATOSY',
    'deutsche telekom': 'DTEGY',
    // ── Global Consulting ─────────────────────────────────────────────────
    mckinsey: 'N/A', bcg: 'N/A', bain: 'N/A',  // private
    deloitte: 'N/A', pwc: 'N/A', ey: 'N/A', kpmg: 'N/A',  // private
    // capgemini already mapped above under Europe section (CAPMF) — duplicate removed
  };
  const resolvedTicker = ticker ?? (() => {
    // v40.0: Check entity resolver first (canonical single source of truth).
    const entity = resolveEntity(companyName);
    if (entity) {
      // Entity resolver returns null for private companies — correct behaviour.
      return entity.ticker;
    }
    // Fallback: local TICKER_MAP for companies not yet in the entity resolver.
    const lower = companyName.toLowerCase();
    for (const [key, t] of Object.entries(TICKER_MAP)) {
      if (lower.includes(key) || key.includes(lower)) {
        // 'N/A' marks confirmed private companies — never attempt a ticker fetch
        // since that would hit Yahoo Finance with a bogus symbol, trip the circuit
        // breaker, and block stock signals for all subsequent companies.
        return t === 'N/A' ? null : t;
      }
    }
    return null;
  })();

  // ── Same-day company_live_cache check ───────────────────────────────────────
  // If this company was already audited today (valid_until > now), skip live
  // scraping and return DB values. Saves ~3-8s of scraping time and EF calls.
  // The cache is written by proxy-live-signals after every fresh scrape.
  if (_supabase && companyName) {
    try {
      const { data: cached } = await _supabase
        .from('company_live_cache')
        .select('price_90d_change,revenue_growth_yoy,market_cap,pe_ratio,employee_count,stock_source,recent_headline_count,sentiment_signal,latest_layoff_event,estimated_openings,demand_trend,hiring_freeze_score,wiki_employee_count,fetched_at')
        .ilike('company_name', companyName)
        .gt('valid_until', new Date().toISOString())
        .order('fetched_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cached) {
        // Reconstruct StockLiveData from cache
        const cachedStock: StockLiveData | null =
          cached.price_90d_change != null || cached.market_cap != null
            ? {
                price90DayChange: cached.price_90d_change ?? null,
                revenueGrowthYoY: cached.revenue_growth_yoy ?? null,
                marketCap:        cached.market_cap        ?? null,
                peRatio:          cached.pe_ratio           ?? null,
                employeeCount:    cached.employee_count     ?? null,
                source:           (['yahoo-finance','yahoo-finance+finnhub','yahoo-finance+sec-edgar','finnhub','bse-india','nse-india','heuristic'].includes(cached.stock_source ?? '')
                                    ? cached.stock_source
                                    : 'yahoo-finance') as StockLiveData['source'],
                fetchedAt:        cached.fetched_at ?? new Date().toISOString(),
              }
            : null;

        const cachedNews: NewsLiveData | null =
          cached.recent_headline_count != null
            ? {
                latestLayoffEvent:    cached.latest_layoff_event ?? null,
                recentHeadlineCount:  cached.recent_headline_count,
                sentimentSignal:      cached.sentiment_signal ?? 0,
                source:               'scraped-rss',
                fetchedAt:            cached.fetched_at ?? new Date().toISOString(),
              }
            : null;

        // Only use cache if at least stock or news data is present
        if (cachedStock || cachedNews) {
          return {
            stockData:  cachedStock,
            newsData:   cachedNews,
            hiringData: null,
            overallSource:           'partial-live',
            liveSignalCount:         cachedStock ? 2 : 0,
            genuineLiveApiSignals:   0,
            informativeLiveSignals:  0,
            heuristicSignalCount:    0,
            fetchedAt:               cached.fetched_at ?? new Date().toISOString(),
            apiErrors:  [`[DB cache hit] Company data from today (${cached.fetched_at?.slice(0,16)}Z) — skipped live scraping`],
            derivedLayoffEvents:     [],
            degradedSignalClasses:   [],
            hardFailures:            [],
          };
        }
      }
    } catch { /* cache check failure — proceed with live scraping */ }
  }

  // ── Concurrent scraping pipeline — launches before all API calls ────────────
  // Career page + Wikipedia + Glassdoor scraping runs concurrently while
  // the main DB + API fetch chain proceeds. No API keys required.
  // Result applied to companyData after reconciliation (in auditDataPipeline).
  // Unknown companies get a higher-priority, extended-timeout scraping pass since
  // Wikipedia headcount + career-page freeze are their only non-heuristic signals.
  // WS10 — null is the legitimate "scrape pipeline failed/timed out"
  // signal that downstream reconciliation handles, but the FACT that
  // scraping failed is observability-worthy. markFallback writes one
  // row to layer_fallback_log so a sudden spike in scrape failures
  // (Glassdoor anti-bot, Naukri rate-limit, Wikipedia parser drift) is
  // visible on the SLO dashboard instead of being silently masked.
  const _scrapingPipelinePromise = runScrapingPipeline(
    companyName, null,
    isUnknownCompany ? { isUnknownCompany: true } : undefined,
  ).catch((err: unknown) => {
    markFallback({
      layerId: 'liveDataService.runScrapingPipeline',
      reason: 'exception',
      companyCanonical: companyName,
      rationale: err instanceof Error ? err.message : String(err),
    });
    return null;
  });

  // ── Stock + News via server-side proxy (API keys stay on server) ──────────
  let stockData: StockLiveData | null = null;
  let newsData: NewsLiveData | null = null;

  // Derive the Yahoo Finance circuit key for this ticker BEFORE Gate 2 checks.
  // US tickers (no suffix) → yahoo-finance-us; international (.NS/.BO/.L/.SI/etc.)
  // → yahoo-finance-global. This means a US Yahoo Finance outage does not open
  // the circuit for Indian/European/APAC tickers, which route through the same
  // proxy but represent a distinct exchange availability domain.
  const yfCircuitKey = stockCircuitKeyForTicker(resolvedTicker);

  // ── Circuit breaker gate (Yahoo Finance only — the sole stock source) ───────
  const yFinanceCircuitOpen = !isCallAllowed(yfCircuitKey);

  if (yFinanceCircuitOpen) {
    const yfSnap  = getCircuitSnapshot(yfCircuitKey);
    const yfCache = getCachedResponse<StockLiveData>(yfCircuitKey);
    if (yfCache) {
      stockData = { ...yfCache.data, fetchedAt: new Date(yfCache.cachedAt).toISOString() };
      errors.push(`Stock proxy circuit OPEN — using cached data from ${yfSnap.cachedAgeLabel ?? 'earlier'}.`);
      heuristicCount += 1;
      degradedSignalClasses.push('financial');
    } else {
      errors.push(`Stock proxy circuit OPEN (${yfSnap.consecutiveFailures} failures). No cached data — heuristic fallback.`);
      heuristicCount += 2;
      degradedSignalClasses.push('financial');
    }
  }

  // Determine proxy action — news is always attempted (12 free RSS sources, no quota).
  const stockNeeded = !yFinanceCircuitOpen;
  const newsNeeded  = true;
  const proxyAction: 'stock' | 'news' | 'both' =
    stockNeeded ? 'both' : 'news';

  try {
    if (stockNeeded) _timer?.mark('stock_fetch_start');
    if (newsNeeded)  _timer?.mark('news_scrape_start');

    const proxyResult = await fetchViaProxy(companyName, resolvedTicker, proxyAction);

    if (stockNeeded) _timer?.mark('stock_fetch_end');
    if (newsNeeded)  _timer?.mark('news_scrape_end');

    errors.push(...proxyResult.errors);

    if (stockNeeded) {
      const ps = proxyResult.stockData;
      if (ps && ps.price90DayChange !== undefined) {
        stockData = {
          price90DayChange: ps.price90DayChange ?? null,
          revenueGrowthYoY: ps.revenueGrowthYoY ?? null,
          marketCap: ps.marketCap ?? null,
          peRatio: ps.peRatio ?? null,
          employeeCount: typeof ps.employeeCount === 'number' && ps.employeeCount > 0 ? ps.employeeCount : null,
          source: ps.source ?? 'yahoo-finance',
          fetchedAt: new Date().toISOString(),
        };
        circuitSuccess(yfCircuitKey, stockData);
        if (ps.price90DayChange != null) liveCount += 1; else heuristicCount += 1;
        if (ps.revenueGrowthYoY != null) liveCount += 1; else heuristicCount += 1;
      } else {
        // NOTE: Do NOT call circuitFailure() here.
        // The circuit tracks proxy availability, not per-ticker Yahoo Finance data.
        // When Yahoo Finance fails inside the EF (crumb blocked, 403, anti-bot), the
        // EF returns HTTP 200 with stockData: null — the proxy was reachable.
        // Calling circuitFailure() here trips the circuit after 3 audits and keeps it
        // open permanently. circuitFailure() is ONLY called in the catch block below
        // when the proxy itself throws (network error, EF unavailable, auth failure).
        // See also: withCircuitBreaker() in apiCircuitBreaker.ts which treats null
        // result as "not a failure" for exactly the same reason.
        if (resolvedTicker) {
          errors.push(`Yahoo Finance: no data for ${resolvedTicker}`);
          degradedSignalClasses.push('financial');
        } else {
          errors.push('No ticker — stock signals unavailable (private/unknown company)');
        }
        heuristicCount += 2;
      }
    }

    if (newsNeeded) {
      const pn = proxyResult.newsData;
      if (pn && pn.recentHeadlineCount !== undefined) {
        newsData = {
          latestLayoffEvent: pn.latestLayoffEvent ?? null,
          recentHeadlineCount: pn.recentHeadlineCount,
          sentimentSignal: pn.sentimentSignal,
          source: 'scraped-rss',
          fetchedAt: pn.fetchedAt ?? new Date().toISOString(),
        };
        if (pn.latestLayoffEvent) {
          injectLayoffEvent(pn.latestLayoffEvent as LayoffNewsEvent);
          // v30.0: push into derivedLayoffEvents so L2.recentLayoffRisk fires
          // (not just newsRisk). Previously news-detected layoffs only triggered
          // newsRisk — L2 stayed at the sector epistemic floor, understating risk.
          derivedLayoffEvents.push({
            date: pn.latestLayoffEvent.date,
            percentCut: pn.latestLayoffEvent.percentCut ?? 0,
            source: `news (${pn.latestLayoffEvent.source ?? 'live'})`,
          });
        }
        if (pn.recentHeadlineCount > 0) liveCount += 1; else heuristicCount += 1;
      } else {
        errors.push('RSS news proxy: no results');
        heuristicCount += 1;
      }
    }
  } catch (proxyErr: any) {
    const errMsg = proxyErr.message ?? String(proxyErr);
    errors.push(`proxy-live-signals: ${errMsg}`);

    // 401/403 = auth issue (user not logged in, or session expired).
    // This is NOT a Yahoo Finance failure — don't trip the circuit.
    // Same pattern as naukriConnector.ts which explicitly skips auth errors.
    const isAuthError =
      errMsg.includes('401') ||
      errMsg.includes('403') ||
      errMsg.includes('Unauthorized') ||
      errMsg.includes('Invalid or expired token') ||
      errMsg.includes('Insufficient role') ||
      errMsg.includes('Missing Authorization');

    if (isAuthError) {
      console.info('[liveDataService] proxy-live-signals auth error — not tripping circuit:', errMsg);
      if (stockNeeded) heuristicCount += 2;
      if (newsNeeded)  heuristicCount += 1;
    } else {
      if (stockNeeded) { heuristicCount += 2; circuitFailure(yfCircuitKey, errMsg); }
      if (newsNeeded)  { heuristicCount += 1; }
      if (isRateLimitError(proxyErr)) {
        recordApiDegradation('supabase_osint', 'rate_limited', errMsg);
      } else {
        recordApiDegradation('supabase_osint', 'network_error', errMsg);
      }
    }
  }

  // ── Free Data Connectors (BSE / NSE / layoffs.fyi / MCA / RSS / HN) ────────
  // Only REAL network sources count as live signals.
  // Naukri heuristic is always present but is NOT a live signal — it's a baseline.
  let hiringData: HiringLiveData | null = null;
  try {
    _timer?.mark('bse_fetch_start');
    _timer?.mark('hiring_scrape_start');
    // Pass roleTitle so job-board scrapers fetch role-specific posting counts.
    // Pass industry so getSectorLayoffCount returns meaningful peer-company signals.
    connectorSignals = await enrichCompanySignals(companyName, roleTitle ?? '', industry ?? '', region);
    _timer?.mark('bse_fetch_end');
    _timer?.mark('hiring_scrape_end');

    // 'Naukri Heuristic' is unconditionally added by the connector — filter it out
    // when deciding whether real connector data was returned.
    const realSources = connectorSignals.sourcesUsed.filter(
      s => s !== 'Naukri Heuristic',
    );

    // BSE/NSE stock signal (real network call — bseConnector, no Yahoo Finance)
    if (stockData === null && connectorSignals.stock90DayChange !== null) {
      stockData = {
        price90DayChange: connectorSignals.stock90DayChange,
        revenueGrowthYoY: connectorSignals.revenueYoY,
        marketCap: connectorSignals.marketCapCr,
        peRatio: connectorSignals.peRatio,
        employeeCount: null,
        source: 'bse-india',
        fetchedAt: connectorSignals.fetchedAt,
      };
      liveCount += 1;
    }

    // Hiring signal: live only when the EF job-board scraper returned real counts.
    // The naukriConnector routes through proxy-live-signals (no API keys).
    const hiringIsLive = connectorSignals.roleDemandIsLive;
    // 'frozen' derives from freezeScore: a high freeze score (≥0.75) signals an active
    // hiring halt at this company for this role — postingTrend must reflect that so the
    // +0.12 L3 delta fires in calculateLayoffScore(). Without this branch, 'frozen' was
    // never emitted and the highest-risk postingTrend adjustment was silently dead.
    const rawFreezeScore = connectorSignals.hiringFreezeScore;
    const derivedPostingTrend: 'growing' | 'stable' | 'declining' | 'frozen' =
      rawFreezeScore >= 0.75                                  ? 'frozen'
      : connectorSignals.roleDemandTrend === 'rising'         ? 'growing'
      : connectorSignals.roleDemandTrend === 'falling'        ? 'declining'
      : 'stable';
    hiringData = {
      freezeScore:     rawFreezeScore,
      postingTrend:    derivedPostingTrend,
      // Only forward counts when they came from a live job-board scrape.
      estimatedOpenings: hiringIsLive ? connectorSignals.estimatedOpenings : null,
      naukriOpenings:    hiringIsLive ? connectorSignals.naukriOpenings ?? null : null,
      linkedinOpenings:  hiringIsLive ? connectorSignals.linkedinOpenings ?? null : null,
      isLive:            hiringIsLive,
      disclosure:        hiringIsLive
        ? ''
        : 'Static heuristic baseline (Q1 2026 review). Live hiring uses direct Naukri/Indeed/LinkedIn ' +
          'scraping (no API key). This fallback activates only when all scraped sources return zero results.',
      source:   hiringIsLive ? 'supabase-osint' : 'heuristic',
      fetchedAt: connectorSignals.fetchedAt,
    };
    if (hiringIsLive) liveCount += 1;

    // RSS/HN layoff news (real network calls — count only if articles found)
    if (connectorSignals.layoffNewsCount > 0 && newsData === null) {
      newsData = {
        latestLayoffEvent: null,
        recentHeadlineCount: connectorSignals.layoffNewsCount,
        sentimentSignal: connectorSignals.newsSentimentScore,
        source: 'scraped-rss',
        fetchedAt: connectorSignals.fetchedAt,
      };
      liveCount += 1;
    }

    // ── New high-signal sources: India press, SEC EDGAR, WARN Act ─────────────
    // Each is an independent live source. We increment liveCount when the
    // source was reachable AND returned at least one company-matched signal.
    // When the source confirms a layoff event with a date, we inject it into
    // the runtime layoffNewsCache so downstream scoring picks it up via the
    // standard `layoffsLast24Months` path.

    if (connectorSignals.indiaPressReachable && connectorSignals.indiaPressLayoffCount > 0) {
      liveCount += 1;
      // Backfill newsData when no global-news source produced a hit.
      if (newsData === null) {
        newsData = {
          latestLayoffEvent: null,
          recentHeadlineCount: connectorSignals.indiaPressLayoffCount,
          sentimentSignal: connectorSignals.indiaPressSentimentScore,
          source: 'scraped-rss',
          fetchedAt: connectorSignals.fetchedAt,
        };
      }
    }

    if (connectorSignals.secEdgarReachable && connectorSignals.secEdgar8kLayoffFilings > 0) {
      liveCount += 1;
      // SEC 8-Ks are the highest-confidence layoff signal we have for US public
      // companies — material disclosure required by federal law. Surface the
      // most recent filing date as a confirmed layoff event.
      if (connectorSignals.secEdgarMostRecentFiling) {
        injectLayoffEvent({
          companyName,
          date: connectorSignals.secEdgarMostRecentFiling,
          headline: `SEC 8-K filing referencing workforce reduction (${connectorSignals.secEdgar8kLayoffFilings} match${connectorSignals.secEdgar8kLayoffFilings === 1 ? '' : 'es'})`,
          // Percent unknown from EDGAR full-text search alone — leave NaN→null.
          // Downstream layoff-recency scoring uses date primarily; pct is
          // refined by news/WARN sources when available.
          percentCut: 0,
          source: 'SEC EDGAR 8-K',
          url: 'https://efts.sec.gov/LATEST/search-index',
          affectedDepartments: [],
          // SEC 8-K is a legally required material disclosure — highest confidence.
          confidence: 0.95,
        });
        derivedLayoffEvents.push({
          date: connectorSignals.secEdgarMostRecentFiling,
          percentCut: 0,
          source: 'SEC EDGAR 8-K',
        });
      }
    }

    if (connectorSignals.warnDatasetReachable && connectorSignals.warnNoticeCount > 0) {
      liveCount += 1;
      // WARN Act notices are *legally required* layoff disclosures with hard
      // affected-employee counts. Store affectedCount so reconcileCompanySignals
      // can compute the real percentCut once employeeCount is known.
      if (connectorSignals.warnMostRecentFiling) {
        const warnAffected: number | null =
          typeof connectorSignals.warnAffectedTotal === 'number' && connectorSignals.warnAffectedTotal > 0
            ? connectorSignals.warnAffectedTotal
            : null;
        injectLayoffEvent({
          companyName,
          date: connectorSignals.warnMostRecentFiling,
          headline: `WARN Act notice (${warnAffected ?? 'count undisclosed'} workers across ${connectorSignals.warnNoticeCount} filing${connectorSignals.warnNoticeCount === 1 ? '' : 'es'})`,
          percentCut: 0,
          source: 'WARN Act',
          url: '',
          affectedDepartments: [],
          // WARN Act filings are federally required 60-day advance notices — high confidence.
          confidence: 0.90,
        });
        derivedLayoffEvents.push({
          date: connectorSignals.warnMostRecentFiling,
          percentCut: 0, // computed in reconcileCompanySignals using employeeCount
          affectedCount: warnAffected ?? undefined,
          source: 'WARN Act',
        });
      }
    }

    if (realSources.length > 0) {
      errors.push(`Connectors active: ${realSources.join(', ')}`);
    }
  } catch (e: any) {
    errors.push(`Data connectors: ${e.message}`);
  }

  // ── breaking_news_events: query the persistent breaking-news store ──────────
  // This is the primary real-time path for events detected between weekly runs.
  // Events here flow directly into derivedLayoffEvents which patchCompanyDataWithLive
  // uses to backfill layoffsLast24Months — feeding recentLayoffRisk (30% of L2),
  // NOT just newsRisk (10%). This is the difference between a ~2pt score change
  // and a ~8–15pt score change for a major breaking announcement like TCS 15k.
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: breakingRows } = await _supabase
      .from('breaking_news_events')
      .select('company_name, event_date, headline, percent_cut, affected_count, confidence, source, source_url')
      .ilike('company_name', `%${companyName}%`)
      .gte('event_date', thirtyDaysAgo.toISOString().slice(0, 10))
      .order('event_date', { ascending: false })
      .limit(5);

    if (breakingRows && breakingRows.length > 0) {
      liveCount += 1; // a breaking-news DB hit counts as a live signal
      for (const row of breakingRows as Array<{
        company_name: string; event_date: string; headline: string;
        percent_cut: number | null; affected_count: number | null;
        confidence: string; source: string; source_url: string | null;
      }>) {
        const alreadyInDerived = derivedLayoffEvents.some(e => e.date === row.event_date);
        if (!alreadyInDerived) {
          derivedLayoffEvents.push({
            date:       row.event_date,
            // Use 5% as minimum floor when percent_cut is null — aligns with
            // injectLayoffEvent default below and prevents "Undisclosed minor"
            // display in the UI (null??0 was causing severity:"minor" and
            // the "Undisclosed" label even for confirmed documented layoffs).
            percentCut: row.percent_cut ?? 5,
            source:     `breaking_news_events (${row.source})`,
          });
          // Also inject into the in-memory cache so the score engine's newsRisk fires
          injectLayoffEvent({
            companyName,
            date:                row.event_date,
            headline:            row.headline,
            percentCut:          row.percent_cut ?? 5,
            source:              row.source,
            url:                 row.source_url ?? '',
            affectedDepartments: [],
            // Forward the DB-stored confidence so KS-A evaluation uses the
            // curated value. Without this, confidence is undefined → null,
            // triggering the backward-compat KS-A path (≤14 days → floor 72)
            // for every company with a recent breaking_news_events row.
            confidence: Number(row.confidence) || 0.80,
          });
        }
      }
      errors.push(`Breaking news: ${breakingRows.length} event(s) from breaking_news_events`);
    }
  } catch (bnErr: any) {
    errors.push(`breaking_news_events query failed: ${bnErr?.message}`);
  }

  // ── Determine overall source quality ────────────────────────────────────
  const overallSource: LiveDataResult['overallSource'] =
    liveCount >= 4 ? 'full-live'
    : liveCount >= 2 ? 'partial-live'
    : !resolvedTicker ? 'unknown-company'
    : 'heuristic';

  const errorText = errors.join(' | ').toLowerCase();
  if (
    errorText.includes('yahoo') || errorText.includes('stock proxy') ||
    errorText.includes('yahoo finance') ||
    errorText.includes('no ticker') || errorText.includes('fmp')
  ) {
    degradedSignalClasses.push('financial');
  }
  if (errorText.includes('rss') || errorText.includes('breaking_news_events') || errorText.includes('layoff')) {
    degradedSignalClasses.push('layoffs');
  }
  if (!hiringData?.isLive) {
    degradedSignalClasses.push('hiring');
  }
  if (errorText.includes('circuit open') || errorText.includes('proxy-live-signals') || errorText.includes('quota exhausted') || errorText.includes('session quota')) {
    hardFailures.push(...errors.filter((msg) =>
      /circuit open|proxy-live-signals|quota exhausted|session quota/i.test(msg),
    ));
  }

  // genuineLiveApiSignals: count only signals from real external network calls this session.
  // Primary: Yahoo Finance (scraping, no key, unlimited) — counts fully as live.
  // Fallback: Alpha Vantage (API key, 25/day) — also live when it works.
  // News via any free scraped source (Google/Bing/Reddit/ET/MoneyControl/etc. RSS) = 1.
  // Hiring via Naukri/Indeed/LinkedIn/market-specific job boards (no keys) = 1.
  const stockIsLive = stockData?.source === 'yahoo-finance'
                   || stockData?.source === 'bse-india' || stockData?.source === 'nse-india';
  const newsIsLive  = newsData != null && newsData.source !== 'none';
  const genuineLiveApiSignals =
    (stockIsLive && stockData!.price90DayChange != null ? 1 : 0) +
    (stockIsLive && stockData!.revenueGrowthYoY != null ? 1 : 0) +
    (newsIsLive ? 1 : 0) +
    (hiringData?.isLive === true ? 1 : 0);

  // Await the concurrent scraping pipeline — it was launched at the top of this
  // function and has been running in parallel with all API/DB fetch steps.
  const scrapingResult = await _scrapingPipelinePromise;

  return {
    stockData,
    newsData,
    hiringData,
    overallSource,
    liveSignalCount: liveCount,
    heuristicSignalCount: heuristicCount,
    genuineLiveApiSignals,
    informativeLiveSignals: 0, // computed after patchCompanyDataWithLive in auditDataPipeline
    fetchedAt: new Date().toISOString(),
    apiErrors: errors,
    derivedLayoffEvents,
    degradedSignalClasses: Array.from(new Set(degradedSignalClasses)),
    hardFailures,
    _connectorSignals: connectorSignals,
    // Scraping enrichment: career page, Wikipedia headcount, Glassdoor — no API keys
    _scrapingResult: scrapingResult,
  };
};

const DAY_MS = 86_400_000;

const toIso = (value: string | undefined, fallback: string): string => {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
};

const computeFreshnessDays = (iso: string, now: Date): number =>
  Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / DAY_MS));

// Live API signals: < 4h = fresh, 4h–72h = degraded, > 72h = invalid
const classifyFreshness = (days: number): SignalFreshnessState => {
  const hours = days * 24;
  if (hours > 72) return 'invalid';
  if (hours > 4)  return 'degraded';
  return 'fresh';
};

// DB / heuristic signals: < 7d = fresh, 7d–30d = degraded, > 30d = invalid
const classifyDbFreshness = (days: number): SignalFreshnessState => {
  if (days > 30) return 'invalid';
  if (days > 7)  return 'degraded';
  return 'fresh';
};

const inferBaseSourceKind = (source?: string): SignalSourceKind => {
  const normalized = (source ?? '').toLowerCase();
  if (normalized.includes('fallback') || normalized.includes('unknown')) return 'heuristic';
  if (normalized.includes('user input')) return 'user_input';
  return 'db';
};

const inferSignalConfidence = (
  source: SignalSourceKind,
  freshnessState: SignalFreshnessState,
): number => {
  const base =
    source === 'live' ? 0.92
    : source === 'db' ? 0.74
    : source === 'user_input' ? 0.58
    : 0.35;
  if (freshnessState === 'fresh') return base;
  if (freshnessState === 'degraded') return Math.max(0.2, base - 0.18);
  return Math.max(0.12, base - 0.35);
};

const cloneLayoffEvents = (events: Array<{ date: string; percentCut: number; source?: string }>) =>
  events.map((event) => ({
    date: event.date,
    percentCut: event.percentCut,
    ...(event.source ? { source: event.source } : {}),
  }));

const mergeLayoffEvents = (
  existing: Array<{ date: string; percentCut: number; source?: string }>,
  incoming: Array<{ date: string; percentCut: number; source?: string }>,
) => {
  const byDate = new Map<string, { date: string; percentCut: number; source?: string }>();
  for (const event of [...existing, ...incoming]) {
    // Regulatory filings (SEC 8-K + WARN Act) frequently cover the same underlying
    // layoff event from different angles on the same date. Bucket them under a shared
    // 'regulatory' key so they don't inflate the layoffRounds count.
    const isRegulatory = /(sec edgar|warn act|regulatory)/i.test(event.source ?? '');
    const key = isRegulatory && event.percentCut === 0
      ? `${event.date.slice(0, 10)}:regulatory`
      : `${event.date.slice(0, 10)}:${event.percentCut}:${event.source ?? ''}`;

    const existing_entry = byDate.get(key);
    // When merging, prefer the entry with a higher percentCut (e.g. WARN with a
    // computed % beats an SEC entry still at 0) so severity is never silently lost.
    if (!existing_entry || event.percentCut > existing_entry.percentCut) {
      byDate.set(key, { ...event });
    }
  }
  return Array.from(byDate.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
};

const createSignal = <T>(
  key: string,
  value: T | null,
  source: SignalSourceKind,
  sourceName: string,
  observedAt: string,
  fetchedAt: string,
  now: Date,
  opts?: { seededBaseline?: boolean },
): ProvenancedSignal<T> => {
  const freshnessDays = computeFreshnessDays(observedAt, now);
  // Live API signals use tight hour-based thresholds; DB/heuristic use day-based thresholds.
  let freshnessState = source === 'live'
    ? classifyFreshness(freshnessDays)
    : classifyDbFreshness(freshnessDays);
  // R5 fix: a seeded-baseline DB signal is NEVER genuinely fresh. The recorded
  // `lastUpdated` reflects when the seeding/ingest script wrote the row — not when
  // the underlying real-world value was observed. Demote `fresh` → `degraded` so
  // chooseAuthoritativeSignal does not silently prefer it over a slightly-stale
  // live observation.
  if (opts?.seededBaseline && source === 'db' && freshnessState === 'fresh') {
    freshnessState = 'degraded';
  }
  return {
    key,
    value,
    source,
    sourceName,
    observedAt,
    fetchedAt,
    freshnessDays,
    freshnessState,
    confidence: inferSignalConfidence(source, freshnessState),
  };
};

const pushConflict = (
  conflicts: SignalConflict[],
  signalType: string,
  severity: SignalConflict['severity'],
  descriptions: string[],
  liveSignal: ProvenancedSignal<any> | null,
  dbSignal: ProvenancedSignal<any> | null,
  recommendedResolution: string,
) => {
  conflicts.push({
    signalType,
    descriptions,
    severity,
    conflictingSources: [
      ...(liveSignal
        ? [{
            source: liveSignal.sourceName,
            value: typeof liveSignal.value === 'number' ? liveSignal.value : 0,
            timestamp: liveSignal.observedAt,
          }]
        : []),
      ...(dbSignal
        ? [{
            source: dbSignal.sourceName,
            value: typeof dbSignal.value === 'number' ? dbSignal.value : 0,
            timestamp: dbSignal.observedAt,
          }]
        : []),
    ],
    recommendedResolution,
  });
};

// Audit v35: centralized seeded-baseline source-name pattern. Previously each
// site (3 in this file + 1 in createSignal opts) had its own regex; the patterns
// drifted apart and missed actual source names from the company_intelligence
// table (`verified_live_market_data`, `OSINT Database`, `live_market_data`).
// This single source of truth catches every seeded source label currently in
// the DB. Update ONCE here when adding new seeded sources.
const SEEDED_BASELINE_SOURCE_RE = /seeded|intelligence|company_intelligence|cached_company_intelligence|static|fallback|verified_live_market|verified_market|verified_data|live_market_data|osint|baseline|preseed/i;

function isSeededBaselineSource(sourceName: string | null | undefined): boolean {
  return !!sourceName && SEEDED_BASELINE_SOURCE_RE.test(sourceName);
}

const chooseAuthoritativeSignal = <T>({
  key,
  dbSignal,
  liveSignal,
  heuristicSignal,
  isMaterialConflict,
  conflictDescription,
  conflicts,
  summary,
}: {
  key: string;
  dbSignal: ProvenancedSignal<T> | null;
  liveSignal: ProvenancedSignal<T> | null;
  heuristicSignal?: ProvenancedSignal<T> | null;
  isMaterialConflict?: (dbValue: T, liveValue: T) => boolean;
  conflictDescription?: (dbValue: T, liveValue: T) => string[];
  conflicts: SignalConflict[];
  summary: ReconciliationSummary;
}): ProvenancedSignal<T> | null => {
  const liveUsable = liveSignal && liveSignal.freshnessState !== 'invalid';
  const dbUsable = dbSignal && dbSignal.freshnessState !== 'invalid';

  let chosen = dbSignal ?? heuristicSignal ?? null;

  // Audit v35: when liveSignal is null (scraper returned nothing) AND dbSignal is
  // a seeded baseline, the default `chosen = dbSignal` means the seeded value wins
  // silently with no audit trail. Log it so the TransparencyTab can surface it.
  if (!liveUsable && chosen?.source === 'db') {
    const sourceIsSeeded = isSeededBaselineSource(chosen.sourceName);
    if (sourceIsSeeded) {
      summary.dbWonKeys.push(`${key}[seeded-default-no-live]`);
    } else {
      summary.dbWonKeys.push(key);
    }
  }

  if (liveUsable) {
    if (!dbUsable) {
      chosen = liveSignal;
    } else if (liveSignal!.freshnessState === 'fresh' && dbSignal!.freshnessState !== 'fresh') {
      chosen = liveSignal;
    } else if (liveSignal!.freshnessState === 'fresh' && dbSignal!.freshnessState === 'fresh') {
      chosen = liveSignal;
      if (
        isMaterialConflict &&
        dbSignal!.value != null &&
        liveSignal!.value != null &&
        isMaterialConflict(dbSignal!.value as T, liveSignal!.value as T)
      ) {
        summary.conflictedKeys.push(key);
        liveSignal!.conflictWith = [dbSignal!.sourceName];
        pushConflict(
          conflicts,
          key,
          key === 'layoffRounds' || key === 'layoffsLast24Months' ? 'critical' : 'high',
          conflictDescription
            ? conflictDescription(dbSignal!.value as T, liveSignal!.value as T)
            : [`${key} differs materially between live and database sources.`],
          liveSignal!,
          dbSignal!,
          'Use the fresher live signal and cap confidence until the database is refreshed.',
        );
      }
    } else if (dbSignal!.freshnessState === 'fresh') {
      // Live is degraded (4-72h old) but DB appears fresh (< 7 days).
      // Exception: known seeded/baseline DB sources use an arbitrary recent timestamp
      // (e.g., the seeding run date) — they are NOT genuinely recent observations.
      // For these, prefer live over the seeded baseline regardless of DB freshness label.
      const dbIsSeededBaseline = isSeededBaselineSource(dbSignal!.sourceName);
      if (dbIsSeededBaseline) {
        // Seeded DB "fresh" timestamp reflects when the seed script ran, not when the
        // signal was observed in the real world. Live degraded beats seeded fresh.
        chosen = liveSignal;
      } else {
        // Genuinely recent DB record (scraper-written within 7 days) beats degraded live cache.
        summary.ignoredLiveKeys = [...(summary.ignoredLiveKeys ?? []), key];
      }
    } else {
      // Both degraded (7-30 days): blend at 70/30 live-weighted.
      // Live data reflects actual market conditions even when slightly stale;
      // DB may hold months-old seeded values that fall within the 30-day window.
      const lv = liveSignal!.value;
      const dv = dbSignal!.value;
      if (typeof lv === 'number' && typeof dv === 'number') {
        const blended: ProvenancedSignal<T> = {
          ...liveSignal!,
          value: (lv * 0.7 + dv * 0.3) as unknown as T,
          sourceName: `blend(live×0.7,${dbSignal!.sourceName}×0.3)`,
          confidence: Math.min(liveSignal!.confidence, dbSignal!.confidence),
          supersedes: [dbSignal!.sourceName],
        };
        chosen = blended;
      } else {
        chosen = liveSignal;
      }
    }
  }

  // WS3 — Evidence-hierarchy veto (Audit Issue #7).
  //
  // The legacy logic above prefers a fresher live source even when it is from
  // a lower-authority tier than the incumbent DB source. We now check whether
  // the chosen source would violate the evidence hierarchy: if it is two or
  // more tiers below an available alternative, the higher-tier source wins
  // regardless of freshness.
  //
  // This is gated behind `ws3_evidence_hierarchy` — when off, behaviour is
  // unchanged from the legacy freshness-only path.
  if (chosen) {
    const flag = evaluateFlagSync('ws3_evidence_hierarchy');
    if (flag.isActive || flag.isShadow) {
      // Build the candidate list for tier comparison.
      const rawCandidates: Array<{ tag: 'db' | 'live' | 'heuristic'; signal: ProvenancedSignal<T> | null }> = [
        { tag: 'db' as const,        signal: dbSignal },
        { tag: 'live' as const,      signal: liveSignal },
        { tag: 'heuristic' as const, signal: heuristicSignal ?? null },
      ];
      const candidates = rawCandidates.filter((c): c is { tag: 'db' | 'live' | 'heuristic'; signal: ProvenancedSignal<T> } => c.signal != null);

      const chosenTier = classifySourceToTier(chosen.sourceName ?? '');
      for (const c of candidates) {
        if (c.signal === chosen) continue;
        const candidateTier = classifySourceToTier(c.signal.sourceName ?? '');
        if (shouldVetoOverride(candidateTier, chosenTier)) {
          // The chosen signal is too far below the alternative on the
          // authority ladder; the alternative wins.
          summary.confidenceCapsApplied = [
            ...(summary.confidenceCapsApplied ?? []),
            `${key}[evidence-hierarchy-veto: ${chosen.sourceName}→${c.signal.sourceName}]`,
          ];
          chosen = c.signal;
          break;
        }
      }
    }
  }

  if (chosen?.source === 'live') {
    summary.liveWonKeys.push(key);
    chosen.supersedes = dbSignal ? [dbSignal.sourceName] : undefined;
  } else if (chosen?.source === 'db') {
    summary.dbWonKeys.push(key);
  }

  if (liveSignal && chosen !== liveSignal) {
    summary.ignoredLiveKeys = [...(summary.ignoredLiveKeys ?? []), key];
  }

  return chosen;
};

export const reconcileCompanySignals = (
  base: CompanyData,
  live: LiveDataResult,
  now: Date = new Date(),
): ReconciledCompanySignals => {
  const active = {
    ...base,
    layoffsLast24Months: cloneLayoffEvents(base.layoffsLast24Months ?? []),
  } as CompanyData & Record<string, any>;
  const signals: Record<string, ProvenancedSignal<any>> = {};
  const conflicts: SignalConflict[] = [];
  const summary: ReconciliationSummary = {
    liveWonKeys: [],
    dbWonKeys: [],
    conflictedKeys: [],
    degradedKeys: [],
  };
  const missingDataFallbacks = [...live.apiErrors];
  const degradedSignalClasses = Array.from(new Set(live.degradedSignalClasses ?? []));
  const hardFailures = [...(live.hardFailures ?? [])];
  const confidenceCapsApplied: string[] = [];
  let confidenceCap: number | undefined;
  let informativeLiveSignalCount = 0;
  let degradedLiveSignalCount = 0;

  const baseObservedAt = toIso(base.lastUpdated, now.toISOString());
  const baseSourceKind = inferBaseSourceKind(base.source);
  const baseSourceName = base.source || 'company_intelligence';
  // R5 fix: explicit seeded-baseline detection. The flag is set in auditDataPipeline
  // when a row comes from fetch-company-data EF / company_intelligence table / legacy
  // hardcoded DB. We also defensively pattern-match the source label so externally
  // computed CompanyData objects (tests, scripts) still benefit from demotion.
  const isSeededBaseline = (base as any)._isSeededBaseline === true
    || isSeededBaselineSource(baseSourceName);
  const dbOpts = { seededBaseline: isSeededBaseline };

  const dbStock = base.stock90DayChange != null
    ? createSignal('stock90DayChange', base.stock90DayChange, baseSourceKind, baseSourceName, baseObservedAt, baseObservedAt, now, dbOpts)
    : null;
  const liveStock = live.stockData?.price90DayChange != null
    ? createSignal('stock90DayChange', live.stockData.price90DayChange, 'live', live.stockData.source, live.stockData.fetchedAt, live.stockData.fetchedAt, now)
    : null;
  if (liveStock && liveStock.freshnessState !== 'fresh') degradedLiveSignalCount++;
  const stockSignal = chooseAuthoritativeSignal<number>({
    key: 'stock90DayChange',
    dbSignal: dbStock,
    liveSignal: liveStock,
    conflicts,
    summary,
    isMaterialConflict: (dbValue, liveValue) => Math.abs(dbValue - liveValue) >= 8,
    conflictDescription: (dbValue, liveValue) => [
      `Live stock trend (${liveValue}%) materially differs from DB stock trend (${dbValue}%).`,
    ],
  });
  if (stockSignal) {
    signals.stock90DayChange = stockSignal;
    active.stock90DayChange = stockSignal.value;
    if (stockSignal.source === 'live' && base.stock90DayChange !== stockSignal.value) informativeLiveSignalCount++;
  }

  const dbRevenue = base.revenueGrowthYoY != null
    ? createSignal('revenueGrowthYoY', base.revenueGrowthYoY, baseSourceKind, baseSourceName, baseObservedAt, baseObservedAt, now, dbOpts)
    : null;
  const liveRevenue = live.stockData?.revenueGrowthYoY != null
    ? createSignal('revenueGrowthYoY', live.stockData.revenueGrowthYoY, 'live', live.stockData.source, live.stockData.fetchedAt, live.stockData.fetchedAt, now)
    : null;
  if (liveRevenue && liveRevenue.freshnessState !== 'fresh') degradedLiveSignalCount++;
  const revenueSignal = chooseAuthoritativeSignal<number>({
    key: 'revenueGrowthYoY',
    dbSignal: dbRevenue,
    liveSignal: liveRevenue,
    conflicts,
    summary,
    isMaterialConflict: (dbValue, liveValue) => Math.abs(dbValue - liveValue) >= 5,
    conflictDescription: (dbValue, liveValue) => [
      `Live revenue growth (${liveValue}%) materially differs from DB revenue growth (${dbValue}%).`,
    ],
  });
  if (revenueSignal) {
    signals.revenueGrowthYoY = revenueSignal;
    active.revenueGrowthYoY = revenueSignal.value;
    if (revenueSignal.source === 'live' && base.revenueGrowthYoY !== revenueSignal.value) informativeLiveSignalCount++;
  }

  // Compute WARN Act percentCut from affectedCount + employeeCount when available.
  // Previously all WARN/SEC events stored percentCut=0, zeroing out L2 severity scoring.
  const baseEmployeeCount =
    base.employeeCount && base.employeeCount > 100 ? base.employeeCount : null;

  const liveLayoffEvents = mergeLayoffEvents(
    [],
    live.derivedLayoffEvents.map((event) => {
      // Recompute from affectedCount when percentCut is at the default floor (<=5)
      // and we actually have both count and headcount to derive the real %.
      const computedPct =
        event.percentCut <= 5 &&
        typeof event.affectedCount === 'number' &&
        event.affectedCount > 0 &&
        baseEmployeeCount
          ? Math.round((event.affectedCount / baseEmployeeCount) * 1000) / 10
          : event.percentCut;
      return {
        date: event.date,
        percentCut: computedPct,
        source: event.source,
      };
    }),
  );
  const dbLayoffEvents = createSignal(
    'layoffsLast24Months',
    cloneLayoffEvents(base.layoffsLast24Months ?? []),
    baseSourceKind,
    baseSourceName,
    baseObservedAt,
    baseObservedAt,
    now,
    dbOpts,
  );
  const liveLayoffSignal = liveLayoffEvents.length > 0
    ? createSignal('layoffsLast24Months', liveLayoffEvents, 'live', 'regulatory/news live signals', live.fetchedAt, live.fetchedAt, now)
    : null;
  if (liveLayoffSignal && liveLayoffSignal.freshnessState !== 'fresh') degradedLiveSignalCount++;

  if (liveLayoffEvents.length > 0 && (base.layoffsLast24Months?.length ?? 0) === 0) {
    summary.conflictedKeys.push('layoffsLast24Months');
    pushConflict(
      conflicts,
      'layoffsLast24Months',
      'critical',
      ['Live layoff events were detected but the database shows a clean layoff history.'],
      liveLayoffSignal,
      dbLayoffEvents,
      'Use the confirmed live event immediately and refresh the persisted layoff history.',
    );
  }

  const layoffEventsSignal = chooseAuthoritativeSignal<Array<{ date: string; percentCut: number; source?: string }>>({
    key: 'layoffsLast24Months',
    dbSignal: dbLayoffEvents,
    liveSignal: liveLayoffSignal,
    conflicts,
    summary,
    isMaterialConflict: (dbValue, liveValue) => {
      const dbCount = Array.isArray(dbValue) ? dbValue.length : 0;
      const liveCount = Array.isArray(liveValue) ? liveValue.length : 0;
      return dbCount !== liveCount;
    },
    conflictDescription: (dbValue, liveValue) => [
      `Live layoff event count (${Array.isArray(liveValue) ? liveValue.length : 0}) differs from DB layoff event count (${Array.isArray(dbValue) ? dbValue.length : 0}).`,
    ],
  });
  if (layoffEventsSignal) {
    const mergedEvents =
      layoffEventsSignal.source === 'live'
        ? mergeLayoffEvents(base.layoffsLast24Months ?? [], layoffEventsSignal.value ?? [])
        : layoffEventsSignal.value ?? [];
    signals.layoffsLast24Months = {
      ...layoffEventsSignal,
      value: mergedEvents,
    };
    active.layoffsLast24Months = cloneLayoffEvents(mergedEvents);
    if (layoffEventsSignal.source === 'live' && liveLayoffEvents.length > 0) informativeLiveSignalCount++;
  }

  const liveLayoffRoundsValue = liveLayoffEvents.length > 0 ? liveLayoffEvents.length : null;
  const dbLayoffRounds = createSignal('layoffRounds', base.layoffRounds ?? 0, baseSourceKind, baseSourceName, baseObservedAt, baseObservedAt, now, dbOpts);
  const liveLayoffRounds = liveLayoffRoundsValue != null
    ? createSignal('layoffRounds', liveLayoffRoundsValue, 'live', 'regulatory/news live signals', live.fetchedAt, live.fetchedAt, now)
    : null;
  const layoffRoundsSignal = chooseAuthoritativeSignal<number>({
    key: 'layoffRounds',
    dbSignal: dbLayoffRounds,
    liveSignal: liveLayoffRounds,
    conflicts,
    summary,
    isMaterialConflict: (dbValue, liveValue) => dbValue !== liveValue,
    conflictDescription: (dbValue, liveValue) => [
      `Live layoff rounds (${liveValue}) disagree with DB layoff rounds (${dbValue}).`,
    ],
  });
  if (layoffRoundsSignal) {
    signals.layoffRounds = layoffRoundsSignal;
    active.layoffRounds =
      layoffRoundsSignal.source === 'live'
        ? Math.max(
            layoffRoundsSignal.value ?? 0,
            active.layoffsLast24Months?.length ?? 0,
            base.layoffRounds ?? 0,
          )
        : layoffRoundsSignal.value ?? 0;
  }

  const liveLastLayoffPercentValue = liveLayoffEvents
    .map((event) => event.percentCut)
    .filter((value) => typeof value === 'number' && value > 0)
    .sort((a, b) => b - a)[0] ?? null;
  const dbLastLayoffPercent = base.lastLayoffPercent != null
    ? createSignal('lastLayoffPercent', base.lastLayoffPercent, baseSourceKind, baseSourceName, baseObservedAt, baseObservedAt, now, dbOpts)
    : null;
  const liveLastLayoffPercent = liveLastLayoffPercentValue != null
    ? createSignal('lastLayoffPercent', liveLastLayoffPercentValue, 'live', 'regulatory/news live signals', live.fetchedAt, live.fetchedAt, now)
    : null;
  const lastLayoffPercentSignal = chooseAuthoritativeSignal<number>({
    key: 'lastLayoffPercent',
    dbSignal: dbLastLayoffPercent,
    liveSignal: liveLastLayoffPercent,
    conflicts,
    summary,
    isMaterialConflict: (dbValue, liveValue) => Math.abs(dbValue - liveValue) >= 3,
    conflictDescription: (dbValue, liveValue) => [
      `Live layoff severity (${liveValue}%) differs materially from DB severity (${dbValue}%).`,
    ],
  });
  if (lastLayoffPercentSignal) {
    signals.lastLayoffPercent = lastLayoffPercentSignal;
    active.lastLayoffPercent = lastLayoffPercentSignal.value;
  }

  // Live employee count from Yahoo Finance fullTimeEmployees — always preferred over
  // the DB value because the DB often has stale or size-bucket defaults (e.g. 1000).
  const liveEmployeeCount = live.stockData?.employeeCount ?? null;
  const employeeSignal = createSignal(
    'employeeCount',
    liveEmployeeCount != null ? liveEmployeeCount : base.employeeCount,
    liveEmployeeCount != null ? 'live' : baseSourceKind,
    liveEmployeeCount != null ? live.stockData!.source : baseSourceName,
    liveEmployeeCount != null ? live.stockData!.fetchedAt : baseObservedAt,
    liveEmployeeCount != null ? live.stockData!.fetchedAt : baseObservedAt,
    now,
    liveEmployeeCount != null ? undefined : dbOpts,
  );
  if (liveEmployeeCount != null) {
    active.employeeCount = liveEmployeeCount;
    if (liveEmployeeCount !== base.employeeCount) {
      informativeLiveSignalCount++;
      summary.liveWonKeys.push('employeeCount');
    }
  }
  signals.employeeCount = employeeSignal;

  const revenuePerEmployeeSignal = createSignal(
    'revenuePerEmployee',
    base.revenuePerEmployee,
    baseSourceKind,
    baseSourceName,
    baseObservedAt,
    baseObservedAt,
    now,
    dbOpts,
  );
  signals.revenuePerEmployee = revenuePerEmployeeSignal;

  const aiInvestmentSignal = createSignal(
    'aiInvestmentSignal',
    base.aiInvestmentSignal,
    baseSourceKind,
    baseSourceName,
    baseObservedAt,
    baseObservedAt,
    now,
    dbOpts,
  );
  signals.aiInvestmentSignal = aiInvestmentSignal;

  const dbHiringTrend = active._hiringPostingTrend
    ? createSignal('hiringTrend', active._hiringPostingTrend, inferBaseSourceKind(active._hiringSource), active._hiringSource ?? baseSourceName, baseObservedAt, baseObservedAt, now, dbOpts)
    : null;
  const liveHiringTrend = live.hiringData?.postingTrend && live.hiringData.postingTrend !== 'unknown'
    ? createSignal('hiringTrend', live.hiringData.postingTrend, live.hiringData.isLive ? 'live' : 'heuristic', live.hiringData.source, live.hiringData.fetchedAt, live.hiringData.fetchedAt, now)
    : null;
  if (liveHiringTrend && liveHiringTrend.freshnessState !== 'fresh' && liveHiringTrend.source === 'live') degradedLiveSignalCount++;
  const hiringSignal = chooseAuthoritativeSignal<string>({
    key: 'hiringTrend',
    dbSignal: dbHiringTrend,
    liveSignal: liveHiringTrend?.source === 'live' ? liveHiringTrend : null,
    heuristicSignal: liveHiringTrend?.source === 'heuristic' ? liveHiringTrend : null,
    conflicts,
    summary,
    isMaterialConflict: (dbValue, liveValue) => dbValue !== liveValue,
    conflictDescription: (dbValue, liveValue) => [
      `Live hiring trend (${liveValue}) disagrees with DB hiring trend (${dbValue}).`,
    ],
  });
  if (hiringSignal) {
    signals.hiringTrend = hiringSignal;
    active._hiringPostingTrend = hiringSignal.value;
  }

  if (live.hiringData?.freezeScore != null) active._hiringFreezeScore = live.hiringData.freezeScore;
  if (live.hiringData) {
    active._hiringSource = live.hiringData.source;
    active._hiringIsLive = live.hiringData.isLive;
    active._hiringDisclosure = live.hiringData.disclosure;
    active._estimatedRoleOpenings = live.hiringData.estimatedOpenings;
    active._naukriOpenings = live.hiringData.naukriOpenings;
    active._linkedinOpenings = live.hiringData.linkedinOpenings;
    // Signal-level timestamp for per-signal decay in the scoring engine.
    // The engine must decay hiring_posting_trend from this date, not from
    // the global companyData.lastUpdated which reflects the DB row age.
    active._hiringFetchedAt = live.hiringData.fetchedAt;
    if (live.hiringData.isLive && live.hiringData.estimatedOpenings != null) informativeLiveSignalCount++;
  }

  if (live.newsData) {
    active._liveNewsChecked = true;
    active._liveNewsSentiment = live.newsData.sentimentSignal;
    // News signal timestamp for per-signal decay. breaking_news_layoff has a
    // 3-day half-life — the engine must use the actual news fetch date, not DB lastUpdated.
    active._newsFetchedAt = live.newsData.fetchedAt;
    // Date of the most recent layoff event (event date, not fetch date).
    // Used for breaking_news_layoff decay — the event date is more accurate than the fetch date.
    if (live.newsData.latestLayoffEvent?.date) {
      active._latestLayoffEventDate = live.newsData.latestLayoffEvent.date;
    }
  }

  // Stock signal timestamp for per-signal decay. stock_90d_change has 7-day
  // half-life — use fetch date so a 6-hour-old Yahoo Finance quote decays correctly
  // rather than inheriting the potentially weeks-old DB lastUpdated.
  if (live.stockData) {
    active._stockFetchedAt = live.stockData.fetchedAt;
    // Revenue growth YoY timestamp: revenue figures are quarterly, but the
    // fetch date (from the same stock API call) is the best available proxy.
    active._revenueGrowthFetchedAt = live.stockData.fetchedAt;
    // marketCap and peRatio are UI-only display fields — not scored by the engine.
    // They come from Yahoo Finance (US) or BSE (India) and are propagated here
    // so FinancialHealthCard / CompanyProfileTab can display them.
    if (live.stockData.marketCap != null) active.marketCap = live.stockData.marketCap;
    if (live.stockData.peRatio   != null) active.peRatio   = live.stockData.peRatio;
  }

  const intendedLiveClasses = [
    ...(base.isPublic ? ['financial'] : []),
    'layoffs',
    'hiring',
  ];
  const degradedSet = new Set(degradedSignalClasses);

  if (base.isPublic && !live.stockData) {
    degradedSet.add('financial');
    missingDataFallbacks.push('⚠ Yahoo Finance unavailable for this public company — L1 confidence reduced and DB/heuristic values may remain active.');
  }
  if (!live.newsData && live.derivedLayoffEvents.length === 0) {
    degradedSet.add('layoffs');
    missingDataFallbacks.push('⚠ Live layoff/news sources unavailable — L2 may understate recent workforce reductions.');
  }
  if (!live.hiringData?.isLive) {
    degradedSet.add('hiring');
    missingDataFallbacks.push('Hiring trend is heuristic-only — live job-posting signals were not available for this audit.');
  } else if (live.hiringData.postingTrend === 'frozen') {
    // Surface the freeze explicitly so it appears in the Transparency tab
    // alongside the engine's own postingFallbacks log entry.
    missingDataFallbacks.push(
      `Live Naukri signal: hiring FROZEN for this role at this company ` +
      `(freezeScore=${(live.hiringData.freezeScore ?? 0).toFixed(2)}, estimatedOpenings=${live.hiringData.estimatedOpenings ?? 0}). ` +
      `L3 increased by +0.12 (mechanical score effect).`,
    );
  }

  for (const key of degradedSet) {
    if (!summary.degradedKeys.includes(key)) summary.degradedKeys.push(key);
  }

  const failedClassRatio = intendedLiveClasses.length > 0
    ? intendedLiveClasses.filter((key) => degradedSet.has(key)).length / intendedLiveClasses.length
    : 0;

  const criticalFinancialGap =
    base.isPublic &&
    !stockSignal &&
    !revenueSignal;
  if (criticalFinancialGap) {
    // WS9 — cap value now comes from a versioned constant (provenance='manual_seed',
    // bootstrap 0.35 if the DB row is missing). WS10 — the cap event is recorded
    // in layer_fallback_log so SLO dashboards can detect a sudden rise in
    // critical-financial-gap audits (Alpha Vantage outage, ticker resolution bug, …).
    const cap = getConstant<number>('liveDataService.confidenceCap.criticalFinancialGap', 0.35);
    confidenceCap = typeof cap.value === 'number' ? cap.value : 0.35;
    confidenceCapsApplied.push(`Critical live financial signal failure with no direct substitute. Confidence capped at ${Math.round(confidenceCap * 100)}%.`);
    hardFailures.push('Critical financial live signals unavailable for a public company and no direct DB substitute exists.');
    markFallback({
      layerId: 'liveDataService.criticalFinancialGap',
      reason: 'null_input',
      fallbackValue: confidenceCap,
      layerKind: 'intelligence_layer',
      companyCanonical: base.name ?? null,
      rationale: `cap=${confidenceCap} (provenance=${cap.provenance}, key=${cap.key})`,
    });
  } else if (failedClassRatio > 0.4) {
    const cap = getConstant<number>('liveDataService.confidenceCap.failedClassRatio', 0.55);
    confidenceCap = typeof cap.value === 'number' ? cap.value : 0.55;
    confidenceCapsApplied.push(`More than 40% of intended live signal classes failed. Confidence capped at ${Math.round(confidenceCap * 100)}%.`);
    markFallback({
      layerId: 'liveDataService.failedClassRatio',
      reason: 'null_input',
      fallbackValue: confidenceCap,
      layerKind: 'intelligence_layer',
      companyCanonical: base.name ?? null,
      rationale: `cap=${confidenceCap}, failedClassRatio=${failedClassRatio.toFixed(2)} (provenance=${cap.provenance})`,
    });
  }

  const newestChosenAt = Object.values(signals)
    .map((signal) => signal.fetchedAt)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
  if (newestChosenAt) {
    active.lastUpdated = newestChosenAt.slice(0, 10);
  }
  active.source =
    summary.liveWonKeys.length > 0
      ? `${base.source || 'company_intelligence'} + Live Reconciled`
      : base.source;
  // R13 fix: split into _liveFreshnessScore (live-only) and _dbFreshnessScore (DB-only).
  // The previous combined score blended `liveWonRatio` (live-vs-DB wins) with the live
  // freshness ratio, which let a "fresh" seeded DB inflate the score past the Tier 0 cap.
  // Downstream consumers now use the live-only score for the Tier gate so confidence is
  // capped strictly by what the live pipeline produced.
  //
  // Definitions:
  //   liveFreshnessScore = (fresh live signals) / (total signal slots)
  //     → 1.0 means every signal was live AND fresh; 0.0 means nothing live landed.
  //   dbFreshnessScore   = (live-won keys + fresh-DB keys) / (total signal slots)
  //     → broader metric kept for UI badges and DataFreshnessPanel.
  //   _dataFreshnessScore (legacy alias) = liveFreshnessScore (the strict measure)
  const allSignals = Object.values(signals);
  const totalSignals = allSignals.length;
  const freshLiveCount = allSignals.filter(
    s => s.source === 'live' && s.freshnessState === 'fresh',
  ).length;
  const freshDbCount = allSignals.filter(
    s => s.source === 'db' && s.freshnessState === 'fresh',
  ).length;
  const liveWonRatio = totalSignals > 0 ? summary.liveWonKeys.length / totalSignals : 0;

  const liveFreshnessScore = totalSignals > 0
    ? Math.round((freshLiveCount / totalSignals) * 100) / 100
    : 0;
  const dbFreshnessScore = totalSignals > 0
    ? Math.round(((freshDbCount + summary.liveWonKeys.length) / totalSignals) * 100) / 100
    : 0;
  const combinedFreshnessScore = totalSignals > 0
    ? Math.round(((freshLiveCount / totalSignals) * 0.7 + liveWonRatio * 0.3) * 100) / 100
    : 0;

  active._informativeLiveSignals = informativeLiveSignalCount;
  active._authoritativeSignals = signals;
  active._reconciliationSummary = summary;
  active._confidenceCap = confidenceCap;
  active._confidenceCapsApplied = confidenceCapsApplied;
  active._hardFailures = hardFailures;
  active._degradedSignalClasses = Array.from(degradedSet);
  // STRICT freshness metric — used by the Tier gate in hybridConsensusBuilder.
  active._liveFreshnessScore = liveFreshnessScore;
  // Broader metric — used by UI freshness badges + DataFreshnessPanel.
  active._dbFreshnessScore   = dbFreshnessScore;
  // Backwards-compatible alias: now equals the strict live score so the existing
  // Tier 0 cap (≤ 0.15 → 30%) fires correctly on DB-dominated audits.
  active._dataFreshnessScore = liveFreshnessScore;
  // Preserve the legacy combined score for callers that explicitly want the blend.
  active._combinedFreshnessScore = combinedFreshnessScore;

  summary.confidenceCapsApplied = confidenceCapsApplied;
  summary.hardFailures = hardFailures;

  return {
    active,
    signals,
    conflicts,
    liveSignalCount: live.liveSignalCount,
    informativeLiveSignalCount,
    degradedLiveSignalCount,
    degradedSignalClasses: Array.from(degradedSet),
    hardFailures,
    missingDataFallbacks: Array.from(new Set(missingDataFallbacks)),
    confidenceCap,
    confidenceCapsApplied,
    summary,
  };
};

/**
 * Legacy compatibility shim.
 * Prefer `reconcileCompanySignals()` for authoritative live-vs-db resolution.
 */
export const patchCompanyDataWithLive = (
  base: Record<string, any>,
  live: LiveDataResult,
): { patched: Record<string, any>; informativeLiveSignals: number } => {
  const reconciled = reconcileCompanySignals(base as CompanyData, live);
  return {
    patched: reconciled.active as Record<string, any>,
    informativeLiveSignals: reconciled.informativeLiveSignalCount,
  };
};
