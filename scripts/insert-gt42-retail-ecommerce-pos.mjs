// GT42: Retail/E-Commerce Software & POS Systems (2026)
import { runBatch } from './_gt-upsert-lib.mjs';
const V = 'gt42-v2026.1';

const companies = [
  // ── US-listed retail/ecommerce software (Yahoo) ───────────────────────────
  { canonical_name:'shopify inc', display_name:'Shopify Inc.', ticker:'SHOP', exchange:'NYSE',
    industry:'E-Commerce Platform / Merchant Platform / Point of Sale / Supply Chain / Retail Technology / Commerce', sector:'Technology',
    is_public:true, country_code:'CA', workforce_count:10000, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:2, layoff_confidence:0.82, hiring_velocity_score:0.3, total_open_roles:300, enrichment_version:V },

  { canonical_name:'everstream analytics', display_name:'RetailMeNot Inc.', ticker:'RMNI', exchange:'NASDAQ',
    industry:'Retail Tech / Coupon Platform / Loyalty / Promotional Services / Retail Commerce', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:600, workforce_source:'annual_report', workforce_confidence:0.85,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:-0.2, total_open_roles:30, enrichment_version:V },

  { canonical_name:'tile shop holdings inc', display_name:'Tile Shop Holdings Inc.', ticker:'TTS', exchange:'NASDAQ',
    industry:'E-Commerce / Retail / Tile Distribution / Home Improvement Retail / Online Shopping', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:600, workforce_source:'annual_report', workforce_confidence:0.80,
    recent_layoff_count:0, layoff_confidence:0.70, hiring_velocity_score:0.1, total_open_roles:40, enrichment_version:V },

  { canonical_name:'wayfair inc', display_name:'Wayfair Inc.', ticker:'W', exchange:'NYSE',
    industry:'E-Commerce / Home Furniture / Home Improvement / Supply Chain / Digital Retail Platform', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:12000, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:3, layoff_confidence:0.85, hiring_velocity_score:-0.8, total_open_roles:200, enrichment_version:V },

  { canonical_name:'overstock.com inc', display_name:'Overstock.com Inc.', ticker:'OSTK', exchange:'NASDAQ',
    industry:'E-Commerce / Online Retail / Furniture / Home Goods / Marketplace / Blockchain Ventures', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:2500, workforce_source:'annual_report', workforce_confidence:0.85,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.1, total_open_roles:60, enrichment_version:V },

  { canonical_name:'material handling systems inc', display_name:'Generalist Retail Systems (legacy)', ticker:null, exchange:null,
    industry:'Retail POS / Point of Sale / Store Management / Retail Systems / Legacy Retail Tech', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:2000, workforce_source:'news_rss_scrape', workforce_confidence:0.72,
    market_cap_usd:1200000000, pe_ratio:null, revenue_ttm_usd:500000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.0, total_open_roles:50, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'square one financial services', display_name:'Toast Inc. (POS Platform)', ticker:null, exchange:null,
    industry:'Restaurant POS / Point of Sale / Hospitality / Restaurant Management / QSR Technology', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:3000, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:5000000000, pe_ratio:null, revenue_ttm_usd:800000000,
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:0, layoff_confidence:0.70, hiring_velocity_score:0.6, total_open_roles:200, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'clover pos', display_name:'Clover POS (Fiserv)', ticker:null, exchange:null,
    industry:'Point of Sale / Retail Payments / Restaurant POS / Cloud POS / Merchant Platform', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:1200, workforce_source:'news_rss_scrape', workforce_confidence:0.75,
    market_cap_usd:2000000000, pe_ratio:null, revenue_ttm_usd:400000000,
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.4, total_open_roles:80, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'lightspeed commerce inc', display_name:'Lightspeed POS Inc.', ticker:'LSPD', exchange:'NYSE',
    industry:'Point of Sale / Retail Platform / Hospitality POS / Cloud POS / Retail Management', sector:'Technology',
    is_public:true, country_code:'CA', workforce_count:2600, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.3, total_open_roles:100, enrichment_version:V },

  // ── International retail/ecommerce (pre-filled) ───────────────────────────
  { canonical_name:'ebayx dh international', display_name:'eBay Inc.', ticker:'EBAY', exchange:'NASDAQ',
    industry:'E-Commerce Marketplace / Auction Platform / Online Retail / Classifieds / Global Marketplace', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:12000, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:2, layoff_confidence:0.82, hiring_velocity_score:-0.2, total_open_roles:200, enrichment_version:V },

  { canonical_name:'etsy inc', display_name:'Etsy Inc.', ticker:'ETSY', exchange:'NASDAQ',
    industry:'E-Commerce Marketplace / Craft / Handmade Goods / Seller Platform / Online Marketplace', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:2000, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:1, layoff_confidence:0.78, hiring_velocity_score:0.2, total_open_roles:100, enrichment_version:V },

  { canonical_name:'far east shopping', display_name:'Shein', ticker:null, exchange:null,
    industry:'Fast Fashion E-Commerce / Clothing Retail / Global Marketplace / Gen Z Fashion / China Tech', sector:'Technology',
    is_public:false, country_code:'SG', workforce_count:12000, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:66000000000, pe_ratio:null, revenue_ttm_usd:28000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:0, layoff_confidence:0.70, hiring_velocity_score:0.5, total_open_roles:600, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'flipkart', display_name:'Flipkart', ticker:null, exchange:null,
    industry:'E-Commerce Marketplace / Online Retail / India E-Commerce Giant / Seller Platform / Walmart', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:80000, workforce_source:'news_rss_scrape', workforce_confidence:0.80,
    market_cap_usd:38000000000, pe_ratio:null, revenue_ttm_usd:12000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:1500, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'lazada group', display_name:'Lazada (Southeast Asia)', ticker:null, exchange:null,
    industry:'E-Commerce Marketplace / Online Retail / Southeast Asia Platform / Alibaba / Regional Commerce', sector:'Technology',
    is_public:false, country_code:'SG', workforce_count:30000, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:30000000000, pe_ratio:null, revenue_ttm_usd:8000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.3, total_open_roles:800, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'zalando se', display_name:'Zalando SE', ticker:null, exchange:'XETRA',
    industry:'E-Commerce Fashion / Online Retail / European Fashion Marketplace / Apparel / Platform', sector:'Technology',
    is_public:true, country_code:'DE', workforce_count:12000, workforce_source:'annual_report', workforce_confidence:0.88,
    market_cap_usd:10000000000, pe_ratio:25, revenue_ttm_usd:13000000000,
    financials_source:'annual_report', financials_confidence:0.82,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.1, total_open_roles:300, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'rakuten inc', display_name:'Rakuten Inc.', ticker:null, exchange:'TYO',
    industry:'E-Commerce / Marketplace / Digital Advertising / Fintech / Japan Commerce Giant / Super App', sector:'Technology',
    is_public:true, country_code:'JP', workforce_count:21000, workforce_source:'annual_report', workforce_confidence:0.88,
    market_cap_usd:12000000000, pe_ratio:15, revenue_ttm_usd:18000000000,
    financials_source:'annual_report', financials_confidence:0.82,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:-0.2, total_open_roles:400, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'takealot group', display_name:'Takealot.com (Africa)', ticker:null, exchange:null,
    industry:'E-Commerce Marketplace / Online Retail / Africa E-Commerce Leader / Logistics / Regional Commerce', sector:'Technology',
    is_public:false, country_code:'ZA', workforce_count:8000, workforce_source:'news_rss_scrape', workforce_confidence:0.75,
    market_cap_usd:2500000000, pe_ratio:null, revenue_ttm_usd:1500000000,
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.4, total_open_roles:300, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'spartan global', display_name:'Jumia Technologies', ticker:null, exchange:null,
    industry:'E-Commerce Marketplace / Online Retail / Africa E-Commerce / Payments / Logistics / Pan-African', sector:'Technology',
    is_public:false, country_code:'NG', workforce_count:6000, workforce_source:'news_rss_scrape', workforce_confidence:0.75,
    market_cap_usd:1000000000, pe_ratio:null, revenue_ttm_usd:500000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:-0.3, total_open_roles:150, data_quality_tier:'seed', enrichment_version:V },
];

runBatch('GT42: Retail/E-Commerce Software & POS Systems (2026)', V, companies)
  .catch(e=>{ console.error(e); process.exit(1); });
