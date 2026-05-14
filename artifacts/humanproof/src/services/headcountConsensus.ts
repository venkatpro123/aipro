// headcountConsensus.ts
// Multi-source headcount cross-validation for the live-first audit pipeline.
//
// Headcount intelligence has historically been the single most error-prone
// signal in the engine: Wikipedia regex misses, Yahoo's assetProfile returns
// null for `.NS` tickers, seeded DB values lag by months, and size-bucket
// fallbacks (e.g. "large: 10000") are obviously wrong for 600k-person firms.
//
// This module fuses up to 6 sources into a confidence-weighted consensus:
//   * Wikipedia infobox      — high reliability for big public cos
//   * Yahoo Finance FTE      — most-current quarterly filing
//   * LinkedIn reported      — self-declared, often the freshest
//   * Career-page mention    — "We're a team of 50,000+" style claims
//   * SEC EDGAR cover page   — quarterly 10-Q
//   * Intelligence DB         — seeded baseline (emergency fallback only)
//
// Strategy:
//   1. Drop outliers (anything > 10× the median of the rest)
//   2. Confidence-weight by source reliability (Yahoo > Wiki > LinkedIn > DB)
//   3. Return median of remaining sources, with `agreement` = fraction of
//      sources within ±15% of the median.

export type HeadcountSourceKey =
  | 'wikipedia'
  | 'yahoo-fte'
  | 'linkedin'
  | 'career-page'
  | 'sec-edgar'
  | 'intelligence-db';

export interface HeadcountSourceInput {
  source: HeadcountSourceKey;
  value: number;
  /** ISO timestamp of when the source last updated this value. */
  observedAt?: string;
}

export interface HeadcountConsensus {
  /** Consensus headcount — the median of agreeing sources after outlier rejection. */
  value: number | null;
  /** 0–1: source agreement strength. 1.0 = all sources agree within ±15%. */
  agreement: number;
  /** 0–1: overall confidence — combines source reliability, count, and agreement. */
  confidence: number;
  /** Sources that contributed to the consensus (after outlier rejection). */
  contributingSources: HeadcountSourceKey[];
  /** Sources rejected as outliers. */
  rejectedSources: HeadcountSourceKey[];
  /** Per-source values, for UI display. */
  perSource: Array<{ source: HeadcountSourceKey; value: number; rejected: boolean }>;
}

// Higher = more authoritative. Yahoo Finance reads quarterly SEC filings;
// Wikipedia is community-edited but lags the most for fast-changing companies;
// LinkedIn is self-reported and skews high; seeded DB is months stale.
const SOURCE_RELIABILITY: Record<HeadcountSourceKey, number> = {
  'sec-edgar':         1.00,
  'yahoo-fte':         0.92,
  'wikipedia':         0.78,
  'career-page':       0.65,
  'linkedin':          0.55,
  'intelligence-db':   0.40,
};

const median = (xs: number[]): number => {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
};

/**
 * Fuse multiple headcount sources into a single confidence-weighted value.
 *
 * Returns null `value` when no source provided a plausible count (10 ≤ N ≤ 5M).
 *
 * Confidence model:
 *   - 1 source:  confidence = source reliability × 0.8 (penalty for no agreement)
 *   - 2 sources, agree within ±15%: confidence = max reliability × 1.0
 *   - 2 sources, disagree:           confidence = max reliability × 0.7
 *   - 3+ sources, all agree:         confidence = max reliability × 1.0
 *   - 3+ sources, 1 outlier dropped: confidence = max reliability × 0.95
 *   - 3+ sources, multiple outliers: confidence = max reliability × 0.75
 */
