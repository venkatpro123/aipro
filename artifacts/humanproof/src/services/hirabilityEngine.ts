// hirabilityEngine.ts — Career Readiness: the Hirability Score (Command Center)
//
// Answers the one question the whole center exists for:
//   "Can this person realistically get hired if they lose their job tomorrow?"
//
// Aggregates 10 readiness components — four from the per-tab diagnostic engines
// (resume/linkedin/interview/portfolio) and six from real audit signals
// (network, market fit, AI, demand, brand, optionality) — into a single
// Hirability Score plus the derived probabilities the dashboard leads with.
// Pure derivation; honest provenance per component.

import type { HybridResult } from '../types/hybridResult';
import type { UserProfile } from './userProfileService';
import { computeAILeverageScore } from './aiAmplificationService';
import {
  computeResumeIntelligence,
  computeLinkedInIntelligence,
  computeInterviewReadiness,
  computePortfolioStrength,
  type ConfidenceKind,
} from './readinessDiagnostics';

export interface HirabilityComponent {
  key: string;
  label: string;
  icon: string;
  score: number;                 // 0–100
  trend: 'rising' | 'falling' | 'stable';
  confidenceKind: ConfidenceKind;
  /** The single highest-impact next move for this component. */
  improvement: string;
  /** Which tab to open to act on it. */
  tab?: string;
}

export interface HirabilityReport {
  hirabilityScore: number;            // 0–100 overall
  verdict: 'Highly Hireable' | 'Hireable' | 'Gaps to Close' | 'At Risk';
  verdictNarrative: string;
  components: HirabilityComponent[];
  // Derived command-center probabilities
  interviewProbability: number;
  offerProbability: number;
  marketCompetitiveness: number;
  externalMobility: number;
  networkLeverage: number;
  aiPreparedness: number;
  careerOptionality: number;
  /** The two weakest components — the bottlenecks on getting hired. */
  bottlenecks: HirabilityComponent[];
}

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(v)));

// Component weights toward overall hirability (sum normalised).
const WEIGHTS: Record<string, number> = {
  resume: 0.13, linkedin: 0.11, interview: 0.14, portfolio: 0.10, network: 0.13,
  market_fit: 0.10, ai: 0.09, demand: 0.08, brand: 0.06, optionality: 0.06,
};

