// peerPercentile.ts
// Transformation Layer — v6.0
//
// A score of 58 is meaningless without context.
// "You score 58. For Data Analysts in India, this places you in the 52nd percentile.
// Top 25% score below 40. The median is 60." — this is actionable.
//
// ── DATA PROVENANCE — READ THIS BEFORE USING SAMPLE SIZES ────────────────────
// ALL distributions in ROLE_DISTRIBUTIONS and INDUSTRY_DISTRIBUTIONS are
// RESEARCH ESTIMATES, not real platform audit data.
//
// The sample sizes (e.g. qa_manual=412, ml_engineer=980) were authored by a
// developer to approximate what distributions from real data might look like,
// informed by NASSCOM AI Readiness Survey 2025, WEF Future of Jobs 2025, and
// McKinsey Global Institute automation reports. No regression was run. No
// platform data was used. The numbers have not been validated.
//
// Current real platform audit count per role: 0.
// (No opted-in audits have accumulated in peer_benchmarks table yet.)
//
// Transition trigger: when a role reaches ≥100 opted-in audits in layoff_scores
// (allow_community_share = true), the weekly refresh_peer_benchmarks() Supabase
// function replaces the hardcoded ROLE_DISTRIBUTIONS entry with real percentiles.
// Until that happens, isResearchEstimate = true on every result.
//
// LIVE PATH: getLivePeerPercentile() queries the peer_benchmarks Supabase table
// first. When a real-data row exists (sampleSize ≥ 100), it returns isResearchEstimate=false.
// Otherwise it falls back to computePeerPercentile() with isResearchEstimate=true.
//
// UI RULE: never display sampleSize without "est." or "research-derived" qualifier
// unless isResearchEstimate === false. The only safe location for the estimate
// number is in a tooltip or secondary label, not as a headline claim like
// "n=2,100 audits on this platform".
// ─────────────────────────────────────────────────────────────────────────────

export interface PeerPercentileResult {
  percentile: number;
  /**
   * Number of profiles the distribution was derived from.
   * When isResearchEstimate=true: always a model estimate — not real platform data.
   * When isResearchEstimate=false: real opted-in platform audits from peer_benchmarks table.
   * UI must show "est." qualifier unless isResearchEstimate === false.
   */
  sampleSize: number;
  /**
   * true  → research estimate (NASSCOM/WEF/McKinsey model). Default until ≥100 real audits.
   * false → real opted-in platform data from peer_benchmarks Supabase table.
   */
  isResearchEstimate: boolean;
  /** Score at 25th percentile (top 75%) */
  p25Score: number;
  /** Score at 50th percentile (median) */
  p50Score: number;
  /** Score at 75th percentile (top 25%) */
  p75Score: number;
  /** Score at 90th percentile (top 10%) */
  p90Score: number;
  /** Contextual label */
  label: string;
  /** Human-readable rank description */
  rankDescription: string;
  /** Data provenance — shown in tooltips only, not as a headline claim */
  dataSource: string;
}

// Role-specific distribution parameters
// Each entry: [p10, p25, p50, p75, p90, sampleSize]
// These are calibrated to the research estimates from NASSCOM + WEF + layoffs.fyi outcomes
const ROLE_DISTRIBUTIONS: Record<string, [number, number, number, number, number, number]> = {
  // [p10, p25, p50, p75, p90, sampleSize]
  qa_manual:          [52, 62, 72, 82, 89, 412],
  qa_automation:      [28, 38, 48, 60, 72, 890],
  sw_backend:         [22, 32, 44, 58, 70, 3984],
  sw_frontend:        [24, 35, 48, 62, 74, 2210],
  sw_fullstack:       [20, 30, 42, 55, 68, 2890],
  data_analyst:       [35, 45, 60, 72, 82, 2100],
  data_scientist:     [22, 33, 46, 58, 70, 1840],
  ml_engineer:        [18, 28, 40, 52, 65, 980],
  devops:             [20, 30, 42, 55, 68, 1420],
  cloud_engineer:     [18, 28, 40, 53, 65, 1100],
  product_manager:    [25, 35, 48, 60, 72, 1680],
  accountant:         [45, 55, 65, 76, 85, 1560],
  financial_analyst:  [40, 50, 62, 74, 83, 1240],
  auditor:            [42, 52, 64, 75, 84, 780],
  tax_professional:   [38, 48, 60, 72, 82, 640],
  hr_generalist:      [48, 58, 68, 78, 86, 980],
  recruiter:          [45, 55, 66, 76, 84, 1200],
  people_analytics:   [28, 38, 50, 62, 74, 340],
  content_writer:     [50, 60, 70, 80, 87, 1840],
  copywriter:         [52, 62, 72, 82, 88, 1120],
  marketing_manager:  [35, 45, 58, 70, 80, 1480],
  seo_specialist:     [55, 65, 74, 83, 90, 680],
  customer_support:   [62, 72, 80, 87, 93, 1340],
  bpo_agent:          [68, 76, 83, 89, 94, 856],
  data_entry:         [72, 80, 86, 91, 95, 420],
  legal_associate:    [40, 50, 62, 74, 83, 560],
  paralegal:          [48, 58, 68, 78, 86, 380],
  doctor:             [12, 20, 30, 42, 56, 680],
  nurse:              [18, 28, 40, 55, 68, 1240],
  ux_designer:        [28, 38, 50, 62, 74, 1120],
  graphic_designer:   [42, 52, 64, 75, 84, 980],
  project_manager:    [30, 40, 52, 65, 76, 1680],
  scrum_master:       [28, 38, 50, 62, 74, 780],
  business_analyst:   [38, 48, 60, 72, 82, 1540],
  sales:              [30, 42, 55, 68, 78, 2200],
  account_manager:    [32, 42, 54, 66, 77, 1860],
};

