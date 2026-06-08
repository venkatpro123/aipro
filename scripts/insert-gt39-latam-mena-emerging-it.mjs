// GT39: LATAM, MENA, Africa & Eastern Europe IT (2026)
import { runBatch } from './_gt-upsert-lib.mjs';
const V = 'gt39-v2026.1';

const companies = [
  // ── Eastern Europe (pre-filled) ───────────────────────────────────────────
  { canonical_name:'asseco poland sa', display_name:'Asseco Poland SA', ticker:null, exchange:'WSE',
    industry:'IT Software / Banking Software / ERP / Public Sector IT / Largest Polish Software House', sector:'Technology',
    is_public:true, country_code:'PL', workforce_count:33000, workforce_source:'annual_report', workforce_confidence:0.88,
    market_cap_usd:4000000000, pe_ratio:18, revenue_ttm_usd:4500000000,
    financials_source:'annual_report', financials_confidence:0.82,
    recent_layoff_count:0, layoff_confidence:0.72, hiring_velocity_score:0.2, total_open_roles:600, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'comarch sa', display_name:'Comarch SA', ticker:null, exchange:'WSE',
    industry:'ERP / Telecom Software / Loyalty / Healthcare IT / Polish Enterprise Software', sector:'Technology',
    is_public:true, country_code:'PL', workforce_count:6500, workforce_source:'annual_report', workforce_confidence:0.85,
    market_cap_usd:700000000, pe_ratio:14, revenue_ttm_usd:500000000,
    financials_source:'annual_report', financials_confidence:0.80,
    recent_layoff_count:0, layoff_confidence:0.72, hiring_velocity_score:0.2, total_open_roles:300, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'livechat software sa', display_name:'LiveChat Software SA', ticker:null, exchange:'WSE',
    industry:'Customer Service Software / Live Chat / AI Chatbots / SaaS Communication / Polish SaaS', sector:'Technology',
    is_public:true, country_code:'PL', workforce_count:350, workforce_source:'annual_report', workforce_confidence:0.85,
    market_cap_usd:800000000, pe_ratio:18, revenue_ttm_usd:100000000,
    financials_source:'annual_report', financials_confidence:0.80,
    recent_layoff_count:0, layoff_confidence:0.70, hiring_velocity_score:0.3, total_open_roles:40, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'allegro eu sa', display_name:'Allegro.eu SA', ticker:null, exchange:'WSE',
    industry:'E-Commerce Marketplace / Online Retail Platform / Fintech / Largest Polish E-Commerce', sector:'Technology',
    is_public:true, country_code:'PL', workforce_count:7000, workforce_source:'annual_report', workforce_confidence:0.88,
    market_cap_usd:9000000000, pe_ratio:30, revenue_ttm_usd:3000000000,
    financials_source:'annual_report', financials_confidence:0.82,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:300, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'software mind sa', display_name:'Software Mind SA', ticker:null, exchange:null,
    industry:'Software Development / IT Outsourcing / Cloud / Nearshore Engineering / Polish IT Services', sector:'Technology',
    is_public:false, country_code:'PL', workforce_count:3000, workforce_source:'news_rss_scrape', workforce_confidence:0.72,
    market_cap_usd:600000000, pe_ratio:null, revenue_ttm_usd:200000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.3, total_open_roles:150, data_quality_tier:'seed', enrichment_version:V },

  // ── Latin America IT services & software ───────────────────────────────────
  { canonical_name:'stefanini group', display_name:'Stefanini Group', ticker:null, exchange:null,
    industry:'IT Services / Digital Transformation / BPO / AI / Brazilian Global IT Services', sector:'Technology',
    is_public:false, country_code:'BR', workforce_count:32000, workforce_source:'news_rss_scrape', workforce_confidence:0.80,
    market_cap_usd:null, pe_ratio:null, revenue_ttm_usd:1500000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:0, layoff_confidence:0.70, hiring_velocity_score:0.3, total_open_roles:800, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'softtek sa de cv', display_name:'Softtek SA de CV', ticker:null, exchange:null,
    industry:'IT Services / Nearshore Software / Digital / Cloud / Mexican Global IT Services / Latam', sector:'Technology',
    is_public:false, country_code:'MX', workforce_count:15000, workforce_source:'news_rss_scrape', workforce_confidence:0.80,
    market_cap_usd:null, pe_ratio:null, revenue_ttm_usd:900000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:0, layoff_confidence:0.70, hiring_velocity_score:0.3, total_open_roles:600, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'locaweb servicos de internet sa', display_name:'Locaweb Serviços de Internet SA', ticker:null, exchange:'BVMF',
    industry:'Cloud Hosting / SaaS / E-Commerce Platform / SMB Software / Brazilian Web Services', sector:'Technology',
    is_public:true, country_code:'BR', workforce_count:2500, workforce_source:'annual_report', workforce_confidence:0.82,
    market_cap_usd:600000000, pe_ratio:18, revenue_ttm_usd:280000000,
    financials_source:'annual_report', financials_confidence:0.78,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:80, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'bemobi mobile tech sa', display_name:'Bemobi Mobile Tech SA', ticker:null, exchange:'BVMF',
    industry:'Mobile Apps / Digital Services / SaaS / Subscriptions / Brazilian Mobile Technology', sector:'Technology',
    is_public:true, country_code:'BR', workforce_count:900, workforce_source:'annual_report', workforce_confidence:0.80,
    market_cap_usd:400000000, pe_ratio:12, revenue_ttm_usd:200000000,
    financials_source:'annual_report', financials_confidence:0.75,
    recent_layoff_count:0, layoff_confidence:0.70, hiring_velocity_score:0.2, total_open_roles:50, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'mercadolibre inc', display_name:'MercadoLibre Inc.', ticker:'MELI', exchange:'NASDAQ',
    industry:'E-Commerce Marketplace / Mercado Pago Fintech / Logistics / Latin America Tech Platform', sector:'Technology',
    is_public:true, country_code:'AR', workforce_count:75000, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:0, layoff_confidence:0.72, hiring_velocity_score:0.8, total_open_roles:800, enrichment_version:V },

  // ── MENA tech & IT ─────────────────────────────────────────────────────────
  { canonical_name:'elm company', display_name:'Elm Company', ticker:null, exchange:'TADAWUL',
    industry:'Digital Government / Secure E-Services / Cybersecurity / Saudi Digital Transformation', sector:'Technology',
    is_public:true, country_code:'SA', workforce_count:5000, workforce_source:'annual_report', workforce_confidence:0.85,
    market_cap_usd:24000000000, pe_ratio:40, revenue_ttm_usd:2200000000,
    financials_source:'annual_report', financials_confidence:0.80,
    recent_layoff_count:0, layoff_confidence:0.70, hiring_velocity_score:0.8, total_open_roles:400, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'solutions by stc', display_name:'Arabian Internet & Communications Services (solutions by stc)', ticker:null, exchange:'TADAWUL',
    industry:'ICT Solutions / Cloud / Cybersecurity / Digital Transformation / Saudi Enterprise IT', sector:'Technology',
    is_public:true, country_code:'SA', workforce_count:5500, workforce_source:'annual_report', workforce_confidence:0.85,
    market_cap_usd:18000000000, pe_ratio:35, revenue_ttm_usd:3200000000,
    financials_source:'annual_report', financials_confidence:0.80,
    recent_layoff_count:0, layoff_confidence:0.70, hiring_velocity_score:0.6, total_open_roles:300, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'tahakom', display_name:'Tahakom (Saudi Technology & Security Comprehensive Control)', ticker:null, exchange:null,
    industry:'Smart City / Traffic Tech / AI Surveillance / Government Technology / Saudi Public Safety IT', sector:'Technology',
    is_public:false, country_code:'SA', workforce_count:3000, workforce_source:'news_rss_scrape', workforce_confidence:0.72,
    market_cap_usd:null, pe_ratio:null, revenue_ttm_usd:1000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.8, total_open_roles:200, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'property finder group', display_name:'Property Finder Group', ticker:null, exchange:null,
    industry:'PropTech / Real Estate Portal / Property Search / MENA Real Estate Technology', sector:'Technology',
    is_public:false, country_code:'AE', workforce_count:800, workforce_source:'news_rss_scrape', workforce_confidence:0.72,
    market_cap_usd:1000000000, pe_ratio:null, revenue_ttm_usd:120000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:1, layoff_confidence:0.72, hiring_velocity_score:0.3, total_open_roles:60, data_quality_tier:'seed', enrichment_version:V },

  // ── Africa IT & tech ───────────────────────────────────────────────────────
  { canonical_name:'eoh holdings limited', display_name:'EOH Holdings Limited', ticker:null, exchange:'JSE',
    industry:'IT Services / Software / Digital / Cloud / Largest South African IT Services Group', sector:'Technology',
    is_public:true, country_code:'ZA', workforce_count:6000, workforce_source:'annual_report', workforce_confidence:0.82,
    market_cap_usd:300000000, pe_ratio:null, revenue_ttm_usd:350000000,
    financials_source:'annual_report', financials_confidence:0.72,
    recent_layoff_count:1, layoff_confidence:0.78, hiring_velocity_score:-0.3, total_open_roles:150, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'datatec limited', display_name:'Datatec Limited', ticker:null, exchange:'JSE',
    industry:'ICT Distribution / Networking / Westcon-Comstor / Logicalis / Global IT Distribution Africa', sector:'Technology',
    is_public:true, country_code:'ZA', workforce_count:9000, workforce_source:'annual_report', workforce_confidence:0.82,
    market_cap_usd:1300000000, pe_ratio:14, revenue_ttm_usd:5500000000,
    financials_source:'annual_report', financials_confidence:0.78,
    recent_layoff_count:0, layoff_confidence:0.70, hiring_velocity_score:0.1, total_open_roles:200, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'cassava technologies', display_name:'Cassava Technologies', ticker:null, exchange:null,
    industry:'Digital Infrastructure / Data Centers / Fiber / Cloud / Fintech / Pan-African Tech', sector:'Technology',
    is_public:false, country_code:'ZA', workforce_count:2500, workforce_source:'news_rss_scrape', workforce_confidence:0.72,
    market_cap_usd:1500000000, pe_ratio:null, revenue_ttm_usd:500000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.5, total_open_roles:120, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'interswitch limited', display_name:'Interswitch Limited', ticker:null, exchange:null,
    industry:'Payments Infrastructure / Digital Payments / Verve Cards / Switching / African Fintech', sector:'Financial Technology',
    is_public:false, country_code:'NG', workforce_count:1200, workforce_source:'news_rss_scrape', workforce_confidence:0.72,
    market_cap_usd:1000000000, pe_ratio:null, revenue_ttm_usd:300000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.4, total_open_roles:80, data_quality_tier:'seed', enrichment_version:V },

  // ── Turkey / other emerging ───────────────────────────────────────────────
  { canonical_name:'logo yazilim sanayi', display_name:'Logo Yazılım Sanayi ve Ticaret AŞ', ticker:null, exchange:'BIST',
    industry:'ERP / Accounting Software / SMB Business Software / Turkish Enterprise Software', sector:'Technology',
    is_public:true, country_code:'TR', workforce_count:1500, workforce_source:'annual_report', workforce_confidence:0.78,
    market_cap_usd:600000000, pe_ratio:15, revenue_ttm_usd:200000000,
    financials_source:'annual_report', financials_confidence:0.70,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.2, total_open_roles:60, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'getir perakende lojistik', display_name:'Getir', ticker:null, exchange:null,
    industry:'Quick Commerce / Instant Grocery Delivery / Q-Commerce Platform / Turkish Delivery Tech', sector:'Technology',
    is_public:false, country_code:'TR', workforce_count:8000, workforce_source:'news_rss_scrape', workforce_confidence:0.72,
    market_cap_usd:2500000000, pe_ratio:null, revenue_ttm_usd:600000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:4, layoff_confidence:0.88, hiring_velocity_score:-1.5, total_open_roles:50, data_quality_tier:'seed', enrichment_version:V },
];

runBatch('GT39: LATAM, MENA, Africa & Eastern Europe IT (2026)', V, companies)
  .catch(e=>{ console.error(e); process.exit(1); });
