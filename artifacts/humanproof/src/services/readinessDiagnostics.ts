// readinessDiagnostics.ts — Career Readiness: per-tab diagnostic engines
//
// Mission: stop asking "are you ready?" and DETERMINE "how ready are you?".
// Five engines (Resume, LinkedIn, Interview, Portfolio, Network/Referral) turn
// each tab from a checklist into a diagnosis: a score, the gaps, ranked
// improvements with an estimated probability impact, and a projected score.
//
// All signals are derived from the Career Twin / audit (no resume/LinkedIn/GitHub
// artifact is available), so anything not directly measured is honestly labelled
// MODELED or ESTIMATED. Real measured inputs used: networkLeverage,
// skillPortfolioFit, roleMarketDemand, techStackObsolescence, skillGapIntelligence,
// AI leverage.

import type { HybridResult } from '../types/hybridResult';
import type { UserProfile } from './userProfileService';
import { computeAILeverageScore } from './aiAmplificationService';
import { extractEvidence, evidenceSuffix, personalizationLevel, type EvidenceKey, type EvidenceSet } from './evidenceTokens';

export type ConfidenceKind = 'measured' | 'modeled' | 'estimated';

export interface ImprovementAction {
  action: string;
  /** Estimated improvement to the tab's headline probability/score, points. */
  impactPct: number;
  effort: 'Low' | 'Medium' | 'High';
  rationale: string;
  /** Q4 of the decision frame — what skipping costs, with the user's numbers. */
  ifYouSkip?: string;
}

// Stamp the tab-level cost-of-inaction onto each improvement (Rule 1's
// "what happens if I don't?" — keyed to the user's actual numbers).
function withSkipCost(improvements: ImprovementAction[], skip: string): ImprovementAction[] {
  return improvements.map(i => ({ ...i, ifYouSkip: i.ifYouSkip ?? skip }));
}

export interface SubScore { label: string; score: number }

export interface ReadinessDiagnostic {
  /** 0–100 overall strength for this tab. */
  score: number;
  label: 'Strong' | 'Solid' | 'Developing' | 'Weak';
  confidenceKind: ConfidenceKind;
  /** One-sentence diagnosis — what's actually going on. */
  headline: string;
  /** The component breakdown. */
  subScores: SubScore[];
  /** What's missing or weak, specific. */
  gaps: string[];
  /** Ranked improvements with estimated impact. */
  improvements: ImprovementAction[];
  /** Score if the top improvements are executed. */
  projected: number;
  /** Optional headline metric name (e.g. "Recruiter Discovery Probability"). */
  headlineMetric?: { label: string; value: number };
  /** Rule 12 honesty gate: 'generic' when no user-specific evidence backed the advice. */
  personalizationLevel?: 'personalized' | 'generic';
}

// Append the user's real numbers to the lead improvement's rationale and tag the
// diagnostic's personalization level (Rule 12).
function withEvidence<T extends ReadinessDiagnostic>(diag: T, evidence: EvidenceSet, keys: EvidenceKey[]): T {
  const suffix = evidenceSuffix(evidence, keys, 2);
  if (suffix && diag.improvements[0]) {
    diag.improvements = diag.improvements.map((imp, i) =>
      i === 0 ? { ...imp, rationale: imp.rationale.replace(/\.$/, '') + suffix + '.' } : imp);
  }
  diag.personalizationLevel = personalizationLevel(evidence, keys);
  return diag;
}

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(v)));
const labelFor = (s: number): ReadinessDiagnostic['label'] =>
  s >= 75 ? 'Strong' : s >= 58 ? 'Solid' : s >= 40 ? 'Developing' : 'Weak';

