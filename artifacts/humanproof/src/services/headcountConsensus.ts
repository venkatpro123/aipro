// headcountConsensus.ts
// Multi-source headcount cross-validation for the live-first audit pipeline.
//
// Headcount intelligence has historically been the single most error-prone
// signal in the engine: Wikipedia regex misses, Yahoo's assetProfile returns
// null for `.NS` tickers, seeded DB values lag by months, and size-bucket
// fallbacks (e.g. "large: 10000") are obviously wrong for 600k-person firms.
//
// This module fuses up to 6 sources into a confidence-weighted consensus:
//   * SEC EDGAR 10-K        — regulatory filing, highest authority  [1.00]
//   * Yahoo Finance FTE     — most-current quarterly SEC-sourced FTE [0.92]
//   * Wikipedia infobox     — community-edited, lags fast-change cos [0.78]
//   * LinkedIn reported     — self-declared, skews high               [0.55]
//   * Intelligence DB       — seeded baseline (months stale)          [0.40]
//   * Career-page inference — "We're a team of X" style claim         [0.30]
//
// Strategy (spec-exact):
//   1. HARD REJECT any source reporting > 10× the median of ALL sources.
//      This fires before MAD z-score and is unconditional — the spec says
//      "never let a 10× outlier participate".
//   2. MAD z-score (Iglewicz–Hoaglin, k=3.5) on the survivors for 3+
//      sources — catches symmetric large-but-sub-10x outliers.
//   3. Consensus value = median of accepted sources.
//   4. Agreement = fraction of accepted sources within ±15% of the median.
//   5. When agreement < 0.60, mark the result with `conflictDisclosure = true`
//      so the Transparency tab can surface an explicit conflict notice.
//   6. NEVER show a headcount figure without the contributing sources and the
//      agreement score; they are fields on every returned HeadcountConsensus.

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

/**
 * When agreement falls below this threshold (0.60) the Transparency tab MUST
 * surface a conflict disclosure. The spec says this is a hard rule.
 */
export const AGREEMENT_CONFLICT_THRESHOLD = 0.60;

export interface HeadcountConsensus {
  /** Consensus headcount — the median of agreeing sources after outlier rejection. */
  value: number | null;
  /** 0–1: source agreement strength. 1.0 = all sources agree within ±15%. */
  agreement: number;
  /** 0–1: overall confidence — combines source reliability, count, and agreement. */
  confidence: number;
  /** Sources that contributed to the consensus (after outlier rejection). */
  contributingSources: HeadcountSourceKey[];
  /** Sources rejected as outliers (>10× ratio or MAD z-score). */
  rejectedSources: HeadcountSourceKey[];
  /** Per-source values with rejection reason, for UI display. */
  perSource: Array<{
    source: HeadcountSourceKey;
    value: number;
    rejected: boolean;
    /** 'ratio' = failed 10× pre-filter; 'mad' = failed MAD z-score; null = accepted */
    rejectionReason: 'ratio' | 'mad' | null;
    /** ISO timestamp when this source last reported this value, if known. */
    observedAt?: string;
  }>;
  /**
   * True when agreement < AGREEMENT_CONFLICT_THRESHOLD (0.60).
   * The Transparency tab MUST render a conflict disclosure when this is true.
   * The spec: "never show a headcount figure without the source and the
   * agreement score that produced it."
   */
  conflictDisclosure: boolean;
  /**
   * The primary source key that anchors the consensus (highest-reliability
   * accepted source). Always present when value is non-null — the spec says
   * never show a headcount without its source.
   */
  anchorSource: HeadcountSourceKey | null;
}

// Source reliability weights — spec-defined values.
// SEC EDGAR 10-K is a legal filing; career-page inference is unstructured
// text with high false-positive rate ("team of X" inside blog posts).
export const SOURCE_RELIABILITY: Record<HeadcountSourceKey, number> = {
  'sec-edgar':         1.00,
  'yahoo-fte':         0.92,
  'wikipedia':         0.78,
  'linkedin':          0.55,
  'intelligence-db':   0.40,
  'career-page':       0.30,   // spec: 0.30 (was incorrectly 0.65 before v40)
};