export function computeHeadcountConsensus(
  inputs: HeadcountSourceInput[],
): HeadcountConsensus {
  // Filter to plausible counts only
  const plausible = inputs.filter(s =>
    typeof s.value === 'number' && Number.isFinite(s.value) && s.value >= 10 && s.value <= 5_000_000,
  );
  if (plausible.length === 0) {
    return {
      value: null, agreement: 0, confidence: 0,
      contributingSources: [], rejectedSources: [],
      perSource: inputs.map(s => ({ source: s.source, value: s.value, rejected: true })),
    };
  }

  // Outlier rejection: drop any source whose value is > 10× the median or < 1/10×.
  // Use median of the OTHER sources as the reference so a single outlier doesn't
  // poison the threshold.
  const allValues = plausible.map(s => s.value);
  const globalMedian = median(allValues);
  const accepted: HeadcountSourceInput[] = [];
  const rejected: HeadcountSourceKey[] = [];

  for (const s of plausible) {
    const ratio = s.value / globalMedian;
    // Single-source case: never reject.
    if (plausible.length === 1) { accepted.push(s); continue; }
    if (ratio > 10 || ratio < 0.1) {
      rejected.push(s.source);
    } else {
      accepted.push(s);
    }
  }

  if (accepted.length === 0) {
    // All sources were considered outliers vs each other — return the highest-
    // reliability source as a single-source result.
    const best = plausible
      .map(s => ({ ...s, rel: SOURCE_RELIABILITY[s.source] ?? 0.4 }))
      .sort((a, b) => b.rel - a.rel)[0];
    return {
      value: best.value,
      agreement: 0,
      confidence: best.rel * 0.8,
      contributingSources: [best.source],
      rejectedSources: plausible.filter(s => s.source !== best.source).map(s => s.source),
      perSource: plausible.map(s => ({ source: s.source, value: s.value, rejected: s.source !== best.source })),
    };
  }

  // Consensus value: median of accepted sources, weighted-rounded.
  const consensusMedian = median(accepted.map(s => s.value));
  const consensusValue = Math.round(consensusMedian);

  // Agreement: fraction of accepted sources within ±15% of the median.
  const agreeingCount = accepted.filter(s => {
    const ratio = s.value / consensusMedian;
    return ratio >= 0.85 && ratio <= 1.15;
  }).length;
  const agreement = accepted.length > 0 ? agreeingCount / accepted.length : 0;

  // Confidence: combine max source reliability with source count and agreement.
  const maxReliability = Math.max(...accepted.map(s => SOURCE_RELIABILITY[s.source] ?? 0.4));
  const countMultiplier =
    accepted.length === 1 ? 0.80
    : accepted.length === 2 ? (agreement === 1 ? 1.00 : 0.70)
    : agreement === 1        ? 1.00
    : rejected.length === 0  ? 0.95   // 3+ sources, all retained
    : rejected.length === 1  ? 0.90
    : 0.75;
  const confidence = Math.min(1, maxReliability * countMultiplier);

  return {
    value: consensusValue,
    agreement,
    confidence: Math.round(confidence * 100) / 100,
    contributingSources: accepted.map(s => s.source),
    rejectedSources: rejected,
    perSource: plausible.map(s => ({
      source: s.source, value: s.value,
      rejected: rejected.includes(s.source),
    })),
  };
}

/**
 * Convenience: feed in the raw values from the audit pipeline and get back a
 * consensus. Skips sources with null/undefined/0 values automatically.
 */
export function consensusFromSignals(signals: {
  wikipedia?: number | null;
  yahooFte?: number | null;
  linkedin?: number | null;
  careerPage?: number | null;
  secEdgar?: number | null;
  intelDb?: number | null;
}): HeadcountConsensus {
  const inputs: HeadcountSourceInput[] = [];
  if (signals.wikipedia)  inputs.push({ source: 'wikipedia',       value: signals.wikipedia });
  if (signals.yahooFte)   inputs.push({ source: 'yahoo-fte',       value: signals.yahooFte });
  if (signals.linkedin)   inputs.push({ source: 'linkedin',        value: signals.linkedin });
  if (signals.careerPage) inputs.push({ source: 'career-page',     value: signals.careerPage });
  if (signals.secEdgar)   inputs.push({ source: 'sec-edgar',       value: signals.secEdgar });
  if (signals.intelDb)    inputs.push({ source: 'intelligence-db', value: signals.intelDb });
  return computeHeadcountConsensus(inputs);
}
