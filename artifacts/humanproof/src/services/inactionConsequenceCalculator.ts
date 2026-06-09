// inactionConsequenceCalculator.ts — Rule 1 (Decision-first) + Rule 4 (Psychology-first)
//
// Pure deterministic function — no LLM, no network.
// Answers "what happens if I don't act?" for every action item.
// Used by InactionWarningStrip in CareerOSHome and anywhere else we need
// a forward-looking projection from inaction.

import type { CompressedSignal } from './signalCompressionService';
import type { ActionPlanItem } from '../types/hybridResult';

export type InactionRiskLabel = 'Stable' | 'Elevated' | 'High Risk' | 'Critical';

export interface InactionTrajectory {
  days: 7 | 30 | 60 | 90;
  projectedScore: number;    // current + compounding delta, capped at 95
  label: InactionRiskLabel;
  rationale: string;         // one-sentence explanation
}

function scoreLabel(score: number): InactionRiskLabel {
  if (score >= 75) return 'Critical';
  if (score >= 60) return 'High Risk';
  if (score >= 40) return 'Elevated';
  return 'Stable';
}

// The top signal's severity (0–100) is used to scale the compounding rate.
// When no signal is available we fall back to 10% of the action's risk reduction
// as the monthly compound penalty.
function monthlyDelta(
  skippedAction: ActionPlanItem,
  topSignal: CompressedSignal | null,
): number {
  const base = skippedAction.riskReductionPct
    ? skippedAction.riskReductionPct / 100  // convert % → fraction
    : 0.04;                                  // default: 4 pts/month
  const signalMultiplier = topSignal
    ? 0.5 + (topSignal.severity / 200)       // 0.5–1.0 based on signal severity
    : 0.7;
  return base * signalMultiplier;
}

function compound(start: number, deltaPerMonth: number, months: number): number {
  // Compounding risk: each month the missed delta compounds on the new higher base
  let score = start;
  for (let i = 0; i < months; i++) {
    score = Math.min(95, score + score * deltaPerMonth);
  }
  return Math.round(score);
}

export function computeInactionTrajectory(
  currentScore: number,
  topSignal: CompressedSignal | null,
  skippedAction: ActionPlanItem,
): InactionTrajectory[] {
  const delta = monthlyDelta(skippedAction, topSignal);
  const signalName = topSignal?.headline ?? 'the top risk signal';
  const actionTitle = skippedAction.title;

  return [
    {
      days: 7,
      projectedScore: Math.round(Math.min(95, currentScore + currentScore * delta * (7 / 30))),
      label: scoreLabel(Math.round(Math.min(95, currentScore + currentScore * delta * (7 / 30)))),
      rationale: `Without "${actionTitle}", ${signalName} continues to push your risk higher.`,
    },
    {
      days: 30,
      projectedScore: compound(currentScore, delta, 1),
      label: scoreLabel(compound(currentScore, delta, 1)),
      rationale: `One month of inaction — ${signalName} compounds without intervention.`,
    },
    {
      days: 60,
      projectedScore: compound(currentScore, delta, 2),
      label: scoreLabel(compound(currentScore, delta, 2)),
      rationale: `Two months without action: ${signalName} now drives your score significantly higher.`,
    },
    {
      days: 90,
      projectedScore: compound(currentScore, delta, 3),
      label: scoreLabel(compound(currentScore, delta, 3)),
      rationale: `90 days of inaction. Risk compounds further — recovery becomes significantly harder from here.`,
    },
  ];
}

// Convenience: returns only the 30-day projection (the most useful single number for UI banners)
export function computeInaction30Day(
  currentScore: number,
  topSignal: CompressedSignal | null,
  skippedAction: ActionPlanItem,
): { projectedScore: number; label: InactionRiskLabel; targetDate: string } {
  const trajectory = computeInactionTrajectory(currentScore, topSignal, skippedAction);
  const day30 = trajectory.find(t => t.days === 30)!;
  const targetDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return {
    projectedScore: day30.projectedScore,
    label: day30.label,
    targetDate,
  };
}
