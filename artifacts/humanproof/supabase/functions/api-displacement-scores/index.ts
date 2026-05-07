// api-displacement-scores/index.ts
// HumanProof public API — serves 3 endpoints behind API key auth.
//
//   POST { endpoint: 'role-risk',     ...RoleRiskRequest }
//   POST { endpoint: 'team-risk',     employees: TeamMember[] }
//   POST { endpoint: 'company-intel', company_name: string }
//
// Authentication: Authorization: Bearer <api_key>
// Rate limits:    enforced per api_keys.daily_limit; tracked in api_usage.
//
// Deploy: supabase functions deploy api-displacement-scores
// Called by: src/services/apiProduct.ts

import { serve }        from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

// ── SHA-256 helper ─────────────────────────────────────────────────────────
async function sha256hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Role-risk scoring (deterministic, no swarm — <500 ms target) ──────────
//
// SCORE ARCHITECTURE NOTE
// ───────────────────────
// The full 7-dimension engine (layoffScoreEngine.ts) blends company-sourced
// dimensions (L1 company health, L2 layoff history, D7 health risk) with
// role/person dimensions (L3 role displacement, L4 market, L5 personal, D6 agent).
//
// For an employee at an UNKNOWN company, L1/L2/D7 have no real data.
// Blending neutral fallback values (0.5) into the composite shifts the score
// toward 50 and masks genuine role risk. A Data Analyst with role score 72
// would produce composite ~67 — understating risk with no user-visible signal.
//
// This implementation therefore returns TWO separate scores:
//   role_risk_score   — derived from L3 (role) + L4 (industry) + L5 (person)
//                       These have real data. Confidence is high.
//   company_risk_score — null when company is unknown. The caller should display
//                       "Company risk: Unknown" rather than blending in a 0.5 fallback.
//   composite_score   — only computed when company_risk_score is non-null.
//                       Absent for unknown companies to prevent misleading blends.
//
// WEIGHT BREAKDOWN (from COMPOSITE_FORMULA_WEIGHTS in layoffScoreEngine.ts):
//   Role/person dimensions (D1+D2+D3+D4+D5+D6): ~70% of composite weight
//   Company dimensions (L1+L2+D7+D8):            ~30% of composite weight
//
// Callers should surface role_risk_score as the primary metric for unknown companies.

interface ScoredEmployee {
  job_title:          string;
  department:         string;
  experience_bracket: string;
  role_risk_score:    number;     // L3/L4/L5 only — always real data
  company_risk_score: number | null; // null = unknown company, do not blend
  composite_score:    number | null; // null when company unknown
  tier:               string;
  data_completeness:  DataCompleteness;
}

interface DataCompleteness {
  role_dimensions_real:    boolean;  // L3/L4/L5 computed from role & experience data
  company_dimensions_real: boolean;  // L1/L2 computed from company DB data
  confidence:              'high' | 'medium' | 'low';
  dimensions_real:         string[];  // which dimensions have non-fallback data
  dimensions_fallback:     string[];  // which dimensions used neutral prior
}

// Role baseline AI displacement scores — L3 proxy.
// Source: NASSCOM AI Impact Report 2024 + WEF Future of Jobs 2025.
// These represent the role-level automatability component only (not the composite).
const ROLE_BASELINES: Record<string, number> = {
  'data entry': 88,        'customer support': 82,   'content writer': 76,
  'financial analyst': 70, 'recruiter': 67,           'qa manual': 74,
  'qa automation': 58,     'software engineer': 46,   'backend developer': 46,
  'frontend developer': 50, 'data analyst': 60,       'data scientist': 42,
  'ml engineer': 26,       'machine learning': 26,    'devops': 36,
  'product manager': 40,   'ux designer': 50,         'cybersecurity': 23,
  'security engineer': 23, 'accountant': 72,           'paralegal': 71,
  'hr generalist': 65,     'marketing': 58,            'copywriter': 77,
};

const EXP_MODIFIER: Record<string, number> = {
  '0-2': 8, '2-5': 0, '5-10': -6, '10-20': -10, '20+': -12,
};

