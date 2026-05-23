// liveRefreshService.ts
// Background refresh: re-fetches live signals while the audit result is on screen.
//
// Refresh cadence:
//   Known DB company:    30 minutes — data rarely changes faster than this
//   Unknown company:     10 minutes — unknown companies rely on live scraped signals;
//                        faster refresh means Wikipedia / career-page / news signals
//                        are more likely to arrive on a subsequent pass even if the
//                        first scrape timed out due to cold-start latency.

import { fetchAuditData, AuditInputs } from './auditDataPipeline';
import { HybridResult } from '../types/hybridResult';

const REFRESH_INTERVAL_KNOWN_MS   = 30 * 60 * 1000; // 30 minutes — DB company
const REFRESH_INTERVAL_UNKNOWN_MS = 10 * 60 * 1000; // 10 minutes — unknown company

export interface BackgroundRefreshResult {
  result: HybridResult;
  refreshedAt: string;
  // Section 13.2: scoreRequestId captured from LayoffContext at the moment
  // startBackgroundRefresh was called. The subscriber compares this against
  // the context's current scoreRequestId to detect stale results — if the
  // user switched companies or triggered a new calculation since this refresh
  // was initiated, the IDs will differ and the result must be discarded.
  requestId: number;
}

/**
 * Start background refresh for an active audit session.
 * Returns a cleanup function — call it on component unmount.
 *
 * @param inputs             Audit inputs (company name, role, factors)
 * @param onRefresh          Called with fresh data after each successful refresh
 * @param isUnknown          True when the company was not found in the database.
 *                           Shortens the refresh interval to 10 minutes so scraped
 *                           signals (Wikipedia, career page, news) are retried sooner.
 * @param capturedRequestId  The scoreRequestId from LayoffContext at the moment this
 *                           refresh session was initiated. Embedded in every result
 *                           so the subscriber can detect stale results — if a new
 *                           calculation started (bumping scoreRequestId) after this
 *                           refresh was initiated, the IDs will differ and the result
 *                           should be discarded. See Section 13.2.
 */
// Minimum score delta to push a background refresh result to the UI.
// Below this threshold the pipeline ran but produced no meaningful change —
// avoid re-rendering the dashboard (and suppressing re-attaching the
// fire-and-forget intelligenceBrief) for a 0pt score move.
const SCORE_CHANGE_THRESHOLD = 1;

export const startBackgroundRefresh = (
  inputs: AuditInputs,
  onRefresh: (fresh: BackgroundRefreshResult) => void,
  isUnknown?: boolean,
  capturedRequestId = 0,
  initialScore?: number,
): () => void => {
  let cancelled = false;
  let lastScore: number | null = initialScore ?? null;
  const intervalMs = isUnknown
    ? REFRESH_INTERVAL_UNKNOWN_MS
    : REFRESH_INTERVAL_KNOWN_MS;

  const poll = async () => {
    if (cancelled) return;
    try {
      const { result } = await fetchAuditData(inputs);
      if (cancelled) return;
      // Skip UI update when score is unchanged — avoids unnecessary re-renders
      // and suppresses the fire-and-forget intelligenceBrief DB query when
      // nothing material has changed. The LLM brief cache (24h TTL, 5pt drift
      // threshold) is a separate gate that handles brief regeneration correctly.
      const newScore = typeof result.total === 'number' ? result.total : null;
      const scoreDelta = newScore != null && lastScore != null
        ? Math.abs(newScore - lastScore)
        : Infinity; // first result after initial → always push
      if (scoreDelta >= SCORE_CHANGE_THRESHOLD) {
        lastScore = newScore;
        onRefresh({ result, refreshedAt: new Date().toISOString(), requestId: capturedRequestId });
      }
    } catch {
      // Non-fatal — background refresh failure should never surface to the user
    }
  };

  const timer = setInterval(poll, intervalMs);

  return () => {
    cancelled = true;
    clearInterval(timer);
  };
};
