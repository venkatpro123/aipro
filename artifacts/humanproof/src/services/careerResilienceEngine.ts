// careerResilienceEngine.ts
// v11.0: Composite career resilience scoring.
// Answers: "Even if I get laid off, how resilient is my overall career position?"
//
// Resilience ≠ risk. A person can have a HIGH risk score (bad company) but
// HIGH resilience (in-demand skills, strong network, financial buffer). These are
// orthogonal dimensions — this service captures the one the risk score misses.
//
// Five pillars:
//   P1: Financial Buffer       — runway, emergency fund, income diversification
//   P2: Market Demand          — how wanted this role is in the current market
//   P3: Skill Currency         — are skills modern, AI-adjacent, and differentiated?
//   P4: Career Optionality     — multiple feasible paths vs. single narrow track
//   P5: Professional Network   — warm contacts in alternative companies/roles
//
// Composite score: 0–100
// Classification: FORTRESS / RESILIENT / ADEQUATE / FRAGILE / CRITICAL

import { formatRoleLabel } from "../data/oracleRoleIndex";

export type ResilienceClass =
  | "FORTRESS"    // 80–100: Multiple escape routes, strong demand, financial safety net
  | "RESILIENT"   // 65–79: Well-positioned for transition if needed
  | "ADEQUATE"    // 50–64: Manageable risk, clear improvement areas
  | "FRAGILE"     // 35–49: Multiple vulnerabilities require immediate attention
  | "CRITICAL";   // 0–34: Urgent multi-front improvement needed

export interface ResiliencePillar {
  name: string;
  score: number;        // 0–100
  weight: number;       // contribution weight
  weightedScore: number;
  status: "STRONG" | "ADEQUATE" | "WEAK" | "CRITICAL";
  insight: string;      // one-sentence data-grounded insight
  topAction: string;    // highest-ROI action for this pillar
}

export interface CareerResilienceResult {
  compositeScore: number;
  classification: ResilienceClass;
  pillars: ResiliencePillar[];
  /** The single weakest pillar dragging the score down */
  criticalWeakness: ResiliencePillar;
  /** The single strongest pillar to leverage */
  keyStrength: ResiliencePillar;
  /** Top 3 actions to maximally increase resilience */
  resilienceImprovementPlan: string[];
  /** How this resilience score interacts with the risk score */
  riskResilienceInterpretation: string;
  /** Months of effective career protection this resilience provides */
  effectiveProtectionMonths: number;
  /** Short headline for the UI */
  resilienceHeadline: string;
  /**
   * Applied when hasDependents=true AND dualIncomeHousehold=false (sole earner).
   * Structural constraint on mobility: dependent households cannot absorb the
   * same income gaps, offer-quality trade-offs, or search duration risks as
   * single adults or dual-income households. The P1 Financial Buffer pillar
   * already captures runway thresholds; this modifier captures the broader
   * constraint on all five pillars — the composite score overstates actionable
   * resilience for sole earners who cannot freely take risks during a search.
   * Value: 0.85 when applied, 1.0 (absent) when not applicable.
   */
  familyObligationModifier?: number;
}

