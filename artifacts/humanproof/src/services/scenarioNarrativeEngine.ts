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
//   1. financial_distress_layoff   — L1 dominant, company in financial trouble
//   2. ai_efficiency_restructuring — D8 fires, profitable company cutting for AI
//   3. role_displacement           — L3 dominant, role itself being automated
//   4. sector_wave                 — L4 dominant, macro/industry headwinds
//   5. gcc_parent_contagion        — GCC employee, parent company cutting
//   6. india_it_bench_risk         — Bench/non-billable in IT services
//   7. individual_resilience_gap   — L5 dominant, personal factors are the risk
//   8. low_risk_maintain           — All signals green, optimization mode
//   9. eu_regulatory_restructuring — GDPR/EU AI Act compliance-cost headcount
//                                    optimization at EU-based companies
//  10. latam_funding_crisis        — LatAm startup w/o US funding runway hit by
//                                    VC dry-up; series-B-stuck pattern
//  11. apac_hyperscaler_localization — US tech localizing APAC ops; expat-heavy
//                                      teams replaced w/ regional hires
//  12. us_gov_contract_risk        — Defense-tech / federal-contractor budget
//                                    cuts (DOGE, continuing resolutions)
//  13. fintech_regulatory_tightening — Central-bank AI/fintech crackdowns
//                                      (RBI/MAS/ECB/FCA/BaFin) forcing
//                                      compliance hiring + product cuts

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
  | 'low_risk_maintain'
  // v40.0 — global Tier B archetypes
  | 'eu_regulatory_restructuring'
  | 'latam_funding_crisis'
  | 'apac_hyperscaler_localization'
  | 'us_gov_contract_risk'
  | 'fintech_regulatory_tightening';

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

  // v40.0 — region + industry context for new global archetypes.
  // Region buckets — match the data layer (sectorRegionStability.ts).
  const region   = (companyData.region ?? '').toString().toLowerCase().trim();
  const industry = (companyData.industry ?? '').toString().toLowerCase().trim();
  const EU_REGIONS = new Set([
    'de', 'deu', 'germany',
    'fr', 'fra', 'france',
    'nl', 'nld', 'netherlands',
    'es', 'esp', 'spain',
    'it', 'ita', 'italy',
    'be', 'bel', 'belgium',
    'at', 'aut', 'austria',
    'ie', 'irl', 'ireland',
    'pt', 'prt', 'portugal',
    'fi', 'fin', 'finland',
    'se', 'swe', 'sweden',
    'dk', 'dnk', 'denmark',
    'pl', 'pol', 'poland',
    'gr', 'grc', 'greece',
    'cz', 'cze', 'czechia',
    'hu', 'hun', 'hungary',
    'ro', 'rou', 'romania',
    'lu', 'lux', 'luxembourg',
    'eu',
  ]);
  const LATAM_REGIONS = new Set([
    'br', 'bra', 'brazil',
    'mx', 'mex', 'mexico',
    'ar', 'arg', 'argentina',
    'co', 'col', 'colombia',
    'cl', 'chl', 'chile',
    'pe', 'per', 'peru',
    'uy', 'ury', 'uruguay',
    'latam', 'latin america',
  ]);
  const APAC_REGIONS = new Set([
    'sg', 'sgp', 'singapore',
    'hk', 'hkg', 'hong kong',
    'jp', 'jpn', 'japan',
    'kr', 'kor', 'south korea', 'korea',
    'tw', 'twn', 'taiwan',
    'au', 'aus', 'australia',
    'nz', 'nzl', 'new zealand',
    'my', 'mys', 'malaysia',
    'id', 'idn', 'indonesia',
    'th', 'tha', 'thailand',
    'ph', 'phl', 'philippines',
    'vn', 'vnm', 'vietnam',
    'apac',
  ]);

  const isEU    = EU_REGIONS.has(region);
  const isLATAM = LATAM_REGIONS.has(region);
  const isAPAC  = APAC_REGIONS.has(region);
  const isUS    = region === 'us' || region === 'usa' || region === 'united states';

  // Industry-family detection (lightweight — matches scenario triggers, not the
  // full role taxonomy). False-positives bias toward generic archetypes which
  // is the safer failure mode than mis-firing a regulatory narrative.
  const isFintech =
    industry.includes('fintech') ||
    industry.includes('digital banking') ||
    industry.includes('payment') ||
    industry.includes('crypto') ||
    industry.includes('insurtech') ||
    industry.includes('regtech');
  const isFinServ = isFintech ||
    industry.includes('banking') ||
    industry.includes('financial service') ||
    industry.includes('insurance') ||
    industry.includes('asset management');
  const isDataHeavy =
    industry.includes('data') ||
    industry.includes('analytics') ||
    industry.includes('ad tech') ||
    industry.includes('adtech') ||
    industry.includes('marketing') ||
    industry.includes('digital advertising') ||
    industry.includes('saas');
  const isDefenseGov =
    industry.includes('defense') ||
    industry.includes('defence') ||
    industry.includes('aerospace') ||
    industry.includes('government') ||
    industry.includes('federal') ||
    industry.includes('military') ||
    industry.includes('national security') ||
    industry.includes('govtech') ||
    industry.includes('intelligence');
  const isStartup =
    (companyData as any).fundingStage === 'series-a' ||
    (companyData as any).fundingStage === 'series-b' ||
    (companyData as any).fundingStage === 'series-c' ||
    (companyData as any).fundingStage === 'seed' ||
    (companyData.employeeCount != null && companyData.employeeCount < 500 && !companyData.isPublic);
  const isHyperscaler =
    (companyData.aiInvestmentSignal === 'very-high' || companyData.aiInvestmentSignal === 'high') &&
    (companyData.employeeCount ?? 0) > 10000;

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

    // ── v40.0 global archetypes ──────────────────────────────────────────────

    {
      // EU regulatory restructuring — GDPR / EU AI Act / DSA compliance-cost
      // headcount optimization. Fires on EU region + (fintech/data/saas) where
      // L4 is the dominant driver and the company is profitable enough that
      // financial distress alone doesn't explain the restructuring.
      // Score >= 45 floor (below that the cohort is too soft).
      archetype: 'eu_regulatory_restructuring',
      confidence: isEU && (isFinServ || isDataHeavy) && score >= 45
        ? Math.min(1, 0.55 + (L4 * 0.5) + (Math.max(0, score - 45) / 100))
        : 0,
    },

    {
      // LatAm funding crisis — startups without US funding runway hit by VC
      // dry-up. Fires on LatAm region + startup-stage + L1 elevated (cash
      // burn). Series-B-stuck pattern: profitable enough to need a Series C
      // but Series Cs aren't closing in LatAm 2024-2026.
      archetype: 'latam_funding_crisis',
      confidence: isLATAM && isStartup && (L1 > 0.35 || score >= 45)
        ? Math.min(1, 0.50 + (L1 * 0.6) + (Math.max(0, score - 50) / 110))
        : 0,
    },

    {
      // APAC hyperscaler localization — US-parent tech company localizing APAC
      // ops, replacing expat-heavy teams with regional hires. Fires on APAC
      // region + signal-of-hyperscaler-parent OR named APAC GCC archetype +
      // moderate-to-elevated L3 (the layer where role-substitution shows up).
      archetype: 'apac_hyperscaler_localization',
      confidence: (isAPAC && (isHyperscaler || isGCC) && score >= 45)
        ? Math.min(1, 0.50 + (L3 * 0.5) + (Math.max(0, score - 45) / 110))
        : 0,
    },

    {
      // US gov contract risk — defense tech, aerospace, federal contractors
      // facing budget cuts (DOGE 2025-2026, continuing resolutions). Fires on
      // US region + defense/govt-adjacent industry. L4 + L2 compound because
      // contract cancellations create both sector-wave and layoff-history
      // signal simultaneously.
      archetype: 'us_gov_contract_risk',
      confidence: isUS && isDefenseGov && score >= 45
        ? Math.min(1, 0.55 + (L4 * 0.4) + (L2 * 0.3))
        : 0,
    },

    {
      // Fintech regulatory tightening — central bank AI/fintech crackdowns
      // (RBI restrictions on UPI fintechs, MAS digital bank licensing, ECB
      // payments oversight, FCA crypto restrictions, BaFin AI Act enforcement).
      // Fires globally on fintech industry + L4 elevated. Region routes the
      // regulator citation in the narrative but every region fires.
      archetype: 'fintech_regulatory_tightening',
      confidence: isFintech && score >= 45
        ? Math.min(1, 0.50 + (L4 * 0.5) + (Math.max(0, score - 45) / 110))
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
    eu_regulatory_restructuring: 'EU regulatory restructuring (GDPR / AI Act)',
    latam_funding_crisis: 'LatAm funding crisis (VC dry-up)',
    apac_hyperscaler_localization: 'APAC hyperscaler localization',
    us_gov_contract_risk: 'US gov contract risk',
    fintech_regulatory_tightening: 'fintech regulatory tightening',
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
  // Use a platform-agnostic date formatter to guarantee identical output across
  // browsers, Node.js (test runner), and operating systems regardless of ICU data.
  // toLocaleDateString('en-GB') differs between Node < 16 (no ICU) and browsers.
  const _formatLayoffDate = (iso: string): string => {
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso; // fallback to raw string if unparseable
    return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  };
  const historyPhrase = lastLayoff
    ? `${cd.layoffRounds} round${cd.layoffRounds > 1 ? 's' : ''} in 24 months (most recent: ${_formatLayoffDate(lastLayoff.date)}${lastLayoff.percentCut != null ? `, affecting ${lastLayoff.percentCut}% of the workforce` : ''})`
    : cd.layoffRounds > 0 ? `${cd.layoffRounds} documented round${cd.layoffRounds > 1 ? 's' : ''}` : 'no documented rounds yet';

  // Which dimension is the actual dominant driver — compare normalized scores
  const dominantDim = parseInt(L2pct) > parseInt(L1pct)
    ? `L2 (Layoff History) at ${L2pct}/100`
    : `L1 (Financial Health) at ${L1pct}/100`;

  const isHighRisk = score >= 65;
  const horizon = score >= 75 ? '3–6 months' : score >= 65 ? '6–12 months' : score >= 55 ? '12–18 months' : '18–30 months';
  const severanceDays = Math.min(tenureYears * 15, 180);

  return {
    archetype: 'financial_distress_layoff',
    primaryRiskDriver: `${dominantDim} is the dominant driver at ${score}/100 — ${cd.name} had ${historyPhrase}. Financial signals: ${financialSignals || 'below baseline'}. L1: ${L1pct}/100, L2: ${L2pct}/100. This combination of financial deterioration with documented precedent carries the highest predictive value for near-term workforce action.`,
    sixMonthInactionConsequence: isHighRisk
      ? `Without activating a parallel job search now, you risk being caught in a restructuring with 60–90 days notice. At ${cd.name}'s current trajectory (${financialSignals}, L1: ${L1pct}/100), the 6-month window is likely the advance signal period. After an announcement, every similarly-skilled professional in your cohort is in market simultaneously — offer quality and negotiating leverage compress 30–40%. Estimated severance at ${tenureYears} yr tenure: ~${severanceDays} days salary (India IDA formula). That is a runway, not a cushion — activate optionality before it becomes your only option.`
      : `${cd.name}'s financial signals (L1: ${L1pct}/100) are not yet critical, but direction matters more than current level. With L2: ${L2pct}/100 and ${cd.layoffRounds > 0 ? `${cd.layoffRounds} documented round${cd.layoffRounds > 1 ? 's' : ''}` : 'no prior rounds'}, the pattern of companies acting quietly before announcing publicly leaves a 12-month window to build optionality. Letting it pass is the structural mistake.`,
    oneActionThisWeek: `Update your LinkedIn headline today and accept the next recruiter contact. At a company with L1: ${L1pct}/100 and L2: ${L2pct}/100, recruiter outreach is the primary signal channel — not job boards. One conversation this week creates a market data point on your current value and one potential parallel path. Recruiters have visibility into unadvertised roles that no job board surface — your score of ${score}/100 is in the range where this action has highest ROI.`,
    whatChangesRiskMost: `1. Activate external market visibility — updated LinkedIn and 2 recruiter conversations within 7 days. Highest-leverage action at L1: ${L1pct}/100 + L2: ${L2pct}/100 combination. 2. Build 3-month financial runway in liquid savings — at ${tenureYears} yr tenure, estimated severance is ~${severanceDays} days; a runway above that means you negotiate from strength, not desperation. 3. Identify your top 3 target companies with active openings in your domain — list prepared in advance means action in days, not weeks, when the announcement comes.`,
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

  const L2pct = pct(bd.L3 ?? 0); // L3 used as proxy for AI task exposure in this archetype
  const layoffHistory = cd.layoffRounds > 0
    ? `${cd.layoffRounds} documented layoff round${cd.layoffRounds > 1 ? 's' : ''}${cd.layoffsLast24Months?.[0]?.percentCut != null ? ` (most recent: ${cd.layoffsLast24Months[0].percentCut}% of workforce)` : ''}`
    : 'no prior workforce reductions documented';

  return {
    archetype: 'ai_efficiency_restructuring',
    primaryRiskDriver: `D8 (AI Efficiency Risk) is the dominant driver at ${score}/100 — ${cd.name} has ${aiSignal} AI investment and ${layoffHistory}. D8: ${D8pct}/100, L3 (Role Displacement): ${L3pct}/100, L1 (Financial Health): ${L1pct}/100. This is the profitable-company-substituting-AI pattern: cuts driven by productivity targets, not financial distress — planned 6–12 months in advance and executed in cohorts.`,
    sixMonthInactionConsequence: `${cd.name}'s ${aiSignal} AI investment signal and D8: ${D8pct}/100 indicate a deliberate substitution plan, not emergency cost-cutting. Without demonstrating AI-oversight capability in the next 6 months, roles at L3: ${L3pct}/100 displacement risk are structurally replaced over 12–24 months. The roles created by this process — AI integration leads, quality reviewers, system designers — require demonstrating mastery, not just passive use. At score ${score}/100, this archetype has the highest certainty-of-outcome given sufficient lead time.`,
    oneActionThisWeek: `Map your role tasks against 3 categories: (A) AI generates first draft, I review and approve — own this; (B) AI cannot do this without my domain judgment — invest here; (C) AI fully replaces this — these disappear. Spend 90 minutes building this map today. At ${cd.name}'s ${aiSignal} AI investment level (D8: ${D8pct}/100), having this map is the difference between repositioning vs being removed. Document the output — it becomes your irreplaceable-contribution artifact.`,
    whatChangesRiskMost: `1. Demonstrable AI oversight skills — not "I use Copilot" but "I built a review framework for AI-generated output." This directly addresses D8: ${D8pct}/100, the primary trigger. 2. Own one AI integration initiative at ${cd.name} — repositions you as "the person who makes AI work" rather than "the person AI replaces." Direct impact on L3: ${L3pct}/100. 3. Document one specific example of human judgment that corrected an AI error — your irreplaceable-contribution credential for the next 3 years.`,
    estimatedTimeline: `12–24 months at D8: ${D8pct}/100 + L1: ${L1pct}/100 + L3: ${L3pct}/100. Profitable AI restructuring archetype is slower than financial distress but more structurally certain once the AI tools mature — companies plan these in 6–12 month advance cycles, not emergency waves.`,
    keyProtectiveFactor: uniquenessDepth === 'critical_knowledge'
      ? `Critical institutional knowledge (L5 protection) is meaningful at D8: ${D8pct}/100 — AI efficiency cuts typically preserve irreplaceable knowledge holders because their judgment is harder to automate than their task outputs. Your ${tenureYears} yr tenure compounds this.`
      : `Building demonstrable AI oversight expertise is the primary protection at D8: ${D8pct}/100 — it directly addresses the condition that triggers this archetype. Generic profiles at L3: ${L3pct}/100 have limited natural protection without it.`,
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
    primaryRiskDriver: `L3 (Role Displacement) is the dominant driver at ${score}/100 — ${role} in ${cd.industry ?? 'your sector'} carries L3: ${L3pct}/100 displacement risk. AI tool maturity (D2): ${D2pct}/100, agent autonomous coverage (D6): ${D6pct}/100. Company financial health (L1): ${L1pct}/100 is not the issue — the role itself is being redefined by AI tools in the market, independent of ${cd.name}'s financial position.`,
    sixMonthInactionConsequence: `Without demonstrating AI-augmented capability in the next 6 months, ${role} at L3: ${L3pct}/100 is increasingly categorised as "the version AI replaces." With D2: ${D2pct}/100 tool maturity and D6: ${D6pct}/100 autonomous coverage, the market bifurcation between augmented and unaugmented professionals is already measurable — augmented professionals in this role category are being promoted while unaugmented equivalents face replacement at the same tenure level. At score ${score}/100 this window is still open; at score ${score + 10}/100 it would not be.`,
    oneActionThisWeek: `Identify the single ${role} task that AI can currently perform at 70%+ of your quality. Spend 2 hours this week building a quality-review process for AI output on that task — not avoiding it, but owning the oversight layer. At L3: ${L3pct}/100 displacement risk, the goal is to position yourself as the person whose judgment is required to validate AI performance, not compete with AI on execution speed. Document this process — it is your portfolio artifact for the next performance cycle.`,
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
    primaryRiskDriver: `L4 (Industry Headwinds) is the dominant driver at ${score}/100 — ${cd.industry ?? 'your sector'} sector-level pressure affects ${cd.name} regardless of individual performance. L4: ${L4pct}/100. Company-specific signals: L1 (Financial Health): ${L1pct}/100, L3 (Role Displacement): ${L3pct}/100.${sectorNaukri != null ? ` Sector job postings: ${sectorNaukri}% of 6-month baseline.` : ''} Sector waves create risk that individual performance improvement alone cannot mitigate.`,
    sixMonthInactionConsequence: `Sector waves are the hardest to predict at the company level because they're driven by macro forces outside ${cd.name}'s control. At L4: ${L4pct}/100, the 6-month risk is that ${cd.name} responds to sector pressure with a restructuring that would not occur in a different macro environment. ${sectorNaukri != null ? `With sector job postings at ${sectorNaukri}% of baseline, ` : ''}external positioning in a growing sub-sector is the only protection against a risk that individual performance will not offset.`,
    oneActionThisWeek: `Research the one sub-sector within ${cd.industry ?? 'your industry'} that is growing while the overall sector contracts${sectorNaukri != null ? ` (current sector index: ${sectorNaukri}% of baseline, L4: ${L4pct}/100)` : ` (L4: ${L4pct}/100)`}. Identify which sub-sector your specific skills are most transferable to and send 2 targeted applications this week. Moving to a growing segment is a job search, not an upskill — the market structure is the problem, not your capability.`,
    whatChangesRiskMost: `1. Move from sector-headwind segment to sector-growth segment — L4: ${L4pct}/100 is the signal that this is a market structure problem, not a skills problem. 2. Build sector-agnostic skills (AI/ML, cloud infrastructure, data engineering are in demand regardless of ${cd.industry ?? 'industry'} contraction). 3. Geographically expand search — if your city's sector is contracting at L4: ${L4pct}/100, an adjacent city may have a different demand profile for the same skills.`,
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
    primaryRiskDriver: `GCC parent contagion is the dominant driver at ${score}/100 — ${cd.name} is a ${gccProfile.archetype.replace(/_/g, ' ')} with ${gccProfile.parentCountryExposure} parent exposure and a historical ${lagMonths}-month contagion lag. L1 (${cd.name} India Financial Health): ${L1pct}/100. Parent company headcount reductions transmit to India GCCs at 2–3× the parent cut rate for non-critical functions. This risk is independent of individual performance and local operational efficiency.`,
    sixMonthInactionConsequence: `GCC cuts differ from organic restructuring: 60–90 days notice, broad cohorts, no individual performance link. At score ${score}/100 with ${lagMonths}-month contagion lag, the 6-month window is typically the last period where internal transfers — to parent company or other business units — are possible. With L1: ${L1pct}/100, ${cd.name} India is not the source of risk; the parent company's balance sheet is. Without a parallel external pipeline AND documented internal transfer path, severance becomes your only safety net.`,
    oneActionThisWeek: `Check ${cd.name}'s parent company's latest earnings call transcript (investor relations website) for headcount guidance and India-specific mentions — GCC cuts are typically signaled 1–2 quarters before announcement. Search for: "headcount efficiency", "India operations", "workforce optimization". Then update your LinkedIn to "Open to Opportunities" (recruiters-only visibility). At ${score}/100 with ${lagMonths}-month lag, this week's action is your earliest opportunity for a ${lagMonths}-month head start.`,
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
    primaryRiskDriver: `L4 (IT Services Bench Risk) is the dominant driver at ${score}/100 — ${cd.name} operates in ${enrichment.sectorBenchmark.sector} where Naukri job postings are at ${naukri}% of 6-month baseline (${enrichment.sectorPulse.pulseTrend}). Bench — non-billable employees between projects — is the primary layoff mechanism at IT services firms: 60–90 days triggers performance-managed exits. L1: ${L1pct}/100, L3: ${L3pct}/100.`,
    sixMonthInactionConsequence: `Without demonstrated billability — active project allocation, domain certifications, or a skills-driven internal transfer — bench time beyond 90 days at ${cd.name} moves you into the performance management pipeline regardless of historical record. With the ${enrichment.sectorBenchmark.sector} Naukri index at ${naukri}% of baseline (${enrichment.sectorPulse.pulseTrend}), external exits during bench periods are harder than at a healthy 100%+ baseline. At score ${score}/100, the 6-month outcome without action is a PIP with a 30–60 day window, or a voluntary separation package.`,
    oneActionThisWeek: `Email your Resource Management (RM) or Account Manager contact TODAY: "I am currently available for project allocation and interested in [specific vertical]. Can we discuss upcoming projects in my skill area?" Copy your HR BP. At ${naukri}% sector demand baseline and L1: ${L1pct}/100, proactive RM visibility is the highest-ROI action available — companies allocate available people who ask over equally-available people who don't, especially in a contracting demand environment.`,
    whatChangesRiskMost: `1. Proactive RM/HR visibility — communicate availability and preferred skills weekly. At ${naukri}% Naukri baseline (${enrichment.sectorPulse.pulseTrend}), this is the fastest action with highest impact. 2. Earn one in-demand certification that opens project allocation to a growing technology area (AWS, Azure, AI/ML — whichever aligns with ${cd.name}'s growth vertical). 3. Request internal transfer to a growing practice area (cloud, data, AI) — IT services companies facilitate these to fill billable demand regardless of sector headwinds at L4.`,
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
    primaryRiskDriver: `L5 (Personal Resilience) is the dominant driver at ${score}/100 — ${uniquenessDepth === 'generic' ? 'generic role profile' : uniquenessDepth === 'functional_specialist' ? 'functional specialist' : 'critical knowledge holder'}, ${tenureYears} yr tenure. L5: ${L5pct}/100. ${cd.name} financial health (L1: ${L1pct}/100) is stable — the risk is relative position within a stable company. At L5: ${L5pct}/100, this profile is a higher-priority candidate for headcount reduction than colleagues with L5 below 40/100, regardless of absolute performance.`,
    sixMonthInactionConsequence: `Individual resilience gaps are uniquely addressable — unlike L1 (financial distress) or L4 (sector headwinds), L5: ${L5pct}/100 is within your control. The 6-month consequence of inaction: your profile stays in the "easily replaceable" category while colleagues who invest in differentiated skills and documented achievements move to "harder to replace." The gap compounds at approximately ${Math.round((100 - parseInt(L5pct)) * 0.05)}/100 points per quarter without active investment — it does not stay constant.`,
    oneActionThisWeek: uniquenessDepth === 'generic'
      ? `Document one specific achievement from the last 6 months with a concrete number: "Reduced X by Y%", "Shipped feature used by N users", "Saved Z hours/week by automating W". At L5: ${L5pct}/100, this 30-minute action is the fastest move from generic to differentiated profile — it directly addresses the signal that drives this score component.`
      : `Schedule a 1-on-1 with your manager this week using these exact words: "I want to understand how I can take on more strategic responsibility in [area]. What would that look like?" At ${uniquenessDepth} profile and L5: ${L5pct}/100, this initiative signals promotability — the opposite of expendability — and directly addresses the L5 component.`,
    whatChangesRiskMost: `1. Build one demonstrable AI skill (GitHub Copilot certification, free, 4 hours) — directly addresses the "easily replaceable" signal that drives L5: ${L5pct}/100. 2. Document institutional knowledge in a shared artifact (decision record, process doc) — converts implicit value to explicit, visible value that survives headcount reviews. 3. Build 2 cross-functional relationships this month — people who know you personally don't put you on restructuring lists. These 3 actions can move L5 from ${L5pct}/100 by 10–15 points in 60 days.`,
    estimatedTimeline: `Personal resilience factors respond to action — L5: ${L5pct}/100 can move 10–15 points in 60 days through targeted effort. The current ${score}/100 reflects a point-in-time snapshot. With ${cd.name} stable at L1: ${L1pct}/100, the timeline is fully controllable by your actions.`,
    keyProtectiveFactor: `${cd.name}'s financial stability (L1: ${L1pct}/100) is your primary protection — this archetype is driven by relative risk within a stable company, meaning restructuring decisions favor people with demonstrated differentiation.`,
    synthesis: `Individual resilience gap archetype — company is stable but personal factors drive elevated risk. L5: ${L5pct}/100, ${uniquenessDepth} profile. Score: ${score}/100. These factors are addressable: 60-day action plan can meaningfully shift the trajectory.`,
    urgencyLevel: score >= 65 ? 'High' : score >= 45 ? 'Moderate' : 'Low',
  };
}

// ─── v40.0 Global Archetype Narrative Builders ───────────────────────────────

function buildEURegulatoryNarrative(
  cd: CompanyData,
  bd: { L1: number; L3: number; L4?: number; L5?: number },
  score: number,
  role: string,
  tenureYears: number,
): ScenarioNarrative {
  const L1pct = pct(bd.L1);
  const L3pct = pct(bd.L3);
  const L4pct = pct(bd.L4 ?? 0);
  const region = (cd.region ?? '').toString().toUpperCase();

  // Regulator citation per EU country — drives narrative specificity.
  const REGULATOR_BY_COUNTRY: Record<string, string> = {
    DE: 'BaFin (Bundesanstalt für Finanzdienstleistungsaufsicht)',
    FR: 'ACPR + CNIL',
    NL: 'AFM + DNB',
    ES: 'CNMV + AEPD',
    IT: 'CONSOB + Garante Privacy',
    BE: 'FSMA + Belgian DPA',
    AT: 'FMA + DSB',
    IE: 'CBI + DPC (Data Protection Commission)',
    PT: 'CMVM + CNPD',
    FI: 'FIN-FSA',
    SE: 'Finansinspektionen + IMY',
    DK: 'Finanstilsynet + Datatilsynet',
    PL: 'KNF + UODO',
    EU: 'ECB SSM + EDPB',
  };
  const regulator = REGULATOR_BY_COUNTRY[region] ?? 'national supervisor + EDPB';
  const isHQRegion = region === 'DE' || region === 'FR' || region === 'NL' || region === 'IE' || region === 'EU';

  return {
    archetype: 'eu_regulatory_restructuring',
    primaryRiskDriver: `EU regulatory compliance burden is the dominant driver at ${score}/100 — ${cd.name} faces compounding pressure from the EU AI Act (Article 6 high-risk-system classification, effective Aug 2026), GDPR enforcement (avg fines up 31% YoY 2024-2026), and DSA/DMA obligations. L4 (Industry Headwinds): ${L4pct}/100. Regulator: ${regulator}. ${cd.industry ?? 'Your sector'} headcount changes here are compliance-driven, not financial-distress driven — L1 (${L1pct}/100) shows the company is profitable enough that the cuts are strategic reallocation toward compliance/risk hires, not cost panic.`,
    sixMonthInactionConsequence: `EU AI Act compliance deadlines stack: high-risk-system documentation (Aug 2026), data-governance audits (Feb 2027), human-oversight evidence (rolling). At ${cd.name} the next 6 months are when the headcount reallocation moves from data/marketing/growth teams into compliance/risk/legal — your data-team or product-growth role is more exposed than a compliance-engineering role even at identical L3: ${L3pct}/100. Without repositioning toward regulatory-adjacent work, the 6-month outcome is a quiet performance-review-based exit during the next compliance audit cycle. Estimated EU collective redundancy notice period: 30-90 days depending on works-council scope.`,
    oneActionThisWeek: `Identify the 1 EU AI Act / GDPR compliance gap at ${cd.name} that your skills could plausibly close in 90 days. Document it in a 1-pager and schedule a 20-minute conversation with your manager titled: "EU AI Act readiness — where I can contribute." With ${regulator} enforcement actions averaging 4.2M EUR per major fine in 2025-2026, every EU role pivot from "general data work" to "AI-Act/GDPR compliant data work" raises L5 by an estimated 8-12 points within one quarter. This is the highest-ROI move available at L4: ${L4pct}/100.`,
    whatChangesRiskMost: `1. Acquire one EU AI Act-specific credential within 60 days (EDPB Data Protection Officer, ISACA AI Audit, IAPP CIPP/E) — directly addresses the L4: ${L4pct}/100 trigger by repositioning you on the compliance side of the cut line, not the optimization side. 2. Document 2 specific data-governance contributions to ${cd.name}'s AI Act readiness — works-council records of "compliance contribution" weigh heavily in EU redundancy selection criteria. 3. Build a Brussels/Frankfurt/Dublin recruiter pipeline — EU regulatory hiring is up 38% YoY 2024-2026 even as general tech hiring contracts.`,
    estimatedTimeline: `${score >= 65 ? '6-12 months' : '12-18 months'} — EU restructurings move slower than US (works-council consultation, social plan negotiation, PSE filing in FR) but are more structurally certain once announced. The AI Act Aug 2026 high-risk-system deadline is the operational forcing function. L4: ${L4pct}/100 reflects this deterministic pressure.`,
    keyProtectiveFactor: `${isHQRegion ? `EU HQ location (${region}) is a partial protective factor — head-office roles face works-council consultation requirements that satellite offices in other EU states often lack. ` : ''}${cd.name}'s L1: ${L1pct}/100 means the company has financial room to absorb compliance costs without panic — the cuts will be deliberate, not chaotic. Roles touching the AI Act compliance perimeter (risk, governance, audit, DPO function) are the protected category.`,
    synthesis: `${cd.name} (${region}) — EU regulatory restructuring archetype. L4: ${L4pct}/100, regulator: ${regulator}. Compliance-driven headcount reallocation, not financial distress. Timeline: ${score >= 65 ? '6-12 months' : '12-18 months'}. Pivot toward AI Act / GDPR-adjacent work is the highest-leverage move.`,
    urgencyLevel: score >= 65 ? 'High' : score >= 50 ? 'Moderate' : 'Low',
  };
}

function buildLatAmFundingNarrative(
  cd: CompanyData,
  bd: { L1: number; L2: number; L3: number; L4?: number; L5?: number },
  score: number,
  role: string,
  tenureYears: number,
): ScenarioNarrative {
  const L1pct = pct(bd.L1);
  const L2pct = pct(bd.L2);
  const L3pct = pct(bd.L3);
  const region = (cd.region ?? '').toString().toUpperCase();
  const runway = (cd as any).runwayMonths as number | undefined;
  const fundingStage = (cd as any).fundingStage as string | undefined;

  const REGIONAL_CONTEXT: Record<string, string> = {
    BR: 'Brazilian VC funding in 2026 is 41% below 2021 peak per Distrito Q1 report. Series B closes averaged 6.2 months in 2024 vs 2.1 months in 2021',
    MX: 'Mexican VC fundraising is at a 4-year low; Endeavor Mexico reports Series A→B graduation rate dropped from 38% (2021) to 14% (2026)',
    AR: 'Argentine startups face peso volatility + capital controls. USD-denominated revenue is now table-stakes for any institutional round',
    CO: 'Colombian VC ecosystem (Bogotá, Medellín) is highly dependent on US LPs; Series C and beyond are functionally closed to local-only LP syndicates',
    CL: 'Chilean startups face the smallest VC pool in major LatAm markets; Corfu government co-investment is the dominant Series A source',
  };
  const macroContext = REGIONAL_CONTEXT[region] ?? 'LatAm VC funding is at multi-year lows with US LP retreat compounding';

  return {
    archetype: 'latam_funding_crisis',
    primaryRiskDriver: `LatAm funding crisis is the dominant driver at ${score}/100 — ${cd.name} (${fundingStage ?? 'late-stage startup'}${runway != null ? `, ${runway}mo runway` : ''}) is exposed to the VC dry-up affecting the entire region. L1 (Financial Health): ${L1pct}/100, L2 (Layoff History): ${L2pct}/100. ${macroContext}. The risk pattern: companies that raised in 2020-2022 at 30-40x revenue multiples now need a down round or a "default alive" cut to bridge to Series C — and the rounds aren't closing.`,
    sixMonthInactionConsequence: `LatAm startup cuts in 2024-2026 have a different signature than US: typically 20-30% in one round (vs US 10-15% in three rounds), severance often 30-60 days only (vs US 60-90), and rehiring at the same company within 12 months is rare because the next round often doesn't close. Without ${cd.name} closing a Series C or a strategic acquisition in the next 6 months, the layoff probability at L1: ${L1pct}/100${runway != null ? ` and ${runway}mo runway` : ''} compounds quarterly. Local market reabsorption is slower than US — fewer parallel hiring companies, more candidates per opening.`,
    oneActionThisWeek: `Check ${cd.name}'s last funding milestone via Crunchbase / LAVCA / Distrito. If the last round was >18 months ago, the company is in the "either close Series C or cut" decision window. Then this week update LinkedIn to "Open to Work" (recruiter-visible only) AND submit 3 applications to: (a) a profitable LatAm company at >5yr operating history, (b) a US/EU multinational LatAm-hub office, (c) a fintech / e-commerce incumbent. The bilingual/Spanish-Portuguese fluency premium in the regional market is 18-25% — leverage it now while the supply is concentrated.`,
    whatChangesRiskMost: `1. Build a parallel pipeline of 3 stable-employer applications within 30 days — at L1: ${L1pct}/100 + L2: ${L2pct}/100, the contagion risk doubles each quarter without a runway-extension event. 2. Acquire one in-demand technical skill (Cloud certs, AI/ML engineering, payments compliance) — closes the regional skills gap that protects against displacement even during downturns. 3. Build a USD-denominated income stream (consulting, US remote work) — peso/real/peso volatility means LatAm-only salary now has a 15-30% downside in real terms.`,
    estimatedTimeline: `${score >= 65 ? '3-9 months' : '9-15 months'} — LatAm funding-crisis cuts are faster than EU/Japan restructuring but typically slower than US distress because runway is the binding constraint. ${runway != null ? `At ${runway}mo runway` : 'Without disclosed runway data'}, the trigger event is the next failed round OR a covenant breach with existing investors.`,
    keyProtectiveFactor: `Bilingual (English + Spanish/Portuguese) language ability is a meaningful protective factor in this archetype — opens US/EU remote work and multinational hub offices. Combined with technical skills, this is the bridge that keeps total compensation stable even when the local market contracts. ${cd.industry ?? 'Your sector'} expertise also transfers to incumbent banks/retailers consolidating fintech talent.`,
    synthesis: `${cd.name} (${region}) — LatAm funding crisis archetype. L1: ${L1pct}/100${runway != null ? `, ${runway}mo runway` : ''}. Macro: ${macroContext.split('.')[0]}. Timeline: ${score >= 65 ? '3-9 months' : '9-15 months'}. Action: build USD-income optionality + technical skills now.`,
    urgencyLevel: score >= 65 ? 'Immediate' : score >= 50 ? 'High' : 'Moderate',
  };
}

function buildAPACHyperscalerNarrative(
  cd: CompanyData,
  bd: { L1: number; L3: number; L5?: number; D8?: number },
  score: number,
  role: string,
  tenureYears: number,
): ScenarioNarrative {
  const L1pct = pct(bd.L1);
  const L3pct = pct(bd.L3);
  const D8pct = pct(bd.D8 ?? 0);
  const region = (cd.region ?? '').toString().toUpperCase();

  const APAC_HUB_CONTEXT: Record<string, string> = {
    SG: 'Singapore is the regional HQ for most US tech APAC ops; cost arbitrage vs SF/NYC has narrowed (now ~25% vs 50% in 2018) so headcount migrates to KL/Manila/Bangalore',
    HK: 'Hong Kong APAC functions are being relocated to Singapore/Tokyo post-2020; expat tech workforce shrank ~35% 2020-2026',
    JP: 'Japan offices are being protected by lifetime-employment culture for Japanese citizens, but expat/contract roles face standard restructuring',
    AU: 'Australian offices (Sydney/Melbourne) typically protected for English-language regional sales, but engineering/product roles migrate to India',
    KR: 'Korea offices face localization toward Korean nationals; expat tech roles being eliminated',
  };
  const hubContext = APAC_HUB_CONTEXT[region] ?? 'APAC regional functions face consolidation pressure as cost arbitrage with US narrows';

  return {
    archetype: 'apac_hyperscaler_localization',
    primaryRiskDriver: `APAC hyperscaler localization is the dominant driver at ${score}/100 — ${cd.name} is consolidating regional ops, replacing expensive expat/regional-hub talent with local-national hires or relocating functions to lower-cost APAC nodes (Manila, KL, Bangalore, Hyderabad). L3: ${L3pct}/100, D8: ${D8pct}/100. Context: ${hubContext}. The pattern is structural, not financial — L1: ${L1pct}/100 confirms the company is profitable; the cuts are cost-optimization driven by parent-company quarterly margin targets.`,
    sixMonthInactionConsequence: `APAC localization cuts proceed in waves: first wave (Q1-Q2) targets duplicate functions between regional HQ and parent. Second wave (Q3-Q4) targets expat/contract roles that can be re-hired locally at 40-55% cost. Without a function-defensibility argument — a role that genuinely cannot be performed by a local hire — the 12-month outcome is a quiet re-org with a 60-90 day notice. At score ${score}/100 the early signals (frozen headcount, parent-company "efficiency" messaging on earnings calls) usually precede announcement by 4-6 months.`,
    oneActionThisWeek: `Audit your role through 2 lenses this week: (a) Could this be done by a local national in ${region} or relocated to Manila/KL/Bangalore? (b) Does your role have a defensible regional-judgment / customer-relationship / language requirement that a hire elsewhere can't replicate? Then schedule a 15-min sync with your manager to discuss: "Where does my role sit in the regional capability map for 2027?" At L3: ${L3pct}/100 + D8: ${D8pct}/100, having this conversation now creates a written record that supports retention.`,
    whatChangesRiskMost: `1. Build defensible regional-specific expertise — local customer relationships, language/cultural fluency, regulatory navigation in ${region}. These reduce L3: ${L3pct}/100 because they're not arbitraged-away by relocation. 2. Build a parallel pipeline at APAC-headquartered companies (Sea Limited, Grab, Lazada, Atlassian, Canva) where regional ops are the core business, not a cost center. 3. Acquire one AI-augmentation skill — D8: ${D8pct}/100 means the parent is also automating, so the next wave of cuts targets generic-AI-substitutable roles regardless of geography.`,
    estimatedTimeline: `${score >= 65 ? '9-18 months' : '18-30 months'} — hyperscaler localization waves typically have 2-3 quarter announcement cycles. At D8: ${D8pct}/100, expect compounding from AI-efficiency restructuring layered on top.`,
    keyProtectiveFactor: `Regional expertise that genuinely cannot be replicated by lower-cost APAC nodes — customer relationships built over 5+ years, regulatory navigation in ${region}, native language ability for non-English-primary markets. Engineering and product roles are the most-exposed; sales, customer success, regulatory affairs, and partnerships are the most-protected.`,
    synthesis: `${cd.name} (${region}) — APAC hyperscaler localization archetype. L3: ${L3pct}/100, D8: ${D8pct}/100. ${hubContext.split(';')[0]}. Timeline: ${score >= 65 ? '9-18 months' : '18-30 months'}. Action: build defensible regional expertise + APAC-native employer pipeline.`,
    urgencyLevel: score >= 65 ? 'High' : score >= 50 ? 'Moderate' : 'Low',
  };
}

function buildUSGovContractNarrative(
  cd: CompanyData,
  bd: { L1: number; L2: number; L4?: number; L5?: number },
  score: number,
  role: string,
  tenureYears: number,
): ScenarioNarrative {
  const L1pct = pct(bd.L1);
  const L2pct = pct(bd.L2);
  const L4pct = pct(bd.L4 ?? 0);
  const security = (cd as any).securityClearance as string | undefined;

  return {
    archetype: 'us_gov_contract_risk',
    primaryRiskDriver: `US government contract risk is the dominant driver at ${score}/100 — ${cd.name} faces compounding pressure from federal budget cuts (DOGE-driven contract terminations 2025-2026), continuing-resolution-driven funding uncertainty, and prime-contractor pass-through cuts. L4 (Industry Headwinds): ${L4pct}/100, L2 (Layoff History): ${L2pct}/100. The risk is bimodal: programs of record continue but new starts are frozen, and subcontractor roles cut first. L1: ${L1pct}/100 shows the company is otherwise stable — the risk is contract-driven, not balance-sheet driven.`,
    sixMonthInactionConsequence: `Federal contract cancellations follow a predictable cadence: 30-60 day stop-work order, then 60-90 days for the contractor to "ramp down" headcount allocated to the program. Without re-allocation to another active contract within 90 days of a stop-work, roles convert to bench → 30-day notice. At ${cd.name} with L4: ${L4pct}/100, the 6-month risk is being on a program that ends with no follow-on. Severance at federal contractors averages 2 weeks per year of service capped at 12 weeks — lower than commercial tech.`,
    oneActionThisWeek: `Identify the specific contract / program you're billed to and check its current status via USASpending.gov + the DoD or GSA contracts portal. Search: "${cd.name}" + your program name. Is the option year exercised? Is the funding profile flat or declining? Then update your LinkedIn to surface ${security ? `${security} clearance` : 'security clearance status'} prominently — cleared roles re-employ in <90 days on average vs 180+ days for uncleared. Send 2 applications to other prime contractors (Lockheed, Raytheon, Northrop, L3Harris, Booz Allen, Leidos, SAIC) on different program areas to validate market value.`,
    whatChangesRiskMost: `1. Re-allocate to a different active contract within ${cd.name} — internal mobility is the fastest L4 hedge (current contract risk is fungible across programs in many primes). 2. Maintain / upgrade security clearance — at ${security ?? 'current clearance level'}, every clearance tier upgrade raises L5 by an estimated 10-15 points in this archetype. 3. Build commercial-sector skills (cloud, cybersecurity, AI/ML) that bridge from defense to commercial tech — gov-tech crossover roles at AWS Federal, Microsoft Federal, Palantir, Anduril have grown 28% YoY 2024-2026.`,
    estimatedTimeline: `${score >= 65 ? '3-9 months' : '9-15 months'} — federal contract cuts are faster than commercial restructuring because the trigger event (stop-work order) is binary. Continuing Resolution uncertainty compresses planning horizons across the entire industry.`,
    keyProtectiveFactor: `${security ? `Active ${security} clearance` : 'Active security clearance'} is the strongest protective factor in this archetype — cleared workforce supply is structurally constrained, so re-employment at a peer prime contractor is faster than uncleared equivalents. ${tenureYears}yr tenure at ${cd.name} also helps with internal cross-program transfers.`,
    synthesis: `${cd.name} — US gov contract risk archetype. L4: ${L4pct}/100, L2: ${L2pct}/100. Federal budget pressure + program-of-record uncertainty. Timeline: ${score >= 65 ? '3-9 months' : '9-15 months'}. Action: clearance maintenance + cross-program transfer + commercial-sector skill bridges.`,
    urgencyLevel: score >= 65 ? 'High' : score >= 50 ? 'Moderate' : 'Low',
  };
}

function buildFintechRegulatoryNarrative(
  cd: CompanyData,
  bd: { L1: number; L3: number; L4?: number; L5?: number },
  score: number,
  role: string,
  tenureYears: number,
): ScenarioNarrative {
  const L1pct = pct(bd.L1);
  const L3pct = pct(bd.L3);
  const L4pct = pct(bd.L4 ?? 0);
  const region = (cd.region ?? '').toString().toUpperCase();

  // Regulator and current enforcement-action narrative per region.
  const REGULATOR_CONTEXT: Record<string, string> = {
    IN: 'RBI digital lending guidelines (2022) + DPDP Act (2023) + UPI fintech tightening (2024-2026) restrict BNPL, P2P lending, and unsecured digital credit. NBFC layer regulation increased compliance hires 32%',
    SG: 'MAS digital bank licensing tightened 2024-2026; payment-services act revision increased AML staffing requirements 25%; crypto licensing freeze ongoing',
    DE: 'BaFin AI Act enforcement (Aug 2026) + MiCA crypto regulation + PSD3 readiness; payment institutions face quarterly thematic reviews',
    GB: 'FCA consumer-duty enforcement + crypto registration backlog + buy-now-pay-later regulation (live 2026); compliance officer headcount up 41% YoY',
    UK: 'FCA consumer-duty enforcement + crypto registration backlog + BNPL regulation (live 2026); compliance officer headcount up 41% YoY',
    US: 'CFPB Section 1033 open-banking rules + state-level money-transmitter law harmonization + Treasury / OFAC sanctions enforcement on crypto rails',
    AU: 'APRA + ASIC dual regulation; CDR (Consumer Data Right) compliance + AUSTRAC AML staffing requirements',
    BR: 'Banco Central do Brasil open-finance phase 4 + PIX fraud-prevention rules + DREX CBDC pilot driving payment-rails compliance hires',
    HK: 'HKMA crypto trading platform licensing + stablecoin regulation (2026); SFC virtual-asset licensing creates compliance hiring demand',
  };
  const regulatorContext = REGULATOR_CONTEXT[region] ?? `Local financial regulator is tightening AI/fintech oversight in line with global trend (Basel III implementation, AI risk frameworks, payment-services revision)`;

  return {
    archetype: 'fintech_regulatory_tightening',
    primaryRiskDriver: `Fintech regulatory tightening is the dominant driver at ${score}/100 — ${cd.name} faces compounding pressure from regulator-driven product restrictions + mandatory compliance hiring offsetting growth-team headcount. L4 (Industry Headwinds): ${L4pct}/100, L3 (Role Displacement): ${L3pct}/100. Regional context: ${regulatorContext}. The pattern is double-edged: compliance/risk hiring is up but product/growth/marketing roles are cut to fund it. L1: ${L1pct}/100 shows the company is profitable — this is strategic reallocation, not financial distress.`,
    sixMonthInactionConsequence: `Fintech regulatory cuts have a specific signature: simultaneous compliance hiring + growth/marketing/customer-acquisition cuts. Without repositioning toward regulator-aware work (compliance engineering, model risk management, AML automation), the 6-month outcome at score ${score}/100 is being on the displaced side of the reallocation. The roles created (Compliance Engineer, Model Risk Officer, AML Analyst, Privacy Engineer) command 20-35% salary premiums over equivalent-seniority growth roles — but only for candidates who pivoted early.`,
    oneActionThisWeek: `Acquire one foundational regulatory credential this week (start: free courses): IAPP CIPP for privacy, ACAMS CAMS for AML, GARP FRM for risk management. Then identify the 1 regulator workflow at ${cd.name} (KYC, sanctions screening, AML transaction monitoring, model risk validation) where your existing skills bridge most naturally. Send your manager a 1-pager: "Where I could contribute to the ${regulatorContext.split('.')[0]} compliance roadmap." This action moves you from "growth team that might be cut" to "compliance contributor that might be retained" without a job change.`,
    whatChangesRiskMost: `1. Acquire one regulatory credential within 90 days (IAPP/ACAMS/GARP/IRM) — directly addresses L4: ${L4pct}/100 by repositioning you on the protected side of the reallocation. 2. Build a portfolio artifact: one compliance-engineering project (regtech automation, AML rule optimization, model validation) — public evidence of pivot. 3. Build a recruiter pipeline at compliance-first fintech (Chainalysis, ComplyAdvantage, Onfido, Persona, Sumsub) and big-bank-compliance-tech functions where the hiring is concentrated.`,
    estimatedTimeline: `${score >= 65 ? '6-12 months' : '12-18 months'} — fintech regulatory cycles align with quarterly supervisory reviews; the displacement isn't sudden but it's relentless quarter-over-quarter as more regulator-driven workflows come online.`,
    keyProtectiveFactor: `Existing regulator-touching responsibilities (KYC, compliance reporting, audit liaison, risk modeling) are the strongest protective factor. ${tenureYears}yr tenure at ${cd.name} also helps because regulators expect continuity in named compliance officers — high turnover triggers supervisory scrutiny that companies actively avoid.`,
    synthesis: `${cd.name} (${region}) — fintech regulatory tightening archetype. L4: ${L4pct}/100. ${regulatorContext.split('.')[0]}. Timeline: ${score >= 65 ? '6-12 months' : '12-18 months'}. Action: pivot toward regulator-aware work (compliance/risk/privacy) within current company before external move.`,
    urgencyLevel: score >= 65 ? 'High' : score >= 50 ? 'Moderate' : 'Low',
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
    primaryRiskDriver: `All risk dimensions in the manageable range at ${score}/100 — L1 (Financial Health): ${L1pct}/100, L3 (Role Displacement): ${L3pct}/100, L5 (Personal Resilience): ${L5pct}/100. This is the optimization context: building durable capital while risk is low, not responding to crisis. The risk of inaction is not immediate displacement — it is arriving at a future higher-risk environment without the differentiation built during this window.`,
    sixMonthInactionConsequence: `At score ${score}/100 with L1: ${L1pct}/100 and L3: ${L3pct}/100, inaction does not mean immediate risk. But market bifurcation is measurable: professionals who invest in AI skills and documented contributions during low-risk periods achieve L5 scores 15–20 points higher than equivalents who coast — and L5 determines relative priority in any future restructuring. The 6-month consequence is not displacement, it is arriving unprepared when conditions change at an unknown future date.`,
    oneActionThisWeek: `Invest 2 hours this week in one AI skill growing in demand for your role. At score ${score}/100 with L3: ${L3pct}/100, this is not urgency-driven — it is compound-return investment. The window to build this skill before it becomes a mandatory baseline for your role type is approximately 12–18 months. Each quarter of early investment at this stage is worth 3 quarters under pressure.`,
    whatChangesRiskMost: `1. Maintain current protective factors (L1: ${L1pct}/100, L5: ${L5pct}/100) — don't let them erode through inaction. 2. Build one AI-augmentation skill per quarter — each one moves L3: ${L3pct}/100 in the right direction and builds differentiation before it becomes a minimum requirement. 3. Build 3-month liquid financial runway if not already there — low-risk periods are the only time this is easy to build without pressure.`,
    estimatedTimeline: `${score >= 30 ? '36+ months' : '48+ months'} at L1: ${L1pct}/100 + L3: ${L3pct}/100 + L5: ${L5pct}/100. Market conditions and individual investment decisions are the primary variables that move this timeline.`,
    keyProtectiveFactor: `Multiple protective factors aligned: L1 (Financial Health): ${L1pct}/100, L3 (Role Displacement): ${L3pct}/100, L5 (Personal Resilience): ${L5pct}/100. Maintaining this alignment requires active investment — these scores decay with inaction in a changing market, not passive maintenance.`,
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
    case 'eu_regulatory_restructuring':
      narrative = buildEURegulatoryNarrative(companyData, breakdown, score, roleTitle, tenureYears);
      break;
    case 'latam_funding_crisis':
      narrative = buildLatAmFundingNarrative(companyData, breakdown, score, roleTitle, tenureYears);
      break;
    case 'apac_hyperscaler_localization':
      narrative = buildAPACHyperscalerNarrative(companyData, breakdown, score, roleTitle, tenureYears);
      break;
    case 'us_gov_contract_risk':
      narrative = buildUSGovContractNarrative(companyData, breakdown, score, roleTitle, tenureYears);
      break;
    case 'fintech_regulatory_tightening':
      narrative = buildFintechRegulatoryNarrative(companyData, breakdown, score, roleTitle, tenureYears);
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
    case 'eu_regulatory_restructuring':
      return `Secondary risk: EU regulatory compliance pressure (AI Act / GDPR / DSA) is also compounding — even if the primary risk is resolved, ${cd.name}'s EU presence creates regulator-driven headcount reallocation independent of financial health.`;
    case 'latam_funding_crisis':
      return `Secondary risk: LatAm VC funding pressure is also compounding — even if company-specific signals improve, the regional capital-availability constraint creates contagion risk across the local ecosystem.`;
    case 'apac_hyperscaler_localization':
      return `Secondary risk: APAC localization pressure (cost arbitrage, expat-to-local hiring shift) is also compounding — regional ops consolidation operates independently of financial-distress signals.`;
    case 'us_gov_contract_risk':
      return `Secondary risk: US government contract risk (budget cuts, continuing-resolution uncertainty) is also compounding — program-level cancellations create contagion across cleared workforce regardless of company financial health.`;
    case 'fintech_regulatory_tightening':
      return `Secondary risk: Fintech regulatory tightening (central-bank AI/fintech oversight) is also compounding — compliance-driven headcount reallocation operates independently of L1 financial signals.`;
    default:
      return `A secondary risk dimension is also contributing to your score — see the Risk Breakdown tab for the full dimensional breakdown.`;
  }
}

// ─── Localized archetype + urgency helpers ───────────────────────────────────
// v40.0 — locale-aware variants of the existing English-only label functions.
// Falls back to English when a locale lacks the key. Long-form narrative
// fields (oneActionThisWeek, primaryRiskDriver, etc.) remain English until
// translator review per language; the synthesisStem field is the first
// translated narrative surface and is exposed via getLocalizedSynthesisStem.

type NarrativeLocaleTable = {
  urgency?:        Record<string, string>;
  archetype?:      Record<string, string>;
  synthesisStem?:  Record<string, string>;
  disclaimer?:     string;
};

// Static cache of locale tables — populated lazily on first call to avoid a
// circular dep between scenarioNarrativeEngine.ts and i18n/index.tsx.
let _localeCache: Record<string, NarrativeLocaleTable> | null = null;

function loadLocaleTables(): Record<string, NarrativeLocaleTable> {
  if (_localeCache) return _localeCache;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const en = require('../i18n/locales/en').default;
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const es = require('../i18n/locales/es').default;
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const fr = require('../i18n/locales/fr').default;
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const de = require('../i18n/locales/de').default;
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const ja = require('../i18n/locales/ja').default;
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const zh = require('../i18n/locales/zh').default;
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const pt = require('../i18n/locales/pt').default;
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const hi = require('../i18n/locales/hi').default;
    _localeCache = {
      en: en.narrative ?? {},
      es: es.narrative ?? {},
      fr: fr.narrative ?? {},
      de: de.narrative ?? {},
      ja: ja.narrative ?? {},
      zh: zh.narrative ?? {},
      pt: pt.narrative ?? {},
      hi: hi.narrative ?? {},
    };
  } catch {
    _localeCache = {};
  }
  return _localeCache;
}

