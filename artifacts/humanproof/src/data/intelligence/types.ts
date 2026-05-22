// ═══════════════════════════════════════════════════════════════════════════
// types.ts — Career Intelligence Type Definitions v2.0
// ═══════════════════════════════════════════════════════════════════════════

export interface SkillDemandLive {
  /**
   * Active job postings on Naukri+LinkedIn for roles requiring this skill.
   * Source: market_intelligence_cache via refresh-market-intelligence Edge Function.
   * Null when the cache has no entry for this skill category.
   */
  liveJobCount: number | null;
  /**
   * Change in job postings vs 90 days prior (absolute count delta).
   * Positive = demand rising. Negative = demand contracting.
   * Null when historical comparison data unavailable.
   */
  delta90d: number | null;
  /** ISO date string of when the Serper/Naukri count was measured. */
  dataAsOf: string;
  /** Derived trend from count comparison. */
  demandTrend: 'surging' | 'growing' | 'stable' | 'contracting';
  /**
   * Data age in days at render time.
   * Freshness thresholds:
   *   ≤ 7 days  → 🟢 Live badge (within weekly refresh SLA)
   *   8–90 days → 🟡 "N days old" amber label
   *   > 90 days → 🔴 Stale — data verification recommended
   */
  ageInDays: number;
  /**
   * Outcome of the last refresh attempt — propagated from market_intelligence_cache.scrape_status.
   * Enables the UI to distinguish scheduled staleness from a blocked/failed scrape.
   * Optional: null on rows written before migration 20260522000002.
   */
  scrapeStatus?: string | null;
  /**
   * Timestamp of the last SUCCESSFUL scrape (only updated when scrape_status='success').
   * When scrapeStatus is 'source_blocked' or 'rate_limited', this preserves the last
   * known-good timestamp so the UI can show: "source blocked — last good data: 14d ago".
   */
  lastSuccessfulScrapeAt?: string | null;
}

/**
 * CompanySkillDemandLive — company-specific demand signal for a skill.
 *
 * Source: company_skill_demand_cache, populated by naukriConnector after
 * each successful live scrape for this company × role_prefix combination.
 *
 * CRITICAL LABELING RULE:
 *   This is a DIFFERENT confidence level from SkillDemandLive (industry/role-level).
 *   When companyDemand is present, the industry-level demandLive MUST be suppressed.
 *   Never render both simultaneously — they would imply equal confidence.
 *
 * Delta thresholds (applied in applyCompanySkillOverlay):
 *   delta90dPct < -25 → skill becomes at_risk (company is cutting this role)
 *   delta90dPct > +30 → safe skill gets "demand rising" reinforcement
 */
export interface CompanySkillDemandLive {
  /** The company this signal belongs to. */
  companyName: string;
  /**
   * Percentage change in openings vs the previous snapshot (~30–90 days ago).
   * Null on first scrape (no historical comparison available yet).
   */
  delta90dPct: number | null;
  /** Current total openings at this company for roles requiring this skill. */
  currentOpenings: number | null;
  /** Demand direction derived from the trend label. */
  demandTrend: 'surging' | 'growing' | 'stable' | 'contracting';
  /** ISO timestamp when the Naukri/LinkedIn data was collected. */
  scrapedAt: string;
  /** Days since scrapedAt — drives the freshness badge. */
  ageInDays: number;
}

export interface SkillRisk {
  skill: string;
  riskScore: number;        // 0–100
  riskType: 'Automatable' | 'Augmented' | 'Safe' | string;
  horizon: '1-3yr' | '3-5yr' | '5yr+' | string;
  reason: string;
  aiReplacement: 'Full' | 'Partial' | 'None' | string;
  aiTool?: string;
  /** Industry/role-level demand overlay from market_intelligence_cache. Suppressed when companyDemand is present. */
  demandLive?: SkillDemandLive;
  /** Company-specific demand signal from company_skill_demand_cache. Mutually exclusive with demandLive in the UI. */
  companyDemand?: CompanySkillDemandLive;
}

export interface SafeSkill {
  skill: string;
  whySafe: string;
  longTermValue: number;    // 0–100
  difficulty: 'Low' | 'Medium' | 'High' | 'Very High' | 'Extremely High' | string;
  resource?: string;
  /** Industry/role-level demand overlay from market_intelligence_cache. Suppressed when companyDemand is present. */
  demandLive?: SkillDemandLive;
  /** Company-specific demand signal from company_skill_demand_cache. Mutually exclusive with demandLive in the UI. */
  companyDemand?: CompanySkillDemandLive;
}

