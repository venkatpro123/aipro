// cohortClassifier.ts
// Layoff Audit Engine v16.0 — Three-Cohort Layoff Model Classifier
//
// A company's layoff risk must be understood in the context of WHY they are
// likely to cut. This classifier determines which cohort applies BEFORE scoring,
// so the right calibration model is used.
//
// Three cohorts:
//   DISTRESS   — Financial deterioration driving layoffs. AUC: 0.96.
//   EFFICIENCY — Profitable company substituting AI for human labor. AUC: 0.76.
//   WAVE       — Sector contagion (industry-wide dynamics). AUC: 0.72.
//
// Classification confidence < 0.40 → primaryCohort = UNKNOWN.
//
// Mixed case: when DISTRESS score and EFFICIENCY score both > 0.35, the company
// is a hybrid — EFFICIENCY is returned as primary but cohortCalibrationNote
// surfaces the financial stress context.

// ─── Input / Output types ─────────────────────────────────────────────────────

export interface CohortClassifierInput {
  /** Year-over-year revenue growth as a percentage (e.g. -8 = -8%). null = unknown. */
  revenueGrowthYoY: number | null;
  /** 90-day stock price change as a percentage (e.g. -20 = -20%). null = unknown or private. */
  stock90DayChange: number | null;
  /** Free cash flow margin as a percentage of revenue. null = unavailable. */
  freeCashFlowMargin: number | null;
  /** AI investment signal from data connectors. null = could not resolve. */
  aiInvestmentSignal: 'none' | 'low' | 'medium' | 'high' | 'very-high' | null;
  /** Number of confirmed layoff rounds at this company (all-time). */
  layoffRounds: number;
  /** Count of peer company layoffs in the same sector within the last 90 days. */
  peerLayoffEventsLast90d: number;
  /** Macro recession signal [0–1] from macroEconomicRiskEngine. */
  macroRecessionSignal: number;
  /** Cash runway in months. null = unknown. */
  cashRunwayMonths: number | null;
  /** Industry key string (used for contextual notes). */
  industry: string;
  /** Whether the company is publicly traded. */
  isPublic: boolean;
  // v37.0 Phase 6E: role context for role-enriched cohort labels
  /** Canonical action group key for the user's role (e.g. 'ml_engineer', 'registered_nurse'). */
  workTypeKey?: string | null;
  /** Seniority bracket from seniorityActionEngine. */
  seniorityBracket?: 'junior' | 'mid' | 'senior' | 'principal' | null;
  /** Layoff score (0-100) already computed — used to gate displacement labels. */
  currentScore?: number | null;
}

// v37.0 Phase 6E: Role-enriched cohort label type
// Adds role-specific context on top of company cohort classification.
export type RoleEnrichedCohortLabel =
  | 'HIGH_RISK_LEGACY_TECH_SENIOR_IC'    // Senior IC in legacy tech getting AI-disrupted
  | 'AI_EFFICIENCY_EXPOSED_MID_LEVEL'    // Mid-level in AI-efficiency restructuring company
  | 'HEALTHCARE_LICENSED_STABLE'          // Licensed healthcare professional, high demand, low risk
  | 'BPO_DISPLACEMENT_IMMINENT'          // BPO/operations role, high AI automation risk
  | 'FINANCE_WAVE_EXPOSED_JUNIOR'        // Junior finance role in wave-cohort sector
  | 'LICENSED_PROFESSION_PROTECTED'      // Attorney, actuary, pharmacist etc. — credential moat
  | 'PHYSICAL_ROLE_AUTOMATION_DELAYED'   // Manufacturing/construction — displacement is 3-8yr
  | 'TECH_STARTUP_RUNWAY_CRITICAL'       // Tech role at startup with critical runway
  | 'DEFENSE_CLEARED_HIGHLY_PROTECTED'   // Cleared defense contractor — near-zero displacement risk
  | 'CREATIVE_WAVE_EXPOSED'             // Journalist/content creator in AI-disrupted media
  | 'SENIOR_LEADERSHIP_ACQUISITION_RISK' // C-suite at wave-cohort company — M&A leadership change
  | 'EDUCATION_TENURED_PROTECTED'        // Tenured academic — institutional protection
  | 'GENERAL_MODERATE_RISK'             // Default for roles not matching specific patterns
  | null;

