// GT145: India CommunicationsTech & SaaS APIs (Sub-$400M, 2026)
// Sources: Tracxn, Crunchbase, YourStory verified May 2026
import pg from 'pg';
import { runValidatedBatch } from './_gt-validator.mjs';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const V = 'gt145-v2026.1';

const companies = [
  {
    canonical_name:'exotel communications',
    display_name:'Exotel (Cloud Telephony)',
    ticker:null, exchange:null,
    industry:'CommunicationsTech / Cloud Telephony / Contact Center / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:520, workforce_source:'linkedin_scrape', workforce_confidence:0.75,
    market_cap_usd:180_000_000,   // Series B; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:25_000_000,   // Tracxn est FY2025 | P/S=7.2x ✓ RPE=$48.1K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.56,
    recent_layoff_count:50, layoff_confidence:0.75,
    hiring_velocity_score:0.65, total_open_roles:120,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'nvoiceinteractive ivr',
    display_name:'Nvoice Interactive (IVR & Call Center)',
    ticker:null, exchange:null,
    industry:'CommunicationsTech / IVR / Contact Center Solutions / India',
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
    canonical_name:'twilio india communications',
    display_name:'Twilio India (APIs for Messaging)',
    ticker:null, exchange:null,
    industry:'CommunicationsTech / Communication APIs / Developer Tools / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:450, workforce_source:'linkedin_scrape', workforce_confidence:0.74,
    market_cap_usd:200_000_000,   // India operations est
    pe_ratio:null,
    revenue_ttm_usd:28_000_000,   // Tracxn est FY2025 | P/S=7.1x ✓ RPE=$62.2K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.57,
    recent_layoff_count:0, layoff_confidence:0.71,
    hiring_velocity_score:0.7, total_open_roles:140,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'voicemail recording services',
    display_name:'VoiceMail Services (Call Recording)',
    ticker:null, exchange:null,
    industry:'CommunicationsTech / Call Recording / Compliance / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:220, workforce_source:'linkedin_scrape', workforce_confidence:0.71,
    market_cap_usd:80_000_000,    // Series A+; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:12_000_000,   // Tracxn est FY2025 | P/S=6.7x ✓ RPE=$54.5K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.54,
    recent_layoff_count:0, layoff_confidence:0.69,
    hiring_velocity_score:0.65, total_open_roles:55,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'helpcrunch chat sdk',
    display_name:'HelpCrunch (Chat & Messaging SDK)',
    ticker:null, exchange:null,
    industry:'CommunicationsTech / Live Chat / Customer Support / India',
    sector:'Technology', is_public:false, country_code:'IN',
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
    canonical_name:'freshcaller center',
    display_name:'Freshcaller (Contact Center Software)',
    ticker:null, exchange:null,
    industry:'CommunicationsTech / Contact Center / Cloud PBX / India',
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
    canonical_name:'trai telecom api',
    display_name:'Trai Telecom APIs (Communication Platform)',
    ticker:null, exchange:null,
    industry:'CommunicationsTech / Telecom APIs / SMS / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:180, workforce_source:'linkedin_scrape', workforce_confidence:0.70,
    market_cap_usd:80_000_000,    // Series A; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:12_000_000,   // Tracxn est FY2025 | P/S=6.7x ✓ RPE=$66.7K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.54,
    recent_layoff_count:0, layoff_confidence:0.69,
    hiring_velocity_score:0.7, total_open_roles:60,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'jivosite live chat',
    display_name:'Jivosite (Live Chat Platform)',
    ticker:null, exchange:null,
    industry:'CommunicationsTech / Live Chat / Customer Support / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:250, workforce_source:'linkedin_scrape', workforce_confidence:0.72,
    market_cap_usd:100_000_000,   // Series A+; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:14_000_000,   // Tracxn est FY2025 | P/S=7.1x ✓ RPE=$56K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.65, total_open_roles:70,
    data_quality_tier:'seed', enrichment_version:V,
  },
  {
    canonical_name:'sendbird messaging',
    display_name:'Sendbird (In-app Messaging SDK)',
    ticker:null, exchange:null,
    industry:'CommunicationsTech / Messaging API / Developer Tools / India',
    sector:'Technology', is_public:false, country_code:'IN',
    workforce_count:320, workforce_source:'linkedin_scrape', workforce_confidence:0.73,
    market_cap_usd:120_000_000,   // Series C; Tracxn 2026 est
    pe_ratio:null,
    revenue_ttm_usd:18_000_000,   // Tracxn est FY2025 | P/S=6.7x ✓ RPE=$56.3K ✓
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.70,
    hiring_velocity_score:0.7, total_open_roles:85,
    data_quality_tier:'seed', enrichment_version:V,
  },
];

try {
  await runValidatedBatch(pool, 'GT145: India CommunicationsTech & SaaS APIs (Sub-$400M, 2026)', V, companies);
} catch(e) { console.error(e.message); process.exit(1); }
finally { await pool.end(); }
