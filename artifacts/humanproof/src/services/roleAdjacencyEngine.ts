/**
 * roleAdjacencyEngine.ts — v12.0
 *
 * 2-hop role transition graph analysis.
 *
 * Current escape paths are 1-hop ("pivot to PM"). These often require 12–18 months.
 * This engine traverses the role adjacency graph to find bridge roles that allow
 * faster risk reduction per week invested.
 *
 * Key metric: riskReductionPerWeek = (currentScore - scoreAtDestination) / totalTimeWeeks
 * This ranks paths by ROI: "which path gives me the most score reduction per week?"
 *
 * Example: SW Engineer → Prompt Engineer (6 wks) → AI PM (12 wks) = 18 wks total
 * If current score = 68 and AI PM score = 36: (68-36)/18 = 1.78 pts/week
 * vs. Direct PM pivot: 20 wks, score 40: (68-40)/20 = 1.4 pts/week
 * → 2-hop path wins by 27% efficiency
 */

import {
  ROLE_ADJACENCY_GRAPH,
  findNearestAdjacencyKey,
  type AdjacencyEdge,
} from '../data/roleAdjacencyGraph';

export interface RoleAdjacencyInputs {
  oracleKey: string;
  currentScore: number;
  breakdown: {
    L1: number; L2: number; L3: number; L4: number; L5: number;
    D6?: number; D7?: number; D8?: number;
  };
  tenureYears: number;
  hasAiSkills?: boolean;
  financialRunwayMonths: number;
  industry: string;
  region: string;
}

export interface AdjacencyNode {
  targetRoleKey: string;
  targetRoleLabel: string;
  /** Estimated score at target role (lower = safer) */
  estimatedScoreAtTarget: number;
  /** Score reduction from current to target */
  scoreReduction: number;
  /** Skills to ADD (not replace) */
  skillBridgeRequired: string[];
  /** Weeks of focused upskilling to become job-market ready */
  timeToQualifiedWeeks: number;
  /** 0–100 market demand for this role */
  marketDemandScore: number;
  adjacencyStrength: 'strong' | 'moderate' | 'weak';
  /** Risk reduction per week invested */
  riskReductionPerWeek: number;
}

export interface TwoHopPath {
  bridgeRoleKey: string;
  bridgeRoleLabel: string;
  destinationRoleKey: string;
  destinationRoleLabel: string;
  bridgeTimeWeeks: number;       // weeks for the first leg (current → bridge)
  destinationTimeWeeks: number;  // weeks for the second leg (bridge → destination)
  totalTimeWeeks: number;
  scoreAtBridge: number;
  scoreAtDestination: number;
  scoreReduction: number;
  riskReductionPerWeek: number;
  rationale: string;
}

export interface RoleAdjacencyResult {
  resolvedOracleKey: string;
  isFuzzyMatch: boolean;
  adjacentRoles: AdjacencyNode[];
  twoHopPaths: TwoHopPath[];
  /** Highest riskReductionPerWeek path across both 1-hop and 2-hop */
  bestPath: AdjacencyNode | TwoHopPath | null;
  /** Market demand scores for adjacent roles */
  marketDemandMap: Record<string, number>;
  recommendedFocusPath: string;
}

function getAdjacencyStrength(overlapPercent: number): 'strong' | 'moderate' | 'weak' {
  if (overlapPercent >= 70) return 'strong';
  if (overlapPercent >= 50) return 'moderate';
  return 'weak';
}

// Adjust estimated target score based on user factors
function adjustTargetScore(
  baseScore: number,
  hasAiSkills: boolean,
  tenureYears: number,
  targetKey: string,
): number {
  let adjusted = baseScore;
  // AI skills reduce score in AI-adjacent roles
  if (hasAiSkills && targetKey.includes('ai')) adjusted -= 5;
  // Senior tenure provides protection in any role
  if (tenureYears >= 7) adjusted -= 4;
  else if (tenureYears >= 3) adjusted -= 2;
  return Math.max(15, Math.min(85, adjusted));
}

