// leadershipChurnAgent.ts
// Company Signal — C-suite turnover frequency as structural instability proxy.
//
// LIVE PATH (US public companies):
//   Reads SEC EDGAR Item 5.02 filings (departure of directors/officers). This
//   gives a regulatory-grade, time-stamped record of actual C-suite exits —
//   far more reliable than user-input or DB-seeded flags. The EDGAR connector
//   caches results for 6 hours so repeated swarm runs don't hit EDGAR's
//   10 req/sec limit.
//
// HEURISTIC FALLBACK:
//   Uses `companyData.leadershipChurn` (seeded DB field) when EDGAR is
//   unreachable or the company is not US-listed (private, Indian, etc.).
//   Confidence is significantly lower on the heuristic path because the DB
//   field is seeded once and never automatically refreshed.

import { AgentFn, AgentSignal, SwarmInput } from '../../swarmTypes';
import { fetchSecEdgarExecutiveDepartures } from '../../../dataConnectors/secEdgarConnector';

const CHURN_MAP: Record<string, { signal: number; confidence: number }> = {
  high:    { signal: 0.88, confidence: 0.72 },
  medium:  { signal: 0.55, confidence: 0.68 },
  low:     { signal: 0.18, confidence: 0.72 },
  none:    { signal: 0.10, confidence: 0.78 },
  unknown: { signal: 0.42, confidence: 0.28 }, // low confidence on unknown
};

const run = async (input: SwarmInput): Promise<AgentSignal> => {
  const cd = input.companyData;

  // ── Live path: SEC EDGAR Item 5.02 (US public companies only) ─────────────
  // Only attempt for public companies — private/Indian firms are not SEC filers
  // and every EDGAR call for them returns 0 hits (wasted quota).
  if (cd.isPublic) {
    try {
      const execData = await fetchSecEdgarExecutiveDepartures(input.companyName, { daysBack: 365 });

      if (execData.edgarReachable) {
        const count = execData.departureCount;
        const mostRecentMonthsAgo = execData.mostRecentDeparture
          ? (Date.now() - new Date(execData.mostRecentDeparture).getTime()) / (1000 * 60 * 60 * 24 * 30)
          : null;

        // Recency amplification: a departure last month is a stronger signal
        // than one 11 months ago.
        const recencyFactor = mostRecentMonthsAgo === null ? 0.60
          : mostRecentMonthsAgo < 2  ? 1.00
          : mostRecentMonthsAgo < 6  ? 0.80
          : mostRecentMonthsAgo < 12 ? 0.60
          : 0.40;

        let signal: number;
        if (count === 0) {
          signal = 0.10;
        } else if (count === 1) {
          signal = 0.50 * recencyFactor;
        } else if (count === 2) {
          signal = 0.70 * recencyFactor;
        } else if (count === 3) {
          signal = 0.82 * recencyFactor;
        } else {
          signal = Math.min(0.95, (0.85 + (count - 4) * 0.02) * recencyFactor);
        }

        return {
          agentId:    'leadershipChurnAgent',
          category:   'company',
          signal:     Math.max(0.05, signal),
          confidence: count > 0 ? 0.82 : 0.72,
          sourceType: 'live-api',
          ageInDays:  mostRecentMonthsAgo !== null ? Math.round(mostRecentMonthsAgo * 30) : 7,
          metadata:   {
            source:               'SEC EDGAR Item 5.02',
            departureFiligsCount: count,
            mostRecentDeparture:  execData.mostRecentDeparture,
            recencyFactor:        parseFloat(recencyFactor.toFixed(2)),
          },
        };
      }
    } catch (e: any) {
      console.info('[leadershipChurnAgent] EDGAR query failed, falling to heuristic:', e?.message);
    }
  }

  // ── Heuristic fallback (static DB field) ──────────────────────────────────
  const churnLevel: string = (cd as any).leadershipChurn ?? 'unknown';
  const { signal: baseSignal, confidence } = CHURN_MAP[churnLevel] ?? CHURN_MAP['unknown'];

  // Static DB fields for known CEO/CFO changes (seeded data — lower confidence)
  const hasCEOChange: boolean = (cd as any).ceoChaneLast12Months ?? false;
  const hasCFOChange: boolean = (cd as any).cfoChaneLast12Months ?? false;
  let adjustedSignal = baseSignal;
  if (hasCEOChange) adjustedSignal = Math.min(0.92, adjustedSignal + 0.15);
  if (hasCFOChange) adjustedSignal = Math.min(0.92, adjustedSignal + 0.10);

  return {
    agentId:    'leadershipChurnAgent',
    category:   'company',
    signal:     adjustedSignal,
    confidence,
    sourceType: 'heuristic',
    ageInDays:  30,
    metadata:   {
      churnLevel,
      hasCEOChange,
      hasCFOChange,
      note: cd.isPublic
        ? 'EDGAR unreachable — heuristic only; re-run for live signal'
        : 'Non-US-public company — EDGAR not applicable; static DB field used',
    },
  };
};

export const leadershipChurnAgent: AgentFn = { id: 'leadershipChurnAgent', run };
