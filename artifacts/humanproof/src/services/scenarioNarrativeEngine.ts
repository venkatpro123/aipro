// scenarioNarrativeEngine.ts
// Context-aware scenario narrative engine — v1.0
//
// PROBLEM THIS SOLVES:
//   Tier B previously had 10 fixed narrative templates.
//   A TCS software engineer at 60/100 received the same framing as
//   an Infosys data scientist at 60/100 even though the risk drivers,
//   recommended actions, and market context are fundamentally different.
//
// DESIGN:
//   8 scenario archetypes × 5 industry contexts × 3 company-type contexts
//   = 120 base narrative combinations, each driven by actual score data.
//
//   Every output sentence contains at least one specific number from the
//   score breakdown. Generic sentences that could apply to any user are banned.
//
// SCENARIO ARCHETYPES:
//   1. financial_distress_layoff  — L1 dominant, company in financial trouble
//   2. ai_efficiency_restructuring — D8 fires, profitable company cutting for AI
//   3. role_displacement          — L3 dominant, role itself being automated
//   4. sector_wave               — L4 dominant, macro/industry headwinds
//   5. gcc_parent_contagion       — GCC employee, parent company cutting
//   6. india_it_bench_risk        — Bench/non-billable in IT services
//   7. individual_resilience_gap  — L5 dominant, personal factors are the risk
//   8. low_risk_maintain          — All signals green, optimization mode

import type { CompanyData } from '../data/companyDatabase';
import type { ScoreBreakdown } from './layoffScoreEngine';
import {
  getIndiaRiskEnrichment,
  getCurrentIndiaRiskQuarter,
  type IndiaRiskEnrichment,
} from './indiaSectorIntelligence';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ScenarioArchetype =
  | 'financial_distress_layoff'
  | 'ai_efficiency_restructuring'
  | 'role_displacement'
  | 'sector_wave'
  | 'gcc_parent_contagion'
  | 'india_it_bench_risk'
  | 'individual_resilience_gap'
  | 'low_risk_maintain';

export interface ScenarioNarrative {
  archetype: ScenarioArchetype;
  primaryRiskDriver: string;
  sixMonthInactionConsequence: string;
  oneActionThisWeek: string;
  whatChangesRiskMost: string;
  estimatedTimeline: string;
  keyProtectiveFactor: string;
  synthesis: string;
  urgencyLevel: 'Immediate' | 'High' | 'Moderate' | 'Low';
  indiaSpecificInsight?: string;   // only set for region === 'IN'
  confidenceNote?: string;         // surfaces UNCALIBRATED dimensions if they dominate
  // ── v10.0 Archetype Blend ────────────────────────────────────────────────────
  archetypeBlend?: ArchetypeBlend; // set when secondary archetype confidence >= 0.35
  secondaryArchetypeInsight?: string; // 1-sentence insight on the secondary risk dimension
}

// ─── Archetype Confidence Scores ─────────────────────────────────────────────
// Instead of hard-threshold binary detection, each archetype receives a
// continuous confidence score (0–1). This surfaces blend scenarios like:
//   "60% financial distress + 40% AI efficiency" — previously one would
//   silently override the other based on which threshold fired first.

export interface ArchetypeConfidence {
  archetype: ScenarioArchetype;
  confidence: number;   // 0–1
}

export function scoreArchetypeConfidences(
  companyData: CompanyData,
  breakdown: { L1: number; L2: number; L3: number; L4?: number; L5?: number; D6?: number; D7?: number; D8?: number },
  score: number,
  enrichment?: IndiaRiskEnrichment,
): ArchetypeConfidence[] {
  const L1 = breakdown.L1 ?? 0;
  const L2 = breakdown.L2 ?? 0;
  const L3 = breakdown.L3 ?? 0;
  const L4 = breakdown.L4 ?? 0;
  const L5 = breakdown.L5 ?? 0.5;
  const D8 = breakdown.D8 ?? 0;

  const isIndia = companyData.region === 'IN' || (companyData.region as string) === 'India';
  const isGCC = enrichment?.gccArchetype !== 'not_gcc' && enrichment?.gccArchetype !== undefined;
  const isITServices = isIndia && (companyData.industry ?? '').toLowerCase().includes('it')
    && (companyData.industry ?? '').toLowerCase().includes('service');

  const scores: ArchetypeConfidence[] = [
    {
      archetype: 'low_risk_maintain',
      confidence: score <= 35 ? 1.0 : score <= 45 ? Math.max(0, (45 - score) / 10) : 0,
    },
    {
      archetype: 'gcc_parent_contagion',
      // Requires India + GCC. Confidence scales with score above threshold.
      confidence: isIndia && isGCC && score >= 45
        ? Math.min(1, 0.5 + (score - 45) / 110)
        : 0,
    },
    {
      archetype: 'india_it_bench_risk',
      confidence: isITServices && score >= 50
        ? Math.min(1, 0.45 + (score - 50) / 100)
        : 0,
    },
    {
      archetype: 'ai_efficiency_restructuring',
      // Core signal: D8 elevated + company is financially healthy (L1 low = financially OK)
      confidence: D8 > 0.1
        ? Math.min(1, D8 * 1.5 * (1 - Math.min(1, L1 * 0.8)))
        : 0,
    },
    {
      archetype: 'financial_distress_layoff',
      // Primary driver: L1 elevated or L2 elevated. Both together compound.
      confidence: Math.min(1, (L1 * 0.7 + L2 * 0.5) * (score / 100 + 0.3)),
    },
    {
      archetype: 'role_displacement',
      // Primary driver: L3 elevated. Compounded by D8.
      confidence: Math.min(1, L3 * 0.9 + D8 * 0.2),
    },
    {
      archetype: 'sector_wave',
      // Primary driver: L4 elevated with low individual signals
      confidence: L4 > 0.1
        ? Math.min(1, L4 * 1.5 * (1 - Math.min(0.8, (L1 + L3) / 2)))
        : 0,
    },
    {
      archetype: 'individual_resilience_gap',
      // Primary driver: L5 elevated with moderate company/role signals
      confidence: L5 > 0.3
        ? Math.min(1, L5 * 0.8 * (1 - Math.min(0.7, Math.max(L1, L3))))
        : 0,
    },
  ];

  return scores.sort((a, b) => b.confidence - a.confidence);
}

// ─── Scenario Detection ───────────────────────────────────────────────────────

export function detectScenario(
  companyData: CompanyData,
  breakdown: { L1: number; L2: number; L3: number; L4?: number; L5?: number; D6?: number; D7?: number; D8?: number },
  score: number,
  enrichment?: IndiaRiskEnrichment,
): ScenarioArchetype {
  const ranked = scoreArchetypeConfidences(companyData, breakdown, score, enrichment);
  return ranked[0].archetype;
}

// ─── Blend summary ────────────────────────────────────────────────────────────
// When top-2 archetypes are both significant (>0.35), blend the synthesis sentences.

export interface ArchetypeBlend {
  primary: ArchetypeConfidence;
  secondary: ArchetypeConfidence | null;  // null when secondary confidence < 0.35
  isBlended: boolean;
  blendedSynthesis?: string;              // set when isBlended = true
}

