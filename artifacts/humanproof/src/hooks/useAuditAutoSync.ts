// useAuditAutoSync.ts
// Auto-saves every completed audit to Supabase without requiring the user to
// click "Save Score". Watches LayoffContext.scoreResult and fires once per
// completed calculation (keyed by scoreRequestId to prevent re-saves on
// re-renders or state updates that don't represent a new audit).

import { useEffect, useRef } from 'react';
import { useLayoff } from '../context/LayoffContext';
import { saveAuditSession } from '../services/auditSyncService';
import type { HybridResult } from '../types/hybridResult';

export function useAuditAutoSync(): void {
  const { state } = useLayoff();
  const lastSyncedRequestId = useRef<number | null>(null);

  useEffect(() => {
    const { scoreResult, companyName, roleTitle, department, oracleKey, scoreRequestId } = state;

    // Guard: only proceed when a real result exists
    if (!scoreResult || !companyName || !roleTitle) return;

    // Guard: only fire once per calculation cycle
    if (scoreRequestId != null && scoreRequestId === lastSyncedRequestId.current) return;

    // Guard: ensure it's a HybridResult (has `.total`) not a legacy ScoreResult
    const hr = scoreResult as HybridResult;
    if (typeof hr.total !== 'number') return;

    // Mark this request as synced before the async call to prevent duplicate
    // fires if the component re-renders between effect invocations.
    lastSyncedRequestId.current = scoreRequestId ?? -1;

    void saveAuditSession({
      companyName,
      roleTitle,
      department:    department  ?? '',
      oracleKey:     oracleKey   ?? null,
      industryKey:   ((hr as unknown) as Record<string, unknown>).industryKey   as string | null ?? null,
      workTypeKey:   ((hr as unknown) as Record<string, unknown>).workTypeKey   as string | null ?? null,
      countryKey:    ((hr as unknown) as Record<string, unknown>).countryKey    as string | null ?? null,
      hybridResult:  hr,
      dataQuality:   'live',
      // Stable dedup key: requestId + company + role ensure the same audit
      // run never creates two rows even if the component mounts twice (StrictMode).
      clientId: `${scoreRequestId ?? Date.now()}-${companyName.toLowerCase().replace(/\s+/g, '_')}-${roleTitle.toLowerCase().replace(/\s+/g, '_')}`,
    });
  }, [state.scoreResult, state.scoreRequestId]);
}
