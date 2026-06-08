// GT47: Project Management & Collaboration SaaS (2026)
import { runBatch } from './_gt-upsert-lib.mjs';
const V = 'gt47-v2026.1';

const companies = [
  // ── US-listed PM/collab (Yahoo) ───────────────────────────────────────────
  { canonical_name:'asana inc', display_name:'Asana Inc.', ticker:'ASAN', exchange:'NYSE',
    industry:'Project Management / Work OS / Collaboration / Team Management / Work Tracking', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:2400, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.3, total_open_roles:150, enrichment_version:V },

  { canonical_name:'monday.com ltd', display_name:'monday.com Ltd.', ticker:'MNDY', exchange:'NASDAQ',
    industry:'Work OS / Project Management / Workflow / Team Collaboration / Work Automation', sector:'Technology',
    is_public:true, country_code:'IL', workforce_count:1600, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.5, total_open_roles:120, enrichment_version:V },

  { canonical_name:'atlassian corporation plc', display_name:'Atlassian Corporation plc', ticker:'TEAM', exchange:'NASDAQ',
    industry:'Work Software / Jira / Confluence / DevOps / Agile / Team Collaboration', sector:'Technology',
    is_public:true, country_code:'AU', workforce_count:9500, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:2, layoff_confidence:0.82, hiring_velocity_score:0.4, total_open_roles:400, enrichment_version:V },

  { canonical_name:'slack technologies inc', display_name:'Slack Technologies Inc.', ticker:null, exchange:null,
    industry:'Team Communication / Messaging / Collaboration / Slack / Salesforce / Workplace Chat', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:2900, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:null, pe_ratio:null, revenue_ttm_usd:3200000000,
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:-0.3, total_open_roles:200, data_quality_tier:'seed', enrichment_version:V },

  // ── Private PM/collab unicorns ────────────────────────────────────────────
  { canonical_name:'notion labs inc', display_name:'Notion Labs Inc.', ticker:null, exchange:null,
    industry:'All-in-One Workspace / Notes / Databases / Collaboration / Productivity / Notion App', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:1000, workforce_source:'news_rss_scrape', workforce_confidence:0.80,
    market_cap_usd:10000000000, pe_ratio:null, revenue_ttm_usd:1200000000,
    financials_source:'news_rss_scrape', financials_confidence:0.65,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.7, total_open_roles:100, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'loom labs', display_name:'Loom (Team Comms)', ticker:null, exchange:null,
    industry:'Async Communication / Team Video / Collaboration / Video Messaging / Remote Work', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:450, workforce_source:'news_rss_scrape', workforce_confidence:0.75,
    market_cap_usd:5000000000, pe_ratio:null, revenue_ttm_usd:250000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.6, total_open_roles:80, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'clickup inc', display_name:'ClickUp Inc.', ticker:null, exchange:null,
    industry:'Project Management / All-in-One Platform / Task Management / Collaboration / Work OS', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:600, workforce_source:'news_rss_scrape', workforce_confidence:0.75,
    market_cap_usd:4000000000, pe_ratio:null, revenue_ttm_usd:400000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.8, total_open_roles:150, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'airtable inc', display_name:'Airtable Inc.', ticker:null, exchange:null,
    industry:'Low-Code Workspace / Database Platform / Spreadsheet / Collaboration / Data Management', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:800, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:10000000000, pe_ratio:null, revenue_ttm_usd:800000000,
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.6, total_open_roles:120, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'height inc', display_name:'Height', ticker:null, exchange:null,
    industry:'Project Management / Task Management / Collaborative Workspace / Agile Tools', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:100, workforce_source:'news_rss_scrape', workforce_confidence:0.70,
    market_cap_usd:500000000, pe_ratio:null, revenue_ttm_usd:50000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.8, total_open_roles:30, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'linear app', display_name:'Linear App', ticker:null, exchange:null,
    industry:'Issue Tracking / Project Management / Software Development / Agile / Engineering Workflow', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:80, workforce_source:'news_rss_scrape', workforce_confidence:0.70,
    market_cap_usd:1000000000, pe_ratio:null, revenue_ttm_usd:100000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:1.2, total_open_roles:25, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'microsoft teams', display_name:'Microsoft Teams (Enterprise)', ticker:null, exchange:null,
    industry:'Team Communication / Collaboration / Messaging / Enterprise / Microsoft Ecosystem', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:30000, workforce_source:'news_rss_scrape', workforce_confidence:0.80,
    market_cap_usd:null, pe_ratio:null, revenue_ttm_usd:5000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:500, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'google workspace', display_name:'Google Workspace (Enterprise)', ticker:null, exchange:null,
    industry:'Productivity Suite / Collaboration / Drive / Docs / Sheets / Google Cloud / Enterprise', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:20000, workforce_source:'news_rss_scrape', workforce_confidence:0.80,
    market_cap_usd:null, pe_ratio:null, revenue_ttm_usd:8000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.3, total_open_roles:300, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'microsoft 365', display_name:'Microsoft 365 (Office)', ticker:null, exchange:null,
    industry:'Productivity Suite / Office / Excel / Word / OneNote / Microsoft / Enterprise', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:25000, workforce_source:'news_rss_scrape', workforce_confidence:0.80,
    market_cap_usd:null, pe_ratio:null, revenue_ttm_usd:22000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.65,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:0.1, total_open_roles:400, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'twist tech inc', display_name:'Twist (Doist)', ticker:null, exchange:null,
    industry:'Team Communication / Async Messaging / Collaboration / Workplace Chat Alternative', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:150, workforce_source:'news_rss_scrape', workforce_confidence:0.70,
    market_cap_usd:200000000, pe_ratio:null, revenue_ttm_usd:30000000,
    financials_source:'news_rss_scrape', financials_confidence:0.50,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.4, total_open_roles:20, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'figma board', display_name:'Figma Boards (Multiplayer)', ticker:null, exchange:null,
    industry:'Collaboration / Design Whiteboarding / Diagramming / Visual Collaboration / FigJam', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:1500, workforce_source:'news_rss_scrape', workforce_confidence:0.80,
    market_cap_usd:20000000000, pe_ratio:null, revenue_ttm_usd:1400000000,
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.8, total_open_roles:200, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'coda inc', display_name:'Coda Inc.', ticker:null, exchange:null,
    industry:'Docs & Tools / Collaborative Workspace / Document Automation / Team Tools / Productivity', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:500, workforce_source:'news_rss_scrape', workforce_confidence:0.75,
    market_cap_usd:2500000000, pe_ratio:null, revenue_ttm_usd:180000000,
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.4, total_open_roles:60, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'plane so', display_name:'Plane.so', ticker:null, exchange:null,
    industry:'Open-Source Project Management / Issue Tracking / Engineering Workflow / Dev Tools', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:50, workforce_source:'news_rss_scrape', workforce_confidence:0.68,
    market_cap_usd:100000000, pe_ratio:null, revenue_ttm_usd:5000000,
    financials_source:'news_rss_scrape', financials_confidence:0.45,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:1.0, total_open_roles:20, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'taiga io', display_name:'Taiga.io', ticker:null, exchange:null,
    industry:'Project Management / Agile / Scrum / Open-Source PM Tool / Team Collaboration', sector:'Technology',
    is_public:false, country_code:'ES', workforce_count:80, workforce_source:'news_rss_scrape', workforce_confidence:0.68,
    market_cap_usd:80000000, pe_ratio:null, revenue_ttm_usd:10000000,
    financials_source:'news_rss_scrape', financials_confidence:0.45,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.5, total_open_roles:15, data_quality_tier:'seed', enrichment_version:V },
];

runBatch('GT47: Project Management & Collaboration SaaS (2026)', V, companies)
  .catch(e=>{ console.error(e); process.exit(1); });
