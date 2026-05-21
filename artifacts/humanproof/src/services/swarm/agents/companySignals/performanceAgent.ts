// performanceAgent.ts
// Company Signal — Performance tier vs elimination likelihood.
// HEURISTIC — maps performanceTier to elimination pattern with contextual boost.
// Applies the same credibility discount as layoffScoreEngine.analyzePerformanceCredibility
// so swarm and engine are consistent when a 'top' claim contradicts objective signals.

import { AgentFn, AgentSignal, SwarmInput } from '../../swarmTypes';
import { analyzePerformanceCredibility } from '../../../layoffScoreEngine';

const run = async (input: SwarmInput): Promise<AgentSignal> => {
  const rawTier = input.userFactors.performanceTier;

  // Apply credibility discount — same logic as the engine's L5 calculation.
  // Prevents the swarm from giving a 0.08 risk signal on a 'top' claim that
  // the engine has already discounted to 'average'.
  const credibility = analyzePerformanceCredibility(input.userFactors, input.companyData.region);
  const tier        = credibility.effectiveTier;
  const discounted  = tier !== rawTier;

  const tierMap: Record<string, number> = {
    'top':     0.08,
    'average': 0.45,
    'below':   0.88,
    'unknown': 0.42,
  };

  let signal = tierMap[tier] ?? 0.42;

  // Context: in mass layoffs, even top performers are at risk
  const layoffs       = input.companyData.layoffsLast24Months ?? [];
  const hasMassLayoff = layoffs.some(l => l.percentCut >= 15);
  if (hasMassLayoff && tier !== 'top') {
    signal = Math.min(0.95, signal * 1.20);
  }
  if (hasMassLayoff && tier === 'top') {
    signal = Math.min(0.95, signal + 0.15);
  }

  // Confidence is lower when the claim was discounted — the agent is less certain
  // because the self-report and the objective signals point in different directions.
  const confidence = tier === 'unknown' ? 0.35
    : discounted ? 0.55   // discounted: mid-confidence, two contradicting inputs
    : 0.72;

  return {
    agentId:    'performanceAgent',
    category:   'company',
    signal,
    confidence,
    sourceType: 'heuristic',
    ageInDays:  1,
    metadata:   {
      claimedTier:        rawTier,
      effectiveTier:      tier,
      credibilityScore:   credibility.credibilityScore,
      discounted,
      hasMassLayoff,
    },
  };
};

export const performanceAgent: AgentFn = { id: 'performanceAgent', run };
