// companyIntelligenceService.ts
// Supabase-backed company intelligence lookup — replaces all code-side company datasets.
// Queries the `company_intelligence` table (2000+ records) with exact + fuzzy matching.
// Also owns the learning loop (confidence_score updates) and discovery queue capture.

import { supabase } from '../utils/supabase';
import { escapeIlike } from '../utils/ilikeEscape';
import { CompanyProfile } from '../data/companyIntelligenceDB';
import { companyProfileToData } from '../data/companyIntelligenceBridge';
import type { CompanyData } from '../data/companyDatabase';

// Seeded records without a last_updated timestamp are treated as pre-2026 baseline
// data. classifyDbFreshness(500+ days) → 'invalid', so live signals ALWAYS supersede them
// instead of a null timestamp defaulting to new Date() and appearing "just-fetched fresh".
// WS12 — computed 365 days ago instead of a hardcoded calendar date,
// so the sentinel is GUARANTEED > 30 days stale forever without
// per-year maintenance. See auditDataPipeline.ts for the same fix.
const STALE_SEED_DATE = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();

// ── Row shape from Supabase company_intelligence table ────────────────────────
// Supports both jsonb-nested and flat column layouts — reads whichever is present.
interface CIRow {
  id?: string;
  company_name: string;
  industry: string;
  company_size?: string;
  stage?: string;
  stock_ticker?: string;
  region?: string;
  // jsonb columns (nested) — preferred
  financial_signals?: Record<string, any>;
  layoff_history?: Record<string, any>;
  hiring_signals?: Record<string, any>;
  role_risk_map?: Record<string, any>;
  // flat column fallbacks
  revenue_trend?: string;
  funding_stage?: string;
  burn_rate_estimate?: string;
  last_funding_date?: string;
  total_layoffs?: number;
  last_layoff_date?: string;
  layoff_frequency?: string;
  affected_departments?: string[];
  hiring_velocity?: string;
  hiring_freeze_score?: number;
  // scores
  ai_exposure_index?: number;
  market_risk_score?: number;
  company_risk_score?: number;
  confidence_score?: number;
  last_updated?: string;
}

// ── Map Supabase row → CompanyProfile ─────────────────────────────────────────

function rowToProfile(row: CIRow): CompanyProfile {
  const fin = row.financial_signals ?? {};
  const lay = row.layoff_history ?? {};
  const hire = row.hiring_signals ?? {};
  const risk = row.role_risk_map ?? {};

  return {
    // Ensure companyName is always a non-empty string — a null DB value would
    // propagate to CompanyData.name = undefined and crash the score engine's
    // layoffNewsCache filter which calls .toLowerCase() without a null check.
    companyName: row.company_name ?? `Unknown-${row.id ?? 'company'}`,
    industry: row.industry ?? 'Technology',
    companySize: (row.company_size ?? 'mid') as CompanyProfile['companySize'],
    stage: (row.stage ?? 'mature') as CompanyProfile['stage'],
    stockTicker: row.stock_ticker ?? undefined,

    financialSignals: {
      // JSONB keys from MIGRATE_COMPANIES_SQL_EDITOR.sql are snake_case.
      // Read snake_case first (from JSONB), then camelCase (TypeScript DB seeds),
      // then flat column fallback, then hard default.
      revenueTrend: (fin.revenue_trend ?? fin.revenueTrend ?? row.revenue_trend ?? 'stable') as CompanyProfile['financialSignals']['revenueTrend'],
      // Infer isPublic from row.stage so it mirrors fetch-company-data logic.
      // Previously defaulted to 'public' for all missing rows — incorrectly marked
      // private companies as listed and triggered failed stock lookups.
      fundingStage: (fin.funding_stage ?? fin.fundingStage ?? (row.stage === 'public' ? 'public' : row.funding_stage ?? 'series_d')) as CompanyProfile['financialSignals']['fundingStage'],
      burnRateEstimate: (fin.burn_rate ?? fin.burnRateEstimate ?? row.burn_rate_estimate ?? 'moderate') as CompanyProfile['financialSignals']['burnRateEstimate'],
      lastFundingDate: fin.last_funding_date ?? fin.lastFundingDate ?? row.last_funding_date,
    },

    layoffHistory: {
      // JSONB uses snake_case: total_layoffs, last_layoff_date, layoff_frequency
      totalLayoffs: lay.total_layoffs ?? lay.totalLayoffs ?? row.total_layoffs ?? 0,
      lastLayoffDate: lay.last_layoff_date ?? lay.lastLayoffDate ?? row.last_layoff_date ?? 'none',
      layoffFrequency: (lay.layoff_frequency ?? lay.layoffFrequency ?? row.layoff_frequency ?? 'none') as CompanyProfile['layoffHistory']['layoffFrequency'],
      affectedDepartments: lay.affected_departments ?? lay.affectedDepartments ?? row.affected_departments ?? [],
    },

    hiringSignals: {
      // JSONB uses snake_case: hiring_velocity, hiring_freeze_score
      hiringVelocity: (hire.hiring_velocity ?? hire.hiringVelocity ?? row.hiring_velocity ?? 'moderate') as CompanyProfile['hiringSignals']['hiringVelocity'],
      hiringFreezeScore: hire.hiring_freeze_score ?? hire.hiringFreezeScore ?? row.hiring_freeze_score ?? 0.3,
    },

    roleRiskMap: {
      softwareEngineer: risk.softwareEngineer ?? risk.software_engineer ?? 0.4,
      productManager:   risk.productManager ?? risk.product_manager ?? 0.35,
      dataScientist:    risk.dataScientist ?? risk.data_scientist ?? 0.3,
      designer:         risk.designer ?? 0.35,
      hrRecruiter:      risk.hrRecruiter ?? risk.hr_recruiter ?? 0.55,
      sales:            risk.sales ?? 0.45,
    },

    aiExposureIndex: row.ai_exposure_index ?? 0.5,
    marketRiskScore: row.market_risk_score ?? 0.4,
    companyRiskScore: row.company_risk_score ?? 0.4,
    confidenceScore: row.confidence_score ?? 0.5,
    // CRITICAL: null last_updated means record was seeded without a timestamp.
    // Use STALE_SEED_DATE so freshnessDays > 30 → classifyDbFreshness → 'invalid',
    // preventing seeded data from being treated as fresh and overriding live signals.
    lastUpdated: row.last_updated ?? STALE_SEED_DATE,
  };
}