// Human-readable labels for each source — surfaced in TransparencyTab disclosure.
export const SOURCE_LABELS: Record<HeadcountSourceKey, string> = {
  'sec-edgar':         'SEC EDGAR 10-K',
  'yahoo-fte':         'Yahoo Finance FTE',
  'wikipedia':         'Wikipedia',
  'linkedin':          'LinkedIn (reported)',
  'intelligence-db':   'Intelligence DB',
  'career-page':       'Career page (inferred)',
};

const median = (xs: number[]): number => {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
};

// ── Outlier detection: two-stage (spec-exact) ───────────────────────────────
//
// Stage 1: HARD 10× ratio pre-filter (spec requirement, unconditional).
//   Reject any source reporting more than 10× the median of ALL plausible
//   values. This fires before MAD and cannot be overridden. The spec phrase
//   is exact: "Reject any source reporting more than 10x the median."
//
// Stage 2: Modified Z-Score (MAD) on Stage-1 survivors for 3+ sources.
//   MAD is robust because the threshold is not inflated by the values being
//   judged. Threshold k=3.5 follows Iglewicz–Hoaglin convention.
//
//   modZ_i = 0.6745 × (x_i − median) / MAD
//   reject when |modZ_i| > 3.5
//
//   Edge cases:
//     * n=1 after Stage 1 — no MAD, accept the single survivor.
//     * n=2 after Stage 1 — MAD meaningless; accept both (Stage 1 already
//                           caught > 10× divergence between them).
//     * MAD=0             — identical values; reject anything > ±25%.

type RejectionReason = 'ratio' | 'mad' | null;

interface ClassifiedInput {
  input: HeadcountSourceInput;
  rejected: boolean;
  rejectionReason: RejectionReason;
}

function classifyOutliers(plausible: HeadcountSourceInput[]): ClassifiedInput[] {
  if (plausible.length === 0) return [];

  const values = plausible.map((s) => s.value);
  const globalMedian = median(values);

  // Stage 1: hard 10× ratio filter (unconditional).
  const afterRatioFilter: ClassifiedInput[] = plausible.map((s) => {
    const ratio = globalMedian === 0 ? 1 : s.value / globalMedian;
    if (ratio > 10 || ratio < 0.1) {
      return { input: s, rejected: true, rejectionReason: 'ratio' };
    }
    return { input: s, rejected: false, rejectionReason: null };
  });

  const survivors = afterRatioFilter.filter((c) => !c.rejected).map((c) => c.input);

  // Stage 2: MAD z-score on survivors (only meaningful with 3+ points).
  if (survivors.length < 3) {
    // 0–2 survivors: Stage 1 is sufficient; accept all survivors.
    return afterRatioFilter;
  }

  const survivalValues = survivors.map((s) => s.value);
  const survivalMedian = median(survivalValues);
  const absDevs = survivalValues.map((v) => Math.abs(v - survivalMedian));
  const mad = median(absDevs);

  const result: ClassifiedInput[] = [];
  for (const classified of afterRatioFilter) {
    if (classified.rejected) {
      result.push(classified);
      continue;
    }
    if (mad === 0) {
      // All survivors identical — reject anything > ±25% from consensus.
      const ratio = survivalMedian === 0 ? 1 : classified.input.value / survivalMedian;
      if (ratio < 0.75 || ratio > 1.25) {
        result.push({ input: classified.input, rejected: true, rejectionReason: 'mad' });
      } else {
        result.push(classified);
      }
    } else {
      const modZ = (0.6745 * (classified.input.value - survivalMedian)) / mad;
      if (Math.abs(modZ) > 3.5) {
        result.push({ input: classified.input, rejected: true, rejectionReason: 'mad' });
      } else {
        result.push(classified);
      }
    }
  }
  return result;
}

