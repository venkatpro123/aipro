// outcomeWeightedLearningStore.ts — WS5
//
// Replaces the legacy swarmLearningStore (Audit Issue #2: trains on
// swarm consensus, not on real-world outcomes — actively suppresses
// heterodox-but-correct agents).
//
// New mechanism:
//
//   1. Each agent's weight = its empirical AUC against
//      user_prediction_outcomes (the outcome ledger now actively
//      populated by WS2 implicit detection + user reports).
//   2. Weights are computed per cohort. A `recentLayoffAgent` may have
//      AUC 0.84 against DISTRESS cohort but 0.51 against EFFICIENCY —
//      weighting it equally everywhere wastes signal.
//   3. The store refreshes weights weekly (gated by minimum sample size
//      per agent/cohort). Until enough outcomes exist for an
//      agent/cohort pair, the bootstrap weight applies (1.0 baseline,
//      or a research-grounded value if declared).
//   4. Below MIN_OUTCOMES_FOR_AUC_LOCK, the store reports the agent as
//      "unscored" — sourceIndependentPanel applies the bootstrap weight
//      and the audit transparency surfaces the calibration uncertainty.
//
// Outcome label mapping:
//   * laid_off / company_closed → positive
//   * still_employed / role_changed / left_voluntarily / false_alarm → negative
//
// AUC method:
//   Each agent emits a continuous signal in [0, 1]. We rank-order agent
//   outputs per cohort and compute the area under ROC against the
//   positive/negative outcome labels. Mann-Whitney U formulation —
//   stable for small n down to ~30 outcomes per cohort.
//
// What this module does NOT do:
//   * It does not change which agents run — that is the orchestrator's
//     job.
//   * It does not collect agent outputs at run time. The
//     `swarm_agent_logs` table is the source-of-truth for agent emissions
//     (existing infra from migration 20260411000001).

import { supabase } from '../../utils/supabase';

// ── Public types ────────────────────────────────────────────────────────────

export type CohortLabel = 'DISTRESS' | 'EFFICIENCY' | 'WAVE' | 'UNKNOWN' | 'GLOBAL';

export interface AgentWeightEntry {
  agentId: string;
  cohort: CohortLabel;
  weight: number;                 // typically AUC ∈ [0, 1]
  auc: number | null;             // raw AUC value; weight may be smoothed
  n: number;                      // number of outcomes used
  isUnscored: boolean;            // true when n < MIN_OUTCOMES_FOR_AUC_LOCK
  lastComputedAt: string;         // ISO timestamp
  source: 'outcome_auc' | 'bootstrap';
}

export interface AgentWeightSnapshot {
  /** Map agentId → CohortLabel → AgentWeightEntry. */
  byAgentByCohort: Map<string, Map<CohortLabel, AgentWeightEntry>>;
  fetchedAt: number;
}

// ── Config ──────────────────────────────────────────────────────────────────

const MIN_OUTCOMES_FOR_AUC_LOCK = 30;
const REFRESH_TTL_MS = 30 * 60 * 1000;          // 30 minutes
const CALIBRATION_WINDOW_DAYS = 365;

// ── Cache ───────────────────────────────────────────────────────────────────

let cachedSnapshot: AgentWeightSnapshot | null = null;
let inflightRefresh: Promise<AgentWeightSnapshot> | null = null;

// ── AUC computation (Mann-Whitney U formulation) ────────────────────────────

interface OutcomePoint {
  agentSignal: number;
  isPositive: boolean;
}

/**
 * AUC = P(agent_signal > | positive) — equivalent to the Wilcoxon-Mann-Whitney
 * statistic. Implementation uses the rank-sum formulation, which is O(n log n)
 * and avoids the O(n²) pairwise comparison.
 */
