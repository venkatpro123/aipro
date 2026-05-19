// warnSignalLayer.ts — v40.0 DAG migration
import { registerLayer, type AuditLayer } from '../layerRegistry';
import { computeWARNSignal, type WARNSignal } from '../../../services/warnActService';

const EMPTY_WARN: WARNSignal = {
  hasActiveWARN: false,
  warnFilings: [],
  daysUntilLayoff: null,
  totalAffectedCount: 0,
  affectedLocations: [],
  warnRiskScore: 0,
  warnRiskLabel: 'No WARN filings',
  isGroundTruth: false,
  calibrationNote: 'ground_truth when hasActiveWARN=true',
};

export const warnSignalLayer: AuditLayer<'warn_signal'> = {
  id: 'warn_signal',
  dependencies: [],
  timeoutMs: 6_000,
  failureMode: 'degrade',
  async run(ctx) {
    const companyName = ctx.inputs.companyName ?? '';
    const legacyFilings = (ctx.companyData as any)._warnFilings ?? [];
    return computeWARNSignal(companyName, legacyFilings);
  },
  fallback: () => EMPTY_WARN,
};

registerLayer(warnSignalLayer as AuditLayer);
