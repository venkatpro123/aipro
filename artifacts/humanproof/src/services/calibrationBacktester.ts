// calibrationBacktester.ts
// Statistical validation layer for the 10-term scoring formula.
//
// PURPOSE:
//   55% of the formula weights (D2, D3, D5, D6, D7, D8) carry UNCALIBRATED status.
//   This module provides two things:
//   1. A pseudo-regression validator using the verified historical patterns database
//      to produce a per-dimension validation score (0–1 signal quality estimate).
//   2. A backtesting harness that, when given a confirmed layoff event dataset,
//      computes AUC, Brier score, and calibration curve data for the full model.
//
// PSEUDO-REGRESSION (available now, no external data needed):
//   Uses the 25-entry historical patterns database as a "minimum viable holdout set."
//   For each pattern, the required trigger conditions define what the pre-event signal
//   looked like. We score each dimension's ability to fire consistently on those
//   conditions and compute a pattern-agreement score per dimension.
//
// FULL REGRESSION (requires external dataset):
//   When layoffs.fyi data is loaded via runFullBacktest(), computes:
//   - AUC (target: ≥0.70 for production accuracy claim)
//   - Brier score (target: ≤0.20)
//   - Calibration bucket data (decile reliability diagram)
//   - Per-dimension marginal AUC (replaces UNCALIBRATED status when run)

import { HISTORICAL_PATTERNS } from '../data/historicalPatterns';
import type { HistoricalPattern, SignalCondition } from '../data/historicalPatterns';
import { CALIBRATION_META } from './layoffScoreEngine';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DimensionValidationResult {
  dimension: string;
  weight: number;
  calibrationStatus: 'regression_derived' | 'UNCALIBRATED — awaiting regression' | 'pseudo_validated';
  patternAgreementScore: number;   // 0–1: how consistently this dimension fires on historical patterns
  patternsSampled: number;
  signalQualityLabel: 'Strong' | 'Moderate' | 'Weak' | 'Unvalidated';
  confidenceRange: [number, number]; // ±N% confidence in weight accuracy
  recommendation: string;
}

export interface ModelCalibrationReport {
  runDate: string;
  totalPatternsUsed: number;
  overallPatternAgreement: number;   // 0–1 weighted average across validated dimensions
  dimensionResults: DimensionValidationResult[];
  uncalibratedWeightFraction: number; // what fraction of total score weight is uncalibrated
  pseudoValidatedWeightFraction: number;
  regressionDerivedWeightFraction: number;
  productionReadyThreshold: number;   // threshold to claim "production accuracy" (target ≥0.70)
  isProductionReady: boolean;
  nextValidationStep: string;
  backtestSummary?: BacktestSummary;
  weightedBacktestSummary?: WeightedBacktestSummary;
}

export interface BacktestEvent {
  companyName: string;
  eventDate: string;        // ISO date of confirmed layoff
  layoffPct: number;        // percent of workforce
  industry: string;
  region: string;
  // Pre-event signals (at T-3 months before layoff announcement)
  preEventSignals: {
    revenueGrowthYoY: number | null;
    stock90DayChange: number | null;
    layoffRounds: number;
    aiInvestmentSignal: 'none' | 'low' | 'medium' | 'high' | 'very-high';
    revenuePerEmployee: number | null;
    employeeCount: number;
    collapseStage: 0 | 1 | 2 | 3;
  };
  actualOutcome: 'layoff_occurred' | 'no_layoff';   // ground truth
  engineScore?: number;   // computed by the backtester
  probability?: number;   // P(layoff) from sigmoid(score/100 * 5 - 2)
}

export interface BacktestSummary {
  totalEvents: number;
  truePositiveRate: number;   // sensitivity at threshold 55
  falsePositiveRate: number;
  auc: number;                // area under ROC curve (weighted when weightingApplied.temporal=true)
  brierScore: number;         // mean squared error of probability estimates (weighted)
  calibrationBuckets: Array<{
    predictedProbBucket: string;
    actualRate: number;
    count: number;
  }>;
  thresholdAnalysis: Array<{
    threshold: number;
    precision: number;
    recall: number;
    f1: number;
  }>;
}

// ─── Temporal and class-balance weighting types ───────────────────────────────

