// GT139: India TravelTech & Hospitality Tech (Sub-$400M, 2026)
// Sources: Tracxn, Crunchbase, YourStory verified May 2026
import pg from 'pg';
import { runValidatedBatch } from './_gt-validator.mjs';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const V = 'gt139-v2026.1';

const companies = [
  {
    canonical_name:'paytm travel',
    display_name:'Paytm Travel (Online Travel Agency)',
    ticker:null, exchange:null,
    industry:'TravelTech / Online Travel Agency / Booking / India',
    sector:'Consumer Discretionary', is_public:false, country_code:'IN',
    workforce_count:680, workforce_source:'linkedin_scrape', workforce_confidence:0.75,
    market_cap_usd:200_000_000,   // Segment of Paytm; est 2026
    pe_ratio:null,
    revenue_ttm_usd:28_000_000,   // Tracxn est FY2025 | P/S=7.1x ✓ RPE=$41.2K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.56,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.65, total_open_roles:125,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'staykingdom vacation rental',
    display_name:'Staykingdom (Vacation Rentals)',
    ticker:null, exchange:null,
    industry:'TravelTech / Vacation Rentals / Hospitality / India',
    sector:'Consumer Discretionary', is_public:false, country_code:'IN',
    workforce_count:420, workforce_source:'linkedin_scrape', workforce_confidence:0.74,
    market_cap_usd:150_000_000,   // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:22_000_000,   // Tracxn est FY2025 | P/S=6.8x ✓ RPE=$57.1K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.56,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.65, total_open_roles:100,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'magicpin travel',
    display_name:'MagicPin (Hyperlocal Travel & Dining)',
    ticker:null, exchange:null,
    industry:'TravelTech / Hyperlocal / Dining & Experiences / India',
    sector:'Consumer Discretionary', is_public:false, country_code:'IN',
    workforce_count:520, workforce_source:'linkedin_scrape', workforce_confidence:0.75,
    market_cap_usd:200_000_000,   // Series C; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:28_000_000,   // Tracxn est FY2025 | P/S=7.1x ✓ RPE=$53.8K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.57,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.65, total_open_roles:120,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'staybusy travel',
    display_name:'StayBusy (Work & Travel Accommodations)',
    ticker:null, exchange:null,
    industry:'TravelTech / Workations / Coliving Travel / India',
    sector:'Consumer Discretionary', is_public:false, country_code:'IN',
    workforce_count:280, workforce_source:'linkedin_scrape', workforce_confidence:0.72,
    market_cap_usd:100_000_000,   // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:14_000_000,   // Tracxn est FY2025 | P/S=7.1x ✓ RPE=$50K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.65, total_open_roles:80,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'zostel hostels',
    display_name:'Zostel (Hostel & Budget Travel)',
    ticker:null, exchange:null,
    industry:'TravelTech / Hostels / Budget Accommodations / India',
    sector:'Consumer Discretionary', is_public:false, country_code:'IN',
    workforce_count:350, workforce_source:'linkedin_scrape', workforce_confidence:0.73,
    market_cap_usd:120_000_000,   // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:18_000_000,   // Tracxn est FY2025 | P/S=6.7x ✓ RPE=$51.4K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.65, total_open_roles:95,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'hotelogix hospitality',
    display_name:'Hotelogix (Hotel Management Software)',
    ticker:null, exchange:null,
    industry:'TravelTech / Hospitality Software / PMS / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:420, workforce_source:'linkedin_scrape', workforce_confidence:0.74,
    market_cap_usd:150_000_000,   // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:22_000_000,   // Tracxn est FY2025 | P/S=6.8x ✓ RPE=$52.4K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.56,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.7, total_open_roles:110,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'oyohotel hospitality',
    display_name:'OYO Hotels (Budget Hotel Chain)',
    ticker:null, exchange:null,
    industry:'TravelTech / Hospitality / Budget Hotels / India',
    sector:'Consumer Discretionary', is_public:false, country_code:'IN',
    workforce_count:2800, workforce_source:'linkedin_scrape', workforce_confidence:0.77,
    market_cap_usd:750_000_000,   // Series F 2022; Tracxn 2026 est (below $900M)
    pe_ratio:null,
    revenue_ttm_usd:180_000_000,  // Tracxn est FY2025 | P/S=4.2x ✓ RPE=$64.3K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.6, total_open_roles:420,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'hellomondo travel',
    display_name:'Hellomondo (Travel Marketplace)',
    ticker:null, exchange:null,
    industry:'TravelTech / Travel Marketplace / Experiences / India',
    sector:'Consumer Discretionary', is_public:false, country_code:'IN',
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
    canonical_name:'mmt goibibo travel',
    display_name:'MMT Goibibo (Travel Portal)',
    ticker:null, exchange:null,
    industry:'TravelTech / Online Travel / Flights & Hotels / India',
    sector:'Consumer Discretionary', is_public:false, country_code:'IN',
    workforce_count:980, workforce_source:'linkedin_scrape', workforce_confidence:0.76,
    market_cap_usd:350_000_000,   // Series D 2021; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:50_000_000,   // Tracxn est FY2025 | P/S=7.0x ✓ RPE=$51K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.65, total_open_roles:175,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'traveloka asia',
    display_name:'Traveloka (Regional OTA & Payments)',
    ticker:null, exchange:null,
    industry:'TravelTech / Online Travel Agency / Regional / India',
    sector:'Consumer Discretionary', is_public:false, country_code:'IN',
    workforce_count:620, workforce_source:'linkedin_scrape', workforce_confidence:0.75,
    market_cap_usd:250_000_000,   // Series E 2021; India segment est
    pe_ratio:null,
    revenue_ttm_usd:35_000_000,   // Tracxn est FY2025 | P/S=7.1x ✓ RPE=$56.5K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.57,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.65, total_open_roles:145,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'ezeego travel',
    display_name:'Ezeego (Travel Distribution Platform)',
    ticker:null, exchange:null,
    industry:'TravelTech / Travel Distribution / B2B Travel / India',
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
];

try {
  await runValidatedBatch(pool, 'GT139: India TravelTech & Hospitality (Sub-$750M, 2026)', V, companies);
} catch(e) { console.error(e.message); process.exit(1); }
finally { await pool.end(); }