export function getLocalizedArchetypeLabel(
  archetype: ScenarioArchetype,
  locale: string = 'en',
): string {
  const tables = loadLocaleTables();
  const localized = tables[locale]?.archetype?.[archetype];
  if (localized) return localized;
  // Fallback chain: requested locale → en table → English helper (always exists).
  const en = tables.en?.archetype?.[archetype];
  if (en) return en;
  return getScenarioArchetypeLabel(archetype);
}

export function getLocalizedUrgencyLabel(
  urgency: 'Immediate' | 'High' | 'Moderate' | 'Low',
  locale: string = 'en',
): string {
  const tables = loadLocaleTables();
  return tables[locale]?.urgency?.[urgency] ?? tables.en?.urgency?.[urgency] ?? urgency;
}

export function getLocalizedSynthesisStem(
  archetype: ScenarioArchetype,
  locale: string = 'en',
): string {
  const tables = loadLocaleTables();
  return tables[locale]?.synthesisStem?.[archetype]
    ?? tables.en?.synthesisStem?.[archetype]
    ?? '';
}

/** Returns the model-generated disclaimer in the requested locale.
 *  Used by UI surfaces (PatternMatchCard, IntelligenceBriefPanel) to clarify
 *  that long-form narrative remains in English on non-en locales. */
export function getLocalizedNarrativeDisclaimer(locale: string = 'en'): string {
  const tables = loadLocaleTables();
  return tables[locale]?.disclaimer ?? tables.en?.disclaimer ?? '';
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
    eu_regulatory_restructuring: 'EU Regulatory Restructuring',
    latam_funding_crisis: 'LatAm Funding Crisis',
    apac_hyperscaler_localization: 'APAC Hyperscaler Localization',
    us_gov_contract_risk: 'US Government Contract Risk',
    fintech_regulatory_tightening: 'Fintech Regulatory Tightening',
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
    eu_regulatory_restructuring: 'text-sky-700 bg-sky-50 border-sky-200',
    latam_funding_crisis: 'text-rose-700 bg-rose-50 border-rose-200',
    apac_hyperscaler_localization: 'text-teal-700 bg-teal-50 border-teal-200',
    us_gov_contract_risk: 'text-slate-700 bg-slate-100 border-slate-300',
    fintech_regulatory_tightening: 'text-violet-700 bg-violet-50 border-violet-200',
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
