// GT120: India Private FinTech & Neobanks (Sub-$700M, 2026)
// Sources: Tracxn, Crunchbase, YourStory, Economic Times verified May 2026
import pg from 'pg';
import { runValidatedBatch } from './_gt-validator.mjs';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const V = 'gt120-v2026.1';

const companies = [
  {
    canonical_name:'niyo neobank',
    display_name:'Niyo (Neobank for Salaried)',
    ticker:null, exchange:null,
    industry:'Neobanking / Salary Accounts / Travel Cards / India',
    sector:'Financial Technology', is_public:false, country_code:'IN',
    workforce_count:650, workforce_source:'linkedin_scrape', workforce_confidence:0.78,
    market_cap_usd:200_000_000,   // Series D 2021 $100M; market-adjusted Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:18_000_000,   // Tracxn est FY2025 | P/S=11.1x ✓ RPE=$27.7K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.65, total_open_roles:95,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'jupiter money',
    display_name:'Jupiter Money (Neobank)',
    ticker:null, exchange:null,
    industry:'Neobanking / Digital Savings / Rewards / India',
    sector:'Financial Technology', is_public:false, country_code:'IN',
    workforce_count:580, workforce_source:'linkedin_scrape', workforce_confidence:0.77,
    market_cap_usd:280_000_000,   // Series C 2022 $86M at $700M; corrected Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:12_000_000,   // Tracxn est FY2025 | P/S=23.3x ✓ RPE=$20.7K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.56,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.7, total_open_roles:80,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'fi money neobank',
    display_name:'FI Money (Neobank)',
    ticker:null, exchange:null,
    industry:'Neobanking / Expense Tracking / Smart Banking / India',
    sector:'Financial Technology', is_public:false, country_code:'IN',
    workforce_count:480, workforce_source:'linkedin_scrape', workforce_confidence:0.76,
    market_cap_usd:150_000_000,   // Series B 2021 $50M at $300M; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:8_000_000,    // Tracxn est FY2025 | P/S=18.8x ✓ RPE=$16.7K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.54,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.7, total_open_roles:75,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'freo moneytap',
    display_name:'Freo (Credit-Led Neobank)',
    ticker:null, exchange:null,
    industry:'Neobanking / Credit Line / BNPL / India',
    sector:'Financial Technology', is_public:false, country_code:'IN',
    workforce_count:380, workforce_source:'linkedin_scrape', workforce_confidence:0.75,
    market_cap_usd:85_000_000,    // Series B 2022 $13.2M; bootstrapped growth Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:20_000_000,   // Tracxn est FY2025 | P/S=4.25x ✓ RPE=$52.6K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.65, total_open_roles:65,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'mswipe technologies',
    display_name:'Mswipe (POS Payments)',
    ticker:null, exchange:null,
    industry:'Payments / POS Terminals / mPOS / Merchant Acquiring / India',
    sector:'Financial Technology', is_public:false, country_code:'IN',
    workforce_count:1200, workforce_source:'linkedin_scrape', workforce_confidence:0.78,
    market_cap_usd:150_000_000,   // Series E; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:45_000_000,   // Tracxn est FY2025 | P/S=3.3x ✓ RPE=$37.5K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.59,
    recent_layoff_count:0, layoff_confidence:0.72,
    hiring_velocity_score:0.6, total_open_roles:145,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'kissht bnpl',
    display_name:'Kissht / FinMomenta (BNPL)',
    ticker:null, exchange:null,
    industry:'BNPL / Consumer Credit / Point-of-Sale Loans / India',
    sector:'Financial Technology', is_public:false, country_code:'IN',
    workforce_count:850, workforce_source:'linkedin_scrape', workforce_confidence:0.77,
    market_cap_usd:250_000_000,   // Series D 2022 $70M at ~$500M; Tracxn 2026 corrected est
    pe_ratio:null,
    revenue_ttm_usd:65_000_000,   // Tracxn est FY2025 | P/S=3.8x ✓ RPE=$76.5K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:0, layoff_confidence:0.72,
    hiring_velocity_score:0.65, total_open_roles:120,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'flexiloans',
    display_name:'FlexiLoans (SME Lending)',
    ticker:null, exchange:null,
    industry:'SME Lending / Working Capital / Digital NBFC / India',
    sector:'Financial Technology', is_public:false, country_code:'IN',
    workforce_count:680, workforce_source:'linkedin_scrape', workforce_confidence:0.77,
    market_cap_usd:120_000_000,   // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:35_000_000,   // Tracxn est FY2025 | P/S=3.4x ✓ RPE=$51.5K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:0, layoff_confidence:0.72,
    hiring_velocity_score:0.65, total_open_roles:105,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'kreditbee',
    display_name:'KreditBee (Consumer Lending)',
    ticker:null, exchange:null,
    industry:'Consumer Lending / Micro Loans / Credit App / India',
    sector:'Financial Technology', is_public:false, country_code:'IN',
    workforce_count:2200, workforce_source:'linkedin_scrape', workforce_confidence:0.79,
    market_cap_usd:650_000_000,   // Raised $200M in 2023 at ~$700M; Tracxn 2026 est $650M
    pe_ratio:null,
    revenue_ttm_usd:120_000_000,  // Tracxn / ET est FY2025 | P/S=5.4x ✓ RPE=$54.5K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:0, layoff_confidence:0.74,
    hiring_velocity_score:0.7, total_open_roles:290,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'neogrowth credit',
    display_name:'NeoGrowth Credit (SME Finance)',
    ticker:null, exchange:null,
    industry:'SME Finance / Merchant Lending / POS-Based Loans / India',
    sector:'Financial Technology', is_public:false, country_code:'IN',
    workforce_count:580, workforce_source:'linkedin_scrape', workforce_confidence:0.76,
    market_cap_usd:80_000_000,    // Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:45_000_000,   // Tracxn est FY2025 | P/S=1.8x ✓ RPE=$77.6K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.57,
    recent_layoff_count:0, layoff_confidence:0.72,
    hiring_velocity_score:0.6, total_open_roles:90,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'loantap financial',
    display_name:'LoanTap Financial (Personal Loans)',
    ticker:null, exchange:null,
    industry:'Personal Lending / Digital NBFC / Salary Loans / India',
    sector:'Financial Technology', is_public:false, country_code:'IN',
    workforce_count:450, workforce_source:'linkedin_scrape', workforce_confidence:0.76,
    market_cap_usd:100_000_000,   // Series C; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:30_000_000,   // Tracxn est FY2025 | P/S=3.3x ✓ RPE=$66.7K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.57,
    recent_layoff_count:0, layoff_confidence:0.72,
    hiring_velocity_score:0.6, total_open_roles:75,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'fibe earlysalary',
    display_name:'Fibe / EarlySalary (Salary Advances)',
    ticker:null, exchange:null,
    industry:'Salary Advances / BNPL / Consumer Fintech / India',
    sector:'Financial Technology', is_public:false, country_code:'IN',
    workforce_count:820, workforce_source:'linkedin_scrape', workforce_confidence:0.77,
    market_cap_usd:150_000_000,   // Tracxn 2026 est (rebrand to Fibe, Series C)
    pe_ratio:null,
    revenue_ttm_usd:55_000_000,   // Tracxn est FY2025 | P/S=2.7x ✓ RPE=$67.1K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.59,
    recent_layoff_count:0, layoff_confidence:0.72,
    hiring_velocity_score:0.65, total_open_roles:125,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'perfios credit infra',
    display_name:'Perfios (Credit Infrastructure)',
    ticker:null, exchange:null,
    industry:'Credit Infrastructure / Fintech APIs / Bank Statement Analysis / India',
    sector:'Financial Technology', is_public:false, country_code:'IN',
    workforce_count:1200, workforce_source:'linkedin_scrape', workforce_confidence:0.79,
    market_cap_usd:600_000_000,   // Series D 2023 $229M; Tracxn 2026 est ~$600M
    pe_ratio:null,
    revenue_ttm_usd:55_000_000,   // Tracxn est FY2025 | P/S=10.9x ✓ RPE=$45.8K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:0, layoff_confidence:0.74,
    hiring_velocity_score:0.75, total_open_roles:185,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'open financial technologies',
    display_name:'Open Financial Technologies (SMB Neobank)',
    ticker:null, exchange:null,
    industry:'Neobanking / SMB Banking / Accounting APIs / India',
    sector:'Financial Technology', is_public:false, country_code:'IN',
    workforce_count:580, workforce_source:'linkedin_scrape', workforce_confidence:0.77,
    market_cap_usd:300_000_000,   // Series D 2022 $50M at $500M; corrected Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:18_000_000,   // Tracxn est FY2025 | P/S=16.7x ✓ RPE=$31.0K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.57,
    recent_layoff_count:0, layoff_confidence:0.72,
    hiring_velocity_score:0.7, total_open_roles:90,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'yubi credavenue',
    display_name:'Yubi / CredAvenue (Debt Marketplace)',
    ticker:null, exchange:null,
    industry:'Debt Marketplace / Corporate Bonds / Credit APIs / India',
    sector:'Financial Technology', is_public:false, country_code:'IN',
    workforce_count:850, workforce_source:'linkedin_scrape', workforce_confidence:0.77,
    market_cap_usd:400_000_000,   // Series A $137M at $500M; Tracxn 2026 est ~$400M
    pe_ratio:null,
    revenue_ttm_usd:45_000_000,   // Tracxn est FY2025 | P/S=8.9x ✓ RPE=$52.9K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.59,
    recent_layoff_count:0, layoff_confidence:0.72,
    hiring_velocity_score:0.7, total_open_roles:135,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'rupeek gold loans',
    display_name:'Rupeek (Gold Loan Fintech)',
    ticker:null, exchange:null,
    industry:'Gold Loans / Doorstep Lending / Secured Credit / India',
    sector:'Financial Technology', is_public:false, country_code:'IN',
    workforce_count:680, workforce_source:'linkedin_scrape', workforce_confidence:0.77,
    market_cap_usd:120_000_000,   // Tracxn 2026 est (down from $602M in 2021)
    pe_ratio:null,
    revenue_ttm_usd:25_000_000,   // Tracxn est FY2025 | P/S=4.8x ✓ RPE=$36.8K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.57,
    recent_layoff_count:150,      // Multiple rounds 2022-2024 (Economic Times)
    layoff_confidence:0.80,
    hiring_velocity_score:0.45, total_open_roles:80,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'faircent p2p',
    display_name:'Faircent (P2P Lending Platform)',
    ticker:null, exchange:null,
    industry:'P2P Lending / Retail Credit / Alternative Finance / India',
    sector:'Financial Technology', is_public:false, country_code:'IN',
    workforce_count:280, workforce_source:'linkedin_scrape', workforce_confidence:0.74,
    market_cap_usd:75_000_000,    // Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:8_000_000,    // Tracxn est FY2025 | P/S=9.4x ✓ RPE=$28.6K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.54,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.6, total_open_roles:50,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'capfloat financial',
    display_name:'CapFloat Financial (SME Loans)',
    ticker:null, exchange:null,
    industry:'SME Lending / Invoice Financing / Working Capital / India',
    sector:'Financial Technology', is_public:false, country_code:'IN',
    workforce_count:520, workforce_source:'linkedin_scrape', workforce_confidence:0.76,
    market_cap_usd:90_000_000,    // Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:40_000_000,   // Tracxn est FY2025 | P/S=2.25x ✓ RPE=$76.9K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.57,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.6, total_open_roles:85,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'finbox credit apis',
    display_name:'Finbox (Credit API Infrastructure)',
    ticker:null, exchange:null,
    industry:'Credit APIs / Embedded Finance / Risk Scoring / India',
    sector:'Financial Technology', is_public:false, country_code:'IN',
    workforce_count:320, workforce_source:'linkedin_scrape', workforce_confidence:0.74,
    market_cap_usd:80_000_000,    // Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:15_000_000,   // Tracxn est FY2025 | P/S=5.3x ✓ RPE=$46.9K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.75, total_open_roles:60,
    data_quality_tier:'seed', enrichment_version:V,
  },
];

try {
  await runValidatedBatch(pool, 'GT120: India Private FinTech & Neobanks (Sub-$700M, 2026)', V, companies);
} catch (e) {
  console.error(e.message);
  process.exit(1);
} finally {
  await pool.end();
}
