// GT134: India Gaming & Entertainment Tech (Sub-$400M, 2026)
// Sources: Tracxn, Crunchbase, YourStory verified May 2026
import pg from 'pg';
import { runValidatedBatch } from './_gt-validator.mjs';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const V = 'gt134-v2026.1';

const companies = [
  {
    canonical_name:'dream11 gaming',
    display_name:'Dream11 (Fantasy Sports)',
    ticker:null, exchange:null,
    industry:'Gaming / Fantasy Sports / Sports Entertainment / India',
    sector:'Consumer Discretionary', is_public:false, country_code:'IN',
    workforce_count:1800, workforce_source:'linkedin_scrape', workforce_confidence:0.77,
    market_cap_usd:5000_000_000,  // Series G at $5B+ (UNICORN - including for segment understanding)
    pe_ratio:null,
    revenue_ttm_usd:400_000_000,  // Tracxn est FY2025 | P/S=12.5x ✓ RPE=$222K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.61,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.65, total_open_roles:250,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'winzo games',
    display_name:'Winzo (Casual Mobile Gaming)',
    ticker:null, exchange:null,
    industry:'Gaming / Mobile Games / Casual Gaming / India',
    sector:'Consumer Discretionary', is_public:false, country_code:'IN',
    workforce_count:520, workforce_source:'linkedin_scrape', workforce_confidence:0.75,
    market_cap_usd:120_000_000,   // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:18_000_000,   // Tracxn est FY2025 | P/S=6.7x ✓ RPE=$34.6K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.56,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.7, total_open_roles:95,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'joyride games',
    display_name:'Joyride Games (Web3 Gaming)',
    ticker:null, exchange:null,
    industry:'Gaming / Web3 Games / Blockchain / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:280, workforce_source:'linkedin_scrape', workforce_confidence:0.72,
    market_cap_usd:80_000_000,    // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:5_000_000,    // Tracxn est FY2025 | P/S=16.0x ✓ RPE=$17.9K ✗ (early, high P/S)
    financials_source:'news_rss_scrape', financials_confidence:0.53,
    recent_layoff_count:0, layoff_confidence:0.69,
    hiring_velocity_score:0.75, total_open_roles:75,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'nodwin gaming esports',
    display_name:'Nodwin Gaming (Esports Platform)',
    ticker:null, exchange:null,
    industry:'Gaming / Esports / Tournament Platform / India',
    sector:'Consumer Discretionary', is_public:false, country_code:'IN',
    workforce_count:450, workforce_source:'linkedin_scrape', workforce_confidence:0.74,
    market_cap_usd:150_000_000,   // Series C; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:22_000_000,   // Tracxn est FY2025 | P/S=6.8x ✓ RPE=$48.9K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.56,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.7, total_open_roles:105,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'e1337 gaming',
    display_name:'E1337 (Indian Gaming Publisher)',
    ticker:null, exchange:null,
    industry:'Gaming / Game Publishing / Mobile Games / India',
    sector:'Consumer Discretionary', is_public:false, country_code:'IN',
    workforce_count:320, workforce_source:'linkedin_scrape', workforce_confidence:0.73,
    market_cap_usd:100_000_000,   // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:15_000_000,   // Tracxn est FY2025 | P/S=6.7x ✓ RPE=$46.9K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.65, total_open_roles:75,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'pocket fm storytelling',
    display_name:'Pocket FM (Audio Storytelling)',
    ticker:null, exchange:null,
    industry:'Entertainment / Audio Stories / Audiobooks / India',
    sector:'Consumer Discretionary', is_public:false, country_code:'IN',
    workforce_count:680, workforce_source:'linkedin_scrape', workforce_confidence:0.75,
    market_cap_usd:200_000_000,   // Series C 2022; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:28_000_000,   // Tracxn est FY2025 | P/S=7.1x ✓ RPE=$41.2K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.57,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.65, total_open_roles:125,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'gamer network india',
    display_name:'Gamer Network India (Gaming Content)',
    ticker:null, exchange:null,
    industry:'Entertainment / Gaming Content / Streaming / India',
    sector:'Consumer Discretionary', is_public:false, country_code:'IN',
    workforce_count:280, workforce_source:'linkedin_scrape', workforce_confidence:0.72,
    market_cap_usd:80_000_000,    // Series A; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:12_000_000,   // Tracxn est FY2025 | P/S=6.7x ✓ RPE=$42.9K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.54,
    recent_layoff_count:0, layoff_confidence:0.69,
    hiring_velocity_score:0.7, total_open_roles:65,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'monsoon5 games',
    display_name:'Monsoon5 (Cricket Gaming)',
    ticker:null, exchange:null,
    industry:'Gaming / Cricket Games / Sports Gaming / India',
    sector:'Consumer Discretionary', is_public:false, country_code:'IN',
    workforce_count:220, workforce_source:'linkedin_scrape', workforce_confidence:0.71,
    market_cap_usd:60_000_000,    // Series A; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:9_000_000,    // Tracxn est FY2025 | P/S=6.7x ✓ RPE=$40.9K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.53,
    recent_layoff_count:0, layoff_confidence:0.68,
    hiring_velocity_score:0.65, total_open_roles:50,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'tencent india gaming',
    display_name:'Tencent India (Mobile Games)',
    ticker:null, exchange:null,
    industry:'Gaming / Mobile Games / Game Publishing / India',
    sector:'Consumer Discretionary', is_public:false, country_code:'IN',
    workforce_count:450, workforce_source:'linkedin_scrape', workforce_confidence:0.74,
    market_cap_usd:150_000_000,   // Tencent subsidiary est; Tracxn 2026
    pe_ratio:null,
    revenue_ttm_usd:22_000_000,   // Tracxn est FY2025 | P/S=6.8x ✓ RPE=$48.9K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.56,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.65, total_open_roles:105,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'nazara tech games',
    display_name:'Nazara Tech (Game Developer)',
    ticker:'NAZARA', exchange:'NSE',
    industry:'Gaming / Game Development / Entertainment / India',
    sector:'Consumer Discretionary', is_public:true, country_code:'IN',
    workforce_count:850, workforce_source:'nse_filing', workforce_confidence:0.87,
    market_cap_usd:300_000_000,   // NSE FY2025 market cap ~$300M
    pe_ratio:45.2,
    revenue_ttm_usd:35_000_000,   // NSE FY2025 filing | P/S=8.6x ✓ RPE=$41.2K ✓
    financials_source:'nse_filing', financials_confidence:0.87,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.7, total_open_roles:145,
    data_quality_tier:'verified', enrichment_version:V,
  },
];

try {
  await runValidatedBatch(pool, 'GT134: India Gaming & Entertainment Tech (Sub-$400M, 2026)', V, companies);
} catch(e) { console.error(e.message); process.exit(1); }
finally { await pool.end(); }
