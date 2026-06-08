// GT36: Government, Defense & Public-Sector IT + GovTech (2026)
import { runBatch } from './_gt-upsert-lib.mjs';
const V = 'gt36-v2026.1';

const companies = [
  // ── US-listed gov/defense IT (Yahoo) ──────────────────────────────────────
  { canonical_name:'maximus inc', display_name:'Maximus Inc.', ticker:'MMS', exchange:'NYSE',
    industry:'Government Services IT / Health & Human Services Administration / BPO / Citizen Services', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:39000, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:1, layoff_confidence:0.78, hiring_velocity_score:0.0, total_open_roles:400, enrichment_version:V },

  { canonical_name:'icf international inc', display_name:'ICF International Inc.', ticker:'ICFI', exchange:'NASDAQ',
    industry:'Government Consulting / IT Modernization / Digital Services / Energy & Environment Analytics', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:9000, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:1, layoff_confidence:0.78, hiring_velocity_score:-0.2, total_open_roles:200, enrichment_version:V },

  { canonical_name:'v2x inc', display_name:'V2X Inc.', ticker:'VVX', exchange:'NYSE',
    industry:'Defense IT Services / Mission Support / Logistics Technology / C5ISR / Federal Services', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:16000, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:0, layoff_confidence:0.72, hiring_velocity_score:0.2, total_open_roles:300, enrichment_version:V },

  { canonical_name:'kbr inc', display_name:'KBR Inc.', ticker:'KBR', exchange:'NYSE',
    industry:'Government Technology Solutions / Defense / Space / Mission IT / Engineering Services', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:38000, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:0, layoff_confidence:0.72, hiring_velocity_score:0.3, total_open_roles:500, enrichment_version:V },

  { canonical_name:'dlh holdings corp', display_name:'DLH Holdings Corp.', ticker:'DLHC', exchange:'NASDAQ',
    industry:'Federal Health IT / Defense Analytics / Digital Transformation / Public Health Technology', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:3200, workforce_source:'annual_report', workforce_confidence:0.85,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:-0.2, total_open_roles:80, enrichment_version:V },

  { canonical_name:'nv5 global inc', display_name:'NV5 Global Inc.', ticker:'NVEE', exchange:'NASDAQ',
    industry:'Geospatial Technology / Infrastructure Engineering / Government Tech Consulting / Data Analytics', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:4500, workforce_source:'annual_report', workforce_confidence:0.85,
    recent_layoff_count:0, layoff_confidence:0.72, hiring_velocity_score:0.3, total_open_roles:150, enrichment_version:V },

  { canonical_name:'verra mobility corporation', display_name:'Verra Mobility Corporation', ticker:'VRRM', exchange:'NASDAQ',
    industry:'Smart Mobility / Government Transportation Tech / Tolling / Traffic Safety Cameras / Fleet', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:1500, workforce_source:'annual_report', workforce_confidence:0.85,
    recent_layoff_count:0, layoff_confidence:0.72, hiring_velocity_score:0.3, total_open_roles:80, enrichment_version:V },

  { canonical_name:'clarivate plc', display_name:'Clarivate plc', ticker:'CLVT', exchange:'NYSE',
    industry:'Scientific & Academic Data / IP Intelligence / Web of Science / Analytics / Research Software', sector:'Technology',
    is_public:true, country_code:'GB', workforce_count:11000, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:2, layoff_confidence:0.82, hiring_velocity_score:-0.5, total_open_roles:150, enrichment_version:V },

  { canonical_name:'sabre corporation', display_name:'Sabre Corporation', ticker:'SABR', exchange:'NASDAQ',
    industry:'Travel Technology / GDS / Airline IT / Hospitality Software / Travel Distribution Platform', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:6500, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:3, layoff_confidence:0.88, hiring_velocity_score:-0.8, total_open_roles:120, enrichment_version:V },

  { canonical_name:'climb global solutions inc', display_name:'Climb Global Solutions Inc.', ticker:'CLMB', exchange:'NASDAQ',
    industry:'IT Distribution / Software & Cloud Distribution / Value-Added Reseller / Channel Services', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:400, workforce_source:'annual_report', workforce_confidence:0.82,
    recent_layoff_count:0, layoff_confidence:0.70, hiring_velocity_score:0.4, total_open_roles:30, enrichment_version:V },

  // ── International defense/gov IT (pre-filled) ──────────────────────────────
  { canonical_name:'thales sa', display_name:'Thales SA', ticker:null, exchange:'EPA',
    industry:'Defense Electronics / Cybersecurity / Digital Identity / Aerospace IT / Secure Comms France', sector:'Technology',
    is_public:true, country_code:'FR', workforce_count:81000, workforce_source:'annual_report', workforce_confidence:0.90,
    market_cap_usd:52000000000, pe_ratio:25, revenue_ttm_usd:22000000000,
    financials_source:'annual_report', financials_confidence:0.85,
    recent_layoff_count:0, layoff_confidence:0.72, hiring_velocity_score:0.4, total_open_roles:2000, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'leonardo spa', display_name:'Leonardo S.p.A.', ticker:null, exchange:'BIT',
    industry:'Defense & Security / Cyber / Avionics / Defense Electronics / C2 Systems / Italy Aerospace IT', sector:'Technology',
    is_public:true, country_code:'IT', workforce_count:53000, workforce_source:'annual_report', workforce_confidence:0.90,
    market_cap_usd:27000000000, pe_ratio:20, revenue_ttm_usd:18500000000,
    financials_source:'annual_report', financials_confidence:0.85,
    recent_layoff_count:0, layoff_confidence:0.72, hiring_velocity_score:0.3, total_open_roles:1500, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'qinetiq group plc', display_name:'QinetiQ Group plc', ticker:null, exchange:'LON',
    industry:'Defense Technology / Cyber / Test & Evaluation / Robotics / Government R&D / UK Defense IT', sector:'Technology',
    is_public:true, country_code:'GB', workforce_count:8500, workforce_source:'annual_report', workforce_confidence:0.88,
    market_cap_usd:3300000000, pe_ratio:14, revenue_ttm_usd:2400000000,
    financials_source:'annual_report', financials_confidence:0.82,
    recent_layoff_count:0, layoff_confidence:0.72, hiring_velocity_score:0.2, total_open_roles:300, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'serco group plc', display_name:'Serco Group plc', ticker:null, exchange:'LON',
    industry:'Public Service Delivery / Government BPO / Defense Support / Citizen Services IT / UK Services', sector:'Technology',
    is_public:true, country_code:'GB', workforce_count:50000, workforce_source:'annual_report', workforce_confidence:0.88,
    market_cap_usd:2500000000, pe_ratio:12, revenue_ttm_usd:6200000000,
    financials_source:'annual_report', financials_confidence:0.82,
    recent_layoff_count:1, layoff_confidence:0.78, hiring_velocity_score:0.0, total_open_roles:400, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'babcock international group plc', display_name:'Babcock International Group plc', ticker:null, exchange:'LON',
    industry:'Defense Engineering / Mission Systems / Naval Support / Government Tech Services / UK Defense', sector:'Technology',
    is_public:true, country_code:'GB', workforce_count:28000, workforce_source:'annual_report', workforce_confidence:0.88,
    market_cap_usd:4400000000, pe_ratio:15, revenue_ttm_usd:5600000000,
    financials_source:'annual_report', financials_confidence:0.82,
    recent_layoff_count:0, layoff_confidence:0.72, hiring_velocity_score:0.2, total_open_roles:400, data_quality_tier:'verified', enrichment_version:V },

  // ── Private gov-IT & govtech ───────────────────────────────────────────────
  { canonical_name:'carahsoft technology corp', display_name:'Carahsoft Technology Corp.', ticker:null, exchange:null,
    industry:'Government IT Reseller / Public Sector Software Distribution / Cloud & Cyber Aggregator', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:2500, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:null, pe_ratio:null, revenue_ttm_usd:14000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:0, layoff_confidence:0.70, hiring_velocity_score:0.4, total_open_roles:150, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'peraton inc', display_name:'Peraton Inc.', ticker:null, exchange:null,
    industry:'National Security IT / Defense / Intelligence / Space / Cyber / Federal Mission Technology', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:18000, workforce_source:'news_rss_scrape', workforce_confidence:0.80,
    market_cap_usd:null, pe_ratio:null, revenue_ttm_usd:7000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:-0.2, total_open_roles:500, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'govcio llc', display_name:'GovCIO LLC', ticker:null, exchange:null,
    industry:'Federal IT Modernization / Digital Services / Cloud / Cybersecurity / Health IT for Government', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:4000, workforce_source:'news_rss_scrape', workforce_confidence:0.75,
    market_cap_usd:2000000000, pe_ratio:null, revenue_ttm_usd:1200000000,
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:1, layoff_confidence:0.72, hiring_velocity_score:0.0, total_open_roles:200, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'granicus inc', display_name:'Granicus Inc.', ticker:null, exchange:null,
    industry:'GovTech SaaS / Citizen Engagement / Government Website & Comms / Digital Government Platform', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:1700, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:2000000000, pe_ratio:null, revenue_ttm_usd:200000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:1, layoff_confidence:0.72, hiring_velocity_score:0.2, total_open_roles:60, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'opengov inc', display_name:'OpenGov Inc.', ticker:null, exchange:null,
    industry:'GovTech SaaS / Government ERP / Budgeting / Permitting / Cloud for State & Local Government', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:900, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:1800000000, pe_ratio:null, revenue_ttm_usd:130000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:0, layoff_confidence:0.70, hiring_velocity_score:0.5, total_open_roles:80, data_quality_tier:'seed', enrichment_version:V },
];

runBatch('GT36: Government, Defense & Public-Sector IT + GovTech (2026)', V, companies)
  .catch(e=>{ console.error(e); process.exit(1); });
