// ═══════════════════════════════════════════════════════════
// riskData.ts — Pure data tables for HumanProof v2.0
// Data version: 2026-Q1 | Last updated: 2026-01-15
// Sources: McKinsey, WEF FoJ 2025, Stanford HAI, Goldman Sachs
// ═══════════════════════════════════════════════════════════

export const DATA_VERSION = '2026-Q1';
export const DATA_LAST_UPDATED = '2026-01-15';

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

// FORMULA FIX 1: named exponent constant for D3 curved inversion
// augVal=50 → D3 = round(100*(1-0.5^0.70)) = 37 (protective, not neutral 50)
export const D3_CURVE_EXPONENT = 0.70;

// FORMULA FIX 3: governance-adjacent keywords for D3 context co-occurrence check
export const GOVERNANCE_KEYWORDS = [
  'regulation', 'compliance', 'audit', 'governance', 'policy',
  'legal', 'oversight', 'accountability', 'ethics', 'risk',
  'regulatory', 'standard', 'assurance', 'control',
];

// ─── D1: Task Automatability ───────────────────────────────
// Source: Oxford Frey-Osborne + GPT-4/Claude task audit per role
// Range: 3–97 | Higher = more automatable
export const TASK_AUTO: Record<string, Record<string, number>> = {
  it_software:{sw_backend:64,sw_frontend:84,sw_fullstack:68,sw_devops:54,sw_arch:22,sw_cloud:52,sw_api:76,sw_db:78,sw_legacy:60,sw_testing:80,sw_mobile_dev:65,sw_ml:36,sw_embed:30,sw_lead:18},
  it_web:{web_html:84,web_react:70,web_wordpress:87,web_shopify:83,web_ux:38,web_seo_tech:68,web_backend:65},
  it_mobile:{mob_ios:60,mob_android:60,mob_flutter:63,mob_rn:66,mob_ui:40,mob_testing:76},
  it_saas:{saas_pm:32,saas_growth:50,saas_onboard:56,saas_api_int:68,saas_support:75,saas_docs:82},
  it_ai_ml:{ml_model:38,ml_nlp:34,ml_cv:36,ml_data:54,ml_mlops:38,ml_research:22,ml_prompt:56,ml_analytics:60,ml_etl:66,ml_embed:28,ml_prompt_eng:25,ml_rlhf:20,ml_ai_safety:14,ml_climate_ds:50,ml_hc_ai:42},
  it_cybersec:{sec_pen:30,sec_soc:58,sec_cloud:44,sec_appsec:38,sec_incident:34,sec_grc:54},
  it_devops:{dev_ci:61,dev_k8s:50,dev_infra:54,dev_sre:38,dev_linux:56},
  it_blockchain:{bc_sol:55,bc_defi:49,bc_nft:76,bc_audit:36},
  it_gaming:{game_unity:49,game_unreal:47,game_design:38,game_art:53,game_vr:43,game_backend:58,game_qa:82},
  it_qa:{qa_manual:97,qa_auto:70,qa_perf:60,qa_mobile_test:77,qa_api_test:75,qa_lead:32},
  it_erp:{erp_sap:56,erp_oracle:58,erp_ms365:61,erp_support:71},
  finance:{fin_account:88,fin_audit:66,fin_tax:72,fin_fp:50,fin_treasury:53,fin_credit:71,fin_risk:48,fin_compliance:60,fin_payroll:90,fin_reporting:78,fin_invest:46},
  fintech:{ft_payment:61,ft_lending:59,ft_fraud:44,ft_regtech:50,ft_wealth:48},
  insurance:{ins_underwrite:72,ins_claims:90,ins_actuarial:46,ins_broker:56,ins_admin:87},
  investment:{inv_equity:63,inv_ibanking:44,inv_portfolio:49,inv_vc:28,inv_quant:50,inv_trading:56},
  media:{med_journalism:72,med_edit:88,med_broadcast:60,med_digital:74,med_video:54,med_podcast:58,med_research:70},
  content:{cnt_blog:92,cnt_copy:88,cnt_seo_content:97,cnt_tech_write:74,cnt_script:71,cnt_yt:60,cnt_social:86,cnt_email:90,cnt_ghostwrite:82,cnt_translation:80,cnt_ux_write:60},
  marketing:{mkt_seo:80,mkt_sem:74,mkt_social_ads:71,mkt_growth:53,mkt_crm:66,mkt_analytics:61,mkt_brand:41,mkt_influencer:50,mkt_product:39},
  advertising:{adv_creative:52,adv_copy:84,adv_campaign:64,adv_media_buy:70,adv_pr:43,adv_brand:38},
  design:{des_ui:58,des_ux:36,des_graphic:72,des_logo:66,des_motion:50,des_3d:46,des_illustration:54,des_product:34},
  photography:{photo_portrait:46,photo_commercial:54,photo_event:32,photo_edit:82,video_prod:42,video_edit:75,drone:37},
  animation:{anim_2d:60,anim_3d:50,anim_vfx:43,anim_motion:72,anim_vr:40,anim_rigging:48},
  music:{mus_compose:55,mus_produce:60,mus_mixing:58,mus_lyrics:92,mus_session:25,mus_teach:38},
  bpo:{bpo_inbound:91,bpo_outbound:88,bpo_chat:97,bpo_email_support:93,bpo_tech_support:78,bpo_data_entry:97,bpo_claims:88,bpo_social_mod:64,bpo_virtual:82,bpo_hr_ops:80},
  hr:{hr_recruit:70,hr_hrbp:36,hr_lr:27,hr_comp:54,hr_ld:43,hr_diversity:26,hr_hris:61,hr_payroll:85,hr_ops:72},
  legal:{leg_corporate:56,leg_litigation:28,leg_ip:40,leg_tax_law:64,leg_labor:31,leg_compliance:61,leg_paralegal:88,leg_cyberlaw:43,leg_legaltech:50},
  consulting:{con_strategy:26,con_mgmt:32,con_it:48,con_hr_con:43,con_fin_con:46,con_supply:50,con_sustainability:36,con_risk:44,con_change:30},
  logistics:{log_ops:72,log_scm:54,log_warehouse:80,log_import:63,log_last_mile:74,log_fleet:66,log_procurement:59},
  travel:{trav_agent:88,trav_hotel:50,trav_ops:80,trav_guide:28,trav_airline:61,trav_marketing:70},
  admin:{adm_exec:64,adm_office:60,adm_data_entry:97,adm_reception:74,adm_coord:62},
  healthcare:{hc_doctor:18,hc_specialist:14,hc_surgeon:8,hc_radiology:68,hc_pathology:58,hc_admin_hc:72,hc_medical_coding:92,hc_pharmacy:60,hc_tele:50,hc_nutrition:42,hc_physio:22},
  pharma:{ph_research:36,ph_clinical:40,ph_regulatory:49,ph_manufacturing:57,ph_quality:54,ph_sales:66,ph_biotech:33},
  mental_health:{mh_therapist:10,mh_psychologist:12,mh_coach:27,mh_social:16,mh_crisis:8},
  nursing:{nur_rn:20,nur_icu:16,nur_community:22,nur_midwife:12,nur_para:18},
  education:{edu_teach:36,edu_higher:32,edu_special:15,edu_admin_edu:64,edu_curriculum:54,edu_counsellor:18},
  edtech:{edt_product:43,edt_content:72,edt_instructional:53,edt_tutor:50,edt_gamification:46},
  training:{tr_facilitator:38,tr_ld:44,tr_coach:25,tr_elearning:67,tr_assessment:60},
  manufacturing:{mfg_production:71,mfg_quality:67,mfg_maintenance:48,mfg_process:50,mfg_lean:43,mfg_safety:37,mfg_automation:33,mfg_cad:54,mfg_supervisor:40},
  automotive:{auto_design:48,auto_eng:44,auto_ev:36,auto_software:42,auto_mfg:67},
  engineering:{eng_civil:44,eng_mech:46,eng_elec:48,eng_chem:41,eng_enviro:38,eng_project:35,eng_survey:51},
  construction:{con_arch:40,con_site:44,con_interior:51,con_urban:33,con_estimation:65},
  energy:{en_oil:51,en_renewable:38,en_power:44,en_nuclear:30,en_env:36,en_trader:56},
  aerospace:{aero_eng:42,aero_avionics:48,aero_test:38,aero_mfg:61,aero_def:35},
  retail:{ret_floor:78,ret_buyer:56,ret_ecom:72,ret_inventory:80,ret_cx:67,ret_category:51},
  ecommerce:{ec_ops:78,ec_catalog:94,ec_ful:75,ec_returns:82,ec_growth:54,ec_d2c:46},
  fmcg:{fmcg_sales:58,fmcg_key:50,fmcg_brand_mgr:44,fmcg_supply_fmcg:56,fmcg_rd:38},
  government:{gov_admin:40,gov_policy:32,gov_public_finance:51,gov_social:29,gov_it:60},
  ngo:{ngo_program:36,ngo_fundraise:54,ngo_comms:62,ngo_field:27,ngo_research:44},
  agriculture:{agri_farming:54,agri_tech:38,agri_supply:64,agri_research:36,agri_finance:52},
  default:{data:64,content_default:80,coding:71,communication:73,creative:51,management:46,physical:43,strategy:33,teaching:38,care:18},
};