function ctx(hr: HybridResult, profile: UserProfile | null) {
  const anyHr = hr as any;
  const _expM = String(hr.experience ?? '').match(/\d+/); // '20+' / '5-10' → first number; avoids NaN
  const experienceYears = (typeof profile?.yearsExperience === 'number' && Number.isFinite(profile.yearsExperience))
    ? profile.yearsExperience : (_expM ? parseInt(_expM[0], 10) : 5);
  return {
    anyHr,
    evidence: extractEvidence(hr, profile),
    fit: anyHr.skillPortfolioFit?.fitScore ?? 50,
    net: anyHr.networkLeverage?.networkScore ?? 35,
    referral: anyHr.networkLeverage?.referralAccessScore ?? (anyHr.networkLeverage?.networkScore ?? 35) * 0.8,
    tier: anyHr.networkLeverage?.networkTier ?? 'FUNCTIONAL',
    demand: anyHr.roleMarketDemand?.demandIndex ?? 55,
    demandTrend: anyHr.roleMarketDemand?.demandTrend as string | undefined,
    d1: hr.dimensions?.find(d => d.key === 'D1')?.score ?? 50,
    aiLeverage: computeAILeverageScore([], hr).leverageScore,
    experienceYears,
    bridgeSkills: (anyHr.techStackObsolescence?.bridgeSkillPriority ?? []) as string[],
    criticalGaps: (anyHr.skillGapIntelligence?.criticalGaps ?? []) as string[],
    strengths: (anyHr.skillGapIntelligence?.existingStrengths ?? []) as string[],
    role: (profile?.jobTitle ?? anyHr.roleTitle ?? hr.workTypeKey ?? 'your role').toString(),
  };
}

// ── Resume Intelligence ─────────────────────────────────────────────────────────
export function computeResumeIntelligence(hr: HybridResult, profile: UserProfile | null): ReadinessDiagnostic & { missingKeywords: string[]; atsMatch: number } {
  const c = ctx(hr, profile);
  // Missing keywords come from REAL signals: bridge skills + critical gaps + surging demand.
  const missingKeywords = [...new Set([...c.bridgeSkills, ...c.criticalGaps])].slice(0, 6);
  const keywordCoverage = clamp(100 - missingKeywords.length * 9);
  const achievementDensity = clamp(45 + Math.min(30, c.experienceYears * 2.5)); // seniority proxy for quantified wins
  const aiRelevance = clamp(c.aiLeverage);
  const competitive = clamp(c.fit * 0.6 + c.demand * 0.4);
  const atsMatch = clamp(keywordCoverage * 0.55 + competitive * 0.45);

  const subScores: SubScore[] = [
    { label: 'ATS Compatibility', score: atsMatch },
    { label: 'Achievement Density', score: achievementDensity },
    { label: 'Keyword Coverage', score: keywordCoverage },
    { label: 'AI Relevance', score: aiRelevance },
    { label: 'Competitive Positioning', score: competitive },
  ];
  const score = clamp(subScores.reduce((s, x) => s + x.score, 0) / subScores.length);

  const improvements: ImprovementAction[] = [];
  if (missingKeywords.length > 0) improvements.push({ action: `Add the missing high-demand keywords: ${missingKeywords.slice(0, 4).join(', ')}.`, impactPct: Math.min(17, missingKeywords.length * 3), effort: 'Low', rationale: 'ATS filters rank on keyword match; these are in active demand for your role.' });
  if (achievementDensity < 70) improvements.push({ action: 'Rewrite your top 5 bullets as "[action] → [metric]" with a real number in each.', impactPct: 12, effort: 'Medium', rationale: 'Quantified outcomes are the single strongest resume signal to a hiring manager.' });
  if (aiRelevance < 60) improvements.push({ action: 'Add one line evidencing an AI-augmented workflow you have shipped.', impactPct: 8, effort: 'Medium', rationale: 'AI fluency is now a tier-1 screen in most roles; absence reads as a gap.' });

  // Projected is shown against the ATS Match metric — base it on atsMatch, not the overall score.
  const projected = clamp(atsMatch + improvements.reduce((s, i) => s + i.impactPct, 0) * 0.6);
  return withEvidence({
    score, label: labelFor(score), confidenceKind: 'modeled' as const,
    headline: missingKeywords.length > 0
      ? `Your resume likely matches ~${atsMatch}% of ATS filters — ${missingKeywords.length} high-demand keywords are missing.`
      : `Strong keyword coverage; the lever now is quantified achievements, not more skills.`,
    subScores, gaps: missingKeywords.map(k => `Missing keyword: ${k}`),
    improvements: withSkipCost(improvements, `You stay at ~${atsMatch}% ATS match — filters keep dropping you before a human ever reads the resume.`),
    projected,
    headlineMetric: { label: 'ATS Match', value: atsMatch },
    missingKeywords, atsMatch,
  }, c.evidence, ['fit', 'gaps', 'demand']);
}

