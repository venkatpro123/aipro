// generate-weekly-brief/index.ts
// Generates and caches WeeklyCareerBrief records for all active users.
// Runs every Monday at 09:00 UTC so users see fresh briefs when they open the app.
//
// Schedule (pg_cron):
//   SELECT cron.schedule('generate-weekly-brief-monday', '0 9 * * 1', $$
//     SELECT net.http_post(
//       url := current_setting('app.supabase_url') || '/functions/v1/generate-weekly-brief',
//       headers := jsonb_build_object(
//         'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
//         'Content-Type', 'application/json'
//       ),
//       body := '{}'::jsonb
//     )
//   $$);
//
// Env vars required:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-injected)

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getMondayDate(): string {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return monday.toISOString().split('T')[0];
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  const authHeader = req.headers.get('Authorization') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!authHeader.includes(serviceKey)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS_HEADERS });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabase = createClient(supabaseUrl, serviceKey);

  const weekStarting = getMondayDate();
  const now = new Date().toISOString();
  let processed = 0;
  let skipped = 0;
  let errors = 0;

  try {
    // Active users = had an audit in last 30 days
    const { data: recentScores } = await supabase
      .from('layoff_scores')
      .select('user_id, score, calculated_at, company_name')
      .gte('calculated_at', new Date(Date.now() - 30 * 86400_000).toISOString())
      .order('calculated_at', { ascending: false });

    const userLatest = new Map<string, { score: number; companyName: string }>();
    for (const row of recentScores ?? []) {
      if (!userLatest.has(row.user_id)) {
        userLatest.set(row.user_id, { score: row.score, companyName: row.company_name ?? '' });
      }
    }

    // Pull week's news signals once (shared for all users)
    const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
    const { data: news } = await supabase
      .from('breaking_news_events')
      .select('event_type, headline, source, confidence_score')
      .gte('detected_at', weekAgo)
      .order('confidence_score', { ascending: false })
      .limit(10);

    const topSignals = (news ?? []).slice(0, 3).map((n: Record<string, unknown>) => ({
      type: String(n.event_type ?? 'market').includes('layoff') ? 'layoff' : 'market',
      headline: String(n.headline ?? 'Market signal detected'),
      severity: Number(n.confidence_score ?? 0) > 0.7 ? 'CRITICAL' : Number(n.confidence_score ?? 0) > 0.4 ? 'HIGH' : 'INFO',
      source: String(n.source ?? 'Live signal'),
    }));

    for (const [userId, { score, companyName }] of userLatest) {
      // Skip if brief already generated this week
      const { data: existing } = await supabase
        .from('weekly_career_briefs')
        .select('id')
        .eq('user_id', userId)
        .eq('week_starting', weekStarting)
        .maybeSingle();

      if (existing) { skipped++; continue; }

      try {
        // Compute score trend for this user
        const { data: scores } = await supabase
          .from('layoff_scores')
          .select('score')
          .eq('user_id', userId)
          .order('calculated_at', { ascending: false })
          .limit(2);

        let scoreDelta = 0;
        let scoreTrend: 'improving' | 'stable' | 'worsening' = 'stable';
        if (scores && scores.length === 2) {
          scoreDelta = Math.round((scores[1].score as number) - (scores[0].score as number));
          scoreTrend = scoreDelta > 3 ? 'improving' : scoreDelta < -3 ? 'worsening' : 'stable';
        }

        const priorityAction = score >= 65
          ? `Your risk score is ${score} — schedule 2 risk-reduction actions this week.`
          : companyName
            ? `Monitor ${companyName} signals and complete your weekly action.`
            : 'Complete your weekly career action to maintain momentum.';

        const brief = {
          weekStarting,
          topSignals,
          scoreTrend,
          scoreDelta,
          priorityAction,
          readyAt: now,
          hasData: topSignals.length > 0 || scoreDelta !== 0,
        };

        const { error: insertErr } = await supabase.from('weekly_career_briefs').upsert({
          user_id: userId,
          week_starting: weekStarting,
          brief_json: brief,
          generated_at: now,
        }, { onConflict: 'user_id,week_starting' });

        if (insertErr) { errors++; continue; }
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
    JSON.stringify({ processed, skipped, errors, weekStarting }),
    { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
  );
});