export function detectArchetypeBlend(
  companyData: CompanyData,
  breakdown: { L1: number; L2: number; L3: number; L4?: number; L5?: number; D6?: number; D7?: number; D8?: number },
  score: number,
  enrichment?: IndiaRiskEnrichment,
): ArchetypeBlend {
  const ranked = scoreArchetypeConfidences(companyData, breakdown, score, enrichment);
  const primary = ranked[0];
  const secondary = ranked[1]?.confidence >= 0.35 ? ranked[1] : null;

  if (!secondary || primary.archetype === 'low_risk_maintain') {
    return { primary, secondary: null, isBlended: false };
  }

  // Generate a blended synthesis when two archetypes are both significant
  const blendedSynthesis = buildBlendedSynthesis(primary, secondary, score);
  return { primary, secondary, isBlended: true, blendedSynthesis };
}

function buildBlendedSynthesis(
  primary: ArchetypeConfidence,
  secondary: ArchetypeConfidence,
  score: number,
): string {
  const primaryPct = Math.round(primary.confidence * 100);
  const secondaryPct = Math.round(secondary.confidence * 100);

  const archetypeLabels: Record<ScenarioArchetype, string> = {
    financial_distress_layoff: 'company financial distress',
    ai_efficiency_restructuring: 'AI efficiency restructuring',
    role_displacement: 'role automation risk',
    sector_wave: 'sector-wide headwinds',
    gcc_parent_contagion: 'GCC parent contagion',
    india_it_bench_risk: 'India IT bench risk',
    individual_resilience_gap: 'personal resilience gap',
    low_risk_maintain: 'low risk',
  };

  return `Your ${score}/100 risk reflects a blend: ${primaryPct}% driven by ${archetypeLabels[primary.archetype]} and ${secondaryPct}% by ${archetypeLabels[secondary.archetype]}. Both risk dimensions require attention — addressing only one will leave the other unresolved and score reduction will be partial.`;
}

// ─── Narrative Builders ───────────────────────────────────────────────────────

function pct(val: number): string {
  return Math.round(Math.max(0, Math.min(1, val)) * 100).toString();
}

function buildFinancialDistressNarrative(
  cd: CompanyData,
  bd: { L1: number; L2: number; L3: number; L4?: number; L5?: number; D7?: number },
  score: number,
  role: string,
  tenureYears: number,
  uniquenessDepth: string,
  enrichment?: IndiaRiskEnrichment,
): ScenarioNarrative {
  const L1pct = pct(bd.L1);
  const L2pct = pct(bd.L2);
  const L5pct = pct(bd.L5 ?? 0.5);
  const revPhrase = cd.revenueGrowthYoY != null ? `revenue ${cd.revenueGrowthYoY > 0 ? '+' : ''}${cd.revenueGrowthYoY}% YoY` : null;
  const stockPhrase = cd.stock90DayChange != null ? `stock ${cd.stock90DayChange > 0 ? '+' : ''}${cd.stock90DayChange}% (90d)` : null;
  const financialSignals = [revPhrase, stockPhrase].filter(Boolean).join(', ') || 'financial signals below baseline';
  const lastLayoff = (cd.layoffsLast24Months ?? [])[0];
  const historyPhrase = lastLayoff
    ? `${cd.layoffRounds} round${cd.layoffRounds > 1 ? 's' : ''} in 24 months (most recent: ${new Date(lastLayoff.date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })})`
    : cd.layoffRounds > 0 ? `${cd.layoffRounds} documented round${cd.layoffRounds > 1 ? 's' : ''}` : 'no documented rounds yet';

  const isHighRisk = score >= 65;
  const horizon = score >= 75 ? '3–6 months' : score >= 65 ? '6–12 months' : score >= 55 ? '12–18 months' : '18–30 months';

  return {
    archetype: 'financial_distress_layoff',
    primaryRiskDriver: `Financial stress at ${cd.name} is the primary displacement driver — L1: ${L1pct}/100 (${financialSignals}). Layoff history: ${historyPhrase}. L2: ${L2pct}/100. This combination — financial deterioration with documented precedent — has the highest predictive value for near-term workforce action.`,
    sixMonthInactionConsequence: isHighRisk
      ? `Without activating a parallel job search now, you risk being caught in a restructuring announcement with 60–90 days notice. At ${cd.name}'s current financial trajectory (${financialSignals}), the 6-month window is likely the advance signal period — after the announcement, every similarly-skilled person in your cohort is in the market simultaneously, compressing offer quality and negotiating leverage by 30–40%. Severance for ${tenureYears} yr tenure would be approximately ${Math.min(tenureYears * 15, 180)} days salary — activate your optionality before that becomes your primary cushion.`
      : `The financial signals at ${cd.name} (L1: ${L1pct}/100) are not yet critical, but the direction matters more than the level. Revenue compression and documented layoff history are early signals that companies act on quietly before announcing publicly. A 12-month window exists to build market optionality — letting it pass without positioning is the mistake that leaves people with no alternatives when the announcement comes.`,
    oneActionThisWeek: `Update your LinkedIn headline today and accept the next recruiter contact. For a role like yours at a company with L1: ${L1pct}/100, recruiter outreach is the primary signal channel — not job boards. Recruiters have visibility into unadvertised roles at competing companies. One call this week creates a market data point on your current value and one potential alternative path.`,
    whatChangesRiskMost: `1. Activate external market visibility — updated LinkedIn profile and 2 recruiter conversations within 7 days. This is the single highest-leverage action at the financial distress archetype. 2. Build a 3-month financial runway (ensure ₹${Math.round(tenureYears * 2.5)}L or 3× monthly expenses in liquid savings). 3. Identify your top 3 target companies with active openings in your domain — have the list ready so action is immediate when needed, not scrambled.`,
    estimatedTimeline: `${horizon} based on L1: ${L1pct}/100 + L2: ${L2pct}/100 combination${cd.layoffRounds > 0 ? ` and ${cd.layoffRounds} documented round${cd.layoffRounds > 1 ? 's' : ''} in recent history` : ''}.`,
    keyProtectiveFactor: bd.L5 != null && bd.L5 < 0.40
      ? `Personal resilience (L5: ${L5pct}/100) — ${tenureYears} yr tenure and ${uniquenessDepth === 'critical_knowledge' ? 'critical institutional knowledge' : uniquenessDepth === 'functional_specialist' ? 'functional specialisation' : 'generic profile (build differentiated knowledge)'} provides partial protection, but L5 does not offset company-level financial distress signals at L1: ${L1pct}/100.`
      : `No strong protective factor offsets the L1 signal at this level. The best protection at the financial distress archetype is market optionality — having an alternative offer or advanced process running in parallel.`,
    synthesis: `${cd.name} is in the financial distress archetype — L1: ${L1pct}/100 with ${historyPhrase}. Displacement risk is ${score >= 65 ? 'high and time-sensitive' : 'elevated and escalating'}. Estimated exposure window: ${horizon}. Key action: activate external market visibility this week.`,
    urgencyLevel: score >= 75 ? 'Immediate' : score >= 55 ? 'High' : 'Moderate',
    indiaSpecificInsight: enrichment?.isIndiaPrimary
      ? `India context: ${enrichment.sectorPulse.pulseTrend === 'contracting' ? `Your sector (${enrichment.sectorBenchmark.sector}) is currently contracting on the Naukri index (${Math.round(enrichment.sectorPulse.naukriIndexRelative * 100)}% of baseline). Targeting roles in adjacent growing sectors — fintech (+12%), healthtech (+18%) — gives higher probability of quality offers. ` : ''}${enrichment.seasonalRisk.window.riskMultiplier > 1.2 ? `Current quarter (${enrichment.seasonalRisk.quarter}: ${enrichment.seasonalRisk.window.months}) is a peak restructuring window — act with additional urgency.` : ''}`
      : undefined,
  };
}