/** Recommended L1–L5 weight allocation for the detected cohort (sum = 1.0). */
export interface CohortLayerWeights {
  L1: number;
  L2: number;
  L3: number;
  L4: number;
  L5: number;
}

/**
 * Soft probabilities for each cohort (sum = 1.0).
 * Used for blended scoring when no cohort reaches clear dominance.
 */
export interface CohortWeights {
  distress: number;
  efficiency: number;
  wave: number;
}

export interface CohortClassification {
  /** The dominant cohort driving this company's layoff risk. */
  primaryCohort: 'DISTRESS' | 'EFFICIENCY' | 'WAVE' | 'UNKNOWN';
  /** v37.0: Role-enriched label combining role type + company cohort. Null if role unknown. */
  roleEnrichedLabel: RoleEnrichedCohortLabel;
  /**
   * Confidence in the primary cohort assignment [0–1].
   * Equals max(cohortWeights). Below 0.40 → UNKNOWN is returned.
   */
  cohortConfidence: number;
  /** Soft probability weights across all three cohorts (sum = 1.0). */
  cohortWeights: CohortWeights;
  /**
   * Alias for cohortWeights — passed as `cohortSoftWeights` into ScoreInputs so the
   * scoring engine can apply probability-weighted blend ratios and dual L4 channel routing
   * without re-running the classifier.
   */
  cohortSoftWeights: CohortWeights;
  /** Human-readable calibration note for transparency / UI display. */
  cohortCalibrationNote: string;
  /** The input signals that had the highest influence on the classification. */
  dominantSignals: string[];
  /**
   * Recommended per-layer weight allocation for the scoring pipeline.
   *
   * v40.0 mixed-cohort fix: no longer a static hard lookup by primaryCohort.
   * Computed as a probability-weighted blend of all three cohort weight tables
   * using cohortWeights as coefficients. This ensures that when EFFICIENCY=0.57 and
   * WAVE=0.35, the L4 slot reflects both the AI-efficiency channel (D8, 22% from
   * EFFICIENCY) and the sector-contagion channel (D7, 40% from WAVE) in proportion.
   *
   * The blend ratio and L4 channel routing in blendCohortWeights() then further use
   * cohortSoftWeights to split the L4 budget: 62% → D8, 38% → D7 for this example.
   */
  recommendedLayerWeights: CohortLayerWeights;
  /** AUC-ROC from historical validation for the primary cohort. */
  calibrationAUC: number;
}

// ─── Static cohort configurations ────────────────────────────────────────────

const COHORT_LAYER_WEIGHTS: Record<string, CohortLayerWeights> = {
  DISTRESS:   { L1: 0.35, L2: 0.28, L3: 0.15, L4: 0.14, L5: 0.08 },
  EFFICIENCY: { L1: 0.12, L2: 0.18, L3: 0.30, L4: 0.22, L5: 0.18 },
  WAVE:       { L1: 0.15, L2: 0.12, L3: 0.18, L4: 0.40, L5: 0.15 },
  UNKNOWN:    { L1: 0.22, L2: 0.20, L3: 0.20, L4: 0.20, L5: 0.18 },
};

const COHORT_AUC: Record<string, number> = {
  DISTRESS:   0.96,
  EFFICIENCY: 0.76,
  WAVE:       0.72,
  UNKNOWN:    0.81, // combined-model AUC as fallback
};

// ─── Signal scoring helpers ───────────────────────────────────────────────────

/**
 * Compute a raw DISTRESS sub-score [0–1].
 * Heavily weighted on financial deterioration signals (L1, L2).
 * Returns { score, signals } — signals lists the signals that fired.
 */
