// migrate-company-intelligence/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Controlled migration pipeline: reads rows from `company_intelligence`,
// fetches verified real data (workforce, financials, layoffs, hiring), then
// upserts into `verified_company_intelligence`.
//
// Modes (POST body):
//   { "mode": "status" }                          — progress stats
//   { "mode": "migrate_one", "canonical_name": "infosys" }
//   { "mode": "migrate_batch", "limit": 10 }      — next N unmigrated rows
//
// Security: service_role key required (Authorization: Bearer <service_key>)
// ─────────────────────────────────────────────────────────────────────────────

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { KNOWN_HEADCOUNTS } from "../_shared/knownHeadcounts.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-request-id",
};

const EF_VERSION = "migrate-v1.0";

// ─── Types ────────────────────────────────────────────────────────────────────

type DataQualityTier = "verified" | "live" | "seed" | "heuristic";

interface WorkforceResult {
  count: number | null;
  source: string;
  confidence: number;
}

interface FinancialResult {
  price: number | null;
  marketCap: number | null;
  peRatio: number | null;
  revenueTtm: number | null;
  change90d: number | null;
  confidence: number;
}

interface LayoffResult {
  count: number;
  largestPct: number | null;
  lastEventAt: string | null;
  source: string;
  confidence: number;
}

interface HiringResult {
  velocityScore: number | null;
  totalOpenRoles: number | null;
  source: string;
  confidence: number;
}

interface MigrationResult {
  success: boolean;
  canonicalName: string;
  tier: DataQualityTier;
  error?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const normalise = (v: string) =>
  v.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

/**
 * Strip trailing parenthetical tags added by the seeding pipeline.
 * Examples:
 *   "Infosys (India Giant)"       → "Infosys"
 *   "HCA Healthcare (Digital Enriched)" → "HCA Healthcare"
 *   "Dr. Reddy's Laboratories (Enriched)" → "Dr. Reddy's Laboratories"
 *   "Rolls-Royce Global (Global Giant)" → "Rolls-Royce Global"
 */
const stripDbTag = (name: string): string =>
  name.replace(/\s*\([^)]*\)\s*$/, "").trim();

/**
 * Find the best matching KNOWN_HEADCOUNTS key for a company name.
 * Longest match wins so "tata consultancy" beats "tata".
 */
function findKnownHCKey(name: string): string | null {
  const lower = name.toLowerCase();
  let best: string | null = null;
  for (const key of Object.keys(KNOWN_HEADCOUNTS)) {
    if (lower.includes(key) && (!best || key.length > best.length)) {
      best = key;
    }
  }
  return best;
}

/**
 * Compute data_quality_tier from available enrichment results.
 *   - 'verified' : real-source workforce + live financials
 *   - 'live'     : live financials (Yahoo Finance returned a price)
 *   - 'seed'     : real/canonical workforce count, no live financials
 *   - 'heuristic': nothing beyond defaults
 */
function computeQualityTier(
  wf: WorkforceResult,
  fin: FinancialResult | null,
  layoffs: LayoffResult,
): DataQualityTier {
  const hasRealWorkforce = ["wikipedia_scrape", "annual_report_scrape", "glassdoor_about",
    "press_release", "known_headcounts_map"].includes(wf.source);
  const hasLiveFinancials = fin !== null && fin.price !== null;

  if (hasRealWorkforce && hasLiveFinancials) return "verified";
  if (hasLiveFinancials) return "live";
  // Bug fix: wikipedia_scrape + known_headcounts_map both count as 'seed' even without financials
  if (hasRealWorkforce) return "seed";
  if (layoffs.count > 0) return "seed";   // at least some live signal
  return "heuristic";
}

// ─── Workforce enrichment ─────────────────────────────────────────────────────

async function enrichWorkforce(
  displayName: string,
  _ticker: string | null,
): Promise<WorkforceResult> {
  // Priority 1: Wikipedia infobox scrape
  const wikiResult = await fetchWikipediaHeadcount(displayName);
  if (wikiResult !== null) {
    return { count: wikiResult, source: "wikipedia_scrape", confidence: 0.88 };
  }

  // Priority 2: KNOWN_HEADCOUNTS canonical map (curated from public filings)
  const hcKey = findKnownHCKey(displayName);
  if (hcKey) {
    return {
      count: KNOWN_HEADCOUNTS[hcKey],
      source: "known_headcounts_map",
      confidence: 0.82,
    };
  }

  // Priority 3: heuristic (no data)
  return { count: null, source: "heuristic", confidence: 0.20 };
}

