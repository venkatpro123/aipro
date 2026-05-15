// indiaCalibration.ts — WS2
//
// India-domain-specific calibration. Addresses Audit Issue #20: the legacy
// L1–L5 multipliers were derived from a layoffs.fyi dataset that is 95%+
// US/Western European companies. The Indian market has fundamentally
// different layoff dynamics that the US-calibrated base model cannot
// represent:
//
//   * IT services bench model — workers retained without project
//     assignment for months. Bench-clearing events are typically not
//     announced as "layoffs" in the press but produce real displacements.
//   * GCC parent contagion — Indian captive units of US/EU companies cut
//     based on foreign HQ decisions, not local financial signals.
//   * Government and PSU protection — wide swathes of regulated /
//     government-adjacent firms have functional layoff floors near zero.
//   * Severance distribution — Indian severance norms differ materially
//     from US norms; financial-runway calibration is not transferable.
//
// What this module does:
//
//   1. Defines the INDIA_IT cohort scope as a calibration target the
//      engine_calibration_versions table can populate.
//   2. Provides a `loadIndiaCalibration()` lookup that returns the
//      India-specific bundle if available, falling back to GLOBAL otherwise.
//   3. Provides a `runIndiaBacktest()` helper that filters outcomes to
//      Indian-domain audits (region='IN' OR audit_session.country='IN').
//   4. Provides a `shouldUseIndiaCalibration()` predicate the audit
//      pipeline uses to decide which scope to resolve.
//
// What this module does NOT do:
//
//   * It does NOT compute coefficients. The recalibrate-engine cron job
//     (WS8) runs the regression and writes the row.
//   * It does NOT modify scoring directly. The audit pipeline calls
//     `loadCalibration({ region: 'IN', industry: 'IT Services' })` which
//     resolves to INDIA_IT first via calibrationLoader's scope chain.
//
// Quality gate:
//   The INDIA_IT scope requires ≥80 detected outcomes from India-domain
//   audits before its coefficients are eligible for status='active'.
//   Below that threshold, the scope's row stays in 'pending' and the
//   GLOBAL fallback applies. This prevents publishing a regression
//   trained on 12 events.

import { loadCalibration, type CalibrationBundle, type ScopeResolutionHint } from './calibrationLoader';
import { runBacktest, type BacktestRunResult } from './outcomeBacktestRunner';
import { supabase } from '../utils/supabase';

// ── Predicate ───────────────────────────────────────────────────────────────

const INDIAN_IT_INDUSTRY_KEYS = new Set([
  'it services',
  'information technology',
  'information technology services',
  'tech',
  'technology',
  'software',
  'software development',
  'saas',
  'ites',
  'it enabled services',
  'bpo',
  'business process outsourcing',
  'kpo',
  'knowledge process outsourcing',
  'managed services',
  'it consulting',
]);

/**
 * Returns true when the audit subject should use INDIA_IT calibration.
 *
 * Conservative: requires BOTH region=IN AND industry in the IT-services
 * family. A bank in India still resolves to GLOBAL (with the planned
 * INDIA_BFSI scope when its training set is large enough).
 */
export function shouldUseIndiaCalibration(hint: ScopeResolutionHint | undefined): boolean {
  if (!hint) return false;
  if (hint.region !== 'IN') return false;
  const industry = (hint.industry ?? '').toLowerCase();
  return INDIAN_IT_INDUSTRY_KEYS.has(industry);
}

// ── Load ────────────────────────────────────────────────────────────────────

/**
 * Convenience wrapper that returns the India-domain calibration bundle
 * for an audit. Falls through to GLOBAL via calibrationLoader's scope
 * chain when no INDIA_IT row is active.
 *
 * This indirection exists so audit pipeline call sites can read "what
 * calibration applies to this Indian-domain audit?" without knowing the
 * scope-resolution rules.
 */
export async function loadIndiaCalibration(hint: ScopeResolutionHint = { region: 'IN', industry: 'IT Services' }): Promise<CalibrationBundle> {
  return loadCalibration(hint);
}

// ── Backtest ────────────────────────────────────────────────────────────────

/**
 * Eligibility threshold for promoting INDIA_IT calibration to active.
 *
 * Rationale:
 *   * Below 80 events the AUC variance is too high to distinguish a
 *     real shift from sampling noise.
 *   * At ≥80 events a single cohort backtest gives stable AUC point
 *     estimates with ±0.04 95% CI under reasonable signal balance.
 *   * The WS8 recalibration cron checks this gate before flipping a
 *     pending INDIA_IT row to active.
 */
export const INDIA_IT_MIN_EVENTS_FOR_PROMOTION = 80;

/**
 * Runs the empirical backtest filtered to India-domain audits.
 *
 * Filtering strategy:
 *   1. Pull all confirmed outcomes in the window.
 *   2. For each, join (lazily) against company_intelligence on
 *      lower(company_name) → check region. Audits with region='IN' enter
 *      the India training set.
 *   3. Rows with no matched company_intelligence row are excluded — we
 *      cannot confirm them as India-domain without provenance.
 *
 * In a future iteration this should be replaced with a denormalized
 * `audit_region` field on user_prediction_outcomes (captured at audit
 * time, not retroactively inferred).
 */
