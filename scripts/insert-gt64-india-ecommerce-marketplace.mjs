// GT64: Indian E-Commerce & Marketplace Tech (2026)
import { runBatch } from './_gt-upsert-lib.mjs';
const V = 'gt64-v2026.1';

const companies = [
  { canonical_name:'flipkart internet pvt ltd', display_name:'Flipkart', ticker:null, exchange:null,
    industry:'E-Commerce / Marketplace / Retail / Mobile Commerce / India', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:28000, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:38000000000, pe_ratio:null, revenue_ttm_usd:13000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.64,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:0.0, total_open_roles:1000, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'myntra designs pvt ltd', display_name:'Myntra', ticker:null, exchange:null,
    industry:'E-Commerce / Fashion / Apparel / Flipkart / India', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:3500, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:3000000000, pe_ratio:null, revenue_ttm_usd:1000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:250, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'1mg technologies', display_name:'1mg (Healthcare E-Commerce)', ticker:null, exchange:null,
    industry:'E-Commerce / Healthcare / Pharmacy / Medicine / India', sector:'HealthTech',
    is_public:false, country_code:'IN', workforce_count:2800, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:6000000000, pe_ratio:null, revenue_ttm_usd:400000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.3, total_open_roles:300, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'nykaa', display_name:'Nykaa', ticker:null, exchange:'NSE',
    industry:'E-Commerce / Beauty / Fashion / FSN / India / Marketplace', sector:'Technology',
    is_public:true, country_code:'IN', workforce_count:2500, workforce_source:'annual_report', workforce_confidence:0.88,
    market_cap_usd:2500000000, pe_ratio:null, revenue_ttm_usd:500000000,
    financials_source:'annual_report', financials_confidence:0.78,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:250, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'snapdeal marketplace', display_name:'Snapdeal', ticker:null, exchange:null,
    industry:'E-Commerce / Marketplace / Mobile Commerce / India', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:1800, workforce_source:'news_rss_scrape', workforce_confidence:0.74,
    market_cap_usd:600000000, pe_ratio:null, revenue_ttm_usd:200000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:-0.2, total_open_roles:150, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'meesho inc', display_name:'Meesho', ticker:null, exchange:null,
    industry:'E-Commerce / Resale / Social Commerce / Marketplace / India', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:1500, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:4500000000, pe_ratio:null, revenue_ttm_usd:300000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.5, total_open_roles:250, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'byjus think learning', display_name:'BYJU\'S', ticker:null, exchange:null,
    industry:'E-Commerce / EdTech / Learning / India / Online Education', sector:'EducationTech',
    is_public:false, country_code:'IN', workforce_count:15000, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:22000000000, pe_ratio:null, revenue_ttm_usd:2000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:3, layoff_confidence:0.85, hiring_velocity_score:-0.5, total_open_roles:500, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'unacademy inc', display_name:'Unacademy', ticker:null, exchange:null,
    industry:'E-Commerce / EdTech / Learning / Online Education / India', sector:'EducationTech',
    is_public:false, country_code:'IN', workforce_count:3500, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:5200000000, pe_ratio:null, revenue_ttm_usd:400000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:0.0, total_open_roles:300, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'ashoka university', display_name:'Ashoka University', ticker:null, exchange:null,
    industry:'E-Commerce / EdTech / Higher Education / Learning / India', sector:'EducationTech',
    is_public:false, country_code:'IN', workforce_count:500, workforce_source:'news_rss_scrape', workforce_confidence:0.72,
    market_cap_usd:800000000, pe_ratio:null, revenue_ttm_usd:80000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.3, total_open_roles:80, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'bigbasket', display_name:'BigBasket (Grocery)', ticker:null, exchange:null,
    industry:'E-Commerce / Grocery / Food / Online / India', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:4000, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:2000000000, pe_ratio:null, revenue_ttm_usd:800000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:300, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'urbancompany', display_name:'UrbanCompany', ticker:null, exchange:null,
    industry:'E-Commerce / Services / Home Services / Marketplace / India', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:5000, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:5000000000, pe_ratio:null, revenue_ttm_usd:600000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:0.3, total_open_roles:400, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'blinkit', display_name:'Blinkit (Quick Commerce)', ticker:null, exchange:null,
    industry:'E-Commerce / Quick Commerce / Hyperlocal / Zomato / India', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:2500, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:5600000000, pe_ratio:null, revenue_ttm_usd:500000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.6, total_open_roles:500, data_quality_tier:'seed', enrichment_version:V },
];

runBatch('GT64: Indian E-Commerce & Marketplace Tech (2026)', V, companies)
  .catch(e=>{ console.error(e); process.exit(1); });
