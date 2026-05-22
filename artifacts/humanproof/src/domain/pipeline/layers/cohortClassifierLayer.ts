// cohortClassifierLayer.ts — DAG migration of the cohort classifier.
//
// Audit Issue #3 traced the legacy `macroRecessionSignal: 0.3` stub back
// to the lack of a DAG: the classifier needed a macro signal that didn't
// exist yet, so the pipeline hardcoded a guess. With the registry, the
// classifier can declare `macro_snapshot` as a dependency and the
// executor guarantees the producer ran first.
//
// Output:
//   ctx.read('cohort_class') → CohortClassification
//
// Consumers (will migrate next):
//   * The composite-formula layer reads cohortWeights from this.
//   * The conformal CI layer routes to per-cohort calibration scopes.
//   * Multiple intelligence-layer engines read primaryCohort for
//     archetype-specific narrative variants.

import { registerLayer, type AuditLayer } from '../layerRegistry';
import { classifyCohort, type CohortClassification } from '../../../services/cohortClassifier';

const FALLBACK_COHORT: CohortClassification = {
  primaryCohort: 'UNKNOWN',
  cohortConfidence: 0.40,
  cohortWeights:     { distress: 0.34, efficiency: 0.33, wave: 0.33 },
  cohortSoftWeights: { distress: 0.34, efficiency: 0.33, wave: 0.33 },
  cohortCalibrationNote: 'Classifier degraded — returned UNKNOWN baseline.',
  dominantSignals: [],
  recommendedLayerWeights: { L1: 0.22, L2: 0.20, L3: 0.20, L4: 0.20, L5: 0.18 },
  calibrationAUC: 0.81,
  roleEnrichedLabel: null,
};

export const cohortClassifierLayer: AuditLayer<'cohort_class'> = {
  id: 'cohort_class',
  // We depend on macro_snapshot so the WS5 cycle is broken at the type
  // level: the DAG executor guarantees macro is emitted before this
  // layer runs.
  dependencies: ['macro_snapshot'],
  timeoutMs: 200,
  failureMode: 'degrade',
  async run(ctx) {
    const macro = ctx.require('macro_snapshot');
    const cd = ctx.companyData;
    return classifyCohort({
      revenueGrowthYoY: cd.revenueGrowthYoY ?? null,
      stock90DayChange: cd.stock90DayChange ?? null,
      freeCashFlowMargin: null,
      aiInvestmentSignal: cd.aiInvestmentSignal ?? null,
      layoffRounds: cd.layoffRounds ?? 0,
      peerLayoffEventsLast90d: 0,
      macroRecessionSignal: macro.recessionSignal,
      cashRunwayMonths: null,
      industry: cd.industry ?? 'technology',
      isPublic: cd.isPublic ?? false,
    });
  },
  fallback: () => FALLBACK_COHORT,
};

registerLayer(cohortClassifierLayer as AuditLayer);