export interface ResilienceInputs {
  currentScore: number;
  financialRunwayMonths: number;
  tenureYears: number;
  oracleKey: string;
  industry: string;
  region: string;
  uniquenessDepth?: "generic" | "functional_specialist" | "critical_knowledge";
  /** Sub-classification when uniquenessDepth === 'critical_knowledge'. Drives differentiated
   *  insight text: relationship_based (mobile moat) vs system_specific (migration deadline)
   *  vs domain_expertise (externalize to create optionality). */
  knowledgeType?: "relationship_based" | "system_specific" | "domain_expertise";
  performanceTier?: "top" | "average" | "below" | "unknown";
  hasAiSkills?: boolean;
  hasAlternativeIncome?: boolean;     // freelance, consulting, products
  networkStrengthSelfReport?: "strong" | "moderate" | "weak" | "unknown";
  escapePaths?: number;               // count of viable escape paths (from escapePathOptimizer)
  jobMarketLiquidityScore?: number;   // from jobMarketLiquidityService
  salaryPreservationPct?: number;     // from competitiveIntelligenceEngine
  /**
   * Whether the user supports dependents (children, parents, etc.).
   * Changes runway thresholds in P1 Financial Buffer: industry baseline is 6 months
   * for a single adult; sole earners with dependents need 9+ months because dependent
   * expenses (housing, healthcare, school fees) continue regardless of employment status.
   */
  hasDependents?: boolean;
  /**
   * Whether a second household income exists (spouse/partner employed).
   * A dual-income household has a structural income buffer during job search:
   * the partner's income covers basic household costs even if the runway runs out.
   * A sole earner (hasDependents && !dualIncomeHousehold) has no such buffer.
   */
  dualIncomeHousehold?: boolean;
}

// ─── Pillar 1: Financial Buffer ───────────────────────────────────────────────

function scoreFinancialBuffer(inputs: ResilienceInputs): ResiliencePillar {
  // Guard: clamp negative values to 0 (invalid input should not produce misleading insight)
  const financialRunwayMonths = Math.max(0, inputs.financialRunwayMonths ?? 0);
  const { hasAlternativeIncome } = inputs;

  // Sole earner with dependents: household costs (housing, healthcare, school fees,
  // food) continue at full rate regardless of employment status — there is no second
  // income to absorb even a partial gap. The industry baseline of 6 months assumes
  // a single adult; sole earners with dependents need 9+ months to achieve the same
  // safety-net level. Thresholds are scaled up 50% for this segment.
  const isSoleEarner = !!inputs.hasDependents && !inputs.dualIncomeHousehold;
  const hasDualIncome = !!inputs.hasDependents && !!inputs.dualIncomeHousehold;

  // Runway thresholds in months: { critical, fragile, adequate, strong }
  const T = isSoleEarner
    ? { critical: 4, fragile: 9, adequate: 14, strong: 24 }   // sole earner with dependents
    : hasDualIncome
    ? { critical: 2, fragile: 5, adequate: 10, strong: 16 }   // dual income: partner absorbs household costs
    : { critical: 3, fragile: 6, adequate: 12, strong: 18 };  // baseline: single adult

  let score = 0;
  let insight = "";
  let topAction = "";
  const familyContext = isSoleEarner ? " (sole earner with dependents — 50% higher threshold than single-adult baseline)"
    : hasDualIncome ? " (dual-income household — partner income provides structural buffer)"
    : "";

  if (financialRunwayMonths >= T.strong) {
    score = 90;
    insight = `${financialRunwayMonths}+ months runway eliminates financial pressure during job search${familyContext} — you can afford to be selective.`;
  } else if (financialRunwayMonths >= T.adequate) {
    score = 78;
    insight = `${financialRunwayMonths} months runway gives strong search flexibility${familyContext} — most transitions complete within 6 months.`;
  } else if (financialRunwayMonths >= T.fragile) {
    score = isSoleEarner ? 52 : 60;  // fragile for sole earner even in adequate bracket
    insight = `${financialRunwayMonths} months runway is adequate for the average search but leaves no buffer for a slow market${familyContext}.`;
  } else if (financialRunwayMonths >= T.critical) {
    score = isSoleEarner ? 22 : 38;  // steeper penalty for sole earner below threshold
    insight = isSoleEarner
      ? `${financialRunwayMonths} months runway is critically low for a sole earner with dependents — below the 9-month minimum. Household expenses continue during job search with no second income to offset. This is not just career pressure — it is a family financial risk.`
      : `${financialRunwayMonths} months runway is below the recommended minimum — adds time pressure that reduces offer quality.`;
  } else {
    score = isSoleEarner ? 8 : 15;
    insight = isSoleEarner
      ? `Critical runway gap — under ${T.critical} months with dependents and no second income creates severe household financial risk during a job search. Bridging income is not optional.`
      : `Critical runway gap — under 3 months creates severe time pressure forcing acceptance of below-market offers.`;
  }

  if (hasAlternativeIncome) {
    score = Math.min(100, score + 12);
    insight += " Alternative income source reduces urgency significantly.";
  }
  if (hasDualIncome) {
    insight += " Partner income provides a structural household safety net during transition.";
  }

  if (isSoleEarner && financialRunwayMonths < T.fragile) {
    topAction = `Sole earner with dependents: build to 9 months emergency fund (vs. 6 for single adults) — dependent expenses continue during job search regardless of your employment status. This is the highest-priority resilience investment for your household.`;
  } else if (financialRunwayMonths < T.fragile) {
    topAction = "Build to 6 months liquid emergency fund before anything else — this is the highest-ROI career resilience investment";
  } else if (financialRunwayMonths < T.adequate) {
    topAction = isSoleEarner
      ? `Target ${T.adequate} months runway as next milestone — sole earners with dependents need more buffer than the 6-month average to reduce search pressure and improve offer quality`
      : "Target 12 months runway as next milestone — reduces search pressure and improves offer quality";
  } else if (!hasAlternativeIncome) {
    topAction = "Develop one alternative income stream (consulting, courses, freelance) to further decouple career from single employer";
  } else {
    topAction = "Financial pillar is strong — maintain and protect this buffer";
  }

  return {
    name: "Financial Buffer",
    score: Math.round(score),
    weight: 0.22,
    weightedScore: Math.round(score * 0.22),
    status: score >= 70 ? "STRONG" : score >= 50 ? "ADEQUATE" : score >= 35 ? "WEAK" : "CRITICAL",
    insight,
    topAction,
  };
}

