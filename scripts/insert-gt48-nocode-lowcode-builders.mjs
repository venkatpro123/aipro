// GT48: No-Code/Low-Code & Website Builders (2026)
import { runBatch } from './_gt-upsert-lib.mjs';
const V = 'gt48-v2026.1';

const companies = [
  { canonical_name:'zapier inc', display_name:'Zapier Inc.', ticker:null, exchange:null,
    industry:'Automation / No-Code / Integration / Workflow Automation / API Integration', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:1400, workforce_source:'news_rss_scrape', workforce_confidence:0.80,
    market_cap_usd:10000000000, pe_ratio:null, revenue_ttm_usd:1200000000,
    financials_source:'news_rss_scrape', financials_confidence:0.65,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.8, total_open_roles:150, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'make com', display_name:'Make (Integromat)', ticker:null, exchange:null,
    industry:'Automation / No-Code / Workflow / Integration / Scenario Builder', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:800, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:3000000000, pe_ratio:null, revenue_ttm_usd:500000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.6, total_open_roles:100, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'webflow inc', display_name:'Webflow Inc.', ticker:null, exchange:null,
    industry:'Website Builder / No-Code / Web Design / Visual Development / Hosting Platform', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:1200, workforce_source:'news_rss_scrape', workforce_confidence:0.80,
    market_cap_usd:6000000000, pe_ratio:null, revenue_ttm_usd:800000000,
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:0.3, total_open_roles:150, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'wix.com ltd', display_name:'Wix.com Ltd.', ticker:'WIX', exchange:'NASDAQ',
    industry:'Website Builder / Web Hosting / E-Commerce / Platform / SaaS', sector:'Technology',
    is_public:true, country_code:'IL', workforce_count:6500, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:2, layoff_confidence:0.82, hiring_velocity_score:-0.2, total_open_roles:250, enrichment_version:V },

  { canonical_name:'squarespace inc', display_name:'Squarespace Inc.', ticker:'SQSP', exchange:'NYSE',
    industry:'Website Builder / E-Commerce / Web Platform / Design Platform / Hosting', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:1500, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:2, layoff_confidence:0.82, hiring_velocity_score:-0.3, total_open_roles:100, enrichment_version:V },

  { canonical_name:'bubble io', display_name:'Bubble.io', ticker:null, exchange:null,
    industry:'Low-Code Platform / No-Code / App Builder / Visual Development / Backend', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:150, workforce_source:'news_rss_scrape', workforce_confidence:0.72,
    market_cap_usd:1500000000, pe_ratio:null, revenue_ttm_usd:100000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.5, total_open_roles:30, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'flutterflow io', display_name:'FlutterFlow', ticker:null, exchange:null,
    industry:'Low-Code / Mobile App Builder / UI Builder / Visual Development / Flutter IDE', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:250, workforce_source:'news_rss_scrape', workforce_confidence:0.72,
    market_cap_usd:1200000000, pe_ratio:null, revenue_ttm_usd:80000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.8, total_open_roles:50, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'adalo inc', display_name:'Adalo', ticker:null, exchange:null,
    industry:'Low-Code / App Builder / Mobile App / Visual Development / No-Code', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:100, workforce_source:'news_rss_scrape', workforce_confidence:0.70,
    market_cap_usd:500000000, pe_ratio:null, revenue_ttm_usd:30000000,
    financials_source:'news_rss_scrape', financials_confidence:0.50,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:15, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'retool io', display_name:'Retool', ticker:null, exchange:null,
    industry:'Low-Code / Internal Tools / Admin Panels / Business Apps / Development Platform', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:350, workforce_source:'news_rss_scrape', workforce_confidence:0.75,
    market_cap_usd:2700000000, pe_ratio:null, revenue_ttm_usd:200000000,
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.7, total_open_roles:80, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'appsmith io', display_name:'Appsmith', ticker:null, exchange:null,
    industry:'Open-Source Low-Code / Internal Tools / Admin Panels / Development Platform', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:200, workforce_source:'news_rss_scrape', workforce_confidence:0.72,
    market_cap_usd:200000000, pe_ratio:null, revenue_ttm_usd:20000000,
    financials_source:'news_rss_scrape', financials_confidence:0.50,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.8, total_open_roles:40, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'supabase io', display_name:'Supabase', ticker:null, exchange:null,
    industry:'Open-Source Backend / Database / API / Low-Code Backend / Firebase Alternative', sector:'Technology',
    is_public:false, country_code:'GB', workforce_count:100, workforce_source:'news_rss_scrape', workforce_confidence:0.70,
    market_cap_usd:1700000000, pe_ratio:null, revenue_ttm_usd:50000000,
    financials_source:'news_rss_scrape', financials_confidence:0.50,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.9, total_open_roles:30, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'directus io', display_name:'Directus', ticker:null, exchange:null,
    industry:'Headless CMS / Low-Code / API-First / Content Management / Open-Source', sector:'Technology',
    is_public:false, country_code:'NL', workforce_count:80, workforce_source:'news_rss_scrape', workforce_confidence:0.68,
    market_cap_usd:100000000, pe_ratio:null, revenue_ttm_usd:10000000,
    financials_source:'news_rss_scrape', financials_confidence:0.45,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.7, total_open_roles:15, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'strapi io', display_name:'Strapi', ticker:null, exchange:null,
    industry:'Headless CMS / API / Open-Source / Content Platform / Developer Tools', sector:'Technology',
    is_public:false, country_code:'FR', workforce_count:120, workforce_source:'news_rss_scrape', workforce_confidence:0.70,
    market_cap_usd:600000000, pe_ratio:null, revenue_ttm_usd:40000000,
    financials_source:'news_rss_scrape', financials_confidence:0.50,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.6, total_open_roles:25, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'contentful gmbh', display_name:'Contentful GmbH', ticker:null, exchange:null,
    industry:'Headless CMS / Content Platform / API / Developer CMS / SaaS', sector:'Technology',
    is_public:false, country_code:'DE', workforce_count:500, workforce_source:'news_rss_scrape', workforce_confidence:0.75,
    market_cap_usd:1500000000, pe_ratio:null, revenue_ttm_usd:200000000,
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:60, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'vercel inc', display_name:'Vercel Inc.', ticker:null, exchange:null,
    industry:'Frontend Platform / Vercel / Next.js / Deployment / Edge Functions / Hosting', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:600, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:3200000000, pe_ratio:null, revenue_ttm_usd:500000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.6, total_open_roles:120, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'netlify inc', display_name:'Netlify Inc.', ticker:null, exchange:null,
    industry:'Frontend Platform / Static Site / Deployment / Hosting / JAMstack / Edge Functions', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:500, workforce_source:'news_rss_scrape', workforce_confidence:0.75,
    market_cap_usd:2000000000, pe_ratio:null, revenue_ttm_usd:300000000,
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:-0.2, total_open_roles:80, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'railway sh', display_name:'Railway.sh', ticker:null, exchange:null,
    industry:'Application Platform / Deployment / Infrastructure / Cloud Platform / Developer Hosting', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:60, workforce_source:'news_rss_scrape', workforce_confidence:0.70,
    market_cap_usd:200000000, pe_ratio:null, revenue_ttm_usd:30000000,
    financials_source:'news_rss_scrape', financials_confidence:0.50,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.8, total_open_roles:15, data_quality_tier:'seed', enrichment_version:V },
];

runBatch('GT48: No-Code/Low-Code & Website Builders (2026)', V, companies)
  .catch(e=>{ console.error(e); process.exit(1); });
