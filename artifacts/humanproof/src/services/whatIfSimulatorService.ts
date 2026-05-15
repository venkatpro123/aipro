/**
 * whatIfSimulatorService.ts — v12.0
 *
 * Interactive scenario simulation using existing scoreSensitivity data.
 *
 * The scoreSensitivity output (from v10.0 scoreSensitivityEngine.ts) already
 * contains per-dimension lever data. This service provides the computation
 * layer for the WhatIfSimulatorPanel UI component — pure client-side math,
 * zero server calls.
 *
 * Uses LAYER_WEIGHTS (exported from layoffScoreEngine.ts) for recomposition.
 * The WhatIf formula is: sum(layer_value × LAYER_WEIGHTS[layer]) / weightSum × 100
 * where weightSum = 1.10 (LAYER_WEIGHTS sum > 1.0 by design — see layoffScoreEngine.ts).
 */

import { LAYER_WEIGHTS } from './layoffScoreEngine';
import type { ScoreBreakdown } from './layoffScoreEngine';
import type { ScoreTier } from './layoffScoreEngine';
// WS9 — dimension feasibility map sourced from engine_calibration_constants.
import { getConstant } from './calibration/calibrationConstants';

// Score tier thresholds (matches getScoreTier() in layoffScoreEngine.ts)
function getSimulatedTier(score: number): ScoreTier {
  if (score >= 75) return { label: 'High risk', color: 'red', advice: 'Take action now.' };
  if (score >= 55) return { label: 'Elevated risk', color: 'orange', advice: 'Stay alert.' };
  if (score >= 35) return { label: 'Moderate risk', color: 'amber', advice: 'Monitor closely.' };
  if (score >= 15) return { label: 'Low risk', color: 'green', advice: 'Relatively stable.' };
  return { label: 'Very low risk', color: 'teal', advice: 'Strong position.' };
}

// Approximate 12-month probability from score (mirrors SCORE_BANDS midpoints)
function scoreToProbability12m(score: number): number {
  if (score <= 24) return 0.028;
  if (score <= 39) return 0.062;
  if (score <= 54) return 0.128;
  if (score <= 64) return 0.215;
  if (score <= 74) return 0.318;
  if (score <= 84) return 0.468;
  if (score <= 94) return 0.578;
  return 0.68;
}

export interface ActiveLever {
  /** Dimension key: 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'D6' | 'D7' */
  dimension: string;
  /** How much to improve this dimension (0–1, relative to current value) */
  targetImprovement: number;
  /** Label for display */
  label: string;
}

export interface WhatIfSimulationInputs {
  currentScore: number;
  breakdown: ScoreBreakdown;
  activeLevers: ActiveLever[];
  /** D8 value from breakdown — used to compute the uncontrollable AI-efficiency gap */
  d8Value?: number;
  /** Age in days of the oldest signal in the breakdown — triggers freshness warning when >30 */
  dataFreshnessAgeInDays?: number;
}

export interface DimensionImpact {
  dimension: string;
  label: string;
  currentValue: number;
  simulatedValue: number;
  pointsReduced: number;
}

export interface WhatIfSimulationResult {
  simulatedScore: number;
  scoreDelta: number;
  simulatedTier: ScoreTier;
  simulatedProbability12m: number;
  probabilityDelta: number;
  dimensionImpacts: DimensionImpact[];
  /** 0–100: how achievable are the selected lever improvements? */
  feasibilityScore: number;
  estimatedTimeToAchieve: string;
  /** Score pts from D8 (AI-efficiency restructuring) that personal actions cannot reduce.
   *  Present when D8 is elevated (>0.3); undefined otherwise. */
  d8Gap?: number;
  /** Warning when signal data is stale (>30 days old) */
  dataFreshnessWarning?: string;
}

// Dimension labels for display
const DIMENSION_LABELS: Record<string, string> = {
  L1: 'Company Health', L2: 'Layoff History', L3: 'Role Displacement',
  L4: 'Market Conditions', L5: 'Employee Protection', D6: 'AI Agent Coverage', D7: 'Company Risk',
};

