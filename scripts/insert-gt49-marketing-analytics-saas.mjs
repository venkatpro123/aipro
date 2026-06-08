// GT49: Marketing & Analytics SaaS (2026)
import { runBatch } from './_gt-upsert-lib.mjs';
const V = 'gt49-v2026.1';

const companies = [
  { canonical_name:'hubspot inc', display_name:'HubSpot Inc.', ticker:'HUBS', exchange:'NYSE',
    industry:'CRM / Marketing Automation / Sales Platform / Customer Management / SaaS', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:7500, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:2, layoff_confidence:0.82, hiring_velocity_score:0.1, total_open_roles:300, enrichment_version:V },

  { canonical_name:'salesforce inc', display_name:'Salesforce Inc.', ticker:'CRM', exchange:'NYSE',
    industry:'CRM / Cloud Computing / Enterprise Software / Customer Engagement / Sales Cloud', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:80000, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:2, layoff_confidence:0.82, hiring_velocity_score:-0.2, total_open_roles:2000, enrichment_version:V },

  { canonical_name:'adobe inc', display_name:'Adobe Inc.', ticker:'ADBE', exchange:'NASDAQ',
    industry:'Marketing Cloud / Digital Experience / Analytics / Creative / Experience Platform', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:24000, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:2, layoff_confidence:0.82, hiring_velocity_score:0.2, total_open_roles:600, enrichment_version:V },

  { canonical_name:'mixpanel inc', display_name:'Mixpanel Inc.', ticker:null, exchange:null,
    industry:'Analytics / Product Analytics / Event Analytics / Data Platform / B2B SaaS', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:900, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:2800000000, pe_ratio:null, revenue_ttm_usd:300000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.3, total_open_roles:120, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'amplitude inc', display_name:'Amplitude Inc.', ticker:'AMPL', exchange:'NASDAQ',
    industry:'Analytics / Product Analytics / Customer Data Platform / Event Analytics / SaaS', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:1500, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:150, enrichment_version:V },

  { canonical_name:'klaviyo inc', display_name:'Klaviyo Inc.', ticker:'KVYO', exchange:'NYSE',
    industry:'Marketing Automation / Email Marketing / SMS / E-Commerce Marketing / CDP', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:2200, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:0, layoff_confidence:0.70, hiring_velocity_score:0.5, total_open_roles:250, enrichment_version:V },

  { canonical_name:'marketo adobe', display_name:'Marketo (Adobe)', ticker:null, exchange:null,
    industry:'Marketing Automation / Lead Management / Engagement Platform / Adobe Marketing Cloud', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:1200, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:4800000000, pe_ratio:null, revenue_ttm_usd:400000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.0, total_open_roles:150, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'segment inc', display_name:'Segment (Twilio)', ticker:null, exchange:null,
    industry:'Customer Data Platform / Analytics / Integration / Data Warehouse / Twilio', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:600, workforce_source:'news_rss_scrape', workforce_confidence:0.74,
    market_cap_usd:3200000000, pe_ratio:null, revenue_ttm_usd:200000000,
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:-0.3, total_open_roles:80, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'google analytics 4', display_name:'Google Analytics (Alphabet)', ticker:null, exchange:null,
    industry:'Web Analytics / Product Analytics / Data Analytics / Google Cloud / Enterprise', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:10000, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:null, pe_ratio:null, revenue_ttm_usd:5000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:300, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'matomo inc', display_name:'Matomo (Contentsquare)', ticker:null, exchange:null,
    industry:'Web Analytics / Privacy-First Analytics / Open-Source / Data Platform / CDP', sector:'Technology',
    is_public:false, country_code:'DE', workforce_count:500, workforce_source:'news_rss_scrape', workforce_confidence:0.72,
    market_cap_usd:1200000000, pe_ratio:null, revenue_ttm_usd:80000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.4, total_open_roles:60, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'heap inc', display_name:'Heap Inc.', ticker:null, exchange:null,
    industry:'Product Analytics / Session Replay / Data Platform / User Behavior Analytics', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:600, workforce_source:'news_rss_scrape', workforce_confidence:0.74,
    market_cap_usd:2000000000, pe_ratio:null, revenue_ttm_usd:150000000,
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:80, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'hotjar ltd', display_name:'Hotjar Ltd.', ticker:null, exchange:null,
    industry:'Heatmaps / Session Replay / UX Analytics / Product Analytics / Malta Startup', sector:'Technology',
    is_public:false, country_code:'MT', workforce_count:800, workforce_source:'news_rss_scrape', workforce_confidence:0.75,
    market_cap_usd:5000000000, pe_ratio:null, revenue_ttm_usd:300000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.5, total_open_roles:150, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'looker studio google', display_name:'Google Looker Studio (BI)', ticker:null, exchange:null,
    industry:'Business Intelligence / Data Visualization / Analytics / Google Cloud / Free BI Tool', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:2000, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:null, pe_ratio:null, revenue_ttm_usd:1500000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.3, total_open_roles:200, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'microsoft power bi', display_name:'Microsoft Power BI', ticker:null, exchange:null,
    industry:'Business Intelligence / Data Visualization / Analytics / Microsoft / Enterprise BI', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:3000, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:null, pe_ratio:null, revenue_ttm_usd:3000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:0.2, total_open_roles:300, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'tableau software', display_name:'Tableau (Salesforce)', ticker:null, exchange:null,
    industry:'Business Intelligence / Data Visualization / Analytics / Salesforce / Enterprise BI', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:2500, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:20000000000, pe_ratio:null, revenue_ttm_usd:3000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.2, total_open_roles:250, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'palantir inc', display_name:'Palantir Technologies Inc.', ticker:'PLTR', exchange:'NYSE',
    industry:'Big Data / Analytics / Data Intelligence / Government / Enterprise Data Platform', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:3300, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.8, total_open_roles:400, enrichment_version:V },

  { canonical_name:'databricks', display_name:'Databricks', ticker:null, exchange:null,
    industry:'Data Engineering / Data Lakehouse / Apache Spark / Analytics Platform / AI Data', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:2500, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:43000000000, pe_ratio:null, revenue_ttm_usd:600000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:1.0, total_open_roles:400, data_quality_tier:'seed', enrichment_version:V },
];

runBatch('GT49: Marketing & Analytics SaaS (2026)', V, companies)
  .catch(e=>{ console.error(e); process.exit(1); });
