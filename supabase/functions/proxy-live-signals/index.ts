// proxy-live-signals — multi-source proxy for stock and news signals.
// Stock: Yahoo Finance v7/quote (primary) + v8/chart (90d change) → FMP fallback
// News:  NewsAPI (primary) → GNews API (fallback) → Google News RSS (last resort)
// Cross-match filter: title-match required (description optional) to eliminate false positives.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Browser-like headers — required for Yahoo Finance v10/v11 without crumb
const YAHOO_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Referer": "https://finance.yahoo.com/",
  "Origin": "https://finance.yahoo.com",
};

// ── STOCK: Yahoo Finance crumb auth (required for v10 quoteSummary fundamentals) ─
// The crumb flow (consent cookie → crumb endpoint) is fragile in server environments;
// Yahoo changes it periodically. We attempt it but catch failures gracefully so the
// chart-based 90-day price change (which needs NO crumb) always succeeds.

interface YahooCrumb { crumb: string; cookies: string }

let _crumbCache: YahooCrumb | null = null;
let _crumbFetchedAt = 0;
const CRUMB_TTL_MS = 20 * 60 * 1000; // 20 min

async function getYahooCrumb(): Promise<YahooCrumb> {
  const now = Date.now();
  if (_crumbCache && now - _crumbFetchedAt < CRUMB_TTL_MS) return _crumbCache;

  // Strategy 1: consent-cookie flow (standard)
  try {
    const consentRes = await fetch("https://guce.yahoo.com/consent?sessionId=1&lang=en-US&inline=false", {
      headers: YAHOO_HEADERS,
      redirect: "manual",
      signal: AbortSignal.timeout(6_000),
    });
    const rawCookies = consentRes.headers.get("set-cookie") ?? "";
    const cookieStr = rawCookies.split(",").map((s) => s.split(";")[0].trim()).join("; ");

    const crumbRes = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", {
      headers: { ...YAHOO_HEADERS, "Cookie": cookieStr },
      signal: AbortSignal.timeout(6_000),
    });
    if (crumbRes.ok) {
      const crumb = await crumbRes.text();
      if (crumb && !crumb.startsWith("{")) {
        _crumbCache = { crumb: crumb.trim(), cookies: cookieStr };
        _crumbFetchedAt = now;
        return _crumbCache;
      }
    }
  } catch {
    // fall through to strategy 2
  }

  // Strategy 2: direct getcrumb without consent cookies (works in some regions/versions)
  const crumbRes2 = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", {
    headers: YAHOO_HEADERS,
    signal: AbortSignal.timeout(6_000),
  });
  if (!crumbRes2.ok) throw new Error(`Yahoo crumb HTTP ${crumbRes2.status}`);
  const crumb2 = await crumbRes2.text();
  if (!crumb2 || crumb2.startsWith("{")) throw new Error("Yahoo crumb: all strategies failed");

  _crumbCache = { crumb: crumb2.trim(), cookies: "" };
  _crumbFetchedAt = now;
  return _crumbCache;
}

// ── STOCK: Yahoo Finance v10 quoteSummary (detailed fundamentals) ─────────────
// Returns null on crumb failure — caller continues with chart-only data.

