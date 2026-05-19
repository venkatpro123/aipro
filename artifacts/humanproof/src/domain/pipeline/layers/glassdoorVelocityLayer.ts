// glassdoorVelocityLayer.ts — v40.0 DAG migration
import { registerLayer, type AuditLayer } from '../layerRegistry';
import { computeGlassdoorVelocity, type GlassdoorVelocityResult } from '../../../services/glassdoorVelocityEngine';

export const glassdoorVelocityLayer: AuditLayer<'glassdoor_velocity'> = {
  id: 'glassdoor_velocity',
  dependencies: [],
  timeoutMs: 8_000,
  failureMode: 'degrade',
  async run(ctx) {
    const history = (ctx.companyData as any)._glassdoorHistory ?? [];
    if (history.length === 0) return null as unknown as GlassdoorVelocityResult;
    return computeGlassdoorVelocity(history);
  },
  fallback: () => null as unknown as GlassdoorVelocityResult,
};

registerLayer(glassdoorVelocityLayer as AuditLayer);
