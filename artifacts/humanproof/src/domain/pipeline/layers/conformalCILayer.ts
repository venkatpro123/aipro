// conformalCILayer.ts — DAG migration of the conformal CI computation.
//
// Replaces the post-engine try/catch block in auditDataPipeline.ts that
// previously stashed the bundle on `(companyData as any)._conformalBundle`.
//
// Dependencies:
//   * cohort_class — needed so the conformal lookup routes to the
//     per-cohort calibration scope (DISTRESS / EFFICIENCY / WAVE / GLOBAL).
//   * core         — needed for the point estimate that the CI is built
//     around. (Populated by the legacy engine for now; once the scoring
//     layers migrate, the dependency arrow flips to a real DAG edge.)
//
// Output:
//   ctx.read('conformal_ci') → ConformalBundle

import { registerLayer, type AuditLayer } from '../layerRegistry';
import { computeConformalCI, type ConformalBundle, type ConformalCohort } from '../../../services/conformalCI';

const NO_DATA_BUNDLE: ConformalBundle = {
  point: 50,
  intervals: [],
  source: 'no_data',
};

export const conformalCILayer: AuditLayer<'conformal_ci'> = {
  id: 'conformal_ci',
  dependencies: ['cohort_class'],
  // `core` is emitted by the legacy engine before the DAG runs. Move
  // into `dependencies` once the scoring layer migrates into the DAG.
  externalDependencies: ['core'],
  // The conformal lookup hits Supabase for the per-cohort calibration set.
  // 4s is generous; typical resolution is <500ms with caching.
  timeoutMs: 4000,
  failureMode: 'degrade',
  async run(ctx) {
    const cohort = ctx.read('cohort_class');
    const core = ctx.require('core');
    const scope: ConformalCohort = (cohort?.primaryCohort ?? 'GLOBAL') as ConformalCohort;
    return computeConformalCI(core.total, { cohort: scope });
  },
  fallback: () => NO_DATA_BUNDLE,
};

registerLayer(conformalCILayer as AuditLayer);
