// layerConsolidationManifest.ts — WS7
//
// Declarative manifest of layer pairs/groups slated for consolidation.
// `workforceVelocityEngine.ts` is the prototype merge (L15 + L36); the
// remaining entries here document the intended consolidations so they
// can be executed once the prototype's shadow validation completes.
//
// This module is INTENTIONALLY NOT IMPORTED BY THE PIPELINE. It serves
// as:
//   1. A machine-readable record so the CalibrationPanel and audit
//      transparency UI can surface "engine X has been deprecated in
//      favour of engine Y".
//   2. A lint target for follow-up consolidation work: a test in
//      v35Foundations.test.ts can assert that every listed candidate
//      pair either has a consolidated successor in
//      CONSOLIDATED_LAYERS or is still on the deferred list. This
//      prevents accidental untracked layer additions.
//   3. Audit trail: each entry records the redundancy diagnosis from
//      the v34 audit so future engineers see WHY two layers were
//      flagged as overlapping rather than having to rediscover it.
//
// Status legend:
//   PROTOTYPE   — prototype merge module exists; pipeline integration
//                 follows once shadow validation completes
//   DEFERRED    — diagnosis recorded; merge module not yet built
//   COMPLETED   — successor in production; legacy engines deletable

export type ConsolidationStatus = 'PROTOTYPE' | 'DEFERRED' | 'COMPLETED';

export interface LayerConsolidationEntry {
  /** Identifier used in flag config / telemetry / UI. */
  id: string;
  /** Status of this consolidation effort. */
  status: ConsolidationStatus;
  /** Layer numbers being merged (1-based per the v34 numbering). */
  layerNumbers: number[];
  /** Source files of the redundant engines. */
  redundantEngineFiles: string[];
  /** File path of the unified successor (when status !== DEFERRED). */
  successorFile: string | null;
  /** v34 audit diagnosis explaining the redundancy. */
  auditDiagnosis: string;
  /** Specific overlapping signals or outputs. */
  overlap: string[];
  /** Flag that gates the consolidated path. */
  controllingFlag: string;
  /** Notes / open questions / migration concerns. */
  notes: string;
}

