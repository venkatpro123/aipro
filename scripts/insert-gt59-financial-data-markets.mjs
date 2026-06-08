// GT59: Financial Data & Advanced Markets (2026)
import { runBatch } from './_gt-upsert-lib.mjs';
const V = 'gt59-v2026.1';

const companies = [
  { canonical_name:'factset research systems inc', display_name:'FactSet Research Systems Inc.', ticker:'FDS', exchange:'NYSE',
    industry:'Financial Data / Research / Analytics / Wealth / Alternative Data / Platform', sector:'Financial Services',
    is_public:true, country_code:'US', workforce_count:12000, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.4, total_open_roles:600, enrichment_version:V },

  { canonical_name:'morningstar inc', display_name:'Morningstar Inc.', ticker:'MORN', exchange:'NASDAQ',
    industry:'Financial Data / Investment / Research / Ratings / Analytics / Wealth', sector:'Financial Services',
    is_public:true, country_code:'US', workforce_count:7500, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:300, enrichment_version:V },

  { canonical_name:'s&p global inc', display_name:'S&P Global Inc.', ticker:'SPGI', exchange:'NYSE',
    industry:'Financial Data / Ratings / Analytics / Indices / Platts / Piper Sandler', sector:'Financial Services',
    is_public:true, country_code:'US', workforce_count:34000, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.3, total_open_roles:1000, enrichment_version:V },

  { canonical_name:'icis / lseg / refinitiv', display_name:'Refinitiv (LSEG)', ticker:null, exchange:null,
    industry:'Financial Data / Pricing / Analytics / Markets / Trading / Data / Workspace', sector:'Financial Services',
    is_public:false, country_code:'GB', workforce_count:10000, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:80000000000, pe_ratio:null, revenue_ttm_usd:12000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.65,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:0.1, total_open_roles:500, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'bloomberg lp', display_name:'Bloomberg LP', ticker:null, exchange:null,
    industry:'Financial Data / News / Terminals / Bloomberg Markets / Enterprise Data', sector:'Financial Services',
    is_public:false, country_code:'US', workforce_count:20000, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:70000000000, pe_ratio:null, revenue_ttm_usd:18000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.68,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:1000, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'marketwatch / dow jones', display_name:'MarketWatch (Dow Jones)', ticker:null, exchange:null,
    industry:'Financial Data / News / Markets / Investment / Publishing / Dow Jones', sector:'Financial Services',
    is_public:false, country_code:'US', workforce_count:2000, workforce_source:'news_rss_scrape', workforce_confidence:0.74,
    market_cap_usd:10000000000, pe_ratio:null, revenue_ttm_usd:3000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.1, total_open_roles:200, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'creditsights inc', display_name:'CreditSights (LSEG)', ticker:null, exchange:null,
    industry:'Financial Data / Credit / Research / Fixed Income / Analytics / Markets', sector:'Financial Services',
    is_public:false, country_code:'US', workforce_count:800, workforce_source:'news_rss_scrape', workforce_confidence:0.74,
    market_cap_usd:2000000000, pe_ratio:null, revenue_ttm_usd:300000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.3, total_open_roles:100, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'clarity ai inc', display_name:'Clarity AI', ticker:null, exchange:null,
    industry:'Financial Data / ESG / Sustainability / Impact / Ratings / Alternative Data', sector:'Financial Services',
    is_public:false, country_code:'ES', workforce_count:400, workforce_source:'news_rss_scrape', workforce_confidence:0.72,
    market_cap_usd:1500000000, pe_ratio:null, revenue_ttm_usd:80000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.5, total_open_roles:80, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'seven bridges genomics', display_name:'Seven Bridges', ticker:null, exchange:null,
    industry:'Financial Data / Genomics / Life Sciences / Biotech / AI / Data Platform', sector:'Healthcare Tech',
    is_public:false, country_code:'US', workforce_count:350, workforce_source:'news_rss_scrape', workforce_confidence:0.72,
    market_cap_usd:800000000, pe_ratio:null, revenue_ttm_usd:50000000,
    financials_source:'news_rss_scrape', financials_confidence:0.50,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.4, total_open_roles:60, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'xignite inc', display_name:'Xignite', ticker:null, exchange:null,
    industry:'Financial Data / Market Data / APIs / Cloud / Real-Time / Alternative Data', sector:'Financial Services',
    is_public:false, country_code:'US', workforce_count:250, workforce_source:'news_rss_scrape', workforce_confidence:0.70,
    market_cap_usd:500000000, pe_ratio:null, revenue_ttm_usd:40000000,
    financials_source:'news_rss_scrape', financials_confidence:0.50,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.5, total_open_roles:50, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'yext inc', display_name:'Yext Inc.', ticker:'YEXT', exchange:'NYSE',
    industry:'Financial Data / Digital Presence / Knowledge Platform / Listings / Enterprise', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:1500, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:-0.2, total_open_roles:150, enrichment_version:V },

  { canonical_name:'kythera biopharmaceuticals', display_name:'Kythera (Biotech Data)', ticker:null, exchange:null,
    industry:'Financial Data / Biotech / Life Sciences / Clinical / Drug Discovery / AI', sector:'Healthcare Tech',
    is_public:false, country_code:'US', workforce_count:300, workforce_source:'news_rss_scrape', workforce_confidence:0.72,
    market_cap_usd:1200000000, pe_ratio:null, revenue_ttm_usd:60000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.4, total_open_roles:60, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'intrinio inc', display_name:'Intrinio', ticker:null, exchange:null,
    industry:'Financial Data / Alternative Data / Pricing / Cloud / APIs / Investors', sector:'Financial Services',
    is_public:false, country_code:'US', workforce_count:150, workforce_source:'news_rss_scrape', workforce_confidence:0.70,
    market_cap_usd:350000000, pe_ratio:null, revenue_ttm_usd:25000000,
    financials_source:'news_rss_scrape', financials_confidence:0.50,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.6, total_open_roles:40, data_quality_tier:'seed', enrichment_version:V },
];

runBatch('GT59: Financial Data & Advanced Markets (2026)', V, companies)
  .catch(e=>{ console.error(e); process.exit(1); });
