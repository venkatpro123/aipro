// outcomeBacktestRunner.ts — WS2
//
// Wires the existing calibrationBacktester full-harness path
// (`runFullBacktest`) to live outcomes from user_prediction_outcomes.
//
// Previously, runFullBacktest was scaffolded but never received real
// outcomes — it was called only from the pseudo-validation path against
// HISTORICAL_PATTERNS. This module is the missing connector.
//
// Per-cohort stratification:
//   The WS2 acceptance criteria requires AUC + Brier per cohort
//   (DISTRESS / EFFICIENCY / WAVE / UNKNOWN). We compute the global AUC
//   AND a per-cohort AUC by filtering the loaded outcomes on
//   predicted_cohort.
//
// Quality gate:
//   Only rows with detection_confidence >= MIN_TRAINING_CONFIDENCE
//   (default 0.75) are admitted to the training set. This excludes
//   speculative news-cache implicit detections that would otherwise
//   inject noise.
//
// Selection bias correction:
//   The legacy 200-event layoffs.fyi calibration has severe survivor bias
//   (companies are in the dataset *because* they had layoffs). To
//   measure how much the live outcome stream corrects this, we expose
//   `selectionBiasReport()` which compares the layoffs.fyi-seeded set
//   against the implicit-detected set on key metrics.

import { supabase } from '../utils/supabase';
import { outcomesRepo, type OutcomeRow as RepoOutcomeRow } from '../infrastructure/repositories/outcomesRepository';
import {
  runFullBacktest,
  type BacktestEvent,
  type BacktestSummary,
} from './calibrationBacktester';

// ── Config ──────────────────────────────────────────────────────────────────

const MIN_TRAINING_CONFIDENCE = 0.75;
const DEFAULT_WINDOW_DAYS = 365;
const MAX_ROWS = 5000;

export type CohortLabel = 'DISTRESS' | 'EFFICIENCY' | 'WAVE' | 'UNKNOWN' | 'ALL';

// ── Outcome row ─────────────────────────────────────────────────────────────

interface OutcomeRow {
  user_id: string;
  audit_session_id: string | null;
  company_name: string;
  role_title: string | null;
  predicted_risk_tier: string;
  predicted_score: number;
  audit_date: string;
  outcome_reported: string;
  outcome_date: string | null;
  outcome_source: string | null;
  detection_confidence: number | null;
  predicted_cohort: string | null;
  predicted_archetype: string | null;
}

export interface BacktestRunOptions {
  /** Lookback window in days. Defaults to 365. */
  windowDays?: number;
  /** Only include rows with detection_confidence >= this. Default 0.75. */
  minConfidence?: number;
  /** Cohort scope; 'ALL' merges everything. */
  cohort?: CohortLabel;
  /** Cap on rows loaded — keeps single backtest under a few seconds. */
  maxRows?: number;
}

export interface BacktestRunResult {
  cohort: CohortLabel;
  windowStart: string;
  windowEnd: string;
  loadedOutcomes: number;
  trainingSet: number;        // after confidence gate
  layoffPositives: number;    // outcome_reported in {laid_off, company_closed}
  layoffNegatives: number;    // outcome_reported in {still_employed, role_changed, left_voluntarily, false_alarm}
  outcomeSourceBreakdown: Record<string, number>;
  summary: BacktestSummary;
}

// ── Outcome → BacktestEvent conversion ──────────────────────────────────────

const POSITIVE_OUTCOMES = new Set(['laid_off', 'company_closed']);
const NEGATIVE_OUTCOMES = new Set(['still_employed', 'role_changed', 'left_voluntarily', 'false_alarm']);

function outcomeToBacktestEvent(row: OutcomeRow): BacktestEvent | null {
  const isPositive = POSITIVE_OUTCOMES.has(row.outcome_reported);
  const isNegative = NEGATIVE_OUTCOMES.has(row.outcome_reported);
  if (!isPositive && !isNegative) return null;

  // We do not have the original signal values stored on the outcome row —
  // the backtester's pre-event signals are best-effort reconstructed
  // from the predicted_score. Future work: persist a snapshot of input
  // signals onto user_prediction_outcomes at audit time.
  return {
    companyName: row.company_name,
    eventDate: row.outcome_date ?? row.audit_date,
    layoffPct: 0,                  // unknown without re-running pipeline
    industry: 'unknown',
    region: 'unknown',
    preEventSignals: {
      revenueGrowthYoY: null,
      stock90DayChange: null,
      layoffRounds: 0,
      aiInvestmentSignal: 'medium',
      revenuePerEmployee: null,
      employeeCount: 0,
      collapseStage: 0,
    },
    actualOutcome: isPositive ? 'layoff_occurred' : 'no_layoff',
    engineScore: row.predicted_score,
  };
}

// ── Loader ──────────────────────────────────────────────────────────────────

