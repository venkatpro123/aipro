// synthetic-probe/index.ts — gap #20 fix + score-level calibration probes.
//
// Cron runs this every 5 minutes. Runs two kinds of probes:
//
//   1. Operational probes (original):
//      health_endpoint, audit_coalesce, feature_flags
//      → detect silent breakage in the request path
//
//   2. Score probes (added in migration 20260622000005):
//      7 named scenarios with fixed HybridScoreInputs fixtures.
//      Each scenario calls calculate-hybrid-risk and compares the returned
//      score to a pre-computed tolerance range derived from manual formula
//      verification (see scoreProbeScenarios.ts).
//      → detect scoring math drift that would be invisible to operational probes
//
//   3. Drift check probe:
//      Queries the 30-day rolling mean per scenario from
//      synthetic_probe_score_drift_30d view. If any scenario's mean has
//      drifted > bias_threshold_pts from the expected midpoint, writes a
//      directional_bias event to calibration_drift_events.
//      → detect systematic formula shifts (e.g. a weight change that moves
//         all scores upward without triggering any single range_violation)
//
// Why score probes call the EF via HTTP (not direct import):
//   Calling calculate-hybrid-risk as an HTTP endpoint exercises the full
//   request path including CORS headers, JSON serialization, and the module
//   load assertion. A direct import would miss network or serialization bugs.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { withRun, corsHeaders } from '../_shared/otel.ts';
import { SCORE_PROBE_SCENARIOS, type ScenarioSpec } from './scoreProbeScenarios.ts';

interface ProbeOutcome {
  probe: string;
  status: 'pass' | 'fail' | 'degraded' | 'timeout';
  durationMs: number;
  detail: Record<string, unknown> | null;
}

// ── Operational probes (unchanged from original) ─────────────────────────────

