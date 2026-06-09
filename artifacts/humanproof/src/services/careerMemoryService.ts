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

// ─── Pattern Detection (pure, no I/O) ────────────────────────────────────────

export type PatternType = 'plateau' | 'repeated_inaction' | 'repeated_decision';

export interface PatternDetection {
  patternType: PatternType;
  occurrences: number;
  lastSeen: string;
  whatHappened: string;
  whyItMatters: string;
  consequence: string;
}

export function detectRepeatedPatterns(events: TimelineEvent[]): PatternDetection[] {
  const auditEvents = events
    .filter(e => e.type === 'audit' && typeof e.score === 'number')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (auditEvents.length < 2) return [];

  const patterns: PatternDetection[] = [];
  const sorted = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // 1. Score plateau: 2+ consecutive audits where score diff <= 3 pts
  let maxRun = 1, currentRun = 1, plateauLastSeen = auditEvents[0].date;
  for (let i = 1; i < auditEvents.length; i++) {
    if (Math.abs((auditEvents[i].score ?? 0) - (auditEvents[i - 1].score ?? 0)) <= 3) {
      currentRun++;
      if (currentRun > maxRun) { maxRun = currentRun; plateauLastSeen = auditEvents[i].date; }
    } else {
      currentRun = 1;
    }
  }
  if (maxRun >= 2) {
    patterns.push({
      patternType: 'plateau',
      occurrences: maxRun,
      lastSeen: plateauLastSeen,
      whatHappened: `Risk score barely moved across ${maxRun} consecutive audits`,
      whyItMatters: `Plateaus like this have historically resolved when a new skill or targeted action broke the stagnation`,
      consequence: `Without a deliberate intervention, risk compounds as market conditions shift around a static profile`,
    });
  }

  // 2. Repeated inaction: 2+ high-risk audits (score >= 60) with no action between them
  let highRiskStreak = 0, lastHighRiskDate = '', sawActionSinceHighRisk = false;
  for (const e of sorted) {
    if (e.type === 'audit' && typeof e.score === 'number' && e.score >= 60) {
      if (highRiskStreak > 0 && !sawActionSinceHighRisk) { highRiskStreak++; }
      else { highRiskStreak = 1; sawActionSinceHighRisk = false; }
      lastHighRiskDate = e.date;
    } else if (e.type === 'action' && highRiskStreak > 0) {
      sawActionSinceHighRisk = true;
    }
  }
  if (highRiskStreak >= 2) {
    patterns.push({
      patternType: 'repeated_inaction',
      occurrences: highRiskStreak,
      lastSeen: lastHighRiskDate,
      whatHappened: `Audited at elevated risk (60+) ${highRiskStreak} times without a protective action in between`,
      whyItMatters: `In similar profiles, one targeted action per audit cycle consistently broke this pattern`,
      consequence: `Each high-risk audit without a follow-through action reinforces the pattern and compounds exposure`,
    });
  }

  // 3. Repeated decision: same decision type 3+ times
  const decisionCounts: Record<string, { count: number; lastSeen: string }> = {};
  for (const e of sorted) {
    if (e.type === 'decision') {
      const dt = (e.metadata?.decisionType as string) ?? 'other';
      if (!decisionCounts[dt]) decisionCounts[dt] = { count: 0, lastSeen: '' };
      decisionCounts[dt].count++;
      decisionCounts[dt].lastSeen = e.date;
    }
  }
  for (const [dt, stats] of Object.entries(decisionCounts)) {
    if (stats.count >= 3) {
      patterns.push({
        patternType: 'repeated_decision',
        occurrences: stats.count,
        lastSeen: stats.lastSeen,
        whatHappened: `The "${dt}" decision has been recorded ${stats.count} times`,
        whyItMatters: `Repeated decisions of the same type often signal an unresolved structural constraint — naming it unlocks new options`,
        consequence: `Without acknowledging the pattern, the same decision cycle tends to repeat rather than evolve`,
      });
    }
  }

  return patterns;
}

export function buildCareerArcNarrative(
  summary: CareerMemorySummary,
  patterns: PatternDetection[],
): string {
  if (!summary.hasData || summary.auditCount < 2) return '';
  const deltaStr = summary.scoreDelta != null
    ? summary.scoreDelta > 0 ? `risk has risen ${Math.abs(summary.scoreDelta)} pts`
      : summary.scoreDelta < 0 ? `risk has improved ${Math.abs(summary.scoreDelta)} pts`
      : 'risk has held steady'
    : 'trend is tracked';
  const sentence1 = `Over ${summary.daysMonitored} days of monitoring, your career ${deltaStr}.`;
  const plateau = patterns.find(p => p.patternType === 'plateau');
  const inaction = patterns.find(p => p.patternType === 'repeated_inaction');
  const sentence2 = plateau
    ? `A score plateau has appeared across ${plateau.occurrences} consecutive audits — a targeted action breaks it.`
    : inaction
    ? `You've hit elevated risk without acting ${inaction.occurrences} times — one move per cycle changes this.`
    : summary.actionsCompleted > 0
    ? `${summary.actionsCompleted} completed action${summary.actionsCompleted > 1 ? 's show' : ' shows'} the adaptation loop is working.`
    : '';
  return sentence2 ? `${sentence1} ${sentence2}` : sentence1;
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
  const firstDate = first.calculated_at ?? first.created_at ?? new Date().toISOString();
  const lastDate = last.calculated_at ?? last.created_at ?? new Date().toISOString();
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