export interface CareerPath {
  role: string;
  riskReduction: number;    // percentage points
  skillGap: string;
  transitionDifficulty: 'Easy' | 'Medium' | 'Hard' | 'Very Hard' | string;
  industryMapping: string[];
  salaryDelta: string;
  timeToTransition: string;
  /** v4.0: Months from starting the transition to receiving first paycheck in the new role.
   *  Lateral (same function): 2–4. Function pivot: 4–8. Cross-domain: 8–14. Entrepreneurial: 6–18. */
  months_to_first_income?: number;
  /** v4.0: Months of reduced (or zero) income during the transition window.
   *  0 = no income gap (internal move). 1–3 = short gap. 4–8 = significant gap. */
  income_dip_months?: number;
  /**
   * v6.0 Fix 8: Uniqueness-depth visibility filter.
   * 'all' = shown to every user.
   * 'generic_and_specialist' = NOT shown to critical_knowledge holders (irrelevant to them).
   * 'specialist_and_critical' = NOT shown to generic role holders.
   * 'critical_only' = only shown to critical_knowledge holders (institutional → advisory paths).
   * When omitted, treated as 'all'.
   */
  uniquenessDepthFilter?: 'all' | 'generic_and_specialist' | 'specialist_and_critical' | 'critical_only';
}

export interface RoadmapAction {
  action: string;
  why: string;
  outcome: string;
  tool?: string;
}

export interface RoadmapPhase {
  timeline: string;
  focus: string;
  actions: RoadmapAction[];
}

export interface ExperienceRoadmap {
  phase_1: RoadmapPhase;
  phase_2?: RoadmapPhase;
  phase_3?: RoadmapPhase;
}

export interface TrendPoint {
  year: number;
  riskScore: number;
  label: string;
}

/**
 * SeniorityProfile — multi-level risk differentiation per seniority band
 * Enables the system to show different risk/salary/pivot advice for juniors vs seniors
 */
export interface SeniorityProfile {
  level: 'entry' | 'mid' | 'senior' | 'principal' | 'executive';
  typicalYearsExp: string;       // e.g. '0-2', '5-10', '20+'
  riskDelta: number;             // offset from base total score (negative = more protected)
  keySkills: string[];           // skills that matter most at this level
  salaryBand: string;            // e.g. '$40k-$80k'
  primaryRisk: string;           // 1-line risk summary for this level
}

/**
 * CountryCluster — which regional cluster a country belongs to
 * Used by countryIntelligenceModifier.ts to apply localized intelligence overlays
 */
export type CountryCluster = 'south_asia' | 'north_america' | 'europe' | 'gcc' | 'sea' | 'latam' | 'africa' | 'east_asia' | 'oceania';

/**
 * CareerIntelligence — the core data record for every seeded role
 * v2.0 adds: contextTags, seniority, countryModifiers, evolutionHorizon
 */
export interface CareerIntelligence {
  displayRole: string;
  summary: string;
  skills: {
    obsolete?: SkillRisk[];
    at_risk?: SkillRisk[];
    safe: SafeSkill[];
  };
  careerPaths: CareerPath[];
  roadmap?: {
    '0-2'?: ExperienceRoadmap;
    '2-5'?: ExperienceRoadmap;
    '5-10'?: ExperienceRoadmap;
    '10-20'?: ExperienceRoadmap;
    '20+'?: ExperienceRoadmap;
  };
  inactionScenario?: string;
  riskTrend?: TrendPoint[];
  confidenceScore?: number;
  /** v2.0 additions below */
  contextTags?: string[];          // e.g. ['high-risk', 'tech', 'creative', 'entry-sensitive']
  seniority?: SeniorityProfile[];  // multi-level risk by experience band
  countryModifiers?: Partial<Record<CountryCluster, { // sparse country-specific overrides
    summaryAppend?: string;
    inactionAppend?: string;
    safeSkillAppend?: SafeSkill[];
    careerPathOverride?: CareerPath[];
    salaryContext?: string;
    platformRecs?: string[];
  }>>;
  evolutionHorizon?: string;        // e.g. '2027' — when to re-assess this role's risk data
}