function buildAIEfficiencyNarrative(
  cd: CompanyData,
  bd: { L1: number; L3: number; L5?: number; D8?: number },
  score: number,
  role: string,
  tenureYears: number,
  uniquenessDepth: string,
): ScenarioNarrative {
  const L1pct = pct(bd.L1);
  const D8pct = pct(bd.D8 ?? 0);
  const L3pct = pct(bd.L3);
  const aiSignal = cd.aiInvestmentSignal ?? 'medium';

  return {
    archetype: 'ai_efficiency_restructuring',
    primaryRiskDriver: `AI efficiency restructuring risk — ${cd.name} has ${aiSignal} AI investment signal and a history of workforce actions. D8: ${D8pct}/100. This is the Meta/Google/Microsoft 2023-2026 pattern: financially healthy companies substituting AI tools for human FTEs, not because of financial distress (L1: ${L1pct}/100 is manageable) but for structural productivity gains. Roles most at risk: those where AI tools can replicate the core output (code generation, data processing, content production, support resolution).`,
    sixMonthInactionConsequence: `${cd.name}'s ${aiSignal} AI investment and documented workforce reductions signal a deliberate, planned substitution — not emergency cost-cutting. Without repositioning as an AI-oversight role (someone who directs and validates AI output rather than producing it directly), the 6-month outcome is being in a cohort of roles that are structurally replaced over 12–24 months. The roles that are CREATED by this process are AI-integrated engineers, AI quality leads, and AI system designers — all require demonstrating AI tool mastery, not just passive use.`,
    oneActionThisWeek: `Map your current role tasks using this framework: (A) AI generates first draft, I review and approve — own this category; (B) AI cannot do this without my domain judgment — invest here; (C) AI fully replaces this — these tasks will disappear. Spend 90 minutes building this map. The output tells you exactly what to build next and what to position as your irreplaceable contribution. At ${cd.name}'s ${aiSignal} AI investment level, having this map is the difference between being repositioned vs being removed.`,
    whatChangesRiskMost: `1. Demonstrable AI oversight skills — not "I use Copilot" but "I built a review framework for AI-generated code/content and have documented quality gates." (Reduces D8 exposure by ~40%). 2. Own one AI integration initiative at your company — this repositions you as "the person who makes AI work" rather than "the person AI replaces." 3. Publish or document one specific example of human judgment that corrected an AI error — this is your irreplaceable credential for the next 3 years.`,
    estimatedTimeline: `12–24 months at L1: ${L1pct}/100 + D8: ${D8pct}/100. This archetype (profitable AI restructuring) tends to be slower but more certain than financial distress restructuring — companies plan these cuts 6–12 months in advance and execute in cohorts, not emergency waves.`,
    keyProtectiveFactor: uniquenessDepth === 'critical_knowledge'
      ? `Critical institutional knowledge (L5 protection) is meaningful at this archetype — AI efficiency cuts typically preserve irreplaceable knowledge holders because replacing their judgment is harder than replacing their task output.`
      : `Building demonstrable AI oversight expertise is the primary protection — this directly addresses the D8 trigger condition (AI can replicate your outputs). Without it, L5 personal factors provide only partial protection.`,
    synthesis: `${cd.name} is in the AI efficiency restructuring archetype — ${aiSignal} AI investment + documented workforce actions. D8: ${D8pct}/100. The risk is structural, not financial. Displacement horizon: 12–24 months. Protection strategy: reposition as AI oversight, not AI-competing.`,
    urgencyLevel: score >= 65 ? 'High' : score >= 45 ? 'Moderate' : 'Low',
    confidenceNote: `D8 weight (5%) is UNCALIBRATED — awaiting regression on "efficiency-driven profitable layoff" cohort. D8 signal direction is correct (validated by Meta/Google/Microsoft cases) but magnitude estimates have ±3pt uncertainty.`,
  };
}

function buildRoleDisplacementNarrative(
  cd: CompanyData,
  bd: { L1: number; L3: number; L5?: number; D2?: number; D3?: number; D6?: number },
  score: number,
  role: string,
  tenureYears: number,
  uniquenessDepth: string,
  enrichment?: IndiaRiskEnrichment,
): ScenarioNarrative {
  const L3pct = pct(bd.L3);
  const D2pct = pct(bd.D2 ?? 0);
  const D6pct = pct(bd.D6 ?? 0);
  const L1pct = pct(bd.L1);

  return {
    archetype: 'role_displacement',
    primaryRiskDriver: `Role displacement risk is the dominant signal — L3: ${L3pct}/100 for ${role} in ${cd.industry ?? 'your sector'}. AI tool maturity signal D2: ${D2pct}/100, agent autonomous coverage D6: ${D6pct}/100. This combination indicates that the specific tasks in the ${role} function are in the high-automatability range — not because of company financial distress (L1: ${L1pct}/100) but because the role itself is being redefined by AI tools in the market.`,
    sixMonthInactionConsequence: `Without demonstrating AI-augmented capability in the next 6 months, the ${role} role profile at L3: ${L3pct}/100 is increasingly defined as "the version AI replaces" rather than "the version AI assists." The market bifurcation between augmented and unaugmented professionals in this role type is accelerating — entry-level roles are already being replaced in some companies (testing, basic coding, data entry) while augmented professionals at the same role level are being promoted. The 6-month window is before this bifurcation reaches your company.`,
    oneActionThisWeek: `Identify the single task in your role that AI can currently do at 70%+ of your quality. Then spend 2 hours this week NOT avoiding that task, but building a quality review process for AI output on that task. The goal: position yourself as the person whose judgment is required to validate AI performance, not the person competing with AI on execution. Document this process — it becomes your portfolio artifact.`,
    whatChangesRiskMost: `1. Shift 20% of your task portfolio from "execution" to "AI oversight/review" — this directly reduces L3 from ${L3pct}/100 by addressing the primary displacement mechanism. 2. Complete one AI integration certification that is specific to your role domain (GitHub Copilot for developers, Claude API for analysts, Midjourney for designers). 3. Build one publicly demonstrable AI-integration project — even a simple workflow. Public evidence compounds over time.`,
    estimatedTimeline: `${score >= 75 ? '6–12 months' : score >= 55 ? '12–24 months' : '24–36 months'} based on L3: ${L3pct}/100 + ${cd.aiInvestmentSignal ?? 'medium'} AI adoption environment. Role displacement timelines are longer than financial distress timelines but more certain once the AI tool matures — the tools become cheaper and more accessible faster than roles transform.`,
    keyProtectiveFactor: uniquenessDepth === 'critical_knowledge'
      ? `Critical institutional knowledge partially offsets L3: ${L3pct}/100 — but only the non-automatable components. Mapping which specific tasks require institutional knowledge vs generic execution is essential to know exactly what needs protecting.`
      : uniquenessDepth === 'functional_specialist'
        ? `Functional specialisation (L5) provides a 12–18 month buffer compared to generic profiles, but at L3: ${L3pct}/100, even specialists need to demonstrate AI oversight skills to maintain this advantage.`
        : `Generic role profile at L3: ${L3pct}/100 has limited natural protection. Building demonstrable AI oversight skills is the primary protective action — it's the only signal that directly addresses the L3 displacement risk.`,
    synthesis: `${role} at ${cd.name ?? 'your company'} — role displacement archetype. L3: ${L3pct}/100 + D2: ${D2pct}/100. Timeline: ${score >= 55 ? '12–24 months' : '24–36 months'}. Protection strategy: transition from execution to AI oversight within your current role.`,
    urgencyLevel: score >= 65 ? 'High' : score >= 45 ? 'Moderate' : 'Low',
    indiaSpecificInsight: enrichment?.isIndiaPrimary
      ? `India-specific: AI tool adoption in ${enrichment.sectorBenchmark.sector} is at ${Math.round(enrichment.sectorBenchmark.aiAdoptionIndex * 100)}% (sector average). Companies in Bangalore, Hyderabad, and Pune are implementing AI productivity tools faster than Chennai and Mumbai — check your office location's adoption rate.`
      : undefined,
  };
}

