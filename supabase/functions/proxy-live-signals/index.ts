// proxy-live-signals — scraping-first multi-source intelligence proxy.
// PRIORITY ORDER:
//   Stock:   Yahoo Finance (no key, unlimited) → FMP fallback
//   News:    Google RSS + Bing RSS + HN + Reddit (concurrent, no keys) → GNews → NewsAPI
//   Hiring:  Naukri public API + Bing job search (no keys) → Serper fallback
//   Scrape:  Career page + Wikipedia + Glassdoor + company homepage (no keys)
// APIs are BACKUP ONLY — system works fully without any API key configured.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

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

// ── Rotating user agents — cycle through real browsers to avoid fingerprinting ─
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
];

function randomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function stealthHeaders(referer?: string): Record<string, string> {
  return {
    "User-Agent": randomUA(),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,hi;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    ...(referer ? { "Referer": referer } : {}),
  };
}

// Yahoo Finance specific headers (require finance.yahoo.com referer)
const YAHOO_HEADERS = {
  "User-Agent": USER_AGENTS[0],
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Referer": "https://finance.yahoo.com/",
  "Origin": "https://finance.yahoo.com",
};

// ── Retry with exponential backoff + jitter ───────────────────────────────────
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 2,
  baseDelayMs = 300,
): Promise<Response> {
  let lastErr: Error = new Error("fetch failed");
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.status === 429 && attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 200;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      return res;
    } catch (e: unknown) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 200;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastErr;
}

// ── STOCK: Yahoo Finance crumb auth ───────────────────────────────────────────
// Crumb persisted in Supabase edge_crumb_cache table (20-min TTL)
// so all isolates share the same crumb even across cold starts.

interface YahooCrumb { crumb: string; cookies: string }

let _crumbCache: YahooCrumb | null = null;
let _crumbFetchedAt = 0;
const CRUMB_TTL_MS = 20 * 60 * 1000;
const CRUMB_CACHE_KEY = "yahoo_finance_crumb";

async function loadCrumbFromDb(): Promise<YahooCrumb | null> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !supabaseKey) return null;
    const sb = createClient(supabaseUrl, supabaseKey);
    const { data } = await sb
      .from("edge_crumb_cache")
      .select("value, cookies, expires_at")
      .eq("key", CRUMB_CACHE_KEY)
      .maybeSingle();
    if (!data) return null;
    if (new Date(data.expires_at).getTime() < Date.now()) return null;
    return { crumb: data.value, cookies: data.cookies ?? "" };
  } catch { return null; }
}

async function saveCrumbToDb(crumb: YahooCrumb): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !supabaseKey) return;
    const sb = createClient(supabaseUrl, supabaseKey);
    const expiresAt = new Date(Date.now() + CRUMB_TTL_MS).toISOString();
    await sb.from("edge_crumb_cache").upsert({
      key: CRUMB_CACHE_KEY, value: crumb.crumb, cookies: crumb.cookies,
      fetched_at: new Date().toISOString(), expires_at: expiresAt,
    }, { onConflict: "key" });
  } catch { /* non-fatal */ }
}

async function getYahooCrumb(): Promise<YahooCrumb> {
  const now = Date.now();
  if (_crumbCache && now - _crumbFetchedAt < CRUMB_TTL_MS) return _crumbCache;
  const dbCrumb = await loadCrumbFromDb();
  if (dbCrumb) { _crumbCache = dbCrumb; _crumbFetchedAt = now; return dbCrumb; }
  try {
    const consentRes = await fetch("https://guce.yahoo.com/consent?sessionId=1&lang=en-US&inline=false", {
      headers: YAHOO_HEADERS, redirect: "manual", signal: AbortSignal.timeout(6_000),
    });
    const rawCookies = consentRes.headers.get("set-cookie") ?? "";
    const cookieStr = rawCookies.split(",").map((s) => s.split(";")[0].trim()).join("; ");
    const crumbRes = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", {
      headers: { ...YAHOO_HEADERS, "Cookie": cookieStr }, signal: AbortSignal.timeout(6_000),
    });
    if (crumbRes.ok) {
      const crumb = await crumbRes.text();
      if (crumb && !crumb.startsWith("{")) {
        const result: YahooCrumb = { crumb: crumb.trim(), cookies: cookieStr };
        _crumbCache = result; _crumbFetchedAt = now;
        await saveCrumbToDb(result);
        return result;
      }
    }
  } catch { /* fall through */ }
  const crumbRes2 = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", {
    headers: YAHOO_HEADERS, signal: AbortSignal.timeout(6_000),
  });
  if (!crumbRes2.ok) throw new Error(`Yahoo crumb HTTP ${crumbRes2.status}`);
  const crumb2 = await crumbRes2.text();
  if (!crumb2 || crumb2.startsWith("{")) throw new Error("Yahoo crumb: all strategies failed");
  const result2: YahooCrumb = { crumb: crumb2.trim(), cookies: "" };
  _crumbCache = result2; _crumbFetchedAt = now;
  await saveCrumbToDb(result2);
  return result2;
}

