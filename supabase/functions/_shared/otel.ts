// _shared/otel.ts — WS1
//
// Minimal span + pipeline_runs writer for Supabase Edge Functions (Deno).
//
// Why not the full OpenTelemetry SDK? Two reasons:
//   1. The Deno OTel SDK is heavy (~80kB) and cold-start sensitive. Edge
//      functions are billed per ms of CPU; the SDK's startup cost can
//      exceed the function's own work for fast handlers.
//   2. We only need three concrete telemetry behaviours:
//        (a) per-function duration + error code into pipeline_runs
//        (b) per-failure entry into layer_fallback_log
//        (c) optional structured stdout log line for Logflare/Axiom ingest
//      All three are cheap to write directly.
//
// Usage:
//
//   import { withRun, recordFallback } from "../_shared/otel.ts";
//
//   serve(async (req) => {
//     return withRun("schedule-outcome-prompts", req, async (run) => {
//       run.setItemsIn(1);
//       const result = await doWork();
//       run.setItemsOut(result.length);
//       return json(result);
//     });
//   });
//
// withRun wraps a handler so every invocation writes one pipeline_runs row,
// including the error_code when the handler throws. The wrapped handler can
// also call recordFallback() to log a non-fatal degradation.
//
// service_role credentials are used because pipeline_runs is service-role
// only. The function must have SUPABASE_SERVICE_ROLE_KEY available.

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
// DEBT-5 — structured logger.
import { createLogger } from './logger.ts';

const otelLog = createLogger({ service: 'otel' });

// ── Types (mirrors layer_fallback_log + pipeline_runs schemas) ──────────────

export type LayerKind =
  | 'intelligence_layer'
  | 'data_source'
  | 'edge_function'
  | 'scrape'
  | 'swarm_agent';

export type FallbackReason =
  | 'timeout'
  | 'anti_bot'
  | 'parser_failed'
  | 'null_input'
  | 'exception'
  | 'rate_limited'
  | 'circuit_open';

export type SourceClass =
  | 'REGULATORY'
  | 'OFFICIAL_FILING'
  | 'MAJOR_PRESS'
  | 'AGGREGATED_DATA'
  | 'SOCIAL_AGGREGATE'
  | 'SOCIAL_INDIVIDUAL';

export interface FallbackRecord {
  layerId: string;
  reason: FallbackReason;
  layerKind?: LayerKind;
  sourceName?: string;
  sourceClass?: SourceClass;
  errorKind?: string;
  errorMessage?: string;
  durationMs?: number;
  fallbackValue?: unknown;
  auditSessionId?: string | null;
  companyCanonical?: string | null;
}

// ── Supabase client (lazy) ──────────────────────────────────────────────────

let _serviceClient: SupabaseClient | null = null;
function serviceClient(): SupabaseClient | null {
  if (_serviceClient) return _serviceClient;
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    otelLog.warn('telemetry.disabled', { reason: 'missing_supabase_credentials' });
    return null;
  }
  _serviceClient = createClient(url, key, { auth: { persistSession: false } });
  return _serviceClient;
}

// ── Run handle ──────────────────────────────────────────────────────────────

export class Run {
  readonly functionName: string;
  readonly runId: string;
  readonly startedAt: Date;
  private itemsIn = 0;
  private itemsOut = 0;
  private cost = 0;
  private meta: Record<string, unknown> = {};
  private fallbackQueue: FallbackRecord[] = [];
  private requestId: string | null;

  constructor(functionName: string, requestId: string | null = null) {
    this.functionName = functionName;
    this.runId = crypto.randomUUID();
    this.startedAt = new Date();
    this.requestId = requestId;
    this.meta.request_id = requestId;
  }

  setItemsIn(n: number): this {
    this.itemsIn = n;
    return this;
  }
  setItemsOut(n: number): this {
    this.itemsOut = n;
    return this;
  }
  setCostUsd(usd: number): this {
    this.cost += usd;
    return this;
  }
  addMeta(key: string, value: unknown): this {
    this.meta[key] = value;
    return this;
  }
  recordFallback(rec: FallbackRecord): this {
    this.fallbackQueue.push(rec);
    return this;
  }
  getRequestId(): string | null {
    return this.requestId;
  }