// ── Cache — avoid repeated Supabase calls for the same company in a session ───
// Stores full match metadata so cache hits return accurate confidence (not hardcoded 1.0).
interface CacheEntry {
  companyData: CompanyData;
  matchConfidence: number;
  matchType: MatchType;
  matchedCompanyName: string | null;
}
const sessionCache = new Map<string, CacheEntry | null>();

// ── Match quality helpers ─────────────────────────────────────────────────────

/**
 * Four-tier match confidence — reflects how much structural evidence supports
 * the name mapping. Used to gate whether user confirmation is required.
 *
 *  exact        1.0  Query normalises to the same string as the DB name.
 *                    Safe to use without confirmation.
 *  prefix       0.9  DB name starts with query, or query starts with DB name.
 *                    E.g. "Micro" → "Microsoft". Safe to use without confirmation.
 *  contains     0.7  DB name contains the query as a contiguous substring.
 *                    E.g. "soft" → "Microsoft". Requires UI disclosure; no prompt.
 *  word_overlap 0.5  Query tokens appear in DB name but not as a prefix or
 *                    contiguous match. E.g. "Wipro BPO" → "Wipro".
 *                    MUST NOT drive a score without explicit user confirmation.
 *  none         0.0  No meaningful overlap. Rejected; treated as unknown company.
 */
export type MatchType = 'exact' | 'prefix' | 'contains' | 'word_overlap' | 'none';

export interface MatchConfidence {
  score:     number;    // 0.0 | 0.5 | 0.7 | 0.9 | 1.0
  matchType: MatchType;
}

/** Threshold below which a match requires user confirmation before driving a score. */
export const MATCH_CONFIRMATION_THRESHOLD = 0.8;

/** Threshold below which a match is rejected outright (not even offered for confirmation). */
export const MATCH_REJECTION_THRESHOLD = 0.5;

const STOP_WORDS = new Set([
  'ltd', 'limited', 'inc', 'corp', 'corporation', 'pvt', 'private',
  'the', 'and', '&', 'of', 'co', 'group', 'holdings', 'technologies', 'services',
]);

function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokens(s: string): string[] {
  return normalise(s).split(' ').filter(t => t.length > 1 && !STOP_WORDS.has(t));
}

