// compute-oracle — Deterministic D1-D6 Oracle scoring. No LLM required.
// Replaces the dead localhost:8787 endpoint. All lookup tables embedded server-side.
// Browser sends: roleKey, industry, experience, country, companyName (optional)

// WS10 — withRun writes pipeline_runs + propagates x-request-id.
import { withRun } from '../_shared/otel.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-request-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// ── Lookup tables (sourced from riskFormula.ts browser module) ────────────────

// Role cognitive complexity proxy: lower = more complex/safe, higher = more automatable
const ROLE_COMPLEXITY_MAP: Record<string, number> = {
  // Strategy / Leadership
  sw_arch: 0.12, it_lead: 0.10, sw_pm: 0.14, con_strategy: 0.15, con_mgmt: 0.18,
  gov_policy: 0.15, mh_therapist: 0.08, mh_psychologist: 0.10, mh_crisis: 0.08,
  hc_surgeon: 0.05, hc_specialist: 0.10, edu_higher: 0.15, ngo_program: 0.20,
  // Technical specialists
  sw_backend: 0.35, sw_frontend: 0.40, sw_cloud: 0.28, sw_devops: 0.28,
  it_cybersec: 0.20, sec_pen: 0.18, sec_incident: 0.20, ml_model: 0.22,
  ml_research: 0.15, ml_mlops: 0.28, data_eng: 0.30, ds_scientist: 0.30,
  ml_engineer: 0.22, sw_embedded: 0.18, sw_legacy: 0.22,
  // Creative
  des_ux: 0.32, des_ui: 0.40, adv_creative: 0.38, anim_2d: 0.45,
  photo_portrait: 0.30, mus_compose: 0.28, mh_coach: 0.25,
  // Finance
  fin_account: 0.58, fin_tax: 0.55, fin_audit: 0.52, fin_payroll: 0.72,
  ins_claims: 0.68, ins_underwrite: 0.52,
  // High risk
  bpo_inbound: 0.80, bpo_data_entry: 0.92, bpo_outbound: 0.85, bpo_chat: 0.82,
  cnt_blog: 0.72, cnt_copy: 0.68, cnt_seo_content: 0.80, cnt_translation: 0.88,
  qa_manual: 0.82, adm_data_entry: 0.92, adm_reception: 0.78, ret_floor: 0.75,
  mkt_seo: 0.68, mkt_sem: 0.62, med_journalism: 0.72,
  // Expanded catalog
  sw_fullstack: 0.38, sw_api: 0.35, sw_db: 0.42, sw_testing: 0.70,
  sw_mobile_dev: 0.40, sw_ml: 0.22, sw_lead: 0.12,
  web_html: 0.65, web_react: 0.40, web_wordpress: 0.70, web_ux: 0.32,
  mob_ios: 0.38, mob_android: 0.38, mob_flutter: 0.40,
  ml_nlp: 0.22, ml_cv: 0.22, ml_data: 0.42, ml_prompt: 0.48, ml_analytics: 0.45,
  sec_soc: 0.30, sec_cloud: 0.28, sec_appsec: 0.25, sec_grc: 0.38,
  dev_ci: 0.42, dev_k8s: 0.35, dev_infra: 0.32, dev_sre: 0.30,
  fin_fp: 0.40, fin_treasury: 0.42, fin_credit: 0.48, fin_risk: 0.38, fin_invest: 0.32,
  hr_recruit: 0.48, hr_hrbp: 0.30, hr_lr: 0.32, hr_comp: 0.45, hr_ld: 0.30,
  leg_corporate: 0.25, leg_litigation: 0.20, leg_ip: 0.22, leg_labor: 0.30, leg_paralegal: 0.62,
  inv_equity: 0.28, inv_ibanking: 0.22, inv_portfolio: 0.25, inv_vc: 0.18, inv_quant: 0.20,
  hc_doctor: 0.08, hc_radiology: 0.25, hc_admin_hc: 0.72, hc_pharmacy: 0.48,
  edu_teach: 0.22, edu_special: 0.15, edu_admin_edu: 0.38,
  mfg_production: 0.55, mfg_quality: 0.48, mfg_maintenance: 0.40, mfg_process: 0.35,
  eng_civil: 0.25, eng_mech: 0.25, eng_elec: 0.28, eng_chem: 0.22,
  ret_buyer: 0.38, ret_ecom: 0.42, ret_inventory: 0.65, ret_cx: 0.55,
  saas_pm: 0.15, saas_growth: 0.45, saas_support: 0.62,
};