// Industry-level fallbacks when role isn't matched
const INDUSTRY_DISTRIBUTIONS: Record<string, [number, number, number, number, number, number]> = {
  'Technology':         [20, 32, 46, 60, 72, 8400],
  'IT Services':        [28, 38, 52, 65, 76, 5200],
  'BPO':                [58, 68, 77, 85, 91, 2800],
  'FinTech':            [30, 42, 55, 68, 78, 2100],
  'Banking':            [35, 46, 58, 70, 80, 1800],
  'E-commerce':         [32, 44, 57, 70, 80, 2200],
  'EdTech':             [52, 62, 72, 81, 88, 980],
  'Healthcare':         [15, 24, 36, 50, 64, 1600],
  'Legal':              [38, 48, 60, 72, 82, 680],
  'Consulting':         [28, 38, 50, 62, 74, 1400],
  'Manufacturing':      [40, 52, 64, 74, 83, 1200],
  'Media':              [48, 58, 68, 78, 86, 880],
  'default':            [30, 42, 56, 68, 79, 5000],
};

/**
 * Map a role key to the best matching distribution.
 * Uses progressive fuzzy matching.
 */
function findDistribution(roleKey: string, industry?: string): [number, number, number, number, number, number] {
  const normalized = roleKey.toLowerCase().replace(/[^a-z0-9]+/g, '_');

  // Direct lookup
  if (ROLE_DISTRIBUTIONS[normalized]) return ROLE_DISTRIBUTIONS[normalized];

  // Prefix match
  for (const key of Object.keys(ROLE_DISTRIBUTIONS)) {
    if (normalized.startsWith(key) || key.startsWith(normalized)) {
      return ROLE_DISTRIBUTIONS[key];
    }
  }

  // Word overlap match
  const words = normalized.split('_').filter(w => w.length > 3);
  for (const key of Object.keys(ROLE_DISTRIBUTIONS)) {
    if (words.some(w => key.includes(w))) return ROLE_DISTRIBUTIONS[key];
  }

  // Industry fallback
  if (industry) {
    for (const [ind, dist] of Object.entries(INDUSTRY_DISTRIBUTIONS)) {
      if (industry.toLowerCase().includes(ind.toLowerCase())) return dist;
    }
  }

  return INDUSTRY_DISTRIBUTIONS['default'];
}

/**
 * Compute percentile rank using linear interpolation between known percentiles.
 * Returns 0–100 percentile (higher = more risk than peers).
 */
function scoreToPercentile(score: number, p10: number, p25: number, p50: number, p75: number, p90: number): number {
  // Below p10: 1-9
  if (score <= p10) return Math.max(1, Math.round((score / p10) * 10));
  // p10 to p25
  if (score <= p25) return Math.round(10 + ((score - p10) / (p25 - p10)) * 15);
  // p25 to p50
  if (score <= p50) return Math.round(25 + ((score - p25) / (p50 - p25)) * 25);
  // p50 to p75
  if (score <= p75) return Math.round(50 + ((score - p50) / (p75 - p50)) * 25);
  // p75 to p90
  if (score <= p90) return Math.round(75 + ((score - p75) / (p90 - p75)) * 15);
  // Above p90: 91-99
  return Math.min(99, Math.round(90 + ((score - p90) / (100 - p90)) * 9));
}

function buildRankDescription(percentile: number, roleName: string): string {
  // All comparisons are against a modelled research distribution, not real platform peers.
  // The qualifier "(based on research estimates)" is appended so users cannot mistake this
  // for a comparison against real HumanProof platform audit data.
  const est = '(based on research estimates)';
  if (percentile >= 90) return `Higher risk than an estimated 90% of ${roleName} professionals ${est}.`;
  if (percentile >= 75) return `Above average risk for ${roleName} roles — higher than an estimated 75% of the modelled peer group ${est}.`;
  if (percentile >= 55) return `Slightly above the modelled median for ${roleName} roles ${est}.`;
  if (percentile >= 45) return `Near the modelled median for ${roleName} roles ${est}.`;
  if (percentile >= 25) return `Below average risk for ${roleName} roles — better positioned than an estimated majority of peers ${est}.`;
  return `In the lowest-risk quartile for ${roleName} roles in the research model ${est}.`;
}

/**
 * Compute peer percentile for a given score + role.
 */