export const LAYER_CONSOLIDATION_MANIFEST: LayerConsolidationEntry[] = [
  // ── Completed prototype ──────────────────────────────────────────────────
  {
    id: 'workforce_velocity',
    status: 'PROTOTYPE',
    layerNumbers: [15, 36],
    redundantEngineFiles: [
      'services/headcountVelocityEngine.ts',
      'services/glassdoorVelocityEngine.ts',
    ],
    successorFile: 'services/workforceVelocityEngine.ts',
    auditDiagnosis:
      'Both engines emit independent "workforce direction" verdicts that the UI '
      + 'rendered as separate panels. Both read overlapping LinkedIn + Glassdoor '
      + 'upstreams. Combined output is confusing rather than additive.',
    overlap: [
      'workforce contraction direction',
      'sentiment-vs-headcount divergence',
      'leading-indicator vs lagging-indicator framing',
    ],
    controllingFlag: 'ws7_layer_consolidation',
    notes:
      'Prototype delivered; legacy engines retained behind passthrough mode '
      + 'until shadow validation confirms unified output matches both legacy '
      + 'panels for >=200 sample audits.',
  },

  // ── Deferred ─────────────────────────────────────────────────────────────
  {
    id: 'signal_contradiction_and_calibration',
    status: 'DEFERRED',
    layerNumbers: [14, 33],
    redundantEngineFiles: [
      'services/signalContradictionEngine.ts',
      'services/modelCalibrationEngine.ts',
    ],
    successorFile: null,
    auditDiagnosis:
      'modelCalibrationEngine internally re-runs disagreement detection over '
      + 'the same signal vectors that signalContradictionEngine has already '
      + 'classified. The "model self-disagreement" metric and the "signal-'
      + 'level contradiction" metric collapse to the same population under '
      + 'representative inputs.',
    overlap: [
      'cross-signal disagreement detection',
      'severity classification of disagreements',
      'transparency-panel rationale lines',
    ],
    controllingFlag: 'ws7_layer_consolidation',
    notes:
      'Keep signalContradictionEngine; fold modelCalibrationEngine\'s residual '
      + 'logic (calibration-versus-prediction gap) into a new namespace inside '
      + 'signalContradictionEngine.',
  },
  {
    id: 'financial_runway',
    status: 'DEFERRED',
    layerNumbers: [6, 45],
    redundantEngineFiles: [
      'services/financialRunwayIntelligence.ts',
      'services/financialRunwayService.ts',
    ],
    successorFile: null,
    auditDiagnosis:
      'Two financial runway engines: the older "intelligence" version uses '
      + 'a rule-based fallback; the newer service queries SEC EDGAR for FCF '
      + 'directly. Both compute the same "months of runway remaining" output '
      + 'with different precision. The audit pipeline currently invokes both '
      + 'and discards the rule-based output silently.',
    overlap: [
      'cash runway in months',
      'burn rate categorisation',
      'distress threshold flagging',
    ],
    controllingFlag: 'ws7_layer_consolidation',
    notes:
      'Keep financialRunwayService (SEC-grounded). Delete financialRunway'
      + 'Intelligence after a follow-up audit confirms no other engine reads '
      + 'its specific output shape.',
  },
  {
    id: 'department_and_manager_risk',
    status: 'DEFERRED',
    layerNumbers: [7, 24],
    redundantEngineFiles: [
      'services/departmentRiskEngine.ts',
      'services/managerRiskEngine.ts',
    ],
    successorFile: null,
    auditDiagnosis:
      'Both engines model org-level risk at different granularities. '
      + 'departmentRiskEngine groups by function; managerRiskEngine groups by '
      + 'direct-manager risk profile. Their outputs are highly correlated '
      + 'because a manager\'s risk is largely a function of their department.',
    overlap: [
      'org-unit-level layoff probability',
      'reorg signal interpretation',
      'span-of-control risk amplification',
    ],
    controllingFlag: 'ws7_layer_consolidation',
    notes:
      'Keep departmentRiskEngine; fold manager-specific signals as an '
      + 'optional sub-output (managerRiskOverlay) so users with manager-'
      + 'change events still see that nuance.',
  },
  {
    id: 'd5_archetype_reintroduction',
    status: 'DEFERRED',
    layerNumbers: [],
    redundantEngineFiles: [
      'services/strategyArchetypes.ts',
    ],
    successorFile: null,
    auditDiagnosis:
      'D5_countryContext has weight=0 in the composite formula (PPP is fully '
      + 'captured in L1). The sector_wave archetype delta reintroduces a '
      + 'non-zero D5 weight via blend, partially recreating the PPP double-'
      + 'count the architecture explicitly eliminated.',
    overlap: ['PPP / country adjustment paths'],
    controllingFlag: 'ws7_layer_consolidation',
    notes:
      'When ws7_layer_consolidation flips to production, remove the '
      + 'D5_countryContext entry from sector_wave\'s ARCHETYPE_WEIGHT_'
      + 'OVERRIDES. Move sector-wave influence to L1_directFinancial '
      + 'delta instead.',
  },
];

/**
 * Diagnostic summary for the CalibrationPanel admin UI. Returns a short
 * one-line description per entry for tabular display.
 */
export function summarizeConsolidationStatus(): Array<{ id: string; status: string; line: string }> {
  return LAYER_CONSOLIDATION_MANIFEST.map((e) => ({
    id: e.id,
    status: e.status,
    line: `[${e.status}] ${e.id} (L${e.layerNumbers.join('+L') || '—'}): ${
      e.successorFile ? `→ ${e.successorFile.split('/').pop()}` : 'no successor yet'
    }`,
  }));
}

/**
 * Test helper: verifies that no entry is left in DEFERRED status without
 * an accompanying audit diagnosis. This is the lint target referenced in
 * the module header.
 */
export function validateManifest(): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  for (const e of LAYER_CONSOLIDATION_MANIFEST) {
    if (e.status === 'DEFERRED' && (!e.auditDiagnosis || e.auditDiagnosis.length < 40)) {
      issues.push(`${e.id}: DEFERRED entry missing or short auditDiagnosis`);
    }
    if (e.status !== 'DEFERRED' && !e.successorFile) {
      issues.push(`${e.id}: ${e.status} entry has null successorFile`);
    }
  }
  return { ok: issues.length === 0, issues };
}
