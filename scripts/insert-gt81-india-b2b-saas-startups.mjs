// GT81: India B2B SaaS Startups (2026)
import { runBatch } from './_gt-upsert-lib.mjs';
const V = 'gt81-v2026.1';

const companies = [
  { canonical_name:'shiprocket', display_name:'Shiprocket', ticker:null, exchange:null, industry:'SaaS / Logistics / Shipping / B2B / India', sector:'Technology', is_public:false, country_code:'IN', workforce_count:1200, workforce_source:'news_rss_scrape', workforce_confidence:0.76, market_cap_usd:2800000000, pe_ratio:null, revenue_ttm_usd:400000000, financials_source:'news_rss_scrape', financials_confidence:0.62, recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.5, total_open_roles:300, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'lendingkart', display_name:'LendingKart', ticker:null, exchange:null, industry:'SaaS / Lending / B2B / SME / India', sector:'Financial Technology', is_public:false, country_code:'IN', workforce_count:600, workforce_source:'news_rss_scrape', workforce_confidence:0.74, market_cap_usd:1500000000, pe_ratio:null, revenue_ttm_usd:200000000, financials_source:'news_rss_scrape', financials_confidence:0.60, recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.4, total_open_roles:150, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'byjus tuition center', display_name:'BYJU\'S Tuition Center', ticker:null, exchange:null, industry:'SaaS / Tuition / SMB / India', sector:'EducationTech', is_public:false, country_code:'IN', workforce_count:800, workforce_source:'news_rss_scrape', workforce_confidence:0.74, market_cap_usd:1200000000, pe_ratio:null, revenue_ttm_usd:150000000, financials_source:'news_rss_scrape', financials_confidence:0.58, recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.3, total_open_roles:200, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'fastfox logistics', display_name:'FastFox Logistics', ticker:null, exchange:null, industry:'SaaS / Last-Mile Logistics / B2B / India', sector:'Technology', is_public:false, country_code:'IN', workforce_count:450, workforce_source:'news_rss_scrape', workforce_confidence:0.72, market_cap_usd:800000000, pe_ratio:null, revenue_ttm_usd:120000000, financials_source:'news_rss_scrape', financials_confidence:0.58, recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.6, total_open_roles:100, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'ksolves india', display_name:'Ksolves India', ticker:null, exchange:null, industry:'SaaS / Software Services / B2B / India', sector:'Technology', is_public:false, country_code:'IN', workforce_count:350, workforce_source:'news_rss_scrape', workforce_confidence:0.72, market_cap_usd:600000000, pe_ratio:null, revenue_ttm_usd:80000000, financials_source:'news_rss_scrape', financials_confidence:0.56, recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.5, total_open_roles:80, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'nuvepro', display_name:'NuvePro', ticker:null, exchange:null, industry:'SaaS / Supply Chain / B2B / India', sector:'Technology', is_public:false, country_code:'IN', workforce_count:280, workforce_source:'news_rss_scrape', workforce_confidence:0.70, market_cap_usd:500000000, pe_ratio:null, revenue_ttm_usd:60000000, financials_source:'news_rss_scrape', financials_confidence:0.55, recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.5, total_open_roles:60, data_quality_tier:'seed', enrichment_version:V },
];

runBatch('GT81: India B2B SaaS Startups (2026)', V, companies)
  .catch(e=>{ console.error(e); process.exit(1); });