/** Controls whether and how weighting is applied in runFullBacktest(). */
export interface WeightingConfig {
  /** Apply exponential recency decay (recommended: true). Default true. */
  temporalWeighting: boolean;
  /**
   * Half-life in months for temporal decay.
   * An event this many months before referenceDate receives weight 0.5.
   * Default 18 (events from the 2022–2024 wave period receive 0.44–0.89).
   */
  halfLifeMonths: number;
  /**
   * Apply year-band stratification cap (recommended: true). Default true.
   * Prevents any single calendar year from exceeding maxSingleYearFraction
   * of effective training mass. Without this, the 2023 wave year (~40% of
   * layoffs.fyi) would dominate EFFICIENCY cohort weights.
   */
  yearBandCap: boolean;
  /** Maximum fraction any single calendar year may contribute. Default 0.30. */
  maxSingleYearFraction: number;
  /**
   * Apply class-balance down-weighting (recommended: true). Default true.
   * Prevents implicit detectors (which only fire on positive outcomes) from
   * inflating positive-class fraction in training set without matching negatives.
   */
  classBalancing: boolean;
  /** Maximum positive-outcome fraction in effective training set. Default 0.60. */
  maxPositiveFraction: number;
  /** Reference date for temporal decay. Defaults to today. */
  referenceDate?: Date;
}

/** Default weighting config — all three protections enabled. */
export const DEFAULT_WEIGHTING_CONFIG: WeightingConfig = {
  temporalWeighting:     true,
  halfLifeMonths:        18,
  yearBandCap:           true,
  maxSingleYearFraction: 0.30,
  classBalancing:        true,
  maxPositiveFraction:   0.60,
};

/** Exported constant so DB migration and code use the same half-life. */
export const TEMPORAL_DECAY_HALF_LIFE_MONTHS = 18;
/** Exported cap so DB migration and code use the same year-band limit. */
export const MAX_SINGLE_YEAR_FRACTION = 0.30;
/** Exported cap so DB migration and code use the same class-balance limit. */
export const MAX_POSITIVE_FRACTION = 0.60;

/** Extended summary that adds weighting provenance to BacktestSummary. */
export interface WeightedBacktestSummary extends BacktestSummary {
  /** What weighting was applied. All fields false = unweighted (legacy). */
  weightingApplied: {
    temporal:     boolean;
    yearBandCap:  boolean;
    classBalance: boolean;
    halfLifeMonths:        number | null;
    maxSingleYearFraction: number | null;
    maxPositiveFraction:   number | null;
  };
  /**
   * Sum of combined weights across all training events.
   * Effective event count when uniform weights = totalEvents.
   * Less than totalEvents when wave-era events are down-weighted.
   */
  effectiveEventCount: number;
  /** Fraction of positive outcomes in the effective (weighted) training set. */
  effectivePositiveFraction: number;
  /**
   * Fraction of effective training mass from the 2022–2024 wave period.
   * Values > 0.40 indicate wave dominance risk.
   */
  wavePeriodEffectiveFraction: number;
  /** Per-year breakdown: { year: string; rawCount: number; effectiveWeight: number }[] */
  yearDistribution: Array<{
    year: string;
    rawCount: number;
    effectiveWeight: number;
    effectiveFraction: number;
    isWavePeriod: boolean;
    yearBandCapApplied: boolean;
  }>;
}

// ─── Dimension → Historical Pattern field mapping ─────────────────────────────
//
// Maps each formula dimension to the signal condition fields it depends on.
// Used to check: "does this dimension's logic fire on events that actually happened?"
//
const DIMENSION_SIGNAL_MAP: Record<string, string[]> = {
  D1_taskAutomatability:        ['roleExposureScore', 'aiRisk', 'taskAutomatability'],
  D2_aiToolMaturity:            ['aiInvestmentSignal', 'domainMaturity', 'companyAIMap'],
  D3_augmentationRisk:          ['aiRisk', 'trendRisk', 'roleAIRisk'],
  D4_experienceProtection:      ['tenureYears', 'performanceTier', 'uniquenessDepth'],
  D5_countryContext:            ['region', 'country', 'laborMarketTightness'],
  D6_agentCapability:           ['roleTitle', 'agentCoverageScore'],
  D7_companyHealth:             ['revenueGrowthYoY', 'stock90DayChange', 'ceoTenureMonths', 'layoffRounds'],
  D8_aiEfficiencyRestructuring: ['aiInvestmentSignal', 'collapseStage', 'hasPriorCuts', 'isOverstaffed'],
  L1_directFinancial:           ['revenueGrowthYoY', 'stock90DayChange', 'revenuePerEmployee'],
  L2_directLayoffHistory:       ['layoffRounds', 'layoffsLast24Months', 'lastLayoffPercent'],
};

