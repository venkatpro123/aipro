
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { KNOWN_HEADCOUNTS } from "../_shared/knownHeadcounts.ts";
// WS10 — withRun writes a pipeline_runs row + propagates the x-request-id
// header carried from the SPA via invokeEdgeFunction so the audit trace
// joins across browser → edge → DB.
import { withRun } from "../_shared/otel.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-request-id",
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

// R7 fix: reduced from 4h → 0.5h (30 min). The 4h TTL meant a layoff announced at 13:00
// would be invisible to audits until 17:00 even when ingest-news already wrote the
// breaking_news_events row. The cache-hit path still merges breaking_news_events inline,
// but with a 30-min TTL the EF goes back to fully live enrichment soon enough that
// AlphaVantage / NewsAPI / Yahoo Finance signals stay current.
const STALE_HOURS = 0.5;
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

/**
 * Find a KNOWN_HEADCOUNTS key that matches this company name.
 * Returns the longest matching key (so "tata consultancy" beats "tata" when
 * both keys exist) so the most-specific canonical value wins.
 *
 * The longest-match rule matters: "Tata Steel" should NOT match the
 * "tata consultancy" key just because "tata" is a substring. We require
 * the KNOWN_HEADCOUNTS key to be a substring of the company name AND
 * pick the LONGEST such match.
 */
const findKnownHeadcountKey = (companyName: string): string | null => {
  const nameLower = companyName.toLowerCase();
  let bestKey: string | null = null;
  for (const key of Object.keys(KNOWN_HEADCOUNTS)) {
    if (nameLower.includes(key) && (!bestKey || key.length > bestKey.length)) {
      bestKey = key;
    }
  }
  return bestKey;
};

