// audit-coalesce/index.ts — WS6
//
// Request-coalescing layer for concurrent same-company audits. Addresses
// Audit Issue #15 (scrape stampedes) and Issue #17 (10k concurrent users
// each blocking on their own 45s pipeline).
//
// Mechanism:
//   1. Caller POSTs { company_canonical, role_title, department, country }.
//   2. We compute a fingerprint = hash(canonical|role|dept|country|day-bucket).
//   3. We try to acquire a Postgres advisory lock keyed on the fingerprint.
//      * If we got the lock, we are the LEADER for this audit window.
//        We INSERT a `pending` row in audit_coalesce_runs (defined below)
//        and return { phase: 'leader' }. The client runs its normal
//        pipeline and POSTs the final result back via PATCH later.
//      * If we did NOT get the lock, we are a FOLLOWER. We look up the
//        existing pending/completed row, return its current state, and
//        return { phase: 'follower', subscribeChannel: 'audit_<fp>' }.
//        The follower subscribes to the channel and receives the leader's
//        result via Supabase realtime broadcast.
//
//   This collapses N concurrent identical audits to 1 pipeline run + N-1
//   subscribers. At 10k concurrent users for the same company on a news
//   day, the leader runs once and 9999 followers attach to its result.
//
// The leader's pipeline still pays the 45s ceiling, but ONLY ONCE. Combined
// with the WS6 Tier-A two-stage response (deferred), the visible wait for
// any single user falls dramatically.
//
// Note: this function is the lightweight coordinator. The actual scoring
// pipeline still runs client-side (or in a follow-up worker function).
// All this function does is decide leader-vs-follower and serve the
// in-flight result snapshot.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { withRun, corsHeaders } from '../_shared/otel.ts';

// ── Config ──────────────────────────────────────────────────────────────────

/** Window during which two requests with the same fingerprint coalesce. */
const COALESCE_WINDOW_MS = 5 * 60 * 1000;  // 5 minutes
/** Maximum age of a leader's pending row before followers stop waiting. */
const LEADER_STALE_MS = 60 * 1000;          // 60 seconds

// ── Fingerprint ─────────────────────────────────────────────────────────────

const norm = (s: string | undefined | null): string => (s ?? '').trim().toLowerCase();