// ─── Pillar 2: Market Demand ─────────────────────────────────────────────────

function scoreMarketDemand(inputs: ResilienceInputs): ResiliencePillar {
  const liquidityScore = inputs.jobMarketLiquidityScore ?? 50;
  const salaryPreservation = inputs.salaryPreservationPct ?? 90;

  const score = Math.round(liquidityScore * 0.60 + Math.min(100, salaryPreservation) * 0.40);

  const insight = liquidityScore >= 70
    ? `High market demand for ${formatRoleLabel(inputs.oracleKey).toLowerCase()} — strong re-employment velocity and salary preservation prospects.`
    : liquidityScore >= 50
    ? `Moderate market demand — competitive but manageable. Differentiation will determine offer speed.`
    : `Low market demand currently — re-employment timeline and salary preservation are the primary risks.`;

  const topAction = liquidityScore < 50
    ? `Upskill toward adjacent roles with higher demand — ${formatRoleLabel(inputs.oracleKey).toLowerCase()} market is soft; positioning for a 15–20% role shift could triple your demand`
    : liquidityScore < 70
    ? "Build specialized certifications to differentiate from median candidates and tighten your time-to-offer"
    : "Market demand is strong — maximize this advantage by building external visibility (writing, talks, open source)";

  return {
    name: "Market Demand",
    score,
    weight: 0.25,
    weightedScore: Math.round(score * 0.25),
    status: score >= 70 ? "STRONG" : score >= 50 ? "ADEQUATE" : score >= 35 ? "WEAK" : "CRITICAL",
    insight,
    topAction,
  };
}

// ─── Pillar 3: Skill Currency ────────────────────────────────────────────────

