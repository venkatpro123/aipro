// acquisitionPremiumLayer.ts — DAG migration of the M&A premium detector.
//
// The legacy invocation lived inside auditDataPipeline's post-engine
// block and read userFactors via an `as unknown as Record<string, unknown>`
// cast. Porting it into the DAG keeps the typed input but moves the
// orchestration concerns (try/catch, fallback shape) out of the call site.
//
// Output:
//   ctx.read('acquisition_premium') → AcquisitionPremiumSignal

import { registerLayer, type AuditLayer } from '../layerRegistry';
import {
  detectAcquisitionPremium,
  type AcquisitionPremiumSignal,
} from '../../../services/mergerAcquisitionRiskEngine';

const NEUTRAL_PREMIUM: AcquisitionPremiumSignal = {
  detected: false,
  correctedStock90DayChange: null,
  rationale: '',
};

export const acquisitionPremiumLayer: AuditLayer<'acquisition_premium'> = {
  id: 'acquisition_premium',
  dependencies: [],
  // Pure synchronous compute — generous timeout in case the function ever
  // grows to consume an external M&A feed.
  timeoutMs: 500,
  failureMode: 'degrade',
  async run(ctx) {
    const uf = ctx.inputs.userFactors as unknown as Record<string, unknown> | undefined;
    const maEventType = (uf?.maEventType ?? 'NONE') as Parameters<typeof detectAcquisitionPremium>[0]['maEventType'];
    return detectAcquisitionPremium({
      maEventType,
      monthsPostClose:
        typeof uf?.maMonthsPostClose === 'number' ? (uf.maMonthsPostClose as number) : undefined,
      isAcquiredEmployee:
        typeof uf?.isAcquiredEmployee === 'boolean' ? (uf.isAcquiredEmployee as boolean) : true,
      stock90DayChange: ctx.companyData.stock90DayChange ?? null,
    });
  },
  fallback: () => NEUTRAL_PREMIUM,
};

registerLayer(acquisitionPremiumLayer as AuditLayer);
