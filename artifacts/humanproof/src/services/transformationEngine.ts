// transformationEngine.ts — AI Career Defense: Transformation Engine (Rule #6)
//
// "Do not recommend courses. Recommend transformations." Replaces the old course
// list with an outcome: current role → target role, gap, portfolio projects,
// target companies, timeline, and success probability. Pure derivation composing
// engine results already on the HybridResult (roleAdjacency, skillGapIntelligence,
// jobTargeting, skillFusion). Falls back to an AI-augmented version of the current
// role when no adjacency data exists.

import type { HybridResult } from '../types/hybridResult';
import type { UserProfile } from './userProfileService';

export type ConfidenceKind = 'measured' | 'modeled' | 'estimated';

export interface DefenseCommand {
  threat: string;
  impact: string;
  probability?: string;
  timeline: string;
  defense: string;
  outcome: string;
  confidence: number;
  confidenceKind: ConfidenceKind;
}

export interface TransformationPlan {
  currentState: string;
  targetRole: string;
  whyThisTarget: string;
  /** Transferable strengths you already have. */
  transferableStrengths: string[];
  /** Skills to add (the gap), urgency-ordered. */
  gapSkills: string[];
  /** Concrete portfolio projects that become your evidence. */
  projects: string[];
  /** Specific companies hiring for this target. */
  targetCompanies: string[];
  timelineLabel: string;
  successProbability: number;     // 0–100
  confidenceKind: ConfidenceKind;
  command: DefenseCommand;
}

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(v)));

export function computeTransformation(hr: HybridResult, profile: UserProfile | null): TransformationPlan {
  const anyHr = hr as any;
  const currentRole = (profile?.jobTitle ?? anyHr.roleTitle ?? hr.workTypeKey ?? 'your current role').toString();
  const _expM = String(hr.experience ?? '').match(/\d+/); // '20+' / '5-10' → first number; avoids NaN
  const experienceYears = (typeof profile?.yearsExperience === 'number' && Number.isFinite(profile.yearsExperience))
    ? profile.yearsExperience : (_expM ? parseInt(_expM[0], 10) : 5);

  const adj = anyHr.roleAdjacency?.adjacentRoles?.[0];
  const gapIntel = anyHr.skillGapIntelligence;
  const targets = (anyHr.jobTargeting?.primaryTargets ?? anyHr.jobTargeting?.targets ?? []) as Array<{ displayName?: string; companyName?: string }>;
  const d1 = hr.dimensions?.find(d => d.key === 'D1')?.score ?? 50;

  // ── Target role ───────────────────────────────────────────────────────────────
  const hasAdjacency = !!adj?.targetRoleLabel;
  const targetRole = hasAdjacency ? adj.targetRoleLabel : `AI-Augmented ${currentRole}`;

  const whyThisTarget = hasAdjacency
    ? `${targetRole} keeps most of your experience while cutting AI/market exposure` +
      (adj.scoreReduction ? ` (~${Math.round(adj.scoreReduction)} pts lower risk)` : '') +
      `. Market demand for it scores ${Math.round(adj.marketDemandScore ?? 60)}/100, and the adjacency to your current role is ${adj.adjacencyStrength ?? 'moderate'}.`
    : `Your role faces ${Math.round(d1)}/100 AI task exposure. Re-positioning as the AI-augmented version of your role — the person who directs the tools rather than competes with them — is the fastest, lowest-disruption transformation available to you.`;

  // ── Transferable strengths ─────────────────────────────────────────────────────
  const transferableStrengths: string[] = (gapIntel?.existingStrengths?.slice(0, 3) as string[] | undefined)
    ?? [`${experienceYears} years of domain experience`, 'Established working relationships', 'Proven delivery track record'];

  // ── Gap skills (urgency-ordered) ───────────────────────────────────────────────
  const gapSkills: string[] =
    (gapIntel?.criticalGaps?.length ? gapIntel.criticalGaps.slice(0, 4)
      : adj?.skillBridgeRequired?.length ? adj.skillBridgeRequired.slice(0, 4)
      : (gapIntel?.upskillPriority ?? []).slice(0, 4).map((u: any) => u.skill)) as string[];
  const finalGapSkills = gapSkills.length ? gapSkills : ['One AI-augmented workflow in your domain', 'A quantified-impact portfolio artifact'];

  // ── Portfolio projects (the evidence, not courses) ─────────────────────────────
  const projects: string[] = [
    `Ship one ${targetRole.toLowerCase()}-style project that demonstrates ${finalGapSkills[0]} end-to-end, deployed and public.`,
    finalGapSkills[1]
      ? `Build a second artifact applying ${finalGapSkills[1]} to a real problem in your current domain, and write up the measured outcome.`
      : `Write a public teardown showing how you'd approach a hard ${targetRole.toLowerCase()} problem — judgment is the evidence.`,
    `Package both into a one-page case study (problem → approach → quantified impact) you can send to a hiring manager.`,
  ];

  // ── Target companies ───────────────────────────────────────────────────────────
  const targetCompanies = targets.slice(0, 5).map(t => t.displayName ?? t.companyName ?? '').filter(Boolean);

  // ── Timeline + success probability ─────────────────────────────────────────────
  const weeks = adj?.timeToQualifiedWeeks ?? 12;
  const searchDuration = anyHr.jobTargeting?.estimatedSearchDuration ?? '4–8 weeks to first offer';
  const timelineLabel = `~${weeks} weeks to job-ready, then ${searchDuration}`;

  const readiness = gapIntel?.marketReadinessPct ?? (gapIntel?.gapScore != null ? 100 - gapIntel.gapScore : 55);
  const demand = adj?.marketDemandScore ?? 60;
  const adjBonus = adj?.adjacencyStrength === 'strong' ? 10 : adj?.adjacencyStrength === 'weak' ? -8 : 0;
  const successProbability = clamp(readiness * 0.45 + demand * 0.4 + adjBonus + 8);
  const confidenceKind: ConfidenceKind = (hasAdjacency && gapIntel) ? 'modeled' : 'estimated';

  const command: DefenseCommand = {
    threat: `Your current role carries ${Math.round(d1)}/100 AI task exposure; staying static lets that exposure compound.`,
    impact: hasAdjacency && adj.scoreReduction
      ? `Transforming into ${targetRole} cuts risk ~${Math.round(adj.scoreReduction)} pts and re-anchors you on rising demand.`
      : `Re-positioning as ${targetRole} moves you above the automation line — directing AI instead of competing with it.`,
    probability: `${successProbability}% transition success at your current readiness and the target's market demand.`,
    timeline: timelineLabel,
    defense: `Close ${finalGapSkills.length} gap skill(s) with ${projects.length} portfolio projects, then target ${targetCompanies.length || 'matched'} companies.`,
    outcome: `A defensible ${targetRole} profile with public evidence — not a certificate, an outcome.`,
    confidence: successProbability,
    confidenceKind,
  };

  return {
    currentState: `${currentRole}${experienceYears ? ` · ${experienceYears} yrs` : ''}`,
    targetRole,
    whyThisTarget,
    transferableStrengths,
    gapSkills: finalGapSkills,
    projects,
    targetCompanies,
    timelineLabel,
    successProbability,
    confidenceKind,
    command,
  };
}