// Industry AI adoption rate (0-1)
const INDUSTRY_ADOPTION: Record<string, number> = {
  Technology: 0.82, "Financial Services": 0.72, "Media & Publishing": 0.68,
  Healthcare: 0.45, Legal: 0.62, Consulting: 0.58, Education: 0.50,
  Manufacturing: 0.52, Transportation: 0.55, "E-commerce": 0.70,
  "Biotech/Pharma": 0.48, Cybersecurity: 0.60, Retail: 0.62,
  Government: 0.35, Nonprofit: 0.30, Agriculture: 0.38, Gaming: 0.55,
  Insurance: 0.65, Hospitality: 0.42, Construction: 0.40, Energy: 0.48,
};

const INDUSTRY_KEY_MAP: Record<string, string> = {
  // Oracle key format (lowercase) → display name
  it_software: "Technology", it_web: "Technology", it_mobile: "Technology",
  it_saas: "Technology", it_ai_ml: "Technology", it_cybersec: "Cybersecurity",
  it_devops: "Technology", finance: "Financial Services", fintech: "Financial Services",
  insurance: "Insurance", investment: "Financial Services",
  media: "Media & Publishing", content: "Media & Publishing", marketing: "Media & Publishing",
  bpo: "Technology", hr: "Consulting", legal: "Legal", consulting: "Consulting",
  logistics: "Transportation", travel: "Hospitality", admin: "Consulting",
  healthcare: "Healthcare", pharma: "Biotech/Pharma", mental_health: "Healthcare",
  nursing: "Healthcare", education: "Education", edtech: "Education",
  manufacturing: "Manufacturing", automotive: "Manufacturing", engineering: "Energy",
  construction: "Construction", energy: "Energy", retail: "Retail",
  ecommerce: "E-commerce", government: "Government", ngo: "Nonprofit",
  agriculture: "Agriculture", gaming: "Gaming",
  // Display name format (title-case) → same display name (identity entries so
  // calcD1/calcD2 find the correct INDUSTRY_ADOPTION rate for non-oracle inputs)
  Technology: "Technology", "Financial Services": "Financial Services",
  "Media & Publishing": "Media & Publishing", Healthcare: "Healthcare",
  Legal: "Legal", Consulting: "Consulting", Education: "Education",
  Manufacturing: "Manufacturing", Transportation: "Transportation",
  "E-commerce": "E-commerce", "Biotech/Pharma": "Biotech/Pharma",
  Cybersecurity: "Cybersecurity", Retail: "Retail", Government: "Government",
  Nonprofit: "Nonprofit", Agriculture: "Agriculture", Gaming: "Gaming",
  Insurance: "Insurance", Hospitality: "Hospitality", Construction: "Construction",
  Energy: "Energy",
  // Common alternate display names from company_intelligence DB
  "Information Technology": "Technology", "IT Services": "Technology",
  "Software": "Technology", "SaaS": "Technology", "FinTech": "Financial Services",
  "Pharma": "Biotech/Pharma", "Pharmaceuticals": "Biotech/Pharma",
  "E-Commerce": "E-commerce", "Ecommerce": "E-commerce",
  "Media": "Media & Publishing", "Publishing": "Media & Publishing",
  "Logistics": "Transportation", "Supply Chain": "Transportation",
};

