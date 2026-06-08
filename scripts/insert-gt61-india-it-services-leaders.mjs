// GT61: India IT Services & Outsourcing Leaders (2026)
import { runBatch } from './_gt-upsert-lib.mjs';
const V = 'gt61-v2026.1';

const companies = [
  { canonical_name:'tata consultancy services', display_name:'Tata Consultancy Services (TCS)', ticker:null, exchange:'NSE',
    industry:'IT Services / Consulting / Systems Integration / Digital / India IT Giant', sector:'Technology',
    is_public:true, country_code:'IN', workforce_count:610000, workforce_source:'annual_report', workforce_confidence:0.90,
    market_cap_usd:170000000000, pe_ratio:28, revenue_ttm_usd:30000000000,
    financials_source:'annual_report', financials_confidence:0.88,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.3, total_open_roles:2000, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'infosys limited', display_name:'Infosys Limited', ticker:null, exchange:'NSE',
    industry:'IT Services / Systems Integration / Consulting / Digital / India IT', sector:'Technology',
    is_public:true, country_code:'IN', workforce_count:323000, workforce_source:'annual_report', workforce_confidence:0.90,
    market_cap_usd:78000000000, pe_ratio:35, revenue_ttm_usd:21000000000,
    financials_source:'annual_report', financials_confidence:0.88,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:1500, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'wipro limited', display_name:'Wipro Limited', ticker:null, exchange:'NSE',
    industry:'IT Services / Consulting / Digital / Cloud / India IT / Engineering', sector:'Technology',
    is_public:true, country_code:'IN', workforce_count:258000, workforce_source:'annual_report', workforce_confidence:0.90,
    market_cap_usd:58000000000, pe_ratio:22, revenue_ttm_usd:11000000000,
    financials_source:'annual_report', financials_confidence:0.88,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:1200, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'hcl technologies limited', display_name:'HCL Technologies Limited', ticker:null, exchange:'NSE',
    industry:'IT Services / Consulting / Systems Integration / Digital / Engineering / India IT', sector:'Technology',
    is_public:true, country_code:'IN', workforce_count:220000, workforce_source:'annual_report', workforce_confidence:0.90,
    market_cap_usd:45000000000, pe_ratio:24, revenue_ttm_usd:12500000000,
    financials_source:'annual_report', financials_confidence:0.88,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.3, total_open_roles:1000, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'tech mahindra limited', display_name:'Tech Mahindra Limited', ticker:null, exchange:'NSE',
    industry:'IT Services / Consulting / Digital / Telecom / Cloud / India IT', sector:'Technology',
    is_public:true, country_code:'IN', workforce_count:145000, workforce_source:'annual_report', workforce_confidence:0.90,
    market_cap_usd:45000000000, pe_ratio:16, revenue_ttm_usd:5800000000,
    financials_source:'annual_report', financials_confidence:0.88,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:0.1, total_open_roles:800, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'persistent systems limited', display_name:'Persistent Systems Limited', ticker:null, exchange:'NSE',
    industry:'IT Services / Product Engineering / Digital / Cloud / India ER&D', sector:'Technology',
    is_public:true, country_code:'IN', workforce_count:25000, workforce_source:'annual_report', workforce_confidence:0.88,
    market_cap_usd:8000000000, pe_ratio:42, revenue_ttm_usd:1000000000,
    financials_source:'annual_report', financials_confidence:0.82,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.5, total_open_roles:400, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'larsen & toubro infotech', display_name:'L&T Infotech (LTTS)', ticker:null, exchange:'NSE',
    industry:'IT Services / Engineering / Product Engineering / Digital / India IT', sector:'Technology',
    is_public:true, country_code:'IN', workforce_count:40000, workforce_source:'annual_report', workforce_confidence:0.88,
    market_cap_usd:8500000000, pe_ratio:28, revenue_ttm_usd:2500000000,
    financials_source:'annual_report', financials_confidence:0.82,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.4, total_open_roles:600, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'mindtree limited', display_name:'Mindtree Limited', ticker:null, exchange:'NSE',
    industry:'IT Services / Digital / Cloud / Engineering / India IT / Larsen & Toubro', sector:'Technology',
    is_public:true, country_code:'IN', workforce_count:35000, workforce_source:'annual_report', workforce_confidence:0.88,
    market_cap_usd:7500000000, pe_ratio:32, revenue_ttm_usd:1500000000,
    financials_source:'annual_report', financials_confidence:0.82,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.4, total_open_roles:500, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'cognizant technology solutions', display_name:'Cognizant (India Ops)', ticker:'CTSH', exchange:'NASDAQ',
    industry:'IT Services / Consulting / Digital / Cloud / Global / US-India', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:340000, workforce_source:'annual_report', workforce_confidence:0.90,
    market_cap_usd:28000000000, pe_ratio:18, revenue_ttm_usd:19000000000,
    financials_source:'annual_report', financials_confidence:0.88,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:-0.1, total_open_roles:1000, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'birlasoft limited', display_name:'BIRLAsoft Limited', ticker:null, exchange:'NSE',
    industry:'IT Services / Digital / Cloud / Birla Group / India IT', sector:'Technology',
    is_public:true, country_code:'IN', workforce_count:13000, workforce_source:'annual_report', workforce_confidence:0.85,
    market_cap_usd:4500000000, pe_ratio:25, revenue_ttm_usd:1500000000,
    financials_source:'annual_report', financials_confidence:0.80,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.3, total_open_roles:500, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'capgemini india', display_name:'Capgemini (India Major Hub)', ticker:null, exchange:null,
    industry:'IT Services / Consulting / Digital / Capgemini / Global / India', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:200000, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:60000000000, pe_ratio:null, revenue_ttm_usd:30000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.65,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:2000, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'accenture india', display_name:'Accenture (India Operations)', ticker:null, exchange:null,
    industry:'IT Services / Consulting / Digital / Accenture / Global / India', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:250000, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:80000000000, pe_ratio:null, revenue_ttm_usd:65000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.65,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:0.1, total_open_roles:2000, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'ibm india limited', display_name:'IBM India Limited', ticker:null, exchange:null,
    industry:'IT Services / Technology / Cloud / AI / Systems / IBM / India', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:150000, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:65000000000, pe_ratio:null, revenue_ttm_usd:25000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.65,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:0.0, total_open_roles:1200, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'deloitte india', display_name:'Deloitte India', ticker:null, exchange:null,
    industry:'IT Services / Consulting / Audit / Tax / Risk / Deloitte / India', sector:'Professional Services',
    is_public:false, country_code:'IN', workforce_count:85000, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:45000000000, pe_ratio:null, revenue_ttm_usd:15000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:1500, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'ey india', display_name:'EY India', ticker:null, exchange:null,
    industry:'IT Services / Consulting / Audit / Tax / Risk / EY / India', sector:'Professional Services',
    is_public:false, country_code:'IN', workforce_count:75000, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:40000000000, pe_ratio:null, revenue_ttm_usd:12000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:1200, data_quality_tier:'seed', enrichment_version:V },
];

runBatch('GT61: India IT Services & Outsourcing Leaders (2026)', V, companies)
  .catch(e=>{ console.error(e); process.exit(1); });
