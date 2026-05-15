// sourceIndependentPanel.ts — WS5
//
// Replaces the implicit "every agent counts equally" aggregation in the
// 30-agent swarm (Audit Issue #1: swarm pseudo-independence).
//
// The legacy aggregator treats each agent as an independent voice. In
// reality 6 of the 8 market-signal agents read the same `companyData`
// shape, all derived from the same upstream Yahoo Finance / Alpha Vantage
// fetch. When that source is fresh, all 6 agents agree → the aggregator
// reports high confidence. When the source is bot-blocked, all 6 fail
// together → the aggregator drops confidence to floor. Independence
// (the assumption underpinning ensemble methods) does not hold.
//
// This module corrects the aggregation by requiring every agent to declare:
//   * sourceClass: the SourceTier its primary evidence comes from
//   * dataReadsFrom: the named feeds it consumes (e.g. ['yahoo-finance', 'industryRiskData'])
//
// At aggregation time we compute the EFFECTIVE sample size:
//
//   n_eff = (Σ w_i)² / Σ (w_i²)
//
// where w_i are the agent weights. This is the standard Kish formula for
// design effect; for fully-independent equal-weight signals n_eff = N,
// for highly-correlated signals n_eff approaches 1.
//
// We then DOWN-WEIGHT correlated agent clusters by their cluster size
// before averaging. Agents sharing a data source contribute fractionally:
// k agents on the same source contribute as a single signal with weight 1/k.
//
// AUC-based agent weights:
//   Each agent's weight is its empirical AUC against outcomes (from the
//   outcomeWeightedLearningStore in the next WS5 step). Until that store
//   is populated, all agents start at weight 1.0 (legacy behaviour).
//
// What this module does NOT do:
//   * It does not run the agents. Callers pass in the AgentSignal array
//     produced by the existing orchestrator.
//   * It does not rewrite the agents themselves. Each agent registers its
//     `sourceClass` and `dataReadsFrom` via a side-channel
//     (registerAgentMetadata) so the existing agent modules stay
//     unchanged.

import type { AgentSignal } from './swarmTypes';
import type { SourceTier } from '../evidenceHierarchy';

// ── Agent metadata registry ─────────────────────────────────────────────────

export interface AgentMetadata {
  agentId: string;
  sourceClass: SourceTier;
  /** Named feeds this agent reads (for n_eff correlation grouping). */
  dataReadsFrom: string[];
  /** Optional bootstrap weight (used until outcome-derived weights exist). */
  bootstrapWeight?: number;
}

const META: Map<string, AgentMetadata> = new Map();

/**
 * Register an agent's source provenance. Called once per agent at module
 * load (typically inside the agent's own file). When WS5 ships, the CI
 * lint check enforces that every agent in the registry has called this.
 */
export function registerAgentMetadata(meta: AgentMetadata): void {
  META.set(meta.agentId, meta);
}

export function getAgentMetadata(agentId: string): AgentMetadata | undefined {
  return META.get(agentId);
}

export function listRegisteredAgents(): string[] {
  return Array.from(META.keys());
}

// ── Aggregation types ───────────────────────────────────────────────────────

export interface SourceIndependentPanelInput {
  signals: ReadonlyArray<AgentSignal>;
  /** Agent weights — typically AUC-from-outcomes; defaults to 1.0 if absent. */
  agentWeights?: Record<string, number>;
}

export interface SourceClusterReport {
  /** Source key (e.g. 'yahoo-finance', 'industryRiskData'). */
  source: string;
  agentIds: string[];
  /** Mean signal across the cluster (post-normalization). */
  clusterMean: number;
  /** Total raw agent weight in the cluster. */
  rawWeight: number;
  /** Adjusted weight applied at aggregation (clusterWeight = rawWeight/size). */
  effectiveWeight: number;
}

export interface SourceIndependentPanelResult {
  /** Effective sample size after correlation correction. */
  nEff: number;
  /** Number of unique source clusters that produced signal. */
  uniqueClusters: number;
  /** Mean signal, weighted by effective (source-deduplicated) weights. */
  consensusSignal: number;
  /** Standard error of the weighted mean using n_eff. */
  consensusStdError: number;
  /** Per-cluster breakdown. */
  clusters: SourceClusterReport[];
  /** True when n_eff is too low to claim ensemble support. */
  isCorrelatedEnsemble: boolean;
  /** Agents with no registered metadata — treated as their own clusters. */
  unregisteredAgents: string[];
}

// ── Core ────────────────────────────────────────────────────────────────────