// ── LinkedIn Intelligence ─────────────────────────────────────────────────────────
export function computeLinkedInIntelligence(hr: HybridResult, profile: UserProfile | null): ReadinessDiagnostic {
  const c = ctx(hr, profile);
  const headlineQuality = clamp(40 + Math.min(30, c.experienceYears * 2) + (c.fit - 50) * 0.3);
  const authority = clamp(35 + Math.min(40, c.experienceYears * 3) + (c.net - 50) * 0.3);
  const visibility = clamp(c.demand * 0.5 + c.net * 0.5);
  const recruiterAttractiveness = clamp(c.fit * 0.5 + c.demand * 0.3 + c.net * 0.2);
  const networkReach = clamp(c.net);
  const contentInfluence = clamp(authority * 0.4 + c.net * 0.3); // proxy; most users post rarely

  const discoveryProbability = clamp(recruiterAttractiveness * 0.5 + visibility * 0.3 + networkReach * 0.2);

  const subScores: SubScore[] = [
    { label: 'Headline Quality', score: headlineQuality },
    { label: 'Profile Authority', score: authority },
    { label: 'Search Visibility', score: visibility },
    { label: 'Recruiter Attractiveness', score: recruiterAttractiveness },
    { label: 'Network Reach', score: networkReach },
    { label: 'Content Influence', score: contentInfluence },
  ];
  const score = clamp(subScores.reduce((s, x) => s + x.score, 0) / subScores.length);

  const improvements: ImprovementAction[] = [
    { action: 'Rewrite your headline to "[role] who [outcome] for [who]" — specific, outcome-led.', impactPct: 8, effort: 'Low', rationale: 'The headline is the primary recruiter-search and click signal.' },
    { action: 'Post one substantive piece on your specialty per week for a month.', impactPct: 12, effort: 'Medium', rationale: 'Consistent posting compounds visibility and authority in-feed and in-search.' },
    { action: 'Leave 5 strategic comments/week on posts in your target domain.', impactPct: 5, effort: 'Low', rationale: 'Comment activity surfaces you to second-degree networks and signals engagement.' },
  ];
  const projected = clamp(discoveryProbability + improvements.reduce((s, i) => s + i.impactPct, 0));

  return withEvidence({
    score, label: labelFor(score), confidenceKind: 'modeled' as const,
    headline: `Recruiters are estimated to discover you ~${discoveryProbability}% of the time for a relevant search — ${labelFor(discoveryProbability).toLowerCase()} visibility.`,
    subScores, gaps: subScores.filter(s => s.score < 50).map(s => `${s.label} is below par (${s.score}/100)`),
    improvements: withSkipCost(improvements, `Recruiter discovery stays ~${discoveryProbability}% — they keep finding someone else for the roles you want.`),
    projected,
    headlineMetric: { label: 'Recruiter Discovery Probability', value: discoveryProbability },
  }, c.evidence, ['network', 'demand', 'fit']);
}

