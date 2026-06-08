// GT50: Learning, Education & Communications Platforms (2026)
import { runBatch } from './_gt-upsert-lib.mjs';
const V = 'gt50-v2026.1';

const companies = [
  { canonical_name:'coursera inc', display_name:'Coursera Inc.', ticker:'COUR', exchange:'NASDAQ',
    industry:'Online Learning / Education / Courses / Upskilling / E-Learning Platform', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:2500, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.3, total_open_roles:200, enrichment_version:V },

  { canonical_name:'udemy inc', display_name:'Udemy Inc.', ticker:'UDMY', exchange:'NASDAQ',
    industry:'Online Learning / Courses / Video Education / Skills Training / E-Learning', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:2800, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:2, layoff_confidence:0.82, hiring_velocity_score:0.1, total_open_roles:250, enrichment_version:V },

  { canonical_name:'zoom video communications', display_name:'Zoom Video Communications Inc.', ticker:'ZM', exchange:'NASDAQ',
    industry:'Video Conferencing / Communication / Unified Communications / Meetings / Collaboration', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:8400, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:-0.5, total_open_roles:300, enrichment_version:V },

  { canonical_name:'slack technologies inc', display_name:'Slack Technologies Inc.', ticker:null, exchange:null,
    industry:'Team Communication / Messaging / Workplace Chat / Collaboration / Salesforce Ecosystem', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:2900, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:null, pe_ratio:null, revenue_ttm_usd:3200000000,
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:-0.3, total_open_roles:200, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'discord inc', display_name:'Discord Inc.', ticker:null, exchange:null,
    industry:'Voice Chat / Community / Gaming / Messaging / Social Communication / Community Platform', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:900, workforce_source:'news_rss_scrape', workforce_confidence:0.75,
    market_cap_usd:15000000000, pe_ratio:null, revenue_ttm_usd:900000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.6, total_open_roles:150, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'telegram llc', display_name:'Telegram', ticker:null, exchange:null,
    industry:'Messaging / Social Communication / Privacy-Focused Chat / Global Messaging', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:600, workforce_source:'news_rss_scrape', workforce_confidence:0.70,
    market_cap_usd:20000000000, pe_ratio:null, revenue_ttm_usd:200000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.4, total_open_roles:100, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'meta platforms inc', display_name:'Meta Platforms Inc.', ticker:'META', exchange:'NASDAQ',
    industry:'Social Media / Messaging / Communication / Facebook / Instagram / WhatsApp / Meta Platforms', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:67330, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:3, layoff_confidence:0.85, hiring_velocity_score:0.2, total_open_roles:2000, enrichment_version:V },

  { canonical_name:'x corp', display_name:'X Corp (Twitter)', ticker:null, exchange:null,
    industry:'Social Media / Messaging / Communication / Platform / X / Twitter', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:1500, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:25000000000, pe_ratio:null, revenue_ttm_usd:2000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:3, layoff_confidence:0.85, hiring_velocity_score:-0.8, total_open_roles:200, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'linkedin corporation', display_name:'LinkedIn (Microsoft)', ticker:null, exchange:null,
    industry:'Professional Networking / Jobs / Career / Communication / Microsoft Subsidiary / Recruiting', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:19000, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:30000000000, pe_ratio:null, revenue_ttm_usd:15000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.65,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:0.1, total_open_roles:800, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'skillshare inc', display_name:'Skillshare Inc.', ticker:null, exchange:null,
    industry:'Online Learning / Creative Skills / Video Courses / E-Learning / Subscription Learning', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:400, workforce_source:'news_rss_scrape', workforce_confidence:0.72,
    market_cap_usd:800000000, pe_ratio:null, revenue_ttm_usd:150000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:50, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'masterclass inc', display_name:'MasterClass Inc.', ticker:null, exchange:null,
    industry:'Online Learning / Premium Courses / Expert-Led Education / Video Learning / EdTech', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:600, workforce_source:'news_rss_scrape', workforce_confidence:0.73,
    market_cap_usd:2500000000, pe_ratio:null, revenue_ttm_usd:250000000,
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.3, total_open_roles:80, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'duolingo inc', display_name:'Duolingo Inc.', ticker:'DUOL', exchange:'NASDAQ',
    industry:'Language Learning / Gamified Learning / Mobile Education / EdTech / AI Learning', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:1200, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.6, total_open_roles:200, enrichment_version:V },

  { canonical_name:'chegg inc', display_name:'Chegg Inc.', ticker:'CHGG', exchange:'NASDAQ',
    industry:'Online Learning / Educational Services / Textbooks / Student Support / EdTech', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:2100, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:-0.2, total_open_roles:150, enrichment_version:V },

  { canonical_name:'brilliant.org', display_name:'Brilliant', ticker:null, exchange:null,
    industry:'STEM Learning / Math / Science / Problem-Solving / Interactive Learning / EdTech', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:250, workforce_source:'news_rss_scrape', workforce_confidence:0.70,
    market_cap_usd:500000000, pe_ratio:null, revenue_ttm_usd:50000000,
    financials_source:'news_rss_scrape', financials_confidence:0.50,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.4, total_open_roles:40, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'substack inc', display_name:'Substack Inc.', ticker:null, exchange:null,
    industry:'Newsletter / Publishing / Creator Platform / Subscription / Communication Platform', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:200, workforce_source:'news_rss_scrape', workforce_confidence:0.70,
    market_cap_usd:500000000, pe_ratio:null, revenue_ttm_usd:100000000,
    financials_source:'news_rss_scrape', financials_confidence:0.50,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.3, total_open_roles:30, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'commonlit inc', display_name:'CommonLit Inc.', ticker:null, exchange:null,
    industry:'EdTech / Reading / Literacy / K-12 Education / Learning Platform / Free Education Resources', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:150, workforce_source:'news_rss_scrape', workforce_confidence:0.68,
    market_cap_usd:300000000, pe_ratio:null, revenue_ttm_usd:20000000,
    financials_source:'news_rss_scrape', financials_confidence:0.45,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.5, total_open_roles:25, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'opensea inc', display_name:'OpenSea', ticker:null, exchange:null,
    industry:'NFT Marketplace / Web3 / Crypto / Digital Assets / Creator Platform / Blockchain', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:300, workforce_source:'news_rss_scrape', workforce_confidence:0.70,
    market_cap_usd:13000000000, pe_ratio:null, revenue_ttm_usd:200000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:-0.5, total_open_roles:50, data_quality_tier:'seed', enrichment_version:V },
];

runBatch('GT50: Learning, Education & Communications Platforms (2026)', V, companies)
  .catch(e=>{ console.error(e); process.exit(1); });
