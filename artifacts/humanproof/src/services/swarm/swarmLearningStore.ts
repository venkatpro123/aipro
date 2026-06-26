// swarmLearningStore.ts
// Foundation for self-improving agent weights.
// localStorage for per-device weights; Supabase for cross-user outcome aggregation.
// Weight update formula: newWeight = oldWeight + (learningRate × accuracyScore)
// Auto-penalty: agents with consistent error > 0.3 get 50% weight reduction.

import { AgentSignal } from './swarmTypes';
import { supabase } from '../../utils/supabase';
import { updateCompanyConfidence } from '../companyIntelligenceService';

const LEARNING_RATE   = 0.01;
const PENALTY_THRESHOLD = 0.3;
const MAX_HISTORY     = 50; // Entries per agent before oldest pruned

export interface AgentRecord {
  agentId:      string;
  signalHistory: { signal: number; swarmScore: number; timestamp: string }[];
  currentWeight: number;        // 0.5–1.5 × baseline (multiplicative)
  errorHistory:  number[];      // recent prediction errors
  totalRuns:     number;
}

export interface PredictionRecord {
  id:          string;
  companyRole: string;           // "meta::software-engineer"
  swarmScore:  number;
  engineScore: number;
  outcome?:    number;           // null until feedback provided
  timestamp:   string;
}

// ── Read / Write Helpers ─────────────────────────────────────────────────────

const getAgentRecord = (agentId: string): AgentRecord => {
  try {
    const raw = localStorage.getItem(`swarm_agent_${agentId}`);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    agentId,
    signalHistory:  [],
    currentWeight:  1.0,
    errorHistory:   [],
    totalRuns:      0,
  };
};

const saveAgentRecord = (record: AgentRecord): void => {
  try {
    localStorage.setItem(`swarm_agent_${record.agentId}`, JSON.stringify(record));
  } catch { /* quota */ }
};

// ── Public API ───────────────────────────────────────────────────────────────

/** Record a signal emission from an agent after a swarm run. */
export const recordAgentSignal = (
  signal: AgentSignal,
  swarmScore: number
): void => {
  const record = getAgentRecord(signal.agentId);

  record.signalHistory.push({
    signal:     signal.signal,
    swarmScore,
    timestamp:  new Date().toISOString(),
  });

  // Keep only recent history
  if (record.signalHistory.length > MAX_HISTORY) {
    record.signalHistory = record.signalHistory.slice(-MAX_HISTORY);
  }

  record.totalRuns++;
  saveAgentRecord(record);
};

/** Record actual outcome for a prediction (called by feedback UI). */
export const recordOutcome = (
  companyRole: string,
  actualOutcome: number  // 0–100, actual risk that materialized
): void => {
  try {
    const key = `swarm_pred_${companyRole}`;
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const pred: PredictionRecord = JSON.parse(raw);
    pred.outcome = actualOutcome;
    localStorage.setItem(key, JSON.stringify(pred));

    // Update local agent weights
    updateWeightsFromOutcome(pred);

    // ── Phase 2: Supabase cross-user outcome persistence ─────────────────────
    const [companyPart] = companyRole.split('::');
    persistOutcomeToSupabase(pred, actualOutcome, companyPart).catch(() => {}); // arch-allow:R2 fire-and-forget cross-user outcome persistence; in-memory state authoritative
  } catch { /* ignore */ }
};

/** Fire-and-forget: write outcome to prediction_outcomes + update company confidence. */
async function persistOutcomeToSupabase(
  pred: PredictionRecord,
  actualOutcome: number,
  companyName: string,
): Promise<void> {
  const accuracy = Math.max(0, 1 - Math.abs(pred.swarmScore - actualOutcome) / 100);
  const { error } = await supabase.from('prediction_outcomes').insert({
    company_role:   pred.companyRole,
    swarm_score:    pred.swarmScore,
    engine_score:   pred.engineScore,
    actual_outcome: actualOutcome,
    accuracy_score: accuracy,
    predicted_at:   pred.timestamp,
    recorded_at:    new Date().toISOString(),
  });
  if (error) {
    console.warn('[SwarmLearning] outcome persist failed:', error.message);
    return;
  }
  // Nudge company confidence score: accurate predictions +0.02, inaccurate -0.05
  const delta = accuracy >= 0.7 ? 0.02 : -0.05;
  await updateCompanyConfidence(companyName, delta).catch(() => {}); // arch-allow:R2 fire-and-forget confidence nudge; failure leaves prior value
}

/** Save a full prediction record (called by swarmOrchestrator). */
export const savePrediction = (
  companyName: string,
  roleTitle:   string,
  swarmScore:  number,
  engineScore: number
): void => {
  try {
    const id          = `${companyName.toLowerCase()}_${roleTitle.toLowerCase()}_${Date.now()}`;
    const companyRole = `${companyName.toLowerCase()}::${roleTitle.toLowerCase()}`;
    const record: PredictionRecord = {
      id,
      companyRole,
      swarmScore,
      engineScore,
      outcome:   undefined,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(`swarm_pred_${companyRole}`, JSON.stringify(record));
  } catch { /* quota */ }
};

/** Get the learned weight multiplier for a specific agent. */
export const getAgentWeightMultiplier = (agentId: string): number => {
  const record = getAgentRecord(agentId);
  return record.currentWeight;
};

// ── Private: Weight Update Logic ─────────────────────────────────────────────

const updateWeightsFromOutcome = (pred: PredictionRecord): void => {
  if (pred.outcome === undefined) return;

  // Retrieve recent signal contributions from agent history
  const agentIds = getAllTrackedAgentIds();
  const predictionError = Math.abs(pred.swarmScore - pred.outcome) / 100;

  for (const agentId of agentIds) {
    const record = getAgentRecord(agentId);

    // Find signals that contributed to this prediction (within 1 hour)
    const predTime     = new Date(pred.timestamp).getTime();
    const relevantRuns = record.signalHistory.filter(h => {
      const diff = Math.abs(new Date(h.timestamp).getTime() - predTime);
      return diff < 3_600_000; // within 1 hour
    });

    if (relevantRuns.length === 0) continue;

    record.errorHistory.push(predictionError);
    if (record.errorHistory.length > 10) {
      record.errorHistory = record.errorHistory.slice(-10);
    }

    const avgError = record.errorHistory.reduce((a, b) => a + b, 0) / record.errorHistory.length;

    if (avgError > PENALTY_THRESHOLD) {
      // Consistent poor performer — penalise weight
      record.currentWeight = Math.max(0.5, record.currentWeight * 0.5);
      if (import.meta.env.DEV) console.log(`[SwarmLearning] Penalising ${agentId} — avgError: ${avgError.toFixed(2)}`);
    } else {
      // Reward accurate agent
      const accuracyScore = Math.max(0, 1 - avgError);
      record.currentWeight = Math.min(1.5, record.currentWeight + LEARNING_RATE * accuracyScore);
    }

    saveAgentRecord(record);
  }
};

const getAllTrackedAgentIds = (): string[] => {
  const ids: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('swarm_agent_')) {
      ids.push(key.replace('swarm_agent_', ''));
    }
  }
  return ids;
};

/** Return a summary of all agent performance for debugging/admin. */
export const getSwarmLearningReport = (): AgentRecord[] => {
  return getAllTrackedAgentIds().map(getAgentRecord);
};
