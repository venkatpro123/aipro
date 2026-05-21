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
