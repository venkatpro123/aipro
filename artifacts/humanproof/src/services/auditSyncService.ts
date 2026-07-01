// auditSyncService.ts
// Primary Supabase sync layer for all audit data.
// Supabase is the source of truth; localStorage/IndexedDB are offline caches.
//
// Public API:
//   saveAuditSession()     — persist a full HybridResult audit to Supabase
//   loadAuditSessions()    — fetch user's audit history from Supabase
//   syncSingleScoreEntry() — write one ScoreEntry to score_history
//   loadScoreHistory()     — fetch score history from Supabase
//   saveUserAuditData()    — upsert skill/quiz/flag data for the user
//   loadUserAuditData()    — fetch user audit preferences from Supabase
//   flushPendingOps()      — drain offline queue after sign-in / reconnect

import { supabase } from '../utils/supabase';
import type { HybridResult } from '../types/hybridResult';
import type { ScoreEntry } from '../utils/scoreStorage';
import type { ScoreHistoryEntry } from './scoreStorageService';
import type { ScoreBreakdown } from './layoffScoreEngine';

// ── Offline pending queue ─────────────────────────────────────────────────────

const PENDING_KEY = 'hp_pending_sync';
const MAX_RETRIES = 3;

type PendingOpType = 'audit_session' | 'score_entry' | 'user_audit_data';

interface PendingOp {
  id: string;
  type: PendingOpType;
  data: Record<string, unknown>;
  timestamp: number;
  retries: number;
}

function getPendingOps(): PendingOp[] {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as PendingOp[]) : [];
  } catch {
    return [];
  }
}

function savePendingOps(ops: PendingOp[]): void {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(ops));
  } catch { /* quota — best effort */ }
}

function enqueuePendingOp(type: PendingOpType, data: Record<string, unknown>, dedupeKey?: string): void {
  const ops = getPendingOps();
  const filtered = dedupeKey
    ? ops.filter(op => !(op.type === type && String(op.data[dedupeKey]) === String(data[dedupeKey])))
    : ops;
  filtered.push({ id: crypto.randomUUID(), type, data, timestamp: Date.now(), retries: 0 });
  savePendingOps(filtered);
}

// ── Session helper ────────────────────────────────────────────────────────────

async function getUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

// ── Audit Sessions ────────────────────────────────────────────────────────────

export interface AuditSessionInput {
  companyName: string;
  roleTitle: string;
  department: string;
  oracleKey?: string | null;
  industryKey?: string | null;
  workTypeKey?: string | null;
  countryKey?: string | null;
  hybridResult: HybridResult;
  dataQuality?: 'live' | 'partial' | 'fallback';
  /** crypto.randomUUID() minted at calculation start — prevents duplicate rows on retry. */
  clientId: string;
}

function buildAuditSessionPayload(input: AuditSessionInput): Record<string, unknown> {
  const hr = input.hybridResult;
  return {
    company_name:    input.companyName,
    role_title:      input.roleTitle,
    department:      input.department,
    oracle_key:      input.oracleKey   ?? null,
    industry_key:    input.industryKey ?? null,
    work_type_key:   input.workTypeKey ?? null,
    country_key:     input.countryKey  ?? null,
    score:           hr.total          ?? 0,
    source:          'job' as const,
    tier_label:      hr.tier?.label    ?? null,
    tier_color:      hr.tier?.color    ?? null,
    confidence:      hr.confidence     ?? null,
    reasoning:       hr.reasoning      ?? null,
    recommendations: (hr.recommendations ?? []) as unknown,
    hybrid_result:   hr as unknown,
    data_quality:    input.dataQuality ?? 'live',
    data_version:    '2026-Q2',
    app_version:     '3.0',
    client_id:       input.clientId,
  };
}

/**
 * Persist a completed audit to Supabase.
 * If the user is unauthenticated or offline, the operation is queued and
 * replayed automatically when flushPendingOps() is called (e.g. on sign-in).
 * Returns the new row's UUID, or null when queued/failed.
 */
