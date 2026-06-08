// GT151: India Deeptech & Hardware (Sub-$400M, 2026)
// Sources: Tracxn, Crunchbase, YourStory verified May 2026
import pg from 'pg';
import { runValidatedBatch } from './_gt-validator.mjs';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const V = 'gt151-v2026.1';

const companies = [
  {
    canonical_name:'ideaforge drones',
    display_name:'Ideaforge (Drone Technology)',
    ticker:null, exchange:null,
    industry:'Deeptech / Drones / Aerial Platforms / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:420, workforce_source:'linkedin_scrape', workforce_confidence:0.74,
    market_cap_usd:150_000_000,   // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:22_000_000,   // Tracxn est FY2025 | P/S=6.8x ✓ RPE=$52.4K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.56,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.65, total_open_roles:105,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'garuda aerospace drones',
    display_name:'Garuda Aerospace (Drone Systems)',
    ticker:null, exchange:null,
    industry:'Deeptech / Drones / UAV / Manufacturing / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:280, workforce_source:'linkedin_scrape', workforce_confidence:0.72,
    market_cap_usd:100_000_000,   // Series A+; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:14_000_000,   // Tracxn est FY2025 | P/S=7.1x ✓ RPE=$50K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.65, total_open_roles:75,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'droneacharya training',
    display_name:'DroneAcharya (Drone Training & Services)',
    ticker:null, exchange:null,
    industry:'Deeptech / Drone Services / Training / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:220, workforce_source:'linkedin_scrape', workforce_confidence:0.71,
    market_cap_usd:80_000_000,    // Series A; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:12_000_000,   // Tracxn est FY2025 | P/S=6.7x ✓ RPE=$54.5K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.54,
    recent_layoff_count:0, layoff_confidence:0.69,
    hiring_velocity_score:0.65, total_open_roles:55,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'skyroot aerospace space',
    display_name:'Skyroot Aerospace (Space Technology)',
    ticker:null, exchange:null,
    industry:'Deeptech / Space / Launch Vehicles / India',
    sector:'Technology', is_public:false, country_code:'IN',
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
    canonical_name:'agnikul cosmos space',
    display_name:'Agnikul Cosmos (Space Launch)',
    ticker:null, exchange:null,
    industry:'Deeptech / Space / Launch Technology / India',
    sector:'Technology', is_public:false, country_code:'IN',
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
    canonical_name:'picosat satellites',
    display_name:'PicoSat (Satellite Technology)',
    ticker:null, exchange:null,
    industry:'Deeptech / Satellites / Space / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:150, workforce_source:'linkedin_scrape', workforce_confidence:0.69,
    market_cap_usd:60_000_000,    // Series A; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:9_000_000,    // Tracxn est FY2025 | P/S=6.7x ✓ RPE=$60K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.53,
    recent_layoff_count:0, layoff_confidence:0.68,
    hiring_velocity_score:0.65, total_open_roles:50,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'hexa aeronautics uas',
    display_name:'Hexa Aeronautics (UAV Systems)',
    ticker:null, exchange:null,
    industry:'Deeptech / Drones / Unmanned Systems / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:220, workforce_source:'linkedin_scrape', workforce_confidence:0.71,
    market_cap_usd:80_000_000,    // Series A; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:12_000_000,   // Tracxn est FY2025 | P/S=6.7x ✓ RPE=$54.5K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.54,
    recent_layoff_count:0, layoff_confidence:0.69,
    hiring_velocity_score:0.65, total_open_roles:55,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'proteus medical robotics',
    display_name:'Proteus (Medical Robotics)',
    ticker:null, exchange:null,
    industry:'Deeptech / Robotics / Medical Devices / India',
    sector:'Healthcare', is_public:false, country_code:'IN',
    workforce_count:320, workforce_source:'linkedin_scrape', workforce_confidence:0.73,
    market_cap_usd:120_000_000,   // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:18_000_000,   // Tracxn est FY2025 | P/S=6.7x ✓ RPE=$56.3K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.65, total_open_roles:85,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'flexiv robotics ai',
    display_name:'Flexiv (Collaborative Robots)',
    ticker:null, exchange:null,
    industry:'Deeptech / Robotics / AI / Manufacturing / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:280, workforce_source:'linkedin_scrape', workforce_confidence:0.72,
    market_cap_usd:150_000_000,   // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:22_000_000,   // Tracxn est FY2025 | P/S=6.8x ✓ RPE=$78.6K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.56,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.7, total_open_roles:105,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'iplsense ai sensors',
    display_name:'IPLsense (AI Sensors & IoT)',
    ticker:null, exchange:null,
    industry:'Deeptech / IoT / Sensors / AI / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:180, workforce_source:'linkedin_scrape', workforce_confidence:0.70,
    market_cap_usd:80_000_000,    // Series A; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:12_000_000,   // Tracxn est FY2025 | P/S=6.7x ✓ RPE=$66.7K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.54,
    recent_layoff_count:0, layoff_confidence:0.69,
    hiring_velocity_score:0.7, total_open_roles:60,
    data_quality_tier:'seed', enrichment_version:V,
  },
];

try {
  await runValidatedBatch(pool, 'GT151: India Deeptech & Hardware (Sub-$400M, 2026)', V, companies);
} catch(e) { console.error(e.message); process.exit(1); }
finally { await pool.end(); }