function scoreSkillCurrency(inputs: ResilienceInputs): ResiliencePillar {
  let score = 50;

  if (inputs.hasAiSkills) score += 25;
  if (inputs.uniquenessDepth === "critical_knowledge") score += 20;
  else if (inputs.uniquenessDepth === "functional_specialist") score += 12;
  else score -= 5; // generic skills

  // Tenure as proxy for deep knowledge
  if (inputs.tenureYears >= 10) score += 8;
  else if (inputs.tenureYears >= 7) score += 5;

  // Industry context
  if (["technology", "finance", "healthcare"].includes(inputs.industry.toLowerCase())) score += 5;

  score = Math.max(10, Math.min(100, score));

  const insight = inputs.hasAiSkills
    ? `AI-augmented skillset — the primary differentiator in the 2024–2026 labor market. High transferability across roles.`
    : inputs.uniquenessDepth === "critical_knowledge"
    ? inputs.knowledgeType === 'relationship_based'
      ? `Relationship capital (board trust, investor access, team loyalty) is mobile — it follows you to a new role and does not commoditize over time. Risk: letting this capital sit unused while in seat; the moat erodes when you leave, not from any documentation or AI-capture program.`
      : inputs.knowledgeType === 'domain_expertise'
      ? `Deep domain expertise provides near-term protection and is transferable across employers. Risk: internal expertise invisible to the external market creates no optionality when the role is displaced — externalize it through writing, speaking, or consulting.`
      : `System-specific critical knowledge provides near-term protection with a hard expiry: knowledge extraction programs and AI-assisted documentation can commoditize it within 18–36 months of the migration start. Track the migration clock actively.`
    : `Skill profile is ${inputs.uniquenessDepth === "functional_specialist" ? "moderately" : "not strongly"} differentiated — AI augmentation would be the highest-ROI skill investment.`;

  const topAction = !inputs.hasAiSkills
    ? "Add AI augmentation skills to your profile — 3–4 weeks of focused learning (Cursor, Claude API, LangChain or domain-specific AI tool) shifts your competitive percentile significantly"
    : inputs.uniquenessDepth === "generic"
    ? "Deepen specialization — generic AI skills are becoming common; build a specific domain+AI combination no one else has"
    : "Skill currency is strong — maintain edge by learning one new AI tool per quarter and publishing output publicly";

  return {
    name: "Skill Currency",
    score: Math.round(score),
    weight: 0.23,
    weightedScore: Math.round(score * 0.23),
    status: score >= 70 ? "STRONG" : score >= 50 ? "ADEQUATE" : score >= 35 ? "WEAK" : "CRITICAL",
    insight,
    topAction,
  };
}

// ─── Pillar 4: Career Optionality ────────────────────────────────────────────

function scoreCareerOptionality(inputs: ResilienceInputs): ResiliencePillar {
  const escapePaths = inputs.escapePaths ?? 2;
  let score = 50;

  if (escapePaths >= 5) score = 88;
  else if (escapePaths >= 4) score = 78;
  else if (escapePaths >= 3) score = 68;
  else if (escapePaths >= 2) score = 55;
  else if (escapePaths >= 1) score = 38;
  else score = 20;

  // Industry diversifiability
  if (inputs.oracleKey.includes("engineer") || inputs.oracleKey.includes("developer")) score += 8;
  if (inputs.uniquenessDepth === "generic") score -= 8; // narrow path

  score = Math.max(10, Math.min(100, score));

  const insight = escapePaths >= 3
    ? `${escapePaths} viable career paths identified — multiple escape routes provide strong optionality. You are not dependent on a single employer archetype.`
    : escapePaths === 2
    ? `2 viable paths — adequate but limited. Building a third distinct path would materially strengthen resilience.`
    : `Only 1 career path currently viable — high optionality concentration risk. A single industry or company type rejection compounds the problem.`;

  const topAction = escapePaths < 3
    ? "Actively build toward a third distinct career path — one company switch option is not enough. Consider industry shift, role pivot, or freelance as additional vectors"
    : "Optionality is good — deepen 1–2 of your paths with visible proof-of-work to convert them from theoretical to ready-to-execute";

  return {
    name: "Career Optionality",
    score: Math.round(score),
    weight: 0.18,
    weightedScore: Math.round(score * 0.18),
    status: score >= 70 ? "STRONG" : score >= 50 ? "ADEQUATE" : score >= 35 ? "WEAK" : "CRITICAL",
    insight,
    topAction,
  };
}