async function getYahooSummary(ticker: string): Promise<any> {
  try {
    const { crumb, cookies } = await getYahooCrumb();
    const modules = "financialData,defaultKeyStatistics,summaryDetail,assetProfile";
    const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=${modules}&formatted=false&crumb=${encodeURIComponent(crumb)}`;
    const headers: Record<string, string> = { ...YAHOO_HEADERS };
    if (cookies) headers["Cookie"] = cookies;
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`Yahoo summary HTTP ${res.status}`);
    const data = await res.json();
    if (data?.quoteSummary?.error) throw new Error(data.quoteSummary.error.description ?? "Yahoo summary error");
    return data?.quoteSummary?.result?.[0] ?? null;
  } catch (_e: unknown) {
    const msg = _e instanceof Error ? _e.message : String(_e);
    console.warn(`[proxy] Yahoo summary unavailable (${msg}) — continuing with chart-only data`);
    return null;
  }
}

// ── STOCK: Yahoo Finance v8 chart (90-day price change) ───────────────────────

async function getYahooChart(ticker: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=3mo`;
  const res = await fetch(url, {
    headers: YAHOO_HEADERS,
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Yahoo chart HTTP ${res.status}`);
  const data = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result) throw new Error("Yahoo chart: no data returned");
  return result;
}

async function getStockSignals(ticker: string) {
  // Chart always works (no crumb required); summary needs crumb and is optional
  const [chart, summary] = await Promise.all([
    getYahooChart(ticker),
    getYahooSummary(ticker).catch((e: Error) => {
      console.warn(`[proxy] Yahoo summary failed: ${e.message}`);
      return null;
    }),
  ]);

  // 90-day price change from chart close prices
  let price90DayChange: number | null = null;
  const closes: number[] = chart.indicators?.quote?.[0]?.close ?? [];
  const validCloses = closes.filter((v: number | null) => v != null);
  if (validCloses.length >= 2) {
    const oldest = validCloses[0];
    const newest = validCloses[validCloses.length - 1];
    if (oldest > 0) {
      price90DayChange = Math.round(((newest - oldest) / oldest) * 1000) / 10;
    }
  }

  const fin = summary?.financialData ?? {};
  const stats = summary?.defaultKeyStatistics ?? {};
  const profile = summary?.assetProfile ?? {};

  // Revenue growth: v10 financialData.revenueGrowth (raw decimal, e.g. 0.12 = 12%)
  const revenueGrowthRaw = fin.revenueGrowth?.raw ?? fin.revenueGrowth ?? null;
  const revenueGrowthYoY = revenueGrowthRaw != null
    ? Math.round(revenueGrowthRaw * 100)
    : null;

  const employeeCount = profile.fullTimeEmployees ?? null;
  const marketCap = stats.marketCap?.raw ?? stats.marketCap ?? chart.meta?.marketCap ?? null;
  const forwardPE = fin.forwardPE?.raw ?? fin.forwardPE ?? null;
  const currentPrice = fin.currentPrice?.raw ?? fin.currentPrice ?? chart.meta?.regularMarketPrice ?? null;
  const targetPrice = fin.targetMeanPrice?.raw ?? fin.targetMeanPrice ?? null;
  const analystRecommendation = fin.recommendationKey ?? null;
  const debtToEquity = fin.debtToEquity?.raw ?? fin.debtToEquity ?? null;
  const totalRevenue = fin.totalRevenue?.raw ?? fin.totalRevenue ?? null;
  const revenuePerEmployee = (totalRevenue && employeeCount)
    ? Math.round(totalRevenue / employeeCount)
    : null;

  return {
    price90DayChange,
    revenueGrowthYoY,
    marketCap,
    forwardPE,
    employeeCount,
    currentPrice,
    targetPrice,
    analystRecommendation,
    debtToEquity,
    revenuePerEmployee,
    source: "yahoo-finance",
  };
}

// ── STOCK: FMP fallback (optional, if FMP_KEY env is set) ────────────────────

async function getStockSignalsFMP(ticker: string, fmpKey: string) {
  const [quoteRes, profileRes] = await Promise.all([
    fetch(`https://financialmodelingprep.com/api/v3/quote/${ticker}?apikey=${fmpKey}`, { signal: AbortSignal.timeout(8_000) }),
    fetch(`https://financialmodelingprep.com/api/v3/profile/${ticker}?apikey=${fmpKey}`, { signal: AbortSignal.timeout(8_000) }),
  ]);

  if (!quoteRes.ok) throw new Error(`FMP quote HTTP ${quoteRes.status}`);
  const quotes = await quoteRes.json();
  const profiles = profileRes.ok ? await profileRes.json() : [];
  const q = Array.isArray(quotes) ? quotes[0] : null;
  const p = Array.isArray(profiles) ? profiles[0] : null;
  if (!q) throw new Error("FMP: empty quote response");

  return {
    price90DayChange: q.changesPercentage ?? null,
    revenueGrowthYoY: null,  // not available in free FMP
    marketCap: q.marketCap ?? null,
    employeeCount: p?.fullTimeEmployees ?? null,
    currentPrice: q.price ?? null,
    analystRecommendation: null,
    source: "fmp",
  };
}

// ── NEWS: Source 1 — NewsAPI ──────────────────────────────────────────────────

const LAYOFF_KEYWORDS = ["layoff", "job cut", "workforce reduction", "restructuring", "headcount", "redundan", "retrench"];

// Word-boundary match prevents false positives from package names like "tabsdata-salesforce" or "trytond-stripe".
// Regex: not preceded/followed by alphanumeric or hyphen so "salesforce" won't match "tabsdata-salesforce".
function companyWordBoundaryMatch(text: string, companyLower: string): boolean {
  const escaped = companyLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(?<![a-z0-9-])${escaped}(?![a-z0-9-])`, "i");
  return re.test(text);
}

function articleMatchesCompany(a: any, companyLower: string): boolean {
  const title = (a.title || "").toLowerCase();
  const desc = (a.description || "").toLowerCase();
  if (companyWordBoundaryMatch(title, companyLower)) return true;
  // Allow description-only match when a layoff keyword is also present
  if (companyWordBoundaryMatch(desc, companyLower) && LAYOFF_KEYWORDS.some((kw) => desc.includes(kw))) return true;
  return false;
}

async function getNewsAPISignals(companyName: string, newsKey: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const from = thirtyDaysAgo.toISOString().split("T")[0];

  // Exact company name in quotes for better precision
  const query = encodeURIComponent(`"${companyName}" layoff OR "job cuts" OR restructuring`);
  const url = `https://newsapi.org/v2/everything?q=${query}&from=${from}&sortBy=publishedAt&language=en&pageSize=20&apiKey=${newsKey}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(9_000) });
  if (!res.ok) throw new Error(`NewsAPI HTTP ${res.status}`);
  const data = await res.json();
  if (data.status !== "ok") throw new Error(data.message || "NewsAPI error");

  const companyLower = companyName.toLowerCase();
  const articles = (data.articles || []).filter((a: any) => articleMatchesCompany(a, companyLower));

  return parseArticles(articles, companyName, "newsapi");
}

// ── NEWS: Source 2 — GNews API (100 free req/day) ────────────────────────────

async function getGNewsSignals(companyName: string, gnewsKey: string) {
  const query = encodeURIComponent(`"${companyName}" layoff`);
  const url = `https://gnews.io/api/v4/search?q=${query}&lang=en&max=10&sortby=publishedAt&apikey=${gnewsKey}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
  if (!res.ok) throw new Error(`GNews HTTP ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data.articles)) throw new Error("GNews: unexpected response shape");

  const companyLower = companyName.toLowerCase();
  const normalized = data.articles.map((a: any) => ({
    title: a.title,
    description: a.description,
    publishedAt: a.publishedAt,
    url: a.url,
    source: { name: a.source?.name },
  }));
  const articles = normalized.filter((a: any) => articleMatchesCompany(a, companyLower));

  return parseArticles(articles, companyName, "gnews");
}

