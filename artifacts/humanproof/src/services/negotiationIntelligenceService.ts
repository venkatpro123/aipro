/**
 * negotiationIntelligenceService.ts — v12.0
 *
 * Current employer leverage analysis and negotiation guidance.
 *
 * Most platforms tell users "find a new job." This service answers a different
 * question: "What leverage do I have at my CURRENT employer given my
 * competitive position, tenure, and runway situation?"
 *
 * Uses already-computed data:
 *   - competitiveIntelligenceEngine.ts: candidatesPerRole, marketTightness, negotiationLeverage
 *   - financialRunwayIntelligence.ts: recommendedStrategy, runwayTier, urgencyModifier
 *
 * UNCALIBRATED — tactic selection rules are developer estimates.
 */

import type { CompetitiveIntelligenceResult } from './competitiveIntelligenceEngine';
import type { FinancialRunwayResult } from './financialRunwayIntelligence';


export interface NegotiationIntelligenceInputs {
  competitiveIntelligence: CompetitiveIntelligenceResult;
  financialRunway: FinancialRunwayResult;
  currentScore: number;
  tenureYears: number;
  performanceTier: 'top' | 'average' | 'below' | 'unknown';
  industry: string;
}

export type NegotiationLeverageRating = 'STRONG' | 'MODERATE' | 'WEAK' | 'NONE';

export interface NegotiationIntelligenceResult {
  leverageRating: NegotiationLeverageRating;
  /** 0–100 composite leverage score */
  leverageScore: number;
  /** Primary negotiation approach */
  recommendedTactic: string;
  /** What specifically to ask for */
  specificAsk: string;
  /** When to have the negotiation conversation */
  timingWindow: string;
  /** How strong is the outside option (BATNA)? */
  batnaStrength: string;
  /** 2–3 specific conversation openers */
  scripts: string[];
  /** Risks of negotiating in this situation */
  risksToNegotiating: string[];
  /** Topics / demands that would backfire */
  redLines: string[];
  /** Whether to show this panel at all */
  shouldDisplay: boolean;
}

// Market tightness labels from competitiveIntelligenceEngine.ts
type MarketTightness = 'EXTREMELY_TIGHT' | 'TIGHT' | 'BALANCED' | 'LOOSE' | 'VERY_LOOSE';
type RunwayTier = 'critical' | 'elevated' | 'comfortable' | 'strong';

function computeLeverageScore(
  marketTightness: MarketTightness,
  runwayTier: RunwayTier,
  tenureYears: number,
  performanceTier: string,
  currentScore: number,
): number {
  let score = 50; // base

  // Market tightness: tight market = strong leverage
  const tightnessBonus: Record<MarketTightness, number> = {
    EXTREMELY_TIGHT: 30, TIGHT: 20, BALANCED: 0, LOOSE: -15, VERY_LOOSE: -25,
  };
  score += tightnessBonus[marketTightness] ?? 0;

  // Runway: more runway = more leverage (not desperate)
  const runwayBonus: Record<RunwayTier, number> = {
    strong: 20, comfortable: 10, elevated: -5, critical: -20,
  };
  score += runwayBonus[runwayTier] ?? 0;

  // Tenure: moderate tenure = more leverage (not new, not a cost-center)
  if (tenureYears >= 3 && tenureYears < 10) score += 10;
  else if (tenureYears >= 1.5) score += 5;
  else if (tenureYears < 0.5) score -= 15;

  // Performance
  if (performanceTier === 'top') score += 12;
  else if (performanceTier === 'below') score -= 15;

  // Risk score: high risk = lower leverage (employer may already plan cuts)
  if (currentScore >= 70) score -= 20;
  else if (currentScore >= 55) score -= 10;
  else if (currentScore <= 30) score += 8; // low risk = valued employee

  return Math.max(0, Math.min(100, score));
}

