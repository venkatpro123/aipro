// stealthLayoffLayer.ts — DAG migration of the stealth-layoff detector.
//
// The legacy invocation lived inside auditDataPipeline's post-engine
// try/catch block. Porting it into the DAG gives:
//
//   * Explicit dependency declaration — none today, but when we add an
//     `announced_rounds` layer later, this will declare it.
//   * Automatic timeout enforcement (the DB query has a budget).
//   * Structured fallback instead of silent NO_SIGNAL return.
//
// Output:
//   ctx.read('stealth_layoff') → StealthSignal
//
// Flag gating remains inside detectStealthLayoff itself, so when
// ws3_stealth_layoff_detector is off the layer's run() returns the
// neutral NO_DATA shape without performing any DB I/O.

import { registerLayer, type AuditLayer } from '../layerRegistry';
import { detectStealthLayoff, type StealthSignal } from '../../../services/stealthLayoffDetector';

const NO_DATA_SIGNAL: StealthSignal = {
  severity: 'NO_DATA',
  flagged: false,
  pctChange6mo: null,
  recentEmployeeCount: null,
  priorEmployeeCount: null,
  scoreFloorBoost: 0,
  confidence: 0,
  rationale: 'stealth detector layer fell back',
  hasAnnouncedRound: false,
  dataSource: null,
};

export const stealthLayoffLayer: AuditLayer<'stealth_layoff'> = {
  id: 'stealth_layoff',
  dependencies: [],
  // 3s budget — the detector hits workforce_snapshots + breaking_news_events.
  timeoutMs: 3000,
  failureMode: 'degrade',
  async run(ctx) {
    const cd = ctx.companyData as Readonly<{ canonicalName?: string; name?: string }>;
    const canonical = cd.canonicalName ?? cd.name ?? ctx.inputs.companyName;
    return detectStealthLayoff({
      companyCanonicalName: canonical,
      companyDisplayName: cd.name,
    });
  },
  fallback: () => NO_DATA_SIGNAL,
};

registerLayer(stealthLayoffLayer as AuditLayer);
