// GT63: Indian FinTech & Digital Payments (2026)
import { runBatch } from './_gt-upsert-lib.mjs';
const V = 'gt63-v2026.1';

const companies = [
  { canonical_name:'paytm limited', display_name:'Paytm Limited', ticker:null, exchange:'NSE',
    industry:'FinTech / Digital Payments / Wallet / Banking / POS / India', sector:'Financial Technology',
    is_public:true, country_code:'IN', workforce_count:15000, workforce_source:'annual_report', workforce_confidence:0.88,
    market_cap_usd:2800000000, pe_ratio:null, revenue_ttm_usd:900000000,
    financials_source:'annual_report', financials_confidence:0.80,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:-0.2, total_open_roles:500, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'phonepe pvt ltd', display_name:'PhonePe', ticker:null, exchange:null,
    industry:'FinTech / Digital Payments / UPI / Wallet / Insurance / India', sector:'Financial Technology',
    is_public:false, country_code:'IN', workforce_count:8000, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:12000000000, pe_ratio:null, revenue_ttm_usd:1500000000,
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.5, total_open_roles:600, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'razorpay payments inc', display_name:'Razorpay', ticker:null, exchange:null,
    industry:'FinTech / Payments / API / Banking / Settlement / India', sector:'Financial Technology',
    is_public:false, country_code:'IN', workforce_count:4500, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:7500000000, pe_ratio:null, revenue_ttm_usd:500000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.6, total_open_roles:400, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'cashfree payments', display_name:'Cashfree', ticker:null, exchange:null,
    industry:'FinTech / Payments / E-Commerce / Settlements / India', sector:'Financial Technology',
    is_public:false, country_code:'IN', workforce_count:800, workforce_source:'news_rss_scrape', workforce_confidence:0.74,
    market_cap_usd:1200000000, pe_ratio:null, revenue_ttm_usd:80000000,
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.5, total_open_roles:150, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'gupshup technologies', display_name:'Gupshup', ticker:null, exchange:null,
    industry:'FinTech / Communications / Messaging / WhatsApp / India', sector:'Financial Technology',
    is_public:false, country_code:'IN', workforce_count:1200, workforce_source:'news_rss_scrape', workforce_confidence:0.74,
    market_cap_usd:1000000000, pe_ratio:null, revenue_ttm_usd:80000000,
    financials_source:'news_rss_scrape', financials_confidence:0.56,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.4, total_open_roles:150, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'billdesk technologies', display_name:'BillDesk', ticker:null, exchange:null,
    industry:'FinTech / Payments / Banking / Collections / India', sector:'Financial Technology',
    is_public:false, country_code:'IN', workforce_count:2500, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:3000000000, pe_ratio:null, revenue_ttm_usd:400000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.3, total_open_roles:200, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'jiffy inc', display_name:'Jiffy (Stripe India)', ticker:null, exchange:null,
    industry:'FinTech / Payments / E-Commerce / Stripe / India', sector:'Financial Technology',
    is_public:false, country_code:'IN', workforce_count:400, workforce_source:'news_rss_scrape', workforce_confidence:0.72,
    market_cap_usd:800000000, pe_ratio:null, revenue_ttm_usd:50000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.6, total_open_roles:100, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'icici bank digital', display_name:'ICICI Bank Digital', ticker:null, exchange:null,
    industry:'FinTech / Banking / Digital / ICICI / India Bank', sector:'Financial Services',
    is_public:false, country_code:'IN', workforce_count:5000, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:150000000000, pe_ratio:null, revenue_ttm_usd:8000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.65,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.3, total_open_roles:400, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'axis bank digital', display_name:'Axis Bank Digital', ticker:null, exchange:null,
    industry:'FinTech / Banking / Digital / Axis / India Bank', sector:'Financial Services',
    is_public:false, country_code:'IN', workforce_count:4500, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:120000000000, pe_ratio:null, revenue_ttm_usd:6500000000,
    financials_source:'news_rss_scrape', financials_confidence:0.65,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.2, total_open_roles:350, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'hdfc bank digital', display_name:'HDFC Bank Digital', ticker:null, exchange:null,
    industry:'FinTech / Banking / Digital / HDFC / India Bank', sector:'Financial Services',
    is_public:false, country_code:'IN', workforce_count:6000, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:200000000000, pe_ratio:null, revenue_ttm_usd:12000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.68,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.3, total_open_roles:500, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'upstox inc', display_name:'Upstox', ticker:null, exchange:null,
    industry:'FinTech / Stock Trading / Brokerage / Investment / India', sector:'Financial Technology',
    is_public:false, country_code:'IN', workforce_count:1500, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:3500000000, pe_ratio:null, revenue_ttm_usd:300000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.4, total_open_roles:250, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'zerodha pvt ltd', display_name:'Zerodha', ticker:null, exchange:null,
    industry:'FinTech / Stock Trading / Brokerage / Investment / India', sector:'Financial Technology',
    is_public:false, country_code:'IN', workforce_count:2000, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:5000000000, pe_ratio:null, revenue_ttm_usd:700000000,
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.5, total_open_roles:300, data_quality_tier:'seed', enrichment_version:V },
];

runBatch('GT63: Indian FinTech & Digital Payments (2026)', V, companies)
  .catch(e=>{ console.error(e); process.exit(1); });
