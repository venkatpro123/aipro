// offerEvaluationEngine.ts — v40.1 Layer 26
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
  | 'INVESTIGATE_MORE' // Data insufficient to recommend; get more info first
  | 'CANNOT_ACCEPT';   // Visa/sponsorship eligibility hard block — offer is legally inaccessible

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
  /**
   * True when the user's visa status makes this offer legally inaccessible
   * (e.g. company confirmed it does not sponsor, or sponsorship is unresolvable).
   * When true, recommendation is always CANNOT_ACCEPT regardless of score.
   */
  visaEligibilityBlocked: boolean;
  /**
   * Plain-English eligibility note — set whenever the user is on a work visa,
   * regardless of whether the offer is blocked. Blocked → hard legal barrier.
   * Not blocked but note present → required due-diligence before accepting.
   */
  visaEligibilityNote: string | null;
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

  // ── Visa eligibility inputs ───────────────────────────────────────────────
  /** User's active visa status — sourced from UserProfile. Required for sponsor gating. */
  visaStatus?: string | null;
  /**
   * ISO country code of the company's primary operating jurisdiction ('US', 'GB', 'SG', 'AU', etc.).
   * Used to infer whether the company is likely able to sponsor certain visa types.
   * E.g. a US-only company cannot sponsor a UK Skilled Worker visa without a UK entity.
   */
  offerCompanyCountry?: string | null;
  /**
   * Explicit answer to "Does this company sponsor work visas for your status?"
   * True  = company confirmed they will sponsor.
   * False = company confirmed they will not sponsor — hard eligibility block.
   * Null  = not asked yet — surface as required due-diligence, not a hard block.
   */
  offerCompanySponsorshipAvailable?: boolean | null;
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

// ── Visa sponsor eligibility gate ────────────────────────────────────────────
//
// Runs BEFORE the 6 dimension scorers.  A legally inaccessible offer must not
// receive a STRONG_ACCEPT / ACCEPT recommendation regardless of comp or growth.
//
// Three tiers of response:
//   HARD BLOCK  — offerCompanySponsorshipAvailable === false (confirmed denial).
//                 Any work visa holder.  recommendation → CANNOT_ACCEPT.
//   INFERRED    — work visa + company country mismatch with no UK/SG entity
//                 inferred + sponsorship not confirmed.  Not a hard block but
//                 surfaces as a RED_FLAG and sets recommendation → INVESTIGATE_MORE.
//   ADVISORY    — work visa + sponsorship unknown.  Required due-diligence note;
//                 dimensions are scored normally.

const WORK_VISA_LABELS: Record<string, string> = {
  h1b: 'H1B', l1: 'L1', opt_stem: 'OPT STEM', opt: 'OPT', tn: 'TN',
  uk_skilled_worker: 'UK Skilled Worker',
  eu_blue_card: 'EU Blue Card',
  singapore_ep: 'Singapore EP', singapore_s_pass: 'Singapore S Pass',
  australia_482_tss: 'Australia 482 TSS',
  philippines_9g_aep: 'Philippines 9G AEP',
  canada_lmia_permit: 'Canada LMIA permit',
  uae_employment_visa: 'UAE Employment Visa',
  saudi_iqama: 'Saudi Iqama',
  qatar_work_permit: 'Qatar work permit',
  kuwait_work_permit: 'Kuwait work permit',
  gcc_sponsored: 'GCC sponsored visa',
  other_work_auth: 'work authorization',
  other: 'work authorization',
};

const NO_VISA_CONSTRAINT = new Set(['citizen', 'permanent_resident', 'not_applicable', 'na', '']);

interface EligibilityCheck {
  blocked: boolean;        // true → CANNOT_ACCEPT
  inferredRisk: boolean;   // true → INVESTIGATE_MORE even if not hard-blocked
  note: string | null;     // shown in redFlags and visaEligibilityNote
}