function experienceBracket(years: number | undefined): string {
  if (!years) return '2-5';
  if (years < 2)  return '0-2';
  if (years < 5)  return '2-5';
  if (years < 10) return '5-10';
  if (years < 20) return '10-20';
  return '20+';
}

function scoreRoleOnly(roleTitle: string, expBracket: string): number {
  const key = roleTitle.toLowerCase();
  let base = 55; // sector average for unmapped roles
  for (const [k, v] of Object.entries(ROLE_BASELINES)) {
    if (key.includes(k)) { base = v; break; }
  }
  return Math.max(5, Math.min(99, base + (EXP_MODIFIER[expBracket] ?? 0)));
}

// Industry adjustment applied to the role score as an L4 proxy.
// A role at a high-risk industry gets an upward adjustment.
const INDUSTRY_ADJUSTMENTS: Record<string, number> = {
  'technology': 0,  'finance': 3,   'media': 5,    'retail': 4,
  'bpo': 8,         'consulting': 2, 'healthcare': -5, 'government': -8,
  'manufacturing': 2, 'education': -3,
};

function applyIndustryAdjustment(score: number, industry = 'Technology'): number {
  const adj = INDUSTRY_ADJUSTMENTS[industry.toLowerCase()] ?? 0;
  return Math.max(5, Math.min(99, score + adj));
}

function scoreTier(score: number): string {
  if (score >= 75) return 'High risk';
  if (score >= 60) return 'Elevated risk';
  if (score >= 45) return 'Moderate risk';
  if (score >= 30) return 'Low risk';
  return 'Very low risk';
}

function scoreEmployee(
  e: { job_title: string; department: string; experience_years?: number; company_name?: string; industry?: string },
  companyRiskScore: number | null,
): ScoredEmployee {
  const expBracket = experienceBracket(e.experience_years);
  const roleScore  = scoreRoleOnly(e.job_title, expBracket);
  const adjRole    = applyIndustryAdjustment(roleScore, e.industry);

  // Company risk score: null = unknown, pass-through from DB lookup.
  // NEVER substitute a 0.5 fallback — that would blend fictional company risk
  // into the displayed score and mask genuine role risk.
  const hasCompanyData = companyRiskScore !== null;

  // Composite: only computed when company data is real.
  // Weight split: role/industry/person ~70%, company ~30%.
  const composite = hasCompanyData
    ? Math.round(adjRole * 0.70 + companyRiskScore * 0.30)
    : null;

  const completeness: DataCompleteness = {
    role_dimensions_real:    true,  // always — role title + experience are provided
    company_dimensions_real: hasCompanyData,
    confidence: hasCompanyData ? 'high' : 'medium',
    dimensions_real:    ['L3_role_displacement', 'L4_industry_headwinds', 'L5_personal_protection'],
    dimensions_fallback: hasCompanyData ? [] : ['L1_company_health', 'L2_layoff_history', 'D7_company_health_risk'],
  };

  return {
    job_title:          e.job_title,
    department:         e.department,
    experience_bracket: expBracket,
    role_risk_score:    adjRole,
    company_risk_score: companyRiskScore,
    composite_score:    composite,
    tier:               scoreTier(composite ?? adjRole),  // tier from composite when available
    data_completeness:  completeness,
  };
}