// ─── D2: AI Tool Maturity ──────────────────────────────────
// Source: Stanford HAI AI Index 2024, product launch tracking
// Range: 10–95 | Higher = more mature AI tools
export const DISRUPTION_VELOCITY: Record<string, number> = {
  qa_manual:96,bpo_data_entry:96,cnt_seo_content:93,hc_medical_coding:95,adm_data_entry:95,fin_payroll:92,web_html:92,cnt_email:90,cnt_blog:90,
  sw_frontend:82,des_graphic:80,cnt_translation:88,des_logo:78,hc_radiology:76,leg_paralegal:80,fin_account:78,sw_testing:85,qa_auto:75,des_ui:72,med_edit:82,
  sw_backend:70,ml_prompt:68,mfg_cad:68,des_motion:65,cnt_yt:62,ml_analytics:65,anim_2d:62,sw_devops:62,
  ml_model:52,sec_soc:55,eng_civil:45,hc_doctor:45,hc_tele:50,des_ux:42,edu_teach:42,ph_research:42,
  nur_rn:25,mh_coach:35,hc_surgeon:36,edu_special:20,hr_hrbp:32,con_strategy:28,leg_litigation:30,inv_vc:25,
  mh_therapist:15,mh_crisis:12,edu_counsellor:22,hc_physio:25,ngo_field:22,
  bpo_inbound:88,bpo_chat:95,bpo_email_support:88,bpo_tech_support:72,cnt_copy:85,cnt_social:88,
  sw_api:78,sw_db:72,sw_fullstack:75,fin_tax:72,fin_audit:68,fin_reporting:80,fin_credit:70,
  ins_claims:80,ins_admin:85,ins_underwrite:68,
  mkt_seo:75,mkt_sem:68,mkt_social_ads:65,mkt_analytics:62,mkt_crm:65,
  hr_recruit:68,hr_payroll:88,hr_ops:75,
  adm_exec:62,adm_reception:70,adm_office:62,
  gov_admin:52,gov_policy:30,
  ngo_program:35,ngo_comms:55,
  agri_farming:40,agri_tech:55,
  ret_floor:72,ret_inventory:75,ret_ecom:68,ec_catalog:82,ec_returns:78,
  // 2026 new roles
  ml_prompt_eng:22,ml_rlhf:18,ml_ai_safety:12,ml_climate_ds:45,ml_hc_ai:38,
  default:50,
};

