// careerMoatEngine.ts — AI Career Defense: Career Moat Intelligence (Rule #3)
//
// "Every user should receive a Career Moat Analysis." A moat is what AI (and the
// market) CANNOT easily take from you. This engine scores eight moats, finds the
// weakest, identifies the single highest-ROI moat to build, and names the most
// defensible strategy — all as a PURE derivation over the existing audit result
// (no new scoring layer). Reputation/Distribution have no direct engine, so they
// are derived heuristically and honestly labelled 'estimated'.

import type { HybridResult } from '../types/hybridResult';
import type { UserProfile } from './userProfileService';
import { computeAILeverageScore } from './aiAmplificationService';

export type MoatKey =
  | 'technical' | 'domain' | 'leadership' | 'relationship'
  | 'reputation' | 'distribution' | 'financial' | 'ai';

export type ConfidenceKind = 'measured' | 'modeled' | 'estimated';

export interface CareerMoat {
  key: MoatKey;
  label: string;
  icon: string;
  score: number;                 // 0–100 (higher = stronger moat)
  status: 'strong' | 'fair' | 'weak';
  /** Why the score is what it is — grounded in real signals. */
  evidence: string[];
  /** What this moat protects against as AI advances. */
  protects: string;
  /** Concrete move to strengthen it. */
  howToBuild: string;
  buildSpeed: 'fast' | 'medium' | 'slow';
  /** Composite "build this next" score; higher = better return on effort. */
  roiScore: number;
  confidenceKind: ConfidenceKind;
}

export interface CareerMoatReport {
  moats: CareerMoat[];
  /** Weighted overall moat strength, 0–100. */
  overallMoatStrength: number;
  strengthLabel: 'Fortress' | 'Defensible' | 'Exposed' | 'Vulnerable';
  /** Two strongest moats — what to lead with and defend. */
  strongestMoats: CareerMoat[];
  /** Two weakest moats — the open flanks. */
  weakestMoats: CareerMoat[];
  /** The single best moat to build now (gap × protective impact × build speed). */
  highestRoiMoat: CareerMoat;
  /** Narrative naming the moats to concentrate on. */
  mostDefensibleStrategy: string;
}

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(v)));

function statusFor(score: number): CareerMoat['status'] {
  return score >= 65 ? 'strong' : score >= 40 ? 'fair' : 'weak';
}

// Protective weight: how much each moat insulates against AI displacement.
const IMPACT: Record<MoatKey, number> = {
  ai: 1.0, technical: 0.9, domain: 0.85, relationship: 0.8,
  leadership: 0.8, financial: 0.75, distribution: 0.7, reputation: 0.6,
};
const SPEED_FACTOR: Record<CareerMoat['buildSpeed'], number> = { fast: 1.0, medium: 0.7, slow: 0.4 };

