// scoreSensitivityEngine.ts
// Intelligence Upgrade v10.0 — Score Sensitivity Analysis
//
// PROBLEM THIS SOLVES:
//   Escape paths tell users WHAT to do (career moves over months).
//   Sensitivity analysis tells users WHAT MOVES THE NEEDLE TODAY.
//   "If L1 improved 25 points, your score drops 4 pts — that's your highest leverage."
//   This is faster, more granular, and more motivating than career-move advice.
//
// DESIGN:
//   For each dimension, compute:
//     sensitivityDrop = if this dimension improved by 25 points (0-1 scale = 0.25),
//                       how many points would the final score drop?
//   = 0.25 × dimensionWeight × 100
//
//   Then for each dimension, identify the FASTEST single action that would
//   create a 25-point improvement in that dimension.
//
//   Output is sorted by sensitivity DESC — user sees "these 3 levers move the score most."
//
// USE CASE:
//   User sees their score is 68. They ask: "What single change has the biggest impact?"
//   Answer: "Switching to a financially healthier company reduces L1 by ~30 pts,
//             which drops your overall score by ~5 pts — more than any other single move."

import type { ScoreBreakdown } from './layoffScoreEngine';
// v39.0 E2: use the authoritative formula weights instead of the duplicated
// DIMENSION_CONFIG.weight values (which had drifted: L4 0.01 vs engine 0.00,
// D6 0.05 vs engine 0.04, D8 0.05 vs engine 0.09 then 0 when flag-gated).
import { getEffectiveFormulaWeights } from './layoffScoreEngine';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface SensitivityLever {
  dimension: string;             // e.g. "L1", "L3", "D8"
  dimensionLabel: string;        // e.g. "Company Financial Health"
  currentScore: number;          // 0–100 (display)
  improvementTarget: number;     // 0–100 target (current − 25, floored at 0)
  scoreDropIfImproved: number;   // final score points dropped if 25pt improvement achieved
  percentOfTotalRisk: number;    // this lever's share of the current score
  fastestAction: string;         // single fastest action to move this dimension 25pts
  actionTimeframe: string;       // "Today" / "1 week" / "30 days" / "60–90 days"
  feasibility: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
  confidenceInEstimate: 'High' | 'Medium' | 'Low';
}

export interface SensitivityCombo {
  levers: [string, string];      // two dimension keys
  combinedDrop: number;          // combined score drop if BOTH improved
  synergyBonus: number;          // extra drop from synergy (combinedDrop - sum of individual)
  rationale: string;
}

export interface ScoreSensitivityResult {
  // ── Per-dimension levers (sorted by scoreDropIfImproved DESC) ─────────────
  levers: SensitivityLever[];

  // ── Top insights (optional: undefined when levers array is empty) ──────────
  highestImpactLever: SensitivityLever | undefined;
  quickestImpactLever: SensitivityLever | undefined;
  mostActionableLever: SensitivityLever | undefined;

  // ── Synergy combos ─────────────────────────────────────────────────────────
  topSynergyCombos: SensitivityCombo[];       // top 2 dimension pairs that compound well

  // ── Score projections ─────────────────────────────────────────────────────
  currentScore: number;
  bestSingleLeverScore: number;               // score if only top lever is pulled
  bestTwoLeverScore: number;                  // score if top 2 levers are pulled
  bestThreeLeverScore: number;               // score if top 3 levers are pulled

  // ── Summary sentence ──────────────────────────────────────────────────────
  keySensitivityInsight: string;
}

// ─── Dimension configuration ───────────────────────────────────────────────────

interface DimensionConfig {
  label: string;
  weight: number;
  fastestAction: (currentScore: number) => string;
  actionTimeframe: (currentScore: number) => string;
  feasibility: (currentScore: number) => SensitivityLever['feasibility'];
  confidence: 'High' | 'Medium' | 'Low';
}