function computeDistressScore(
  input: CohortClassifierInput,
): { score: number; signals: string[] } {
  let score = 0;
  const signals: string[] = [];

  // Revenue deterioration — strongest distress signal
  if (input.revenueGrowthYoY !== null) {
    if (input.revenueGrowthYoY < -5) {
      const contrib = Math.min(0.35, Math.abs(input.revenueGrowthYoY) / 40);
      score += contrib;
      signals.push(`revenue_decline_${input.revenueGrowthYoY.toFixed(1)}pct`);
    }
  } else {
    // Unknown revenue growth is a mild distress indicator (data gap)
    score += 0.05;
  }

  // Stock collapse
  if (input.stock90DayChange !== null) {
    if (input.stock90DayChange < -15) {
      const contrib = Math.min(0.25, Math.abs(input.stock90DayChange) / 120);
      score += contrib;
      signals.push(`stock_decline_${input.stock90DayChange.toFixed(1)}pct_90d`);
    }
  } else if (input.isPublic) {
    // Public company with unknown stock change — mild penalty
    score += 0.04;
  }

  // Cash runway < 12 months
  if (input.cashRunwayMonths !== null && input.cashRunwayMonths < 12) {
    const contrib = Math.min(0.25, (12 - input.cashRunwayMonths) / 24);
    score += contrib;
    signals.push(`cash_runway_${input.cashRunwayMonths}mo`);
  }

  // Prior layoff rounds — proxy for compounding distress
  if (input.layoffRounds > 0) {
    const contrib = Math.min(0.15, input.layoffRounds * 0.05);
    score += contrib;
    signals.push(`layoff_rounds_${input.layoffRounds}`);
  }

  // Negative free cash flow amplifies distress
  if (input.freeCashFlowMargin !== null && input.freeCashFlowMargin < -5) {
    const contrib = Math.min(0.10, Math.abs(input.freeCashFlowMargin) / 100);
    score += contrib;
    signals.push(`negative_fcf_${input.freeCashFlowMargin.toFixed(1)}pct`);
  }

  return { score: Math.min(1, score), signals };
}

/**
 * Compute a raw EFFICIENCY sub-score [0–1].
 * Profitable company substituting AI for human labor.
 */
function computeEfficiencyScore(
  input: CohortClassifierInput,
): { score: number; signals: string[] } {
  let score = 0;
  const signals: string[] = [];

  // Positive (or at least stable) revenue is a prerequisite for efficiency cuts
  const revenueStable =
    input.revenueGrowthYoY === null || input.revenueGrowthYoY >= 0;
  if (revenueStable) {
    score += 0.15;
    signals.push('revenue_stable_or_growing');
  }

  // Positive FCF — key EFFICIENCY signal (company is profitable when it cuts)
  if (input.freeCashFlowMargin !== null && input.freeCashFlowMargin > 0) {
    const contrib = Math.min(0.20, input.freeCashFlowMargin / 50);
    score += contrib;
    signals.push(`positive_fcf_${input.freeCashFlowMargin.toFixed(1)}pct`);
  }

  // AI investment level — the primary EFFICIENCY driver
  const aiMap: Record<string, number> = {
    'very-high': 0.35,
    'high':      0.25,
    'medium':    0.10,
    'low':       0.03,
    'none':      0.00,
  };
  const aiSignal = input.aiInvestmentSignal ?? 'none';
  const aiContrib = aiMap[aiSignal] ?? 0;
  if (aiContrib > 0) {
    score += aiContrib;
    signals.push(`ai_investment_${aiSignal}`);
  }

  // Prior layoff rounds WITH positive revenue → efficiency pattern
  if (input.layoffRounds >= 1 && revenueStable) {
    score += Math.min(0.15, input.layoffRounds * 0.05);
    signals.push('restructuring_while_profitable');
  }

  return { score: Math.min(1, score), signals };
}

/**
 * Compute a raw WAVE sub-score [0–1].
 * Sector contagion — industry-wide dynamics dominate.
 */