async function fetchWikipediaHeadcount(companyName: string): Promise<number | null> {
  try {
    // Wikipedia REST API — search for the company page
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(companyName + " company")}&utf8=1&format=json&origin=*`;
    const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(6000) });
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json() as { query?: { search?: Array<{ pageid: number; title: string }> } };
    const firstHit = searchData?.query?.search?.[0];
    if (!firstHit) return null;

    // Fetch the page content (plain text extract)
    const extractUrl = `https://en.wikipedia.org/w/api.php?action=query&pageids=${firstHit.pageid}&prop=revisions&rvprop=content&format=json&origin=*`;
    const extractRes = await fetch(extractUrl, { signal: AbortSignal.timeout(8000) });
    if (!extractRes.ok) return null;
    const extractData = await extractRes.json() as Record<string, unknown>;
    const pages = (extractData as Record<string, Record<string, unknown>>)?.query?.pages as Record<string, { revisions?: Array<{ "*": string }> }> | undefined;
    if (!pages) return null;
    const content = Object.values(pages)[0]?.revisions?.[0]?.["*"] ?? "";
    if (!content) return null;

    // Extract employee count from infobox: | num_employees = 343,000 (2024)
    // or | employees = 613,000
    const m = content.match(
      /\|\s*(?:num_employees|employees|workforce|headcount)\s*=\s*([0-9][0-9,\.]+)/i,
    );
    if (!m) return null;
    const raw = m[1].replace(/,/g, "").replace(/\./g, "");
    const parsed = parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < 100 || parsed > 5_000_000) return null;
    return parsed;
  } catch {
    return null;
  }
}

// ─── Financial enrichment (Yahoo Finance public endpoint, no API key) ─────────