async function getYahooSummary(ticker: string): Promise<Record<string, unknown> | null> {
  try {
    const { crumb, cookies } = await getYahooCrumb();
    const modules = "financialData,defaultKeyStatistics,summaryDetail,assetProfile";
    const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=${modules}&formatted=false&crumb=${encodeURIComponent(crumb)}`;
    const headers: Record<string, string> = { ...YAHOO_HEADERS };
    if (cookies) headers["Cookie"] = cookies;
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`Yahoo summary HTTP ${res.status}`);
    const data = await res.json() as Record<string, unknown>;
    if ((data?.quoteSummary as Record<string, unknown>)?.error) throw new Error("Yahoo summary error");
    return ((data?.quoteSummary as Record<string, unknown>)?.result as unknown[])?.[0] as Record<string, unknown> ?? null;
  } catch (_e: unknown) {
    console.warn(`[proxy] Yahoo summary unavailable — continuing with chart-only data`);
    return null;
  }
}

async function getYahooChart(ticker: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=3mo`;
  const res = await fetch(url, { headers: YAHOO_HEADERS, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`Yahoo chart HTTP ${res.status}`);
  const data = await res.json() as Record<string, unknown>;
  const result = (data?.chart as Record<string, unknown>)?.result as unknown[];
  if (!result?.[0]) throw new Error("Yahoo chart: no data returned");
  return result[0] as Record<string, unknown>;
}

async function getStockSignals(ticker: string) {
  const [chart, summary] = await Promise.all([
    getYahooChart(ticker),
    getYahooSummary(ticker).catch(() => null),
  ]);
  const closes = ((chart.indicators as Record<string, unknown>)?.quote as Record<string, unknown>[])?.[0]?.close as number[] ?? [];
  const validCloses = closes.filter((v) => v != null);
  let price90DayChange: number | null = null;
  if (validCloses.length >= 2) {
    const oldest = validCloses[0], newest = validCloses[validCloses.length - 1];
    if (oldest > 0) price90DayChange = Math.round(((newest - oldest) / oldest) * 1000) / 10;
  }
  const fin = (summary?.financialData ?? {}) as Record<string, unknown>;
  const stats = (summary?.defaultKeyStatistics ?? {}) as Record<string, unknown>;
  const profile = (summary?.assetProfile ?? {}) as Record<string, unknown>;
  const revenueGrowthRaw = (fin.revenueGrowth as Record<string, unknown>)?.raw ?? fin.revenueGrowth ?? null;
  const revenueGrowthYoY = revenueGrowthRaw != null ? Math.round((revenueGrowthRaw as number) * 100) : null;
  const employeeCount = (profile.fullTimeEmployees as number) ?? null;
  const marketCap = (stats.marketCap as Record<string, unknown>)?.raw ?? stats.marketCap ?? (chart.meta as Record<string, unknown>)?.marketCap ?? null;
  const forwardPE = (fin.forwardPE as Record<string, unknown>)?.raw ?? fin.forwardPE ?? null;
  const currentPrice = (fin.currentPrice as Record<string, unknown>)?.raw ?? fin.currentPrice ?? (chart.meta as Record<string, unknown>)?.regularMarketPrice ?? null;
  const targetPrice = (fin.targetMeanPrice as Record<string, unknown>)?.raw ?? fin.targetMeanPrice ?? null;
  const analystRecommendation = fin.recommendationKey ?? null;
  const debtToEquity = (fin.debtToEquity as Record<string, unknown>)?.raw ?? fin.debtToEquity ?? null;
  const totalRevenue = (fin.totalRevenue as Record<string, unknown>)?.raw ?? fin.totalRevenue ?? null;
  const revenuePerEmployee = (totalRevenue && employeeCount) ? Math.round((totalRevenue as number) / (employeeCount as number)) : null;
  return {
    price90DayChange, revenueGrowthYoY, marketCap, forwardPE, employeeCount,
    currentPrice, targetPrice, analystRecommendation, debtToEquity,
    revenuePerEmployee, source: "yahoo-finance",
  };
}

async function getStockSignalsFMP(ticker: string, fmpKey: string) {
  const [quoteRes, profileRes] = await Promise.all([
    fetch(`https://financialmodelingprep.com/api/v3/quote/${ticker}?apikey=${fmpKey}`, { signal: AbortSignal.timeout(8_000) }),
    fetch(`https://financialmodelingprep.com/api/v3/profile/${ticker}?apikey=${fmpKey}`, { signal: AbortSignal.timeout(8_000) }),
  ]);
  if (!quoteRes.ok) throw new Error(`FMP quote HTTP ${quoteRes.status}`);
  const quotes = await quoteRes.json() as Record<string, unknown>[];
  const profiles = profileRes.ok ? await profileRes.json() as Record<string, unknown>[] : [];
  const q = Array.isArray(quotes) ? quotes[0] : null;
  const p = Array.isArray(profiles) ? profiles[0] : null;
  if (!q) throw new Error("FMP: empty quote response");
  return {
    price90DayChange: (q.changesPercentage as number) ?? null,
    revenueGrowthYoY: null,
    marketCap: (q.marketCap as number) ?? null,
    employeeCount: (p?.fullTimeEmployees as number) ?? null,
    currentPrice: (q.price as number) ?? null,
    analystRecommendation: null,
    source: "fmp",
  };
}

// ── SHARED: Company word-boundary matcher ─────────────────────────────────────
function companyWordBoundaryMatch(text: string, companyLower: string): boolean {
  const escaped = companyLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(?<![a-z0-9-])${escaped}(?![a-z0-9-])`, "i");
  return re.test(text);
}

// R15 fix: alias expansion for canonical company names. The strict word-boundary
// match drops articles that use a short alias (e.g. "TCS" instead of "Tata
// Consultancy Services") or vice versa. Returning the full set of aliases lets
// `articleMatchesCompany` accept any of them. Aliases are intentionally short
// and high-precision — common-word aliases (e.g. "Apple" → "AAPL") are skipped.
// v32: expanded alias graph — includes subsidiaries so a search for "Infosys"
// also catches news about "Infosys BPM" or "EdgeVerve", and a search for
// "Alphabet" catches news about "Google", "YouTube", "Waymo", "DeepMind".
const COMPANY_ALIASES: Record<string, string[]> = {
  // ── India IT Services ──
  "tata consultancy services":           ["tcs", "tata consultancy", "tata cs"],
  "tcs":                                  ["tata consultancy services", "tata consultancy"],
  "infosys":                              ["infy", "infosys limited", "infosys ltd", "infosys bpm", "edgeverve"],
  "infosys bpm":                          ["infosys", "infosys business process management"],
  "wipro":                                ["wit", "wipro limited", "wipro ltd"],
  "hcl technologies":                     ["hcl", "hcltech", "hcl tech"],
  "tech mahindra":                        ["techm", "tech m"],
  "ltimindtree":                          ["ltim", "lti mindtree", "lti", "mindtree"],

  // ── US Big Tech + subsidiaries ──
  "oracle":                               ["oracle corporation", "oracle corp", "orcl", "oracle india", "netsuite"],
  "oracle india":                         ["oracle", "oracle corporation"],
  "alphabet":                             ["google", "googl", "goog", "youtube", "waymo", "deepmind", "alphabet inc"],
  "google":                               ["alphabet", "googl", "youtube", "google llc", "google inc"],
  "youtube":                              ["google", "alphabet", "youtube llc"],
  "meta":                                 ["facebook", "fb", "instagram", "whatsapp", "meta platforms"],
  "facebook":                             ["meta", "meta platforms", "instagram"],
  "instagram":                            ["meta", "facebook"],
  "microsoft":                            ["msft", "linkedin", "github", "microsoft corporation"],
  "linkedin":                             ["microsoft", "linkedin corporation"],
  "github":                               ["microsoft", "github inc"],
  "amazon":                               ["amzn", "aws", "amazon web services", "amazon.com", "twitch"],
  "twitch":                               ["amazon", "amazon.com"],
  "apple":                                ["aapl", "apple inc"],
  "netflix":                              ["nflx"],
  "nvidia":                               ["nvda"],
  "intel":                                ["intc", "intel corporation"],
  "amd":                                  ["advanced micro devices"],
  "tesla":                                ["tsla"],

  // ── IT Services (global) ──
  "international business machines":      ["ibm", "red hat", "ibm corporation"],
  "ibm":                                  ["international business machines", "red hat"],
  "red hat":                              ["ibm", "redhat"],
  "cognizant":                            ["cognizant technology solutions", "ctsh"],
  "accenture":                            ["accenture plc", "acn"],
  "capgemini":                            ["capgemini se", "capg"],
  "salesforce":                           ["salesforce.com", "crm", "slack", "tableau", "mulesoft"],
  "slack":                                ["salesforce"],
  "block":                                ["square", "block inc", "cash app"],
  "alphabet inc":                         ["google", "googl", "youtube"],

  // ── India banking / conglomerate ──
  "reliance industries":                  ["reliance", "ril", "jio", "reliance jio"],
  "jio":                                  ["reliance", "reliance industries", "reliance jio"],
  "bharti airtel":                        ["airtel"],
  "icici bank":                           ["icici"],
  "hdfc bank":                            ["hdfc"],
  "state bank of india":                  ["sbi", "state bank"],
  "kotak mahindra bank":                  ["kotak", "kotak mahindra"],
  "axis bank":                            ["axis"],
  "tata group":                           ["tata", "tata sons", "tata consultancy services", "tcs"],
};

function aliasesForCompany(companyLower: string): string[] {
  const canonical = companyLower.trim();
  const direct = COMPANY_ALIASES[canonical] ?? [];
  // Also expand if the query IS an alias of a canonical name
  const reverse: string[] = [];
  for (const [k, aliases] of Object.entries(COMPANY_ALIASES)) {
    if (aliases.includes(canonical)) reverse.push(k);
  }
  // Dedupe and exclude the query itself
  return Array.from(new Set([...direct, ...reverse])).filter(a => a !== canonical && a.length >= 2);
}

function articleMatchesCompany(a: Record<string, unknown>, companyLower: string): boolean {
  const title = ((a.title as string) || "").toLowerCase();
  const desc = ((a.description as string) || "").toLowerCase();
  // Primary: word-boundary match on canonical name
  if (companyWordBoundaryMatch(title, companyLower)) return true;
  if (companyWordBoundaryMatch(desc, companyLower) && LAYOFF_KEYWORDS.some((kw) => desc.includes(kw))) return true;
  // Secondary: try aliases. Only accept a layoff-keyword in title for short
  // aliases (≤4 chars) to prevent "fb is at it again" type false positives.
  for (const alias of aliasesForCompany(companyLower)) {
    const aliasIsShort = alias.length <= 4;
    if (companyWordBoundaryMatch(title, alias)) {
      if (!aliasIsShort) return true;
      if (LAYOFF_KEYWORDS.some(kw => title.includes(kw))) return true;
    }
    if (companyWordBoundaryMatch(desc, alias) && LAYOFF_KEYWORDS.some((kw) => desc.includes(kw))) return true;
  }
  return false;
}

const LAYOFF_KEYWORDS = ["layoff", "job cut", "workforce reduction", "restructuring", "headcount", "redundan", "retrench", "firing", "downsizing", "let go", "pink slip"];

function parseArticles(articles: Record<string, unknown>[], companyName: string, source: string) {
  let latestLayoffEvent: Record<string, unknown> | null = null;
  for (const a of articles) {
    const title = ((a.title as string) || "").toLowerCase();
    const combined = title + " " + ((a.description as string) || "").toLowerCase();
    if (LAYOFF_KEYWORDS.some((kw) => combined.includes(kw))) {
      const pctMatch = ((a.title as string) + " " + ((a.description as string) || "")).match(/(\d+(?:\.\d+)?)\s*%/);
      latestLayoffEvent = {
        companyName, date: ((a.publishedAt as string) ?? "").slice(0, 10),
        headline: a.title, percentCut: pctMatch ? parseFloat(pctMatch[1]) : null,
        source: (a.source as Record<string, unknown>)?.name ?? source, url: a.url ?? "",
      };
      break;
    }
  }
  return {
    latestLayoffEvent, recentHeadlineCount: articles.length,
    sentimentSignal: Math.min(1, articles.length / 5),
    source,
    articles: articles.slice(0, 5).map((a) => ({
      headline: a.title, date: ((a.publishedAt as string) ?? "").slice(0, 10),
      source: (a.source as Record<string, unknown>)?.name ?? source, url: a.url ?? "",
    })),
    fetchedAt: new Date().toISOString(),
  };
}

// ── NEWS SOURCE 1 (PRIMARY): Google News RSS — no key, unlimited ──────────────
async function getGoogleNewsRSS(companyName: string) {
  const query = encodeURIComponent(`"${companyName}" layoff OR "job cuts" OR restructuring OR retrenchment`);
  const url = `https://news.google.com/rss/search?q=${query}&hl=en&gl=US&ceid=US:en`;
  const res = await fetchWithRetry(url, {
    headers: stealthHeaders("https://news.google.com/"),
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`Google News RSS HTTP ${res.status}`);
  const xml = await res.text();
  const items: Record<string, unknown>[] = [];
  const companyLower = companyName.toLowerCase();
  for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const block = match[1];
    const title = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ?? block.match(/<title>(.*?)<\/title>/)?.[1] ?? "";
    const desc = (block.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1] ?? "").replace(/<[^>]+>/g, "");
    const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1];
    const link = block.match(/<link>(.*?)<\/link>/)?.[1] ?? "";
    const srcName = block.match(/<source[^>]*>(.*?)<\/source>/)?.[1]?.trim() ?? "Google News";
    if (!articleMatchesCompany({ title, description: desc }, companyLower)) continue;
    items.push({ title, description: desc, publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(), url: link, source: { name: srcName } });
    if (items.length >= 10) break;
  }
  return parseArticles(items, companyName, "google-news-rss");
}

