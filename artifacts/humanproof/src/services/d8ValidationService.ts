// d8ValidationService.ts
// Held-out validation gate for D8 (AI efficiency restructuring, weight 0.09).
//
// D8 must not be deployed until a minimum held-out set clears the gate:
//   n_heldout  >= 15
//   auc_roc    >= 0.72
//   precision  >= 0.65  at operating threshold (0.50)
//
// Activation flow:
//   1. Calibration team adds events to d8_heldout_events via Supabase admin.
//   2. activateD8IfValidated() is called by the recalibrate-engine cron.
//   3. If gate passes: feature flag is set to mode='production' and metrics
//      are stored in engine_calibration_versions.d8_validation_metadata.
//   4. getD8ValidationStatus() returns a cached summary for UI display.
//
// AUC computation: Wilcoxon-Mann-Whitney statistic (exact, no approximation).
// For n=15 this is tractable; at n>100 we switch to the normal approximation.

export interface D8HeldoutEvent {
  company_name: string;
  announcement_date: string;
  actual_efficiency_layoff: boolean;
  predicted_probability: number;
  is_bootstrap_batch: boolean;
}

export interface D8ValidationResult {
  n_heldout: number;
  n_positive: number;
  n_negative: number;
  auc_roc: number;
  precision_at_threshold: number;
  recall_at_threshold: number;
  threshold: number;
  passes_gate: boolean;
  gate_failure_reason?: string;
  evaluated_at: string;
}

export interface D8ValidationStatus {
  /** Whether D8 is currently active in production. */
  is_active: boolean;
  /** Latest validation run result. */
  latest_result: D8ValidationResult | null;
  /** Human-readable one-liner for UI display. */
  summary: string;
  /** Fetched-at timestamp. */
  fetched_at: string;
}

// ── Gate thresholds ───────────────────────────────────────────────────────────
export const D8_VALIDATION_GATE = {
  N_HELDOUT_MIN:   15,
  AUC_ROC_MIN:     0.72,
  PRECISION_MIN:   0.65,
  THRESHOLD:       0.50,   // operating threshold: D8 fires when P >= 0.50
} as const;

// Cache for the UI — refresh every 30 minutes.
const CACHE_TTL_MS = 30 * 60 * 1000;
let _statusCache: { value: D8ValidationStatus; fetchedAt: number } | null = null;
let _statusInflight: Promise<D8ValidationStatus> | null = null;

// ── AUC-ROC via Wilcoxon-Mann-Whitney ─────────────────────────────────────────
// AUC = P(score_positive > score_negative) across all positive-negative pairs.
// For a hold-out set of 15-30 events this is exact and fast (O(n_pos × n_neg)).
// At n > 200 the O(n²) cost becomes noticeable; switch to sort-rank if needed.
export function computeD8AUC(events: D8HeldoutEvent[]): number {
  const positives = events
    .filter(e => e.actual_efficiency_layoff)
    .map(e => e.predicted_probability);
  const negatives = events
    .filter(e => !e.actual_efficiency_layoff)
    .map(e => e.predicted_probability);

  if (positives.length === 0 || negatives.length === 0) return 0.5;

  let wins = 0;
  let ties = 0;
  for (const pos of positives) {
    for (const neg of negatives) {
      if (pos > neg)       wins += 1;
      else if (pos === neg) ties += 0.5;
    }
  }
  return (wins + ties) / (positives.length * negatives.length);
}

// ── Precision and recall at operating threshold ───────────────────────────────
export function computeD8PrecisionRecall(
  events: D8HeldoutEvent[],
  threshold: number,
): { precision: number; recall: number } {
  const predicted_positive = events.filter(e => e.predicted_probability >= threshold);
  const actual_positive    = events.filter(e => e.actual_efficiency_layoff);

  if (predicted_positive.length === 0) return { precision: 0, recall: 0 };

  const true_positive = predicted_positive.filter(e => e.actual_efficiency_layoff);
  const precision = true_positive.length / predicted_positive.length;
  const recall    = actual_positive.length > 0
    ? true_positive.length / actual_positive.length
    : 0;

  return { precision, recall };
}

