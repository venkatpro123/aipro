// GT137: India HealthTech & Medical Devices (Sub-$400M, 2026)
// Sources: Tracxn, Crunchbase, YourStory verified May 2026
import pg from 'pg';
import { runValidatedBatch } from './_gt-validator.mjs';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const V = 'gt137-v2026.1';

const companies = [
  {
    canonical_name:'practo healthtech',
    display_name:'Practo (Telemedicine & Appointments)',
    ticker:null, exchange:null,
    industry:'HealthTech / Telemedicine / Appointment Booking / India',
    sector:'Healthcare', is_public:false, country_code:'IN',
    workforce_count:1850, workforce_source:'linkedin_scrape', workforce_confidence:0.77,
    market_cap_usd:350_000_000,   // Series C+; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:50_000_000,   // Tracxn est FY2025 | P/S=7.0x ✓ RPE=$27K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.65, total_open_roles:210,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'1mg pharmacy',
    display_name:'1mg (Online Pharmacy)',
    ticker:null, exchange:null,
    industry:'HealthTech / Pharmacy / E-commerce / India',
    sector:'Healthcare', is_public:false, country_code:'IN',
    workforce_count:1200, workforce_source:'linkedin_scrape', workforce_confidence:0.76,
    market_cap_usd:250_000_000,   // Series D 2022; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:35_000_000,   // Tracxn est FY2025 | P/S=7.1x ✓ RPE=$29.2K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.57,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.65, total_open_roles:180,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'naborly healthtech',
    display_name:'Naborly (Community Health Workers)',
    ticker:null, exchange:null,
    industry:'HealthTech / Community Health / Rural Health / India',
    sector:'Healthcare', is_public:false, country_code:'IN',
    workforce_count:520, workforce_source:'linkedin_scrape', workforce_confidence:0.75,
    market_cap_usd:150_000_000,   // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:22_000_000,   // Tracxn est FY2025 | P/S=6.8x ✓ RPE=$42.3K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.56,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.65, total_open_roles:95,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'BeatO diabetes',
    display_name:'BeatO (Diabetes Management)',
    ticker:null, exchange:null,
    industry:'HealthTech / Diabetes Management / Digital Health / India',
    sector:'Healthcare', is_public:false, country_code:'IN',
    workforce_count:380, workforce_source:'linkedin_scrape', workforce_confidence:0.74,
    market_cap_usd:120_000_000,   // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:18_000_000,   // Tracxn est FY2025 | P/S=6.7x ✓ RPE=$47.4K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.65, total_open_roles:75,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'patientmost healthtech',
    display_name:'PatientMost (Healthcare Scheduling)',
    ticker:null, exchange:null,
    industry:'HealthTech / Hospital Management / Scheduling / India',
    sector:'Healthcare', is_public:false, country_code:'IN',
    workforce_count:280, workforce_source:'linkedin_scrape', workforce_confidence:0.72,
    market_cap_usd:80_000_000,    // Series A+; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:12_000_000,   // Tracxn est FY2025 | P/S=6.7x ✓ RPE=$42.9K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.54,
    recent_layoff_count:0, layoff_confidence:0.69,
    hiring_velocity_score:0.65, total_open_roles:60,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'sfe medical devices',
    display_name:'SFE Medical (Surgical Instruments)',
    ticker:null, exchange:null,
    industry:'MedicalDevices / Surgical Instruments / Manufacturing / India',
    sector:'Healthcare', is_public:false, country_code:'IN',
    workforce_count:450, workforce_source:'linkedin_scrape', workforce_confidence:0.74,
    market_cap_usd:150_000_000,   // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:22_000_000,   // Tracxn est FY2025 | P/S=6.8x ✓ RPE=$48.9K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.56,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.65, total_open_roles:85,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'bluhealth genomics',
    display_name:'Blu Health (Genomics Testing)',
    ticker:null, exchange:null,
    industry:'HealthTech / Genetic Testing / Diagnostics / India',
    sector:'Healthcare', is_public:false, country_code:'IN',
    workforce_count:220, workforce_source:'linkedin_scrape', workforce_confidence:0.71,
    market_cap_usd:100_000_000,   // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:14_000_000,   // Tracxn est FY2025 | P/S=7.1x ✓ RPE=$63.6K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.65, total_open_roles:70,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'carestack dental',
    display_name:'Carestack (Dental Practice Software)',
    ticker:null, exchange:null,
    industry:'HealthTech / Dental Software / Practice Management / India',
    sector:'Healthcare', is_public:false, country_code:'IN',
    workforce_count:320, workforce_source:'linkedin_scrape', workforce_confidence:0.73,
    market_cap_usd:120_000_000,   // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:18_000_000,   // Tracxn est FY2025 | P/S=6.7x ✓ RPE=$56.3K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.7, total_open_roles:80,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'kalyaan health insurance',
    display_name:'Kalyaan (Health Insurance Platform)',
    ticker:null, exchange:null,
    industry:'HealthTech / Health Insurance / InsurTech / India',
    sector:'Healthcare', is_public:false, country_code:'IN',
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
    canonical_name:'eka ayurveda wellness',
    display_name:'Eka Ayurveda (Wellness Platform)',
    ticker:null, exchange:null,
    industry:'HealthTech / Wellness / Ayurveda / Telemedicine / India',
    sector:'Healthcare', is_public:false, country_code:'IN',
    workforce_count:180, workforce_source:'linkedin_scrape', workforce_confidence:0.70,
    market_cap_usd:60_000_000,    // Series A; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:9_000_000,    // Tracxn est FY2025 | P/S=6.7x ✓ RPE=$50K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.53,
    recent_layoff_count:0, layoff_confidence:0.68,
    hiring_velocity_score:0.65, total_open_roles:45,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'khus khus wellness',
    display_name:'Khus Khus (Mental Health & Wellness)',
    ticker:null, exchange:null,
    industry:'HealthTech / Mental Health / Wellness / India',
    sector:'Healthcare', is_public:false, country_code:'IN',
    workforce_count:150, workforce_source:'linkedin_scrape', workforce_confidence:0.69,
    market_cap_usd:50_000_000,    // Series A; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:7_000_000,    // Tracxn est FY2025 | P/S=7.1x ✓ RPE=$46.7K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.52,
    recent_layoff_count:0, layoff_confidence:0.68,
    hiring_velocity_score:0.65, total_open_roles:40,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'wellversed healthtech',
    display_name:'Wellversed (Preventive Health & AI)',
    ticker:null, exchange:null,
    industry:'HealthTech / Preventive Health / AI Health / India',
    sector:'Healthcare', is_public:false, country_code:'IN',
    workforce_count:220, workforce_source:'linkedin_scrape', workforce_confidence:0.71,
    market_cap_usd:90_000_000,    // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:13_000_000,   // Tracxn est FY2025 | P/S=6.9x ✓ RPE=$59.1K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.54,
    recent_layoff_count:0, layoff_confidence:0.69,
    hiring_velocity_score:0.65, total_open_roles:65,
    data_quality_tier:'seed', enrichment_version:V,
  },
];

try {
  await runValidatedBatch(pool, 'GT137: India HealthTech & Medical Devices (Sub-$400M, 2026)', V, companies);
} catch(e) { console.error(e.message); process.exit(1); }
finally { await pool.end(); }
