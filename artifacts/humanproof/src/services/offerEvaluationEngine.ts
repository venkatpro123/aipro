// offerEvaluationEngine.ts — v13.0 Layer 26
//
// Job offer evaluation and scoring engine.
//
// A job offer is one of the highest-stakes decisions in a person's career.
// Yet almost nobody has a systematic framework for evaluating offers —
// most decisions are emotional, anchored on headline salary, or made under
// time pressure. This engine provides a multi-dimensional offer scorecard.
//
// The offer is scored on 6 dimensions:
//   D1: Company Stability    — how stable is the new company vs. current?
//   D2: Compensation Delta   — total comp change (salary + equity + benefits)
//   D3: Role Growth          — is this a step up, lateral, or step back?
//   D4: Market Alignment     — is the comp aligned with market rate?
//   D5: Risk Reduction       — does this move reduce overall layoff risk?
//   D6: Culture & Fit        — red/yellow/green flags from offer context
//
// Recommendation: ACCEPT / NEGOTIATE / DECLINE / INVESTIGATE_MORE
//
// This layer is OPTIONAL — it only activates when the user provides offer data.
// The OfferEvaluationInputs are collected via a separate UI modal in StrategyTab.

export type OfferRecommendation =
  | 'STRONG_ACCEPT'    // 80+: Excellent offer; accept or do minor negotiation
  | 'ACCEPT'           // 65–79: Good offer; accept after validating 1–2 points
  | 'NEGOTIATE'        // 45–64: Acceptable offer; specific negotiation points
  | 'NEGOTIATE_HARD'   // 30–44: Below market or high risk; needs substantial improvement
  | 'DECLINE'          // 0–29: Offer fails multiple criteria; do not accept as-is
  | 'INVESTIGATE_MORE'; // Data insufficient to recommend; get more info first

export type CompanyStabilityTier =
  | 'ELITE'         // Top 50 public companies, consistent growth, low layoff history
  | 'STABLE'        // Established profitable company, no recent layoffs
  | 'ADEQUATE'      // Moderate stability signals
  | 'UNCERTAIN'     // Mixed signals — startup, pre-profitable, recent restructuring
  | 'RISKY';        // High layoff probability signals

export interface OfferDimension {
  id: string;
  name: string;
  score: number;       // 0–100
  weight: number;
  verdict: 'EXCELLENT' | 'GOOD' | 'ADEQUATE' | 'WEAK' | 'RED_FLAG';
  insight: string;
  negotiationLever?: string; // if verdict < GOOD, specific negotiation suggestion
}

export interface OfferNegotiationPoint {
  dimension: string;
  lever: string;
  script: string;
  expectedImprovement: string;
  priority: 'MUST_GET' | 'SHOULD_GET' | 'NICE_TO_HAVE';
}

export interface OfferEvaluationResult {
  overallScore: number;            // 0–100 composite
  recommendation: OfferRecommendation;
  dimensions: OfferDimension[];
  riskScoreIfAccepted: number | null; // estimated layoff score at new company
  riskReductionPoints: number;    // current score - estimated new score
  compensationDelta: number | null; // % change in total comp (null if data insufficient)
  isMarketAligned: boolean | null;
  negotiationPoints: OfferNegotiationPoint[];
  acceptanceDeadlineAdvice: string;
  keyInsight: string;             // single most important insight about this offer
  redFlags: string[];
  greenFlags: string[];
  readonly calibrationStatus: 'framework_based';
}

export interface OfferEvaluationInputs {
  // Current situation
  currentScore: number;
  currentSalary: number;          // annual, in local currency
  currentTenureYears: number;
  currentIndustry: string;

