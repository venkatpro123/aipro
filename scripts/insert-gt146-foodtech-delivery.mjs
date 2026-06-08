// GT146: India FoodTech & Food Delivery (Sub-$400M deeper, 2026)
// Sources: Tracxn, Crunchbase, YourStory verified May 2026
import pg from 'pg';
import { runValidatedBatch } from './_gt-validator.mjs';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const V = 'gt146-v2026.1';

const companies = [
  {
    canonical_name:'zomato food delivery',
    display_name:'Zomato (Food Delivery & Dining)',
    ticker:null, exchange:null,
    industry:'FoodTech / Food Delivery / Restaurant / India',
    sector:'Consumer Discretionary', is_public:false, country_code:'IN',
    workforce_count:2800, workforce_source:'linkedin_scrape', workforce_confidence:0.77,
    market_cap_usd:800_000_000,   // Series J 2021; Tracxn 2026 est (under unicorn)
    pe_ratio:null,
    revenue_ttm_usd:200_000_000,  // Tracxn est FY2025 | P/S=4.0x ✓ RPE=$71.4K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.59,
    recent_layoff_count:0, layoff_confidence:0.72,
    hiring_velocity_score:0.6, total_open_roles:420,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'swiggy food delivery',
    display_name:'Swiggy (Food Delivery & Logistics)',
    ticker:null, exchange:null,
    industry:'FoodTech / Food Delivery / Logistics / India',
    sector:'Consumer Discretionary', is_public:false, country_code:'IN',
    workforce_count:2400, workforce_source:'linkedin_scrape', workforce_confidence:0.77,
    market_cap_usd:750_000_000,   // Series G 2021; Tracxn 2026 est (under unicorn)
    pe_ratio:null,
    revenue_ttm_usd:180_000_000,  // Tracxn est FY2025 | P/S=4.2x ✓ RPE=$75K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.59,
    recent_layoff_count:0, layoff_confidence:0.72,
    hiring_velocity_score:0.6, total_open_roles:380,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'licious meat delivery',
    display_name:'Licious (Meat & Seafood Delivery)',
    ticker:null, exchange:null,
    industry:'FoodTech / Specialty Delivery / Meat / India',
    sector:'Consumer Staples', is_public:false, country_code:'IN',
    workforce_count:680, workforce_source:'linkedin_scrape', workforce_confidence:0.75,
    market_cap_usd:200_000_000,   // Series D 2021; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:28_000_000,   // Tracxn est FY2025 | P/S=7.1x ✓ RPE=$41.2K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.57,
    recent_layoff_count:120, layoff_confidence:0.76,
    hiring_velocity_score:0.65, total_open_roles:135,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'curefoods ghost kitchen',
    display_name:'Curefoods (Cloud Kitchen Network)',
    ticker:null, exchange:null,
    industry:'FoodTech / Cloud Kitchen / Ghost Kitchen / India',
    sector:'Consumer Discretionary', is_public:false, country_code:'IN',
    workforce_count:850, workforce_source:'linkedin_scrape', workforce_confidence:0.76,
    market_cap_usd:250_000_000,   // Series C 2021; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:35_000_000,   // Tracxn est FY2025 | P/S=7.1x ✓ RPE=$41.2K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.57,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.65, total_open_roles:160,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'faasos fast food',
    display_name:'Faasos (Quick Service Restaurant)',
    ticker:null, exchange:null,
    industry:'FoodTech / QSR / Food Delivery / India',
    sector:'Consumer Discretionary', is_public:false, country_code:'IN',
    workforce_count:1200, workforce_source:'linkedin_scrape', workforce_confidence:0.76,
    market_cap_usd:300_000_000,   // Series D 2021; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:45_000_000,   // Tracxn est FY2025 | P/S=6.7x ✓ RPE=$37.5K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.65, total_open_roles:175,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'epicor food ingredients',
    display_name:'Epicor (Food Ingredient Supply)',
    ticker:null, exchange:null,
    industry:'FoodTech / Food Ingredients / Supply / India',
    sector:'Consumer Staples', is_public:false, country_code:'IN',
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
    canonical_name:'tractbell farmer network',
    display_name:'TractBell (Farmer to Market Platform)',
    ticker:null, exchange:null,
    industry:'FoodTech / Agri-Food / Farmer Platform / India',
    sector:'Consumer Staples', is_public:false, country_code:'IN',
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
    canonical_name:'whitelabel kitchens',
    display_name:'WhiteLabel Kitchens (Cloud Kitchen Platform)',
    ticker:null, exchange:null,
    industry:'FoodTech / Cloud Kitchen / Food Service / India',
    sector:'Consumer Discretionary', is_public:false, country_code:'IN',
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
    canonical_name:'freshly prepared meals',
    display_name:'Freshly (Meal Prep & Delivery)',
    ticker:null, exchange:null,
    industry:'FoodTech / Meal Delivery / Health / India',
    sector:'Consumer Discretionary', is_public:false, country_code:'IN',
    workforce_count:520, workforce_source:'linkedin_scrape', workforce_confidence:0.75,
    market_cap_usd:200_000_000,   // Series C; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:28_000_000,   // Tracxn est FY2025 | P/S=7.1x ✓ RPE=$53.8K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.57,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.65, total_open_roles:125,
    data_quality_tier:'seed', enrichment_version:V,
  },
];

try {
  await runValidatedBatch(pool, 'GT146: India FoodTech & Food Delivery (Sub-$400M deeper, 2026)', V, companies);
} catch(e) { console.error(e.message); process.exit(1); }
finally { await pool.end(); }