// D2 role category maturity (0-1)
const D2_CATEGORY: Record<string, number> = {
  bpo: 0.92, adm: 0.90, cnt: 0.88, fin: 0.80, data: 0.82, ds: 0.78,
  mkt: 0.78, adv: 0.75, des: 0.72, photo: 0.70, video: 0.68, qa: 0.75,
  erp: 0.72, sw: 0.68, web: 0.70, mob: 0.65, dev: 0.62, leg: 0.68,
  hr: 0.65, saas: 0.65, med: 0.70, inv: 0.72, ins: 0.65, ft: 0.62,
  log: 0.55, ret: 0.62, ec: 0.65, con: 0.48, sec: 0.58, ml: 0.50,
  bc: 0.45, game: 0.48, mfg: 0.50, auto: 0.48, eng: 0.42, hc: 0.38,
  nur: 0.28, ph: 0.38, mh: 0.22, edu: 0.35, edt: 0.45, gov: 0.28,
  ngo: 0.22, agri: 0.30, mus: 0.55, em: 0.45, aero: 0.38,
};

// Industry network density (higher = less moat = higher risk from D6)
const INDUSTRY_NETWORK: Record<string, number> = {
  consulting: 0.20, legal: 0.22, investment: 0.18, healthcare: 0.30,
  mental_health: 0.15, education: 0.30, it_software: 0.50, it_ai_ml: 0.45,
  finance: 0.35, media: 0.42, bpo: 0.75, content: 0.60, government: 0.28,
  ngo: 0.22, manufacturing: 0.55, retail: 0.65,
  mh: 0.15, nur: 0.30, ph: 0.38, hc: 0.30, sw: 0.50, ml: 0.42,
  sec: 0.35, dev: 0.48, fin: 0.35, ft: 0.40, ins: 0.38, inv: 0.20,
  hr: 0.38, leg: 0.22, con: 0.30, log: 0.52, adm: 0.72, edu: 0.35,
  edt: 0.42, mfg: 0.55, auto: 0.48, eng: 0.40, aero: 0.35, ret: 0.62,
  ec: 0.58, cnt: 0.60, mkt: 0.55, adv: 0.45, des: 0.42, qa: 0.58,
  bc: 0.38, game: 0.45, saas: 0.52, data: 0.45, ds: 0.45,
};

// Country D5 scores (0-100, higher = more exposure)
const COUNTRY_D5: Record<string, number> = {
  india: 68, usa: 55, uk: 48, germany: 42, canada: 50, australia: 52,
  singapore: 58, uae: 60, philippines: 72, indonesia: 65, brazil: 62,
  france: 44, japan: 46, china: 60, south_korea: 54, mexico: 63,
  netherlands: 46, sweden: 40, switzerland: 38, ireland: 48,
  pakistan: 70, bangladesh: 72, nigeria: 68, south_africa: 62,
  malaysia: 63, vietnam: 67, thailand: 63,
};

// Resolve raw industry string (oracle key OR display name, any case) to the
// canonical display-name key used by INDUSTRY_ADOPTION.
function resolveIndustryKey(industry: string): string {
  if (!industry) return "Technology";
  // Exact lookup (handles oracle keys and display names with identity entries)
  const exact = INDUSTRY_KEY_MAP[industry];
  if (exact) return exact;
  // Lowercase lookup (handles oracle keys passed in any capitalisation)
  const lc = industry.toLowerCase();
  const fromLc = INDUSTRY_KEY_MAP[lc];
  if (fromLc) return fromLc;
  // Direct lookup in INDUSTRY_ADOPTION (already a valid display name, just odd casing)
  if (INDUSTRY_ADOPTION[industry] !== undefined) return industry;
  return "Technology";
}

// ── D1: Task Automatability (0-100) ──────────────────────────────────────────
function calcD1(roleKey: string, industry: string, country = "usa"): number {
  const indKey = resolveIndustryKey(industry);
  const adoptionRate = INDUSTRY_ADOPTION[indKey] ?? 0.60;
  const complexity = ROLE_COMPLEXITY_MAP[roleKey] ?? 0.55;
  const base = Math.min(100, Math.max(0, Math.round((adoptionRate * 40) + (complexity * 60))));

  const d5 = COUNTRY_D5[country.toLowerCase()] ?? 55;
  const countryMod = 0.88 + (d5 / 100) * 0.18;
  return Math.min(100, Math.max(0, Math.round(base * countryMod)));
}

