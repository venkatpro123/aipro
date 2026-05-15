// macroSnapshotLayer.ts — POC for the new pipeline architecture
//
// Proves the DAG registry + AuditContext pattern by porting the simplest
// existing layer (macroSnapshot read) into the new shape. Subsequent
// layers follow this template.
//
// What changed vs the legacy invocation:
//   * Before: auditDataPipeline.ts called `getMacroRecessionSignalForCohortClassifier()`
//     inline and stashed the result implicitly into the cohort classifier call.
//   * After:  `macro_snapshot` is an explicit typed output of this layer.
//     Downstream layers (cohort classifier, peer contagion) declare it as
//     a dependency and read with `ctx.require('macro_snapshot')`.
//
// The DAG executor handles try/catch, timeout, fallback, and structured
// logging — this file contains only the domain call.

import { registerLayer, type AuditLayer } from '../layerRegistry';
import { readMacroSnapshot, type MacroSnapshot } from '../../../services/macroSnapshot';

// Bootstrap snapshot used when the live fetch has never completed.
// Matches the BOOTSTRAP_SNAPSHOT constant in macroSnapshot.ts but is
// embedded here so the layer fallback is self-contained.
const FALLBACK_SNAPSHOT: MacroSnapshot = {
  recessionSignal: 0.30,
  components: {
    unemploymentTrend: 0,
    jolts_openings_to_hires: 1.1,
    leading_index_yoy: 0,
    consumer_sentiment_z: 0,
  },
  observedAt: new Date(0).toISOString(),
  freshness: 'stale',
  source: 'bootstrap',
};

export const macroSnapshotLayer: AuditLayer<'macro_snapshot'> = {
  id: 'macro_snapshot',
  dependencies: [],
  // Macro snapshot is an in-memory read; 250ms is far more than it needs.
  // Keeping the budget small so a regression that introduces a synchronous
  // fetch is caught quickly.
  timeoutMs: 250,
  failureMode: 'degrade',
  async run(ctx) {
    const snapshot = readMacroSnapshot();
    ctx.logger.debug('macro_snapshot.read', {
      source: snapshot.source,
      freshness: snapshot.freshness,
      signal: snapshot.recessionSignal,
    });
    return snapshot;
  },
  fallback: () => FALLBACK_SNAPSHOT,
};

// Self-registration — imported by domain/pipeline/layers/index.ts.
registerLayer(macroSnapshotLayer as AuditLayer);
