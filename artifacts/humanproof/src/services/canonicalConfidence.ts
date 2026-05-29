// canonicalConfidence.ts — Wave 1.2
//
// PROBLEM: 4 confidence systems (confidenceModel, empiricalConfidenceModel,
// conformalCI, freshnessUnifier) produce inconsistent user-visible signals.
// UI components read from different fields, producing different numbers for the
// "same" concept (how much to trust this score).
//
// SOLUTION: A single compute function that reads all sources and produces one
// canonical, user-facing confidence object. UI reads from this; nothing else.
//
// Design: This is a PURE UTILITY — no Supabase, no side effects. It accepts
// the raw HybridResult and derives the canonical confidence from it.
// Future: wire as a DAG step so `result.canonicalConfidence` is pre-computed.
//
// Precedence:
//   1. freshnessUnifier.tier → 'live' | 'mixed' | 'stale' | 'heuristic'
//   2. conformalCI.ciLow/ciHigh → CI bounds
//   3. confidencePercent → overall score
//   4. _liveDataCoverage.overallSource → primary source label
//   5. signalQuality → limiting factor detection

// ── Types ─────────────────────────────────────────────────────────────────────

export type ConfidenceTier = 'live' | 'mixed' | 'stale' | 'heuristic';

export interface UserFacingConfidence {
  /** "High quality data" | "Typical" | "Below average" | "Very limited" */
  label: 'High quality' | 'Typical' | 'Below average' | 'Very limited';
  /** Hex color for the label */
  color: string;
  /** One-sentence explanation of why confidence is at this level */
  explanation: string;
}

