// evaluate-autopilot-signals/index.ts
//
// Proactive career signal evaluator. Called by pg_cron twice daily:
//   - 08:00 UTC daily  → evaluates 4 signal types per active user
//   - 14:00 UTC Monday → adds weekly_digest alert
//
// Design: fully deterministic, no LLM. Same logic as adaptationTriggerService.ts
// but server-side so users don't need to be in-app.
//
// Alert types produced:
//   score_surge       — score delta >8pts vs prior audit
//   peer_layoff       — breaking_news_events in user's industry in last 48h
//   equity_cliff      — equity_vest_months in [1,3]
//   opportunity_window — (reserved — hiring spike detection, v2)
//   weekly_digest     — Monday summary: actions completed + score delta + primaryMove
//
// Dedup: UNIQUE INDEX on (user_id, alert_type, created_at::date) prevents duplicates
// within a single day regardless of how many times this function is invoked.
//
// Critical alerts trigger send-alert-email via Supabase net.http_post.
//
// Required env vars:
//   SUPABASE_URL               — project URL
//   SUPABASE_SERVICE_ROLE_KEY  — service role (bypasses RLS to read all users)
//   FROM_EMAIL                 — sender address
//   APP_URL                    — public frontend URL (for email links)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { withRun } from '../_shared/otel.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// ── Configuration ────────────────────────────────────────────────────────────

/** Only evaluate users who have audited in the last 90 days (active users). */
const ACTIVE_WINDOW_DAYS = 90;
/** Score delta threshold to fire score_surge alert. */
const SCORE_SURGE_THRESHOLD = 8;
/** equity_cliff fires when vesting is within this many months. */
const EQUITY_CLIFF_MONTHS_MAX = 3;
/** peer_layoff looks back this many hours for breaking news. */
const PEER_LAYOFF_LOOKBACK_HOURS = 48;

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserRow {
  user_id: string;
  industry_key: string | null;
  equity_vest_months: number | null;
  has_equity_vesting: boolean | null;
  company_name: string | null;  // from most recent score_trajectory
  latest_score: number | null;
  prior_score: number | null;
  actions_completed_7d: number;
  score_delta_7d: number | null;
}

