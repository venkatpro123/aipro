// workforceVelocityLayer.ts — v40.0 DAG migration
import { registerLayer, type AuditLayer } from '../layerRegistry';
import { computeWorkforceVelocity } from '../../../services/workforceVelocityEngine';

export const workforceVelocityLayer: AuditLayer<'workforce_velocity'> = {
  id: 'workforce_velocity',
  dependencies: [],
  timeoutMs: 6_000,
  failureMode: 'degrade',
  async run(ctx) {
    const cd = ctx.companyData as any;
    const inputs = {
      headcount: {
        headcountChange6MonthPct: cd._headcountChange6MonthPct ?? null,
        contractorRatioPct: cd._contractorRatioPct ?? null,
        jobPostingCurrentMonth: cd._jobPostingCurrentMonth ?? null,
        jobPostingLastMonth: cd._jobPostingLastMonth ?? null,
      },
      sentimentHistory: cd._glassdoorHistory ?? [],
    };
    const result = computeWorkforceVelocity(inputs);
    return {
      headcountChange: result.headcount?.headcountRiskScore ?? 0,
      velocityScore: result.workforceRiskScore ?? 50,
      trend: result.direction ?? 'UNKNOWN',
    };
  },
  fallback: () => ({ headcountChange: 0, velocityScore: 50, trend: 'UNKNOWN' }) as const,
};

registerLayer(workforceVelocityLayer as AuditLayer);
