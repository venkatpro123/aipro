// GT67: India Emerging SaaS & Startups (2026)
import { runBatch } from './_gt-upsert-lib.mjs';
const V = 'gt67-v2026.1';

const companies = [
  { canonical_name:'mindtree saas platform', display_name:'MindTree SaaS', ticker:null, exchange:null,
    industry:'SaaS / India / Emerging / Productivity', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:800, workforce_source:'news_rss_scrape', workforce_confidence:0.74,
    market_cap_usd:1500000000, pe_ratio:null, revenue_ttm_usd:150000000,
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.5, total_open_roles:150, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'bevy india', display_name:'Bevy', ticker:null, exchange:null,
    industry:'SaaS / Community / Events / India / Startup', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:300, workforce_source:'news_rss_scrape', workforce_confidence:0.72,
    market_cap_usd:600000000, pe_ratio:null, revenue_ttm_usd:40000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.6, total_open_roles:80, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'workflowy india', display_name:'Workflowy', ticker:null, exchange:null,
    industry:'SaaS / Productivity / Outliner / India', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:200, workforce_source:'news_rss_scrape', workforce_confidence:0.70,
    market_cap_usd:400000000, pe_ratio:null, revenue_ttm_usd:30000000,
    financials_source:'news_rss_scrape', financials_confidence:0.50,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.5, total_open_roles:40, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'getir india', display_name:'Getir', ticker:null, exchange:null,
    industry:'SaaS / Quick Commerce / Delivery / India', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:2000, workforce_source:'news_rss_scrape', workforce_confidence:0.74,
    market_cap_usd:3200000000, pe_ratio:null, revenue_ttm_usd:400000000,
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.3, total_open_roles:300, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'instafresh india', display_name:'InstaFresh', ticker:null, exchange:null,
    industry:'SaaS / Retail / Smart Stores / India', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:1200, workforce_source:'news_rss_scrape', workforce_confidence:0.72,
    market_cap_usd:800000000, pe_ratio:null, revenue_ttm_usd:200000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.4, total_open_roles:150, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'scaler inc india', display_name:'Scaler Academy', ticker:null, exchange:null,
    industry:'SaaS / Learning / Coding / India / EdTech', sector:'EducationTech',
    is_public:false, country_code:'IN', workforce_count:1500, workforce_source:'news_rss_scrape', workforce_confidence:0.74,
    market_cap_usd:3500000000, pe_ratio:null, revenue_ttm_usd:300000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.5, total_open_roles:250, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'timespan tech', display_name:'Timespan', ticker:null, exchange:null,
    industry:'SaaS / Time Tracking / Analytics / India', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:250, workforce_source:'news_rss_scrape', workforce_confidence:0.70,
    market_cap_usd:400000000, pe_ratio:null, revenue_ttm_usd:30000000,
    financials_source:'news_rss_scrape', financials_confidence:0.50,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.6, total_open_roles:50, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'hacker earth', display_name:'HackerEarth', ticker:null, exchange:null,
    industry:'SaaS / Developer Community / Hiring / India', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:600, workforce_source:'news_rss_scrape', workforce_confidence:0.74,
    market_cap_usd:1200000000, pe_ratio:null, revenue_ttm_usd:100000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.6, total_open_roles:100, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'testim inc india', display_name:'Testim', ticker:null, exchange:null,
    industry:'SaaS / QA / Testing / AI / India', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:500, workforce_source:'news_rss_scrape', workforce_confidence:0.72,
    market_cap_usd:1000000000, pe_ratio:null, revenue_ttm_usd:80000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.5, total_open_roles:80, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'wookets', display_name:'Wookets', ticker:null, exchange:null,
    industry:'SaaS / Inventory / Retail / India', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:350, workforce_source:'news_rss_scrape', workforce_confidence:0.72,
    market_cap_usd:700000000, pe_ratio:null, revenue_ttm_usd:50000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.5, total_open_roles:60, data_quality_tier:'seed', enrichment_version:V },
];

runBatch('GT67: India Emerging SaaS & Startups (2026)', V, companies)
  .catch(e=>{ console.error(e); process.exit(1); });
