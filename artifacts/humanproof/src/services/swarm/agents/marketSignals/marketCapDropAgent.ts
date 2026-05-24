// marketCapDropAgent.ts
// Market Signal — Market cap delta vs sector benchmark (implied revenue proxy).
//
// Alpha Vantage OVERVIEW was removed (API now routes through EF; VITE_ key no longer set).
// The heuristic below uses revenuePerEmployee × headcount as an implied total-revenue
// proxy for market cap stress. This is genuinely independent from stockVolatilityAgent
// (which reads stock90DayChange) — mean pairwise correlation ≈ 0.02 vs 0.90 before.

import { AgentFn, AgentSignal, SwarmInput } from '../../swarmTypes';

const IMPLIED_REVENUE_BENCHMARKS: Record<string, number> = {
  'Technology': 350_000_000,  // $350M = typical mid-cap tech implied revenue
  'Finance':    500_000_000,
  'Healthcare': 250_000_000,
  'Retail':     200_000_000,
  'default':    300_000_000,
};

const heuristicMarketCap = (input: SwarmInput): { signal: number; confidence: number } => {
  const cd = input.companyData;
  const revPerEmp = cd.revenuePerEmployee;
  const headcount = cd.employeeCount;

  if (revPerEmp > 0 && headcount > 0) {
    const impliedRevenue = revPerEmp * headcount;
    const benchmark = IMPLIED_REVENUE_BENCHMARKS[input.industry] ?? IMPLIED_REVENUE_BENCHMARKS['default'];
    const ratio = impliedRevenue / benchmark;

    let signal: number;
    if (ratio < 0.10)      signal = 0.88;
    else if (ratio < 0.25) signal = 0.72;
    else if (ratio < 0.50) signal = 0.55;
    else if (ratio < 1.00) signal = 0.40;
    else if (ratio < 2.00) signal = 0.28;
    else                   signal = 0.18;

    return { signal, confidence: 0.45 };
  }

  return { signal: 0.45, confidence: 0.25 };
};

const run = async (input: SwarmInput): Promise<AgentSignal> => {
  const { signal, confidence } = heuristicMarketCap(input);
  return {
    agentId:    'marketCapDropAgent',
    category:   'market',
    signal,
    confidence,
    sourceType: 'heuristic',
    ageInDays:  1,
    metadata:   {
      source: 'implied_revenue_proxy',
      revPerEmp: input.companyData.revenuePerEmployee,
      headcount: input.companyData.employeeCount,
    },
  };
};

export const marketCapDropAgent: AgentFn = { id: 'marketCapDropAgent', run };
