// blsMacroLiveLayer.ts — v40.0 DAG migration
// Reads live BLS/FRED macro snapshot from the legacy private channel.
// Output key: 'bls_macro_live' (distinct from 'macro_snapshot').

import { registerLayer, type AuditLayer } from '../layerRegistry';

const EMPTY = { isHeuristic: true, recessionProbability: 0.15, unemploymentRate: 4.2 } as const;

export const blsMacroLiveLayer: AuditLayer<'bls_macro_live'> = {
  id: 'bls_macro_live',
  dependencies: [],
  timeoutMs: 5_000,
  failureMode: 'degrade',
  async run(ctx) {
    const cd = ctx.companyData as any;
    return {
      isHeuristic: cd._macroIsHeuristic ?? true,
      recessionProbability: cd._recessionProbability ?? 0.15,
      unemploymentRate: cd._unemploymentRate ?? 4.2,
    };
  },
  fallback: () => EMPTY,
};

registerLayer(blsMacroLiveLayer as AuditLayer);
