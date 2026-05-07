// competitiveIntelligenceEngine.ts
// v11.0: Talent supply vs. demand intelligence.
// Answers: "If I were laid off today, how many people am I competing against for
// the same roles, and how does that affect my salary and time-to-offer?"
//
// Key insight: Job security is not just about your company's risk — it is about
// your alternatives. A person in a highly demanded role with few competitors
// has far more leverage than the score alone implies.
//
// Model inputs:
//   role demand velocity (from jobMarketLiquidityService baseline data)
//   supply index (candidates per open role by role + region + experience level)
//   salary preservation probability under competitive conditions
//   geographic arbitrage opportunity (remote vs. local)

export type TalentMarketTightness =
  | "EXTREMELY_TIGHT"   // <5 candidates/role — employer's market for talent
  | "TIGHT"             // 5–15 candidates/role — candidate has leverage
  | "BALANCED"          // 15–30 candidates/role — neutral negotiation
  | "LOOSE"             // 30–60 candidates/role — employer advantage
  | "FLOODED"           // >60 candidates/role — highly competitive, salary pressure

export type GeographicArbitrage =
  | "STRONG_ARBITRAGE"  // remote-first role allows access to higher-paying markets
  | "MODERATE_ARBITRAGE"
  | "MINIMAL_ARBITRAGE"
  | "NO_ARBITRAGE";     // role is location-bound

export interface CompetitiveIntelligenceResult {
  /** Candidates per open role for this role+region combination */
  candidatesPerRole: number;
  /** Characterization of the talent market tightness */
  marketTightness: TalentMarketTightness;
  /** Time-to-first-offer under current competition level (weeks) */
  estimatedWeeksToOffer: number;
  /** Salary preservation probability (0–100%) under this competition level */
  salaryPreservationPct: number;
  /** Whether the user has a competitive edge (rare skills, certifications, domain depth) */
  hasCompetitiveEdge: boolean;
  /** User's competitive position percentile among competing candidates */
  competitivePositionPercentile: number;
  /** Geographic arbitrage opportunity */
  geographicArbitrage: GeographicArbitrage;
  /** Salary uplift opportunity from geographic arbitrage (% above current) */
  geographicUpliftPct: number;
  /** Best alternative markets for this role */
  topAlternativeMarkets: string[];
  /** Human-readable competitive brief */
  competitiveBrief: string;
  /** Salary negotiation leverage: HIGH when market is tight, LOW when flooded */
  negotiationLeverage: "HIGH" | "MEDIUM" | "LOW";
  /** Recommended positioning actions */
  positioningActions: string[];
}

export interface CompetitiveIntelligenceInputs {
  oracleKey: string;
  industry: string;
  region: string;
  tenureYears: number;
  riskScore: number;
  uniquenessDepth?: "generic" | "functional_specialist" | "critical_knowledge";
  performanceTier?: "top" | "average" | "below" | "unknown";
  hasAiSkills?: boolean;
  financialRunwayMonths?: number;
  currentSalaryBand?: "entry" | "mid" | "senior" | "staff" | "principal";
  /** From jobMarketLiquidityService — overrides internal demand estimate when available */
  jobMarketLiquidityScore?: number;
  /** From jobMarketLiquidityService — overrides internal salary preservation estimate when available */
  externalSalaryPreservationPct?: number;
}

// ─── Role-level supply/demand baseline data ──────────────────────────────────
// Candidates per role estimate at balanced market conditions (2024–2026 data)
// Lower = tighter = better for the candidate

const ROLE_SUPPLY_INDEX: Record<string, number> = {
  // Engineering — tight markets
  ml_engineer: 8,
  staff_engineer: 7,
  principal_engineer: 6,
  platform_engineer: 9,
  sre: 10,
  devops_engineer: 11,
  security_engineer: 8,
  // Engineering — balanced
  software_engineer: 22,
  senior_engineer: 18,
  backend_developer: 21,
  frontend_developer: 24,
  fullstack_developer: 20,
  mobile_developer: 16,
  // Engineering — loose
  junior_developer: 48,
  // Product
  product_manager: 28,
  senior_pm: 22,
  product_designer: 19,
  // Data
  data_scientist: 18,
  data_engineer: 14,
  data_analyst: 32,
  // Business operations — loose
  business_analyst: 44,
  project_manager: 38,
  operations_manager: 35,
  // Sales
  account_executive: 26,
  sales_executive: 24,
  customer_success: 30,
  // Support — flooded
  customer_support: 68,
  // HR — balanced-loose
  recruiter: 42,
  hr_generalist: 36,
  // Marketing — loose
  marketing_manager: 40,
  content_writer: 65,
  // Finance / Legal — tight-balanced
  finance_analyst: 30,
  legal_counsel: 25,
  // Default
  generic: 35,
};