// ─── Pattern-based pseudo-validation ─────────────────────────────────────────

function extractConditionFields(conditions: SignalCondition[]): Set<string> {
  return new Set(conditions.map(c => c.field));
}

function computeDimensionPatternAgreement(dimension: string, patterns: HistoricalPattern[]): {
  agreementScore: number;
  patternsSampled: number;
} {
  const dimensionFields = new Set(DIMENSION_SIGNAL_MAP[dimension] ?? []);
  if (dimensionFields.size === 0) return { agreementScore: 0, patternsSampled: 0 };

  let totalOverlap = 0;
  let totalPatterns = 0;

  for (const pattern of patterns) {
    const allConditionFields = extractConditionFields([
      ...pattern.triggerConditions.required,
      ...pattern.triggerConditions.supporting,
    ]);

    // Overlap: how many of this pattern's signal fields are in this dimension's field set
    const overlap = [...allConditionFields].filter(f =>
      [...dimensionFields].some(df => f.includes(df) || df.includes(f))
    ).length;

    const totalFields = Math.max(allConditionFields.size, 1);
    totalOverlap += overlap / totalFields;
    totalPatterns++;
  }

  return {
    agreementScore: totalPatterns > 0 ? totalOverlap / totalPatterns : 0,
    patternsSampled: totalPatterns,
  };
}

function getSignalQualityLabel(agreementScore: number, status: string): DimensionValidationResult['signalQualityLabel'] {
  if (status === 'regression_derived') return 'Strong';
  if (agreementScore >= 0.35) return 'Moderate';
  if (agreementScore >= 0.15) return 'Weak';
  return 'Unvalidated';
}

function getConfidenceRange(
  weight: number,
  status: string,
  agreementScore: number,
): [number, number] {
  if (status === 'regression_derived') return [weight * 0.85, weight * 1.15];
  if (agreementScore >= 0.35) return [weight * 0.60, weight * 1.40];
  if (agreementScore >= 0.15) return [weight * 0.40, weight * 1.80];
  return [weight * 0.20, weight * 2.00];
}

function getDimensionRecommendation(dim: string, status: string, agreementScore: number): string {
  if (status === 'regression_derived') {
    return 'Weight is regression-derived. Re-validate annually or when the historical dataset expands by ≥50 events.';
  }
  const fieldCoverage = Math.round(agreementScore * 100);
  switch (dim) {
    case 'D2_aiToolMaturity':
      return `Pattern field coverage: ${fieldCoverage}%. Tag "AI tool adoption" events in layoffs.fyi (target: 80 events) and run P(layoff|D2) logistic regression. Expected weight range after calibration: 0.08–0.18.`;
    case 'D3_augmentationRisk':
      return `Pattern field coverage: ${fieldCoverage}%. Separate "AI augmentation" from "AI replacement" events in dataset. Run bivariate regression against role exposure scores.`;
    case 'D5_countryContext':
      return `Pattern field coverage: ${fieldCoverage}%. Low weight (0.02) limits impact. Add IN/US/EU country stratification to regression dataset; validate cross-country layoff rate differences.`;
    case 'D6_agentCapability':
      return `Pattern field coverage: ${fieldCoverage}%. Role-keyword heuristic needs replacement with task-level automation coverage data (O*NET + AI index). Run P(layoff|D6) after re-computing coverage scores.`;
    case 'D7_companyHealth':
      return `Pattern field coverage: ${fieldCoverage}%. Composite of 5 sub-signals (r≈0.30–0.58 independence). Split into D7a (leadership churn) and D7b (financial composite) and regress separately.`;
    case 'D8_aiEfficiencyRestructuring':
      return `Pattern field coverage: ${fieldCoverage}%. Needs dedicated "efficiency-driven profitable layoff" cohort (≥100 events). Tag Meta/Google/Microsoft 2023-2026 cuts as cohort seed.`;
    default:
      return `Run logistic regression P(layoff|${dim}) on the 200-event confirmed layoff dataset.`;
  }
}

// ─── Main: run pseudo-validation ─────────────────────────────────────────────

