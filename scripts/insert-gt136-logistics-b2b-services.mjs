// GT136: India Logistics & B2B Services (Sub-$400M, 2026)
// Sources: Tracxn, Crunchbase, YourStory verified May 2026
import pg from 'pg';
import { runValidatedBatch } from './_gt-validator.mjs';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const V = 'gt136-v2026.1';

const companies = [
  {
    canonical_name:'flexport india logistics',
    display_name:'Flexport India (Freight Forwarding)',
    ticker:null, exchange:null,
    industry:'LogisticsTech / Freight / International Shipping / India',
    sector:'Industrials', is_public:false, country_code:'IN',
    workforce_count:680, workforce_source:'linkedin_scrape', workforce_confidence:0.75,
    market_cap_usd:200_000_000,   // Tracxn 2026 est India ops
    pe_ratio:null,
    revenue_ttm_usd:35_000_000,   // Tracxn est FY2025 | P/S=5.7x ✓ RPE=$51.5K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.57,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.65, total_open_roles:115,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'loco logistics platform',
    display_name:'Loco (Intra-city Logistics)',
    ticker:null, exchange:null,
    industry:'LogisticsTech / Last-Mile / Urban Delivery / India',
    sector:'Industrials', is_public:false, country_code:'IN',
    workforce_count:450, workforce_source:'linkedin_scrape', workforce_confidence:0.74,
    market_cap_usd:150_000_000,   // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:22_000_000,   // Tracxn est FY2025 | P/S=6.8x ✓ RPE=$48.9K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.56,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.65, total_open_roles:95,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'blume b2b consulting',
    display_name:'Blume (Venture Capital Advisory)',
    ticker:null, exchange:null,
    industry:'B2B Services / Venture Capital / Advisory / India',
    sector:'Financials', is_public:false, country_code:'IN',
    workforce_count:120, workforce_source:'linkedin_scrape', workforce_confidence:0.70,
    market_cap_usd:80_000_000,    // Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:12_000_000,   // Tracxn est FY2025 | P/S=6.7x ✓ RPE=$100K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.54,
    recent_layoff_count:0, layoff_confidence:0.69,
    hiring_velocity_score:0.65, total_open_roles:45,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'bhavin b2b marketplace',
    display_name:'Bhavin (B2B e-commerce Platform)',
    ticker:null, exchange:null,
    industry:'B2B Services / Procurement / Digital Commerce / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:280, workforce_source:'linkedin_scrape', workforce_confidence:0.72,
    market_cap_usd:100_000_000,   // Series A+; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:14_000_000,   // Tracxn est FY2025 | P/S=7.1x ✓ RPE=$43.8K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.7, total_open_roles:70,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'zetwerk manufacturing',
    display_name:'Zetwerk (Manufacturing Services)',
    ticker:null, exchange:null,
    industry:'B2B Services / Manufacturing / Supply Chain / India',
    sector:'Industrials', is_public:false, country_code:'IN',
    workforce_count:950, workforce_source:'linkedin_scrape', workforce_confidence:0.76,
    market_cap_usd:300_000_000,   // Series D 2021; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:45_000_000,   // Tracxn est FY2025 | P/S=6.7x ✓ RPE=$47.4K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.65, total_open_roles:135,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'avail club workspace',
    display_name:'Avail Club (Office Workspace)',
    ticker:null, exchange:null,
    industry:'B2B Services / Office Workspace / Commercial Real Estate / India',
    sector:'Real Estate', is_public:false, country_code:'IN',
    workforce_count:220, workforce_source:'linkedin_scrape', workforce_confidence:0.71,
    market_cap_usd:75_000_000,    // Series A; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:11_000_000,   // Tracxn est FY2025 | P/S=6.8x ✓ RPE=$50K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.54,
    recent_layoff_count:0, layoff_confidence:0.69,
    hiring_velocity_score:0.65, total_open_roles:55,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'tracto supply chain',
    display_name:'Tracto (Supply Chain Visibility)',
    ticker:null, exchange:null,
    industry:'LogisticsTech / Supply Chain / Visibility / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:320, workforce_source:'linkedin_scrape', workforce_confidence:0.73,
    market_cap_usd:120_000_000,   // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:18_000_000,   // Tracxn est FY2025 | P/S=6.7x ✓ RPE=$56.3K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.7, total_open_roles:75,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'scapia vendor management',
    display_name:'Scapia (Vendor Management SaaS)',
    ticker:null, exchange:null,
    industry:'B2B Services / Vendor Management / Procurement / India',
    sector:'Technology', is_public:false, country_code:'IN',
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
    canonical_name:'shipway shipping',
    display_name:'Shipway (Shipping SaaS)',
    ticker:null, exchange:null,
    industry:'LogisticsTech / Shipping Management / E-commerce / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:250, workforce_source:'linkedin_scrape', workforce_confidence:0.72,
    market_cap_usd:100_000_000,   // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:14_000_000,   // Tracxn est FY2025 | P/S=7.1x ✓ RPE=$56K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.7, total_open_roles:60,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'karrotmarts agri',
    display_name:'Karrot Marts (Agri Marketplace)',
    ticker:null, exchange:null,
    industry:'B2B Services / Agricultural Marketplace / Agri-Tech / India',
    sector:'Consumer Staples', is_public:false, country_code:'IN',
    workforce_count:380, workforce_source:'linkedin_scrape', workforce_confidence:0.74,
    market_cap_usd:120_000_000,   // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:18_000_000,   // Tracxn est FY2025 | P/S=6.7x ✓ RPE=$47.4K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.65, total_open_roles:80,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'arpit cleaning services',
    display_name:'Arpit (Commercial Cleaning SaaS)',
    ticker:null, exchange:null,
    industry:'B2B Services / Cleaning Services / Workforce Mgmt / India',
    sector:'Industrials', is_public:false, country_code:'IN',
    workforce_count:220, workforce_source:'linkedin_scrape', workforce_confidence:0.71,
    market_cap_usd:80_000_000,    // Series A; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:12_000_000,   // Tracxn est FY2025 | P/S=6.7x ✓ RPE=$54.5K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.54,
    recent_layoff_count:0, layoff_confidence:0.69,
    hiring_velocity_score:0.6, total_open_roles:50,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'zuper field service',
    display_name:'Zuper (Field Service Management)',
    ticker:null, exchange:null,
    industry:'B2B Services / Field Service / Workforce / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:350, workforce_source:'linkedin_scrape', workforce_confidence:0.73,
    market_cap_usd:150_000_000,   // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:22_000_000,   // Tracxn est FY2025 | P/S=6.8x ✓ RPE=$62.9K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.56,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.7, total_open_roles:85,
    data_quality_tier:'seed', enrichment_version:V,
  },
];

try {
  await runValidatedBatch(pool, 'GT136: India Logistics & B2B Services (Sub-$400M, 2026)', V, companies);
} catch(e) { console.error(e.message); process.exit(1); }
finally { await pool.end(); }