/**
 * Fuse multiple headcount sources into a confidence-weighted consensus.
 *
 * SPEC REQUIREMENTS (all enforced here):
 *   - Source weights: SEC EDGAR 1.00 / Yahoo 0.92 / Wikipedia 0.78 /
 *     LinkedIn 0.55 / Intel DB 0.40 / Career page 0.30
 *   - Reject any source > 10× the median (hard pre-filter, unconditional).
 *   - Agreement = fraction of accepted sources within ±15% of the consensus.
 *   - agreement < 0.60 → conflictDisclosure = true (Transparency tab must
 *     surface an explicit conflict notice).
 *   - Every returned value carries anchorSource + contributingSources so the
 *     caller can never show a headcount without its source provenance.
 *
 * Returns null `value` when no source provided a plausible count (10 ≤ N ≤ 5M).
 *
 * Confidence model:
 *   - 1 source:  reliability × 0.80 (no cross-check penalty)
 *   - 2 sources, agree ±15%: max-reliability × 1.00
 *   - 2 sources, disagree:   max-reliability × 0.70
 *   - 3+ sources, all agree: max-reliability × 1.00
 *   - 3+ sources, 0 rejected: max-reliability × 0.95
 *   - 3+ sources, 1 rejected: max-reliability × 0.90
 *   - 3+ sources, 2+ rejected: max-reliability × 0.75
 */
export function computeHeadcountConsensus(
  inputs: HeadcountSourceInput[],
): HeadcountConsensus {
  const EMPTY: HeadcountConsensus = {
    value: null, agreement: 0, confidence: 0,
    contributingSources: [], rejectedSources: [],
    perSource: inputs.map(s => ({
      source: s.source, value: s.value, rejected: true,
      rejectionReason: null as RejectionReason, observedAt: s.observedAt,
    })),
    conflictDisclosure: false,
    anchorSource: null,
  };

  // Filter to plausible counts only (10 ≤ N ≤ 5M).
  const plausible = inputs.filter(s =>
    typeof s.value === 'number' && Number.isFinite(s.value) && s.value >= 10 && s.value <= 5_000_000,
  );
  if (plausible.length === 0) return EMPTY;

  // Two-stage outlier classification (ratio pre-filter + MAD z-score).
  const classified = classifyOutliers(plausible);
  const accepted    = classified.filter((c) => !c.rejected).map((c) => c.input);
  const rejectedMap = new Map<HeadcountSourceKey, RejectionReason>(
    classified.filter((c) => c.rejected).map((c) => [c.input.source, c.rejectionReason]),
  );

  if (accepted.length === 0) {
    // All sources mutually inconsistent — fall back to the single highest-
    // reliability source to avoid returning null when data exists.
    const best = plausible
      .map(s => ({ ...s, rel: SOURCE_RELIABILITY[s.source] ?? 0.4 }))
      .sort((a, b) => b.rel - a.rel)[0];
    const agreement = 0;
    return {
      value: best.value,
      agreement,
      confidence: Math.round(best.rel * 0.8 * 100) / 100,
      contributingSources: [best.source],
      rejectedSources: plausible.filter(s => s.source !== best.source).map(s => s.source),
      perSource: plausible.map(s => ({
        source: s.source, value: s.value,
        rejected: s.source !== best.source,
        rejectionReason: rejectedMap.get(s.source) ?? null,
        observedAt: s.observedAt,
      })),
      conflictDisclosure: true,   // single-source fallback is always a conflict
      anchorSource: best.source,
    };
  }

  // Consensus value: median of accepted sources.
  const consensusMedian = median(accepted.map(s => s.value));
  const consensusValue  = Math.round(consensusMedian);

  // Agreement: fraction of accepted sources within ±15% of the consensus median.
  const agreeingCount = accepted.filter(s => {
    const ratio = s.value / consensusMedian;
    return ratio >= 0.85 && ratio <= 1.15;
  }).length;
  const agreement = accepted.length > 0 ? agreeingCount / accepted.length : 0;

  // Anchor source: highest-reliability accepted source (shown in every UI display).
  const anchorSource = accepted
    .map(s => ({ source: s.source, rel: SOURCE_RELIABILITY[s.source] ?? 0.4 }))
    .sort((a, b) => b.rel - a.rel)[0]?.source ?? null;

  // Confidence: max reliability of accepted sources × count×agreement multiplier.
  const maxReliability = Math.max(...accepted.map(s => SOURCE_RELIABILITY[s.source] ?? 0.4));
  const rejectedCount  = rejectedMap.size;
  // WS9 — count×agreement multiplier table from engine_calibration_constants.
  const multipliers = resolveCountMultipliers();
  const countMultiplier =
    accepted.length === 1 ? multipliers.singleSource
    : accepted.length === 2 ? (agreement >= 1 ? multipliers.twoSourceAgree : multipliers.twoSourceDisagree)
    : agreement >= 1          ? multipliers.threePlusAllAgree
    : rejectedCount === 0     ? multipliers.threePlusNoneRejected
    : rejectedCount === 1     ? multipliers.threePlusOneRejected
    : multipliers.threePlusMultiRejected;
  const confidence = Math.min(1, maxReliability * countMultiplier);

  return {
    value: consensusValue,
    agreement: Math.round(agreement * 100) / 100,
    confidence: Math.round(confidence * 100) / 100,
    contributingSources: accepted.map(s => s.source),
    rejectedSources: Array.from(rejectedMap.keys()),
    perSource: plausible.map(s => ({
      source: s.source,
      value: s.value,
      rejected: rejectedMap.has(s.source),
      rejectionReason: rejectedMap.get(s.source) ?? null,
      observedAt: s.observedAt,
    })),
    conflictDisclosure: agreement < AGREEMENT_CONFLICT_THRESHOLD,
    anchorSource,
  };
}

