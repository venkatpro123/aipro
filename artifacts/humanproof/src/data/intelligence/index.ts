// intelligence/index.ts — Master Career Intelligence Registry v4.0
//
// Architecture:
//   MASTER_CAREER_INTELLIGENCE — starts empty, populated by ensureCareerIntelligenceLoaded().
//
//   Primary APIs:
//     getCareerIntelligence(roleKey)       — sync, O(1) from Map cache
//     ensureCareerIntelligenceLoaded()     — async, await before first audit
//     prefetchCareerIntelligenceCorpus()   — schedule idle prefetch at boot
//     getCountryAdaptedIntelligence(...)
//     getVariantInactionScenario(...)
//     buildContextTags(...)
//
// Lazy loading: the 842KB corpus (12 modules) lives in corpusData.ts and
// is NOT imported statically. It loads via import('./corpusData') on first
// ensureCareerIntelligenceLoaded() call. prefetchCareerIntelligenceCorpus()
// registers a requestIdleCallback(timeout=3000ms) so the chunk is in browser
// cache before the user submits an audit.
//
// Adding new roles: create a module, import it in corpusData.ts and spread
// it into ASSEMBLED_CORPUS there. Do NOT add static imports here.

import { CareerIntelligence } from './types';

// ── Corpus state ──────────────────────────────────────────────────────────────

/**
 * MASTER_CAREER_INTELLIGENCE — empty at module load, populated by
 * ensureCareerIntelligenceLoaded(). Mutable so Object.assign() fills it
 * in-place; callers that took a reference at import time see the keys.
 */
export const MASTER_CAREER_INTELLIGENCE: Record<string, CareerIntelligence> = {};

let _corpusLoaded = false;
let _loadPromise: Promise<void> | null = null;

// ── O(1) lookup caches — populated when corpus loads ─────────────────────────

/** Direct key lookup: role key → CareerIntelligence */
const _directCache = new Map<string, CareerIntelligence>();

/** Alias resolution cache: original key → resolved key (populated lazily) */
const _resolvedKeyCache = new Map<string, string>();

// ── Lazy loading API ──────────────────────────────────────────────────────────

/**
 * Ensure the 842KB corpus is loaded into MASTER_CAREER_INTELLIGENCE.
 * Resolves immediately on subsequent calls once loaded.
 * fetchAuditData() awaits this at pipeline entry.
 */
export async function ensureCareerIntelligenceLoaded(): Promise<void> {
  if (_corpusLoaded) return;
  if (_loadPromise) return _loadPromise;
  _loadPromise = import('./corpusData').then(({ ASSEMBLED_CORPUS }) => {
    Object.assign(MASTER_CAREER_INTELLIGENCE, ASSEMBLED_CORPUS);
    for (const [k, v] of Object.entries(ASSEMBLED_CORPUS)) {
      _directCache.set(k, v);
    }
    _corpusLoaded = true;
  });
  return _loadPromise;
}

/**
 * Returns true once ensureCareerIntelligenceLoaded() has resolved.
 * Guard bulk-enumeration calls (getSeededRoleKeys, getRolesByTag, etc.).
 */
export function isCareerIntelligenceLoaded(): boolean {
  return _corpusLoaded;
}

/**
 * Schedule a background corpus prefetch via requestIdleCallback(timeout=3000ms).
 * Call once at app boot (main.tsx). By the time the user submits an audit,
 * the chunk is typically already in browser cache — ensureCareerIntelligenceLoaded()
 * becomes a near-instant no-op instead of a 150–400ms blocking fetch.
 *
 * Falls back to setTimeout(100ms) in environments without requestIdleCallback.
 */
export function prefetchCareerIntelligenceCorpus(): void {
  if (_corpusLoaded || _loadPromise) return;
  const schedule =
    typeof window !== 'undefined' && 'requestIdleCallback' in window
      ? (cb: () => void) =>
          (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void })
            .requestIdleCallback(cb, { timeout: 3000 })
      : (cb: () => void) => setTimeout(cb, 100);
  schedule(() => { void ensureCareerIntelligenceLoaded(); });
}