export function computeRoleAdjacency(inputs: RoleAdjacencyInputs): RoleAdjacencyResult {
  const {
    oracleKey,
    currentScore,
    tenureYears,
    hasAiSkills = false,
    financialRunwayMonths,
  } = inputs;

  const resolvedKey = findNearestAdjacencyKey(oracleKey);
  const isFuzzyMatch = resolvedKey !== oracleKey;
  const sourceNode = ROLE_ADJACENCY_GRAPH[resolvedKey];

  if (!sourceNode) {
    return emptyResult(oracleKey, resolvedKey, isFuzzyMatch);
  }

  // Build 1-hop adjacent roles
  const adjacentRoles: AdjacencyNode[] = sourceNode.edges.map(edge => {
    const adjustedScore = adjustTargetScore(
      edge.estimatedTargetScore,
      hasAiSkills,
      tenureYears,
      edge.targetKey,
    );
    const scoreReduction = Math.max(0, currentScore - adjustedScore);
    const riskReductionPerWeek = edge.transitionWeeks > 0
      ? Math.round((scoreReduction / edge.transitionWeeks) * 100) / 100
      : 0;

    return {
      targetRoleKey: edge.targetKey,
      targetRoleLabel: edge.targetLabel,
      estimatedScoreAtTarget: adjustedScore,
      scoreReduction,
      skillBridgeRequired: edge.skillGapsRequired,
      timeToQualifiedWeeks: edge.transitionWeeks,
      marketDemandScore: edge.marketDemandScore,
      adjacencyStrength: getAdjacencyStrength(edge.overlapPercent),
      riskReductionPerWeek,
    };
  }).sort((a, b) => b.riskReductionPerWeek - a.riskReductionPerWeek);

  // Build 2-hop paths (bridge → destination)
  const twoHopPaths: TwoHopPath[] = [];
  for (const bridgeEdge of sourceNode.edges) {
    const bridgeNode = ROLE_ADJACENCY_GRAPH[bridgeEdge.targetKey];
    if (!bridgeNode) continue;

    // Only use bridges with strong overlap (≥60%) to keep paths realistic
    if (bridgeEdge.overlapPercent < 60) continue;

    for (const destEdge of bridgeNode.edges) {
      // Skip if destination is the starting role
      if (destEdge.targetKey === resolvedKey) continue;

      const bridgeScore = adjustTargetScore(bridgeEdge.estimatedTargetScore, hasAiSkills, tenureYears, bridgeEdge.targetKey);
      const destScore = adjustTargetScore(destEdge.estimatedTargetScore, hasAiSkills, tenureYears, destEdge.targetKey);
      const totalWeeks = bridgeEdge.transitionWeeks + destEdge.transitionWeeks;
      const totalScoreReduction = Math.max(0, currentScore - destScore);
      const riskReductionPerWeek = totalWeeks > 0
        ? Math.round((totalScoreReduction / totalWeeks) * 100) / 100
        : 0;

      // Only include paths that are actually better than doing nothing
      if (totalScoreReduction < 5 || totalWeeks > 52) continue;

      // Skip if runway is too short for this path
      if (financialRunwayMonths > 0 && totalWeeks / 4 > financialRunwayMonths * 0.8) continue;

      twoHopPaths.push({
        bridgeRoleKey: bridgeEdge.targetKey,
        bridgeRoleLabel: bridgeEdge.targetLabel,
        destinationRoleKey: destEdge.targetKey,
        destinationRoleLabel: destEdge.targetLabel,
        bridgeTimeWeeks: bridgeEdge.transitionWeeks,
        destinationTimeWeeks: destEdge.transitionWeeks,
        totalTimeWeeks: totalWeeks,
        scoreAtBridge: bridgeScore,
        scoreAtDestination: destScore,
        scoreReduction: totalScoreReduction,
        riskReductionPerWeek,
        rationale: `${sourceNode.label} → ${bridgeEdge.targetLabel} (${bridgeEdge.transitionWeeks}wk) → ${destEdge.targetLabel} (${destEdge.transitionWeeks}wk) = ${totalWeeks}wk total, reducing score by ${totalScoreReduction}pts`,
      });
    }
  }

  // Sort by risk reduction per week
  twoHopPaths.sort((a, b) => b.riskReductionPerWeek - a.riskReductionPerWeek);

  // Find best path overall (highest riskReductionPerWeek across 1-hop and 2-hop)
  const bestAdjacentRpw = adjacentRoles[0]?.riskReductionPerWeek ?? 0;
  const bestTwoHopRpw = twoHopPaths[0]?.riskReductionPerWeek ?? 0;
  const bestPath = bestTwoHopRpw > bestAdjacentRpw
    ? twoHopPaths[0] ?? null
    : adjacentRoles[0] ?? null;

  const marketDemandMap: Record<string, number> = {};
  for (const role of adjacentRoles) {
    marketDemandMap[role.targetRoleKey] = role.marketDemandScore;
  }

  const recommendedFocusPath = buildRecommendedFocusPath(bestPath, currentScore);

  return {
    resolvedOracleKey: resolvedKey,
    isFuzzyMatch,
    adjacentRoles: adjacentRoles.slice(0, 5),
    twoHopPaths: twoHopPaths.slice(0, 3),
    bestPath,
    marketDemandMap,
    recommendedFocusPath,
  };
}

function buildRecommendedFocusPath(
  bestPath: AdjacencyNode | TwoHopPath | null,
  currentScore: number,
): string {
  if (!bestPath) return '';

  const isAdjacentNode = 'targetRoleLabel' in bestPath;
  if (isAdjacentNode) {
    const p = bestPath as AdjacencyNode;
    return `Best 1-hop: ${p.targetRoleLabel} in ${p.timeToQualifiedWeeks}wk. Reduces score by ~${p.scoreReduction}pts (${p.riskReductionPerWeek}pts/week). Start: ${p.skillBridgeRequired[0] ?? 'skill bridging'}.`;
  } else {
    const p = bestPath as TwoHopPath;
    return `Best 2-hop: → ${p.bridgeRoleLabel} (${p.bridgeTimeWeeks}wk) → ${p.destinationRoleLabel} (${p.destinationTimeWeeks}wk). Total: ${p.totalTimeWeeks}wk, −${p.scoreReduction}pts (${p.riskReductionPerWeek}pts/week).`;
  }
}

function emptyResult(oracleKey: string, resolvedKey: string, isFuzzyMatch: boolean): RoleAdjacencyResult {
  return {
    resolvedOracleKey: resolvedKey,
    isFuzzyMatch,
    adjacentRoles: [],
    twoHopPaths: [],
    bestPath: null,
    marketDemandMap: {},
    recommendedFocusPath: '',
  };
}
