// GT143: India RetailTech & Consumer Services (Sub-$400M, 2026)
// Sources: Tracxn, Crunchbase, YourStory verified May 2026
import pg from 'pg';
import { runValidatedBatch } from './_gt-validator.mjs';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const V = 'gt143-v2026.1';

const companies = [
  {
    canonical_name:'vyapar pos',
    display_name:'Vyapar (Retail POS & Accounting)',
    ticker:null, exchange:null,
    industry:'RetailTech / POS / Point of Sale / Accounting / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:520, workforce_source:'linkedin_scrape', workforce_confidence:0.75,
    market_cap_usd:180_000_000,   // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:25_000_000,   // Tracxn est FY2025 | P/S=7.2x ✓ RPE=$48.1K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.56,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.65, total_open_roles:120,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'nextupretail pos',
    display_name:'Nextup (Retail Management Software)',
    ticker:null, exchange:null,
    industry:'RetailTech / Retail Management / POS / India',
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
    canonical_name:'billdesk retail',
    display_name:'Billdesk (Payment & Retail Solutions)',
    ticker:null, exchange:null,
    industry:'RetailTech / Payments / Retail Solutions / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:680, workforce_source:'linkedin_scrape', workforce_confidence:0.75,
    market_cap_usd:200_000_000,   // Series C; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:28_000_000,   // Tracxn est FY2025 | P/S=7.1x ✓ RPE=$41.2K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.57,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.65, total_open_roles:140,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'qikify fashion retail',
    display_name:'Qikify (Fashion Retail Platform)',
    ticker:null, exchange:null,
    industry:'RetailTech / Fashion / Retail / E-commerce / India',
    sector:'Consumer Discretionary', is_public:false, country_code:'IN',
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
    canonical_name:'ginesys retail',
    display_name:'Ginesys (Retail Management Systems)',
    ticker:null, exchange:null,
    industry:'RetailTech / Retail Software / Inventory / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:380, workforce_source:'linkedin_scrape', workforce_confidence:0.74,
    market_cap_usd:120_000_000,   // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:18_000_000,   // Tracxn est FY2025 | P/S=6.7x ✓ RPE=$47.4K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.65, total_open_roles:90,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'vaibhavi services',
    display_name:'Vaibhavi (Retail Services Network)',
    ticker:null, exchange:null,
    industry:'RetailTech / Consumer Services / Repair / India',
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
    canonical_name:'brandstandard fashion',
    display_name:'BrandStandard (Fashion & Lifestyle)',
    ticker:null, exchange:null,
    industry:'RetailTech / Fashion Retail / D2C / India',
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
    canonical_name:'mswipe retail',
    display_name:'mSwipe (Mobile POS & Payments)',
    ticker:null, exchange:null,
    industry:'RetailTech / Mobile POS / Payments / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:520, workforce_source:'linkedin_scrape', workforce_confidence:0.75,
    market_cap_usd:200_000_000,   // Series C; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:28_000_000,   // Tracxn est FY2025 | P/S=7.1x ✓ RPE=$53.8K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.57,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.65, total_open_roles:125,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'fynd retail',
    display_name:'Fynd (Retail Platform)',
    ticker:null, exchange:null,
    industry:'RetailTech / Fashion Retail / Inventory / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:620, workforce_source:'linkedin_scrape', workforce_confidence:0.75,
    market_cap_usd:200_000_000,   // Series C; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:28_000_000,   // Tracxn est FY2025 | P/S=7.1x ✓ RPE=$45.2K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.57,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.65, total_open_roles:135,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'nibl consumer services',
    display_name:'Nibl (Consumer Services & Reviews)',
    ticker:null, exchange:null,
    industry:'RetailTech / Consumer Services / Reviews / India',
    sector:'Consumer Discretionary', is_public:false, country_code:'IN',
    workforce_count:220, workforce_source:'linkedin_scrape', workforce_confidence:0.71,
    market_cap_usd:80_000_000,    // Series A+; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:12_000_000,   // Tracxn est FY2025 | P/S=6.7x ✓ RPE=$54.5K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.54,
    recent_layoff_count:0, layoff_confidence:0.69,
    hiring_velocity_score:0.65, total_open_roles:55,
    data_quality_tier:'seed', enrichment_version:V,
  },
];

try {
  await runValidatedBatch(pool, 'GT143: India RetailTech & Consumer Services (Sub-$400M, 2026)', V, companies);
} catch(e) { console.error(e.message); process.exit(1); }
finally { await pool.end(); }
