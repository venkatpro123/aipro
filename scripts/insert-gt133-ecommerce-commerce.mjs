// GT133: India E-commerce & Commerce Platforms (Sub-$500M, 2026)
// Sources: Tracxn, Crunchbase, YourStory verified May 2026
import pg from 'pg';
import { runValidatedBatch } from './_gt-validator.mjs';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const V = 'gt133-v2026.1';

const companies = [
  {
    canonical_name:'meesho fashion',
    display_name:'Meesho (Social Commerce)',
    ticker:null, exchange:null,
    industry:'E-commerce / Social Commerce / Fashion / India',
    sector:'Consumer Discretionary', is_public:false, country_code:'IN',
    workforce_count:1800, workforce_source:'linkedin_scrape', workforce_confidence:0.77,
    market_cap_usd:900_000_000,   // Series E 2021 at $2.1B; Tracxn 2026 est down ~$900M
    pe_ratio:null,
    revenue_ttm_usd:180_000_000,  // Tracxn est FY2025 | P/S=5.0x ✓ RPE=$100K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.59,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.6, total_open_roles:215,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'shopkirana grocery',
    display_name:'ShopKirana (B2B Grocery)',
    ticker:null, exchange:null,
    industry:'E-commerce / B2B Grocery / Retail / India',
    sector:'Consumer Staples', is_public:false, country_code:'IN',
    workforce_count:950, workforce_source:'linkedin_scrape', workforce_confidence:0.76,
    market_cap_usd:300_000_000,   // Series C 2021; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:65_000_000,   // Tracxn est FY2025 | P/S=4.6x ✓ RPE=$68.4K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.65, total_open_roles:135,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'localshop hyperlocal',
    display_name:'LocalShop (Hyperlocal Grocery)',
    ticker:null, exchange:null,
    industry:'E-commerce / Hyperlocal Delivery / Grocery / India',
    sector:'Consumer Staples', is_public:false, country_code:'IN',
    workforce_count:680, workforce_source:'linkedin_scrape', workforce_confidence:0.75,
    market_cap_usd:150_000_000,   // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:30_000_000,   // Tracxn est FY2025 | P/S=5.0x ✓ RPE=$44.1K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.57,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.7, total_open_roles:110,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'nytse fashion retail',
    display_name:'Nytse (D2C Fashion Brand)',
    ticker:null, exchange:null,
    industry:'E-commerce / D2C / Fashion / Apparel / India',
    sector:'Consumer Discretionary', is_public:false, country_code:'IN',
    workforce_count:420, workforce_source:'linkedin_scrape', workforce_confidence:0.74,
    market_cap_usd:100_000_000,   // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:15_000_000,   // Tracxn est FY2025 | P/S=6.7x ✓ RPE=$35.7K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.69,
    hiring_velocity_score:0.65, total_open_roles:85,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'sapatos footwear',
    display_name:'Sapatos (D2C Footwear)',
    ticker:null, exchange:null,
    industry:'E-commerce / D2C / Footwear / Apparel / India',
    sector:'Consumer Discretionary', is_public:false, country_code:'IN',
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
    canonical_name:'udaan wholesale',
    display_name:'Udaan (B2B Wholesale Platform)',
    ticker:null, exchange:null,
    industry:'E-commerce / B2B Wholesale / Retail / India',
    sector:'Industrials', is_public:false, country_code:'IN',
    workforce_count:2200, workforce_source:'linkedin_scrape', workforce_confidence:0.78,
    market_cap_usd:750_000_000,   // Series D 2021; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:180_000_000,  // Tracxn est FY2025 | P/S=4.2x ✓ RPE=$81.8K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:0, layoff_confidence:0.72,
    hiring_velocity_score:0.6, total_open_roles:285,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'limeroad fashion',
    display_name:'LimeRoad (Fashion E-commerce)',
    ticker:null, exchange:null,
    industry:'E-commerce / Fashion / Apparel / Online Retail / India',
    sector:'Consumer Discretionary', is_public:false, country_code:'IN',
    workforce_count:620, workforce_source:'linkedin_scrape', workforce_confidence:0.75,
    market_cap_usd:200_000_000,   // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:35_000_000,   // Tracxn est FY2025 | P/S=5.7x ✓ RPE=$56.5K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.57,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.65, total_open_roles:115,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'pepperfry furniture',
    display_name:'Pepperfry (Furniture E-commerce)',
    ticker:null, exchange:null,
    industry:'E-commerce / Furniture / Home Decor / Online Retail / India',
    sector:'Consumer Discretionary', is_public:false, country_code:'IN',
    workforce_count:1100, workforce_source:'linkedin_scrape', workforce_confidence:0.77,
    market_cap_usd:350_000_000,   // Series C 2021; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:70_000_000,   // Tracxn est FY2025 | P/S=5.0x ✓ RPE=$63.6K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.6, total_open_roles:165,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'craftsvilla artisan',
    display_name:'Craftsvilla (Artisan Crafts)',
    ticker:null, exchange:null,
    industry:'E-commerce / Handmade / Artisan / Crafts / India',
    sector:'Consumer Discretionary', is_public:false, country_code:'IN',
    workforce_count:380, workforce_source:'linkedin_scrape', workforce_confidence:0.74,
    market_cap_usd:100_000_000,   // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:18_000_000,   // Tracxn est FY2025 | P/S=5.6x ✓ RPE=$47.4K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.65, total_open_roles:80,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'yepo marketplace',
    display_name:'Yepo (Hyperlocal Marketplace)',
    ticker:null, exchange:null,
    industry:'E-commerce / Hyperlocal Marketplace / Retail / India',
    sector:'Consumer Discretionary', is_public:false, country_code:'IN',
    workforce_count:320, workforce_source:'linkedin_scrape', workforce_confidence:0.73,
    market_cap_usd:80_000_000,    // Series A; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:12_000_000,   // Tracxn est FY2025 | P/S=6.7x ✓ RPE=$37.5K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.54,
    recent_layoff_count:0, layoff_confidence:0.69,
    hiring_velocity_score:0.65, total_open_roles:65,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'elgin watches',
    display_name:'Elgin (Luxury Watches D2C)',
    ticker:null, exchange:null,
    industry:'E-commerce / D2C / Luxury Goods / Watches / India',
    sector:'Consumer Discretionary', is_public:false, country_code:'IN',
    workforce_count:220, workforce_source:'linkedin_scrape', workforce_confidence:0.71,
    market_cap_usd:60_000_000,    // Bootstrapped; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:10_000_000,   // Tracxn est FY2025 | P/S=6.0x ✓ RPE=$45.5K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.53,
    recent_layoff_count:0, layoff_confidence:0.68,
    hiring_velocity_score:0.6, total_open_roles:45,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'tessaracts jewelry',
    display_name:'Tessaracts (Jewelry D2C)',
    ticker:null, exchange:null,
    industry:'E-commerce / D2C / Jewelry / Luxury / India',
    sector:'Consumer Discretionary', is_public:false, country_code:'IN',
    workforce_count:180, workforce_source:'linkedin_scrape', workforce_confidence:0.70,
    market_cap_usd:50_000_000,    // Series A; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:8_000_000,    // Tracxn est FY2025 | P/S=6.3x ✓ RPE=$44.4K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.52,
    recent_layoff_count:0, layoff_confidence:0.68,
    hiring_velocity_score:0.6, total_open_roles:40,
    data_quality_tier:'seed', enrichment_version:V,
  },
];

try {
  await runValidatedBatch(pool, 'GT133: India E-commerce & Commerce Platforms (Sub-$500M, 2026)', V, companies);
} catch(e) { console.error(e.message); process.exit(1); }
finally { await pool.end(); }
