// serverScoreTrajectory.ts — WS7
//
// Server-authoritative replacement for the localStorage-backed score
// history (Audit Issue #13). The legacy scoreStorage path produces
// statistically meaningless trajectory signals because:
//   * History is device-local — switching browser/device wipes it.
//   * Most users have ≤2 entries — too few to distinguish trend from
//     input variance.
//   * Re-running an audit with slightly different inputs creates a fake
//     "downward trend" from input churn.
//
// This module reads/writes the score_trajectory table (created in
// 20260606000001_score_trajectory.sql). The legacy path remains intact
// until the `ws7_server_score_trajectory` flag flips; both paths can run
// in parallel during shadow validation.
//
// Trajectory derivation:
//   * Requires ≥3 audits to report any directional signal. Below 3,
//     callers see TrajectoryStatus.INSUFFICIENT_DATA and should suppress
//     the trajectory UI element.
//   * Direction (improving / stable / worsening) is computed from the
//     OLS slope of the last N scores, with a stability band of ±2 pts
//     to filter input-variance noise.
//   * `inputsSnapshot` is hashed; trajectory is computed ONLY across
//     entries with the same hash. This filters out user-induced churn
//     (changing the role title between audits creates a separate
//     trajectory thread).

import { supabase } from '../utils/supabase';
import { evaluateFlagSync } from '../config/featureFlags';

// ── Types ───────────────────────────────────────────────────────────────────

export type TrajectoryDirection = 'improving' | 'stable' | 'worsening';
export type TrajectoryStatus = TrajectoryDirection | 'insufficient_data';

export interface ScoreEntry {
  score: number;
  tier: string;
  confidencePct: number | null;
  createdAt: string;
  cohort: string | null;
  archetype: string | null;
  engineVersion: string | null;
  inputsHash: string;
}

export interface TrajectoryResult {
  status: TrajectoryStatus;
  /** OLS slope of score over time (pts per audit). Null when insufficient. */
  slopePerAudit: number | null;
  /** Number of entries in the same input-hash thread. */
  threadLength: number;
  /** All entries used for the computation, newest first. */
  entries: ScoreEntry[];
  /** Source label: 'server' | 'legacy_local' | 'unavailable'. */
  source: 'server' | 'legacy_local' | 'unavailable';
}

export interface AppendScoreInput {
  userId: string | null;
  companyCanonicalName: string;
  auditSessionId: string | null;
  score: number;
  tier: string;
  confidencePct: number | null;
  cohort: string | null;
  archetype: string | null;
  engineVersion: string | null;
  /** Identifying audit-input fields. Used to bucket trajectories. */
  inputs: {
    roleTitle: string;
    department: string;
    country: string;
  };
}

// ── Config ──────────────────────────────────────────────────────────────────

const MIN_ENTRIES_FOR_TRAJECTORY = 3;
const TRAJECTORY_LOOKBACK_LIMIT = 10;
const STABILITY_BAND = 2.0;  // |slope| < this → 'stable'

// ── Inputs hash ─────────────────────────────────────────────────────────────

const norm = (s: string): string => (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

async function hashInputs(inputs: AppendScoreInput['inputs']): Promise<string> {
  const payload = [norm(inputs.roleTitle), norm(inputs.department), norm(inputs.country)].join('|');
  const data = new TextEncoder().encode(payload);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 24);  // 96 bits is plenty for bucketing
}

// ── Append ──────────────────────────────────────────────────────────────────

export async function appendScoreEntry(input: AppendScoreInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!input.userId) {
    return { ok: false, error: 'no_user_id; trajectory requires authenticated user' };
  }

  const flag = evaluateFlagSync('ws7_server_score_trajectory');
  if (!flag.isActive && !flag.isShadow) {
    return { ok: false, error: 'ws7_server_score_trajectory off; legacy localStorage path applies' };
  }

  const inputsHash = await hashInputs(input.inputs);

  const { data, error } = await supabase
    .from('score_trajectory')
    .insert({
      user_id: input.userId,
      company_canonical_name: input.companyCanonicalName,
      audit_session_id: input.auditSessionId,
      score: input.score,
      tier: input.tier,
      confidence_pct: input.confidencePct,
      cohort: input.cohort,
      archetype: input.archetype,
      engine_version: input.engineVersion,
      inputs_snapshot: {
        role_title: input.inputs.roleTitle,
        department: input.inputs.department,
        country: input.inputs.country,
        hash: inputsHash,
      },
    })
    .select('id')
    .maybeSingle();

  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[serverScoreTrajectory] append failed:', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true, id: (data as { id?: string } | null)?.id };
}

