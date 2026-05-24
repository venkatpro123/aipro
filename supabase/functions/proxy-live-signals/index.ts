// proxy-live-signals/index.ts
// SCRAPING-FIRST server-side proxy. Zero paid API keys required.
//
// PRIORITY HIERARCHY:
//   Stock:   1. Yahoo Finance chart + summary (no key, unlimited)
//
//   News:    1. Google News RSS      (no key, unlimited)
//            2. Bing News RSS        (no key, unlimited)
//            3. Yahoo Finance RSS    (no key, ticker-targeted)
//            4. Reddit JSON          (no key, unlimited)
//            5. Economic Times RSS   (no key, server-side direct)
//            6. MoneyControl RSS     (no key, server-side direct)
//            7. Business Standard RSS(no key, server-side direct)
//            8. LiveMint RSS         (no key, server-side direct)
//            9. Financial Express RSS(no key, server-side direct)
//           10. Inc42 RSS            (no key, India startup press)
//           11. Reuters Business RSS (no key, global)
//           12. TechInAsia RSS       (no key, APAC)
//
//   Hiring:  1. Naukri internal JSON API (no key, scraped)
//            2. Indeed (per-market, no key, scraped)
//            3. LinkedIn public (no key, scraped)
//            4. 20+ region-specific job boards (no key, scraped)
//
// No paid API keys needed. All sources are free/unlimited.
// Previously had Alpha Vantage (25/day), NewsAPI (100/day), Serper (paid) — all removed.

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (d: unknown, status = 200) =>
  new Response(JSON.stringify(d), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

// Auth gate: validate the Supabase JWT without requiring a full user session.
//
// Why not auth.getUser():
//   auth.getUser() only works for authenticated (logged-in) users.
//   When the app is used without an account, supabase.functions.invoke()
//   sends the project's anon key as the Bearer token. auth.getUser() returns
//   null for the anon key → 401 → circuit breaker trips → stale data banner.
//
// New approach: decode the JWT and verify:
//   1. Has a valid Supabase-format Bearer token (not malformed)
//   2. Not expired
//   3. Issued by this Supabase project (iss = SUPABASE_URL/auth/v1)
//   4. Role is anon OR authenticated OR service_role (all valid callers)
//
// This accepts logged-in users, anonymous users, and server-side callers
// while still blocking external callers who don't have a valid project JWT.
// The Supabase gateway also validates the apikey header before the EF runs,
// providing an additional layer of protection.
function requireAuth(req: Request): Response | null {
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return json({ error: 'Missing Authorization header' }, 401);
  }

  const token = authHeader.slice(7);
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return json({ error: 'Invalid JWT' }, 401);

    // Decode payload (base64url → JSON) — no signature verification needed;
    // Supabase gateway already validated the apikey + JWT integrity.
    const pad = (s: string) => s + '=='.slice(0, (4 - s.length % 4) % 4);
    const payload = JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(atob(pad(parts[1].replace(/-/g, '+').replace(/_/g, '/'))), c => c.charCodeAt(0))
      )
    );

    // Reject expired tokens
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return json({ error: 'Token expired' }, 401);
    }

    // Issuer check — two valid formats exist:
    //   • Supabase project API keys (anon, service_role): iss = "supabase"
    //   • User session JWTs (after sign-in):              iss = SUPABASE_URL + "/auth/v1"
    // Checking only the full URL form would reject every anon-key call
    // (since anon keys always have iss: "supabase").
    const projectIss = (Deno.env.get('SUPABASE_URL') ?? '') + '/auth/v1';
    const validIssuers = ['supabase', projectIss];
    if (payload.iss && !validIssuers.includes(payload.iss)) {
      return json({ error: 'Invalid token issuer' }, 401);
    }

    // Accept anon, authenticated, and service_role from this project
    const validRoles = ['anon', 'authenticated', 'service_role'];
    if (!validRoles.includes(payload.role ?? '')) {
      return json({ error: 'Insufficient role' }, 403);
    }

    return null; // auth passed
  } catch {
    return json({ error: 'Auth check failed' }, 401);
  }
}

// ── company_live_cache write-back ─────────────────────────────────────────────
// After collecting live data the EF upserts into company_live_cache so a
// second same-day audit reads from the DB instead of re-scraping.
// valid_until = midnight UTC of the current day (data expires daily).

function midnightUTC(): string {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0); // next midnight = end of today
  return d.toISOString();
}

async function writeLiveCache(
  companyName: string,
  market: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return;

  try {
    const row = {
      company_name: companyName.toLowerCase(),
      market,
      valid_until:  midnightUTC(),
      fetched_at:   new Date().toISOString(),
      ...payload,
    };
    // on_conflict required by PostgREST v11+ for upsert (merge-duplicates alone is not enough)
    await fetch(`${supabaseUrl}/rest/v1/company_live_cache?on_conflict=company_name,market`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':         serviceKey,
        'Authorization':  `Bearer ${serviceKey}`,
        'Prefer':         'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(row),
      signal: AbortSignal.timeout(4_000),
    });
  } catch { /* fire-and-forget — cache failure must not break the live response */ }
}

// Rotating user agents for scraping — reduces bot fingerprinting
const USER_AGENTS = [
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
];
const UA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

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

// ── 1a. SEC EDGAR — free US government financial API (no key, no bot blocking) ─
//
// Coverage: all US exchange filers (10-K annual reports).
// Does NOT cover foreign private issuers that file only 20-F (e.g. TCS.NS).
// Indian ADRs like INFY file annual reports (20-F) and may appear in the ticker
// map but with different GAAP labels — we gracefully return null if no data found.
//
// Endpoints used:
//   company_tickers.json          — full ticker→CIK map (~1MB, cached 24h)
//   companyconcept/CIK{n}/…json   — per-concept financial facts (~50-200KB each)

const SEC_UA = 'HumanProof/1.0 noreply@humanproof.ai'; // required by SEC fair-access policy

