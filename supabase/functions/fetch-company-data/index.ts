
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type JsonObject = Record<string, any>;
type MatchType = "exact" | "prefix" | "contains" | "word_overlap" | "none";
type SignalSourceKind = "live" | "db" | "heuristic" | "user_input";
type SignalFreshnessState = "fresh" | "degraded" | "invalid";

interface ProvenancedSignal<T = unknown> {
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

interface SignalConflict {
  signalType: string;
  descriptions: string[];
  severity: "low" | "medium" | "high" | "critical";
  conflictingSources: Array<{
    source: string;
    value: number;
    timestamp: string;
  }>;
  recommendedResolution?: string;
}

const STALE_HOURS = 24;
const STALE_DAYS_DEGRADED = 7;
const STALE_DAYS_INVALID = 30;

const normalise = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokens = (value: string) =>
  normalise(value)
    .split(" ")
    .filter(Boolean);

const computeMatchConfidence = (
  query: string,
  matchedName: string,
): { score: number; matchType: MatchType } => {
  const qNorm = normalise(query);
  const mNorm = normalise(matchedName);

  if (qNorm === mNorm) return { score: 1.0, matchType: "exact" };
  if (mNorm.startsWith(qNorm) || qNorm.startsWith(mNorm)) {
    return { score: 0.9, matchType: "prefix" };
  }
  if (mNorm.includes(qNorm) || qNorm.includes(mNorm)) {
    return { score: 0.7, matchType: "contains" };
  }

  const qTokens = tokens(query);
  const mTokens = new Set(tokens(matchedName));
  if (qTokens.length === 0) return { score: 0.0, matchType: "none" };
  const overlap = qTokens.filter((token) => mTokens.has(token)).length;
  if (overlap > 0) return { score: 0.5, matchType: "word_overlap" };
  return { score: 0.0, matchType: "none" };
};

const toIsoDate = (value: unknown): string => {
  try {
    return new Date(String(value)).toISOString();
  } catch {
    return new Date().toISOString();
  }
};

const normalizeCompanyName = (name: string): string =>
  name.trim().toLowerCase();

const extractEmployeeCount = (row: JsonObject): number => {
  const fromSignals = row.financial_signals?.employee_count;
  if (typeof fromSignals === "number" && fromSignals > 0) return fromSignals;

  const sizeMap: Record<string, number> = {
    small: 60,
    mid: 500,
    large: 5000,
    enterprise: 50000,
    mega: 150000,
  };
  const fromSize = sizeMap[String(row.company_size || "").toLowerCase()];
  if (fromSize) return fromSize;

  // Well-known global companies — hard-coded floor to prevent the 1K default
  // from being displayed when financial_signals.employee_count is missing.
  const KNOWN_HEADCOUNTS: Record<string, number> = {
    google: 182000, alphabet: 182000,
    microsoft: 228000, amazon: 1540000,
    meta: 72000, facebook: 72000,
    apple: 164000, tesla: 140000,
    netflix: 13000, nvidia: 36000,
    salesforce: 73000, oracle: 164000,
    ibm: 288000, intel: 124000,
  };
  const nameLower = String(row.company_name || "").toLowerCase();
  for (const [key, count] of Object.entries(KNOWN_HEADCOUNTS)) {
    if (nameLower.includes(key)) return count;
  }

  // Unknown company — use 5000 as a neutral mid-range default rather than 1000
  // which displays as "1K" and misleads users into thinking it's a tiny startup.
  return 5000;
};

const normalizeFromCompanyIntel = (row: JsonObject) => {
  const financial = row.financial_signals || {};
  const layoffs = row.layoff_history || {};
  const hiring = row.hiring_signals || {};

  const lastUpdated = row.last_updated
    ? toIsoDate(row.last_updated)
    : new Date().toISOString();

  return {
    company_name: row.company_name,
    ticker:
      financial.ticker || financial.stock_ticker || financial.symbol || null,
    is_public:
      row.stage === "public" ||
      financial.is_public === true ||
      financial.public === true,
    industry: row.industry || "Technology",
    region: financial.region || financial.country_code || "GLOBAL",
    employee_count: extractEmployeeCount(row),
    revenue_yoy:
      typeof financial.revenue_yoy === "number"
        ? financial.revenue_yoy
        : typeof financial.revenue_growth_yoy === "number"
          ? financial.revenue_growth_yoy
          : null,
    stock_90d_change:
      typeof financial.stock_90d_change === "number"
        ? financial.stock_90d_change
        : typeof financial.stock_change_90d === "number"
          ? financial.stock_change_90d
          : null,
    annual_revenue:
      typeof financial.annual_revenue === "number"
        ? financial.annual_revenue
        : null,
    revenue_per_employee:
      typeof financial.revenue_per_employee === "number"
        ? financial.revenue_per_employee
        : null,
    recent_layoffs: Array.isArray(layoffs.recent_layoffs)
      ? layoffs.recent_layoffs
      : [],
    layoff_rounds:
      typeof layoffs.layoff_rounds === "number"
        ? layoffs.layoff_rounds
        : typeof layoffs.rounds === "number"
          ? layoffs.rounds
          : 0,
    last_layoff_percent:
      typeof layoffs.last_layoff_percent === "number"
        ? layoffs.last_layoff_percent
        : null,
    recent_layoff_news:
      layoffs.recent_layoff_news === true ||
      (Array.isArray(layoffs.recent_layoffs) &&
        layoffs.recent_layoffs.length > 0),
    ai_investment_signal:
      hiring.ai_investment_signal || financial.ai_investment_signal || "medium",
    last_updated: lastUpdated,
    source: row.data_source || "company_intelligence",
  };
};

const isStale = (isoDate: string): boolean => {
  const ageMs = Date.now() - new Date(isoDate).getTime();
  return ageMs > STALE_HOURS * 60 * 60 * 1000;
};

const computeFreshnessDays = (isoDate: string): number =>
  Math.max(0, Math.floor((Date.now() - new Date(isoDate).getTime()) / (24 * 60 * 60 * 1000)));

const freshnessStateFromDays = (days: number): SignalFreshnessState => {
  if (days > STALE_DAYS_INVALID) return "invalid";
  if (days > STALE_DAYS_DEGRADED) return "degraded";
  return "fresh";
};

const signalConfidence = (source: SignalSourceKind, freshnessState: SignalFreshnessState) => {
  const base = source === "live" ? 0.92 : source === "db" ? 0.74 : 0.35;
  if (freshnessState === "fresh") return base;
  if (freshnessState === "degraded") return Math.max(0.2, base - 0.18);
  return Math.max(0.12, base - 0.35);
};

const createSignal = <T,>(
  key: string,
  value: T | null,
  source: SignalSourceKind,
  sourceName: string,
  observedAt: string,
  fetchedAt: string,
): ProvenancedSignal<T> => {
  const freshnessDays = computeFreshnessDays(observedAt);
  const freshnessState = freshnessStateFromDays(freshnessDays);
  return {
    key,
    value,
    source,
    sourceName,
    observedAt,
    fetchedAt,
    freshnessDays,
    freshnessState,
    confidence: signalConfidence(source, freshnessState),
  };
};

const tryFetchAlphaVantage90D = async (
  ticker: string,
  apiKey: string,
): Promise<number | null> => {
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${encodeURIComponent(ticker)}&outputsize=compact&apikey=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) return null;