const DIMENSION_CONFIG: Record<string, DimensionConfig> = {
  L1: {
    label: 'Company Financial Health',
    weight: 0.16,
    fastestAction: (s) => s >= 70
      ? 'Switch to a company with >15% revenue growth and no documented layoff history in 24 months.'
      : 'Monitor company earnings closely; a positive guidance beat reduces L1 by 8–12 pts within days.',
    actionTimeframe: (s) => s >= 70 ? '60–90 days (job search)' : '2–4 weeks (market wait)',
    feasibility: (s) => s >= 70 ? 'medium_term' : 'short_term',
    confidence: 'High',
  },
  L2: {
    label: 'Layoff History',
    weight: 0.06,
    fastestAction: () => 'Switch to a company with zero layoff rounds in 24 months — this drops L2 to ~8/100 immediately upon joining.',
    actionTimeframe: () => '60–90 days (job search)',
    feasibility: () => 'medium_term',
    confidence: 'High',
  },
  L3: {
    label: 'Role Displacement Risk',
    weight: 0.18,
    fastestAction: (s) => s >= 70
      ? 'Complete one role-specific AI certification and build one documented AI oversight workflow — this repositions your role from "automatable" to "AI-oversight".'
      : 'Demonstrate one AI-augmented deliverable in your current work this week — publicly visible evidence shifts the signal.',
    actionTimeframe: (s) => s >= 70 ? '30 days' : '1 week',
    feasibility: (s) => s >= 70 ? 'short_term' : 'immediate',
    confidence: 'Medium',
  },
  L4: {
    label: 'Industry / Sector Headwinds',
    // L4 maps to D5_countryContext = 0.00 in COMPOSITE_FORMULA_WEIGHTS.
    // Country context enters the formula via D1 country multiplier (L3 channel, w=0.18)
    // and PPP thresholds in L1 (w=0.16), not through this standalone dimension.
    // Weight = 0.00 means scoreDropIfImproved = 0 for direct L4 improvement — correct.
    // getEffectiveFormulaWeights() returns 0 for L4; this fallback matches.
    weight: 0.00,
    fastestAction: () => 'Country context enters your score via role AI deployment rates (D1) and PPP-adjusted company health (L1), not as a standalone lever. Target a role in a growth sector to improve D1 and L3 simultaneously.',
    actionTimeframe: () => '60–90 days (job search)',
    feasibility: () => 'medium_term',
    confidence: 'High',
  },
  L5: {
    label: 'Experience & Resilience Protection',
    weight: 0.18,
    fastestAction: (s) => s >= 65
      ? 'Document one achievement with concrete numbers (revenue impact, users affected, efficiency %) and add to LinkedIn and resume today — this shifts the "generic" signal immediately.'
      : 'Request a formal 1-on-1 with your manager this week to understand your performance tier relative to team — proactive visibility reduces L5 risk.',
    actionTimeframe: () => 'Today / 1 week',
    feasibility: () => 'immediate',
    confidence: 'Medium',
  },
  D6: {
    label: 'Network & Relationship Moat',
    weight: 0.05,
    fastestAction: () => 'Schedule 2 cross-functional relationship-building conversations this week — D6 improvement requires sustained 30-day effort but starts today.',
    actionTimeframe: () => '30–60 days',
    feasibility: () => 'short_term',
    confidence: 'Low',
  },
  D7: {
    label: 'Unified Company Health',
    weight: 0.06,
    fastestAction: () => 'Switch to a company with a healthier composite profile — D7 captures the combined financial + market + AI investment signal that only a company change resolves.',
    actionTimeframe: () => '60–90 days',
    feasibility: () => 'medium_term',
    confidence: 'High',
  },
  D8: {
    label: 'AI Efficiency Restructuring Risk',
    weight: 0.05,
    fastestAction: () => 'Build and document one AI oversight workflow in your current role — frame yourself as "the person who validates AI output" rather than "the person AI replaces." This directly addresses D8.',
    actionTimeframe: () => '2 weeks',
    feasibility: () => 'short_term',
    confidence: 'Medium',
  },
};

