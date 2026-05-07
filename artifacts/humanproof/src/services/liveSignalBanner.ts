// liveSignalBanner.ts
// Computes a LiveSignalStatus object from EnsembleResult or HybridResult.
// Consumed by LiveSignalStatusBar.tsx for the always-visible top banner.

import type { HybridResult } from '../types/hybridResult';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AgentStatusMap {
  gemma?:    'success' | 'failed' | 'rate_limited' | 'unknown';
  deepseek?: 'success' | 'failed' | 'rate_limited' | 'unknown';
  llama?:    'success' | 'failed' | 'rate_limited' | 'unknown';
  gemini?:   'success' | 'failed' | 'rate_limited' | 'unknown';
  failedCount: number;
  warningMessage: string | null;
}

export interface LiveSignalStatus {
  overallStatus: 'live' | 'partial' | 'heuristic' | 'unknown-company';
  liveSignalCount: number;
  heuristicSignalCount: number;
  agentFailures: string[];
  unknownCompany: boolean;
  stalenessWarning: string | null;
  dataAge: number;
  statusMessage: string;
  statusColor: 'green' | 'amber' | 'red' | 'gray';
  statusIcon: '🟢' | '🟡' | '🔴' | '⚪';
  confidenceNote: string;
}

// ── Main computation ──────────────────────────────────────────────────────────

export const computeLiveSignalStatus = (
  result: HybridResult,
): LiveSignalStatus => {
  const liveCount   = result.signalQuality?.liveSignals   ?? 0;
  const heuristicCount = result.signalQuality?.heuristicSignals ?? 0;
  const dataAge     = result.dataFreshness?.ageInDays ?? 0;
  const staleness   = result.dataFreshness?.stalenessWarning ?? null;
  const dbSource    = result.meta?.dbSource ?? '';
  const calcMode    = result.meta?.calculationMode ?? 'DB_FALLBACK';
  const hardFailures = result.signalQuality?.hardFailures ?? [];
  const confidenceCaps = result.signalQuality?.confidenceCapsApplied ?? [];

  // Detect unknown company
  const unknownCompany =
    dbSource.includes('Fallback - Unknown') ||
    dbSource.includes('Unknown Company') ||
    dbSource === 'Fallback';

  // Collect agent failures from agentStatus if available
  const agentStatus = result.agentStatus;
  const agentFailures: string[] = [];
  if (agentStatus) {
    if (agentStatus.gemma    && agentStatus.gemma    !== 'success') agentFailures.push('Gemma');
    if (agentStatus.deepseek && agentStatus.deepseek !== 'success') agentFailures.push('DeepSeek');
    if (agentStatus.llama    && agentStatus.llama    !== 'success') agentFailures.push('Llama');
    if (agentStatus.gemini   && agentStatus.gemini   !== 'success') agentFailures.push('Gemini');
  }

  // Determine overall status
  let overallStatus: LiveSignalStatus['overallStatus'];
  if (unknownCompany) {
    overallStatus = 'unknown-company';
  } else if (liveCount >= 4) {
    overallStatus = 'live';
  } else if (liveCount >= 1 || calcMode === 'ENCORE_LIVE') {
    overallStatus = 'partial';
  } else {
    overallStatus = 'heuristic';
  }

  // Status message and colors
  let statusMessage: string;
  let statusColor: LiveSignalStatus['statusColor'];
  let statusIcon: LiveSignalStatus['statusIcon'];

  switch (overallStatus) {
    case 'live':
      statusColor  = 'green';
      statusIcon   = '🟢';
      statusMessage = `Live Data Active — ${liveCount} real-time signals used (stock, news, financials)`;
      break;
    case 'partial':
      statusColor  = 'amber';
      statusIcon   = '🟡';
      statusMessage = `Partial Live — ${liveCount} live signal${liveCount !== 1 ? 's' : ''}, ${heuristicCount} from static database`;
      break;
    case 'unknown-company':
      statusColor  = 'gray';
      statusIcon   = '⚪';
      statusMessage = 'Unknown Company — industry averages used. Score accuracy ±30 pts';
      break;
    default:
      statusColor  = 'red';
      statusIcon   = '🔴';
      statusMessage = 'Heuristic Mode — no live APIs active. Score estimated from static database';
  }

  // Append agent failure warning
  if (agentFailures.length > 0) {
    statusMessage += ` · ${agentFailures.length} AI model${agentFailures.length > 1 ? 's' : ''} unavailable (${agentFailures.join(', ')})`;
    if (overallStatus === 'live') statusColor = 'amber';  // downgrade confidence
  }
  if (hardFailures.length > 0) {
    statusMessage += ` · ${hardFailures.length} critical live-signal failure${hardFailures.length > 1 ? 's' : ''}`;
    statusColor = 'red';
    statusIcon = '🔴';
  }

  // Confidence note
  let confidenceNote: string;
  const confidencePct = result.confidencePercent ?? 0;
  if (confidencePct >= 75) {
    confidenceNote = `${confidencePct}% confidence — strong multi-source agreement`;
  } else if (confidencePct >= 50) {
    confidenceNote = `${confidencePct}% confidence — moderate agreement`;
  } else {
    confidenceNote = `${confidencePct}% confidence — limited data, treat as estimate`;
  }
  if (confidenceCaps.length > 0) {
    confidenceNote += ` · ${confidenceCaps[0]}`;
  }

  return {
    overallStatus,
    liveSignalCount: liveCount,
    heuristicSignalCount: heuristicCount,
    agentFailures,
    unknownCompany,
    stalenessWarning: dataAge > 30 ? staleness : null,
    dataAge,
    statusMessage,
    statusColor,
    statusIcon,
    confidenceNote,
  };
};
