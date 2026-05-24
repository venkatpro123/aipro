// health-probe/index.ts — gap #4 fix (production health endpoint).
//
// Returns a structured JSON health report for synthetic monitoring +
// uptime checkers + on-call dashboards. The endpoint is open (no auth)
// so external uptime services can ping it without credential rotation,
// but it returns ONLY non-sensitive aggregate signals.
//
// HTTP semantics:
//   200 OK              — every check passed
//   200 OK (degraded)   — non-critical check failed (returned with
//                         status='degraded' in body for graceful UX)
//   503 Service Unavail — critical dependency unreachable
//
// The 200/degraded split matters because uptime checkers usually treat
// any non-2xx as "down" — we don't want to page on-call when Glassdoor
// is bot-blocked but Supabase is fine. Soft degradations stay 2xx;
// hard outages (DB unreachable) go 503.
//
// What each check verifies:
//   db_connectivity      — Supabase reachable (SELECT 1)
//   migrations_applied   — at least one row in supabase_migrations
//                          (rules out a fresh DB pointed at by mistake)
//   recent_audits        — a layoff_scores row in the last 6 hours
//                          (detects "no traffic / silent dead app")
//   recalibrate_cron     — engine_calibration_versions has a row from
//                          the last 14 days (cron is running)
//   coverage_audit_cron  — coverage_measurements has a row from the
//                          last 14 days
//   outbox_lag           — engine_events oldest unconsumed < 6 hours
//   drift_alerts_open    — count of open engine_drift_alerts
//
// This file is intentionally allergic to any framework — it does its
// own response shaping and timing so a busted dependency in otel.ts
// or anywhere else doesn't break the health endpoint itself.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

interface CheckResult {
  name: string;
  status: 'ok' | 'degraded' | 'fail';
  durationMs: number;
  detail?: string;
  meta?: Record<string, unknown>;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
  'Cache-Control': 'no-store',
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function runCheck(
  name: string,
  fn: () => Promise<{ status: 'ok' | 'degraded' | 'fail'; detail?: string; meta?: Record<string, unknown> }>,
): Promise<CheckResult> {
  const t0 = Date.now();
  try {
    const r = await fn();
    return { name, durationMs: Date.now() - t0, ...r };
  } catch (err) {
    return {
      name,
      status: 'fail',
      durationMs: Date.now() - t0,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== 'GET') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const release = Deno.env.get('RELEASE_VERSION') ?? 'unknown';

  if (!url || !key) {
    return jsonResponse(
      {
        status: 'fail',
        release,
        checks: [{ name: 'env', status: 'fail', detail: 'SUPABASE_URL or SERVICE_ROLE_KEY missing', durationMs: 0 }],
      },
      503,
    );
  }

  const client = createClient(url, key, { auth: { persistSession: false } });

  // ── Critical checks ────────────────────────────────────────────────
  const critical: CheckResult[] = await Promise.all([
    runCheck('db_connectivity', async () => {
      // Cheap SELECT 1 equivalent via a tiny indexed query.
      const { error } = await client.from('tenants').select('id').limit(1);
      if (error) return { status: 'fail', detail: error.message };
      return { status: 'ok' };
    }),
    runCheck('migrations_applied', async () => {
      // The supabase_migrations schema isn't exposed via PostgREST. Use a
      // public-schema proxy: engine_calibration_constants is created by
      // 20260615000001 (mid-v35.1) and seeded with at least one row.
      // Its presence confirms recent migrations applied AND seed ran.
      const { error, count } = await client
        .from('engine_calibration_constants')
        .select('id', { count: 'exact', head: true });
      if (error) {
        return { status: 'fail', detail: `engine_calibration_constants unreachable: ${error.message}` };
      }
      if ((count ?? 0) === 0) {
        return { status: 'fail', detail: 'engine_calibration_constants empty — seed migration did not run' };
      }
      return { status: 'ok', meta: { calibration_constants_count: count } };
    }),
  ]);

  // ── Degraded-only checks ───────────────────────────────────────────
  // Failures here become 'degraded', not 'fail' — they signal data
  // freshness issues but the system is still serving requests.
  const degraded: CheckResult[] = await Promise.all([
    runCheck('recent_audits', async () => {
      const since = new Date(Date.now() - 6 * 3600 * 1000).toISOString();
      const { count, error } = await client
        .from('layoff_scores')
        .select('id', { count: 'exact', head: true })
        .gte('calculated_at', since);
      if (error) return { status: 'degraded', detail: error.message };
      if ((count ?? 0) === 0) {
        return { status: 'degraded', detail: 'no audits in last 6h — possible silent outage' };
      }
      return { status: 'ok', meta: { audits_6h: count } };
    }),
    runCheck('recalibrate_cron', async () => {
      const since = new Date(Date.now() - 14 * 86400e3).toISOString();
      const { count, error } = await client
        .from('engine_calibration_versions')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', since);
      if (error) return { status: 'degraded', detail: error.message };
      if ((count ?? 0) === 0) {
        return { status: 'degraded', detail: 'no calibration versions written in 14d — cron stalled' };
      }
      return { status: 'ok', meta: { versions_14d: count } };
    }),
    runCheck('coverage_audit_cron', async () => {
      const since = new Date(Date.now() - 14 * 86400e3).toISOString();
      const { count, error } = await client
        .from('coverage_measurements')
        .select('id', { count: 'exact', head: true })
        .gte('measured_at', since);
      if (error) return { status: 'degraded', detail: error.message };
      if ((count ?? 0) === 0) {
        return { status: 'degraded', detail: 'no coverage measurements in 14d — cron stalled' };
      }
      return { status: 'ok', meta: { measurements_14d: count } };
    }),
    runCheck('outbox_lag', async () => {
      // Oldest unconsumed event must be < 6h old.
      const sixHoursAgo = new Date(Date.now() - 6 * 3600 * 1000).toISOString();
      const { data, error } = await client
        .from('engine_events')
        .select('id, occurred_at')
        .lt('occurred_at', sixHoursAgo)
        .filter('consumed_by', 'eq', '[]')
        .order('occurred_at', { ascending: true })
        .limit(1);
      if (error) return { status: 'degraded', detail: error.message };
      if ((data ?? []).length > 0) {
        return { status: 'degraded', detail: 'outbox event older than 6h still unconsumed' };
      }
      return { status: 'ok' };
    }),
    runCheck('drift_alerts_open', async () => {
      const { count, error } = await client
        .from('engine_drift_alerts')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open');
      if (error) return { status: 'degraded', detail: error.message };
      const n = count ?? 0;
      if (n > 5) return { status: 'degraded', detail: `${n} open drift alerts — review backlog` };
      return { status: 'ok', meta: { open_alerts: n } };
    }),
  ]);

  // ── Aggregate verdict ──────────────────────────────────────────────
  const allChecks = [...critical, ...degraded];
  const anyCritFail = critical.some((c) => c.status === 'fail');
  const anyDegraded = allChecks.some((c) => c.status === 'degraded' || c.status === 'fail');

  const body = {
    status: anyCritFail ? 'fail' : anyDegraded ? 'degraded' : 'ok',
    release,
    checked_at: new Date().toISOString(),
    checks: allChecks,
  };

  return jsonResponse(body, anyCritFail ? 503 : 200);
});
