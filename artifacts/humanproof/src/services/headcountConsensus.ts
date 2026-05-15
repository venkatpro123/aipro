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

// WS9 — count-multiplier table sourced from engine_calibration_constants.
import { getConstant } from './calibration/calibrationConstants';

interface CountMultipliers {
  singleSource: number;            // 1 source — penalty for no cross-check
  twoSourceAgree: number;          // 2 sources within ±15%
  twoSourceDisagree: number;       // 2 sources outside ±15%
  threePlusAllAgree: number;       // 3+, every accepted source within ±15%
  threePlusNoneRejected: number;   // 3+, no outliers dropped
  threePlusOneRejected: number;    // 3+, 1 outlier dropped
  threePlusMultiRejected: number;  // 3+, 2+ outliers dropped
}

const BOOTSTRAP_COUNT_MULTIPLIERS: CountMultipliers = {
  singleSource:           0.80,
  twoSourceAgree:         1.00,
  twoSourceDisagree:      0.70,
  threePlusAllAgree:      1.00,
  threePlusNoneRejected:  0.95,
  threePlusOneRejected:   0.90,
  threePlusMultiRejected: 0.75,
};

function resolveCountMultipliers(): CountMultipliers {
  const r = getConstant<CountMultipliers>(
    'headcountConsensus.countMultipliers',
    BOOTSTRAP_COUNT_MULTIPLIERS,
  );
  return (r.value && typeof r.value === 'object')
    ? { ...BOOTSTRAP_COUNT_MULTIPLIERS, ...r.value }  // shallow merge so partial overrides are safe
    : BOOTSTRAP_COUNT_MULTIPLIERS;
}

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

// ── Symmetric outlier detection (WS3 fix for Audit Issue #9) ────────────────
//
// The legacy rule "reject ratio > 10 or < 0.1" is technically symmetric in the
// ratio sense, but in absolute headcount terms a 6× downward miss is far more
// damaging than a 10× upward miss because the consensus median can be pulled
// below the true value by a single subsidiary career-page mention
// ("we are 50,000+ professionals" inside the parent's group of 317,000).
//
// We replace it with the Modified Z-Score using MAD (Median Absolute
// Deviation). MAD is robust to outliers because the threshold itself is not
// inflated by the values being judged. Threshold k = 3.5 follows the standard
// Iglewicz–Hoaglin convention.
//
//   modZ_i = 0.6745 × (x_i − median) / MAD
//   reject when |modZ_i| > 3.5
//
// Edge cases:
//   * n = 1 or 2 — MAD is unreliable; we fall back to the legacy 10× ratio
//                  rule, which is more permissive but the only sensible
//                  choice with so few points.
//   * MAD = 0    — all retained values are identical; outliers from the
//                  filtered set are anything that disagrees at all. We use a
//                  fixed 25% fractional tolerance in that case.

interface OutlierClassification {
  accepted: HeadcountSourceInput[];
  rejected: HeadcountSourceInput[];
}

function classifyOutliersMAD(plausible: HeadcountSourceInput[]): OutlierClassification {
  if (plausible.length <= 2) {
    // MAD with 1-2 data points is meaningless. Use legacy 10× ratio rule.
    const ref = median(plausible.map((s) => s.value));
    const accepted: HeadcountSourceInput[] = [];
    const rejected: HeadcountSourceInput[] = [];
    for (const s of plausible) {
      const ratio = s.value / ref;
      if (plausible.length === 1 || (ratio <= 10 && ratio >= 0.1)) {
        accepted.push(s);
      } else {
        rejected.push(s);
      }
    }
    return { accepted, rejected };
  }

  const values = plausible.map((s) => s.value);
  const med = median(values);
  const absDevs = values.map((v) => Math.abs(v - med));
  const mad = median(absDevs);

  const accepted: HeadcountSourceInput[] = [];
  const rejected: HeadcountSourceInput[] = [];

  if (mad === 0) {
    // All values identical or near-identical: reject anything > 25% off.
    for (const s of plausible) {
      const ratio = med === 0 ? 1 : s.value / med;
      if (ratio >= 0.75 && ratio <= 1.25) accepted.push(s);
      else rejected.push(s);
    }
    return { accepted, rejected };
  }

  const threshold = 3.5;
  for (const s of plausible) {
    const modZ = (0.6745 * (s.value - med)) / mad;
    if (Math.abs(modZ) > threshold) {
      rejected.push(s);
    } else {
      accepted.push(s);
    }
  }
  return { accepted, rejected };
}

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

  // Symmetric outlier rejection via Modified Z-Score (MAD). Catches both
  // high-side outliers ("LinkedIn 5M" for a 10k company) and the more common
  // low-side case ("career page mentions a 50k subsidiary at a 317k parent").
  // See classifyOutliersMAD for edge-case behaviour.
  const classification = classifyOutliersMAD(plausible);
  const accepted = classification.accepted;
  const rejected: HeadcountSourceKey[] = classification.rejected.map((s) => s.source);

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
  // WS9 — the count×agreement multiplier table is sourced from
  // engine_calibration_constants under
  // 'headcountConsensus.countMultipliers'. Bootstrap fallback preserves
  // the legacy behaviour exactly. recalibrate-engine target.
  const multipliers = resolveCountMultipliers();
  const countMultiplier =
    accepted.length === 1 ? multipliers.singleSource
    : accepted.length === 2 ? (agreement === 1 ? multipliers.twoSourceAgree : multipliers.twoSourceDisagree)
    : agreement === 1        ? multipliers.threePlusAllAgree
    : rejected.length === 0  ? multipliers.threePlusNoneRejected
    : rejected.length === 1  ? multipliers.threePlusOneRejected
    : multipliers.threePlusMultiRejected;
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