// Module-scoped CIK cache — persists across requests within the same EF instance.
let _secCikCache: Map<string, string> | null = null;
let _secCikCacheAt = 0;

async function getSecCik(rawTicker: string): Promise<string | null> {
  // Strip exchange suffixes (.NS, .BO, .L, .PA etc.) — SEC only indexes US tickers
  const ticker = rawTicker.replace(/\.[A-Z]{1,3}$/, '').toUpperCase();
  if (!ticker) return null;

  if (!_secCikCache || Date.now() - _secCikCacheAt > 86_400_000) {
    try {
      const res = await fetch('https://www.sec.gov/files/company_tickers.json', {
        headers: { 'User-Agent': SEC_UA },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) return null;
      const raw = await res.json() as Record<string, { cik_str: number; ticker: string }>;
      const map = new Map<string, string>();
      for (const v of Object.values(raw)) {
        map.set(v.ticker.toUpperCase(), String(v.cik_str).padStart(10, '0'));
      }
      _secCikCache = map;
      _secCikCacheAt = Date.now();
    } catch { return null; }
  }

  return _secCikCache?.get(ticker) ?? null;
}

async function fetchSecEdgarFinancials(
  rawTicker: string,
  currentPrice: number | null,
): Promise<{ revenueGrowthYoY: number | null; marketCap: number | null; peRatio: number | null; employeeCount: number | null } | null> {
  const cik = await getSecCik(rawTicker);
  if (!cik) return null;

  const base = `https://data.sec.gov/api/xbrl/companyconcept/CIK${cik}/us-gaap`;
  const hdrs = { 'User-Agent': SEC_UA, Accept: 'application/json' };
  const t = (ms: number) => AbortSignal.timeout(ms);

  // EntityNumberOfEmployees is in the DEI (document/entity info) namespace
  const deiBase = `https://data.sec.gov/api/xbrl/companyconcept/CIK${cik}/dei`;

  // Fetch all concepts concurrently — no serial dependency between them.
  // Revenue has three common labels across US GAAP filers; try all in parallel.
  const [revA, revB, revC, sharesRes, epsRes, empRes] = await Promise.allSettled([
    fetch(`${base}/Revenues.json`,                                                        { headers: hdrs, signal: t(9_000) }).then(r => r.ok ? r.json() : null),
    fetch(`${base}/RevenueFromContractWithCustomerExcludingAssessedTax.json`,             { headers: hdrs, signal: t(9_000) }).then(r => r.ok ? r.json() : null),
    fetch(`${base}/SalesRevenueNet.json`,                                                 { headers: hdrs, signal: t(9_000) }).then(r => r.ok ? r.json() : null),
    fetch(`${base}/CommonStockSharesOutstanding.json`,                                    { headers: hdrs, signal: t(9_000) }).then(r => r.ok ? r.json() : null),
    fetch(`${base}/EarningsPerShareDiluted.json`,                                         { headers: hdrs, signal: t(9_000) }).then(r => r.ok ? r.json() : null),
    fetch(`${deiBase}/EntityNumberOfEmployees.json`,                                      { headers: hdrs, signal: t(9_000) }).then(r => r.ok ? r.json() : null),
  ]);

  // Revenue growth YoY: try all three revenue concepts, take the one with the highest
  // latest value (largest revenue = most complete/authoritative concept for this filer).
  // Cap at ±60% to reject ASC-606 transition-year anomalies (e.g. Microsoft FY2018 restatement).
  let revenueGrowthYoY: number | null = null;
  let bestRevLatest = 0;
  for (const settled of [revA, revB, revC]) {
    if (settled.status !== 'fulfilled' || !settled.value) continue;
    const entries: Array<{ end: string; val: number; fp: string; form: string }> =
      settled.value?.units?.USD ?? [];
    const annual = entries
      .filter(e => e.form === '10-K' && e.fp === 'FY')
      .sort((a, b) => a.end.localeCompare(b.end));
    if (annual.length >= 2) {
      const latest = annual[annual.length - 1].val;
      const prior  = annual[annual.length - 2].val;
      if (prior > 0 && latest > bestRevLatest) {
        const pct = Math.round(((latest - prior) / prior) * 100);
        if (pct >= -60 && pct <= 60) { // sanity gate: ignore restatement/transition anomalies
          revenueGrowthYoY = pct;
          bestRevLatest = latest;
        }
      }
    }
  }

  // Market cap = most recent shares outstanding × current price (from Yahoo chart)
  let marketCap: number | null = null;
  if (sharesRes.status === 'fulfilled' && sharesRes.value && currentPrice && currentPrice > 0) {
    const shareEntries: Array<{ end: string; val: number; form: string }> =
      sharesRes.value?.units?.shares ?? [];
    const latest = shareEntries
      .filter(e => (e.form === '10-K' || e.form === '10-Q') && e.val > 0)
      .sort((a, b) => a.end.localeCompare(b.end))
      .at(-1);
    if (latest) marketCap = currentPrice * latest.val;
  }

  // P/E = current price ÷ latest annual diluted EPS (EarningsPerShareDiluted)
  let peRatio: number | null = null;
  if (epsRes.status === 'fulfilled' && epsRes.value && currentPrice && currentPrice > 0) {
    const epsEntries: Array<{ end: string; val: number; fp: string; form: string }> =
      epsRes.value?.units?.['USD/shares'] ?? [];
    const latestEps = epsEntries
      .filter(e => e.form === '10-K' && e.fp === 'FY' && e.val > 0)
      .sort((a, b) => a.end.localeCompare(b.end))
      .at(-1);
    if (latestEps) peRatio = Math.round((currentPrice / latestEps.val) * 10) / 10;
  }

  // Employee count from DEI EntityNumberOfEmployees (annual 10-K / 20-F)
  let employeeCount: number | null = null;
  if (empRes.status === 'fulfilled' && empRes.value) {
    const empEntries: Array<{ end: string; val: number; form: string }> =
      empRes.value?.units?.pure ?? empRes.value?.units?.employees ?? [];
    const latestEmp = empEntries
      .filter(e => (e.form === '10-K' || e.form === '20-F') && e.val > 0)
      .sort((a, b) => a.end.localeCompare(b.end))
      .at(-1);
    if (latestEmp) employeeCount = latestEmp.val;
  }

  if (revenueGrowthYoY === null && marketCap === null && peRatio === null && employeeCount === null) return null;
  return { revenueGrowthYoY, marketCap, peRatio, employeeCount };
}

// ── 1b. Finnhub — free API, 60 calls/min, global exchange coverage ────────────
//
// Covers NSE/BSE (Indian stocks), all major global exchanges.
// Free tier: 60 API calls/minute, no credit card required.
// Used as fallback after Yahoo quoteSummary fails (blocked from Deno Deploy IPs).
// Set FINNHUB_API_KEY in EF secrets.

async function fetchFinnhubProfile(
  ticker: string,
): Promise<{ employees: number | null; marketCap: number | null; industry: string | null; weburl: string | null } | null> {
  const key = Deno.env.get('FINNHUB_API_KEY');
  if (!key) return null;
  // Finnhub uses bare ticker (strip exchange suffix for Indian stocks NSE uses same symbol)
  const sym = ticker.replace(/\.(NS|BO|L|SI|HK|AX|TO|PA|DE|MI|MC)$/i, '');
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(sym)}&token=${key}`,
      { headers: { 'User-Agent': UA() }, signal: AbortSignal.timeout(6_000) },
    );
    if (!res.ok) return null;
    const d = await res.json();
    if (!d?.name) return null;
    // Finnhub returns marketCapitalization in millions of the local currency.
    // INR stocks (NSE/BSE) return INR millions — convert to USD using ~83 rate.
    // USD stocks return USD millions directly.
    const mcRaw = typeof d.marketCapitalization === 'number' && d.marketCapitalization > 0
      ? d.marketCapitalization : null;
    const isInr = typeof d.currency === 'string' && d.currency.toUpperCase() === 'INR';
    const mcUsd = mcRaw !== null
      ? Math.round(mcRaw * 1_000_000 * (isInr ? 1 / 83 : 1))
      : null;
    return {
      employees:  typeof d.employeeTotal === 'number' && d.employeeTotal > 0 ? d.employeeTotal : null,
      marketCap:  mcUsd,
      industry:   d.finnhubIndustry ?? null,
      weburl:     d.weburl ?? null,
    };
  } catch { return null; }
}

async function fetchFinnhubBasicFinancials(
  ticker: string,
): Promise<{ peRatio: number | null; revenueGrowthYoY: number | null } | null> {
  const key = Deno.env.get('FINNHUB_API_KEY');
  if (!key) return null;
  const sym = ticker.replace(/\.(NS|BO|L|SI|HK|AX|TO|PA|DE|MI|MC)$/i, '');
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(sym)}&metric=all&token=${key}`,
      { headers: { 'User-Agent': UA() }, signal: AbortSignal.timeout(6_000) },
    );
    if (!res.ok) return null;
    const d = await res.json();
    const m = d?.metric;
    if (!m) return null;
    const pe  = typeof m.peNormalizedAnnual === 'number' && isFinite(m.peNormalizedAnnual) && m.peNormalizedAnnual > 0
      ? Math.round(m.peNormalizedAnnual * 10) / 10 : null;
    // Finnhub returns revenueGrowthTTMYoy already as a percentage (e.g. 9.61 = 9.61%)
    const rg  = typeof m.revenueGrowthTTMYoy === 'number' && isFinite(m.revenueGrowthTTMYoy)
      ? Math.round(m.revenueGrowthTTMYoy * 10) / 10 : null;
    return { peRatio: pe, revenueGrowthYoY: rg };
  } catch { return null; }
}

