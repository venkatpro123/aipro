// careerOutcomeService.ts — Phase 3 (Rule 2, 9)
// Records user-reported and auto-detected career milestones.
// Feeds CareerResultsPanel and seeds the Career Graph (Phase 5).

import { supabase } from '../utils/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

export type OutcomeEventType =
  | 'salary_increase'
  | 'promotion'
  | 'job_change'
  | 'layoff_avoided'
  | 'skill_certified'
  | 'negotiation_win'
  | 'offer_received'
  | 'offer_declined';

export interface CareerOutcomeEvent {
  id: string;
  eventType: OutcomeEventType;
  eventDate: string;      // ISO date
  companyName?: string;
  roleTitle?: string;
  details?: Record<string, unknown>;
  source: 'user_reported' | 'auto_detected';
  createdAt: string;
}

export interface OutcomeSummary {
  events: CareerOutcomeEvent[];
  hasSalaryIncrease: boolean;
  hasPromotion: boolean;
  hasJobChange: boolean;
  totalWins: number;
  mostRecentWin: CareerOutcomeEvent | null;
}

export const OUTCOME_LABELS: Record<OutcomeEventType, string> = {
  salary_increase:  'Salary increase',
  promotion:        'Promotion',
  job_change:       'New job',
  layoff_avoided:   'Avoided layoff',
  skill_certified:  'Skill certified',
  negotiation_win:  'Negotiation win',
  offer_received:   'Offer received',
  offer_declined:   'Offer declined (by choice)',
};

export const OUTCOME_ICONS: Record<OutcomeEventType, string> = {
  salary_increase:  '💰',
  promotion:        '📈',
  job_change:       '🚀',
  layoff_avoided:   '🛡️',
  skill_certified:  '🎓',
  negotiation_win:  '🤝',
  offer_received:   '📩',
  offer_declined:   '✋',
};

const WIN_TYPES = new Set<OutcomeEventType>([
  'salary_increase', 'promotion', 'job_change', 'layoff_avoided',
  'skill_certified', 'negotiation_win',
]);

// ── DB row → domain ───────────────────────────────────────────────────────────

function rowToEvent(row: Record<string, unknown>): CareerOutcomeEvent {
  return {
    id: row.id as string,
    eventType: row.event_type as OutcomeEventType,
    eventDate: row.event_date as string,
    companyName: (row.company_name as string | null) ?? undefined,
    roleTitle: (row.role_title as string | null) ?? undefined,
    details: (row.details as Record<string, unknown> | null) ?? undefined,
    source: (row.source as 'user_reported' | 'auto_detected') ?? 'user_reported',
    createdAt: row.created_at as string,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Record a career outcome event for the current authenticated user.
 */
export async function recordOutcomeEvent(
  type: OutcomeEventType,
  opts: {
    eventDate?: string;
    companyName?: string;
    roleTitle?: string;
    details?: Record<string, unknown>;
  } = {},
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase.from('career_outcome_events').insert({
      user_id: user.id,
      event_type: type,
      event_date: opts.eventDate ?? new Date().toISOString().split('T')[0],
      company_name: opts.companyName ?? null,
      role_title: opts.roleTitle ?? null,
      details: opts.details ?? null,
      source: 'user_reported',
    });

    return !error;
  } catch {
    return false;
  }
}

/**
 * Fetch all career outcome events for a user.
 * Returns newest first, max 50 rows.
 */
export async function getOutcomeEvents(userId: string): Promise<CareerOutcomeEvent[]> {
  try {
    const { data, error } = await supabase
      .from('career_outcome_events')
      .select('*')
      .eq('user_id', userId)
      .order('event_date', { ascending: false })
      .limit(50);

    if (error || !data) return [];
    return (data as Record<string, unknown>[]).map(rowToEvent);
  } catch {
    return [];
  }
}

/**
 * Summarize outcomes for the CareerResultsPanel.
 */
export async function getOutcomeSummary(userId: string): Promise<OutcomeSummary> {
  const events = await getOutcomeEvents(userId);
  const wins = events.filter(e => WIN_TYPES.has(e.eventType));

  return {
    events,
    hasSalaryIncrease: events.some(e => e.eventType === 'salary_increase'),
    hasPromotion: events.some(e => e.eventType === 'promotion'),
    hasJobChange: events.some(e => e.eventType === 'job_change'),
    totalWins: wins.length,
    mostRecentWin: wins[0] ?? null,
  };
}
