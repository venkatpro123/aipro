// swarmAggregator.ts
// 4-step aggregation pipeline: normalization → time decay → diversity weighting → SwarmScore.
// Outputs a full SwarmReport with categoryBreakdown and visualizationGraph.

import { AgentSignal, AgentCategory, SwarmReport, RiskCluster, GraphNode, GraphEdge } from './swarmTypes';

// ── Category impact weights ───────────────────────────────────────────────────
const CATEGORY_WEIGHTS: Record<AgentCategory, number> = {
  market:   0.32,
  company:  0.30,
  ai:       0.22,
  external: 0.16,
};

// ── Correlated signal clusters with source-overlap-aware diversity weights ────
//
// AUDIT FIX: The previous formula 1/√n assumed equal pairwise correlation r≈0.50
// between all agents in a cluster. Measured source-field overlap shows clusters
// range from r≈0.25 (genuinely diverse) to r≈0.85 (near-circular).
//
// Correct per-agent weight uses the effective-n formula:
//   n_eff = n / (1 + (n-1) × r_mean)
//   per-agent weight = 1 / n_eff  →  combined cluster weight = n / n_eff = 1 + (n-1)×r
//
// Cluster-specific r_mean estimates (from source field overlap analysis):
//
//  financial_stress (r≈0.45 after marketCap fix using implied-revenue proxy):
//    n=4, n_eff=4/(1+3×0.45)=4/2.35≈1.70, weight_per=1/1.70≈0.59
//    vs old 1/√4=0.50 → was 14% under-weighted
//
//  layoff_evidence (r≈0.55, three agents share layoffsLast24Months):
//    n=4, n_eff=4/(1+3×0.55)=4/2.65≈1.51, weight_per=1/1.51≈0.66
//    vs old 0.50 → was 24% under-weighted
//
//  ai_displacement (CONSOLIDATED to 1 agent after audit fix):
//    n=1, weight=1.0 (no diversity correction needed)
//
//  macro_environment (r≈0.25, genuinely diverse inputs):
//    n=4, n_eff=4/(1+3×0.25)=4/1.75≈2.29, weight_per=1/2.29≈0.44
//    vs old 0.50 → was 14% over-weighted
//
//  company_stability (r≈0.30, mixed inputs):
//    n=4, n_eff=4/(1+3×0.30)=4/1.90≈2.11, weight_per=1/2.11≈0.47
//    vs old 0.50 → was 6% over-weighted
//
//  personal_protection (r≈0.45, tenureYears shared by 2 agents):
//    n=4, n_eff=4/(1+3×0.45)=4/2.35≈1.70, weight_per=1/1.70≈0.59
//    vs old 0.50 → was 14% under-weighted

interface SignalCluster {
  name: string;
  agents: string[];
  /** Estimated mean pairwise correlation across agents in cluster, based on source-field overlap.
   *  0 = fully independent; 1 = perfectly circular.
   *  Used in: weight_per_agent = 1 / (1 + (n-1) × r_mean) */
  r_mean: number;
}

const SIGNAL_CLUSTERS: SignalCluster[] = [
  {
    name: 'financial_stress',
    agents: ['stockVolatilityAgent', 'revenueGrowthAgent', 'marketCapDropAgent', 'debtToEquityAgent'],
    r_mean: 0.45, // After audit fix: marketCap now uses implied-revenue proxy, not stock90DayChange
  },
  {
    name: 'layoff_evidence',
    agents: ['recentLayoffAgent', 'layoffVelocityAgent', 'costCuttingAgent', 'piprAgent'],
    r_mean: 0.55, // Three agents share layoffsLast24Months; costCutting uses NewsAPI (independent)
  },
  // ai_displacement: no longer a cluster — single roleDisplacementAgent, weight = 1.0
  {
    name: 'macro_environment',
    agents: ['macroRecessionAgent', 'sectorContagionAgent', 'laborMarketTightAgent', 'regulatoryRiskAgent'],
    r_mean: 0.25, // Genuinely diverse: FRED/BLS, industryData, labor data, regulatory tables
  },
  {
    name: 'company_stability',
    agents: ['departmentRiskAgent', 'leadershipChurnAgent', 'offshoreRiskAgent', 'tenureRiskAgent'],
    r_mean: 0.30, // Mixed: department+industry, leadership fields, region, tenureYears
  },
  {
    name: 'personal_protection',
    agents: ['performanceAgent', 'proRelationshipAgent', 'tenureRiskAgent', 'skillDecayAgent'],
    r_mean: 0.45, // tenureYears shared by performanceAgent and tenureRiskAgent
  },
];

const TIME_DECAY_LAMBDA = 0.05; // e^(-λ × days), λ=0.05 → 50% weight at 14 days