  // Offer details
  offerCompanyName: string;
  offerCompanyIndustry: string;
  offerCompanySize: 'startup' | 'smb' | 'mid' | 'large' | 'enterprise'; // headcount brackets
  offerCompanyFunding?: 'pre_seed' | 'seed' | 'series_a' | 'series_b' | 'series_c_plus' | 'public' | 'profitable_private';
  offerCompanyRecentLayoffs?: boolean;
  offerBaseSalary: number;
  offerTotalComp?: number;        // base + bonus + equity/4 (annualized)
  offerEquityVestingYears?: number;
  offerRoleLevel?: 'individual_contributor' | 'senior_ic' | 'lead' | 'manager' | 'director' | 'vp_plus';
  currentRoleLevel?: 'individual_contributor' | 'senior_ic' | 'lead' | 'manager' | 'director' | 'vp_plus';
  offerResponseDeadlineDays?: number;
  marketRateForRole?: number;     // if user researched it
}

// ── Dimension scorers ─────────────────────────────────────────────────────────

function scoreCompanyStability(inputs: OfferEvaluationInputs): OfferDimension {
  let score = 55; // baseline

  // Company size → stability proxy
  const sizeBonus: Record<OfferEvaluationInputs['offerCompanySize'], number> = {
    enterprise: 20, large: 15, mid: 5, smb: -5, startup: -20,
  };
  score += sizeBonus[inputs.offerCompanySize];

  // Funding stage for startups/growth
  if (inputs.offerCompanyFunding) {
    const fundingBonus: Record<string, number> = {
      pre_seed: -25, seed: -20, series_a: -12, series_b: -5,
      series_c_plus: 5, public: 15, profitable_private: 10,
    };
    score += fundingBonus[inputs.offerCompanyFunding] ?? 0;
  }

  // Recent layoffs at the target company
  if (inputs.offerCompanyRecentLayoffs) score -= 25;

  score = Math.min(100, Math.max(0, score));

  const verdict: OfferDimension['verdict'] =
    score >= 80 ? 'EXCELLENT' : score >= 65 ? 'GOOD' :
    score >= 45 ? 'ADEQUATE' : score >= 25 ? 'WEAK' : 'RED_FLAG';

  return {
    id: 'company_stability',
    name: 'Company Stability',
    score,
    weight: 0.25,
    verdict,
    insight: inputs.offerCompanyRecentLayoffs
      ? `${inputs.offerCompanyName} has had recent layoffs — jumping from one unstable company to another is high risk`
      : inputs.offerCompanySize === 'startup' && (!inputs.offerCompanyFunding || inputs.offerCompanyFunding === 'pre_seed' || inputs.offerCompanyFunding === 'seed')
        ? `Early-stage startup: high risk profile. Validate runway (18+ months), revenue traction, and team quality before accepting`
        : `Company stability appears ${verdict.toLowerCase()} based on available signals`,
    negotiationLever: verdict === 'WEAK' || verdict === 'RED_FLAG'
      ? 'Request 6 months of financial statements or last funding date/amount before accepting'
      : undefined,
  };
}

function scoreCompensationDelta(inputs: OfferEvaluationInputs): OfferDimension {
  const baseDelta = ((inputs.offerBaseSalary - inputs.currentSalary) / inputs.currentSalary) * 100;
  const totalDelta = inputs.offerTotalComp
    ? ((inputs.offerTotalComp - inputs.currentSalary) / inputs.currentSalary) * 100
    : baseDelta;

  let score: number;
  if (totalDelta >= 30) score = 95;
  else if (totalDelta >= 20) score = 85;
  else if (totalDelta >= 15) score = 78;
  else if (totalDelta >= 10) score = 68;
  else if (totalDelta >= 5) score = 55;
  else if (totalDelta >= 0) score = 45;
  else if (totalDelta >= -5) score = 30;
  else score = 15; // >5% pay cut

  const verdict: OfferDimension['verdict'] =
    score >= 80 ? 'EXCELLENT' : score >= 65 ? 'GOOD' :
    score >= 45 ? 'ADEQUATE' : score >= 25 ? 'WEAK' : 'RED_FLAG';

  return {
    id: 'compensation_delta',
    name: 'Compensation Change',
    score,
    weight: 0.25,
    verdict,
    insight: `${totalDelta >= 0 ? '+' : ''}${totalDelta.toFixed(1)}% total comp change. ${totalDelta < 10 ? 'Below typical job-change premium (10–20%).' : totalDelta >= 20 ? 'Strong premium — significant incentive to move.' : 'Moderate premium — acceptable for the right role.'}`,
    negotiationLever: totalDelta < 10
      ? `Counter with target total comp of ${Math.round(inputs.currentSalary * 1.15).toLocaleString()} (15% premium). Typical offer improvement on counter: 5–8%. Frame as "market alignment" not "more money."` : undefined,
  };
}