// ── D2: AI Tool Maturity (0-100) ─────────────────────────────────────────────
function calcD2(roleKey: string, industry: string): number {
  const indKey = resolveIndustryKey(industry);
  const adoptionRate = INDUSTRY_ADOPTION[indKey] ?? 0.55;
  const prefix = roleKey.split("_")[0];
  const categoryMaturity = D2_CATEGORY[prefix] ?? D2_CATEGORY[roleKey] ?? 0.55;
  return Math.min(100, Math.max(5, Math.round((adoptionRate * 0.60 + categoryMaturity * 0.40) * 100)));
}

// ── D3: Human Amplification (0-100, INVERTED — higher = less human value = more risk) ──
function calcD3(roleKey: string): number {
  const complexity = ROLE_COMPLEXITY_MAP[roleKey] ?? 0.50;
  return Math.min(100, Math.max(5, Math.round(complexity * 85)));
}

// ── D4: Experience Shield (0-100, higher = less protection = more risk) ──────
function calcD4(roleKey: string, exp: string): number {
  const expScores: Record<string, number> = {
    "0-2": 75, "2-5": 62, "5-10": 45, "10-15": 28, "15+": 18,
  };
  const base = expScores[exp] ?? 50;
  const complexity = ROLE_COMPLEXITY_MAP[roleKey] ?? 0.50;
  const shieldBonus = (1 - complexity) * 15;
  return Math.max(5, Math.round(base - shieldBonus));
}

// ── D5: Country Context (0-100) ───────────────────────────────────────────────
function calcD5(country: string): number {
  return COUNTRY_D5[country.toLowerCase()] ?? 55;
}

// ── D6: Social Capital Moat (0-100, higher = weaker moat = more risk) ────────
function calcD6(roleKey: string): number {
  const prefix = roleKey.split("_")[0];
  const density = INDUSTRY_NETWORK[prefix] ?? INDUSTRY_NETWORK[roleKey] ?? 0.55;
  return Math.min(100, Math.max(5, Math.round(density * 100)));
}

// ── Dynamic weights by industry ───────────────────────────────────────────────
function getWeights(industry: string) {
  // Normalize to lowercase so both oracle keys ("healthcare") and display names
  // ("Healthcare", "Health Care") match the same branch.
  const lc = (industry ?? "").toLowerCase().trim();
  if (lc.includes("health") || lc === "mental_health" || lc === "nursing" || lc === "pharma" || lc.includes("biotech"))
    return { d1: 0.18, d2: 0.12, d3: 0.30, d4: 0.22, d5: 0.08, d6: 0.10 };
  if (lc === "bpo" || lc === "admin" || lc.includes("outsourc") || lc.includes("bpo"))
    return { d1: 0.35, d2: 0.28, d3: 0.12, d4: 0.12, d5: 0.08, d6: 0.05 };
  if (lc === "content" || lc === "media" || lc.includes("publishing") || lc === "design" || lc === "animation" || lc === "music" || lc.includes("media & pub"))
    return { d1: 0.25, d2: 0.20, d3: 0.28, d4: 0.12, d5: 0.07, d6: 0.08 };
  if (lc === "legal" || lc === "consulting" || lc.includes("legal") || lc.includes("consult"))
    return { d1: 0.20, d2: 0.18, d3: 0.20, d4: 0.20, d5: 0.08, d6: 0.14 };
  if (lc.startsWith("it_") || lc === "fintech" || lc === "technology" || lc.includes("software") || lc.includes("saas") || lc.includes("information technology") || lc.includes("it services") || lc === "cybersecurity")
    return { d1: 0.28, d2: 0.20, d3: 0.18, d4: 0.16, d5: 0.09, d6: 0.09 };
  if (lc.includes("financ") || lc.includes("banking") || lc.includes("insurance") || lc.includes("invest"))
    return { d1: 0.26, d2: 0.20, d3: 0.22, d4: 0.16, d5: 0.07, d6: 0.09 };
  if (lc.includes("manufactur") || lc.includes("automotive") || lc.includes("engineer"))
    return { d1: 0.28, d2: 0.18, d3: 0.18, d4: 0.18, d5: 0.08, d6: 0.10 };
  if (lc.includes("retail") || lc.includes("ecommerce") || lc.includes("e-commerce"))
    return { d1: 0.30, d2: 0.22, d3: 0.16, d4: 0.14, d5: 0.08, d6: 0.10 };
  return { d1: 0.26, d2: 0.18, d3: 0.20, d4: 0.16, d5: 0.09, d6: 0.11 };
}

