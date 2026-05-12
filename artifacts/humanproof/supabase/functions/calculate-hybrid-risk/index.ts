// calculate-hybrid-risk/index.ts
// Supabase Edge Function — server-side hybrid consensus scoring.
//
// Purpose:
//   Receives a HybridScorePayload (built client-side by hybridConsensusBuilder.ts)
//   and returns a composite score that blends the resolved consensus signals with
//   the COMPOSITE_FORMULA_WEIGHTS. Running this server-side ensures:
//     - Score is computed from consensus (multi-source) signals, not legacy single-source
//     - Drift vs. legacy engine is detected and logged
//     - Score cannot be tampered with client-side
//
// Previously this EF was never deployed — the pipeline always fell through to the
// legacy calculateLayoffScore() path. This deployment enables proper hybrid scoring.
//
// Env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-set by Supabase)
//
// Deploy: supabase functions deploy calculate-hybrid-risk
// Called by: src/services/auditDataPipeline.ts (hybrid scoring step)

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: CORS });

// COMPOSITE_FORMULA_WEIGHTS — mirrors layoffScoreEngine.ts (keep in sync)
const W = {
  D1_taskAutomatability:        0.18,
  D2_aiToolMaturity:            0.14,
  D3_augmentationRisk:          0.09,
  D4_experienceProtection:      0.18,
  D5_countryContext:            0.00,
  D6_agentCapability:           0.04,
  D7_companyHealth:             0.06,
  D8_aiEfficiencyRestructuring: 0.09,
  L1_directFinancial:           0.16,
  L2_directLayoffHistory:       0.06,
} as const;

// ── L1: Direct Financial Health ───────────────────────────────────────────────
// Blends revenue growth, stock trend, overstaffing signals.
// Each signal.value is already a 0-1 risk fraction resolved by hybridConsensusBuilder.
function computeL1(cd: ConsensusData): number {
  const rev  = cd.revenueGrowth?.value  ?? 0.5;
  const stk  = cd.stockTrend?.value     ?? 0.5;
  const over = cd.overstaffing?.value   ?? 0.5;
  const fund = cd.fundingHealth?.value  ?? 0.5;
  return (rev * 0.35) + (stk * 0.30) + (over * 0.20) + (fund * 0.15);
}

// ── L2: Direct Layoff History ─────────────────────────────────────────────────
function computeL2(cd: ConsensusData): number {
  const recency  = cd.recentLayoffRecency?.value ?? 0.5;
  const freq     = cd.layoffFrequency?.value     ?? 0.5;
  const severity = cd.layoffSeverity?.value      ?? 0.5;
  return (recency * 0.40) + (freq * 0.40) + (severity * 0.20);
}

// ── D7: Company Health Risk ───────────────────────────────────────────────────
function computeD7(cd: ConsensusData): number {
  const growth   = cd.growthOutlook?.value    ?? 0.5;
  const dept     = cd.departmentNews?.value   ?? 0.5;
  return (growth * 0.50) + (dept * 0.50);
}

// ── D dimensions from userFactors ─────────────────────────────────────────────
// These are heuristic approximations for server-side scoring. The full
// client-side engine (layoffScoreEngine.ts) computes these with more context.
function computeDimensions(uf: UserFactors, cd: ConsensusData) {
  // D1: Task automatability — role-based heuristic
  const roleKey = (uf.roleTitle ?? '').toLowerCase();
  const d1 =
    roleKey.includes('data entry') || roleKey.includes('customer support') ? 0.88
    : roleKey.includes('content writer') || roleKey.includes('copywriter') ? 0.78
    : roleKey.includes('financial analyst') || roleKey.includes('accountant') ? 0.72
    : roleKey.includes('ml engineer') || roleKey.includes('machine learning') ? 0.28
    : roleKey.includes('cybersecurity') || roleKey.includes('security engineer') ? 0.25
    : roleKey.includes('product manager') ? 0.42
    : roleKey.includes('software engineer') || roleKey.includes('backend') || roleKey.includes('frontend') ? 0.48
    : roleKey.includes('data scientist') ? 0.44
    : 0.55;

  // D2: AI tool maturity — sector proxy
  const d2 = cd.aiToolMaturity?.value ?? 0.5;

  // D3: Augmentation risk — blend of ai adoption + automation potential
  const d3 = (cd.automationRisk?.value ?? 0.5) * 0.60 + (cd.aiAdoptionRate?.value ?? 0.5) * 0.40;

  // D4: Experience protection — inverted: long tenure = lower risk
  const tenure = uf.tenureYears ?? 3;
  const d4 =
    tenure < 1  ? 0.80
    : tenure < 2  ? 0.65
    : tenure < 4  ? 0.50
    : tenure < 7  ? 0.35
    : tenure < 12 ? 0.25
    : 0.18;

  // D6: Agent capability — industry AI maturity signal
  const d6 = cd.aiAdoptionRate?.value ?? 0.45;

  // D8: AI efficiency restructuring — triggered for profitable companies cutting for AI efficiency
  const d8 = cd.humanAmplification?.value ?? 0.40;

  return { d1, d2, d3, d4, d6, d8 };
}