// ── Evaluate gate criteria ────────────────────────────────────────────────────
export function evaluateD8Gate(events: D8HeldoutEvent[]): D8ValidationResult {
  const n = events.length;
  const auc = computeD8AUC(events);
  const { precision, recall } = computeD8PrecisionRecall(events, D8_VALIDATION_GATE.THRESHOLD);

  const failures: string[] = [];
  if (n < D8_VALIDATION_GATE.N_HELDOUT_MIN)
    failures.push(`n_heldout=${n} < required ${D8_VALIDATION_GATE.N_HELDOUT_MIN}`);
  if (auc < D8_VALIDATION_GATE.AUC_ROC_MIN)
    failures.push(`AUC=${auc.toFixed(3)} < required ${D8_VALIDATION_GATE.AUC_ROC_MIN}`);
  if (precision < D8_VALIDATION_GATE.PRECISION_MIN)
    failures.push(`precision=${precision.toFixed(3)} < required ${D8_VALIDATION_GATE.PRECISION_MIN}`);

  return {
    n_heldout:              n,
    n_positive:             events.filter(e => e.actual_efficiency_layoff).length,
    n_negative:             events.filter(e => !e.actual_efficiency_layoff).length,
    auc_roc:                Math.round(auc * 1000) / 1000,
    precision_at_threshold: Math.round(precision * 1000) / 1000,
    recall_at_threshold:    Math.round(recall * 1000) / 1000,
    threshold:              D8_VALIDATION_GATE.THRESHOLD,
    passes_gate:            failures.length === 0,
    gate_failure_reason:    failures.length > 0 ? failures.join('; ') : undefined,
    evaluated_at:           new Date().toISOString(),
  };
}

// ── Core validation runner ────────────────────────────────────────────────────
/**
 * Fetches all held-out events from Supabase, computes gate metrics, and
 * returns the result without side effects.
 */
export async function runD8HeldoutValidation(): Promise<D8ValidationResult> {
  const { supabase } = await import('../utils/supabase');
  const { data, error } = await supabase
    .from('d8_heldout_events')
    .select('company_name,announcement_date,actual_efficiency_layoff,predicted_probability,is_bootstrap_batch')
    .order('announcement_date', { ascending: true });

  if (error) throw new Error(`d8ValidationService: failed to fetch held-out events: ${error.message}`);
  if (!data || data.length === 0) {
    return {
      n_heldout: 0, n_positive: 0, n_negative: 0,
      auc_roc: 0.5, precision_at_threshold: 0, recall_at_threshold: 0,
      threshold: D8_VALIDATION_GATE.THRESHOLD,
      passes_gate: false,
      gate_failure_reason: `n_heldout=0 < required ${D8_VALIDATION_GATE.N_HELDOUT_MIN}`,
      evaluated_at: new Date().toISOString(),
    };
  }

  return evaluateD8Gate(data as D8HeldoutEvent[]);
}

// ── Activation gate ───────────────────────────────────────────────────────────
/**
 * Runs held-out validation. If the gate passes:
 *   1. Sets v39_d8_ai_efficiency_active to mode='production'.
 *   2. Updates engine_calibration_versions.d8_validation_metadata for the
 *      current GLOBAL active row.
 *
 * Called by the recalibrate-engine cron whenever new held-out events are added.
 * Safe to call multiple times — the UPDATE is idempotent when already active.
 *
 * Returns { activated, result } — activated=true only on a state transition.
 */
export async function activateD8IfValidated(): Promise<{
  activated: boolean;
  result: D8ValidationResult;
}> {
  const result = await runD8HeldoutValidation();

  if (!result.passes_gate) {
    return { activated: false, result };
  }

  const { supabase } = await import('../utils/supabase');

  // Check current flag state — avoid redundant writes.
  const { data: flagRow, error: flagErr } = await supabase
    .from('engine_feature_flags')
    .select('mode')
    .eq('flag_key', 'v39_d8_ai_efficiency_active')
    .single();

  if (flagErr) throw new Error(`d8ValidationService: flag lookup failed: ${flagErr.message}`);

  const alreadyActive = flagRow?.mode === 'production';  // 'off' | 'shadow' | 'canary' | 'production' | 'deprecated'

  if (!alreadyActive) {
    const activationReason =
      `Held-out validation gate cleared: n_heldout=${result.n_heldout}, ` +
      `AUC=${result.auc_roc}, precision=${result.precision_at_threshold} ` +
      `(all >= required ${D8_VALIDATION_GATE.N_HELDOUT_MIN}/${D8_VALIDATION_GATE.AUC_ROC_MIN}/${D8_VALIDATION_GATE.PRECISION_MIN}). ` +
      `Activated by d8ValidationService at ${result.evaluated_at}.`;

    const { error: updateErr } = await supabase
      .from('engine_feature_flags')
      .update({
        mode:                'production',
        last_changed_reason: activationReason,
        last_changed_at:     new Date().toISOString(),
      })
      .eq('flag_key', 'v39_d8_ai_efficiency_active');

    if (updateErr) throw new Error(`d8ValidationService: flag update failed: ${updateErr.message}`);

    // Record validation metrics in the GLOBAL active calibration row.
    const validationMetadata = {
      ...result,
      gate_criteria: {
        n_heldout_min:  D8_VALIDATION_GATE.N_HELDOUT_MIN,
        auc_roc_min:    D8_VALIDATION_GATE.AUC_ROC_MIN,
        precision_min:  D8_VALIDATION_GATE.PRECISION_MIN,
      },
      activated_by: 'd8ValidationService',
    };

    await supabase
      .from('engine_calibration_versions')
      .update({ d8_validation_metadata: validationMetadata })
      .eq('cohort_scope', 'GLOBAL')
      .eq('status', 'active');
    // Non-fatal if this fails — the flag is already activated.

    // Invalidate the status cache so the UI picks up the new state.
    _statusCache = null;
  }

  return { activated: !alreadyActive, result };
}