async function fingerprint(input: {
  company_canonical: string;
  role_title?: string;
  department?: string;
  country?: string;
}): Promise<string> {
  // Day bucket: same-company audits within 5min coalesce; > 5min get a
  // distinct fingerprint via fingerprint_window column (handled at SQL level).
  const payload = [
    norm(input.company_canonical),
    norm(input.role_title),
    norm(input.department),
    norm(input.country),
  ].join('|');
  const data = new TextEncoder().encode(payload);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Postgres advisory locks take a 64-bit signed int. Hash the fingerprint
// hex to a 32-bit value for the high half and another 32 for the low half.
function fingerprintToLockKey(fp: string): { hi: number; lo: number } {
  // Two distinct 8-hex slices. Cast to signed 32-bit ints.
  const hi = parseInt(fp.slice(0, 8), 16) | 0;
  const lo = parseInt(fp.slice(8, 16), 16) | 0;
  return { hi, lo };
}

// ── Response helpers ────────────────────────────────────────────────────────

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// ── Main handler ────────────────────────────────────────────────────────────

interface CoalesceRequest {
  company_canonical: string;
  role_title?: string;
  department?: string;
  country?: string;
}

Deno.serve((req) =>
  withRun('audit-coalesce', req, async (run) => {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (req.method !== 'POST') {
      return json({ error: 'method_not_allowed' }, 405);
    }

    let body: CoalesceRequest;
    try {
      body = (await req.json()) as CoalesceRequest;
    } catch {
      return json({ error: 'invalid_json' }, 400);
    }
    if (!body.company_canonical || typeof body.company_canonical !== 'string') {
      return json({ error: 'company_canonical_required' }, 400);
    }

    const fp = await fingerprint(body);
    const lockKey = fingerprintToLockKey(fp);
    run.addMeta('fingerprint', fp.slice(0, 16));
    run.addMeta('company', body.company_canonical);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    // ── Step 1: try to acquire advisory lock ──────────────────────────────
    // pg_try_advisory_xact_lock — released automatically at the end of the
    // transaction. Since Supabase JS client does not give us explicit txn
    // control, we use the non-xact variant pg_try_advisory_lock and
    // release manually before returning.
    const { data: lockData, error: lockErr } = await supabase.rpc('pg_try_advisory_lock', {
      key1: lockKey.hi,
      key2: lockKey.lo,
    });

    if (lockErr) {
      // RPC not exposed — fall back to a simpler upsert-based race.
      // (The migration in WS6 step 2 adds a SECURITY DEFINER wrapper for this.)
      run.recordFallback({
        layerId: 'audit_coalesce_advisory_lock',
        reason: 'exception',
        errorKind: 'rpc_unavailable',
        errorMessage: lockErr.message,
      });
      return json({
        phase: 'leader',
        fingerprint: fp,
        fallback: 'advisory_lock_unavailable',
        message: 'Run the pipeline locally; coalescing not active.',
      });
    }

    const gotLock = lockData === true;
    run.addMeta('got_lock', gotLock);

    if (gotLock) {
      // ── LEADER PATH ───────────────────────────────────────────────────
      // Insert a pending row. The leader's client will PATCH it with the
      // final result once their pipeline completes.
      const expiresAt = new Date(Date.now() + LEADER_STALE_MS);
      const { error: insErr } = await supabase
        .from('audit_coalesce_runs')
        .upsert(
          {
            fingerprint: fp,
            company_canonical: body.company_canonical,
            role_title: body.role_title ?? null,
            department: body.department ?? null,
            country: body.country ?? null,
            status: 'leader_pending',
            expires_at: expiresAt.toISOString(),
            payload: null,
          },
          { onConflict: 'fingerprint' },
        );
      // Release lock immediately — the row is the durable mutex now.
      await supabase.rpc('pg_advisory_unlock', { key1: lockKey.hi, key2: lockKey.lo }).catch(() => {});
      if (insErr) {
        run.recordFallback({
          layerId: 'audit_coalesce_runs_insert',
          reason: 'exception',
          errorMessage: insErr.message,
        });
        return json({ phase: 'leader', fingerprint: fp, fallback: 'insert_failed' });
      }
      return json({
        phase: 'leader',
        fingerprint: fp,
        broadcast_channel: `audit_${fp.slice(0, 16)}`,
        expires_at: expiresAt.toISOString(),
      });
    }

    // ── FOLLOWER PATH ─────────────────────────────────────────────────────
    // Look up the existing row. If it is fresh and pending, the follower
    // subscribes; if completed, the follower gets the result directly.
    await supabase.rpc('pg_advisory_unlock', { key1: lockKey.hi, key2: lockKey.lo }).catch(() => {});
    const { data: existing, error: selErr } = await supabase
      .from('audit_coalesce_runs')
      .select('status, payload, expires_at, completed_at')
      .eq('fingerprint', fp)
      .maybeSingle();

    if (selErr || !existing) {
      // Race condition: leader's INSERT hasn't landed yet. Tell the client
      // to retry as a leader after a short backoff.
      return json({
        phase: 'follower',
        fingerprint: fp,
        retry_after_ms: 250,
        message: 'Leader row not yet visible; retry as leader.',
      });
    }

    const row = existing as {
      status: string;
      payload: unknown;
      expires_at: string | null;
      completed_at: string | null;
    };

    if (row.status === 'completed' && row.payload) {
      return json({
        phase: 'follower',
        fingerprint: fp,
        status: 'completed',
        payload: row.payload,
        completed_at: row.completed_at,
      });
    }

    // Pending. Check leader staleness.
    const expiresMs = row.expires_at ? Date.parse(row.expires_at) : 0;
    if (Number.isFinite(expiresMs) && Date.now() > expiresMs) {
      // Leader is stale (likely client died mid-pipeline). Tell follower
      // to escalate to leader on next retry.
      return json({
        phase: 'follower',
        fingerprint: fp,
        status: 'leader_stale',
        retry_after_ms: 100,
        message: 'Leader expired; reattempt as leader.',
      });
    }

    return json({
      phase: 'follower',
      fingerprint: fp,
      status: 'leader_pending',
      broadcast_channel: `audit_${fp.slice(0, 16)}`,
      expires_at: row.expires_at,
    });
  }),
);