export interface CanonicalConfidence {
  /** 0–100 confidence percentage */
  score: number;
  /** Data freshness tier */
  tier: ConfidenceTier;
  /** Conformal CI lower bound (same scale as score, 0–100) */
  ciLow: number;
  /** Conformal CI upper bound (same scale as score, 0–100) */
  ciHigh: number;
  /** CI width — useful for rendering the uncertainty band */
  ciWidth: number;
  /** Primary data source label: "Live data (Yahoo Finance, Google News)" */
  primarySource: string;
  /** Limiting factor, if any: "Private company — no public filings" */
  limitingFactor?: string;
  /** Ready-to-render user-facing fields */
  userFacing: UserFacingConfidence;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TIER_ORDER: Record<ConfidenceTier, number> = {
  live: 0, mixed: 1, stale: 2, heuristic: 3,
};

const USER_FACING: Record<ConfidenceTier, Omit<UserFacingConfidence, 'explanation'>> = {
  live:      { label: 'High quality',   color: '#10b981' },
  mixed:     { label: 'Typical',        color: '#22d3ee' },
  stale:     { label: 'Below average',  color: '#f59e0b' },
  heuristic: { label: 'Very limited',   color: '#f97316' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseFreshnessTier(raw: unknown): ConfidenceTier {
  if (raw === 'live' || raw === 'mixed' || raw === 'stale' || raw === 'heuristic') return raw;
  return 'mixed';
}

function parsePrimarySource(result: any): string {
  const coverage = result?._liveDataCoverage ?? result?.signalQuality?._liveDataCoverage;
  const src = coverage?.overallSource ?? 'heuristic';

  if (src === 'live') {
    const providers: string[] = [];
    if (coverage?.yahooFinance)    providers.push('Yahoo Finance');
    if (coverage?.googleNews || coverage?.bingNews) providers.push('Google News');
    if (coverage?.glassdoor)       providers.push('Glassdoor');
    if (coverage?.naukri || coverage?.adzuna) providers.push('Job boards');
    if (providers.length > 0) return `Live data (${providers.slice(0, 3).join(', ')})`;
    return 'Live market data';
  }
  if (src === 'db_cache') return 'Cached data (< 4h old)';
  if (src === 'seeded')   return 'Industry baseline (no live signals)';
  return 'Estimated from sector averages';
}

function parseLimitingFactor(result: any): string | undefined {
  const companyData = result?.companyData;
  if (companyData?.isPublic === false) return 'Private company — no public SEC filings';

  const quality = result?.signalQuality;
  const missingCount = quality?.missingDataFallbacks?.length ?? 0;
  const degradedCount = quality?.degradedSignalClasses?.length ?? 0;
  if (missingCount >= 3) return `${missingCount} data signals unavailable or rate-limited`;
  if (degradedCount >= 2) return `${degradedCount} signal classes returned degraded data`;
  return undefined;
}

function buildExplanation(tier: ConfidenceTier, score: number, limitingFactor?: string): string {
  if (limitingFactor) {
    return `Confidence is limited because: ${limitingFactor}.`;
  }
  switch (tier) {
    case 'live':
      return `Live data verified within the last 30 minutes. Score accuracy: ±${Math.round((100 - score) / 4)} pts.`;
    case 'mixed':
      return `A mix of live and cached signals. Some data may be up to 4 hours old.`;
    case 'stale':
      return `Primary signals are more than 24 hours old. Market conditions may have shifted.`;
    case 'heuristic':
      return `No live signals were retrieved. Score is based on industry averages and sector benchmarks.`;
  }
}

// ── Main compute function ─────────────────────────────────────────────────────

/**
 * Derives canonical confidence from a HybridResult (or any result-shaped object).
 * Safe to call on partial results — all fields have fallbacks.
 */
export function computeCanonicalConfidence(result: any): CanonicalConfidence {
  // Score
  const score = Math.round(Math.min(100, Math.max(0, result?.confidencePercent ?? 50)));

  // Tier — prefer freshnessUnifier.tier, fall back to _liveDataCoverage
  const freshnessRaw = result?.freshnessUnifier?.tier
    ?? result?._liveDataCoverage?.tier
    ?? (result?.confidencePercent >= 70 ? 'live' : result?.confidencePercent >= 50 ? 'mixed' : 'heuristic');
  const tier = parseFreshnessTier(freshnessRaw);

  // CI bounds
  const ci = result?.bayesianCI ?? result?.conformalCI;
  const ciLow  = Math.round(Math.max(0,   ci?.lower ?? ci?.ciLow  ?? score - 8));
  const ciHigh = Math.round(Math.min(100, ci?.upper ?? ci?.ciHigh ?? score + 8));
  const ciWidth = ciHigh - ciLow;

  // Source and limiting factor
  const primarySource = parsePrimarySource(result);
  const limitingFactor = parseLimitingFactor(result);

  // User-facing fields
  const ufBase = USER_FACING[tier];
  const explanation = buildExplanation(tier, score, limitingFactor);
  const userFacing: UserFacingConfidence = { ...ufBase, explanation };

  return {
    score,
    tier,
    ciLow,
    ciHigh,
    ciWidth,
    primarySource,
    limitingFactor,
    userFacing,
  };
}

// ── Convenience: derive a short provenance string for ProvenanceLabel ─────────

export function deriveProvenanceKind(
  result: any,
): 'live' | 'modeled' | 'estimated' | 'heuristic' {
  const tier = parseFreshnessTier(
    result?.freshnessUnifier?.tier ?? result?._liveDataCoverage?.tier,
  );
  if (tier === 'live')      return 'live';
  if (tier === 'mixed')     return 'modeled';
  if (tier === 'stale')     return 'estimated';
  return 'heuristic';
}

/**
 * Worstcase-of-two canonical confidence objects.
 * Used when merging company + personal confidence signals.
 */
export function mergeCanonicalConfidence(
  a: CanonicalConfidence,
  b: CanonicalConfidence,
): CanonicalConfidence {
  // Worse tier wins (heuristic > stale > mixed > live)
  const tier = TIER_ORDER[a.tier] >= TIER_ORDER[b.tier] ? a.tier : b.tier;
  const score = Math.round((a.score + b.score) / 2);
  const ciLow  = Math.min(a.ciLow, b.ciLow);
  const ciHigh = Math.max(a.ciHigh, b.ciHigh);

  const ufBase = USER_FACING[tier];
  const explanation = `Combined: ${a.userFacing.explanation} ${b.userFacing.explanation}`;
  return {
    score,
    tier,
    ciLow,
    ciHigh,
    ciWidth: ciHigh - ciLow,
    primarySource: `${a.primarySource} + ${b.primarySource}`,
    limitingFactor: a.limitingFactor ?? b.limitingFactor,
    userFacing: { ...ufBase, explanation },
  };
}
