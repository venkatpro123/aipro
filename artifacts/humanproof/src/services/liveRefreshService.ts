// liveRefreshService.ts
// Background refresh: re-fetches live signals every 30 minutes while the
// audit result is on screen, so long-running sessions don't serve stale data.

import { fetchAuditData, AuditInputs } from './auditDataPipeline';
import { HybridResult } from '../types/hybridResult';

const REFRESH_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

export interface BackgroundRefreshResult {
  result: HybridResult;
  refreshedAt: string;
}

/**
 * Start background refresh for an active audit session.
 * Polls every 30 minutes and calls `onRefresh` with fresh data.
 * Returns a cleanup function — call it on component unmount.
 */
export const startBackgroundRefresh = (
  inputs: AuditInputs,
  onRefresh: (fresh: BackgroundRefreshResult) => void,
): () => void => {
  let cancelled = false;

  const poll = async () => {
    if (cancelled) return;
    try {
      const { result } = await fetchAuditData(inputs);
      if (!cancelled) {
        onRefresh({ result, refreshedAt: new Date().toISOString() });
      }
    } catch {
      // Non-fatal — background refresh failure should never surface to the user
    }
  };

  const timer = setInterval(poll, REFRESH_INTERVAL_MS);

  return () => {
    cancelled = true;
    clearInterval(timer);
  };
};