// ── Catalog → Intelligence Key Bridge ────────────────────────────────────────
// Maps every catalogData.ts WORK_TYPE key to the best-matching intelligence key.
// Pure lookup table — no corpus dependency; lives in index.ts, not corpusData.ts.

const CATALOG_TO_INTEL_KEY: Record<string, string> = {
  // Software / Tech
  sw_backend:           'sw_backend',       sw_frontend:       'sw_frontend',
  sw_fullstack:         'sw_backend',       sw_devops:         'sw_devops',
  sw_arch:              'sw_arch',          sw_cloud:          'sw_cloud',
  sw_api:               'sw_api_designer',  sw_db:             'sw_dba',
  sw_legacy:            'sw_legacy',        sw_testing:        'sw_devsecops',
  sw_mobile_dev:        'sw_mobile_crossplatform', sw_ml:      'ml_engineer',
  sw_embed:             'sw_embedded',      sw_lead:           'it_lead',
  web_html:             'sw_frontend',      web_react:         'sw_frontend',
  web_wordpress:        'sw_frontend',      web_shopify:       'sw_frontend',
  web_ux:               'sw_ux_researcher', web_seo_tech:      'sw_tech_writer',
  web_backend:          'sw_backend',
  mob_ios:              'sw_mobile_crossplatform', mob_android: 'sw_mobile_crossplatform',
  mob_flutter:          'sw_mobile_crossplatform', mob_rn:     'sw_mobile_crossplatform',
  mob_ui:               'des_ux',           mob_testing:       'sw_devsecops',
  saas_pm:              'sw_pm',            saas_growth:       'saas_growth',
  saas_onboard:         'saas_growth',      saas_api_int:      'sw_api_designer',
  saas_support:         'ser_success_mgr',  saas_docs:         'sw_tech_writer',
  ml_model:             'ml_engineer',      ml_nlp:            'ml_engineer',
  ml_cv:                'ml_engineer',      ml_data:           'it_data_analyst',
  ml_mlops:             'it_mlops',         ml_research:       'ml_research',
  ml_prompt:            'em_prompt_engineer', ml_analytics:    'it_data_analyst',
  ml_etl:               'data_eng',         ml_embed:          'ml_engineer',
  sec_pen:              'sec_pen',          sec_soc:           'sec_soc',
  sec_cloud:            'sw_cloud',         sec_appsec:        'sw_devsecops',
  sec_incident:         'sec_incident',     sec_grc:           'sec_grc',
  dev_ci:               'sw_devops',        dev_k8s:           'sw_devops',
  dev_infra:            'sw_cloud',         dev_sre:           'it_sre',
  dev_linux:            'sw_devops',
  bc_sol:               'sw_blockchain_arch', bc_defi:         'sw_blockchain_arch',
  bc_nft:               'sw_blockchain_arch', bc_audit:        'sw_blockchain_arch',
  game_unity:           'sw_game_dev',      game_unreal:       'sw_game_dev',
  game_design:          'sw_game_dev',      game_art:          'des_3d',
  game_vr:              'em_spatial_computing', game_backend:  'sw_backend',
  game_qa:              'sw_devsecops',
  qa_manual:            'sw_devsecops',     qa_auto:           'sw_devsecops',
  qa_perf:              'sw_devsecops',     qa_mobile_test:    'sw_devsecops',
  qa_api_test:          'sw_api_designer',  qa_lead:           'it_lead',
  erp_sap:              'erp_sap',          erp_oracle:        'erp_sap',
  erp_ms365:            'erp_sap',          erp_support:       'erp_sap',

  // Finance
  fin_account:          'fin_account',      fin_audit:         'fin_audit',
  fin_tax:              'fin_tax',          fin_fp:            'fin_fp_analyst',
  fin_treasury:         'fin_treasury',     fin_credit:        'fin_credit_analyst',
  fin_risk:             'fin_market_risk',  fin_compliance:    'fin_regtech',
  fin_payroll:          'fin_payroll',      fin_reporting:     'fin_fp_analyst',
  fin_invest:           'inv_equity_res',
  ft_payment:           'em_fintech_engineer', ft_lending:     'em_fintech_engineer',
  ft_fraud:             'em_fintech_engineer', ft_regtech:     'fin_regtech',
  ft_wealth:            'fin_financial_planner',
  ins_underwrite:       'fin_underwriter',  ins_claims:        'bpo_claims',
  ins_actuarial:        'fin_actuary',      ins_broker:        'fin_underwriter',
  ins_admin:            'fin_banking_ops',
  inv_equity:           'inv_equity_res',   inv_ibanking:      'fin_mergers',
  inv_portfolio:        'fin_hedge_pm',     inv_vc:            'fin_vc',
  inv_quant:            'fin_quant',        inv_trading:       'fin_quant',

  // Media / Creative / Content
  med_journalism:       'cnt_journalist',   med_edit:          'med_edit',
  med_broadcast:        'med_sports_broadcaster', med_digital:  'cnt_social',
  med_video:            'med_video',        med_podcast:       'med_podcast_host',
  med_research:         'med_research',
  cnt_blog:             'cnt_newsletter_writer', cnt_copy:      'cnt_copy',
  cnt_seo_content:      'cnt_seo_content',  cnt_tech_write:    'cnt_technical_writer',
  cnt_script:           'ent_scriptwriter', cnt_yt:            'cnt_game_streamer',
  cnt_social:           'cnt_social',       cnt_email:         'cnt_newsletter_writer',
  cnt_ghostwrite:       'cnt_ghostwriter',  cnt_translation:   'cnt_translation',
  cnt_ux_write:         'cnt_ux_writer',
  mkt_seo:              'mkt_seo',          mkt_sem:           'mkt_seo',
  mkt_social_ads:       'cnt_social',       mkt_growth:        'saas_growth',
  mkt_crm:              'ser_success_mgr',  mkt_analytics:     'it_data_analyst',
  mkt_brand:            'des_brand_strategist', mkt_influencer: 'med_influencer_mgr',
  mkt_product:          'sw_pm',
  adv_creative:         'art_director',     adv_copy:          'cnt_copy',
  adv_campaign:         'med_creative_director_adv', adv_media_buy: 'med_buyer',
  adv_pr:               'med_pr',           adv_brand:         'des_brand_strategist',
  des_ui:               'des_ui',           des_ux:            'des_ux',
  des_graphic:          'des_graphic',      des_logo:          'des_graphic',
  des_motion:           'des_motion_graphic', des_3d:          'des_3d',
  des_illustration:     'des_illustration', des_product:       'des_product_designer',
  photo_portrait:       'photo_portrait',   photo_commercial:  'photo_portrait',
  photo_event:          'photo_portrait',   photo_edit:        'photo_portrait',
  video_prod:           'med_video',        video_edit:        'med_video',
  drone:                'med_video',
  anim_2d:              'anim_2d',          anim_3d:           'des_3d',
  anim_vfx:             'des_vfx',          anim_motion:       'des_motion_graphic',
  anim_vr:              'em_spatial_computing', anim_rigging:   'des_3d',
  mus_compose:          'mus_compose',       mus_produce:       'mus_produce',
  mus_mixing:           'mus_mixing',        mus_lyrics:        'mus_lyrics',
  mus_session:          'mus_session',       mus_teach:         'edu_teacher_k12',

  // BPO / Admin / HR / Legal
  bpo_inbound:          'bpo_inbound',      bpo_outbound:      'bpo_outbound',
  bpo_chat:             'bpo_chat',         bpo_email_support: 'bpo_email_support',
  bpo_tech_support:     'bpo_tech_support', bpo_data_entry:    'bpo_data_entry',
  bpo_claims:           'bpo_claims',       bpo_social_mod:    'bpo_social_mod',
  bpo_virtual:          'bpo_virtual',      bpo_hr_ops:        'bpo_hr_ops',
  hr_recruit:           'hr_recruit',       hr_hrbp:           'hr_hrbp',
  hr_lr:                'hr_hrbp',          hr_comp:           'hr_comp',
  hr_ld:                'edu_corporate_trainer', hr_diversity:  'hr_dei_director',
  hr_hris:              'hr_ai_change_mgr', hr_payroll:        'hr_payroll_ops',
  hr_ops:               'hr_ai_change_mgr',
  leg_corporate:        'leg_corporate',    leg_litigation:    'leg_litigation',
  leg_ip:               'leg_ip',           leg_tax_law:       'fin_tax',
  leg_labor:            'hr_hrbp',          leg_compliance:    'leg_compliance_mgr',
  leg_paralegal:        'leg_paralegal',    leg_cyberlaw:      'leg_data_privacy',
  leg_legaltech:        'leg_ai_counsel',
  con_strategy:         'ser_strat_cons',   con_mgmt:          'ser_mgmt_cons',
  con_it:               'ser_mgmt_cons',    con_hr_con:        'hr_hrbp',
  con_fin_con:          'fin_fp_analyst',   con_supply:        'ser_supply_chain_dir',
  con_sustainability:   'ser_sustainability', con_risk:         'fin_market_risk',
  con_change:           'hr_ai_change_mgr',
  log_ops:              'ser_logistics',    log_scm:           'ser_supply_chain_dir',
  log_warehouse:        'log_wh_auto_lead', log_import:        'log_freight_forwarder',
  log_last_mile:        'log_last_mile',    log_fleet:         'log_fleet_safety',
  log_procurement:      'ser_procurement',
  trav_agent:           'hos_travel_consult', trav_hotel:      'hos_hotel_gm',
  trav_ops:             'hos_tourism_plan', trav_guide:        'hos_tourism_plan',
  trav_airline:         'log_atc',          trav_marketing:   'hos_dest_marketing',
  adm_exec:             'adm_exec',         adm_office:        'adm_exec',
  adm_data_entry:       'bpo_data_entry',   adm_reception:     'bpo_inbound',
  adm_coord:            'adm_exec',

  // Healthcare / Pharma / Mental Health / Nursing
  hc_doctor:            'hc_surgeon',       hc_specialist:     'hc_oncologist',
  hc_surgeon:           'hc_surgeon',       hc_radiology:      'hc_radio',
  hc_pathology:         'hc_lab',           hc_admin_hc:       'hc_admin',
  hc_medical_coding:    'hc_admin',         hc_pharmacy:       'hc_pharmacy',
  hc_tele:              'hc_telehealth_dir', hc_nutrition:      'hc_dietitian',
  hc_physio:            'hc_physio',
  ph_research:          'hc_researcher',    ph_clinical:       'hc_clinical_trial_mgr',
  ph_regulatory:        'hc_health_informaticist', ph_manufacturing: 'mfg_plant_mgr',
  ph_quality:           'hc_genomics_analyst', ph_sales:        'ser_sales_exec',
  ph_biotech:           'em_synthetic_bio',
  mh_therapist:         'hc_therapist_lmft', mh_psychologist:  'hc_psych',
  mh_coach:             'hc_therapist_lmft', mh_social:        'gov_social_worker',
  mh_crisis:            'hc_palliative_care',
  nur_rn:               'nur_rn',           nur_icu:           'nur_rn',
  nur_community:        'nur_rn',           nur_midwife:       'hc_nursing_practitioner',
  nur_para:             'nur_rn',

  // Education / EdTech / Training
  edu_teach:            'edu_teacher_k12',  edu_higher:        'edu_university_prof',
  edu_special:          'edu_special_needs_teacher', edu_admin_edu: 'edu_school_principal',
  edu_curriculum:       'edu_instructional_designer', edu_counsellor: 'edu_counselor',
  edt_product:          'edu_edtech_founder', edt_content:     'edu_instructional_designer',
  edt_instructional:    'edu_instructional_designer', edt_tutor: 'edu_teacher_k12',
  edt_gamification:     'edu_edtech_founder',
  tr_facilitator:       'edu_corporate_trainer', tr_ld:         'edu_corporate_trainer',
  tr_coach:             'edu_corporate_trainer', tr_elearning:  'edu_instructional_designer',
  tr_assessment:        'edu_corporate_trainer',

  // Manufacturing / Auto / Engineering / Construction / Energy / Aerospace
  mfg_production:       'mfg_plant_mgr',    mfg_quality:       'trd_ndt_spec',
  mfg_maintenance:      'trd_millwright',   mfg_process:       'eng_chemical',
  mfg_lean:             'mfg_plant_mgr',    mfg_safety:        'con_hse',
  mfg_automation:       'mfg_automation',   mfg_cad:           'eng_struct',
  mfg_supervisor:       'mfg_plant_mgr',
  auto_design:          'eng_struct',       auto_eng:          'eng_chemical',
  auto_ev:              'em_autonomous_vehicle', auto_software:  'em_autonomous_vehicle',
  auto_mfg:             'mfg_plant_mgr',
  eng_civil:            'eng_struct',       eng_mech:          'eng_struct',
  eng_elec:             'trd_electrician_master', eng_chem:      'eng_chemical',
  eng_enviro:           'eng_enviro',       eng_project:       'eng_struct',
  eng_survey:           'ret_land_surveyor',
  con_arch:             'des_arch_viz',     con_site:          'con_site',
  con_interior:         'des_interior',     con_urban:         'urb_planner',
  con_estimation:       'con_estimation',   con_hse:           'con_hse',
  en_oil:               'eng_petroleum',    en_renewable:      'em_climate_tech',
  en_power:             'eng_nuclear',      en_nuclear:        'eng_nuclear',
  en_env:               'env_compliance',   en_trader:         'fin_quant',
  aero_eng:             'eng_aero',         aero_avionics:     'eng_aero',
  aero_test:            'eng_aero',         aero_mfg:          'mfg_plant_mgr',
  aero_def:             'eng_aero',

  // Retail / E-commerce / FMCG
  ret_floor:            'ret_store_manager', ret_buyer:         'ret_buyer_fashion',
  ret_ecom:             'ret_ecommerce_mgr', ret_inventory:     'log_inventory_control',
  ret_cx:               'ser_success_mgr',  ret_category:      'ret_category_mgr',
  ec_ops:               'ret_ecom_ops',     ec_catalog:        'ret_ecom_ops',
  ec_ful:               'log_wh_auto_lead', ec_returns:        'ret_ecom_ops',
  ec_growth:            'saas_growth',      ec_d2c:            'des_brand_strategist',
  fmcg_sales:           'ser_sales_exec',   fmcg_key:          'ser_sales_exec',
  fmcg_brand_mgr:       'des_brand_strategist', fmcg_supply_fmcg: 'ser_supply_chain_dir',
  fmcg_rd:              'hc_researcher',

  // Government / NGO / Agriculture
  gov_admin:            'gov_policy_analyst', gov_policy:      'gov_policy_analyst',
  gov_public_finance:   'fin_fp_analyst',   gov_social:        'gov_social_worker',
  gov_it:               'sw_devops',
  ngo_program:          'gov_social_worker', ngo_fundraise:    'ser_grant_writer',
  ngo_comms:            'med_pr',           ngo_field:         'gov_social_worker',
  ngo_research:         'hc_researcher',
  agri_farming:         'ag_agronomist',    agri_tech:         'ag_precision_lead',
  agri_supply:          'ser_supply_chain_dir', agri_research:  'ag_seed_scientist',
  agri_finance:         'fin_credit_analyst',
};