// WS9 — feasibility map sourced from engine_calibration_constants under
// 'whatIfSimulatorService.dimensionFeasibility'. Each entry is the user-
// achievable score uplift for that dimension within the timeLabel window.
// Bootstrap fallbacks preserve legacy values; ops can replace the whole
// map via a single JSONB DB row, or recalibrate-engine can produce it
// from outcomes once users report which levers actually moved their
// situation.
const BOOTSTRAP_DIMENSION_FEASIBILITY: Record<string, { score: number; timeLabel: string }> = {
  L1: { score: 30, timeLabel: '12–18 months (company switch required)' },
  L2: { score: 35, timeLabel: '12–24 months (company switch + track record)' },
  L3: { score: 60, timeLabel: '3–6 months (skill building + AI adoption)' },
  L4: { score: 25, timeLabel: '12+ months (industry change)' },
  L5: { score: 75, timeLabel: '1–3 months (performance + relationships)' },
  D6: { score: 65, timeLabel: '2–4 months (AI tool adoption)' },
  D7: { score: 35, timeLabel: '12–18 months (company or role change)' },
};

const DIMENSION_FEASIBILITY: Record<string, { score: number; timeLabel: string }> = (() => {
  const r = getConstant<Record<string, { score: number; timeLabel: string }>>(
    'whatIfSimulatorService.dimensionFeasibility',
    BOOTSTRAP_DIMENSION_FEASIBILITY,
  );
  return (r.value && typeof r.value === 'object')
    ? { ...BOOTSTRAP_DIMENSION_FEASIBILITY, ...r.value }
    : BOOTSTRAP_DIMENSION_FEASIBILITY;
})();

/**
 * Computes the simulated score given a set of active dimension improvements.
 * Uses LAYER_WEIGHTS formula (sum = 1.10, divided by weightSum before ×100).
 */