const OPERATIONAL_PROBES: Array<{
  name: string;
  run: (client: ReturnType<typeof createClient>) => Promise<ProbeOutcome>;
}> = [
  {
    name: 'health_endpoint',
    async run() {
      const t0 = Date.now();
      try {
        const url = Deno.env.get('SUPABASE_URL');
        if (!url) {
          return { probe: 'health_endpoint', status: 'fail', durationMs: Date.now() - t0, detail: { reason: 'no SUPABASE_URL' } };
        }
        const resp = await fetch(`${url}/functions/v1/health-probe`, {
          headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_ANON_KEY') ?? ''}` },
          signal: AbortSignal.timeout(15_000),
        });
        const dur = Date.now() - t0;
        if (resp.status === 503) {
          const body = await resp.json().catch(() => ({}));
          return { probe: 'health_endpoint', status: 'fail', durationMs: dur, detail: body };
        }
        if (!resp.ok) {
          return { probe: 'health_endpoint', status: 'fail', durationMs: dur, detail: { http_status: resp.status } };
        }
        const body = await resp.json();
        const reportedStatus = body?.status === 'ok' ? 'pass' : body?.status === 'degraded' ? 'degraded' : 'fail';
        return { probe: 'health_endpoint', status: reportedStatus, durationMs: dur, detail: body };
      } catch (err) {
        return {
          probe: 'health_endpoint',
          status: (err as { name?: string })?.name === 'TimeoutError' ? 'timeout' : 'fail',
          durationMs: Date.now() - t0,
          detail: { error: err instanceof Error ? err.message : String(err) },
        };
      }
    },
  },
  {
    name: 'audit_coalesce',
    async run() {
      const t0 = Date.now();
      try {
        const url = Deno.env.get('SUPABASE_URL');
        if (!url) {
          return { probe: 'audit_coalesce', status: 'fail', durationMs: Date.now() - t0, detail: { reason: 'no SUPABASE_URL' } };
        }
        const resp = await fetch(`${url}/functions/v1/audit-coalesce`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${Deno.env.get('SUPABASE_ANON_KEY') ?? ''}`,
            'Content-Type': 'application/json',
            'x-request-id': `synthetic-${crypto.randomUUID()}`,
          },
          body: JSON.stringify({
            company_canonical: 'synthetic-probe-co',
            role_title: 'Software Engineer',
            department: 'Engineering',
            country: 'US',
          }),
          signal: AbortSignal.timeout(15_000),
        });
        const dur = Date.now() - t0;
        if (!resp.ok) {
          return { probe: 'audit_coalesce', status: 'fail', durationMs: dur, detail: { http_status: resp.status } };
        }
        const body = await resp.json();
        if (body?.phase !== 'leader' && body?.phase !== 'follower') {
          return {
            probe: 'audit_coalesce',
            status: 'fail',
            durationMs: dur,
            detail: { reason: 'unexpected phase', body },
          };
        }
        if (dur > 8000) {
          return { probe: 'audit_coalesce', status: 'degraded', durationMs: dur, detail: { reason: 'over_slo', body } };
        }
        return { probe: 'audit_coalesce', status: 'pass', durationMs: dur, detail: null };
      } catch (err) {
        return {
          probe: 'audit_coalesce',
          status: (err as { name?: string })?.name === 'TimeoutError' ? 'timeout' : 'fail',
          durationMs: Date.now() - t0,
          detail: { error: err instanceof Error ? err.message : String(err) },
        };
      }
    },
  },
  {
    name: 'feature_flags',
    async run() {
      const t0 = Date.now();
      try {
        const client = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
        const { data, error } = await client.from('engine_feature_flags').select('flag_key, mode').limit(5);
        const dur = Date.now() - t0;
        if (error) return { probe: 'feature_flags', status: 'fail', durationMs: dur, detail: { error: error.message } };
        if (!data || data.length === 0) {
          return { probe: 'feature_flags', status: 'fail', durationMs: dur, detail: { reason: 'no flags' } };
        }
        return { probe: 'feature_flags', status: 'pass', durationMs: dur, detail: null };
      } catch (err) {
        return {
          probe: 'feature_flags',
          status: 'fail',
          durationMs: Date.now() - t0,
          detail: { error: err instanceof Error ? err.message : String(err) },
        };
      }
    },
  },
];

// ── Score probe: run a single scenario against calculate-hybrid-risk ──────────

interface ScoreProbeRow {
  probe_name:          string;
  status:              'pass' | 'fail' | 'degraded' | 'timeout';
  duration_ms:         number;
  detail:              Record<string, unknown> | null;
  started_at:          string;
  release_version:     string;
  scenario_name:       string;
  actual_score:        number | null;
  expected_score_low:  number;
  expected_score_high: number;
}

async function runScoreScenario(
  scenario: ScenarioSpec,
  startedAt: string,
  release: string,
): Promise<{ row: ScoreProbeRow; outcome: ProbeOutcome; driftEvent: DriftEventPayload | null }> {
  const t0 = Date.now();
  const url = Deno.env.get('SUPABASE_URL');
  if (!url) {
    const row: ScoreProbeRow = {
      probe_name:          `score_${scenario.name.toLowerCase()}`,
      status:              'fail',
      duration_ms:         0,
      detail:              { reason: 'no SUPABASE_URL' },
      started_at:          startedAt,
      release_version:     release,
      scenario_name:       scenario.name,
      actual_score:        null,
      expected_score_low:  scenario.toleranceLow,
      expected_score_high: scenario.toleranceHigh,
    };
    return { row, outcome: { probe: row.probe_name, status: 'fail', durationMs: 0, detail: row.detail }, driftEvent: null };
  }

  try {
    const resp = await fetch(`${url}/functions/v1/calculate-hybrid-risk`, {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${Deno.env.get('SUPABASE_ANON_KEY') ?? ''}`,
        'Content-Type': 'application/json',
        'x-request-id': `synth-score-${scenario.name}-${crypto.randomUUID()}`,
      },
      body: JSON.stringify(scenario.inputs),
      signal: AbortSignal.timeout(20_000),
    });
    const dur = Date.now() - t0;

    if (!resp.ok) {
      const row: ScoreProbeRow = {
        probe_name:          `score_${scenario.name.toLowerCase()}`,
        status:              'fail',
        duration_ms:         dur,
        detail:              { http_status: resp.status, scenario: scenario.name },
        started_at:          startedAt,
        release_version:     release,
        scenario_name:       scenario.name,
        actual_score:        null,
        expected_score_low:  scenario.toleranceLow,
        expected_score_high: scenario.toleranceHigh,
      };
      return { row, outcome: { probe: row.probe_name, status: 'fail', durationMs: dur, detail: row.detail }, driftEvent: null };
    }

    const body = await resp.json();
    const actualScore: number | undefined = body?.result?.score;

    if (typeof actualScore !== 'number') {
      const row: ScoreProbeRow = {
        probe_name:          `score_${scenario.name.toLowerCase()}`,
        status:              'fail',
        duration_ms:         dur,
        detail:              { reason: 'missing result.score in response', scenario: scenario.name },
        started_at:          startedAt,
        release_version:     release,
        scenario_name:       scenario.name,
        actual_score:        null,
        expected_score_low:  scenario.toleranceLow,
        expected_score_high: scenario.toleranceHigh,
      };
      return { row, outcome: { probe: row.probe_name, status: 'fail', durationMs: dur, detail: row.detail }, driftEvent: null };
    }

    const inRange  = actualScore >= scenario.toleranceLow && actualScore <= scenario.toleranceHigh;
    const midpoint = Math.round((scenario.toleranceLow + scenario.toleranceHigh) / 2);
    const delta    = actualScore - midpoint;
    const status: ProbeOutcome['status'] = inRange ? 'pass' : 'fail';

    const row: ScoreProbeRow = {
      probe_name:          `score_${scenario.name.toLowerCase()}`,
      status,
      duration_ms:         dur,
      detail:              inRange
        ? null
        : { scenario: scenario.name, actual_score: actualScore, expected_low: scenario.toleranceLow, expected_high: scenario.toleranceHigh, delta },
      started_at:          startedAt,
      release_version:     release,
      scenario_name:       scenario.name,
      actual_score:        actualScore,
      expected_score_low:  scenario.toleranceLow,
      expected_score_high: scenario.toleranceHigh,
    };

    const driftEvent: DriftEventPayload | null = inRange ? null : {
      event_kind:          'range_violation',
      scenario_name:       scenario.name,
      actual_score:        actualScore,
      expected_score_low:  scenario.toleranceLow,
      expected_score_high: scenario.toleranceHigh,
      score_delta:         delta,
      window_n:            null,
      release_version:     release,
    };

    return {
      row,
      outcome: { probe: row.probe_name, status, durationMs: dur, detail: row.detail },
      driftEvent,
    };
  } catch (err) {
    const dur = Date.now() - t0;
    const isTimeout = (err as { name?: string })?.name === 'TimeoutError';
    const row: ScoreProbeRow = {
      probe_name:          `score_${scenario.name.toLowerCase()}`,
      status:              isTimeout ? 'timeout' : 'fail',
      duration_ms:         dur,
      detail:              { error: err instanceof Error ? err.message : String(err), scenario: scenario.name },
      started_at:          startedAt,
      release_version:     release,
      scenario_name:       scenario.name,
      actual_score:        null,
      expected_score_low:  scenario.toleranceLow,
      expected_score_high: scenario.toleranceHigh,
    };
    return { row, outcome: { probe: row.probe_name, status: row.status, durationMs: dur, detail: row.detail }, driftEvent: null };
  }
}

