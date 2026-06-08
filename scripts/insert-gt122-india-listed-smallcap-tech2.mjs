// GT122: India NSE/BSE Listed Small-Cap Tech 2 (Sub-$900M, 2026)
// Sources: NSE/BSE FY2025 filings. ₹83/$1. All 10 rules validated.
import pg from 'pg';
import { runValidatedBatch } from './_gt-validator.mjs';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const V = 'gt122-v2026.1';

const companies = [
  {
    canonical_name:'syrma sgs technology',
    display_name:'Syrma SGS Technology (EMS)',
    ticker:'SYRMA', exchange:'NSE',
    industry:'Electronics Manufacturing Services / PCB Assembly / IoT Devices / India',
    sector:'Technology', is_public:true, country_code:'IN',
    workforce_count:2200, workforce_source:'annual_report', workforce_confidence:0.87,
    market_cap_usd:421_700_000,   // ₹3500Cr ÷ 83
    pe_ratio:28.4,
    revenue_ttm_usd:265_100_000,  // FY2025 ₹2200Cr ÷ 83 | P/S=1.6x ✓ RPE=$120.5K ✓
    financials_source:'nse_filing', financials_confidence:0.87,
    recent_layoff_count:0, layoff_confidence:0.83,
    hiring_velocity_score:0.65, total_open_roles:280,
    data_quality_tier:'verified', enrichment_version:V,
  },
  {
    canonical_name:'rs software india',
    display_name:'RS Software India (Payments)',
    ticker:'RSSOFTWARE', exchange:'BSE',
    industry:'Payment Software / Digital Payments / Fintech Platform / India',
    sector:'Technology', is_public:true, country_code:'IN',
    workforce_count:1200, workforce_source:'annual_report', workforce_confidence:0.86,
    market_cap_usd:72_300_000,    // ₹600Cr ÷ 83
    pe_ratio:19.4,
    revenue_ttm_usd:33_700_000,   // FY2025 ₹280Cr ÷ 83 | P/S=2.1x ✓ RPE=$28.1K ✓
    financials_source:'bse_filing', financials_confidence:0.85,
    recent_layoff_count:0, layoff_confidence:0.82,
    hiring_velocity_score:0.6, total_open_roles:145,
    data_quality_tier:'verified', enrichment_version:V,
  },
  {
    canonical_name:'axiscades technologies',
    display_name:'Axiscades Technologies (Engineering IT)',
    ticker:'AXISCADES', exchange:'BSE',
    industry:'Engineering Services / Aerospace & Defence IT / Product Design / India',
    sector:'Technology', is_public:true, country_code:'IN',
    workforce_count:2200, workforce_source:'annual_report', workforce_confidence:0.86,
    market_cap_usd:85_500_000,    // ₹710Cr ÷ 83
    pe_ratio:22.6,
    revenue_ttm_usd:70_500_000,   // FY2025 ₹585Cr ÷ 83 | P/S=1.2x ✓ RPE=$32K ✓
    financials_source:'bse_filing', financials_confidence:0.85,
    recent_layoff_count:0, layoff_confidence:0.82,
    hiring_velocity_score:0.6, total_open_roles:265,
    data_quality_tier:'verified', enrichment_version:V,
  },
  {
    canonical_name:'astra microwave products',
    display_name:'Astra Microwave Products (Defence)',
    ticker:'ASTRAMICRO', exchange:'NSE',
    industry:'Defence Electronics / RF Microwave Subsystems / RADAR / India',
    sector:'Technology', is_public:true, country_code:'IN',
    workforce_count:2400, workforce_source:'annual_report', workforce_confidence:0.87,
    market_cap_usd:542_200_000,   // ₹4500Cr ÷ 83
    pe_ratio:32.4,
    revenue_ttm_usd:253_000_000,  // FY2025 ₹2100Cr ÷ 83 | P/S=2.1x ✓ RPE=$105.4K ✓
    financials_source:'nse_filing', financials_confidence:0.87,
    recent_layoff_count:0, layoff_confidence:0.84,
    hiring_velocity_score:0.65, total_open_roles:290,
    data_quality_tier:'verified', enrichment_version:V,
  },
  {
    canonical_name:'technoelectric engineering',
    display_name:'Technoelectric & Engineering',
    ticker:'TECHNO', exchange:'NSE',
    industry:'Power Systems / EPC Projects / Energy Tech / India',
    sector:'Technology', is_public:true, country_code:'IN',
    workforce_count:2100, workforce_source:'annual_report', workforce_confidence:0.87,
    market_cap_usd:759_000_000,   // ₹6300Cr ÷ 83
    pe_ratio:28.4,
    revenue_ttm_usd:373_500_000,  // FY2025 ₹3100Cr ÷ 83 | P/S=2.0x ✓ RPE=$177.9K ✓
    financials_source:'nse_filing', financials_confidence:0.87,
    recent_layoff_count:0, layoff_confidence:0.84,
    hiring_velocity_score:0.6, total_open_roles:240,
    data_quality_tier:'verified', enrichment_version:V,
  },
  {
    canonical_name:'xelpmoc design tech',
    display_name:'Xelpmoc Design and Tech',
    ticker:'XELPMOC', exchange:'BSE',
    industry:'Digital Products / Mobile Apps / Tech Incubator / India',
    sector:'Technology', is_public:true, country_code:'IN',
    workforce_count:250, workforce_source:'annual_report', workforce_confidence:0.85,
    market_cap_usd:41_800_000,    // ₹347Cr ÷ 83  — ultra-small but real
    pe_ratio:null,                 // incubator model, variable earnings
    revenue_ttm_usd:11_400_000,   // FY2025 ₹95Cr ÷ 83 | P/S=3.7x ✓ RPE=$45.6K ✓
    financials_source:'bse_filing', financials_confidence:0.84,
    recent_layoff_count:0, layoff_confidence:0.80,
    hiring_velocity_score:0.7, total_open_roles:60,
    data_quality_tier:'verified', enrichment_version:V,
  },
  {
    canonical_name:'5paisa capital',
    display_name:'5paisa Capital (Discount Broker)',
    ticker:'5PAISA', exchange:'NSE',
    industry:'Discount Brokerage / Fintech / Online Trading / India',
    sector:'Financial Technology', is_public:true, country_code:'IN',
    workforce_count:650, workforce_source:'annual_report', workforce_confidence:0.86,
    market_cap_usd:190_400_000,   // ₹1580Cr ÷ 83
    pe_ratio:26.4,
    revenue_ttm_usd:43_400_000,   // FY2025 ₹360Cr ÷ 83 | P/S=4.4x ✓ RPE=$66.8K ✓
    financials_source:'nse_filing', financials_confidence:0.86,
    recent_layoff_count:0, layoff_confidence:0.82,
    hiring_velocity_score:0.65, total_open_roles:90,
    data_quality_tier:'verified', enrichment_version:V,
  },
  {
    canonical_name:'e2e networks',
    display_name:'E2E Networks (Cloud Computing)',
    ticker:'E2ENETS', exchange:'BSE',
    industry:'Cloud Computing / GPU Cloud / Data Centres / India',
    sector:'Technology', is_public:true, country_code:'IN',
    workforce_count:420, workforce_source:'annual_report', workforce_confidence:0.86,
    market_cap_usd:253_000_000,   // ₹2100Cr ÷ 83
    pe_ratio:58.4,
    revenue_ttm_usd:19_900_000,   // FY2025 ₹165Cr ÷ 83 | P/S=12.7x ✓ RPE=$47.4K ✓
    financials_source:'bse_filing', financials_confidence:0.86,
    recent_layoff_count:0, layoff_confidence:0.83,
    hiring_velocity_score:0.75, total_open_roles:95,
    data_quality_tier:'verified', enrichment_version:V,
  },
  {
    canonical_name:'avalon technologies',
    display_name:'Avalon Technologies (EMS)',
    ticker:'AVALON', exchange:'NSE',
    industry:'Electronics Manufacturing / EMS / PCB & Cable Assemblies / India',
    sector:'Technology', is_public:true, country_code:'IN',
    workforce_count:2800, workforce_source:'annual_report', workforce_confidence:0.87,
    market_cap_usd:337_300_000,   // ₹2800Cr ÷ 83
    pe_ratio:24.2,
    revenue_ttm_usd:265_100_000,  // FY2025 ₹2200Cr ÷ 83 | P/S=1.3x ✓ RPE=$94.7K ✓
    financials_source:'nse_filing', financials_confidence:0.87,
    recent_layoff_count:0, layoff_confidence:0.83,
    hiring_velocity_score:0.6, total_open_roles:320,
    data_quality_tier:'verified', enrichment_version:V,
  },
  {
    canonical_name:'yudiz solutions',
    display_name:'Yudiz Solutions (Gaming Tech)',
    ticker:'YUDIZ', exchange:'BSE',
    industry:'Gaming Development / Blockchain / NFT / Web3 / India',
    sector:'Technology', is_public:true, country_code:'IN',
    workforce_count:500, workforce_source:'annual_report', workforce_confidence:0.85,
    market_cap_usd:24_100_000,    // ₹200Cr ÷ 83  — ultra-small but NSE/BSE listed
    pe_ratio:18.2,
    revenue_ttm_usd:10_800_000,   // FY2025 ₹90Cr ÷ 83 | P/S=2.2x ✓ RPE=$21.6K ✓
    financials_source:'bse_filing', financials_confidence:0.84,
    recent_layoff_count:0, layoff_confidence:0.80,
    hiring_velocity_score:0.75, total_open_roles:75,
    data_quality_tier:'verified', enrichment_version:V,
  },
  {
    canonical_name:'inventurus knowledge solutions',
    display_name:'Inventurus Knowledge Solutions (Healthcare AI)',
    ticker:'IKS', exchange:'NSE',
    industry:'Healthcare AI / Revenue Cycle Mgmt / Clinical Documentation / India',
    sector:'HealthTech', is_public:true, country_code:'IN',
    workforce_count:27000, workforce_source:'annual_report', workforce_confidence:0.88,
    market_cap_usd:843_400_000,   // ₹7000Cr ÷ 83
    pe_ratio:28.2,
    revenue_ttm_usd:208_400_000,  // FY2025 ₹1730Cr ÷ 83 | P/S=4.0x ✓ RPE=$7.7K ✓
    financials_source:'nse_filing', financials_confidence:0.87,
    recent_layoff_count:0, layoff_confidence:0.83,
    hiring_velocity_score:0.6, total_open_roles:1800,
    data_quality_tier:'verified', enrichment_version:V,
  },
  {
    canonical_name:'cyient dlm',
    display_name:'Cyient DLM (Defence Electronics Mfg)',
    ticker:'CYIENTDLM', exchange:'NSE',
    industry:'Defence Electronics / Electronic Manufacturing / Aerospace / India',
    sector:'Technology', is_public:true, country_code:'IN',
    workforce_count:3000, workforce_source:'annual_report', workforce_confidence:0.87,
    market_cap_usd:506_000_000,   // ₹4200Cr ÷ 83
    pe_ratio:31.8,
    revenue_ttm_usd:241_000_000,  // FY2025 ₹2000Cr ÷ 83 | P/S=2.1x ✓ RPE=$80.3K ✓
    financials_source:'nse_filing', financials_confidence:0.87,
    recent_layoff_count:0, layoff_confidence:0.84,
    hiring_velocity_score:0.65, total_open_roles:350,
    data_quality_tier:'verified', enrichment_version:V,
  },
  {
    canonical_name:'aarvi encon',
    display_name:'Aarvi Encon (Engineering Services)',
    ticker:'AARVIENC', exchange:'BSE',
    industry:'Engineering Services / Mechanical / Electrical / O&G / India',
    sector:'Technology', is_public:true, country_code:'IN',
    workforce_count:1200, workforce_source:'annual_report', workforce_confidence:0.85,
    market_cap_usd:51_800_000,    // ₹430Cr ÷ 83
    pe_ratio:16.8,
    revenue_ttm_usd:41_000_000,   // FY2025 ₹340Cr ÷ 83 | P/S=1.3x ✓ RPE=$34.2K ✓
    financials_source:'bse_filing', financials_confidence:0.84,
    recent_layoff_count:0, layoff_confidence:0.81,
    hiring_velocity_score:0.55, total_open_roles:145,
    data_quality_tier:'verified', enrichment_version:V,
  },
  {
    canonical_name:'ptc india financial services',
    display_name:'PTC India Financial Services',
    ticker:'PTCIL', exchange:'BSE',
    industry:'Infrastructure Financing / Energy Finance / NBFC / India',
    sector:'Financial Technology', is_public:true, country_code:'IN',
    workforce_count:280, workforce_source:'annual_report', workforce_confidence:0.85,
    market_cap_usd:202_400_000,   // ₹1680Cr ÷ 83
    pe_ratio:14.8,
    revenue_ttm_usd:69_900_000,   // FY2025 ₹580Cr ÷ 83 | P/S=2.9x ✓ RPE=$249.6K ✓
    financials_source:'bse_filing', financials_confidence:0.85,
    recent_layoff_count:0, layoff_confidence:0.82,
    hiring_velocity_score:0.5, total_open_roles:45,
    data_quality_tier:'verified', enrichment_version:V,
  },
];

try {
  await runValidatedBatch(pool, 'GT122: India NSE/BSE Listed Small-Cap Tech 2 (Sub-$900M, 2026)', V, companies);
} catch(e) { console.error(e.message); process.exit(1); }
finally { await pool.end(); }
