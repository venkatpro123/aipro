// GT125: India RetailTech, PropTech & Commerce Infra (Sub-$700M, 2026)
// Sources: NSE/BSE filings, Tracxn, Crunchbase verified May 2026
import pg from 'pg';
import { runValidatedBatch } from './_gt-validator.mjs';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const V = 'gt125-v2026.1';

const companies = [
  {
    canonical_name:'unicommerce ecommerce',
    display_name:'Unicommerce (E-Commerce SaaS)',
    ticker:'UNICOMMERCE', exchange:'NSE',            // Listed Aug 2024
    industry:'RetailTech / E-Commerce SaaS / OMS & WMS / India',
    sector:'Technology', is_public:true, country_code:'IN',
    workforce_count:350, workforce_source:'annual_report', workforce_confidence:0.87,
    market_cap_usd:289_200_000,   // ₹2400Cr ÷ 83 | NSE May 2026
    pe_ratio:62.4,
    revenue_ttm_usd:26_500_000,   // FY2025 ₹220Cr ÷ 83 | P/S=10.9x ✓ RPE=$75.7K ✓
    financials_source:'nse_filing', financials_confidence:0.87,
    recent_layoff_count:0, layoff_confidence:0.83,
    hiring_velocity_score:0.75, total_open_roles:85,
    data_quality_tier:'verified', enrichment_version:V,
  },
  {
    canonical_name:'vinculum group',
    display_name:'Vinculum Group (Omnichannel SaaS)',
    ticker:'VINCULUM', exchange:'NSE',
    industry:'RetailTech / Omnichannel / Order Management / India',
    sector:'Technology', is_public:true, country_code:'IN',
    workforce_count:680, workforce_source:'annual_report', workforce_confidence:0.86,
    market_cap_usd:96_400_000,    // ₹800Cr ÷ 83 | NSE May 2026
    pe_ratio:null,                 // Loss-making growth phase
    revenue_ttm_usd:21_700_000,   // FY2025 ₹180Cr ÷ 83 | P/S=4.4x ✓ RPE=$31.9K ✓
    financials_source:'nse_filing', financials_confidence:0.86,
    recent_layoff_count:0, layoff_confidence:0.82,
    hiring_velocity_score:0.7, total_open_roles:115,
    data_quality_tier:'verified', enrichment_version:V,
  },
  {
    canonical_name:'gokwik checkout',
    display_name:'GoKwik (Checkout & Returns)',
    ticker:null, exchange:null,
    industry:'RetailTech / D2C Checkout Optimization / Returns Management / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:380, workforce_source:'linkedin_scrape', workforce_confidence:0.75,
    market_cap_usd:200_000_000,   // Series C; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:18_000_000,   // Tracxn est FY2025 | P/S=11.1x ✓ RPE=$47.4K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.57,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.75, total_open_roles:65,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'clevertap marketing',
    display_name:'CleverTap (Customer Engagement)',
    ticker:null, exchange:null,
    industry:'MarTech / Customer Lifecycle / Push Notifications / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:1100, workforce_source:'linkedin_scrape', workforce_confidence:0.78,
    market_cap_usd:600_000_000,   // Series D at $775M 2022; Tracxn 2026 est ~$600M
    pe_ratio:null,
    revenue_ttm_usd:90_000_000,   // Tracxn / ET est FY2025 | P/S=6.7x ✓ RPE=$81.8K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.61,
    recent_layoff_count:0, layoff_confidence:0.73,
    hiring_velocity_score:0.7, total_open_roles:165,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'moengage platform',
    display_name:'MoEngage (Marketing Analytics)',
    ticker:null, exchange:null,
    industry:'MarTech / Customer Journey / Mobile Marketing / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:850, workforce_source:'linkedin_scrape', workforce_confidence:0.77,
    market_cap_usd:400_000_000,   // Series F 2022 $77M; Tracxn 2026 est ~$400M
    pe_ratio:null,
    revenue_ttm_usd:50_000_000,   // Tracxn est FY2025 | P/S=8.0x ✓ RPE=$58.8K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.59,
    recent_layoff_count:0, layoff_confidence:0.72,
    hiring_velocity_score:0.7, total_open_roles:135,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'webengage marketing',
    display_name:'WebEngage (Marketing Automation)',
    ticker:null, exchange:null,
    industry:'MarTech / Retention Marketing / Lifecycle Campaigns / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:520, workforce_source:'linkedin_scrape', workforce_confidence:0.76,
    market_cap_usd:200_000_000,   // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:25_000_000,   // Tracxn est FY2025 | P/S=8.0x ✓ RPE=$48.1K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.7, total_open_roles:90,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'increff warehouse',
    display_name:'Increff (Warehouse Intelligence)',
    ticker:null, exchange:null,
    industry:'RetailTech / Warehouse Management / Inventory Optimization / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:320, workforce_source:'linkedin_scrape', workforce_confidence:0.73,
    market_cap_usd:100_000_000,   // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:12_000_000,   // Tracxn est FY2025 | P/S=8.3x ✓ RPE=$37.5K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.7, total_open_roles:65,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'square yards property',
    display_name:'Square Yards (PropTech Marketplace)',
    ticker:null, exchange:null,
    industry:'PropTech / Real Estate Transactions / Mortgage / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:2500, workforce_source:'linkedin_scrape', workforce_confidence:0.78,
    market_cap_usd:300_000_000,   // Pre-IPO; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:80_000_000,   // Tracxn / ET est FY2025 | P/S=3.75x ✓ RPE=$32K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:0, layoff_confidence:0.72,
    hiring_velocity_score:0.65, total_open_roles:280,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'housr coliving',
    display_name:'Housr (Co-Living Premium)',
    ticker:null, exchange:null,
    industry:'PropTech / Premium Co-Living / Managed Hostels / India',
    sector:'Consumer Discretionary', is_public:false, country_code:'IN',
    workforce_count:150, workforce_source:'linkedin_scrape', workforce_confidence:0.71,
    market_cap_usd:50_000_000,    // Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:8_000_000,    // Tracxn est FY2025 | P/S=6.25x ✓ RPE=$53.3K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.52,
    recent_layoff_count:0, layoff_confidence:0.69,
    hiring_velocity_score:0.65, total_open_roles:30,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'colive managed',
    display_name:'Colive (Managed Co-Living)',
    ticker:null, exchange:null,
    industry:'PropTech / Co-Living / Managed Rental / India',
    sector:'Consumer Discretionary', is_public:false, country_code:'IN',
    workforce_count:380, workforce_source:'linkedin_scrape', workforce_confidence:0.74,
    market_cap_usd:100_000_000,   // Series C; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:18_000_000,   // Tracxn est FY2025 | P/S=5.56x ✓ RPE=$47.4K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.6, total_open_roles:55,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'cashify refurb',
    display_name:'Cashify (Refurbished Electronics)',
    ticker:null, exchange:null,
    industry:'Consumer Tech / Refurbished Devices / Recommerce / India',
    sector:'Consumer Discretionary', is_public:false, country_code:'IN',
    workforce_count:1800, workforce_source:'linkedin_scrape', workforce_confidence:0.78,
    market_cap_usd:300_000_000,   // Series E 2022; Tracxn 2026 est ~$300M
    pe_ratio:null,
    revenue_ttm_usd:150_000_000,  // Tracxn / ET est FY2025 | P/S=2.0x ✓ RPE=$83.3K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.61,
    recent_layoff_count:0, layoff_confidence:0.73,
    hiring_velocity_score:0.6, total_open_roles:185,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'juspay payments',
    display_name:'Juspay (Payment Routing)',
    ticker:null, exchange:null,
    industry:'Fintech / Payment Orchestration / UPI / Checkout SDK / India',
    sector:'Financial Technology', is_public:false, country_code:'IN',
    workforce_count:680, workforce_source:'linkedin_scrape', workforce_confidence:0.77,
    market_cap_usd:300_000_000,   // Series C; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:25_000_000,   // Tracxn est FY2025 | P/S=12.0x ✓ RPE=$36.8K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:0, layoff_confidence:0.72,
    hiring_velocity_score:0.75, total_open_roles:110,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'m2p fintech infra',
    display_name:'M2P Fintech (Card Infrastructure)',
    ticker:null, exchange:null,
    industry:'Fintech / Card-as-a-Service / Banking APIs / Prepaid Programs / India',
    sector:'Financial Technology', is_public:false, country_code:'IN',
    workforce_count:750, workforce_source:'linkedin_scrape', workforce_confidence:0.77,
    market_cap_usd:500_000_000,   // Series D 2022; Tracxn 2026 est ~$500M
    pe_ratio:null,
    revenue_ttm_usd:40_000_000,   // Tracxn est FY2025 | P/S=12.5x ✓ RPE=$53.3K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:0, layoff_confidence:0.72,
    hiring_velocity_score:0.75, total_open_roles:130,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'hyperface card',
    display_name:'Hyperface (Credit Card Platform)',
    ticker:null, exchange:null,
    industry:'Fintech / Credit Card-as-a-Service / Co-brand Cards / India',
    sector:'Financial Technology', is_public:false, country_code:'IN',
    workforce_count:180, workforce_source:'linkedin_scrape', workforce_confidence:0.72,
    market_cap_usd:80_000_000,    // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:8_000_000,    // Tracxn est FY2025 | P/S=10.0x ✓ RPE=$44.4K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.53,
    recent_layoff_count:0, layoff_confidence:0.69,
    hiring_velocity_score:0.8, total_open_roles:40,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'decentro banking',
    display_name:'Decentro (Banking-as-a-Service)',
    ticker:null, exchange:null,
    industry:'Fintech / BaaS / Banking APIs / Account Issuance / India',
    sector:'Financial Technology', is_public:false, country_code:'IN',
    workforce_count:220, workforce_source:'linkedin_scrape', workforce_confidence:0.72,
    market_cap_usd:80_000_000,    // Series A; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:6_000_000,    // Tracxn est FY2025 | P/S=13.3x ✓ RPE=$27.3K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.53,
    recent_layoff_count:0, layoff_confidence:0.69,
    hiring_velocity_score:0.8, total_open_roles:45,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'setu api platform',
    display_name:'Setu (Financial API Platform)',
    ticker:null, exchange:null,
    industry:'Fintech / Open Banking APIs / NACH / UPI / India',
    sector:'Financial Technology', is_public:false, country_code:'IN',
    workforce_count:280, workforce_source:'linkedin_scrape', workforce_confidence:0.73,
    market_cap_usd:100_000_000,   // NPCI-backed; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:10_000_000,   // Tracxn est FY2025 | P/S=10.0x ✓ RPE=$35.7K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.8, total_open_roles:60,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'drivex vehicles',
    display_name:'DriveX (Pre-Owned Vehicles)',
    ticker:null, exchange:null,
    industry:'AutoTech / Refurbished Vehicles / Used Bikes & Cars / India',
    sector:'Consumer Discretionary', is_public:false, country_code:'IN',
    workforce_count:580, workforce_source:'linkedin_scrape', workforce_confidence:0.75,
    market_cap_usd:200_000_000,   // Series C; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:45_000_000,   // Tracxn est FY2025 | P/S=4.4x ✓ RPE=$77.6K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.57,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.65, total_open_roles:85,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'clickpost logistics',
    display_name:'Clickpost (Logistics Intelligence)',
    ticker:null, exchange:null,
    industry:'Logistics / Shipment Visibility / Carrier Management / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:280, workforce_source:'linkedin_scrape', workforce_confidence:0.73,
    market_cap_usd:100_000_000,   // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:12_000_000,   // Tracxn est FY2025 | P/S=8.3x ✓ RPE=$42.9K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.75, total_open_roles:55,
    data_quality_tier:'seed', enrichment_version:V,
  },
];

try {
  await runValidatedBatch(pool, 'GT125: India RetailTech, PropTech & Commerce Infra (Sub-$700M, 2026)', V, companies);
} catch(e) { console.error(e.message); process.exit(1); }
finally { await pool.end(); }
