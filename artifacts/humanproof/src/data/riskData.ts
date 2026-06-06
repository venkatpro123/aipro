// ═══════════════════════════════════════════════════════════
// riskData.ts — UI Stubs & Constants
// ALL PROPRIETARY BUSINESS LOGIC HAS BEEN MOVED TO BACKEND EDGE FUNCTIONS.
// This file exists only to provide KEY_REGISTRY constants to the UI and 
// prevent import breakages while keeping intelligence protected.
// ═══════════════════════════════════════════════════════════

export const DATA_VERSION = '2026-Q2';
// BUG-09 FIX: DATA_LAST_UPDATED is now computed from Vite build time.
// Vite exposes the build timestamp via import.meta.env.VITE_BUILD_DATE
// (set in vite.config.ts via define: { 'import.meta.env.VITE_BUILD_DATE': ... })
// Falls back to a static string if the env var is not set (local dev).
export const DATA_LAST_UPDATED: string = (
  typeof import.meta !== 'undefined' &&
  (import.meta as any).env?.VITE_BUILD_DATE
) ? (import.meta as any).env.VITE_BUILD_DATE
  : new Date().toISOString().split('T')[0];

// KEY_REGISTRY — all localStorage keys used by this app
export const KEY_REGISTRY = {
  SCORE_HISTORY:      'hp_score_history',
  SKILL_SELECTIONS:   'hp_skill_selections',
  SKILL_BREAKDOWN:    'hp_skill_breakdown',
  ROADMAP_START:      'hp_roadmap_start',
  ROADMAP_START_DATE: 'hp_roadmap_start_date',
  JOURNAL_ENTRIES:    'hp_journal_entries',
  DIGEST_SUBSCRIBED:  'hp_digest_subscribed',
  QUIZ_PROGRESS:      'hp_quiz_progress',
  ROADMAP_PROGRESS:   'hp_roadmap_progress',
  VISITED:            'hp_visited',
  WAITLIST_EMAIL:     'hp_waitlist_email',
  LAST_SAVE_JOB:      'hp_last_save_job',
  LAST_SAVE_SKILL:    'hp_last_save_skill',
  LAST_SAVE_HUMAN:    'hp_last_save_human-index',
  HISTORY_WARNED:     'hp_history_warned',
} as const;

// Stubs to prevent type errors in older components
export const TASK_AUTO: Record<string, Record<string, number>> = {};
export const DISRUPTION_VELOCITY: Record<string, number> = {};
export const AUGMENTATION: Record<string, number> = {};
export const NETWORK_MOAT: Record<string, number> = {};
export const EXP_SENSITIVITY: Record<string, number> = {};
export const EXP_RISK_BASE: Record<string, number> = {};
export const COUNTRY_DATA: Record<string, [number, number]> = {};
export const INDUSTRY_KEY_MULT: Record<string, number> = {};
export const D3_CURVE_EXPONENT = 0.70;