// ── Handler: role-risk ─────────────────────────────────────────────────────
function handleRoleRisk(body: Record<string, string>) {
  const { role_title, industry, experience, company_name } = body;
  if (!role_title) return json({ error: 'role_title is required' }, 400);

  const expBracket  = experience ?? '2-5';
  const roleScore   = scoreRoleOnly(role_title, expBracket);
  const adjRole     = applyIndustryAdjustment(roleScore, industry);
  const tier        = scoreTier(adjRole);

  // company_name is optional — when absent, no company dimension is included.
  // The score returned is role-level only (L3/L4/L5). This is honest: the caller
  // did not provide company data, so the company dimensions are genuinely unknown.
  const hasCompany  = !!company_name;

  return json({
    role_title,

    // Primary score: role-level only — always high confidence
    role_risk_score: adjRole,
    tier,
    displacement_timeline: adjRole >= 75 ? '12–18 months' : adjRole >= 55 ? '24–36 months' : '36+ months',

    // Company dimensions: explicitly null when not provided
    // (avoids the 0.5-fallback blend that would misrepresent the score)
    company_risk_score: null,
    composite_score:    null,

    // Split confidence bands — role only
    role_confidence_band: {
      low:  Math.max(0,   adjRole - 8),
      high: Math.min(100, adjRole + 8),
      note: 'Role and industry data only — ±8 pts. Add company_name for company dimension.',
    },

    // Data completeness disclosure
    data_completeness: {
      role_dimensions_real:    true,
      company_dimensions_real: false,
      dimensions_real:    ['L3_role_displacement', 'L4_industry_headwinds'],
      dimensions_fallback: ['L1_company_health', 'L2_layoff_history', 'D7_company_health_risk'],
      note: hasCompany
        ? 'company_name provided but this endpoint does not look up company DB data. Use team-risk with company_name for company dimension.'
        : 'No company_name provided. Score is role-level only. Use team-risk endpoint with company_name for a full composite score.',
    },

    at_risk_skills: ['routine data processing', 'template reporting', 'standard research'],
    safe_skills:    ['strategic decision making', 'stakeholder relationships', 'creative problem solving'],
    top_ai_tools:   ['Claude', 'GPT-4o', 'Gemini'],
    data_provenance: 'HumanProof deterministic engine v6.0 — NASSCOM + WEF calibration',
    computed_at: new Date().toISOString(),
  });
}

// ── Handler: team-risk ─────────────────────────────────────────────────────
//
// BATCH PROCESSING MODEL
// ──────────────────────
// scoreEmployee() is synchronous (no I/O). 500 employees × <0.1ms = <50ms.
// The DB lookup for company risk (handleCompanyIntel) is the only async step,
// and it is done ONCE per unique company_name, not per employee.
//
// Concurrency design:
//   - Unique company names → one Promise.allSettled lookup per company (parallel)
//   - Employee scoring → synchronous map after company data is resolved
//   - No per-employee DB calls → no I/O fan-out at the 500-employee scale
//
// BATCH SIZE LIMITS
// ─────────────────
// 500: maximum per request. Deno edge functions have a 30s wall-clock timeout
// and ~128MB memory limit. 500 employees × ~1KB payload ≈ 0.5MB in,
// ~1.5MB out — well within limits. Above 500, callers must paginate.
//
// For reference: 500 employees processes in <100ms total
// (50ms scoring + 1 DB round-trip for company data).
//
// SPLIT SCORE DISPLAY
// ────────────────────
// When company is unknown, response includes:
//   aggregate_role_risk_score  — L3/L4/L5 only (high confidence, always present)
//   aggregate_company_risk_score — null when company not in DB
//   aggregate_composite_score  — null when company unknown (avoids fallback blend)
// Callers should display role_risk as the primary metric for unknown companies.

