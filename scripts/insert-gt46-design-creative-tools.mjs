// GT46: Design & Creative Tools SaaS (2026)
import { runBatch } from './_gt-upsert-lib.mjs';
const V = 'gt46-v2026.1';

const companies = [
  // ── US-listed design/creative (Yahoo) ──────────────────────────────────────
  { canonical_name:'adobe inc', display_name:'Adobe Inc.', ticker:'ADBE', exchange:'NASDAQ',
    industry:'Creative Software / Design Tools / PDF / Marketing / Video / Acrobat / Creative Cloud', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:24000, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:2, layoff_confidence:0.82, hiring_velocity_score:0.2, total_open_roles:600, enrichment_version:V },

  { canonical_name:'autodesk inc', display_name:'Autodesk Inc.', ticker:'ADSK', exchange:'NASDAQ',
    industry:'Design & Construction Software / CAD / 3D / Animation / Revit / Maya / Civil 3D', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:13000, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:2, layoff_confidence:0.82, hiring_velocity_score:0.1, total_open_roles:300, enrichment_version:V },

  // ── Private design/creative unicorns ───────────────────────────────────────
  { canonical_name:'figma inc', display_name:'Figma Inc.', ticker:null, exchange:null,
    industry:'Design Tools / UI/UX / Collaborative Design / Web Design / Design Platform', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:1500, workforce_source:'news_rss_scrape', workforce_confidence:0.80,
    market_cap_usd:20000000000, pe_ratio:null, revenue_ttm_usd:800000000,
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.8, total_open_roles:200, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'canva inc', display_name:'Canva Inc.', ticker:null, exchange:null,
    industry:'Design Platform / Graphic Design / Template-Based Design / Social Media / SMB Design', sector:'Technology',
    is_public:false, country_code:'AU', workforce_count:1800, workforce_source:'news_rss_scrape', workforce_confidence:0.80,
    market_cap_usd:26000000000, pe_ratio:null, revenue_ttm_usd:1800000000,
    financials_source:'news_rss_scrape', financials_confidence:0.65,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.6, total_open_roles:150, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'sketch bv', display_name:'Sketch BV', ticker:null, exchange:null,
    industry:'Design Tools / UI Design / Web Design / Digital Design / Design Collaboration', sector:'Technology',
    is_public:false, country_code:'NL', workforce_count:400, workforce_source:'news_rss_scrape', workforce_confidence:0.75,
    market_cap_usd:2000000000, pe_ratio:null, revenue_ttm_usd:250000000,
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:50, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'miro inc', display_name:'Miro Inc.', ticker:null, exchange:null,
    industry:'Collaborative Whiteboarding / Design / Diagramming / Visual Collaboration / Remote Work', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:900, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:3000000000, pe_ratio:null, revenue_ttm_usd:500000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.5, total_open_roles:100, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'invision app inc', display_name:'InVision App Inc.', ticker:null, exchange:null,
    industry:'Digital Product Design / Prototyping / Collaboration / Design Tools / UI/UX', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:700, workforce_source:'news_rss_scrape', workforce_confidence:0.75,
    market_cap_usd:1300000000, pe_ratio:null, revenue_ttm_usd:200000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:-0.3, total_open_roles:50, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'affinity inc', display_name:'Affinity (Serif Labs)', ticker:null, exchange:null,
    industry:'Design Software / Photo / Designer / Publisher / Creative Tools / Professional Design', sector:'Technology',
    is_public:false, country_code:'GB', workforce_count:150, workforce_source:'news_rss_scrape', workforce_confidence:0.70,
    market_cap_usd:500000000, pe_ratio:null, revenue_ttm_usd:80000000,
    financials_source:'news_rss_scrape', financials_confidence:0.52,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.2, total_open_roles:20, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'procreate dreams', display_name:'Procreate (Savage Interactive)', ticker:null, exchange:null,
    industry:'Digital Painting / iPad Art / Creative Tools / Professional Art Software / Digital Drawing', sector:'Technology',
    is_public:false, country_code:'AU', workforce_count:80, workforce_source:'news_rss_scrape', workforce_confidence:0.70,
    market_cap_usd:600000000, pe_ratio:null, revenue_ttm_usd:100000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.70, hiring_velocity_score:0.5, total_open_roles:15, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'pixelmator team', display_name:'Pixelmator', ticker:null, exchange:null,
    industry:'Image Editing / Photo Software / Mac Software / Creative Tools / Graphic Design', sector:'Technology',
    is_public:false, country_code:'LT', workforce_count:50, workforce_source:'news_rss_scrape', workforce_confidence:0.68,
    market_cap_usd:200000000, pe_ratio:null, revenue_ttm_usd:30000000,
    financials_source:'news_rss_scrape', financials_confidence:0.50,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.2, total_open_roles:8, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'corel corporation', display_name:'Corel Corporation', ticker:null, exchange:null,
    industry:'Design Software / CorelDRAW / Photo-Paint / Painter / Creative Tools / Design Suite', sector:'Technology',
    is_public:false, country_code:'CA', workforce_count:1200, workforce_source:'news_rss_scrape', workforce_confidence:0.75,
    market_cap_usd:1500000000, pe_ratio:null, revenue_ttm_usd:400000000,
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.2, total_open_roles:60, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'bitmoji', display_name:'Snapchat Creative Tools (Bitmoji/Lens Studio)', ticker:null, exchange:null,
    industry:'Creative Tools / Avatar Creation / AR Filters / Social Creative / Content Creation', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:3000, workforce_source:'news_rss_scrape', workforce_confidence:0.75,
    market_cap_usd:null, pe_ratio:null, revenue_ttm_usd:2000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:-0.2, total_open_roles:200, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'blackmagic design', display_name:'Blackmagic Design', ticker:null, exchange:null,
    industry:'Video Editing / DaVinci Resolve / Fusion / Creative Tools / Professional Video / Production Software', sector:'Technology',
    is_public:false, country_code:'AU', workforce_count:500, workforce_source:'news_rss_scrape', workforce_confidence:0.75,
    market_cap_usd:1000000000, pe_ratio:null, revenue_ttm_usd:500000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.4, total_open_roles:80, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'descript inc', display_name:'Descript Inc.', ticker:null, exchange:null,
    industry:'Video Editing / Audio Editing / Transcription / Video Creation SaaS / Content Creation', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:250, workforce_source:'news_rss_scrape', workforce_confidence:0.75,
    market_cap_usd:3000000000, pe_ratio:null, revenue_ttm_usd:200000000,
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:-0.2, total_open_roles:40, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'runway ml inc', display_name:'Runway (Runway ML)', ticker:null, exchange:null,
    industry:'AI Creative Tools / Video Generation / AI Content / Generative AI / Creative AI', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:400, workforce_source:'news_rss_scrape', workforce_confidence:0.75,
    market_cap_usd:8200000000, pe_ratio:null, revenue_ttm_usd:300000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:1.2, total_open_roles:120, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'loom inc', display_name:'Loom Inc.', ticker:null, exchange:null,
    industry:'Video Messaging / Screen Recording / Async Video / Communication / Remote Work Tools', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:450, workforce_source:'news_rss_scrape', workforce_confidence:0.75,
    market_cap_usd:5000000000, pe_ratio:null, revenue_ttm_usd:250000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.6, total_open_roles:80, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'vimeo inc', display_name:'Vimeo Inc.', ticker:'VMEO', exchange:'NASDAQ',
    industry:'Video Platform / Video Hosting / Streaming / Video Commerce / Creator Tools / Video SaaS', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:1300, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:2, layoff_confidence:0.82, hiring_velocity_score:0.0, total_open_roles:80, enrichment_version:V },

  { canonical_name:'wistia inc', display_name:'Wistia Inc.', ticker:null, exchange:null,
    industry:'Video Hosting / Video Platform / Business Video / Professional Video Hosting', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:180, workforce_source:'news_rss_scrape', workforce_confidence:0.72,
    market_cap_usd:600000000, pe_ratio:null, revenue_ttm_usd:60000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.3, total_open_roles:20, data_quality_tier:'seed', enrichment_version:V },
];

runBatch('GT46: Design & Creative Tools SaaS (2026)', V, companies)
  .catch(e=>{ console.error(e); process.exit(1); });
