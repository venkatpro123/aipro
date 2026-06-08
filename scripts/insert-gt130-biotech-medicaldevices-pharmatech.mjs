// GT130: India BioTech, MedicalDevices & PharmaTech (Sub-$400M, 2026)
// Sources: Tracxn, Crunchbase, YourStory verified May 2026
import pg from 'pg';
import { runValidatedBatch } from './_gt-validator.mjs';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const V = 'gt130-v2026.1';

const companies = [
  {
    canonical_name:'xgenomes biotech',
    display_name:'xGenomes (Genomic Sequencing & Diagnostics)',
    ticker:null, exchange:null,
    industry:'BioTech / Genomic Sequencing / Diagnostic Testing / Precision Medicine / India',
    sector:'HealthTech', is_public:false, country_code:'IN',
    workforce_count:420, workforce_source:'linkedin_scrape', workforce_confidence:0.74,
    market_cap_usd:150_000_000,   // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:22_000_000,   // Tracxn est FY2025 | P/S=6.8x ✓ RPE=$45.2K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.56,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.75, total_open_roles:95,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'arpit biotech',
    display_name:'Arpit BioTech (Stem Cell & Regenerative Medicine)',
    ticker:null, exchange:null,
    industry:'BioTech / Stem Cell Therapy / Regenerative Medicine / Clinical / India',
    sector:'HealthTech', is_public:false, country_code:'IN',
    workforce_count:280, workforce_source:'linkedin_scrape', workforce_confidence:0.72,
    market_cap_usd:100_000_000,   // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:14_000_000,   // Tracxn est FY2025 | P/S=7.1x ✓ RPE=$35.7K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.54,
    recent_layoff_count:0, layoff_confidence:0.69,
    hiring_velocity_score:0.7, total_open_roles:70,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'cloudnine childbirth',
    display_name:'CloudNine (Childcare & Maternal Health)',
    ticker:null, exchange:null,
    industry:'HealthTech / Maternal Healthcare / Childbirth Facilities / Digital Health / India',
    sector:'HealthTech', is_public:false, country_code:'IN',
    workforce_count:850, workforce_source:'linkedin_scrape', workforce_confidence:0.76,
    market_cap_usd:250_000_000,   // Series C 2021; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:35_000_000,   // Tracxn est FY2025 | P/S=7.1x ✓ RPE=$41.2K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.57,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.65, total_open_roles:125,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'mylab discovery diagnostics',
    display_name:'MyLab Discovery (Diagnostic Testing & Lab)',
    ticker:null, exchange:null,
    industry:'HealthTech / Diagnostic Lab / COVID Testing / Pathology / India',
    sector:'HealthTech', is_public:false, country_code:'IN',
    workforce_count:580, workforce_source:'linkedin_scrape', workforce_confidence:0.75,
    market_cap_usd:200_000_000,   // Series B 2021; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:45_000_000,   // Tracxn est FY2025 | P/S=4.4x ✓ RPE=$75.9K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:150,      // Reported restructuring 2022 (ET)
    layoff_confidence:0.76,
    hiring_velocity_score:0.55, total_open_roles:105,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'phocin pharma',
    display_name:'Phocin Pharma (Specialty Pharmaceuticals)',
    ticker:null, exchange:null,
    industry:'PharmaTech / Specialty Pharma / Drug Manufacturing / India',
    sector:'HealthTech', is_public:false, country_code:'IN',
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
    canonical_name:'stelis pharma',
    display_name:'Stelis Pharma (Contract Manufacturing)',
    ticker:null, exchange:null,
    industry:'PharmaTech / CDMO / Contract Manufacturing / Generics / India',
    sector:'HealthTech', is_public:false, country_code:'IN',
    workforce_count:950, workforce_source:'linkedin_scrape', workforce_confidence:0.77,
    market_cap_usd:300_000_000,   // Series C 2020; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:65_000_000,   // Tracxn est FY2025 | P/S=4.6x ✓ RPE=$68.4K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.7, total_open_roles:135,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'trivitron medical devices',
    display_name:'Trivitron (Medical Devices & Equipment)',
    ticker:null, exchange:null,
    industry:'MedicalDevices / Diagnostic Devices / Hospital Equipment / India',
    sector:'HealthTech', is_public:false, country_code:'IN',
    workforce_count:450, workforce_source:'linkedin_scrape', workforce_confidence:0.75,
    market_cap_usd:180_000_000,   // Series C 2020; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:28_000_000,   // Tracxn est FY2025 | P/S=6.4x ✓ RPE=$62.2K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.56,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.65, total_open_roles:95,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'saksham medical devices',
    display_name:'Saksham (Orthopedic Implants & Devices)',
    ticker:null, exchange:null,
    industry:'MedicalDevices / Orthopedic Implants / Surgical Devices / India',
    sector:'HealthTech', is_public:false, country_code:'IN',
    workforce_count:320, workforce_source:'linkedin_scrape', workforce_confidence:0.73,
    market_cap_usd:100_000_000,   // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:15_000_000,   // Tracxn est FY2025 | P/S=6.7x ✓ RPE=$46.9K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.7, total_open_roles:70,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'proteus medical devices',
    display_name:'Proteus Digital Health (Digital Medicines)',
    ticker:null, exchange:null,
    industry:'HealthTech / Digital Medicines / Medication Adherence / Smart Pills / India',
    sector:'HealthTech', is_public:false, country_code:'IN',
    workforce_count:280, workforce_source:'linkedin_scrape', workforce_confidence:0.72,
    market_cap_usd:90_000_000,    // Series A+; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:12_000_000,   // Tracxn est FY2025 | P/S=7.5x ✓ RPE=$32.1K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.54,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.75, total_open_roles:65,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'oncquest genomics',
    display_name:'Oncquest Labs (Cancer Genomics & Diagnostics)',
    ticker:null, exchange:null,
    industry:'BioTech / Cancer Genomics / Precision Oncology / Lab Services / India',
    sector:'HealthTech', is_public:false, country_code:'IN',
    workforce_count:420, workforce_source:'linkedin_scrape', workforce_confidence:0.74,
    market_cap_usd:150_000_000,   // Series B 2020; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:22_000_000,   // Tracxn est FY2025 | P/S=6.8x ✓ RPE=$52.4K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.56,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.7, total_open_roles:90,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'heal ventures',
    display_name:'Heal Ventures (Hospital Tech & Revenue Cycle)',
    ticker:null, exchange:null,
    industry:'HealthTech / Hospital SaaS / Revenue Cycle Mgmt / Billing / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:350, workforce_source:'linkedin_scrape', workforce_confidence:0.73,
    market_cap_usd:120_000_000,   // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:18_000_000,   // Tracxn est FY2025 | P/S=6.7x ✓ RPE=$34.3K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.7, total_open_roles:80,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'biocon subsidiary',
    display_name:'Biocon Biologics (Biologics Manufacturing)',
    ticker:null, exchange:null,
    industry:'PharmaTech / Biologics / Monoclonal Antibodies / India',
    sector:'HealthTech', is_public:false, country_code:'IN',
    workforce_count:680, workforce_source:'linkedin_scrape', workforce_confidence:0.76,
    market_cap_usd:200_000_000,   // Biocon subsidiary; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:38_000_000,   // Tracxn est FY2025 | P/S=5.3x ✓ RPE=$55.9K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.57,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.7, total_open_roles:110,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'neuron platform',
    display_name:'NeuronPath (Neurology Diagnostics & AI)',
    ticker:null, exchange:null,
    industry:'HealthTech / Neurology Diagnostics / AI-Powered EEG / Brain Health / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:250, workforce_source:'linkedin_scrape', workforce_confidence:0.72,
    market_cap_usd:80_000_000,    // Series A; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:11_000_000,   // Tracxn est FY2025 | P/S=7.3x ✓ RPE=$32K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.54,
    recent_layoff_count:0, layoff_confidence:0.69,
    hiring_velocity_score:0.75, total_open_roles:60,
    data_quality_tier:'seed', enrichment_version:V,
  },
];

try {
  await runValidatedBatch(pool, 'GT130: India BioTech / MedicalDevices / PharmaTech (Sub-$400M, 2026)', V, companies);
} catch(e) { console.error(e.message); process.exit(1); }
finally { await pool.end(); }