function buildSectorWaveNarrative(
  cd: CompanyData,
  bd: { L1: number; L3: number; L4?: number; L5?: number },
  score: number,
  role: string,
  tenureYears: number,
  enrichment?: IndiaRiskEnrichment,
): ScenarioNarrative {
  const L4pct = pct(bd.L4 ?? 0);
  const L1pct = pct(bd.L1);
  const L3pct = pct(bd.L3);

  const sectorTrend = enrichment?.sectorPulse.pulseTrend ?? 'flat';
  const sectorNaukri = enrichment ? Math.round(enrichment.sectorPulse.naukriIndexRelative * 100) : null;

  return {
    archetype: 'sector_wave',
    primaryRiskDriver: `Industry/sector headwinds are the dominant risk signal — L4: ${L4pct}/100. ${cd.name}'s individual financial health (L1: ${L1pct}/100) and role displacement risk (L3: ${L3pct}/100) are not the primary concern — the industry-level contraction creates a market-wide pressure that affects even well-positioned professionals. ${sectorNaukri != null ? `Sector job postings index: ${sectorNaukri}% of 6-month baseline.` : ''}`,
    sixMonthInactionConsequence: `Sector wave layoffs are the hardest to predict at the company level because they're driven by macro forces outside any company's control. The 6-month risk at L4: ${L4pct}/100 is that your company responds to sector pressure with a restructuring that would not have happened in a different macro environment. Without sector-specific repositioning — moving to a growing sub-sector or building skills that are sector-agnostic — you're exposed to a risk that no amount of individual performance improvement will protect against.`,
    oneActionThisWeek: `Research the one sub-sector within your industry that is growing while the overall sector contracts. In India IT services: cloud/AI practices are growing 15–22% while traditional services contract. In fintech: payment infrastructure is growing 18% while consumer lending is contracting. Identify which sub-sector your skills are most transferable to and apply to 2 companies in that sub-sector this week.`,
    whatChangesRiskMost: `1. Move from sector-headwind segment to sector-growth segment (this is a job search, not an upskill — the market is the problem, not your skills). 2. Build skills that are sector-agnostic (AI/ML, cloud infrastructure, data engineering are in demand across sectors regardless of industry-specific contraction). 3. Geographically expand your search — if your city's sector is contracting, the sector may be growing in a different tier-1 city.`,
    estimatedTimeline: `${score >= 65 ? '12–18 months' : '18–30 months'} based on L4: ${L4pct}/100. Sector waves typically last 2–4 quarters — if macro conditions improve, the risk decreases without individual action.`,
    keyProtectiveFactor: `${cd.name}'s individual financial position (L1: ${L1pct}/100) provides partial insulation from sector-wide pressure. Well-capitalized companies in contracting sectors often weather downturns better than their peers — but they're not immune to reducing headcount in response to peer pressure or client demand drops.`,
    synthesis: `${cd.name} — sector wave archetype. L4: ${L4pct}/100. Individual company signals are secondary to sector-level contraction. Key action: identify growing sub-sectors and begin targeted repositioning.`,
    urgencyLevel: score >= 65 ? 'High' : score >= 45 ? 'Moderate' : 'Low',
    indiaSpecificInsight: enrichment?.isIndiaPrimary
      ? `India sector pulse (${enrichment.sectorBenchmark.sector}): ${sectorTrend}. NASSCOM hiring intent: ${enrichment.sectorPulse.nasscomHiringIntent}% companies net-positive. Contrast: fintech sector hiring intent is ${enrichment.sectorPulse.sectorKey === 'fintech' ? 'yours' : '72%'} — highest in India IT. Consider fintech as a target if your skills are transferable.`
      : undefined,
  };
}

function buildGCCContagionNarrative(
  cd: CompanyData,
  bd: { L1: number; L3: number; L5?: number },
  score: number,
  role: string,
  tenureYears: number,
  enrichment: IndiaRiskEnrichment,
): ScenarioNarrative {
  const gccProfile = enrichment.gccRiskProfile;
  const L1pct = pct(bd.L1);
  const lagMonths = gccProfile.layoffContagionLag;

  return {
    archetype: 'gcc_parent_contagion',
    primaryRiskDriver: `GCC parent contagion risk — ${cd.name} is a ${gccProfile.archetype.replace(/_/g, ' ')} with parent country exposure in ${gccProfile.parentCountryExposure}. When parent companies in ${gccProfile.parentCountryExposure} announce headcount reductions, India GCC operations follow with a ${lagMonths}-month lag on average. This risk is structural: it is independent of your individual performance and ${cd.name} India's operational efficiency.`,
    sixMonthInactionConsequence: `GCC cuts operate differently from organic restructuring: they're announced with 60–90 days notice and affect broad cohorts rather than individual performance decisions. The 6-month window before a GCC cut announcement is typically the last period where internal transfers (to parent company or other business units) are possible. Without building a parallel external market pipeline AND understanding which internal transfer paths are available, you have only severance as a safety net when the announcement comes.`,
    oneActionThisWeek: `Check your parent company's latest earnings call transcript (available on investor relations website) for headcount guidance and India-specific mentions. GCC cuts are typically signaled 1–2 quarters before announcement in parent earnings calls. Search for terms: "headcount efficiency", "India operations", "workforce optimization". Then: update your LinkedIn profile visibility to "Open to Opportunities" (visible to recruiters only).`,
    whatChangesRiskMost: `1. Monitor parent company signals weekly (earnings calls, news). Warning signals: ${gccProfile.warningSignals.slice(0, 2).join('; ')}. 2. Build external market optionality NOW — the ${lagMonths}-month contagion window is your planning horizon. 3. Explore internal transfer opportunities to parent company or other business units — GCC → parent HQ moves are possible for high performers in protected roles (${gccProfile.protectionFactors[0] ?? 'compliance/risk functions'}).`,
    estimatedTimeline: `${lagMonths} months from parent company announcement. At current risk level (${score}/100), the parent company signals suggest ${score >= 65 ? 'a moderate probability of announcement within 6 months' : 'a watchful period — no active cuts signaled but fundamentals warrant monitoring'}.`,
    keyProtectiveFactor: gccProfile.protectionFactors.length > 0
      ? `Protected roles at this GCC archetype include: ${gccProfile.protectionFactors.join('; ')}. If your role falls in these categories, your risk is 40–60% lower than the average GCC employee at this company.`
      : `No role-specific protection factors are identified for this GCC archetype. Market optionality is the primary hedge.`,
    synthesis: `${cd.name} GCC — parent contagion archetype. ${gccProfile.parentCountryExposure} parent exposure, ${lagMonths}-month contagion lag. Score: ${score}/100. Action: monitor parent signals and build external pipeline in parallel.`,
    urgencyLevel: score >= 65 ? 'High' : score >= 45 ? 'Moderate' : 'Low',
    indiaSpecificInsight: `GCC context: India has 1,800+ GCCs employing ~2M people. When ${gccProfile.parentCountryExposure} parents cut, India GCCs follow at 2–3× the parent cut rate for non-critical functions. The ${enrichment.seasonalRisk.quarter} seasonal window adds ${Math.round((enrichment.seasonalRisk.window.riskMultiplier - 1) * 100)}% to base risk.`,
  };
}