/**
 * Convenience: feed in raw headcount values from the audit pipeline.
 * All 6 source slots accept an optional `observedAt` ISO timestamp so the
 * Transparency tab can display source freshness alongside the figure.
 * Slots with null/undefined/0 values are skipped automatically.
 *
 * Spec: "Never show a headcount figure without the source and the agreement
 * score that produced it." The returned HeadcountConsensus carries both.
 */
export function consensusFromSignals(signals: {
  wikipedia?:  { value: number | null; observedAt?: string } | number | null;
  yahooFte?:   { value: number | null; observedAt?: string } | number | null;
  linkedin?:   { value: number | null; observedAt?: string } | number | null;
  careerPage?: { value: number | null; observedAt?: string } | number | null;
  secEdgar?:   { value: number | null; observedAt?: string } | number | null;
  intelDb?:    { value: number | null; observedAt?: string } | number | null;
}): HeadcountConsensus {
  const inputs: HeadcountSourceInput[] = [];

  const extract = (
    raw: { value: number | null; observedAt?: string } | number | null | undefined,
  ): { value: number | null; observedAt?: string } => {
    if (raw == null)               return { value: null };
    if (typeof raw === 'number')   return { value: raw };
    return { value: raw.value, observedAt: raw.observedAt };
  };

  const push = (source: HeadcountSourceKey, raw: typeof signals.wikipedia) => {
    const { value, observedAt } = extract(raw);
    if (value != null && value > 0) inputs.push({ source, value, observedAt });
  };

  push('sec-edgar',       signals.secEdgar);
  push('yahoo-fte',       signals.yahooFte);
  push('wikipedia',       signals.wikipedia);
  push('linkedin',        signals.linkedin);
  push('intelligence-db', signals.intelDb);
  push('career-page',     signals.careerPage);

  return computeHeadcountConsensus(inputs);
}
