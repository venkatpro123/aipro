// GT71: India AgriTech & Rural Tech (2026)
import { runBatch } from './_gt-upsert-lib.mjs';
const V = 'gt71-v2026.1';

const companies = [
  { canonical_name:'farmer connect', display_name:'FarmerConnect', ticker:null, exchange:null,
    industry:'AgriTech / Farmers Platform / Marketplace / India', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:450, workforce_source:'news_rss_scrape', workforce_confidence:0.72,
    market_cap_usd:1200000000, pe_ratio:null, revenue_ttm_usd:180000000,
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.5, total_open_roles:120, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'agribazaar', display_name:'AgriBazaar', ticker:null, exchange:null,
    industry:'AgriTech / Commodity Trading / B2B / India', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:320, workforce_source:'news_rss_scrape', workforce_confidence:0.70,
    market_cap_usd:800000000, pe_ratio:null, revenue_ttm_usd:120000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.4, total_open_roles:100, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'ninjacart', display_name:'NinjaCart', ticker:null, exchange:null,
    industry:'AgriTech / Farm Commerce / Supply Chain / India', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:580, workforce_source:'news_rss_scrape', workforce_confidence:0.72,
    market_cap_usd:1800000000, pe_ratio:null, revenue_ttm_usd:250000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.5, total_open_roles:150, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'cropin technology', display_name:'CropIn Technology', ticker:null, exchange:null,
    industry:'AgriTech / Farm Analytics / Precision Agriculture / India', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:380, workforce_source:'news_rss_scrape', workforce_confidence:0.70,
    market_cap_usd:1200000000, pe_ratio:null, revenue_ttm_usd:140000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.6, total_open_roles:110, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'intello labs', display_name:'Intello Labs', ticker:null, exchange:null,
    industry:'AgriTech / Trade Intelligence / Commodities / India', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:280, workforce_source:'news_rss_scrape', workforce_confidence:0.70,
    market_cap_usd:600000000, pe_ratio:null, revenue_ttm_usd:80000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.5, total_open_roles:80, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'plantix', display_name:'Plantix', ticker:null, exchange:null,
    industry:'AgriTech / Disease Detection / Mobile App / India', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:200, workforce_source:'news_rss_scrape', workforce_confidence:0.68,
    market_cap_usd:450000000, pe_ratio:null, revenue_ttm_usd:60000000,
    financials_source:'news_rss_scrape', financials_confidence:0.50,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.6, total_open_roles:60, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'trinetra agritech', display_name:'Trinetra Agritech', ticker:null, exchange:null,
    industry:'AgriTech / Aquaculture Tech / Farms / India', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:150, workforce_source:'news_rss_scrape', workforce_confidence:0.68,
    market_cap_usd:350000000, pe_ratio:null, revenue_ttm_usd:50000000,
    financials_source:'news_rss_scrape', financials_confidence:0.50,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.5, total_open_roles:50, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'farmsen technologies', display_name:'FarmSen', ticker:null, exchange:null,
    industry:'AgriTech / Agri Supply Chain / India', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:220, workforce_source:'news_rss_scrape', workforce_confidence:0.70,
    market_cap_usd:550000000, pe_ratio:null, revenue_ttm_usd:75000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.5, total_open_roles:70, data_quality_tier:'seed', enrichment_version:V },
];

runBatch('GT71: India AgriTech & Rural Tech (2026)', V, companies)
  .catch(e=>{ console.error(e); process.exit(1); });