function scoreRoleGrowth(inputs: OfferEvaluationInputs): OfferDimension {
  const LEVEL_ORDER = ['individual_contributor', 'senior_ic', 'lead', 'manager', 'director', 'vp_plus'];
  const currentIdx = inputs.currentRoleLevel ? LEVEL_ORDER.indexOf(inputs.currentRoleLevel) : 2;
  const offerIdx = inputs.offerRoleLevel ? LEVEL_ORDER.indexOf(inputs.offerRoleLevel) : 2;
  const levelDelta = offerIdx - currentIdx;

  let score = 60;
  if (levelDelta >= 2) score = 92;
  else if (levelDelta === 1) score = 80;
  else if (levelDelta === 0) score = 60;
  else if (levelDelta === -1) score = 35;
  else score = 15;

  const verdict: OfferDimension['verdict'] =
    score >= 80 ? 'EXCELLENT' : score >= 65 ? 'GOOD' :
    score >= 45 ? 'ADEQUATE' : score >= 25 ? 'WEAK' : 'RED_FLAG';

  const growthLabel = levelDelta >= 2 ? 'significant promotion' : levelDelta === 1 ? 'promotion' :
    levelDelta === 0 ? 'lateral move' : levelDelta === -1 ? 'step back in level' : 'major step back';

  return {
    id: 'role_growth',
    name: 'Role & Level Growth',
    score,
    weight: 0.15,
    verdict,
    insight: `This is a ${growthLabel}. ${levelDelta < 0 ? 'A step back in level is rarely recoverable — avoid unless the company or domain is a strategic career move.' : levelDelta === 0 && inputs.offerBaseSalary <= inputs.currentSalary * 1.05 ? 'Lateral move with minimal comp increase: low incentive to move unless company stability or domain is a major upgrade.' : 'Role trajectory is positive.'}`,
  };
}

function scoreMarketAlignment(inputs: OfferEvaluationInputs): OfferDimension {
  if (!inputs.marketRateForRole) {
    return {
      id: 'market_alignment',
      name: 'Market Rate Alignment',
      score: 50,
      weight: 0.15,
      verdict: 'ADEQUATE',
      insight: 'Market rate not provided — research Glassdoor/Levels.fyi/LinkedIn Salary before accepting. This is essential data.',
      negotiationLever: 'Research your market rate in the next 24 hours. Do not negotiate without this data.',
    };
  }

  const alignmentPct = ((inputs.offerBaseSalary - inputs.marketRateForRole) / inputs.marketRateForRole) * 100;

  let score: number;
  if (alignmentPct >= 15) score = 92;
  else if (alignmentPct >= 5) score = 80;
  else if (alignmentPct >= -5) score = 65;
  else if (alignmentPct >= -15) score = 40;
  else score = 20;

  const verdict: OfferDimension['verdict'] =
    score >= 80 ? 'EXCELLENT' : score >= 65 ? 'GOOD' :
    score >= 45 ? 'ADEQUATE' : score >= 25 ? 'WEAK' : 'RED_FLAG';

  return {
    id: 'market_alignment',
    name: 'Market Rate Alignment',
    score,
    weight: 0.15,
    verdict,
    insight: `Offer is ${alignmentPct >= 0 ? '+' : ''}${alignmentPct.toFixed(1)}% vs. market rate. ${alignmentPct < -10 ? 'Significantly below market — strong grounds for counter-offer.' : alignmentPct > 15 ? 'Above market rate — excellent positioning.' : 'Within market range.'}`,
    negotiationLever: alignmentPct < -5
      ? `Counter with: "Based on current market data from Glassdoor/Levels.fyi, this role in [city] is benchmarked at [market rate]. I was hoping we could align to market — can we discuss [market rate]?"` : undefined,
  };
}