function getVerdict(score: number) {
  if (score < 25) return "AI-Resistant";
  if (score < 50) return "Resilient";
  if (score < 70) return "Exposed";
  return "Critical Risk";
}
function getTimeline(score: number) {
  if (score < 25) return "8-12 Years";
  if (score < 50) return "5-8 Years";
  if (score < 70) return "2-4 Years";
  return "Immediate (< 2 Years)";
}
function getUrgency(score: number) {
  if (score < 25) return "Low";
  if (score < 50) return "Moderate";
  if (score < 70) return "High";
  return "Critical";
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve((req) =>
  withRun('compute-oracle', req, async (_run) => {
  try {
    const { roleKey, industry = "it_software", experience = "5-10", country = "usa" } = await req.json();
    if (!roleKey) return json({ error: "roleKey required" }, 400);

    const w = getWeights(industry);

    const d1 = calcD1(roleKey, industry, country);
    const d2 = calcD2(roleKey, industry);
    const d3 = calcD3(roleKey);  // inverted in formula
    const d4 = calcD4(roleKey, experience);
    const d5 = calcD5(country);
    const d6 = calcD6(roleKey);

    // Final formula: score = D1*w1 + D2*w2 + (100-D3)*w3 + D4*w4 + D5*w5 + D6*w6
    const raw =
      d1 * w.d1 +
      d2 * w.d2 +
      (100 - d3) * w.d3 +
      d4 * w.d4 +
      d5 * w.d5 +
      d6 * w.d6;

    const total = Math.min(98, Math.max(4, Math.round(raw)));

    const dimensions = [
      {
        key: "D1",
        label: "Task Automatability",
        score: d1,
        weight: Math.round(w.d1 * 100),
        reason: `${d1 > 65 ? "High" : d1 > 40 ? "Moderate" : "Low"} AI task coverage in ${industry} sector.`,
      },
      {
        key: "D2",
        label: "AI Tool Maturity",
        score: d2,
        weight: Math.round(w.d2 * 100),
        reason: `AI tools for this role category are ${d2 > 70 ? "production-deployed at scale" : d2 > 50 ? "moderately mature" : "early-stage"}.`,
      },
      {
        key: "D3",
        label: "Human Amplification",
        score: 100 - d3,
        weight: Math.round(w.d3 * 100),
        reason: `${d3 < 30 ? "Strong" : d3 < 55 ? "Moderate" : "Limited"} human-specific value in this role.`,
      },
      {
        key: "D4",
        label: "Experience Shield",
        score: d4,
        weight: Math.round(w.d4 * 100),
        reason: `${experience} years of experience provides ${d4 < 30 ? "strong" : d4 < 50 ? "moderate" : "limited"} protection.`,
      },
      {
        key: "D5",
        label: "Country Context",
        score: d5,
        weight: Math.round(w.d5 * 100),
        reason: `${country.charAt(0).toUpperCase() + country.slice(1)} has ${d5 > 65 ? "high" : d5 > 50 ? "moderate" : "lower"} AI adoption pressure.`,
      },
      {
        key: "D6",
        label: "Social Capital Moat",
        score: d6,
        weight: Math.round(w.d6 * 100),
        reason: `Professional network in this role provides ${d6 < 35 ? "strong" : d6 < 55 ? "moderate" : "weak"} displacement protection.`,
      },
    ];

    return json({
      total,
      dimensions,
      verdict: getVerdict(total),
      urgency: getUrgency(total),
      timeline: getTimeline(total),
      reasoning: `Deterministic Oracle assessment for ${roleKey} in ${industry}. Score reflects ${experience} experience in ${country}.`,
      calculatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[compute-oracle] Error:", err.message);
    return json({ error: err.message }, 500);
  }
  }));
