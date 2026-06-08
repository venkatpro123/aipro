// GT40: Document/Print, Identity, MSP & Open-Source IT (2026)
import { runBatch } from './_gt-upsert-lib.mjs';
const V = 'gt40-v2026.1';

const companies = [
  // ── US-listed document/data/IT (Yahoo) ────────────────────────────────────
  { canonical_name:'xerox holdings corporation', display_name:'Xerox Holdings Corporation', ticker:'XRX', exchange:'NASDAQ',
    industry:'Document Management / Printing / Digital Services / Managed Print / Workplace Technology', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:20000, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:3, layoff_confidence:0.85, hiring_velocity_score:-1.0, total_open_roles:150, enrichment_version:V },

  { canonical_name:'pitney bowes inc', display_name:'Pitney Bowes Inc.', ticker:'PBI', exchange:'NYSE',
    industry:'Shipping Technology / Mailing Systems / SendTech / Logistics Software / Postage Tech', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:9000, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:2, layoff_confidence:0.82, hiring_velocity_score:-0.5, total_open_roles:100, enrichment_version:V },

  { canonical_name:'teradata corporation', display_name:'Teradata Corporation', ticker:'TDC', exchange:'NYSE',
    industry:'Data Warehouse / Cloud Analytics / VantageCloud / Enterprise Data Platform / AI Analytics', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:7000, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:2, layoff_confidence:0.82, hiring_velocity_score:-0.5, total_open_roles:150, enrichment_version:V },

  { canonical_name:'commvault systems inc', display_name:'Commvault Systems Inc.', ticker:'CVLT', exchange:'NASDAQ',
    industry:'Data Protection / Backup & Recovery / Cyber Resilience / Cloud Data Management SaaS', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:2900, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:0, layoff_confidence:0.72, hiring_velocity_score:0.5, total_open_roles:150, enrichment_version:V },

  { canonical_name:'verint systems inc', display_name:'Verint Systems Inc.', ticker:'VRNT', exchange:'NASDAQ',
    industry:'Customer Engagement / Workforce Engagement / AI Analytics / CX Automation Platform', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:4000, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:1, layoff_confidence:0.78, hiring_velocity_score:-0.3, total_open_roles:100, enrichment_version:V },

  { canonical_name:'open text corporation', display_name:'Open Text Corporation', ticker:'OTEX', exchange:'NASDAQ',
    industry:'Enterprise Information Management / Content Services / Cybersecurity / Cloud / Document Mgmt', sector:'Technology',
    is_public:true, country_code:'CA', workforce_count:23000, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:3, layoff_confidence:0.85, hiring_velocity_score:-0.5, total_open_roles:300, enrichment_version:V },

  { canonical_name:'progress software corporation', display_name:'Progress Software Corporation', ticker:'PRGS', exchange:'NASDAQ',
    industry:'Application Development / Data Connectivity / DevOps / Infrastructure Software / MOVEit', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:3600, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:1, layoff_confidence:0.78, hiring_velocity_score:0.0, total_open_roles:120, enrichment_version:V },

  // ── Japanese print/imaging IT (pre-filled) ────────────────────────────────
  { canonical_name:'canon inc', display_name:'Canon Inc.', ticker:null, exchange:'TYO',
    industry:'Imaging / Printers / Cameras / Medical Systems / Semiconductor Lithography / Office IT', sector:'Technology',
    is_public:true, country_code:'JP', workforce_count:180000, workforce_source:'annual_report', workforce_confidence:0.90,
    market_cap_usd:36000000000, pe_ratio:14, revenue_ttm_usd:30000000000,
    financials_source:'annual_report', financials_confidence:0.85,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:-0.2, total_open_roles:600, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'ricoh company ltd', display_name:'Ricoh Company, Ltd.', ticker:null, exchange:'TYO',
    industry:'Office Printing / Document Services / Digital Workplace / Managed Print / Japan Office IT', sector:'Technology',
    is_public:true, country_code:'JP', workforce_count:78000, workforce_source:'annual_report', workforce_confidence:0.90,
    market_cap_usd:6500000000, pe_ratio:13, revenue_ttm_usd:15000000000,
    financials_source:'annual_report', financials_confidence:0.85,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:-0.5, total_open_roles:300, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'konica minolta inc', display_name:'Konica Minolta, Inc.', ticker:null, exchange:'TYO',
    industry:'Office Printing / Digital Workplace / Healthcare Imaging / IT Services / Japan Document Tech', sector:'Technology',
    is_public:true, country_code:'JP', workforce_count:39000, workforce_source:'annual_report', workforce_confidence:0.88,
    market_cap_usd:3000000000, pe_ratio:15, revenue_ttm_usd:7500000000,
    financials_source:'annual_report', financials_confidence:0.82,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:-0.5, total_open_roles:200, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'seiko epson corporation', display_name:'Seiko Epson Corporation', ticker:null, exchange:'TYO',
    industry:'Printers / Imaging / Projectors / Robotics / Precision Tech / Japan Hardware & Office IT', sector:'Technology',
    is_public:true, country_code:'JP', workforce_count:78000, workforce_source:'annual_report', workforce_confidence:0.90,
    market_cap_usd:7000000000, pe_ratio:14, revenue_ttm_usd:9000000000,
    financials_source:'annual_report', financials_confidence:0.85,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.0, total_open_roles:300, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'brother industries ltd', display_name:'Brother Industries, Ltd.', ticker:null, exchange:'TYO',
    industry:'Printers / Office Equipment / Sewing Machines / Industrial Tech / Japan Hardware', sector:'Technology',
    is_public:true, country_code:'JP', workforce_count:38000, workforce_source:'annual_report', workforce_confidence:0.88,
    market_cap_usd:6500000000, pe_ratio:12, revenue_ttm_usd:5500000000,
    financials_source:'annual_report', financials_confidence:0.82,
    recent_layoff_count:0, layoff_confidence:0.72, hiring_velocity_score:0.1, total_open_roles:200, data_quality_tier:'verified', enrichment_version:V },

  // ── Open source & infra (pre-filled) ──────────────────────────────────────
  { canonical_name:'suse sa', display_name:'SUSE S.A.', ticker:null, exchange:'XETRA',
    industry:'Enterprise Linux / Open Source / Kubernetes / Rancher / Edge / Cloud Native Infrastructure', sector:'Technology',
    is_public:true, country_code:'DE', workforce_count:2200, workforce_source:'annual_report', workforce_confidence:0.85,
    market_cap_usd:1100000000, pe_ratio:null, revenue_ttm_usd:700000000,
    financials_source:'annual_report', financials_confidence:0.78,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:-0.3, total_open_roles:80, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'canonical group limited', display_name:'Canonical Group Limited (Ubuntu)', ticker:null, exchange:null,
    industry:'Open Source / Ubuntu Linux / Cloud / OpenStack / Kubernetes / IoT / Enterprise Linux', sector:'Technology',
    is_public:false, country_code:'GB', workforce_count:1300, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:null, pe_ratio:null, revenue_ttm_usd:300000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:0, layoff_confidence:0.70, hiring_velocity_score:0.5, total_open_roles:100, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'acronis international gmbh', display_name:'Acronis International GmbH', ticker:null, exchange:null,
    industry:'Cyber Protection / Backup / Disaster Recovery / Endpoint Security / MSP Data Protection', sector:'Cybersecurity',
    is_public:false, country_code:'CH', workforce_count:2000, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:3500000000, pe_ratio:null, revenue_ttm_usd:400000000,
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:120, data_quality_tier:'seed', enrichment_version:V },

  // ── Identity & MSP (private, pre-filled) ──────────────────────────────────
  { canonical_name:'ping identity holding corp', display_name:'Ping Identity Holding Corp.', ticker:null, exchange:null,
    industry:'Identity & Access Management / SSO / MFA / Zero Trust Identity / Customer IAM / Thoma Bravo', sector:'Cybersecurity',
    is_public:false, country_code:'US', workforce_count:1700, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:2800000000, pe_ratio:null, revenue_ttm_usd:450000000,
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.0, total_open_roles:80, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'1password agilebits inc', display_name:'1Password (AgileBits Inc.)', ticker:null, exchange:null,
    industry:'Password Management / Enterprise Password Vault / Identity Security / Secrets Management', sector:'Cybersecurity',
    is_public:false, country_code:'CA', workforce_count:1400, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:6800000000, pe_ratio:null, revenue_ttm_usd:300000000,
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:60, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'connectwise llc', display_name:'ConnectWise LLC', ticker:null, exchange:null,
    industry:'MSP Software / PSA / RMM / IT Management Platform / Managed Service Provider Tools', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:3000, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:5000000000, pe_ratio:null, revenue_ttm_usd:1000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.0, total_open_roles:100, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'ninjaone llc', display_name:'NinjaOne LLC', ticker:null, exchange:null,
    industry:'IT Endpoint Management / RMM / Patch Management / MSP Platform / IT Operations SaaS', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:1300, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:5000000000, pe_ratio:null, revenue_ttm_usd:300000000,
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:0, layoff_confidence:0.70, hiring_velocity_score:1.0, total_open_roles:150, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'entrust corporation', display_name:'Entrust Corporation', ticker:null, exchange:null,
    industry:'Digital Security / Identity / PKI / Payment Card Issuance / Certificate Authority / HSM', sector:'Cybersecurity',
    is_public:false, country_code:'US', workforce_count:3000, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:3000000000, pe_ratio:null, revenue_ttm_usd:900000000,
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.0, total_open_roles:100, data_quality_tier:'seed', enrichment_version:V },
];

runBatch('GT40: Document/Print, Identity, MSP & Open-Source IT (2026)', V, companies)
  .catch(e=>{ console.error(e); process.exit(1); });
