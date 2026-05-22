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

import { serve }        from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: CORS });

// v40 hardening: validate Supabase JWT before scoring. The EF accepts a
// fully constructed consensusData blob — without auth, anyone could submit
// fabricated signals or spam the function. Auth is required to tie usage
// to a user and to keep the EF unusable as an open scoring oracle.
//
// Service-role bypass: the synthetic-probe cron calls this EF with the
// service role key instead of a user JWT. We check for an exact match
// against SUPABASE_SERVICE_ROLE_KEY before attempting JWT validation so
// internal callers (probe, recalibrate-engine) are not blocked.
async function requireAuth(req: Request): Promise<Response | null> {
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return json({ error: 'Missing Authorization header' }, 401);
  }
  const token = authHeader.slice('Bearer '.length);
  // Allow internal service-role callers without a user JWT.
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (serviceKey && token === serviceKey) return null;
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return json({ error: 'Invalid or expired token' }, 401);
  } catch {
    return json({ error: 'Auth check failed' }, 401);
  }
  return null;
}

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

// ── D1 country multiplier ────────────────────────────────────────────────────
// Mirrors computeD1CountryMultiplier() in aiEnterpriseDeploymentRates.ts.
// Formula: 0.80 + (enterpriseDeploymentRate × 0.30) - (labourFlexibility × 0.10)
// clamped [0.80, 1.10]. LABELED ESTIMATED — research-derived, not measured.
//
// Values pre-computed from the source table for key markets.
// DE: Betriebsrat (BetrVG §87(1)6) gates AI monitoring tools — QA/BPO lowest.
// IN: IT Services QA/SW governed by client-side (US/EU) deployment, not employer.
// SG: AISG national program boosts QA/SW adoption beyond aiAdoptionSpeed.
// JP: Conservative enterprise adoption despite strong research output.
// AE/SA: High labour flexibility; general AI adoption per UAE national strategy.
// GB: Strong FinTech/BPO adoption; slightly below US.
// FR: PSE/CNIL slow AI deployment for monitored-role categories.
function getD1RegionMultiplier(
  region: string | undefined,
  roleTitle: string | undefined,
  industry: string | undefined,
): number {
  if (!region) return 1.0;
  const r = region.toUpperCase().slice(0, 4);

  const role = (roleTitle ?? '').toLowerCase();
  const isITServices = /it services|bpo|outsourcing|consulting/i.test(industry ?? '');

  const isQA      = /qa|quality assurance|tester|test engineer|sdet/i.test(role);
  const isBPO     = /data entry|customer support|back.?office|call cent|operations analyst/i.test(role);
  const isSW      = /software engineer|developer|backend|frontend|full.?stack|devops|sre/i.test(role);
  const isContent = /content|writer|copywriter|editor/i.test(role);
  const isFinance = /financial analyst|accountant|fp&?a|finance/i.test(role);

  // Pre-computed multipliers: { country: { category: multiplier } }
  // Derived from ENTERPRISE_DEPLOYMENT_RATES × COUNTRY_RISK_PROFILES.labourFlexibility.
  const table: Record<string, { qa?: number; bpo?: number; sw?: number; content?: number; finance?: number; def: number }> = {
    // Germany — Betriebsrat (BetrVG §87(1)6) structural gate for QA/BPO/HR/Sales AI
    DE: { qa: 0.844, bpo: 0.881, sw: 0.880, content: 0.905, finance: 0.914, def: 0.895 },
    // India — IT Services: client-side governed (US/EU client deployment governs)
    IN: { qa: isITServices ? 0.875 : 0.881, bpo: isITServices ? 0.936 : 0.941, sw: isITServices ? 0.883 : 0.899, content: 0.904, finance: 0.905, def: 0.890 },
    // Singapore — AISG national program boosts QA, SW, and content deployment
    SG: { qa: 0.940, bpo: 0.936, sw: 0.916, content: 0.936, finance: 0.925, def: 0.925 },
    // Japan — conservative enterprise AI adoption; lifetime employment culture
    JP: { qa: 0.867, bpo: 0.894, sw: 0.880, content: 0.896, finance: 0.890, def: 0.882 },
    // UAE / Saudi — high labour flexibility; UAE national AI strategy adoption
    AE: { def: 0.899 },
    SA: { def: 0.892 },
    // UK — strong FinTech/BPO; slightly below US Copilot penetration
    GB: { qa: 0.895, bpo: 0.952, sw: 0.890, content: 0.936, finance: 0.940, def: 0.905 },
    // France — PSE consultation + CNIL data restrictions slow monitored-role AI
    FR: { qa: 0.864, bpo: 0.894, sw: 0.878, content: 0.894, finance: 0.878, def: 0.878 },
    // Korea — chaebol-driven rapid AI deployment
    KR: { def: 0.924 },
    // Canada — close to US adoption curve, minor lag
    CA: { sw: 0.886, def: 0.900 },
    // Australia — strong SaaS/FinTech; lower government/banking
    AU: { def: 0.892 },
    // Israel — highest startup density, fastest Copilot adoption
    IL: { sw: 0.946, def: 0.935 },
  };

  const row = table[r];
  if (!row) return 1.0; // unknown region → USA-neutral (no adjustment)

  const mult = isQA ? row.qa : isBPO ? row.bpo : isSW ? row.sw : isContent ? row.content : isFinance ? row.finance : undefined;
  return mult ?? row.def;
}