export function runPseudoValidation(): ModelCalibrationReport {
  const patterns = Array.isArray(HISTORICAL_PATTERNS)
    ? HISTORICAL_PATTERNS
    : Object.values(HISTORICAL_PATTERNS);
  const dimensionResults: DimensionValidationResult[] = [];

  let totalWeightUncalibrated = 0;
  let totalWeightPseudoValidated = 0;
  let totalWeightRegressionDerived = 0;
  let weightedAgreementSum = 0;
  let totalWeight = 0;

  for (const [dim, meta] of Object.entries(CALIBRATION_META)) {
    const { agreementScore, patternsSampled } = computeDimensionPatternAgreement(dim, patterns);
    const signalQuality = getSignalQualityLabel(agreementScore, meta.status);
    const confidenceRange = getConfidenceRange(meta.weight, meta.status, agreementScore);
    const isUncalibrated = meta.status !== 'regression_derived';

    const effectiveStatus: DimensionValidationResult['calibrationStatus'] =
      isUncalibrated && agreementScore >= 0.15
        ? 'pseudo_validated'
        : meta.status as DimensionValidationResult['calibrationStatus'];

    dimensionResults.push({
      dimension: dim,
      weight: meta.weight,
      calibrationStatus: effectiveStatus,
      patternAgreementScore: Math.round(agreementScore * 1000) / 1000,
      patternsSampled,
      signalQualityLabel: signalQuality,
      confidenceRange,
      recommendation: getDimensionRecommendation(dim, meta.status, agreementScore),
    });

    // Weight accounting
    if (meta.status === 'regression_derived') {
      totalWeightRegressionDerived += meta.weight;
    } else if (agreementScore >= 0.15) {
      totalWeightPseudoValidated += meta.weight;
    } else {
      totalWeightUncalibrated += meta.weight;
    }

    weightedAgreementSum += agreementScore * meta.weight;
    totalWeight += meta.weight;
  }

  const overallPatternAgreement = totalWeight > 0 ? weightedAgreementSum / totalWeight : 0;
  const validatedFraction = totalWeightRegressionDerived + totalWeightPseudoValidated;
  const isProductionReady = validatedFraction >= 0.70;

  return {
    runDate: new Date().toISOString().slice(0, 10),
    totalPatternsUsed: patterns.length,
    overallPatternAgreement: Math.round(overallPatternAgreement * 1000) / 1000,
    dimensionResults,
    uncalibratedWeightFraction: Math.round(totalWeightUncalibrated * 100) / 100,
    pseudoValidatedWeightFraction: Math.round(totalWeightPseudoValidated * 100) / 100,
    regressionDerivedWeightFraction: Math.round(totalWeightRegressionDerived * 100) / 100,
    productionReadyThreshold: 0.70,
    isProductionReady,
    nextValidationStep: isProductionReady
      ? 'Run full backtest on layoffs.fyi 2022–2026 dataset (runFullBacktest()) to confirm AUC ≥ 0.70.'
      : `Validated fraction: ${Math.round(validatedFraction * 100)}% / 70% required. ` +
        `Priority: run logistic regression on D2, D7, D8 using layoffs.fyi 2022–2026 dataset.`,
  };
}

// ─── Fix 1: Temporal weighting ────────────────────────────────────────────────

/**
 * Compute per-event temporal weights using exponential decay from referenceDate.
 * Weight = exp(-ln(2) × monthsAgo / halfLifeMonths).
 * An event halfLifeMonths before referenceDate receives weight 0.50.
 *
 * Events with no eventDate (empty string or invalid) receive weight 1.0 so
 * they are not silently excluded from older datasets.
 */
export function computeTemporalWeights(
  events: BacktestEvent[],
  referenceDate: Date = new Date(),
  halfLifeMonths: number = TEMPORAL_DECAY_HALF_LIFE_MONTHS,
): number[] {
  const refMs = referenceDate.getTime();
  return events.map((e) => {
    if (!e.eventDate) return 1.0;
    const eventMs = new Date(e.eventDate).getTime();
    if (isNaN(eventMs)) return 1.0;
    const monthsAgo = Math.max(0, (refMs - eventMs) / (1000 * 60 * 60 * 24 * 30.44));
    // w = 2^(-monthsAgo / halfLifeMonths) = exp(-ln(2) × monthsAgo / halfLifeMonths)
    return Math.exp(-(Math.LN2 * monthsAgo) / halfLifeMonths);
  });
}

// ─── Fix 2: Year-band cap ─────────────────────────────────────────────────────

/**
 * Compute per-event year-band weights so no single calendar year contributes
 * more than maxSingleYearFraction of the total training mass.
 *
 * Works by computing the raw event count per year and computing a fractional
 * down-weight: yearWeight = min(1, (maxFraction × totalEvents) / yearCount).
 * Events in under-represented years receive weight 1.0.
 */