/**
 * Compute the four-tier match confidence between the user's query and the DB name.
 *
 * Examples:
 *   "Microsoft"    vs "Microsoft"          → exact        (1.0)
 *   "Micro"        vs "Microsoft"          → prefix       (0.9)
 *   "Microsoft Corp" vs "Microsoft"        → prefix       (0.9)
 *   "tata motors"  vs "Tata Motors Ltd"    → contains     (0.7)
 *   "Wipro BPO"    vs "Wipro"              → word_overlap (0.5)
 *   "HDFC Life"    vs "HDFC Bank"          → word_overlap (0.5)
 *   "Random XYZ"   vs "Microsoft"          → none         (0.0)
 */
export function computeMatchConfidence(query: string, matchedName: string): MatchConfidence {
  const qNorm = normalise(query);
  const mNorm = normalise(matchedName);

  if (qNorm === mNorm) return { score: 1.0, matchType: 'exact' };

  // Prefix: one string is a prefix of the other (after normalisation)
  if (mNorm.startsWith(qNorm) || qNorm.startsWith(mNorm)) {
    return { score: 0.9, matchType: 'prefix' };
  }

  // Contains: DB name contains query as a contiguous substring or vice versa
  if (mNorm.includes(qNorm) || qNorm.includes(mNorm)) {
    return { score: 0.7, matchType: 'contains' };
  }

  // Word overlap: token-level matching
  const qTokens = tokens(query);
  const mTokens = new Set(tokens(matchedName));
  if (qTokens.length === 0) return { score: 0.0, matchType: 'none' };
  const overlap = qTokens.filter(t => mTokens.has(t)).length;
  if (overlap > 0) return { score: 0.5, matchType: 'word_overlap' };

  return { score: 0.0, matchType: 'none' };
}

/**
 * @deprecated Use computeMatchConfidence instead.
 * Kept for backward-compat with existing UI callers that read a 0–1 ratio.
 */
export function computeMatchRatio(query: string, matchedName: string): number {
  return computeMatchConfidence(query, matchedName).score;
}

/** @deprecated Use MATCH_CONFIRMATION_THRESHOLD or MATCH_REJECTION_THRESHOLD. */
export const FUZZY_MATCH_MIN_RATIO = MATCH_REJECTION_THRESHOLD;

/**
 * Extended result from queryCompanyIntelligence that surfaces match quality.
 *
 * ENFORCEMENT CONTRACT:
 *   matchConfidence >= 0.8  → use silently (exact or prefix match)
 *   matchConfidence  = 0.7  → disclose in UI but proceed (contains match)
 *   matchConfidence  = 0.5  → MUST show "Did you mean?" prompt before scoring
 *   matchConfidence  = 0.0  → rejected; falls through to unknown company fallback
 *
 * A word_overlap match (0.5) driving a score without confirmation is a silent
 * accuracy regression: "HDFC Life" → "HDFC Bank" would compute the wrong company's
 * financial health. The prompt turns that into an honest unknown company instead.
 */
export interface CompanyMatchResult {
  companyData:        CompanyData;
  matchedCompanyName: string | null;  // null = exact, string = DB name that was matched
  matchConfidence:    number;          // 0.0 | 0.5 | 0.7 | 0.9 | 1.0
  matchType:          MatchType;
  // Legacy alias — equals matchConfidence; kept for callers that read matchRatio
  matchRatio:         number;
  isExactMatch:       boolean;
}

// ── Primary lookup: exact match, then confidence-gated fuzzy ─────────────────

export async function queryCompanyIntelligence(
  companyName: string,
): Promise<CompanyData | null> {
  const result = await queryCompanyIntelligenceWithMatch(companyName);
  return result?.companyData ?? null;
}

/**
 * Full match result including confidence metadata.
 * Use this when the caller needs to surface "Matched to: [company]" in the UI.
 */
