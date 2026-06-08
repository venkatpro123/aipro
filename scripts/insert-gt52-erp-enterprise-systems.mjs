// GT52: Enterprise Resource Planning & Systems (2026)
import { runBatch } from './_gt-upsert-lib.mjs';
const V = 'gt52-v2026.1';

const companies = [
  { canonical_name:'oracle corporation', display_name:'Oracle Corporation', ticker:'ORCL', exchange:'NYSE',
    industry:'ERP / Database / Cloud / Enterprise Software / Database Management / Fusion Cloud', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:156000, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:0.3, total_open_roles:3000, enrichment_version:V },

  { canonical_name:'sap se', display_name:'SAP SE', ticker:null, exchange:'XETRA',
    industry:'ERP / Enterprise Software / Business Intelligence / Cloud / S/4HANA / BI Platform', sector:'Technology',
    is_public:true, country_code:'DE', workforce_count:108000, workforce_source:'annual_report', workforce_confidence:0.90,
    market_cap_usd:180000000000, pe_ratio:30, revenue_ttm_usd:32000000000,
    financials_source:'annual_report', financials_confidence:0.88,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:1500, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'workday inc', display_name:'Workday Inc.', ticker:'WDAY', exchange:'NASDAQ',
    industry:'ERP / HCM / HR / Financial Management / Cloud ERP / People Analytics', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:15000, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.6, total_open_roles:1000, enrichment_version:V },

  { canonical_name:'infor global', display_name:'Infor Global', ticker:null, exchange:null,
    industry:'ERP / Enterprise Software / Manufacturing / Supply Chain / Cloud Platform', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:18000, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:14000000000, pe_ratio:null, revenue_ttm_usd:3200000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.3, total_open_roles:800, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'netsuite oracle', display_name:'NetSuite (Oracle)', ticker:null, exchange:null,
    industry:'ERP / Cloud ERP / Financial Management / Inventory / CRM / SuiteCommerce', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:2500, workforce_source:'news_rss_scrape', workforce_confidence:0.74,
    market_cap_usd:9200000000, pe_ratio:null, revenue_ttm_usd:1200000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.2, total_open_roles:300, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'ifs ab', display_name:'IFS AB', ticker:null, exchange:'NASDAQ',
    industry:'ERP / Enterprise Software / Manufacturing / Field Service / Asset Management', sector:'Technology',
    is_public:true, country_code:'SE', workforce_count:7500, workforce_source:'annual_report', workforce_confidence:0.85,
    market_cap_usd:15000000000, pe_ratio:35, revenue_ttm_usd:1800000000,
    financials_source:'annual_report', financials_confidence:0.82,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.4, total_open_roles:500, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'deltek inc', display_name:'Deltek Inc.', ticker:null, exchange:null,
    industry:'ERP / Project Management / Government Contracting / Professional Services Automation', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:2800, workforce_source:'news_rss_scrape', workforce_confidence:0.74,
    market_cap_usd:4000000000, pe_ratio:null, revenue_ttm_usd:600000000,
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.3, total_open_roles:250, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'epicor software', display_name:'Epicor Software', ticker:null, exchange:null,
    industry:'ERP / Manufacturing / Distribution / Food & Beverage / Cloud Platform', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:3500, workforce_source:'news_rss_scrape', workforce_confidence:0.74,
    market_cap_usd:2500000000, pe_ratio:null, revenue_ttm_usd:500000000,
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.4, total_open_roles:300, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'unit4 nv', display_name:'Unit4 NV', ticker:null, exchange:null,
    industry:'ERP / Financial Management / HR / Professional Services / Cloud ERP', sector:'Technology',
    is_public:false, country_code:'NL', workforce_count:3800, workforce_source:'news_rss_scrape', workforce_confidence:0.74,
    market_cap_usd:2800000000, pe_ratio:null, revenue_ttm_usd:600000000,
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.3, total_open_roles:300, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'ramco systems', display_name:'Ramco Systems', ticker:null, exchange:'NSE',
    industry:'ERP / Aviation / Airline / Logistics / Manufacturing / Cloud Platform', sector:'Technology',
    is_public:true, country_code:'IN', workforce_count:3200, workforce_source:'annual_report', workforce_confidence:0.80,
    market_cap_usd:1200000000, pe_ratio:32, revenue_ttm_usd:300000000,
    financials_source:'annual_report', financials_confidence:0.78,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.5, total_open_roles:300, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'tata consultancy services', display_name:'Tata Consultancy Services', ticker:null, exchange:'NSE',
    industry:'ERP / Enterprise Software / Systems Integration / Consulting / IT Services', sector:'Technology',
    is_public:true, country_code:'IN', workforce_count:610000, workforce_source:'annual_report', workforce_confidence:0.90,
    market_cap_usd:170000000000, pe_ratio:28, revenue_ttm_usd:30000000000,
    financials_source:'annual_report', financials_confidence:0.88,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.3, total_open_roles:2000, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'infosys limited', display_name:'Infosys Limited', ticker:null, exchange:'NSE',
    industry:'ERP / Systems Integration / Consulting / IT Services / Digital Transformation', sector:'Technology',
    is_public:true, country_code:'IN', workforce_count:323000, workforce_source:'annual_report', workforce_confidence:0.90,
    market_cap_usd:78000000000, pe_ratio:35, revenue_ttm_usd:21000000000,
    financials_source:'annual_report', financials_confidence:0.88,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:1500, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'coupa software', display_name:'Coupa Software', ticker:'COUP', exchange:'NASDAQ',
    industry:'ERP / Spend Management / Supply Chain / Business Spend Management / Cloud', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:2600, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.3, total_open_roles:300, enrichment_version:V },

  { canonical_name:'descartes systems', display_name:'Descartes Systems', ticker:'DSGX', exchange:'NASDAQ',
    industry:'ERP / Supply Chain / Logistics / Customs / Trade / Cloud Platform', sector:'Technology',
    is_public:true, country_code:'CA', workforce_count:3800, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.4, total_open_roles:350, enrichment_version:V },

  { canonical_name:'kinaxis inc', display_name:'Kinaxis Inc.', ticker:'KXS', exchange:'TSX',
    industry:'ERP / Supply Chain / Digital Supply Network / Demand Planning / Cloud Platform', sector:'Technology',
    is_public:true, country_code:'CA', workforce_count:1500, workforce_source:'annual_report', workforce_confidence:0.85,
    market_cap_usd:4200000000, pe_ratio:120, revenue_ttm_usd:350000000,
    financials_source:'annual_report', financials_confidence:0.82,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.6, total_open_roles:250, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'e2open parent holdings', display_name:'E2open', ticker:'ETWO', exchange:'NYSE',
    industry:'ERP / Supply Chain / Logistics / Trade / Cloud Platform / Ecosystem', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:3500, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:400, enrichment_version:V },
];

runBatch('GT52: Enterprise Resource Planning & Systems (2026)', V, companies)
  .catch(e=>{ console.error(e); process.exit(1); });
