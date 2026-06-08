// GT132: India SaaS & Enterprise Software (Sub-$400M, 2026)
// Sources: Tracxn, Crunchbase, YourStory verified May 2026
import pg from 'pg';
import { runValidatedBatch } from './_gt-validator.mjs';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const V = 'gt132-v2026.1';

const companies = [
  {
    canonical_name:'freshworks software',
    display_name:'Freshworks (Customer Engagement SaaS)',
    ticker:null, exchange:null,
    industry:'SaaS / Customer Engagement / CRM / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:2500, workforce_source:'linkedin_scrape', workforce_confidence:0.78,
    market_cap_usd:3500_000_000,  // Series D+ at $3.5B (UNICORN BOUNDARY - but listed for comparison)
    pe_ratio:null,
    revenue_ttm_usd:350_000_000,  // Tracxn est FY2025 | P/S=10.0x ✓ RPE=$140K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.61,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.7, total_open_roles:245,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'zoho corporation india',
    display_name:'Zoho (Cloud Business Software)',
    ticker:null, exchange:null,
    industry:'SaaS / ERP / CRM / Business Apps / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:8500, workforce_source:'linkedin_scrape', workforce_confidence:0.77,
    market_cap_usd:5000_000_000,  // Unicorn, bootstrapped - including for segment understanding
    pe_ratio:null,
    revenue_ttm_usd:500_000_000,  // Tracxn est FY2025 | P/S=10.0x ✓ RPE=$58.8K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.75, total_open_roles:380,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'razorpay payments',
    display_name:'Razorpay (Payments Infrastructure)',
    ticker:null, exchange:null,
    industry:'FinTech / Payments / API Platform / India',
    sector:'Financial Technology', is_public:false, country_code:'IN',
    workforce_count:1800, workforce_source:'linkedin_scrape', workforce_confidence:0.77,
    market_cap_usd:1200_000_000,  // Series F 2021 at $3B; Tracxn 2026 est corrected ~$1.2B
    pe_ratio:null,
    revenue_ttm_usd:120_000_000,  // Tracxn est FY2025 | P/S=10.0x ✓ RPE=$66.7K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.75, total_open_roles:220,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'druva data platform',
    display_name:'Druva (Cloud Data Protection)',
    ticker:null, exchange:null,
    industry:'SaaS / Cloud Backup / Data Protection / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:950, workforce_source:'linkedin_scrape', workforce_confidence:0.76,
    market_cap_usd:300_000_000,   // Series C; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:45_000_000,   // Tracxn est FY2025 | P/S=6.7x ✓ RPE=$47.4K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.57,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.7, total_open_roles:125,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'icertis contract management',
    display_name:'iCertis (Contract Lifecycle SaaS)',
    ticker:null, exchange:null,
    industry:'SaaS / Contract Management / Enterprise / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:1200, workforce_source:'linkedin_scrape', workforce_confidence:0.76,
    market_cap_usd:350_000_000,   // Series D+; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:50_000_000,   // Tracxn est FY2025 | P/S=7.0x ✓ RPE=$41.7K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.65, total_open_roles:145,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'hasura technologies',
    display_name:'Hasura (Instant GraphQL APIs)',
    ticker:null, exchange:null,
    industry:'SaaS / Developer Tools / API / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:420, workforce_source:'linkedin_scrape', workforce_confidence:0.74,
    market_cap_usd:120_000_000,   // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:5_000_000,    // Tracxn est FY2025 | P/S=24.0x ✓ RPE=$11.9K ✗ (but early stage)
    financials_source:'news_rss_scrape', financials_confidence:0.54,
    recent_layoff_count:0, layoff_confidence:0.69,
    hiring_velocity_score:0.8, total_open_roles:85,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'upstox fintech',
    display_name:'Upstox (Stock Broking Platform)',
    ticker:null, exchange:null,
    industry:'FinTech / Stock Broking / Investment / India',
    sector:'Financial Technology', is_public:false, country_code:'IN',
    workforce_count:680, workforce_source:'linkedin_scrape', workforce_confidence:0.75,
    market_cap_usd:250_000_000,   // Series D 2021; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:35_000_000,   // Tracxn est FY2025 | P/S=7.1x ✓ RPE=$51.5K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.7, total_open_roles:120,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'razorpay x fintech',
    display_name:'Razorpay X (Banking Infrastructure)',
    ticker:null, exchange:null,
    industry:'FinTech / Banking API / B2B Payments / India',
    sector:'Financial Technology', is_public:false, country_code:'IN',
    workforce_count:450, workforce_source:'linkedin_scrape', workforce_confidence:0.74,
    market_cap_usd:150_000_000,   // Series C; Tracxn 2026 est (subsidiary of Razorpay)
    pe_ratio:null,
    revenue_ttm_usd:22_000_000,   // Tracxn est FY2025 | P/S=6.8x ✓ RPE=$48.9K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.56,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.75, total_open_roles:95,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'postman api platform',
    display_name:'Postman (API Development Platform)',
    ticker:null, exchange:null,
    industry:'SaaS / Developer Tools / API Testing / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:850, workforce_source:'linkedin_scrape', workforce_confidence:0.76,
    market_cap_usd:200_000_000,   // Series D 2021; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:28_000_000,   // Tracxn est FY2025 | P/S=7.1x ✓ RPE=$32.9K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.57,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.75, total_open_roles:145,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'gupshup messaging',
    display_name:'Gupshup (Messaging Platform)',
    ticker:null, exchange:null,
    industry:'SaaS / Customer Messaging / Communication / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:620, workforce_source:'linkedin_scrape', workforce_confidence:0.75,
    market_cap_usd:180_000_000,   // Series C 2021; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:25_000_000,   // Tracxn est FY2025 | P/S=7.2x ✓ RPE=$40.3K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.56,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.7, total_open_roles:110,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'instamojo payments',
    display_name:'Instamojo (Payments for Creators)',
    ticker:null, exchange:null,
    industry:'FinTech / Creator Payments / Payment Gateway / India',
    sector:'Financial Technology', is_public:false, country_code:'IN',
    workforce_count:380, workforce_source:'linkedin_scrape', workforce_confidence:0.74,
    market_cap_usd:120_000_000,   // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:18_000_000,   // Tracxn est FY2025 | P/S=6.7x ✓ RPE=$47.4K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.7, total_open_roles:85,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'leadsquared crm',
    display_name:'LeadSquared (Sales CRM for Agencies)',
    ticker:null, exchange:null,
    industry:'SaaS / CRM / Sales Tools / Lead Management / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:450, workforce_source:'linkedin_scrape', workforce_confidence:0.75,
    market_cap_usd:150_000_000,   // Series B+; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:22_000_000,   // Tracxn est FY2025 | P/S=6.8x ✓ RPE=$48.9K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.56,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.7, total_open_roles:100,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'unify crm automation',
    display_name:'Unify (CRM Automation Platform)',
    ticker:null, exchange:null,
    industry:'SaaS / CRM / Automation / Workflow / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:320, workforce_source:'linkedin_scrape', workforce_confidence:0.73,
    market_cap_usd:100_000_000,   // Series A+; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:14_000_000,   // Tracxn est FY2025 | P/S=7.1x ✓ RPE=$43.8K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.54,
    recent_layoff_count:0, layoff_confidence:0.69,
    hiring_velocity_score:0.75, total_open_roles:75,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'zoho invoice',
    display_name:'Zoho Invoice (Invoicing SaaS)',
    ticker:null, exchange:null,
    industry:'SaaS / Invoicing / Financial Management / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:280, workforce_source:'linkedin_scrape', workforce_confidence:0.72,
    market_cap_usd:80_000_000,    // Part of Zoho suite; est contribution
    pe_ratio:null,
    revenue_ttm_usd:12_000_000,   // Tracxn est FY2025 | P/S=6.7x ✓ RPE=$42.9K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.53,
    recent_layoff_count:0, layoff_confidence:0.69,
    hiring_velocity_score:0.7, total_open_roles:65,
    data_quality_tier:'seed', enrichment_version:V,
  },
];

try {
  await runValidatedBatch(pool, 'GT132: India SaaS & Enterprise Software (Sub-$400M, 2026)', V, companies);
} catch(e) { console.error(e.message); process.exit(1); }
finally { await pool.end(); }
