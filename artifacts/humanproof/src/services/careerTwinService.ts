// careerTwinService.ts — Career Twin living model
//
// Maintains a compounding per-user model (career_twin_state) that:
//   1. Is synced from user_profiles + HybridResult after every audit.
//   2. Exposes getTwinInfluence() for signalOrchestrator re-ranking.
//   3. Records career decisions to decisions_log.
//
// All Supabase calls use the singleton client — no service-role bypass needed
// since career_twin_state has RLS (own row only).

import { supabase } from '../utils/supabase';
import type { HybridResult } from '../types/hybridResult';
import type { UserProfile } from './userProfileService';
import type { CareerDecision } from './careerMemoryService';

// ── Public types ───────────────────────────────────────────────────────────────

export interface TwinInfluenceSignals {
  /** Signal group keys to boost (+5 relevanceScore in orchestrator). */
  prioritySignalGroups: Array<'workforce' | 'financial' | 'market' | 'career'>;
  /** actionItem ids to suppress from primaryMove selection. */
  suppressedActionIds: string[];
  /** Multiplier 0.5–1.5 applied to career-group relevanceScore (goal alignment). */
  careerGroupBoost: number;
}

export interface CareerTwinState {
  userId: string;
  twinVersion: number;
  skillsSnapshot: { selfRatedSkills: string[]; targetSkills: string[] } | null;
  goalsSnapshot: {
    primaryGoal: string | null;
    suppressedActionIds: string[];
    suppressedCategories: string[];
  } | null;
  decisionsLog: CareerDecision[];
  scoreAtLastUpdate: number | null;
  profileCompleteness: number | null;
  twinHealth: 'rich' | 'partial' | 'sparse';
  actionsCompletedThisWeek: number;
  actionsCompletedTotal: number;
  lastInteractionAt: string;
}

// ── DB row → domain type ───────────────────────────────────────────────────────

function rowToTwin(row: Record<string, unknown>): CareerTwinState {
  return {
    userId: row.user_id as string,
    twinVersion: (row.twin_version as number) ?? 1,
    skillsSnapshot: (row.skills_snapshot as CareerTwinState['skillsSnapshot']) ?? null,
    goalsSnapshot: (row.goals_snapshot as CareerTwinState['goalsSnapshot']) ?? null,
    decisionsLog: (row.decisions_log as CareerDecision[]) ?? [],
    scoreAtLastUpdate: (row.score_at_last_update as number) ?? null,
    profileCompleteness: (row.profile_completeness as number) ?? null,
    twinHealth: (row.twin_health as CareerTwinState['twinHealth']) ?? 'sparse',
    actionsCompletedThisWeek: (row.actions_completed_this_week as number) ?? 0,
    actionsCompletedTotal: (row.actions_completed_total as number) ?? 0,
    lastInteractionAt: (row.last_interaction_at as string) ?? new Date().toISOString(),
  };
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Load current twin state for the authenticated user.
 * Returns null when no twin row exists yet.
 */
export async function loadCareerTwin(): Promise<CareerTwinState | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data, error } = await supabase
    .from('career_twin_state')
    .select('*')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (error || !data) return null;
  return rowToTwin(data as Record<string, unknown>);
}

/**
 * Upsert twin state after an audit or profile save.
 * Safe to call speculatively — uses ON CONFLICT DO UPDATE.
 */
export async function syncTwinFromProfile(
  profile: Partial<UserProfile>,
  hybrid: HybridResult,
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const userId = session.user.id;

  // Derive twin_health based on available data richness
  const hasSkills = (profile.selfRatedSkills?.length ?? 0) > 0;
  const hasGoal = !!profile.primaryGoal;
  const hasFinancial = profile.monthlySalaryUsd != null;
  const dataPoints = [hasSkills, hasGoal, hasFinancial].filter(Boolean).length;
  const twinHealth: CareerTwinState['twinHealth'] =
    dataPoints >= 3 ? 'rich' : dataPoints >= 1 ? 'partial' : 'sparse';

  // Compute profile completeness (0–100): count non-null profile fields
  const completenessFields = [
    profile.selfRatedSkills?.length, profile.targetSkills?.length,
    profile.primaryGoal, profile.monthlySalaryUsd, profile.savingsMonthsRunway,
    profile.industryKey, profile.yearsExperience,
  ];
  const filledCount = completenessFields.filter(v => v != null && v !== '').length;
  const profileCompleteness = Math.round((filledCount / completenessFields.length) * 100);

  // Read existing decisions_log to preserve it on upsert
  const existing = await loadCareerTwin();

  const row = {
    user_id: userId,
    twin_version: (existing?.twinVersion ?? 0) + 1,
    skills_snapshot: {
      selfRatedSkills: profile.selfRatedSkills ?? [],
      targetSkills: profile.targetSkills ?? [],
    },
    goals_snapshot: {
      primaryGoal: profile.primaryGoal ?? null,
      suppressedActionIds: existing?.goalsSnapshot?.suppressedActionIds ?? [],
      suppressedCategories: existing?.goalsSnapshot?.suppressedCategories ?? [],
    },
    decisions_log: existing?.decisionsLog ?? [],
    score_at_last_update: hybrid.total ?? null,
    profile_completeness: profileCompleteness,
    twin_health: twinHealth,
    actions_completed_this_week: existing?.actionsCompletedThisWeek ?? 0,
    actions_completed_total: existing?.actionsCompletedTotal ?? 0,
    last_interaction_at: new Date().toISOString(),
  };

  await supabase
    .from('career_twin_state')
    .upsert(row, { onConflict: 'user_id' });
}