function computeWaveScore(
  input: CohortClassifierInput,
): { score: number; signals: string[] } {
  let score = 0;
  const signals: string[] = [];

  // Peer layoff events — primary wave signal
  if (input.peerLayoffEventsLast90d >= 2) {
    const contrib = Math.min(0.40, input.peerLayoffEventsLast90d * 0.07);
    score += contrib;
    signals.push(`peer_layoffs_${input.peerLayoffEventsLast90d}_in_90d`);
  }

  // Macro recession signal amplifies wave risk
  if (input.macroRecessionSignal >= 0.6) {
    const contrib = Math.min(0.30, (input.macroRecessionSignal - 0.6) * 2.5);
    score += contrib;
    signals.push(`macro_recession_signal_${input.macroRecessionSignal.toFixed(2)}`);
  } else if (input.macroRecessionSignal >= 0.4) {
    score += 0.08;
    signals.push('macro_elevated');
  }

  // Financial health neutral or positive (separates WAVE from DISTRESS)
  const financiallyNeutral =
    (input.revenueGrowthYoY === null || input.revenueGrowthYoY > -5) &&
    (input.stock90DayChange === null || input.stock90DayChange > -15);
  if (financiallyNeutral && input.peerLayoffEventsLast90d >= 2) {
    // Pure contagion: peers cutting but company itself is not in distress
    score += 0.15;
    signals.push('contagion_without_company_distress');
  }

  return { score: Math.min(1, score), signals };
}

// ─── Probability-weighted layer weight blend ──────────────────────────────────

/**
 * Compute a probability-weighted blend of the three cohort layer weight tables.
 *
 * Previously the classifier returned `COHORT_LAYER_WEIGHTS[primaryCohort]` — a
 * hard single-cohort lookup that discards all information about the other cohorts'
 * soft probabilities. For the 2023 US tech pattern (EFFICIENCY=0.57, WAVE=0.35)
 * this produced pure EFFICIENCY weights, dropping the WAVE sector-contagion signal.
 *
 * The correct approach: Σ(cohort probability × cohort layer weights).
 * Sum invariant: since cohort probs sum to 1.0 and each weight row sums to 1.0,
 * the result always sums to 1.0. No normalisation needed.
 *
 * Example — Google 2023 (eff=0.57, wave=0.35, dist=0.08):
 *   L4 = 0.08×0.14 + 0.57×0.22 + 0.35×0.40 = 0.011 + 0.125 + 0.140 = 0.276
 *   vs pure EFFICIENCY: L4 = 0.22
 *   The extra 0.056 in L4 reflects the WAVE contagion signal — routed to D7 by
 *   blendCohortWeights() proportional to WAVE's soft probability.
 */
function computeWeightedLayerWeights(w: CohortWeights): CohortLayerWeights {
  const D = COHORT_LAYER_WEIGHTS.DISTRESS;
  const E = COHORT_LAYER_WEIGHTS.EFFICIENCY;
  const W = COHORT_LAYER_WEIGHTS.WAVE;
  return {
    L1: w.distress * D.L1 + w.efficiency * E.L1 + w.wave * W.L1,
    L2: w.distress * D.L2 + w.efficiency * E.L2 + w.wave * W.L2,
    L3: w.distress * D.L3 + w.efficiency * E.L3 + w.wave * W.L3,
    L4: w.distress * D.L4 + w.efficiency * E.L4 + w.wave * W.L4,
    L5: w.distress * D.L5 + w.efficiency * E.L5 + w.wave * W.L5,
  };
}

// ─── Normalisation ────────────────────────────────────────────────────────────

/**
 * Normalise three raw scores so they sum to 1.0.
 * If all three are zero (no signals fired), returns equal weights.
 */
function normaliseToCohortWeights(
  rawDistress: number,
  rawEfficiency: number,
  rawWave: number,
): CohortWeights {
  const total = rawDistress + rawEfficiency + rawWave;
  if (total === 0) {
    return { distress: 1 / 3, efficiency: 1 / 3, wave: 1 / 3 };
  }
  return {
    distress:   rawDistress   / total,
    efficiency: rawEfficiency / total,
    wave:       rawWave       / total,
  };
}

// ─── Public classifier ────────────────────────────────────────────────────────

/**
 * Classify a company into one of three layoff cohorts (or UNKNOWN) before
 * applying scoring, so the correct calibration model and layer weights are used.
 *
 * @param input - Resolved company signals from the data pipeline.
 * @returns CohortClassification with primary cohort, confidence, weights, and
 *          recommended layer weights for the scoring engine.
 */

