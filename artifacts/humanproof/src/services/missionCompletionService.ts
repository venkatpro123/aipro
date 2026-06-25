// missionCompletionService.ts — Mission Lifecycle Engine v1.0
//
// PROBLEM: MissionBriefCard was a display-only card. No lifecycle existed —
// missions never transitioned from NEW → ACTIVE → COMPLETED → REPLACED.
// A user who completed all mission actions saw the same brief indefinitely.
//
// SOLUTION: Supabase-backed mission state tracking with localStorage as the
// optimistic layer. Mirrors the architecture of actionCompletionService.ts.
//
// Mission lifecycle:
//   NEW      — not yet acknowledged by the user
//   ACTIVE   — user has opened the brief at least once
//   COMPLETED— all associated actions are marked complete
//   REPLACED — a newer mission superseded this one (score changed tier)
//   ARCHIVED — manually dismissed or > 90 days old

import { supabase } from '../utils/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

export type MissionState = 'new' | 'active' | 'completed' | 'replaced' | 'archived';

export interface MissionRecord {
  missionId: string;       // stable hash of (role + score tier + primary driver)
  state: MissionState;
  createdAt: string;       // ISO
  activatedAt?: string;    // ISO — when user first viewed it
  completedAt?: string;    // ISO — when all actions were done
  replacedAt?: string;     // ISO — when a new mission superseded it
  archivedAt?: string;     // ISO
  score: number;           // score at mission creation
  primaryDriver?: string;  // the dimension key that triggered this mission
}

export interface MissionCompletionState {
  missions: Map<string, MissionRecord>;
  lastSyncedAt: string | null;
  source: 'local' | 'synced';
}

// ── localStorage keys ─────────────────────────────────────────────────────────

const LS_MISSIONS_KEY = 'hp.mission.states';
const LS_MISSIONS_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

// ── ID generation ─────────────────────────────────────────────────────────────

// Derive a stable mission ID from score tier + primary driver.
// Same inputs → same ID, so mission state persists across page reloads
// even before a user has authenticated (localStorage phase).
export function deriveMissionId(score: number, primaryDriver: string, roleKey: string): string {
  const tier = score >= 75 ? 'critical' : score >= 55 ? 'high' : score >= 35 ? 'moderate' : 'low';
  const key = `${tier}:${(primaryDriver ?? 'unknown').toLowerCase()}:${(roleKey ?? '').toLowerCase().slice(0, 24)}`;
  // simple djb2 hash → hex string
  let h = 5381;
  for (let i = 0; i < key.length; i++) h = ((h << 5) + h) ^ key.charCodeAt(i);
  return 'mis_' + (h >>> 0).toString(16).padStart(8, '0');
}

// ── localStorage layer (fast, optimistic) ─────────────────────────────────────

export function loadMissionsLocal(): Map<string, MissionRecord> {
  try {
    const raw = localStorage.getItem(LS_MISSIONS_KEY);
    if (!raw) return new Map();
    const { records, ts } = JSON.parse(raw) as { records: MissionRecord[]; ts: number };
    if (Date.now() - ts > LS_MISSIONS_TTL_MS) {
      localStorage.removeItem(LS_MISSIONS_KEY);
      return new Map();
    }
    return new Map(records.map(r => [r.missionId, r]));
  } catch { return new Map(); }
}

export function saveMissionsLocal(missions: Map<string, MissionRecord>): void {
  try {
    localStorage.setItem(
      LS_MISSIONS_KEY,
      JSON.stringify({ records: Array.from(missions.values()), ts: Date.now() }),
    );
  } catch { /* quota exceeded */ }
}

// ── State transitions ──────────────────────────────────────────────────────────

/**
 * Ensure a mission record exists. Idempotent — safe to call on every dashboard mount.
 * Creates the record in state 'new' if it doesn't exist yet.
 */
export async function ensureMission(
  missionId: string,
  opts: { score: number; primaryDriver?: string; roleKey?: string } = { score: 50 },
): Promise<MissionRecord> {
  const local = loadMissionsLocal();
  if (local.has(missionId)) return local.get(missionId)!;

  const record: MissionRecord = {
    missionId,
    state: 'new',
    createdAt: new Date().toISOString(),
    score: opts.score,
    primaryDriver: opts.primaryDriver,
  };
  local.set(missionId, record);
  saveMissionsLocal(local);

  // Background Supabase write — fire-and-forget
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('user_mission_states').upsert(
        {
          user_id: user.id,
          mission_id: missionId,
          state: record.state,
          created_at: record.createdAt,
          score_at_creation: record.score,
          primary_driver: record.primaryDriver ?? null,
        },
        { onConflict: 'user_id,mission_id' },
      );
    }
  } catch { /* non-fatal */ }

  return record;
}

/**
 * Transition a mission to ACTIVE when the user first views the brief.
 * No-op if already ACTIVE or beyond.
 */