// ── 1. STOCK — Yahoo Finance (primary, no API key) ────────────────────────────
//
// Yahoo Finance API auth (since 2024):
//   v8/finance/chart and v10/finance/quoteSummary require a crumb token + session
//   cookie obtained from fc.yahoo.com. Without them the APIs return 401/403.
//   We fetch the crumb once per EF cold-start and cache it in module scope.
//   The crumb is valid for ~24h per Yahoo session.

interface StockResult {
  price90DayChange:  number | null;
  revenueGrowthYoY:  number | null;
  marketCap:         number | null;
  peRatio:           number | null;
  employeeCount:     number | null;
  source:            'yahoo-finance' | 'yahoo-finance+sec-edgar' | 'yahoo-finance+finnhub' | 'finnhub';
  errors:            string[];
  rateLimited:       boolean;
}

// Module-scoped crumb cache — persists across requests within the same EF instance.
let _yahooCrumbCache: { crumb: string; cookie: string; fetchedAt: number } | null = null;

async function getYahooCrumb(): Promise<{ crumb: string; cookie: string } | null> {
  // Reuse if fetched within the last 23 hours (Yahoo session lifetime)
  if (_yahooCrumbCache && Date.now() - _yahooCrumbCache.fetchedAt < 82_800_000) {
    return { crumb: _yahooCrumbCache.crumb, cookie: _yahooCrumbCache.cookie };
  }
  try {
    const ua = UA();
    // Step 1: obtain a Yahoo Finance session cookie from their consent/cookie gate
    const fcRes = await fetch('https://fc.yahoo.com', {
      headers: { 'User-Agent': ua, 'Accept': 'text/html,application/xhtml+xml' },
      redirect: 'follow',
      signal: AbortSignal.timeout(5_000),
    });
    const rawCookie = fcRes.headers.get('set-cookie') ?? '';
    // Take only the key=value part (before first semicolon) to avoid sending Path/Domain
    const cookie = rawCookie.split(';')[0]?.trim() ?? '';
    if (!cookie) return null;

    // Step 2: exchange the cookie for a crumb token
    const crumbRes = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
      headers: { 'User-Agent': ua, 'Cookie': cookie, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5_000),
    });
    if (!crumbRes.ok) return null;
    const crumb = (await crumbRes.text()).trim();
    // A valid crumb is a short (3–20 char) alphanumeric/symbol string
    if (!crumb || crumb.length < 3 || crumb.includes('<')) return null;

    _yahooCrumbCache = { crumb, cookie, fetchedAt: Date.now() };
    return { crumb, cookie };
  } catch {
    return null; // crumb unavailable — proceed without it (some endpoints still work)
  }
}

