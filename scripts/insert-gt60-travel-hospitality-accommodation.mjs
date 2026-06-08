// GT60: Travel, Hospitality & Accommodation Technology (2026)
import { runBatch } from './_gt-upsert-lib.mjs';
const V = 'gt60-v2026.1';

const companies = [
  { canonical_name:'booking.com bv', display_name:'Booking.com B.V.', ticker:null, exchange:null,
    industry:'Travel / Hospitality / Accommodation / Hotels / Flights / Booking Platform', sector:'Technology',
    is_public:false, country_code:'NL', workforce_count:28000, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:100000000000, pe_ratio:null, revenue_ttm_usd:17000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.68,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.3, total_open_roles:1000, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'expedia group inc', display_name:'Expedia Group Inc.', ticker:'EXPE', exchange:'NASDAQ',
    industry:'Travel / Hospitality / Hotels / Flights / Vacation Rentals / Booking Platform', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:19000, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:0.1, total_open_roles:600, enrichment_version:V },

  { canonical_name:'airbnb inc', display_name:'Airbnb Inc.', ticker:'ABNB', exchange:'NASDAQ',
    industry:'Travel / Accommodation / Vacation Rental / Booking / Hospitality / Community', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:7500, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.5, total_open_roles:500, enrichment_version:V },

  { canonical_name:'tripadvisor inc', display_name:'TripAdvisor Inc.', ticker:'TRIP', exchange:'NASDAQ',
    industry:'Travel / Reviews / Recommendations / Hotels / Restaurants / Experiences / Platform', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:3500, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:0.0, total_open_roles:200, enrichment_version:V },

  { canonical_name:'kayak software corporation', display_name:'Kayak (Booking.com)', ticker:null, exchange:null,
    industry:'Travel / Search / Meta-Search / Flights / Hotels / Booking / Booking.com', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:1500, workforce_source:'news_rss_scrape', workforce_confidence:0.74,
    market_cap_usd:6000000000, pe_ratio:null, revenue_ttm_usd:800000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.2, total_open_roles:200, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'agoda company pte ltd', display_name:'Agoda (Booking.com)', ticker:null, exchange:null,
    industry:'Travel / Hotels / Accommodation / Asia / Booking / Hospitality / Booking.com', sector:'Technology',
    is_public:false, country_code:'SG', workforce_count:5000, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:12000000000, pe_ratio:null, revenue_ttm_usd:2500000000,
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.4, total_open_roles:400, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'rentalcars.com', display_name:'Rentalcars.com', ticker:null, exchange:null,
    industry:'Travel / Car Rental / Booking / Platform / Booking.com', sector:'Technology',
    is_public:false, country_code:'GB', workforce_count:1200, workforce_source:'news_rss_scrape', workforce_confidence:0.74,
    market_cap_usd:3000000000, pe_ratio:null, revenue_ttm_usd:400000000,
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.2, total_open_roles:150, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'vrbo / expedia vacation rentals', display_name:'VRBO (Expedia)', ticker:null, exchange:null,
    industry:'Travel / Vacation Rental / Accommodation / Booking / Expedia', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:2500, workforce_source:'news_rss_scrape', workforce_confidence:0.74,
    market_cap_usd:8000000000, pe_ratio:null, revenue_ttm_usd:1500000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:250, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'hotels.com', display_name:'Hotels.com (Expedia)', ticker:null, exchange:null,
    industry:'Travel / Hotels / Booking / Accommodation / Expedia', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:1800, workforce_source:'news_rss_scrape', workforce_confidence:0.74,
    market_cap_usd:5000000000, pe_ratio:null, revenue_ttm_usd:1000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.2, total_open_roles:200, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'lastminute.com', display_name:'lastminute.com', ticker:null, exchange:null,
    industry:'Travel / Flights / Hotels / Booking / Last Minute / Europe', sector:'Technology',
    is_public:false, country_code:'IT', workforce_count:1500, workforce_source:'news_rss_scrape', workforce_confidence:0.74,
    market_cap_usd:3500000000, pe_ratio:null, revenue_ttm_usd:600000000,
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.2, total_open_roles:200, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'skyscanner ltd', display_name:'Skyscanner Ltd', ticker:null, exchange:null,
    industry:'Travel / Flights / Search / Meta-Search / Booking / China / Ctrip', sector:'Technology',
    is_public:false, country_code:'GB', workforce_count:2000, workforce_source:'news_rss_scrape', workforce_confidence:0.74,
    market_cap_usd:8000000000, pe_ratio:null, revenue_ttm_usd:1200000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.3, total_open_roles:300, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'trivago nv', display_name:'Trivago NV', ticker:'TRVG', exchange:'NASDAQ',
    industry:'Travel / Hotels / Meta-Search / Comparison / Booking / Germany', sector:'Technology',
    is_public:true, country_code:'DE', workforce_count:3500, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.1, total_open_roles:250, enrichment_version:V },

  { canonical_name:'ctrip.com international ltd', display_name:'Ctrip.com', ticker:'TCOM', exchange:'NASDAQ',
    industry:'Travel / Hotels / Flights / Trains / Tours / China / Asia / Online Travel', sector:'Technology',
    is_public:true, country_code:'CN', workforce_count:37000, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.4, total_open_roles:1000, enrichment_version:V },

  { canonical_name:'marriott international inc', display_name:'Marriott International', ticker:'MAR', exchange:'NASDAQ',
    industry:'Travel / Hospitality / Hotels / Booking / Loyalty / Technology', sector:'Hospitality',
    is_public:true, country_code:'US', workforce_count:174000, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.3, total_open_roles:5000, enrichment_version:V },

  { canonical_name:'hilton worldwide holdings inc', display_name:'Hilton Worldwide', ticker:'HLT', exchange:'NYSE',
    industry:'Travel / Hospitality / Hotels / Franchising / Booking / Technology', sector:'Hospitality',
    is_public:true, country_code:'US', workforce_count:190000, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:3000, enrichment_version:V },
];

runBatch('GT60: Travel, Hospitality & Accommodation Technology (2026)', V, companies)
  .catch(e=>{ console.error(e); process.exit(1); });
