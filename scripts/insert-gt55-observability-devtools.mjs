// GT55: Observability, Monitoring & Developer Tools (2026)
import { runBatch } from './_gt-upsert-lib.mjs';
const V = 'gt55-v2026.1';

const companies = [
  { canonical_name:'datadog inc', display_name:'Datadog Inc.', ticker:'DDOG', exchange:'NASDAQ',
    industry:'Observability / Monitoring / APM / Infrastructure / Cloud / Analytics', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:7300, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.7, total_open_roles:800, enrichment_version:V },

  { canonical_name:'new relic inc', display_name:'New Relic Inc.', ticker:'NEWR', exchange:'NYSE',
    industry:'Observability / APM / Monitoring / Incident Management / Platform', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:2500, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:0.1, total_open_roles:250, enrichment_version:V },

  { canonical_name:'elastic nv', display_name:'Elastic NV', ticker:'ESTC', exchange:'NYSE',
    industry:'Observability / Search / Analytics / Monitoring / Security / SIEM', sector:'Technology',
    is_public:true, country_code:'NL', workforce_count:2500, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.5, total_open_roles:300, enrichment_version:V },

  { canonical_name:'splunk inc', display_name:'Splunk Inc.', ticker:'SPLK', exchange:'NASDAQ',
    industry:'Observability / SIEM / Log Analytics / Security / Data Platform / APM', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:8500, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:0.2, total_open_roles:600, enrichment_version:V },

  { canonical_name:'dynatrace se', display_name:'Dynatrace SE', ticker:'DT', exchange:'NYSE',
    industry:'Observability / APM / Application Monitoring / AI-Powered / Automation', sector:'Technology',
    is_public:true, country_code:'AT', workforce_count:5000, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.4, total_open_roles:400, enrichment_version:V },

  { canonical_name:'sumologic inc', display_name:'Sumo Logic Inc.', ticker:'SUMO', exchange:'NASDAQ',
    industry:'Observability / Log Management / Cloud Monitoring / Security / Analytics', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:2000, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:0.1, total_open_roles:200, enrichment_version:V },

  { canonical_name:'grafana labs', display_name:'Grafana Labs', ticker:null, exchange:null,
    industry:'Observability / Monitoring / Visualizations / Open Source / Loki / Prometheus', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:1200, workforce_source:'news_rss_scrape', workforce_confidence:0.75,
    market_cap_usd:10000000000, pe_ratio:null, revenue_ttm_usd:600000000,
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.6, total_open_roles:300, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'hashicorp inc', display_name:'HashiCorp Inc.', ticker:'HCP', exchange:'NASDAQ',
    industry:'Developer Tools / Infrastructure / Terraform / Vault / Nomad / Consul / Cloud', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:2200, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:0.3, total_open_roles:250, enrichment_version:V },

  { canonical_name:'gitlab inc', display_name:'GitLab Inc.', ticker:'GTLB', exchange:'NASDAQ',
    industry:'Developer Tools / DevOps / Git Repository / CI/CD / DevSecOps Platform', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:1900, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.4, total_open_roles:300, enrichment_version:V },

  { canonical_name:'github inc', display_name:'GitHub (Microsoft)', ticker:null, exchange:null,
    industry:'Developer Tools / Git / Version Control / DevOps / Copilot / Enterprise', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:3500, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:60000000000, pe_ratio:null, revenue_ttm_usd:2000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.65,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.5, total_open_roles:400, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'browserstack inc', display_name:'BrowserStack Inc.', ticker:null, exchange:null,
    industry:'Developer Tools / Testing / QA / Automation / Device Cloud / App Testing', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:1200, workforce_source:'news_rss_scrape', workforce_confidence:0.75,
    market_cap_usd:4200000000, pe_ratio:null, revenue_ttm_usd:250000000,
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.6, total_open_roles:200, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'sauce labs inc', display_name:'Sauce Labs Inc.', ticker:null, exchange:null,
    industry:'Developer Tools / Testing / QA / Automation / Cross-Browser / Mobile Testing', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:800, workforce_source:'news_rss_scrape', workforce_confidence:0.74,
    market_cap_usd:1500000000, pe_ratio:null, revenue_ttm_usd:150000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:100, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'launchdarkly inc', display_name:'LaunchDarkly Inc.', ticker:null, exchange:null,
    industry:'Developer Tools / Feature Management / Continuous Delivery / Flags / CI/CD', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:600, workforce_source:'news_rss_scrape', workforce_confidence:0.74,
    market_cap_usd:2000000000, pe_ratio:null, revenue_ttm_usd:150000000,
    financials_source:'news_rss_scrape', financials_confidence:0.56,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.3, total_open_roles:120, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'snyk inc', display_name:'Snyk Inc.', ticker:null, exchange:null,
    industry:'Developer Tools / Security / Vulnerability / Open Source / Dependency / DevSecOps', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:900, workforce_source:'news_rss_scrape', workforce_confidence:0.75,
    market_cap_usd:8700000000, pe_ratio:null, revenue_ttm_usd:400000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:0.4, total_open_roles:200, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'postman inc', display_name:'Postman Inc.', ticker:null, exchange:null,
    industry:'Developer Tools / API / Testing / Documentation / Collaboration / Platform', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:750, workforce_source:'news_rss_scrape', workforce_confidence:0.75,
    market_cap_usd:5600000000, pe_ratio:null, revenue_ttm_usd:250000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.7, total_open_roles:200, data_quality_tier:'seed', enrichment_version:V },
];

runBatch('GT55: Observability, Monitoring & Developer Tools (2026)', V, companies)
  .catch(e=>{ console.error(e); process.exit(1); });