  async finalize(errorCode: string | null, errorMessage?: string): Promise<void> {
    const finishedAt = new Date();
    const durationMs = finishedAt.getTime() - this.startedAt.getTime();
    const client = serviceClient();
    if (!client) return;

    // Best-effort writes — never throw from telemetry.
    //
    // NOTE: pipeline_runs.duration_ms is a GENERATED ALWAYS STORED column;
    //       INSERTing it produces "cannot insert into generated column" and
    //       the whole row is rejected. Do NOT include duration_ms here —
    //       Postgres derives it from (finished_at - started_at).
    //
    // WS14: pipeline_runs.request_id is a first-class column (migration
    //       20260620000001). Include it here so per-audit drilldown joins
    //       to layer_fallback_log + engine_constant_resolutions work.
    const pipelineRunRow = {
      function_name: this.functionName,
      run_id: this.runId,
      started_at: this.startedAt.toISOString(),
      finished_at: finishedAt.toISOString(),
      items_in: this.itemsIn,
      items_out: this.itemsOut,
      error_code: errorCode,
      cost_usd: this.cost > 0 ? this.cost : null,
      meta: { ...this.meta, error_message: errorMessage ?? null, duration_ms_observed: durationMs },
      request_id: this.requestId,
    };

    try {
      await client.from('pipeline_runs').insert(pipelineRunRow);
    } catch (err) {
      otelLog.warn('pipeline_runs.insert_failed', {
        function: this.functionName,
        run_id: this.runId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    if (this.fallbackQueue.length > 0) {
      const rows = this.fallbackQueue.map((r) => ({
        layer_id: r.layerId,
        layer_kind: r.layerKind ?? 'edge_function',
        audit_session_id: r.auditSessionId ?? null,
        company_canonical: r.companyCanonical ?? null,
        fallback_reason: r.reason,
        fallback_value: r.fallbackValue ?? null,
        error_kind: r.errorKind ?? null,
        error_message: r.errorMessage ? r.errorMessage.slice(0, 1024) : null,
        source_class: r.sourceClass ?? null,
        source_name: r.sourceName ?? null,
        duration_ms: r.durationMs ?? null,
        request_id: this.requestId,
        engine_version: null,
      }));
      try {
        await client.from('layer_fallback_log').insert(rows);
      } catch (err) {
        otelLog.warn('layer_fallback_log.insert_failed', {
          function: this.functionName,
          run_id: this.runId,
          row_count: rows.length,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Structured span emission via the shared logger so the JSON shape
    // matches every other log line (and the downstream parser doesn't
    // need a special case for "is this a span or a log?").
    otelLog.info('span.completed', {
      function: this.functionName,
      run_id: this.runId,
      duration_ms: durationMs,
      error_code: errorCode,
      items_in: this.itemsIn,
      items_out: this.itemsOut,
      cost_usd: this.cost,
      request_id: this.requestId,
    });
  }
}

// ── Wrapper ─────────────────────────────────────────────────────────────────

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

/**
 * Wrap a Deno edge function handler. Catches thrown errors, writes a
 * pipeline_runs row with the error_code, and re-throws (so the Deno
 * runtime returns a 500 to the caller).
 *
 * The handler MUST return a Response. Errors that bubble out are caught
 * and converted to a 500 response so the function never crashes silently.
 */
export async function withRun(
  functionName: string,
  req: Request,
  handler: (run: Run) => Promise<Response>,
): Promise<Response> {
  // Honour OPTIONS preflight without writing a span — preflights are noise.
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const requestId = req.headers.get('x-request-id') ?? null;
  const run = new Run(functionName, requestId);

  try {
    const response = await handler(run);
    await run.finalize(null);
    // Inject CORS headers into the handler's response so browser cross-origin
    // calls work regardless of whether the handler included them. The handler
    // typically uses Response.json() which has no CORS headers, causing the
    // browser to block the response even on a 200 OK.
    //
    // BUG FIX (v42.4): Do NOT use object-spread to merge headers.
    //   new Headers({ ...response.headers.entries(), ...corsHeaders })
    // fails because .entries() returns lowercase keys ('access-control-allow-origin')
    // while corsHeaders has capitalized keys ('Access-Control-Allow-Origin').
    // JavaScript object spread treats them as different keys, so Headers()
    // appends both, producing the INVALID value "*, *" which browsers reject.
    //
    // Correct approach: copy handler headers then use .set() (case-insensitive
    // overwrite) so corsHeaders always wins regardless of what the handler set.
    const mergedHeaders = new Headers(response.headers);
    for (const [key, value] of Object.entries(corsHeaders)) {
      mergedHeaders.set(key, value);
    }
    const merged = new Response(response.body, {
      status:     response.status,
      statusText: response.statusText,
      headers:    mergedHeaders,
    });
    return merged;
  } catch (err) {
    const errorCode = err instanceof Error ? err.name : 'unknown';
    const errorMessage = err instanceof Error ? err.message : String(err);
    await run.finalize(errorCode, errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage, error_code: errorCode, run_id: run.runId }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
}

/**
 * Standalone fallback recorder for cases where you want to log a degradation
 * without a Run context (e.g. inside a Promise.allSettled callback). Writes
 * directly to layer_fallback_log.
 */
export async function recordFallback(rec: FallbackRecord): Promise<void> {
  const client = serviceClient();
  if (!client) return;
  try {
    await client.from('layer_fallback_log').insert({
      layer_id: rec.layerId,
      layer_kind: rec.layerKind ?? 'edge_function',
      audit_session_id: rec.auditSessionId ?? null,
      company_canonical: rec.companyCanonical ?? null,
      fallback_reason: rec.reason,
      fallback_value: rec.fallbackValue ?? null,
      error_kind: rec.errorKind ?? null,
      error_message: rec.errorMessage ? rec.errorMessage.slice(0, 1024) : null,
      source_class: rec.sourceClass ?? null,
      source_name: rec.sourceName ?? null,
      duration_ms: rec.durationMs ?? null,
      request_id: null,
      engine_version: null,
    });
  } catch (err) {
    otelLog.warn('record_fallback.insert_failed', {
      layer_id: rec.layerId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export { corsHeaders };
