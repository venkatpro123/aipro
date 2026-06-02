// ═══════════════════════════════════════════════════════════════════════════
// DisplacementTrajectoryEngine.ts — Displacement Trajectory Forecasting
//
// Architecture:
//   Inputs: currentScore + D1-D6 Oracle dimensions + roleKey + experience
//   Output: 6-year (2026-2031) trajectory with 3 scenarios + interpretation
//
// ⚡ Zero API cost — pure deterministic computation from existing Risk Oracle
//    scores. No new network calls introduced.
//
// Growth-rate table is grounded in:
//   • WEF Future of Jobs Report 2025
//   • McKinsey State of AI 2024
//   • Stanford AI Index 2025
// ═══════════════════════════════════════════════════════════════════════════

import { CareerIntelligence } from '../data/intelligence/types';

export interface OracleDimension {
  key: string;   // D1..D6
  label: string;
  score: number; // 0-100
  reason: string;
}

export interface OracleResult {
  total: number;
  dimensions: OracleDimension[];
  verdict?: string;
  urgency?: string;
  timeline?: string;
  reasoning?: string;
  safer_career_paths?: Array<{
    role: string;
    risk_reduction_pct: number;
    skill_gap: string;
    transition_difficulty: string;
  }>;
}

export interface TrajectoryPoint {
  year: string;          // "2026", "2027" …
  base: number;          // 0-100 baseline scenario
  pessimistic: number;   // 0-100 pessimistic (no upskilling)
  optimistic: number;    // 0-100 optimistic (active upskilling)
}

