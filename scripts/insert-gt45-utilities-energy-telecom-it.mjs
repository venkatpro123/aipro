// GT45: Utilities, Energy & Telecom IT Infrastructure (2026)
import { runBatch } from './_gt-upsert-lib.mjs';
const V = 'gt45-v2026.1';

const companies = [
  // ── Telecom IT platforms (Yahoo) ──────────────────────────────────────────
  { canonical_name:'vonage holdings corp', display_name:'Vonage Holdings Corp.', ticker:'VG', exchange:'NYSE',
    industry:'Communications API / Cloud Communications / Contact Center / Unified Communications / Telecom SaaS', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:5600, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:2, layoff_confidence:0.82, hiring_velocity_score:-0.5, total_open_roles:200, enrichment_version:V },

  { canonical_name:'telnyx', display_name:'Telnyx Inc.', ticker:null, exchange:null,
    industry:'Cloud Communications / Voice API / Telecom Platform / Communications Infrastructure', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:1800, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:8000000000, pe_ratio:null, revenue_ttm_usd:600000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:0, layoff_confidence:0.70, hiring_velocity_score:0.6, total_open_roles:150, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'twilio inc', display_name:'Twilio Inc.', ticker:'TWLO', exchange:'NYSE',
    industry:'Communications API / SMS / Voice / Video / Customer Engagement / Communications Platform', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:8700, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:2, layoff_confidence:0.82, hiring_velocity_score:0.2, total_open_roles:300, enrichment_version:V },

  { canonical_name:'nexenta', display_name:'Lemonade Inc.', ticker:'LMND', exchange:'NYSE',
    industry:'InsurTech / AI Insurance / Property & Casualty / Renters Insurance / Insurance Technology', sector:'Financial Technology',
    is_public:true, country_code:'US', workforce_count:1000, workforce_source:'annual_report', workforce_confidence:0.85,
    recent_layoff_count:1, layoff_confidence:0.78, hiring_velocity_score:0.3, total_open_roles:80, enrichment_version:V },

  // ── Energy & utilities IT (pre-filled) ────────────────────────────────────
  { canonical_name:'operator technology group', display_name:'GE Power (Digital)', ticker:null, exchange:null,
    industry:'Energy IT / Power Generation / Grid Control / Renewable Energy / Smart Grid Technology', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:25000, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:null, pe_ratio:null, revenue_ttm_usd:3000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:-0.3, total_open_roles:300, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'fluor corporation', display_name:'Fluor Corporation', ticker:'FLR', exchange:'NYSE',
    industry:'Engineering / Construction IT / Oil & Gas Services / Energy Projects / Infrastructure', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:39000, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:400, enrichment_version:V },

  { canonical_name:'baker hughes co', display_name:'Baker Hughes Co.', ticker:'BKR', exchange:'NYSE',
    industry:'Oil & Gas Equipment / Industrial Technology / Digital Solutions / Energy Services / Equipment Automation', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:60000, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:2, layoff_confidence:0.82, hiring_velocity_score:0.1, total_open_roles:600, enrichment_version:V },

  { canonical_name:'halliburton company', display_name:'Halliburton Company', ticker:'HAL', exchange:'NYSE',
    industry:'Oil & Gas Services / Energy Equipment / Digital Solutions / Downstream Services', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:62000, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:400, enrichment_version:V },

  { canonical_name:'eaton corporation plc', display_name:'Eaton Corporation plc', ticker:'ETN', exchange:'NYSE',
    industry:'Power Management / Electrical Equipment / Energy IT / Industrial Automation / Smart Grid', sector:'Technology',
    is_public:true, country_code:'IE', workforce_count:104000, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:600, enrichment_version:V },

  { canonical_name:'wesco international inc', display_name:'WESCO International Inc.', ticker:'WCC', exchange:'NYSE',
    industry:'Electrical Supplies Distribution / Energy Services / IT Solutions / Electrical Equipment', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:13000, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:0, layoff_confidence:0.72, hiring_velocity_score:0.3, total_open_roles:300, enrichment_version:V },

  { canonical_name:'sulzer ltd', display_name:'Sulzer Ltd', ticker:null, exchange:'SIX',
    industry:'Pumping Equipment / Industrial Services / Renewable Energy / Energy Infrastructure / Switzerland Industrial', sector:'Technology',
    is_public:true, country_code:'CH', workforce_count:17000, workforce_source:'annual_report', workforce_confidence:0.88,
    market_cap_usd:12000000000, pe_ratio:15, revenue_ttm_usd:9000000000,
    financials_source:'annual_report', financials_confidence:0.82,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:400, data_quality_tier:'verified', enrichment_version:V },

  // ── Telecom infrastructure (pre-filled) ───────────────────────────────────
  { canonical_name:'telefonica sa', display_name:'Telefónica SA', ticker:null, exchange:'BME',
    industry:'Telecom / Digital Services / Cloud / Spain Telecom Giant / Europe Operator', sector:'Technology',
    is_public:true, country_code:'ES', workforce_count:125000, workforce_source:'annual_report', workforce_confidence:0.88,
    market_cap_usd:28000000000, pe_ratio:12, revenue_ttm_usd:50000000000,
    financials_source:'annual_report', financials_confidence:0.85,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:-0.1, total_open_roles:400, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'deutsche telekom ag', display_name:'Deutsche Telekom AG', ticker:null, exchange:'XETRA',
    industry:'Telecom / Digital Services / Mobile / Broadband / Germany Telecom Giant / Europe Operator', sector:'Technology',
    is_public:true, country_code:'DE', workforce_count:205000, workforce_source:'annual_report', workforce_confidence:0.90,
    market_cap_usd:95000000000, pe_ratio:8, revenue_ttm_usd:130000000000,
    financials_source:'annual_report', financials_confidence:0.88,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.0, total_open_roles:800, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'vodafone group plc', display_name:'Vodafone Group plc', ticker:null, exchange:'LON',
    industry:'Telecom / Digital Services / Mobile / Broadband / UK Telecom Giant / Europe Operator', sector:'Technology',
    is_public:true, country_code:'GB', workforce_count:106000, workforce_source:'annual_report', workforce_confidence:0.90,
    market_cap_usd:38000000000, pe_ratio:6, revenue_ttm_usd:60000000000,
    financials_source:'annual_report', financials_confidence:0.85,
    recent_layoff_count:2, layoff_confidence:0.82, hiring_velocity_score:-0.3, total_open_roles:500, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'orange sa', display_name:'Orange SA', ticker:null, exchange:'EPA',
    industry:'Telecom / Digital Services / Mobile / Broadband / France Telecom Giant / Europe Operator', sector:'Technology',
    is_public:true, country_code:'FR', workforce_count:175000, workforce_source:'annual_report', workforce_confidence:0.90,
    market_cap_usd:48000000000, pe_ratio:9, revenue_ttm_usd:70000000000,
    financials_source:'annual_report', financials_confidence:0.85,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:-0.2, total_open_roles:600, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'swisscom ag', display_name:'Swisscom AG', ticker:null, exchange:'SIX',
    industry:'Telecom / Digital Services / Mobile / Broadband / Switzerland Operator', sector:'Technology',
    is_public:true, country_code:'CH', workforce_count:21000, workforce_source:'annual_report', workforce_confidence:0.88,
    market_cap_usd:24000000000, pe_ratio:10, revenue_ttm_usd:12000000000,
    financials_source:'annual_report', financials_confidence:0.82,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:-0.1, total_open_roles:200, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'british telecom group plc', display_name:'BT Group plc', ticker:null, exchange:'LON',
    industry:'Telecom / Digital Services / Broadband / IT Services / UK Operator / Public Networks', sector:'Technology',
    is_public:true, country_code:'GB', workforce_count:113000, workforce_source:'annual_report', workforce_confidence:0.88,
    market_cap_usd:28000000000, pe_ratio:7, revenue_ttm_usd:35000000000,
    financials_source:'annual_report', financials_confidence:0.82,
    recent_layoff_count:2, layoff_confidence:0.82, hiring_velocity_score:-0.2, total_open_roles:400, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'japan telecommunications', display_name:'NTT (Nippon Telegraph & Telephone)', ticker:null, exchange:'TYO',
    industry:'Telecom / Digital Services / 5G / Cloud / Data Centers / Japan Telecom Giant', sector:'Technology',
    is_public:true, country_code:'JP', workforce_count:330000, workforce_source:'annual_report', workforce_confidence:0.90,
    market_cap_usd:130000000000, pe_ratio:14, revenue_ttm_usd:120000000000,
    financials_source:'annual_report', financials_confidence:0.88,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.1, total_open_roles:1200, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'softbank group corp', display_name:'SoftBank Group Corp', ticker:null, exchange:'TYO',
    industry:'Telecom / Broadband / Digital Services / Internet / Japan Tech Conglomerate / Vision Fund', sector:'Technology',
    is_public:true, country_code:'JP', workforce_count:97000, workforce_source:'annual_report', workforce_confidence:0.88,
    market_cap_usd:110000000000, pe_ratio:15, revenue_ttm_usd:80000000000,
    financials_source:'annual_report', financials_confidence:0.85,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:-0.3, total_open_roles:500, data_quality_tier:'verified', enrichment_version:V },
];

runBatch('GT45: Utilities, Energy & Telecom IT Infrastructure (2026)', V, companies)
  .catch(e=>{ console.error(e); process.exit(1); });