/**
 * Derive influence signals for signalOrchestrator from twin state.
 * Pure function — safe to call with null (returns neutral defaults).
 */
export function getTwinInfluence(twin: CareerTwinState | null): TwinInfluenceSignals {
  if (!twin || twin.twinHealth === 'sparse') {
    return {
      prioritySignalGroups: [],
      suppressedActionIds: [],
      careerGroupBoost: 1.0,
    };
  }

  const goal = twin.goalsSnapshot?.primaryGoal ?? '';

  // Map primary goal to signal group priority
  const prioritySignalGroups: TwinInfluenceSignals['prioritySignalGroups'] = [];
  if (goal.includes('promot') || goal.includes('grow') || goal.includes('advance')) {
    prioritySignalGroups.push('career');
  }
  if (goal.includes('job') || goal.includes('new role') || goal.includes('switch')) {
    prioritySignalGroups.push('market');
  }
  if (goal.includes('safe') || goal.includes('secure') || goal.includes('stable')) {
    prioritySignalGroups.push('workforce');
  }
  if (goal.includes('salary') || goal.includes('comp') || goal.includes('negotiat')) {
    prioritySignalGroups.push('financial');
  }

  // career-group boost: rich twin with career/market goal amplifies career signals
  const careerGroupBoost =
    twin.twinHealth === 'rich' && prioritySignalGroups.includes('career') ? 1.25
    : twin.twinHealth === 'partial' ? 1.1
    : 1.0;

  return {
    prioritySignalGroups,
    suppressedActionIds: twin.goalsSnapshot?.suppressedActionIds ?? [],
    careerGroupBoost,
  };
}

/**
 * Append a career decision to decisions_log and persist.
 */
export async function recordTwinDecision(decision: CareerDecision): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const existing = await loadCareerTwin();
  const log = [...(existing?.decisionsLog ?? []), decision].slice(-50); // cap at 50

  await supabase
    .from('career_twin_state')
    .upsert(
      {
        user_id: session.user.id,
        decisions_log: log,
        last_interaction_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
}

/**
 * Suppress an action category from future primaryMove selection.
 * Called when user rates an action 1–2 (not helpful).
 */
export async function suppressActionCategory(
  actionId: string,
  category: string,
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const existing = await loadCareerTwin();
  const currentIds = existing?.goalsSnapshot?.suppressedActionIds ?? [];
  const currentCats = existing?.goalsSnapshot?.suppressedCategories ?? [];

  if (currentIds.includes(actionId)) return; // already suppressed

  const goalsSnapshot = {
    ...(existing?.goalsSnapshot ?? { primaryGoal: null }),
    suppressedActionIds: [...currentIds, actionId],
    suppressedCategories: [...new Set([...currentCats, category])],
  };

  await supabase
    .from('career_twin_state')
    .upsert(
      { user_id: session.user.id, goals_snapshot: goalsSnapshot },
      { onConflict: 'user_id' },
    );
}

/**
 * Increment actions_completed_this_week and actions_completed_total.
 * Called by actionCompletionService after markActionComplete().
 */
export async function incrementTwinActionCount(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const existing = await loadCareerTwin();
  if (!existing) return;

  await supabase
    .from('career_twin_state')
    .update({
      actions_completed_this_week: existing.actionsCompletedThisWeek + 1,
      actions_completed_total: existing.actionsCompletedTotal + 1,
    })
    .eq('user_id', session.user.id);
}
