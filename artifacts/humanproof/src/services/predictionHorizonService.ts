// predictionHorizonService.ts — Layer 47 (v17.0)
// Segments risk into 30d / 90d / 180d time horizons using empirically-derived
// horizon-appropriate signal weights. Short horizons are dominated by live
// ground-truth signals (L2 layoff history, WARN Act); long horizons weight
// structural displacement signals more heavily (L3 role automatability).

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

export interface PredictionHorizonResult {
  horizon30d: HorizonRisk;
  horizon90d: HorizonRisk;
  horizon180d: HorizonRisk;
  trajectoryNarrative: string;
  groundTruthOverride: boolean;
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

const DOMINANT_SIGNAL_LABELS: Record<'30d' | '90d' | '180d', string> = {
  '30d':  'L2 layoff history + WARN Act filings',
  '90d':  'Balanced: financial health + layoff history + sector dynamics',
  '180d': 'L3 role displacement + macro sector trends',
};

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

function buildTrajectoryNarrative(
  score30d: number,
  score90d: number,
  score180d: number,
  hasWarn: boolean,
): string {
  if (hasWarn) {
    return `WARN Act filing confirms imminent layoff risk — 30-day risk is critically elevated.`;
  }

  const diff = score180d - score30d;
  if (Math.abs(diff) <= 5) {
    return `Risk is expected to remain stable (${score30d}→${score180d}) over the next 6 months.`;
  }
  if (diff > 10) {
    return `Risk is trending upward — structural displacement signals intensify over 6 months (${score30d}→${score180d}).`;
  }
  if (diff > 5) {
    return `Risk shows mild upward trajectory — sector and role factors grow in significance over time (${score30d}→${score180d}).`;
  }
  if (diff < -10) {
    return `Immediate risk is higher than structural outlook — current signals are acute but may ease if financial pressures resolve (${score30d}→${score180d}).`;
  }
  return `Risk is trending downward — current financial/history signals are the dominant near-term factor (${score30d}→${score180d}).`;
}

export function computePredictionHorizon(input: PredictionHorizonInput): PredictionHorizonResult {
  const { breakdown, warnSignalActive = false, overallConfidence = 70 } = input;

  const score30d = computeHorizonScore(breakdown, HORIZON_WEIGHTS['30d']);
  const score90d  = computeHorizonScore(breakdown, HORIZON_WEIGHTS['90d']);
  const score180d = computeHorizonScore(breakdown, HORIZON_WEIGHTS['180d']);

  // WARN Act ground-truth override: when active, 30d score is hard-elevated
  const final30d = warnSignalActive ? Math.min(95, Math.max(score30d, score30d + 15)) : score30d;

  const dominant30d = warnSignalActive
    ? 'WARN Act filing (ground-truth: legally-confirmed layoff notice)'
    : DOMINANT_SIGNAL_LABELS['30d'];

  return {
    horizon30d: {
      score: final30d,
      confidence: computeHorizonConfidence(overallConfidence, '30d', warnSignalActive),
      dominantSignal: dominant30d,
      weightsApplied: HORIZON_WEIGHTS['30d'],
    },
    horizon90d: {
      score: score90d,
      confidence: computeHorizonConfidence(overallConfidence, '90d', warnSignalActive),
      dominantSignal: DOMINANT_SIGNAL_LABELS['90d'],
      weightsApplied: HORIZON_WEIGHTS['90d'],
    },
    horizon180d: {
      score: score180d,
      confidence: computeHorizonConfidence(overallConfidence, '180d', warnSignalActive),
      dominantSignal: DOMINANT_SIGNAL_LABELS['180d'],
      weightsApplied: HORIZON_WEIGHTS['180d'],
    },
    trajectoryNarrative: buildTrajectoryNarrative(final30d, score90d, score180d, warnSignalActive),
    groundTruthOverride: warnSignalActive,
  };
}