// ── NEWS: Source 3 — Google News RSS (no key needed) ─────────────────────────

async function getGoogleNewsRSS(companyName: string) {
  const query = encodeURIComponent(`"${companyName}" layoff`);
  const url = `https://news.google.com/rss/search?q=${query}&hl=en&gl=US&ceid=US:en`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`Google News RSS HTTP ${res.status}`);
  const xml = await res.text();

  // Simple RSS parser — extract <item> blocks
  const items: any[] = [];
  const companyLower = companyName.toLowerCase();
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
  for (const match of itemMatches) {
    const block = match[1];
    const titleMatch = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
    const descMatch = block.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/);
    const pubDateMatch = block.match(/<pubDate>(.*?)<\/pubDate>/);
    const linkMatch = block.match(/<link>(.*?)<\/link>/);
    const sourceMatch = block.match(/<source[^>]*>(.*?)<\/source>/);

    const title = titleMatch?.[1] ?? "";
    const desc = descMatch?.[1]?.replace(/<[^>]+>/g, "") ?? "";

    // Only include if article genuinely references the company (title-match required or desc+layoff keyword)
    if (!articleMatchesCompany({ title, description: desc }, companyLower)) continue;

    items.push({
      title,
      description: desc,
      publishedAt: pubDateMatch ? new Date(pubDateMatch[1]).toISOString() : new Date().toISOString(),
      url: linkMatch?.[1] ?? "",
      source: { name: sourceMatch?.[1]?.trim() ?? "Google News" },
    });
    if (items.length >= 10) break;
  }

  return parseArticles(items, companyName, "google-news-rss");
}

// ── NEWS: Source 4 — Reddit r/layoffs (no key, signals depth) ────────────────

