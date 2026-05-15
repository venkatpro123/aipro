// coverage-audit/index.ts — WS4
//
// Weekly cron that measures empirical coverage of the conformal CIs and
// writes results to coverage_measurements. Validates the WS4 acceptance
// criterion: "90% CI contains outcome 88–92% on rolling 60-day window".
//
// Algorithm (split-conformal coverage validation):
//
//   For each (cohort_scope, nominal_level) in
//   {GLOBAL, DISTRESS, EFFICIENCY, WAVE, INDIA_IT} × {0.50, 0.80, 0.90}:
//
//     1. Pull outcomes from user_prediction_outcomes for the last 60 days
//        filtered by detection_confidence ≥ 0.75 and cohort match.
//     2. Shuffle and split 50/50 into calibration + test sets.
//     3. From calibration: compute non-conformity scores (|pred - actual|
//        on the [0, 1] probability scale) and find q_alpha at index
//        ceil((n+1)(1-alpha)).
//     4. On test set: count points where |pred - actual| ≤ q_alpha.
//        That ratio is empirical_coverage.
//     5. Compute the Wilson score interval on the coverage estimate
//        (provides a CI on the measurement itself so ops can tell noisy
//        measurements from real misalignment).
//     6. Insert one row into coverage_measurements.
//
// Triggering:
//   * Scheduled via pg_cron Mondays 04:00 UTC (after recalibrate-engine
//     completes Sundays 03:00 UTC).
//   * Manually invokable POST {} for ad-hoc verification.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { withRun, corsHeaders } from '../_shared/otel.ts';

const WINDOW_DAYS = 60;
const NOMINAL_LEVELS = [0.50, 0.80, 0.90];
const SCOPES: Array<'GLOBAL' | 'DISTRESS' | 'EFFICIENCY' | 'WAVE' | 'INDIA_IT'> = [
  'GLOBAL',
  'DISTRESS',
  'EFFICIENCY',
  'WAVE',
  'INDIA_IT',
];
const MIN_POINTS_FOR_MEASUREMENT = 40;

const POSITIVE_OUTCOMES = new Set(['laid_off', 'company_closed']);

interface OutcomeRow {
  predicted_score: number;
  outcome_reported: string;
  predicted_cohort: string | null;
  detection_confidence: number | null;
  outcome_source: string | null;
  company_name: string;
}

interface Point {
  predicted: number; // probability in [0, 1]
  actual: 0 | 1;
}

function scoreToProbability(score: number): number {
  const clamped = Math.max(0, Math.min(100, score));
  const logit = (clamped / 100) * 6 - 3;
  return 1 / (1 + Math.exp(-logit));
}

// Wilson score interval (95%) — better than normal-approx for proportions
// near 0/1 and for small n.
function wilsonScoreInterval(successes: number, n: number, z = 1.96): { low: number; high: number } {
  if (n === 0) return { low: 0, high: 1 };
  const p = successes / n;
  const denom = 1 + (z * z) / n;
  const center = p + (z * z) / (2 * n);
  const half = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return {
    low: Math.max(0, (center - half) / denom),
    high: Math.min(1, (center + half) / denom),
  };
}

function measureCoverage(points: Point[], nominal: number): {
  empirical: number;
  ci_low: number;
  ci_high: number;
  sampleSize: number;
  calibSize: number;
} | null {
  if (points.length < MIN_POINTS_FOR_MEASUREMENT) return null;

  // Shuffle 50/50.
  const shuffled = [...points];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const mid = Math.floor(shuffled.length / 2);
  const calib = shuffled.slice(0, mid);
  const test = shuffled.slice(mid);

  const nonconfs = calib.map((p) => Math.abs(p.predicted - p.actual)).sort((a, b) => a - b);
  const qIdx = Math.min(nonconfs.length - 1, Math.ceil((nonconfs.length + 1) * nominal) - 1);
  const q = nonconfs[qIdx];

  let covered = 0;
  for (const p of test) if (Math.abs(p.predicted - p.actual) <= q) covered++;

  const empirical = covered / test.length;
  const wilson = wilsonScoreInterval(covered, test.length);
  return {
    empirical: Math.round(empirical * 1000) / 1000,
    ci_low: Math.round(wilson.low * 1000) / 1000,
    ci_high: Math.round(wilson.high * 1000) / 1000,
    sampleSize: test.length,
    calibSize: calib.length,
  };
}

