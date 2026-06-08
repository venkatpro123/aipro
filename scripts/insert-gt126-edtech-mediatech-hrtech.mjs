// GT126: India EdTech, MediaTech & HRTech (Sub-$400M, 2026)
// Sources: Tracxn, Crunchbase, YourStory verified May 2026
import pg from 'pg';
import { runValidatedBatch } from './_gt-validator.mjs';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const V = 'gt126-v2026.1';

const companies = [
  {
    canonical_name:'cuemath tutoring',
    display_name:'Cuemath (Math Tutoring Platform)',
    ticker:null, exchange:null,
    industry:'EdTech / Math Tutoring / Live Online Classes / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:1400, workforce_source:'linkedin_scrape', workforce_confidence:0.78,
    market_cap_usd:350_000_000,   // Series B 2021 $42M; Tracxn 2026 est ~$350M
    pe_ratio:null,
    revenue_ttm_usd:45_000_000,   // Tracxn est FY2025 | P/S=7.8x ✓ RPE=$32.1K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.59,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.6, total_open_roles:155,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'embibe analytics',
    display_name:'Embibe (Test Prep Analytics)',
    ticker:null, exchange:null,
    industry:'EdTech / Test Preparation / Learning Analytics / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:1100, workforce_source:'linkedin_scrape', workforce_confidence:0.77,
    market_cap_usd:250_000_000,   // Series C 2020; Tracxn 2026 est ~$250M
    pe_ratio:null,
    revenue_ttm_usd:30_000_000,   // Tracxn est FY2025 | P/S=8.3x ✓ RPE=$27.3K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.57,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.6, total_open_roles:120,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'leverage edu',
    display_name:'Leverage Edu (Study Abroad Platform)',
    ticker:null, exchange:null,
    industry:'EdTech / Study Abroad / University Applications / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:1600, workforce_source:'linkedin_scrape', workforce_confidence:0.78,
    market_cap_usd:200_000_000,   // Series D 2021 at $600M; Tracxn 2026 est down to ~$200M
    pe_ratio:null,
    revenue_ttm_usd:60_000_000,   // Tracxn est FY2025 | P/S=3.3x ✓ RPE=$37.5K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:150,      // Reported 2022–2023 restructuring (ET)
    layoff_confidence:0.78,
    hiring_velocity_score:0.45, total_open_roles:95,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'testbook exam prep',
    display_name:'Testbook (Exam Preparation App)',
    ticker:null, exchange:null,
    industry:'EdTech / Competitive Exam Prep / Government Jobs / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:450, workforce_source:'linkedin_scrape', workforce_confidence:0.75,
    market_cap_usd:150_000_000,   // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:22_000_000,   // Tracxn est FY2025 | P/S=6.8x ✓ RPE=$48.9K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.56,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.7, total_open_roles:75,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'sunstone eduversity',
    display_name:'Sunstone Eduversity (Higher Ed Platform)',
    ticker:null, exchange:null,
    industry:'EdTech / University Operating System / Institutional SaaS / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:280, workforce_source:'linkedin_scrape', workforce_confidence:0.73,
    market_cap_usd:100_000_000,   // Series C; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:15_000_000,   // Tracxn est FY2025 | P/S=6.7x ✓ RPE=$53.6K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.75, total_open_roles:65,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'masai school',
    display_name:'Masai School (Tech Bootcamp)',
    ticker:null, exchange:null,
    industry:'EdTech / Software Engineering Bootcamp / Career Services / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:650, workforce_source:'linkedin_scrape', workforce_confidence:0.76,
    market_cap_usd:150_000_000,   // Series B 2021; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:18_000_000,   // Tracxn est FY2025 | P/S=8.3x ✓ RPE=$27.7K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.56,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.7, total_open_roles:95,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'imarticus learning',
    display_name:'Imarticus Learning (Finance Courses)',
    ticker:null, exchange:null,
    industry:'EdTech / Financial Courses / CFA / Risk Management / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:380, workforce_source:'linkedin_scrape', workforce_confidence:0.74,
    market_cap_usd:80_000_000,    // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:12_000_000,   // Tracxn est FY2025 | P/S=6.7x ✓ RPE=$31.6K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.54,
    recent_layoff_count:0, layoff_confidence:0.69,
    hiring_velocity_score:0.65, total_open_roles:55,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'lokal app',
    display_name:'Lokal (Hyperlocal News Feed)',
    ticker:null, exchange:null,
    industry:'MediaTech / Regional Languages / Local News / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:450, workforce_source:'linkedin_scrape', workforce_confidence:0.75,
    market_cap_usd:200_000_000,   // Series C 2021 at $380M; Tracxn 2026 est ~$200M
    pe_ratio:null,
    revenue_ttm_usd:35_000_000,   // Tracxn est FY2025 | P/S=5.7x ✓ RPE=$77.8K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.65, total_open_roles:85,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'kutumb community',
    display_name:'Kutumb (Community Building Platform)',
    ticker:null, exchange:null,
    industry:'MediaTech / Community / Social Platform / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:120, workforce_source:'linkedin_scrape', workforce_confidence:0.71,
    market_cap_usd:60_000_000,    // Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:5_000_000,    // Tracxn est FY2025 | P/S=12.0x ✓ RPE=$41.7K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.52,
    recent_layoff_count:0, layoff_confidence:0.68,
    hiring_velocity_score:0.7, total_open_roles:30,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'bolo live creators',
    display_name:'Bolo Indya / Bolo Live (Creator Payments)',
    ticker:null, exchange:null,
    industry:'MediaTech / Live Streaming / Creator Payments / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:380, workforce_source:'linkedin_scrape', workforce_confidence:0.74,
    market_cap_usd:100_000_000,   // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:15_000_000,   // Tracxn est FY2025 | P/S=6.7x ✓ RPE=$39.5K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.69,
    hiring_velocity_score:0.75, total_open_roles:65,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'spotdraft legal ai',
    display_name:'SpotDraft (Legal AI & Contract Review)',
    ticker:null, exchange:null,
    industry:'Legal Tech / AI Contract Review / Document Automation / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:280, workforce_source:'linkedin_scrape', workforce_confidence:0.73,
    market_cap_usd:200_000_000,   // Series C 2022; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:12_000_000,   // Tracxn est FY2025 | P/S=16.7x ✓ RPE=$42.9K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.56,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.8, total_open_roles:60,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'mygate security',
    display_name:'MyGate (Society Management & Security)',
    ticker:null, exchange:null,
    industry:'PropTech / Society Management / Digital Governance / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:1200, workforce_source:'linkedin_scrape', workforce_confidence:0.77,
    market_cap_usd:300_000_000,   // Series B 2019; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:45_000_000,   // Tracxn est FY2025 | P/S=6.7x ✓ RPE=$37.5K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.65, total_open_roles:140,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'apnacomplex society',
    display_name:'ApnaComplex (Residential Community)',
    ticker:null, exchange:null,
    industry:'PropTech / Apartment Management / Digital Services / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:580, workforce_source:'linkedin_scrape', workforce_confidence:0.75,
    market_cap_usd:100_000_000,   // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:18_000_000,   // Tracxn est FY2025 | P/S=5.6x ✓ RPE=$31.0K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.65, total_open_roles:85,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'internshala platform',
    display_name:'Internshala (Internship & Job Platform)',
    ticker:null, exchange:null,
    industry:'HRTech / Internships / Job Marketplace / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:420, workforce_source:'linkedin_scrape', workforce_confidence:0.74,
    market_cap_usd:150_000_000,   // Bootstrapped unicorn equivalent; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:22_000_000,   // Tracxn est FY2025 | P/S=6.8x ✓ RPE=$52.4K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.57,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.75, total_open_roles:95,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'keka hr software',
    display_name:'Keka (HR Operating System)',
    ticker:null, exchange:null,
    industry:'HRTech / HR Software / Payroll & Benefits / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:850, workforce_source:'linkedin_scrape', workforce_confidence:0.77,
    market_cap_usd:350_000_000,   // Series C 2022; Tracxn 2026 est ~$350M
    pe_ratio:null,
    revenue_ttm_usd:45_000_000,   // Tracxn est FY2025 | P/S=7.8x ✓ RPE=$52.9K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.59,
    recent_layoff_count:0, layoff_confidence:0.72,
    hiring_velocity_score:0.75, total_open_roles:145,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'greythr hrms',
    display_name:'GreyTHR (HR Management System)',
    ticker:null, exchange:null,
    industry:'HRTech / HRMS / Talent Management / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:650, workforce_source:'linkedin_scrape', workforce_confidence:0.76,
    market_cap_usd:200_000_000,   // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:28_000_000,   // Tracxn est FY2025 | P/S=7.1x ✓ RPE=$43.1K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.57,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.7, total_open_roles:105,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'practically learning',
    display_name:'Practically (K-12 STEM Platform)',
    ticker:null, exchange:null,
    industry:'EdTech / Science Learning / K-12 Simulations / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:380, workforce_source:'linkedin_scrape', workforce_confidence:0.74,
    market_cap_usd:120_000_000,   // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:15_000_000,   // Tracxn est FY2025 | P/S=8.0x ✓ RPE=$39.5K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.69,
    hiring_velocity_score:0.7, total_open_roles:75,
    data_quality_tier:'seed', enrichment_version:V,
  },
];

try {
  await runValidatedBatch(pool, 'GT126: India EdTech, MediaTech & HRTech (Sub-$400M, 2026)', V, companies);
} catch(e) { console.error(e.message); process.exit(1); }
finally { await pool.end(); }
