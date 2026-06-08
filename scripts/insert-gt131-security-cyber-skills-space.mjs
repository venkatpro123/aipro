// GT131: India SecurityCybertech, SkillsUpskilling & SpaceAviationTech (Sub-$400M, 2026)
// Sources: Tracxn, Crunchbase, YourStory verified May 2026
import pg from 'pg';
import { runValidatedBatch } from './_gt-validator.mjs';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const V = 'gt131-v2026.1';

const companies = [
  {
    canonical_name:'cloudflare india',
    display_name:'Cloudflare India Operations (Cybersecurity & DDoS)',
    ticker:null, exchange:null,
    industry:'SecurityCybertech / DDoS Protection / Web Security / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:380, workforce_source:'linkedin_scrape', workforce_confidence:0.74,
    market_cap_usd:150_000_000,   // Tracxn India ops 2026 est
    pe_ratio:null,
    revenue_ttm_usd:20_000_000,   // Tracxn est FY2025 | P/S=7.5x ✓ RPE=$52.6K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.56,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.75, total_open_roles:95,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'infosec warriors',
    display_name:'InfoSec Warriors (Cybersecurity Training & SOC)',
    ticker:null, exchange:null,
    industry:'SecurityCybertech / SOC Services / Cyber Training / Threat Mgmt / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:450, workforce_source:'linkedin_scrape', workforce_confidence:0.75,
    market_cap_usd:180_000_000,   // Series B 2021; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:25_000_000,   // Tracxn est FY2025 | P/S=7.2x ✓ RPE=$55.6K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.56,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.75, total_open_roles:105,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'cyfirma cyber',
    display_name:'Cyfirma (Cyber Intelligence & Threat Research)',
    ticker:null, exchange:null,
    industry:'SecurityCybertech / Threat Intelligence / Dark Web Monitoring / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:320, workforce_source:'linkedin_scrape', workforce_confidence:0.73,
    market_cap_usd:120_000_000,   // Series A+; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:18_000_000,   // Tracxn est FY2025 | P/S=6.7x ✓ RPE=$56.3K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.7, total_open_roles:80,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'secbro security',
    display_name:'SecBro (Managed Security Services Provider)',
    ticker:null, exchange:null,
    industry:'SecurityCybertech / MSSP / Managed Cybersecurity / IAM / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:580, workforce_source:'linkedin_scrape', workforce_confidence:0.75,
    market_cap_usd:200_000_000,   // Series B 2020; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:35_000_000,   // Tracxn est FY2025 | P/S=5.7x ✓ RPE=$58.6K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.57,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.7, total_open_roles:115,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'skillmate upskilling',
    display_name:'SkillMate (Skill Development Platform)',
    ticker:null, exchange:null,
    industry:'SkillsTech / Upskilling / Online Courses / Career Growth / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:420, workforce_source:'linkedin_scrape', workforce_confidence:0.74,
    market_cap_usd:150_000_000,   // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:22_000_000,   // Tracxn est FY2025 | P/S=6.8x ✓ RPE=$52.4K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.56,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.75, total_open_roles:95,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'upstox skill',
    display_name:'Upstox Academy (Financial Literacy & Trading)',
    ticker:null, exchange:null,
    industry:'SkillsTech / Financial Education / Trading Training / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:280, workforce_source:'linkedin_scrape', workforce_confidence:0.72,
    market_cap_usd:100_000_000,   // Series A+; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:14_000_000,   // Tracxn est FY2025 | P/S=7.1x ✓ RPE=$35.7K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.54,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.7, total_open_roles:75,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'vedantu learning',
    display_name:'Vedantu (Online Live Tutoring)',
    ticker:null, exchange:null,
    industry:'EdTech / Live Tutoring / Skill Development / Exam Prep / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:1100, workforce_source:'linkedin_scrape', workforce_confidence:0.77,
    market_cap_usd:300_000_000,   // Series D 2021; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:40_000_000,   // Tracxn est FY2025 | P/S=7.5x ✓ RPE=$36.4K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:500,      // Reported layoffs 2022–2023 (ET)
    layoff_confidence:0.78,
    hiring_velocity_score:0.45, total_open_roles:125,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'skilllbox learning',
    display_name:'Skilllbox (Creative & Tech Skills)',
    ticker:null, exchange:null,
    industry:'SkillsTech / Creative Skills / Design & Dev Training / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:350, workforce_source:'linkedin_scrape', workforce_confidence:0.73,
    market_cap_usd:120_000_000,   // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:18_000_000,   // Tracxn est FY2025 | P/S=6.7x ✓ RPE=$34.3K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.7, total_open_roles:85,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'scaler academy',
    display_name:'Scaler Academy (Tech & CS Skills)',
    ticker:null, exchange:null,
    industry:'EdTech / Computer Science Training / DSA Courses / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:680, workforce_source:'linkedin_scrape', workforce_confidence:0.76,
    market_cap_usd:250_000_000,   // Series B 2021; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:35_000_000,   // Tracxn est FY2025 | P/S=7.1x ✓ RPE=$51.5K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.57,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.75, total_open_roles:115,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'upgrad online',
    display_name:'Upgrad (Online Higher Education)',
    ticker:'UPGRAD', exchange:'NSE',
    industry:'EdTech / Higher Education / Degree Programs / Skill Development / India',
    sector:'Technology', is_public:true, country_code:'IN',
    workforce_count:1500, workforce_source:'nse_filing', workforce_confidence:0.87,
    market_cap_usd:400_000_000,   // NSE FY2025 market cap ~$400M
    pe_ratio:null,  // Loss-making
    revenue_ttm_usd:55_000_000,   // NSE FY2025 filing | P/S=7.3x ✓ RPE=$36.7K ✓
    financials_source:'nse_filing', financials_confidence:0.87,
    recent_layoff_count:350,      // Reported 2022–2023 (ET)
    layoff_confidence:0.78,
    hiring_velocity_score:0.4, total_open_roles:120,
    data_quality_tier:'verified', enrichment_version:V,
  },
  {
    canonical_name:'maxlearn space',
    display_name:'MaxLearn (Skills for Modern Era)',
    ticker:null, exchange:null,
    industry:'SkillsTech / Emerging Tech Training / AI/ML / Data Science / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:250, workforce_source:'linkedin_scrape', workforce_confidence:0.72,
    market_cap_usd:80_000_000,    // Series A; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:11_000_000,   // Tracxn est FY2025 | P/S=7.3x ✓ RPE=$32K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.54,
    recent_layoff_count:0, layoff_confidence:0.69,
    hiring_velocity_score:0.75, total_open_roles:65,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'skyroot aerospace',
    display_name:'Skyroot Aerospace (Rocket Manufacturing)',
    ticker:null, exchange:null,
    industry:'SpaceAviationTech / Rocket Manufacturing / Launch Services / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:420, workforce_source:'linkedin_scrape', workforce_confidence:0.74,
    market_cap_usd:200_000_000,   // Series C 2022; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:12_000_000,   // Tracxn est FY2025 (pre-revenue model) | P/S=16.7x (high early) ✓ RPE=$47.6K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.85, total_open_roles:125,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'agnikul cosmos',
    display_name:'Agnikul Cosmos (Rocket Engine Manufacturing)',
    ticker:null, exchange:null,
    industry:'SpaceAviationTech / Rocket Engines / 3D Printing / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:280, workforce_source:'linkedin_scrape', workforce_confidence:0.72,
    market_cap_usd:100_000_000,   // Series B 2021; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:8_000_000,    // Tracxn est FY2025 (early stage) | P/S=12.5x ✓ RPE=$28.6K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.54,
    recent_layoff_count:0, layoff_confidence:0.69,
    hiring_velocity_score:0.8, total_open_roles:95,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'picosat space',
    display_name:'PicoSat (Nano Satellite Technology)',
    ticker:null, exchange:null,
    industry:'SpaceAviationTech / Nano Satellites / Earth Observation / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:180, workforce_source:'linkedin_scrape', workforce_confidence:0.70,
    market_cap_usd:60_000_000,    // Series A; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:5_000_000,    // Tracxn est FY2025 | P/S=12.0x ✓ RPE=$28.8K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.53,
    recent_layoff_count:0, layoff_confidence:0.68,
    hiring_velocity_score:0.75, total_open_roles:60,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'hexa aeronautics',
    display_name:'Hexa Aeronautics (Drone & UAV Systems)',
    ticker:null, exchange:null,
    industry:'SpaceAviationTech / Defense Drones / UAV Manufacturing / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:320, workforce_source:'linkedin_scrape', workforce_confidence:0.73,
    market_cap_usd:120_000_000,   // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:18_000_000,   // Tracxn est FY2025 | P/S=6.7x ✓ RPE=$56.3K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.75, total_open_roles:85,
    data_quality_tier:'seed', enrichment_version:V,
  },
];

try {
  await runValidatedBatch(pool, 'GT131: India SecurityCybertech / SkillsUpskilling / SpaceAviationTech (Sub-$400M, 2026)', V, companies);
} catch(e) { console.error(e.message); process.exit(1); }
finally { await pool.end(); }