export async function queryCompanyIntelligenceWithMatch(
  companyName: string,
): Promise<CompanyMatchResult | null> {
  const cacheKey = companyName.toLowerCase().trim();
  if (sessionCache.has(cacheKey)) {
    const cached = sessionCache.get(cacheKey)!;
    if (!cached) return null;
    // Return stored match quality — previously this always reported 1.0/exact,
    // which bypassed quality gates for prefix/contains matches served from cache.
    return {
      companyData:        cached.companyData,
      matchedCompanyName: cached.matchedCompanyName,
      matchConfidence:    cached.matchConfidence,
      matchType:          cached.matchType,
      matchRatio:         cached.matchConfidence,
      isExactMatch:       cached.matchType === 'exact',
    };
  }

  try {
    // ── Step 1: Exact match (case-insensitive) ───────────────────────────────
    const { data: exactRows, error: exactErr } = await supabase
      .from('company_intelligence')
      .select('*')
      .ilike('company_name', companyName.trim())
      .limit(1);

    if (!exactErr && exactRows && exactRows.length > 0) {
      const row     = exactRows[0] as CIRow;
      const profile = rowToProfile(row);
      const companyKey = companyName.toLowerCase().replace(/[\s.&()/]+/g, '_').replace(/[^a-z0-9_]/g, '');
      const companyData = companyProfileToData(profile, companyKey);
      sessionCache.set(cacheKey, { companyData, matchConfidence: 1.0, matchType: 'exact', matchedCompanyName: null });
      return {
        companyData,
        matchedCompanyName: null,
        matchConfidence:    1.0,
        matchType:          'exact',
        matchRatio:         1.0,
        isExactMatch:       true,
      };
    }

    // ── Step 2: Fuzzy ILIKE with confidence gate ─────────────────────────────
    // ORDER BY confidence_score DESC so the best-documented company wins when
    // multiple rows match (e.g. "tata" matches Tata Motors, Tata Steel, TCS).
    // Previously there was no ORDER BY — result was insertion-order dependent.
    const { data: fuzzyRows, error: fuzzyErr } = await supabase
      .from('company_intelligence')
      .select('*')
      .ilike('company_name', `%${escapeIlike(companyName.trim())}%`)
      .order('confidence_score', { ascending: false })
      .limit(5); // fetch top-5 by confidence, then pick the best token-ratio match

    if (!fuzzyErr && fuzzyRows && fuzzyRows.length > 0) {
      // Among the candidates, pick the one with the highest token-overlap ratio.
      // This resolves "Wipro BPO" → "Wipro BPO Ltd" (ratio 1.0) over "Wipro" (ratio 0.5).
      let bestRow: CIRow | null = null;
      let bestRatio = 0;
      for (const row of fuzzyRows as CIRow[]) {
        const ratio = computeMatchRatio(companyName, row.company_name);
        if (ratio > bestRatio) {
          bestRatio = ratio;
          bestRow   = row;
        }
      }

      // Confidence gate: reject if no meaningful token overlap with the matched name.
      // word_overlap (0.5) is NOT rejected here — it passes through so the UI can
      // show the "Did you mean?" prompt. Rejection at this layer is for score=0 only.
      if (!bestRow || bestRatio < MATCH_REJECTION_THRESHOLD) {
        console.info(
          `[CompanyIntelligence] Fuzzy match rejected: "${companyName}" → ` +
          `"${bestRow?.company_name ?? 'none'}" confidence=${bestRatio.toFixed(2)} < ${MATCH_REJECTION_THRESHOLD}. ` +
          `Treating as unknown company.`
        );
        sessionCache.set(cacheKey, null); // null = no match; typed as CacheEntry | null
        return null;
      }

      const profile    = rowToProfile(bestRow);
      const companyKey = bestRow.company_name.toLowerCase().replace(/[\s.&()/]+/g, '_').replace(/[^a-z0-9_]/g, '');
      const companyData = companyProfileToData(profile, companyKey);

      const { score: matchConfidence, matchType } = computeMatchConfidence(companyName, bestRow.company_name);
      const matchedName = bestRow.company_name === companyName.trim() ? null : bestRow.company_name;

      // Cache with full match metadata so subsequent cache hits return accurate confidence.
      // word_overlap (0.5) still excluded — user hasn't confirmed, caching would silently
      // reuse a potentially wrong mapping on the next call.
      if (bestRatio >= MATCH_CONFIRMATION_THRESHOLD) {
        sessionCache.set(cacheKey, { companyData, matchConfidence, matchType, matchedCompanyName: matchedName });
      }

      return {
        companyData,
        matchedCompanyName: matchedName,
        matchConfidence,
        matchType,
        matchRatio:   matchConfidence,
        isExactMatch: false,
      };
    }
  } catch (err) {
    console.warn('[CompanyIntelligence] Supabase query failed:', err);
  }

  sessionCache.set(cacheKey, null);
  return null;
}

