// scrape-job-sweeper/index.ts — WS11
//
// pg_cron-triggered sweeper that reaps zombie scrape_jobs rows. A row
// in status='running' whose heartbeat_at is older than the configured
// threshold (default 10 minutes) is moved to status='failed' with
// error_kind='timeout'.
//
// Why this matters:
//   * The quorum waiter (liveQuorumSpec.ts) polls scrape_jobs for
//     completion. Without a sweeper, a worker crash leaves the row
//     stuck in 'running' forever, blocking quorum for 45s until the
//     ceiling timeout fires — for every concurrent audit of that
//     company.
//   * The dedup window is per-day. A stuck row also means the next
//     audit of the same company can't enqueue a fresh attempt
//     (UNIQUE(dedupe_key) collides) until tomorrow.
//
// Both problems vanish once the sweeper marks the row 'failed': the
// quorum gate sees terminal status and stops waiting; the next audit
// can either retry (different attempt_seq) or fall back to absence
// quorum.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { withRun } from '../_shared/otel.ts';
import { createLogger } from '../_shared/logger.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const log = createLogger({ service: 'scrape-job-sweeper' });

// Worker heartbeat cadence is ~30s. Wait 10 minutes (20× heartbeats)
// before declaring a worker dead — generous so a slow CPU doesn't
// trigger false-positive reaps.
const STALE_HEARTBEAT_THRESHOLD_SECONDS = 600;

interface CorsHeaders {
  [key: string]: string;
}

const CORS: CorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-request-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) =>
  withRun('scrape-job-sweeper', req, async (run) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !serviceRoleKey) {
      log.error('config.missing_service_role', {});
      return new Response(
        JSON.stringify({ error: 'missing SUPABASE_SERVICE_ROLE_KEY' }),
        { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Reap zombie jobs: status='running' AND heartbeat older than threshold.
    // Use a single UPDATE so the operation is atomic at the row level.
    const cutoffIso = new Date(Date.now() - STALE_HEARTBEAT_THRESHOLD_SECONDS * 1000).toISOString();

    const { data: reaped, error } = await supabase
      .from('scrape_jobs')
      .update({
        status: 'failed',
        error_kind: 'timeout',
        finished_at: new Date().toISOString(),
        result_summary: {
          reaped_by: 'scrape-job-sweeper',
          reaped_at: new Date().toISOString(),
          reason: 'heartbeat_stale',
          stale_threshold_seconds: STALE_HEARTBEAT_THRESHOLD_SECONDS,
        },
      })
      .eq('status', 'running')
      .lt('heartbeat_at', cutoffIso)
      .select('id, company_name, job_type, started_at, heartbeat_at');

    if (error) {
      log.error('sweep.failed', { errorMessage: error.message, code: error.code });
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    const reapedCount = reaped?.length ?? 0;
    run.setItemsIn(0);
    run.setItemsOut(reapedCount);

    if (reapedCount > 0) {
      log.warn('sweep.reaped_zombies', {
        count: reapedCount,
        sample: reaped?.slice(0, 5).map((r) => ({
          id: r.id,
          company_name: r.company_name,
          job_type: r.job_type,
          stale_for_seconds:
            r.heartbeat_at != null
              ? Math.round((Date.now() - new Date(r.heartbeat_at).getTime()) / 1000)
              : null,
        })),
      });
    } else {
      log.info('sweep.clean', { stale_threshold_seconds: STALE_HEARTBEAT_THRESHOLD_SECONDS });
    }

    return new Response(
      JSON.stringify({ reaped: reapedCount, stale_threshold_seconds: STALE_HEARTBEAT_THRESHOLD_SECONDS }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }));