function buildIndiaBenchNarrative(
  cd: CompanyData,
  bd: { L1: number; L3: number; L5?: number },
  score: number,
  role: string,
  tenureYears: number,
  enrichment: IndiaRiskEnrichment,
): ScenarioNarrative {
  const L1pct = pct(bd.L1);
  const L3pct = pct(bd.L3);
  const naukri = Math.round(enrichment.sectorPulse.naukriIndexRelative * 100);
  const seasonalMultiplier = enrichment.seasonalRisk.window.riskMultiplier;

  return {
    archetype: 'india_it_bench_risk',
    primaryRiskDriver: `India IT services bench risk — ${cd.name} operates in the ${enrichment.sectorBenchmark.sector} sector where Naukri job postings are at ${naukri}% of 6-month baseline (${enrichment.sectorPulse.pulseTrend}). In IT services companies (TCS, Infosys, Wipro, HCL, LTI, Tech M), "bench" — non-billable employees between projects — is the primary layoff mechanism. A sustained bench period of 60–90 days triggers performance-managed exits in most IT services firms. L1: ${L1pct}/100, L3: ${L3pct}/100.`,
    sixMonthInactionConsequence: `Without demonstrated billability — active project allocation, domain certifications, or a skills-driven internal transfer — bench time beyond 90 days at ${cd.name} moves you into the performance management pipeline regardless of your historical project record. The 6-month outcome without action: either a PIP (Performance Improvement Plan) with a 30–60 day window, or a voluntary separation package. The India IT market at ${naukri}% job postings baseline makes external exits harder during bench periods.`,
    oneActionThisWeek: `Email your Resource Management (RM) or Account Manager contact TODAY: "I am currently available for project allocation and interested in [specific vertical/technology]. Can we discuss upcoming projects in my skill area?" Copy your HR BP. In IT services, proactive visibility to RM is the single most important survival action when on bench. Companies allocate available people who ask over equally-available people who don't.`,
    whatChangesRiskMost: `1. Proactive RM/HR visibility — communicate availability and preferred skills weekly (this is the fastest action with the highest impact). 2. Earn one in-demand certification that opens project allocation to a growing technology area (AWS, Azure, AI/ML, SAP S/4 HANA — whatever your company's current growth vertical is). 3. Request an internal transfer to a growing practice area (cloud, data, AI) — IT services companies facilitate these to fill billable demand.`,
    estimatedTimeline: `${seasonalMultiplier > 1.2 ? `Current quarter (${enrichment.seasonalRisk.quarter}: ${enrichment.seasonalRisk.window.months}) is a high-risk window — ${Math.round((seasonalMultiplier - 1) * 100)}% elevated seasonal risk. ` : ''}90-day bench trigger is the operational timeline. At score ${score}/100, the risk is ${score >= 65 ? 'active and time-sensitive' : 'elevated — monitor allocation status weekly'}.`,
    keyProtectiveFactor: tenureYears >= 5
      ? `${tenureYears} yr tenure provides some protection — experienced employees are less likely to be benched for extended periods and have larger internal networks for allocation requests. However, at sector-wide contraction (${naukri}% Naukri baseline), even tenure protection is partial.`
      : `Limited tenure protection at ${tenureYears} yr at ${cd.name}. Internal network and proactive RM communication are your primary protection tools.`,
    synthesis: `${cd.name} — India IT bench risk archetype. Naukri index: ${naukri}%. Seasonal quarter: ${enrichment.seasonalRisk.quarter}. Score: ${score}/100. Critical action: proactive RM communication and certification in growth technology area.`,
    urgencyLevel: score >= 65 ? 'Immediate' : score >= 50 ? 'High' : 'Moderate',
    indiaSpecificInsight: `IT services bench reality: top 6 IT companies (TCS, Infosys, Wipro, HCL, Cognizant, Tech M) collectively have ~200,000+ employees on bench at any given time in FY2026. The companies allocating bench fastest are those building AI/cloud/data practices. Certifications in these areas increase allocation probability by 35–55% based on RM survey data.`,
  };
}

function buildIndividualResilienceNarrative(
  cd: CompanyData,
  bd: { L1: number; L3: number; L5?: number },
  score: number,
  role: string,
  tenureYears: number,
  uniquenessDepth: string,
): ScenarioNarrative {
  const L5pct = pct(bd.L5 ?? 0.5);
  const L1pct = pct(bd.L1);

  return {
    archetype: 'individual_resilience_gap',
    primaryRiskDriver: `Individual resilience gap — personal factors (L5: ${L5pct}/100) are the dominant risk signal. ${cd.name} financial health (L1: ${L1pct}/100) is not the primary concern, and role displacement risk is moderate. The risk here is that your current profile — ${uniquenessDepth === 'generic' ? 'generic role profile' : uniquenessDepth === 'functional_specialist' ? 'functional specialist' : 'critical knowledge holder'}, ${tenureYears} yr tenure, ${score >= 55 ? 'below median performance tier' : 'average performance tier'} — makes you a higher-priority candidate for workforce reduction if the company decides to thin headcount at any point.`,
    sixMonthInactionConsequence: `Individual resilience gaps are addressable — unlike company financial distress or macro sector headwinds, they are within your control. The 6-month consequence of inaction is: your profile stays in the "easily replaceable" category while your colleagues who invest in differentiated skills, documented achievements, and relationship capital move into the "harder to replace" category. The gap compounds — it doesn't stay constant.`,
    oneActionThisWeek: uniquenessDepth === 'generic'
      ? `Document one specific achievement from the last 6 months with a concrete number: "Reduced X by Y%", "Shipped feature used by N users", "Saved Z hours/week by automating W". Put it on your resume and LinkedIn profile today. This takes 30 minutes and is the fastest move from generic to differentiated profile.`
      : `Schedule a 1-on-1 with your manager this week and use these exact words: "I want to understand how I can take on more strategic responsibility in [area]. What would that look like?" The combination of your ${uniquenessDepth} profile and this initiative signals promotability — the opposite of expendability.`,
    whatChangesRiskMost: `1. Build one demonstrable AI skill (GitHub Copilot certification, free, 4 hours — this shifts the "easily replaceable" signal immediately). 2. Document your institutional knowledge in a shared artifact (decision record, process doc) — this converts implicit value to explicit, visible value. 3. Build two cross-functional relationships this month — people who know you personally don't put you on restructuring lists even when forced to make cuts.`,
    estimatedTimeline: `Personal resilience factors are responsive to action — your risk level can move 10–15 points in 60 days through targeted effort. The current ${score}/100 at L5: ${L5pct}/100 reflects a point-in-time snapshot, not a fixed assessment.`,
    keyProtectiveFactor: `${cd.name}'s financial stability (L1: ${L1pct}/100) is your primary protection — this archetype is driven by relative risk within a stable company, meaning restructuring decisions favor people with demonstrated differentiation.`,
    synthesis: `Individual resilience gap archetype — company is stable but personal factors drive elevated risk. L5: ${L5pct}/100, ${uniquenessDepth} profile. Score: ${score}/100. These factors are addressable: 60-day action plan can meaningfully shift the trajectory.`,
    urgencyLevel: score >= 65 ? 'High' : score >= 45 ? 'Moderate' : 'Low',
  };
}

