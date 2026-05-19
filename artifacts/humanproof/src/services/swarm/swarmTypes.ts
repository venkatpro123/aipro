// swarmTypes.ts
// Shared TypeScript interfaces for the 30-agent Swarm Intelligence Layer.
// All agents, orchestrator, aggregator, and integration points import from here.

import { CompanyData } from '../../data/companyDatabase';
import { IndustryRisk } from '../../data/industryRiskData';
import { UserFactors } from '../layoffScoreEngine';

// ── Input ────────────────────────────────────────────────────────────────────

/**
 * A single peer company's layoff event — used by sectorContagionAgent to
 * distinguish causal contagion from coincidental macro-correlated timing.
 */
export interface PeerLayoffEvent {
  company:     string;
  date:        string;          // ISO date string (e.g. '2024-01-20')
  percentCut:  number;          // estimated % of workforce cut
  department?: string;          // first affected department, if known
}

export interface SwarmInput {
  companyName:        string;
  industry:           string;
  roleTitle:          string;
  department:         string;
  tenureYears:        number;
  companyData:        CompanyData;
  industryData?:      IndustryRisk;
  userFactors:        UserFactors;
  /** Named peer layoff events from COMPANY_INTELLIGENCE_DB — enables temporal
   *  contagion analysis in sectorContagionAgent. Absent = static fallback. */
  peerLayoffEvents?:  PeerLayoffEvent[];
  /**
   * Total number of companies in COMPANY_INTELLIGENCE_DB that match the target
   * industry (including those with no recent layoffs). Required by
   * sectorContagionAgent to compute sectorCuttingFraction:
   *
   *   sectorCuttingFraction = recentCuts / totalTrackedSectorCompanies
   *
   * When this fraction exceeds MACRO_TRIGGER_FRACTION (0.40), the agent
   * applies a macro correction — reducing the contagion premium and
   * converging the signal toward the industry baseline, because broad
   * market corrections affect all companies regardless of individual health.
   *
   * When absent: sectorContagionAgent falls back to baselineRisk as a crude
   * proxy, which may over-fire for high-baseline industries (see comments in
   * sectorContagionAgent.ts).
   */
  totalTrackedSectorCompanies?: number;
}

// ── Per-Agent Output ─────────────────────────────────────────────────────────

export type AgentCategory = 'market' | 'company' | 'ai' | 'external';
export type SourceType    = 'live-api' | 'heuristic';

export interface AgentSignal {
  agentId:    string;
  category:   AgentCategory;
  signal:     number;       // 0–1 (1 = highest risk)
  confidence: number;       // 0–1
  sourceType: SourceType;
  ageInDays:  number;       // 0 = real-time, higher = older / more stale
  metadata:   Record<string, any>;
}

export interface AgentFn {
  id:  string;
  run: (input: SwarmInput) => Promise<AgentSignal>;
}

// ── Orchestrator Output ──────────────────────────────────────────────────────

export interface SwarmRawResult {
  agentId: string;
  status:  'fulfilled' | 'rejected';
  signal?: AgentSignal;
  error?:  string;
}

// ── Aggregated Report ────────────────────────────────────────────────────────

export interface RiskCluster {
  cluster:        string;
  agents:         string[];
  combinedSignal: number;
}

export interface GraphNode {
  id:       string;
  category: AgentCategory;
  signal:   number;
  weight:   number;
}

export interface GraphEdge {
  from:         string;
  to:           string;
  contribution: number;
}

export interface VisualizationGraph {
  nodes:         GraphNode[];
  riskClusters:  RiskCluster[];
  dominantEdges: GraphEdge[];
}

export interface CategoryBreakdown {
  market:   number;
  company:  number;
  ai:       number;
  external: number;
}

export interface SwarmReport {
  swarmRiskScore:      number;          // 0–100
  swarmConfidence:     number;          // 0–100
  dominantSignals:     AgentSignal[];   // top signals (>0.6)
  weakSignals:         AgentSignal[];   // signals 0.3–0.6
  anomalies:           string[];        // unusual readings
  categoryBreakdown:   CategoryBreakdown;
  visualizationGraph:  VisualizationGraph;
  liveAgentsUsed:      number;          // how many real-API agents ran
  totalAgentsRun:      number;          // how many of 30 resolved
  generatedAt:         string;          // ISO timestamp
}