export async function activateMission(missionId: string): Promise<void> {
  const local = loadMissionsLocal();
  const rec = local.get(missionId);
  if (!rec || rec.state !== 'new') return;

  const updated: MissionRecord = { ...rec, state: 'active', activatedAt: new Date().toISOString() };
  local.set(missionId, updated);
  saveMissionsLocal(local);

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('user_mission_states').update({
        state: 'active',
        activated_at: updated.activatedAt,
      }).eq('user_id', user.id).eq('mission_id', missionId);
    }
  } catch { /* non-fatal */ }
}

/**
 * Mark a mission COMPLETED. Called automatically when all associated action IDs
 * have been marked complete via actionCompletionService.
 */
export async function completeMission(missionId: string): Promise<void> {
  const local = loadMissionsLocal();
  const rec = local.get(missionId);
  if (!rec || rec.state === 'completed') return;

  const updated: MissionRecord = { ...rec, state: 'completed', completedAt: new Date().toISOString() };
  local.set(missionId, updated);
  saveMissionsLocal(local);

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('user_mission_states').update({
        state: 'completed',
        completed_at: updated.completedAt,
      }).eq('user_id', user.id).eq('mission_id', missionId);
    }
  } catch { /* non-fatal */ }
}

/**
 * Mark an old mission REPLACED and create the new mission.
 * Called when the score changes tier or primary driver changes significantly.
 */
export async function replaceMission(
  oldMissionId: string,
  newMissionId: string,
  newOpts: { score: number; primaryDriver?: string },
): Promise<MissionRecord> {
  const local = loadMissionsLocal();
  const old = local.get(oldMissionId);

  if (old && old.state !== 'replaced') {
    const updatedOld: MissionRecord = { ...old, state: 'replaced', replacedAt: new Date().toISOString() };
    local.set(oldMissionId, updatedOld);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('user_mission_states').update({
          state: 'replaced',
          replaced_at: updatedOld.replacedAt,
        }).eq('user_id', user.id).eq('mission_id', oldMissionId);
      }
    } catch { /* non-fatal */ }
  }

  saveMissionsLocal(local);
  return ensureMission(newMissionId, newOpts);
}

/**
 * Archive a mission manually (user dismisses it, or it's > 90 days old).
 */
export async function archiveMission(missionId: string): Promise<void> {
  const local = loadMissionsLocal();
  const rec = local.get(missionId);
  if (!rec || rec.state === 'archived') return;

  const updated: MissionRecord = { ...rec, state: 'archived', archivedAt: new Date().toISOString() };
  local.set(missionId, updated);
  saveMissionsLocal(local);

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('user_mission_states').update({
        state: 'archived',
        archived_at: updated.archivedAt,
      }).eq('user_id', user.id).eq('mission_id', missionId);
    }
  } catch { /* non-fatal */ }
}

/**
 * Auto-complete a mission when all its action IDs are done.
 * Called from the Action Plan section after each action completion.
 */
export function autoCompleteMissionIfDone(
  missionId: string,
  missionActionIds: string[],
  completedActionIds: Set<string>,
): void {
  if (missionActionIds.length === 0) return;
  const allDone = missionActionIds.every(id => completedActionIds.has(id));
  if (allDone) completeMission(missionId); // fire-and-forget
}

/**
 * Sync server state down to local. Merges (server wins on conflicts).
 */
export async function syncMissionsFromServer(): Promise<MissionCompletionState> {
  const local = loadMissionsLocal();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { missions: local, lastSyncedAt: null, source: 'local' };

    const { data, error } = await supabase
      .from('user_mission_states')
      .select('*')
      .eq('user_id', user.id);

    if (error || !data) return { missions: local, lastSyncedAt: null, source: 'local' };

    const merged = new Map(local);
    for (const row of data) {
      const existing = merged.get(row.mission_id as string);
      // Server wins for authoritative state transitions
      if (!existing || row.state !== 'new') {
        merged.set(row.mission_id as string, {
          missionId: row.mission_id as string,
          state: row.state as MissionState,
          createdAt: row.created_at as string,
          activatedAt: row.activated_at as string | undefined,
          completedAt: row.completed_at as string | undefined,
          replacedAt: row.replaced_at as string | undefined,
          archivedAt: row.archived_at as string | undefined,
          score: (row.score_at_creation as number) ?? 50,
          primaryDriver: row.primary_driver as string | undefined,
        });
      }
    }

    saveMissionsLocal(merged);
    return { missions: merged, lastSyncedAt: new Date().toISOString(), source: 'synced' };
  } catch {
    return { missions: local, lastSyncedAt: null, source: 'local' };
  }
}

/**
 * Read the current state of a single mission.
 * Returns 'new' when the mission has never been seen.
 */
export function getMissionState(missionId: string): MissionState {
  const local = loadMissionsLocal();
  return local.get(missionId)?.state ?? 'new';
}
