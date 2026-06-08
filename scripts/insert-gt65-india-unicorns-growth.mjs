// GT65: Indian Unicorns & Growth-Stage Tech (2026)
import { runBatch } from './_gt-upsert-lib.mjs';
const V = 'gt65-v2026.1';

const companies = [
  { canonical_name:'ola electric', display_name:'Ola Electric', ticker:null, exchange:null,
    industry:'Unicorn / Electric Vehicles / Mobility / Transportation / India', sector:'Automotive & Clean Tech',
    is_public:false, country_code:'IN', workforce_count:5000, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:5200000000, pe_ratio:null, revenue_ttm_usd:300000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.6, total_open_roles:800, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'oyo rooms', display_name:'OYO Rooms', ticker:null, exchange:null,
    industry:'Unicorn / Hospitality / Hotels / Travel / India', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:12000, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:10000000000, pe_ratio:null, revenue_ttm_usd:2000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:0.1, total_open_roles:600, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'swiggy', display_name:'Swiggy', ticker:null, exchange:null,
    industry:'Unicorn / Food Delivery / Marketplace / Quick Commerce / India', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:13000, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:12000000000, pe_ratio:null, revenue_ttm_usd:2500000000,
    financials_source:'news_rss_scrape', financials_confidence:0.64,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.4, total_open_roles:800, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'zomato', display_name:'Zomato Ltd.', ticker:null, exchange:'NSE',
    industry:'Unicorn / Food Delivery / Restaurant / Marketplace / India / Public', sector:'Technology',
    is_public:true, country_code:'IN', workforce_count:7500, workforce_source:'annual_report', workforce_confidence:0.88,
    market_cap_usd:15000000000, pe_ratio:null, revenue_ttm_usd:2200000000,
    financials_source:'annual_report', financials_confidence:0.80,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.5, total_open_roles:500, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'policybazaar', display_name:'PolicyBazaar', ticker:null, exchange:'NSE',
    industry:'Unicorn / InsurTech / Insurance Marketplace / Aggregator / India / Public', sector:'Financial Technology',
    is_public:true, country_code:'IN', workforce_count:2800, workforce_source:'annual_report', workforce_confidence:0.88,
    market_cap_usd:4500000000, pe_ratio:null, revenue_ttm_usd:800000000,
    financials_source:'annual_report', financials_confidence:0.78,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.3, total_open_roles:250, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'cure fit', display_name:'CureFit', ticker:null, exchange:null,
    industry:'Unicorn / HealthTech / Fitness / Healthcare / India', sector:'HealthTech',
    is_public:false, country_code:'IN', workforce_count:3500, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:3200000000, pe_ratio:null, revenue_ttm_usd:400000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:300, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'kkr backed company', display_name:'Unacademy', ticker:null, exchange:null,
    industry:'Unicorn / EdTech / Learning / Online Education / India', sector:'EducationTech',
    is_public:false, country_code:'IN', workforce_count:3500, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:5200000000, pe_ratio:null, revenue_ttm_usd:400000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:0.0, total_open_roles:300, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'vedanta ventures', display_name:'Vedanta Ventures (AI Research)', ticker:null, exchange:null,
    industry:'Unicorn / AI / Research / ML / India Startup', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:400, workforce_source:'news_rss_scrape', workforce_confidence:0.72,
    market_cap_usd:1200000000, pe_ratio:null, revenue_ttm_usd:50000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.8, total_open_roles:150, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'antstack', display_name:'AntStack', ticker:null, exchange:null,
    industry:'Growth Stage / Cloud / Startups / Venture / India', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:250, workforce_source:'news_rss_scrape', workforce_confidence:0.70,
    market_cap_usd:400000000, pe_ratio:null, revenue_ttm_usd:30000000,
    financials_source:'news_rss_scrape', financials_confidence:0.50,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.7, total_open_roles:80, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'glance inmobi', display_name:'Glance (InMobi)', ticker:null, exchange:null,
    industry:'Growth Stage / Mobile / Lock Screen / Ads / India', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:2000, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:4200000000, pe_ratio:null, revenue_ttm_usd:600000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.4, total_open_roles:250, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'blume ventures', display_name:'Blume Ventures', ticker:null, exchange:null,
    industry:'Growth Stage / Venture Capital / Investment / India', sector:'Financial Services',
    is_public:false, country_code:'IN', workforce_count:150, workforce_source:'news_rss_scrape', workforce_confidence:0.70,
    market_cap_usd:500000000, pe_ratio:null, revenue_ttm_usd:50000000,
    financials_source:'news_rss_scrape', financials_confidence:0.50,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.5, total_open_roles:30, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'tencent india', display_name:'Tencent India', ticker:null, exchange:null,
    industry:'Growth Stage / Gaming / Investment / Tencent / India', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:1200, workforce_source:'news_rss_scrape', workforce_confidence:0.74,
    market_cap_usd:10000000000, pe_ratio:null, revenue_ttm_usd:1500000000,
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.3, total_open_roles:200, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'sequoia capital india', display_name:'Sequoia Capital India', ticker:null, exchange:null,
    industry:'Growth Stage / Venture Capital / Investment / India', sector:'Financial Services',
    is_public:false, country_code:'IN', workforce_count:200, workforce_source:'news_rss_scrape', workforce_confidence:0.70,
    market_cap_usd:800000000, pe_ratio:null, revenue_ttm_usd:100000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.4, total_open_roles:50, data_quality_tier:'seed', enrichment_version:V },
];

runBatch('GT65: Indian Unicorns & Growth-Stage Tech (2026)', V, companies)
  .catch(e=>{ console.error(e); process.exit(1); });