// ── Interview Readiness ─────────────────────────────────────────────────────────
export function computeInterviewReadiness(hr: HybridResult, profile: UserProfile | null): ReadinessDiagnostic & { risks: string[] } {
  const c = ctx(hr, profile);
  const behavioral = clamp(45 + Math.min(30, c.experienceYears * 2.5));
  const technical = clamp(c.fit);
  const ai = clamp(c.aiLeverage);
  const leadership = clamp(30 + Math.min(45, c.experienceYears * 3.2));
  const communication = clamp(50 + (c.net - 50) * 0.4); // network correlates with stakeholder comms exposure

  const subScores: SubScore[] = [
    { label: 'Behavioral', score: behavioral },
    { label: 'Technical', score: technical },
    { label: 'AI', score: ai },
    { label: 'Leadership', score: leadership },
    { label: 'Communication', score: communication },
  ];
  const score = clamp(subScores.reduce((s, x) => s + x.score, 0) / subScores.length);

  // Likely weaknesses — the system EVALUATES rather than asking.
  const risks: string[] = [];
  if (behavioral < 65) risks.push('Behavioral answers likely lack measurable outcomes — interviewers screen for quantified impact.');
  if (ai < 60) risks.push('No AI-related examples prepared — increasingly a standard question across roles.');
  if (technical < 55) risks.push('Technical depth for your target band may need refresh — drill the 2–3 weakest areas.');
  risks.push('STAR structure tends to drift under pressure — rehearse 6 stories in tight Situation-Task-Action-Result form.');

  const improvements: ImprovementAction[] = [
    { action: 'Run 8–10 mock interviews (Pramp/interviewing.io); log which rounds you fail and drill those.', impactPct: 14, effort: 'High', rationale: 'Targeted mock data fixes your weakest 2–3 rounds faster than general study.' },
    { action: 'Prepare 6 STAR stories, each ending in a hard number.', impactPct: 10, effort: 'Medium', rationale: 'Pre-built quantified stories convert behavioral rounds.' },
    { action: 'Prepare 2 AI-in-your-workflow examples.', impactPct: 7, effort: 'Low', rationale: 'Covers the now-standard AI question and signals adaptability.' },
  ];
  const projected = clamp(score + improvements.reduce((s, i) => s + i.impactPct, 0) * 0.5);

  return withEvidence({
    score, label: labelFor(score), confidenceKind: 'modeled' as const,
    headline: `Your interview readiness is ${labelFor(score).toLowerCase()} — the system has flagged ${risks.length} likely weaknesses to drill.`,
    subScores, gaps: risks,
    improvements: withSkipCost(improvements, `These ${risks.length} weaknesses surface under interview pressure — readiness stays at ${score}/100 and offers keep slipping at the final round.`),
    projected, risks,
  }, c.evidence, ['aiExposure', 'fit', 'gaps']) as ReadinessDiagnostic & { risks: string[] };
}

// ── Portfolio / Proof-of-Work ─────────────────────────────────────────────────────
export function computePortfolioStrength(hr: HybridResult, profile: UserProfile | null): ReadinessDiagnostic & { nextProject: string } {
  const c = ctx(hr, profile);
  const credibility = clamp(c.fit * 0.6 + Math.min(30, c.experienceYears * 2));
  const authority = clamp(30 + Math.min(40, c.experienceYears * 3) + (c.net - 50) * 0.2);
  const differentiation = clamp(c.aiLeverage * 0.5 + (c.fit - 50) * 0.5 + 40);
  const discoverability = clamp(c.net * 0.5 + c.demand * 0.3);

  const subScores: SubScore[] = [
    { label: 'Credibility', score: credibility },
    { label: 'Authority', score: authority },
    { label: 'Differentiation', score: differentiation },
    { label: 'Discoverability', score: discoverability },
  ];
  const score = clamp(subScores.reduce((s, x) => s + x.score, 0) / subScores.length);

  // Highest-value project — tied to role + demand + AI, not generic.
  const skill = c.bridgeSkills[0] ?? c.criticalGaps[0] ?? 'an AI-augmented workflow';
  const nextProject = `Build and ship one public ${c.role.toLowerCase()} project that demonstrates ${skill} end-to-end, then write the build-up (what AI did vs. what you decided). This is your single highest-value proof artifact right now.`;

  const improvements: ImprovementAction[] = [
    { action: nextProject, impactPct: 15, effort: 'High', rationale: 'A role-relevant, AI-aware public artifact is the strongest proof-of-work signal.' },
    { action: 'Add a one-page case study (problem → approach → quantified impact) for your best work.', impactPct: 9, effort: 'Medium', rationale: 'Case studies convert better than repos alone — they show judgment.' },
    { action: 'Make your work discoverable: pin it on GitHub + LinkedIn featured.', impactPct: 6, effort: 'Low', rationale: 'Proof no one can find provides no hiring signal.' },
  ];
  const projected = clamp(score + improvements.reduce((s, i) => s + i.impactPct, 0) * 0.5);

  return withEvidence({
    score, label: labelFor(score), confidenceKind: 'modeled' as const,
    headline: `Your proof-of-work is ${labelFor(score).toLowerCase()} — capability needs visible evidence, not a checklist.`,
    subScores, gaps: subScores.filter(s => s.score < 50).map(s => `${s.label} is thin (${s.score}/100)`),
    improvements: withSkipCost(improvements, `Your claims stay unproven at ${score}/100 — you keep competing against candidates who show evidence instead of asserting it.`),
    projected, nextProject,
  }, c.evidence, ['fit', 'demand', 'aiExposure']) as ReadinessDiagnostic & { nextProject: string };
}