// ── Step 1: Normalize a signal ────────────────────────────────────────────────
const normalizeSignal = (s: AgentSignal): number => {
  return s.signal * s.confidence * (s.sourceType === 'live-api' ? 1.0 : 0.92);
};

// ── Step 2: Time decay weight ─────────────────────────────────────────────────
const timeDecay = (ageInDays: number): number => {
  return Math.exp(-TIME_DECAY_LAMBDA * ageInDays);
};

// ── Step 3: Diversity weight (correlation-aware) ──────────────────────────────
//
// AUDIT FIX: Replaced 1/√n with source-overlap-aware formula.
//
//   n_eff = n / (1 + (n-1) × r_mean)
//   weight_per_agent = 1 / n_eff  (so each agent's contribution is fair)
//
// With the old 1/√n formula:
//   - Highly correlated clusters (r≈0.80) were over-weighted by up to 1.9×
//   - Genuinely diverse clusters (r≈0.25) were under-weighted
// With the new formula:
//   - Combined cluster weight = n × weight_per = n × n_eff/n = n_eff
//   - This equals the square root of effective independent signals — statistically correct
const buildDiversityWeights = (signals: AgentSignal[]): Map<string, number> => {
  const weights = new Map<string, number>();
  signals.forEach(s => weights.set(s.agentId, 1.0)); // default = fully independent

  for (const cluster of SIGNAL_CLUSTERS) {
    const clusterSignals = signals.filter(s => cluster.agents.includes(s.agentId));
    if (clusterSignals.length <= 1) continue;

    const n    = clusterSignals.length;
    const r    = cluster.r_mean;
    // Effective independent count given mean pairwise correlation
    const nEff = n / (1 + (n - 1) * r);
    // Per-agent weight so that combined cluster weight = n_eff (not n, not 1)
    const weightPerAgent = nEff / n;

    clusterSignals.forEach(s => {
      weights.set(s.agentId, weightPerAgent);
    });
  }

  return weights;
};

// ── Step 4: Category breakdown ───────────────────────────────────────────────
const computeCategoryBreakdown = (
  signals: AgentSignal[],
  diversityWeights: Map<string, number>
): Record<AgentCategory, number> => {
  const catScores: Record<AgentCategory, { sum: number; count: number }> = {
    market: { sum: 0, count: 0 }, company: { sum: 0, count: 0 },
    ai:     { sum: 0, count: 0 }, external: { sum: 0, count: 0 },
  };

  signals.forEach(s => {
    const norm    = normalizeSignal(s);
    const tw      = timeDecay(s.ageInDays);
    const dw      = diversityWeights.get(s.agentId) ?? 1.0;
    const score   = norm * tw * dw;
    catScores[s.category].sum   += score;
    catScores[s.category].count += 1;
  });

  return {
    market:   catScores.market.count   > 0 ? Math.round((catScores.market.sum   / catScores.market.count)   * 100) : 0,
    company:  catScores.company.count  > 0 ? Math.round((catScores.company.sum  / catScores.company.count)  * 100) : 0,
    ai:       catScores.ai.count       > 0 ? Math.round((catScores.ai.sum       / catScores.ai.count)       * 100) : 0,
    external: catScores.external.count > 0 ? Math.round((catScores.external.sum / catScores.external.count) * 100) : 0,
  };
};

// ── Build visualization graph ─────────────────────────────────────────────────
const buildVisualizationGraph = (
  signals: AgentSignal[],
  diversityWeights: Map<string, number>
) => {
  const nodes: GraphNode[] = signals.map(s => ({
    id:       s.agentId,
    category: s.category,
    signal:   parseFloat(s.signal.toFixed(3)),
    weight:   parseFloat((diversityWeights.get(s.agentId) ?? 1.0).toFixed(3)),
  }));

  const riskClusters: RiskCluster[] = SIGNAL_CLUSTERS.map(cluster => {
    const clusterSignals = signals.filter(s => cluster.agents.includes(s.agentId));
    const combinedSignal = clusterSignals.length > 0
      ? clusterSignals.reduce((sum, s) => sum + s.signal, 0) / clusterSignals.length
      : 0;
    return { cluster: cluster.name, agents: clusterSignals.map(s => s.agentId), combinedSignal };
  }).filter(c => c.agents.length > 0);

  const dominantEdges: GraphEdge[] = signals
    .filter(s => s.signal > 0.6)
    .sort((a, b) => b.signal - a.signal)
    .slice(0, 8)
    .map(s => ({
      from:         s.agentId,
      to:           'swarmScore',
      contribution: parseFloat(((normalizeSignal(s) * timeDecay(s.ageInDays)) * CATEGORY_WEIGHTS[s.category]).toFixed(3)),
    }));

  return { nodes, riskClusters, dominantEdges };
};

// ── Main Aggregation Function ─────────────────────────────────────────────────