async function enrichFinancials(ticker: string): Promise<FinancialResult | null> {
  try {
    // Yahoo Finance quote endpoint — publicly accessible, no key required
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=3mo&events=div,split`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; HumanProof/1.0; +https://humanproof.ai)",
      },
    });
    if (!res.ok) return null;

    const json = await res.json() as Record<string, unknown>;
    const result = (json as Record<string, Record<string, unknown>>)?.chart?.result?.[0];
    if (!result) return null;

    const meta = result?.meta as Record<string, unknown> ?? {};
    const indicators = (result?.indicators as Record<string, Array<Record<string, unknown>>>) ?? {};
    const closes = (indicators?.quote?.[0]?.close as number[] | undefined) ?? [];

    const price = typeof meta.regularMarketPrice === "number" ? meta.regularMarketPrice : null;
    const marketCap = typeof meta.marketCap === "number" ? meta.marketCap : null;
    const currency = typeof meta.currency === "string" ? meta.currency : "USD";

    // 90-day % change from first to last close in the 3mo range
    const validCloses = closes.filter((c) => c !== null && c > 0);
    let change90d: number | null = null;
    if (validCloses.length >= 2) {
      const first = validCloses[0];
      const last = validCloses[validCloses.length - 1];
      change90d = Number((((last - first) / first) * 100).toFixed(2));
    }

    // Convert market cap to USD if currency is INR (Indian companies)
    let marketCapUsd = marketCap;
    if (currency === "INR" && marketCap !== null) {
      // Approximate: ₹1 ≈ $0.012 (adjust via env var if more precision needed)
      const INR_TO_USD = 0.012;
      marketCapUsd = Math.round(marketCap * INR_TO_USD);
    }

    return {
      price,
      marketCap: marketCapUsd,
      peRatio: typeof meta.trailingPE === "number" ? meta.trailingPE : null,
      revenueTtm: null, // not available in chart endpoint; would need /v10/finance/quoteSummary
      change90d,
      confidence: price !== null ? 0.85 : 0.30,
    };
  } catch {
    return null;
  }
}

// ─── Layoff enrichment (breaking_news_events + derived from company_intelligence) ─

async function enrichLayoffs(
  supabase: SupabaseClient,
  canonicalName: string,
  displayName?: string,
): Promise<LayoffResult> {
  const sixMonthsAgo = new Date(Date.now() - 180 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  // Search by both the short canonical key (e.g. "infosys") and the full display
  // name (e.g. "Infosys Limited") to maximise breaking_news_events coverage.
  const searchTerm = displayName
    ? normalise(displayName).split(" ")[0]   // first word of display name
    : canonicalName;

  try {
    const { data: rows } = await supabase
      .from("breaking_news_events")
      .select("event_date, percent_cut, affected_count, source")
      .ilike("company_name", `%${searchTerm.replace(/[%_]/g, "\\$&")}%`)
      .gte("event_date", sixMonthsAgo)
      .order("event_date", { ascending: false })
      .limit(10);

    if (!Array.isArray(rows) || rows.length === 0) {
      return {
        count: 0,
        largestPct: null,
        lastEventAt: null,
        source: "breaking_news_events",
        confidence: 0.60,
      };
    }

    const pcts = rows
      .map((r: Record<string, unknown>) => r.percent_cut as number | null)
      .filter((p): p is number => p !== null && p > 0);
    const largestPct = pcts.length > 0 ? Math.max(...pcts) : null;
    const lastEvent = rows[0];

    return {
      count: rows.length,
      largestPct,
      lastEventAt: String(lastEvent.event_date ?? ""),
      source: "breaking_news_events",
      confidence: 0.75,
    };
  } catch {
    return { count: 0, largestPct: null, lastEventAt: null, source: "breaking_news_events", confidence: 0.50 };
  }
}

// ─── Hiring enrichment (company_skill_demand_cache) ────────────────────────────

async function enrichHiring(
  supabase: SupabaseClient,
  canonicalName: string,
  displayName?: string,
): Promise<HiringResult> {
  const searchTerm = displayName
    ? normalise(displayName).split(" ")[0]
    : canonicalName;

  try {
    const { data: rows } = await supabase
      .from("company_skill_demand_cache")
      .select("total_openings, trend_direction, fetched_at")
      .ilike("company_name", `%${searchTerm.replace(/[%_]/g, "\\$&")}%`)
      .order("fetched_at", { ascending: false })
      .limit(20);

    if (!Array.isArray(rows) || rows.length === 0) {
      return { velocityScore: null, totalOpenRoles: null, source: "company_skill_demand_cache", confidence: 0.30 };
    }

    const totalOpenRoles = rows.reduce(
      (sum, r: Record<string, unknown>) =>
        sum + (typeof r.total_openings === "number" ? r.total_openings : 0),
      0,
    );

    // Velocity score: average trend direction across role families
    // trend_direction: 'up' (+1) | 'flat' (0) | 'down' (-1)
    const directionMap: Record<string, number> = { up: 1, flat: 0, stable: 0, down: -1, contracting: -2 };
    const directions = rows
      .map((r: Record<string, unknown>) => directionMap[String(r.trend_direction ?? "flat")] ?? 0);
    const velocityScore = directions.length > 0
      ? Number((directions.reduce((a, b) => a + b, 0) / directions.length * 5).toFixed(2))
      : null;

    return {
      velocityScore,
      totalOpenRoles: totalOpenRoles > 0 ? totalOpenRoles : null,
      source: "company_skill_demand_cache",
      confidence: 0.70,
    };
  } catch {
    return { velocityScore: null, totalOpenRoles: null, source: "company_skill_demand_cache", confidence: 0.30 };
  }
}

// ─── Core migration function ───────────────────────────────────────────────────

async function migrateOne(
  supabase: SupabaseClient,
  // `inputName` may be either the short canonical key ("infosys") supplied by
  // the API caller, or the raw DB company_name ("Infosys (India Giant)") supplied
  // by migrateBatch.  We handle both by searching ilike on the first meaningful
  // word of the input so the DB query always succeeds.
  inputName: string,
): Promise<MigrationResult> {
  // 1. READ old row — search by first word for robustness against parenthetical suffixes
  const firstWord = inputName.trim().split(/[\s(]/)[0];  // "Babylon Health (Legacy)" → "Babylon"
  const { data: old, error: readErr } = await supabase
    .from("company_intelligence")
    .select("*")
    .ilike("company_name", `%${firstWord}%`)
    .order("confidence_score", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (readErr || !old) {
    await logMigration(supabase, normalise(inputName), "failed", null, null, {}, `company_intelligence row not found for "${inputName}": ${readErr?.message}`);
    return { success: false, canonicalName: normalise(inputName), tier: "heuristic", error: "Row not found in company_intelligence" };
  }

  const displayName = String(old.company_name || inputName);

  // Fix: ticker is stored inside financial_signals JSONB, not as a flat column
  // (the stock_ticker flat column may not exist in all DB deployments).
  const fin = (old.financial_signals as Record<string, unknown>) ?? {};
  const ticker = (fin.ticker ?? fin.stock_ticker ?? fin.symbol ?? null) as string | null;
  const industry = old.industry ?? "Technology";
  const isPublic = old.stage === "public" || fin.is_public === true || !!ticker;
  const countryCode = (fin.country_code ?? (typeof fin.region === "string" ? fin.region.slice(0, 2).toUpperCase() : null)) as string | null;
  const exchange = (fin.exchange ?? null) as string | null;
  const sector = (fin.sector ?? null) as string | null;

  // 2-3. VALIDATE + CANONICALIZE
  // Use the KNOWN_HEADCOUNTS key as the canonical name when available — this strips
  // DB-specific suffixes like "(India Giant)" or "Limited" and ensures lookups in
  // getVerifiedCompanyData work with simple inputs like "infosys" or "wipro".
  // Use KNOWN_HEADCOUNTS key when available; otherwise strip the DB tag suffix
  // ("Infosys (India Giant)" → "infosys", "HCA Healthcare (Digital Enriched)" → "hca healthcare")
  const knownKey = findKnownHCKey(displayName);
  const safeCanonical = knownKey ?? normalise(stripDbTag(displayName));

  // 4. ENRICH_WORKFORCE
  const workforce = await enrichWorkforce(displayName, ticker);

  // 5. ENRICH_FINANCIALS (only for public companies with tickers)
  const financials = (isPublic && ticker) ? await enrichFinancials(ticker) : null;

  // 6. ENRICH_LAYOFFS — search by both the canonical key and the display name
  const layoffs = await enrichLayoffs(supabase, safeCanonical, displayName);

  // 7. ENRICH_HIRING — same dual search
  const hiring = await enrichHiring(supabase, safeCanonical, displayName);

  // 8. COMPUTE_QUALITY_TIER
  const tier = computeQualityTier(workforce, financials, layoffs);

  // 9. UPSERT into verified_company_intelligence
  const now = new Date().toISOString();
  const { data: newRow, error: upsertErr } = await supabase
    .from("verified_company_intelligence")
    .upsert(
      {
        canonical_name: safeCanonical,
        display_name: stripDbTag(displayName),
        ticker: ticker ?? null,
        exchange: exchange ?? null,
        industry,
        sector: sector ?? null,
        is_public: isPublic,
        country_code: countryCode ?? null,

        workforce_count: workforce.count,
        workforce_source: workforce.source,
        workforce_verified_at: workforce.count !== null ? now : null,
        workforce_confidence: workforce.confidence,

        stock_price: financials?.price ?? null,
        market_cap_usd: financials?.marketCap ?? null,
        pe_ratio: financials?.peRatio ?? null,
        revenue_ttm_usd: financials?.revenueTtm ?? null,
        stock_90d_change: financials?.change90d ?? null,
        financials_source: "yahoo_finance_scrape",
        financials_verified_at: financials !== null ? now : null,
        financials_confidence: financials?.confidence ?? null,

        recent_layoff_count: layoffs.count,
        largest_layoff_pct: layoffs.largestPct,
        layoff_last_event_at: layoffs.lastEventAt ?? null,
        layoff_source: layoffs.source,
        layoff_verified_at: now,
        layoff_confidence: layoffs.confidence,

        hiring_velocity_score: hiring.velocityScore,
        total_open_roles: hiring.totalOpenRoles,
        hiring_source: hiring.source,
        hiring_verified_at: now,
        hiring_confidence: hiring.confidence,

        data_quality_tier: tier,
        enrichment_version: EF_VERSION,
        last_enriched_at: now,
        conflict_flags: "[]",
      },
      { onConflict: "canonical_name" },
    )
    .select("id")
    .single();

  if (upsertErr) {
    await logMigration(supabase, safeCanonical, "failed", old.id, null, {}, upsertErr.message);
    return { success: false, canonicalName: safeCanonical, tier, error: upsertErr.message };
  }

  const newId = newRow?.id ?? null;

  // 10. Preserve role_risk_map in company_risk_overrides if present
  const roleRiskMap = old.role_risk_map;
  if (roleRiskMap && typeof roleRiskMap === "object" && Object.keys(roleRiskMap).length > 0) {
    await supabase
      .from("company_risk_overrides")
      .upsert(
        {
          canonical_name: safeCanonical,
          override_type: "role_risk_map",
          override_value: roleRiskMap,
          override_reason: "Migrated from company_intelligence.role_risk_map v1.0",
          overridden_by: "migration",
        },
        { onConflict: "canonical_name,override_type" },
      );
  }

  // Log success
  await logMigration(supabase, safeCanonical, "complete", old.id, newId, {
    tier,
    hasWorkforce: workforce.count !== null,
    hasFinancials: financials !== null,
    hasLayoffs: layoffs.count > 0,
    hasHiring: hiring.velocityScore !== null,
    workforceSource: workforce.source,
  }, null);

  return { success: true, canonicalName: safeCanonical, tier };
}

async function logMigration(
  supabase: SupabaseClient,
  canonicalName: string,
  phase: string,
  oldId: string | null,
  newId: string | null,
  result: Record<string, unknown>,
  error: string | null,
): Promise<void> {
  try {
    await supabase.from("company_migration_log").insert({
      canonical_name: canonicalName,
      migration_phase: phase,
      old_table_id: oldId,
      new_table_id: newId,
      validation_result: result,
      error_message: error,
    });
  } catch { /* non-fatal */ }
}

// ─── Batch migration ───────────────────────────────────────────────────────────

async function migrateBatch(
  supabase: SupabaseClient,
  limit: number,
): Promise<{ migrated: number; errors: string[]; results: MigrationResult[] }> {
  // Find company_intelligence rows NOT yet in verified_company_intelligence
  const { data: allOld } = await supabase
    .from("company_intelligence")
    .select("company_name")
    .order("confidence_score", { ascending: false })
    .limit(limit * 3);  // overfetch to account for already-migrated

  const { data: alreadyMigrated } = await supabase
    .from("verified_company_intelligence")
    .select("canonical_name");

  const migratedSet = new Set(
    (alreadyMigrated ?? []).map((r: Record<string, unknown>) => String(r.canonical_name)),
  );

  const toMigrate = (allOld ?? [])
    .filter((r: Record<string, unknown>) => {
      const name = String(r.company_name);
      // Check both the KNOWN_HEADCOUNTS key and the raw normalised name so we
      // don't re-migrate a company that was already stored under its canonical key.
      const knownKey = findKnownHCKey(name);
      return !migratedSet.has(knownKey ?? normalise(stripDbTag(name)));
    })
    .slice(0, limit);

  const results: MigrationResult[] = [];
  const errors: string[] = [];
  for (const row of toMigrate) {
    // Pass the raw DB company_name so migrateOne can search by its first word.
    // (Passing a normalised name would lose the original casing and punctuation
    // needed for a reliable ilike match back into company_intelligence.)
    const result = await migrateOne(supabase, String(row.company_name));
    results.push(result);
    if (!result.success && result.error) errors.push(`${result.canonicalName}: ${result.error}`);
    // Rate-limit: 200ms between companies to avoid hammering Yahoo Finance
    await new Promise((r) => setTimeout(r, 200));
  }

  return { migrated: results.filter((r) => r.success).length, errors, results };
}

// ─── Status query ──────────────────────────────────────────────────────────────

async function getStatus(supabase: SupabaseClient) {
  const [{ count: totalOld }, { count: totalNew }, { data: recentLog }] =
    await Promise.all([
      supabase.from("company_intelligence").select("*", { count: "exact", head: true }),
      supabase.from("verified_company_intelligence").select("*", { count: "exact", head: true }),
      supabase
        .from("company_migration_log")
        .select("canonical_name, migration_phase, migrated_at, validation_result")
        .order("migrated_at", { ascending: false })
        .limit(10),
    ]);

  return {
    totalInOldTable: totalOld ?? 0,
    totalInNewTable: totalNew ?? 0,
    percentMigrated: totalOld ? Math.round(((totalNew ?? 0) / totalOld) * 100) : 0,
    recentMigrations: recentLog ?? [],
  };
}

// ─── Request handler ───────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Require service_role authorization.
  // Decode the Bearer JWT and verify the `role` claim equals 'service_role'.
  // This is more robust than raw string comparison because the JWT payload
  // is the same regardless of how the key is stored or passed.
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  let isServiceRole = false;
  try {
    const payloadB64 = token.split(".")[1] ?? "";
    // atob with URL-safe base64 padding
    const padded = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(padded.padEnd(padded.length + (4 - padded.length % 4) % 4, "="));
    const payload = JSON.parse(json) as Record<string, unknown>;
    isServiceRole = payload.role === "service_role";
  } catch { /* malformed token */ }

  if (!isServiceRole) {
    return new Response(
      JSON.stringify({ error: "Unauthorized — service_role JWT required" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    serviceKey,
  );

  try {
    const body = await req.json() as { mode?: string; canonical_name?: string; limit?: number };
    const mode = body.mode ?? "status";

    if (mode === "status") {
      const status = await getStatus(supabase);
      return new Response(JSON.stringify(status), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mode === "migrate_one") {
      const canonicalName = normalise(String(body.canonical_name ?? ""));
      if (!canonicalName) {
        return new Response(
          JSON.stringify({ error: "canonical_name is required for migrate_one" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const result = await migrateOne(supabase, canonicalName);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mode === "migrate_batch") {
      const limit = Math.min(Math.max(1, Number(body.limit ?? 10)), 50);
      const result = await migrateBatch(supabase, limit);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: `Unknown mode: ${mode}. Use status | migrate_one | migrate_batch` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[migrate-company-intelligence] Unhandled error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