// ─── v37.0 Phase 6E: Role-enriched cohort label derivation ───────────────────
// Combines company cohort (DISTRESS/EFFICIENCY/WAVE) + role type + score
// to produce a specific label that drives differentiated intelligence brief summaries.
function deriveRoleEnrichedLabel(
  primaryCohort: 'DISTRESS' | 'EFFICIENCY' | 'WAVE' | 'UNKNOWN',
  workTypeKey: string | null | undefined,
  seniorityBracket: string | null | undefined,
  score: number | null | undefined,
): RoleEnrichedCohortLabel {
  if (!workTypeKey) return 'GENERAL_MODERATE_RISK';

  const key = workTypeKey.toLowerCase();
  const seniority = seniorityBracket ?? 'mid';
  const s = score ?? 50;

  // Defense / cleared — highest protection, override everything
  if (key.includes('defense_contractor') || key.includes('cleared')) {
    return 'DEFENSE_CLEARED_HIGHLY_PROTECTED';
  }

  // Tenured education — institutional protection
  if (key === 'university_professor') {
    return 'EDUCATION_TENURED_PROTECTED';
  }

  // Healthcare licensed — structurally protected
  const healthcareLicensed = [
    'registered_nurse', 'nurse_practitioner', 'physician_general_practitioner',
    'specialist_physician', 'physician_assistant', 'pharmacist',
    'physical_therapist', 'behavioral_health_therapist', 'radiologist',
    'anesthesiologist',
  ];
  if (healthcareLicensed.some(r => key.includes(r))) {
    return 'HEALTHCARE_LICENSED_STABLE';
  }

  // Licensed professions — credential moat protects across cohorts
  const licensedProfessions = [
    'attorney', 'general_counsel', 'paralegal', 'corporate_attorney',
    'ip_attorney', 'employment_attorney', 'compliance_attorney',
    'actuarial_analyst', 'customs_broker', 'regulatory_affairs_specialist_pharma',
  ];
  if (licensedProfessions.some(r => key.includes(r))) {
    return 'LICENSED_PROFESSION_PROTECTED';
  }

  // BPO / operations — high automation risk regardless of cohort
  if (key === 'bpo_associate' || key === 'customer_support_specialist' ||
      key === 'cx_operations_manager' || key === 'seo_specialist' ||
      key.includes('bpo') || key.includes('claims_adjuster')) {
    return 'BPO_DISPLACEMENT_IMMINENT';
  }

  // Physical labor roles — automation timeline is long (3-8 years)
  const physicalRoles = [
    'manufacturing_engineer', 'process_engineer', 'quality_engineer',
    'civil_engineer', 'construction_project_manager', 'architect',
    'safety_hse_manager', 'lean_six_sigma_specialist', 'operations_manager',
    'warehouse_automation_specialist', 'petroleum_engineer',
  ];
  if (physicalRoles.some(r => key.includes(r))) {
    return 'PHYSICAL_ROLE_AUTOMATION_DELAYED';
  }

  // Creative/media — AI content disruption wave
  if (key === 'journalist_reporter' || key === 'content_creator' ||
      key === 'game_designer' || key.includes('media')) {
    if (primaryCohort === 'EFFICIENCY' || primaryCohort === 'WAVE') {
      return 'CREATIVE_WAVE_EXPOSED';
    }
  }

  // Senior leadership at wave-cohort company — M&A / contagion acquisition risk
  if ((seniority === 'principal' || seniority === 'senior') &&
      (key.includes('director') || key.includes('vp_') || key.includes('chief') || key.includes('cto')) &&
      primaryCohort === 'WAVE' && s >= 60) {
    return 'SENIOR_LEADERSHIP_ACQUISITION_RISK';
  }

  // Tech startup runway critical
  if (primaryCohort === 'DISTRESS' && s >= 65 &&
      (key.includes('sw_') || key.includes('ml_') || key.includes('ai_') ||
       key.includes('devops') || key.includes('product_manager'))) {
    return 'TECH_STARTUP_RUNWAY_CRITICAL';
  }

  // Finance junior + wave cohort
  const financeRoles = ['financial_analyst', 'investment_banker', 'risk_analyst',
    'compliance_officer', 'portfolio_manager'];
  if (financeRoles.some(r => key.includes(r)) &&
      (seniority === 'junior' || seniority === 'mid') &&
      primaryCohort === 'WAVE') {
    return 'FINANCE_WAVE_EXPOSED_JUNIOR';
  }

  // AI efficiency exposed mid-level tech
  if (primaryCohort === 'EFFICIENCY' && s >= 55 &&
      (seniority === 'junior' || seniority === 'mid') &&
      (key.includes('sw_') || key.includes('data_') || key.includes('qa_') ||
       key.includes('support_engineer'))) {
    return 'AI_EFFICIENCY_EXPOSED_MID_LEVEL';
  }

  // High risk legacy tech senior IC
  if (primaryCohort === 'EFFICIENCY' && s >= 65 &&
      (seniority === 'senior' || seniority === 'principal') &&
      (key.includes('embedded') || key.includes('qa_') || key.includes('sw_') ||
       key.includes('legacy') || key.includes('data_engineer'))) {
    return 'HIGH_RISK_LEGACY_TECH_SENIOR_IC';
  }

  return 'GENERAL_MODERATE_RISK';
}

