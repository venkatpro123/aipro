// GT58: Real Estate & Property Technology (2026)
import { runBatch } from './_gt-upsert-lib.mjs';
const V = 'gt58-v2026.1';

const companies = [
  { canonical_name:'zillow group inc', display_name:'Zillow Group Inc.', ticker:'Z', exchange:'NASDAQ',
    industry:'Real Estate / Property / Home Search / Marketplace / Rental / Digital', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:9500, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:-0.2, total_open_roles:400, enrichment_version:V },

  { canonical_name:'redfin inc', display_name:'Redfin Inc.', ticker:'RDFN', exchange:'NASDAQ',
    industry:'Real Estate / Property / Brokerage / Home Search / Technology / iBuying', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:4500, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:3, layoff_confidence:0.85, hiring_velocity_score:-0.5, total_open_roles:300, enrichment_version:V },

  { canonical_name:'matterport inc', display_name:'Matterport Inc.', ticker:'MTTR', exchange:'NASDAQ',
    industry:'Real Estate / 3D / Virtual Tours / Imaging / Property / Digital / Spatial', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:700, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:0.1, total_open_roles:100, enrichment_version:V },

  { canonical_name:'costar group inc', display_name:'CoStar Group Inc.', ticker:'CSGP', exchange:'NASDAQ',
    industry:'Real Estate / Commercial / Property Data / Information / Analytics / Intelligence', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:5700, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:350, enrichment_version:V },

  { canonical_name:'corelogic inc', display_name:'CoreLogic Inc.', ticker:'CLGX', exchange:'NYSE',
    industry:'Real Estate / Property Data / Analytics / Insurance / Mortgage / Intelligence', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:8000, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.1, total_open_roles:400, enrichment_version:V },

  { canonical_name:'black knight inc', display_name:'Black Knight Inc.', ticker:null, exchange:null,
    industry:'Real Estate / Mortgage / Software / Data / Analytics / Home Solutions', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:4500, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:8500000000, pe_ratio:null, revenue_ttm_usd:1200000000,
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:300, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'proptech investment corporation', display_name:'Ready Capital (PropTech)', ticker:'RC', exchange:'NYSE',
    industry:'Real Estate / Mortgage / Finance / REIT / Lending / Digital Transformation', sector:'Financial Technology',
    is_public:true, country_code:'US', workforce_count:2500, workforce_source:'annual_report', workforce_confidence:0.85,
    market_cap_usd:6500000000, pe_ratio:8, revenue_ttm_usd:1800000000,
    financials_source:'annual_report', financials_confidence:0.82,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.1, total_open_roles:200, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'ziprealty', display_name:'ZipRealty (Realogy)', ticker:null, exchange:null,
    industry:'Real Estate / Brokerage / Property / Digital / Residential', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:2000, workforce_source:'news_rss_scrape', workforce_confidence:0.74,
    market_cap_usd:5000000000, pe_ratio:null, revenue_ttm_usd:800000000,
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:200, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'opendoor technologies', display_name:'Opendoor Technologies Inc.', ticker:'OPEN', exchange:'NASDAQ',
    industry:'Real Estate / iBuying / Home Sales / Technology / Marketplace / Digital', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:2500, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:-0.3, total_open_roles:200, enrichment_version:V },

  { canonical_name:'divvy homes', display_name:'Divvy Homes', ticker:null, exchange:null,
    industry:'Real Estate / Rent-to-Own / Housing / Finance / Technology / Alternative', sector:'Financial Technology',
    is_public:false, country_code:'US', workforce_count:500, workforce_source:'news_rss_scrape', workforce_confidence:0.72,
    market_cap_usd:3200000000, pe_ratio:null, revenue_ttm_usd:200000000,
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.5, total_open_roles:150, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'homee inc', display_name:'Homee', ticker:null, exchange:null,
    industry:'Real Estate / Home Services / Marketplace / Renovation / Contractors / Digital', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:200, workforce_source:'news_rss_scrape', workforce_confidence:0.70,
    market_cap_usd:500000000, pe_ratio:null, revenue_ttm_usd:40000000,
    financials_source:'news_rss_scrape', financials_confidence:0.50,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.4, total_open_roles:50, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'compass inc', display_name:'Compass Inc.', ticker:null, exchange:null,
    industry:'Real Estate / Brokerage / Technology / Agent Platform / Digital / CRM', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:3000, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:7200000000, pe_ratio:null, revenue_ttm_usd:1200000000,
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:0.1, total_open_roles:300, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'cushman wakefield', display_name:'Cushman & Wakefield', ticker:null, exchange:null,
    industry:'Real Estate / Commercial / Brokerage / Property Services / Global', sector:'Financial Services',
    is_public:false, country_code:'US', workforce_count:42000, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:12000000000, pe_ratio:null, revenue_ttm_usd:9000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.2, total_open_roles:800, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'keller williams worldwide', display_name:'Keller Williams', ticker:null, exchange:null,
    industry:'Real Estate / Brokerage / Residential / Technology / Real Estate Cloud', sector:'Financial Services',
    is_public:false, country_code:'US', workforce_count:19000, workforce_source:'news_rss_scrape', workforce_confidence:0.74,
    market_cap_usd:6000000000, pe_ratio:null, revenue_ttm_usd:2800000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.3, total_open_roles:600, data_quality_tier:'seed', enrichment_version:V },
];

runBatch('GT58: Real Estate & Property Technology (2026)', V, companies)
  .catch(e=>{ console.error(e); process.exit(1); });