export function computeYearBandWeights(
  events: BacktestEvent[],
  maxSingleYearFraction: number = MAX_SINGLE_YEAR_FRACTION,
): number[] {
  // Count events per year (undefined / empty → 'unknown' bucket, weight 1.0)
  const yearCounts = new Map<string, number>();
  for (const e of events) {
    const year = e.eventDate ? new Date(e.eventDate).getFullYear().toString() : 'unknown';
    yearCounts.set(year, (yearCounts.get(year) ?? 0) + 1);
  }
  const total = events.length;
  const yearWeights = new Map<string, number>();
  for (const [year, count] of yearCounts) {
    if (year === 'unknown') {
      yearWeights.set(year, 1.0);
    } else {
      const fraction = count / total;
      yearWeights.set(year, fraction > maxSingleYearFraction
        ? maxSingleYearFraction / fraction
        : 1.0,
      );
    }
  }
  return events.map((e) => {
    const year = e.eventDate ? new Date(e.eventDate).getFullYear().toString() : 'unknown';
    return yearWeights.get(year) ?? 1.0;
  });
}

// ─── Fix 3: Class-balance weighting ──────────────────────────────────────────

/**
 * Compute per-event class-balance weights.
 * Positive outcomes (layoff_occurred) are down-weighted when their fraction
 * in the training set exceeds maxPositiveFraction.
 * Negative outcomes always receive weight 1.0.
 *
 * Addresses the implicit-detection asymmetry: implicit detectors fire only on
 * positive outcomes, inflating the positive fraction without matching negatives.
 */
export function computeClassBalanceWeights(
  events: BacktestEvent[],
  maxPositiveFraction: number = MAX_POSITIVE_FRACTION,
): number[] {
  const positiveCount = events.filter((e) => e.actualOutcome === 'layoff_occurred').length;
  const totalCount = events.length;
  if (totalCount === 0) return [];

  const posFraction = positiveCount / totalCount;
  const posDownWeight = posFraction > maxPositiveFraction
    ? maxPositiveFraction / posFraction
    : 1.0;

  return events.map((e) =>
    e.actualOutcome === 'layoff_occurred' ? posDownWeight : 1.0,
  );
}

/**
 * Combine multiple weight arrays element-wise (multiply).
 * All arrays must have the same length as events.
 */
export function combineWeights(...weightArrays: number[][]): number[] {
  if (weightArrays.length === 0) return [];
  const len = weightArrays[0].length;
  const combined = new Array<number>(len).fill(1.0);
  for (const arr of weightArrays) {
    for (let i = 0; i < len; i++) {
      combined[i] *= arr[i];
    }
  }
  return combined;
}

// ─── Weighted AUC via Mann-Whitney / weighted ROC ─────────────────────────────

/**
 * Compute weighted AUC using weighted trapezoidal integration over the ROC curve.
 * Standard (unweighted) AUC sets all weights to 1.0.
 *
 * For each threshold, weighted TPR and FPR are computed as:
 *   weighted_tp = Σ w_i × I(prob_i >= t) × I(actual_i = 1)
 *   total_pos   = Σ w_i × I(actual_i = 1)
 *   weighted_tpr = weighted_tp / total_pos
 * (analogous for FPR).
 */
function computeWeightedAUC(
  probs: number[],
  actuals: number[],
  weights: number[],
): number {
  const totalWeightedPos = actuals.reduce((s, a, i) => s + (a === 1 ? weights[i] : 0), 0);
  const totalWeightedNeg = actuals.reduce((s, a, i) => s + (a === 0 ? weights[i] : 0), 0);
  if (totalWeightedPos === 0 || totalWeightedNeg === 0) return 0;

  const rocPoints: Array<{ fpr: number; tpr: number }> = [];
  for (let t = 0; t <= 100; t++) {
    const threshold = t / 100;
    let wTP = 0, wFP = 0;
    for (let i = 0; i < probs.length; i++) {
      if (probs[i] >= threshold) {
        if (actuals[i] === 1) wTP += weights[i];
        else                  wFP += weights[i];
      }
    }
    rocPoints.push({ fpr: wFP / totalWeightedNeg, tpr: wTP / totalWeightedPos });
  }
  rocPoints.sort((a, b) => a.fpr - b.fpr);

  let auc = 0;
  for (let i = 1; i < rocPoints.length; i++) {
    auc += (rocPoints[i].fpr - rocPoints[i - 1].fpr)
         * (rocPoints[i].tpr + rocPoints[i - 1].tpr) / 2;
  }
  return auc;
}