function scoreRiskReduction(inputs: OfferEvaluationInputs): OfferDimension {
  // Estimate new company's layoff score (simplified)
  let estimatedNewScore = inputs.currentScore;

  if (inputs.offerCompanySize === 'enterprise' || inputs.offerCompanySize === 'large') estimatedNewScore -= 10;
  if (inputs.offerCompanySize === 'startup') estimatedNewScore += 15;
  if (inputs.offerCompanyFunding === 'pre_seed' || inputs.offerCompanyFunding === 'seed') estimatedNewScore += 20;
  if (inputs.offerCompanyFunding === 'public') estimatedNewScore -= 10;
  if (inputs.offerCompanyRecentLayoffs) estimatedNewScore += 18;

  // Industry risk adjustment
  const saferIndustries = ['healthcare', 'government', 'education', 'utilities'];
  const riskerIndustries = ['startup', 'media', 'retail', 'crypto'];
  if (saferIndustries.some(i => inputs.offerCompanyIndustry.toLowerCase().includes(i))) estimatedNewScore -= 12;
  if (riskerIndustries.some(i => inputs.offerCompanyIndustry.toLowerCase().includes(i))) estimatedNewScore += 12;

  estimatedNewScore = Math.min(100, Math.max(0, Math.round(estimatedNewScore)));
  const riskDelta = inputs.currentScore - estimatedNewScore;

  let score: number;
  if (riskDelta >= 20) score = 92;
  else if (riskDelta >= 10) score = 78;
  else if (riskDelta >= 0) score = 60;
  else if (riskDelta >= -10) score = 40;
  else score = 20; // higher risk at new company

  const verdict: OfferDimension['verdict'] =
    score >= 80 ? 'EXCELLENT' : score >= 65 ? 'GOOD' :
    score >= 45 ? 'ADEQUATE' : score >= 25 ? 'WEAK' : 'RED_FLAG';

  return {
    id: 'risk_reduction',
    name: 'Risk Reduction',
    score,
    weight: 0.20,
    verdict,
    insight: riskDelta > 0
      ? `Accepting this offer would reduce your estimated layoff risk by ~${riskDelta} points — a meaningful safety improvement`
      : riskDelta < -10
        ? `Warning: this move may increase your layoff risk by ~${Math.abs(riskDelta)} points. Validate the new company's stability signals before accepting.`
        : 'Risk profile at new company is similar to current situation — decision should be driven by comp and growth',
  };
}

function buildNegotiationPoints(dimensions: OfferDimension[], inputs: OfferEvaluationInputs): OfferNegotiationPoint[] {
  const points: OfferNegotiationPoint[] = [];

  dimensions.forEach(dim => {
    if (dim.negotiationLever && (dim.verdict === 'WEAK' || dim.verdict === 'RED_FLAG' || dim.verdict === 'ADEQUATE')) {
      points.push({
        dimension: dim.name,
        lever: dim.negotiationLever,
        script: dim.negotiationLever,
        expectedImprovement: dim.id === 'compensation_delta' ? '5–8% comp increase' : 'Improved terms',
        priority: dim.verdict === 'RED_FLAG' ? 'MUST_GET' : dim.verdict === 'WEAK' ? 'SHOULD_GET' : 'NICE_TO_HAVE',
      });
    }
  });

  // Always include deadline extension as a NICE_TO_HAVE
  if (inputs.offerResponseDeadlineDays && inputs.offerResponseDeadlineDays < 5) {
    points.push({
      dimension: 'Response Deadline',
      lever: 'Request an extension to properly evaluate the offer',
      script: '"Thank you for this offer — I\'m very interested. Could I have until [5 days from now] to complete my due diligence? I want to give this the consideration it deserves."',
      expectedImprovement: '3–5 extra days to compare alternatives',
      priority: 'MUST_GET',
    });
  }

  return points.sort((a, b) => {
    const order = { MUST_GET: 0, SHOULD_GET: 1, NICE_TO_HAVE: 2 };
    return order[a.priority] - order[b.priority];
  });
}

