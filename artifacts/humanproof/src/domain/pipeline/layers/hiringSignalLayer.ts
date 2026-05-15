// hiringSignalLayer.ts — DAG migration of L15 hiring signal.
//
// Reads the legacy `_hiringPostingTrend` / `_estimatedRoleOpenings` /
// `_departmentHiringStatus` private fields from companyData. Those are
// populated by the live data acquisition stage which is not yet ported
// to the DAG. Once liveDataService migrates, this layer will declare
// a typed dependency on the new live-data layer's output.

import { registerLayer, type AuditLayer } from '../layerRegistry';
import {
  analyzeHiringSignals,
  deriveHiringSignalInputs,
  type HiringSignalResult,
} from '../../../services/hiringSignalAnalyzer';

const NEUTRAL_RESULT: HiringSignalResult = {
  overallTrend: 'unknown',
  riskLevel: 'LOW',
  riskPattern: 'NO_SIGNAL',
  scoreAdjustment: 0,
  userDepartmentTrend: 'unknown',
  userDeptIsFrozen: false,
  frozenDepartments: [],
  signalConfidence: 0,
  interpretation: 'Layer fell back — no hiring signal computed.',
  estimatedAnnouncementDays: null,
  actions: [],
};

export const hiringSignalLayer: AuditLayer<'hiring_signal'> = {
  id: 'hiring_signal',
  dependencies: [],
  // Pure compute. ~150ms budget covers deep object traversal in
  // pathological _departmentHiringStatus cases.
  timeoutMs: 150,
  failureMode: 'degrade',
  async run(ctx) {
    const inputs = deriveHiringSignalInputs(
      ctx.companyData,
      ctx.inputs.oracleKey,
      ctx.inputs.department,
    );
    return analyzeHiringSignals(inputs);
  },
  fallback: () => NEUTRAL_RESULT,
};

registerLayer(hiringSignalLayer as AuditLayer);