// ── Discovery queue — capture unknown companies for enrichment ────────────────

export async function saveToDiscoveryQueue(
  companyName: string,
  industry: string,
  roleTitle: string,
): Promise<void> {
  try {
    await supabase.from('company_discovery_queue').insert({
      company_name: companyName,
      industry,
      role_searched: roleTitle,
      searched_at: new Date().toISOString(),
      status: 'pending',
    });
  } catch {
    // Fire-and-forget — never block the audit flow
  }
}

// ── Learning loop — update confidence_score after audit outcome feedback ───────

export async function updateCompanyConfidence(
  companyName: string,
  delta: number, // +0.05 for correct prediction, -0.05 for incorrect
): Promise<void> {
  try {
    // Read current confidence
    const { data } = await supabase
      .from('company_intelligence')
      .select('id, confidence_score')
      .ilike('company_name', companyName)
      .limit(1);

    if (!data || data.length === 0) return;

    const row = data[0] as { id: string; confidence_score: number };
    const newScore = Math.max(0.1, Math.min(1.0, (row.confidence_score ?? 0.5) + delta));

    await supabase
      .from('company_intelligence')
      .update({ confidence_score: newScore, last_updated: new Date().toISOString() })
      .eq('id', row.id);

    // Invalidate session cache so next query gets fresh confidence
    sessionCache.delete(companyName.toLowerCase().trim());
  } catch {
    // Learning loop is non-critical — never block
  }
}

// ── Search helper — for UI autocomplete / CompanyWatchPanel ──────────────────

export async function searchCompanies(
  query: string,
  limit = 10,
): Promise<{ name: string; industry: string; riskScore: number; nDuplicates?: number }[]> {
  try {
    // v35.1.3: query the canonical view so the dropdown shows ONE row per
    // entity (not 5 Oracle rows). The view's search_haystack column lets
    // short-form queries like "TCS" or "ORCL" hit the canonical row even
    // when the canonical display name is the long form.
    const escaped = escapeIlike(query.replace(/[,()]/g, ''));
    const { data, error } = await supabase
      .from('v_company_canonical')
      .select('company_name, industry, company_risk_score, n_duplicates')
      .or(`company_name.ilike.%${escaped}%,search_haystack.ilike.%${escaped}%`)
      .limit(limit);

    if (error || !data) return [];
    return (data as any[])
      .filter(r => r.company_name && typeof r.company_name === 'string' && r.company_name.trim().length > 0)
      .map(r => ({
        name: r.company_name as string,
        industry: r.industry ?? 'Unknown',
        riskScore: Math.round((r.company_risk_score ?? 0.4) * 100),
        nDuplicates: typeof r.n_duplicates === 'number' ? r.n_duplicates : undefined,
      }));
  } catch {
    return [];
  }
}

// ── v6.0 Audit Fix: Disambiguation — return multiple candidates for fuzzy match ──
// When a user types "Wipro", we return Wipro, Wipro BPM, Wipro Infotech, etc.
// The UI then lets the user confirm which entity they work at before scoring.

export interface CompanyCandidate {
  name: string;
  industry: string;
  region: string;
  riskScore: number;
  /** Hire freeze score 0–100, shown as a signal quality indicator */
  hiringFreezeScore?: number;
  source: 'supabase_intelligence';
}

export async function queryCompanyCandidates(
  query: string,
  limit = 5,
): Promise<CompanyCandidate[]> {
  if (!query || query.length < 2) return [];
  try {
    const { data, error } = await supabase
      .from('company_intelligence')
      .select('company_name, industry, region, company_risk_score, hiring_freeze_score')
      .ilike('company_name', `%${escapeIlike(query.trim())}%`)
      .order('confidence_score', { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return (data as any[])
      .filter(r => r.company_name && typeof r.company_name === 'string' && r.company_name.trim().length > 0)
      .map(r => ({
        name:               r.company_name as string,
        industry:           r.industry ?? 'Unknown',
        region:             r.region ?? 'GLOBAL',
        riskScore:          Math.round((r.company_risk_score ?? 0.4) * 100),
        hiringFreezeScore:  r.hiring_freeze_score != null
                              ? Math.round(r.hiring_freeze_score * 100)
                              : undefined,
        source:             'supabase_intelligence' as const,
      }));
  } catch {
    return [];
  }
}