export async function saveAuditSession(input: AuditSessionInput): Promise<string | null> {
  const userId = await getUserId();
  const payload = buildAuditSessionPayload(input);

  if (!userId) {
    enqueuePendingOp('audit_session', payload, 'client_id');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('audit_sessions')
      .upsert(
        { ...payload, user_id: userId },
        { onConflict: 'user_id,client_id', ignoreDuplicates: false },
      )
      .select('id')
      .single();

    if (error) {
      enqueuePendingOp('audit_session', payload, 'client_id');
      return null;
    }
    return (data as { id: string }).id;
  } catch {
    enqueuePendingOp('audit_session', payload, 'client_id');
    return null;
  }
}

/**
 * Load the user's full audit history from Supabase, mapped to ScoreHistoryEntry
 * for backward-compatible consumption by LayoffScoreHistory and LayoffContext.
 */
export async function loadAuditSessions(limit = 50): Promise<ScoreHistoryEntry[]> {
  const userId = await getUserId();
  if (!userId) return [];

  try {
    const { data, error } = await supabase
      .from('audit_sessions')
      .select('id, score, tier_label, tier_color, company_name, role_title, department, confidence, created_at, data_quality, hybrid_result')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map((row: Record<string, unknown>) => ({
      id:          String(row.id),
      score:       Number(row.score),
      tier:        String(row.tier_label ?? ''),
      tierColor:   String(row.tier_color ?? ''),
      companyName: String(row.company_name),
      roleTitle:   String(row.role_title),
      department:  String(row.department ?? ''),
      breakdown:   ((row.hybrid_result as HybridResult)?.breakdown ?? {}) as ScoreBreakdown,
      confidence:  String(row.confidence ?? ''),
      timestamp:   String(row.created_at),
      dataQuality: (row.data_quality as 'live' | 'partial' | 'fallback') ?? 'live',
    }));
  } catch {
    return [];
  }
}

// ── Score History ─────────────────────────────────────────────────────────────

const SCORE_SYNC_TS_KEY = 'hp_score_sync_ts';

/** Insert a single new ScoreEntry into Supabase score_history. Fire-and-forget. */
export async function syncSingleScoreEntry(entry: ScoreEntry): Promise<void> {
  const userId = await getUserId();

  const row = {
    source:       entry.source,
    score:        Math.round(entry.score),
    plot_score:   Math.round(entry.plotScore),
    data_version: entry.dataVersion ?? '2026-Q2',
    app_version:  entry.appVersion  ?? '3.0',
    created_at:   new Date(entry.timestamp).toISOString(),
  };

  if (!userId) {
    enqueuePendingOp('score_entry', row as unknown as Record<string, unknown>);
    return;
  }

  try {
    await supabase.from('score_history').insert({ ...row, user_id: userId });
    localStorage.setItem(SCORE_SYNC_TS_KEY, String(entry.timestamp));
  } catch { /* non-fatal */ }
}

/**
 * Load score history from Supabase, merged with localStorage entries newer
 * than the last successful sync timestamp, deduped by timestamp.
 */