// ── NEWS SOURCE 2 (PRIMARY): Bing News RSS — no key, unlimited ───────────────
async function getBingNewsRSS(companyName: string) {
  const query = encodeURIComponent(`"${companyName}" layoff OR retrenchment OR "job cuts" OR restructuring`);
  const url = `https://www.bing.com/news/search?q=${query}&format=rss&setlang=en`;
  const res = await fetchWithRetry(url, {
    headers: stealthHeaders("https://www.bing.com/"),
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`Bing News RSS HTTP ${res.status}`);
  const xml = await res.text();
  const items: Record<string, unknown>[] = [];
  const companyLower = companyName.toLowerCase();
  for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const block = match[1];
    const title = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ?? block.match(/<title>(.*?)<\/title>/)?.[1] ?? "";
    const desc = (block.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1] ?? block.match(/<description>(.*?)<\/description>/)?.[1] ?? "").replace(/<[^>]+>/g, "");
    const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1];
    const link = block.match(/<link>(.*?)<\/link>/)?.[1] ?? "";
    const srcName = block.match(/<News:Source>(.*?)<\/News:Source>/)?.[1]?.trim() ?? "Bing News";
    if (!articleMatchesCompany({ title, description: desc }, companyLower)) continue;
    items.push({ title, description: desc, publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(), url: link, source: { name: srcName } });
    if (items.length >= 10) break;
  }
  return parseArticles(items, companyName, "bing-news-rss");
}

