// GT71: US FAANG & Mega-Cap Tech (2026)
import { runBatch } from './_gt-upsert-lib.mjs';
const V = 'gt71-v2026.1';

const companies = [
  { canonical_name:'microsoft corporation', display_name:'Microsoft', ticker:'MSFT', exchange:'NASDAQ',
    industry:'Cloud Computing / Enterprise Software / AI / Operating Systems / US', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:221000, workforce_source:'annual_report', workforce_confidence:0.92,
    market_cap_usd:3200000000000, pe_ratio:35, revenue_ttm_usd:245000000000,
    financials_source:'yahoo_finance_scrape', financials_confidence:0.95,
    recent_layoff_count:0, layoff_confidence:0.75, hiring_velocity_score:0.4, total_open_roles:5000, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'alphabet inc', display_name:'Alphabet (Google)', ticker:'GOOGL', exchange:'NASDAQ',
    industry:'Search / Advertising / Cloud / AI / Android / US', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:182381, workforce_source:'annual_report', workforce_confidence:0.92,
    market_cap_usd:2100000000000, pe_ratio:28, revenue_ttm_usd:307000000000,
    financials_source:'yahoo_finance_scrape', financials_confidence:0.95,
    recent_layoff_count:1, layoff_confidence:0.85, hiring_velocity_score:0.2, total_open_roles:3000, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'amazon.com inc', display_name:'Amazon', ticker:'AMZN', exchange:'NASDAQ',
    industry:'E-Commerce / Cloud Computing / Retail / AWS / US', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:1608000, workforce_source:'annual_report', workforce_confidence:0.92,
    market_cap_usd:2150000000000, pe_ratio:65, revenue_ttm_usd:575000000000,
    financials_source:'yahoo_finance_scrape', financials_confidence:0.95,
    recent_layoff_count:1, layoff_confidence:0.85, hiring_velocity_score:0.3, total_open_roles:10000, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'apple inc', display_name:'Apple', ticker:'AAPL', exchange:'NASDAQ',
    industry:'Consumer Electronics / Smartphones / Devices / Software / US', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:164000, workforce_source:'annual_report', workforce_confidence:0.92,
    market_cap_usd:3200000000000, pe_ratio:32, revenue_ttm_usd:394000000000,
    financials_source:'yahoo_finance_scrape', financials_confidence:0.95,
    recent_layoff_count:0, layoff_confidence:0.75, hiring_velocity_score:0.3, total_open_roles:2000, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'meta platforms inc', display_name:'Meta', ticker:'META', exchange:'NASDAQ',
    industry:'Social Media / Advertising / Virtual Reality / AI / US', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:67317, workforce_source:'annual_report', workforce_confidence:0.92,
    market_cap_usd:1500000000000, pe_ratio:42, revenue_ttm_usd:135000000000,
    financials_source:'yahoo_finance_scrape', financials_confidence:0.95,
    recent_layoff_count:1, layoff_confidence:0.85, hiring_velocity_score:0.2, total_open_roles:1500, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'tesla inc', display_name:'Tesla', ticker:'TSLA', exchange:'NASDAQ',
    industry:'Electric Vehicles / Energy / Autonomous Driving / Software / US', sector:'Automotive & Clean Tech',
    is_public:true, country_code:'US', workforce_count:128045, workforce_source:'annual_report', workforce_confidence:0.92,
    market_cap_usd:950000000000, pe_ratio:78, revenue_ttm_usd:81500000000,
    financials_source:'yahoo_finance_scrape', financials_confidence:0.95,
    recent_layoff_count:1, layoff_confidence:0.85, hiring_velocity_score:0.4, total_open_roles:2000, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'nvidia corporation', display_name:'Nvidia', ticker:'NVDA', exchange:'NASDAQ',
    industry:'Semiconductors / GPUs / AI Chips / Data Centers / US', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:28000, workforce_source:'annual_report', workforce_confidence:0.92,
    market_cap_usd:3100000000000, pe_ratio:75, revenue_ttm_usd:62000000000,
    financials_source:'yahoo_finance_scrape', financials_confidence:0.95,
    recent_layoff_count:0, layoff_confidence:0.75, hiring_velocity_score:0.6, total_open_roles:1500, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'advanced micro devices', display_name:'AMD', ticker:'AMD', exchange:'NASDAQ',
    industry:'Semiconductors / CPUs / Processors / Data Centers / US', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:24000, workforce_source:'annual_report', workforce_confidence:0.92,
    market_cap_usd:250000000000, pe_ratio:48, revenue_ttm_usd:24000000000,
    financials_source:'yahoo_finance_scrape', financials_confidence:0.95,
    recent_layoff_count:0, layoff_confidence:0.75, hiring_velocity_score:0.5, total_open_roles:800, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'oracle corporation', display_name:'Oracle', ticker:'ORCL', exchange:'NYSE',
    industry:'Enterprise Database / Cloud / Enterprise Software / US', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:136000, workforce_source:'annual_report', workforce_confidence:0.92,
    market_cap_usd:410000000000, pe_ratio:32, revenue_ttm_usd:48000000000,
    financials_source:'yahoo_finance_scrape', financials_confidence:0.95,
    recent_layoff_count:1, layoff_confidence:0.85, hiring_velocity_score:0.2, total_open_roles:1000, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'intel corporation', display_name:'Intel', ticker:'INTC', exchange:'NASDAQ',
    industry:'Semiconductors / CPUs / Memory / Data Centers / US', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:123000, workforce_source:'annual_report', workforce_confidence:0.92,
    market_cap_usd:220000000000, pe_ratio:18, revenue_ttm_usd:63000000000,
    financials_source:'yahoo_finance_scrape', financials_confidence:0.95,
    recent_layoff_count:2, layoff_confidence:0.90, hiring_velocity_score:0.0, total_open_roles:500, data_quality_tier:'verified', enrichment_version:V },
];

runBatch('GT71: US FAANG & Mega-Cap Tech (2026)', V, companies)
  .catch(e=>{ console.error(e); process.exit(1); });
