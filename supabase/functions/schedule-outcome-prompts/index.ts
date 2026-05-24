// schedule-outcome-prompts/index.ts — v15.0
//
// Returns the list of audits the calling user should be prompted to
// confirm outcomes for. The frontend OutcomeFeedbackPrompt polls this on
// session load and surfaces a "what actually happened?" prompt for any
// returned audit.
//
// Why a function rather than a direct table query?
//   - The 30/90/180-day cadence logic lives here so the contract stays
//     stable as we evolve the prompt schedule.
//   - Future v15.x: this same endpoint can be invoked by pg_cron to enqueue
//     email/push notifications via send-monthly-report style delivery.
//
// Auth: requires a valid user JWT. Returns rows for `auth.uid()` only —
// RLS on user_prediction_outcomes enforces this even if the function is
// misconfigured.
//
// Schema reference: 20260514000002_user_prediction_outcomes.sql
//   user_prediction_outcomes(id, user_id, audit_session_id, company_name,
//     role_title, predicted_risk_tier, predicted_score, audit_date,
//     outcome_reported, outcome_date, ...)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
// WS10 — withRun writes pipeline_runs + propagates x-request-id.
import { withRun } from '../_shared/otel.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// Days since audit at which we ask the user to report outcome.
// 30: catches sudden cuts (signal-conflict tier).
// 90: catches early-warning tier.
// 180: catches long-tail outcomes — most layoffs in our backtest landed by here.
const PROMPT_AGES_DAYS = [30, 90, 180] as const;
const PROMPT_TOLERANCE_DAYS = 7; // accept rows aged [N-7, N+7] so users who
                                 // haven't logged in daily still get prompted.

interface DuePrompt {
  audit_id: string;
  audit_session_id: string | null;
  company_name: string;
  role_title: string | null;
  predicted_risk_tier: string;
  predicted_score: number | null;
  audit_date: string;
  age_days: number;
  prompt_milestone: 30 | 90 | 180;
}

Deno.serve((req) =>
  withRun('schedule-outcome-prompts', req, async (_run) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
    );

    // Pull all unconfirmed outcomes for this user. RLS ensures only the
    // caller's own rows come back.
    const { data, error } = await supabase
      .from('user_prediction_outcomes')
      .select('id, audit_session_id, company_name, role_title, predicted_risk_tier, predicted_score, audit_date, outcome_reported')
      .is('outcome_reported', null)
      .order('audit_date', { ascending: false })
      .limit(50);

    if (error) {
      return json({ error: error.message, code: 'QUERY_FAILED' }, 500);
    }

    const now = Date.now();
    const due: DuePrompt[] = [];

    for (const row of data ?? []) {
      const auditTime = new Date(row.audit_date).getTime();
      if (isNaN(auditTime)) continue;
      const ageDays = Math.floor((now - auditTime) / 86_400_000);

      // Pick the largest milestone the audit has crossed within tolerance.
      // Once a milestone passes, the user gets one prompt; if they ignore it,
      // they get the next milestone's prompt later.
      const milestone = [...PROMPT_AGES_DAYS].reverse().find(
        (m) => ageDays >= m - PROMPT_TOLERANCE_DAYS && ageDays <= m + PROMPT_TOLERANCE_DAYS,
      );
      if (milestone == null) continue;

      due.push({
        audit_id: row.id,
        audit_session_id: row.audit_session_id ?? null,
        company_name: row.company_name,
        role_title: row.role_title ?? null,
        predicted_risk_tier: row.predicted_risk_tier,
        predicted_score: row.predicted_score ?? null,
        audit_date: row.audit_date,
        age_days: ageDays,
        prompt_milestone: milestone,
      });
    }

    return json({
      due_prompts: due,
      count: due.length,
      generated_at: new Date().toISOString(),
      schema_version: 'outcome-prompts@1',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return json({ error: message, code: 'UNCAUGHT' }, 500);
  }
  }));
