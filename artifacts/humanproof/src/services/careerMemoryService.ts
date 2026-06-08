// careerMemoryService.ts — Career Memory: timeline, decisions, summary
import { supabase } from '../utils/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TimelineEventType = 'audit' | 'action' | 'decision' | 'outcome';

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  date: string;          // ISO string
  title: string;
  subtitle?: string;
  score?: number;        // for 'audit' events
  metadata?: Record<string, unknown>;
}

export interface CareerDecision {
  id?: string;
  userId: string;
  decisionType: 'stayed' | 'left' | 'promoted' | 'pivoted' | 'negotiated' | 'other';
  companyName?: string;
  roleTitle?: string;
  decidedAt: string;     // ISO date string YYYY-MM-DD
  notes?: string;
}

export interface CareerMemorySummary {
  firstAuditDate: string | null;
  latestAuditDate: string | null;
  currentScore: number | null;
  scoreAtFirstAudit: number | null;
  scoreDelta: number | null;          // positive = risk increased, negative = improved
  actionsCompleted: number;
  decisionsRecorded: number;
  daysMonitored: number;
  auditCount: number;
  hasData: boolean;
}

// ─── DB row → domain types ────────────────────────────────────────────────────

function auditRowToEvent(row: Record<string, unknown>): TimelineEvent {
  return {
    id: row.id as string,
    type: 'audit',
    date: (row.calculated_at ?? row.created_at ?? new Date().toISOString()) as string,
    title: `Risk Audit: ${row.company_name ?? 'Unknown company'}`,
    subtitle: row.role_title as string | undefined,
    score: typeof row.score === 'number' ? row.score : undefined,
    metadata: { tier: row.tier, confidence: row.confidence },
  };
}

function actionRowToEvent(row: Record<string, unknown>): TimelineEvent {
  return {
    id: row.id as string,
    type: 'action',
    date: (row.completed_at ?? new Date().toISOString()) as string,
    title: (row.action_text ?? row.action_id ?? 'Action completed') as string,
  };
}

function decisionRowToEvent(row: Record<string, unknown>): TimelineEvent {
  const typeLabels: Record<string, string> = {
    stayed: 'Decided to stay',
    left: 'Left the company',
    promoted: 'Got promoted',
    pivoted: 'Career pivot',
    negotiated: 'Negotiated offer',
    other: 'Career decision',
  };
  return {
    id: row.id as string,
    type: 'decision',
    date: (row.decided_at ?? row.created_at ?? new Date().toISOString()) as string,
    title: typeLabels[row.decision_type as string] ?? 'Career decision',
    subtitle: [row.role_title, row.company_name].filter(Boolean).join(' @ ') || undefined,
    metadata: { notes: row.notes, decisionType: row.decision_type },
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getCareerTimeline(userId: string): Promise<TimelineEvent[]> {
  const [auditRes, actionRes, decisionRes] = await Promise.all([
    supabase
      .from('layoff_scores')
      .select('id, score, company_name, role_title, tier, confidence, calculated_at, created_at')
      .eq('user_id', userId)
      .order('calculated_at', { ascending: false })
      .limit(30),

    supabase
      .from('action_completions')
      .select('id, action_text, completed_at')
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(50),

    supabase
      .from('career_decisions')
      .select('id, decision_type, company_name, role_title, decided_at, notes, created_at')
      .eq('user_id', userId)
      .order('decided_at', { ascending: false })
      .limit(30),
  ]);

  const audits: TimelineEvent[] = ((auditRes.data ?? []) as Record<string, unknown>[]).map(auditRowToEvent);
  const actions: TimelineEvent[] = ((actionRes.data ?? []) as Record<string, unknown>[]).map(actionRowToEvent);
  const decisions: TimelineEvent[] = ((decisionRes.data ?? []) as Record<string, unknown>[]).map(decisionRowToEvent);

  const all = [...audits, ...actions, ...decisions];
  all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return all;
}

export async function getCareerMemorySummary(userId: string): Promise<CareerMemorySummary> {
  const [auditRes, actionRes, decisionRes] = await Promise.all([
    supabase
      .from('layoff_scores')
      .select('score, calculated_at, created_at')
      .eq('user_id', userId)
      .order('calculated_at', { ascending: true }),

    supabase
      .from('action_completions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('completed_at', 'is', null),

    supabase
      .from('career_decisions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
  ]);

  const audits = (auditRes.data ?? []) as Array<{ score: number; calculated_at?: string; created_at?: string }>;
  const actionsCount = actionRes.count ?? 0;
  const decisionsCount = decisionRes.count ?? 0;

  if (audits.length === 0) {
    return {
      firstAuditDate: null,
      latestAuditDate: null,
      currentScore: null,
      scoreAtFirstAudit: null,
      scoreDelta: null,
      actionsCompleted: actionsCount,
      decisionsRecorded: decisionsCount,
      daysMonitored: 0,
      auditCount: 0,
      hasData: false,
    };
  }

  const first = audits[0];
  const last = audits[audits.length - 1];
  const firstDate = first.calculated_at ?? first.created_at ?? '';
  const lastDate = last.calculated_at ?? last.created_at ?? '';
  const daysMonitored = firstDate
    ? Math.max(0, Math.floor((Date.now() - new Date(firstDate).getTime()) / 86_400_000))
    : 0;

  return {
    firstAuditDate: firstDate,
    latestAuditDate: lastDate,
    currentScore: last.score,
    scoreAtFirstAudit: first.score,
    scoreDelta: audits.length > 1 ? Math.round((last.score - first.score) * 10) / 10 : null,
    actionsCompleted: actionsCount,
    decisionsRecorded: decisionsCount,
    daysMonitored,
    auditCount: audits.length,
    hasData: true,
  };
}

export async function recordCareerDecision(decision: CareerDecision): Promise<CareerDecision | null> {
  const row = {
    user_id: decision.userId,
    decision_type: decision.decisionType,
    company_name: decision.companyName ?? null,
    role_title: decision.roleTitle ?? null,
    decided_at: decision.decidedAt,
    notes: decision.notes ?? null,
  };

  const { data, error } = await supabase
    .from('career_decisions')
    .insert(row)
    .select('id, decision_type, company_name, role_title, decided_at, notes')
    .single();

  if (error || !data) return null;
  const d = data as Record<string, unknown>;
  return {
    id: d.id as string,
    userId: decision.userId,
    decisionType: d.decision_type as CareerDecision['decisionType'],
    companyName: d.company_name as string | undefined,
    roleTitle: d.role_title as string | undefined,
    decidedAt: d.decided_at as string,
    notes: d.notes as string | undefined,
  };
}

export async function deleteCareerDecision(id: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('career_decisions')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  return !error;
}
