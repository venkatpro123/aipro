// GT57: Vertical SaaS & Industry-Specific Software (2026)
import { runBatch } from './_gt-upsert-lib.mjs';
const V = 'gt57-v2026.1';

const companies = [
  { canonical_name:'toast inc', display_name:'Toast Inc.', ticker:'TOST', exchange:'NYSE',
    industry:'SaaS / Restaurant / POS / Hospitality / Cloud Software / Payments', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:2300, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.4, total_open_roles:300, enrichment_version:V },

  { canonical_name:'veeva systems inc', display_name:'Veeva Systems Inc.', ticker:'VEEV', exchange:'NYSE',
    industry:'SaaS / Pharma / Life Sciences / Clinical / Content / Vault Platform', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:6000, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.5, total_open_roles:500, enrichment_version:V },

  { canonical_name:'guidewire software inc', display_name:'Guidewire Software Inc.', ticker:'GWRE', exchange:'NYSE',
    industry:'SaaS / Insurance / Claims / Billing / Cloud / Digital Transformation', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:2600, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.4, total_open_roles:250, enrichment_version:V },

  { canonical_name:'ncino inc', display_name:'nCino Inc.', ticker:'NCNO', exchange:'NASDAQ',
    industry:'SaaS / Banking / Financial Services / Digital Lending / Cloud / Enterprise', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:2000, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.3, total_open_roles:200, enrichment_version:V },

  { canonical_name:'upland software inc', display_name:'Upland Software Inc.', ticker:'UPLD', exchange:'NASDAQ',
    industry:'SaaS / Enterprise / Work Management / Marketing / IT Operations / Cloud', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:1500, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:150, enrichment_version:V },

  { canonical_name:'everstream analytics', display_name:'Everstream Analytics', ticker:null, exchange:null,
    industry:'SaaS / Risk / Supply Chain / ESG / Governance / Enterprise', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:600, workforce_source:'news_rss_scrape', workforce_confidence:0.74,
    market_cap_usd:2500000000, pe_ratio:null, revenue_ttm_usd:180000000,
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.4, total_open_roles:120, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'reonomy', display_name:'Reonomy', ticker:null, exchange:null,
    industry:'SaaS / Real Estate / Commercial / Data / Analytics / Intelligence', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:300, workforce_source:'news_rss_scrape', workforce_confidence:0.72,
    market_cap_usd:800000000, pe_ratio:null, revenue_ttm_usd:60000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.3, total_open_roles:50, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'coreweave inc', display_name:'CoreWeave Inc.', ticker:null, exchange:null,
    industry:'SaaS / Cloud / GPU / AI Infrastructure / Data Centers / Compute', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:500, workforce_source:'news_rss_scrape', workforce_confidence:0.74,
    market_cap_usd:8000000000, pe_ratio:null, revenue_ttm_usd:400000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.8, total_open_roles:200, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'housr inc', display_name:'Housr', ticker:null, exchange:null,
    industry:'SaaS / Real Estate / Property Management / Residential / Multifamily', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:200, workforce_source:'news_rss_scrape', workforce_confidence:0.70,
    market_cap_usd:400000000, pe_ratio:null, revenue_ttm_usd:25000000,
    financials_source:'news_rss_scrape', financials_confidence:0.50,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.5, total_open_roles:40, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'jobot inc', display_name:'Jobot', ticker:null, exchange:null,
    industry:'SaaS / Recruitment / Staffing / AI Hiring / Job Matching / Platform', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:150, workforce_source:'news_rss_scrape', workforce_confidence:0.70,
    market_cap_usd:300000000, pe_ratio:null, revenue_ttm_usd:20000000,
    financials_source:'news_rss_scrape', financials_confidence:0.50,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.6, total_open_roles:30, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'plaid inc', display_name:'Plaid Inc.', ticker:null, exchange:null,
    industry:'SaaS / FinTech / Banking / API / Financial Data / Payments / Infrastructure', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:1800, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:13500000000, pe_ratio:null, revenue_ttm_usd:800000000,
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.4, total_open_roles:300, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'stripe inc', display_name:'Stripe Inc.', ticker:null, exchange:null,
    industry:'SaaS / Payments / FinTech / E-Commerce / Infrastructure / API', sector:'Technology',
    is_public:false, country_code:'IE', workforce_count:9000, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:95000000000, pe_ratio:null, revenue_ttm_usd:14000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.65,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.5, total_open_roles:800, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'square inc', display_name:'Square Inc.', ticker:'SQ', exchange:'NYSE',
    industry:'SaaS / Payments / POS / Cash App / E-Commerce / Seller Platform', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:13000, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:-0.2, total_open_roles:600, enrichment_version:V },

  { canonical_name:'fastly inc', display_name:'Fastly Inc.', ticker:'FSLY', exchange:'NYSE',
    industry:'SaaS / CDN / Edge Computing / Performance / Security / Cloud', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:1300, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:0.1, total_open_roles:150, enrichment_version:V },
];

runBatch('GT57: Vertical SaaS & Industry-Specific Software (2026)', V, companies)
  .catch(e=>{ console.error(e); process.exit(1); });
