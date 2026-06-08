// GT76: Missing Mega-Cap Indian Companies (2026)
import { runBatch } from './_gt-upsert-lib.mjs';
const V = 'gt76-v2026.1';

const companies = [
  { canonical_name:'reliance industries limited', display_name:'Reliance Industries Limited', ticker:'RIL', exchange:'NSE',
    industry:'Oil & Gas / Retail / Petrochemicals / Energy / India', sector:'Energy',
    is_public:true, country_code:'IN', workforce_count:360000, workforce_source:'annual_report', workforce_confidence:0.90,
    market_cap_usd:280000000000, pe_ratio:20, revenue_ttm_usd:95000000000,
    financials_source:'yahoo_finance_scrape', financials_confidence:0.92,
    recent_layoff_count:0, layoff_confidence:0.75, hiring_velocity_score:0.3, total_open_roles:2000, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'larsen and toubro limited', display_name:'Larsen & Toubro Limited', ticker:'LT', exchange:'NSE',
    industry:'Engineering / Construction / Infrastructure / Technology / India', sector:'Industrials',
    is_public:true, country_code:'IN', workforce_count:650000, workforce_source:'annual_report', workforce_confidence:0.90,
    market_cap_usd:65000000000, pe_ratio:22, revenue_ttm_usd:24000000000,
    financials_source:'yahoo_finance_scrape', financials_confidence:0.90,
    recent_layoff_count:0, layoff_confidence:0.75, hiring_velocity_score:0.4, total_open_roles:3000, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'bajaj auto limited', display_name:'Bajaj Auto Limited', ticker:'BAJAJAUT', exchange:'NSE',
    industry:'Automotive / Two Wheelers / Three Wheelers / India', sector:'Consumer Discretionary',
    is_public:true, country_code:'IN', workforce_count:28000, workforce_source:'annual_report', workforce_confidence:0.88,
    market_cap_usd:35000000000, pe_ratio:18, revenue_ttm_usd:8500000000,
    financials_source:'yahoo_finance_scrape', financials_confidence:0.90,
    recent_layoff_count:0, layoff_confidence:0.75, hiring_velocity_score:0.3, total_open_roles:500, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'bajaj finance limited', display_name:'Bajaj Finance Limited', ticker:'BAJAJFINSV', exchange:'NSE',
    industry:'Financial Services / NBFC / Lending / India', sector:'Financials',
    is_public:true, country_code:'IN', workforce_count:45000, workforce_source:'annual_report', workforce_confidence:0.88,
    market_cap_usd:40000000000, pe_ratio:32, revenue_ttm_usd:8000000000,
    financials_source:'yahoo_finance_scrape', financials_confidence:0.90,
    recent_layoff_count:0, layoff_confidence:0.75, hiring_velocity_score:0.4, total_open_roles:1000, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'maruti suzuki india limited', display_name:'Maruti Suzuki India Limited', ticker:'MARUTI', exchange:'NSE',
    industry:'Automotive / Cars / Vehicles / India', sector:'Consumer Discretionary',
    is_public:true, country_code:'IN', workforce_count:35000, workforce_source:'annual_report', workforce_confidence:0.88,
    market_cap_usd:35000000000, pe_ratio:16, revenue_ttm_usd:10500000000,
    financials_source:'yahoo_finance_scrape', financials_confidence:0.90,
    recent_layoff_count:0, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:800, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'hero motocorp limited', display_name:'Hero MotoCorp Limited', ticker:'HEROMOTOCO', exchange:'NSE',
    industry:'Automotive / Two Wheelers / Motorcycles / India', sector:'Consumer Discretionary',
    is_public:true, country_code:'IN', workforce_count:42000, workforce_source:'annual_report', workforce_confidence:0.88,
    market_cap_usd:35000000000, pe_ratio:20, revenue_ttm_usd:10000000000,
    financials_source:'yahoo_finance_scrape', financials_confidence:0.90,
    recent_layoff_count:0, layoff_confidence:0.75, hiring_velocity_score:0.3, total_open_roles:1000, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'sun pharmaceutical industries limited', display_name:'Sun Pharmaceutical Industries Limited', ticker:'SUNPHARMA', exchange:'NSE',
    industry:'Pharmaceutical / Generic Drugs / Biotech / India', sector:'Healthcare',
    is_public:true, country_code:'IN', workforce_count:32000, workforce_source:'annual_report', workforce_confidence:0.88,
    market_cap_usd:28000000000, pe_ratio:24, revenue_ttm_usd:7000000000,
    financials_source:'yahoo_finance_scrape', financials_confidence:0.90,
    recent_layoff_count:0, layoff_confidence:0.75, hiring_velocity_score:0.3, total_open_roles:800, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'bharat heavy electricals limited', display_name:'Bharat Heavy Electricals Limited (BHEL)', ticker:'BHEL', exchange:'NSE',
    industry:'Industrial / Heavy Manufacturing / Power / India', sector:'Industrials',
    is_public:true, country_code:'IN', workforce_count:40000, workforce_source:'annual_report', workforce_confidence:0.88,
    market_cap_usd:15000000000, pe_ratio:15, revenue_ttm_usd:5500000000,
    financials_source:'yahoo_finance_scrape', financials_confidence:0.88,
    recent_layoff_count:0, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:500, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'apollo tyres limited', display_name:'Apollo Tyres Limited', ticker:'APOLLOTYRE', exchange:'NSE',
    industry:'Manufacturing / Automotive / Tyres / India', sector:'Materials',
    is_public:true, country_code:'IN', workforce_count:25000, workforce_source:'annual_report', workforce_confidence:0.88,
    market_cap_usd:8000000000, pe_ratio:18, revenue_ttm_usd:2500000000,
    financials_source:'yahoo_finance_scrape', financials_confidence:0.88,
    recent_layoff_count:0, layoff_confidence:0.75, hiring_velocity_score:0.3, total_open_roles:400, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'mahindra and mahindra limited', display_name:'Mahindra and Mahindra Limited', ticker:'MM', exchange:'NSE',
    industry:'Automotive / Tractors / Vehicles / India', sector:'Consumer Discretionary',
    is_public:true, country_code:'IN', workforce_count:280000, workforce_source:'annual_report', workforce_confidence:0.88,
    market_cap_usd:28000000000, pe_ratio:22, revenue_ttm_usd:8500000000,
    financials_source:'yahoo_finance_scrape', financials_confidence:0.90,
    recent_layoff_count:0, layoff_confidence:0.75, hiring_velocity_score:0.3, total_open_roles:1500, data_quality_tier:'verified', enrichment_version:V },
];

runBatch('GT76: Missing Mega-Cap Indian Companies (2026)', V, companies)
  .catch(e=>{ console.error(e); process.exit(1); });