async function fetchStockYahoo(ticker: string): Promise<StockResult | null> {
  const ua = UA();
  const errors: string[] = [];

  let price90DayChange: number | null = null;
  let revenueGrowthYoY: number | null = null;
  let marketCap: number | null = null;
  let peRatio: number | null = null;
  let employeeCount: number | null = null;
  let currentPrice: number | null = null; // saved for SEC market-cap calculation

  // Fetch crumb + cookie — required for Yahoo Finance APIs since 2024
  const auth = await getYahooCrumb();
  const crumbParam = auth ? `&crumb=${encodeURIComponent(auth.crumb)}` : '';
  // Build headers as Record<string, string> to satisfy TypeScript's HeadersInit constraint.
  // Spreading a conditional object ({ Cookie?: undefined }) fails the index-signature check.
  const headers: Record<string, string> = { 'User-Agent': ua, 'Accept': 'application/json' };
  if (auth) headers['Cookie'] = auth.cookie;

  // ── Chart API: 90-day price history ─────────────────────────────────────────
  try {
    const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=90d&events=div%2Csplits${crumbParam}`;
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
    // Meta fields from chart result — extract everything available before trying summary.
    // v10/quoteSummary is more strictly guarded; chart meta gives us P/E and market cap
    // for free on every successful chart fetch.
    const meta = result?.meta ?? {};
    // Trailing P/E from chart meta
    if (typeof meta.trailingPE === 'number' && isFinite(meta.trailingPE)) {
      peRatio = Math.round(meta.trailingPE * 10) / 10;
    }
    // Market cap approximation: shares outstanding × current price
    // meta.regularMarketPrice × meta.sharesOutstanding gives enterprise-level cap
    const price    = meta.regularMarketPrice ?? meta.chartPreviousClose;
    const shares   = meta.sharesOutstanding ?? meta.impliedSharesOutstanding;
    if (typeof price === 'number' && price > 0) currentPrice = price; // saved for SEC calc
    if (typeof price === 'number' && typeof shares === 'number' && price > 0 && shares > 0) {
      marketCap = price * shares;
    }
  } catch (e: any) {
    errors.push(`Yahoo chart: ${e.message}`);
    // Invalidate cached crumb on auth error so next call fetches a fresh one
    if (e.message?.includes('401') || e.message?.includes('403')) _yahooCrumbCache = null;
  }

  // ── Quote Summary API: financials + profile ──────────────────────────────────
  // v10/quoteSummary has stricter auth than v8/chart. It requires a valid crumb AND
  // a real browser session cookie — not just the fc.yahoo.com gate cookie.
  // It returns 401 from EF IPs regardless of crumb. We still attempt it (revenue
  // growth, employee count are here) but treat failure gracefully: the chart-derived
  // price change is still returned, and Wikipedia covers employee count.
  // Use query1 — the crumb is session-bound to the query1 subdomain.
  try {
    const sumUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=financialData%2CdefaultKeyStatistics%2CassetProfile%2CsummaryDetail${crumbParam}`;
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
    // Invalidate cached crumb on auth error so next call re-fetches a fresh one
    if (e.message?.includes('401') || e.message?.includes('403')) _yahooCrumbCache = null;
  }

  // ── v7/finance/quote fallback ────────────────────────────────────────────────
  // v7 is a lighter "quote" endpoint, sometimes succeeds where v10/quoteSummary
  // is blocked by Yahoo's browser-session guard. Only attempt if v10 yielded nothing.
  if (revenueGrowthYoY === null && (marketCap === null || employeeCount === null)) {
    try {
      const v7Url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(ticker)}&lang=en-US&region=US&corsDomain=finance.yahoo.com${crumbParam}`;
      const v7Res = await fetch(v7Url, { headers, signal: AbortSignal.timeout(8_000) });
      if (v7Res.ok) {
        const v7Data = await v7Res.json();
        const q = v7Data?.quoteResponse?.result?.[0];
        if (q) {
          if (typeof q.revenueGrowth === 'number') revenueGrowthYoY = Math.round(q.revenueGrowth * 100);
          if (typeof q.marketCap === 'number' && marketCap === null) marketCap = q.marketCap;
          if (typeof q.trailingPE === 'number' && isFinite(q.trailingPE) && peRatio === null)
            peRatio = Math.round(q.trailingPE * 10) / 10;
          if (typeof q.fullTimeEmployees === 'number' && q.fullTimeEmployees > 0 && employeeCount === null)
            employeeCount = q.fullTimeEmployees;
        }
      }
    } catch { /* v7 fallback failed silently — chart data is still returned */ }
  }

  // ── SEC EDGAR fallback: revenue growth + market cap + P/E for US-listed stocks
  // Only attempted when Yahoo Finance fundamentals are still null after chart + v10 + v7.
  // Uses currentPrice (from Yahoo chart) to compute market cap from SEC shares outstanding.
  // Non-US stocks (TCS.NS, HDFCBANK.NS) return null from SEC — gracefully skipped.
  let usedSec = false;
  if (revenueGrowthYoY === null || marketCap === null || peRatio === null) {
    try {
      const sec = await fetchSecEdgarFinancials(ticker, currentPrice);
      if (sec) {
        if (sec.revenueGrowthYoY !== null && revenueGrowthYoY === null) { revenueGrowthYoY = sec.revenueGrowthYoY; usedSec = true; }
        if (sec.marketCap       !== null && marketCap       === null) { marketCap       = sec.marketCap;       usedSec = true; }
        if (sec.peRatio         !== null && peRatio         === null) { peRatio         = sec.peRatio;         usedSec = true; }
        if (sec.employeeCount   !== null && employeeCount   === null) { employeeCount   = sec.employeeCount; }
      }
    } catch { /* SEC fallback failed — proceed with whatever data we have */ }
  }

  // ── Finnhub fallback: global stocks including NSE/BSE (TCS.NS, INFY, etc.) ──
  // Fills gaps that Yahoo quoteSummary + SEC EDGAR cannot cover from cloud IPs.
  // Free tier: 60 calls/min. Key in EF secret FINNHUB_API_KEY.
  let usedFinnhub = false;
  if (revenueGrowthYoY === null || marketCap === null || peRatio === null || employeeCount === null) {
    try {
      const [fProfile, fMetrics] = await Promise.allSettled([
        fetchFinnhubProfile(ticker),
        fetchFinnhubBasicFinancials(ticker),
      ]);
      const prof    = fProfile.status    === 'fulfilled' ? fProfile.value    : null;
      const metrics = fMetrics.status === 'fulfilled' ? fMetrics.value : null;
      if (prof) {
        if (prof.marketCap  !== null && marketCap    === null) { marketCap    = prof.marketCap;  usedFinnhub = true; }
        if (prof.employees  !== null && employeeCount === null) employeeCount = prof.employees;
      }
      if (metrics) {
        if (metrics.peRatio         !== null && peRatio         === null) { peRatio         = metrics.peRatio;         usedFinnhub = true; }
        if (metrics.revenueGrowthYoY !== null && revenueGrowthYoY === null) { revenueGrowthYoY = metrics.revenueGrowthYoY; usedFinnhub = true; }
      }
    } catch { /* Finnhub fallback failed — proceed with whatever data we have */ }
  }

  // Return null only if ALL sources produced zero data
  if (price90DayChange === null && revenueGrowthYoY === null && marketCap === null) {
    if (errors.length > 0) return null;
  }

  const source: StockResult['source'] =
    usedFinnhub && usedSec ? 'yahoo-finance+sec-edgar' :
    usedFinnhub            ? 'yahoo-finance+finnhub'   :
    usedSec                ? 'yahoo-finance+sec-edgar'  :
                             'yahoo-finance';

  return {
    price90DayChange, revenueGrowthYoY, marketCap, peRatio, employeeCount,
    source, errors, rateLimited: false,
  };
}

// ── 2. NEWS — Multi-source RSS scraping (no API keys, no quotas) ─────────────

const LAYOFF_KW = ['layoff', 'laid off', 'lay off', 'job cut', 'job cuts', 'workforce reduction',
  'restructuring', 'headcount reduction', 'downsizing', 'retrenchment', 'redundancy',
  'reduction in force', 'rif ', 'cost cut', 'cost-cut'];
const NEGATION_KW = ['denies', 'deny', 'no layoff', 'no-layoff', 'no plans', 'not laying', 'rules out',
  'refutes', 'contrary to', 'rumour', 'rumor', 'speculation', 'no job cut', 'no retrenchment',
  'not planning', 'will not lay'];

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

  // ── India business press RSS (server-side, no CORS, no keys) ────────────────
  // These feeds require server-side fetch — CORS-blocked from browsers.
  // Economic Times, MoneyControl, Business Standard, LiveMint, Financial Express,
  // Inc42 (startup press), Reuters Business (global), TechInAsia (APAC).
  const INDIA_GLOBAL_FEEDS: Array<{ url: string; name: string }> = [
    { url: 'https://economictimes.indiatimes.com/tech/rssfeeds/13357270.cms',   name: 'Economic Times Tech' },
    { url: 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms', name: 'ET Markets' },
    { url: 'https://www.moneycontrol.com/rss/business.xml',                     name: 'MoneyControl' },
    { url: 'https://www.business-standard.com/rss/technology-108.rss',          name: 'Business Standard' },
    { url: 'https://www.livemint.com/rss/companies',                            name: 'LiveMint' },
    { url: 'https://www.financialexpress.com/feed/',                            name: 'Financial Express' },
    { url: 'https://inc42.com/feed/',                                           name: 'Inc42' },
    { url: 'https://feeds.reuters.com/reuters/businessNews',                    name: 'Reuters Business' },
    { url: 'https://www.techinasia.com/feed',                                   name: 'TechInAsia' },
    { url: 'https://www.channelnewsasia.com/rssfeeds/8395986',                  name: 'CNA Business' },
    { url: 'https://yourstory.com/feed',                                        name: 'YourStory' },
  ];

  const feedFetches = INDIA_GLOBAL_FEEDS.map(async ({ url, name }) => {
    try {
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(6_000) });
      if (!res.ok) return;
      const xml = await res.text();
      const items = extractRSSItems(xml);
      let added = 0;
      for (const item of items) {
        allArticles.push({ title: item.title, url: item.link, pubDate: item.pubDate, source: name });
        added++;
      }
      if (added > 0) scrapedSources.push(name);
    } catch { /* silent — supplemental source */ }
  });

  await Promise.allSettled(feedFetches);

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

// ── 3. HIRING — Direct multi-market job-board scraping (no API keys) ──────────

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

// Short-form aliases for companies whose Naukri search name differs from legal name.
// "Tata Consultancy Services" returns 0 on Naukri; "TCS" returns thousands.
const NAUKRI_COMPANY_ALIASES: Record<string, string> = {
  'tata consultancy services': 'TCS',
  'tata consultancy': 'TCS',
  'infosys bpo': 'Infosys',
  'wipro technologies': 'Wipro',
  'hcl technologies': 'HCL',
  'tech mahindra': 'Tech Mahindra',
  'larsen and toubro infotech': 'LTI',
  'larsen & toubro infotech': 'LTI',
  'l&t technology services': 'LTTS',
};

// Naukri unofficial internal API — stable since 2020, returns JSON job count
async function fetchNaukriDirect(roleTitle: string, companyName: string): Promise<number | null> {
  const normalizedName = NAUKRI_COMPANY_ALIASES[companyName.toLowerCase().trim()] ?? companyName;
  const keyword = `${roleTitle} ${normalizedName}`.trim().replace(/\s+/g, ' ');
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

// News-derived hiring signal — uses Google News RSS (which works from cloud IPs)
// to infer demand trend and freeze score when all job boards are blocked.
// Returns null if Google News is also unreachable.
async function fetchHiringNewsSignal(companyName: string, market: HiringMarket): Promise<{
  demandTrend: 'rising' | 'stable' | 'falling';
  hiringFreezeScore: number;
  recentArticles: number;
} | null> {
  try {
    const q = encodeURIComponent(`"${companyName}" (hiring OR recruitment OR "job openings" OR "is hiring" OR expansion)`);
    const regionParam = market === 'india'
      ? '&hl=en-IN&gl=IN&ceid=IN:en'
      : market === 'uk' ? '&hl=en-GB&gl=GB&ceid=GB:en'
      : market === 'germany' ? '&hl=de&gl=DE&ceid=DE:de'
      : '&hl=en-US&gl=US&ceid=US:en';
    const url = `https://news.google.com/rss/search?q=${q}${regionParam}`;
    const res = await fetch(url, { headers: { 'User-Agent': UA() }, signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return null;
    const xml = await res.text();

    const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
    const cutoff = Date.now() - 60 * 24 * 60 * 60 * 1000; // 60-day window
    let hiringSignals = 0;
    let freezeSignals = 0;

    for (const item of items) {
      const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1];
      if (!pubDate || new Date(pubDate).getTime() < cutoff) continue;
      const title = (item.match(/<title>(.*?)<\/title>/)?.[1] ?? '').toLowerCase();
      if (title.includes('layoff') || title.includes('cut') || title.includes('freeze') || title.includes('halt hiring')) {
        freezeSignals++;
      } else if (title.includes('hiring') || title.includes('recruit') || title.includes('expansion') || title.includes('adding')) {
        hiringSignals++;
      }
    }

    const net = hiringSignals - freezeSignals;
    const demandTrend: 'rising' | 'stable' | 'falling' =
      net > 1 ? 'rising' : net < -1 ? 'falling' : 'stable';
    // Freeze score is directionally consistent with trend: rising = low freeze risk,
    // falling = high freeze risk. Absolute freeze count tempers the score within range.
    const hiringFreezeScore =
      demandTrend === 'rising'  ? (freezeSignals > 3 ? 0.30 : 0.20) :
      demandTrend === 'falling' ? (freezeSignals > 2 ? 0.80 : 0.65) :
      (freezeSignals > 2 ? 0.50 : 0.40);
    return { demandTrend, hiringFreezeScore, recentArticles: hiringSignals + freezeSignals };
  } catch {
    return null;
  }
}

// ── Adzuna job aggregator (API key, multi-market) ─────────────────────────────
// Adzuna covers IN, US, GB, DE, SG, AU, CA, BR, AE — good global coverage.
// Credentials read from EF secrets ADZUNA_APP_ID and ADZUNA_APP_KEY.
// Uses `what` (role title) + `company` (company name) params for accurate matching.

const ADZUNA_COUNTRY: Record<HiringMarket, string | null> = {
  india:     null,  // Adzuna /in/ returns HTTP 400 — endpoint not supported by Adzuna
  us:        'us',
  uk:        'gb',
  germany:   'de',
  singapore: 'sg',
  australia: 'au',
  canada:    'ca',
  latam:     'br',
  mena:      'ae',
};

async function fetchAdzuna(roleTitle: string, companyName: string, market: HiringMarket): Promise<number | null> {
  const appId  = Deno.env.get('ADZUNA_APP_ID');
  const appKey = Deno.env.get('ADZUNA_APP_KEY');
  if (!appId || !appKey) return null;
  if (!companyName.trim()) return null; // Adzuna returns 400 for empty company

  const country = ADZUNA_COUNTRY[market];
  if (!country) return null;

  try {
    const params = new URLSearchParams({
      app_id:             appId,
      app_key:            appKey,
      results_per_page:   '1',   // only need the total count, not actual listings
      what:               roleTitle,
      company:            companyName,
      'content-type':     'application/json',
    });
    const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': UA(), Accept: 'application/json' },
      signal: AbortSignal.timeout(9_000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const count = data?.count;
    return typeof count === 'number' ? count : null;
  } catch {
    return null;
  }
}

async function fetchHiringDirect(roleTitle: string, companyName: string): Promise<HiringResult | null> {
  const errors: string[] = [];

  // Run Naukri, Indeed, and LinkedIn concurrently — independent, no interdependencies.
  // allSettled: a site ban on one board never aborts the other two results.
  const [naukriS, indeedS, linkedinS] = await Promise.allSettled([
    fetchNaukriDirect(roleTitle, companyName),
    fetchIndeedDirect(roleTitle, companyName),
    fetchLinkedInDirect(roleTitle, companyName),
  ]);
  const naukriCount  = naukriS.status  === 'fulfilled' ? naukriS.value  : null;
  const indeedCount  = indeedS.status  === 'fulfilled' ? indeedS.value  : null;
  const linkedinCount = linkedinS.status === 'fulfilled' ? linkedinS.value : null;

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

  // allSettled throughout: run() already catches internally, but allSettled makes the
  // isolation contract explicit — a crashed board never silently drops the others.
  const settle = (r: PromiseSettledResult<number | null>) =>
    r.status === 'fulfilled' ? r.value : null;

  if (market === 'india') {
    // Note: Adzuna /in/ returns HTTP 400 — not included for India market.
    // Naukri/Indeed/LinkedIn are also blocked from cloud IPs (403/block).
    // Hiring signal falls through to fetchHiringNewsSignal (Google News RSS).
    const [a, b, c] = await Promise.allSettled([
      run('naukri',         () => fetchNaukriDirect(roleTitle, companyName)),
      run('indeed-india',   () => fetchIndeedMarket(roleTitle, companyName, 'india')),
      run('linkedin-india', () => fetchLinkedInMarket(roleTitle, companyName, 'india')),
    ]);
    counts = { naukri: settle(a), 'indeed-india': settle(b), 'linkedin-india': settle(c) };

  } else if (market === 'us') {
    const [a, b, c, d] = await Promise.allSettled([
      run('adzuna',         () => fetchAdzuna(roleTitle, companyName, 'us')),
      run('linkedin-us',    () => fetchLinkedInMarket(roleTitle, companyName, 'us')),
      run('indeed-us',      () => fetchIndeedMarket(roleTitle, companyName, 'us')),
      run('glassdoor-jobs', () => fetchGlassdoorJobsDirect(roleTitle, companyName)),
    ]);
    counts = { adzuna: settle(a), 'linkedin-us': settle(b), 'indeed-us': settle(c), 'glassdoor-jobs': settle(d) };

  } else if (market === 'uk') {
    const [a, b, c, d, e] = await Promise.allSettled([
      run('adzuna',      () => fetchAdzuna(roleTitle, companyName, 'uk')),
      run('linkedin-uk', () => fetchLinkedInMarket(roleTitle, companyName, 'uk')),
      run('indeed-uk',   () => fetchIndeedMarket(roleTitle, companyName, 'uk')),
      run('reed',        () => fetchReedDirect(roleTitle, companyName)),
      run('jobsite',     () => fetchJobsiteDirect(roleTitle, companyName)),
    ]);
    counts = { adzuna: settle(a), 'linkedin-uk': settle(b), 'indeed-uk': settle(c), reed: settle(d), jobsite: settle(e) };

  } else if (market === 'germany') {
    const [a, b, c, d] = await Promise.allSettled([
      run('adzuna',      () => fetchAdzuna(roleTitle, companyName, 'germany')),
      run('stepstone',   () => fetchStepstoneDirect(roleTitle, companyName)),
      run('linkedin-de', () => fetchLinkedInMarket(roleTitle, companyName, 'germany')),
      run('xing',        () => fetchXingDirect(roleTitle, companyName)),
    ]);
    counts = { adzuna: settle(a), stepstone: settle(b), 'linkedin-de': settle(c), xing: settle(d) };

  } else if (market === 'singapore') {
    const [a, b, c, d] = await Promise.allSettled([
      run('adzuna',          () => fetchAdzuna(roleTitle, companyName, 'singapore')),
      run('linkedin-sg',     () => fetchLinkedInMarket(roleTitle, companyName, 'singapore')),
      run('jobsdb',          () => fetchJobsDBDirect(roleTitle, companyName)),
      run('mycareersfuture', () => fetchMyCareersFutureDirect(roleTitle, companyName)),
    ]);
    counts = { adzuna: settle(a), 'linkedin-sg': settle(b), jobsdb: settle(c), mycareersfuture: settle(d) };

  } else if (market === 'australia') {
    const [a, b, c, d] = await Promise.allSettled([
      run('adzuna',      () => fetchAdzuna(roleTitle, companyName, 'australia')),
      run('seek',        () => fetchSeekDirect(roleTitle, companyName)),
      run('linkedin-au', () => fetchLinkedInMarket(roleTitle, companyName, 'australia')),
      run('jora',        () => fetchJoraDirect(roleTitle, companyName)),
    ]);
    counts = { adzuna: settle(a), seek: settle(b), 'linkedin-au': settle(c), jora: settle(d) };

  } else if (market === 'canada') {
    const [a, b, c, d] = await Promise.allSettled([
      run('adzuna',      () => fetchAdzuna(roleTitle, companyName, 'canada')),
      run('linkedin-ca', () => fetchLinkedInMarket(roleTitle, companyName, 'canada')),
      run('indeed-ca',   () => fetchIndeedMarket(roleTitle, companyName, 'canada')),
      run('job-bank',    () => fetchJobBankDirect(roleTitle, companyName)),
    ]);
    counts = { adzuna: settle(a), 'linkedin-ca': settle(b), 'indeed-ca': settle(c), 'job-bank': settle(d) };

  } else if (market === 'latam') {
    const [a, b, c, d] = await Promise.allSettled([
      run('adzuna',         () => fetchAdzuna(roleTitle, companyName, 'latam')),
      run('linkedin-latam', () => fetchLinkedInMarket(roleTitle, companyName, 'latam')),
      run('bumeran',        () => fetchBumeranDirect(roleTitle, companyName)),
      run('computrabajo',   () => fetchComputrabajoDirect(roleTitle, companyName)),
    ]);
    counts = { adzuna: settle(a), 'linkedin-latam': settle(b), bumeran: settle(c), computrabajo: settle(d) };

  } else if (market === 'mena') {
    const [a, b, c, d] = await Promise.allSettled([
      run('adzuna',        () => fetchAdzuna(roleTitle, companyName, 'mena')),
      run('bayt',          () => fetchBaytDirect(roleTitle, companyName)),
      run('linkedin-mena', () => fetchLinkedInMarket(roleTitle, companyName, 'mena')),
      run('naukrigulf',    () => fetchNaukriGulfDirect(roleTitle, companyName)),
    ]);
    counts = { adzuna: settle(a), bayt: settle(b), 'linkedin-mena': settle(c), naukrigulf: settle(d) };
  }

  // Aggregate: sum all non-null counts; require at least one live result.
  //
  // BUG FIX (v2026-05-24): The old `adzunaOnlyZero` guard returned null when
  // Adzuna was the only responding connector AND returned 0. This caused a
  // fabricated "rising trend from news" for companies genuinely not hiring in
  // that market (e.g. Infosys in Australia). 0 openings IS valid live data —
  // we now return it so the UI shows "0 openings" instead of a misleading trend.
  // The guard is removed: any connector responding (even with 0) is a live signal.
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

  // Run all 3 scrapers concurrently — independent, no dependencies.
  // allSettled: a parse failure on one scraper never silently drops the other two.
  const [wikiS, careerS, glassdoorS] = await Promise.allSettled([
    fetchWikipediaHeadcount(companyName),
    fetchCareerPage(companyName),
    fetchGlassdoor(companyName),
  ]);
  const wiki     = wikiS.status     === 'fulfilled' ? wikiS.value     : (errors.push(`wiki: ${(wikiS as PromiseRejectedResult).reason?.message}`),     null);
  const career   = careerS.status   === 'fulfilled' ? careerS.value   : (errors.push(`career: ${(careerS as PromiseRejectedResult).reason?.message}`),   null);
  const glassdoor = glassdoorS.status === 'fulfilled' ? glassdoorS.value : (errors.push(`glassdoor: ${(glassdoorS as PromiseRejectedResult).reason?.message}`), null);

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

  const authFail = requireAuth(req);
  if (authFail) return authFail;

  try {
    const body = await req.json().catch(() => ({}));
    const { companyName, ticker, action, roleTitle } = body;

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

      // ── helper: write hiring result to company_live_cache (fire-and-forget) ──
      const writeHiringCache = (hd: any, cr: any) => {
        if (!company) return;
        void writeLiveCache(company, market, {
          estimated_openings:  hd.estimatedOpenings  ?? null,
          demand_trend:        hd.demandTrend         ?? null,
          hiring_freeze_score: hd.hiringFreezeScore   ?? null,
          hiring_source:       hd.source              ?? null,
          connector_results:   cr ?? null,
          data_sources:        ['hiring-scrape'],
        });
      };

      // PRIMARY: Market-appropriate direct scraping (no API key)
      const scraped = await fetchHiringForMarket(role, company, market, skipConnectors);
      if (scraped) {
        writeHiringCache(scraped, scraped.connectorResults);
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
          writeHiringCache(indiaScraped, {});
          return json({ hiringData: indiaScraped, connectorResults: {}, market: 'india', errors: indiaScraped.errors });
        }
      }

      // All job board scrapers returned null (expected from cloud IPs — major boards block Deno Deploy).
      // Use Google News RSS to infer demand trend before falling back to neutral heuristic.
      const newsSignal = await fetchHiringNewsSignal(company, market);
      const newsHiringData = {
        estimatedOpenings: null, naukriOpenings: null, linkedinOpenings: null, indeedOpenings: null,
        demandTrend:      newsSignal?.demandTrend      ?? 'stable',
        hiringFreezeScore: newsSignal?.hiringFreezeScore ?? 0.40,
        isLive: true, scrapeSource: 'scraped',
        source: newsSignal
          ? `Demand trend derived from ${newsSignal.recentArticles} recent news articles (job boards unavailable from cloud IPs)`
          : 'All job-board scrapers returned empty for this query',
        fetchedAt: new Date().toISOString(), errors: [], serperRateLimited: false,
      };
      writeHiringCache(newsHiringData, {});
      return json({
        hiringData:       newsHiringData,
        connectorResults: {}, market,
        errors: ['All job-board scrapers returned empty; used news-derived hiring signal'],
      });
    }

    // ── stock / news / both actions ────────────────────────────────────────────
    const errors: string[] = [];
    let stockData = null;
    let newsData  = null;

    // STOCK: Yahoo Finance (primary + only source — no paid API fallback)
    if ((action === 'stock' || action === 'both') && ticker) {
      const yahoo = await fetchStockYahoo(ticker);
      if (yahoo && (yahoo.price90DayChange !== null || yahoo.revenueGrowthYoY !== null)) {
        stockData = {
          price90DayChange: yahoo.price90DayChange,
          revenueGrowthYoY: yahoo.revenueGrowthYoY,
          marketCap:        yahoo.marketCap,
          peRatio:          yahoo.peRatio,
          employeeCount:    yahoo.employeeCount,
          source:           yahoo.source,
        };
        errors.push(...(yahoo.errors.length > 0 ? yahoo.errors : []));
      } else {
        errors.push(`Yahoo Finance returned no data for ${ticker}`);
        if (yahoo?.errors.length) errors.push(...yahoo.errors);
      }
    } else if ((action === 'stock' || action === 'both') && !ticker) {
      errors.push(`No ticker for "${companyName}" — private company or unmapped`);
    }

    // NEWS: 12-source free RSS scraping (no API keys, no quotas)
    if (action === 'news' || action === 'both') {
      const rssResult = await fetchNewsRSS(companyName ?? '', ticker ?? null);
      errors.push(...rssResult.errors);
      // Always use RSS result — may be empty if company not in recent news (that's valid)
      newsData = rssResult;
      if (rssResult.recentHeadlineCount === 0 && rssResult.scrapedSources.length === 0) {
        errors.push('All RSS sources returned 0 company-relevant articles');
      }
    }

    // ── Write-back to company_live_cache (fire-and-forget) ────────────────────
    // Stores collected data so a second same-day audit reads from DB instead of
    // re-scraping. Failures are swallowed — live response is never blocked.
    if (companyName) {
      const sources: string[] = [];
      if (stockData?.source) sources.push(stockData.source);
      if (newsData) sources.push('rss');
      void writeLiveCache(companyName, 'global', {
        ticker:                ticker ?? null,
        price_90d_change:      stockData?.price90DayChange ?? null,
        revenue_growth_yoy:    stockData?.revenueGrowthYoY ?? null,
        market_cap:            stockData?.marketCap ?? null,
        pe_ratio:              stockData?.peRatio ?? null,
        employee_count:        stockData?.employeeCount ?? null,
        stock_source:          stockData?.source ?? null,
        recent_headline_count: newsData?.recentHeadlineCount ?? null,
        sentiment_signal:      newsData?.sentimentSignal ?? null,
        latest_layoff_event:   newsData?.latestLayoffEvent ?? null,
        data_sources:          sources,
      });
    }

    return json({ stockData, newsData, errors, rateLimitFlags: {} });
  } catch (e: any) {
    return json({ stockData: null, newsData: null, hiringData: null, errors: [String(e?.message ?? e)] }, 500);
  }
});
