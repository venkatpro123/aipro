// peerContagionLayer.ts — DAG migration of the peer-contagion engine.
//
// The legacy invocation lived in auditDataPipeline.ts at step 22:
//
//   try {
//     const peerContagion = await computePeerContagionLive({
//       companyName: companyData.name,
//       industry: companyData.industry ?? 'technology',
//       currentScore: hybridResult.total,
//     });
//     (hybridResult as any).peerContagion = peerContagion;
//   } catch (e) { noteEngineFailure('peerContagion', e); }
//
// Porting it gives:
//   * Typed dependency on `core` so we can stop reading `hybridResult.total`
//     via an `as any` cast.
//   * Parallel execution alongside other independent layers — peer
//     contagion's I/O budget no longer blocks the linear pipeline.
//   * Structured fallback when breaking_news_events is unreachable.

import { registerLayer, type AuditLayer } from '../layerRegistry';
import { computePeerContagionLive } from '../../../services/peerContagionLiveAdapter';
import type { PeerContagionResult } from '../../../services/peerContagionEngine';

const FALLBACK_RESULT: PeerContagionResult = {
  waveIntensity: 'NONE',
  propagationRisk: 'NEGLIGIBLE',
  contagionScore: 0,
  scoreAmplifier: 1.0,
  affectedPeers: [],
  totalPeersMonitored: 0,
  directCompetitorCuts: 0,
  adjacentPeerCuts: 0,
  waveStartDate: null,
  estimatedPropagationDays: null,
  waveNarrative: 'Peer contagion layer fell back — no data available.',
  actionImplication: 'Monitor sector news manually.',
  calibrationStatus: 'documented_wave_analysis',
};

export const peerContagionLayer: AuditLayer<'peer_contagion'> = {
  id: 'peer_contagion',
  // Depends on `macro_snapshot` (a DAG-registered layer).
  // Reads `core` which is emitted by the legacy engine before the DAG
  // runs — declare as external so the registry validator doesn't reject
  // it. When the scoring layer itself migrates into the DAG, move `core`
  // from externalDependencies to dependencies.
  dependencies: ['macro_snapshot'],
  externalDependencies: ['core'],
  // Hits breaking_news_events + curated_layoff_events via realtime
  // adapter. Generous budget; typical resolution is < 2s.
  timeoutMs: 6000,
  failureMode: 'degrade',
  // Tag so heavy I/O layers can be serialised in tests if needed.
  parallelGroup: 'live_io',
  async run(ctx) {
    const core = ctx.require('core');
    return computePeerContagionLive({
      companyName: ctx.companyData.name,
      industry: ctx.companyData.industry ?? 'technology',
      currentScore: core.total,
    });
  },
  fallback: () => FALLBACK_RESULT,
};

registerLayer(peerContagionLayer as AuditLayer);