const extractEmployeeCount = (row: JsonObject): number => {
  const nameLower = String(row.company_name || "").toLowerCase();
  const knownKey = findKnownHeadcountKey(nameLower);
  const knownCount = knownKey ? KNOWN_HEADCOUNTS[knownKey] : null;

  // v35.1.2 — sanity-check DB workforce_count against KNOWN_HEADCOUNTS.
  // The DB contains stale snapshots for famous companies (e.g. "Oracle" row
  // shows 51k; real Oracle has ~164k per KNOWN_HEADCOUNTS). When the DB
  // value differs from the curated canonical by >2x, trust the curated
  // value — it's hand-maintained from public 10-K filings.
  // The 2x band tolerates legitimate workforce changes (layoffs, growth)
  // while catching obviously-wrong stale rows.
  const sanityCheck = (candidate: number): number => {
    if (knownCount === null) return candidate;
    if (candidate <= 0) return knownCount;
    const ratio = candidate / knownCount;
    if (ratio < 0.5 || ratio > 2.0) return knownCount;
    return candidate;
  };

  // Priority 1: direct DB column (workforce_count — the authoritative HR field)
  if (typeof row.workforce_count === "number" && row.workforce_count > 0) {
    return sanityCheck(row.workforce_count);
  }

  // Priority 2: financial_signals sub-document variants
  const fin = row.financial_signals ?? {};
  const fromSignals = fin.employee_count ?? fin.headcount ?? fin.workforce_count;
  if (typeof fromSignals === "number" && fromSignals > 0) {
    return sanityCheck(fromSignals);
  }

  // Priority 3: KNOWN_HEADCOUNTS canonical map (updated quarterly)
  if (knownCount !== null) return knownCount;

  // Priority 4: size-class proxy (last resort — wide buckets)
  const sizeMap: Record<string, number> = {
    micro: 10, startup: 25, small: 60, mid: 500, medium: 2000,
    large: 10000, enterprise: 50000, mega: 150000,
  };
  const fromSize = sizeMap[String(row.company_size || "").toLowerCase()];
  if (fromSize) return fromSize;

  // Unknown — use industry-neutral 5k rather than 1k (misleads as tiny startup)
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
      financial.ticker || financial.stock_ticker || financial.symbol ||
      row.stock_ticker || null,
    is_public:
      row.stage === "public" ||
      financial.is_public === true ||
      financial.public === true ||
      financial.funding_stage === "public" ||
      row.funding_stage === "public",
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
          // DB schema stores total_layoffs (headcount) not layoff_rounds (event count).
          // Derive a round count: 1 round if any layoffs exist, 2 if frequent pattern.
          : typeof layoffs.total_layoffs === "number" && layoffs.total_layoffs > 0
            ? (layoffs.layoff_frequency === "frequent" ? 2 : 1)
            : Array.isArray(layoffs.recent_layoffs) && layoffs.recent_layoffs.length > 0
              ? layoffs.recent_layoffs.length
              : 0,
    total_layoffs:
      typeof layoffs.total_layoffs === "number" ? layoffs.total_layoffs : null,
    last_layoff_date:
      typeof layoffs.last_layoff_date === "string" ? layoffs.last_layoff_date : null,
    last_layoff_percent:
      typeof layoffs.last_layoff_percent === "number"
        ? layoffs.last_layoff_percent
        : typeof layoffs.total_layoffs === "number" && layoffs.total_layoffs > 0
          ? null   // will be computed from total_layoffs / employee_count downstream
          : null,
    recent_layoff_news:
      layoffs.recent_layoff_news === true ||
      (typeof layoffs.total_layoffs === "number" && layoffs.total_layoffs > 0) ||
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

  // Extract percent_cut ONLY when the headline explicitly names a workforce % reduction.
  // A loose regex like /(\d+)%/ matches interest rates, earnings beats, discount codes —
  // all of which are common in news articles and would fabricate layoff severity.
  // Rules:
  //   1. Only match from the title (headlines are precise; descriptions are noisy).
  //   2. Require the % to appear adjacent to workforce-reduction language.
  //   3. Discard unrealistic values: < 0.5% (rounding) or > 35% (mass-event only).
  const WORKFORCE_PCT_RE =
    /(\d+(?:\.\d+)?)\s*%\s*(?:of\s+(?:its\s+)?(?:global\s+)?(?:workforce|employees|staff|headcount|jobs|roles|workers|positions))|(?:cut|cuts|lay(?:ed)?\s*off|reduc(?:e|ed|ing)|eliminat(?:e|ed)|slash(?:ed)?|trim(?:med)?)\s+(?:\w+\s+){0,4}(\d+(?:\.\d+)?)\s*%/i;

  const layoffs = matched.slice(0, 3).map((a: Record<string, unknown>) => {
    const title = String(a.title ?? "");
    const sourceObj = typeof a.source === "object" && a.source !== null
      ? (a.source as Record<string, unknown>)
      : {};
    const sourceName = typeof sourceObj.name === "string" ? sourceObj.name : "NewsAPI";

    // Only extract percent from the headline, not description — descriptions
    // often contain contextual percentages (stock moves, earnings) unrelated to cuts.
    const m = title.match(WORKFORCE_PCT_RE);
    const raw = m ? parseFloat(m[1] ?? m[2] ?? "0") : null;
    // Sanity-gate: 0.5–35% covers realistic RIF events; outside this range is
    // almost certainly a mis-parse (rate, growth, margin, discount).
    const pct = raw != null && raw >= 0.5 && raw <= 35 ? raw : null;

    return {
      date: String(a.publishedAt || new Date().toISOString()),
      percent_cut: pct,
      headline: title,
      source: sourceName,
    };
  });

  return { hasLayoffNews: true, layoffs };
};

