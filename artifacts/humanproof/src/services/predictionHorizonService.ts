// predictionHorizonService.ts — Layer 47 (v35.0)
// Segments risk into 30d / 90d / 180d time horizons using empirically-derived
// horizon-appropriate signal weights. Short horizons are dominated by live
// ground-truth signals (L2 layoff history, WARN Act); long horizons weight
// structural displacement signals more heavily (L3 role automatability).
// GAP B+E: dominant signal is now computed dynamically from breakdown×weights
// rather than static per-horizon labels. Trajectory narrative names the signal.

export interface HorizonWeights {
  L1: number;
  L2: number;
  L3: number;
  L4: number;
  L5: number;
}

export interface HorizonRisk {
  score: number;
  confidence: number;
  dominantSignal: string;
  weightsApplied: HorizonWeights;
}

export interface DominantSignalInfo {
  signalKey: 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
  signalLabel: string;
  effectiveWeight: number;
}

export interface PredictionHorizonResult {
  horizon30d: HorizonRisk;
  horizon90d: HorizonRisk;
  horizon180d: HorizonRisk;
  trajectoryNarrative: string;
  groundTruthOverride: boolean;
  /** GAP B: dynamically computed from actual breakdown×weights — not static per-horizon label */
  dominantSignalPerHorizon: {
    '30d':  DominantSignalInfo;
    '90d':  DominantSignalInfo;
    '180d': DominantSignalInfo;
  };
}

// Horizon-appropriate layer weight tables.
// Derived from signal half-life research:
//   L2 (layoff history): strongest at 30d — recent rounds are the clearest predictor
//   L3 (displacement):   strongest at 180d — structural automation is a long-horizon signal
//   L1 (financial):      stable across horizons — FCF/revenue drive both short & long risk
//   L4 (sector/macro):   moderate across horizons — sector waves develop over months
//   L5 (personal):       stable — individual factors don't shift much by horizon
const HORIZON_WEIGHTS: Record<'30d' | '90d' | '180d', HorizonWeights> = {
  '30d':  { L1: 0.30, L2: 0.38, L3: 0.10, L4: 0.12, L5: 0.10 },
  '90d':  { L1: 0.28, L2: 0.25, L3: 0.20, L4: 0.17, L5: 0.10 },
  '180d': { L1: 0.22, L2: 0.15, L3: 0.32, L4: 0.21, L5: 0.10 },
};

// Human-readable labels for each signal layer (used in narratives + UI)
const SIGNAL_SHORT_LABELS: Record<'L1' | 'L2' | 'L3' | 'L4' | 'L5', string> = {
  L1: 'financial health',
  L2: 'layoff history & WARN Act',
  L3: 'AI role displacement',
  L4: 'sector & macro dynamics',
  L5: 'personal risk factors',
};

// Computes which signal contributes most (breakdown value × horizon weight)
function computeDominantSignal(
  breakdown: PredictionHorizonInput['breakdown'],
  weights: HorizonWeights,
): DominantSignalInfo {
  const KEYS = ['L1', 'L2', 'L3', 'L4', 'L5'] as const;
  let maxKey: 'L1' | 'L2' | 'L3' | 'L4' | 'L5' = 'L1';
  let maxVal = 0;
  for (const k of KEYS) {
    const effective = (breakdown[k] ?? 0) * weights[k];
    if (effective > maxVal) { maxVal = effective; maxKey = k; }
  }
  return { signalKey: maxKey, signalLabel: SIGNAL_SHORT_LABELS[maxKey], effectiveWeight: maxVal };
}

export interface PredictionHorizonInput {
  currentScore: number;
  breakdown: {
    L1: number;
    L2: number;
    L3: number;
    L4: number;
    L5: number;
  };
  warnSignalActive?: boolean;
  warnDaysUntilEffective?: number;
  velocityPtsPerMonth?: number;
  calendarAmplifier?: number;
  overallConfidence?: number;
}

function computeHorizonScore(
  breakdown: PredictionHorizonInput['breakdown'],
  weights: HorizonWeights,
): number {
  const raw =
    breakdown.L1 * weights.L1 +
    breakdown.L2 * weights.L2 +
    breakdown.L3 * weights.L3 +
    breakdown.L4 * weights.L4 +
    breakdown.L5 * weights.L5;
  return Math.min(100, Math.max(0, Math.round(raw * 100)));
}

