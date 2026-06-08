// GT38: Vertical SaaS — Legal, Insurance, Restaurant, Construction, Travel Tech (2026)
import { runBatch } from './_gt-upsert-lib.mjs';
const V = 'gt38-v2026.1';

const companies = [
  // ── US-listed vertical SaaS (Yahoo) ───────────────────────────────────────
  { canonical_name:'intapp inc', display_name:'Intapp Inc.', ticker:'INTA', exchange:'NASDAQ',
    industry:'Legal & Professional Services Software / Law Firm SaaS / Compliance / DealCloud / AI for Firms', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:1300, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:0, layoff_confidence:0.72, hiring_velocity_score:0.5, total_open_roles:90, enrichment_version:V },

  { canonical_name:'cs disco inc', display_name:'CS Disco Inc.', ticker:'LAW', exchange:'NYSE',
    industry:'Legal Tech / E-Discovery / Legal AI / Litigation Software / Cloud Legal Review Platform', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:700, workforce_source:'annual_report', workforce_confidence:0.85,
    recent_layoff_count:2, layoff_confidence:0.82, hiring_velocity_score:-0.5, total_open_roles:40, enrichment_version:V },

  { canonical_name:'sapiens international corporation', display_name:'Sapiens International Corporation', ticker:'SPNS', exchange:'NASDAQ',
    industry:'Insurance Software / Core Insurance Platforms / P&C / Life / Reinsurance / InsurTech SaaS', sector:'Technology',
    is_public:true, country_code:'IL', workforce_count:5500, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:1, layoff_confidence:0.78, hiring_velocity_score:0.1, total_open_roles:150, enrichment_version:V },

  { canonical_name:'olo inc', display_name:'Olo Inc.', ticker:'OLO', exchange:'NYSE',
    industry:'Restaurant Tech / Online Ordering / Digital Ordering Platform / Restaurant Commerce SaaS', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:800, workforce_source:'annual_report', workforce_confidence:0.85,
    recent_layoff_count:1, layoff_confidence:0.78, hiring_velocity_score:0.2, total_open_roles:50, enrichment_version:V },

  { canonical_name:'par technology corporation', display_name:'PAR Technology Corporation', ticker:'PAR', exchange:'NYSE',
    industry:'Restaurant Technology / POS / Cloud Restaurant Software / Loyalty / Back Office SaaS', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:2500, workforce_source:'annual_report', workforce_confidence:0.85,
    recent_layoff_count:0, layoff_confidence:0.72, hiring_velocity_score:0.4, total_open_roles:80, enrichment_version:V },

  { canonical_name:'agilysys inc', display_name:'Agilysys Inc.', ticker:'AGYS', exchange:'NASDAQ',
    industry:'Hospitality Software / Hotel PMS / POS / Property Management / Resort & Casino Tech SaaS', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:1900, workforce_source:'annual_report', workforce_confidence:0.85,
    recent_layoff_count:0, layoff_confidence:0.72, hiring_velocity_score:0.5, total_open_roles:80, enrichment_version:V },

  { canonical_name:'clearwater analytics holdings inc', display_name:'Clearwater Analytics Holdings Inc.', ticker:'CWAN', exchange:'NYSE',
    industry:'Investment Accounting SaaS / Portfolio Reporting / Insurance & Asset Manager Analytics', sector:'Financial Technology',
    is_public:true, country_code:'US', workforce_count:1800, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:0, layoff_confidence:0.72, hiring_velocity_score:0.6, total_open_roles:120, enrichment_version:V },

  { canonical_name:'blackbaud inc', display_name:'Blackbaud Inc.', ticker:'BLKB', exchange:'NASDAQ',
    industry:'Nonprofit Software / Fundraising / Donor Management / Education SaaS / Social Good Tech', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:3000, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:2, layoff_confidence:0.82, hiring_velocity_score:-0.5, total_open_roles:80, enrichment_version:V },

  { canonical_name:'definitive healthcare corp', display_name:'Definitive Healthcare Corp.', ticker:'DH', exchange:'NASDAQ',
    industry:'Healthcare Commercial Intelligence / Provider Data / Analytics SaaS / Health Market Data', sector:'Healthcare Technology',
    is_public:true, country_code:'US', workforce_count:850, workforce_source:'annual_report', workforce_confidence:0.85,
    recent_layoff_count:2, layoff_confidence:0.82, hiring_velocity_score:-0.5, total_open_roles:40, enrichment_version:V },

  { canonical_name:'avidxchange holdings inc', display_name:'AvidXchange Holdings Inc.', ticker:'AVDX', exchange:'NASDAQ',
    industry:'Accounts Payable Automation / B2B Payments / Middle-Market FinTech SaaS / Invoice Automation', sector:'Financial Technology',
    is_public:true, country_code:'US', workforce_count:1700, workforce_source:'annual_report', workforce_confidence:0.85,
    recent_layoff_count:1, layoff_confidence:0.78, hiring_velocity_score:-0.2, total_open_roles:60, enrichment_version:V },

  { canonical_name:'flywire corporation', display_name:'Flywire Corporation', ticker:'FLYW', exchange:'NASDAQ',
    industry:'Global Payments / Education Payments / Healthcare Payments / Cross-Border FinTech SaaS', sector:'Financial Technology',
    is_public:true, country_code:'US', workforce_count:1300, workforce_source:'annual_report', workforce_confidence:0.85,
    recent_layoff_count:1, layoff_confidence:0.78, hiring_velocity_score:0.2, total_open_roles:80, enrichment_version:V },

  { canonical_name:'weave communications inc', display_name:'Weave Communications Inc.', ticker:'WEAV', exchange:'NYSE',
    industry:'SMB Communication Platform / Dental & Healthcare Practice SaaS / Patient Engagement', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:1000, workforce_source:'annual_report', workforce_confidence:0.85,
    recent_layoff_count:0, layoff_confidence:0.72, hiring_velocity_score:0.4, total_open_roles:60, enrichment_version:V },

  { canonical_name:'yext inc', display_name:'Yext Inc.', ticker:'YEXT', exchange:'NYSE',
    industry:'Digital Presence Management / Listings / Search SaaS / Brand Knowledge / Reviews Platform', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:1100, workforce_source:'annual_report', workforce_confidence:0.85,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:-0.3, total_open_roles:50, enrichment_version:V },

  { canonical_name:'samsara inc', display_name:'Samsara Inc.', ticker:'IOT', exchange:'NYSE',
    industry:'Connected Operations / Fleet Telematics / IoT Platform / Physical Operations SaaS', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:3000, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:0, layoff_confidence:0.72, hiring_velocity_score:0.8, total_open_roles:300, enrichment_version:V },

  // ── Pre-filled / private vertical SaaS ─────────────────────────────────────
  { canonical_name:'amadeus it group sa', display_name:'Amadeus IT Group SA', ticker:null, exchange:'BME',
    industry:'Travel Technology / GDS / Airline IT / Hospitality / Travel Distribution Platform Spain', sector:'Technology',
    is_public:true, country_code:'ES', workforce_count:19000, workforce_source:'annual_report', workforce_confidence:0.90,
    market_cap_usd:32000000000, pe_ratio:28, revenue_ttm_usd:6500000000,
    financials_source:'annual_report', financials_confidence:0.85,
    recent_layoff_count:0, layoff_confidence:0.72, hiring_velocity_score:0.3, total_open_roles:500, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'relativity oda llc', display_name:'Relativity ODA LLC', ticker:null, exchange:null,
    industry:'Legal Tech / E-Discovery / Litigation Software / RelativityOne Cloud / Legal AI Review', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:1500, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:3600000000, pe_ratio:null, revenue_ttm_usd:400000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:0, layoff_confidence:0.70, hiring_velocity_score:0.3, total_open_roles:80, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'everlaw inc', display_name:'Everlaw Inc.', ticker:null, exchange:null,
    industry:'Legal Tech / E-Discovery / Litigation Cloud / Legal AI / Investigation Software', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:800, workforce_source:'news_rss_scrape', workforce_confidence:0.75,
    market_cap_usd:2000000000, pe_ratio:null, revenue_ttm_usd:130000000,
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:0, layoff_confidence:0.70, hiring_velocity_score:0.5, total_open_roles:50, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'duck creek technologies llc', display_name:'Duck Creek Technologies LLC', ticker:null, exchange:null,
    industry:'Insurance Software / P&C Core Systems / Policy / Billing / Claims / InsurTech SaaS', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:1900, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:2600000000, pe_ratio:null, revenue_ttm_usd:340000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.0, total_open_roles:60, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'applied systems inc', display_name:'Applied Systems Inc.', ticker:null, exchange:null,
    industry:'Insurance Agency Management / InsurTech / Cloud Insurance Software / Broker Platform', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:3500, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:9000000000, pe_ratio:null, revenue_ttm_usd:800000000,
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:0, layoff_confidence:0.70, hiring_velocity_score:0.3, total_open_roles:120, data_quality_tier:'seed', enrichment_version:V },
];

runBatch('GT38: Vertical SaaS — Legal/Insurance/Restaurant/Construction/Travel (2026)', V, companies)
  .catch(e=>{ console.error(e); process.exit(1); });