function computeAUC(points: OutcomePoint[]): number {
  if (points.length === 0) return 0.5;
  const positives = points.filter((p) => p.isPositive).length;
  const negatives = points.length - positives;
  if (positives === 0 || negatives === 0) return 0.5;

  const sorted = [...points].sort((a, b) => a.agentSignal - b.agentSignal);

  // Assign ranks with tie-handling: each tie group gets the mean rank.
  const ranks: number[] = new Array(sorted.length).fill(0);
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1].agentSignal === sorted[i].agentSignal) j++;
    const meanRank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) ranks[k] = meanRank;
    i = j + 1;
  }

  // Sum ranks of positives.
  let rankSumPositives = 0;
  for (let k = 0; k < sorted.length; k++) {
    if (sorted[k].isPositive) rankSumPositives += ranks[k];
  }

  // U statistic for positives: rankSum - positives*(positives+1)/2.
  const u = rankSumPositives - (positives * (positives + 1)) / 2;
  return u / (positives * negatives);
}

// ── Outcome → agent signal join ─────────────────────────────────────────────

interface RawJoin {
  agent_id: string;
  signal: number;
  outcome_reported: string;
  predicted_cohort: string | null;
}

async function fetchAgentSignalsWithOutcomes(): Promise<RawJoin[]> {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - CALIBRATION_WINDOW_DAYS);
  const sinceIso = since.toISOString();

  // Two-step fetch — Supabase JS does not expose a clean join across
  // schemas. We read swarm_agent_logs in the window, then join in
  // memory with user_prediction_outcomes via audit_session_id.

  const [logsRes, outcomesRes] = await Promise.allSettled([
    supabase
      .from('swarm_agent_logs')
      .select('agent_id, signal, audit_session_id')
      .gte('created_at', sinceIso)
      .not('audit_session_id', 'is', null)
      .limit(50_000),
    supabase
      .from('user_prediction_outcomes')
      .select('audit_session_id, outcome_reported, predicted_cohort, detection_confidence, outcome_source')
      .not('outcome_reported', 'is', null)
      .gte('audit_date', sinceIso.slice(0, 10))
      .limit(20_000),
  ]);

  const logs =
    logsRes.status === 'fulfilled' && logsRes.value.data
      ? (logsRes.value.data as Array<{ agent_id: string; signal: number; audit_session_id: string }>)
      : [];
  const outcomes =
    outcomesRes.status === 'fulfilled' && outcomesRes.value.data
      ? (outcomesRes.value.data as Array<{
          audit_session_id: string;
          outcome_reported: string;
          predicted_cohort: string | null;
          detection_confidence: number | null;
          outcome_source: string | null;
        }>)
      : [];

  // Index outcomes by session id with confidence gate.
  const outcomeBySession = new Map<string, { outcome: string; cohort: string | null }>();
  for (const o of outcomes) {
    const conf = o.detection_confidence ?? (o.outcome_source === 'user_reported' ? 1.0 : 0);
    if (conf < 0.75) continue;
    outcomeBySession.set(o.audit_session_id, { outcome: o.outcome_reported, cohort: o.predicted_cohort });
  }

  const joined: RawJoin[] = [];
  for (const l of logs) {
    if (typeof l.signal !== 'number' || !Number.isFinite(l.signal)) continue;
    const o = outcomeBySession.get(l.audit_session_id);
    if (!o) continue;
    joined.push({
      agent_id: l.agent_id,
      signal: l.signal,
      outcome_reported: o.outcome,
      predicted_cohort: o.cohort,
    });
  }
  return joined;
}

// ── Snapshot builder ────────────────────────────────────────────────────────

const POSITIVE_OUTCOMES = new Set(['laid_off', 'company_closed']);

