// macroRecessionAgent.ts
// External Signal — Macro-economic recession probability via FRED API.
// LIVE: FRED USREC (recession indicator) + T10Y2Y (yield curve inversion).
// Heuristic fallback: conservative 35% baseline.

import { AgentFn, AgentSignal, SwarmInput } from '../../swarmTypes';

const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations';

const fetchFred = async (seriesId: string, apiKey: string): Promise<number | null> => {
  const url = `${FRED_BASE}?series_id=${seriesId}&api_key=${apiKey}&file_type=json&limit=5&sort_order=desc`;
  const res  = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  const json = await res.json();
  const obs: any[] = json.observations ?? [];
  const val = parseFloat(obs.find(o => o.value !== '.')?.value ?? '');
  return isNaN(val) ? null : val;
};

const run = async (input: SwarmInput): Promise<AgentSignal> => {
  const apiKey = (import.meta as any).env?.VITE_FRED_API_KEY;

  if (apiKey) {
    try {
      // BUG-08: allSettled — a T10Y2Y timeout must not abort the USREC fetch.
      const [recS, yieldS] = await Promise.allSettled([
        fetchFred('USREC', apiKey),
        fetchFred('T10Y2Y', apiKey),
      ]);
      const recession  = recS.status   === 'fulfilled' ? recS.value   : null;
      const yieldCurve = yieldS.status === 'fulfilled' ? yieldS.value : null;

      let signal = 0.35; // base
      if (recession === 1) signal = 0.90; // We're in a recession right now
      else if (yieldCurve !== null && yieldCurve < -0.5) signal = 0.72; // Inverted curve signal
      else if (yieldCurve !== null && yieldCurve < 0) signal = 0.52;    // Slight inversion
      else if (yieldCurve !== null && yieldCurve > 1.5) signal = 0.18;  // Healthy yield curve

      return {
        agentId:    'macroRecessionAgent',
        category:   'external',
        signal,
        confidence: 0.85,
        sourceType: 'live-api',
        ageInDays:  0,
        metadata:   { recession, yieldCurve, source: 'FRED' },
      };
    } catch (e: any) {
      console.warn('[macroRecessionAgent] FRED API failed:', e.message);
    }
  }

  return {
    agentId:    'macroRecessionAgent',
    category:   'external',
    signal:     0.35, // conservative baseline
    confidence: 0.45,
    sourceType: 'heuristic',
    ageInDays:  30,
    metadata:   { fallback: true, note: 'No FRED key — using conservative baseline' },
  };
};

export const macroRecessionAgent: AgentFn = { id: 'macroRecessionAgent', run };