// ─── D3: Augmentation Potential ───────────────────────────
// Source: BCG "AI Augmentation Index" 2024, MIT Work of the Future
// Range: 3–97 (RAW augVal — BEFORE curved inversion in formula)
// Higher augVal = AI amplifies human more = safer role
export const AUGMENTATION: Record<string, number> = {
  sw_backend:68,sw_frontend:65,sw_fullstack:66,sw_devops:72,sw_arch:86,sw_cloud:74,sw_api:63,sw_db:65,sw_legacy:58,sw_testing:61,sw_mobile_dev:63,sw_ml:80,sw_embed:55,sw_lead:84,
  web_html:57,web_react:65,web_wordpress:52,web_shopify:55,web_ux:82,web_seo_tech:65,web_backend:66,
  mob_ios:65,mob_android:65,mob_flutter:68,mob_rn:69,mob_ui:75,mob_testing:58,
  saas_pm:78,saas_growth:76,saas_onboard:63,saas_api_int:61,saas_support:52,saas_docs:57,
  ml_model:84,ml_nlp:86,ml_cv:82,ml_data:73,ml_mlops:71,ml_research:90,ml_prompt:68,ml_analytics:71,ml_etl:64,ml_embed:70,
  ml_prompt_eng:88,ml_rlhf:85,ml_ai_safety:92,ml_climate_ds:72,ml_hc_ai:76,
  sec_pen:79,sec_soc:68,sec_cloud:72,sec_appsec:75,sec_incident:73,sec_grc:61,
  dev_ci:71,dev_k8s:68,dev_infra:65,dev_sre:73,dev_linux:63,
  bc_sol:57,bc_defi:61,bc_nft:41,bc_audit:68,
  game_unity:65,game_unreal:68,game_design:72,game_art:63,game_vr:68,game_backend:63,game_qa:52,
  qa_manual:31,qa_auto:68,qa_perf:63,qa_mobile_test:58,qa_api_test:61,qa_lead:76,
  erp_sap:63,erp_oracle:61,erp_ms365:65,erp_support:55,
  fin_account:58,fin_audit:65,fin_tax:61,fin_fp:72,fin_treasury:66,fin_credit:68,fin_risk:74,fin_compliance:63,fin_payroll:37,fin_reporting:61,fin_invest:68,
  ft_payment:63,ft_lending:61,ft_fraud:74,ft_regtech:65,ft_wealth:72,
  ins_underwrite:58,ins_claims:40,ins_actuarial:68,ins_broker:61,ins_admin:27,
  inv_equity:65,inv_ibanking:58,inv_portfolio:68,inv_vc:82,inv_quant:73,inv_trading:63,
  med_journalism:57,med_edit:51,med_broadcast:55,med_digital:58,med_video:61,med_podcast:58,med_research:63,
  cnt_blog:24,cnt_copy:27,cnt_seo_content:20,cnt_tech_write:51,cnt_script:55,cnt_yt:58,cnt_social:22,cnt_email:20,cnt_ghostwrite:30,cnt_translation:23,cnt_ux_write:63,
  mkt_seo:58,mkt_sem:68,mkt_social_ads:65,mkt_growth:78,mkt_crm:68,mkt_analytics:73,mkt_brand:76,mkt_influencer:58,mkt_product:78,
  adv_creative:63,adv_copy:40,adv_campaign:65,adv_media_buy:68,adv_pr:68,adv_brand:75,
  des_ui:72,des_ux:88,des_graphic:61,des_logo:55,des_motion:63,des_3d:65,des_illustration:58,des_product:84,
  photo_portrait:48,photo_commercial:53,photo_event:43,photo_edit:58,video_prod:55,video_edit:61,drone:51,
  anim_2d:61,anim_3d:68,anim_vfx:73,anim_motion:65,anim_vr:68,anim_rigging:61,
  mus_compose:55,mus_produce:61,mus_mixing:63,mus_lyrics:25,mus_session:50,mus_teach:60,
  bpo_inbound:17,bpo_outbound:13,bpo_chat:11,bpo_email_support:14,bpo_tech_support:33,bpo_data_entry:9,bpo_claims:17,bpo_social_mod:38,bpo_virtual:25,bpo_hr_ops:30,
  hr_recruit:61,hr_hrbp:72,hr_lr:65,hr_comp:58,hr_ld:68,hr_diversity:75,hr_hris:65,hr_payroll:32,hr_ops:48,
  leg_corporate:61,leg_litigation:75,leg_ip:68,leg_tax_law:58,leg_labor:71,leg_compliance:63,leg_paralegal:55,leg_cyberlaw:65,leg_legaltech:58,
  con_strategy:80,con_mgmt:76,con_it:68,con_hr_con:61,con_fin_con:65,con_supply:58,con_sustainability:65,con_risk:63,con_change:72,
  log_ops:53,log_scm:58,log_warehouse:45,log_import:56,log_last_mile:48,log_fleet:53,log_procurement:61,
  trav_agent:35,trav_hotel:53,trav_ops:41,trav_guide:52,trav_airline:50,trav_marketing:62,
  adm_exec:55,adm_office:51,adm_data_entry:10,adm_reception:35,adm_coord:53,
  hc_doctor:72,hc_specialist:75,hc_surgeon:55,hc_radiology:65,hc_pathology:65,hc_admin_hc:55,hc_medical_coding:30,hc_pharmacy:60,hc_tele:68,hc_nutrition:72,hc_physio:65,
  ph_research:70,ph_clinical:66,ph_regulatory:59,ph_manufacturing:50,ph_quality:57,ph_sales:55,ph_biotech:73,
  mh_therapist:40,mh_psychologist:42,mh_coach:48,mh_social:44,mh_crisis:35,
  nur_rn:55,nur_icu:58,nur_community:60,nur_midwife:50,nur_para:52,
  edu_teach:68,edu_higher:72,edu_special:55,edu_admin_edu:55,edu_curriculum:65,edu_counsellor:50,
  edt_product:72,edt_content:55,edt_instructional:63,edt_tutor:60,edt_gamification:65,
  tr_facilitator:63,tr_ld:65,tr_coach:72,tr_elearning:55,tr_assessment:58,
  mfg_production:50,mfg_quality:56,mfg_maintenance:60,mfg_process:68,mfg_lean:72,mfg_safety:65,mfg_automation:75,mfg_cad:65,mfg_supervisor:70,
  auto_design:63,auto_eng:68,auto_ev:72,auto_software:68,auto_mfg:53,
  eng_civil:63,eng_mech:66,eng_elec:64,eng_chem:62,eng_enviro:65,eng_project:68,eng_survey:57,
  con_arch:68,con_site:61,con_interior:64,con_urban:65,con_estimation:56,
  en_oil:55,en_renewable:68,en_power:62,en_nuclear:55,en_env:65,en_trader:58,
  aero_eng:65,aero_avionics:61,aero_test:67,aero_mfg:53,aero_def:60,
  ret_floor:35,ret_buyer:62,ret_ecom:58,ret_inventory:45,ret_cx:55,ret_category:65,
  ec_ops:50,ec_catalog:32,ec_ful:44,ec_returns:40,ec_growth:72,ec_d2c:75,
  fmcg_sales:57,fmcg_key:65,fmcg_brand_mgr:72,fmcg_supply_fmcg:63,fmcg_rd:68,
  gov_admin:45,gov_policy:62,gov_public_finance:58,gov_social:55,gov_it:65,
  ngo_program:58,ngo_fundraise:52,ngo_comms:55,ngo_field:48,ngo_research:65,
  agri_farming:50,agri_tech:72,agri_supply:55,agri_research:65,agri_finance:52,
  default:50,
};

