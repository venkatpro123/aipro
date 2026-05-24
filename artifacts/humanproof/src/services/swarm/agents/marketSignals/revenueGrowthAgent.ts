// revenueGrowthAgent.ts
// Market Signal — Year-over-year revenue growth trajectory.
//
// Alpha Vantage INCOME_STATEMENT was removed (VITE_ key no longer set in production).
// revenueGrowthYoY is now populated in input.companyData by the main audit pipeline
// via Yahoo Finance + SEC EDGAR (through the proxy-live-signals EF). The heuristic
// below already uses that live-pipeline value — no separate API call needed.

import { AgentFn, AgentSignal, SwarmInput } from '../../swarmTypes';

const heuristicRevenue = (input: SwarmInput): number => {
  const yoy = input.companyData.revenueGrowthYoY;
  if (yoy === null || yoy === undefined) return 0.50;
  if (yoy < -20) return 0.95;
  if (yoy < -10) return 0.82;
  if (yoy <   0) return 0.65;
  if (yoy <   5) return 0.50;
  if (yoy <  15) return 0.32;
  if (yoy <  30) return 0.18;
  return 0.10;
};

const run = async (input: SwarmInput): Promise<AgentSignal> => {
  const signal = heuristicRevenue(input);
  const yoy    = input.companyData.revenueGrowthYoY;
  return {
    agentId:    'revenueGrowthAgent',
    category:   'market',
    signal,
    // High confidence when revenueGrowthYoY was populated by the live pipeline
    confidence: yoy !== null ? 0.72 : 0.35,
    sourceType: yoy !== null ? 'live-api' : 'heuristic',
    ageInDays:  yoy !== null ? 0 : 1,
    metadata:   { yoy, source: yoy !== null ? 'pipeline/yahoo-finance+sec-edgar' : 'heuristic' },
  };
};

export const revenueGrowthAgent: AgentFn = { id: 'revenueGrowthAgent', run };
