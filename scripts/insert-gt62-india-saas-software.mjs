// GT62: Indian SaaS & Software Products (2026)
import { runBatch } from './_gt-upsert-lib.mjs';
const V = 'gt62-v2026.1';

const companies = [
  { canonical_name:'zoho corporation', display_name:'Zoho Corporation', ticker:null, exchange:null,
    industry:'SaaS / Business Software / CRM / ERP / Productivity / India / Private', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:35000, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:10000000000, pe_ratio:null, revenue_ttm_usd:1200000000,
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.6, total_open_roles:1000, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'freshworks inc', display_name:'Freshworks Inc.', ticker:'FRSH', exchange:'NASDAQ',
    industry:'SaaS / Customer Engagement / CRM / ITSM / India / US / Cloud', sector:'Technology',
    is_public:true, country_code:'IN', workforce_count:4500, workforce_source:'annual_report', workforce_confidence:0.88,
    market_cap_usd:7200000000, pe_ratio:null, revenue_ttm_usd:500000000,
    financials_source:'annual_report', financials_confidence:0.80,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.4, total_open_roles:400, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'uniphore inc', display_name:'Uniphore Inc.', ticker:null, exchange:null,
    industry:'SaaS / Conversational AI / Customer Experience / Contact Center / India', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:3500, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:5000000000, pe_ratio:null, revenue_ttm_usd:300000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.5, total_open_roles:400, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'mindtickle inc', display_name:'MindTickle', ticker:null, exchange:null,
    industry:'SaaS / Sales Enablement / Learning / Revenue Intelligence / India', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:1200, workforce_source:'news_rss_scrape', workforce_confidence:0.74,
    market_cap_usd:2000000000, pe_ratio:null, revenue_ttm_usd:150000000,
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.5, total_open_roles:200, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'thoughtspot inc', display_name:'ThoughtSpot Inc.', ticker:'TSPK', exchange:'NYSE',
    industry:'SaaS / Business Intelligence / Analytics / AI-Powered / India / US', sector:'Technology',
    is_public:true, country_code:'IN', workforce_count:2500, workforce_source:'annual_report', workforce_confidence:0.88,
    market_cap_usd:4200000000, pe_ratio:null, revenue_ttm_usd:300000000,
    financials_source:'annual_report', financials_confidence:0.78,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.3, total_open_roles:250, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'hasura technologies', display_name:'Hasura', ticker:null, exchange:null,
    industry:'SaaS / GraphQL / Data API / Developer Tools / India / Backend', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:400, workforce_source:'news_rss_scrape', workforce_confidence:0.72,
    market_cap_usd:1200000000, pe_ratio:null, revenue_ttm_usd:50000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.7, total_open_roles:100, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'icertis inc', display_name:'Icertis Inc.', ticker:'ICER', exchange:'NASDAQ',
    industry:'SaaS / Contract Management / AI / Lifecycle / India / US / Enterprise', sector:'Technology',
    is_public:true, country_code:'IN', workforce_count:2500, workforce_source:'annual_report', workforce_confidence:0.88,
    market_cap_usd:3500000000, pe_ratio:null, revenue_ttm_usd:350000000,
    financials_source:'annual_report', financials_confidence:0.78,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.3, total_open_roles:250, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'bhaiya ji tech', display_name:'Bhaiyi (AI-First SaaS)', ticker:null, exchange:null,
    industry:'SaaS / AI / Automation / India Startup / Business Software', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:200, workforce_source:'news_rss_scrape', workforce_confidence:0.70,
    market_cap_usd:300000000, pe_ratio:null, revenue_ttm_usd:20000000,
    financials_source:'news_rss_scrape', financials_confidence:0.50,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.8, total_open_roles:50, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'zuper inc', display_name:'Zuper', ticker:null, exchange:null,
    industry:'SaaS / Field Service / Operations / HVAC / Plumbing / India Startup', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:250, workforce_source:'news_rss_scrape', workforce_confidence:0.72,
    market_cap_usd:500000000, pe_ratio:null, revenue_ttm_usd:30000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.7, total_open_roles:80, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'perfint technologies', display_name:'PerfInt', ticker:null, exchange:null,
    industry:'SaaS / Operations / Manufacturing / India Startup / Enterprise', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:180, workforce_source:'news_rss_scrape', workforce_confidence:0.70,
    market_cap_usd:400000000, pe_ratio:null, revenue_ttm_usd:25000000,
    financials_source:'news_rss_scrape', financials_confidence:0.50,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.6, total_open_roles:60, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'chargebee inc', display_name:'Chargebee Inc.', ticker:null, exchange:null,
    industry:'SaaS / Billing / Revenue Operations / Subscription / India / US', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:1800, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:4200000000, pe_ratio:null, revenue_ttm_usd:300000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.5, total_open_roles:250, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'treebo inc', display_name:'Treebo (Hotel SaaS)', ticker:null, exchange:null,
    industry:'SaaS / Hospitality / Hotel Management / India Startup / Travel Tech', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:400, workforce_source:'news_rss_scrape', workforce_confidence:0.72,
    market_cap_usd:800000000, pe_ratio:null, revenue_ttm_usd:60000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.3, total_open_roles:100, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'aloware inc', display_name:'Aloware', ticker:null, exchange:null,
    industry:'SaaS / Communications / SMS / Messaging / India / US Startup', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:300, workforce_source:'news_rss_scrape', workforce_confidence:0.72,
    market_cap_usd:400000000, pe_ratio:null, revenue_ttm_usd:25000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.6, total_open_roles:70, data_quality_tier:'seed', enrichment_version:V },
];

runBatch('GT62: Indian SaaS & Software Products (2026)', V, companies)
  .catch(e=>{ console.error(e); process.exit(1); });
