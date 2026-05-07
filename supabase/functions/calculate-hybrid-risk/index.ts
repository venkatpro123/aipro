// Edge Function: calculate-hybrid-risk
//
// Pure scoring path: accepts a fully-resolved ConsensusSignalSet plus user
// factors, returns a ScoreResult identical to the frontend hybrid engine.
//
// This function deliberately performs no I/O of its own. The upstream
// consensus pipeline (live signal fetching, swarm verification, conflict
// resolution) still lives in the React app — porting that to Deno is a
// separate effort tracked alongside the consensusEngine/swarmOrchestrator
// migration. Until that lands, callers that already have consensus on hand
// (e.g. a server-side reconciliation job comparing client-computed scores
// against a re-run on the same inputs) can use this endpoint to validate
// scores without re-implementing the math.
//
// Why expose this as an edge function at all?
//   1. Score audit: a server-side caller can verify a client-reported score
//      against an authoritative re-computation on the same consensus.
//   2. Non-browser clients: SDKs / batch jobs can score without bundling
//      the React app.
//   3. Numerical contract: if scoring math diverges between the React app
//      and this endpoint, the discrepancy is observable instead of silent.

import { calculateHybridScore } from '../_shared/hybridScoringMath.ts';
import type { HybridScoreInputs } from '../_shared/scoringTypes.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

function isHybridScoreInputs(v: unknown): v is HybridScoreInputs {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  if (typeof o.companyName !== 'string' || o.companyName.length === 0) return false;
  if (typeof o.roleTitle !== 'string') return false;
  if (typeof o.department !== 'string') return false;
  if (!o.userFactors || typeof o.userFactors !== 'object') return false;
  if (!o.consensusData || typeof o.consensusData !== 'object') return false;
  // Spot-check one consensus field — full validation is too verbose to inline,
  // and a malformed consensus surfaces as NaN in the score, which the math
  // module's clamps then convert to a deterministic 0/100.
  const c = o.consensusData as Record<string, unknown>;
  if (!c.revenueGrowth || typeof c.revenueGrowth !== 'object') return false;
  if (!c.freshnessReport || typeof c.freshnessReport !== 'object') return false;
  return true;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405);
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch (_err) {
    return json({ error: 'Invalid JSON body', code: 'INVALID_BODY' }, 400);
  }

  if (!isHybridScoreInputs(payload)) {
    return json(
      {
        error:
          'Request body must include { companyName, roleTitle, department, userFactors, consensusData }. ' +
          'Optional reconciliation fields include provenance, reconciliationSummary, missingDataFallbacks, degradedSignalClasses, hardFailures, confidenceCap, and confidenceCapsApplied. ' +
          'See _shared/scoringTypes.ts for the full HybridScoreInputs shape.',
        code: 'INVALID_PAYLOAD',
      },
      400,
    );
  }

  try {
    const result = calculateHybridScore(payload);
    return json({ result, schemaVersion: 'hybrid-score@2' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return json(
      { error: `Scoring failed: ${message}`, code: 'SCORING_ERROR' },
      500,
    );
  }
});