const N_EFF_FLOOR_FOR_ENSEMBLE = 3.5;

/**
 * Aggregate agent signals with source-class deduplication.
 *
 * Algorithm:
 *   1. For each agent, look up its metadata; if missing, treat the
 *      agent as its own singleton source ("unregistered_<agentId>").
 *   2. Group agents by their PRIMARY data source (dataReadsFrom[0]).
 *      Agents reading from multiple feeds are assigned to their first-
 *      declared source — this is intentionally simple; finer dependency
 *      tracking is future work.
 *   3. Within each cluster, compute the mean signal (uniform weighting
 *      across agents in the cluster).
 *   4. Compute effective per-cluster weight = totalClusterRawWeight / clusterSize.
 *      (k agents on one source = 1 effective signal.)
 *   5. Weighted-average across clusters using effective weights → consensus.
 *   6. Compute n_eff = (Σw_eff)² / Σ(w_eff²).
 */
export function computeSourceIndependentPanel(input: SourceIndependentPanelInput): SourceIndependentPanelResult {
  const { signals, agentWeights } = input;

  // Group agents by primary source.
  const clusters: Map<string, { agentIds: string[]; signals: number[]; rawWeight: number }> = new Map();
  const unregistered: string[] = [];

  for (const sig of signals) {
    const meta = META.get(sig.agentId);
    const primarySource = meta?.dataReadsFrom?.[0] ?? `unregistered_${sig.agentId}`;
    if (!meta) unregistered.push(sig.agentId);

    const weight = agentWeights?.[sig.agentId] ?? meta?.bootstrapWeight ?? 1.0;
    const value = typeof sig.signal === 'number' ? sig.signal : 0;

    let entry = clusters.get(primarySource);
    if (!entry) {
      entry = { agentIds: [], signals: [], rawWeight: 0 };
      clusters.set(primarySource, entry);
    }
    entry.agentIds.push(sig.agentId);
    entry.signals.push(value);
    entry.rawWeight += weight;
  }

  // Build per-cluster reports.
  const clusterReports: SourceClusterReport[] = [];
  let totalEffectiveWeight = 0;
  let weightedSum = 0;
  let sumWeightSquared = 0;

  for (const [source, entry] of clusters) {
    const clusterMean = entry.signals.reduce((a, b) => a + b, 0) / entry.signals.length;
    const effectiveWeight = entry.rawWeight / entry.agentIds.length;
    clusterReports.push({
      source,
      agentIds: entry.agentIds,
      clusterMean,
      rawWeight: entry.rawWeight,
      effectiveWeight,
    });
    totalEffectiveWeight += effectiveWeight;
    weightedSum += clusterMean * effectiveWeight;
    sumWeightSquared += effectiveWeight * effectiveWeight;
  }

  const consensusSignal = totalEffectiveWeight > 0 ? weightedSum / totalEffectiveWeight : 0;
  const nEff = sumWeightSquared > 0 ? (totalEffectiveWeight * totalEffectiveWeight) / sumWeightSquared : 0;

  // Standard error of weighted mean: sqrt(variance / n_eff).
  // Variance across clusters around the consensus.
  let variance = 0;
  for (const c of clusterReports) {
    variance += c.effectiveWeight * Math.pow(c.clusterMean - consensusSignal, 2);
  }
  variance = totalEffectiveWeight > 0 ? variance / totalEffectiveWeight : 0;
  const consensusStdError = nEff > 0 ? Math.sqrt(variance / nEff) : 0;

  return {
    nEff: Math.round(nEff * 100) / 100,
    uniqueClusters: clusterReports.length,
    consensusSignal: Math.round(consensusSignal * 1000) / 1000,
    consensusStdError: Math.round(consensusStdError * 1000) / 1000,
    clusters: clusterReports.sort((a, b) => b.effectiveWeight - a.effectiveWeight),
    isCorrelatedEnsemble: nEff < N_EFF_FLOOR_FOR_ENSEMBLE,
    unregisteredAgents: unregistered,
  };
}

// ── Bootstrap registrations ─────────────────────────────────────────────────
//
// Pre-populate the agent metadata for known agents so the system has a
// sensible n_eff calculation BEFORE every agent module is updated to
// self-register. As agents migrate to call registerAgentMetadata() from
// their own files, these entries are overwritten (last writer wins).
//
// Source assignments follow the audit's observation that 6+ market-signal
// agents share the Yahoo Finance + Alpha Vantage company-data fetch.