  const json = await res.json();
  const ts = json["Time Series (Daily)"];
  if (!ts || typeof ts !== "object") return null;

  const dates = Object.keys(ts).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime(),
  );
  if (dates.length < 2) return null;

  const latestDate = dates[0];
  const olderDate = dates[Math.min(89, dates.length - 1)];
  const latestClose = Number(ts[latestDate]?.["4. close"]);
  const olderClose = Number(ts[olderDate]?.["4. close"]);
  if (
    !Number.isFinite(latestClose) ||
    !Number.isFinite(olderClose) ||
    olderClose <= 0
  )
    return null;

  return Number((((latestClose - olderClose) / olderClose) * 100).toFixed(2));
};

// Word-boundary match prevents false positives from package names or unrelated
// text containing the company name as a substring (e.g. "apple" in "Snapple",
// "meta" in "metadata"). Mirrors the implementation in proxy-live-signals.
function companyWordBoundaryMatch(text: string, companyLower: string): boolean {
  const escaped = companyLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(?<![a-z0-9-])${escaped}(?![a-z0-9-])`, "i");
  return re.test(text);
}

const LAYOFF_KEYWORDS_EF = ["layoff", "job cut", "workforce reduction", "restructuring", "retrench", "redundan"];

const tryFetchLayoffNews = async (
  companyName: string,
  apiKey: string,
): Promise<{
  hasLayoffNews: boolean;
  layoffs: Array<{ date: string; percent_cut: number | null; headline: string; source: string }>;
}> => {
  const query = `"${companyName}" AND (layoff OR layoffs OR "workforce reduction" OR "job cuts")`;
  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=10&language=en&apiKey=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) return { hasLayoffNews: false, layoffs: [] };

  const parsed = await res.json() as { articles?: Array<Record<string, unknown>> };
  const articles = Array.isArray(parsed.articles) ? parsed.articles : [];
  if (articles.length === 0) return { hasLayoffNews: false, layoffs: [] };

  // Use word-boundary match instead of simple .includes() to prevent false
  // positives. Also allow description-only matches when a layoff keyword is present.
  const companyLower = companyName.toLowerCase();
  const matched = articles.filter((a) => {
    const title = String(a?.title ?? "").toLowerCase();
    const desc  = String(a?.description ?? "").toLowerCase();
    if (companyWordBoundaryMatch(title, companyLower)) return true;
    if (companyWordBoundaryMatch(desc, companyLower) &&
        LAYOFF_KEYWORDS_EF.some((kw) => desc.includes(kw))) return true;
    return false;
  });
  if (matched.length === 0) return { hasLayoffNews: false, layoffs: [] };

  // Extract a percent_cut from the article only if the headline/description
  // actually states one. Never default to a hardcoded percentage — that
  // fabricates a layoff event from a single news mention.
  const layoffs = matched.slice(0, 3).map((a: Record<string, unknown>) => {
    const title = String(a.title ?? "");
    const desc  = String(a.description ?? "");
    const text  = `${title} ${desc}`;
    const pctMatch = text.match(/(\d+(?:\.\d+)?)\s*%/);
    const sourceObj = typeof a.source === "object" && a.source !== null
      ? (a.source as Record<string, unknown>)
      : {};
    const sourceName = typeof sourceObj.name === "string" ? sourceObj.name : "NewsAPI";
    return {
      date: String(a.publishedAt || new Date().toISOString()),
      percent_cut: pctMatch ? parseFloat(pctMatch[1]) : null,
      headline: title,
      source: sourceName,
    };
  });

  return { hasLayoffNews: true, layoffs };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization") || "" },
        },
      },
    );

    const body = await req.json();
    const companyName = String(body.companyName || "").trim();
    if (!companyName) throw new Error("companyName is required");

    const normalized = normalizeCompanyName(companyName);

    // Fast path: check cached_company_intelligence before hitting the main table.
    // Previously this table was always written to but never read — making the
    // 24-hour staleness window meaningless.
    const { data: cached } = await supabaseClient
      .from("cached_company_intelligence")
      .select("*")
      .eq("company_name", normalized)
      .maybeSingle();

    const cacheAge = cached?.last_updated
      ? (Date.now() - new Date(cached.last_updated).getTime()) / 3_600_000
      : Infinity;

    // Serve from cache when it's fresh (< STALE_HOURS) and has the key financial fields.
    if (cached && cacheAge < STALE_HOURS && cached.employee_count != null) {
      return new Response(
        JSON.stringify({
          companyName: cached.company_name,
          data: {
            company_name:       cached.company_name,
            is_public:          cached.is_public ?? false,
            industry:           cached.industry ?? "Technology",
            region:             "GLOBAL",
            employee_count:     cached.employee_count,
            revenue_yoy:        cached.revenue_yoy ?? null,
            stock_90d_change:   cached.stock_90d_change ?? null,
            recent_layoff_news: cached.recent_layoff_news ?? false,
            recent_layoffs:     [],
            layoff_rounds:      0,
            last_layoff_percent: null,
            ai_investment_signal: "medium",
            last_updated:       cached.last_updated,
            source:             "cached_company_intelligence",
          },
          source:         "cached_company_intelligence",
          sourcePath:     "edge_exact",
          matchConfidence: 1.0,
          matchType:      "exact",
          authoritativeSignals: {},
          conflicts:      [],
          dataQuality:    "LIVE_OR_REFRESHED",
          dataFreshness:  { lastUpdated: cached.last_updated, stale: false, staleThresholdHours: STALE_HOURS },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Primary source: company_intelligence with the same confidence gate used
    // by the frontend lookup. Weak word-overlap matches must not silently seed
    // the audit with the wrong company.
    const { data: intelExact } = await supabaseClient
      .from("company_intelligence")
      .select("*")
      .ilike("company_name", companyName)
      .maybeSingle();

    let intelRow = intelExact;
    let matchConfidence = intelExact ? 1.0 : 0.0;
    let matchType: MatchType = intelExact ? "exact" : "none";
    let matchedCompanyName: string | null = intelExact?.company_name ?? null;
    let sourcePath:
      | "edge_exact"
      | "edge_prefix"
      | "edge_contains"
      | "edge_fallback" = intelExact ? "edge_exact" : "edge_fallback";

    if (!intelRow) {
      const { data: intelFuzzyRows } = await supabaseClient
        .from("company_intelligence")
        .select("*")
        .ilike("company_name", `%${companyName}%`)
        .order("confidence_score", { ascending: false })
        .limit(5);

      if (Array.isArray(intelFuzzyRows) && intelFuzzyRows.length > 0) {
        let bestRow: JsonObject | null = null;
        let bestScore = 0;
        let bestType: MatchType = "none";
        for (const row of intelFuzzyRows) {
          const candidate = String(row.company_name || "");
          const { score, matchType: candidateType } = computeMatchConfidence(companyName, candidate);
          if (score > bestScore) {
            bestRow = row;
            bestScore = score;
            bestType = candidateType;
          }
        }

        if (bestRow && bestScore >= 0.5) {
          intelRow = bestRow;
          matchConfidence = bestScore;
          matchType = bestType;
          matchedCompanyName = String(bestRow.company_name || "");
          sourcePath =
            bestType === "prefix"
              ? "edge_prefix"
              : bestType === "contains"
                ? "edge_contains"
                : "edge_fallback";
        }
      }
    }

    const merged = intelRow
      ? normalizeFromCompanyIntel(intelRow)
      : {
          company_name: companyName,
          ticker: null,
          is_public: body.isPublic === true,
          industry: body.industry || "Technology",
          region: "GLOBAL",
          employee_count: body.employeeCount || 1000,
          revenue_yoy: null,
          stock_90d_change: null,
          annual_revenue: null,
          revenue_per_employee: null,
          recent_layoffs: [],
          layoff_rounds: 0,
          last_layoff_percent: null,
          recent_layoff_news: false,
          ai_investment_signal: "medium",
          last_updated: new Date().toISOString(),
          source: "fallback",
        };
    const baselineMerged = structuredClone(merged);
    const conflicts: SignalConflict[] = [];

    const provenance: string[] = [];
    provenance.push(
      intelRow ? "supabase.company_intelligence" : "fallback.input_defaults",
    );

    // optional enrichment when stale or missing critical fields
    const alphaKey =
      Deno.env.get("ALPHA_VANTAGE_API_KEY") ||
      Deno.env.get("ALPHA_VANTAGE_KEY") ||
      "";
    const newsKey =
      Deno.env.get("NEWS_API_KEY") || Deno.env.get("NEWSAPI_KEY") || "";

    const shouldEnrichStock =
      merged.is_public &&
      (merged.stock_90d_change === null || isStale(merged.last_updated));
    if (shouldEnrichStock && alphaKey && merged.ticker) {
      try {
        const stock90d = await tryFetchAlphaVantage90D(merged.ticker, alphaKey);
        if (stock90d !== null) {
          if (
            typeof baselineMerged.stock_90d_change === "number" &&
            Math.abs(baselineMerged.stock_90d_change - stock90d) >= 8
          ) {
            conflicts.push({
              signalType: "stock_90d_change",
              descriptions: [
                `Live stock signal (${stock90d}%) differs materially from DB stock signal (${baselineMerged.stock_90d_change}%).`,
              ],
              severity: "high",
              conflictingSources: [
                {
                  source: "alpha_vantage",
                  value: stock90d,
                  timestamp: new Date().toISOString(),
                },
                {
                  source: baselineMerged.source || "company_intelligence",
                  value: baselineMerged.stock_90d_change,
                  timestamp: baselineMerged.last_updated,
                },
              ],
              recommendedResolution: "Use the fresher live stock signal and refresh the DB cache.",
            });
          }
          merged.stock_90d_change = stock90d;
          merged.last_updated = new Date().toISOString();
          provenance.push("alpha_vantage.stock_90d_change");
        }
      } catch {
        provenance.push("alpha_vantage.failed");
      }
    }

    const shouldEnrichNews =
      !merged.recent_layoff_news || isStale(merged.last_updated);
    if (shouldEnrichNews && newsKey) {
      try {
        const layoffNews = await tryFetchLayoffNews(
          merged.company_name,
          newsKey,
        );
        if (layoffNews.hasLayoffNews) {
          if ((baselineMerged.layoff_rounds ?? 0) === 0 && layoffNews.layoffs.length > 0) {
            conflicts.push({
              signalType: "layoff_rounds",
              descriptions: [
                "Live layoff coverage found recent workforce reduction signals while the database recorded no layoff rounds.",
              ],
              severity: "critical",
              conflictingSources: [
                {
                  source: "newsapi",
                  value: layoffNews.layoffs.length,
                  timestamp: new Date().toISOString(),
                },
                {
                  source: baselineMerged.source || "company_intelligence",
                  value: baselineMerged.layoff_rounds ?? 0,
                  timestamp: baselineMerged.last_updated,
                },
              ],
              recommendedResolution: "Use the live layoff evidence immediately and refresh the persisted layoff history.",
            });
          }
          merged.recent_layoff_news = true;
          merged.recent_layoffs = layoffNews.layoffs;
          // Count distinct layoff *events* (events on different dates) rather
          // than article count — multiple outlets covering one round shouldn't
          // inflate `layoff_rounds`.
          const distinctEventDates = new Set(
            layoffNews.layoffs
              .map((l) => (typeof l.date === "string" ? l.date.slice(0, 10) : ""))
              .filter(Boolean),
          );
          merged.layoff_rounds = Math.max(
            merged.layoff_rounds || 0,
            distinctEventDates.size,
          );
          // Only update last_layoff_percent when a real % was parsed from
          // article text. Falling back to a hardcoded 5% silently fabricates
          // a layoff severity that the scoring engine then trusts.
          const observedPercents = layoffNews.layoffs
            .map((l) => l.percent_cut)
            .filter((p): p is number => typeof p === "number");
          if (observedPercents.length > 0) {
            if (
              typeof baselineMerged.last_layoff_percent === "number" &&
              Math.abs(baselineMerged.last_layoff_percent - Math.max(...observedPercents)) >= 3
            ) {
              conflicts.push({
                signalType: "last_layoff_percent",
                descriptions: [
                  `Live layoff severity (${Math.max(...observedPercents)}%) differs materially from DB severity (${baselineMerged.last_layoff_percent}%).`,
                ],
                severity: "high",
                conflictingSources: [
                  {
                    source: "newsapi",
                    value: Math.max(...observedPercents),
                    timestamp: new Date().toISOString(),
                  },
                  {
                    source: baselineMerged.source || "company_intelligence",
                    value: baselineMerged.last_layoff_percent,
                    timestamp: baselineMerged.last_updated,
                  },
                ],
                recommendedResolution: "Use the fresher live layoff severity and refresh the DB cache.",
              });
            }
            merged.last_layoff_percent = Math.max(...observedPercents);
          }
          merged.last_updated = new Date().toISOString();
          provenance.push("newsapi.layoff_news");
        }
      } catch {
        provenance.push("newsapi.failed");
      }
    }

    if (
      !merged.revenue_per_employee &&
      merged.annual_revenue &&
      merged.employee_count
    ) {
      merged.revenue_per_employee = Math.round(
        merged.annual_revenue / merged.employee_count,
      );
    }

    // cache normalized payload for fast repeat access
    const nextRefresh = new Date();
    nextRefresh.setHours(nextRefresh.getHours() + STALE_HOURS);

    const cachePayload = {
      company_name: normalized,
      domain: `${normalized.replace(/\s+/g, "")}.com`,
      employee_count: merged.employee_count,
      revenue_yoy: merged.revenue_yoy,
      stock_90d_change: merged.stock_90d_change,
      recent_layoff_news: merged.recent_layoff_news,
      industry: merged.industry,
      is_public: merged.is_public,
      last_updated: merged.last_updated,
      next_refresh_due: nextRefresh.toISOString(),
    };

    await supabaseClient
      .from("cached_company_intelligence")
      .upsert(cachePayload, { onConflict: "company_name" });

    const stale = isStale(merged.last_updated);
    const authoritativeSignals: Record<string, ProvenancedSignal<any>> = {};
    const signalObservedAt = toIsoDate(merged.last_updated);
    const dbObservedAt = toIsoDate(baselineMerged.last_updated);
    const hasLiveStockProvenance = provenance.some((entry) =>
      entry.startsWith("alpha_vantage."),
    );
    const hasLiveNewsProvenance = provenance.some((entry) =>
      entry.startsWith("newsapi."),
    );

    if (merged.stock_90d_change !== null) {
      authoritativeSignals.stock_90d_change = createSignal(
        "stock_90d_change",
        merged.stock_90d_change,
        hasLiveStockProvenance ? "live" : intelRow ? "db" : "heuristic",
        hasLiveStockProvenance ? "alpha_vantage" : baselineMerged.source || "company_intelligence",
        hasLiveStockProvenance ? signalObservedAt : dbObservedAt,
        signalObservedAt,
      );
    }
    if (merged.revenue_yoy !== null) {
      authoritativeSignals.revenue_yoy = createSignal(
        "revenue_yoy",
        merged.revenue_yoy,
        hasLiveStockProvenance ? "live" : intelRow ? "db" : "heuristic",
        hasLiveStockProvenance ? "alpha_vantage" : baselineMerged.source || "company_intelligence",
        hasLiveStockProvenance ? signalObservedAt : dbObservedAt,
        signalObservedAt,
      );
    }
    authoritativeSignals.layoff_rounds = createSignal(
      "layoff_rounds",
      merged.layoff_rounds,
      hasLiveNewsProvenance ? "live" : intelRow ? "db" : "heuristic",
      hasLiveNewsProvenance ? "newsapi" : baselineMerged.source || "company_intelligence",
      hasLiveNewsProvenance ? signalObservedAt : dbObservedAt,
      signalObservedAt,
    );
    authoritativeSignals.last_layoff_percent = createSignal(
      "last_layoff_percent",
      merged.last_layoff_percent,
      hasLiveNewsProvenance ? "live" : intelRow ? "db" : "heuristic",
      hasLiveNewsProvenance ? "newsapi" : baselineMerged.source || "company_intelligence",
      hasLiveNewsProvenance ? signalObservedAt : dbObservedAt,
      signalObservedAt,
    );
    authoritativeSignals.employee_count = createSignal(
      "employee_count",
      merged.employee_count,
      intelRow ? "db" : "heuristic",
      baselineMerged.source || "company_intelligence",
      dbObservedAt,
      signalObservedAt,
    );
    authoritativeSignals.revenue_per_employee = createSignal(
      "revenue_per_employee",
      merged.revenue_per_employee,
      intelRow ? "db" : "heuristic",
      baselineMerged.source || "company_intelligence",
      dbObservedAt,
      signalObservedAt,
    );
    authoritativeSignals.ai_investment_signal = createSignal(
      "ai_investment_signal",
      merged.ai_investment_signal,
      intelRow ? "db" : "heuristic",
      baselineMerged.source || "company_intelligence",
      dbObservedAt,
      signalObservedAt,
    );

    return new Response(
      JSON.stringify({
        companyName: merged.company_name,
        data: merged,
        source: provenance.join(" | "),
        sourcePath,
        provenance,
        matchedCompanyName,
        matchConfidence,
        matchType,
        authoritativeSignals,
        conflicts,
        dataQuality: stale ? "PARTIAL_STALE" : "LIVE_OR_REFRESHED",
        dataFreshness: {
          lastUpdated: merged.last_updated,
          stale,
          staleThresholdHours: STALE_HOURS,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
