// headcountVelocityLayer.ts — DAG migration of L36 headcount velocity.
//
// The v14 user-factor extensions carry the FTE / contractor / posting
// inputs the engine uses. Reading via Record<string, unknown> matches
// the existing computeWorkforceVelocity call site in auditDataPipeline.

import { registerLayer, type AuditLayer } from '../layerRegistry';
import {
  computeHeadcountVelocity,
  type HeadcountVelocityResult,
} from '../../../services/headcountVelocityEngine';

const NEUTRAL_RESULT: HeadcountVelocityResult = {
  headcountRiskScore: 0,
  headcountRiskLabel: 'Unknown',
  headcountTrend: 'UNKNOWN',
  headcountChange6MonthPct: null,
  headcountNote: 'Layer fell back — no headcount velocity computed.',
  contractorRatioRisk: 'UNKNOWN',
  contractorRatioPct: null,
  contractorTrend: 'UNKNOWN',
  contractorNote: '',
  postingVelocity: 'UNKNOWN',
  postingTrendNote: '',
  netHeadcountMomentum: 'UNKNOWN',
  momentumNote: '',
  earlyWarningActive: false,
  leadTimeEstimateDays: null,
  velocityActions: [],
  calibrationStatus: 'research_grounded',
} as unknown as HeadcountVelocityResult;

export const headcountVelocityLayer: AuditLayer<'headcount_velocity'> = {
  id: 'headcount_velocity',
  dependencies: [],
  timeoutMs: 100,
  failureMode: 'degrade',
  async run(ctx) {
    const uf = ctx.inputs.userFactors as unknown as Record<string, unknown>;
    return computeHeadcountVelocity({
      headcountChange6MonthPct: numOrNull(uf.headcountChange6MonthPct),
      contractorRatioPct:       numOrNull(uf.contractorRatioPct),
      contractorTrend:          (uf.contractorTrend as HeadcountVelocityResult['contractorTrend']) ?? 'UNKNOWN',
      jobPostingCurrentMonth:   numOrNull(uf.jobPostingCurrentMonth),
      jobPostingLastMonth:      numOrNull(uf.jobPostingLastMonth),
      hiringRateAnnualized:     numOrNull(uf.hiringRateAnnualized),
      voluntaryAttritionPct:    numOrNull(uf.voluntaryAttritionPct),
    });
  },
  fallback: () => NEUTRAL_RESULT,
};

function numOrNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

registerLayer(headcountVelocityLayer as AuditLayer);