// ─── D4: Experience Sensitivity ────────────────────────────
export const EXP_SENSITIVITY: Record<string, number> = {
  hc_surgeon:0.92,hc_specialist:0.88,hc_doctor:0.85,con_strategy:0.88,inv_vc:0.92,
  sw_arch:0.80,leg_litigation:0.86,mh_therapist:0.90,mh_psychologist:0.88,
  edu_special:0.83,hr_diversity:0.78,sec_pen:0.76,sw_lead:0.83,
  edu_counsellor:0.82,con_mgmt:0.82,con_change:0.84,mh_crisis:0.85,
  nur_midwife:0.70,trav_guide:0.68,game_design:0.60,
  fin_risk:0.68,fin_fp:0.58,eng_project:0.68,inv_portfolio:0.63,
  des_ux:0.65,mkt_product:0.63,mkt_brand:0.66,mkt_growth:0.62,
  fin_invest:0.63,inv_ibanking:0.68,inv_equity:0.61,
  hr_hrbp:0.65,hr_lr:0.73,leg_corporate:0.63,leg_ip:0.61,leg_labor:0.68,
  con_sustainability:0.65,con_risk:0.63,ngo_program:0.58,
  photo_event:0.63,aero_eng:0.63,auto_ev:0.65,ml_research:0.72,
  ml_nlp:0.58,ml_model:0.55,sec_cloud:0.53,sec_appsec:0.52,
  sw_backend:0.48,sw_frontend:0.42,sw_devops:0.51,sw_cloud:0.53,
  fin_audit:0.51,fin_compliance:0.48,fin_credit:0.45,
  mkt_seo:0.32,mkt_sem:0.34,mkt_analytics:0.43,
  hr_ld:0.48,hr_comp:0.45,edu_teach:0.53,edu_higher:0.55,
  eng_civil:0.53,eng_mech:0.55,eng_elec:0.51,
  mfg_process:0.52,mfg_lean:0.55,mfg_supervisor:0.58,mfg_automation:0.62,
  des_ui:0.43,des_graphic:0.40,des_motion:0.45,
  med_journalism:0.58,adv_creative:0.55,adv_brand:0.58,adv_pr:0.61,
  ph_research:0.63,ph_regulatory:0.58,ph_clinical:0.58,
  log_scm:0.51,log_procurement:0.53,log_fleet:0.48,
  game_unity:0.42,game_unreal:0.45,sec_soc:0.45,sec_grc:0.48,
  nur_icu:0.61,nur_rn:0.53,hc_physio:0.65,hc_nutrition:0.58,
  tr_coach:0.68,tr_facilitator:0.58,tr_ld:0.51,
  edt_product:0.53,saas_pm:0.58,saas_growth:0.53,
  con_it:0.55,adm_exec:0.53,gov_policy:0.61,
  agri_farming:0.60,agri_tech:0.55,ngo_field:0.65,
  bpo_data_entry:0.04,bpo_chat:0.07,bpo_inbound:0.09,bpo_email_support:0.07,bpo_outbound:0.08,
  cnt_blog:0.09,cnt_seo_content:0.07,cnt_email:0.09,cnt_social:0.09,cnt_copy:0.11,cnt_ghostwrite:0.12,
  fin_payroll:0.09,qa_manual:0.11,ins_admin:0.07,adm_data_entry:0.04,
  web_wordpress:0.11,adm_reception:0.13,ret_floor:0.13,
  hc_medical_coding:0.07,bpo_claims:0.09,med_edit:0.14,
  fin_reporting:0.11,mkt_social_ads:0.17,ins_claims:0.11,
  log_warehouse:0.14,log_last_mile:0.09,
  cnt_translation:0.10,
  default:0.42,
};

