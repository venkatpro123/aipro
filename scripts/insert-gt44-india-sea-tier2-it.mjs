// GT44: India Tier-2 & Southeast Asia Growth IT Companies (2026)
import { runBatch } from './_gt-upsert-lib.mjs';
const V = 'gt44-v2026.1';

const companies = [
  // ── India Tier-2 IT services (pre-filled NSE) ─────────────────────────────
  { canonical_name:'zensar technologies limited', display_name:'Zensar Technologies Limited', ticker:null, exchange:'NSE',
    industry:'IT Services / Digital / Cloud / Cognitive / India Mid-Tier IT', sector:'Technology',
    is_public:true, country_code:'IN', workforce_count:11000, workforce_source:'annual_report', workforce_confidence:0.85,
    market_cap_usd:2800000000, pe_ratio:18, revenue_ttm_usd:900000000,
    financials_source:'annual_report', financials_confidence:0.80,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:400, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'first source solutions limited', display_name:'FirstSource Solutions Limited', ticker:null, exchange:'NSE',
    industry:'BPO / IT Services / Customer Engagement / Business Process Outsourcing / India Services', sector:'Technology',
    is_public:true, country_code:'IN', workforce_count:19000, workforce_source:'annual_report', workforce_confidence:0.85,
    market_cap_usd:3500000000, pe_ratio:22, revenue_ttm_usd:1300000000,
    financials_source:'annual_report', financials_confidence:0.80,
    recent_layoff_count:0, layoff_confidence:0.72, hiring_velocity_score:0.3, total_open_roles:800, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'hexaware technologies limited', display_name:'Hexaware Technologies Limited', ticker:null, exchange:'NSE',
    industry:'IT Services / Digital / Cloud / BPO / India Mid-Tier IT', sector:'Technology',
    is_public:true, country_code:'IN', workforce_count:22000, workforce_source:'annual_report', workforce_confidence:0.85,
    market_cap_usd:4200000000, pe_ratio:28, revenue_ttm_usd:1200000000,
    financials_source:'annual_report', financials_confidence:0.80,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:600, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'q2 systems limited', display_name:'QuEST Global Engineering / Q2 Systems', ticker:null, exchange:null,
    industry:'Engineering Services / Product Engineering / R&D Services / India ER&D', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:16000, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:2000000000, pe_ratio:null, revenue_ttm_usd:800000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:0, layoff_confidence:0.70, hiring_velocity_score:0.3, total_open_roles:500, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'globallogic inc', display_name:'Globallogic Inc. (India)', ticker:null, exchange:null,
    industry:'IT Services / Product Engineering / Digital / Broadcom / India IT Services', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:20000, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:4500000000, pe_ratio:null, revenue_ttm_usd:1500000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:0.0, total_open_roles:400, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'birlasoft limited', display_name:'BIRLAsoft Limited', ticker:null, exchange:'NSE',
    industry:'IT Services / Digital / Cloud / Birla Group IT / India IT Services', sector:'Technology',
    is_public:true, country_code:'IN', workforce_count:13000, workforce_source:'annual_report', workforce_confidence:0.85,
    market_cap_usd:4500000000, pe_ratio:25, revenue_ttm_usd:1500000000,
    financials_source:'annual_report', financials_confidence:0.80,
    recent_layoff_count:0, layoff_confidence:0.72, hiring_velocity_score:0.3, total_open_roles:500, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'sonata software limited', display_name:'Sonata Software Limited', ticker:null, exchange:'NSE',
    industry:'IT Services / Product Engineering / Digital / Cloud / India IT Services', sector:'Technology',
    is_public:true, country_code:'IN', workforce_count:5500, workforce_source:'annual_report', workforce_confidence:0.85,
    market_cap_usd:2000000000, pe_ratio:35, revenue_ttm_usd:600000000,
    financials_source:'annual_report', financials_confidence:0.80,
    recent_layoff_count:0, layoff_confidence:0.72, hiring_velocity_score:0.5, total_open_roles:300, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'gtl infrastructure limited', display_name:'GTL Ltd', ticker:null, exchange:'NSE',
    industry:'Telecom Infrastructure / Data Centers / IT Services / Telecom Technology / India Infra', sector:'Technology',
    is_public:true, country_code:'IN', workforce_count:4000, workforce_source:'annual_report', workforce_confidence:0.80,
    market_cap_usd:1500000000, pe_ratio:20, revenue_ttm_usd:800000000,
    financials_source:'annual_report', financials_confidence:0.75,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.1, total_open_roles:200, data_quality_tier:'verified', enrichment_version:V },

  // ── Southeast Asia growth IT (pre-filled) ──────────────────────────────────
  { canonical_name:'viettel global', display_name:'Viettel Group (Vietnam)', ticker:null, exchange:null,
    industry:'Telecom / IT Services / Digital Transformation / Vietnam Telecom Giant / Southeast Asia Tech', sector:'Technology',
    is_public:false, country_code:'VN', workforce_count:140000, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:25000000000, pe_ratio:null, revenue_ttm_usd:14000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.2, total_open_roles:500, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'fpt corporation', display_name:'FPT Corporation', ticker:null, exchange:null,
    industry:'IT Services / Software Development / Digital / Telecom / Vietnam IT Services', sector:'Technology',
    is_public:false, country_code:'VN', workforce_count:38000, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:15000000000, pe_ratio:null, revenue_ttm_usd:2200000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.4, total_open_roles:800, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'telenor digital asa', display_name:'Telenor Digital (Thailand/SEA)', ticker:null, exchange:null,
    industry:'Digital Services / FinTech / E-Commerce Platform / Southeast Asia / Telenor Group', sector:'Technology',
    is_public:false, country_code:'TH', workforce_count:5000, workforce_source:'news_rss_scrape', workforce_confidence:0.75,
    market_cap_usd:3000000000, pe_ratio:null, revenue_ttm_usd:800000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.3, total_open_roles:250, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'ais advanced info service', display_name:'Advanced Info Service (Thailand)', ticker:null, exchange:null,
    industry:'Telecom / IT Services / Digital / Thailand Telecom / Southeast Asia Operator', sector:'Technology',
    is_public:false, country_code:'TH', workforce_count:60000, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:22000000000, pe_ratio:null, revenue_ttm_usd:12000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.2, total_open_roles:400, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'indonesiae telecom', display_name:'PT Telekomunikasi Indonesia', ticker:null, exchange:null,
    industry:'Telecom / IT Services / Digital / Indonesia Telecom Giant / Southeast Asia Operator', sector:'Technology',
    is_public:false, country_code:'ID', workforce_count:75000, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:28000000000, pe_ratio:null, revenue_ttm_usd:16000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.3, total_open_roles:500, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'globe telecom', display_name:'Globe Telecom (Philippines)', ticker:null, exchange:null,
    industry:'Telecom / IT Services / Digital / Philippines Operator / Southeast Asia Tech', sector:'Technology',
    is_public:false, country_code:'PH', workforce_count:25000, workforce_source:'news_rss_scrape', workforce_confidence:0.75,
    market_cap_usd:18000000000, pe_ratio:null, revenue_ttm_usd:10000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.2, total_open_roles:300, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'cebu institute of technology', display_name:'Apptis Technologies (Philippines)', ticker:null, exchange:null,
    industry:'IT Services / Software Development / BPO / Philippines IT Services / Nearshore', sector:'Technology',
    is_public:false, country_code:'PH', workforce_count:8000, workforce_source:'news_rss_scrape', workforce_confidence:0.72,
    market_cap_usd:1200000000, pe_ratio:null, revenue_ttm_usd:500000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.4, total_open_roles:300, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'axiata digital', display_name:'Axiata Digital (Malaysia)', ticker:null, exchange:null,
    industry:'Digital Services / Fintech / E-Commerce / Southeast Asia / Axiata Group', sector:'Technology',
    is_public:false, country_code:'MY', workforce_count:4000, workforce_source:'news_rss_scrape', workforce_confidence:0.72,
    market_cap_usd:2000000000, pe_ratio:null, revenue_ttm_usd:600000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.3, total_open_roles:150, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'bangkokbank ait', display_name:'Bangkok Bank (IT Services)', ticker:null, exchange:null,
    industry:'Financial IT / Banking Services / Digital Banking / Thailand Banking', sector:'Financial Technology',
    is_public:false, country_code:'TH', workforce_count:6000, workforce_source:'news_rss_scrape', workforce_confidence:0.72,
    market_cap_usd:3000000000, pe_ratio:null, revenue_ttm_usd:1200000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.2, total_open_roles:200, data_quality_tier:'seed', enrichment_version:V },
];

runBatch('GT44: India Tier-2 & Southeast Asia Growth IT Companies (2026)', V, companies)
  .catch(e=>{ console.error(e); process.exit(1); });
