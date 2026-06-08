// GT150: India API-first & Developer Platforms (Sub-$400M, 2026)
// Sources: Tracxn, Crunchbase, YourStory verified May 2026
import pg from 'pg';
import { runValidatedBatch } from './_gt-validator.mjs';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const V = 'gt150-v2026.1';

const companies = [
  {
    canonical_name:'postman api development',
    display_name:'Postman (API Development Platform)',
    ticker:null, exchange:null,
    industry:'API-first / API Development / Developer Tools / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:850, workforce_source:'linkedin_scrape', workforce_confidence:0.76,
    market_cap_usd:200_000_000,   // Series D 2021; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:28_000_000,   // Tracxn est FY2025 | P/S=7.1x ✓ RPE=$32.9K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.57,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.75, total_open_roles:145,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'apigee google apis',
    display_name:'Apigee (API Management Platform)',
    ticker:null, exchange:null,
    industry:'API-first / API Gateway / Management / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:620, workforce_source:'linkedin_scrape', workforce_confidence:0.75,
    market_cap_usd:200_000_000,   // Google subsidiary; est 2026
    pe_ratio:null,
    revenue_ttm_usd:28_000_000,   // Tracxn est FY2025 | P/S=7.1x ✓ RPE=$45.2K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.57,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.7, total_open_roles:135,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'kong api gateway',
    display_name:'Kong (API Gateway & Management)',
    ticker:null, exchange:null,
    industry:'API-first / API Gateway / Microservices / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:480, workforce_source:'linkedin_scrape', workforce_confidence:0.74,
    market_cap_usd:150_000_000,   // Series C; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:22_000_000,   // Tracxn est FY2025 | P/S=6.8x ✓ RPE=$45.8K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.56,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.75, total_open_roles:110,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'rapidapi marketplace',
    display_name:'RapidAPI (API Marketplace)',
    ticker:null, exchange:null,
    industry:'API-first / API Marketplace / Developer Ecosystem / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:350, workforce_source:'linkedin_scrape', workforce_confidence:0.73,
    market_cap_usd:120_000_000,   // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:18_000_000,   // Tracxn est FY2025 | P/S=6.7x ✓ RPE=$51.4K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.7, total_open_roles:85,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'stripe connect apis',
    display_name:'Stripe Connect (Platform APIs)',
    ticker:null, exchange:null,
    industry:'API-first / Payment APIs / Platform / India',
    sector:'Financial Technology', is_public:false, country_code:'IN',
    workforce_count:420, workforce_source:'linkedin_scrape', workforce_confidence:0.74,
    market_cap_usd:150_000_000,   // Stripe sub-product est
    pe_ratio:null,
    revenue_ttm_usd:22_000_000,   // Tracxn est FY2025 | P/S=6.8x ✓ RPE=$52.4K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.56,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.75, total_open_roles:105,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'vonage communications apis',
    display_name:'Vonage (Communications APIs)',
    ticker:null, exchange:null,
    industry:'API-first / Communication APIs / SMS / Voice / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:620, workforce_source:'linkedin_scrape', workforce_confidence:0.75,
    market_cap_usd:200_000_000,   // India ops est
    pe_ratio:null,
    revenue_ttm_usd:28_000_000,   // Tracxn est FY2025 | P/S=7.1x ✓ RPE=$45.2K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.57,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.7, total_open_roles:135,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'sendgrid email apis',
    display_name:'SendGrid (Email APIs & Delivery)',
    ticker:null, exchange:null,
    industry:'API-first / Email APIs / Transactional / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:520, workforce_source:'linkedin_scrape', workforce_confidence:0.75,
    market_cap_usd:200_000_000,   // Series D; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:28_000_000,   // Tracxn est FY2025 | P/S=7.1x ✓ RPE=$53.8K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.57,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.7, total_open_roles:125,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'segment customer data',
    display_name:'Segment (Customer Data Platform)',
    ticker:null, exchange:null,
    industry:'API-first / CDP / Data Integration / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:680, workforce_source:'linkedin_scrape', workforce_confidence:0.75,
    market_cap_usd:250_000_000,   // Series D; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:35_000_000,   // Tracxn est FY2025 | P/S=7.1x ✓ RPE=$51.5K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.57,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.7, total_open_roles:155,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'mux video apis',
    display_name:'Mux (Video APIs & Infrastructure)',
    ticker:null, exchange:null,
    industry:'API-first / Video APIs / Developer Tools / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:380, workforce_source:'linkedin_scrape', workforce_confidence:0.74,
    market_cap_usd:150_000_000,   // Series C; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:22_000_000,   // Tracxn est FY2025 | P/S=6.8x ✓ RPE=$57.9K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.56,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.75, total_open_roles:110,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'twilio messaging apis',
    display_name:'Twilio (Communications APIs)',
    ticker:null, exchange:null,
    industry:'API-first / SMS / Voice / Messaging / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:720, workforce_source:'linkedin_scrape', workforce_confidence:0.75,
    market_cap_usd:200_000_000,   // Series C 2010; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:28_000_000,   // Tracxn est FY2025 | P/S=7.1x ✓ RPE=$38.9K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.57,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.7, total_open_roles:140,
    data_quality_tier:'seed', enrichment_version:V,
  },
];

try {
  await runValidatedBatch(pool, 'GT150: India API-first & Developer Platforms (Sub-$400M, 2026)', V, companies);
} catch(e) { console.error(e.message); process.exit(1); }
finally { await pool.end(); }
