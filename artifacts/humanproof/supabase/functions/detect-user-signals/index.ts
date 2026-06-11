// detect-user-signals/index.ts — Phase 3 (Detection Network)
//
// Rule 11 ("monitor forever") + Rule 3 ("detect more"): runs every 6h (pg_cron)
// and, for every user with a Career Twin, detects what changed while they were
// away — then persists alerts to user_alerts. The app shows them as "detected
// since your last visit." Server-feasible detectors only (data the EF can read
// without the live audit):
//   • news_event  — a layoff at a company on the user's watchlist
//   • stagnation  — score flat across the last 3 audits with no logged outcomes
// Audit-derived detectors (demand/comp) run client-side and write to the same
// table. The detector LOGIC mirrors src/services/detectors/index.ts (kept in
// lock-step; Deno can't import the Vite-bundled client code).
//
// Auth: pg_cron-only — requires the service-role bearer (same gate as
// breaking-news-scan). Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-set).

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = { 'Content-Type': 'application/json' };

type Severity = 'critical' | 'high' | 'info';

interface AlertRow {
  user_id: string;
  detector: string;
  dedupe_key: string;
  severity: Severity;
  category: string;
  headline: string;
  detail: string;
  evidence: string;
  tool_link: string | null;
}

// ── Detector logic (mirror of src/services/detectors/index.ts) ────────────────

function newsEventToAlert(userId: string, e: { id: string; company_name: string; headline: string; event_date: string; percent_cut: number | null; confidence: string }): AlertRow {
  const pct = e.percent_cut;
  const severity: Severity =
    e.confidence === 'high' || (pct != null && pct >= 10) ? 'critical'
    : pct != null && pct >= 3 ? 'high' : 'info';
  return {
    user_id: userId, detector: 'news_event', dedupe_key: `news:${e.id}`,
    severity, category: 'company',
    headline: `Layoff signal at ${e.company_name}`,
    detail: e.headline,
    evidence: `Detected ${e.event_date}${pct != null ? ` · ~${pct}% cut` : ''} · confidence ${e.confidence}. This is a company on your watchlist.`,
    tool_link: '/tools/layoff-defense',
  };
}

function stagnationAlert(userId: string, history: Array<{ date: string; score: number }>, outcomesLogged: number): AlertRow | null {
  if (!Array.isArray(history) || history.length < 3) return null;
  const last3 = history.slice(-3);
  const scores = last3.map(h => h.score);
  const range = Math.max(...scores) - Math.min(...scores);
  if (range > 3 || outcomesLogged > 0) return null;
  return {
    user_id: userId, detector: 'stagnation',
    dedupe_key: `stagnation:${last3[0].date}_${last3[2].date}`,
    severity: 'info', category: 'score',
    headline: `Your risk score has been flat across your last 3 audits`,
    detail: `Monitoring without action keeps you exactly where you are. One concrete move this week changes the trajectory.`,
    evidence: `Scores ${scores.join(' → ')} (range ${range} pts) with no outcomes logged — a plateau, not progress.`,
    tool_link: '/tools/strategy',
  };
}

// Constant-time string compare.
function ctEq(a: string, b: string): boolean {
  if (a.length === 0 || a.length !== b.length) return false;
  let ok = true;
  for (let i = 0; i < a.length; i++) if (a.charCodeAt(i) !== b.charCodeAt(i)) ok = false;
  return ok;
}

serve(async (req) => {
  // Internal-only endpoint. Accept EITHER a dedicated shared secret (decoupled
  // from API-key rotation — set via `supabase secrets set DETECT_CRON_SECRET`)
  // OR the service-role bearer (pg_cron path). Either is sufficient.
  const cronSecret = Deno.env.get('DETECT_CRON_SECRET') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const headerSecret = (req.headers.get('x-detect-secret') ?? '').trim();
  const bearer = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  const authorized =
    (cronSecret.length > 0 && ctEq(headerSecret, cronSecret)) ||
    (serviceRoleKey.length > 0 && ctEq(bearer, serviceRoleKey));
  if (!authorized) return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: CORS });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Recent breaking-news events (last 10 days), indexed by company name.
    const tenDaysAgo = new Date(Date.now() - 10 * 86_400_000).toISOString();
    const { data: events } = await supabase
      .from('breaking_news_events')
      .select('id, company_name, headline, event_date, percent_cut, confidence, detected_at')
      .gte('detected_at', tenDaysAgo)
      .order('detected_at', { ascending: false })
      .limit(500);
    const eventsByCompany = new Map<string, any[]>();
    for (const e of events ?? []) {
      const k = String(e.company_name ?? '').toLowerCase().trim();
      if (!eventsByCompany.has(k)) eventsByCompany.set(k, []);
      eventsByCompany.get(k)!.push(e);
    }

    // Every user with a twin (i.e. has run an audit).
    const { data: twins } = await supabase
      .from('career_twin_state')
      .select('user_id, audit_score_history, outcome_success_rates, detector_baselines');

    const alertsToInsert: AlertRow[] = [];
    const baselineUpdates: Array<{ user_id: string; detector_baselines: any }> = [];

    for (const twin of twins ?? []) {
      const userId = twin.user_id as string;
      const baselines = (twin.detector_baselines ?? {}) as Record<string, any>;
      let baselinesChanged = false;

      // ── News: watchlist ∩ recent events newer than our last-alerted timestamp ──
      const { data: watch } = await supabase
        .from('user_monitoring_watchlist')
        .select('company_name')
        .eq('user_id', userId);
      const lastNewsAtMs = Number(baselines.lastNewsAtMs ?? 0);
      let maxNewsAtMs = lastNewsAtMs;
      for (const w of watch ?? []) {
        const evs = eventsByCompany.get(String(w.company_name ?? '').toLowerCase().trim()) ?? [];
        for (const e of evs) {
          const atMs = new Date(e.detected_at).getTime();
          if (atMs <= lastNewsAtMs) continue;
          alertsToInsert.push(newsEventToAlert(userId, e));
          if (atMs > maxNewsAtMs) maxNewsAtMs = atMs;
        }
      }
      if (maxNewsAtMs > lastNewsAtMs) { baselines.lastNewsAtMs = maxNewsAtMs; baselinesChanged = true; }

      // ── Stagnation: flat score history + no logged outcomes ────────────────────
      const outcomesLogged = Object.keys((twin.outcome_success_rates ?? {}) as Record<string, unknown>).length;
      const stag = stagnationAlert(userId, (twin.audit_score_history ?? []) as any[], outcomesLogged);
      if (stag) alertsToInsert.push(stag);

      if (baselinesChanged) baselineUpdates.push({ user_id: userId, detector_baselines: baselines });
    }

    // Insert alerts (dedupe on user_id+dedupe_key — ON CONFLICT DO NOTHING).
    let inserted = 0;
    if (alertsToInsert.length) {
      const { error, count } = await supabase
        .from('user_alerts')
        .upsert(alertsToInsert, { onConflict: 'user_id,dedupe_key', ignoreDuplicates: true, count: 'exact' });
      if (!error) inserted = count ?? alertsToInsert.length;
    }
    // Persist news baselines so we don't re-alert the same events.
    for (const u of baselineUpdates) {
      await supabase.from('career_twin_state').update({ detector_baselines: u.detector_baselines }).eq('user_id', u.user_id);
    }

    return new Response(JSON.stringify({ users: (twins ?? []).length, candidates: alertsToInsert.length, inserted }), { headers: CORS });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: CORS });
  }
});