export function computePeerPercentile(
  score: number,
  roleKey: string,
  industry?: string,
): PeerPercentileResult {
  const [p10, p25, p50, p75, p90, sampleSize] = findDistribution(roleKey, industry);
  const percentile = scoreToPercentile(score, p10, p25, p50, p75, p90);

  const roleName = roleKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return {
    percentile,
    sampleSize,
    isResearchEstimate: true as const, // always true — see file header for explanation
    p25Score: p25,
    p50Score: p50,
    p75Score: p75,
    p90Score: p90,
    label: percentile >= 75 ? 'Above Average Risk' : percentile >= 45 ? 'Near Median' : 'Below Average Risk',
    rankDescription: buildRankDescription(percentile, roleName),
    dataSource: 'Research estimate — NASSCOM 2025, WEF Future of Jobs 2025, McKinsey Global Institute. Not real platform audits.',
  };
}

/**
 * Format percentile as a user-readable label.
 * "52nd percentile" → "52nd"
 */
export function formatPercentile(percentile: number): string {
  const s = percentile.toString();
  const last = percentile % 10;
  const tens = percentile % 100;
  if (tens >= 11 && tens <= 13) return `${s}th`;
  if (last === 1) return `${s}st`;
  if (last === 2) return `${s}nd`;
  if (last === 3) return `${s}rd`;
  return `${s}th`;
}

/**
 * Format the sample size for display, always qualifying it as an estimate.
 * Uses "≈" prefix and "(research estimate)" suffix to prevent users from
 * believing the number represents real HumanProof platform audits.
 *
 * This function is the SINGLE approved way to render sampleSize in any UI.
 * DO NOT inline sampleSize.toLocaleString() in components without this wrapper.
 */
export function formatResearchSampleSize(sampleSize: number): string {
  return `n≈${sampleSize.toLocaleString()} (research estimate)`;
}

/**
 * Short variant for tight UI spaces (e.g., panel header row).
 */
export function formatResearchSampleSizeShort(sampleSize: number): string {
  return `n≈${sampleSize.toLocaleString()} est.`;
}

// ── Live Supabase path ─────────────────────────────────────────────────────

interface PeerBenchmarkRow {
  role_key:    string;
  p10:         number;
  p25:         number;
  p50:         number;
  p75:         number;
  p90:         number;
  sample_size: number;
  data_as_of:  string;
}

// Session cache — avoid repeated queries for the same role within 30 minutes
const _liveCache = new Map<string, { row: PeerBenchmarkRow | null; fetchedAt: number }>();
const _LIVE_TTL = 30 * 60 * 1000;

/**
 * Primary entry point for peer percentile in async contexts.
 *
 * Queries the peer_benchmarks Supabase table first (populated by
 * refresh_peer_benchmarks() when ≥100 opted-in audits exist for the role).
 * Falls back to computePeerPercentile() when the table has no row for this role.
 *
 * Returns isResearchEstimate=false only when Supabase has real data (sampleSize ≥ 100).
 */
export async function getLivePeerPercentile(
  score: number,
  roleKey: string,
  industry?: string,
): Promise<PeerPercentileResult> {
  const key = roleKey.toLowerCase().replace(/[^a-z0-9]+/g, '_');

  // Session cache hit
  const cached = _liveCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < _LIVE_TTL) {
    return cached.row
      ? _rowToResult(score, cached.row)
      : computePeerPercentile(score, roleKey, industry);
  }

  try {
    const { supabase } = await import('../utils/supabase');
    const { data, error } = await supabase
      .from('peer_benchmarks')
      .select('role_key, p10, p25, p50, p75, p90, sample_size, data_as_of')
      .eq('role_key', key)
      .maybeSingle();

    if (error) throw error;

    if (!data || (data as PeerBenchmarkRow).sample_size < 100) {
      _liveCache.set(key, { row: null, fetchedAt: Date.now() });
      return computePeerPercentile(score, roleKey, industry);
    }

    const row = data as PeerBenchmarkRow;
    _liveCache.set(key, { row, fetchedAt: Date.now() });
    return _rowToResult(score, row);
  } catch {
    // Supabase unavailable — use research estimates
    return computePeerPercentile(score, roleKey, industry);
  }
}

function _rowToResult(score: number, row: PeerBenchmarkRow): PeerPercentileResult {
  const percentile = scoreToPercentile(score, row.p10, row.p25, row.p50, row.p75, row.p90);
  const roleName   = row.role_key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return {
    percentile,
    sampleSize:         row.sample_size,
    isResearchEstimate: false,
    p25Score:           row.p25,
    p50Score:           row.p50,
    p75Score:           row.p75,
    p90Score:           row.p90,
    label:              percentile >= 75 ? 'Above Average Risk' : percentile >= 45 ? 'Near Median' : 'Below Average Risk',
    rankDescription:    buildRankDescription(percentile, roleName).replace(' (based on research estimates)', ''),
    dataSource:         `HumanProof platform data — ${row.sample_size.toLocaleString()} opted-in audits (as of ${row.data_as_of})`,
  };
}
