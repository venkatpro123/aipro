/**
 * actionConsequenceEngine.ts — Rule 1 compliance
 *
 * Injects "Why it matters" and "If you don't" framing into every ActionPlanItem
 * so every card answers the 4 questions:
 *   1. What happened? (title)
 *   2. Why does it matter? (whyItMatters)
 *   3. What should I do? (description)
 *   4. What happens if I don't? (consequence)
 *
 * Pure deterministic function — no LLM, no network. Called once per audit
 * after personalization pass in auditDataPipeline.
 */

import type { ActionPlanItem } from '../types/hybridResult';
import type { HybridResult } from '../types/hybridResult';

// Layer focus → consequence template when action is skipped
const LAYER_CONSEQUENCE: Record<string, string> = {
  L1: 'Without this, your company-level risk remains unaddressed — the most predictive signal of near-term layoff.',
  L2: 'Skipping this leaves your layoff history pattern unmitigated, keeping your risk score elevated.',
  L3: 'Without this, a hiring freeze at your company becomes a ceiling on internal mobility and salary negotiation.',
  L4: 'Inaction here means your industry-level exposure compounds with each passing month.',
  L5: 'Without this, leadership instability at your company continues to accelerate your personal risk.',
  D1: 'AI displacement in your role accelerates quarterly. Each month without upskilling widens the gap.',
  D2: 'Skill obsolescence compounds — without this, recruiter visibility for your role drops as demand shifts.',
  D3: 'Without this, your company amplification factor remains high — the hidden multiplier on your base risk.',
  D4: 'Industry risk is cyclical; without protective positioning you enter the next downturn exposed.',
  D5: 'Regional market conditions are shifting — without this, geographic optionality narrows.',
  D6: 'Experience discount is recoverable only with demonstrated recent wins — inaction widens the gap.',
};

// Priority → urgency framing
const PRIORITY_URGENCY: Record<ActionPlanItem['priority'], string> = {
  Critical: 'Act within 48 hours',
  High: 'Act this week',
  Medium: 'Act within 30 days',
  Low: 'Act this quarter',
};

// Keyword → "Why it matters" template
const KEYWORD_WHY: Array<[RegExp, (score: number, role: string) => string]> = [
  [/linkedin|profile|headline/i, (s, r) => `Recruiters and hiring managers screen ${r || 'your role'} candidates on LinkedIn first — your profile is your first-impression filter at ${s}% risk.`],
  [/resume|cv\b/i, (s, r) => `At ${s}% risk, your resume is the bridge to your next opportunity. ATS systems reject 75% before a human sees it.`],
  [/skill|learn|course|certif/i, (s, _) => `AI displacement is eroding adjacent roles monthly. This skill directly widens your human-advantage gap at ${s}% risk.`],
  [/network|connect|reach out|referral/i, (_, r) => `70% of roles are filled through network — not job boards. This is the highest-leverage channel for ${r || 'your role'}.`],
  [/negotiat|salary|compens|pay/i, (s, _) => `At ${s}% risk, your leverage window is now — before a job loss event resets your negotiating position permanently.`],
  [/github|portfolio|project|build/i, (_, r) => `Demonstrated work is the proof recruiters trust over credentials for ${r || 'your role'} — this is your competitive differentiator.`],
  [/interview|practice|prep/i, (s, _) => `Interview skills decay without practice. At ${s}% risk, readiness now vs. in 3 months is the difference between options and desperation.`],
  [/ai|automat|prompt|llm|gpt|rag/i, (_, r) => `AI fluency is becoming table stakes for ${r || 'your role'}. Those who adopt it early outperform by 2–3× in productivity measures.`],
  [/financial|saving|fund|emergency/i, (s, _) => `At ${s}% risk, your financial runway is your decision-making freedom. Without it, you accept the first offer, not the best.`],
  [/internal|transfer|mobil|promot/i, (_, r) => `Internal mobility is 2× faster than external search for ${r || 'your role'} and preserves institutional advantage.`],
  [/visa|immigr|status|sponsor/i, (s, _) => `With ${s}% layoff risk and an employer-tied visa, the clock starts at job loss — this action buys buffer time.`],
];

function buildWhyItMatters(action: ActionPlanItem, score: number, role: string): string {
  for (const [pattern, fn] of KEYWORD_WHY) {
    if (pattern.test(action.title) || pattern.test(action.description)) {
      return fn(score, role);
    }
  }
  // Layer-based fallback
  const layer = action.layerFocus?.toUpperCase();
  if (layer && layer in LAYER_CONSEQUENCE) {
    return `This targets your ${layer} risk dimension — one of the strongest predictors in your current score of ${score}.`;
  }
  return `Your current risk score is ${score}/100. This action directly addresses one of the top drivers identified in your audit.`;
}

function buildConsequence(action: ActionPlanItem, score: number): string {
  // High-score urgency
  if (score >= 70) {
    return `At ${score}% risk, inaction within ${action.deadline} means this risk driver remains live and actively raising your layoff probability.`;
  }
  // Layer-specific
  const layer = action.layerFocus?.toUpperCase();
  if (layer && layer in LAYER_CONSEQUENCE) {
    return LAYER_CONSEQUENCE[layer];
  }
  // Priority-based
  const urgency = PRIORITY_URGENCY[action.priority];
  return `${urgency}. Delaying this allows the underlying risk factor to compound — each week without action reduces your optionality.`;
}

/**
 * Injects whyItMatters + consequence + impactConfidenceSource into every action.
 * Call after actionRankingService sorts the list.
 */
export function injectActionConsequences(
  actions: ActionPlanItem[],
  hr: HybridResult,
): ActionPlanItem[] {
  const score = Math.round(hr.total ?? 0);
  const role = (hr as any).roleTitle ?? (hr as any).role ?? '';

  return actions.map(action => {
    if (action.whyItMatters && action.consequence) return action; // already set

    const whyItMatters = buildWhyItMatters(action, score, role);
    const consequence = buildConsequence(action, score);

    // Confidence source: if riskReductionPct is from outcome data (evidenceStats present) → MEASURED
    // If from engine calculation → MODELED; otherwise → ESTIMATED
    const impactConfidenceSource: ActionPlanItem['impactConfidenceSource'] =
      action.evidenceStats ? 'MEASURED'
      : action.evidence?.some(e => e.confidence === 'high') ? 'MODELED'
      : 'ESTIMATED';

    return { ...action, whyItMatters, consequence, impactConfidenceSource };
  });
}