async function fetchPointsForScope(
  supabase: ReturnType<typeof createClient>,
  scope: typeof SCOPES[number],
): Promise<Point[]> {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - WINDOW_DAYS);

  let query = supabase
    .from('user_prediction_outcomes')
    .select('predicted_score,outcome_reported,predicted_cohort,detection_confidence,outcome_source,company_name')
    .not('outcome_reported', 'is', null)
    .gte('audit_date', since.toISOString().slice(0, 10))
    .limit(5000);

  if (scope !== 'GLOBAL' && scope !== 'INDIA_IT') {
    query = query.eq('predicted_cohort', scope);
  }
  const { data, error } = await query;
  if (error) throw new Error(`fetch failed for ${scope}: ${error.message}`);
  let rows = (data ?? []) as OutcomeRow[];

  rows = rows.filter((r) => {
    const c = r.detection_confidence ?? (r.outcome_source === 'user_reported' ? 1.0 : 0);
    return c >= 0.75;
  });

  if (scope === 'INDIA_IT') {
    const { data: indianCos } = await supabase
      .from('company_intelligence')
      .select('company_name')
      .eq('region', 'IN')
      .limit(2000);
    const allowed = new Set(
      ((indianCos ?? []) as Array<{ company_name: string }>).map((c) => c.company_name.toLowerCase().trim()),
    );
    rows = rows.filter((r) => allowed.has(r.company_name.toLowerCase().trim()));
  }

  return rows.map((r) => ({
    predicted: scoreToProbability(r.predicted_score),
    actual: POSITIVE_OUTCOMES.has(r.outcome_reported) ? 1 : 0,
  }));
}

Deno.serve((req) =>
  withRun('coverage-audit', req, async (run) => {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    const cronRunId = crypto.randomUUID();
    const windowStart = new Date(Date.now() - WINDOW_DAYS * 86400e3).toISOString().slice(0, 10);
    const windowEnd = new Date().toISOString().slice(0, 10);

    const results: Array<{
      scope: string;
      nominal: number;
      measurement: {
        empirical: number;
        ci_low: number;
        ci_high: number;
        sampleSize: number;
        calibSize: number;
      } | null;
      points: number;
    }> = [];

    for (const scope of SCOPES) {
      const points = await fetchPointsForScope(supabase, scope);
      run.addMeta(`points_${scope}`, points.length);
      for (const nominal of NOMINAL_LEVELS) {
        const m = measureCoverage(points, nominal);
        results.push({ scope, nominal, measurement: m, points: points.length });
      }
    }

    const insertRows = results
      .filter((r) => r.measurement !== null)
      .map((r) => ({
        cohort_scope: r.scope,
        nominal_coverage: r.nominal,
        empirical_coverage: r.measurement!.empirical,
        coverage_ci_low: r.measurement!.ci_low,
        coverage_ci_high: r.measurement!.ci_high,
        sample_size: r.measurement!.sampleSize,
        calibration_size: r.measurement!.calibSize,
        measurement_window_start: windowStart,
        measurement_window_end: windowEnd,
        cron_run_id: cronRunId,
      }));

    let inserted = 0;
    if (insertRows.length > 0) {
      const { error: insErr, count } = await supabase
        .from('coverage_measurements')
        .insert(insertRows, { count: 'exact' });
      if (insErr) {
        run.recordFallback({
          layerId: 'coverage_measurements_insert',
          reason: 'exception',
          errorMessage: insErr.message,
        });
        throw new Error(`insert failed: ${insErr.message}`);
      }
      inserted = count ?? insertRows.length;
    }

    run.setItemsIn(SCOPES.length * NOMINAL_LEVELS.length);
    run.setItemsOut(inserted);
    run.addMeta('cron_run_id', cronRunId);

    return new Response(
      JSON.stringify({
        ok: true,
        cron_run_id: cronRunId,
        cells_processed: results.length,
        rows_inserted: inserted,
        skipped: results.length - insertRows.length,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }),
);