export const EXP_RISK_BASE: Record<string, number> = {'0-2':82,'2-5':70,'5-10':50,'10-20':32,'20+':18};
export const EXP_INDEX: Record<string, number> = {'0-2':0,'2-5':1,'5-10':2,'10-20':3,'20+':4};

// ─── D5: Country Data ──────────────────────────────────────
// Format: [AI adoption (0-100), regulatory protection (0-100)]
// Sources: OECD AI Policy Observatory, WEF AI Governance Index 2025
// Higher adoption = more AI exposure | Higher regulation = more protected
export const COUNTRY_DATA: Record<string, [number, number]> = {
  // Nordic / Northern Europe — highest AI, highest regulation
  sweden:      [82, 85], denmark:   [80, 87], norway:    [78, 75], finland:   [77, 83], iceland:   [72, 78],
  // Western Europe (EU — strict AI Act regulation)
  germany:     [72, 82], netherlands:[76, 78], austria:  [72, 79], switzerland:[76, 68], belgium:   [70, 80],
  france:      [71, 80], spain:     [64, 75],  italy:    [62, 72], portugal:  [59, 73],
  ireland:     [74, 70], estonia:   [72, 72],  latvia:   [62, 65],
  // Anglophone — high adoption, moderate regulation
  usa:         [90, 28], uk:        [78, 57],  canada:   [80, 55], australia: [77, 48],
  nz:          [71, 52], israel:    [80, 35],
  // Asia-Pacific
  singapore:   [92, 40], south_korea:[75, 48], japan:   [72, 64], taiwan:    [70, 42], hong_kong:  [74, 38],
  china:       [88, 52],
  // South Asia
  india:       [65, 22], pakistan:  [44, 18],  bangladesh:[47, 16], srilanka: [42, 20], nepal:     [32, 15],
  // Southeast Asia
  malaysia:    [60, 32], indonesia: [52, 26],  vietnam:  [49, 30], thailand:  [54, 35],
  philippines: [65, 22], myanmar:   [28, 12],  cambodia: [24, 10],
  // Middle East
  uae:         [72, 35], saudi:     [66, 38],  qatar:    [68, 40], kuwait:    [60, 35],
  bahrain:     [58, 32], oman:      [52, 30],  turkey:   [56, 42], jordan:    [46, 35], egypt:     [46, 28],
  // Africa
  south_africa:[54, 32], nigeria:   [30, 20],  kenya:    [37, 18], ghana:     [32, 15],
  ethiopia:    [24, 12], morocco:   [42, 25],
  // Eastern Europe
  poland:      [62, 62], czechia:   [63, 65],  romania:  [54, 55], ukraine:   [44, 38],
  russia:      [58, 45], hungary:   [58, 60],
  // Latin America
  brazil:      [48, 38], mexico:    [52, 32],  colombia: [46, 35], argentina: [48, 42],
  chile:       [54, 40], peru:      [42, 30],
  // Other
  other:       [55, 40],
};

