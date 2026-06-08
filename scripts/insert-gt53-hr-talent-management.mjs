// GT53: Human Resources & Talent Management (2026)
import { runBatch } from './_gt-upsert-lib.mjs';
const V = 'gt53-v2026.1';

const companies = [
  { canonical_name:'adp corp', display_name:'ADP Corp', ticker:'ADP', exchange:'NASDAQ',
    industry:'HR / Payroll / Human Capital / Workforce Management / HCM Platform', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:14000, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.3, total_open_roles:800, enrichment_version:V },

  { canonical_name:'paychex inc', display_name:'Paychex Inc.', ticker:'PAYX', exchange:'NASDAQ',
    industry:'HR / Payroll / HCM / Compliance / Time & Labor / HCM Suite', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:14500, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.4, total_open_roles:700, enrichment_version:V },

  { canonical_name:'workday inc', display_name:'Workday Inc.', ticker:'WDAY', exchange:'NASDAQ',
    industry:'HR / HCM / Financial Management / Cloud / People Analytics / Learning', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:15000, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.6, total_open_roles:1000, enrichment_version:V },

  { canonical_name:'bamboohr inc', display_name:'BambooHR Inc.', ticker:null, exchange:null,
    industry:'HR / HCM / Applicant Tracking / Time Off / Performance / HRIS', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:850, workforce_source:'news_rss_scrape', workforce_confidence:0.75,
    market_cap_usd:5000000000, pe_ratio:null, revenue_ttm_usd:400000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.5, total_open_roles:150, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'lattice corp', display_name:'Lattice Inc.', ticker:null, exchange:null,
    industry:'HR / Performance / Learning / Engagement / People Operations / Career Development', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:550, workforce_source:'news_rss_scrape', workforce_confidence:0.75,
    market_cap_usd:3100000000, pe_ratio:null, revenue_ttm_usd:250000000,
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.7, total_open_roles:100, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'guidepoint inc', display_name:'Guidepoint Inc.', ticker:null, exchange:null,
    industry:'HR / GRC / Governance / Risk / Compliance / Employee Management', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:700, workforce_source:'news_rss_scrape', workforce_confidence:0.74,
    market_cap_usd:2000000000, pe_ratio:null, revenue_ttm_usd:200000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.4, total_open_roles:80, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'15five inc', display_name:'15Five Inc.', ticker:null, exchange:null,
    industry:'HR / Performance / Learning / Engagement / OKR / Employee Development', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:350, workforce_source:'news_rss_scrape', workforce_confidence:0.72,
    market_cap_usd:800000000, pe_ratio:null, revenue_ttm_usd:80000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.5, total_open_roles:60, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'culture amp', display_name:'Culture Amp', ticker:null, exchange:null,
    industry:'HR / Employee Experience / Engagement / Survey / Analytics / People Platform', sector:'Technology',
    is_public:false, country_code:'AU', workforce_count:600, workforce_source:'news_rss_scrape', workforce_confidence:0.75,
    market_cap_usd:2400000000, pe_ratio:null, revenue_ttm_usd:200000000,
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.6, total_open_roles:100, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'peakon inc', display_name:'Peakon (Personio)', ticker:null, exchange:null,
    industry:'HR / Employee Engagement / Surveys / Analytics / Feedback / Experience Platform', sector:'Technology',
    is_public:false, country_code:'DE', workforce_count:450, workforce_source:'news_rss_scrape', workforce_confidence:0.74,
    market_cap_usd:3500000000, pe_ratio:null, revenue_ttm_usd:300000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.5, total_open_roles:80, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'rippling inc', display_name:'Rippling Inc.', ticker:null, exchange:null,
    industry:'HR / IT / Finance / All-in-One Platform / HR OS / Device Management', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:800, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:11200000000, pe_ratio:null, revenue_ttm_usd:600000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.8, total_open_roles:200, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'namely inc', display_name:'Namely Inc.', ticker:null, exchange:null,
    industry:'HR / HCM / Payroll / Benefits / Performance / Recruiting', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:750, workforce_source:'news_rss_scrape', workforce_confidence:0.74,
    market_cap_usd:1500000000, pe_ratio:null, revenue_ttm_usd:150000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.3, total_open_roles:100, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'zenefits', display_name:'Zenefits', ticker:null, exchange:null,
    industry:'HR / Benefits / Payroll / Compliance / Insurance / HCM Platform', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:600, workforce_source:'news_rss_scrape', workforce_confidence:0.74,
    market_cap_usd:4500000000, pe_ratio:null, revenue_ttm_usd:400000000,
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:120, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'workmotion gmbh', display_name:'Workmotion', ticker:null, exchange:null,
    industry:'HR / Compliance / International Payroll / Global HR / Hiring / Onboarding', sector:'Technology',
    is_public:false, country_code:'DE', workforce_count:250, workforce_source:'news_rss_scrape', workforce_confidence:0.72,
    market_cap_usd:400000000, pe_ratio:null, revenue_ttm_usd:30000000,
    financials_source:'news_rss_scrape', financials_confidence:0.50,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.8, total_open_roles:60, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'paveiq inc', display_name:'Pave IQ', ticker:null, exchange:null,
    industry:'HR / Compensation / Benchmarking / Equity / Data Intelligence', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:180, workforce_source:'news_rss_scrape', workforce_confidence:0.70,
    market_cap_usd:300000000, pe_ratio:null, revenue_ttm_usd:25000000,
    financials_source:'news_rss_scrape', financials_confidence:0.50,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.6, total_open_roles:40, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'talentsoft', display_name:'Talentsoft', ticker:null, exchange:null,
    industry:'HR / Talent Management / Learning / Succession Planning / Performance / France', sector:'Technology',
    is_public:false, country_code:'FR', workforce_count:1200, workforce_source:'news_rss_scrape', workforce_confidence:0.75,
    market_cap_usd:1800000000, pe_ratio:null, revenue_ttm_usd:250000000,
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.3, total_open_roles:150, data_quality_tier:'seed', enrichment_version:V },
];

runBatch('GT53: Human Resources & Talent Management (2026)', V, companies)
  .catch(e=>{ console.error(e); process.exit(1); });