function checkVisaEligibility(inputs: OfferEvaluationInputs): EligibilityCheck {
  const visa = inputs.visaStatus ?? '';
  if (!visa || NO_VISA_CONSTRAINT.has(visa)) return { blocked: false, inferredRisk: false, note: null };

  const visaLabel = WORK_VISA_LABELS[visa] ?? 'work visa';
  const sponsorKnown = inputs.offerCompanySponsorshipAvailable;
  const co = (inputs.offerCompanyCountry ?? '').toUpperCase();
  const companyName = inputs.offerCompanyName;

  // ── Hard block: company explicitly confirmed no sponsorship ───────────────
  if (sponsorKnown === false) {
    return {
      blocked: true,
      inferredRisk: false,
      note: `${companyName} has confirmed they do not sponsor work visas. As a ${visaLabel} holder, you cannot legally accept this offer. Remove it from consideration — pursuing it wastes negotiation capital.`,
    };
  }

  // ── UK Skilled Worker: must have Home Office sponsor licence ──────────────
  if (visa === 'uk_skilled_worker') {
    if (sponsorKnown === true) {
      // Confirmed sponsorship — advisory only
      return {
        blocked: false,
        inferredRisk: false,
        note: `UK Skilled Worker: ${companyName} has confirmed sponsor licence. Ensure your Certificate of Sponsorship (CoS) is issued before you resign from your current role.`,
      };
    }
    // Co is non-UK → high probability they lack a UK sponsor licence
    const likelyNoUkPresence = co && co !== 'GB' && co !== 'UK';
    if (likelyNoUkPresence) {
      return {
        blocked: false,
        inferredRisk: true,
        note: `UK Skilled Worker visa requires ${companyName} to hold a UK Home Office sponsor licence. ${companyName} appears to be based in ${co} — US/non-UK companies cannot employ UK Skilled Worker visa holders unless they have a registered UK entity and sponsor licence. Ask HR: "Are you a licensed UK immigration sponsor?" before investing further time in this process.`,
      };
    }
    // Unknown country, sponsorship unknown → required due-diligence
    return {
      blocked: false,
      inferredRisk: false,
      note: `UK Skilled Worker visa: your new employer must hold a Home Office sponsor licence and issue a Certificate of Sponsorship (CoS) before you can switch roles. Confirm this with ${companyName} HR immediately — it is a hard legal requirement and takes 8–12 weeks to process.`,
    };
  }

  // ── H1B / L1 / OPT: USCIS petition required ──────────────────────────────
  if (['h1b', 'l1', 'opt_stem', 'opt'].includes(visa)) {
    if (sponsorKnown === true) {
      return {
        blocked: false,
        inferredRisk: false,
        note: `${visaLabel}: ${companyName} will file an H1B transfer petition. Confirm the expected USCIS processing time — premium processing (~15 business days) is available if timeline is tight.`,
      };
    }
    return {
      blocked: false,
      inferredRisk: false,
      note: `${visaLabel} transfer requires ${companyName} to file a new petition with USCIS (typically 2–6 months; 15 days with premium processing). Confirm before accepting: "Does your company sponsor H1B transfers, and will you cover premium processing fees?"`,
    };
  }

  // ── Singapore EP / S Pass ─────────────────────────────────────────────────
  if (visa === 'singapore_ep' || visa === 'singapore_s_pass') {
    const graceDays = visa === 'singapore_s_pass' ? 10 : 30;
    if (sponsorKnown === true) {
      return {
        blocked: false,
        inferredRisk: false,
        note: `${visaLabel}: ${companyName} will apply for your new MOM pass. Your current pass is cancelled on your last day — ensure the new application is submitted before you resign (MOM approval takes 3–8 weeks).`,
      };
    }
    return {
      blocked: false,
      inferredRisk: false,
      note: `${visaLabel} holders have only ${graceDays} days after your current pass is cancelled. ${companyName} must apply for your new MOM pass before you resign. Confirm they will initiate this and get a written commitment on timing.`,
    };
  }

  // ── Australia 482 TSS ─────────────────────────────────────────────────────
  if (visa === 'australia_482_tss') {
    if (sponsorKnown === true) {
      return { blocked: false, inferredRisk: false, note: `Australia 482 TSS: ${companyName} is a Standard Business Sponsor. Confirm your occupation is on the MLTSSL/STSOL and the new nomination is lodged before your current sponsor notifies Home Affairs of the end of employment.` };
    }
    return {
      blocked: false,
      inferredRisk: false,
      note: `Australia 482 TSS: ${companyName} must be an approved Standard Business Sponsor to employ you. Ask: "Is your company a registered 482 sponsor?" — this is non-negotiable.`,
    };
  }

  // ── Canada LMIA ───────────────────────────────────────────────────────────
  if (visa === 'canada_lmia_permit') {
    if (sponsorKnown === true) {
      return { blocked: false, inferredRisk: false, note: `Canada LMIA: ${companyName} is willing to obtain an LMIA. Processing typically takes 60–150 days — negotiate a start date that accounts for this.` };
    }
    return {
      blocked: false,
      inferredRisk: false,
      note: `Canada LMIA work permit requires ${companyName} to obtain a Labour Market Impact Assessment (LMIA) — a 60–150 day process. Verify they will sponsor and understand the timeline before accepting. CUSMA/Express Entry paths may offer faster alternatives.`,
    };
  }

  // ── Philippines 9G AEP ────────────────────────────────────────────────────
  if (visa === 'philippines_9g_aep') {
    if (sponsorKnown === true) {
      return { blocked: false, inferredRisk: false, note: `Philippines 9G AEP: ${companyName} will file your new AEP. DOLE requires 14-day publication before approval — plan accordingly; your current AEP is per-employer and non-transferable.` };
    }
    return {
      blocked: false,
      inferredRisk: false,
      note: `Philippines 9G AEP is per-employer and per-position — it cannot transfer. ${companyName} must file a new AEP with DOLE (14-day publication required before approval). Confirm they will sponsor before advancing.`,
    };
  }

  // ── Generic work auth fallback ────────────────────────────────────────────
  return {
    blocked: false,
    inferredRisk: false,
    note: `You hold a ${visaLabel} — confirm ${companyName} will sponsor your work authorization before accepting. Non-sponsoring offers are legally inaccessible regardless of comp or role quality.`,
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

export function evaluateJobOffer(inputs: OfferEvaluationInputs): OfferEvaluationResult {
  // Visa eligibility gate runs first — a legally inaccessible offer must not
  // receive a positive recommendation regardless of comp or stability scores.
  const eligibility = checkVisaEligibility(inputs);

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

  // Eligibility overrides dim-score recommendation.
  //   HARD BLOCK (blocked=true)   → CANNOT_ACCEPT
  //   INFERRED RISK (inferredRisk) → INVESTIGATE_MORE (clamp away from positive recs)
  //   Otherwise                   → normal score-based recommendation
  let recommendation: OfferRecommendation;
  if (eligibility.blocked) {
    recommendation = 'CANNOT_ACCEPT';
  } else if (eligibility.inferredRisk) {
    // Don't let a good comp score mask an unresolved sponsor eligibility risk.
    // Cap at INVESTIGATE_MORE even if score would produce ACCEPT/STRONG_ACCEPT.
    const scoreBased = buildRecommendation(overallScore);
    recommendation = (scoreBased === 'STRONG_ACCEPT' || scoreBased === 'ACCEPT')
      ? 'INVESTIGATE_MORE'
      : scoreBased;
  } else {
    recommendation = buildRecommendation(overallScore);
  }

  const riskDim = dimensions.find(d => d.id === 'risk_reduction');
  const currentEstimatedNew = inputs.currentScore - (riskDim ? (riskDim.score >= 70 ? 15 : riskDim.score >= 45 ? 5 : -10) : 0);
  const riskReductionPoints = inputs.currentScore - Math.max(0, Math.min(100, currentEstimatedNew));

  const compensationDelta = inputs.currentSalary > 0
    ? +((inputs.offerBaseSalary - inputs.currentSalary) / inputs.currentSalary * 100).toFixed(1)
    : null;

  const isMarketAligned = inputs.marketRateForRole
    ? Math.abs(inputs.offerBaseSalary - inputs.marketRateForRole) / inputs.marketRateForRole < 0.10
    : null;

  // Eligibility note prepended to redFlags so it's impossible to miss.
  const dimRedFlags = dimensions
    .filter(d => d.verdict === 'RED_FLAG')
    .map(d => `${d.name}: ${d.insight}`);
  const redFlags: string[] = eligibility.note && (eligibility.blocked || eligibility.inferredRisk)
    ? [eligibility.note, ...dimRedFlags]
    : dimRedFlags;

  const greenFlags = dimensions
    .filter(d => d.verdict === 'EXCELLENT')
    .map(d => `${d.name}: ${d.insight}`);

  const keyInsightDim = [...dimensions].sort((a, b) => {
    const order = { RED_FLAG: 0, WEAK: 1, ADEQUATE: 2, GOOD: 3, EXCELLENT: 4 };
    return order[a.verdict] - order[b.verdict];
  })[0];

  const keyInsight = eligibility.blocked
    ? `ELIGIBILITY BLOCK: ${eligibility.note}`
    : eligibility.inferredRisk
      ? `Sponsorship unconfirmed: ${eligibility.note}`
      : overallScore >= 70
        ? `Strong offer (${overallScore}/100): ${greenFlags[0] || 'Multiple positive signals detected'}`
        : `${keyInsightDim.name} is the key issue: ${keyInsightDim.insight}`;

  const acceptanceAdvice: Record<OfferRecommendation, string> = {
    STRONG_ACCEPT: 'This offer scores well across multiple dimensions. Accept or make one focused counter-offer on the weakest dimension.',
    ACCEPT: 'Good offer. Counter on the SHOULD_GET points, but do not let the negotiation drag — move quickly.',
    NEGOTIATE: 'Negotiate the MUST_GET points before deciding. If they improve, accept. If they refuse to move, walk away.',
    NEGOTIATE_HARD: 'This offer needs material improvement. Counter with specific data-backed requests. Their response will reveal how they value you.',
    DECLINE: 'This offer fails multiple criteria. Declining is defensible. If you must accept (financial pressure), negotiate every point aggressively first.',
    INVESTIGATE_MORE: 'Resolve the eligibility question before evaluating this offer further. Ask HR directly: "Will you sponsor my work visa?" Get the answer in writing.',
    CANNOT_ACCEPT: 'This offer is legally inaccessible given your visa status. Do not invest further time in this process unless the company can confirm sponsorship in writing.',
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
    visaEligibilityBlocked: eligibility.blocked,
    visaEligibilityNote: eligibility.note,
    calibrationStatus: 'framework_based',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// v50.0 — Enhanced Offer Scorecard, Exit Timing, Multi-Offer Comparison &
//          Psychological Negotiation Tactics
// ═══════════════════════════════════════════════════════════════════════════════

// ── Scorecard Interfaces ──────────────────────────────────────────────────────

/** Detailed single-offer input for the v50.0 scorecard engine. */
export interface OfferInput {
  offerLabel: string;
  baseSalaryAnnual: number;
  bonusPct: number;                       // e.g. 15 = 15%
  equityTotalUsd?: number | null;
  equityCliffMonths?: number | null;       // months to first vest
  equityVestingMonths?: number | null;     // total schedule in months
  roleInterestScore: number;              // 1–10 self-rated
  growthOpportunityScore: number;         // 1–10 self-rated
  managerQualityScore: number;            // 1–10 self-rated
  companyStabilityScore: number;          // 1–10 self-rated
  workLifeBalanceScore: number;           // 1–10 self-rated
  remotePolicy: 'full_remote' | 'hybrid_2' | 'hybrid_3' | 'office_first';
  commuteMinutes: number;
  weeksToStart: number;
  visaSponsor?: boolean | null;
  metro?: string | null;
}

export interface ScorecardEvaluationInputs {
  offer: OfferInput;
  rolePrefix?: string | null;
  currentBaseSalary?: number | null;
  visaRequired?: boolean | null;
  seniority?: 'junior' | 'mid' | 'senior' | 'staff' | 'exec';
}

export interface OfferScorecardFactor {
  factor: string;
  weight: number;
  rawScore: number;
  weightedScore: number;
  insight: string;
}

export interface ScorecardEvaluationResult {
  offerLabel: string;
  totalScore: number;
  scoreInterpretation: 'excellent' | 'strong' | 'acceptable' | 'borderline' | 'walk_away';
  factors: OfferScorecardFactor[];
  compensationAnalysis: string;
  equityAnalysis: string;
  redFlags: string[];
  negotiationPriority: string[];
  counterOfferScript: string;
  timelineAdvice: string;
  acceptanceDecisionFramework: string;
}

// ── Exit Timing Interfaces ────────────────────────────────────────────────────

export interface ExitTimingInputs {
  today: string;
  daysToNextVest?: number | null;
  nextVestValueUsd?: number | null;
  noticePeriodWeeks: number;
  region: string;
  urgency: 'crisis' | 'elevated' | 'planned';
  seniority: 'junior' | 'mid' | 'senior' | 'staff' | 'exec';
  newRoleStartDate?: string | null;
  isInPip?: boolean;
  currentBaseSalary?: number | null;
}

export interface ExitTimingResult {
  recommendedExitDate: string;
  exitDateRationale: string;
  bindingConstraints: string[];
  preResignationChecklist: string[];
  resignationScript: string;
  counterOfferResponseScript: string;
  immediateTerminationScript: string;
  referenceProtectionPlan: string[];
  offboardingStrategy: string;
  marketTimingNote: string;
  equityConsideration: string | null;
}

// ── Multi-Offer / Psychology Interfaces ──────────────────────────────────────

export interface MultiOfferComparisonResult {
  rankedOffers: Array<{
    rank: number;
    offerLabel: string;
    totalScore: number;
    scoreInterpretation: string;
    topStrengths: string[];
    topWeaknesses: string[];
    vsTopOffer: string;
  }>;
  recommendedOffer: string;
  recommendationRationale: string;
  negotiationLeverageNote: string;
  walkAwayThreshold: number;
}

export interface PsychologicalNegotiationTactic {
  tacticName: string;
  whenToUse: string;
  script: string;
  psychologyBasis: string;
  caution?: string;
}

export interface NegotiationPsychologyResult {
  recommendedTactics: PsychologicalNegotiationTactic[];
  overallLeverageRating: 'strong' | 'moderate' | 'weak';
  openingMoveScript: string;
  anchorPoint: string;
  bottomLineScript: string;
}

// ── Role Factor Weights ───────────────────────────────────────────────────────

const SCORECARD_ROLE_WEIGHTS: Record<string, {
  compensation: number; equity: number; roleInterest: number; growth: number;
  manager: number; stability: number; workLife: number; remote: number; visa: number;
}> = {
  sw:      { compensation:0.20, equity:0.18, roleInterest:0.14, growth:0.14, manager:0.10, stability:0.08, workLife:0.07, remote:0.06, visa:0.03 },
  ds:      { compensation:0.18, equity:0.15, roleInterest:0.16, growth:0.16, manager:0.10, stability:0.08, workLife:0.07, remote:0.06, visa:0.04 },
  pm:      { compensation:0.18, equity:0.15, roleInterest:0.16, growth:0.16, manager:0.13, stability:0.08, workLife:0.07, remote:0.04, visa:0.03 },
  fin:     { compensation:0.25, equity:0.12, roleInterest:0.12, growth:0.14, manager:0.10, stability:0.12, workLife:0.07, remote:0.05, visa:0.03 },
  hc:      { compensation:0.20, equity:0.06, roleInterest:0.18, growth:0.12, manager:0.12, stability:0.14, workLife:0.10, remote:0.05, visa:0.03 },
  legal:   { compensation:0.22, equity:0.08, roleInterest:0.16, growth:0.14, manager:0.12, stability:0.12, workLife:0.08, remote:0.05, visa:0.03 },
  mkt:     { compensation:0.20, equity:0.10, roleInterest:0.16, growth:0.16, manager:0.12, stability:0.09, workLife:0.08, remote:0.06, visa:0.03 },
  ops:     { compensation:0.22, equity:0.08, roleInterest:0.14, growth:0.15, manager:0.12, stability:0.14, workLife:0.08, remote:0.04, visa:0.03 },
  cons:    { compensation:0.26, equity:0.10, roleInterest:0.14, growth:0.14, manager:0.10, stability:0.08, workLife:0.08, remote:0.07, visa:0.03 },
  sales:   { compensation:0.28, equity:0.10, roleInterest:0.14, growth:0.14, manager:0.10, stability:0.08, workLife:0.07, remote:0.06, visa:0.03 },
  default: { compensation:0.22, equity:0.10, roleInterest:0.14, growth:0.14, manager:0.11, stability:0.11, workLife:0.08, remote:0.07, visa:0.03 },
};

// ── Resignation Scripts ───────────────────────────────────────────────────────

const RESIGNATION_SCRIPTS_V50: Record<string, {
  email: string;
  counterOfferResponseScript: string;
  immediateTerminationScript: string;
}> = {
  junior: {
    email: `Subject: Resignation — [Your Name]\n\nHi [Manager's Name],\n\nI'm writing to formally tender my resignation, effective [last day = today + notice period].\n\nThis was not an easy decision. I've genuinely valued the mentorship, the team, and everything I've learned here. I've accepted an offer that aligns more directly with my current career development goals.\n\nI'm committed to a clean handoff. I'll document all my in-progress work, create transition notes for my replacement, and remain available through my last day to answer questions.\n\nThank you for the opportunity.\n\n[Your Name]`,
    counterOfferResponseScript: `Thank you so much for this — I genuinely didn't expect it, and it means a lot that the team values my contribution.\n\nI've thought about it carefully, and I've decided to move forward with my decision. This isn't about the number — it's about the role, the growth trajectory, and timing that felt right for me. I want to be honest with you rather than accept something that might change in a few months.\n\nI'd love to stay in touch and leave on the best possible terms.`,
    immediateTerminationScript: `I understand the company's policy. I want to handle this professionally. Could you let me know the process for returning equipment and collecting any outstanding pay? I'd also appreciate a confirmation email outlining the separation terms. Thank you for everything during my time here.`,
  },
  mid: {
    email: `Subject: Resignation — [Your Name]\n\nHi [Manager's Name],\n\nI'm writing to formally resign from my position as [Role Title], with my last day being [date].\n\nI've spent a lot of time thinking about this, and I've decided to pursue an opportunity that offers a stronger alignment with my longer-term goals. This reflects where I want to be in five years, not a reaction to anything here.\n\nMy priority during my notice period is ensuring continuity. I'll document all active projects, brief the team on handoff priorities, and work with you to identify the best way to transition client/stakeholder relationships.\n\nThank you for your support and leadership.\n\n[Your Name]`,
    counterOfferResponseScript: `I really appreciate this — and I want to be transparent with you because I respect you. I've decided to move forward. Counter-offers, while flattering, rarely change the core dynamics that drove the decision. I'd rather leave on great terms and be someone you'd genuinely recommend than stay in a situation where both of us might feel uncertain about the future.\n\nI'm happy to discuss what I can do to make the transition as smooth as possible.`,
    immediateTerminationScript: `I respect the decision. I'd like to ensure the off-boarding is handled cleanly — can we align on equipment return, final paycheck timing, and the reference policy? I'd also ask that we confirm the separation in writing so we're both protected.`,
  },
  senior: {
    email: `Subject: Resignation Notice — [Your Name]\n\nHi [Manager's Name],\n\nI'm writing to formally tender my resignation, with my last working day being [date — typically 4 weeks from today].\n\nThis decision has taken significant reflection. I've decided to step into an opportunity that addresses both my professional growth goals and my longer-term career direction. It's the right move for where I want to be, and I want to be upfront rather than stay while mentally elsewhere.\n\nGiven the scope of my work, I'll prepare a detailed transition document covering: active projects and status, key stakeholder relationships, institutional knowledge that isn't documented, and suggested next steps for the team. I'm also happy to assist in interviewing or briefing a replacement.\n\nThank you for the trust you've extended to me here.\n\n[Your Name]`,
    counterOfferResponseScript: `Thank you — this genuinely reflects well on how I'm valued here, and I don't take it lightly.\n\nI've given this real thought, and I'm going to honour my commitment to the new role. My reasoning goes beyond compensation: it's about the specific opportunity, the timing, and some longer-term factors I've been weighing for a while. I don't want to negotiate my way into staying if my motivations don't change, because that wouldn't be fair to you or the team.\n\nWhat I can commit to is the cleanest possible handover. You'll have my full attention through my notice period.`,
    immediateTerminationScript: `I understand. I'd ask that we agree in writing on the separation terms, including any garden leave provisions, IP/non-compete clauses, and the reference policy. I want this handled professionally on both sides, and I'm happy to work through your HR team to confirm the process.`,
  },
  staff: {
    email: `Subject: Formal Notice of Resignation — [Your Name]\n\n[Manager's Name],\n\nI'm writing to formally resign from [Company Name], effective [date — typically 6–8 weeks for staff-level].\n\nThis has been a considered decision over several months. I'm pursuing a role that better aligns with the technical and strategic scope I want to operate at over the next phase of my career. I don't make this decision lightly given the impact on the team.\n\nMy commitment during the transition period is full. I'll prepare a comprehensive succession document, personally brief my key direct relationships, and I'm open to participating in recruiting or interviewing candidates to help close the gap. I'd prefer a structured off-boarding plan we can agree on together.\n\nI have valued what we've built here.\n\n[Your Name]`,
    counterOfferResponseScript: `I want to be direct with you, because I think that's what our working relationship deserves. I've made my decision. It's not driven by compensation, and a revised offer — however generous — doesn't change the underlying reasons.\n\nWhat I'd ask instead is that we focus on how we make the transition excellent. The last thing I want is for this to disrupt what the team is building. Let me put together a transition plan this week that we can review together.`,
    immediateTerminationScript: `I'll respect the company's process. Before we close this conversation, I'd ask we formally confirm the following in writing: final compensation through the notice period, equity treatment per the plan documents, non-compete and IP agreement scope, and the reference policy for future employment verifications. I'd like to involve HR on both sides to ensure this is handled cleanly.`,
  },
  exec: {
    email: `[Manager's Name / Board Chair],\n\nI am writing to formally notify you of my resignation from [Company Name], effective [date — negotiate based on succession requirements].\n\nThis is a decision I have considered carefully and with full awareness of its implications for the organisation. I believe this is the right professional step for me, and I want to ensure the transition serves the company's interests as well.\n\nI propose we work together immediately to agree a formal transition plan, including: knowledge transfer priorities, stakeholder communications (internal and external), an appropriate timeline for public announcement if applicable, and any interim arrangements to minimise disruption.\n\nI remain committed to the organisation's success through this transition period and will honour any agreed obligations in full.\n\n[Your Name]`,
    counterOfferResponseScript: `I genuinely appreciate this conversation and the confidence it reflects. My decision is made, and I want to be transparent: it reflects where I need to be at this point in my career, and it would be unfair to the organisation for me to stay while my focus and commitment are elsewhere.\n\nWhat I want to focus on now is executing a succession and transition plan that sets the team up well. I'd suggest we involve HR and the board chair to structure this properly. I'm fully committed to making this a professional and orderly transition.`,
    immediateTerminationScript: `I understand. Given the level of this role, I'd ask that we involve legal counsel on both sides to formalise the separation terms, including: compensation through the contractual notice period, equity treatment, non-compete and non-solicitation scope, D&O insurance continuation, and agreed public messaging. I want this handled with the professionalism the situation requires.`,
  },
};

// ── Psychological Negotiation Tactics ─────────────────────────────────────────

export const PSYCHOLOGICAL_NEGOTIATION_TACTICS: PsychologicalNegotiationTactic[] = [
  {
    tacticName: 'Strategic Silence',
    whenToUse: 'After making your counter-offer number — immediately stop talking.',
    script: `"I was hoping we could get to [your number]." [pause — say nothing until they respond]`,
    psychologyBasis: 'Discomfort with silence creates pressure on the other party to fill the gap, often with a concession or justification that reveals their true ceiling.',
    caution: 'Do not over-use. Once per negotiation. Works best after a specific number.',
  },
  {
    tacticName: 'Anchoring High',
    whenToUse: 'When asked for your salary expectation first — anchor above your target.',
    script: `"Based on current market rates for [role] in [market], I'm targeting [15–20% above real target]. I'm open to discussing the full package."`,
    psychologyBasis: 'Anchoring effect (Tversky & Kahneman): the first number establishes the reference point. All subsequent offers are evaluated relative to the anchor.',
    caution: "Don't anchor so high you lose credibility. Research the market first so the number is defensible.",
  },
  {
    tacticName: 'The Bracketing Counter',
    whenToUse: 'When they offer below your target — counter with a range where your target is the floor.',
    script: `"I appreciate the offer of [their number]. Given my experience, I'd need to be in the [target] to [target+15%] range. Is there flexibility to get closer to that?"`,
    psychologyBasis: 'Bracketing anchors the counter-range high so even a "compromise" lands at or above your real target.',
  },
  {
    tacticName: 'The Competing Offer Signal',
    whenToUse: 'When you genuinely have another offer — use it as leverage without making it a threat.',
    script: `"I want to be transparent — I do have another offer I'm evaluating. It's not my preference, but I need to decide by [date]. I'd genuinely rather join your team, so I wanted to give you the chance to put your best offer forward."`,
    psychologyBasis: 'FOMO and scarcity principle. People value options more when they risk losing them.',
    caution: 'Never lie about a competing offer. The industry is smaller than you think.',
  },
  {
    tacticName: 'Decoupling Base and Total Comp',
    whenToUse: 'When base is non-negotiable but equity, bonus, or sign-on has flexibility.',
    script: `"I understand there's a band constraint on the base. Could we look at a higher sign-on bonus, an accelerated equity cliff, or a performance bonus tied to [specific outcome]?"`,
    psychologyBasis: 'Shifting to non-base components often unlocks different budget pools. It also signals sophisticated financial thinking.',
  },
  {
    tacticName: 'The "Good Cop" Framing',
    whenToUse: 'To frame negotiations as collaborative rather than adversarial.',
    script: `"I want to be straightforward — I'm excited about this role and I want to make it work. I just need to be able to justify this to myself financially. Help me get there."`,
    psychologyBasis: 'Liking principle (Cialdini): people want to help those they like. Framing yourself as a motivated partner makes the recruiter an internal advocate.',
  },
  {
    tacticName: 'Time Pressure Neutralisation',
    whenToUse: 'When they pressure you to decide quickly.',
    script: `"I'm very interested, and I want to give you a considered answer rather than a rushed one. I can commit to getting back to you by [date 5–7 days out]."`,
    psychologyBasis: 'Artificial deadlines are a pressure tactic. Naming a specific counter-deadline demonstrates professionalism and controls the timeline.',
    caution: "Don't use this if you genuinely have a real deadline from another offer.",
  },
  {
    tacticName: 'The Strategic Thank-You',
    whenToUse: 'At the close of any negotiation — whether successful or not.',
    script: `"I really appreciate the time and effort you've put into working through this with me. Whatever we decide, I want you to know I'll remember how this process was handled — and it reflects very well on the team."`,
    psychologyBasis: "Consistency and commitment bias: people behave consistently with how they've been labelled. Telling them this 'reflects very well' increases probability of positive treatment going forward.",
  },
];

// ── Regional Exit Timing Notes ─────────────────────────────────────────────────

const EXIT_TIMING_MARKET_NOTES_V50: Record<string, (month: number, urgency: string) => string> = {
  IN: (month, urgency) => {
    if (urgency === 'crisis') return 'In a crisis, timing is secondary — move immediately regardless of market cycle.';
    const peakMonths = [1, 2, 3, 7, 8, 9];
    return peakMonths.includes(month)
      ? `Month ${month} is within Indian hiring peak (Jan–Mar, Jul–Sep). Optimal timing — start immediately.`
      : `Month ${month} is outside peak Indian hiring season. Expect 15–25% longer search times. If you can wait, target January or July.`;
  },
  US: (month, urgency) => {
    if (urgency === 'crisis') return 'In a crisis, timing is secondary — move immediately regardless of market cycle.';
    const peakMonths = [1, 2, 3, 9, 10];
    return peakMonths.includes(month)
      ? `Month ${month} is within US hiring peak (Jan–Mar, Sep–Oct). New budget cycles drive strong demand.`
      : `Month ${month} is outside peak US hiring windows. Nov–Dec and Jul–Aug typically extend search timelines 20–30%.`;
  },
  UK: (month, urgency) => {
    if (urgency === 'crisis') return 'In a crisis, timing is secondary — move immediately regardless of market cycle.';
    const peakMonths = [1, 2, 9, 10, 11];
    return peakMonths.includes(month)
      ? `Month ${month} falls in UK peak hiring (Sep–Nov, Jan–Feb). Strong window for financial services and tech.`
      : `Month ${month} is a slower UK period. Summer (Jun–Jul) and December see significantly reduced activity.`;
  },
  SG: (month, urgency) => {
    if (urgency === 'crisis') return 'In a crisis, timing is secondary — move immediately regardless of market cycle.';
    const peakMonths = [1, 2, 3, 4, 8, 9];
    return peakMonths.includes(month)
      ? `Month ${month} is within Singapore peak (Jan–Apr post-CNY, Aug–Sep). Strong MNC and GLC demand.`
      : `Month ${month} is slower for Singapore. EP/S Pass holders: your grace period makes timing critical — start before any layoff is confirmed.`;
  },
  DEFAULT: (_month, urgency) => {
    if (urgency === 'crisis') return 'Timing is secondary in a crisis — prioritise speed of execution over market cycle optimisation.';
    return `Research your local market's peak hiring calendar. Most markets peak at fiscal year start (Jan or Apr) and slow significantly in December.`;
  },
};

// ── Scorecard Helpers ─────────────────────────────────────────────────────────

function scorecardRemoteScore(policy: OfferInput['remotePolicy']): number {
  switch (policy) {
    case 'full_remote':   return 10;
    case 'hybrid_2':      return 8;
    case 'hybrid_3':      return 6;
    case 'office_first':  return 4;
  }
}

function scorecardCommuteScore(minutes: number): number {
  if (minutes <= 15) return 10;
  if (minutes <= 30) return 8;
  if (minutes <= 45) return 6;
  if (minutes <= 60) return 4;
  if (minutes <= 90) return 2;
  return 1;
}

function _offerAddDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function _offerAddWeeks(dateStr: string, weeks: number): string {
  return _offerAddDays(dateStr, Math.round(weeks * 7));
}

function _offerFormatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// ── computeOfferEvaluation ────────────────────────────────────────────────────

export function computeOfferEvaluation(inputs: ScorecardEvaluationInputs): ScorecardEvaluationResult {
  const { offer, rolePrefix, currentBaseSalary, visaRequired } = inputs;
  const weights = SCORECARD_ROLE_WEIGHTS[rolePrefix ?? 'default'] ?? SCORECARD_ROLE_WEIGHTS['default'];

  // Compensation score
  let compensationRawScore = 6;
  if (currentBaseSalary && currentBaseSalary > 0) {
    const pctChange = ((offer.baseSalaryAnnual - currentBaseSalary) / currentBaseSalary) * 100;
    if (pctChange >= 30)      compensationRawScore = 10;
    else if (pctChange >= 20) compensationRawScore = 9;
    else if (pctChange >= 12) compensationRawScore = 8;
    else if (pctChange >= 5)  compensationRawScore = 7;
    else if (pctChange >= 0)  compensationRawScore = 6;
    else if (pctChange >= -5) compensationRawScore = 4;
    else                      compensationRawScore = 2;
  }

  // Equity score
  let equityRawScore = 5;
  if (offer.equityTotalUsd && offer.equityTotalUsd > 0) {
    const vsBase = (offer.equityTotalUsd / offer.baseSalaryAnnual) * 100;
    if (vsBase >= 200)      equityRawScore = 10;
    else if (vsBase >= 100) equityRawScore = 9;
    else if (vsBase >= 50)  equityRawScore = 8;
    else if (vsBase >= 25)  equityRawScore = 7;
    else if (vsBase >= 10)  equityRawScore = 6;
    else                    equityRawScore = 5;
    if ((offer.equityCliffMonths ?? 12) > 18) equityRawScore = Math.max(1, equityRawScore - 2);
  }

  // Remote composite
  const remoteRaw = (scorecardRemoteScore(offer.remotePolicy) + scorecardCommuteScore(offer.commuteMinutes)) / 2;

  // Visa score
  const visaRawScore = visaRequired ? (offer.visaSponsor ? 10 : 1) : 8;

  const factors: OfferScorecardFactor[] = [
    {
      factor: 'Compensation',
      weight: weights.compensation,
      rawScore: compensationRawScore,
      weightedScore: parseFloat((weights.compensation * compensationRawScore).toFixed(3)),
      insight: currentBaseSalary
        ? `${(((offer.baseSalaryAnnual - currentBaseSalary) / currentBaseSalary) * 100).toFixed(1)}% vs current base`
        : `Base: $${offer.baseSalaryAnnual.toLocaleString()}/yr + ${offer.bonusPct}% target bonus`,
    },
    {
      factor: 'Equity',
      weight: weights.equity,
      rawScore: equityRawScore,
      weightedScore: parseFloat((weights.equity * equityRawScore).toFixed(3)),
      insight: offer.equityTotalUsd
        ? `$${offer.equityTotalUsd.toLocaleString()} over ${offer.equityVestingMonths ?? 48}mo (${offer.equityCliffMonths ?? 12}mo cliff)`
        : 'No equity component disclosed',
    },
    {
      factor: 'Role Interest',
      weight: weights.roleInterest,
      rawScore: offer.roleInterestScore,
      weightedScore: parseFloat((weights.roleInterest * offer.roleInterestScore).toFixed(3)),
      insight: offer.roleInterestScore >= 8 ? 'Strong role-fit signal' : offer.roleInterestScore <= 4 ? 'Caution: low role engagement predicted' : 'Moderate fit',
    },
    {
      factor: 'Growth Opportunity',
      weight: weights.growth,
      rawScore: offer.growthOpportunityScore,
      weightedScore: parseFloat((weights.growth * offer.growthOpportunityScore).toFixed(3)),
      insight: offer.growthOpportunityScore >= 8 ? 'High growth trajectory' : offer.growthOpportunityScore <= 4 ? 'Limited advancement path visible' : 'Standard growth path',
    },
    {
      factor: 'Manager Quality',
      weight: weights.manager,
      rawScore: offer.managerQualityScore,
      weightedScore: parseFloat((weights.manager * offer.managerQualityScore).toFixed(3)),
      insight: offer.managerQualityScore >= 8 ? 'Strong manager — highest retention factor' : offer.managerQualityScore <= 4 ? 'Manager concern — most common exit reason' : 'Average manager signal',
    },
    {
      factor: 'Company Stability',
      weight: weights.stability,
      rawScore: offer.companyStabilityScore,
      weightedScore: parseFloat((weights.stability * offer.companyStabilityScore).toFixed(3)),
      insight: offer.companyStabilityScore >= 8 ? 'High stability' : offer.companyStabilityScore <= 4 ? 'Elevated company risk — verify runway' : 'Moderate stability',
    },
    {
      factor: 'Work-Life Balance',
      weight: weights.workLife,
      rawScore: offer.workLifeBalanceScore,
      weightedScore: parseFloat((weights.workLife * offer.workLifeBalanceScore).toFixed(3)),
      insight: offer.workLifeBalanceScore <= 4 ? 'Below-average balance — factor into longevity' : 'Acceptable balance signal',
    },
    {
      factor: 'Remote / Commute',
      weight: weights.remote,
      rawScore: parseFloat(remoteRaw.toFixed(1)),
      weightedScore: parseFloat((weights.remote * remoteRaw).toFixed(3)),
      insight: `${offer.remotePolicy.replace(/_/g, ' ')} — ${offer.commuteMinutes}min commute`,
    },
    {
      factor: 'Visa Sponsorship',
      weight: weights.visa,
      rawScore: visaRawScore,
      weightedScore: parseFloat((weights.visa * visaRawScore).toFixed(3)),
      insight: visaRequired
        ? (offer.visaSponsor ? 'Sponsor confirmed — critical requirement met' : 'NO SPONSOR — deal-breaker if visa required')
        : 'Visa sponsorship not required',
    },
  ];

  const totalScore = Math.min(100, Math.round(
    factors.reduce((sum, f) => sum + f.weightedScore, 0) * 10
  ));

  let scoreInterpretation: ScorecardEvaluationResult['scoreInterpretation'];
  if (totalScore >= 80)      scoreInterpretation = 'excellent';
  else if (totalScore >= 68) scoreInterpretation = 'strong';
  else if (totalScore >= 54) scoreInterpretation = 'acceptable';
  else if (totalScore >= 40) scoreInterpretation = 'borderline';
  else                       scoreInterpretation = 'walk_away';

  const redFlags: string[] = [];
  if (visaRequired && !offer.visaSponsor) redFlags.push('⚠️ No visa sponsorship — deal-breaker if you require sponsorship');
  if (offer.companyStabilityScore <= 3) redFlags.push('⚠️ Very low company stability — high layoff risk within 12 months');
  if (offer.managerQualityScore <= 3) redFlags.push('⚠️ Manager quality concern — leading cause of early attrition');
  if (offer.equityCliffMonths && offer.equityCliffMonths > 24) redFlags.push(`⚠️ Unusually long equity cliff (${offer.equityCliffMonths}mo) — you forfeit equity if you leave before month ${offer.equityCliffMonths}`);
  if (currentBaseSalary && ((offer.baseSalaryAnnual - currentBaseSalary) / currentBaseSalary) < -0.05) redFlags.push('⚠️ Pay cut vs. current role — ensure growth velocity or equity upside justifies this');
  if (offer.workLifeBalanceScore <= 3) redFlags.push('⚠️ Very low work-life balance score — assess sustainability');

  const negotiationPriority = factors
    .filter(f => f.rawScore < 7)
    .sort((a, b) => (a.rawScore / 10) - (b.rawScore / 10))
    .slice(0, 3)
    .map(f => `Negotiate ${f.factor}: currently ${f.rawScore}/10 — request improvement here first`);

  const totalAnnual = offer.baseSalaryAnnual * (1 + offer.bonusPct / 100);
  const compensationAnalysis = currentBaseSalary
    ? `Base $${offer.baseSalaryAnnual.toLocaleString()} is ${(((offer.baseSalaryAnnual - currentBaseSalary) / currentBaseSalary) * 100).toFixed(1)}% vs current. Total target comp = $${totalAnnual.toLocaleString()}/yr.`
    : `Base $${offer.baseSalaryAnnual.toLocaleString()} + ${offer.bonusPct}% bonus = $${totalAnnual.toLocaleString()} target total comp/yr.`;

  const equityAnalysis = offer.equityTotalUsd
    ? `$${offer.equityTotalUsd.toLocaleString()} over ${offer.equityVestingMonths ?? 48}mo (~$${Math.round(offer.equityTotalUsd / ((offer.equityVestingMonths ?? 48) / 12)).toLocaleString()}/yr annualised). Cliff at ${offer.equityCliffMonths ?? 12}mo.`
    : 'No equity disclosed. Request equity details before accepting — standard for most roles above junior level.';

  const counterOfferScript = `"Thank you for the offer. I'm excited about the role and the team. To make this work, I'd need to get to [target base]. Given [specific value you bring], I think that reflects what I'll contribute from day one. Is there flexibility to get there?"`;

  const timelineAdvice = offer.weeksToStart <= 2
    ? 'Very fast start — negotiate longer runway. Request at least 3–4 weeks to close out your current role professionally.'
    : offer.weeksToStart >= 8
      ? 'Extended start timeline. Use this period to complete certifications, document wins, and strengthen your onboarding plan.'
      : `${offer.weeksToStart}-week start is reasonable. Use the time to complete your resignation and handover professionally.`;

  const acceptanceDecisionFramework = `Score: ${totalScore}/100 (${scoreInterpretation.toUpperCase().replace(/_/g, ' ')}). ${
    scoreInterpretation === 'excellent' ? 'Accept with confidence — top-tier package.'
    : scoreInterpretation === 'strong' ? 'Strong offer. Single targeted negotiation before accepting.'
    : scoreInterpretation === 'acceptable' ? 'Acceptable. Negotiate your top 2 priorities before signing.'
    : scoreInterpretation === 'borderline' ? 'Borderline. Negotiate aggressively — if key concerns cannot be addressed, consider declining.'
    : 'Walk-away candidate. Declining is the correct decision unless extraordinary circumstances apply.'
  }`;

  return {
    offerLabel: offer.offerLabel,
    totalScore,
    scoreInterpretation,
    factors,
    compensationAnalysis,
    equityAnalysis,
    redFlags,
    negotiationPriority,
    counterOfferScript,
    timelineAdvice,
    acceptanceDecisionFramework,
  };
}

// ── computeExitTiming ─────────────────────────────────────────────────────────

export function computeExitTiming(inputs: ExitTimingInputs): ExitTimingResult {
  const {
    today, daysToNextVest, nextVestValueUsd, noticePeriodWeeks,
    region, urgency, seniority, newRoleStartDate, isInPip,
  } = inputs;

  const bindingConstraints: string[] = [];
  let exitDate = _offerAddWeeks(today, noticePeriodWeeks);
  let exitDateRationale = `${noticePeriodWeeks}-week standard notice period from today.`;

  const hasSignificantVest =
    daysToNextVest != null && daysToNextVest > 0 && daysToNextVest <= 90 &&
    (nextVestValueUsd ?? 0) >= 10_000;

  if (hasSignificantVest && daysToNextVest != null) {
    const vestDate = _offerAddDays(today, daysToNextVest);
    const noticeStartDate = _offerAddDays(vestDate, 1);
    exitDate = _offerAddWeeks(noticeStartDate, noticePeriodWeeks);
    exitDateRationale = `Vest $${(nextVestValueUsd ?? 0).toLocaleString()} on ${_offerFormatDate(vestDate)} — resign the following business day to maximise total compensation.`;
    bindingConstraints.push(`Equity vest on ${_offerFormatDate(vestDate)} — delay resignation until vest is confirmed in your account`);
  }

  if (isInPip) {
    bindingConstraints.push('⚠️ You are on a PIP — proactive exit before termination protects your reference and severance eligibility');
    exitDateRationale = 'On PIP: exit on your terms before the process concludes. Move to your fastest acceptable timeline.';
    exitDate = _offerAddWeeks(today, Math.min(noticePeriodWeeks, 2));
  }

  if (newRoleStartDate) {
    const gapDays = Math.round((new Date(newRoleStartDate).getTime() - new Date(exitDate).getTime()) / (1000 * 60 * 60 * 24));
    if (gapDays < 7) bindingConstraints.push('⚠️ Less than 7 days between exit and new role start — negotiate a later start or expedite notice');
  }

  const preResignationChecklist = [
    'Download and save all performance reviews and commendations (not company IP)',
    'Export LinkedIn connections (Settings → Data Privacy → Get a copy of your data)',
    'Document key contributions and quantified achievements for resume/reference prep',
    'Collect direct contact details for 3–5 colleagues who can serve as references',
    'Review employment contract for notice period, non-compete scope, and IP assignment',
    'Confirm equity vesting schedule, outstanding grants, and post-termination exercise window',
    'Verify unpaid PTO payout policy in your state/country',
    'Remove personal files from company devices before resignation (access may lock immediately)',
    'Secure evidence of verbal commitments (promotion, comp, title)',
    'Review benefits: health insurance COBRA window, FSA/HSA deadlines, 401k rollover options',
    ...(seniority === 'senior' || seniority === 'staff' || seniority === 'exec'
      ? ['Identify a transition partner for key stakeholder relationships', 'Review equity clawback provisions for competitive employment in your equity plan documents']
      : []),
  ];

  const month = new Date(today).getMonth() + 1;
  const regionKey = (region ?? 'DEFAULT').toUpperCase().slice(0, 2);
  const timingFn = EXIT_TIMING_MARKET_NOTES_V50[regionKey] ?? EXIT_TIMING_MARKET_NOTES_V50['DEFAULT'];
  const marketTimingNote = timingFn(month, urgency);

  const equityConsideration = hasSignificantVest
    ? `$${(nextVestValueUsd ?? 0).toLocaleString()} vest in ${daysToNextVest} days. Waiting costs you nothing if you maintain performance. Leaving before the vest forfeits this permanently. Negotiate your new role's sign-on to cover any future cliff gap.`
    : daysToNextVest != null && daysToNextVest > 90
      ? `Next vest is ${daysToNextVest} days away ($${(nextVestValueUsd ?? 0).toLocaleString()}). Factor into comp negotiation as a sign-on bonus request.`
      : null;

  const referenceProtectionPlan = [
    'Give full professional notice — never resign by email without a conversation first',
    'Offer to write a transition document even if not asked',
    'Avoid badmouthing the company on any platform until well after your exit',
    'Send personal thank-you notes to 3–5 people who impacted your career',
    'Keep your manager informed of transition progress',
    'Request a LinkedIn recommendation before your last day, not after',
  ];

  const sKey = seniority ?? 'mid';
  const scripts = RESIGNATION_SCRIPTS_V50[sKey] ?? RESIGNATION_SCRIPTS_V50['mid'];

  const offboardingStrategy = urgency === 'crisis'
    ? 'Prioritise your welfare and speed. Document the minimum required for legal compliance. Do not over-invest in a company that may be exiting you anyway.'
    : 'Execute a full professional handover. Your reputation follows you longer than your tenure.';

  return {
    recommendedExitDate: exitDate,
    exitDateRationale,
    bindingConstraints,
    preResignationChecklist,
    resignationScript: scripts.email,
    counterOfferResponseScript: scripts.counterOfferResponseScript,
    immediateTerminationScript: scripts.immediateTerminationScript,
    referenceProtectionPlan,
    offboardingStrategy,
    marketTimingNote,
    equityConsideration,
  };
}

// ── computeMultiOfferComparison ───────────────────────────────────────────────

export function computeMultiOfferComparison(
  offerEvaluations: ScorecardEvaluationResult[]
): MultiOfferComparisonResult {
  if (offerEvaluations.length === 0) {
    return {
      rankedOffers: [],
      recommendedOffer: '',
      recommendationRationale: 'No offers to compare.',
      negotiationLeverageNote: 'Obtain at least one offer before assessing leverage.',
      walkAwayThreshold: 54,
    };
  }

  const sorted = [...offerEvaluations].sort((a, b) => b.totalScore - a.totalScore);
  const topScore = sorted[0].totalScore;

  const rankedOffers = sorted.map((offer, idx) => {
    const topFactors = [...offer.factors]
      .sort((a, b) => b.weightedScore - a.weightedScore)
      .slice(0, 2)
      .map(f => `${f.factor} (${f.rawScore}/10)`);
    const bottomFactors = [...offer.factors]
      .sort((a, b) => a.weightedScore - b.weightedScore)
      .slice(0, 2)
      .map(f => `${f.factor} (${f.rawScore}/10)`);
    return {
      rank: idx + 1,
      offerLabel: offer.offerLabel,
      totalScore: offer.totalScore,
      scoreInterpretation: offer.scoreInterpretation,
      topStrengths: topFactors,
      topWeaknesses: bottomFactors,
      vsTopOffer: idx === 0
        ? 'This is the top-ranked offer'
        : `${topScore - offer.totalScore} points below top offer (${sorted[0].offerLabel})`,
    };
  });

  const recommended = sorted[0];
  const hasMultiple = sorted.length > 1;
  const scoreDelta = hasMultiple ? topScore - sorted[1].totalScore : 0;

  const recommendationRationale = hasMultiple
    ? `${recommended.offerLabel} leads at ${recommended.totalScore}/100 — ${scoreDelta} points above the next offer. ${recommended.redFlags.length > 0 ? `Note ${recommended.redFlags.length} red flag(s).` : 'No major red flags.'}`
    : `Only one offer. Score is ${recommended.totalScore}/100 (${recommended.scoreInterpretation}). ${recommended.scoreInterpretation === 'walk_away' ? 'Consider declining and continuing your search unless you have no alternatives.' : 'Negotiate your top priorities before accepting.'}`;

  const negotiationLeverageNote = hasMultiple && sorted[1].totalScore >= 54
    ? `Genuine multi-offer leverage: ${sorted[1].offerLabel} (score: ${sorted[1].totalScore}) is a credible alternative. Use this transparently to negotiate with your preferred choice.`
    : hasMultiple
      ? `Second offer (score: ${sorted[1].totalScore}) is below acceptable threshold. Use as light leverage only.`
      : 'Single-offer situation. Leverage is limited — negotiate on market data and specific value-add.';

  return { rankedOffers, recommendedOffer: recommended.offerLabel, recommendationRationale, negotiationLeverageNote, walkAwayThreshold: 40 };
}

// ── computeNegotiationPsychology ──────────────────────────────────────────────

export function computeNegotiationPsychology(
  leverageRating: 'strong' | 'moderate' | 'weak',
  hasCompetingOffer: boolean
): NegotiationPsychologyResult {
  let recommendedTactics: PsychologicalNegotiationTactic[];

  if (leverageRating === 'strong' && hasCompetingOffer) {
    recommendedTactics = [
      PSYCHOLOGICAL_NEGOTIATION_TACTICS[3],
      PSYCHOLOGICAL_NEGOTIATION_TACTICS[0],
      PSYCHOLOGICAL_NEGOTIATION_TACTICS[1],
      PSYCHOLOGICAL_NEGOTIATION_TACTICS[6],
    ];
  } else if (leverageRating === 'strong') {
    recommendedTactics = [
      PSYCHOLOGICAL_NEGOTIATION_TACTICS[1],
      PSYCHOLOGICAL_NEGOTIATION_TACTICS[0],
      PSYCHOLOGICAL_NEGOTIATION_TACTICS[2],
      PSYCHOLOGICAL_NEGOTIATION_TACTICS[5],
    ];
  } else if (leverageRating === 'moderate') {
    recommendedTactics = [
      PSYCHOLOGICAL_NEGOTIATION_TACTICS[5],
      PSYCHOLOGICAL_NEGOTIATION_TACTICS[4],
      PSYCHOLOGICAL_NEGOTIATION_TACTICS[2],
      PSYCHOLOGICAL_NEGOTIATION_TACTICS[7],
    ];
  } else {
    recommendedTactics = [
      PSYCHOLOGICAL_NEGOTIATION_TACTICS[5],
      PSYCHOLOGICAL_NEGOTIATION_TACTICS[4],
      PSYCHOLOGICAL_NEGOTIATION_TACTICS[7],
      PSYCHOLOGICAL_NEGOTIATION_TACTICS[6],
    ];
  }

  const openingMoveScript = leverageRating === 'strong' && hasCompetingOffer
    ? `"I want to be transparent — I'm evaluating another offer alongside yours. Your role is genuinely my preference, but I need to make a financial decision I can stand behind. What's the best you can do on [compensation/equity/sign-on]?"`
    : leverageRating === 'strong'
      ? `"Based on my research and the scope you've described, I was targeting [anchor number]. Is there flexibility to get there?"`
      : `"I'm very excited about this opportunity and want to make it work. I'd ask for your help getting to [target]. Here's why that's fair: [1–2 specific reasons]."`;

  const anchorPoint = leverageRating === 'strong'
    ? '15–25% above your real target — leaves room to "come down" to exactly where you want to be.'
    : leverageRating === 'moderate'
      ? '8–15% above your real target — ambitious enough to create room, conservative enough to stay credible.'
      : '5–10% above your real target — modest anchor to avoid appearing unrealistic.';

  const bottomLineScript = `"I want to be direct: if we can get to [your true minimum], I'm ready to sign today. Below that number, I wouldn't be able to accept in good conscience — and I'd rather decline respectfully than start with resentment. Is there a path to [minimum]?"`;

  return { recommendedTactics, overallLeverageRating: leverageRating, openingMoveScript, anchorPoint, bottomLineScript };
}