// ─── D6: Social Capital & Network Moat (NEW) ──────────────
// Source: MIT Sloan "Network Effects in Labor Markets" 2024, LinkedIn Economic Graph
// Range: 10–85 | Lower = stronger network moat = more protected
// MIT research: roles with high relationship dependencies are 2.3× more likely to survive automation
export const NETWORK_MOAT: Record<string, number> = {
  // Very high network moat (low D6 = highly protective)
  c_suite:                10, executive_strategy:     12, politician_diplomat:   11,
  surgeon:                16, therapist_counselor:    14, judge_lawyer_partner:  20,
  enterprise_sales:       18, investment_banker_sr:   22, management_consultant_sr: 24,
  talent_recruiter_exec:  28, brand_strategist:       30,
  // High moat
  teacher_professor:      36, software_architect:     35, product_manager:       38,
  marketing_manager:      40, ux_designer:            42, data_scientist:        45,
  // Per work-type key mapping (matches TASK_AUTO keys)
  sw_arch:                32, sw_lead:                34, con_strategy:          14,
  con_mgmt:               18, inv_vc:                 20, inv_ibanking:          22,
  leg_litigation:         24, leg_corporate:          26, hc_surgeon:            14,
  mh_therapist:           16, mh_crisis:              18, mh_psychologist:       18,
  hc_specialist:          20, hc_doctor:              22, edu_special:           28,
  edu_counsellor:         26, nur_midwife:            30, trav_guide:            32,
  hr_diversity:           34, ngo_field:              30, game_design:           38,
  con_sustainability:     36, con_risk:               38, con_change:            30,
  ml_research:            40, ml_ai_safety:           28, ml_rlhf:               30,
  ml_prompt_eng:          38, sec_pen:                42, ph_research:           44,
  fin_risk:               40, fin_fp:                 42, des_ux:                44,
  mkt_product:            40, mkt_brand:              38, mkt_growth:            44,
  fin_invest:             38, inv_portfolio:          40, eng_project:           42,
  // Moderate moat
  sw_backend:             52, sw_frontend:            58, sw_devops:             55,
  hr_hrbp:                48, hr_lr:                  44, leg_ip:                46,
  edu_teach:              42, edu_higher:             40, gov_policy:            36,
  aero_eng:               48, auto_ev:                50, adm_exec:              46,
  // Low moat (high D6 = more vulnerable to network-free displacement)
  financial_analyst_jr:   65, junior_developer:       68, content_writer_jr:     72,
  paralegal:              70, seo_specialist:         74, bookkeeper:            80,
  data_entry:             78, customer_service_agent: 82,
  // Per work-type key mapping for low-moat roles
  fin_account:            62, fin_payroll:            72, fin_reporting:         65,
  fin_audit:              60, fin_credit:             64, fin_compliance:        58,
  ins_claims:             70, ins_admin:              76, ins_underwrite:        65,
  qa_manual:              80, bpo_data_entry:         84, bpo_chat:              82,
  bpo_inbound:            80, bpo_email_support:      79, bpo_outbound:          81,
  cnt_blog:               74, cnt_seo_content:        78, cnt_email:             76,
  cnt_social:             72, cnt_copy:               68, cnt_ghostwrite:        70,
  hc_medical_coding:      75, hc_admin_hc:            72, adm_data_entry:        84,
  adm_reception:          72, adm_office:             65, ret_floor:             76,
  ec_catalog:             78, ec_returns:             76, log_warehouse:         70,
  med_edit:               64, des_graphic:            60, des_logo:              62,
  mkt_seo:                68, mkt_sem:                66, mkt_analytics:         60,
  hr_payroll:             72, hr_ops:                 66, hr_hris:               68,
  hr_recruit:             54, hr_comp:                58, hr_ld:                 52,
  leg_paralegal:          70, leg_compliance:         60, leg_tax_law:           62,
  default:                52,
};

