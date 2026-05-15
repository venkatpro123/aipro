// employeeSentimentLayer.ts — DAG migration of L34 employee sentiment.
//
// Inputs derived from v14 user-factor extensions on the audit form
// (glassdoor CEO approval delta, culture score delta, attrition rate,
// blind sentiment label). All-null inputs produce an UNKNOWN result
// that doesn't impact downstream scoring.

import { registerLayer, type AuditLayer } from '../layerRegistry';
import {
  computeEmployeeSentiment,
  type EmployeeSentimentResult,
} from '../../../services/employeeSentimentEngine';

const NEUTRAL_RESULT: EmployeeSentimentResult = {
  sentimentRiskScore: 0,
  sentimentHealthLabel: 'Unknown',
  ceoApprovalTrend: 'UNKNOWN',
  ceoApprovalCurrent: null,
  ceoApprovalDelta90Days: null,
  ceoApprovalNote: 'Layer fell back — no sentiment computed.',
  cultureScoreTrend: 'UNKNOWN',
  cultureScoreCurrent: null,
  cultureNote: '',
  attritionPressure: 'UNKNOWN',
  attritionNote: '',
  anonymousSentimentSignal: 'UNKNOWN',
  anonymousSentimentNote: '',
  sentimentLeadTimeEstimate: 'N/A',
  earlyWarningActive: false,
  sentimentActions: [],
  calibrationStatus: 'research_grounded',
};

export const employeeSentimentLayer: AuditLayer<'employee_sentiment'> = {
  id: 'employee_sentiment',
  dependencies: [],
  timeoutMs: 100,
  failureMode: 'degrade',
  async run(ctx) {
    // The v14 user-factor extensions live on userFactors. Read defensively
    // via Record<string, unknown> because UserFactors has many optional
    // fields and not all branches of the audit form populate them.
    const uf = ctx.inputs.userFactors as unknown as Record<string, unknown>;
    return computeEmployeeSentiment({
      glassdoorCEOApprovalCurrent: numOrNull(uf.glassdoorCEOApprovalCurrent),
      glassdoorCEOApprovalDelta90Days: numOrNull(uf.glassdoorCEOApprovalDelta90Days),
      glassdoorCultureScore: numOrNull(uf.glassdoorCultureScore),
      glassdoorCultureScoreDelta: numOrNull(uf.glassdoorCultureScoreDelta),
      annualizedVoluntaryAttritionPct: numOrNull(uf.annualizedVoluntaryAttritionPct),
      blindSentiment: blindOrNull(uf.blindSentiment),
    });
  },
  fallback: () => NEUTRAL_RESULT,
};

function numOrNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}
function blindOrNull(v: unknown): 'FEAR' | 'CONCERN' | 'NEUTRAL' | 'POSITIVE' | null {
  if (v === 'FEAR' || v === 'CONCERN' || v === 'NEUTRAL' || v === 'POSITIVE') return v;
  return null;
}

registerLayer(employeeSentimentLayer as AuditLayer);
