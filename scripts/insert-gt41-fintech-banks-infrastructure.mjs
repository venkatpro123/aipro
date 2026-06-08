// GT41: Fintech Infrastructure & Banks' FinTech Arms (2026)
import { runBatch } from './_gt-upsert-lib.mjs';
const V = 'gt41-v2026.1';

const companies = [
  // ── US-listed fintech infrastructure (Yahoo) ──────────────────────────────
  { canonical_name:'fiserv inc', display_name:'Fiserv Inc.', ticker:'FI', exchange:'NYSE',
    industry:'Financial Services Infrastructure / Core Banking / Digital Banking / Payment Systems / FIS Merger', sector:'Financial Technology',
    is_public:true, country_code:'US', workforce_count:39000, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:2, layoff_confidence:0.82, hiring_velocity_score:0.2, total_open_roles:600, enrichment_version:V },

  { canonical_name:'fidelity national information services', display_name:'Fidelity National Information Services Inc.', ticker:'FIS', exchange:'NYSE',
    industry:'Financial Services Technology / Core Banking / Capital Markets / Payments / Market Data / Digital Assets', sector:'Financial Technology',
    is_public:true, country_code:'US', workforce_count:65000, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:3, layoff_confidence:0.85, hiring_velocity_score:-0.2, total_open_roles:800, enrichment_version:V },

  { canonical_name:'jack henry & associates inc', display_name:'Jack Henry & Associates Inc.', ticker:'JKHY', exchange:'NASDAQ',
    industry:'Core Banking / Community Bank Technology / Credit Union Software / Digital Banking / Regional Financial IT', sector:'Financial Technology',
    is_public:true, country_code:'US', workforce_count:7500, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:0, layoff_confidence:0.72, hiring_velocity_score:0.3, total_open_roles:250, enrichment_version:V },

  { canonical_name:'ss&c technologies inc', display_name:'SS&C Technologies Inc.', ticker:'SSNC', exchange:'NASDAQ',
    industry:'Financial Services Software / Asset Management / Fintech / Wealth Management / FinTech Platforms', sector:'Financial Technology',
    is_public:true, country_code:'US', workforce_count:28000, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:1, layoff_confidence:0.78, hiring_velocity_score:0.2, total_open_roles:400, enrichment_version:V },

  { canonical_name:'marketaxess holdings inc', display_name:'MarketAxess Holdings Inc.', ticker:'MKTX', exchange:'NASDAQ',
    industry:'Bond Trading Platform / Electronic Communication Network / Fixed Income / Financial Market Infrastructure', sector:'Financial Technology',
    is_public:true, country_code:'US', workforce_count:1100, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:1, layoff_confidence:0.78, hiring_velocity_score:0.0, total_open_roles:50, enrichment_version:V },

  { canonical_name:'broadridge financial solutions inc', display_name:'Broadridge Financial Solutions Inc.', ticker:'BR', exchange:'NYSE',
    industry:'Financial Software / Data & Analytics / Business Process Outsourcing / Market Data / Wealth Management', sector:'Financial Technology',
    is_public:true, country_code:'US', workforce_count:14000, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:1, layoff_confidence:0.78, hiring_velocity_score:0.1, total_open_roles:250, enrichment_version:V },

  { canonical_name:'euronet worldwide inc', display_name:'Euronet Worldwide Inc.', ticker:'EWTX', exchange:'NASDAQ',
    industry:'Payment Processing / Digital Money Transfer / ATM / Money Transfer Software / Global FinTech', sector:'Financial Technology',
    is_public:true, country_code:'US', workforce_count:12000, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:1, layoff_confidence:0.78, hiring_velocity_score:0.2, total_open_roles:200, enrichment_version:V },

  { canonical_name:'nuvei corporation', display_name:'Nuvei Corporation', ticker:'NVEI', exchange:'NASDAQ',
    industry:'Payment Processing / Payment Gateway / Fintech / Global Payments Platform / Digital Wallets', sector:'Financial Technology',
    is_public:true, country_code:'CA', workforce_count:4300, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:1, layoff_confidence:0.78, hiring_velocity_score:0.3, total_open_roles:150, enrichment_version:V },

  { canonical_name:'paylocity holding corporation', display_name:'Paylocity Holding Corporation', ticker:'PCTY', exchange:'NASDAQ',
    industry:'Payroll / HR SaaS / Human Capital Management / Benefits / Workforce Management', sector:'Financial Technology',
    is_public:true, country_code:'US', workforce_count:3500, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:0, layoff_confidence:0.72, hiring_velocity_score:0.5, total_open_roles:200, enrichment_version:V },

  { canonical_name:'netsmart technologies', display_name:'NetSmartTechnologies (legacy alias)', ticker:null, exchange:null,
    industry:'Financial Software / Banking Solutions / ERP / Legacy Systems Modernization / Banking IT', sector:'Financial Technology',
    is_public:false, country_code:'US', workforce_count:3000, workforce_source:'news_rss_scrape', workforce_confidence:0.75,
    market_cap_usd:2000000000, pe_ratio:null, revenue_ttm_usd:800000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:0, layoff_confidence:0.70, hiring_velocity_score:0.2, total_open_roles:100, data_quality_tier:'seed', enrichment_version:V },

  // ── International fintech & banking IT (pre-filled) ───────────────────────
  { canonical_name:'temenos ag', display_name:'Temenos AG', ticker:null, exchange:'SIX',
    industry:'Banking Software / Digital Banking / Core Banking / BaaS / Cloud Banking Platform / Switzerland FinTech', sector:'Financial Technology',
    is_public:true, country_code:'CH', workforce_count:5700, workforce_source:'annual_report', workforce_confidence:0.90,
    market_cap_usd:14000000000, pe_ratio:26, revenue_ttm_usd:1200000000,
    financials_source:'annual_report', financials_confidence:0.85,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:300, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'finastra international limited', display_name:'Finastra International Limited', ticker:null, exchange:null,
    industry:'Financial Software / Core Banking / Asset Management / Treasury / Capital Markets / UK FinTech', sector:'Financial Technology',
    is_public:false, country_code:'GB', workforce_count:11000, workforce_source:'news_rss_scrape', workforce_confidence:0.80,
    market_cap_usd:13000000000, pe_ratio:null, revenue_ttm_usd:2200000000,
    financials_source:'news_rss_scrape', financials_confidence:0.65,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.1, total_open_roles:300, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'nxp semiconductors nv', display_name:'Alipay (Ant Group)', ticker:null, exchange:null,
    industry:'Digital Payments / Mobile Payments / FinTech / China Payments Giant / Alipay Platform', sector:'Financial Technology',
    is_public:false, country_code:'CN', workforce_count:50000, workforce_source:'news_rss_scrape', workforce_confidence:0.80,
    market_cap_usd:150000000000, pe_ratio:null, revenue_ttm_usd:28000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:1000, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'tencent payments', display_name:'Tencent Payments (WeChat Pay)', ticker:null, exchange:null,
    industry:'Digital Payments / Mobile Payments / FinTech / Super App / China Payments', sector:'Financial Technology',
    is_public:false, country_code:'CN', workforce_count:30000, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:100000000000, pe_ratio:null, revenue_ttm_usd:20000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:0, layoff_confidence:0.70, hiring_velocity_score:0.3, total_open_roles:500, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'wise plc', display_name:'Wise plc', ticker:null, exchange:'LSE',
    industry:'Cross-Border Payments / Money Transfer / FinTech / International Remittances / UK FinTech Unicorn', sector:'Financial Technology',
    is_public:true, country_code:'GB', workforce_count:4500, workforce_source:'annual_report', workforce_confidence:0.88,
    market_cap_usd:12000000000, pe_ratio:null, revenue_ttm_usd:1200000000,
    financials_source:'annual_report', financials_confidence:0.82,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:-0.3, total_open_roles:200, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'stripe payments', display_name:'Stripe Payments', ticker:null, exchange:null,
    industry:'Payment Processing / Payments API / Online Payments / Payment Gateway / Fintech Giant', sector:'Financial Technology',
    is_public:false, country_code:'US', workforce_count:14000, workforce_source:'news_rss_scrape', workforce_confidence:0.80,
    market_cap_usd:95000000000, pe_ratio:null, revenue_ttm_usd:14000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.65,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.5, total_open_roles:600, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'shopify payments', display_name:'Shopify (Payments Division)', ticker:null, exchange:null,
    industry:'E-Commerce Payments / Payment Processing / Merchant Platform / Online Payments / Commerce Tech', sector:'Financial Technology',
    is_public:false, country_code:'CA', workforce_count:10000, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:50000000000, pe_ratio:null, revenue_ttm_usd:6000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:300, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'square inc', display_name:'Block Inc. (Square)', ticker:'SQ', exchange:'NYSE',
    industry:'Payments / Cash App / Fintech / Square Commerce / Small Business Payments', sector:'Financial Technology',
    is_public:true, country_code:'US', workforce_count:16000, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:3, layoff_confidence:0.85, hiring_velocity_score:-0.5, total_open_roles:300, enrichment_version:V },
];

runBatch('GT41: Fintech Infrastructure & Banks\' FinTech Arms (2026)', V, companies)
  .catch(e=>{ console.error(e); process.exit(1); });