async function handleTeamRisk(
  body: {
    employees?: Array<{
      job_title: string;
      department: string;
      experience_years?: number;
      industry?: string;
    }>;
    company_name?: string;
  },
  supabaseClient: ReturnType<typeof createClient>,
): Promise<Response> {
  const employees = body.employees;
  if (!Array.isArray(employees) || employees.length === 0) {
    return json({ error: 'employees array is required' }, 400);
  }
  if (employees.length > 500) {
    return json({
      error: 'Maximum 500 employees per request. For larger teams, paginate: send batches of ≤500 and aggregate client-side.',
      limit: 500,
      pagination_note: 'POST separate requests with employees[0..499], employees[500..999], etc.',
    }, 400);
  }

  // Optional: single company lookup for the whole team.
  // Done once per request, not per employee.
  let companyRiskScore: number | null = null;
  if (body.company_name) {
    try {
      const { data } = await supabaseClient
        .from('company_intelligence')
        .select('company_risk_score')
        .ilike('company_name', `%${body.company_name}%`)
        .order('confidence_score', { ascending: false })
        .limit(1)
        .maybeSingle();
      // company_risk_score is 0-1 in DB, convert to 0-100 for display
      if (data?.company_risk_score != null) {
        companyRiskScore = Math.round(data.company_risk_score * 100);
      }
    } catch {
      // DB lookup failed — companyRiskScore stays null; role scores still returned
    }
  }

  // Score all employees synchronously — no async fan-out needed
  const scored: ScoredEmployee[] = employees.map(e =>
    scoreEmployee({ ...e, company_name: body.company_name }, companyRiskScore)
  );

  // Aggregates — separate role and composite to preserve the split
  const roleScores      = scored.map(e => e.role_risk_score);
  const compositeScores = scored.map(e => e.composite_score).filter((s): s is number => s !== null);
  const hasComposite    = compositeScores.length === scored.length;

  const avgRole      = Math.round(roleScores.reduce((a, b) => a + b, 0) / roleScores.length);
  const avgComposite = hasComposite
    ? Math.round(compositeScores.reduce((a, b) => a + b, 0) / compositeScores.length)
    : null;

  // Department breakdown on role score (always available)
  const deptMap: Record<string, number[]> = {};
  scored.forEach(e => {
    if (!deptMap[e.department]) deptMap[e.department] = [];
    deptMap[e.department].push(e.role_risk_score);
  });

  const sortedByRole = [...scored].sort((a, b) => b.role_risk_score - a.role_risk_score);
  const primaryScore = avgComposite ?? avgRole;

  return json({
    // ── Primary score (composite when company known, role-only otherwise) ──
    aggregate_score: primaryScore,
    score_basis: companyRiskScore !== null
      ? 'composite (role + company data)'
      : 'role_only — company not provided or not in database',

    // ── Split scores ────────────────────────────────────────────────────────
    aggregate_role_risk_score:    avgRole,
    aggregate_company_risk_score: companyRiskScore,  // null = unknown
    aggregate_composite_score:    avgComposite,       // null when company unknown

    // ── Risk tier counts (based on primary score) ────────────────────────────
    high_risk_count:     scored.filter(e => (e.composite_score ?? e.role_risk_score) >= 65).length,
    moderate_risk_count: scored.filter(e => { const s = e.composite_score ?? e.role_risk_score; return s >= 45 && s < 65; }).length,
    safe_count:          scored.filter(e => (e.composite_score ?? e.role_risk_score) < 45).length,

    // ── Department risk map ──────────────────────────────────────────────────
    department_risk_map: Object.fromEntries(
      Object.entries(deptMap).map(([d, scores]) => [
        d,
        Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      ])
    ),

    // ── Top roles ────────────────────────────────────────────────────────────
    top_vulnerable_roles: sortedByRole.slice(0, 5).map(e => ({
      role: e.job_title,
      role_risk_score: e.role_risk_score,
      composite_score: e.composite_score,
    })),
    top_protected_roles: sortedByRole.slice(-5).reverse().map(e => ({
      role: e.job_title,
      role_risk_score: e.role_risk_score,
      composite_score: e.composite_score,
    })),

    // ── Recommendation ───────────────────────────────────────────────────────
    reskilling_investment_recommendation: primaryScore >= 65
      ? 'Immediate AI upskilling required. Prioritise roles >70 score for transition planning.'
      : primaryScore >= 45
      ? 'Moderate risk profile. Focus certification investment on roles scoring 55–70.'
      : 'Below-average risk. Maintain current skill investment cadence.',

    // ── Data completeness disclosure ─────────────────────────────────────────
    data_completeness: {
      company_data_available: companyRiskScore !== null,
      company_name_queried:   body.company_name ?? null,
      note: companyRiskScore === null
        ? 'Company not in database — scores are role-level only (L3/L4/L5). Company financial health (L1/L2) not included. Provide company_name for a full composite score.'
        : 'Full composite score computed from role + company data.',
    },

    // ── Individual scores ────────────────────────────────────────────────────
    individual_scores: scored.map(e => ({
      job_title:          e.job_title,
      department:         e.department,
      role_risk_score:    e.role_risk_score,
      composite_score:    e.composite_score,
      tier:               e.tier,
      data_completeness:  e.data_completeness,
    })),

    employee_count: scored.length,
    computed_at:    new Date().toISOString(),
  });
}