// ── NEWS SOURCE 3 (PRIMARY): Hacker News Algolia — no key, unlimited ─────────
async function getHackerNewsSignals(companyName: string) {
  const query = encodeURIComponent(`${companyName} layoff`);
  const url = `https://hn.algolia.com/api/v1/search?query=${query}&tags=story&hitsPerPage=10&numericFilters=created_at_i%3E${Math.floor(Date.now() / 1000) - 30 * 86400}`;
  const res = await fetchWithRetry(url, {
    headers: { "User-Agent": "HumanProof-Intelligence/1.0" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`HN Algolia HTTP ${res.status}`);
  const data = await res.json() as Record<string, unknown>;
  const hits = (data.hits as Record<string, unknown>[]) ?? [];
  const companyLower = companyName.toLowerCase();
  const articles = hits
    .filter((h) => {
      const t = ((h.title as string) || "").toLowerCase();
      return companyWordBoundaryMatch(t, companyLower) && LAYOFF_KEYWORDS.some((kw) => t.includes(kw));
    })
    .map((h) => ({
      title: h.title, description: (h.story_text as string)?.slice(0, 300) ?? "",
      publishedAt: new Date((h.created_at_i as number) * 1000).toISOString(),
      url: h.url ?? `https://news.ycombinator.com/item?id=${h.objectID}`,
      source: { name: "Hacker News" },
    }));
  return parseArticles(articles, companyName, "hackernews");
}

// ── NEWS SOURCE 4 (PRIMARY): Reddit r/layoffs + r/cscareerquestions ──────────
async function getRedditSignals(companyName: string) {
  const companyLower = companyName.toLowerCase();
  if (companyLower.length < 4) return parseArticles([], companyName, "reddit");
  const subreddits = ["layoffs", "cscareerquestions", "india", "IndiaJobs"];
  const query = encodeURIComponent(companyName);
  const allPosts: Record<string, unknown>[] = [];
  await Promise.allSettled(
    subreddits.map(async (sr) => {
      try {
        const url = `https://www.reddit.com/r/${sr}/search.json?q=${query}&sort=new&limit=5&restrict_sr=1`;
        const res = await fetchWithRetry(url, {
          headers: { "User-Agent": "HumanProof-Intelligence/1.0 (contact@humanproof.ai)" },
          signal: AbortSignal.timeout(6_000),
        });
        if (!res.ok) return;
        const data = await res.json() as Record<string, unknown>;
        const posts = ((data?.data as Record<string, unknown>)?.children as Record<string, unknown>[]) ?? [];
        for (const p of posts) {
          const pd = p.data as Record<string, unknown>;
          if (companyWordBoundaryMatch((pd?.title as string) || "", companyLower)) {
            allPosts.push({
              title: pd.title, description: ((pd.selftext as string) || "").slice(0, 300),
              publishedAt: new Date((pd.created_utc as number) * 1000).toISOString(),
              url: `https://reddit.com${pd.permalink}`, source: { name: `Reddit r/${sr}` },
            });
          }
        }
      } catch { /* non-fatal */ }
    }),
  );
  return parseArticles(allPosts, companyName, "reddit");
}

// ── NEWS SOURCE 5 (BACKUP): GNews API — 100 req/day ──────────────────────────
async function getGNewsSignals(companyName: string, gnewsKey: string) {
  const query = encodeURIComponent(`"${companyName}" layoff`);
  const url = `https://gnews.io/api/v4/search?q=${query}&lang=en&max=10&sortby=publishedAt&apikey=${gnewsKey}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
  if (!res.ok) throw new Error(`GNews HTTP ${res.status}`);
  const data = await res.json() as Record<string, unknown>;
  if (!Array.isArray(data.articles)) throw new Error("GNews: unexpected response shape");
  const companyLower = companyName.toLowerCase();
  const normalized = (data.articles as Record<string, unknown>[]).map((a) => ({
    title: a.title, description: a.description, publishedAt: a.publishedAt,
    url: a.url, source: { name: (a.source as Record<string, unknown>)?.name },
  }));
  return parseArticles(normalized.filter((a) => articleMatchesCompany(a, companyLower)), companyName, "gnews");
}

// ── NEWS SOURCE 6 (BACKUP): NewsAPI — 100 req/day key required ───────────────
async function getNewsAPISignals(companyName: string, newsKey: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const from = thirtyDaysAgo.toISOString().split("T")[0];
  const query = encodeURIComponent(`"${companyName}" layoff OR "job cuts" OR restructuring`);
  const url = `https://newsapi.org/v2/everything?q=${query}&from=${from}&sortBy=publishedAt&language=en&pageSize=20&apiKey=${newsKey}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(9_000) });
  if (!res.ok) throw new Error(`NewsAPI HTTP ${res.status}`);
  const data = await res.json() as Record<string, unknown>;
  if (data.status !== "ok") throw new Error((data.message as string) || "NewsAPI error");
  const companyLower = companyName.toLowerCase();
  const articles = ((data.articles as Record<string, unknown>[]) || []).filter((a) => articleMatchesCompany(a, companyLower));
  return parseArticles(articles, companyName, "newsapi");
}

// ── Merge multiple news results — deduplicate by URL + title fingerprint ──────
function mergeNewsResults(results: ReturnType<typeof parseArticles>[]): ReturnType<typeof parseArticles> {
  const seenUrls = new Set<string>();
  const seenFingerprints = new Set<string>();
  const merged: Record<string, unknown>[] = [];
  let latestLayoffEvent: Record<string, unknown> | null = null;
  for (const r of results) {
    for (const a of r.articles) {
      const url = (a as Record<string, unknown>).url as string;
      const fp = ((a as Record<string, unknown>).headline as string || "").toLowerCase().split(" ").slice(0, 5).join("-");
      if (url && seenUrls.has(url)) continue;
      if (fp && seenFingerprints.has(fp)) continue;
      if (url) seenUrls.add(url);
      if (fp) seenFingerprints.add(fp);
      merged.push(a as Record<string, unknown>);
    }
    if (!latestLayoffEvent && r.latestLayoffEvent) latestLayoffEvent = r.latestLayoffEvent as Record<string, unknown>;
  }
  const totalArticles = merged.length;
  return {
    latestLayoffEvent, recentHeadlineCount: totalArticles,
    sentimentSignal: Math.min(1, totalArticles / 5),
    source: results.map((r) => r.source).join("+"),
    // deno-lint-ignore no-explicit-any
    articles: merged.slice(0, 8) as any[],
    fetchedAt: new Date().toISOString(),
  };
}

// ── HIRING SOURCE 1 (PRIMARY): Naukri public API — no key ────────────────────
// Naukri exposes a public job search endpoint (server-rendered JSON).
// No API key required — accessed from Edge Function (no CORS).
async function getNaukriJobCount(roleTitle: string, companyName: string): Promise<number | null> {
  try {
    const keyword = encodeURIComponent(roleTitle);
    const company = encodeURIComponent(companyName);
    const url = `https://www.naukri.com/jobapi/v3/search?noOfResults=5&urlType=search_by_keyword&searchType=adv&keyword=${keyword}&companyName=${company}&jobAge=30`;
    const res = await fetchWithRetry(url, {
      headers: {
        ...stealthHeaders("https://www.naukri.com/"),
        "appid": "109",
        "systemid": "Naukri",
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const data = await res.json() as Record<string, unknown>;
    return (data.noOfJobs as number) ?? (data.total as number) ?? null;
  } catch { return null; }
}

// R16 fix: Bing job-count parser disabled. Bing removed the "About X results"
// span (~2024) and the organic-result count was a noisy upper bound of 3–10.
// The previous wiring inflated hiring-freeze signals (counts of 0–3 mark
// companies as "frozen" even when LinkedIn shows 200+ live openings). The
// function now returns null so the downstream orchestrator falls back to
// Naukri direct + Indeed direct (and, when configured, Serper) instead.
function getBingJobCount(_roleTitle: string, _companyName: string, _board: "linkedin" | "indeed"): Promise<number | null> {
  return Promise.resolve(null);
}

// ── HIRING SOURCE 3 (PRIMARY): Indeed job count via HTML scraping ─────────────
async function getIndeedJobCount(roleTitle: string, companyName: string): Promise<number | null> {
  try {
    const q = encodeURIComponent(`${roleTitle} ${companyName}`);
    const url = `https://www.indeed.com/jobs?q=${q}&from=searchOnDesktop`;
    const res = await fetchWithRetry(url, {
      headers: stealthHeaders("https://www.indeed.com/"),
      signal: AbortSignal.timeout(9_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    // Indeed places job count in a <div data-testid="searchCountPages"> or as text "XXX jobs"
    const countMatch = html.match(/(\d[\d,]+)\s+jobs?/i) ?? html.match(/"totalResults"\s*:\s*(\d+)/);
    if (countMatch) return parseInt(countMatch[1].replace(/,/g, ""), 10);
    return null;
  } catch { return null; }
}

// ── HIRING SOURCE 4 (BACKUP): Serper API ─────────────────────────────────────
function parseJobCount(data: Record<string, unknown>): number {
  const sp = data?.searchParameters as Record<string, unknown> | undefined;
  const total = sp?.totalResults;
  if (typeof total === "number" && total > 0) return total;
  if (typeof total === "string") {
    const parsed = parseInt((total as string).replace(/,/g, ""), 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  const organic = Array.isArray(data?.organic) ? (data.organic as Record<string, unknown>[]) : [];
  for (const item of organic.slice(0, 5)) {
    const text = `${item?.snippet ?? ""} ${item?.title ?? ""}`;
    const m = text.match(/(\d[\d,]*)\s+(?:jobs?|openings?|positions?|vacancies)/i);
    if (m) { const n = parseInt(m[1].replace(/,/g, ""), 10); if (!isNaN(n) && n > 0) return n; }
  }
  return organic.filter((r) => /jobs?|openings?|hiring|career|vacancies/i.test(String(r?.title ?? ""))).length;
}

async function getSerperJobCounts(roleTitle: string, companyName: string, serperKey: string) {
  const queries = [`site:naukri.com "${roleTitle}" "${companyName}"`, `site:linkedin.com/jobs "${roleTitle}" "${companyName}"`];
  let naukriCount = 0, linkedinCount = 0;
  for (const q of queries) {
    try {
      const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: { "X-API-KEY": serperKey, "Content-Type": "application/json" },
        body: JSON.stringify({ q, num: 10, gl: "in", hl: "en" }),
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) { if (res.status === 429) throw new Error("Serper 429"); throw new Error(`Serper HTTP ${res.status}`); }
      const data = await res.json() as Record<string, unknown>;
      const count = parseJobCount(data);
      if (q.includes("naukri.com")) naukriCount = count;
      if (q.includes("linkedin.com")) linkedinCount = count;
    } catch (e: unknown) { throw e; }
  }
  return { naukriCount, linkedinCount };
}

// ── HIRING: Orchestrated scraping-first signal ────────────────────────────────
async function getHiringSignals(roleTitle: string, companyName: string, serperKey: string | undefined) {
  // Run all scraping sources concurrently — no API key needed for primary sources
  const [naukriDirect, bingLinkedIn, bingIndeed, indeedDirect] = await Promise.allSettled([
    getNaukriJobCount(roleTitle, companyName),
    getBingJobCount(roleTitle, companyName, "linkedin"),
    getBingJobCount(roleTitle, companyName, "indeed"),
    getIndeedJobCount(roleTitle, companyName),
  ]);

  const naukriCount = naukriDirect.status === "fulfilled" ? (naukriDirect.value ?? 0) : 0;
  const linkedinCount = bingLinkedIn.status === "fulfilled" ? (bingLinkedIn.value ?? 0) : 0;
  const indeedBingCount = bingIndeed.status === "fulfilled" ? (bingIndeed.value ?? 0) : 0;
  const indeedDirectCount = indeedDirect.status === "fulfilled" ? (indeedDirect.value ?? 0) : 0;

  // Combine LinkedIn + Indeed + Naukri counts (each capped to avoid inflation)
  const indeedBest = Math.max(indeedBingCount, indeedDirectCount);
  let totalOpenings = Math.min(naukriCount, 500) + Math.min(linkedinCount, 500) + Math.min(indeedBest, 500);
  let isLive = naukriCount > 0 || linkedinCount > 0 || indeedBest > 0;
  let scrapeSource = "naukri+linkedin+indeed";

  // Fallback to Serper if scraping returned nothing AND key is available
  if (!isLive && serperKey) {
    try {
      const serper = await getSerperJobCounts(roleTitle, companyName, serperKey);
      totalOpenings = serper.naukriCount + serper.linkedinCount;
      isLive = totalOpenings > 0;
      scrapeSource = "serper";
    } catch { /* non-fatal */ }
  }

  const hiringFreezeScore =
    totalOpenings === 0   ? 0.85
    : totalOpenings <= 10  ? 0.65
    : totalOpenings <= 50  ? 0.40
    : totalOpenings <= 200 ? 0.25
    : 0.10;

  const demandTrend =
    totalOpenings === 0   ? "frozen"
    : totalOpenings > 50  ? "growing"
    : totalOpenings > 10  ? "stable"
    : "declining";

  return {
    estimatedOpenings: totalOpenings || null,
    naukriOpenings: naukriCount || null,
    linkedinOpenings: linkedinCount || null,
    indeedOpenings: indeedBest || null,
    hiringFreezeScore,
    demandTrend,
    isLive,
    scrapeSource,
    serperRateLimited: false,
    fetchedAt: new Date().toISOString(),
  };
}

// ── SCRAPE: Career page + Wikipedia + Glassdoor company intelligence ──────────
// Known career page URL patterns for major companies.
const CAREER_PAGE_PATTERNS: Record<string, string> = {
  google: "https://careers.google.com/", alphabet: "https://careers.google.com/",
  microsoft: "https://careers.microsoft.com/", apple: "https://jobs.apple.com/",
  meta: "https://www.metacareers.com/", facebook: "https://www.metacareers.com/",
  amazon: "https://www.amazon.jobs/", netflix: "https://jobs.netflix.com/",
  tesla: "https://www.tesla.com/careers/", nvidia: "https://www.nvidia.com/en-us/about-nvidia/careers/",
  salesforce: "https://careers.salesforce.com/", oracle: "https://careers.oracle.com/",
  ibm: "https://www.ibm.com/employment/", intel: "https://jobs.intel.com/",
  uber: "https://www.uber.com/us/en/careers/", airbnb: "https://careers.airbnb.com/",
  shopify: "https://www.shopify.com/careers", adobe: "https://careers.adobe.com/",
  twitter: "https://careers.twitter.com/", infosys: "https://career.infosys.com/",
  wipro: "https://careers.wipro.com/", tcs: "https://ibegin.tcs.com/",
  "tata consultancy": "https://ibegin.tcs.com/", hcl: "https://www.hcltech.com/careers",
  "tech mahindra": "https://careers.techmahindra.com/",
  cognizant: "https://careers.cognizant.com/", accenture: "https://www.accenture.com/in-en/careers",
};

async function scrapeCareerPage(companyName: string): Promise<{ hiringActive: boolean; jobCount: number | null; signals: string[] }> {
  const lower = companyName.toLowerCase();
  const careerUrl = CAREER_PAGE_PATTERNS[lower] ?? `https://www.${lower.replace(/\s+/g, "")}.com/careers`;
  try {
    const res = await fetchWithRetry(careerUrl, {
      headers: stealthHeaders(careerUrl),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return { hiringActive: true, jobCount: null, signals: [] };
    const html = await res.text();
    // Extract job count from common patterns
    const countMatch = html.match(/(\d[\d,]+)\s+(?:jobs?|positions?|openings?|roles?|opportunities)/i);
    const jobCount = countMatch ? parseInt(countMatch[1].replace(/,/g, ""), 10) : null;
    // Detect hiring freeze indicators
    const lowerHtml = html.toLowerCase();
    const signals: string[] = [];
    if (lowerHtml.includes("hiring freeze") || lowerHtml.includes("not accepting")) signals.push("freeze_detected");
    if (lowerHtml.includes("no open positions") || lowerHtml.includes("no current openings")) signals.push("no_openings");
    if (jobCount !== null && jobCount < 5) signals.push("very_low_postings");
    const hiringActive = signals.length === 0 && (jobCount === null || jobCount >= 5);
    return { hiringActive, jobCount, signals };
  } catch {
    return { hiringActive: true, jobCount: null, signals: [] };
  }
}

// v32: structured infobox parser. Handles {{nowrap|601,546}}, {{plainlist|*N}},
// {{official_website}}, [[approximately]] N, year-suffixed values like
// `601,546 (March 2024)`, and multi-line infobox fields. Picks the LARGEST
// plausible candidate (10 ≤ N ≤ 5M) inside the num_employees field block.
function extractWikipediaInfoboxField(content: string, fieldNames: string[]): number | null {
  for (const field of fieldNames) {
    // Match field block: `| field_name = ...` up to the next infobox row or end of infobox.
    // Wikitext allows multi-line values; we keep scanning until we hit a new `|` at line start.
    const fieldRe = new RegExp(
      `\\|\\s*${field}\\s*=([^\\n|]+(?:\\n(?![|\\s*}}])[^\\n|]+)*)`,
      'i',
    );
    const m = content.match(fieldRe);
    if (!m) continue;
    const body = m[1];
    const candidates: number[] = [];
    const numericRe = /(\d{1,3}(?:,\d{3})+|\d{2,7})/g;
    let nm: RegExpExecArray | null;
    while ((nm = numericRe.exec(body)) !== null) {
      const raw = nm[1].replace(/[^\d]/g, '');
      const n = parseInt(raw, 10);
      if (!Number.isFinite(n) || n < 10 || n > 5_000_000) continue;
      // Skip 4-digit years adjacent to year markers (e.g. "(2024)" suffixes).
      if (n >= 1900 && n <= 2099) {
        const ctx = body.slice(Math.max(0, nm.index - 4), Math.min(body.length, nm.index + raw.length + 8));
        if (/\b(20\d{2}|19\d{2})\b/.test(ctx) && !/(employees?|staff|headcount|workforce)/i.test(ctx)) continue;
      }
      candidates.push(n);
    }
    if (candidates.length > 0) return Math.max(...candidates);
  }
  return null;
}

async function scrapeWikipediaEmployeeCount(companyName: string): Promise<number | null> {
  try {
    // Wikipedia API — free, high reliability
    const q = encodeURIComponent(companyName);
    const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${q}&prop=revisions&rvprop=content&format=json&formatversion=2&redirects=1&rvslots=main`;
    const res = await fetchWithRetry(url, {
      headers: { "User-Agent": "HumanProof-Intelligence/1.0 (contact@humanproof.ai)" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const data = await res.json() as Record<string, unknown>;
    const pages = ((data.query as Record<string, unknown>)?.pages as Record<string, unknown>[]) ?? [];
    const revision = (pages[0]?.revisions as Record<string, unknown>[])?.[0] ?? {};
    const slots = (revision.slots as Record<string, unknown>) ?? {};
    const mainSlot = (slots.main as Record<string, unknown>) ?? {};
    const content = (mainSlot.content as string) ?? "";

    // v32: Try the structured infobox extractor first. It handles {{nowrap}},
    // {{plainlist}}, year suffixes, and multi-line fields — variants where the
    // v31 regex still failed for TCS, Infosys (with refs), and Capgemini.
    const structured = extractWikipediaInfoboxField(content, [
      'num_employees', 'employees', 'staff', 'num_staff', 'workforce',
    ]);
    if (structured != null) return structured;

    // Fall through to the v31 regex (kept as safety net for edge layouts).
    // R4 fix: extract employee count from Wikipedia infobox with template support.
    // Real infoboxes use `{{nowrap|601,546}}`, `{{plainlist|*601,546}}`, `<ref>...</ref>`,
    // and `[[approximately]] 601,546`. The previous regex required digits IMMEDIATELY
    // after `=`, which fails on every templated infobox. Strategy:
    //   1. Find the num_employees field block (up to the next `|` line in the wikitext)
    //   2. Inside that block, find the FIRST plausible employee count (>= 10).
    //   3. Reject 4-digit years (1900-2099) when followed by typical year tokens.
    //
    // Plausibility range: 10 ≤ N ≤ 5,000,000.
    const fieldMatch = content.match(/\|\s*num_employees\s*=([^\n|]+(?:\n(?![|\s])[^\n|]+)*)/i)
      ?? content.match(/\|\s*employees\s*=([^\n|]+(?:\n(?![|\s])[^\n|]+)*)/i);
    if (!fieldMatch) {
      // Fallback: free-form match anywhere in the article (last resort)
      const freeMatch = content.match(/(?:num_)?employees?\s*[|:=]\s*(?:\{\{[^}|]*\|)?\s*([\d,]{2,})/i);
      if (freeMatch) {
        const n = parseInt(freeMatch[1].replace(/[^\d]/g, ""), 10);
        if (n >= 10 && n <= 5_000_000) return n;
      }
      return null;
    }
    const fieldBody = fieldMatch[1];
    // Find all numeric candidates in the field body, ignoring 4-digit years adjacent to year markers.
    const candidates: number[] = [];
    const numericRe = /(\d{1,3}(?:,\d{3})+|\d{2,7})/g;
    let m: RegExpExecArray | null;
    while ((m = numericRe.exec(fieldBody)) !== null) {
      const raw = m[1].replace(/[^\d]/g, "");
      const n = parseInt(raw, 10);
      if (!Number.isFinite(n)) continue;
      if (n < 10 || n > 5_000_000) continue;
      // Skip likely years: 1900–2099 when not preceded/followed by employee-context numbers
      if (n >= 1900 && n <= 2099) {
        const tail = fieldBody.slice(Math.max(0, m.index - 4), Math.min(fieldBody.length, m.index + raw.length + 8));
        if (/\b(20\d{2}|19\d{2})\b/.test(tail) && !/(employees?|staff|headcount)/i.test(tail)) continue;
      }
      candidates.push(n);
    }
    // Prefer the LARGEST candidate in the field block — companies usually list a single big
    // number; smaller numbers in the same line are usually fiscal year fragments.
    if (candidates.length === 0) return null;
    const best = Math.max(...candidates);
    return best >= 10 ? best : null;
  } catch { return null; }
}

// R3 fix: inline Glassdoor removed. The previous URL scheme
// `https://www.glassdoor.co.in/Overview/Working-at-${slug}-EI_IE.htm` is invalid —
// real Glassdoor URLs require the company's `EI_IE{ID}` numeric ID, so this 404s
// for every company. Cloudflare also gates anonymous traffic with a JS challenge
// that the inline regex can never satisfy. The Playwright-based `glassdoorWorker`
// is the only path that actually works; it runs out-of-band and writes to
// `glassdoor_snapshots`. Returning a fixed null here keeps the existing shape.
function scrapeGlassdoorCompany(_companyName: string): Promise<{ rating: number | null; reviewCount: number | null; ceoApproval: number | null }> {
  return Promise.resolve({ rating: null, reviewCount: null, ceoApproval: null });
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { companyName, ticker, action, roleTitle } = await req.json() as Record<string, string>;
    if (!action) return json({ error: "action required (stock|news|both|hiring|scrape)" }, 400);

    const newsKey   = Deno.env.get("NEWSAPI_KEY");
    const gnewsKey  = Deno.env.get("GNEWS_KEY");
    const fmpKey    = Deno.env.get("FMP_KEY");
    const serperKey = Deno.env.get("SERPER_API_KEY");

    const result: {
      fetchedAt: string; errors: string[];
      stockData?: unknown; newsData?: unknown; hiringData?: unknown;
      scrapeData?: unknown; rateLimitFlags?: unknown;
    } = { fetchedAt: new Date().toISOString(), errors: [] };

    // ── Stock: Yahoo Finance primary (no key), FMP fallback ──────────────────
    if (action === "stock" || action === "both") {
      if (!ticker) {
        result.stockData = null;
        result.errors.push("No ticker provided for stock signals");
      } else {
        try {
          result.stockData = await getStockSignals(ticker);
          console.log(`[proxy] Yahoo Finance ✓ — ${ticker} 90d: ${(result.stockData as Record<string, unknown>).price90DayChange}%`);
        } catch (yahooErr: unknown) {
          const msg = yahooErr instanceof Error ? yahooErr.message : String(yahooErr);
          console.warn(`[proxy] Yahoo Finance failed (${msg}) — trying FMP`);
          result.errors.push(`Yahoo Finance: ${msg}`);
          if (fmpKey) {
            try {
              result.stockData = await getStockSignalsFMP(ticker, fmpKey);
            } catch (fmpErr: unknown) {
              result.errors.push(`FMP: ${fmpErr instanceof Error ? fmpErr.message : String(fmpErr)}`);
              result.stockData = null;
            }
          } else {
            result.stockData = null;
          }
        }
      }
    }

    // ── News: scraping-first (4 concurrent sources, no keys) → APIs fallback ─
    // Priority: Google RSS + Bing RSS + HN + Reddit (all concurrent, no keys)
    //           → GNews (if key) → NewsAPI (if key, last resort)
    if (action === "news" || action === "both") {
      if (!companyName) {
        result.newsData = null;
        result.errors.push("companyName required for news signals");
      } else {
        // Run all no-key sources concurrently
        const [googleRes, bingRes, hnRes, redditRes] = await Promise.allSettled([
          getGoogleNewsRSS(companyName),
          getBingNewsRSS(companyName),
          getHackerNewsSignals(companyName),
          getRedditSignals(companyName),
        ]);

        const successfulResults: ReturnType<typeof parseArticles>[] = [];
        if (googleRes.status === "fulfilled") {
          successfulResults.push(googleRes.value);
          console.log(`[proxy] Google News RSS ✓ — ${googleRes.value.recentHeadlineCount} articles`);
        } else {
          result.errors.push(`Google News RSS: ${googleRes.reason?.message}`);
        }
        if (bingRes.status === "fulfilled") {
          successfulResults.push(bingRes.value);
          console.log(`[proxy] Bing News RSS ✓ — ${bingRes.value.recentHeadlineCount} articles`);
        } else {
          result.errors.push(`Bing News RSS: ${bingRes.reason?.message}`);
        }
        if (hnRes.status === "fulfilled" && hnRes.value.recentHeadlineCount > 0) {
          successfulResults.push(hnRes.value);
        }
        if (redditRes.status === "fulfilled" && redditRes.value.recentHeadlineCount > 0) {
          successfulResults.push(redditRes.value);
        }

        let newsData = successfulResults.length > 0 ? mergeNewsResults(successfulResults) : null;
        const totalFree = newsData?.recentHeadlineCount ?? 0;
        console.log(`[proxy] Free news sources: ${totalFree} total articles (${successfulResults.length} sources active)`);

        // GNews fallback — only if free sources returned nothing
        if ((!newsData || totalFree === 0) && gnewsKey) {
          try {
            newsData = await getGNewsSignals(companyName, gnewsKey);
            console.log(`[proxy] GNews fallback ✓ — ${newsData.recentHeadlineCount} articles`);
          } catch (e: unknown) {
            result.errors.push(`GNews: ${e instanceof Error ? e.message : String(e)}`);
          }
        }

        // NewsAPI — last resort only when all free sources AND GNews have zero results
        if ((!newsData || totalFree === 0) && newsKey) {
          try {
            newsData = await getNewsAPISignals(companyName, newsKey);
            console.log(`[proxy] NewsAPI last-resort ✓ — ${newsData.recentHeadlineCount} articles`);
            result.rateLimitFlags = { ...(result.rateLimitFlags as Record<string, unknown> ?? {}), newsUsedAPI: true };
          } catch (e: unknown) {
            result.errors.push(`NewsAPI: ${e instanceof Error ? e.message : String(e)}`);
            result.rateLimitFlags = { ...(result.rateLimitFlags as Record<string, unknown> ?? {}), newsRateLimited: true };
          }
        }

        result.newsData = newsData ?? {
          recentHeadlineCount: 0, latestLayoffEvent: null, sentimentSignal: 0,
          articles: [], source: "none", fetchedAt: new Date().toISOString(),
        };
      }
    }

    // ── Hiring: scraping-first (Naukri + Bing + Indeed, no keys) → Serper fallback
    if (action === "hiring") {
      if (!roleTitle || !companyName) {
        result.hiringData = null;
        result.errors.push("roleTitle and companyName required for hiring signals");
      } else {
        result.hiringData = await getHiringSignals(roleTitle, companyName, serperKey);
        const hd = result.hiringData as Record<string, unknown>;
        console.log(`[proxy] Hiring ✓ (${hd.scrapeSource}) — "${roleTitle}" at "${companyName}": ${hd.estimatedOpenings ?? 0} openings`);
      }
    }

    // ── Scrape: career page + Wikipedia + Glassdoor enrichment (no keys) ─────
    if (action === "scrape") {
      if (!companyName) {
        result.scrapeData = null;
        result.errors.push("companyName required for scrape signals");
      } else {
        const [careerRes, wikiRes, glassdoorRes] = await Promise.allSettled([
          scrapeCareerPage(companyName),
          scrapeWikipediaEmployeeCount(companyName),
          scrapeGlassdoorCompany(companyName),
        ]);
        result.scrapeData = {
          careerPage: careerRes.status === "fulfilled" ? careerRes.value : null,
          wikiEmployeeCount: wikiRes.status === "fulfilled" ? wikiRes.value : null,
          glassdoor: glassdoorRes.status === "fulfilled" ? glassdoorRes.value : null,
          fetchedAt: new Date().toISOString(),
        };
        console.log(`[proxy] Scrape ✓ — career:${(result.scrapeData as Record<string, unknown>).careerPage ? "✓" : "✗"} wiki:${(result.scrapeData as Record<string, unknown>).wikiEmployeeCount ?? "✗"} glassdoor:${((result.scrapeData as Record<string, unknown>).glassdoor as Record<string, unknown>)?.rating ?? "✗"}`);
      }
    }

    return json(result);
  } catch (err: unknown) {
    console.error("[proxy-live-signals] Fatal:", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