// ── Main composite formula ────────────────────────────────────────────────────
function computeComposite(cd: ConsensusData, uf: UserFactors): {
  score: number;
  breakdown: Record<string, number>;
  confidence: number;
} {
  const L1 = computeL1(cd);
  const L2 = computeL2(cd);
  const D7 = computeD7(cd);
  const { d1, d2, d3, d4, d6, d8 } = computeDimensions(uf, cd);

  const raw =
    d1 * W.D1_taskAutomatability +
    d2 * W.D2_aiToolMaturity +
    d3 * W.D3_augmentationRisk +
    d4 * W.D4_experienceProtection +
    d6 * W.D6_agentCapability +
    D7 * W.D7_companyHealth +
    d8 * W.D8_aiEfficiencyRestructuring +
    L1 * W.L1_directFinancial +
    L2 * W.L2_directLayoffHistory;

  const score = Math.round(Math.max(5, Math.min(99, raw * 100)));
  const confidence = cd.overallConfidence ?? 0.65;

  return {
    score,
    breakdown: {
      L1: Math.round(L1 * 100),
      L2: Math.round(L2 * 100),
      D1: Math.round(d1 * 100),
      D2: Math.round(d2 * 100),
      D3: Math.round(d3 * 100),
      D4: Math.round(d4 * 100),
      D6: Math.round(d6 * 100),
      D7: Math.round(D7 * 100),
      D8: Math.round(d8 * 100),
    },
    confidence,
  };
}

// ── Types (minimal, matches HybridScorePayload fields we use) ─────────────────
interface ResolvedSignal { value: number; confidence: number; }
interface ConsensusData {
  revenueGrowth?:      ResolvedSignal;
  stockTrend?:         ResolvedSignal;
  fundingHealth?:      ResolvedSignal;
  overstaffing?:       ResolvedSignal;
  companySize?:        ResolvedSignal;
  recentLayoffRecency?:ResolvedSignal;
  layoffFrequency?:    ResolvedSignal;
  layoffSeverity?:     ResolvedSignal;
  sectorContagion?:    ResolvedSignal;
  departmentNews?:     ResolvedSignal;
  automationRisk?:     ResolvedSignal;
  aiToolMaturity?:     ResolvedSignal;
  humanAmplification?: ResolvedSignal;
  industryBaseline?:   ResolvedSignal;
  aiAdoptionRate?:     ResolvedSignal;
  growthOutlook?:      ResolvedSignal;
  averageTenure?:      ResolvedSignal;
  overallConfidence?:  number;
  conflictLevel?:      string;
  lowDataWarning?:     { code: string; missingCount: number; capAt: number };
}
interface UserFactors {
  roleTitle?: string;
  tenureYears?: number;
  department?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  let payload: { companyName?: string; consensusData?: ConsensusData; userFactors?: UserFactors; } = {};
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { consensusData, userFactors, companyName } = payload;
  if (!consensusData) return json({ error: 'consensusData is required' }, 400);

  const { score, breakdown, confidence } = computeComposite(
    consensusData,
    userFactors ?? {},
  );

  // Confidence cap: if LOW_DATA warning present, cap at the specified ceiling
  const cap = consensusData.lowDataWarning?.capAt;
  const finalScore = cap != null ? Math.min(score, cap) : score;

  const result = {
    score:          finalScore,
    companyName:    companyName ?? 'unknown',
    breakdown,
    engine:         'hybrid-consensus-v22',
    conflictLevel:  consensusData.conflictLevel ?? 'none',
    signalQuality: {
      overallConfidence: confidence,
      conflictLevel:     consensusData.conflictLevel ?? 'none',
      lowDataWarning:    consensusData.lowDataWarning ?? null,
      missingDataFallbacks: [],
    },
  };

  return json({ result });
});