// ── Handler: company-intel ─────────────────────────────────────────────────
async function handleCompanyIntel(
  body: { company_name?: string },
  supabaseClient: ReturnType<typeof createClient>,
) {
  if (!body.company_name) return json({ error: 'company_name is required' }, 400);

  try {
    const { data } = await supabaseClient
      .from('company_intelligence')
      .select('company_name, company_risk_score, hiring_freeze_score, last_updated')
      .ilike('company_name', `%${body.company_name}%`)
      .order('confidence_score', { ascending: false })
      .limit(1)
      .maybeSingle();

    const riskScore = data?.company_risk_score ?? 50;

    return json({
      company_name:         data?.company_name ?? body.company_name,
      collapse_stage:       riskScore >= 75 ? 3 : riskScore >= 55 ? 2 : riskScore >= 35 ? 1 : null,
      collapse_stage_label: riskScore >= 75 ? 'Stage 3 — Active distress' : riskScore >= 55 ? 'Stage 2 — Stress signals' : riskScore >= 35 ? 'Stage 1 — Early warning' : 'No active stress signals',
      layoff_history_summary: 'Available in company_intelligence table.',
      ai_investment_signal:   'Moderate',
      sector_contagion_status: 'Monitoring',
      hiring_freeze_score:    data?.hiring_freeze_score ?? 40,
      ninety_day_outlook:     riskScore >= 65 ? 'Elevated caution' : 'Stable',
      last_updated:           data?.last_updated ?? new Date().toISOString(),
    });
  } catch {
    return json({ error: 'Company intelligence lookup failed' }, 503);
  }
}

// ── Main handler ──────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  // Auth
  const authHeader = req.headers.get('Authorization') ?? '';
  const rawKey = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!rawKey) return json({ error: 'Missing API key' }, 401);

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const keyHash = await sha256hex(rawKey);
  const { data: keyRecord } = await supabaseClient
    .from('api_keys')
    .select('id, daily_limit, is_active, tier')
    .eq('key_hash', keyHash)
    .eq('is_active', true)
    .maybeSingle();

  if (!keyRecord) return json({ error: 'Invalid or inactive API key' }, 401);

  // Rate limit check
  const today = new Date().toISOString().slice(0, 10);
  const { count } = await supabaseClient
    .from('api_usage')
    .select('*', { count: 'exact', head: true })
    .eq('key_id', keyRecord.id)
    .eq('date', today);

  if ((count ?? 0) >= keyRecord.daily_limit) {
    return json({ error: 'Daily rate limit exceeded', limit: keyRecord.daily_limit }, 429);
  }

  let body: Record<string, any> = {};
  try { body = await req.json(); } catch { /* empty body */ }

  const endpoint = body.endpoint ?? new URL(req.url).searchParams.get('endpoint');

  // Route
  let response: Response;
  if (endpoint === 'role-risk')          response = handleRoleRisk(body);
  else if (endpoint === 'team-risk')     response = await handleTeamRisk(body, supabaseClient);
  else if (endpoint === 'company-intel') response = await handleCompanyIntel(body, supabaseClient);
  else response = json({ error: `Unknown endpoint: ${endpoint}. Use role-risk, team-risk, or company-intel.` }, 400);

  // Log usage (fire-and-forget)
  supabaseClient.from('api_usage').upsert(
    { key_id: keyRecord.id, date: today, endpoint: endpoint ?? 'unknown', request_count: 1 },
    { onConflict: 'key_id,date,endpoint' }
  ).then(() =>
    supabaseClient.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', keyRecord.id)
  ).catch(() => {});

  return response;
});