export function computeNegotiationIntelligence(
  inputs: NegotiationIntelligenceInputs,
): NegotiationIntelligenceResult {
  const {
    competitiveIntelligence,
    financialRunway,
    currentScore,
    tenureYears,
    performanceTier,
    industry,
  } = inputs;

  const marketTightness = competitiveIntelligence.marketTightness as MarketTightness;
  // BUG-FIX: FinancialRunwayResult.tier is a real typed field — removed unnecessary `as any` cast
  const runwayTier: RunwayTier = financialRunway.tier ?? 'comfortable';

  // When runway is critical, negotiation is NOT the right focus
  if (runwayTier === 'critical' || financialRunway.safeSearchMonths <= 1) {
    return {
      leverageRating: 'NONE',
      leverageScore: 0,
      recommendedTactic: '',
      specificAsk: '',
      timingWindow: '',
      batnaStrength: 'Too constrained to negotiate from strength',
      scripts: [],
      risksToNegotiating: ['Critical runway — any signal of job hunting or negotiation increases layoff risk'],
      redLines: [],
      shouldDisplay: false,
    };
  }

  const leverageScore = computeLeverageScore(marketTightness, runwayTier, tenureYears, performanceTier, currentScore);

  let leverageRating: NegotiationLeverageRating;
  if (leverageScore >= 65) leverageRating = 'STRONG';
  else if (leverageScore >= 45) leverageRating = 'MODERATE';
  else if (leverageScore >= 25) leverageRating = 'WEAK';
  else leverageRating = 'NONE';

  const batnaStrength = buildBatnaStrength(marketTightness, (competitiveIntelligence as any).estimatedWeeksToOffer ?? 8);
  const { tactic, specificAsk } = buildTacticAndAsk(leverageRating, marketTightness, runwayTier, performanceTier, industry, tenureYears);
  const timingWindow = buildTimingWindow(runwayTier, leverageRating, performanceTier);
  const scripts = buildScripts(leverageRating, specificAsk, marketTightness, tenureYears);
  const { risks, redLines } = buildRisksAndRedLines(leverageRating, currentScore, runwayTier);

  return {
    leverageRating,
    leverageScore,
    recommendedTactic: tactic,
    specificAsk,
    timingWindow,
    batnaStrength,
    scripts,
    risksToNegotiating: risks,
    redLines,
    shouldDisplay: leverageRating !== 'NONE',
  };
}

function buildBatnaStrength(tightness: MarketTightness, weeksToOffer: number): string {
  if (tightness === 'EXTREMELY_TIGHT' || tightness === 'TIGHT') {
    return `Strong outside option: ${Math.round(weeksToOffer)} weeks to offer in this market. Employers know this.`;
  }
  if (tightness === 'BALANCED') {
    return `Moderate outside option: ~${Math.round(weeksToOffer)} weeks to offer — credible but not urgent pressure.`;
  }
  return `Weak outside option: oversupplied market with ~${Math.round(weeksToOffer)} week search timeline. Don't bluff.`;
}

function buildTacticAndAsk(
  leverageRating: NegotiationLeverageRating,
  tightness: MarketTightness,
  runwayTier: RunwayTier,
  performanceTier: string,
  industry: string,
  tenureYears: number,
): { tactic: string; specificAsk: string } {
  if (leverageRating === 'STRONG') {
    if (tightness === 'EXTREMELY_TIGHT' || tightness === 'TIGHT') {
      return {
        tactic: 'Market correction ask',
        specificAsk: 'Request salary adjustment to market rate with data from your competitive intelligence (offer benchmarks). Frame as alignment, not threat.',
      };
    }
    if (performanceTier === 'top' && tenureYears >= 2) {
      return {
        tactic: 'Promotion + title upgrade',
        specificAsk: 'Request title promotion tied to documented contributions + market rate adjustment. Include 2–3 specific wins from the last 12 months.',
      };
    }
    return {
      tactic: 'Retention package negotiation',
      specificAsk: 'Request formal retention package: salary + equity refresh + clarified role scope. This signals the company sees you as at-risk of leaving.',
    };
  }

  if (leverageRating === 'MODERATE') {
    if (runwayTier === 'strong' || runwayTier === 'comfortable') {
      return {
        tactic: 'Scope expansion ask',
        specificAsk: 'Request expanded mandate, project ownership, or cross-team visibility before discussing compensation. Build the case for the comp ask.',
      };
    }
    return {
      tactic: 'Equity refresh or bonus ask',
      specificAsk: 'Request equity refresh grant (not salary increase) — easier for managers to approve, less visible to finance reviews.',
    };
  }

  // WEAK leverage
  return {
    tactic: 'Relationship-first positioning',
    specificAsk: 'Do NOT initiate formal negotiation. Instead: request 1-on-1 to understand career path clarity. Use that conversation to gauge safety before any ask.',
  };
}

