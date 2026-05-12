// outcomeService.ts — v15.0
// Writes user-confirmed outcomes to user_prediction_outcomes (the user-facing,
// RLS-gated table). Separate from swarmLearningStore.ts which writes to the
// swarm prediction_outcomes table (service-role only, no user-id).

import { supabase } from '../utils/supabase';

export type OutcomeLabel = 'layoff_occurred' | 'no_layoff' | 'voluntarily_left' | 'other';

export interface DuePrompt {
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

export async function fetchDuePrompts(): Promise<DuePrompt[]> {
  try {
    const { data, error } = await supabase.functions.invoke('schedule-outcome-prompts');
    if (error || !data) return [];
    return (data.due_prompts ?? []) as DuePrompt[];
  } catch {
    return [];
  }
}

export async function recordUserOutcome(
  auditId: string,
  outcomeLabel: OutcomeLabel,
): Promise<boolean> {
  const { error } = await supabase
    .from('user_prediction_outcomes')
    .update({
      outcome_reported: outcomeLabel,
      outcome_date: new Date().toISOString(),
    })
    .eq('id', auditId);
  return !error;
}

// Convenience: look up the latest unconfirmed audit for the current user and
// mark it. Called from the dashboard when the user completes the inline prompt.
export async function recordOutcomeForLatestAudit(
  outcomeLabel: OutcomeLabel,
): Promise<boolean> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session?.user?.id) return false;

  const { data, error: fetchErr } = await supabase
    .from('user_prediction_outcomes')
    .select('id')
    .eq('user_id', sessionData.session.user.id)
    .is('outcome_reported', null)
    .order('audit_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchErr || !data) return false;
  return recordUserOutcome(data.id, outcomeLabel);
}
