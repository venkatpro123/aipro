// user-data-export/index.ts
// GDPR Article 15 (right of access) + Article 20 (right to data portability).
//
// Returns all personal data held for the authenticated user as structured JSON.
// The user must present a valid JWT — the export only covers their own data.
//
// Output shape (UserDataExport):
//   {
//     exported_at:  ISO timestamp
//     user_id:      UUID
//     profile:      user_profiles row (minus internal fields)
//     scores:       layoff_scores rows
//     trajectory:   score_trajectory rows
//     outcomes:     user_prediction_outcomes rows
//   }
//
// Retention notice: included in the export so the user understands how long
// each data category is kept and the legal basis for processing.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { corsHeaders } from '../_shared/otel.ts';

const RETENTION_NOTICE = {
  profile: 'Retained until account deletion. Legal basis: contract (Art. 6(1)(b) GDPR).',
  scores: 'Retained for 2 years or until deletion request. Legal basis: legitimate interest (Art. 6(1)(f)) — enabling score trajectory and calibration.',
  trajectory: 'Retained for 2 years or until deletion request. Legal basis: legitimate interest.',
  outcomes: 'Retained for 3 years for model calibration. Legal basis: legitimate interest. Anonymized after retention period.',
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl    = Deno.env.get('SUPABASE_URL')!;
  const anonKey        = Deno.env.get('SUPABASE_ANON_KEY')!;

  // Use the user's JWT (not service_role) so RLS applies — the user can only
  // export their own data. The auth header is forwarded from the client request.
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Authentication required for data export.' }),
      { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  // Resolve the authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: 'Invalid or expired session. Please log in again.' }),
      { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  }

  const userId = user.id;
  const exportedAt = new Date().toISOString();

  try {
    // Fetch all data in parallel — RLS ensures each query scopes to the user's rows
    const [profileRes, scoresRes, trajectoryRes, outcomesRes] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('salary_band, visa_status, metro, metro_area, city_tier, tenure_years, job_title, industry_key, years_experience, local_currency_code, local_monthly_salary_raw, monthly_salary_usd, monthly_salary_inr, monthly_expenses_usd, savings_months_runway, has_equity_vesting, equity_vest_months, has_dependents, dual_income_household, prior_job_changes, prior_layoff_survived, industry_years, self_rated_skills, target_skills, uniqueness_knowledge_type, preferred_locale, is_eu_user, gdpr_consent_given, gdpr_consent_at, community_share_consented, financial_data_consented, first_audit_completed_at, last_confirmed_at, updated_at')
        .eq('user_id', userId)
        .maybeSingle(),

      supabase
        .from('layoff_scores')
        .select('company_name, role_title, department, score, tier, tier_color, confidence, breakdown, models_used, data_quality, role_key, industry_key, allow_community_share, calculated_at, created_at')
        .eq('user_id', userId)
        .order('calculated_at', { ascending: false }),

      supabase
        .from('score_trajectory')
        .select('company_canonical_name, score, tier, confidence_pct, cohort, archetype, engine_version, inputs_snapshot, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),

      supabase
        .from('user_prediction_outcomes')
        .select('company_name, role_title, predicted_risk_tier, predicted_score, audit_date, outcome_reported, outcome_date, outcome_notes, prompt_milestone, prompted_at, created_at, updated_at')
        .eq('user_id', userId)
        .order('audit_date', { ascending: false }),
    ]);

    // Surface any fetch errors
    const errors: string[] = [];
    if (profileRes.error)     errors.push(`profile: ${profileRes.error.message}`);
    if (scoresRes.error)      errors.push(`scores: ${scoresRes.error.message}`);
    if (trajectoryRes.error)  errors.push(`trajectory: ${trajectoryRes.error.message}`);
    if (outcomesRes.error)    errors.push(`outcomes: ${outcomesRes.error.message}`);

    const export_data = {
      exported_at:      exportedAt,
      user_id:          userId,
      email:            user.email ?? null,
      gdpr_notice:      {
        legal_basis:    'GDPR Articles 15 and 20 — right of access and data portability.',
        contact:        'privacy@humanproof.ai',
        deletion_url:   '/settings/delete-account',
        retention:      RETENTION_NOTICE,
      },
      partial_errors:   errors.length > 0 ? errors : undefined,
      profile:          profileRes.data ?? null,
      scores:           scoresRes.data  ?? [],
      trajectory:       trajectoryRes.data ?? [],
      outcomes:         outcomesRes.data ?? [],
      summary: {
        audit_count:    (scoresRes.data ?? []).length,
        trajectory_entries: (trajectoryRes.data ?? []).length,
        outcome_reports:    (outcomesRes.data ?? []).length,
        has_profile:        profileRes.data !== null,
      },
    };

    return new Response(
      JSON.stringify(export_data, null, 2),
      {
        status: 200,
        headers: {
          'Content-Type':        'application/json',
          'Content-Disposition': `attachment; filename="humanproof-data-export-${exportedAt.slice(0, 10)}.json"`,
          ...corsHeaders,
        },
      },
    );

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[user-data-export] Fatal:', msg);
    return new Response(
      JSON.stringify({ error: 'Export failed. Please try again or contact privacy@humanproof.ai.' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  }
});