// Synergy pairs: when two levers are improved together, the compound effect is larger
// than the sum of individual effects because the risks compound.
const SYNERGY_MATRIX: Array<{ pair: [string, string]; bonus: number; rationale: string }> = [
  {
    pair: ['L1', 'L2'],
    bonus: 1.5,
    rationale: 'Company switch eliminates BOTH L1 (unhealthy company) and L2 (layoff history) simultaneously — the joint improvement is more than additive because both are correlated with restructuring probability.',
  },
  {
    pair: ['L3', 'D8'],
    bonus: 1.2,
    rationale: 'AI oversight skills address both role displacement (L3) and AI efficiency restructuring (D8) simultaneously — the same skill investment reduces two independent risk dimensions.',
  },
  {
    pair: ['L5', 'D6'],
    bonus: 0.8,
    rationale: 'Personal resilience (L5) and network moat (D6) reinforce each other — visible achievements attract relationship opportunities, and strong relationships amplify the impact of demonstrated skills.',
  },
  {
    pair: ['L1', 'L4'],
    bonus: 0.5,
    rationale: 'Switching to a healthier company in a growing industry eliminates both financial risk (L1) and sector headwinds (L4) — job searches naturally target both simultaneously.',
  },
];

// ─── Main computation ──────────────────────────────────────────────────────────

export interface SensitivityInputs {
  currentScore: number;
  breakdown: ScoreBreakdown & { D6?: number; D7?: number; D8?: number };
}

