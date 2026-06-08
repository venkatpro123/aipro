// GT54: Supply Chain & Logistics (2026)
import { runBatch } from './_gt-upsert-lib.mjs';
const V = 'gt54-v2026.1';

const companies = [
  { canonical_name:'flexport inc', display_name:'Flexport Inc.', ticker:null, exchange:null,
    industry:'Logistics / Supply Chain / Freight Forwarding / Customs / Digital Freight', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:3500, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:8000000000, pe_ratio:null, revenue_ttm_usd:800000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:-0.2, total_open_roles:300, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'fourkites inc', display_name:'FourKites Inc.', ticker:null, exchange:null,
    industry:'Supply Chain / Logistics / Real-Time Visibility / Tracking / Transportation', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:1200, workforce_source:'news_rss_scrape', workforce_confidence:0.75,
    market_cap_usd:5200000000, pe_ratio:null, revenue_ttm_usd:400000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.5, total_open_roles:200, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'coupa software', display_name:'Coupa Software', ticker:'COUP', exchange:'NASDAQ',
    industry:'Supply Chain / Spend Management / Business Network / Cloud / Procurement', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:2600, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.3, total_open_roles:300, enrichment_version:V },

  { canonical_name:'blue yonder', display_name:'Blue Yonder', ticker:null, exchange:null,
    industry:'Supply Chain / Planning / Logistics / AI Powered / Demand Planning / Inventory', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:4500, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:8000000000, pe_ratio:null, revenue_ttm_usd:1400000000,
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:400, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'e2open parent holdings', display_name:'E2open', ticker:'ETWO', exchange:'NYSE',
    industry:'Supply Chain / Logistics / Trade / Cloud Platform / Network / Ecosystem', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:3500, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:400, enrichment_version:V },

  { canonical_name:'descartes systems', display_name:'Descartes Systems', ticker:'DSGX', exchange:'NASDAQ',
    industry:'Supply Chain / Logistics / Customs / Trade / Cloud / Shipping Software', sector:'Technology',
    is_public:true, country_code:'CA', workforce_count:3800, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.4, total_open_roles:350, enrichment_version:V },

  { canonical_name:'kinaxis inc', display_name:'Kinaxis Inc.', ticker:'KXS', exchange:'TSX',
    industry:'Supply Chain / Digital Supply Network / Planning / Demand / Cloud / RapidResponse', sector:'Technology',
    is_public:true, country_code:'CA', workforce_count:1500, workforce_source:'annual_report', workforce_confidence:0.85,
    market_cap_usd:4200000000, pe_ratio:120, revenue_ttm_usd:350000000,
    financials_source:'annual_report', financials_confidence:0.82,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.6, total_open_roles:250, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'manhattan associates', display_name:'Manhattan Associates Inc.', ticker:'MANH', exchange:'NASDAQ',
    industry:'Supply Chain / Logistics / Order Management / Warehouse / Fulfillment', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:3500, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.5, total_open_roles:350, enrichment_version:V },

  { canonical_name:'infor global', display_name:'Infor Global (Supply Chain)', ticker:null, exchange:null,
    industry:'Supply Chain / Manufacturing / Cloud Platform / ERP / Network Visibility', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:18000, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:14000000000, pe_ratio:null, revenue_ttm_usd:3200000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.3, total_open_roles:800, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'torqata inc', display_name:'TorqATA', ticker:null, exchange:null,
    industry:'Supply Chain / Logistics / Shipment / Rate / Audit / Optimization', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:350, workforce_source:'news_rss_scrape', workforce_confidence:0.72,
    market_cap_usd:600000000, pe_ratio:null, revenue_ttm_usd:60000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.4, total_open_roles:60, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'shipbob inc', display_name:'ShipBob Inc.', ticker:null, exchange:null,
    industry:'Logistics / Fulfillment / Supply Chain / Warehouse / E-Commerce / Shipping', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:1200, workforce_source:'news_rss_scrape', workforce_confidence:0.75,
    market_cap_usd:3500000000, pe_ratio:null, revenue_ttm_usd:300000000,
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.6, total_open_roles:200, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'flexport airfreight', display_name:'Flexport (Airfreight)', ticker:null, exchange:null,
    industry:'Logistics / Airfreight / International / Global Shipping / Customs', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:3500, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:8000000000, pe_ratio:null, revenue_ttm_usd:800000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:-0.2, total_open_roles:300, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'project44 inc', display_name:'Project44 Inc.', ticker:null, exchange:null,
    industry:'Supply Chain / Visibility / Logistics / Real-Time Tracking / Global Trade', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:700, workforce_source:'news_rss_scrape', workforce_confidence:0.74,
    market_cap_usd:2000000000, pe_ratio:null, revenue_ttm_usd:200000000,
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.5, total_open_roles:120, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'container xchange', display_name:'Container xChange', ticker:null, exchange:null,
    industry:'Supply Chain / Logistics / Container / Shipping / Marketplace / Sustainability', sector:'Technology',
    is_public:false, country_code:'DE', workforce_count:350, workforce_source:'news_rss_scrape', workforce_confidence:0.72,
    market_cap_usd:1200000000, pe_ratio:null, revenue_ttm_usd:80000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.7, total_open_roles:80, data_quality_tier:'seed', enrichment_version:V },
];

runBatch('GT54: Supply Chain & Logistics (2026)', V, companies)
  .catch(e=>{ console.error(e); process.exit(1); });