// ─── Regional multipliers ────────────────────────────────────────────────────
// >1 = more competitive (more candidates), <1 = less competitive (fewer candidates)

const REGION_SUPPLY_MULTIPLIER: Record<string, number> = {
  "IN": 1.45,   // India — large talent pool, high supply
  "US": 0.90,   // USA — tight market overall
  "CA": 0.95,   // Canada
  "GB": 0.92,   // UK
  "DE": 0.88,   // Germany
  "SG": 0.85,   // Singapore — very tight
  "AU": 0.91,   // Australia
  "GLOBAL": 1.0,
};

// ─── Seniority multipliers (more senior = fewer competitors) ─────────────────

function getSeniorityMultiplier(tenureYears: number): number {
  if (tenureYears >= 15) return 0.55;
  if (tenureYears >= 10) return 0.65;
  if (tenureYears >= 7) return 0.75;
  if (tenureYears >= 4) return 0.90;
  if (tenureYears >= 2) return 1.0;
  return 1.35; // junior = most competition
}

// ─── Geographic arbitrage by role + region ───────────────────────────────────

const REMOTE_FRIENDLY_ROLES = new Set([
  "software_engineer", "senior_engineer", "backend_developer", "frontend_developer",
  "fullstack_developer", "ml_engineer", "data_engineer", "data_scientist",
  "devops_engineer", "sre", "platform_engineer", "security_engineer",
  "product_manager", "product_designer", "content_writer", "marketing_manager",
]);

function computeGeographicArbitrage(
  oracleKey: string,
  region: string,
): { arbitrage: GeographicArbitrage; upliftPct: number; topMarkets: string[] } {
  const isRemoteFriendly = REMOTE_FRIENDLY_ROLES.has(oracleKey);

  if (region === "IN" && isRemoteFriendly) {
    return {
      arbitrage: "STRONG_ARBITRAGE",
      upliftPct: 35,
      topMarkets: ["Singapore (remote)", "US remote", "Germany (remote)", "Netherlands (remote)"],
    };
  }
  if (region === "IN" && !isRemoteFriendly) {
    return {
      arbitrage: "MINIMAL_ARBITRAGE",
      upliftPct: 8,
      topMarkets: ["Bangalore", "Hyderabad", "Pune"],
    };
  }
  if ((region === "US" || region === "CA") && isRemoteFriendly) {
    return {
      arbitrage: "MODERATE_ARBITRAGE",
      upliftPct: 12,
      topMarkets: ["Seattle", "Austin", "NYC", "Toronto"],
    };
  }
  if (region === "GB" && isRemoteFriendly) {
    return {
      arbitrage: "MODERATE_ARBITRAGE",
      upliftPct: 15,
      topMarkets: ["Amsterdam", "Berlin", "Dublin"],
    };
  }

  return {
    arbitrage: "MINIMAL_ARBITRAGE",
    upliftPct: 5,
    topMarkets: [],
  };
}

// ─── Competitive position scoring ────────────────────────────────────────────

function computeCompetitivePosition(inputs: CompetitiveIntelligenceInputs): number {
  let percentile = 50; // start at median

  // Senior = above median
  if (inputs.tenureYears >= 10) percentile += 20;
  else if (inputs.tenureYears >= 7) percentile += 12;
  else if (inputs.tenureYears >= 4) percentile += 5;
  else if (inputs.tenureYears < 2) percentile -= 15;

  // AI skills = significant differentiator (2024–2026 market)
  if (inputs.hasAiSkills) percentile += 15;

  // Performance
  if (inputs.performanceTier === "top") percentile += 12;
  else if (inputs.performanceTier === "below") percentile -= 18;

  // Uniqueness
  if (inputs.uniquenessDepth === "critical_knowledge") percentile += 20;
  else if (inputs.uniquenessDepth === "functional_specialist") percentile += 10;

  return Math.max(5, Math.min(98, percentile));
}

