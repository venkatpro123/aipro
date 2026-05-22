// laborMarketTightAgent.ts
// External Signal — Labor market tightness for this role category.
// LIVE: FRED UNRATE (unemployment) + NROU (natural rate) → tightness gap.

import { AgentFn, AgentSignal, SwarmInput } from '../../swarmTypes';

const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations';

// Lower unemployment relative to natural rate = tighter labor market = LOWER layoff risk
const fetchLatestFred = async (seriesId: string, apiKey: string): Promise<number | null> => {
  const url = `${FRED_BASE}?series_id=${seriesId}&api_key=${apiKey}&file_type=json&limit=3&sort_order=desc`;
  const res  = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  const json = await res.json();
  const obs: any[] = json.observations ?? [];
  const val = parseFloat(obs.find(o => o.value !== '.')?.value ?? '');
  return isNaN(val) ? null : val;
};

// Role-category labor tightness modifier (some roles are scarcer)
const ROLE_SCARCITY: Record<string, number> = {
  'ml engineer':          -0.20, 'ai engineer':          -0.22, 'data scientist':       -0.15,
  'software engineer':    -0.12, 'developer':            -0.10, 'security':             -0.18,
  'nurse':                -0.25, 'doctor':               -0.28, 'therapist':            -0.20,
  'cloud':                -0.15, 'devops':               -0.12, 'blockchain':           -0.08,
  'customer service':      0.15, 'cashier':               0.20, 'data entry':           0.18,
  'marketing':             0.08, 'hr ':                   0.10, 'recruiter':            0.12,
  'default':               0.00,
};

const run = async (input: SwarmInput): Promise<AgentSignal> => {
  const apiKey = (import.meta as any).env?.VITE_FRED_API_KEY;

  if (apiKey) {
    try {
      // BUG-08: allSettled — an NROU timeout must not abort the UNRATE fetch.
      const [unrateS, nrouS] = await Promise.allSettled([
        fetchLatestFred('UNRATE', apiKey),
        fetchLatestFred('NROU', apiKey),
      ]);
      const unrate = unrateS.status === 'fulfilled' ? unrateS.value : null;
      const nrou   = nrouS.status   === 'fulfilled' ? nrouS.value   : null;

      if (unrate !== null && nrou !== null) {
        const gap = unrate - nrou; // Positive = loose market (higher risk), negative = tight (lower risk)
        let signal: number;
        if (gap > 2.0)       signal = 0.78; // High unemployment gap — employers have leverage
        else if (gap > 1.0)  signal = 0.60;
        else if (gap > 0)    signal = 0.45;
        else if (gap > -1.0) signal = 0.30;
        else                 signal = 0.15; // Very tight market — hard to replace people

        // Role scarcity modifier
        const roleLower  = input.roleTitle.toLowerCase();
        const scarcityKey = Object.keys(ROLE_SCARCITY).find(k => roleLower.includes(k)) ?? 'default';
        signal = Math.max(0.05, Math.min(0.95, signal + ROLE_SCARCITY[scarcityKey]));

        return {
          agentId:    'laborMarketTightAgent',
          category:   'external',
          signal,
          confidence: 0.82,
          sourceType: 'live-api',
          ageInDays:  0,
          metadata:   { unrate, nrou, gap: gap.toFixed(2), scarcityKey },
        };
      }
    } catch (e: any) {
      console.warn('[laborMarketTightAgent] FRED API failed:', e.message);
    }
  }

  // Heuristic fallback: use role scarcity only
  const roleLower   = input.roleTitle.toLowerCase();
  const scarcityKey = Object.keys(ROLE_SCARCITY).find(k => roleLower.includes(k)) ?? 'default';
  const baseSignal  = 0.40 + ROLE_SCARCITY[scarcityKey];

  return {
    agentId:    'laborMarketTightAgent',
    category:   'external',
    signal:     Math.max(0.05, Math.min(0.95, baseSignal)),
    confidence: 0.50,
    sourceType: 'heuristic',
    ageInDays:  30,
    metadata:   { fallback: true, scarcityKey },
  };
};

export const laborMarketTightAgent: AgentFn = { id: 'laborMarketTightAgent', run };