function buildRecommendation(score: number): OfferRecommendation {
  if (score >= 80) return 'STRONG_ACCEPT';
  if (score >= 65) return 'ACCEPT';
  if (score >= 45) return 'NEGOTIATE';
  if (score >= 30) return 'NEGOTIATE_HARD';
  return 'DECLINE';
}

// ── Main export ───────────────────────────────────────────────────────────────

export function evaluateJobOffer(inputs: OfferEvaluationInputs): OfferEvaluationResult {
  const dimensions: OfferDimension[] = [
    scoreCompanyStability(inputs),
    scoreCompensationDelta(inputs),
    scoreRoleGrowth(inputs),
    scoreMarketAlignment(inputs),
    scoreRiskReduction(inputs),
  ];

  const overallScore = Math.round(
    dimensions.reduce((sum, d) => sum + d.score * d.weight, 0)
  );
  const recommendation = buildRecommendation(overallScore);

  const riskDim = dimensions.find(d => d.id === 'risk_reduction');
  const currentEstimatedNew = inputs.currentScore - (riskDim ? (riskDim.score >= 70 ? 15 : riskDim.score >= 45 ? 5 : -10) : 0);
  const riskReductionPoints = inputs.currentScore - Math.max(0, Math.min(100, currentEstimatedNew));

  const compensationDelta = inputs.currentSalary > 0
    ? +((inputs.offerBaseSalary - inputs.currentSalary) / inputs.currentSalary * 100).toFixed(1)
    : null;

  const isMarketAligned = inputs.marketRateForRole
    ? Math.abs(inputs.offerBaseSalary - inputs.marketRateForRole) / inputs.marketRateForRole < 0.10
    : null;

  const redFlags = dimensions
    .filter(d => d.verdict === 'RED_FLAG')
    .map(d => `${d.name}: ${d.insight}`);

  const greenFlags = dimensions
    .filter(d => d.verdict === 'EXCELLENT')
    .map(d => `${d.name}: ${d.insight}`);

  const keyInsightDim = [...dimensions].sort((a, b) => {
    const order = { RED_FLAG: 0, WEAK: 1, ADEQUATE: 2, GOOD: 3, EXCELLENT: 4 };
    return order[a.verdict] - order[b.verdict];
  })[0];

  const keyInsight = overallScore >= 70
    ? `Strong offer (${overallScore}/100): ${greenFlags[0] || 'Multiple positive signals detected'}`
    : `${keyInsightDim.name} is the key issue: ${keyInsightDim.insight}`;

  const acceptanceAdvice: Record<OfferRecommendation, string> = {
    STRONG_ACCEPT: 'This offer scores well across multiple dimensions. Accept or make one focused counter-offer on the weakest dimension.',
    ACCEPT: 'Good offer. Counter on the SHOULD_GET points, but do not let the negotiation drag — move quickly.',
    NEGOTIATE: 'Negotiate the MUST_GET points before deciding. If they improve, accept. If they refuse to move, walk away.',
    NEGOTIATE_HARD: 'This offer needs material improvement. Counter with specific data-backed requests. Their response will reveal how they value you.',
    DECLINE: 'This offer fails multiple criteria. Declining is defensible. If you must accept (financial pressure), negotiate every point aggressively first.',
    INVESTIGATE_MORE: 'Get more information before deciding — specifically about company financials and growth trajectory.',
  };

  return {
    overallScore,
    recommendation,
    dimensions,
    riskScoreIfAccepted: Math.max(0, Math.min(100, inputs.currentScore - riskReductionPoints)),
    riskReductionPoints,
    compensationDelta,
    isMarketAligned,
    negotiationPoints: buildNegotiationPoints(dimensions, inputs),
    acceptanceDeadlineAdvice: acceptanceAdvice[recommendation],
    keyInsight,
    redFlags,
    greenFlags,
    calibrationStatus: 'framework_based',
  };
}