export function computeHirability(hr: HybridResult, profile: UserProfile | null): HirabilityReport {
  const anyHr = hr as any;
  const trendDir: HirabilityComponent['trend'] =
    hr.scoreDelta?.direction === 'improving' ? 'rising' : hr.scoreDelta?.direction === 'worsening' ? 'falling' : 'stable';

  // Tab-engine-backed components.
  const resume = computeResumeIntelligence(hr, profile);
  const linkedin = computeLinkedInIntelligence(hr, profile);
  const interview = computeInterviewReadiness(hr, profile);
  const portfolio = computePortfolioStrength(hr, profile);

  // Real-signal components.
  const net = clamp(anyHr.networkLeverage?.networkScore ?? 35);
  const marketFit = clamp(anyHr.skillPortfolioFit?.fitScore ?? 50);
  const aiReady = clamp(computeAILeverageScore([], hr).leverageScore);
  const demand = clamp(anyHr.roleMarketDemand?.demandIndex ?? 55);
  const experienceYears = profile?.yearsExperience ?? Number((hr.experience ?? '5').split('-')[0]) ?? 5;
  const brand = clamp(net * 0.4 + Math.min(45, experienceYears * 3) + 10); // reputation proxy
  const escapeCount = anyHr.escapePaths?.paths?.length ?? 0;
  const adjCount = anyHr.roleAdjacency?.adjacentRoles?.length ?? 0;
  const optionality = clamp(escapeCount * 12 + adjCount * 8 + (marketFit - 50) * 0.4 + 20);

  const components: HirabilityComponent[] = [
    { key: 'resume', label: 'Resume Strength', icon: '📄', score: resume.score, trend: trendDir, confidenceKind: resume.confidenceKind, improvement: resume.improvements[0]?.action ?? 'Resume is in good shape.', tab: 'resume' },
    { key: 'linkedin', label: 'LinkedIn Strength', icon: '💼', score: linkedin.score, trend: trendDir, confidenceKind: linkedin.confidenceKind, improvement: linkedin.improvements[0]?.action ?? 'Profile is in good shape.', tab: 'linkedin' },
    { key: 'interview', label: 'Interview Strength', icon: '🎙️', score: interview.score, trend: trendDir, confidenceKind: interview.confidenceKind, improvement: interview.improvements[0]?.action ?? 'Keep practicing.', tab: 'interview' },
    { key: 'portfolio', label: 'Portfolio Strength', icon: '🗂️', score: portfolio.score, trend: trendDir, confidenceKind: portfolio.confidenceKind, improvement: portfolio.improvements[0]?.action ?? 'Proof-of-work is solid.', tab: 'portfolio' },
    { key: 'network', label: 'Network Strength', icon: '🤝', score: net, trend: trendDir, confidenceKind: anyHr.networkLeverage ? 'modeled' : 'estimated', improvement: 'Re-warm 5 high-value contacts this week.', tab: 'referral' },
    { key: 'market_fit', label: 'Market Fit', icon: '🎯', score: marketFit, trend: trendDir, confidenceKind: anyHr.skillPortfolioFit ? 'modeled' : 'estimated', improvement: 'Close your top skill-market gap with a shippable deliverable.', tab: 'portfolio' },
    { key: 'ai', label: 'AI Readiness', icon: '🤖', score: aiReady, trend: trendDir, confidenceKind: 'modeled', improvement: 'Adopt one AI workflow and document the time saved.' },
    { key: 'demand', label: 'Demand Alignment', icon: '📈', score: demand, trend: anyHr.roleMarketDemand?.demandTrend === 'rising' || anyHr.roleMarketDemand?.demandTrend === 'surging' ? 'rising' : anyHr.roleMarketDemand?.demandTrend === 'declining' || anyHr.roleMarketDemand?.demandTrend === 'falling' ? 'falling' : 'stable', confidenceKind: anyHr.roleMarketDemand ? 'modeled' : 'estimated', improvement: 'Align your positioning to the rising-demand slice of your field.' },
    { key: 'brand', label: 'Personal Brand', icon: '⭐', score: brand, trend: trendDir, confidenceKind: 'estimated', improvement: 'Publish one substantive piece on your specialty this month.', tab: 'linkedin' },
    { key: 'optionality', label: 'Career Optionality', icon: '🧭', score: optionality, trend: trendDir, confidenceKind: 'modeled', improvement: 'Validate one adjacent role you could pivot to within 3 months.' },
  ];

  const hirabilityScore = clamp(components.reduce((s, c) => s + c.score * (WEIGHTS[c.key] ?? 0.1), 0));
  const verdict: HirabilityReport['verdict'] =
    hirabilityScore >= 75 ? 'Highly Hireable' : hirabilityScore >= 58 ? 'Hireable' : hirabilityScore >= 42 ? 'Gaps to Close' : 'At Risk';

  // Derived probabilities the command center leads with.
  const interviewProbability = clamp(resume.score * 0.3 + linkedin.score * 0.25 + net * 0.25 + demand * 0.2);
  const offerProbability = clamp(interviewProbability * 0.5 + interview.score * 0.35 + portfolio.score * 0.15);
  const marketCompetitiveness = clamp(marketFit * 0.5 + demand * 0.3 + aiReady * 0.2);
  const externalMobility = clamp(optionality * 0.5 + net * 0.3 + demand * 0.2);

  const bottlenecks = [...components].sort((a, b) => a.score - b.score).slice(0, 2);

  const verdictNarrative =
    `If you had to find a new role tomorrow, you are ${verdict.toLowerCase()} (${hirabilityScore}/100). ` +
    `Your interview probability is ~${interviewProbability}% and offer probability ~${offerProbability}%. ` +
    `The two things holding you back most are your ${bottlenecks[0].label.toLowerCase()} and ${bottlenecks[1].label.toLowerCase()} — fix those first.`;

  return {
    hirabilityScore, verdict, verdictNarrative, components,
    interviewProbability, offerProbability, marketCompetitiveness, externalMobility,
    networkLeverage: net, aiPreparedness: aiReady, careerOptionality: optionality,
    bottlenecks,
  };
}