// ─── Pillar 5: Professional Network ─────────────────────────────────────────

function scoreProfessionalNetwork(inputs: ResilienceInputs): ResiliencePillar {
  const strength = inputs.networkStrengthSelfReport ?? "unknown";
  const score =
    strength === "strong" ? 82
    : strength === "moderate" ? 58
    : strength === "weak" ? 28
    : 45; // unknown — assume moderate-weak

  const insight = strength === "strong"
    ? "Strong professional network is one of the most durable career assets — referral hires bypass 70% of open market competition."
    : strength === "moderate"
    ? "Moderate network provides some referral access but may not reach into your target companies. Deepening is high-ROI."
    : strength === "weak" || strength === "unknown"
    ? "Weak or unknown network is the highest single risk factor for long job searches — 75% of jobs are filled via referral, not applications."
    : "Network strength unknown.";

  const topAction = strength === "strong"
    ? "Activate your network proactively — regular check-ins maintain warm contacts so activation is fast when needed"
    : strength === "moderate"
    ? "Map which target companies have 2nd-degree connections and prioritize 2 warm introductions per month"
    : "Network is your #1 resilience priority — commit to 1 coffee chat per week with someone outside your current company";

  return {
    name: "Professional Network",
    score,
    weight: 0.12,
    weightedScore: Math.round(score * 0.12),
    status: score >= 70 ? "STRONG" : score >= 50 ? "ADEQUATE" : score >= 35 ? "WEAK" : "CRITICAL",
    insight,
    topAction,
  };
}

// ─── Classification ──────────────────────────────────────────────────────────

function classify(score: number): ResilienceClass {
  if (score >= 80) return "FORTRESS";
  if (score >= 65) return "RESILIENT";
  if (score >= 50) return "ADEQUATE";
  if (score >= 35) return "FRAGILE";
  return "CRITICAL";
}

function computeProtectionMonths(
  compositeScore: number,
  runwayMonths: number,
  hasDependents?: boolean,
  dualIncomeHousehold?: boolean,
): number {
  const baseMonths = runwayMonths > 0 ? runwayMonths : 6;
  const resilienceMultiplier = compositeScore >= 75 ? 1.8
    : compositeScore >= 60 ? 1.4
    : compositeScore >= 45 ? 1.0
    : 0.65;
  const raw = Math.min(36, baseMonths * resilienceMultiplier);

  // Sole earner with dependents: household burn rate is higher (dependent expenses
  // don't scale down during a job search), so effective protection months are shorter.
  // Apply a 0.75 multiplier — a sole earner with 8 months runway effectively has
  // 6 months of job-search capacity before household finances reach crisis point.
  const isSoleEarner = !!hasDependents && !dualIncomeHousehold;
  const adjustedMonths = isSoleEarner ? raw * 0.75 : raw;

  return Math.round(adjustedMonths);
}