// D7: Agentic Disruption Potential — client-side lookup (mirrors supabase riskData.ts)
// Used by trajectory engine + StructuralRiskPanel. NOT in formula weights (D1–D6 unchanged).
export const D7_AGENTIC_DISRUPTION: Record<string, number> = {
  bpo_data_entry: 97, bpo_chat: 95, bpo_inbound: 90, bpo_email_support: 88,
  bpo_outbound: 86, bpo_virtual: 82, bpo_hr_ops: 78, bpo_social_mod: 62, bpo_claims: 85,
  adm_data_entry: 95, adm_office: 80, adm_reception: 72, adm_exec: 60, adm_coord: 65,
  cnt_seo_content: 93, cnt_copy: 88, cnt_blog: 90, cnt_email: 88, cnt_social: 85,
  cnt_script: 80, cnt_ghostwrite: 82, cnt_translation: 78, cnt_tech_write: 72, cnt_ux_write: 60,
  mkt_seo: 80, mkt_sem: 75, mkt_analytics: 72, mkt_copywriter: 86,
  mkt_crm: 68, mkt_social_ads: 74, mkt_growth: 58, mkt_brand: 45, mkt_product: 42,
  fin_payroll: 92, fin_account: 85, fin_reporting: 82, fin_audit: 76,
  fin_tax: 74, fin_credit: 70, fin_fp: 62, fin_risk: 55,
  fin_compliance: 60, fin_treasury: 58, fin_invest: 50,
  fin_investment_banker: 50, fin_private_equity: 42, fin_quant: 60,
  ins_claims: 86, ins_admin: 84, ins_underwrite: 72,
  leg_paralegal: 84, leg_contract_attorney: 76, leg_corporate: 58, leg_compliance: 55,
  leg_litigation: 38, leg_ip: 42, leg_tax_law: 65, leg_cyberlaw: 50,
  sw_frontend: 72, sw_backend: 65, sw_fullstack: 68, sw_testing: 78, sw_api: 70,
  qa_manual: 80, qa_auto: 62, sw_devops: 48, sw_cloud: 42, sw_mobile_dev: 65,
  sw_security: 35, sw_arch: 30, sw_lead: 28, sw_legacy: 55, sw_db: 68,
  ml_engineer: 38, ml_research: 28, ml_prompt_eng: 45, ml_nlp: 42, ml_model: 40,
  ml_analytics: 58, ml_etl: 62, ml_data: 55, ml_mlops: 44, ml_cv: 40,
  ml_embed: 30, ml_rlhf: 25, ml_ai_safety: 20, ml_prompt: 50,
  sec_pen: 38, sec_soc: 60, sec_cloud: 45, sec_appsec: 40, sec_grc: 55,
  data_analyst: 70, data_eng: 60,
  hc_medical_coding: 88, hc_admin_hc: 78, hc_radiology: 65, hc_pharmacist: 55,
  hc_tele: 58, hc_nutrition: 45, hc_physio: 22,
  hc_physician: 22, hc_doctor: 22, hc_surgeon: 12, hc_specialist: 18, hc_pathology: 55,
  nur_rn: 18, nur_icu: 14, nur_community: 20, nur_midwife: 12, nur_para: 22,
  mh_therapist: 10, mh_psychologist: 12, mh_coach: 30, mh_social: 16, mh_crisis: 8,
  ph_research: 36, ph_clinical: 40, ph_regulatory: 48, ph_biotech: 35,
  hr_recruit: 72, hr_payroll: 85, hr_ops: 70, hr_hrbp: 38,
  hr_comp: 58, hr_ld: 45, hr_diversity: 36, hr_hris: 65,
  edu_admin_edu: 65, edt_content: 70, edu_teach: 30, edu_special: 15,
  edu_higher: 28, edu_counsellor: 20, edu_curriculum: 52,
  eng_civil: 40, eng_mech: 42, eng_elec: 44, eng_project: 38,
  mfg_production: 58, mfg_quality: 60, mfg_cad: 55, mfg_supervisor: 42,
  des_graphic: 65, des_ux: 38, des_ui: 55, des_logo: 60, des_motion: 52, des_product: 36,
  med_journalism: 68, med_edit: 82, med_video: 50,
  ret_floor: 70, ret_inventory: 75, ec_catalog: 88, ec_returns: 80, log_warehouse: 72,
  gov_admin: 45, gov_policy: 35, ngo_program: 38, ngo_comms: 58,
  // ── Emerging AI-era roles (v50.0) — D7 agentic disruption scores ──────────────
  // AI-native roles: roles that exist because of AI — agentic systems are their tools, not their replacements
  em_vibe_coder:            12,  // prompt-driven dev; autonomous coders make them MORE valuable as directors
  em_synthetic_data_eng:    18,  // dataset engineering requires adversarial creativity agents can't provide
  em_ai_red_teamer:         10,  // adversarial testing of AI requires human creativity agents miss
  em_robotics_ai_trainer:   15,  // physical grounding + policy design is pre-agentic bottleneck
  em_spatial_computing_dev: 20,  // XR + physics; tooling nascent, human vision required
  em_climate_ai_analyst:    18,  // scientific domain depth + policy context; agents lack regulatory intuition
  em_agentic_sys_designer:  14,  // designs the systems agents run on — meta-layer, hard to automate
  em_human_ai_collab_designer: 16, // cognitive science + HCI + AI safety — human judgment core
  em_digital_human_designer:  25, // avatar/behavior scripting; some procedural elements automatable
  // Human-AI orchestration roles: judgment-heavy oversight of AI systems
  em_agent_ops_mgr:            22, // ops + escalation; requires situational judgment
  em_ai_workflow_arch:         18, // system design + process redesign; creative + domain-specific
  em_ai_workforce_strategist:  15, // org strategy + change mgmt; political + social complexity
  em_ai_governance_lead:       12, // policy + compliance + risk; legal + ethical judgment required
  em_autonomous_agent_supervisor: 20, // QA + safety for AI agents; requires trust + domain expertise
  em_ai_transformation_lead:   10, // exec-level org transformation; leadership + vision non-automatable
  default: 55,
};
