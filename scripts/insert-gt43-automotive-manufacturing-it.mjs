// GT43: Automotive Software & Manufacturing IT (2026)
import { runBatch } from './_gt-upsert-lib.mjs';
const V = 'gt43-v2026.1';

const companies = [
  // ── Automotive software & embedded systems (Yahoo) ───────────────────────
  { canonical_name:'blackberry limited', display_name:'BlackBerry Limited', ticker:'BB', exchange:'NYSE',
    industry:'Embedded Security / Automotive Cybersecurity / IVY OS / Connected Vehicles / Secure Software / Enterprise Security', sector:'Technology',
    is_public:true, country_code:'CA', workforce_count:4500, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:-0.3, total_open_roles:150, enrichment_version:V },

  { canonical_name:'mobileye', display_name:'Mobileye (Intel)', ticker:null, exchange:null,
    industry:'Autonomous Driving / Computer Vision / ADAS / Autonomous Vehicle Technology / Intel Subsidiary', sector:'Technology',
    is_public:false, country_code:'IL', workforce_count:3500, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:15000000000, pe_ratio:null, revenue_ttm_usd:1400000000,
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.5, total_open_roles:200, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'aptiv plc', display_name:'Aptiv PLC', ticker:'APTV', exchange:'NYSE',
    industry:'Autonomous Driving / Automotive Software / Electrical Architectures / Connected Vehicles / AV Technology', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:19000, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:300, enrichment_version:V },

  { canonical_name:'nxp semiconductors nv', display_name:'NXP Semiconductors NV', ticker:'NXPI', exchange:'NASDAQ',
    industry:'Automotive Semiconductors / Embedded Systems / Connected Vehicles / Autonomous Driving Chips', sector:'Technology',
    is_public:true, country_code:'NL', workforce_count:35000, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.3, total_open_roles:500, enrichment_version:V },

  { canonical_name:'nvidia corporation', display_name:'NVIDIA Corporation', ticker:'NVDA', exchange:'NASDAQ',
    industry:'AI Chips / GPUs / Autonomous Driving / Automotive AI / Data Centers / Gaming / AI Infrastructure', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:28000, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:0, layoff_confidence:0.72, hiring_velocity_score:1.2, total_open_roles:800, enrichment_version:V },

  { canonical_name:'qualcomm incorporated', display_name:'Qualcomm Incorporated', ticker:'QCOM', exchange:'NASDAQ',
    industry:'Semiconductors / Automotive Chips / Wireless Technology / Mobile SoC / Connected Vehicles', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:46000, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:2, layoff_confidence:0.82, hiring_velocity_score:0.1, total_open_roles:600, enrichment_version:V },

  { canonical_name:'magna international inc', display_name:'Magna International Inc.', ticker:'MGA', exchange:'NYSE',
    industry:'Automotive Supplier / Vehicle Architecture / Autonomous Driving / Electrification / Connected Vehicles / Canada Auto', sector:'Technology',
    is_public:true, country_code:'CA', workforce_count:186000, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:-0.1, total_open_roles:500, enrichment_version:V },

  { canonical_name:'dxc technology', display_name:'DXC Technology (legacy)', ticker:'DXC', exchange:'NYSE',
    industry:'Enterprise IT / Automotive IT / Manufacturing IT / Systems Integration / Legacy Tech Services', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:130000, workforce_source:'annual_report', workforce_confidence:0.85,
    recent_layoff_count:3, layoff_confidence:0.85, hiring_velocity_score:-0.8, total_open_roles:800, enrichment_version:V },

  // ── Manufacturing IT & IIoT (pre-filled) ──────────────────────────────────
  { canonical_name:'hexagon ab', display_name:'Hexagon AB', ticker:null, exchange:'STO',
    industry:'Manufacturing IT / CAD / PLM / Industrial IoT / Geospatial / Digital Factory / Sweden Manufacturing Tech', sector:'Technology',
    is_public:true, country_code:'SE', workforce_count:26000, workforce_source:'annual_report', workforce_confidence:0.88,
    market_cap_usd:28000000000, pe_ratio:45, revenue_ttm_usd:6500000000,
    financials_source:'annual_report', financials_confidence:0.82,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.3, total_open_roles:600, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'siemens ag', display_name:'Siemens AG', ticker:null, exchange:'XETRA',
    industry:'Industrial Automation / Manufacturing IT / IoT / Smart Factory / Enterprise Systems / Germany Industrial Giant', sector:'Technology',
    is_public:true, country_code:'DE', workforce_count:311000, workforce_source:'annual_report', workforce_confidence:0.92,
    market_cap_usd:190000000000, pe_ratio:28, revenue_ttm_usd:78000000000,
    financials_source:'annual_report', financials_confidence:0.88,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:-0.2, total_open_roles:2000, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'ge digital', display_name:'GE (Digital / Manufacturing)', ticker:null, exchange:null,
    industry:'Industrial Software / Manufacturing IT / Industrial IoT / Predix / Digital Industrial', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:45000, workforce_source:'news_rss_scrape', workforce_confidence:0.80,
    market_cap_usd:null, pe_ratio:null, revenue_ttm_usd:5000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:-0.5, total_open_roles:400, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'schneider electric se', display_name:'Schneider Electric SE', ticker:null, exchange:'EPA',
    industry:'Industrial Automation / Manufacturing / Energy Management / Digital Transformation / Industrial IoT / France Industrial', sector:'Technology',
    is_public:true, country_code:'FR', workforce_count:150000, workforce_source:'annual_report', workforce_confidence:0.90,
    market_cap_usd:90000000000, pe_ratio:28, revenue_ttm_usd:36000000000,
    financials_source:'annual_report', financials_confidence:0.85,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.1, total_open_roles:1000, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'abb ltd', display_name:'ABB Ltd', ticker:null, exchange:'SIX',
    industry:'Robotics / Industrial Automation / Electrification / Power Grids / Manufacturing Technology / Switzerland Industrial', sector:'Technology',
    is_public:true, country_code:'CH', workforce_count:115000, workforce_source:'annual_report', workforce_confidence:0.90,
    market_cap_usd:65000000000, pe_ratio:22, revenue_ttm_usd:29000000000,
    financials_source:'annual_report', financials_confidence:0.85,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:0.0, total_open_roles:800, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'rockwell automation inc', display_name:'Rockwell Automation Inc.', ticker:'ROK', exchange:'NYSE',
    industry:'Industrial Automation / Manufacturing Software / Industrial IoT / FactoryTalk / Smart Factory', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:24000, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.3, total_open_roles:400, enrichment_version:V },

  { canonical_name:'honeywell international inc', display_name:'Honeywell International Inc.', ticker:'HON', exchange:'NYSE',
    industry:'Industrial Automation / Building Technology / Aerospace Software / Industrial IoT / Smart Building', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:120000, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:0.2, total_open_roles:1000, enrichment_version:V },

  { canonical_name:'mitsubishi electric corporation', display_name:'Mitsubishi Electric Corporation', ticker:null, exchange:'TYO',
    industry:'Industrial Automation / Manufacturing / Robotics / Factory Automation / Japan Industrial Giant', sector:'Technology',
    is_public:true, country_code:'JP', workforce_count:179000, workforce_source:'annual_report', workforce_confidence:0.90,
    market_cap_usd:75000000000, pe_ratio:16, revenue_ttm_usd:46000000000,
    financials_source:'annual_report', financials_confidence:0.85,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:800, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'yaskawa electric corporation', display_name:'Yaskawa Electric Corporation', ticker:null, exchange:'TYO',
    industry:'Industrial Robotics / Automation / Motion Control / Manufacturing Technology / Japan Robotics', sector:'Technology',
    is_public:true, country_code:'JP', workforce_count:16000, workforce_source:'annual_report', workforce_confidence:0.88,
    market_cap_usd:27000000000, pe_ratio:20, revenue_ttm_usd:4500000000,
    financials_source:'annual_report', financials_confidence:0.82,
    recent_layoff_count:0, layoff_confidence:0.72, hiring_velocity_score:0.4, total_open_roles:300, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'fanuc corporation', display_name:'FANUC Corporation', ticker:null, exchange:'TYO',
    industry:'Industrial Robots / CNC / Automation / Manufacturing Technology / Japan Robotics Leader', sector:'Technology',
    is_public:true, country_code:'JP', workforce_count:8000, workforce_source:'annual_report', workforce_confidence:0.88,
    market_cap_usd:54000000000, pe_ratio:35, revenue_ttm_usd:11000000000,
    financials_source:'annual_report', financials_confidence:0.85,
    recent_layoff_count:0, layoff_confidence:0.72, hiring_velocity_score:0.6, total_open_roles:200, data_quality_tier:'verified', enrichment_version:V },
];

runBatch('GT43: Automotive Software & Manufacturing IT (2026)', V, companies)
  .catch(e=>{ console.error(e); process.exit(1); });