// ─── Time-to-offer estimation ────────────────────────────────────────────────

function estimateWeeksToOffer(
  candidatesPerRole: number,
  competitivePositionPct: number,
  marketTightness: TalentMarketTightness,
): number {
  const baseWeeks: Record<TalentMarketTightness, number> = {
    EXTREMELY_TIGHT: 4,
    TIGHT: 6,
    BALANCED: 9,
    LOOSE: 14,
    FLOODED: 20,
  };
  const base = baseWeeks[marketTightness];

  // Above-median candidates get offers faster
  const speedMultiplier = competitivePositionPct >= 80 ? 0.65
    : competitivePositionPct >= 65 ? 0.80
    : competitivePositionPct >= 50 ? 1.0
    : competitivePositionPct >= 35 ? 1.25
    : 1.55;

  return Math.round(base * speedMultiplier);
}

// ─── Salary preservation under competition ───────────────────────────────────

function computeSalaryPreservationPct(
  marketTightness: TalentMarketTightness,
  competitivePositionPct: number,
  hasAiSkills: boolean,
): number {
  const basePreservation: Record<TalentMarketTightness, number> = {
    EXTREMELY_TIGHT: 110, // can command premium above current salary
    TIGHT: 102,
    BALANCED: 95,
    LOOSE: 85,
    FLOODED: 72,
  };

  let preservation = basePreservation[marketTightness];

  // Above-median candidates can preserve/grow salary
  if (competitivePositionPct >= 80) preservation += 8;
  else if (competitivePositionPct <= 35) preservation -= 10;

  if (hasAiSkills) preservation += 5;

  return Math.max(55, Math.min(125, preservation));
}

// ─── Main computation ────────────────────────────────────────────────────────

export function computeCompetitiveIntelligence(
  inputs: CompetitiveIntelligenceInputs,
): CompetitiveIntelligenceResult {
  const baseSupplyIndex = ROLE_SUPPLY_INDEX[inputs.oracleKey] ?? ROLE_SUPPLY_INDEX["generic"];
  const regionMultiplier = REGION_SUPPLY_MULTIPLIER[inputs.region] ?? 1.0;
  const seniorityMultiplier = getSeniorityMultiplier(inputs.tenureYears);

  // If external liquidity score is available, blend it into the supply index.
  // High liquidity (fast re-employment) implies tight market — fewer competitors.
  // Low liquidity implies loose market — adjust supply index upward.
  const liquidityAdjustment = inputs.jobMarketLiquidityScore !== undefined
    ? 1.0 + ((50 - inputs.jobMarketLiquidityScore) / 100) * 0.4  // ±20% adjustment
    : 1.0;

  const candidatesPerRole = Math.round(
    baseSupplyIndex * regionMultiplier * seniorityMultiplier * liquidityAdjustment,
  );

  const marketTightness: TalentMarketTightness =
    candidatesPerRole < 5  ? "EXTREMELY_TIGHT"
    : candidatesPerRole < 15 ? "TIGHT"
    : candidatesPerRole < 30 ? "BALANCED"
    : candidatesPerRole < 60 ? "LOOSE"
    : "FLOODED";

  const competitivePositionPercentile = computeCompetitivePosition(inputs);

  const hasCompetitiveEdge =
    competitivePositionPercentile >= 70 ||
    inputs.uniquenessDepth === "critical_knowledge" ||
    (inputs.hasAiSkills && inputs.tenureYears >= 4);

  const { arbitrage, upliftPct, topMarkets } = computeGeographicArbitrage(
    inputs.oracleKey,
    inputs.region,
  );

  const estimatedWeeksToOffer = estimateWeeksToOffer(
    candidatesPerRole,
    competitivePositionPercentile,
    marketTightness,
  );

  // Use the external salary preservation if provided (jobMarketLiquidityService is more
  // role-specific). Fall back to the internal model when unavailable.
  const salaryPreservationPct = inputs.externalSalaryPreservationPct !== undefined
    ? Math.max(55, Math.min(125, inputs.externalSalaryPreservationPct))
    : computeSalaryPreservationPct(
        marketTightness,
        competitivePositionPercentile,
        inputs.hasAiSkills ?? false,
      );

  const negotiationLeverage: CompetitiveIntelligenceResult["negotiationLeverage"] =
    marketTightness === "EXTREMELY_TIGHT" || marketTightness === "TIGHT" ? "HIGH"
    : marketTightness === "BALANCED" ? "MEDIUM"
    : "LOW";

  const competitiveBrief = buildCompetitiveBrief(
    inputs,
    candidatesPerRole,
    marketTightness,
    competitivePositionPercentile,
    estimatedWeeksToOffer,
    salaryPreservationPct,
  );

  const positioningActions = buildPositioningActions(
    inputs,
    marketTightness,
    hasCompetitiveEdge,
    arbitrage,
    topMarkets,
  );

  return {
    candidatesPerRole,
    marketTightness,
    estimatedWeeksToOffer,
    salaryPreservationPct,
    hasCompetitiveEdge,
    competitivePositionPercentile,
    geographicArbitrage: arbitrage,
    geographicUpliftPct: upliftPct,
    topAlternativeMarkets: topMarkets,
    competitiveBrief,
    negotiationLeverage,
    positioningActions,
  };
}