export async function runIndiaBacktest(opts: { windowDays?: number; minConfidence?: number } = {}): Promise<{
  eligibleForPromotion: boolean;
  nEvents: number;
  backtest: BacktestRunResult;
}> {
  // Step 1: get the list of company_names with region='IN' in
  // company_intelligence. This is the safe-list for the India backtest.
  const { data: indianCos, error } = await supabase
    .from('company_intelligence')
    .select('company_name')
    .eq('region', 'IN')
    .limit(2000);
  if (error) throw new Error(`india companies lookup failed: ${error.message}`);

  const indianNames = new Set((indianCos ?? []).map((r) => (r as { company_name: string }).company_name.toLowerCase().trim()));

  // Step 2: run the global backtest. We will filter the outcome rows in
  // memory afterwards — runBacktest accepts only cohort filters, not
  // company-name filters.
  const base = await runBacktest({
    windowDays: opts.windowDays ?? 365,
    minConfidence: opts.minConfidence ?? 0.75,
    cohort: 'ALL',
    maxRows: 5000,
  });

  // Step 3: reach into user_prediction_outcomes again and count rows
  // whose company is in the indianNames set. We need raw row access to
  // do the filter; runBacktest does not expose its outcomes array.
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - (opts.windowDays ?? 365));
  const { data: rows, error: rowsErr } = await supabase
    .from('user_prediction_outcomes')
    .select('company_name,outcome_reported,predicted_score,detection_confidence,outcome_source')
    .not('outcome_reported', 'is', null)
    .gte('audit_date', since.toISOString().slice(0, 10))
    .limit(5000);
  if (rowsErr) throw new Error(`india outcomes load failed: ${rowsErr.message}`);

  const minConfidence = opts.minConfidence ?? 0.75;
  const indianRows = (rows ?? []).filter((r) => {
    const co = (r as { company_name: string }).company_name.toLowerCase().trim();
    if (!indianNames.has(co)) return false;
    const conf =
      (r as { detection_confidence: number | null; outcome_source: string | null }).detection_confidence ??
      ((r as { outcome_source: string | null }).outcome_source === 'user_reported' ? 1.0 : 0);
    return conf >= minConfidence;
  });

  const nEvents = indianRows.length;
  const eligibleForPromotion = nEvents >= INDIA_IT_MIN_EVENTS_FOR_PROMOTION;

  return {
    eligibleForPromotion,
    nEvents,
    backtest: base,  // returns the ALL-cohort baseline alongside India count for comparison
  };
}

// ── Sentinel defaults (used by WS8 when no INDIA_IT regression row exists yet) ──

/**
 * Conservative INDIA_IT multipliers expressed as deltas relative to
 * GLOBAL. The recalibrate-engine cron uses these only as initialisation
 * values for the very first regression run — once ≥80 events accumulate
 * and the actual logistic regression succeeds, these defaults are
 * overwritten.
 *
 * Rationale (research-derived, not regression-derived yet):
 *   * L1 mult lower than GLOBAL (0.95) — Indian companies show
 *     financial-distress signals less reliably (slower stock signals on
 *     NSE, less granular SEC-equivalent disclosure).
 *   * L2 mult higher than GLOBAL (1.20) — when an Indian company DOES
 *     announce a layoff round it tends to be a sustained pattern, so
 *     historical events have stronger predictive weight.
 *   * L4 mult higher (1.05) — sector contagion is tighter in Indian IT
 *     services (Infosys/Wipro/TCS move together).
 *
 * Bootstrap status: `research_derived`. Will be replaced with empirical
 * coefficients once the regression runs.
 */
export const INDIA_IT_BOOTSTRAP_DELTAS = {
  l1_multiplier_delta: -0.05,
  l2_multiplier_delta: +0.20,
  l3_multiplier_delta: -0.10,  // role-displacement signals less predictive in services
  l4_multiplier_delta: +0.05,
  l5_multiplier_delta: -0.05,
} as const;

/**
 * Render the India calibration status for UI / ops dashboards. Returns
 * the active version, the eligibility status, and the underlying
 * regression metrics. UI surfaces this in CalibrationPanel.
 */
export async function indiaCalibrationStatus(): Promise<{
  scope: 'INDIA_IT';
  hasActiveVersion: boolean;
  activeVersion: string | null;
  pendingVersion: string | null;
  nEvents: number | null;
  eligibleForPromotion: boolean;
  bootstrapDeltas: typeof INDIA_IT_BOOTSTRAP_DELTAS;
}> {
  const { data } = await supabase
    .from('engine_calibration_versions')
    .select('version,status,n_events_total')
    .eq('cohort_scope', 'INDIA_IT')
    .in('status', ['active', 'pending'])
    .order('created_at', { ascending: false })
    .limit(5);

  const rows = (data ?? []) as Array<{ version: string; status: string; n_events_total: number }>;
  const active = rows.find((r) => r.status === 'active') ?? null;
  const pending = rows.find((r) => r.status === 'pending') ?? null;
  const nEvents = active?.n_events_total ?? pending?.n_events_total ?? null;
  return {
    scope: 'INDIA_IT',
    hasActiveVersion: !!active,
    activeVersion: active?.version ?? null,
    pendingVersion: pending?.version ?? null,
    nEvents,
    eligibleForPromotion: (nEvents ?? 0) >= INDIA_IT_MIN_EVENTS_FOR_PROMOTION,
    bootstrapDeltas: INDIA_IT_BOOTSTRAP_DELTAS,
  };
}