// ── Read trajectory ─────────────────────────────────────────────────────────

interface TrajectoryRow {
  id: string;
  score: number;
  tier: string;
  confidence_pct: number | null;
  created_at: string;
  cohort: string | null;
  archetype: string | null;
  engine_version: string | null;
  inputs_snapshot: { hash?: string } | null;
}

function computeOLSlope(scores: number[]): number {
  const n = scores.length;
  if (n < 2) return 0;
  // x = audit index (0..n-1). y = score. OLS slope:
  //   slope = sum((x_i - x_bar)(y_i - y_bar)) / sum((x_i - x_bar)^2)
  const xBar = (n - 1) / 2;
  const yBar = scores.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xBar) * (scores[i] - yBar);
    den += (i - xBar) * (i - xBar);
  }
  return den === 0 ? 0 : num / den;
}

export async function readTrajectory(
  userId: string | null,
  companyCanonicalName: string,
  currentInputs: AppendScoreInput['inputs'],
): Promise<TrajectoryResult> {
  if (!userId) {
    return { status: 'insufficient_data', slopePerAudit: null, threadLength: 0, entries: [], source: 'unavailable' };
  }
  const flag = evaluateFlagSync('ws7_server_score_trajectory');
  if (!flag.isActive && !flag.isShadow) {
    return { status: 'insufficient_data', slopePerAudit: null, threadLength: 0, entries: [], source: 'legacy_local' };
  }

  const currentHash = await hashInputs(currentInputs);

  const { data, error } = await supabase
    .from('score_trajectory')
    .select('id,score,tier,confidence_pct,created_at,cohort,archetype,engine_version,inputs_snapshot')
    .eq('user_id', userId)
    .eq('company_canonical_name', companyCanonicalName)
    .order('created_at', { ascending: false })
    .limit(TRAJECTORY_LOOKBACK_LIMIT * 3);  // over-fetch; filter by hash next

  if (error) {
    return { status: 'insufficient_data', slopePerAudit: null, threadLength: 0, entries: [], source: 'unavailable' };
  }

  const rows = (data ?? []) as TrajectoryRow[];
  // Filter to the same input-hash thread to avoid mixing role-change churn
  // into the trend.
  const thread = rows.filter((r) => (r.inputs_snapshot?.hash ?? '') === currentHash).slice(0, TRAJECTORY_LOOKBACK_LIMIT);

  const entries: ScoreEntry[] = thread.map((r) => ({
    score: r.score,
    tier: r.tier,
    confidencePct: r.confidence_pct,
    createdAt: r.created_at,
    cohort: r.cohort,
    archetype: r.archetype,
    engineVersion: r.engine_version,
    inputsHash: r.inputs_snapshot?.hash ?? '',
  }));

  if (entries.length < MIN_ENTRIES_FOR_TRAJECTORY) {
    return {
      status: 'insufficient_data',
      slopePerAudit: null,
      threadLength: entries.length,
      entries,
      source: 'server',
    };
  }

  // OLS slope on scores in chronological order (oldest first).
  const chronological = [...entries].reverse();
  const slope = computeOLSlope(chronological.map((e) => e.score));

  let status: TrajectoryStatus;
  if (Math.abs(slope) < STABILITY_BAND) status = 'stable';
  else if (slope > 0) status = 'worsening';     // score going UP = risk going UP
  else status = 'improving';

  return {
    status,
    slopePerAudit: Math.round(slope * 100) / 100,
    threadLength: entries.length,
    entries,
    source: 'server',
  };
}