// D6 experience bonus (years reduce your D6 score = more protected by network)
export const D6_EXP_BONUS: Record<string, number> = {
  '0-2':   0,   // No professional network yet
  '2-5':  -5,   // Starting to build relationships
  '5-10': -10,  // Meaningful network established
  '10-20':-16,  // Strong professional moat
  '20+':  -22,  // Irreplaceable institutional network
};

// ─── Industry Multipliers ──────────────────────────────────
export const INDUSTRY_KEY_MULT: Record<string, number> = {
  finance: 1.42, fintech: 1.42, investment: 1.40, insurance: 1.30,
  legal: 1.18,
  it_software: 1.35, it_web: 1.20, it_saas: 1.20, it_ai_ml: 1.10,
  it_mobile: 1.15, it_cybersec: 1.05, it_devops: 1.20, it_qa: 1.15,
  it_erp: 1.12, it_blockchain: 1.05, it_gaming: 1.05,
  content: 1.25, marketing: 1.25, advertising: 1.32, media: 1.32,
  analytics: 1.30,
  design: 1.28, creative_agency: 1.15,
  bpo: 1.05, admin: 1.10, ecommerce: 1.10, retail: 1.05,
  logistics: 1.35, manufacturing: 1.28,
  education: 0.68, edtech: 0.78, training: 0.80,
  healthcare: 0.60, nursing: 0.60, pharma: 0.82,
  mental_health: 0.48,
  architecture: 0.78,
  social_work: 0.42,
  hr: 1.18, consulting: 1.15, automotive: 0.90, engineering: 0.88,
  construction: 0.62, energy: 0.88, aerospace: 0.88,
  government: 0.90, ngo: 0.88, agriculture: 0.85,
  travel: 1.00, fmcg: 0.95,
};

// ─── Experience Deduction ──────────────────────────────────
export const EXP_BONUS: Record<string, number> = {
  '0-2': 0, '2-5': 5, '5-10': 12, '10-20': 18, '20+': 22,
};

// ─── 2026 D3 Override Overrides ────────────────────────────
export const REPLACEMENT_2026_OVERRIDES: Record<string, number> = {
  'legal-legal-research':92,'legal-contract-drafting':87,'legal-case-summarising':94,
  'legal-paralegal':88,'legal-compliance-review':82,'legal-due-diligence':86,
  'accounting-bookkeeping':96,'accounting-payroll':93,'accounting-tax-preparation':90,
  'finance-financial-reporting':87,'finance-data-reconciliation':91,'finance-underwriting':85,
  'finance-loan-processing':88,'hr-cv-screening':95,'hr-jd-writing':91,
  'hr-performance-review-writing':84,'analyst-sql-queries':94,'analyst-report-building':90,
  'analyst-data-cleaning':88,'analyst-dashboard-creation':86,
  'swe-code-generation':93,'swe-documentation':86,'swe-bug-fixing':84,'swe-api-integration':82,
  'marketing-copywriting':85,'marketing-seo-content':87,'marketing-social-media':87,
  'marketing-email-campaigns':90,'marketing-ad-copy':88,'marketing-market-research':82,
  'designer-image-generation':95,'designer-icon-design':88,'designer-banner-ads':86,'designer-logo-design':82,
  'doctor-imaging-analysis':91,'doctor-lab-interpretation':82,
  'healthcare-medical-coding':95,'healthcare-clinical-documentation':78,'healthcare-prescription-review':74,
  'customer-service-chat':96,'customer-service-email':93,'customer-service-tier1-support':91,
  'bpo-data-entry':97,'bpo-claims-processing':88,
  'insurance-underwriting':85,'insurance-claims-adjudication':83,
  'logistics-route-optimization':86,'logistics-inventory-counting':91,
  'travel-itinerary-creation':89,'travel-booking-management':86,
  'admin-meeting-notes':88,'admin-scheduling':87,'admin-email-triage':84,
  'pharma-drug-literature-review':82,
  'media-article-summarisation':90,'media-image-editing':78,
};