// ── Network Activation / Referral ─────────────────────────────────────────────────
export interface ContactTarget {
  who: string;
  why: string;
  responseProbability: number;
  referralProbability: number;
  interviewProbability: number;
}

export function computeNetworkActivation(hr: HybridResult, profile: UserProfile | null): ReadinessDiagnostic & { contacts: ContactTarget[] } {
  const c = ctx(hr, profile);
  const networkStrength = clamp(c.net);
  const referralReadiness = clamp(c.referral);
  const relationshipDensity = clamp(c.net * 0.7 + Math.min(30, c.experienceYears * 2));
  const dormantOpportunity = clamp(60 + (c.experienceYears - 3) * 2); // more years = more dormant ties to reactivate

  const subScores: SubScore[] = [
    { label: 'Network Strength', score: networkStrength },
    { label: 'Referral Readiness', score: referralReadiness },
    { label: 'Relationship Density', score: relationshipDensity },
    { label: 'Dormant Opportunity', score: dormantOpportunity },
  ];
  const score = clamp(subScores.reduce((s, x) => s + x.score, 0) / subScores.length);

  // WHO to contact (archetypes, since we have no contact graph) with probabilities.
  const base = referralReadiness;
  const contacts: ContactTarget[] = [
    { who: 'Former managers (last 2 roles)', why: 'Highest-trust references; can refer or vouch directly.', responseProbability: clamp(base + 20), referralProbability: clamp(base + 5), interviewProbability: clamp(base * 0.6 + 10) },
    { who: 'Ex-colleagues now at target companies', why: 'Internal referral skips the ATS and triples interview conversion.', responseProbability: clamp(base + 10), referralProbability: clamp(base), interviewProbability: clamp(base * 0.7) },
    { who: 'Dormant ties (no contact 12+ months)', why: 'Re-warming reactivates a large hidden surface of opportunity.', responseProbability: clamp(base - 5), referralProbability: clamp(base - 15), interviewProbability: clamp(base * 0.4) },
  ];

  const improvements: ImprovementAction[] = [
    { action: 'Send 5 personal reconnection messages to former managers/peers this week — give before you ask.', impactPct: 14, effort: 'Low', rationale: 'Referrals are the highest-conversion channel; warm them before you need them.' },
    { action: 'Map 10 ex-colleagues to your target companies and request 3 intros.', impactPct: 11, effort: 'Medium', rationale: 'Targeted internal referrals are the fastest path past the resume screen.' },
    { action: 'Reactivate 10 dormant ties with a no-ask check-in.', impactPct: 6, effort: 'Low', rationale: 'Dormant ties carry novel opportunities your active network does not.' },
  ];
  const projected = clamp(score + improvements.reduce((s, i) => s + i.impactPct, 0) * 0.5);

  return withEvidence({
    score, label: labelFor(score), confidenceKind: (c.anyHr.networkLeverage ? 'modeled' : 'estimated') as ConfidenceKind,
    headline: `Your network can generate referrals at ~${referralReadiness}% readiness — referrals convert 5× better than cold applications.`,
    subScores, gaps: subScores.filter(s => s.score < 50).map(s => `${s.label} is low (${s.score}/100)`),
    improvements: withSkipCost(improvements, `Referral readiness stays ~${referralReadiness}% — you remain in the cold-application lane, which converts ~5× worse.`),
    projected, contacts,
  }, c.evidence, ['network', 'demand']) as ReadinessDiagnostic & { contacts: ContactTarget[] };
}