async function buildSnapshot(): Promise<AgentWeightSnapshot> {
  const joined = await fetchAgentSignalsWithOutcomes();
  const byAgentByCohort = new Map<string, Map<CohortLabel, AgentWeightEntry>>();
  const nowIso = new Date().toISOString();

  // Group by (agentId, cohort). GLOBAL always receives every point.
  const buckets = new Map<string, Map<CohortLabel, OutcomePoint[]>>();

  for (const j of joined) {
    const isPositive = POSITIVE_OUTCOMES.has(j.outcome_reported);
    const point: OutcomePoint = { agentSignal: j.signal, isPositive };

    let agentBuckets = buckets.get(j.agent_id);
    if (!agentBuckets) {
      agentBuckets = new Map();
      buckets.set(j.agent_id, agentBuckets);
    }
    const cohort = (j.predicted_cohort as CohortLabel) ?? 'UNKNOWN';
    if (!agentBuckets.has(cohort)) agentBuckets.set(cohort, []);
    if (!agentBuckets.has('GLOBAL')) agentBuckets.set('GLOBAL', []);
    agentBuckets.get(cohort)!.push(point);
    agentBuckets.get('GLOBAL')!.push(point);
  }

  for (const [agentId, cohortMap] of buckets) {
    const out = new Map<CohortLabel, AgentWeightEntry>();
    for (const [cohort, pts] of cohortMap) {
      const n = pts.length;
      if (n < MIN_OUTCOMES_FOR_AUC_LOCK) {
        out.set(cohort, {
          agentId,
          cohort,
          weight: 1.0,
          auc: null,
          n,
          isUnscored: true,
          lastComputedAt: nowIso,
          source: 'bootstrap',
        });
        continue;
      }
      const auc = computeAUC(pts);
      // Weight smoothing: shrink AUC toward 0.5 by 20% when n < 100 to
      // prevent over-confident weight assignment from small samples.
      const shrink = n < 100 ? 0.20 : 0;
      const weight = auc * (1 - shrink) + 0.5 * shrink;
      out.set(cohort, {
        agentId,
        cohort,
        weight: Math.round(weight * 1000) / 1000,
        auc: Math.round(auc * 1000) / 1000,
        n,
        isUnscored: false,
        lastComputedAt: nowIso,
        source: 'outcome_auc',
      });
    }
    byAgentByCohort.set(agentId, out);
  }

  return { byAgentByCohort, fetchedAt: Date.now() };
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Returns the current weight snapshot. Refreshes lazily every 30 min.
 * Returns an empty snapshot if no outcomes exist yet — callers fall
 * back to bootstrap weights (1.0).
 */
export async function getWeightSnapshot(): Promise<AgentWeightSnapshot> {
  const now = Date.now();
  if (cachedSnapshot && now - cachedSnapshot.fetchedAt < REFRESH_TTL_MS) return cachedSnapshot;
  if (inflightRefresh) return inflightRefresh;

  inflightRefresh = buildSnapshot()
    .then((s) => {
      cachedSnapshot = s;
      return s;
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.warn('[outcomeWeightedLearningStore] snapshot build failed, returning empty:', err);
      const empty: AgentWeightSnapshot = { byAgentByCohort: new Map(), fetchedAt: Date.now() };
      cachedSnapshot = empty;
      return empty;
    })
    .finally(() => {
      inflightRefresh = null;
    });
  return inflightRefresh;
}

/**
 * Resolve the agent weight for a given cohort. Falls back to GLOBAL,
 * then 1.0 (bootstrap) if neither is scored.
 */
export function resolveAgentWeight(
  snapshot: AgentWeightSnapshot,
  agentId: string,
  cohort: CohortLabel,
): { weight: number; entry: AgentWeightEntry | null } {
  const agentMap = snapshot.byAgentByCohort.get(agentId);
  if (!agentMap) return { weight: 1.0, entry: null };

  const cohortEntry = agentMap.get(cohort);
  if (cohortEntry && !cohortEntry.isUnscored) return { weight: cohortEntry.weight, entry: cohortEntry };

  const globalEntry = agentMap.get('GLOBAL');
  if (globalEntry && !globalEntry.isUnscored) return { weight: globalEntry.weight, entry: globalEntry };

  return { weight: 1.0, entry: cohortEntry ?? globalEntry ?? null };
}

/**
 * Render a Record<agentId, weight> shape for direct consumption by
 * sourceIndependentPanel.
 */
export async function getAgentWeightsForCohort(cohort: CohortLabel): Promise<Record<string, number>> {
  const snap = await getWeightSnapshot();
  const out: Record<string, number> = {};
  for (const [agentId] of snap.byAgentByCohort) {
    out[agentId] = resolveAgentWeight(snap, agentId, cohort).weight;
  }
  return out;
}

/** Test-only reset hook. */
export function __resetForTesting(): void {
  cachedSnapshot = null;
  inflightRefresh = null;
}