const HUMAN_TITLE_TO_INTEL_KEY: Record<string, string> = {
  'software engineer': 'sw_software_engineer',
  'software developer': 'sw_software_engineer',
  'backend developer': 'sw_backend',
  'backend engineer': 'sw_backend',
  'database administrator': 'sw_dba',
  'database administrator dba': 'sw_dba',
  dba: 'sw_dba',
};

const normaliseHumanTitle = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[()]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// ── Public APIs ───────────────────────────────────────────────────────────────

/**
 * Resolve a catalog WORK_TYPE key to its best-matching intelligence key.
 * Results are memoized in _resolvedKeyCache (Map) so repeated calls are O(1).
 * Tries: (1) direct match, (2) alias bridge, (3) prefix heuristic.
 */
export const resolveIntelligenceKey = (roleKey: string): string => {
  if (!roleKey) return roleKey;

  const cached = _resolvedKeyCache.get(roleKey);
  if (cached !== undefined) return cached;

  if (_directCache.has(roleKey)) {
    _resolvedKeyCache.set(roleKey, roleKey);
    return roleKey;
  }

  const aliased = CATALOG_TO_INTEL_KEY[roleKey];
  if (aliased && _directCache.has(aliased)) {
    _resolvedKeyCache.set(roleKey, aliased);
    return aliased;
  }

  const humanAlias = HUMAN_TITLE_TO_INTEL_KEY[normaliseHumanTitle(roleKey)];
  if (humanAlias) {
    _resolvedKeyCache.set(roleKey, humanAlias);
    return humanAlias;
  }

  const prefix = roleKey.split('_')[0];
  const prefixMap: Record<string, string> = {
    sw: 'sw_backend', ml: 'ml_engineer', sec: 'sec_pen', dev: 'sw_devops',
    bc: 'sw_blockchain_arch', game: 'sw_game_dev', qa: 'sw_devsecops',
    hc: 'hc_surgeon', nur: 'nur_rn', ph: 'hc_researcher', mh: 'hc_therapist_lmft',
    fin: 'fin_account', ft: 'em_fintech_engineer', ins: 'fin_underwriter',
    inv: 'inv_equity_res', bpo: 'bpo_inbound', hr: 'hr_hrbp', leg: 'leg_corporate',
    con: 'ser_mgmt_cons', log: 'ser_logistics', trav: 'hos_travel_consult',
    adm: 'bpo_inbound', edu: 'edu_teacher_k12', edt: 'edu_edtech_founder',
    tr: 'edu_corporate_trainer', mfg: 'mfg_plant_mgr', auto: 'eng_struct',
    eng: 'eng_struct', aero: 'eng_aero', en: 'em_climate_tech',
    ret: 'ret_store_manager', ec: 'ret_ecom_ops', fmcg: 'ser_sales_exec',
    gov: 'gov_policy_analyst', ngo: 'gov_social_worker', agri: 'ag_agronomist',
    cnt: 'cnt_copy', mkt: 'mkt_seo', adv: 'art_director', des: 'des_ux',
    med: 'cnt_journalist', photo: 'photo_portrait', video: 'med_video',
    anim: 'anim_2d', mus: 'mus_compose', em: 'em_ai_product_mgr',
    saas: 'saas_growth', web: 'sw_frontend', mob: 'sw_mobile_crossplatform',
    erp: 'erp_sap', data: 'it_data_analyst', ds: 'it_data_analyst',
    ser: 'ser_mgmt_cons', hos: 'hos_hotel_gm', ret2: 'ret_store_manager',
    ag: 'ag_agronomist', env: 'env_compliance', trd: 'trd_electrician_master',
  };
  const prefixKey = prefixMap[prefix];
  if (prefixKey && _directCache.has(prefixKey)) {
    _resolvedKeyCache.set(roleKey, prefixKey);
    return prefixKey;
  }

  if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
    console.warn(
      `[resolveIntelligenceKey] No match for "${roleKey}" — career intelligence will be null. ` +
      `Check CATALOG_TO_INTEL_KEY or add a direct entry in the relevant module.`,
    );
  }
  _resolvedKeyCache.set(roleKey, roleKey);
  return roleKey;
};