export function computeWhatIf(inputs: WhatIfSimulationInputs): WhatIfSimulationResult {
  const { currentScore, breakdown, activeLevers } = inputs;

  // Build simulated breakdown
  const simBreakdown: Record<string, number> = {
    L1: breakdown.L1,
    L2: breakdown.L2,
    L3: breakdown.L3,
    L4: breakdown.L4,
    L5: breakdown.L5,
    D6: breakdown.D6 ?? 0.5,
    D7: breakdown.D7 ?? 0.5,
  };

  // Apply lever improvements (reduce value toward optimal)
  const OPTIMAL_VALUES: Record<string, number> = {
    L1: 0.15, L2: 0.08, L3: 0.18, L4: 0.22, L5: 0.12, D6: 0.20, D7: 0.15,
  };

  for (const lever of activeLevers) {
    const current = simBreakdown[lever.dimension];
    if (current === undefined) continue;
    const optimal = OPTIMAL_VALUES[lever.dimension] ?? 0.15;
    const maxReduction = Math.max(0, current - optimal);
    const reduction = maxReduction * Math.min(1.0, lever.targetImprovement);
    simBreakdown[lever.dimension] = Math.max(optimal, current - reduction);
  }

  // Recompose score using LAYER_WEIGHTS (sum = 1.10, must divide by weightSum)
  const weightSum = Object.values(LAYER_WEIGHTS).reduce((a, b) => a + b, 0); // 1.10

  const simRaw =
    simBreakdown.L1 * LAYER_WEIGHTS.L1 +
    simBreakdown.L2 * LAYER_WEIGHTS.L2 +
    simBreakdown.L3 * LAYER_WEIGHTS.L3 +
    simBreakdown.L4 * LAYER_WEIGHTS.L4 +
    simBreakdown.L5 * LAYER_WEIGHTS.L5 +
    simBreakdown.D6 * LAYER_WEIGHTS.D6 +
    simBreakdown.D7 * LAYER_WEIGHTS.D7;

  const simulatedScore = Math.max(1, Math.min(99, Math.round((simRaw / weightSum) * 100)));
  const scoreDelta = simulatedScore - currentScore;

  const currentProb = scoreToProbability12m(currentScore);
  const simulatedProb = scoreToProbability12m(simulatedScore);

  // Build dimension impacts
  const dimensionImpacts: DimensionImpact[] = Object.entries(simBreakdown)
    .map(([dim, simVal]) => {
      const currentVal = dim === 'D6' ? (breakdown.D6 ?? 0.5)
        : dim === 'D7' ? (breakdown.D7 ?? 0.5)
        : (breakdown as any)[dim] ?? 0.5;
      // BUG-FIX: Use ?? 0 to guard against undefined LAYER_WEIGHTS key (prevents NaN)
      const dimWeight = (LAYER_WEIGHTS as any)[dim] ?? 0;
      const pointsReduced = Math.round((currentVal - simVal) * dimWeight * 100 / weightSum);
      return {
        dimension: dim,
        label: DIMENSION_LABELS[dim] ?? dim,
        currentValue: currentVal,
        simulatedValue: simVal,
        pointsReduced: Math.max(0, pointsReduced),
      };
    })
    .filter(d => d.pointsReduced > 0)
    .sort((a, b) => b.pointsReduced - a.pointsReduced);

  // Compute feasibility score (weighted average of active levers)
  let feasibilityScore = 100;
  let longestTime = '';
  if (activeLevers.length > 0) {
    const feasScores = activeLevers
      .filter(l => simBreakdown[l.dimension] !== undefined)
      .map(l => DIMENSION_FEASIBILITY[l.dimension]?.score ?? 50);
    feasibilityScore = Math.round(feasScores.reduce((a, b) => a + b, 0) / feasScores.length);
    const timeLabels = activeLevers
      .filter(l => simBreakdown[l.dimension] !== undefined)
      .map(l => DIMENSION_FEASIBILITY[l.dimension]?.timeLabel ?? 'Unknown');
    // BUG-FIX: Extract the SECOND (end) number from ranges like "12–24 months" to get
    // the true maximum. parseInt("12–24 months") = 12 for all ranges starting with 12,
    // so "12–18 months" and "12–24 months" would sort identically. Use the upper bound instead.
    longestTime = timeLabels.sort((a, b) => {
      const aMatch = a.match(/\d+/g);
      const bMatch = b.match(/\d+/g);
      const aMax = aMatch ? parseInt(aMatch[aMatch.length - 1]) : 0;
      const bMax = bMatch ? parseInt(bMatch[bMatch.length - 1]) : 0;
      return bMax - aMax;
    })[0] ?? '3–6 months';
  }

  // D8 gap: score points from AI-efficiency restructuring that no personal action can reduce.
  // D8 uses COMPOSITE_FORMULA_WEIGHTS.D8 = 0.05; compute direct contribution as d8Raw × 0.05 × 100.
  const d8Raw = inputs.d8Value ?? (inputs.breakdown as any).D8 ?? 0;
  const d8Gap = d8Raw > 0.3 ? Math.round(d8Raw * 0.05 * 100) : undefined;

  // Data freshness warning when signal data is stale
  const dataFreshnessWarning = (inputs.dataFreshnessAgeInDays != null && inputs.dataFreshnessAgeInDays > 30)
    ? `Signal data is ${inputs.dataFreshnessAgeInDays} days old — simulated improvements may not reflect current conditions.`
    : undefined;

  return {
    simulatedScore,
    scoreDelta,
    simulatedTier: getSimulatedTier(simulatedScore),
    simulatedProbability12m: simulatedProb,
    probabilityDelta: simulatedProb - currentProb,
    dimensionImpacts,
    feasibilityScore,
    estimatedTimeToAchieve: longestTime || 'Under 3 months',
    d8Gap,
    dataFreshnessWarning,
  };
}