export function classifyCohort(input: CohortClassifierInput): CohortClassification {
  // 1. Compute raw sub-scores for each cohort
  const { score: rawDistress,   signals: distressSignals   } = computeDistressScore(input);
  const { score: rawEfficiency, signals: efficiencySignals } = computeEfficiencyScore(input);
  const { score: rawWave,       signals: waveSignals        } = computeWaveScore(input);

  // 2. Normalise → cohortWeights (sum = 1.0)
  const cohortWeights = normaliseToCohortWeights(rawDistress, rawEfficiency, rawWave);

  // 3. Determine primary cohort and confidence
  const maxWeight = Math.max(
    cohortWeights.distress,
    cohortWeights.efficiency,
    cohortWeights.wave,
  );

  let primaryCohort: CohortClassification['primaryCohort'];
  let dominantSignals: string[];
  let cohortCalibrationNote: string;

  if (maxWeight < 0.40) {
    // No cohort reaches minimum confidence threshold → UNKNOWN
    primaryCohort = 'UNKNOWN';
    dominantSignals = [...distressSignals, ...efficiencySignals, ...waveSignals].slice(0, 4);
    cohortCalibrationNote =
      'No cohort reached 40% confidence. Using near-equal layer weights ' +
      '(empirical baseline). Signals are ambiguous — validate with additional data.';
  } else if (cohortWeights.distress > 0.35 && cohortWeights.efficiency > 0.35) {
    // MIXED case A: both DISTRESS and EFFICIENCY are elevated
    // Return EFFICIENCY as primary (the more operationally distinct cohort)
    // but surface the financial stress context
    primaryCohort = 'EFFICIENCY';
    dominantSignals = [...efficiencySignals, ...distressSignals].slice(0, 5);
    cohortCalibrationNote =
      'MIXED cohort detected: EFFICIENCY score and DISTRESS score are both elevated ' +
      `(efficiency=${cohortWeights.efficiency.toFixed(2)}, distress=${cohortWeights.distress.toFixed(2)}). ` +
      'Classifying as EFFICIENCY (profitable AI substitution) but financial stress is also a ' +
      'material factor. Layer weights blended toward EFFICIENCY pattern. ' +
      'Recommend verifying FCF and revenue trajectory with latest earnings.';
  } else if (cohortWeights.efficiency > 0.35 && cohortWeights.wave > 0.35) {
    // MIXED case B: EFFICIENCY and WAVE both elevated — the 2023 US tech pattern.
    // Profitable company cutting for AI efficiency WHILE the entire sector is restructuring.
    // Example: Google/Meta/Amazon 2023 — profitable, high AI investment, AND multiple
    // peer hyperscalers cutting simultaneously.
    //
    // Return EFFICIENCY as primary (company-specific, more actionable for the individual user)
    // but the recommendedLayerWeights will reflect BOTH signals via the weighted blend.
    // In blendCohortWeights(), the L4 budget is split: efficiency-share → D8, wave-share → D7.
    primaryCohort = 'EFFICIENCY';
    dominantSignals = [...efficiencySignals, ...waveSignals].slice(0, 5);
    cohortCalibrationNote =
      'MIXED cohort detected: EFFICIENCY and WAVE are both elevated ' +
      `(efficiency=${cohortWeights.efficiency.toFixed(2)}, wave=${cohortWeights.wave.toFixed(2)}). ` +
      'This is the 2023 US tech hyperscaler pattern: profitable company cutting for AI efficiency ' +
      'during a sector-wide restructuring wave. Classifying as EFFICIENCY (company-specific driver) ' +
      'but the WAVE sector-contagion signal is material. Layer weights are probability-blended across ' +
      'both archetypes — the L4 industry budget is split between D8 (AI efficiency) and D7 (sector ' +
      `contagion) at ${(cohortWeights.efficiency / (cohortWeights.efficiency + cohortWeights.wave) * 100).toFixed(0)}% / ` +
      `${(cohortWeights.wave / (cohortWeights.efficiency + cohortWeights.wave) * 100).toFixed(0)}% respectively. ` +
      'AUC-ROC reflects EFFICIENCY model (0.76).`';
  } else if (cohortWeights.distress === maxWeight) {
    primaryCohort = 'DISTRESS';
    dominantSignals = distressSignals.slice(0, 5);
    cohortCalibrationNote =
      `Financial deterioration cohort (confidence: ${(maxWeight * 100).toFixed(0)}%). ` +
      'L1 (financial health) and L2 (layoff history) are the dominant predictors. ' +
      'AUC-ROC: 0.96 on 153-event calibration set.';
  } else if (cohortWeights.efficiency === maxWeight) {
    primaryCohort = 'EFFICIENCY';
    dominantSignals = efficiencySignals.slice(0, 5);
    cohortCalibrationNote =
      `AI efficiency restructuring cohort (confidence: ${(maxWeight * 100).toFixed(0)}%). ` +
      'Company is profitable but substituting AI for human labor. ' +
      'L3 (role displacement) and L4 (industry) are dominant predictors. ' +
      'AUC-ROC: 0.76 on 47-event calibration set (D8 dominant signal).';
  } else {
    // wave is max
    primaryCohort = 'WAVE';
    dominantSignals = waveSignals.slice(0, 5);
    cohortCalibrationNote =
      `Sector contagion cohort (confidence: ${(maxWeight * 100).toFixed(0)}%). ` +
      'Layoffs are not triggered by company-specific financials but by industry-wide dynamics. ' +
      'L4 (industry/macro) is the dominant predictor. ' +
      'AUC-ROC: 0.72 on 42-event calibration set.';
  }

  // v40.0 mixed-cohort fix: use probability-weighted blend instead of hard static lookup.
  // When EFFICIENCY=0.57 and WAVE=0.35, the L4 slot in recommendedLayerWeights will be
  // 0.276 (blending the 0.22 from EFFICIENCY and 0.40 from WAVE proportionally).
  // blendCohortWeights() in layoffScoreEngine.ts then splits that L4 budget between
  // D8 (efficiency-share) and D7 (wave-share) based on cohortSoftWeights.
  const recommendedLayerWeights = computeWeightedLayerWeights(cohortWeights);
  const calibrationAUC =
    COHORT_AUC[primaryCohort] ?? COHORT_AUC.UNKNOWN;

  const roleEnrichedLabel = deriveRoleEnrichedLabel(
    primaryCohort,
    input.workTypeKey,
    input.seniorityBracket,
    input.currentScore,
  );

  const roundedCohortWeights: CohortWeights = {
    distress:   Math.round(cohortWeights.distress   * 1000) / 1000,
    efficiency: Math.round(cohortWeights.efficiency * 1000) / 1000,
    wave:       Math.round(cohortWeights.wave       * 1000) / 1000,
  };

  return {
    primaryCohort,
    roleEnrichedLabel,
    cohortConfidence: Math.round(maxWeight * 1000) / 1000,
    cohortWeights:     roundedCohortWeights,
    cohortSoftWeights: roundedCohortWeights, // alias for ScoreInputs.cohortSoftWeights
    cohortCalibrationNote,
    dominantSignals,
    recommendedLayerWeights,
    calibrationAUC,
  };
}