/**
 * Fetch base career intelligence for a role key. O(1) from Map cache.
 * Returns null when corpus not yet loaded (call ensureCareerIntelligenceLoaded first)
 * or when the role has no entry.
 */
export const getCareerIntelligence = (roleKey: string): CareerIntelligence | null => {
  const resolved = resolveIntelligenceKey(roleKey);
  return _directCache.get(resolved) || null;
};

/**
 * Check if a role has pre-seeded data (including via alias bridge).
 */
export const hasSeededData = (roleKey: string): boolean => {
  const resolved = resolveIntelligenceKey(roleKey);
  return _directCache.has(resolved);
};

/**
 * Get all seeded role keys. Returns [] before corpus is loaded.
 */
export const getSeededRoleKeys = (): string[] => {
  return Object.keys(MASTER_CAREER_INTELLIGENCE);
};

/**
 * Get total count of seeded roles. Returns 0 before corpus is loaded.
 */
export const getSeededRoleCount = (): number => {
  return Object.keys(MASTER_CAREER_INTELLIGENCE).length;
};

/**
 * Get all roles for a given context tag. Returns {} before corpus is loaded.
 */
export const getRolesByTag = (tag: string): Record<string, CareerIntelligence> => {
  const result: Record<string, CareerIntelligence> = {};
  for (const [key, intel] of Object.entries(MASTER_CAREER_INTELLIGENCE)) {
    if (intel.contextTags?.includes(tag)) {
      result[key] = intel;
    }
  }
  return result;
};

