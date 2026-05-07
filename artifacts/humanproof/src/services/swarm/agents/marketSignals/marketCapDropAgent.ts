// marketCapDropAgent.ts
// Market Signal — Market cap delta vs sector benchmark (52-week high comparison).
// LIVE: Alpha Vantage OVERVIEW endpoint with heuristic fallback.

import { AgentFn, AgentSignal, SwarmInput } from '../../swarmTypes';

const ALPHA_BASE = 'https://www.alphavantage.co/query';

// AUDIT FIX: The previous heuristic read stock90DayChange — the same field
// stockVolatilityAgent reads. Mean pairwise correlation with stockVolatilityAgent
// was ≈ 0.90. 1/√n diversity weighting could not compensate for near-identical inputs.
//
// New heuristic: derive implied valuation stress from revenue-per-employee × headcount
// as a proxy for total enterprise value, compared against sector medians.
// Completely independent from stock90DayChange.
// Falls back to low-confidence neutral (0.45) when neither field is available,
// rather than injecting a circular duplicate of stockVolatilityAgent.

const IMPLIED_REVENUE_BENCHMARKS: Record<string, number> = {
  'Technology': 350_000_000,  // $350M revenue = typical mid-cap tech
  'Finance':    500_000_000,
  'Healthcare': 250_000_000,
  'Retail':     200_000_000,
  'default':    300_000_000,
};

const heuristicMarketCap = (input: SwarmInput): { signal: number; confidence: number } => {
  const cd = input.companyData;
  const revPerEmp = cd.revenuePerEmployee;
  const headcount = cd.employeeCount;

  // If we have revenue-per-employee + headcount, derive implied total revenue
  // as a proxy for market cap (enterprise value roughly correlates for public cos)
  if (revPerEmp > 0 && headcount > 0) {
    const impliedRevenue = revPerEmp * headcount;
    const benchmark = IMPLIED_REVENUE_BENCHMARKS[input.industry] ?? IMPLIED_REVENUE_BENCHMARKS['default'];
    const ratio = impliedRevenue / benchmark;

    // Below benchmark = structurally smaller = higher distress risk when layoffs hit
    let signal: number;
    if (ratio < 0.10)       signal = 0.88;  // very small relative to sector
    else if (ratio < 0.25)  signal = 0.72;
    else if (ratio < 0.50)  signal = 0.55;
    else if (ratio < 1.00)  signal = 0.40;
    else if (ratio < 2.00)  signal = 0.28;
    else                    signal = 0.18;

    return { signal, confidence: 0.45 };
  }

  // No useful data — return low-confidence neutral rather than circular stock proxy
  return { signal: 0.45, confidence: 0.25 };
};

const run = async (input: SwarmInput): Promise<AgentSignal> => {
  const apiKey = (import.meta as any).env?.VITE_ALPHAVANTAGE_KEY;

  // Live path: Alpha Vantage 52-week high/low provides genuinely independent signal
  if (apiKey && input.companyData.isPublic) {
    try {
      const ticker = input.companyData.stockTicker ?? input.companyData.ticker ?? input.companyName.toUpperCase().slice(0, 4);
      const url    = `${ALPHA_BASE}?function=OVERVIEW&symbol=${ticker}&apikey=${apiKey}`;
      const res    = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      const json   = await res.json();
      const high52  = parseFloat(json['52WeekHigh']  ?? '0');
      const low52   = parseFloat(json['52WeekLow']   ?? '0');
      const current = parseFloat(json['50DayMovingAverage'] ?? '0');
      if (high52 > 0 && current > 0) {
        const dropFromHigh = ((high52 - current) / high52) * 100;
        const rangeSize    = high52 - low52;
        const inRange      = rangeSize > 0 ? (current - low52) / rangeSize : 0.5;
        const signal = Math.max(0.05, Math.min(0.95, (1 - inRange) * 0.7 + (dropFromHigh / 100) * 0.3));
        return {
          agentId:    'marketCapDropAgent',
          category:   'market',
          signal,
          confidence: 0.80,
          sourceType: 'live-api',
          ageInDays:  0,
          metadata:   { high52, low52, current, dropFromHighPct: dropFromHigh.toFixed(1) },
        };
      }
    } catch (e: any) {
      console.warn('[marketCapDropAgent] API failed:', e.message);
    }
  }

  // Heuristic fallback: implied revenue proxy (independent from stock90DayChange)
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