// ── Directional drift check ───────────────────────────────────────────────────
// Queries the 30-day rolling view. Any scenario with has_directional_bias=true
// AND at least 10 observations in the window fires a directional_bias event.
// The 10-observation floor prevents false-positive events in the first hours
// after a deploy when the rolling window is sparse.

interface DriftEventPayload {
  event_kind:          'range_violation' | 'directional_bias';
  scenario_name:       string;
  actual_score:        number | null;
  expected_score_low:  number;
  expected_score_high: number;
  score_delta:         number | null;
  window_n:            number | null;
  release_version:     string;
}

interface DriftViewRow {
  scenario_name:        string;
  expected_score:       number;
  tolerance_low:        number;
  tolerance_high:       number;
  n:                    number;
  mean_actual_score:    number | null;
  mean_delta:           number | null;
  has_directional_bias: boolean;
}

async function runDriftCheck(
  // deno-lint-ignore no-explicit-any
  client: any,
  release: string,
): Promise<{ outcome: ProbeOutcome; driftEvents: DriftEventPayload[] }> {
  const t0 = Date.now();
  const driftEvents: DriftEventPayload[] = [];

  try {
    const { data: rawData, error } = await client
      .from('synthetic_probe_score_drift_30d')
      .select(
        'scenario_name,expected_score,tolerance_low,tolerance_high,n,' +
        'mean_actual_score,mean_delta,has_directional_bias',
      );

    const dur = Date.now() - t0;

    if (error) {
      return {
        outcome: { probe: 'score_drift_check', status: 'fail', durationMs: dur, detail: { error: error.message } },
        driftEvents: [],
      };
    }

    const data = (rawData as DriftViewRow[] | null) ?? [];

    if (data.length === 0) {
      return {
        outcome: { probe: 'score_drift_check', status: 'degraded', durationMs: dur, detail: { reason: 'no_drift_data_yet', note: 'Normal on first deploy — window is empty.' } },
        driftEvents: [],
      };
    }

    const biased = data.filter(
      (row) => row.has_directional_bias === true && row.n >= 10,
    );

    for (const row of biased) {
      driftEvents.push({
        event_kind:          'directional_bias',
        scenario_name:       row.scenario_name,
        actual_score:        row.mean_actual_score != null ? Math.round(row.mean_actual_score) : null,
        expected_score_low:  row.tolerance_low,
        expected_score_high: row.tolerance_high,
        score_delta:         row.mean_delta != null ? Math.round(row.mean_delta) : null,
        window_n:            row.n,
        release_version:     release,
      });
    }

    const status: ProbeOutcome['status'] = biased.length > 0 ? 'fail' : 'pass';
    return {
      outcome: {
        probe:     'score_drift_check',
        status,
        durationMs: dur,
        detail: biased.length > 0
          ? { biased_scenarios: biased.map((r) => r.scenario_name), count: biased.length }
          : null,
      },
      driftEvents,
    };
  } catch (err) {
    return {
      outcome: {
        probe:     'score_drift_check',
        status:    'fail',
        durationMs: Date.now() - t0,
        detail:    { error: err instanceof Error ? err.message : String(err) },
      },
      driftEvents: [],
    };
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve((req) =>
  withRun('synthetic-probe', req, async (run) => {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const client = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    const release   = Deno.env.get('RELEASE_VERSION') ?? 'unknown';
    const startedAt = new Date().toISOString();

    // ── Phase 1: operational probes (parallel) ────────────────────────────────
    const operationalOutcomes = await Promise.all(
      OPERATIONAL_PROBES.map((p) => p.run(client)),
    );

    // ── Phase 2: score scenario probes (parallel) ─────────────────────────────
    const scoreResults = await Promise.all(
      SCORE_PROBE_SCENARIOS.map((s) => runScoreScenario(s, startedAt, release)),
    );

    const scoreRows      = scoreResults.map((r) => r.row);
    const scoreOutcomes  = scoreResults.map((r) => r.outcome);
    const rangeDriftEvts = scoreResults
      .map((r) => r.driftEvent)
      .filter((e): e is DriftEventPayload => e !== null);

    // ── Phase 3: directional drift check (after score rows are computed) ──────
    const { outcome: driftCheckOutcome, driftEvents: biasDriftEvts } =
      await runDriftCheck(client, release);

    const allDriftEvents = [...rangeDriftEvts, ...biasDriftEvts];

    // ── Persist operational rows ──────────────────────────────────────────────
    const operationalRows = operationalOutcomes.map((o) => ({
      probe_name:      o.probe,
      status:          o.status,
      duration_ms:     o.durationMs,
      detail:          o.detail,
      started_at:      startedAt,
      release_version: release,
    }));

    // Persist drift check row.
    const driftCheckRow = {
      probe_name:      'score_drift_check',
      status:          driftCheckOutcome.status,
      duration_ms:     driftCheckOutcome.durationMs,
      detail:          driftCheckOutcome.detail,
      started_at:      startedAt,
      release_version: release,
    };

    try {
      const { error: opErr } = await client
        .from('synthetic_probe_results')
        .insert([...operationalRows, driftCheckRow]);
      if (opErr) {
        run.recordFallback({ layerId: 'synthetic_probe_persist_operational', reason: 'exception', errorMessage: opErr.message });
      }
    } catch (err) {
      run.recordFallback({ layerId: 'synthetic_probe_persist_operational', reason: 'exception', errorMessage: err instanceof Error ? err.message : String(err) });
    }

    // Persist score scenario rows (with scenario-specific columns).
    try {
      const { error: scoreErr } = await client
        .from('synthetic_probe_results')
        .insert(scoreRows);
      if (scoreErr) {
        run.recordFallback({ layerId: 'synthetic_probe_persist_scores', reason: 'exception', errorMessage: scoreErr.message });
      }
    } catch (err) {
      run.recordFallback({ layerId: 'synthetic_probe_persist_scores', reason: 'exception', errorMessage: err instanceof Error ? err.message : String(err) });
    }

    // Persist drift events (best-effort — non-fatal).
    if (allDriftEvents.length > 0) {
      try {
        await client.from('calibration_drift_events').insert(allDriftEvents);
      } catch {
        // Non-fatal: drift events can be reconstructed from synthetic_probe_results.
      }
    }

    // ── Response ──────────────────────────────────────────────────────────────
    const allOutcomes = [...operationalOutcomes, ...scoreOutcomes, driftCheckOutcome];
    const failed      = allOutcomes.filter((o) => o.status === 'fail' || o.status === 'timeout');
    const passed      = allOutcomes.filter((o) => o.status === 'pass');

    run.setItemsIn(allOutcomes.length);
    run.setItemsOut(passed.length);
    run.addMeta('failures',     failed.length);
    run.addMeta('drift_events', allDriftEvents.length);
    run.addMeta('scenarios_run', SCORE_PROBE_SCENARIOS.length);

    return new Response(
      JSON.stringify(
        {
          ok:              true,
          operational:     operationalOutcomes,
          score_scenarios: scoreOutcomes,
          drift_check:     driftCheckOutcome,
          drift_events_fired: allDriftEvents.length,
        },
        null,
        2,
      ),
      {
        status:  failed.length > 0 ? 207 : 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }),
);
