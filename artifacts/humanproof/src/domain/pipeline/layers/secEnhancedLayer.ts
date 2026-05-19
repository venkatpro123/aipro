// secEnhancedLayer.ts — v40.0 DAG migration
import { registerLayer, type AuditLayer } from '../layerRegistry';
import { computeSECEnhancedRisk, type SECEnhancedRiskResult } from '../../../services/secEnhancedService';

export const secEnhancedLayer: AuditLayer<'sec_enhanced'> = {
  id: 'sec_enhanced',
  dependencies: [],
  timeoutMs: 8_000,
  failureMode: 'degrade',
  async run(ctx) {
    const signals = (ctx.companyData as any)._secSignals;
    if (!signals) return null as unknown as SECEnhancedRiskResult;
    return computeSECEnhancedRisk(signals);
  },
  fallback: () => null as unknown as SECEnhancedRiskResult,
};

registerLayer(secEnhancedLayer as AuditLayer);