Deno.serve((req) =>
  // WS10 — every invocation writes a pipeline_runs row stamped with the
  // x-request-id sent by the SPA's invokeEdgeFunction wrapper.
  // withRun handles OPTIONS preflight, error capture, and finalisation;
  // the handler body below is the original logic, minus the redundant
  // OPTIONS branch and outermost try/catch (both subsumed by withRun).
  withRun("fetch-company-data", req, async (_run) => {
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
    // Fix C-2: the cache table never stored layoff fields (layoff_rounds, recent_layoffs,
    // last_layoff_percent). Returning hardcoded zeros from the cache path caused audits
    // to show zero layoff history for 24h after enrichment — even when layoffs were just
    // confirmed live. We now load the layoff_history sub-object from company_intelligence
    // for cache hits so those fields are always accurate.
    if (cached && cacheAge < STALE_HOURS && cached.employee_count != null) {
      // Supplement the cache with layoff_history from the source table (lightweight query —
      // only one JSONB column). If the company_intelligence row is missing, layoff fields
      // fall back to safe zeros rather than serving stale fabricated data.
      let cachedLayoffs: ReturnType<typeof normalizeFromCompanyIntel>["recent_layoffs"] = [];
      let cachedLayoffRounds = 0;
      let cachedLastLayoffPct: number | null = null;
      let cachedRecentLayoffNews = cached.recent_layoff_news ?? false;

      const { data: intelLayoff } = await supabaseClient
        .from("company_intelligence")
        .select("layoff_history, hiring_signals")
        .ilike("company_name", cached.company_name)
        .maybeSingle();

      if (intelLayoff) {
        const lh = intelLayoff.layoff_history ?? {};
        cachedLayoffs = Array.isArray(lh.recent_layoffs) ? lh.recent_layoffs : [];
        cachedLayoffRounds =
          typeof lh.layoff_rounds === "number"
            ? lh.layoff_rounds
            : typeof lh.rounds === "number"
              ? lh.rounds
              : 0;
        cachedLastLayoffPct =
          typeof lh.last_layoff_percent === "number" ? lh.last_layoff_percent : null;
        if (!cachedRecentLayoffNews && Array.isArray(lh.recent_layoffs) && lh.recent_layoffs.length > 0) {
          cachedRecentLayoffNews = true;
        }
      }

      const aiSignal =
        intelLayoff?.hiring_signals?.ai_investment_signal ??
        intelLayoff?.hiring_signals?.financial?.ai_investment_signal ??
        "medium";

      // Even on a cache hit, always check breaking_news_events for events in
      // the last 7 days — this catches same-day layoff announcements that the
      // static company_intelligence table won't have for up to STALE_HOURS.
      try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
        const { data: breakingRows } = await supabaseClient
          .from("breaking_news_events")
          .select("company_name, event_date, percent_cut, affected_count, source")
          .ilike("company_name", `%${normalise(cached.company_name).replace(/[%_]/g, "\\$&")}%`)
          .gte("event_date", sevenDaysAgo)
          .order("event_date", { ascending: false })
          .limit(5);

        if (Array.isArray(breakingRows) && breakingRows.length > 0) {
          // Merge: add breaking_news events not already in the cached layoff list
          const existingDates = new Set(
            (cachedLayoffs as Array<{ date?: string }>).map((l) => String(l.date ?? "").slice(0, 10)),
          );
          for (const row of breakingRows) {
            const rowDate = String(row.event_date ?? "").slice(0, 10);
            if (!existingDates.has(rowDate)) {
              cachedLayoffs.unshift({ date: rowDate, percentCut: row.percent_cut ?? 5, source: `breaking_news (${row.source ?? "newsapi"})` });
              existingDates.add(rowDate);
              cachedLayoffRounds = Math.max(cachedLayoffRounds, 1);
              cachedRecentLayoffNews = true;
              if (row.percent_cut !== null && cachedLastLayoffPct === null) {
                cachedLastLayoffPct = row.percent_cut;
              }
            }
          }
          // Re-sort by date desc after merge
          (cachedLayoffs as Array<{ date?: string }>).sort(
            (a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")),
          );
        }
      } catch { /* non-fatal — best-effort breaking news merge */ }

      return new Response(
        JSON.stringify({
          companyName: cached.company_name,
          data: {
            company_name:        cached.company_name,
            is_public:           cached.is_public ?? false,
            industry:            cached.industry ?? "Technology",
            region:              "GLOBAL",
            employee_count:      cached.employee_count,
            revenue_yoy:         cached.revenue_yoy ?? null,
            stock_90d_change:    cached.stock_90d_change ?? null,
            recent_layoff_news:  cachedRecentLayoffNews,
            recent_layoffs:      cachedLayoffs,
            layoff_rounds:       cachedLayoffRounds,
            last_layoff_percent: cachedLastLayoffPct,
            ai_investment_signal: aiSignal,
            last_updated:        cached.last_updated,
            source:              "cached_company_intelligence",
          },
          source:          "cached_company_intelligence",
          sourcePath:      "edge_exact",
          matchConfidence: 1.0,
          matchType:       "exact",
          authoritativeSignals: {},
          conflicts:       [],
          dataQuality:     "LIVE_OR_REFRESHED",
          dataFreshness:   { lastUpdated: cached.last_updated, stale: false, staleThresholdHours: STALE_HOURS },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // v45.1 — Check verified_company_intelligence FIRST (enterprise table, real sources).
    // This table is populated by the migrate-company-intelligence EF and updated
    // by the write-back path in this EF.  When a 'verified' or 'live' row exists,
    // we serve it directly without hitting the legacy company_intelligence table,
    // because the VCI row has sourced workforce (Wikipedia), live financials
    // (Yahoo Finance), and breaking_news layoff counts — all with provenance.
    // Falls through to legacy path when VCI row is missing or has tier 'heuristic'.
    //
    // Alias resolution (v45.1): companies like "TCS" and "Tata Consultancy" both
    // map to the same KNOWN_HEADCOUNTS count (613 000).  The migrated VCI row is
    // stored under the longer canonical key ("tata consultancy"), so a direct
    // normalise("TCS") = "tcs" search misses it.  Fix: collect all KNOWN_HEADCOUNTS
    // keys that share the same headcount value → try ALL of them in one OR filter.
    try {
      const vciCanonical = normalise(companyName);

      // Explicit alias map for cases that cannot be resolved algorithmically:
      // - "google" ↔ "alphabet" (different names, same company)
      // - "hcl tech" ↔ "hcltech" (space vs. no-space, same company)
      // - "facebook" ↔ "meta" (rebrand, same company)
      // - "hcl_tech" ↔ "hcl tech" (underscore vs. space)
      // - "tech_mahindra" ↔ "tech mahindra"
      // - "tata_motors" ↔ "tata motors"
      // - "tata_steel" ↔ "tata steel"
      const VCI_EXPLICIT_ALIASES: Record<string, string[]> = {
        "google":       ["alphabet"],
        "alphabet":     ["google"],
        "facebook":     ["meta"],
        "meta":         ["facebook"],
        "hcl tech":     ["hcltech", "hcl_tech"],
        "hcltech":      ["hcl tech", "hcl_tech"],
        "hcl_tech":     ["hcl tech", "hcltech"],
        "tech mahindra":["tech_mahindra"],
        "tech_mahindra":["tech mahindra"],
        "tata motors":  ["tata_motors"],
        "tata_motors":  ["tata motors"],
        "tata steel":   ["tata_steel"],
        "tata_steel":   ["tata steel"],
        "ltimindtree":  ["lti"],
        "lti":          ["ltimindtree"],
      };

      // Build a deduplicated list of canonical names to try.
      // Strategy:
      //   1. Explicit alias map (google↔alphabet, hcl tech↔hcltech, etc.)
      //   2. Same-count KNOWN_HEADCOUNTS keys that share a word OR are acronyms (≤4 chars)
      //   3. ilike fallback on the primary canonical form
      const vciLookupNames: string[] = [vciCanonical];
      const vciAliasKey = findKnownHeadcountKey(companyName.toLowerCase());

      // Add explicit aliases first
      const explicitAliases = VCI_EXPLICIT_ALIASES[vciCanonical] ?? [];
      for (const ea of explicitAliases) {
        if (!vciLookupNames.includes(ea)) vciLookupNames.push(ea);
      }
      if (vciAliasKey && !vciLookupNames.includes(vciAliasKey)) vciLookupNames.push(vciAliasKey);
      for (const ea of VCI_EXPLICIT_ALIASES[vciAliasKey ?? ""] ?? []) {
        if (!vciLookupNames.includes(ea)) vciLookupNames.push(ea);
      }

      // Also add same-count KNOWN_HEADCOUNTS keys (algorithmic, with safety guards)
      if (vciAliasKey) {
        const aliasCount = KNOWN_HEADCOUNTS[vciAliasKey];
        const aliasNorm  = vciAliasKey.replace(/_/g, "").replace(/\s/g, ""); // for substring check
        const aliasWords = new Set(vciAliasKey.replace(/_/g, " ").split(/\s+/).filter(w => w.length >= 2));
        for (const k of Object.keys(KNOWN_HEADCOUNTS)) {
          if (KNOWN_HEADCOUNTS[k] !== aliasCount || vciLookupNames.includes(k)) continue;
          const kNorm  = k.replace(/_/g, "").replace(/\s/g, "");
          const kWords = k.replace(/_/g, " ").split(/\s+/).filter(w => w.length >= 2);
          // Accept if: shares a word, one is substring of other (hcl tech ≡ hcltech),
          // or one is a true acronym (≤4 chars, e.g. "tcs", "lti", "meta")
          const sharesWord   = kWords.some(w => aliasWords.has(w));
          const isSubstring  = aliasNorm.includes(kNorm) || kNorm.includes(aliasNorm);
          const isAcronymPair = vciAliasKey.length <= 4 || k.length <= 4;
          if (sharesWord || isSubstring || isAcronymPair) {
            vciLookupNames.push(k);
          }
        }
      }

      // Build Supabase OR filter: exact match on each alias + ilike on the primary.
      const vciOrParts = [
        ...vciLookupNames.map(n => `canonical_name.eq.${n}`),
        `canonical_name.ilike.%${vciCanonical}%`,
      ];

      const { data: vciRow } = await supabaseClient
        .from("verified_company_intelligence")
        .select("*")
        .or(vciOrParts.join(","))
        .order("last_enriched_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (vciRow && vciRow.data_quality_tier !== "heuristic") {
        // Map VCI row → the legacy normalizeFromCompanyIntel shape so the rest of
        // the pipeline (conflict detection, authoritativeSignals, response) works
        // unchanged.
        // Strip legacy DB-category suffixes like "(India Giant)" from display_name
        // in case the row was migrated before the stripDbTag fix landed.
        const vciDisplayName = String(vciRow.display_name ?? companyName)
          .replace(/\s*\([^)]*\)\s*$/, "").trim();
        const vciMerged = {
          company_name: vciDisplayName,
          ticker: vciRow.ticker ?? null,
          is_public: vciRow.is_public ?? false,
          industry: vciRow.industry ?? "Technology",
          region: vciRow.country_code ?? "GLOBAL",
          employee_count: vciRow.workforce_count ?? 5000,
          revenue_yoy: null,
          stock_90d_change: vciRow.stock_90d_change ?? null,
          annual_revenue: null,
          revenue_per_employee: null,
          recent_layoffs: vciRow.recent_layoff_count > 0
            ? [{ date: vciRow.layoff_last_event_at ?? new Date().toISOString(), percentCut: vciRow.largest_layoff_pct ?? 5, source: vciRow.layoff_source ?? "breaking_news_events" }]
            : [],
          layoff_rounds: vciRow.recent_layoff_count,
          total_layoffs: null,
          last_layoff_date: vciRow.layoff_last_event_at ?? null,
          last_layoff_percent: vciRow.largest_layoff_pct ?? null,
          recent_layoff_news: vciRow.recent_layoff_count > 0,
          ai_investment_signal: "medium" as const,
          last_updated: vciRow.last_enriched_at ?? vciRow.updated_at,
          source: "verified_company_intelligence",
        };

        const vciTierMap: Record<string, string> = { verified: "LIVE_OR_REFRESHED", live: "LIVE_OR_REFRESHED", seed: "PARTIAL_STALE" };
        const vciDataQuality = vciTierMap[vciRow.data_quality_tier] ?? "PARTIAL_STALE";

        return new Response(
          JSON.stringify({
            companyName: vciMerged.company_name,
            data: vciMerged,
            source: `verified_company_intelligence (${vciRow.data_quality_tier})`,
            sourcePath: "edge_canonical",
            provenance: [
              `vci.workforce.${vciRow.workforce_source ?? "unknown"}`,
              vciRow.financials_verified_at ? "vci.financials.yahoo_finance" : null,
              vciRow.layoff_verified_at ? "vci.layoffs.breaking_news_events" : null,
            ].filter(Boolean),
            matchedCompanyName: vciMerged.company_name,
            matchConfidence: 1.0,
            matchType: "exact",
            authoritativeSignals: {},
            conflicts: [],
            dataQuality: vciDataQuality,
            dataFreshness: {
              lastUpdated: vciMerged.last_updated,
              stale: false,
              staleThresholdHours: STALE_HOURS,
              vciTier: vciRow.data_quality_tier,
              workforceSource: vciRow.workforce_source,
              workforceConfidence: vciRow.workforce_confidence,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    } catch { /* VCI table may not exist yet — fall through to legacy path */ }

    // v35.1.2 — CANONICAL-AWARE row selection.
    //
    // The DB contains multiple snapshot rows for famous companies (Oracle: 5
    // rows with workforce 9k–166k, Infosys: 3 rows with 50k–328k, TCS: 2 rows
    // with 49k–604k). The legacy ilike(exact) path picks the FIRST row matching
    // the user's input — for "Oracle" that's the row literally named 'Oracle'
    // (workforce 51k, STALE) instead of 'ORACLE CORP' (162k, current).
    //
    // Fix: when the user's input maps to a KNOWN_HEADCOUNTS canonical key,
    // search broadly for ALL rows containing that key, then pick the one
    // whose workforce_count is CLOSEST to the curated KNOWN_HEADCOUNTS value.
    // This consistently resolves to the most-accurate snapshot regardless of
    // exact name match.
    //
    // Only triggers for well-known companies (the KNOWN_HEADCOUNTS map). For
    // long-tail companies the original ilike-exact path runs unchanged.
    let intelExact: JsonObject | null = null;
    let sourcePath:
      | "edge_canonical"
      | "edge_exact"
      | "edge_prefix"
      | "edge_contains"
      | "edge_fallback" = "edge_fallback";

    const canonicalKey = findKnownHeadcountKey(companyName.toLowerCase());
    if (canonicalKey) {
      const canonicalCount = KNOWN_HEADCOUNTS[canonicalKey];
      const { data: candidateRows } = await supabaseClient
        .from("company_intelligence")
        .select("*")
        .ilike("company_name", `%${canonicalKey}%`)
        .limit(20);
      if (Array.isArray(candidateRows) && candidateRows.length > 0) {
        // Pick the row whose workforce_count is closest to KNOWN_HEADCOUNTS
        // (proportional distance, so 162k vs 164k beats 51k vs 164k).
        let bestRow: JsonObject | null = null;
        let bestDistance = Infinity;
        for (const row of candidateRows) {
          const wc = typeof row.workforce_count === "number" ? row.workforce_count : 0;
          // Skip rows with obviously-broken workforce (< 100) — they're
          // partial-ingestion artifacts that can't be the canonical record.
          if (wc < 100) continue;
          const distance = Math.abs(wc - canonicalCount) / canonicalCount;
          if (distance < bestDistance) {
            bestRow = row;
            bestDistance = distance;
          }
        }
        if (bestRow) {
          intelExact = bestRow;
          sourcePath = "edge_canonical";
          console.log(
            `[fetch-company-data] Canonical-aware pick: "${companyName}" → "${bestRow.company_name}" ` +
              `(workforce=${bestRow.workforce_count}, canonical=${canonicalCount}, distance=${bestDistance.toFixed(2)})`,
          );
        }
      }
    }

    // Fallback: legacy ilike(exact) path for companies NOT in KNOWN_HEADCOUNTS
    // OR when the canonical search returned no plausible candidates.
    if (!intelExact) {
      const { data: intelExactRows } = await supabaseClient
        .from("company_intelligence")
        .select("*")
        .ilike("company_name", companyName)
        .order("confidence_score", { ascending: false })
        .limit(1);
      intelExact = Array.isArray(intelExactRows) && intelExactRows.length > 0
        ? intelExactRows[0]
        : null;
      if (intelExact) sourcePath = "edge_exact";
    }

    let intelRow = intelExact;
    let matchConfidence = intelExact ? 1.0 : 0.0;
    let matchType: MatchType = intelExact ? "exact" : "none";
    let matchedCompanyName: string | null = intelExact?.company_name ?? null;
    if (!intelExact) sourcePath = "edge_fallback";

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

    // Ticker-based fallback: handles abbreviations like "TCS" → "Tata Consultancy Services"
    // The name query above uses ILIKE '%TCS%' which won't match "Tata Consultancy Services".
    if (!intelRow && companyName.length <= 6 && /^[A-Z0-9]+$/i.test(companyName.trim())) {
      const tickerUpper = companyName.trim().toUpperCase();
      const { data: tickerRows } = await supabaseClient
        .from("company_intelligence")
        .select("*")
        .filter("financial_signals->>ticker", "ilike", tickerUpper)
        .limit(3);

      if (Array.isArray(tickerRows) && tickerRows.length > 0) {
        intelRow = tickerRows[0];
        matchConfidence = 0.90;
        matchType = "exact";
        matchedCompanyName = String(tickerRows[0].company_name || "");
        sourcePath = "edge_exact";
      }
    }

    // Staleness gate: mark DB rows > 7 days old so the pipeline can demote to 'stale_db'
    // instead of treating aged rows as authoritative live data.
    if (intelRow) {
      const rowLastUpdated = intelRow.last_updated ?? intelRow.updated_at ?? null;
      const rowAgeDays = rowLastUpdated
        ? (Date.now() - new Date(String(rowLastUpdated)).getTime()) / (1000 * 60 * 60 * 24)
        : 999;
      if (rowAgeDays > 7) {
        Object.assign(intelRow, { _staleDb: true, _ageDays: Math.round(rowAgeDays) });
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

    // Always re-run news enrichment when data is stale — even if recent_layoff_news
    // was previously true, that flag could reflect an old event. Skipping on
    // recent_layoff_news=true caused new May 2026 layoff signals to be silently dropped
    // for companies that had a prior unrelated layoff in their DB record.
    const shouldEnrichNews = isStale(merged.last_updated);
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

    // v45.0 — Write-back to verified_company_intelligence after live enrichment.
    // This ensures the new enterprise table stays current without a separate
    // migration job.  Only writes when we have at least one live signal so we
    // don't overwrite a good verified row with a heuristic fallback.
    const hasLiveSignal =
      provenance.some((p) => p.startsWith("alpha_vantage.") || p.startsWith("newsapi."));
    if (hasLiveSignal || (intelRow && !intelRow._staleDb)) {
      try {
        const vciTier: string = hasLiveSignal ? "live"
          : intelRow && !intelRow._staleDb ? "seed"
          : "heuristic";
        const vciCanonical = normalise(merged.company_name ?? normalized);
        // Only upsert when a prior row already exists (migration already ran)
        // so we don't pollute the table with every unknown company.
        // Use a .maybeSingle() check first — if no row exists, skip write.
        const { data: existingVci } = await supabaseClient
          .from("verified_company_intelligence")
          .select("id")
          .eq("canonical_name", vciCanonical)
          .maybeSingle();

        if (existingVci) {
          await supabaseClient
            .from("verified_company_intelligence")
            .update({
              stock_90d_change: merged.stock_90d_change ?? undefined,
              stock_price: null, // not available from current enrichment path
              financials_verified_at:
                provenance.some((p) => p.startsWith("alpha_vantage."))
                  ? new Date().toISOString()
                  : undefined,
              financials_confidence:
                provenance.some((p) => p.startsWith("alpha_vantage."))
                  ? 0.85
                  : undefined,
              recent_layoff_count:
                Array.isArray(merged.recent_layoffs) ? merged.recent_layoffs.length : 0,
              largest_layoff_pct: merged.last_layoff_percent ?? undefined,
              layoff_last_event_at:
                Array.isArray(merged.recent_layoffs) && merged.recent_layoffs.length > 0
                  ? String(merged.recent_layoffs[0]?.date ?? "")
                  : undefined,
              layoff_verified_at:
                provenance.some((p) => p.startsWith("newsapi."))
                  ? new Date().toISOString()
                  : undefined,
              layoff_confidence:
                provenance.some((p) => p.startsWith("newsapi.")) ? 0.75 : undefined,
              data_quality_tier: vciTier,
              last_enriched_at: new Date().toISOString(),
              enrichment_version: "fetch-company-data-v45.0",
            })
            .eq("canonical_name", vciCanonical);
        }
      } catch { /* non-fatal — write-back is best-effort */ }
    }

    const stale = isStale(merged.last_updated);
    const authoritativeSignals: Record<string, ProvenancedSignal<unknown>> = {};
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
      // Fix H-3: revenue_yoy was incorrectly attributed to alpha_vantage when
      // hasLiveStockProvenance was true. AlphaVantage TIME_SERIES_DAILY_ADJUSTED
      // returns only daily price data — no revenue figures. Revenue YoY always
      // originates from the company_intelligence DB row. Decoupling the source
      // label from stock-data provenance prevents inflated confidence (0.74→0.92)
      // on a value that was never actually refreshed from a live source.
      authoritativeSignals.revenue_yoy = createSignal(
        "revenue_yoy",
        merged.revenue_yoy,
        intelRow ? "db" : "heuristic",
        baselineMerged.source || "company_intelligence",
        dbObservedAt,
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
          _staleDb: (intelRow as Record<string, unknown> | null)?._staleDb ?? false,
          _ageDays:  (intelRow as Record<string, unknown> | null)?._ageDays  ?? null,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
  }));