function buildTimingWindow(runwayTier: RunwayTier, leverageRating: NegotiationLeverageRating, performanceTier: string): string {
  if (leverageRating === 'STRONG') {
    return 'Best window: 6–8 weeks before annual review cycle. Second-best: after a visible win or project delivery. Never during or after layoff announcements at peer companies.';
  }
  if (leverageRating === 'MODERATE') {
    return 'Best window: following performance review when trajectory is confirmed positive. Avoid Q1 (budget cycles) and earnings season.';
  }
  return 'Timing is secondary — build evidence first. Do not negotiate until you have 2+ documented wins in the past 3 months.';
}

function buildScripts(
  leverageRating: NegotiationLeverageRating,
  specificAsk: string,
  tightness: MarketTightness,
  tenureYears: number,
): string[] {
  const scripts: string[] = [];

  if (leverageRating === 'STRONG') {
    scripts.push(`"I wanted to get ahead of the annual cycle and have a direct conversation. I've benchmarked my role against market data and I'm seeing a gap of roughly [X]%. I'm committed here, but I'd like to get aligned before I'm in a position where I'm comparing offers."`);
    if (tightness === 'TIGHT' || tightness === 'EXTREMELY_TIGHT') {
      scripts.push(`"I have had a few conversations that have moved further than expected. I'm not actively pursuing anything, but I'd rather address the gap here than be in a reactive position later."`);
    }
  } else if (leverageRating === 'MODERATE') {
    scripts.push(`"I'd love to align on what a successful next 12 months looks like and make sure my compensation reflects that trajectory. Can we schedule time to map that out?"`);
    scripts.push(`"I've been thinking about the work I want to take on next year and what would make this role sustainable long-term. I want to make sure we're aligned on scope and comp before review season."`);
  } else {
    scripts.push(`"I'd love to understand what the path to [title] looks like here and what the timeline would be. I want to make sure I'm building toward that."`);
  }

  return scripts.slice(0, 3);
}

function buildRisksAndRedLines(
  leverageRating: NegotiationLeverageRating,
  currentScore: number,
  runwayTier: RunwayTier,
): { risks: string[]; redLines: string[] } {
  const risks: string[] = [];
  const redLines: string[] = [];

  if (currentScore >= 65) {
    risks.push('High risk score: asking for more at a company already considering cuts may accelerate your RIF inclusion');
  }
  if (leverageRating === 'WEAK') {
    risks.push('Low leverage environment: without a credible outside option, a "no" carries no consequence for the employer');
  }
  if (runwayTier === 'elevated') {
    risks.push('Limited runway: negotiation that signals you might leave + leave soon is less effective than being seen as a stable choice');
  }

  redLines.push('Do not mention competing offers unless they are real, written, and time-constrained');
  redLines.push('Do not escalate to HR without a manager champion — HR\'s job is company risk management, not your advocacy');
  if (currentScore >= 55) {
    redLines.push('Do not ask for anything that signals you are "checking out" (remote upgrade, reduced responsibility, part-time) at a company with high risk signals');
  }

  return { risks, redLines };
}