export async function loadScoreHistory(): Promise<ScoreEntry[]> {
  const userId = await getUserId();
  if (!userId) return [];

  try {
    const { data, error } = await supabase
      .from('score_history')
      .select('source, score, plot_score, data_version, app_version, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error || !data) return [];

    return data.map((row: Record<string, unknown>) => ({
      score:       Number(row.score),
      plotScore:   Number(row.plot_score),
      source:      row.source as 'job' | 'skill' | 'human-index',
      timestamp:   new Date(String(row.created_at)).getTime(),
      dataVersion: String(row.data_version ?? '2026-Q2'),
      appVersion:  String(row.app_version  ?? '3.0'),
    }));
  } catch {
    return [];
  }
}

// ── User Audit Data ───────────────────────────────────────────────────────────

export interface UserAuditData {
  skillSelections:  unknown[];
  skillBreakdown:   unknown[];
  skillIntents:     Record<string, 'protect' | 'pivot'>;
  quizAnswers:      Record<number, number>;
  completionFlags:  { job: boolean; skill: boolean; hii: boolean };
  roadmapStartDate: string | null;
  scoreGoal:        unknown | null;
}

function toSnakeCase(patch: Partial<UserAuditData>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (patch.skillSelections  !== undefined) row.skill_selections   = patch.skillSelections;
  if (patch.skillBreakdown   !== undefined) row.skill_breakdown    = patch.skillBreakdown;
  if (patch.skillIntents     !== undefined) row.skill_intents      = patch.skillIntents;
  if (patch.quizAnswers      !== undefined) row.quiz_answers       = patch.quizAnswers;
  if (patch.completionFlags  !== undefined) row.completion_flags   = patch.completionFlags;
  if (patch.roadmapStartDate !== undefined) row.roadmap_start_date = patch.roadmapStartDate;
  if (patch.scoreGoal        !== undefined) row.score_goal         = patch.scoreGoal;
  return row;
}

/** Upsert user audit preferences to Supabase. Queued when offline. */
export async function saveUserAuditData(patch: Partial<UserAuditData>): Promise<void> {
  const userId = await getUserId();
  const row = toSnakeCase(patch);

  if (!userId) {
    enqueuePendingOp('user_audit_data', row);
    return;
  }

  try {
    await supabase
      .from('user_audit_data')
      .upsert({ ...row, user_id: userId }, { onConflict: 'user_id' });
  } catch {
    enqueuePendingOp('user_audit_data', row);
  }
}

/** Load user audit preferences from Supabase. Returns null when not authenticated. */
export async function loadUserAuditData(): Promise<UserAuditData | null> {
  const userId = await getUserId();
  if (!userId) return null;

  try {
    const { data, error } = await supabase
      .from('user_audit_data')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return null;

    const d = data as Record<string, unknown>;
    return {
      skillSelections:  (d.skill_selections  as unknown[]) ?? [],
      skillBreakdown:   (d.skill_breakdown   as unknown[]) ?? [],
      skillIntents:     (d.skill_intents     as Record<string, 'protect' | 'pivot'>) ?? {},
      quizAnswers:      (d.quiz_answers      as Record<number, number>) ?? {},
      completionFlags:  (d.completion_flags  as { job: boolean; skill: boolean; hii: boolean }) ?? { job: false, skill: false, hii: false },
      roadmapStartDate: (d.roadmap_start_date as string | null) ?? null,
      scoreGoal:        d.score_goal ?? null,
    };
  } catch {
    return null;
  }
}

// ── Offline queue flush ───────────────────────────────────────────────────────

/**
 * Replay all pending offline operations against Supabase.
 * Called on SIGNED_IN auth event and on reconnect.
 * Operations that fail after MAX_RETRIES are dropped.
 */
export async function flushPendingOps(): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;

  const ops = getPendingOps();
  if (!ops.length) return;

  const remaining: PendingOp[] = [];

  for (const op of ops) {
    let ok = false;
    try {
      if (op.type === 'audit_session') {
        const { error } = await supabase
          .from('audit_sessions')
          .upsert(
            { ...op.data, user_id: userId },
            { onConflict: 'user_id,client_id', ignoreDuplicates: false },
          );
        ok = !error;
      } else if (op.type === 'score_entry') {
        const { error } = await supabase
          .from('score_history')
          .insert({ ...op.data, user_id: userId });
        ok = !error;
      } else if (op.type === 'user_audit_data') {
        const { error } = await supabase
          .from('user_audit_data')
          .upsert({ ...op.data, user_id: userId }, { onConflict: 'user_id' });
        ok = !error;
      }
    } catch { /* network — keep in queue */ }

    if (!ok && op.retries < MAX_RETRIES) {
      remaining.push({ ...op, retries: op.retries + 1 });
    }
    // ops exceeding MAX_RETRIES are silently dropped
  }

  savePendingOps(remaining);
}