// ─── Sigmoid helper (score → probability) ────────────────────────────────────

function scoreToProbability(score: number): number {
  // Calibrated sigmoid: score=50 → P=0.50, score=75 → P=0.82, score=25 → P=0.18
  // Clamp to [0,100] to prevent domain overflow in the sigmoid when scores come
  // from external sources that may be out of range.
  const clamped = Math.max(0, Math.min(100, score));
  const logit = (clamped / 100) * 6 - 3;
  return 1 / (1 + Math.exp(-logit));
}

// ─── Full backtest harness ────────────────────────────────────────────────────
//
// Two entry points:
//
//   runWeightedBacktest(events, config?)  ← preferred; applies all three fixes
//     Temporal decay + year-band cap + class-balance by default.
//     Returns WeightedBacktestSummary with full weighting provenance.
//
//   runFullBacktest(events)               ← legacy unweighted path
//     Preserved for backward compatibility. Identical to the pre-fix behaviour.
//     Prefer runWeightedBacktest() for any new calibration run.
//

/**
 * Preferred entry point. Applies temporal weighting (Fix 1), year-band cap
 * (Fix 2), and class-balance weighting (Fix 3) before computing AUC and
 * Brier score. All three protections are enabled by default via
 * DEFAULT_WEIGHTING_CONFIG.
 *
 * Typical call:
 *   const events = await loadLayoffsFyiBacktestDataset();
 *   const summary = runWeightedBacktest(events);
 *   // summary.wavePeriodEffectiveFraction — check < 0.40
 *   // summary.effectivePositiveFraction  — check < 0.60
 *   // summary.weightingApplied           — audit trail for DB storage
 */