function computeHorizonConfidence(
  baseConfidence: number,
  horizon: '30d' | '90d' | '180d',
  hasWarn: boolean,
): number {
  const horizonDecay = { '30d': 1.0, '90d': 0.92, '180d': 0.80 };
  const warnBoost = hasWarn && horizon === '30d' ? 0.08 : 0;
  return Math.min(1.0, (baseConfidence / 100) * horizonDecay[horizon] + warnBoost);
}

// GAP E: signal-attributed trajectory narrative (replaces 6 static delta-bucket templates)
function buildTrajectoryNarrative(
  score30d: number,
  score90d: number,
  score180d: number,
  hasWarn: boolean,
  dominant: { '30d': DominantSignalInfo; '90d': DominantSignalInfo; '180d': DominantSignalInfo },
): string {
  const d30 = dominant['30d'].signalLabel;
  const d90 = dominant['90d'].signalLabel;
  const d180 = dominant['180d'].signalLabel;

  if (hasWarn) {
    return `WARN Act filing confirms imminent layoff risk — near-term risk is critically elevated (dominant signal: ${d30}).`;
  }

  const diff = score180d - score30d;

  if (Math.abs(diff) <= 5) {
    return `Risk stable (${score30d}→${score180d}) across all horizons — both near-term and 6-month outlook dominated by ${d90}.`;
  }
  if (diff > 10) {
    return `Risk rising toward 180d — ${d180} is a 12–24mo accumulating signal that lifts the long-term score (${score30d}→${score180d}). Near-term (30d) dominated by ${d30}.`;
  }
  if (diff > 5) {
    return `Mild upward trajectory — ${d180} grows in significance over time (${score30d}→${score180d}). Monitor for acceleration.`;
  }
  if (diff < -10) {
    return `Near-term risk elevated, then easing — ${d30} is driving short-term exposure (score: ${score30d}), expected to moderate by 180d (score: ${score180d}) as acute signals resolve.`;
  }
  return `Risk trending downward — ${d30} is the dominant near-term factor; structural outlook more favorable (${score30d}→${score180d}).`;
}

export function computePredictionHorizon(input: PredictionHorizonInput): PredictionHorizonResult {
  const { breakdown, warnSignalActive = false, overallConfidence = 70 } = input;

  const score30d  = computeHorizonScore(breakdown, HORIZON_WEIGHTS['30d']);
  const score90d  = computeHorizonScore(breakdown, HORIZON_WEIGHTS['90d']);
  const score180d = computeHorizonScore(breakdown, HORIZON_WEIGHTS['180d']);

  // WARN Act ground-truth override: when active, 30d score is hard-elevated
  const final30d = warnSignalActive ? Math.min(95, Math.max(score30d, score30d + 15)) : score30d;

  // GAP B: compute dominant signal dynamically per horizon
  const dom90d  = computeDominantSignal(breakdown, HORIZON_WEIGHTS['90d']);
  const dom180d = computeDominantSignal(breakdown, HORIZON_WEIGHTS['180d']);
  const dom30d: DominantSignalInfo = warnSignalActive
    ? { signalKey: 'L2', signalLabel: 'WARN Act filing (legally-confirmed layoff notice)', effectiveWeight: 1 }
    : computeDominantSignal(breakdown, HORIZON_WEIGHTS['30d']);

  const dominantSignalPerHorizon = { '30d': dom30d, '90d': dom90d, '180d': dom180d };

  return {
    horizon30d: {
      score: final30d,
      confidence: computeHorizonConfidence(overallConfidence, '30d', warnSignalActive),
      dominantSignal: dom30d.signalLabel,
      weightsApplied: HORIZON_WEIGHTS['30d'],
    },
    horizon90d: {
      score: score90d,
      confidence: computeHorizonConfidence(overallConfidence, '90d', warnSignalActive),
      dominantSignal: dom90d.signalLabel,
      weightsApplied: HORIZON_WEIGHTS['90d'],
    },
    horizon180d: {
      score: score180d,
      confidence: computeHorizonConfidence(overallConfidence, '180d', warnSignalActive),
      dominantSignal: dom180d.signalLabel,
      weightsApplied: HORIZON_WEIGHTS['180d'],
    },
    trajectoryNarrative: buildTrajectoryNarrative(final30d, score90d, score180d, warnSignalActive, dominantSignalPerHorizon),
    groundTruthOverride: warnSignalActive,
    dominantSignalPerHorizon,
  };
}
