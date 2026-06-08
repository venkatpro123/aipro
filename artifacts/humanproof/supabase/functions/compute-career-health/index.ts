// compute-career-health/index.ts
// Computes and persists CareerHealthScore for all active users.
//
// Schedule (pg_cron — weekly, Sunday 22:00 UTC):
//   SELECT cron.schedule('compute-career-health-weekly', '0 22 * * 0', $$
//     SELECT net.http_post(
//       url := current_setting('app.supabase_url') || '/functions/v1/compute-career-health',
//       headers := jsonb_build_object(
//         'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
//         'Content-Type', 'application/json'
//       ),
//       body := '{}'::jsonb
//     )
//   $$);
//
// Env vars required:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-injected by Supabase)

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  // Only accept service-role calls (from pg_cron or admin)
  const authHeader = req.headers.get('Authorization') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!authHeader.includes(serviceKey)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS_HEADERS });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabase = createClient(supabaseUrl, serviceKey);

  const now = new Date().toISOString();
  let processed = 0;
  let errors = 0;

  try {
    // Get users who had an audit in the last 90 days
    const { data: recentScores, error: fetchErr } = await supabase
      .from('layoff_scores')
      .select('user_id, score, calculated_at')
      .gte('calculated_at', new Date(Date.now() - 90 * 86400_000).toISOString())
      .order('calculated_at', { ascending: false });

    if (fetchErr) throw fetchErr;

    // Deduplicate: most recent score per user
    const userLatest = new Map<string, { score: number; calculatedAt: string }>();
    for (const row of recentScores ?? []) {
      if (!userLatest.has(row.user_id)) {
        userLatest.set(row.user_id, { score: row.score, calculatedAt: row.calculated_at });
      }
    }

    // For each active user, compute and upsert health score
    for (const [userId, { score }] of userLatest) {
      try {
        // Risk component (40%): invert risk score
        const riskComponent = Math.round((100 - score) * 0.4);

        // Action component (20%): completions in last 30 days
        let actionComponent = 10;
        const monthAgo = new Date(Date.now() - 30 * 86400_000).toISOString();
        const { data: completions } = await supabase
          .from('action_completions')
          .select('id')
          .eq('user_id', userId)
          .gte('completed_at', monthAgo);
        if (completions && completions.length > 0) {
          actionComponent = Math.min(20, Math.round(completions.length * 2));
        }

        // Skill + financial components: default 10 each (no profile join in batch for now)
        const skillComponent = 10;
        const financialComponent = 10;

        const total = Math.min(100, riskComponent + actionComponent + skillComponent + financialComponent);

        const { error: upsertErr } = await supabase.from('career_health_scores').insert({
          user_id: userId,
          computed_at: now,
          health_score: total,
          risk_component: riskComponent,
          action_component: actionComponent,
          skill_component: skillComponent,
          financial_component: financialComponent,
        });

        if (upsertErr) { errors++; continue; }
        processed++;
      } catch {
        errors++;
      }
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }

  return new Response(
    JSON.stringify({ processed, errors, computedAt: now }),
    { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
  );
});