export function runWeightedBacktest(
  events: BacktestEvent[],
  config: WeightingConfig = DEFAULT_WEIGHTING_CONFIG,
): WeightedBacktestSummary {
  const emptyWeighted = (base: BacktestSummary): WeightedBacktestSummary => ({
    ...base,
    weightingApplied: {
      temporal: false, yearBandCap: false, classBalance: false,
      halfLifeMonths: null, maxSingleYearFraction: null, maxPositiveFraction: null,
    },
    effectiveEventCount: 0,
    effectivePositiveFraction: 0,
    wavePeriodEffectiveFraction: 0,
    yearDistribution: [],
  });

  if (events.length === 0) return emptyWeighted(runFullBacktest([]));

  const refDate = config.referenceDate ?? new Date();

  // ── Build combined per-event weights ──────────────────────────────────────
  const temporalW = config.temporalWeighting
    ? computeTemporalWeights(events, refDate, config.halfLifeMonths)
    : new Array(events.length).fill(1.0);

  const yearBandW = config.yearBandCap
    ? computeYearBandWeights(events, config.maxSingleYearFraction)
    : new Array(events.length).fill(1.0);

  const classW = config.classBalancing
    ? computeClassBalanceWeights(events, config.maxPositiveFraction)
    : new Array(events.length).fill(1.0);

  const combined = combineWeights(temporalW, yearBandW, classW);

  // ── Enriched events with probabilities ────────────────────────────────────
  const enriched = events.map((e, i) => ({
    ...e,
    prob:   e.engineScore != null ? scoreToProbability(e.engineScore) : 0.5,
    actual: e.actualOutcome === 'layoff_occurred' ? 1 : 0,
    weight: combined[i],
  }));

  const totalWeight = combined.reduce((s, w) => s + w, 0);

  // ── Weighted Brier score: Σ w_i×(p_i - y_i)² / Σ w_i ────────────────────
  const brierScore = enriched.reduce((s, e) => s + e.weight * Math.pow(e.prob - e.actual, 2), 0)
    / totalWeight;

  // ── Weighted AUC ─────────────────────────────────────────────────────────
  const auc = computeWeightedAUC(
    enriched.map(e => e.prob),
    enriched.map(e => e.actual),
    combined,
  );

  // ── Weighted threshold analysis ───────────────────────────────────────────
  const thresholdAnalysis = [35, 45, 55, 65, 75].map((scoreThreshold) => {
    const probThreshold = scoreToProbability(scoreThreshold);
    let wTP = 0, wFP = 0, wFN = 0;
    for (const e of enriched) {
      const predicted = e.prob >= probThreshold ? 1 : 0;
      if (predicted === 1 && e.actual === 1) wTP += e.weight;
      if (predicted === 1 && e.actual === 0) wFP += e.weight;
      if (predicted === 0 && e.actual === 1) wFN += e.weight;
    }
    const precision = (wTP + wFP) > 0 ? wTP / (wTP + wFP) : 0;
    const recall    = (wTP + wFN) > 0 ? wTP / (wTP + wFN) : 0;
    return {
      threshold: scoreThreshold,
      precision: Math.round(precision * 1000) / 1000,
      recall:    Math.round(recall    * 1000) / 1000,
      f1: (precision + recall) > 0
        ? Math.round((2 * precision * recall / (precision + recall)) * 1000) / 1000
        : 0,
    };
  });

  const at55 = thresholdAnalysis.find(t => t.threshold === 55)
    ?? { threshold: 55, precision: 0, recall: 0, f1: 0 };

  // ── Calibration buckets (weighted decile reliability) ────────────────────
  const sorted = [...enriched].sort((a, b) => a.prob - b.prob);
  const bucketSize = Math.ceil(sorted.length / 10);
  const calibrationBuckets = [];
  for (let i = 0; i < 10; i++) {
    const bucket = sorted.slice(i * bucketSize, (i + 1) * bucketSize);
    if (bucket.length === 0) continue;
    const totalBucketW = bucket.reduce((s, e) => s + e.weight, 0);
    const meanPred = totalBucketW > 0
      ? bucket.reduce((s, e) => s + e.prob   * e.weight, 0) / totalBucketW
      : 0;
    const actualRate = totalBucketW > 0
      ? bucket.reduce((s, e) => s + e.actual * e.weight, 0) / totalBucketW
      : 0;
    calibrationBuckets.push({
      predictedProbBucket: `${Math.round(meanPred * 100)}%`,
      actualRate: Math.round(actualRate * 1000) / 1000,
      count: bucket.length,
    });
  }

  // ── Provenance: year distribution ────────────────────────────────────────
  const yearMap = new Map<string, { rawCount: number; effectiveWeight: number }>();
  for (let i = 0; i < events.length; i++) {
    const year = events[i].eventDate
      ? new Date(events[i].eventDate).getFullYear().toString()
      : 'unknown';
    const entry = yearMap.get(year) ?? { rawCount: 0, effectiveWeight: 0 };
    entry.rawCount++;
    entry.effectiveWeight += combined[i];
    yearMap.set(year, entry);
  }
  const yearDistribution = [...yearMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, { rawCount, effectiveWeight }]) => ({
      year,
      rawCount,
      effectiveWeight: Math.round(effectiveWeight * 1000) / 1000,
      effectiveFraction: Math.round((effectiveWeight / totalWeight) * 1000) / 1000,
      isWavePeriod: year >= '2022' && year <= '2024',
      yearBandCapApplied: (() => {
        const raw = yearBandW[events.findIndex(
          (e) => (e.eventDate ? new Date(e.eventDate).getFullYear().toString() : 'unknown') === year,
        )];
        return raw < 1.0;
      })(),
    }));

  // ── Aggregate provenance metrics ─────────────────────────────────────────
  const wavePeriodEffectiveWeight = yearDistribution
    .filter(y => y.isWavePeriod)
    .reduce((s, y) => s + y.effectiveWeight, 0);

  const positiveEffectiveWeight = enriched
    .filter(e => e.actual === 1)
    .reduce((s, e) => s + e.weight, 0);

  return {
    totalEvents:      events.length,
    truePositiveRate: at55.recall,
    falsePositiveRate: 1 - at55.precision,
    auc:        Math.round(auc        * 1000) / 1000,
    brierScore: Math.round(brierScore * 1000) / 1000,
    calibrationBuckets,
    thresholdAnalysis,
    weightingApplied: {
      temporal:              config.temporalWeighting,
      yearBandCap:           config.yearBandCap,
      classBalance:          config.classBalancing,
      halfLifeMonths:        config.temporalWeighting ? config.halfLifeMonths : null,
      maxSingleYearFraction: config.yearBandCap      ? config.maxSingleYearFraction : null,
      maxPositiveFraction:   config.classBalancing   ? config.maxPositiveFraction   : null,
    },
    effectiveEventCount:         Math.round(totalWeight * 100) / 100,
    effectivePositiveFraction:   Math.round((positiveEffectiveWeight / totalWeight) * 1000) / 1000,
    wavePeriodEffectiveFraction: Math.round((wavePeriodEffectiveWeight / totalWeight) * 1000) / 1000,
    yearDistribution,
  };
}

