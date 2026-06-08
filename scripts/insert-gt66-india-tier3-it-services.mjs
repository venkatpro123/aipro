// GT66: India Tier-3 IT Services & Mid-Market (2026)
import { runBatch } from './_gt-upsert-lib.mjs';
const V = 'gt66-v2026.1';

const companies = [
  { canonical_name:'sonata software limited', display_name:'Sonata Software Limited', ticker:null, exchange:'NSE',
    industry:'IT Services / Product Engineering / Digital / Cloud / India Mid-Tier', sector:'Technology',
    is_public:true, country_code:'IN', workforce_count:5500, workforce_source:'annual_report', workforce_confidence:0.85,
    market_cap_usd:2000000000, pe_ratio:35, revenue_ttm_usd:600000000,
    financials_source:'annual_report', financials_confidence:0.80,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.5, total_open_roles:300, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'mphasis limited', display_name:'Mphasis Limited', ticker:null, exchange:'NSE',
    industry:'IT Services / BPO / Digital / Cloud / India IT / Blackstone', sector:'Technology',
    is_public:true, country_code:'IN', workforce_count:32000, workforce_source:'annual_report', workforce_confidence:0.88,
    market_cap_usd:4200000000, pe_ratio:20, revenue_ttm_usd:2000000000,
    financials_source:'annual_report', financials_confidence:0.82,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.3, total_open_roles:800, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'gtl infrastructure limited', display_name:'GTL Ltd', ticker:null, exchange:'NSE',
    industry:'IT Services / Telecom Infrastructure / Data Centers / India', sector:'Technology',
    is_public:true, country_code:'IN', workforce_count:4000, workforce_source:'annual_report', workforce_confidence:0.80,
    market_cap_usd:1500000000, pe_ratio:20, revenue_ttm_usd:800000000,
    financials_source:'annual_report', financials_confidence:0.75,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.1, total_open_roles:200, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'quest global engineering', display_name:'Quest Global Engineering', ticker:null, exchange:null,
    industry:'IT Services / Engineering / Product Engineering / R&D / India', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:16000, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:2000000000, pe_ratio:null, revenue_ttm_usd:800000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.3, total_open_roles:500, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'globallogic inc india', display_name:'Globallogic (India)', ticker:null, exchange:null,
    industry:'IT Services / Product Engineering / Digital / Broadcom / India', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:20000, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:4500000000, pe_ratio:null, revenue_ttm_usd:1500000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:0.0, total_open_roles:400, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'ats health', display_name:'ATS Health', ticker:null, exchange:null,
    industry:'IT Services / Healthcare / BPO / India Services', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:8000, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:1200000000, pe_ratio:null, revenue_ttm_usd:500000000,
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.3, total_open_roles:400, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'alight solutions', display_name:'Alight Solutions', ticker:null, exchange:null,
    industry:'IT Services / HCM / BPO / HR Tech / India', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:22000, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:3500000000, pe_ratio:null, revenue_ttm_usd:1800000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.1, total_open_roles:600, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'nucleus software exports', display_name:'Nucleus Software Exports', ticker:null, exchange:'NSE',
    industry:'IT Services / Banking / Financial / Software / India', sector:'Technology',
    is_public:true, country_code:'IN', workforce_count:2300, workforce_source:'annual_report', workforce_confidence:0.85,
    market_cap_usd:1800000000, pe_ratio:28, revenue_ttm_usd:500000000,
    financials_source:'annual_report', financials_confidence:0.78,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.4, total_open_roles:200, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'versionm', display_name:'VersionM', ticker:null, exchange:null,
    industry:'IT Services / DevOps / Engineering / India Startup', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:200, workforce_source:'news_rss_scrape', workforce_confidence:0.72,
    market_cap_usd:300000000, pe_ratio:null, revenue_ttm_usd:20000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.7, total_open_roles:50, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'apptech solutions', display_name:'Apptech Solutions', ticker:null, exchange:null,
    industry:'IT Services / Staffing / Consulting / India', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:1500, workforce_source:'news_rss_scrape', workforce_confidence:0.74,
    market_cap_usd:400000000, pe_ratio:null, revenue_ttm_usd:150000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.3, total_open_roles:200, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'thoughtworks india', display_name:'ThoughtWorks India', ticker:null, exchange:null,
    industry:'IT Services / Software Development / Agile / Consulting / India', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:8000, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:2500000000, pe_ratio:null, revenue_ttm_usd:800000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.5, total_open_roles:400, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'encora india', display_name:'Encora (India)', ticker:null, exchange:null,
    industry:'IT Services / Product Engineering / Digital / Software / India', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:3500, workforce_source:'news_rss_scrape', workforce_confidence:0.74,
    market_cap_usd:1200000000, pe_ratio:null, revenue_ttm_usd:400000000,
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.4, total_open_roles:250, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'einfochips', display_name:'eInfochips', ticker:null, exchange:null,
    industry:'IT Services / Semiconductor / Embedded / Hardware / India', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:2200, workforce_source:'news_rss_scrape', workforce_confidence:0.74,
    market_cap_usd:800000000, pe_ratio:null, revenue_ttm_usd:300000000,
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.5, total_open_roles:200, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'sigmamarine', display_name:'SigmaMarine', ticker:null, exchange:null,
    industry:'IT Services / Marine / Shipping / Technology / India', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:400, workforce_source:'news_rss_scrape', workforce_confidence:0.70,
    market_cap_usd:200000000, pe_ratio:null, revenue_ttm_usd:30000000,
    financials_source:'news_rss_scrape', financials_confidence:0.50,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.4, total_open_roles:50, data_quality_tier:'seed', enrichment_version:V },
];

runBatch('GT66: India Tier-3 IT Services & Mid-Market (2026)', V, companies)
  .catch(e=>{ console.error(e); process.exit(1); });