export function computeScoreSensitivity(inputs: SensitivityInputs): ScoreSensitivityResult {
  const { currentScore, breakdown } = inputs;

  const dimEntries: Array<{ key: string; rawScore: number }> = [
    { key: 'L1', rawScore: breakdown.L1 ?? 0 },
    { key: 'L2', rawScore: breakdown.L2 ?? 0 },
    { key: 'L3', rawScore: breakdown.L3 ?? 0 },
    { key: 'L4', rawScore: breakdown.L4 ?? 0 },
    { key: 'L5', rawScore: breakdown.L5 ?? 0.5 },
    { key: 'D6', rawScore: breakdown.D6 ?? 0.5 },
    { key: 'D7', rawScore: breakdown.D7 ?? 0.5 },
    { key: 'D8', rawScore: breakdown.D8 ?? 0 },
  ].filter(d => d.rawScore > 0.05); // skip dimensions with effectively zero contribution

  // Guard: if all dimensions are below the 0.05 threshold (extreme low-score edge case),
  // return a minimal valid result rather than crashing on levers[0] access below.
  if (dimEntries.length === 0) {
    return {
      levers: [],
      highestImpactLever: undefined,
      quickestImpactLever: undefined,
      mostActionableLever: undefined,
      topSynergyCombos: [],
      currentScore,
      bestSingleLeverScore: currentScore,
      bestTwoLeverScore: currentScore,
      bestThreeLeverScore: currentScore,
      keySensitivityInsight: 'Insufficient dimensional data to compute sensitivity analysis.',
    };
  }

  // v39.0 E2: pull the AUTHORITATIVE weights from the score engine so the
  // displayed score-drop matches what would actually happen if the user
  // moved that dimension. Falls back to DIMENSION_CONFIG.weight only if a
  // dimension isn't in the engine's keys (e.g. a UI-only display field).
  const effectiveWeights = getEffectiveFormulaWeights();

  // ── Compute levers ─────────────────────────────────────────────────────────
  const levers: SensitivityLever[] = dimEntries
    .map(({ key, rawScore }) => {
      const cfg = DIMENSION_CONFIG[key];
      if (!cfg) return null;

      const displayScore = Math.round(rawScore * 100);
      const improvementTarget = Math.max(0, displayScore - 25);
      // If current score is already below 25, improvement is bounded by the score itself
      const actualImprovement = Math.min(0.25, rawScore);
      // v39.0 E2: gradient = effective formula weight; drop = ΔL × weight × 100
      const weight = effectiveWeights[key] ?? cfg.weight;
      const scoreDropIfImproved = Math.round(actualImprovement * weight * 100 * 10) / 10;
      const percentOfTotalRisk = Math.round((rawScore * weight * 100 / Math.max(1, currentScore)) * 100);

      return {
        dimension: key,
        dimensionLabel: cfg.label,
        currentScore: displayScore,
        improvementTarget,
        scoreDropIfImproved,
        percentOfTotalRisk,
        fastestAction: cfg.fastestAction(displayScore),
        actionTimeframe: cfg.actionTimeframe(displayScore),
        feasibility: cfg.feasibility(displayScore),
        confidenceInEstimate: cfg.confidence,
      } satisfies SensitivityLever;
    })
    .filter((l): l is SensitivityLever => l !== null)
    .sort((a, b) => b.scoreDropIfImproved - a.scoreDropIfImproved);

  const highestImpactLever = levers[0];
  const quickestImpactLever = levers
    .filter(l => l.feasibility === 'immediate' || l.feasibility === 'short_term')
    .sort((a, b) => b.scoreDropIfImproved - a.scoreDropIfImproved)[0] ?? levers[0];
  const mostActionableLever = levers
    .filter(l => l.feasibility === 'immediate')
    .sort((a, b) => b.scoreDropIfImproved - a.scoreDropIfImproved)[0] ?? quickestImpactLever;

  // ── Synergy combos ─────────────────────────────────────────────────────────
  const leverMap = new Map(levers.map(l => [l.dimension, l]));
  const topSynergyCombos: SensitivityCombo[] = SYNERGY_MATRIX
    .filter(s => leverMap.has(s.pair[0]) && leverMap.has(s.pair[1]))
    .map(s => {
      const a = leverMap.get(s.pair[0])!;
      const b = leverMap.get(s.pair[1])!;
      const additive = a.scoreDropIfImproved + b.scoreDropIfImproved;
      const combined = additive + s.bonus;
      return {
        levers: s.pair,
        combinedDrop: Math.round(combined * 10) / 10,
        synergyBonus: Math.round(s.bonus * 10) / 10,
        rationale: s.rationale,
      } satisfies SensitivityCombo;
    })
    .sort((a, b) => b.combinedDrop - a.combinedDrop)
    .slice(0, 2);

  // ── Score projections ──────────────────────────────────────────────────────
  const top3Drops = levers.slice(0, 3).map(l => l.scoreDropIfImproved);
  const bestSingleLeverScore = Math.max(10, Math.round(currentScore - (top3Drops[0] ?? 0)));
  const bestTwoLeverScore = Math.max(10, Math.round(currentScore - (top3Drops[0] ?? 0) - (top3Drops[1] ?? 0)));
  const bestThreeLeverScore = Math.max(10, Math.round(currentScore - top3Drops.reduce((s, d) => s + d, 0)));

  const keySensitivityInsight = highestImpactLever
    ? `Your highest-leverage single action is improving ${highestImpactLever.dimensionLabel} (currently ${highestImpactLever.currentScore}/100) — a 25-point improvement drops your overall score by ~${highestImpactLever.scoreDropIfImproved} pts. ${highestImpactLever.fastestAction.split('.')[0]}.`
    : `Improve any dimension by 25 points to meaningfully shift your overall risk score.`;

  return {
    levers,
    highestImpactLever,
    quickestImpactLever,
    mostActionableLever,
    topSynergyCombos,
    currentScore,
    bestSingleLeverScore,
    bestTwoLeverScore,
    bestThreeLeverScore,
    keySensitivityInsight,
  };
}