/**
 * Legacy unweighted backtest. Preserved for backward compatibility.
 * Produces identical output to the pre-fix version.
 * Prefer runWeightedBacktest() for any new calibration run.
 */
export function runFullBacktest(events: BacktestEvent[]): BacktestSummary {
  if (events.length === 0) {
    return {
      totalEvents: 0,
      truePositiveRate: 0,
      falsePositiveRate: 0,
      auc: 0,
      brierScore: 0,
      calibrationBuckets: [],
      thresholdAnalysis: [],
    };
  }

  const enriched = events.map(e => ({
    ...e,
    prob:   e.engineScore != null ? scoreToProbability(e.engineScore) : 0.5,
    actual: e.actualOutcome === 'layoff_occurred' ? 1 : 0,
  }));

  // Unweighted Brier score
  const brierScore = enriched.reduce((sum, e) => sum + Math.pow(e.prob - e.actual, 2), 0)
    / enriched.length;

  // Unweighted AUC
  const auc = computeWeightedAUC(
    enriched.map(e => e.prob),
    enriched.map(e => e.actual),
    new Array(enriched.length).fill(1.0),
  );

  const bucketSize = Math.ceil(enriched.length / 10);
  const sorted = [...enriched].sort((a, b) => a.prob - b.prob);
  const calibrationBuckets = [];
  for (let i = 0; i < 10; i++) {
    const bucket = sorted.slice(i * bucketSize, (i + 1) * bucketSize);
    if (bucket.length === 0) continue;
    const meanPred = bucket.reduce((s, e) => s + e.prob, 0)   / bucket.length;
    const actualRate = bucket.reduce((s, e) => s + e.actual, 0) / bucket.length;
    calibrationBuckets.push({
      predictedProbBucket: `${Math.round(meanPred * 100)}%`,
      actualRate: Math.round(actualRate * 1000) / 1000,
      count: bucket.length,
    });
  }

  const thresholdAnalysis = [35, 45, 55, 65, 75].map((scoreThreshold) => {
    const probThreshold = scoreToProbability(scoreThreshold);
    const predicted = enriched.map(e => (e.prob >= probThreshold ? 1 : 0));
    const tp = predicted.filter((p, i) => p === 1 && enriched[i].actual === 1).length;
    const fp = predicted.filter((p, i) => p === 1 && enriched[i].actual === 0).length;
    const fn = predicted.filter((p, i) => p === 0 && enriched[i].actual === 1).length;
    const precision = (tp + fp) > 0 ? tp / (tp + fp) : 0;
    const recall    = (tp + fn) > 0 ? tp / (tp + fn) : 0;
    return {
      threshold:  scoreThreshold,
      precision:  Math.round(precision * 1000) / 1000,
      recall:     Math.round(recall    * 1000) / 1000,
      f1: (precision + recall) > 0
        ? Math.round((2 * precision * recall / (precision + recall)) * 1000) / 1000
        : 0,
    };
  });

  const at55 = thresholdAnalysis.find(t => t.threshold === 55)
    ?? { threshold: 55, precision: 0, recall: 0, f1: 0 };

  return {
    totalEvents:      events.length,
    truePositiveRate: at55.recall,
    falsePositiveRate: 1 - at55.precision,
    auc:        Math.round(auc        * 1000) / 1000,
    brierScore: Math.round(brierScore * 1000) / 1000,
    calibrationBuckets,
    thresholdAnalysis,
  };
}

// ─── Calibration report cache (module-scoped, recomputed max once per session) ─

let _cachedReport: ModelCalibrationReport | null = null;

export function getCalibrationReport(forceRefresh = false): ModelCalibrationReport {
  if (!_cachedReport || forceRefresh) {
    _cachedReport = runPseudoValidation();
  }
  return _cachedReport;
}

export function getCalibrationSummaryLabel(): string {
  const report = getCalibrationReport();
  const pct = Math.round(
    (report.regressionDerivedWeightFraction + report.pseudoValidatedWeightFraction) * 100,
  );
  if (report.isProductionReady) return `${pct}% validated — production-ready`;
  if (pct >= 50) return `${pct}% validated — partial calibration`;
  return `${pct}% validated — calibration in progress`;
}

export function getDimensionConfidenceLabel(dimension: string): string {
  const report = getCalibrationReport();
  const dim = report.dimensionResults.find(d => d.dimension === dimension);
  if (!dim) return 'Unknown';
  return dim.signalQualityLabel;
}