export interface TrajectoryRecommendation {
  type: 'upskill' | 'pivot' | 'timeline';
  icon: string;
  title: string;
  body: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

export type TrajectoryInterpretation =
  | 'stable'
  | 'safe_rising'
  | 'moderate_rising'
  | 'high_risk_imminent'
  | 'critical_now'
  | 'declining_risk';

export interface TrajectoryResult {
  years: TrajectoryPoint[];
  threshold: number;                       // % where displacement risk becomes critical
  baseYear: number;
  peakYear: string;                        // year the base scenario peaks
  peakScore: number;                       // % at peak
  interpretation: TrajectoryInterpretation;
  interpretationLabel: string;
  interpretationDetail: string;
  recommendations: TrajectoryRecommendation[];
  displacementCrossover: string | null;    // year base crosses threshold, or null
  growthPerYear: number;                   // average annual % growth in base scenario
}

// ─── Annual growth rate table ──────────────────────────────────────────────
// Each entry: [baseGrowth_pct/yr, threatAccel_pct/yr, shieldDecay_pct/yr]
// Numbers derived from AI adoption velocity research per role category.
//
// "baseGrowth" = base annual risk increase (no action)
// "threatAccel" = how fast D1+D2 threat compounds per year (pessimistic weight)
// "shieldDecay" = how fast D3-D6 shield degrades per yr in pessimistic scenario

type GrowthProfile = {
  baseGrowth: number;      // +% / year  (base scenario)
  pessimisticExtra: number; // additional +% / year on top of base
  optimisticSave: number;   // how many % / year upskilling *saves* vs base
};

const ROLE_GROWTH_PROFILES: Record<string, GrowthProfile> = {
  // ── Software / Tech ───────────────────────────────────────────────────────
  sw_backend:               { baseGrowth: 2.5, pessimisticExtra: 3.0, optimisticSave: 2.0 },
  sw_frontend:              { baseGrowth: 3.0, pessimisticExtra: 3.5, optimisticSave: 2.5 },
  sw_devops:                { baseGrowth: 1.5, pessimisticExtra: 2.0, optimisticSave: 1.5 },
  sw_cloud:                 { baseGrowth: 1.0, pessimisticExtra: 1.5, optimisticSave: 1.0 },
  ml_engineer:              { baseGrowth: 0.5, pessimisticExtra: 1.0, optimisticSave: 0.5 }, // growing field
  data_eng:                 { baseGrowth: 1.5, pessimisticExtra: 2.5, optimisticSave: 1.5 },
  sw_pm:                    { baseGrowth: 2.0, pessimisticExtra: 2.5, optimisticSave: 2.0 },

  // ── Finance ───────────────────────────────────────────────────────────────
  fin_account:              { baseGrowth: 4.0, pessimisticExtra: 4.5, optimisticSave: 3.0 },
  fin_audit:                { baseGrowth: 3.5, pessimisticExtra: 4.0, optimisticSave: 2.5 },
  fin_quant:                { baseGrowth: 1.0, pessimisticExtra: 1.5, optimisticSave: 0.8 },
  fin_fp_analyst:           { baseGrowth: 3.0, pessimisticExtra: 4.0, optimisticSave: 2.5 },
  inv_equity_res:           { baseGrowth: 3.5, pessimisticExtra: 4.5, optimisticSave: 2.5 },

  // ── BPO / Admin ───────────────────────────────────────────────────────────
  bpo_inbound:              { baseGrowth: 6.0, pessimisticExtra: 5.0, optimisticSave: 4.0 },
  bpo_data_entry:           { baseGrowth: 7.0, pessimisticExtra: 5.5, optimisticSave: 5.0 },
  bpo_chat:                 { baseGrowth: 7.5, pessimisticExtra: 6.0, optimisticSave: 5.0 },
  adm_exec:                 { baseGrowth: 4.5, pessimisticExtra: 4.0, optimisticSave: 3.0 },

  // ── Healthcare ────────────────────────────────────────────────────────────
  hc_surgeon:               { baseGrowth: 0.5, pessimisticExtra: 0.8, optimisticSave: 0.3 },
  nur_rn:                   { baseGrowth: 0.5, pessimisticExtra: 1.0, optimisticSave: 0.3 },
  hc_admin:                 { baseGrowth: 3.5, pessimisticExtra: 4.0, optimisticSave: 2.5 },
  hc_radio:                 { baseGrowth: 3.0, pessimisticExtra: 4.0, optimisticSave: 2.0 },

  // ── Legal ─────────────────────────────────────────────────────────────────
  leg_paralegal:            { baseGrowth: 4.0, pessimisticExtra: 4.5, optimisticSave: 3.0 },
  leg_corporate:            { baseGrowth: 2.0, pessimisticExtra: 2.5, optimisticSave: 1.5 },
  leg_litigation:           { baseGrowth: 1.5, pessimisticExtra: 2.0, optimisticSave: 1.0 },

  // ── HR ───────────────────────────────────────────────────────────────────
  hr_recruit:               { baseGrowth: 4.5, pessimisticExtra: 5.0, optimisticSave: 3.5 },
  hr_hrbp:                  { baseGrowth: 2.0, pessimisticExtra: 2.5, optimisticSave: 1.5 },

  // ── Creative / Media ─────────────────────────────────────────────────────
  des_graphic:              { baseGrowth: 4.5, pessimisticExtra: 5.0, optimisticSave: 3.5 },
  cnt_copy:                 { baseGrowth: 5.0, pessimisticExtra: 5.5, optimisticSave: 4.0 },
  des_ux:                   { baseGrowth: 2.5, pessimisticExtra: 3.5, optimisticSave: 2.0 },
  cnt_journalist:           { baseGrowth: 3.5, pessimisticExtra: 4.5, optimisticSave: 2.5 },
  med_video:                { baseGrowth: 3.0, pessimisticExtra: 4.0, optimisticSave: 2.5 },

  // ── Education ────────────────────────────────────────────────────────────
  edu_teacher_k12:          { baseGrowth: 1.0, pessimisticExtra: 1.5, optimisticSave: 0.8 },
  edu_instructional_designer: { baseGrowth: 2.0, pessimisticExtra: 3.0, optimisticSave: 1.5 },

  // ── Engineering / Manufacturing ───────────────────────────────────────────
  eng_struct:               { baseGrowth: 1.5, pessimisticExtra: 2.5, optimisticSave: 1.0 },
  mfg_plant_mgr:            { baseGrowth: 2.0, pessimisticExtra: 3.0, optimisticSave: 1.5 },
  mfg_automation:           { baseGrowth: 0.5, pessimisticExtra: 1.0, optimisticSave: 0.3 }, // in demand

  // ── v47.0 additions: 100+ roles ─────────────────────────────────────────

  // ── Tech / Engineering extensions ─────────────────────────────────────────
  sw_mobile:                { baseGrowth: 2.0, pessimisticExtra: 2.5, optimisticSave: 1.5 },
  sw_security:              { baseGrowth: 0.5, pessimisticExtra: 0.8, optimisticSave: 0.4 }, // always in demand
  sw_qa:                    { baseGrowth: 4.0, pessimisticExtra: 4.5, optimisticSave: 3.0 }, // AI test gen displacing
  sw_platform:              { baseGrowth: 0.8, pessimisticExtra: 1.2, optimisticSave: 0.6 },
  sw_staff:                 { baseGrowth: 0.5, pessimisticExtra: 1.0, optimisticSave: 0.4 },
  sw_principal:             { baseGrowth: 0.4, pessimisticExtra: 0.8, optimisticSave: 0.3 },
  ml_research:              { baseGrowth: 0.3, pessimisticExtra: 0.6, optimisticSave: 0.2 },
  data_analyst:             { baseGrowth: 3.5, pessimisticExtra: 4.0, optimisticSave: 2.5 }, // AI BI tools
  biz_analyst:              { baseGrowth: 3.8, pessimisticExtra: 4.5, optimisticSave: 3.0 },
  tech_pm:                  { baseGrowth: 2.0, pessimisticExtra: 2.8, optimisticSave: 1.8 },
  scrum_master:             { baseGrowth: 3.5, pessimisticExtra: 4.0, optimisticSave: 2.5 },
  devrel:                   { baseGrowth: 2.5, pessimisticExtra: 3.0, optimisticSave: 2.0 },
  solutions_architect:      { baseGrowth: 1.0, pessimisticExtra: 1.5, optimisticSave: 0.8 },
  it_support:               { baseGrowth: 4.5, pessimisticExtra: 5.0, optimisticSave: 3.5 },
  it_manager:               { baseGrowth: 2.5, pessimisticExtra: 3.0, optimisticSave: 2.0 },

  // ── Finance ──────────────────────────────────────────────────────────────
  fin_investment_banker:    { baseGrowth: 2.5, pessimisticExtra: 3.5, optimisticSave: 2.0 },
  fin_private_equity:       { baseGrowth: 1.5, pessimisticExtra: 2.0, optimisticSave: 1.0 },
  fin_hedge_fund:           { baseGrowth: 2.0, pessimisticExtra: 2.5, optimisticSave: 1.5 },
  fin_credit_analyst:       { baseGrowth: 3.5, pessimisticExtra: 4.0, optimisticSave: 2.5 },
  fin_risk_analyst:         { baseGrowth: 2.5, pessimisticExtra: 3.0, optimisticSave: 1.8 },
  fin_cfo:                  { baseGrowth: 1.0, pessimisticExtra: 1.5, optimisticSave: 0.8 },
  fin_controller:           { baseGrowth: 2.0, pessimisticExtra: 2.5, optimisticSave: 1.5 },
  fin_treasury:             { baseGrowth: 1.5, pessimisticExtra: 2.0, optimisticSave: 1.0 },
  fin_compliance:           { baseGrowth: 1.5, pessimisticExtra: 2.0, optimisticSave: 1.0 },
  fin_actuary:              { baseGrowth: 1.0, pessimisticExtra: 1.5, optimisticSave: 0.8 },
  fin_insurance_underwriter:{ baseGrowth: 4.5, pessimisticExtra: 5.5, optimisticSave: 3.5 },
  fin_mortgage_originator:  { baseGrowth: 5.0, pessimisticExtra: 6.0, optimisticSave: 4.0 },
  fin_tax_analyst:          { baseGrowth: 3.0, pessimisticExtra: 4.0, optimisticSave: 2.5 },

  // ── Healthcare ───────────────────────────────────────────────────────────
  hc_physician:             { baseGrowth: 0.3, pessimisticExtra: 0.5, optimisticSave: 0.2 },
  hc_specialist:            { baseGrowth: 0.4, pessimisticExtra: 0.6, optimisticSave: 0.3 },
  hc_radiologist:           { baseGrowth: 2.5, pessimisticExtra: 4.0, optimisticSave: 1.5 }, // AI radiology
  hc_pathologist:           { baseGrowth: 2.0, pessimisticExtra: 3.5, optimisticSave: 1.2 },
  hc_pharmacist:            { baseGrowth: 2.0, pessimisticExtra: 3.0, optimisticSave: 1.5 },
  hc_physical_therapist:    { baseGrowth: 0.5, pessimisticExtra: 0.8, optimisticSave: 0.3 },
  hc_clinical_researcher:   { baseGrowth: 0.8, pessimisticExtra: 1.2, optimisticSave: 0.5 },
  hc_biotech_analyst:       { baseGrowth: 1.0, pessimisticExtra: 1.5, optimisticSave: 0.8 },
  hc_informatics:           { baseGrowth: 1.0, pessimisticExtra: 1.5, optimisticSave: 0.7 },
  hc_regulatory_affairs:    { baseGrowth: 0.8, pessimisticExtra: 1.2, optimisticSave: 0.5 },
  hc_revenue_cycle:         { baseGrowth: 3.5, pessimisticExtra: 4.5, optimisticSave: 2.8 },

  // ── Legal ─────────────────────────────────────────────────────────────────
  leg_partner:              { baseGrowth: 1.0, pessimisticExtra: 1.5, optimisticSave: 0.8 },
  leg_associate:            { baseGrowth: 2.5, pessimisticExtra: 3.5, optimisticSave: 2.0 },
  leg_contract_attorney:    { baseGrowth: 4.0, pessimisticExtra: 5.0, optimisticSave: 3.0 },
  leg_compliance_officer:   { baseGrowth: 1.0, pessimisticExtra: 1.5, optimisticSave: 0.8 },
  leg_ip_attorney:          { baseGrowth: 0.8, pessimisticExtra: 1.2, optimisticSave: 0.5 },
  leg_privacy_counsel:      { baseGrowth: 0.5, pessimisticExtra: 0.8, optimisticSave: 0.3 },
  leg_paralegal_v2:         { baseGrowth: 4.0, pessimisticExtra: 5.0, optimisticSave: 3.0 },

  // ── HR ────────────────────────────────────────────────────────────────────
  hr_talent_partner:        { baseGrowth: 3.0, pessimisticExtra: 3.5, optimisticSave: 2.5 },
  hr_comp_benefits:         { baseGrowth: 2.0, pessimisticExtra: 2.5, optimisticSave: 1.5 },
  hr_chro:                  { baseGrowth: 1.0, pessimisticExtra: 1.5, optimisticSave: 0.8 },
  hr_people_analytics:      { baseGrowth: 1.0, pessimisticExtra: 1.5, optimisticSave: 0.6 },
  hr_dei:                   { baseGrowth: 2.5, pessimisticExtra: 3.0, optimisticSave: 2.0 }, // budget pressure
  hr_ld:                    { baseGrowth: 2.5, pessimisticExtra: 3.0, optimisticSave: 2.0 },

  // ── Marketing ────────────────────────────────────────────────────────────
  mkt_cmo:                  { baseGrowth: 1.5, pessimisticExtra: 2.0, optimisticSave: 1.2 },
  mkt_growth_pm:            { baseGrowth: 2.0, pessimisticExtra: 2.5, optimisticSave: 1.5 },
  mkt_performance:          { baseGrowth: 2.5, pessimisticExtra: 3.0, optimisticSave: 2.0 },
  mkt_copywriter:           { baseGrowth: 5.5, pessimisticExtra: 6.0, optimisticSave: 4.0 },
  mkt_pmm:                  { baseGrowth: 2.0, pessimisticExtra: 2.5, optimisticSave: 1.5 },
  mkt_analyst:              { baseGrowth: 3.5, pessimisticExtra: 4.0, optimisticSave: 2.5 },
  mkt_social_media:         { baseGrowth: 4.5, pessimisticExtra: 5.0, optimisticSave: 3.5 },

  // ── Operations ────────────────────────────────────────────────────────────
  ops_supply_chain:         { baseGrowth: 1.5, pessimisticExtra: 2.0, optimisticSave: 1.0 },
  ops_procurement:          { baseGrowth: 2.5, pessimisticExtra: 3.0, optimisticSave: 1.8 },
  ops_facilities:           { baseGrowth: 3.0, pessimisticExtra: 3.5, optimisticSave: 2.5 },
  ops_logistics_mgr:        { baseGrowth: 2.0, pessimisticExtra: 2.5, optimisticSave: 1.5 },
  ops_coo:                  { baseGrowth: 0.8, pessimisticExtra: 1.2, optimisticSave: 0.5 },
  ops_process_excellence:   { baseGrowth: 2.5, pessimisticExtra: 3.0, optimisticSave: 2.0 },

  // ── Sales ─────────────────────────────────────────────────────────────────
  sales_enterprise_ae:      { baseGrowth: 1.5, pessimisticExtra: 2.0, optimisticSave: 1.2 },
  sales_se:                 { baseGrowth: 1.2, pessimisticExtra: 1.8, optimisticSave: 1.0 },
  sales_sdr:                { baseGrowth: 5.0, pessimisticExtra: 6.0, optimisticSave: 4.0 }, // AI outreach
  sales_cs_manager:         { baseGrowth: 2.5, pessimisticExtra: 3.0, optimisticSave: 2.0 },
  sales_revops:             { baseGrowth: 1.5, pessimisticExtra: 2.0, optimisticSave: 1.2 },

  // ── Design & Creative ─────────────────────────────────────────────────────
  des_ux_researcher:        { baseGrowth: 2.0, pessimisticExtra: 2.5, optimisticSave: 1.5 },
  des_product:              { baseGrowth: 2.5, pessimisticExtra: 3.0, optimisticSave: 2.0 },
  des_motion:               { baseGrowth: 4.0, pessimisticExtra: 5.0, optimisticSave: 3.0 },
  des_brand:                { baseGrowth: 3.5, pessimisticExtra: 4.5, optimisticSave: 2.5 },
  des_illustrator:          { baseGrowth: 5.0, pessimisticExtra: 6.0, optimisticSave: 4.0 },

  // ── Industrial / Trades ───────────────────────────────────────────────────
  ind_mech_engineer:        { baseGrowth: 1.5, pessimisticExtra: 2.0, optimisticSave: 1.0 },
  ind_electrical_engineer:  { baseGrowth: 1.2, pessimisticExtra: 1.8, optimisticSave: 0.8 },
  ind_civil_engineer:       { baseGrowth: 1.0, pessimisticExtra: 1.5, optimisticSave: 0.7 },
  ind_robotics:             { baseGrowth: 0.5, pessimisticExtra: 0.8, optimisticSave: 0.3 }, // growing field
  ind_electrician:          { baseGrowth: 0.5, pessimisticExtra: 0.8, optimisticSave: 0.3 },
  ind_plumber:              { baseGrowth: 0.5, pessimisticExtra: 0.8, optimisticSave: 0.3 },
  ind_welder:               { baseGrowth: 1.0, pessimisticExtra: 1.5, optimisticSave: 0.7 },
  ind_hvac:                 { baseGrowth: 0.5, pessimisticExtra: 0.8, optimisticSave: 0.3 },

  // ── Education ────────────────────────────────────────────────────────────
  edu_professor:            { baseGrowth: 1.2, pessimisticExtra: 1.8, optimisticSave: 0.8 },
  edu_curriculum_designer:  { baseGrowth: 2.0, pessimisticExtra: 3.0, optimisticSave: 1.5 },
  edu_corporate_trainer:    { baseGrowth: 3.0, pessimisticExtra: 4.0, optimisticSave: 2.5 },

  // ── Public Sector / Government ────────────────────────────────────────────
  gov_policy_analyst:       { baseGrowth: 1.0, pessimisticExtra: 1.5, optimisticSave: 0.8 },
  gov_federal_employee:     { baseGrowth: 1.5, pessimisticExtra: 2.0, optimisticSave: 1.0 },
  gov_defense_contractor:   { baseGrowth: 0.8, pessimisticExtra: 1.2, optimisticSave: 0.5 },

  // ── Media / Entertainment ────────────────────────────────────────────────
  med_journalist:           { baseGrowth: 4.5, pessimisticExtra: 5.5, optimisticSave: 3.5 },
  med_voice_actor:          { baseGrowth: 5.5, pessimisticExtra: 7.0, optimisticSave: 4.0 },
  med_animator:             { baseGrowth: 4.0, pessimisticExtra: 5.5, optimisticSave: 3.0 },
  med_game_designer:        { baseGrowth: 2.0, pessimisticExtra: 2.5, optimisticSave: 1.5 },

  // ── Default fallback ─────────────────────────────────────────────────────
  generic:                  { baseGrowth: 3.0, pessimisticExtra: 3.5, optimisticSave: 2.5 },
};

// ─── Experience modifier ──────────────────────────────────────────────────
// More experienced workers → risk grows slower (they can adapt / command premium)
const EXPERIENCE_MODIFIER: Record<string, number> = {
  '0-2':   1.30,   // 30% faster risk growth for juniors
  '2-5':   1.10,
  '5-10':  1.00,   // baseline
  '10-15': 0.85,
  '15+':   0.75,
};

// ─── Helper ───────────────────────────────────────────────────────────────
const clamp = (v: number, min = 0, max = 100): number => Math.max(min, Math.min(max, v));

/**
 * resolveGrowthProfile — Returns the GrowthProfile for a role key.
 *
 * Priority:
 *  1. Derive from careerIntelligence.riskTrend if available (data-driven, µmost accurate)
 *  2. Direct key match in ROLE_GROWTH_PROFILES table
 *  3. Prefix heuristic (sw_* → sw_backend, etc.)
 *  4. Generic fallback
 *
 * Using intelligence.riskTrend closes the gap for all 400+ oracle roles
 * that previously fell through to the generic 3%/yr profile.
 */
const resolveGrowthProfile = (
  roleKey: string,
  careerIntelligence?: CareerIntelligence | null
): GrowthProfile => {
  // ── Priority 1: Data-driven from seeded riskTrend ──────────────────────
  if (careerIntelligence?.riskTrend && careerIntelligence.riskTrend.length >= 2) {
    const trend = careerIntelligence.riskTrend;
    // Sort ascending by year to ensure correct slope direction
    const sorted = [...trend].sort((a, b) => a.year - b.year);
    const rawGrowth = (sorted[sorted.length - 1].riskScore - sorted[0].riskScore)
      / (sorted.length - 1); // avg pts per year
    // Floor raised from 0.3 to 0.8: even the most protected roles have some
    // AI-driven risk growth — 0.3%/yr made the optimistic scenario flat-line.
    const baseGrowth = Math.max(0.8, Math.min(8.0, rawGrowth));
    // optimisticSave capped at 65% of baseGrowth so the optimistic scenario
    // always shows some forward risk movement (never zero growth).
    return {
      baseGrowth,
      pessimisticExtra: parseFloat((baseGrowth * 0.55).toFixed(2)),
      optimisticSave:   parseFloat((baseGrowth * 0.65).toFixed(2)),
    };
  }

  // ── Priority 2: Direct match in hardcoded table ───────────────────────────
  if (ROLE_GROWTH_PROFILES[roleKey]) return ROLE_GROWTH_PROFILES[roleKey];

  // ── Priority 3: Prefix heuristic ──────────────────────────────────────
  const prefix = (roleKey || '').split('_')[0];
  const prefixDefaults: Record<string, string> = {
    sw: 'sw_backend', ml: 'ml_engineer', sec: 'sw_devops', dev: 'sw_devops',
    fin: 'fin_account', bpo: 'bpo_inbound', hc: 'hc_admin', nur: 'nur_rn',
    leg: 'leg_corporate', hr: 'hr_hrbp', des: 'des_ux', cnt: 'cnt_copy',
    edu: 'edu_teacher_k12', eng: 'eng_struct', mfg: 'mfg_plant_mgr',
    adm: 'adm_exec', med: 'med_video', mkt: 'cnt_copy', anim: 'des_graphic',
    ret: 'adm_exec', gov: 'leg_corporate', data: 'ml_engineer',
  };
  const resolved = prefixDefaults[prefix];
  if (resolved && ROLE_GROWTH_PROFILES[resolved]) return ROLE_GROWTH_PROFILES[resolved];

  // ── Priority 4: Generic fallback ──────────────────────────────────────────
  return ROLE_GROWTH_PROFILES.generic;
};

// ─── D1+D2 threat amplifier ───────────────────────────────────────────────
// Higher D1 (Task Automatability) + D2 (AI Tool Maturity) → faster base growth
const getThreatAmplifier = (dimensions: OracleDimension[]): number => {
  const d1 = dimensions.find(d => d.key === 'D1')?.score ?? 50;
  const d2 = dimensions.find(d => d.key === 'D2')?.score ?? 50;
  const threatAvg = (d1 + d2) / 2; // 0-100
  // Scale: 50 → 1.0x, 80 → 1.30x, 20 → 0.70x
  return 0.70 + (threatAvg / 100) * 0.60;
};

// ─── D3..D6 shield factor (slows growth in base/optimistic scenario) ──────
const getShieldFactor = (dimensions: OracleDimension[]): number => {
  const d3 = dimensions.find(d => d.key === 'D3')?.score ?? 50;
  const d4 = dimensions.find(d => d.key === 'D4')?.score ?? 50;
  const d5 = dimensions.find(d => d.key === 'D5')?.score ?? 50;
  const d6 = dimensions.find(d => d.key === 'D6')?.score ?? 50;
  // D3 and D6 = human factors (shield the worker); D5 inverted (high country exposure = bad)
  const shieldAvg = (d3 + d4 + (100 - d5) + d6) / 4; // 0-100
  // Scale: 50 → 1.0x slowdown, 80 → 1.30x slowdown (slows growth more)
  return 0.50 + (shieldAvg / 100) * 1.00;
};

// ─── Interpretation engine ────────────────────────────────────────────────
const interpret = (
  currentScore: number,
  finalBase: number,
  threshold: number,
  displacementCrossover: string | null
): { interpretation: TrajectoryInterpretation; label: string; detail: string } => {
  const delta = finalBase - currentScore;

  if (currentScore >= threshold) {
    return {
      interpretation: 'critical_now',
      label: '🔴 Critical Risk — Immediate Action Required',
      detail: `Your current score already exceeds the ${threshold}% displacement threshold. The trajectory shows continued pressure — your window for proactive career transition is now.`,
    };
  }

  if (displacementCrossover && parseInt(displacementCrossover) <= new Date().getFullYear() + 2) {
    return {
      interpretation: 'high_risk_imminent',
      label: '🟠 High Risk Emerging in 1–2 Years',
      detail: `Based on current AI adoption velocity and role-specific exposure, your risk is projected to cross the ${threshold}% threshold by ${displacementCrossover}. Early action now can significantly change this trajectory.`,
    };
  }

  if (displacementCrossover) {
    return {
      interpretation: 'moderate_rising',
      label: `⚠️ Risk Increasing — Threshold Projected in ${displacementCrossover}`,
      detail: `Your role is currently manageable but risk is compounding. The ${threshold}% critical threshold is expected around ${displacementCrossover} unless you take proactive steps.`,
    };
  }

  if (delta < 5) {
    return {
      interpretation: currentScore < 35 ? 'stable' : 'safe_rising',
      label: currentScore < 35 ? '✅ Stable Trajectory — Low Future Risk' : '🟡 Moderate But Controlled',
      detail: `Risk growth is modest over the 5-year window. Staying current with AI augmentation tools in your field will keep this stable.`,
    };
  }

  if (delta < 0) {
    return {
      interpretation: 'declining_risk',
      label: '✅ Risk Declining Over Time',
      detail: 'Your role benefits from increasing human irreplaceability factors over the forecast window — a positive signal. Maintain your current trajectory.',
    };
  }

  return {
    interpretation: 'safe_rising',
    label: '🟡 Currently Safe — Future Risk Increasing',
    detail: 'Your current score is within safe bounds, but underlying risk factors are compounding. The next 2–3 years are your optimal window to upskill and diversify.',
  };
};

// ─── Recommendation generator ─────────────────────────────────────────────
const generateRecommendations = (
  interpretation: TrajectoryInterpretation,
  currentScore: number,
  oracleResult: OracleResult | null,
  growthPerYear: number,
  careerIntelligence?: CareerIntelligence | null
): TrajectoryRecommendation[] => {
  const recs: TrajectoryRecommendation[] = [];

  // 1. Timeline urgency
  const urgencyMap: Record<TrajectoryInterpretation, TrajectoryRecommendation['urgency']> = {
    critical_now:       'critical',
    high_risk_imminent: 'high',
    moderate_rising:    'medium',
    safe_rising:        'medium',
    stable:             'low',
    declining_risk:     'low',
  };

  const urgency = urgencyMap[interpretation];

  const timelineMessages: Record<string, string> = {
    critical:  'Begin your transition plan within the next 30 days. The risk curve is already beyond safe limits.',
    high:      'You have an estimated 12–18 month window before this role enters high-risk territory. Start planning now.',
    medium:    'You have a 2–3 year runway. Use this time to diversify your skill portfolio and build options.',
    low:       'Your trajectory is stable. Maintain a 6-month review cycle and keep your network active.',
  };

  recs.push({
    type: 'timeline',
    icon: urgency === 'critical' || urgency === 'high' ? '⏳' : '📅',
    title: 'Your Action Window',
    body: timelineMessages[urgency],
    urgency,
  });

  // 2. Upskilling recommendation — use safer career paths if available
  const intelPath = careerIntelligence?.careerPaths?.[0];
  const oraclePath = oracleResult?.safer_career_paths?.[0];
  
  if (intelPath) {
    recs.push({
      type: 'pivot',
      icon: '🎯',
      title: `Top Transition: ${intelPath.role}`,
      body: `Transitioning to ${intelPath.role} reduces your risk by up to ${intelPath.riskReduction}%. Skill gap: ${intelPath.skillGap}. Difficulty: ${intelPath.transitionDifficulty}.`,
      urgency: urgency === 'critical' ? 'critical' : 'high',
    });
  } else if (oraclePath) {
    recs.push({
      type: 'pivot',
      icon: '🎯',
      title: `Top Transition: ${oraclePath.role}`,
      body: `Transitioning to ${oraclePath.role} reduces your risk by up to ${oraclePath.risk_reduction_pct}%. Skill gap: ${oraclePath.skill_gap}. Difficulty: ${oraclePath.transition_difficulty}.`,
      urgency: urgency === 'critical' ? 'critical' : 'high',
    });
  }

  // 3. AI upskilling action — generic but targeted by growth rate
  if (growthPerYear >= 4) {
    recs.push({
      type: 'upskill',
      icon: '🤖',
      title: 'High AI Disruption Rate — Upskill Now',
      body: `Your role is experiencing ${growthPerYear.toFixed(1)}% annual risk growth — above the average of 3%. Prioritise learning AI augmentation tools specific to your domain (e.g. AI-assisted workflows, prompt engineering, AI-native productivity tools).`,
      urgency: 'high',
    });
  } else if (growthPerYear >= 2) {
    recs.push({
      type: 'upskill',
      icon: '📈',
      title: 'Build AI Fluency as a Shield',
      body: `Risk is growing at ${growthPerYear.toFixed(1)}%/yr. Roles that deeply integrate AI tools into their workflows consistently show 40–60% lower displacement risk. Dedicate 2–3 hours/week to AI-native tools in your domain.`,
      urgency: 'medium',
    });
  }

  return recs;
};

// ─── Main export ──────────────────────────────────────────────────────────
export interface TrajectoryEngineParams {
  currentScore: number;                  // 0-100 from ensemble/oracle
  oracleResult: OracleResult | null;     // full D1-D6 oracle output (may be null)
  roleKey: string;                       // e.g. "sw_backend", "fin_account"
  experience?: string;                   // "0-2" | "2-5" | "5-10" | "10-15" | "15+"
  careerIntelligence?: CareerIntelligence | null;
}

export const computeTrajectory = (params: TrajectoryEngineParams): TrajectoryResult => {
  const { currentScore, oracleResult, roleKey, experience = '5-10', careerIntelligence } = params;

  const dimensions = oracleResult?.dimensions ?? [];
  // ── Upgraded: pass careerIntelligence so data-driven profile takes priority ──
  const profile = resolveGrowthProfile(roleKey, careerIntelligence);

  const threatAmp  = getThreatAmplifier(dimensions);
  const shieldFact = getShieldFactor(dimensions);
  const expMod     = EXPERIENCE_MODIFIER[experience] ?? 1.0;

  // Effective annual growth rates per scenario (all in % points/yr)
  const baseGrowth       = profile.baseGrowth * threatAmp * expMod / shieldFact;
  // BUG-B9 FIX: pessimisticGrowth now also benefits from shield factor (at 40% effectiveness)
  // Previously had NO shield — risk grew unboundedly in pessimistic scenario for shielded roles.
  // Even in the worst-case scenario, human factors slow AI displacement somewhat.
  const pessimisticGrowth = (profile.baseGrowth + profile.pessimisticExtra) * threatAmp * expMod / (1 + (shieldFact - 1) * 0.40);
  // Minimum optimistic growth = 0.3 %/yr so the curve never goes flat —
  // even with intense upskilling, some underlying AI adoption pressure remains.
  const optimisticGrowth  = Math.max(0.3, (profile.baseGrowth - profile.optimisticSave) * expMod / shieldFact);

  const baseYear   = new Date().getFullYear();
  const numYears   = 6;
  const threshold  = 65; // % — displacement critical threshold

  const years: TrajectoryPoint[] = [];
  let base = currentScore;
  let pess = currentScore;
  let opti = currentScore;

  for (let i = 0; i < numYears; i++) {
    const year = String(baseYear + i);

    // Logistic dampening: as risk approaches 100, growth slows
    const baseFactor  = 1 - base  / 110;
    const pessFactor  = 1 - pess  / 110;
    const optiFactor  = 1 - opti  / 110;

    base = clamp(base + baseGrowth       * baseFactor);
    pess = clamp(pess + pessimisticGrowth * pessFactor);
    opti = clamp(opti + optimisticGrowth  * optiFactor);

    years.push({
      year,
      base:        Math.round(base),
      pessimistic: Math.round(pess),
      optimistic:  Math.round(opti),
    });
  }

  // Peak
  const peakPoint = [...years].sort((a, b) => b.base - a.base)[0];

  // Crossover year (when base exceeds threshold)
  const crossoverPoint = years.find(y => y.base >= threshold);
  const displacementCrossover = crossoverPoint?.year ?? null;

  // Average growth per year
  const growthPerYear = (years[years.length - 1].base - currentScore) / numYears;

  const { interpretation, label, detail } = interpret(
    currentScore,
    years[years.length - 1].base,
    threshold,
    displacementCrossover
  );

  const recommendations = generateRecommendations(
    interpretation,
    currentScore,
    oracleResult,
    growthPerYear,
    careerIntelligence
  );

  return {
    years,
    threshold,
    baseYear,
    peakYear:               peakPoint.year,
    peakScore:              peakPoint.base,
    interpretation,
    interpretationLabel:    label,
    interpretationDetail:   detail,
    recommendations,
    displacementCrossover,
    growthPerYear,
  };
};