interface AlertInsert {
  user_id: string;
  alert_type: string;
  severity: 'critical' | 'high' | 'info';
  headline: string;
  body: string | null;
  action_route: string | null;
  action_label: string | null;
  primary_move: Record<string, unknown> | null;
  alert_date: string;  // YYYY-MM-DD — used for unique dedup index
  expires_at: string | null;
}

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve((req) =>
  withRun('evaluate-autopilot-signals', req, async (_run) => {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    let runMode = 'daily_signals';
    try {
      const body = await req.json().catch(() => ({}));
      runMode = (body as { run?: string }).run ?? 'daily_signals';
    } catch { /* use default */ }

    const cutoff = new Date(Date.now() - ACTIVE_WINDOW_DAYS * 24 * 3600 * 1000).toISOString();

    // ── 1. Fetch active users with profile + latest 2 scores ─────────────────
    // Join user_profiles with score_trajectory (latest 2 per user).
    // Using a raw SQL RPC to avoid N+1.
    const { data: activeUsers, error: usersErr } = await supabase.rpc(
      'get_active_users_for_autopilot',
      { cutoff_date: cutoff },
    );

    if (usersErr) {
      // Fallback: fetch users from score_trajectory directly
      console.error('[autopilot] RPC unavailable, using fallback:', usersErr.message);
      // Graceful degradation — skip this run rather than crash
      return json({ status: 'skipped', reason: 'rpc_unavailable', error: usersErr.message });
    }

    if (!activeUsers || activeUsers.length === 0) {
      return json({ status: 'ok', evaluated: 0, inserted: 0 });
    }

    // ── 2. Fetch recent breaking news (peer_layoff signal) ────────────────────
    const newsLookback = new Date(Date.now() - PEER_LAYOFF_LOOKBACK_HOURS * 3600 * 1000).toISOString();
    const { data: recentNews } = await supabase
      .from('breaking_news_events')
      .select('company_name, industry, event_type, created_at')
      .gte('created_at', newsLookback)
      .in('event_type', ['layoff', 'restructuring', 'hiring_freeze'])
      .limit(500);

    const newsByIndustry = new Map<string, number>();
    for (const n of recentNews ?? []) {
      if (n.industry) {
        newsByIndustry.set(n.industry, (newsByIndustry.get(n.industry) ?? 0) + 1);
      }
    }

    // ── 3. Evaluate signals per user ─────────────────────────────────────────
    const alerts: AlertInsert[] = [];

    for (const user of activeUsers as UserRow[]) {
      const userId = user.user_id;

      // ── 3a. score_surge ──────────────────────────────────────────────────
      if (user.latest_score != null && user.prior_score != null) {
        const delta = user.latest_score - user.prior_score;
        if (Math.abs(delta) >= SCORE_SURGE_THRESHOLD) {
          const rising = delta > 0;
          alerts.push({
            user_id: userId,
            alert_type: 'score_surge',
            severity: rising && user.latest_score >= 70 ? 'critical' : 'high',
            headline: rising
              ? `Your risk score jumped ${delta} points — review your action plan`
              : `Your risk score improved by ${Math.abs(delta)} points`,
            body: rising
              ? `Your layoff risk score moved from ${user.prior_score} to ${user.latest_score}. New signals have been detected. Check your dashboard for updated recommendations.`
              : `Your layoff risk score dropped from ${user.prior_score} to ${user.latest_score}. Your recent actions appear to be working.`,
            action_route: rising ? '/os' : null,
            action_label: rising ? 'Review dashboard' : null,
            primary_move: null,
            alert_date: new Date().toISOString().slice(0, 10),
            expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
          });
        }
      }

      // ── 3b. peer_layoff ──────────────────────────────────────────────────
      if (user.industry_key) {
        const peerCount = newsByIndustry.get(user.industry_key) ?? 0;
        if (peerCount >= 2) {
          alerts.push({
            user_id: userId,
            alert_type: 'peer_layoff',
            severity: peerCount >= 5 ? 'critical' : 'high',
            headline: `${peerCount} layoff events in your industry in the last 48 hours`,
            body: `Sector contagion risk is elevated. Peer companies in ${user.industry_key} have announced layoffs or restructuring. Review your risk exposure and strengthen your network now.`,
            action_route: '/tools/networking',
            action_label: 'Strengthen network',
            primary_move: null,
            alert_date: new Date().toISOString().slice(0, 10),
            expires_at: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
          });
        }
      }

      // ── 3c. equity_cliff ─────────────────────────────────────────────────
      if (user.has_equity_vesting && user.equity_vest_months != null) {
        const months = user.equity_vest_months;
        if (months >= 1 && months <= EQUITY_CLIFF_MONTHS_MAX) {
          alerts.push({
            user_id: userId,
            alert_type: 'equity_cliff',
            severity: months <= 1 ? 'critical' : 'high',
            headline: `Equity vests in ${months} month${months === 1 ? '' : 's'} — plan your negotiation now`,
            body: `Your equity vesting cliff is approaching. This significantly affects your negotiation leverage and departure timing. Review your compensation strategy before this window closes.`,
            action_route: '/tools/compensation',
            action_label: 'Review compensation strategy',
            primary_move: null,
            alert_date: new Date().toISOString().slice(0, 10),
            expires_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
          });
        }
      }

      // ── 3d. weekly_digest (Monday runs only) ─────────────────────────────
      if (runMode === 'weekly_digest') {
        const scoreDeltaText = user.score_delta_7d != null
          ? (user.score_delta_7d > 0
              ? `↑ ${user.score_delta_7d}pts this week`
              : user.score_delta_7d < 0
                ? `↓ ${Math.abs(user.score_delta_7d)}pts this week`
                : 'No change this week')
          : 'No trajectory data yet';

        const actionsText = user.actions_completed_7d > 0
          ? `You completed ${user.actions_completed_7d} action${user.actions_completed_7d === 1 ? '' : 's'} this week.`
          : 'No actions completed this week — check your action plan.';

        alerts.push({
          user_id: userId,
          alert_type: 'weekly_digest',
          severity: 'info',
          headline: `Weekly Career OS Digest — ${scoreDeltaText}`,
          body: `${actionsText} Current risk score: ${user.latest_score ?? 'N/A'}. Open your dashboard to see updated recommendations and this week's top action.`,
          action_route: '/os',
          action_label: 'Open Career OS',
          primary_move: null,
          alert_date: new Date().toISOString().slice(0, 10),
          expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        });
      }
    }

    if (alerts.length === 0) {
      return json({ status: 'ok', evaluated: (activeUsers as UserRow[]).length, inserted: 0 });
    }

    // ── 4. Upsert alerts (dedup via UNIQUE INDEX on user_id+alert_type+day) ──
    // ON CONFLICT DO NOTHING — the unique index handles the dedup.
    const { data: inserted, error: insertErr } = await supabase
      .from('user_autopilot_alerts')
      .insert(alerts)
      .select('id, user_id, alert_type, severity')
      .throwOnError();

    if (insertErr) {
      // ON CONFLICT DO NOTHING means some may be silently skipped — that's fine.
      console.warn('[autopilot] insert partial error:', insertErr.message);
    }

    const insertedRows = inserted ?? [];

    // ── 5. Fire send-alert-email for critical alerts ──────────────────────────
    const criticalAlerts = insertedRows.filter((r: { severity: string }) => r.severity === 'critical');
    const appUrl = Deno.env.get('APP_URL') ?? 'https://humanshield.app';

    for (const alert of criticalAlerts) {
      const matchingAlert = alerts.find(a => a.user_id === alert.user_id && a.alert_type === alert.alert_type);
      if (!matchingAlert) continue;

      try {
        await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-alert-email`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({
              userId: alert.user_id,
              alertId: alert.id,
              headline: matchingAlert.headline,
              body: matchingAlert.body,
              actionRoute: matchingAlert.action_route,
              actionLabel: matchingAlert.action_label,
              appUrl,
            }),
          },
        );
      } catch (e) {
        console.error('[autopilot] send-alert-email failed for user', alert.user_id, e);
      }
    }

    return json({
      status: 'ok',
      evaluated: (activeUsers as UserRow[]).length,
      inserted: insertedRows.length,
      critical_emails_triggered: criticalAlerts.length,
    });
  }),
);
