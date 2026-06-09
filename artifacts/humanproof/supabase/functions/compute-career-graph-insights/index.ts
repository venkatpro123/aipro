// compute-career-graph-insights/index.ts
// Phase 5 (Rule 9 Career Graph v1): weekly aggregation of cross-user outcome patterns.
//
// Purpose:
//   Joins career_outcome_events + action_completions + layoff_scores to compute
//   "users like you who did X saw Y" patterns. Writes to career_graph_insights table.
//   Minimum sample_count = 10 before a row is written (privacy + statistical validity).
//
// Schedule (add to pg_cron):
//   SELECT cron.schedule('compute-career-graph-weekly', '0 4 * * 1', $$
//     SELECT net.http_post(
//       url := current_setting('app.supabase_url') || '/functions/v1/compute-career-graph-insights',
//       headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key')),
//       body := '{}'::jsonb
//     )
//   $$);
//
// Output: career_graph_insights rows upserted with fresh aggregate stats.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const MIN_SAMPLE = 10;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  try {
    let inserted = 0;
    let skipped = 0;

    // ── Step 1: Get all action_completions with role info via user_profiles ──
    const { data: completions, error: compErr } = await supabase
      .from('action_completions')
      .select(`
        user_id,
        action_id,
        completed_at,
        measured_risk_reduction
      `)
      .not('measured_risk_reduction', 'is', null)
      .gte('completed_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
      .limit(5000);

    if (compErr || !completions?.length) {
      return new Response(JSON.stringify({ ok: true, message: 'No completions to aggregate', inserted: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ── Step 2: Fetch user profiles to get role keys ──
    const userIds = [...new Set(completions.map(c => c.user_id))];
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, role_title')
      .in('user_id', userIds.slice(0, 100));

    const roleByUser = new Map<string, string>();
    for (const p of profiles ?? []) {
      if (p.role_title) {
        roleByUser.set(p.user_id, p.role_title.toLowerCase().replace(/[\s]+/g, '_'));
      }
    }

    // ── Step 3: Group by (role_key, action_id) → collect risk reductions ──
    const groups = new Map<string, number[]>();

    for (const c of completions) {
      const roleKey = roleByUser.get(c.user_id) ?? 'unknown';
      const key = `${roleKey}|${c.action_id}`;
      const arr = groups.get(key) ?? [];
      if (c.measured_risk_reduction != null && c.measured_risk_reduction > 0) {
        arr.push(c.measured_risk_reduction);
      }
      groups.set(key, arr);
    }

    // ── Step 4: Compute stats + upsert into career_graph_insights ──
    const upserts = [];

    for (const [key, reductions] of groups.entries()) {
      if (reductions.length < MIN_SAMPLE) {
        skipped++;
        continue;
      }

      const [roleKey, actionId] = key.split('|');
      const avg = reductions.reduce((s, r) => s + r, 0) / reductions.length;
      const variance = reductions.reduce((s, r) => s + Math.pow(r - avg, 2), 0) / reductions.length;
      const stdDev = Math.sqrt(variance);
      // Confidence: higher N + lower stdDev → higher confidence (0–1 scale)
      const confidence = Math.min(0.95, (reductions.length / 50) * (1 - Math.min(0.5, stdDev / 20)));

      upserts.push({
        role_key: roleKey,
        action_id: actionId,
        outcome_type: 'risk_reduction',
        avg_outcome_value: Math.round(avg * 100) / 100,
        sample_count: reductions.length,
        confidence: Math.round(confidence * 1000) / 1000,
        computed_at: new Date().toISOString(),
      });
      inserted++;
    }

    // ── Step 5: Also aggregate from career_outcome_events ──
    const { data: outcomeEvents } = await supabase
      .from('career_outcome_events')
      .select('user_id, event_type, details')
      .in('event_type', ['salary_increase', 'promotion', 'job_change'])
      .limit(2000);

    if (outcomeEvents?.length) {
      const eventGroups = new Map<string, number[]>();
      for (const ev of outcomeEvents) {
        const roleKey = roleByUser.get(ev.user_id) ?? 'unknown';
        const key = `${roleKey}|${ev.event_type}`;
        const arr = eventGroups.get(key) ?? [];
        arr.push(1); // count events
        eventGroups.set(key, arr);
      }

      for (const [key, counts] of eventGroups.entries()) {
        if (counts.length < MIN_SAMPLE) { skipped++; continue; }
        const [roleKey, eventType] = key.split('|');
        upserts.push({
          role_key: roleKey,
          action_id: eventType,
          outcome_type: eventType,
          avg_outcome_value: counts.length,
          sample_count: counts.length,
          confidence: Math.min(0.9, counts.length / 30),
          computed_at: new Date().toISOString(),
        });
        inserted++;
      }
    }

    // Batch upsert
    if (upserts.length > 0) {
      await supabase
        .from('career_graph_insights')
        .upsert(upserts, { onConflict: 'role_key,action_id,outcome_type' });
    }

    return new Response(
      JSON.stringify({ ok: true, inserted, skipped, total: groups.size }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
