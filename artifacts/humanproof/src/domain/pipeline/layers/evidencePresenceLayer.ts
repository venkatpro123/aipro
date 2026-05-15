// evidencePresenceLayer.ts — DAG migration of the evidence presence gate.
//
// Audit Issue #23 was that the legacy quorum model treated "no evidence
// found after the timeout" as quorum-satisfied for that signal class,
// then rolled that satisfaction into the confidence model — producing
// high confidence for completely unknown companies. The evidence
// presence gate (built earlier in WS4) fixes that classification but
// was wired through `(companyData as any)._evidencePresence`.
//
// This layer ports the construction into the DAG so:
//   * The output is a typed `EvidencePresenceReport` consumers can
//     ctx.read('evidence_presence').
//   * The confidence model can declare it as a dependency once that
//     layer migrates (today the model reads via the legacy private
//     channel).
//
// Note: the input data (per-class quorum status) comes from the live
// data acquisition phase which has not yet been ported to the DAG. For
// now this layer reads the QuorumStatus off `(companyData as any)._liveQuorumStatus`
// — exactly the same source the legacy confidence model uses, so no
// behaviour change. Once liveDataService migrates, this layer's input
// becomes a typed dependency.

import { registerLayer, type AuditLayer } from '../layerRegistry';
import { buildPresenceReport, type ClassEvidenceInput, type EvidencePresenceReport } from '../../../services/evidencePresenceGate';

const EMPTY_REPORT: EvidencePresenceReport = {
  byClass: {
    workforce: { class: 'workforce', state: 'unresolved', positiveSources: 0, exhaustedSources: 0, highestPositiveTier: null },
    layoffs:   { class: 'layoffs',   state: 'unresolved', positiveSources: 0, exhaustedSources: 0, highestPositiveTier: null },
    financial: { class: 'financial', state: 'unresolved', positiveSources: 0, exhaustedSources: 0, highestPositiveTier: null },
    hiring:    { class: 'hiring',    state: 'unresolved', positiveSources: 0, exhaustedSources: 0, highestPositiveTier: null },
  },
  positiveCount: 0,
  absenceCount: 0,
  unresolvedCount: 4,
  hasHighAuthorityPositive: false,
};

interface LegacyQuorumStatus {
  perClass?: Record<string, {
    signalClass: 'workforce' | 'layoffs' | 'financial' | 'hiring';
    sourcesReached: string[];
    sourcesPending: string[];
    satisfied: boolean;
    satisfiedByAbsence: boolean;
  }>;
}

export const evidencePresenceLayer: AuditLayer<'evidence_presence'> = {
  id: 'evidence_presence',
  dependencies: [],
  // Pure compute — synthesizes a report from already-collected data.
  timeoutMs: 100,
  failureMode: 'degrade',
  async run(ctx) {
    const quorum = (ctx.companyData as Readonly<Record<string, unknown>>)._liveQuorumStatus as LegacyQuorumStatus | undefined;
    if (!quorum?.perClass) {
      // No live quorum data — the legacy private channel is empty for
      // audits that didn't go through the v32 quorum-gated pipeline.
      // Return the unresolved fallback so consumers see a consistent
      // typed report rather than null.
      return EMPTY_REPORT;
    }

    const inputs: ClassEvidenceInput[] = (Object.values(quorum.perClass) as Array<{
      signalClass: 'workforce' | 'layoffs' | 'financial' | 'hiring';
      sourcesReached: string[];
      sourcesPending: string[];
      satisfied: boolean;
      satisfiedByAbsence: boolean;
    }>).map((c) => ({
      class: c.signalClass,
      positiveSources: c.satisfiedByAbsence ? 0 : c.sourcesReached.length,
      exhaustedSources: c.satisfiedByAbsence ? c.sourcesReached.length : 0,
      // The legacy quorum spec uses min=1 for financial/hiring and min=2
      // for workforce/layoffs. The exact value isn't critical here —
      // buildPresenceReport's classifier only checks ≥ min.
      minRequired: c.signalClass === 'workforce' || c.signalClass === 'layoffs' ? 2 : 1,
      absenceQuorumReached: c.satisfiedByAbsence,
      highestPositiveTier: null,
    }));
    return buildPresenceReport(inputs);
  },
  fallback: () => EMPTY_REPORT,
};

registerLayer(evidencePresenceLayer as AuditLayer);