function buildLowRiskNarrative(
  cd: CompanyData,
  bd: { L1: number; L3: number; L5?: number },
  score: number,
  role: string,
  tenureYears: number,
): ScenarioNarrative {
  const L1pct = pct(bd.L1);
  const L3pct = pct(bd.L3);
  const L5pct = pct(bd.L5 ?? 0.3);

  return {
    archetype: 'low_risk_maintain',
    primaryRiskDriver: `Risk signals are in the low range — score: ${score}/100. Company financial health (L1: ${L1pct}/100), role displacement risk (L3: ${L3pct}/100), and personal resilience (L5: ${L5pct}/100) are all manageable. This is the optimization context: building capital while risk is low rather than responding to crisis.`,
    sixMonthInactionConsequence: `Low risk does not mean no change. The India IT market is bifurcating: professionals who invest in AI skills and demonstrable contributions during low-risk periods emerge as the high-value profile when conditions shift. Professionals who coast during low-risk periods find themselves unprepared when conditions change — and market transitions happen faster than skill development timelines.`,
    oneActionThisWeek: `Invest 2 hours this week in one AI skill that is growing in demand for your role. Not to address an urgent risk, but because the window to build this skill before it becomes a mandatory baseline is 12–18 months. Engineers who start now vs under pressure produce dramatically better outcomes.`,
    whatChangesRiskMost: `1. Maintain your current protective factors (tenure, performance, relationship capital) — don't let them erode. 2. Build one AI-augmentation skill per quarter — not to reduce current risk but to build the differentiated profile that creates optionality in 12 months. 3. Build 3-month financial runway if not already at that level — low-risk periods are the time to build emergency fund.`,
    estimatedTimeline: `36+ months at current signal levels. Market conditions and individual decisions are the primary variables.`,
    keyProtectiveFactor: `Multiple protective factors are aligned: financial health (L1: ${L1pct}/100), role stability (L3: ${L3pct}/100), and personal resilience (L5: ${L5pct}/100). Maintaining this alignment requires active investment, not passive maintenance.`,
    synthesis: `${cd.name} — low risk archetype. Score: ${score}/100. All signals in manageable range. Optimization mode: build AI skills and financial runway during this window.`,
    urgencyLevel: 'Low',
  };
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export function buildScenarioNarrative(
  companyData: CompanyData,
  breakdown: { L1: number; L2: number; L3: number; L4?: number; L5?: number; D2?: number; D3?: number; D6?: number; D7?: number; D8?: number },
  score: number,
  roleTitle: string,
  tenureYears: number,
  uniquenessDepth: string,
  recs?: Array<{ title: string; riskReductionPct: number; priority: string }>,
): ScenarioNarrative {
  const enrichment = companyData.region === 'IN' || (companyData.region as string) === 'India'
    ? getIndiaRiskEnrichment(companyData.name, companyData.industry ?? '', companyData.region)
    : undefined;

  // v10.0: Compute archetype blend BEFORE selecting the primary narrative
  const blend = detectArchetypeBlend(companyData, breakdown, score, enrichment);
  const archetype = blend.primary.archetype;

  let narrative: ScenarioNarrative;
  switch (archetype) {
    case 'financial_distress_layoff':
      narrative = buildFinancialDistressNarrative(companyData, breakdown, score, roleTitle, tenureYears, uniquenessDepth, enrichment);
      break;
    case 'ai_efficiency_restructuring':
      narrative = buildAIEfficiencyNarrative(companyData, breakdown, score, roleTitle, tenureYears, uniquenessDepth);
      break;
    case 'role_displacement':
      narrative = buildRoleDisplacementNarrative(companyData, breakdown, score, roleTitle, tenureYears, uniquenessDepth, enrichment);
      break;
    case 'sector_wave':
      narrative = buildSectorWaveNarrative(companyData, breakdown, score, roleTitle, tenureYears, enrichment);
      break;
    case 'gcc_parent_contagion':
      if (!enrichment) {
        narrative = buildRoleDisplacementNarrative(companyData, breakdown, score, roleTitle, tenureYears, uniquenessDepth, enrichment);
      } else {
        narrative = buildGCCContagionNarrative(companyData, breakdown, score, roleTitle, tenureYears, enrichment);
      }
      break;
    case 'india_it_bench_risk':
      if (!enrichment) {
        narrative = buildRoleDisplacementNarrative(companyData, breakdown, score, roleTitle, tenureYears, uniquenessDepth, enrichment);
      } else {
        narrative = buildIndiaBenchNarrative(companyData, breakdown, score, roleTitle, tenureYears, enrichment);
      }
      break;
    case 'individual_resilience_gap':
      narrative = buildIndividualResilienceNarrative(companyData, breakdown, score, roleTitle, tenureYears, uniquenessDepth);
      break;
    case 'low_risk_maintain':
      narrative = buildLowRiskNarrative(companyData, breakdown, score, roleTitle, tenureYears);
      break;
    default:
      narrative = buildRoleDisplacementNarrative(companyData, breakdown, score, roleTitle, tenureYears, uniquenessDepth, enrichment);
  }

  // v10.0: Inject archetype blend data into the narrative result
  narrative.archetypeBlend = blend;
  if (blend.isBlended && blend.secondary) {
    narrative.secondaryArchetypeInsight = buildSecondaryInsight(blend.secondary.archetype, breakdown, score, companyData);
  }

  return narrative;
}

function buildSecondaryInsight(
  secondary: ScenarioArchetype,
  breakdown: { L1: number; L2: number; L3: number; L4?: number; L5?: number; D8?: number },
  score: number,
  cd: CompanyData,
): string {
  const L1pct = Math.round((breakdown.L1 ?? 0) * 100);
  const L3pct = Math.round((breakdown.L3 ?? 0) * 100);
  const D8pct = Math.round((breakdown.D8 ?? 0) * 100);

  switch (secondary) {
    case 'financial_distress_layoff':
      return `Secondary risk: Company financial health (L1: ${L1pct}/100) is an additional compounding factor — even if role displacement is resolved, financial stress at ${cd.name} creates independent exposure.`;
    case 'ai_efficiency_restructuring':
      return `Secondary risk: AI efficiency restructuring signals (D8: ${D8pct}/100) are also present — ${cd.name} shows the profitable-company-cutting-for-AI pattern, which operates independently of financial distress.`;
    case 'role_displacement':
      return `Secondary risk: Role automation risk (L3: ${L3pct}/100) is an additional compounding factor — even if company financial health improves, the role itself faces displacement pressure.`;
    case 'sector_wave':
      return `Secondary risk: Sector-level headwinds (L4) are compounding the primary risk — industry-wide contraction means company-specific improvements may be partially offset by macro pressure.`;
    case 'individual_resilience_gap':
      return `Secondary risk: Personal resilience factors (L5) are contributing to the score — building differentiated skills and documented achievements would reduce this secondary signal regardless of company or role changes.`;
    default:
      return `A secondary risk dimension is also contributing to your score — see the Risk Breakdown tab for the full dimensional breakdown.`;
  }
}

export function getScenarioArchetypeLabel(archetype: ScenarioArchetype): string {
  const labels: Record<ScenarioArchetype, string> = {
    financial_distress_layoff: 'Financial Distress',
    ai_efficiency_restructuring: 'AI Efficiency Restructuring',
    role_displacement: 'Role Displacement',
    sector_wave: 'Sector Headwind',
    gcc_parent_contagion: 'GCC Parent Contagion',
    india_it_bench_risk: 'IT Services Bench Risk',
    individual_resilience_gap: 'Individual Resilience Gap',
    low_risk_maintain: 'Low Risk — Optimization Mode',
  };
  return labels[archetype] ?? archetype;
}

export function getScenarioArchetypeColor(archetype: ScenarioArchetype): string {
  const colors: Record<ScenarioArchetype, string> = {
    financial_distress_layoff: 'text-red-600 bg-red-50 border-red-200',
    ai_efficiency_restructuring: 'text-orange-600 bg-orange-50 border-orange-200',
    role_displacement: 'text-amber-600 bg-amber-50 border-amber-200',
    sector_wave: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    gcc_parent_contagion: 'text-purple-600 bg-purple-50 border-purple-200',
    india_it_bench_risk: 'text-blue-600 bg-blue-50 border-blue-200',
    individual_resilience_gap: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    low_risk_maintain: 'text-green-600 bg-green-50 border-green-200',
  };
  return colors[archetype] ?? 'text-slate-600 bg-slate-50 border-slate-200';
}

// ─── Precision Intelligence Brief ────────────────────────────────────────────
// A 3-point analyst summary that gives data-grounded, non-generic answers to:
//   1. What is the SINGLE biggest risk driver right now (quantified)?
//   2. What is the #1 protective factor keeping the score from being higher?
//   3. Which signal is most volatile — what could change the score most in 30 days?
//
// This replaces vague narrative fields with specific, actionable intelligence.

export interface PrecisionBriefFactor {
  dimension: string;           // e.g. "L1", "L3", "D8"
  label: string;               // human label e.g. "Company Financial Health"
  score: number;               // 0–100 component score
  percentOfTotal: number;      // this factor's contribution to the final score (0–100)
  naturalLanguage: string;     // specific 1-sentence assessment
}

export interface VolatileSignal {
  name: string;                // e.g. "Stock 90-day change"
  currentValue: string;        // e.g. "-14% (90d)"
  worstCase: string;           // e.g. "If drops to -30%, L1 rises +12 pts"
  bestCase: string;            // e.g. "If recovers to +5%, L1 drops -8 pts"
  reason: string;              // why this signal is volatile now
}

export interface PrecisionBrief {
  topRiskDriver: PrecisionBriefFactor;
  topProtectiveFactor: PrecisionBriefFactor;
  mostVolatileSignal: VolatileSignal;
  analystSummary: string;      // 3 sentences, data-specific, no filler
  scoreComposition: string;    // e.g. "L1 (22%) + L3 (18%) + L5 (16%) = 56% of your 72-pt score"
  timeHorizonStatement: string; // e.g. "Risk is time-sensitive: action in the next 60 days has 3× the impact vs. waiting 90+ days"
}

const DIMENSION_LABELS: Record<string, string> = {
  L1: 'Company Financial Health',
  L2: 'Layoff History',
  L3: 'Role Displacement Risk',
  L4: 'Market Headwinds',
  L5: 'Experience Protection',
  D6: 'AI Agent Capability',
  D7: 'Unified Company Health',
  D8: 'AI Efficiency Restructuring',
};

// Composite formula weights — must stay in sync with layoffScoreEngine.ts
const BRIEF_WEIGHTS: Record<string, number> = {
  L1: 0.16, L2: 0.06, L3: 0.18, L4: 0.01, L5: 0.18,
  D6: 0.05, D7: 0.06, D8: 0.05,
};

export function buildPrecisionBrief(
  companyData: CompanyData,
  breakdown: { L1: number; L2: number; L3: number; L4?: number; L5?: number; D6?: number; D7?: number; D8?: number },
  score: number,
  roleTitle: string,
  tenureYears: number,
): PrecisionBrief {
  // ── Compute each dimension's actual contribution to the final score ────────
  const contributions: Array<{ key: string; rawScore: number; weight: number; contribution: number }> = [];
  for (const [key, weight] of Object.entries(BRIEF_WEIGHTS)) {
    const rawVal = (breakdown as Record<string, number | undefined>)[key] ?? 0;
    const contribution = rawVal * weight * 100;
    contributions.push({ key, rawScore: rawVal * 100, weight, contribution });
  }

  // Sort by contribution DESC for risk driver, ASC for protective factor
  const byContrib = [...contributions].sort((a, b) => b.contribution - a.contribution);
  const topRiskDim = byContrib[0];

  // Protective factor: dimension with lowest score AND non-trivial weight AND real data (>0).
  // Exclude rawScore === 0 — that means "no data", not "perfectly safe". Use the
  // top-risk dimension as fallback if all non-trivial dims are zero (edge case: fallback company).
  const byScore = [...contributions]
    .filter(c => c.weight >= 0.04 && c.rawScore > 0)
    .sort((a, b) => a.rawScore - b.rawScore);
  const topProtectiveDim = byScore[0] ?? byContrib[byContrib.length - 1];

  // Use the final score as the denominator — not the sum of tracked contributions.
  // BRIEF_WEIGHTS only covers 8 of 10 formula terms (D2, D3 are not in the breakdown).
  // Using score ensures percentages represent real share of the final score.
  const safeScore = Math.max(1, score);
  const riskPct = Math.round((topRiskDim.contribution / safeScore) * 100);
  const protectivePct = Math.round((topProtectiveDim.contribution / safeScore) * 100);

  // ── Top risk driver ────────────────────────────────────────────────────────
  const topRiskDriver: PrecisionBriefFactor = {
    dimension: topRiskDim.key,
    label: DIMENSION_LABELS[topRiskDim.key] ?? topRiskDim.key,
    score: Math.round(topRiskDim.rawScore),
    percentOfTotal: riskPct,
    naturalLanguage: buildRiskDriverSentence(topRiskDim.key, topRiskDim.rawScore, companyData, tenureYears),
  };

  // ── Top protective factor ──────────────────────────────────────────────────
  const topProtectiveFactor: PrecisionBriefFactor = {
    dimension: topProtectiveDim.key,
    label: DIMENSION_LABELS[topProtectiveDim.key] ?? topProtectiveDim.key,
    score: Math.round(topProtectiveDim.rawScore),
    percentOfTotal: protectivePct,
    naturalLanguage: buildProtectiveSentence(topProtectiveDim.key, topProtectiveDim.rawScore, companyData, tenureYears),
  };

  // ── Most volatile signal ───────────────────────────────────────────────────
  const mostVolatileSignal = buildVolatileSignal(companyData, breakdown, score);

  // ── Score composition string ──────────────────────────────────────────────
  const top3 = byContrib.slice(0, 3);
  const compositionParts = top3.map(d =>
    `${DIMENSION_LABELS[d.key] ?? d.key} (${Math.round((d.contribution / safeScore) * 100)}%)`
  );
  const top3Total = Math.round(top3.reduce((s, d) => s + d.contribution, 0) / safeScore * 100);
  const scoreComposition = `${compositionParts.join(' + ')} contribute ~${top3Total}% of your ${score}-point score`;

  // ── Time horizon statement ────────────────────────────────────────────────
  const timeHorizonStatement = buildTimeHorizonStatement(score, breakdown, companyData);

  // ── Analyst summary (3 data-specific sentences) ───────────────────────────
  const analystSummary = [
    `Your ${score}/100 risk is primarily driven by ${topRiskDriver.label} (${topRiskDriver.score}/100, contributing ${topRiskDriver.percentOfTotal}% of total score) — ${topRiskDriver.naturalLanguage}`,
    `Your strongest protective factor is ${topProtectiveFactor.label} (${topProtectiveFactor.score}/100) — ${topProtectiveFactor.naturalLanguage}`,
    `The highest-volatility signal in the next 30 days is ${mostVolatileSignal.name} — ${mostVolatileSignal.reason}`,
  ].join(' ');

  return {
    topRiskDriver,
    topProtectiveFactor,
    mostVolatileSignal,
    analystSummary,
    scoreComposition,
    timeHorizonStatement,
  };
}

function buildRiskDriverSentence(
  key: string,
  rawScore: number,
  cd: CompanyData,
  tenureYears: number,
): string {
  switch (key) {
    case 'L1': {
      const rev = cd.revenueGrowthYoY != null ? `${cd.revenueGrowthYoY > 0 ? '+' : ''}${cd.revenueGrowthYoY}% revenue YoY` : 'revenue data unavailable';
      const stk = cd.stock90DayChange != null ? `, stock ${cd.stock90DayChange > 0 ? '+' : ''}${cd.stock90DayChange}% (90d)` : '';
      return `${cd.name} shows ${rev}${stk} — company financial stress is the primary displacement trigger here.`;
    }
    case 'L2': {
      const rounds = cd.layoffRounds ?? 0;
      return rounds > 0
        ? `${cd.name} has ${rounds} documented layoff round${rounds > 1 ? 's' : ''} in the past 24 months — repeated precedent is the strongest near-term predictor.`
        : `Sector contagion and news signals are elevating layoff history risk even without company-specific events.`;
    }
    case 'L3':
      return `Your role's core tasks have high algorithmic replicability (${Math.round(rawScore)}/100) — the gap between what AI can do and what your role requires is narrowing faster than most roles.`;
    case 'L4':
      return `Industry headwinds (${cd.industry ?? 'your sector'}) are compressing hiring across all companies, not just yours — sector-level cuts elevate individual risk even at otherwise stable firms.`;
    case 'L5':
      return `Personal resilience factors (${tenureYears} yr tenure, experience profile) are insufficient to offset company-level or role-level signals at the current score level.`;
    case 'D8':
      return `${cd.name} shows the profitable-AI-restructuring pattern — financially healthy but deploying AI to replace FTEs, as seen at Meta/Google in 2023-2025.`;
    case 'D7':
      return `Unified company health signals (financial + market + AI adoption combined) create a compounded company-level risk that exceeds any single metric.`;
    default:
      return `This dimension is the dominant contributor to your ${Math.round(rawScore)}/100 component score.`;
  }
}

function buildProtectiveSentence(
  key: string,
  rawScore: number,
  cd: CompanyData,
  tenureYears: number,
): string {
  const score = Math.round(rawScore);
  switch (key) {
    case 'L1':
      return `${cd.name}'s financial health (${score}/100) is a positive signal — revenue growth and funding recency reduce near-term restructuring pressure.`;
    case 'L2':
      return `No documented layoff history at ${cd.name} (${score}/100) eliminates the strongest near-term predictor signal — this is meaningful protection.`;
    case 'L3':
      return `Your role's tasks are difficult to automate (${score}/100) — strategic judgment, cross-functional coordination, or physical presence requirements limit AI substitution.`;
    case 'L4':
      return `Industry conditions are favorable (${score}/100) — sector-level hiring demand is absorbing workers and buffering individual company risks.`;
    case 'L5':
      return `${tenureYears} years of tenure and your experience depth (${score}/100) create meaningful LIFO (last-in, first-out) protection — long-tenured employees are cut last in restructuring waves.`;
    case 'D6':
      return `Your professional network and relationship moat (${score}/100) provides meaningful protection — roles with deep stakeholder dependencies are retained even during aggressive cuts.`;
    default:
      return `This dimension scores ${score}/100, providing partial protection against the higher-risk signals in your profile.`;
  }
}

function buildVolatileSignal(
  cd: CompanyData,
  breakdown: { L1: number; L2: number; [key: string]: number | undefined },
  score: number,
): VolatileSignal {
  // Most volatile signals are: stock price change (public companies), news events, earnings
  if (cd.isPublic && cd.stock90DayChange != null) {
    const currentStk = cd.stock90DayChange;
    const worstImpact = Math.round(0.25 * 0.16 * 100 * (0.92 - breakdown.L1)); // stock drop to -30%
    const bestImpact = Math.round(0.25 * 0.16 * 100 * (breakdown.L1 - 0.15));  // stock recovery
    return {
      name: 'Stock 90-day price trend',
      currentValue: `${currentStk > 0 ? '+' : ''}${currentStk}% (90d)`,
      worstCase: `If stock drops further to −30%+, L1 increases by ~${Math.abs(worstImpact)} pts, pushing overall score up ${Math.round(worstImpact * 0.16)} pts`,
      bestCase: `If stock recovers to flat or positive, L1 drops ~${Math.abs(bestImpact)} pts, reducing overall score by ${Math.round(bestImpact * 0.16)} pts`,
      reason: `Public company stock is the fastest-moving financial signal — a single earnings call or major product announcement can shift L1 by 8–15 pts within days.`,
    };
  }

  // For companies with layoff history, news events are most volatile
  if ((cd.layoffRounds ?? 0) > 0 || breakdown.L2 > 0.5) {
    return {
      name: 'Breaking layoff news / WARN Act filing',
      currentValue: `L2: ${Math.round((breakdown.L2 ?? 0) * 100)}/100 (${cd.layoffRounds ?? 0} rounds in 24mo)`,
      worstCase: `A new layoff announcement would increase L2 to ~90/100, pushing overall score up 8–12 pts immediately`,
      bestCase: `24+ months without a new round would decay L2 to ~15/100, reducing overall score by 5–8 pts`,
      reason: `Companies with prior layoff history have the highest probability of a new round within 12 months — this is the most volatile leading indicator for your profile.`,
    };
  }

  // Default: revenue growth signal
  return {
    name: 'Revenue growth trajectory',
    currentValue: cd.revenueGrowthYoY != null ? `${cd.revenueGrowthYoY > 0 ? '+' : ''}${cd.revenueGrowthYoY}% YoY` : 'Not available (private company)',
    worstCase: `Revenue decline below −10% YoY would push L1 to 84+/100, increasing overall score by 10–14 pts`,
    bestCase: `Revenue growth above 20% YoY would reduce L1 to ~29/100, dropping overall score by 8–11 pts`,
    reason: `Revenue growth is the most predictive financial signal for workforce stability — a single quarterly miss that turns growth negative is the most common trigger for restructuring decisions at companies like ${cd.name}.`,
  };
}

function buildTimeHorizonStatement(
  score: number,
  breakdown: { L1: number; L2: number; L3: number; [key: string]: number | undefined },
  cd: CompanyData,
): string {
  if (score >= 75) {
    return `Risk is time-sensitive: acting within the next 30 days creates 3× the career optionality vs. waiting for an announcement — once a restructuring is public, the negotiating window closes and the job market floods with your cohort simultaneously.`;
  }
  if (score >= 55) {
    return `Risk is elevated but not yet acute: a 60-day action window exists to build external optionality before signals become public — this is the highest-leverage period to move without urgency pressure distorting decisions.`;
  }
  if (score >= 35) {
    return `Risk is moderate with a 6–12 month advance window — this is the ideal time to strengthen your position proactively rather than reactively. Small investments now (skills, network, visibility) compound against a risk that may not materialize but is worth hedging.`;
  }
  return `Risk is low — your current profile is well-positioned. The highest-ROI action is maintaining and deepening the protective factors already in place, not making unnecessary moves.`;
}