async function getRedditLayoffs(companyName: string) {
  const query = encodeURIComponent(companyName);
  const url = `https://www.reddit.com/r/layoffs/search.json?q=${query}&sort=new&limit=10&restrict_sr=1`;

  const res = await fetch(url, {
    headers: { "User-Agent": "HumanProof/1.0" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`Reddit HTTP ${res.status}`);
  const data = await res.json();
  const posts = data?.data?.children ?? [];

  // Reuse the same word-boundary match the news pipeline uses. A naive
  // substring like `.includes("apple")` matches "Snapple", "pineapple",
  // "Apple Cider Co", and r/layoffs has plenty of unrelated chatter that
  // mentions a company name in passing. Also require the company token to
  // be ≥4 chars to avoid matching tickers like "HP" or "GE" against random
  // English words.
  const companyLower = companyName.toLowerCase();
  if (companyLower.length < 4) {
    // Too-short query produces too many false positives on Reddit; bail out.
    return parseArticles([], companyName, "reddit-layoffs");
  }
  const articles = posts
    .filter((p: any) => {
      const title = (p.data?.title || "");
      const selftext = (p.data?.selftext || "");
      return (
        companyWordBoundaryMatch(title, companyLower) ||
        companyWordBoundaryMatch(selftext, companyLower)
      );
    })
    .map((p: any) => ({
      title: p.data.title,
      description: p.data.selftext?.slice(0, 300) ?? "",
      publishedAt: new Date(p.data.created_utc * 1000).toISOString(),
      url: `https://reddit.com${p.data.permalink}`,
      source: { name: "Reddit r/layoffs" },
    }));

  return parseArticles(articles, companyName, "reddit-layoffs");
}

// ── Shared article parser ─────────────────────────────────────────────────────

function parseArticles(articles: any[], companyName: string, source: string) {
  const recentCount = articles.length;
  let latestLayoffEvent: any = null;

  for (const a of articles) {
    const title = (a.title || "").toLowerCase();
    const combined = title + " " + (a.description || "").toLowerCase();
    if (LAYOFF_KEYWORDS.some((kw) => combined.includes(kw))) {
      const pctMatch = (a.title + " " + (a.description || "")).match(/(\d+(?:\.\d+)?)\s*%/);
      latestLayoffEvent = {
        companyName,
        date: (a.publishedAt ?? "").slice(0, 10),
        headline: a.title,
        percentCut: pctMatch ? parseFloat(pctMatch[1]) : null,
        source: a.source?.name ?? source,
        url: a.url ?? "",
      };
      break;
    }
  }

  return {
    latestLayoffEvent,
    recentHeadlineCount: recentCount,
    sentimentSignal: Math.min(1, recentCount / 5),
    source,
    articles: articles.slice(0, 5).map((a) => ({
      headline: a.title,
      date: (a.publishedAt ?? "").slice(0, 10),
      source: a.source?.name ?? source,
      url: a.url ?? "",
    })),
    fetchedAt: new Date().toISOString(),
  };
}

// ── Main handler ──────────────────────────────────────────────────────────────

// ── Hiring signals: Serper API (key server-side) ────────────────────────────
// Queries Naukri + LinkedIn job counts for a specific role at a specific company.
// Returns hiringFreezeScore, demandTrend, and per-board opening counts.
// Called by naukriConnector.ts with action: 'hiring'.

interface HiringSignalResult {
  estimatedOpenings: number | null;
  naukriOpenings: number | null;
  linkedinOpenings: number | null;
  hiringFreezeScore: number;
  demandTrend: string;
  isLive: boolean;
  serperRateLimited: boolean;
  fetchedAt: string;
}

// Extract the actual job count from a Serper organic results array.
// Priority:
//   1. searchParameters.totalResults from the Serper response (most accurate)
//   2. A number followed by "job(s)" / "opening(s)" / "position(s)" in any snippet
//   3. Number of result items with job-related titles (fallback, capped at num=10)
function parseJobCount(data: Record<string, unknown>): number {
  // Serper sometimes includes the total result count directly
  const sp = data?.searchParameters as Record<string, unknown> | undefined;
  const total = sp?.totalResults;
  if (typeof total === "number" && total > 0) return total;
  if (typeof total === "string") {
    const parsed = parseInt((total as string).replace(/,/g, ""), 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }

  // Scan snippet text for patterns like "1,234 jobs", "287 openings", "45 positions"
  const organic = Array.isArray(data?.organic) ? (data.organic as Array<Record<string, unknown>>) : [];
  for (const item of organic.slice(0, 5)) {
    const text = `${item?.snippet ?? ""} ${item?.title ?? ""}`;
    const m = text.match(/(\d[\d,]*)\s+(?:jobs?|openings?|positions?|vacancies)/i);
    if (m) {
      const n = parseInt(m[1].replace(/,/g, ""), 10);
      if (!isNaN(n) && n > 0) return n;
    }
  }

  // Fallback: count result items with job-related titles (max = num param = 10)
  return organic.filter((r) =>
    /jobs?|openings?|hiring|career|vacancies/i.test(String(r?.title ?? "")),
  ).length;
}

async function getHiringSignals(roleTitle: string, companyName: string, serperKey: string): Promise<HiringSignalResult> {
  const queries = [
    `site:naukri.com "${roleTitle}" "${companyName}"`,
    `site:linkedin.com/jobs "${roleTitle}" "${companyName}"`,
  ];

  let naukriCount = 0;
  let linkedinCount = 0;

  for (const q of queries) {
    try {
      const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: { "X-API-KEY": serperKey, "Content-Type": "application/json" },
        body: JSON.stringify({ q, num: 10, gl: "in", hl: "en" }),
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) {
        if (res.status === 429) throw new Error("Serper 429 — rate limited");
        throw new Error(`Serper HTTP ${res.status}`);
      }
      const data = await res.json() as Record<string, unknown>;
      // Use snippet/totalResults parsing — NOT organic.length which caps at num=10
      const count = parseJobCount(data);
      if (q.includes("naukri.com"))   naukriCount  = count;
      if (q.includes("linkedin.com")) linkedinCount = count;
    } catch (e: unknown) {
      throw e; // propagate — caller handles rate limit vs network error
    }
  }

  const totalOpenings = naukriCount + linkedinCount;

  // Freeze score tiers calibrated for real job counts (not result-item counts):
  //   0        → almost certainly frozen
  //   1–10     → very limited hiring
  //   11–50    → selective hiring
  //   51–200   → moderate hiring
  //   201+     → active / growing
  const hiringFreezeScore =
    totalOpenings === 0   ? 0.85
    : totalOpenings <= 10  ? 0.65
    : totalOpenings <= 50  ? 0.40
    : totalOpenings <= 200 ? 0.25
    : 0.10;

  const demandTrend: string =
    totalOpenings === 0    ? "frozen"
    : totalOpenings > 50   ? "growing"
    : totalOpenings > 10   ? "stable"
    : "declining";

  return {
    estimatedOpenings: totalOpenings || null,
    naukriOpenings:    naukriCount || null,
    linkedinOpenings:  linkedinCount || null,
    hiringFreezeScore,
    demandTrend,
    isLive: true,
    serperRateLimited: false,
    fetchedAt: new Date().toISOString(),
  };
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { companyName, ticker, action, roleTitle } = await req.json();
    if (!action) return json({ error: "action required (stock|news|both|hiring)" }, 400);

    const newsKey   = Deno.env.get("NEWSAPI_KEY");
    const gnewsKey  = Deno.env.get("GNEWS_KEY");
    const fmpKey    = Deno.env.get("FMP_KEY");
    const serperKey = Deno.env.get("SERPER_API_KEY");

    // deno-lint-ignore no-explicit-any
    const result: { fetchedAt: string; errors: string[]; stockData?: any; newsData?: any; hiringData?: any; rateLimitFlags?: any } =
      { fetchedAt: new Date().toISOString(), errors: [] };

    // ── Stock signals: Yahoo Finance primary, FMP fallback ────────────────────
    if ((action === "stock" || action === "both")) {
      if (!ticker) {
        result.stockData = null;
        result.errors.push("No ticker provided for stock signals");
      } else {
        try {
          result.stockData = await getStockSignals(ticker);
          console.log(`[proxy] Yahoo Finance ✓ — ${ticker} 90d: ${result.stockData.price90DayChange}%`);
        } catch (yahooErr: any) {
          console.warn(`[proxy] Yahoo Finance failed (${yahooErr.message}) — trying FMP`);
          result.errors.push(`Yahoo Finance: ${yahooErr.message}`);
          if (fmpKey) {
            try {
              result.stockData = await getStockSignalsFMP(ticker, fmpKey);
              console.log(`[proxy] FMP ✓ — ${ticker}`);
            } catch (fmpErr: any) {
              result.errors.push(`FMP: ${fmpErr.message}`);
              result.stockData = null;
            }
          } else {
            result.stockData = null;
          }
        }
      }
    }

    // ── News signals: NewsAPI → GNews → Google RSS → Reddit ──────────────────
    if (action === "news" || action === "both") {
      if (!companyName) {
        result.newsData = null;
        result.errors.push("companyName required for news signals");
      } else {
        let newsData: any = null;

        // Source 1: NewsAPI
        if (newsKey) {
          try {
            newsData = await getNewsAPISignals(companyName, newsKey);
            console.log(`[proxy] NewsAPI ✓ — ${newsData.recentHeadlineCount} articles for "${companyName}"`);
          } catch (e: any) {
            result.errors.push(`NewsAPI: ${e.message}`);
            console.warn(`[proxy] NewsAPI failed: ${e.message}`);
          }
        }

        // Source 2: GNews (fallback or supplement if NewsAPI returned 0)
        if ((!newsData || newsData.recentHeadlineCount === 0) && gnewsKey) {
          try {
            newsData = await getGNewsSignals(companyName, gnewsKey);
            console.log(`[proxy] GNews ✓ — ${newsData.recentHeadlineCount} articles`);
          } catch (e: any) {
            result.errors.push(`GNews: ${e.message}`);
          }
        }

        // Source 3: Google News RSS (free, no key)
        if (!newsData || newsData.recentHeadlineCount === 0) {
          try {
            newsData = await getGoogleNewsRSS(companyName);
            console.log(`[proxy] Google News RSS ✓ — ${newsData.recentHeadlineCount} articles`);
          } catch (e: any) {
            result.errors.push(`Google RSS: ${e.message}`);
          }
        }

        // Source 4: Reddit r/layoffs (always run for supplemental signal)
        try {
          const reddit = await getRedditLayoffs(companyName);
          if (reddit.recentHeadlineCount > 0) {
            console.log(`[proxy] Reddit ✓ — ${reddit.recentHeadlineCount} posts`);
            // Merge reddit layoff event if newsData has none
            if (newsData && !newsData.latestLayoffEvent && reddit.latestLayoffEvent) {
              newsData.latestLayoffEvent = reddit.latestLayoffEvent;
            }
            // Add reddit headline count as supplemental signal
            if (newsData) {
              newsData.redditSignalCount = reddit.recentHeadlineCount;
            }
          }
        } catch (e: any) {
          // Reddit is optional — suppress errors
        }

        result.newsData = newsData ?? { recentHeadlineCount: 0, latestLayoffEvent: null, sentimentSignal: 0, articles: [], source: "none" };
      }
    }

    // ── Hiring signals: Serper (role-level demand at a specific company) ─────
    // action = 'hiring' is called by naukriConnector.ts to get live job-board counts.
    // Requires SERPER_API_KEY in Edge Function secrets. Without the key, returns
    // isLive: false so the caller falls back to static heuristics transparently.
    if (action === "hiring") {
      if (!serperKey) {
        result.hiringData = {
          isLive: false,
          estimatedOpenings: null,
          naukriOpenings: null,
          linkedinOpenings: null,
          hiringFreezeScore: 0.35,
          demandTrend: "stable",
          serperRateLimited: false,
          fetchedAt: new Date().toISOString(),
        };
        result.errors.push("SERPER_API_KEY not configured — hiring signal unavailable. Set in Edge Function secrets.");
      } else if (!roleTitle || !companyName) {
        result.hiringData = null;
        result.errors.push("roleTitle and companyName required for hiring signals");
      } else {
        try {
          const hiringResult = await getHiringSignals(roleTitle, companyName, serperKey);
          result.hiringData = hiringResult;
          console.log(`[proxy] Serper ✓ — "${roleTitle}" at "${companyName}": ${hiringResult.estimatedOpenings ?? 0} openings`);
        } catch (serperErr: unknown) {
          const msg = serperErr instanceof Error ? serperErr.message : String(serperErr);
          result.errors.push(`Serper: ${msg}`);
          const isRateLimited = msg.includes("429") || msg.toLowerCase().includes("rate limit");
          result.hiringData = {
            isLive:           false,
            estimatedOpenings: null,
            naukriOpenings:    null,
            linkedinOpenings:  null,
            hiringFreezeScore: 0.35,
            demandTrend:       "stable",
            serperRateLimited: isRateLimited,
            fetchedAt:         new Date().toISOString(),
          };
          console.warn(`[proxy] Serper failed: ${msg}`);
        }
      }
    }

    return json(result);
  } catch (err: any) {
    console.error("[proxy-live-signals] Fatal:", err);
    return json({ error: err.message }, 500);
  }
});