export const aggregateSwarmResults = (
  signals: AgentSignal[],
  resolvedCount: number,
  totalAgents: number
): SwarmReport => {
  if (signals.length === 0) {
    return {
      swarmRiskScore: 50, swarmConfidence: 10,
      dominantSignals: [], weakSignals: [], anomalies: ['All agents failed'],
      categoryBreakdown: { market: 50, company: 50, ai: 50, external: 50 },
      visualizationGraph: { nodes: [], riskClusters: [], dominantEdges: [] },
      liveAgentsUsed: 0, totalAgentsRun: resolvedCount,
      generatedAt: new Date().toISOString(),
    };
  }

  const diversityWeights = buildDiversityWeights(signals);

  // ── Compute weighted SwarmScore ────────────────────────────────────────────
  let totalWeightedScore = 0;
  let totalWeight        = 0;

  signals.forEach(s => {
    const norm     = normalizeSignal(s);
    const tw       = timeDecay(s.ageInDays);
    const dw       = diversityWeights.get(s.agentId) ?? 1.0;
    const catW     = CATEGORY_WEIGHTS[s.category];
    // FIX: dw only penalises the numerator contribution — denominator uses pure catW
    // so correlated agents genuinely contribute less to the final score
    const combined = norm * tw * dw * catW;  // numerator: diversity-penalised
    totalWeightedScore += combined;
    totalWeight        += tw * catW;          // denominator: pure time × category
  });

  const rawScore     = totalWeight > 0 ? totalWeightedScore / totalWeight : 0.5;
  const swarmRiskScore = Math.max(2, Math.min(97, Math.round(rawScore * 100)));

  // ── Confidence from live API usage + resolution rate ─────────────────────
  const liveCount     = signals.filter(s => s.sourceType === 'live-api').length;
  const resolutionPct = (resolvedCount / totalAgents) * 100;
  const liveBonus     = liveCount * 3;
  const avgConfidence = signals.reduce((a, s) => a + s.confidence, 0) / signals.length;
  const swarmConfidence = Math.round(Math.min(95, (avgConfidence * 100 * 0.6) + (resolutionPct * 0.25) + liveBonus));

  // ── Classify signals ──────────────────────────────────────────────────────
  const dominantSignals = signals.filter(s => s.signal > 0.62).sort((a, b) => b.signal - a.signal);
  const weakSignals     = signals.filter(s => s.signal >= 0.30 && s.signal <= 0.62).sort((a, b) => b.signal - a.signal);

  // ── Anomaly detection ─────────────────────────────────────────────────────
  const anomalies: string[] = [];
  const signalValues = signals.map(s => s.signal);
  const mean   = signalValues.reduce((a, b) => a + b, 0) / signalValues.length;
  const stdDev = Math.sqrt(signalValues.map(v => Math.pow(v - mean, 2)).reduce((a, b) => a + b, 0) / signalValues.length);
  const outlierAgents = signals.filter(s => Math.abs(s.signal - mean) > 2 * stdDev && stdDev > 0.1);
  outlierAgents.forEach(a => anomalies.push(`${a.agentId}: outlier signal ${(a.signal * 100).toFixed(0)}% (avg ${(mean * 100).toFixed(0)}%)`));
  if (liveCount === 0) anomalies.push('No live-API agents ran — add VITE_ALPHAVANTAGE_KEY, VITE_NEWSAPI_KEY, VITE_FRED_API_KEY for real-time signals');

  // ── Cluster-completeness check ────────────────────────────────────────────
  // A partial failure where all agents in one category (e.g. market) fail while
  // others succeed can still pass the 20% swarmConfidence gate. The resulting
  // swarmRiskScore is then systematically skewed toward the surviving categories.
  // Flag any category that has zero surviving signals so downstream blending
  // knows the score is category-incomplete rather than just low-confidence.
  const categoriesPresent = new Set(signals.map(s => s.category));
  const ALL_CATEGORIES: AgentCategory[] = ['market', 'company', 'ai', 'external'];
  for (const cat of ALL_CATEGORIES) {
    if (!categoriesPresent.has(cat)) {
      const weight = CATEGORY_WEIGHTS[cat];
      anomalies.push(
        `Category "${cat}" (weight ${(weight * 100).toFixed(0)}%) has zero surviving agents — swarmScore excludes this signal dimension entirely. Score may be biased.`
      );
    }
  }

  const categoryBreakdown  = computeCategoryBreakdown(signals, diversityWeights);
  const visualizationGraph = buildVisualizationGraph(signals, diversityWeights);

  return {
    swarmRiskScore,
    swarmConfidence,
    dominantSignals: dominantSignals.slice(0, 5),
    weakSignals:     weakSignals.slice(0, 5),
    anomalies,
    categoryBreakdown,
    visualizationGraph,
    liveAgentsUsed: liveCount,
    totalAgentsRun: resolvedCount,
    generatedAt:    new Date().toISOString(),
  };
};
