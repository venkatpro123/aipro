// GT83, GT84, GT85: Developer Tools, Climate Tech, D2C Startups (2026)
import { runBatch } from './_gt-upsert-lib.mjs';

// GT83: Developer Tools & Infrastructure
const gt83companies = [
  { canonical_name:'hasura graphql', display_name:'Hasura (GraphQL)', ticker:null, exchange:null, industry:'Developer Tools / GraphQL / API / India', sector:'Technology', is_public:false, country_code:'IN', workforce_count:280, workforce_source:'news_rss_scrape', workforce_confidence:0.72, market_cap_usd:1500000000, pe_ratio:null, revenue_ttm_usd:180000000, financials_source:'news_rss_scrape', financials_confidence:0.60, recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.6, total_open_roles:100, data_quality_tier:'seed', enrichment_version:'gt83-v2026.1' },
  { canonical_name:'zuplo api platform', display_name:'Zuplo (API Gateway)', ticker:null, exchange:null, industry:'Developer Tools / API Management / India', sector:'Technology', is_public:false, country_code:'IN', workforce_count:150, workforce_source:'news_rss_scrape', workforce_confidence:0.70, market_cap_usd:800000000, pe_ratio:null, revenue_ttm_usd:100000000, financials_source:'news_rss_scrape', financials_confidence:0.56, recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.7, total_open_roles:50, data_quality_tier:'seed', enrichment_version:'gt83-v2026.1' },
];

// GT84: Climate Tech & IoT
const gt84companies = [
  { canonical_name:'smartdrive systems', display_name:'SmartDrive Systems', ticker:null, exchange:null, industry:'Climate Tech / Automotive IoT / India', sector:'Technology', is_public:false, country_code:'IN', workforce_count:600, workforce_source:'news_rss_scrape', workforce_confidence:0.74, market_cap_usd:2000000000, pe_ratio:null, revenue_ttm_usd:300000000, financials_source:'news_rss_scrape', financials_confidence:0.60, recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.5, total_open_roles:150, data_quality_tier:'seed', enrichment_version:'gt84-v2026.1' },
  { canonical_name:'aeristech', display_name:'Aeris Tech', ticker:null, exchange:null, industry:'Climate Tech / Air Quality / IoT / India', sector:'Technology', is_public:false, country_code:'IN', workforce_count:250, workforce_source:'news_rss_scrape', workforce_confidence:0.72, market_cap_usd:1200000000, pe_ratio:null, revenue_ttm_usd:150000000, financials_source:'news_rss_scrape', financials_confidence:0.58, recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.6, total_open_roles:80, data_quality_tier:'seed', enrichment_version:'gt84-v2026.1' },
];

// GT85: D2C & Consumer Tech
const gt85companies = [
  { canonical_name:'boat lifestyle', display_name:'boAt Lifestyle', ticker:null, exchange:null, industry:'D2C / Consumer Electronics / Audio / India', sector:'Consumer Discretionary', is_public:false, country_code:'IN', workforce_count:1200, workforce_source:'news_rss_scrape', workforce_confidence:0.76, market_cap_usd:4200000000, pe_ratio:null, revenue_ttm_usd:1000000000, financials_source:'news_rss_scrape', financials_confidence:0.62, recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.5, total_open_roles:300, data_quality_tier:'seed', enrichment_version:'gt85-v2026.1' },
  { canonical_name:'sugar cosmetics', display_name:'Sugar Cosmetics', ticker:null, exchange:null, industry:'D2C / Beauty / India', sector:'Consumer Discretionary', is_public:false, country_code:'IN', workforce_count:500, workforce_source:'news_rss_scrape', workforce_confidence:0.74, market_cap_usd:1500000000, pe_ratio:null, revenue_ttm_usd:300000000, financials_source:'news_rss_scrape', financials_confidence:0.60, recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.5, total_open_roles:150, data_quality_tier:'seed', enrichment_version:'gt85-v2026.1' },
  { canonical_name:'manyavar', display_name:'Manyavar', ticker:null, exchange:null, industry:'D2C / Fashion / Wedding / India', sector:'Consumer Discretionary', is_public:false, country_code:'IN', workforce_count:800, workforce_source:'news_rss_scrape', workforce_confidence:0.74, market_cap_usd:2800000000, pe_ratio:null, revenue_ttm_usd:600000000, financials_source:'news_rss_scrape', financials_confidence:0.60, recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.4, total_open_roles:200, data_quality_tier:'seed', enrichment_version:'gt85-v2026.1' },
];

// Execute all three
(async () => {
  try {
    await runBatch('GT83: Developer Tools & Infrastructure (2026)', 'gt83-v2026.1', gt83companies);
    console.log('');
    await runBatch('GT84: Climate Tech & IoT (2026)', 'gt84-v2026.1', gt84companies);
    console.log('');
    await runBatch('GT85: D2C & Consumer Tech (2026)', 'gt85-v2026.1', gt85companies);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
})();