const BOOTSTRAP_AGENTS: AgentMetadata[] = [
  // Market signals — most share company financial data
  { agentId: 'stockVolatility',     sourceClass: 'OFFICIAL_FILING', dataReadsFrom: ['yahoo-finance', 'companyData'] },
  { agentId: 'revenueGrowth',       sourceClass: 'OFFICIAL_FILING', dataReadsFrom: ['yahoo-finance', 'companyData'] },
  { agentId: 'marketCapDrop',       sourceClass: 'OFFICIAL_FILING', dataReadsFrom: ['yahoo-finance', 'companyData'] },
  { agentId: 'pipr',                sourceClass: 'OFFICIAL_FILING', dataReadsFrom: ['yahoo-finance', 'companyData'] },
  { agentId: 'layoffVelocity',      sourceClass: 'AGGREGATED_DATA', dataReadsFrom: ['layoffNewsCache'] },
  { agentId: 'fundingDryup',        sourceClass: 'AGGREGATED_DATA', dataReadsFrom: ['companyData', 'crunchbase'] },
  { agentId: 'overstaffingRatio',   sourceClass: 'OFFICIAL_FILING', dataReadsFrom: ['companyData', 'industryRiskData'] },
  { agentId: 'debtToEquity',        sourceClass: 'OFFICIAL_FILING', dataReadsFrom: ['yahoo-finance', 'companyData'] },

  // Company signals
  { agentId: 'recentLayoff',        sourceClass: 'MAJOR_PRESS',     dataReadsFrom: ['layoffNewsCache', 'breakingNewsEvents'] },
  { agentId: 'costCutting',         sourceClass: 'MAJOR_PRESS',     dataReadsFrom: ['secEdgar', 'companyData'] },
  { agentId: 'departmentRisk',      sourceClass: 'MAJOR_PRESS',     dataReadsFrom: ['layoffNewsCache', 'companyData'] },
  { agentId: 'leadershipChurn',     sourceClass: 'OFFICIAL_FILING', dataReadsFrom: ['companyData', 'executiveData'] },
  { agentId: 'offshoreRisk',        sourceClass: 'AGGREGATED_DATA', dataReadsFrom: ['companyData', 'industryRiskData'] },
  { agentId: 'tenureRisk',          sourceClass: 'AGGREGATED_DATA', dataReadsFrom: ['userFactors'] },
  { agentId: 'performance',         sourceClass: 'AGGREGATED_DATA', dataReadsFrom: ['userFactors'] },
  { agentId: 'proRelationship',     sourceClass: 'AGGREGATED_DATA', dataReadsFrom: ['glassdoor'] },

  // AI signals — most read role exposure data (heavily correlated)
  { agentId: 'roleDisplacement',    sourceClass: 'AGGREGATED_DATA', dataReadsFrom: ['roleExposureData', 'careerIntelligence'] },
  { agentId: 'aiToolMaturity',      sourceClass: 'AGGREGATED_DATA', dataReadsFrom: ['roleExposureData'] },
  { agentId: 'augmentationOpportunity', sourceClass: 'AGGREGATED_DATA', dataReadsFrom: ['roleExposureData'] },
  { agentId: 'industryAiAdoption',  sourceClass: 'AGGREGATED_DATA', dataReadsFrom: ['industryRiskData'] },
  { agentId: 'skillDecay',          sourceClass: 'AGGREGATED_DATA', dataReadsFrom: ['skillsData', 'roleExposureData'] },

  // External signals
  { agentId: 'macroRecession',      sourceClass: 'AGGREGATED_DATA', dataReadsFrom: ['blsMacroService', 'macroSnapshot'] },
  { agentId: 'laborMarketTight',    sourceClass: 'AGGREGATED_DATA', dataReadsFrom: ['blsMacroService'] },
  { agentId: 'sectorContagion',     sourceClass: 'AGGREGATED_DATA', dataReadsFrom: ['companyPeers', 'layoffNewsCache'] },
  { agentId: 'geoPoliticalRisk',    sourceClass: 'AGGREGATED_DATA', dataReadsFrom: ['countryRiskProfile'] },
  { agentId: 'regulatoryRisk',      sourceClass: 'AGGREGATED_DATA', dataReadsFrom: ['industryRiskData'] },
  { agentId: 'peerCompany',         sourceClass: 'AGGREGATED_DATA', dataReadsFrom: ['companyPeers'] },
];

for (const m of BOOTSTRAP_AGENTS) registerAgentMetadata(m);

/** Test-only reset hook for the registry. */
export function __resetRegistryForTesting(): void {
  META.clear();
  for (const m of BOOTSTRAP_AGENTS) registerAgentMetadata(m);
}