async function loadOutcomes(opts: Required<BacktestRunOptions>): Promise<OutcomeRow[]> {
  // DEBT-3 — direct supabase access replaced by the typed repository. The
  // repo applies the confidence gate AND the cohort filter internally, so
  // the legacy client-side post-filter is no longer needed.
  const rows: RepoOutcomeRow[] = await outcomesRepo().loadConfirmedOutcomes({
    windowDays: opts.windowDays,
    minConfidence: opts.minConfidence,
    cohort: opts.cohort,
    maxRows: opts.maxRows,
  });
  // Map RepoOutcomeRow → local OutcomeRow shape (the local one omits `id`
  // which the backtest doesn't consume).
  return rows.map((r) => ({
    user_id: r.user_id,
    audit_session_id: r.audit_session_id,
    company_name: r.company_name,
    role_title: r.role_title,
    predicted_risk_tier: r.predicted_risk_tier,
    predicted_score: r.predicted_score,
    audit_date: r.audit_date,
    outcome_reported: r.outcome_reported ?? '',
    outcome_date: r.outcome_date,
    outcome_source: r.outcome_source,
    detection_confidence: r.detection_confidence,
    predicted_cohort: r.predicted_cohort,
    predicted_archetype: r.predicted_archetype,
  }));
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Run the full empirical backtest against live outcomes for a given cohort.
 */
export async function runBacktest(opts: BacktestRunOptions = {}): Promise<BacktestRunResult> {
  const filled: Required<BacktestRunOptions> = {
    windowDays: opts.windowDays ?? DEFAULT_WINDOW_DAYS,
    minConfidence: opts.minConfidence ?? MIN_TRAINING_CONFIDENCE,
    cohort: opts.cohort ?? 'ALL',
    maxRows: opts.maxRows ?? MAX_ROWS,
  };

  const rows = await loadOutcomes(filled);
  const events: BacktestEvent[] = [];
  const sourceCounts: Record<string, number> = {};
  let positives = 0;
  let negatives = 0;

  for (const r of rows) {
    const e = outcomeToBacktestEvent(r);
    if (!e) continue;
    events.push(e);
    if (e.actualOutcome === 'layoff_occurred') positives++;
    else negatives++;
    sourceCounts[r.outcome_source ?? 'unknown'] = (sourceCounts[r.outcome_source ?? 'unknown'] ?? 0) + 1;
  }

  const summary = runFullBacktest(events);
  const windowStart = new Date(Date.now() - filled.windowDays * 86400e3).toISOString();

  return {
    cohort: filled.cohort,
    windowStart,
    windowEnd: new Date().toISOString(),
    loadedOutcomes: rows.length,
    trainingSet: events.length,
    layoffPositives: positives,
    layoffNegatives: negatives,
    outcomeSourceBreakdown: sourceCounts,
    summary,
  };
}

/**
 * Run the backtest for every cohort and return a flat array. Used by the
 * recalibrate-engine cron job and the WS8 admin CalibrationPanel.
 */
export async function runStratifiedBacktest(opts: Omit<BacktestRunOptions, 'cohort'> = {}): Promise<BacktestRunResult[]> {
  const cohorts: CohortLabel[] = ['ALL', 'DISTRESS', 'EFFICIENCY', 'WAVE', 'UNKNOWN'];
  // Serial execution — each call hits the same table; running parallel
  // queries against the same supabase client risks rate-limit churn.
  const results: BacktestRunResult[] = [];
  for (const cohort of cohorts) {
    results.push(await runBacktest({ ...opts, cohort }));
  }
  return results;
}

/**
 * Compare the outcome-source mix to surface the selection-bias correction.
 * If the live system is well-functioning, implicit-detected outcomes
 * should outnumber user-reported ones (since most users do not respond
 * to outcome prompts).
 */
export async function selectionBiasReport(): Promise<{
  windowDays: number;
  bySource: Record<string, number>;
  userReportRate: number;
  implicitDetectionRate: number;
  agreementRateOnDualCoded: number | null;
}> {
  // DEBT-3 — repository-mediated read instead of direct supabase access.
  const bySource = await outcomesRepo().outcomeSourceBreakdown({ windowDays: 90 });
  const total = Object.values(bySource).reduce((a, b) => a + b, 0);
  const userReported = bySource.user_reported ?? 0;
  const implicit = (bySource.implicit_warn ?? 0) + (bySource.implicit_layoffsfyi ?? 0) + (bySource.implicit_news ?? 0);

  // Dual-coded agreement: % of dual_coded rows where user and implicit
  // agreed. Sourced from outcome_dual_coding_candidates view.
  let agreementRate: number | null = null;
  try {
    const { data: dc } = await supabase
      .from('outcome_dual_coding_candidates')
      .select('agree')
      .limit(MAX_ROWS);
    const rows = (dc ?? []) as Array<{ agree: boolean | null }>;
    if (rows.length > 0) {
      const agreed = rows.filter((r) => r.agree === true).length;
      agreementRate = agreed / rows.length;
    }
  } catch {
    // view may not exist on partial migrations — silently omit
  }

  return {
    windowDays: 90,
    bySource,
    userReportRate: total > 0 ? userReported / total : 0,
    implicitDetectionRate: total > 0 ? implicit / total : 0,
    agreementRateOnDualCoded: agreementRate,
  };
}