function buildCompetitiveBrief(
  inputs: CompetitiveIntelligenceInputs,
  candidatesPerRole: number,
  tightness: TalentMarketTightness,
  percentile: number,
  weeksToOffer: number,
  salaryPct: number,
): string {
  const roleDisplay = inputs.oracleKey.replace(/_/g, " ");
  const regionDisplay = inputs.region === "IN" ? "India" : inputs.region === "US" ? "the US" : inputs.region;

  const tightnessDesc: Record<TalentMarketTightness, string> = {
    EXTREMELY_TIGHT: "extremely tight (strong candidate leverage)",
    TIGHT: "tight (candidate-favourable)",
    BALANCED: "balanced",
    LOOSE: "loose (employer-favourable)",
    FLOODED: "heavily flooded (high competition)",
  };

  return `The ${roleDisplay} market in ${regionDisplay} is ${tightnessDesc[tightness]}, with approximately ${candidatesPerRole} competing candidates per open role. At the ${percentile}th percentile of candidate quality for your profile, you can expect your first qualified offer in approximately ${weeksToOffer} weeks with a salary preservation rate of ~${salaryPct}% of your current compensation. ${salaryPct > 100 ? "Market tightness gives you salary growth leverage." : salaryPct >= 90 ? "You can likely preserve most of your compensation." : "Expect salary pressure in this competitive environment — counter with differentiation."}`;
}

function buildPositioningActions(
  inputs: CompetitiveIntelligenceInputs,
  tightness: TalentMarketTightness,
  hasEdge: boolean,
  arbitrage: GeographicArbitrage,
  topMarkets: string[],
): string[] {
  const actions: string[] = [];

  if (tightness === "FLOODED" || tightness === "LOOSE") {
    actions.push("High competition detected — differentiate by showcasing measurable outcomes (not just responsibilities) on your resume and LinkedIn");
    if (!inputs.hasAiSkills) {
      actions.push("AI skills are the single fastest competitive differentiator in this market — 3–4 weeks of focused learning can shift your percentile position significantly");
    }
  }

  if (arbitrage === "STRONG_ARBITRAGE" && topMarkets.length > 0) {
    actions.push(`Geographic arbitrage available — target ${topMarkets.slice(0, 2).join(" or ")} for ${inputs.oracleKey.replace(/_/g, " ")} roles: estimated ${inputs.region === "IN" ? "35–50% salary uplift" : "15–20% salary uplift"} for remote positions`);
  }

  if (hasEdge) {
    actions.push("Your competitive position is above median — leverage this by targeting roles at the next seniority level, not just lateral moves");
  }

  if (inputs.financialRunwayMonths && inputs.financialRunwayMonths >= 6) {
    actions.push(`With ${inputs.financialRunwayMonths} months runway, you have time to be selective — do not accept below-market offers under time pressure`);
  }

  return actions.slice(0, 3);
}
