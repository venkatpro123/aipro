// synthetic-probe/index.ts — gap #20 fix.
//
// Cron runs this every 5 minutes. It exercises the real audit pipeline
// (via the audit-coalesce edge function) against a fixed synthetic
// company, then verifies the response shape + records the timing into
// synthetic_probe_results.
//
// Why the audit-coalesce path:
//   It's the user-facing entry point. If a regression breaks audits
//   for real users it will break this probe too. Coverage matches
//   real load patterns.
//
// What we DON'T probe here:
//   * Scrape triggers (separate concern + cost)
//   * Outcome ingestion (already monitored via recent-audits check
//     in the health probe)
//   * UI (Playwright suite, separate cadence)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { withRun, corsHeaders } from '../_shared/otel.ts';

interface ProbeOutcome {
  probe: string;
  status: 'pass' | 'fail' | 'degraded' | 'timeout';
  durationMs: number;
  detail: Record<string, unknown> | null;
}

const PROBES: Array<{ name: string; run: (client: ReturnType<typeof createClient>) => Promise<ProbeOutcome> }> = [
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
        // Verify response shape: must have a `phase` field set to either
        // 'leader' or 'follower'. Anything else means the contract drifted.
        if (body?.phase !== 'leader' && body?.phase !== 'follower') {
          return {
            probe: 'audit_coalesce',
            status: 'fail',
            durationMs: dur,
            detail: { reason: 'unexpected phase', body },
          };
        }
        // Latency budget — degraded above the user-facing SLO threshold.
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

    const release = Deno.env.get('RELEASE_VERSION') ?? 'unknown';
    const startedAt = new Date().toISOString();

    // Run all probes in parallel; one slow probe doesn't block others.
    const outcomes = await Promise.all(PROBES.map((p) => p.run(client)));

    // Persist results — best-effort; never blocks the probe contract.
    const rows = outcomes.map((o) => ({
      probe_name: o.probe,
      status: o.status,
      duration_ms: o.durationMs,
      detail: o.detail,
      started_at: startedAt,
      release_version: release,
    }));
    try {
      const { error } = await client.from('synthetic_probe_results').insert(rows);
      if (error) {
        run.recordFallback({
          layerId: 'synthetic_probe_persist',
          reason: 'exception',
          errorMessage: error.message,
        });
      }
    } catch (err) {
      run.recordFallback({
        layerId: 'synthetic_probe_persist',
        reason: 'exception',
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    }

    const failed = outcomes.filter((o) => o.status === 'fail' || o.status === 'timeout');
    run.setItemsIn(PROBES.length);
    run.setItemsOut(outcomes.filter((o) => o.status === 'pass').length);
    run.addMeta('failures', failed.length);

    return new Response(JSON.stringify({ ok: true, outcomes }, null, 2), {
      status: failed.length > 0 ? 207 : 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }),
);