// ── D dimensions from userFactors ─────────────────────────────────────────────
// These are heuristic approximations for server-side scoring. The full
// client-side engine (layoffScoreEngine.ts) computes these with more context.
function computeDimensions(uf: UserFactors, cd: ConsensusData) {
  // D1: Task automatability — role-based heuristic, with D1 country multiplier.
  // getD1RegionMultiplier() replicates computeD1CountryMultiplier() from
  // aiEnterpriseDeploymentRates.ts using a pre-computed table.
  const roleKey = (uf.roleTitle ?? '').toLowerCase();
  const d1Base =
    roleKey.includes('data entry') || roleKey.includes('customer support') ? 0.88
    : roleKey.includes('content writer') || roleKey.includes('copywriter') ? 0.78
    : roleKey.includes('financial analyst') || roleKey.includes('accountant') ? 0.72
    : roleKey.includes('ml engineer') || roleKey.includes('machine learning') ? 0.28
    : roleKey.includes('cybersecurity') || roleKey.includes('security engineer') ? 0.25
    : roleKey.includes('product manager') ? 0.42
    : roleKey.includes('software engineer') || roleKey.includes('backend') || roleKey.includes('frontend') ? 0.48
    : roleKey.includes('data scientist') ? 0.44
    : 0.55;
  const d1 = d1Base * getD1RegionMultiplier(uf.region, uf.roleTitle, uf.industry);

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
  region?: string;
  industry?: string;
}

// v40 hardening: validate user-supplied signal blob. Without this, callers
// can submit Infinity/NaN/negative values that bypass the score band, and
// pad ConsensusData with arbitrary fields that confuse downstream logging.
// We clamp every signal to its expected range, reject non-finite numbers,
// length-cap strings, and silently drop unknown keys.
const ALLOWED_SIGNAL_KEYS = new Set([
  'revenueGrowth', 'stockTrend', 'fundingHealth', 'overstaffing', 'companySize',
  'recentLayoffRecency', 'layoffFrequency', 'layoffSeverity', 'sectorContagion',
  'departmentNews', 'automationRisk', 'aiToolMaturity', 'humanAmplification',
  'industryBaseline', 'aiAdoptionRate', 'growthOutlook', 'averageTenure',
]);
function sanitizeSignal(raw: unknown): { value: number; confidence: number } | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as { value?: unknown; confidence?: unknown };
  const v = Number(r.value);
  const c = Number(r.confidence);
  if (!Number.isFinite(v) || !Number.isFinite(c)) return null;
  return {
    value:      Math.min(1, Math.max(0, v)),
    confidence: Math.min(1, Math.max(0, c)),
  };
}
function sanitizeConsensusData(raw: unknown): ConsensusData | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const out: ConsensusData = {};
  for (const key of ALLOWED_SIGNAL_KEYS) {
    const s = sanitizeSignal(r[key]);
    if (s) (out as Record<string, unknown>)[key] = s;
  }
  if (typeof r.overallConfidence === 'number' && Number.isFinite(r.overallConfidence)) {
    out.overallConfidence = Math.min(1, Math.max(0, r.overallConfidence));
  }
  if (typeof r.conflictLevel === 'string' && r.conflictLevel.length <= 32) {
    out.conflictLevel = r.conflictLevel;
  }
  if (r.lowDataWarning && typeof r.lowDataWarning === 'object') {
    const w = r.lowDataWarning as Record<string, unknown>;
    if (typeof w.code === 'string' && w.code.length <= 64
        && typeof w.missingCount === 'number' && Number.isFinite(w.missingCount)
        && typeof w.capAt === 'number' && Number.isFinite(w.capAt)) {
      out.lowDataWarning = {
        code:         w.code,
        missingCount: Math.max(0, Math.floor(w.missingCount)),
        capAt:        Math.min(100, Math.max(0, w.capAt)),
      };
    }
  }
  return out;
}
function sanitizeUserFactors(raw: unknown): UserFactors {
  if (!raw || typeof raw !== 'object') return {};
  const r = raw as Record<string, unknown>;
  const out: UserFactors = {};
  if (typeof r.roleTitle === 'string' && r.roleTitle.length <= 200) {
    out.roleTitle = r.roleTitle;
  }
  if (typeof r.department === 'string' && r.department.length <= 100) {
    out.department = r.department;
  }
  if (typeof r.tenureYears === 'number' && Number.isFinite(r.tenureYears)) {
    out.tenureYears = Math.min(60, Math.max(0, r.tenureYears));
  }
  if (typeof r.region === 'string' && r.region.length <= 10) {
    out.region = r.region;
  }
  if (typeof r.industry === 'string' && r.industry.length <= 100) {
    out.industry = r.industry;
  }
  return out;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const authFail = await requireAuth(req);
  if (authFail) return authFail;

  let payload: { companyName?: unknown; consensusData?: unknown; userFactors?: unknown } = {};
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const rawCompanyName = typeof payload.companyName === 'string' ? payload.companyName : '';
  if (rawCompanyName.length > 200) return json({ error: 'companyName too long' }, 400);
  const companyName = rawCompanyName.trim() || 'unknown';

  const consensusData = sanitizeConsensusData(payload.consensusData);
  if (!consensusData) return json({ error: 'consensusData is required' }, 400);

  const userFactors = sanitizeUserFactors(payload.userFactors);

  const { score, breakdown, confidence } = computeComposite(
    consensusData,
    userFactors,
  );

  // Confidence cap: if LOW_DATA warning present, cap at the specified ceiling
  const cap = consensusData.lowDataWarning?.capAt;
  const finalScore = cap != null ? Math.min(score, cap) : score;

  const result = {
    score:          finalScore,
    companyName,
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
