// GT51: Cybersecurity & Enterprise Security (2026)
import { runBatch } from './_gt-upsert-lib.mjs';
const V = 'gt51-v2026.1';

const companies = [
  { canonical_name:'crowdstrike inc', display_name:'CrowdStrike Inc.', ticker:'CRWD', exchange:'NASDAQ',
    industry:'Cybersecurity / Endpoint Protection / Cloud Security / Threat Intelligence / EDR', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:9500, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.8, total_open_roles:800, enrichment_version:V },

  { canonical_name:'palo alto networks inc', display_name:'Palo Alto Networks Inc.', ticker:'PANW', exchange:'NASDAQ',
    industry:'Cybersecurity / Network Security / Cloud Security / Enterprise Firewall / Threat Prevention', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:14000, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.5, total_open_roles:1000, enrichment_version:V },

  { canonical_name:'fortinet inc', display_name:'Fortinet Inc.', ticker:'FTNT', exchange:'NASDAQ',
    industry:'Cybersecurity / Network Security / Firewalls / Cloud Security / Edge Security', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:7500, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.6, total_open_roles:600, enrichment_version:V },

  { canonical_name:'zscaler inc', display_name:'Zscaler Inc.', ticker:'ZS', exchange:'NASDAQ',
    industry:'Cybersecurity / Zero Trust / Cloud Security / Secure Web Gateway / SASE', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:4500, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.7, total_open_roles:400, enrichment_version:V },

  { canonical_name:'cloudflare inc', display_name:'Cloudflare Inc.', ticker:'NET', exchange:'NYSE',
    industry:'Cybersecurity / DDoS Protection / Edge Computing / CDN / Zero Trust / Web Security', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:3000, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.6, total_open_roles:400, enrichment_version:V },

  { canonical_name:'okta inc', display_name:'Okta Inc.', ticker:'OKTA', exchange:'NASDAQ',
    industry:'Cybersecurity / Identity & Access Management / IAM / Zero Trust / SSO', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:8000, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:0.2, total_open_roles:500, enrichment_version:V },

  { canonical_name:'qualys inc', display_name:'Qualys Inc.', ticker:'QLYS', exchange:'NASDAQ',
    industry:'Cybersecurity / Vulnerability Management / Cloud Security / Compliance / VMDR', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:2600, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.4, total_open_roles:250, enrichment_version:V },

  { canonical_name:'tenable inc', display_name:'Tenable Inc.', ticker:'TENB', exchange:'NASDAQ',
    industry:'Cybersecurity / Vulnerability Management / Nessus / Exposure Management / CNVM', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:2500, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.3, total_open_roles:300, enrichment_version:V },

  { canonical_name:'rapid7 inc', display_name:'Rapid7 Inc.', ticker:'RPD', exchange:'NASDAQ',
    industry:'Cybersecurity / Vulnerability Management / InsightIDR / Managed Security Services / CIRT', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:3500, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.5, total_open_roles:350, enrichment_version:V },

  { canonical_name:'sailpoint technologies inc', display_name:'SailPoint Technologies Inc.', ticker:'SAIL', exchange:'NYSE',
    industry:'Cybersecurity / Identity Governance / Identity Management / Access Governance / IAM', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:3000, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.3, total_open_roles:300, enrichment_version:V },

  { canonical_name:'sentinelone inc', display_name:'SentinelOne Inc.', ticker:'S', exchange:'NYSE',
    industry:'Cybersecurity / Endpoint Protection / EDR / XDR / Autonomous Response / Threat Prevention', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:3200, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.7, total_open_roles:400, enrichment_version:V },

  { canonical_name:'f5 networks inc', display_name:'F5 Networks Inc.', ticker:'FFIV', exchange:'NASDAQ',
    industry:'Cybersecurity / Application Security / Load Balancing / API Security / Cloud Security', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:5500, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:0.1, total_open_roles:400, enrichment_version:V },

  { canonical_name:'proofpoint inc', display_name:'Proofpoint Inc.', ticker:'PFPT', exchange:'NASDAQ',
    industry:'Cybersecurity / Email Security / Cloud Security / CASB / Threat Intelligence', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:3500, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.4, total_open_roles:350, enrichment_version:V },

  { canonical_name:'varonis systems inc', display_name:'Varonis Systems Inc.', ticker:'VRNS', exchange:'NASDAQ',
    industry:'Cybersecurity / Data Security / Insider Threat / DLP / Access Control', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:2400, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:250, enrichment_version:V },

  { canonical_name:'elastic nv', display_name:'Elastic NV', ticker:'ESTC', exchange:'NYSE',
    industry:'Cybersecurity / Observability / Search / Analytics / Security Analytics / SIEM Alternative', sector:'Technology',
    is_public:true, country_code:'NL', workforce_count:2500, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.5, total_open_roles:300, enrichment_version:V },

  { canonical_name:'splunk inc', display_name:'Splunk Inc.', ticker:'SPLK', exchange:'NASDAQ',
    industry:'Cybersecurity / Observability / SIEM / Log Analytics / Security Analytics / Data Platform', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:8500, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:0.2, total_open_roles:600, enrichment_version:V },

  { canonical_name:'darktrace plc', display_name:'Darktrace PLC', ticker:null, exchange:'LON',
    industry:'Cybersecurity / Threat Intelligence / AI Security / Insider Threat / Anomaly Detection', sector:'Technology',
    is_public:true, country_code:'GB', workforce_count:1200, workforce_source:'annual_report', workforce_confidence:0.85,
    market_cap_usd:1800000000, pe_ratio:null, revenue_ttm_usd:400000000,
    financials_source:'annual_report', financials_confidence:0.80,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.6, total_open_roles:200, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'guardio labs', display_name:'Guardio', ticker:null, exchange:null,
    industry:'Cybersecurity / Browser Security / Malware Detection / Fraud Prevention / Consumer Protection', sector:'Technology',
    is_public:false, country_code:'IL', workforce_count:400, workforce_source:'news_rss_scrape', workforce_confidence:0.72,
    market_cap_usd:1200000000, pe_ratio:null, revenue_ttm_usd:80000000,
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.5, total_open_roles:100, data_quality_tier:'seed', enrichment_version:V },
];

runBatch('GT51: Cybersecurity & Enterprise Security (2026)', V, companies)
  .catch(e=>{ console.error(e); process.exit(1); });