function buildRiskResilienceInterpretation(
  riskScore: number,
  resilienceScore: number,
  classification: ResilienceClass,
): string {
  if (riskScore >= 70 && resilienceScore >= 70) {
    return `High risk (${riskScore}/100) + High resilience (${resilienceScore}/100): Your current situation is dangerous but your capacity to recover is strong. Think of it as a fire with a fire extinguisher in hand — concerning but manageable. Your priority is acting before the fire gets worse.`;
  }
  if (riskScore >= 70 && resilienceScore < 50) {
    return `High risk (${riskScore}/100) + Low resilience (${resilienceScore}/100): This is the most urgent quadrant. The threat is real AND your defences are weak. Both the risk and resilience scores need immediate attention — focus on financial buffer and market demand first, as these are the fastest to improve.`;
  }
  if (riskScore < 50 && resilienceScore >= 70) {
    return `Low risk (${riskScore}/100) + High resilience (${resilienceScore}/100): An excellent position — your current role is stable and your fallback is strong. Use this stability window to deepen your highest-value skills and widen your network before conditions change.`;
  }
  if (riskScore < 50 && resilienceScore < 50) {
    return `Low risk (${riskScore}/100) + Lower resilience (${resilienceScore}/100): Your current situation is stable but your position would be vulnerable if conditions deteriorated quickly. The time to build resilience is now, not after the risk materialises.`;
  }
  return `Risk score (${riskScore}/100) and resilience score (${resilienceScore}/100) are in tension. ${classification === "ADEQUATE" ? "Your protection is adequate but not robust — targeted improvement in the weakest pillar would provide meaningful uplift." : "Focus on the weakest pillar identified above."}`;
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export function computeCareerResilience(inputs: ResilienceInputs): CareerResilienceResult {
  const pillars: ResiliencePillar[] = [
    scoreFinancialBuffer(inputs),
    scoreMarketDemand(inputs),
    scoreSkillCurrency(inputs),
    scoreCareerOptionality(inputs),
    scoreProfessionalNetwork(inputs),
  ];

  // Compute composite from raw (unrounded) pillar scores × weights to avoid
  // per-pillar rounding drift. The displayed pillar scores are rounded to integers
  // but the composite uses full precision before its own final rounding.
  const rawComposite = pillars.reduce((sum, p) => sum + p.score * p.weight, 0);

  // Sole-earner family obligation modifier: a sole earner with dependents faces
  // structural mobility constraints that the five pillars do not fully capture
  // (P1 raises runway thresholds but the other four pillars score as if the user
  // can freely take risks, accept short-term pay cuts, or sustain a long search).
  // The × 0.85 modifier corrects this: an "ADEQUATE" sole-earner composite (52)
  // becomes 44 (FRAGILE), reflecting the real constraint on actionable resilience.
  const isSoleEarnerForModifier = !!inputs.hasDependents && !inputs.dualIncomeHousehold;
  const FAMILY_OBLIGATION_MODIFIER = 0.85;
  const adjustedComposite = isSoleEarnerForModifier
    ? rawComposite * FAMILY_OBLIGATION_MODIFIER
    : rawComposite;

  const compositeScore = Math.round(adjustedComposite);
  const classification = classify(compositeScore);

  const criticalWeakness = [...pillars].sort((a, b) => a.score - b.score)[0];
  const keyStrength = [...pillars].sort((a, b) => b.score - a.score)[0];

  const resilienceImprovementPlan = pillars
    .filter((p) => p.status === "WEAK" || p.status === "CRITICAL")
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map((p) => p.topAction);

  // Fill to 3 actions if < 3 weak pillars
  if (resilienceImprovementPlan.length < 3) {
    pillars
      .filter((p) => p.status === "ADEQUATE")
      .sort((a, b) => a.score - b.score)
      .forEach((p) => {
        if (resilienceImprovementPlan.length < 3) {
          resilienceImprovementPlan.push(p.topAction);
        }
      });
  }

  const headlines: Record<ResilienceClass, string> = {
    FORTRESS: "Career Fortress — multiple strong defences across all pillars",
    RESILIENT: "Career Resilient — well-positioned with clear upside remaining",
    ADEQUATE: "Career Adequate — functional protection with identifiable gaps",
    FRAGILE: "Career Fragile — multiple vulnerabilities require focused attention",
    CRITICAL: "Career Critical — urgent multi-front improvement required",
  };

  return {
    compositeScore,
    classification,
    pillars,
    criticalWeakness,
    keyStrength,
    resilienceImprovementPlan,
    riskResilienceInterpretation: buildRiskResilienceInterpretation(inputs.currentScore, compositeScore, classification),
    effectiveProtectionMonths: computeProtectionMonths(compositeScore, inputs.financialRunwayMonths, inputs.hasDependents, inputs.dualIncomeHousehold),
    resilienceHeadline: headlines[classification],
    ...(isSoleEarnerForModifier ? { familyObligationModifier: FAMILY_OBLIGATION_MODIFIER } : {}),
  };
}