/**
 * Get all roles with a risk trend score in [min, max]. Returns {} before corpus is loaded.
 */
export const getRolesByRiskLevel = (minCurrentScore: number, maxCurrentScore: number): Record<string, CareerIntelligence> => {
  const result: Record<string, CareerIntelligence> = {};
  for (const [key, intel] of Object.entries(MASTER_CAREER_INTELLIGENCE)) {
    const currentScore = intel.riskTrend?.[0]?.riskScore ?? 0;
    if (currentScore >= minCurrentScore && currentScore <= maxCurrentScore) {
      result[key] = intel;
    }
  }
  return result;
};

// ── Re-exports for convenience ────────────────────────────────────────────────
export type { CareerIntelligence } from './types';
export { getCountryAdaptedIntelligence, getCountryCluster } from './countryIntelligenceModifier';
export {
  getVariantInactionScenario,
  getVariantSkillReason,
  getVariantRoadmapAction,
  getVariantSummaryPrefix,
  buildContextTags,
  seedHash,
} from './contentVariantEngine';


// ── v6.0 Fix 8: Career path filtering by uniqueness depth ────────────────────
import type { CareerPath } from './types';

type UniquenessDepth = 'generic' | 'functional_specialist' | 'critical_knowledge';

/**
 * Filter career paths by the user's uniqueness depth.
 */
export function filterCareerPathsByUniqueness(
  paths: CareerPath[],
  uniquenessDepth: UniquenessDepth,
): CareerPath[] {
  return paths.filter(p => {
    const f = p.uniquenessDepthFilter ?? 'all';
    if (f === 'all') return true;
    if (uniquenessDepth === 'critical_knowledge') return f === 'critical_only' || f === 'specialist_and_critical';
    if (uniquenessDepth === 'functional_specialist') return f === 'generic_and_specialist' || f === 'specialist_and_critical';
    return f === 'generic_and_specialist';
  });
}