export function computeCareerMoats(hr: HybridResult, profile: UserProfile | null): CareerMoatReport {
  const anyHr = hr as any;
  const d1 = hr.dimensions?.find(d => d.key === 'D1')?.score ?? 50; // AI exposure (higher = worse)
  const _expM = String(hr.experience ?? '').match(/\d+/); // '20+' / '5-10' → first number; avoids NaN
  const experienceYears = (typeof profile?.yearsExperience === 'number' && Number.isFinite(profile.yearsExperience))
    ? profile.yearsExperience : (_expM ? parseInt(_expM[0], 10) : 5);
  const industryYears = profile?.industryYears ?? experienceYears;
  const tenureYears = hr.tenureYears ?? profile?.tenureYears ?? 2;

  const moats: CareerMoat[] = [];

  // ── Technical moat ──────────────────────────────────────────────────────────
  {
    const fit = anyHr.skillPortfolioFit?.fitScore ?? 50;
    const stackStatus: string | undefined = anyHr.techStackObsolescence?.primaryStackStatus;
    const stackPenalty = stackStatus === 'OBSOLETE' ? -22 : stackStatus === 'LEGACY' ? -12 : stackStatus === 'AGING' ? -6 : 0;
    const score = clamp(fit * 0.7 + (100 - d1) * 0.3 + stackPenalty);
    const evidence: string[] = [`Skill-market fit ${Math.round(fit)}/100`, `AI task exposure ${Math.round(d1)}/100`];
    if (stackStatus && stackStatus !== 'CURRENT') evidence.push(`Tech stack status: ${stackStatus}`);
    moats.push({
      key: 'technical', label: 'Technical Moat', icon: '🛠️', score, status: statusFor(score), evidence,
      protects: 'Skills that are hard to replicate keep you valuable as routine work is automated.',
      howToBuild: 'Go one level deeper in a scarce, in-demand specialty and ship public proof of it.',
      buildSpeed: 'medium', roiScore: 0, confidenceKind: 'modeled',
    });
  }

  // ── Domain moat ─────────────────────────────────────────────────────────────
  {
    const uniqueness = anyHr.careerResilience?.compositeScore ?? 50;
    const depthBonus = Math.min(20, Math.max(0, (industryYears - 3) * 2.5));
    const score = clamp(uniqueness * 0.6 + depthBonus + Math.min(20, experienceYears));
    moats.push({
      key: 'domain', label: 'Domain Moat', icon: '🏛️', score, status: statusFor(score),
      evidence: [`${industryYears} yrs in-industry`, `Resilience/uniqueness ${Math.round(uniqueness)}/100`],
      protects: 'Deep industry knowledge and judgment are what AI lacks context for.',
      howToBuild: 'Publish a point of view on a hard, narrow problem in your sector that only insiders understand.',
      buildSpeed: 'slow', roiScore: 0, confidenceKind: 'modeled',
    });
  }

  // ── Leadership moat ─────────────────────────────────────────────────────────
  {
    const mobility = anyHr.internalMobility?.viabilityScore ?? 45;
    const seniorityBump = experienceYears >= 10 ? 14 : experienceYears >= 6 ? 8 : experienceYears >= 3 ? 3 : 0;
    const score = clamp(mobility * 0.75 + seniorityBump);
    moats.push({
      key: 'leadership', label: 'Leadership Moat', icon: '👔', score, status: statusFor(score),
      evidence: [`Internal mobility ${Math.round(mobility)}/100`, `${experienceYears} yrs experience`],
      protects: 'Coordinating people and owning outcomes sits above the automation line.',
      howToBuild: 'Take visible ownership of a cross-functional initiative and quantify the outcome.',
      buildSpeed: 'medium', roiScore: 0, confidenceKind: 'modeled',
    });
  }

  // ── Relationship moat ───────────────────────────────────────────────────────
  {
    const net = anyHr.networkLeverage?.networkScore ?? 35;
    const score = clamp(net);
    moats.push({
      key: 'relationship', label: 'Relationship Moat', icon: '🤝', score, status: statusFor(score),
      evidence: [`Network strength ${Math.round(net)}/100`, anyHr.networkLeverage?.networkTier ? `Tier: ${anyHr.networkLeverage.networkTier}` : 'Network not yet mapped'],
      protects: 'Trust and referrals route opportunities to you that never hit the open market.',
      howToBuild: 'Re-warm 5 dormant high-value contacts this month; give before you ask.',
      buildSpeed: 'fast', roiScore: 0, confidenceKind: anyHr.networkLeverage ? 'modeled' : 'estimated',
    });
  }

  // ── Reputation moat (heuristic — no direct engine) ──────────────────────────
  {
    const seniorityComponent = Math.min(45, experienceYears * 3.5);
    const tenureComponent = Math.min(20, tenureYears * 3);
    const visibilityProxy = (anyHr.networkLeverage?.networkScore ?? 35) * 0.25; // public presence correlates with network
    const score = clamp(seniorityComponent + tenureComponent + visibilityProxy);
    moats.push({
      key: 'reputation', label: 'Reputation Moat', icon: '⭐', score, status: statusFor(score),
      evidence: [`${experienceYears} yrs of track record`, 'Public visibility estimated from profile depth'],
      protects: 'Being known for something pulls inbound roles toward you instead of you chasing them.',
      howToBuild: 'Publish one substantive piece (talk, post, OSS) on your specialty per month for a quarter.',
      buildSpeed: 'slow', roiScore: 0, confidenceKind: 'estimated',
    });
  }

  // ── Distribution moat (heuristic — no direct engine) ────────────────────────
  {
    const referral = anyHr.networkLeverage?.referralAccessScore ?? (anyHr.networkLeverage?.networkScore ?? 35) * 0.8;
    const score = clamp(referral);
    moats.push({
      key: 'distribution', label: 'Distribution Moat', icon: '📡', score, status: statusFor(score),
      evidence: [`Referral access ${Math.round(referral)}/100`, 'Ability to reach opportunities without gatekeepers'],
      protects: 'Owning a channel to reach employers/clients means you are never dependent on one door.',
      howToBuild: 'Build one owned channel — a newsletter, a community presence, or a recruiter network you can activate at will.',
      buildSpeed: 'medium', roiScore: 0, confidenceKind: 'estimated',
    });
  }

  // ── Financial moat ──────────────────────────────────────────────────────────
  {
    const runway = profile?.savingsMonthsRunway ?? anyHr.userFinancialRunway?.runwayMonths ?? hr.financialRunwayMonths ?? null;
    const score = runway != null ? clamp((runway / 12) * 100) : 40;
    moats.push({
      key: 'financial', label: 'Financial Moat', icon: '🏦', score, status: statusFor(score),
      evidence: [runway != null ? `~${Number(runway).toFixed(0)} months runway` : 'Runway not provided'],
      protects: 'A cash buffer lets you wait out disruption, negotiate from strength, and retrain without panic.',
      howToBuild: 'Extend runway toward 6–12 months; each month of buffer compounds your optionality.',
      buildSpeed: 'medium', roiScore: 0, confidenceKind: runway != null ? 'measured' : 'estimated',
    });
  }

  // ── AI moat ─────────────────────────────────────────────────────────────────
  {
    const leverage = computeAILeverageScore([], hr).leverageScore;
    const score = clamp(leverage);
    moats.push({
      key: 'ai', label: 'AI Leverage Moat', icon: '🤖', score, status: statusFor(score),
      evidence: [`AI leverage ${Math.round(leverage)}/100`, `AI task exposure ${Math.round(d1)}/100`],
      protects: 'Wielding AI better than your peers turns the threat into your largest productivity edge.',
      howToBuild: 'Adopt one AI workflow in your real work this week and document the measured time saved.',
      buildSpeed: 'fast', roiScore: 0, confidenceKind: 'modeled',
    });
  }

  // ── ROI scoring + synthesis ───────────────────────────────────────────────────
  for (const m of moats) {
    const gap = (100 - m.score) / 100;
    m.roiScore = Math.round(gap * IMPACT[m.key] * SPEED_FACTOR[m.buildSpeed] * 100);
  }

  // Weighted overall strength (impact-weighted average).
  const totalW = Object.values(IMPACT).reduce((s, w) => s + w, 0);
  const overallMoatStrength = clamp(
    moats.reduce((s, m) => s + m.score * IMPACT[m.key], 0) / totalW,
  );
  const strengthLabel: CareerMoatReport['strengthLabel'] =
    overallMoatStrength >= 70 ? 'Fortress' : overallMoatStrength >= 52 ? 'Defensible' : overallMoatStrength >= 35 ? 'Exposed' : 'Vulnerable';

  const byScoreDesc = [...moats].sort((a, b) => b.score - a.score);
  const strongestMoats = byScoreDesc.slice(0, 2);
  const weakestMoats = byScoreDesc.slice(-2).reverse();

  // Highest-ROI: best return among moats that are not already strong.
  const buildCandidates = moats.filter(m => m.status !== 'strong');
  const highestRoiMoat = (buildCandidates.length > 0 ? buildCandidates : moats)
    .sort((a, b) => b.roiScore - a.roiScore)[0];

  const mostDefensibleStrategy =
    `Lead with your ${strongestMoats[0].label.replace(' Moat', '').toLowerCase()} and ${strongestMoats[1].label.replace(' Moat', '').toLowerCase()} moats — that is what makes you hard to replace. ` +
    `Your most exposed flank is your ${weakestMoats[0].label.replace(' Moat', '').toLowerCase()} moat. ` +
    `The single highest-return move right now is to build your ${highestRoiMoat.label.replace(' Moat', '').toLowerCase()} moat: ${highestRoiMoat.howToBuild}`;

  return {
    moats,
    overallMoatStrength,
    strengthLabel,
    strongestMoats,
    weakestMoats,
    highestRoiMoat,
    mostDefensibleStrategy,
  };
}