// ─── D7: Agentic Disruption Potential ──────────────────────
// Measures vulnerability once autonomous AI executes complete workflows.
// 6 sub-factors averaged: workflow structure complexity, decision autonomy,
// human relationship dependency (inverted), physical world dependency (inverted),
// multi-step reasoning requirements, organizational trust requirements.
// Range: 8–97 | Higher = more post-threshold vulnerable
// Does NOT enter GROUNDED_FORMULA_WEIGHTS — supplementary structural signal only.
export const D7_AGENTIC_DISRUPTION: Record<string, number> = {
  // BPO / Admin (highest — fully digital, rule-bound, no physical dependency)
  bpo_data_entry: 97, bpo_chat: 95, bpo_inbound: 90, bpo_email_support: 88,
  bpo_outbound: 86, bpo_virtual: 82, bpo_hr_ops: 78, bpo_social_mod: 62, bpo_claims: 85,
  adm_data_entry: 95, adm_office: 80, adm_reception: 72, adm_exec: 60, adm_coord: 65,
  // Content / Marketing
  cnt_seo_content: 93, cnt_copy: 88, cnt_blog: 90, cnt_email: 88, cnt_social: 85,
  cnt_script: 80, cnt_ghostwrite: 82, cnt_translation: 78, cnt_tech_write: 72, cnt_ux_write: 60,
  mkt_seo: 80, mkt_sem: 75, mkt_analytics: 72, mkt_copywriter: 86,
  mkt_crm: 68, mkt_social_ads: 74, mkt_growth: 58, mkt_brand: 45, mkt_product: 42,
  // Finance
  fin_payroll: 92, fin_account: 85, fin_reporting: 82, fin_audit: 76,
  fin_tax: 74, fin_credit: 70, fin_fp: 62, fin_risk: 55,
  fin_compliance: 60, fin_treasury: 58, fin_invest: 50,
  fin_investment_banker: 50, fin_private_equity: 42, fin_quant: 60,
  ins_claims: 86, ins_admin: 84, ins_underwrite: 72,
  // Legal
  leg_paralegal: 84, leg_contract_attorney: 76, leg_corporate: 58, leg_compliance: 55,
  leg_litigation: 38, leg_ip: 42, leg_tax_law: 65, leg_cyberlaw: 50,
  // Software / Tech
  sw_frontend: 72, sw_backend: 65, sw_fullstack: 68, sw_testing: 78, sw_api: 70,
  qa_manual: 80, qa_auto: 62, sw_devops: 48, sw_cloud: 42, sw_mobile_dev: 65,
  sw_security: 35, sw_arch: 30, sw_lead: 28, sw_legacy: 55, sw_db: 68,
  ml_engineer: 38, ml_research: 28, ml_prompt_eng: 45, ml_nlp: 42, ml_model: 40,
  ml_analytics: 58, ml_etl: 62, ml_data: 55, ml_mlops: 44, ml_cv: 40,
  ml_embed: 30, ml_rlhf: 25, ml_ai_safety: 20, ml_prompt: 50,
  sec_pen: 38, sec_soc: 60, sec_cloud: 45, sec_appsec: 40, sec_grc: 55,
  data_analyst: 70, data_eng: 60,
  // Healthcare
  hc_medical_coding: 88, hc_admin_hc: 78, hc_radiology: 65, hc_pharmacist: 55,
  hc_tele: 58, hc_nutrition: 45, hc_physio: 22,
  hc_physician: 22, hc_doctor: 22, hc_surgeon: 12, hc_specialist: 18, hc_pathology: 55,
  nur_rn: 18, nur_icu: 14, nur_community: 20, nur_midwife: 12, nur_para: 22,
  mh_therapist: 10, mh_psychologist: 12, mh_coach: 30, mh_social: 16, mh_crisis: 8,
  ph_research: 36, ph_clinical: 40, ph_regulatory: 48, ph_biotech: 35,
  // HR
  hr_recruit: 72, hr_payroll: 85, hr_ops: 70, hr_hrbp: 38,
  hr_comp: 58, hr_ld: 45, hr_diversity: 36, hr_hris: 65,
  // Education
  edu_admin_edu: 65, edt_content: 70, edu_teach: 30, edu_special: 15,
  edu_higher: 28, edu_counsellor: 20, edu_curriculum: 52,
  // Engineering / Manufacturing
  eng_civil: 40, eng_mech: 42, eng_elec: 44, eng_project: 38,
  mfg_production: 58, mfg_quality: 60, mfg_cad: 55, mfg_supervisor: 42,
  // Design
  des_graphic: 65, des_ux: 38, des_ui: 55, des_logo: 60, des_motion: 52, des_product: 36,
  // Media
  med_journalism: 68, med_edit: 82, med_video: 50,
  // Retail / Logistics
  ret_floor: 70, ret_inventory: 75, ec_catalog: 88, ec_returns: 80, log_warehouse: 72,
  // Government / NGO
  gov_admin: 45, gov_policy: 35, ngo_program: 38, ngo_comms: 58,
  // Default
  default: 55,
};

// ─── Specialist Keywords ───────────────────────────────────
export const SPECIALIST_KEYWORDS = [
  'forensic','chief','principal','distinguished','lead','appellate',
  'clinical','trauma','specialist','director','partner','fellow',
  'emeritus','consultant','architect','head of','vp of',
];

export const SPECIFICITY_MARKERS = [
  'forensic','compliance','clinical','trauma','appellate','enterprise',
  'principal','distinguished','chief','lead',
];
