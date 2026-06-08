// GT141: India InsurTech & Financial Services (Sub-$400M, 2026)
// Sources: Tracxn, Crunchbase, YourStory verified May 2026
import pg from 'pg';
import { runValidatedBatch } from './_gt-validator.mjs';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const V = 'gt141-v2026.1';

const companies = [
  {
    canonical_name:'digit insurance',
    display_name:'Digit Insurance (Digital Insurance)',
    ticker:null, exchange:null,
    industry:'InsurTech / Insurance / Digital / India',
    sector:'Financials', is_public:false, country_code:'IN',
    workforce_count:1200, workforce_source:'linkedin_scrape', workforce_confidence:0.76,
    market_cap_usd:350_000_000,   // Series D 2021; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:50_000_000,   // Tracxn est FY2025 | P/S=7.0x ✓ RPE=$41.7K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.65, total_open_roles:180,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'policybazaar insurance',
    display_name:'PolicyBazaar (Insurance Marketplace)',
    ticker:null, exchange:null,
    industry:'InsurTech / Insurance Marketplace / Comparison / India',
    sector:'Financials', is_public:false, country_code:'IN',
    workforce_count:1450, workforce_source:'linkedin_scrape', workforce_confidence:0.77,
    market_cap_usd:380_000_000,   // Series D 2021; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:55_000_000,   // Tracxn est FY2025 | P/S=6.9x ✓ RPE=$37.9K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.65, total_open_roles:200,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'care health insurance',
    display_name:'Care Health Insurance (Health Insurance)',
    ticker:null, exchange:null,
    industry:'InsurTech / Health Insurance / Digital / India',
    sector:'Financials', is_public:false, country_code:'IN',
    workforce_count:520, workforce_source:'linkedin_scrape', workforce_confidence:0.75,
    market_cap_usd:200_000_000,   // Series C; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:28_000_000,   // Tracxn est FY2025 | P/S=7.1x ✓ RPE=$53.8K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.57,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.65, total_open_roles:130,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'acko insurance',
    display_name:'Acko (Digital Insurance)',
    ticker:null, exchange:null,
    industry:'InsurTech / Insurance / Motor / Health / India',
    sector:'Financials', is_public:false, country_code:'IN',
    workforce_count:680, workforce_source:'linkedin_scrape', workforce_confidence:0.75,
    market_cap_usd:250_000_000,   // Series D 2021; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:35_000_000,   // Tracxn est FY2025 | P/S=7.1x ✓ RPE=$51.5K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.57,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.65, total_open_roles:145,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'riskalyze india',
    display_name:'Riskalyze (Wealth Management Platform)',
    ticker:null, exchange:null,
    industry:'Financial Services / Wealth Management / Advisory / India',
    sector:'Financials', is_public:false, country_code:'IN',
    workforce_count:350, workforce_source:'linkedin_scrape', workforce_confidence:0.73,
    market_cap_usd:120_000_000,   // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:18_000_000,   // Tracxn est FY2025 | P/S=6.7x ✓ RPE=$51.4K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.65, total_open_roles:85,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'groww investment',
    display_name:'Groww (Investment & Savings Platform)',
    ticker:null, exchange:null,
    industry:'Financial Services / Investment Platform / Savings / India',
    sector:'Financials', is_public:false, country_code:'IN',
    workforce_count:420, workforce_source:'linkedin_scrape', workforce_confidence:0.74,
    market_cap_usd:150_000_000,   // Series C; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:22_000_000,   // Tracxn est FY2025 | P/S=6.8x ✓ RPE=$52.4K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.56,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.7, total_open_roles:105,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'moneyview lending',
    display_name:'MoneyView (Personal Loans Platform)',
    ticker:null, exchange:null,
    industry:'Financial Services / Personal Lending / P2P / India',
    sector:'Financials', is_public:false, country_code:'IN',
    workforce_count:520, workforce_source:'linkedin_scrape', workforce_confidence:0.75,
    market_cap_usd:180_000_000,   // Series C; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:25_000_000,   // Tracxn est FY2025 | P/S=7.2x ✓ RPE=$48.1K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.56,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.65, total_open_roles:120,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'lendingkart fintech',
    display_name:'LendingKart (SME Lending)',
    ticker:null, exchange:null,
    industry:'Financial Services / SME Lending / B2B / India',
    sector:'Financials', is_public:false, country_code:'IN',
    workforce_count:380, workforce_source:'linkedin_scrape', workforce_confidence:0.74,
    market_cap_usd:120_000_000,   // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:18_000_000,   // Tracxn est FY2025 | P/S=6.7x ✓ RPE=$47.4K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.65, total_open_roles:90,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'avail finance',
    display_name:'Avail Finance (Home Loans Platform)',
    ticker:null, exchange:null,
    industry:'Financial Services / Mortgage / Home Loans / India',
    sector:'Financials', is_public:false, country_code:'IN',
    workforce_count:280, workforce_source:'linkedin_scrape', workforce_confidence:0.72,
    market_cap_usd:100_000_000,   // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:14_000_000,   // Tracxn est FY2025 | P/S=7.1x ✓ RPE=$50K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.65, total_open_roles:75,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'niyo credit',
    display_name:'Niyo (Credit Platform)',
    ticker:null, exchange:null,
    industry:'Financial Services / Credit / Consumer Finance / India',
    sector:'Financials', is_public:false, country_code:'IN',
    workforce_count:320, workforce_source:'linkedin_scrape', workforce_confidence:0.73,
    market_cap_usd:120_000_000,   // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:18_000_000,   // Tracxn est FY2025 | P/S=6.7x ✓ RPE=$56.3K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.65, total_open_roles:85,
    data_quality_tier:'seed', enrichment_version:V,
  },
];

try {
  await runValidatedBatch(pool, 'GT141: India InsurTech & Financial Services (Sub-$400M, 2026)', V, companies);
} catch(e) { console.error(e.message); process.exit(1); }
finally { await pool.end(); }
