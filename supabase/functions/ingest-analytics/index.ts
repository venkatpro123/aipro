// ingest-analytics/index.ts — WS1
//
// Backend consumer for analyticsService.ts client events.
//
// Contract:
//   POST /functions/v1/ingest-analytics
//   Body: { events: AnalyticsEvent[] }
//
//   AnalyticsEvent = {
//     event_name: string,
//     kind: 'track' | 'page' | 'identify',
//     properties?: Record<string, unknown>,
//     anon_id?: string,
//     audit_session_id?: string,
//     client_ts?: string,         // ISO timestamp
//   }
//
// Auth:
//   * Authenticated callers attach their JWT; user_id is derived server-side
//     from auth.uid() so the client cannot spoof someone else's id.
//   * Anonymous callers send only anon_id; user_id is null.
//
// Rate limiting:
//   * Up to 200 events per request (matches analyticsService.ts buffer cap).
//   * Larger batches rejected at 400.
//
// Failure mode:
//   * Insert failures DO NOT fail the request — the client should not retry
//     a batch indefinitely. Failed inserts are logged via console.error and
//     the response includes a `dropped` count for visibility.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { withRun, corsHeaders } from '../_shared/otel.ts';

interface AnalyticsEvent {
  event_name: string;
  kind: 'track' | 'page' | 'identify';
  properties?: Record<string, unknown>;
  anon_id?: string;
  audit_session_id?: string;
  client_ts?: string;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const MAX_BATCH = 200;
const MAX_PROP_BYTES = 16 * 1024;  // 16KB per event properties

function sanitizeEvent(e: unknown): AnalyticsEvent | null {
  if (!e || typeof e !== 'object') return null;
  const r = e as Record<string, unknown>;

  const event_name = typeof r.event_name === 'string' ? r.event_name.slice(0, 200) : null;
  if (!event_name) return null;

  const kind = r.kind === 'track' || r.kind === 'page' || r.kind === 'identify' ? r.kind : null;
  if (!kind) return null;

  const properties = (r.properties && typeof r.properties === 'object' && !Array.isArray(r.properties))
    ? r.properties as Record<string, unknown>
    : {};
  const propsJson = JSON.stringify(properties);
  if (propsJson.length > MAX_PROP_BYTES) {
    // Drop the event rather than truncating — partial JSON is worse than nothing.
    return null;
  }

  return {
    event_name,
    kind,
    properties,
    anon_id: typeof r.anon_id === 'string' ? r.anon_id.slice(0, 128) : undefined,
    audit_session_id: typeof r.audit_session_id === 'string' ? r.audit_session_id : undefined,
    client_ts: typeof r.client_ts === 'string' ? r.client_ts : undefined,
  };
}

Deno.serve((req) =>
  withRun('ingest-analytics', req, async (run) => {
    if (req.method !== 'POST') {
      return json({ error: 'method_not_allowed' }, 405);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return json({ error: 'invalid_json' }, 400);
    }

    const events = (body as { events?: unknown[] }).events;
    if (!Array.isArray(events)) {
      return json({ error: 'events_array_required' }, 400);
    }
    if (events.length === 0) {
      return json({ ok: true, accepted: 0, dropped: 0 });
    }
    if (events.length > MAX_BATCH) {
      return json({ error: 'batch_too_large', max: MAX_BATCH }, 400);
    }

    // Resolve user_id from JWT (if present).
    let userId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const anonClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } },
      );
      try {
        const { data } = await anonClient.auth.getUser();
        userId = data.user?.id ?? null;
      } catch {
        // Anonymous fallback — event still recorded with user_id=null.
      }
    }

    const userAgent = req.headers.get('user-agent') ?? null;
    const ipCountry = req.headers.get('x-vercel-ip-country') ?? req.headers.get('cf-ipcountry') ?? null;

    const sanitized: AnalyticsEvent[] = [];
    let dropped = 0;
    for (const e of events) {
      const s = sanitizeEvent(e);
      if (s) sanitized.push(s);
      else dropped++;
    }

    run.setItemsIn(events.length);
    run.setItemsOut(sanitized.length);
    if (dropped > 0) run.addMeta('dropped', dropped);

    if (sanitized.length === 0) {
      return json({ ok: true, accepted: 0, dropped });
    }

    const rows = sanitized.map((e) => ({
      event_name: e.event_name,
      kind: e.kind,
      user_id: userId,
      anon_id: e.anon_id ?? null,
      properties: e.properties ?? {},
      user_agent: userAgent,
      ip_country: ipCountry,
      audit_session_id: e.audit_session_id ?? null,
      client_ts: e.client_ts ?? null,
    }));

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    let insertedCount = 0;
    try {
      const { error, count } = await serviceClient
        .from('analytics_events')
        .insert(rows, { count: 'exact' });
      if (error) {
        console.warn('[ingest-analytics] insert failed:', error.message);
        run.recordFallback({
          layerId: 'analytics_events_insert',
          reason: 'exception',
          errorKind: 'insert_failed',
          errorMessage: error.message,
        });
      } else {
        insertedCount = count ?? rows.length;
      }
    } catch (err) {
      console.warn('[ingest-analytics] insert threw:', err);
    }

    return json({ ok: true, accepted: insertedCount, dropped });
  }),
);