// ── Status accessor for UI ────────────────────────────────────────────────────
/**
 * Returns the current D8 validation status, cached for CACHE_TTL_MS.
 * Non-fatal — returns a safe "inactive / no data" state on any error.
 */
export async function getD8ValidationStatus(): Promise<D8ValidationStatus> {
  if (_statusCache && Date.now() - _statusCache.fetchedAt < CACHE_TTL_MS) {
    return _statusCache.value;
  }
  if (_statusInflight) return _statusInflight;

  _statusInflight = (async (): Promise<D8ValidationStatus> => {
    try {
      const { supabase } = await import('../utils/supabase');

      // Check current flag state.
      const { data: flagRow } = await supabase
        .from('engine_feature_flags')
        .select('mode')
        .eq('flag_key', 'v39_d8_ai_efficiency_active')
        .single();

      const isActive = flagRow?.mode === 'production';

      // Fetch latest validation result from the calibration version row.
      const { data: calRow } = await supabase
        .from('engine_calibration_versions')
        .select('d8_validation_metadata')
        .eq('cohort_scope', 'GLOBAL')
        .eq('status', 'active')
        .single();

      const latestResult: D8ValidationResult | null =
        (calRow?.d8_validation_metadata as D8ValidationResult) ?? null;

      const gate = D8_VALIDATION_GATE;
      let summary: string;
      if (isActive && latestResult) {
        summary =
          `D8 term active — empirically calibrated from ${latestResult.n_heldout} ` +
          `efficiency restructuring events, AUC-ROC: ${latestResult.auc_roc}.`;
      } else if (latestResult) {
        const n = latestResult.n_heldout;
        summary =
          `D8 held-out validation pending: ${n}/${gate.N_HELDOUT_MIN} events. ` +
          `Current AUC: ${latestResult.auc_roc}. ` +
          `Gate: AUC ≥ ${gate.AUC_ROC_MIN} AND precision ≥ ${gate.PRECISION_MIN} AND n ≥ ${gate.N_HELDOUT_MIN}.`;
      } else {
        summary =
          `D8 held-out validation not yet run. ` +
          `Gate requires ${gate.N_HELDOUT_MIN} events, AUC ≥ ${gate.AUC_ROC_MIN}, precision ≥ ${gate.PRECISION_MIN}.`;
      }

      const status: D8ValidationStatus = {
        is_active:     isActive,
        latest_result: latestResult,
        summary,
        fetched_at:    new Date().toISOString(),
      };
      _statusCache = { value: status, fetchedAt: Date.now() };
      return status;
    } catch {
      const fallback: D8ValidationStatus = {
        is_active:     false,
        latest_result: null,
        summary:       'D8 validation status unavailable (Supabase query failed).',
        fetched_at:    new Date().toISOString(),
      };
      _statusCache = { value: fallback, fetchedAt: Date.now() };
      return fallback;
    } finally {
      _statusInflight = null;
    }
  })();

  return _statusInflight;
}

/** Sync accessor — returns cached state or safe disabled default. */
export function getD8ValidationStatusSync(): D8ValidationStatus {
  return _statusCache?.value ?? {
    is_active:     false,
    latest_result: null,
    summary:       'D8 validation status not yet primed.',
    fetched_at:    new Date(0).toISOString(),
  };
}

/** Invalidate the cache — call after adding new held-out events. */
export function resetD8ValidationCache(): void {
  _statusCache = null;
  _statusInflight = null;
}
