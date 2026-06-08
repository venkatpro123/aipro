// GT37: Chinese & East-Asian IT / Software (2026)
import { runBatch } from './_gt-upsert-lib.mjs';
const V = 'gt37-v2026.1';

// All pre-filled — most are A-share / HK / TYO / KRX listings not reliably on Yahoo v8.
const companies = [
  // ── China (A-shares / HK) ─────────────────────────────────────────────────
  { canonical_name:'inspur electronic information industry', display_name:'Inspur Electronic Information Industry Co.', ticker:null, exchange:'SHE',
    industry:'Servers / AI Servers / Data Center Hardware / Cloud Infrastructure / China Server Leader', sector:'Technology',
    is_public:true, country_code:'CN', workforce_count:30000, workforce_source:'annual_report', workforce_confidence:0.85,
    market_cap_usd:16000000000, pe_ratio:30, revenue_ttm_usd:16000000000,
    financials_source:'annual_report', financials_confidence:0.78,
    recent_layoff_count:0, layoff_confidence:0.70, hiring_velocity_score:0.3, total_open_roles:600, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'digital china group co', display_name:'Digital China Group Co., Ltd.', ticker:null, exchange:'SHE',
    industry:'IT Services / Cloud / Distribution / Digital Transformation / China Enterprise IT', sector:'Technology',
    is_public:true, country_code:'CN', workforce_count:15000, workforce_source:'annual_report', workforce_confidence:0.82,
    market_cap_usd:4000000000, pe_ratio:28, revenue_ttm_usd:16000000000,
    financials_source:'annual_report', financials_confidence:0.75,
    recent_layoff_count:0, layoff_confidence:0.70, hiring_velocity_score:0.2, total_open_roles:400, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'yonyou network technology co', display_name:'Yonyou Network Technology Co., Ltd.', ticker:null, exchange:'SHA',
    industry:'ERP / Enterprise Cloud Software / Business Management SaaS / China ERP Leader / YonBIP', sector:'Technology',
    is_public:true, country_code:'CN', workforce_count:23000, workforce_source:'annual_report', workforce_confidence:0.85,
    market_cap_usd:8000000000, pe_ratio:null, revenue_ttm_usd:1400000000,
    financials_source:'annual_report', financials_confidence:0.75,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:500, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'sangfor technologies inc', display_name:'Sangfor Technologies Inc.', ticker:null, exchange:'SHE',
    industry:'Cybersecurity / Cloud Computing / SD-WAN / Network Security / China Enterprise Infrastructure', sector:'Cybersecurity',
    is_public:true, country_code:'CN', workforce_count:9000, workforce_source:'annual_report', workforce_confidence:0.85,
    market_cap_usd:5000000000, pe_ratio:40, revenue_ttm_usd:1100000000,
    financials_source:'annual_report', financials_confidence:0.78,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.0, total_open_roles:300, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'venustech group inc', display_name:'Venustech Group Inc.', ticker:null, exchange:'SHE',
    industry:'Cybersecurity / Network Security / Threat Detection / Security Operations / China Cyber', sector:'Cybersecurity',
    is_public:true, country_code:'CN', workforce_count:8000, workforce_source:'annual_report', workforce_confidence:0.82,
    market_cap_usd:3500000000, pe_ratio:35, revenue_ttm_usd:600000000,
    financials_source:'annual_report', financials_confidence:0.75,
    recent_layoff_count:0, layoff_confidence:0.70, hiring_velocity_score:0.1, total_open_roles:200, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'glodon company limited', display_name:'Glodon Company Limited', ticker:null, exchange:'SHE',
    industry:'Construction Software / BIM / Cost Estimation / Digital Construction / China AEC Tech', sector:'Technology',
    is_public:true, country_code:'CN', workforce_count:14000, workforce_source:'annual_report', workforce_confidence:0.85,
    market_cap_usd:6000000000, pe_ratio:45, revenue_ttm_usd:900000000,
    financials_source:'annual_report', financials_confidence:0.78,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.0, total_open_roles:300, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'hundsun technologies inc', display_name:'Hundsun Technologies Inc.', ticker:null, exchange:'SHA',
    industry:'FinTech Software / Securities Trading Systems / Asset Management Tech / China Financial IT', sector:'Financial Technology',
    is_public:true, country_code:'CN', workforce_count:13000, workforce_source:'annual_report', workforce_confidence:0.85,
    market_cap_usd:7000000000, pe_ratio:38, revenue_ttm_usd:900000000,
    financials_source:'annual_report', financials_confidence:0.78,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.1, total_open_roles:300, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'iflytek co ltd', display_name:'iFLYTEK Co., Ltd.', ticker:null, exchange:'SHE',
    industry:'AI / Speech Recognition / NLP / Smart Education / Voice Tech / China AI Leader / Spark LLM', sector:'Technology',
    is_public:true, country_code:'CN', workforce_count:18000, workforce_source:'annual_report', workforce_confidence:0.85,
    market_cap_usd:16000000000, pe_ratio:80, revenue_ttm_usd:3200000000,
    financials_source:'annual_report', financials_confidence:0.78,
    recent_layoff_count:0, layoff_confidence:0.70, hiring_velocity_score:0.5, total_open_roles:600, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'chinasoft international limited', display_name:'Chinasoft International Limited', ticker:null, exchange:'HKG',
    industry:'IT Services / Software Outsourcing / Cloud / Huawei Partner / China IT Services', sector:'Technology',
    is_public:true, country_code:'CN', workforce_count:90000, workforce_source:'annual_report', workforce_confidence:0.85,
    market_cap_usd:3000000000, pe_ratio:15, revenue_ttm_usd:2500000000,
    financials_source:'annual_report', financials_confidence:0.75,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:1500, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'neusoft corporation', display_name:'Neusoft Corporation', ticker:null, exchange:'SHA',
    industry:'IT Solutions / Healthcare IT / Automotive Software / Smart City / China Enterprise IT', sector:'Technology',
    is_public:true, country_code:'CN', workforce_count:20000, workforce_source:'annual_report', workforce_confidence:0.82,
    market_cap_usd:2500000000, pe_ratio:30, revenue_ttm_usd:1300000000,
    financials_source:'annual_report', financials_confidence:0.75,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.0, total_open_roles:400, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'qi an xin technology group', display_name:'Qi An Xin Technology Group Inc.', ticker:null, exchange:'SHA',
    industry:'Cybersecurity / Enterprise Security / Threat Intelligence / China Network Security', sector:'Cybersecurity',
    is_public:true, country_code:'CN', workforce_count:9000, workforce_source:'annual_report', workforce_confidence:0.80,
    market_cap_usd:3000000000, pe_ratio:null, revenue_ttm_usd:900000000,
    financials_source:'annual_report', financials_confidence:0.72,
    recent_layoff_count:2, layoff_confidence:0.78, hiring_velocity_score:-0.3, total_open_roles:200, data_quality_tier:'verified', enrichment_version:V },

  // ── Japan IT services & software ───────────────────────────────────────────
  { canonical_name:'scsk corporation', display_name:'SCSK Corporation', ticker:null, exchange:'TYO',
    industry:'IT Services / Systems Integration / Cloud / BPO / Sumitomo Group IT / Japan Enterprise IT', sector:'Technology',
    is_public:true, country_code:'JP', workforce_count:15000, workforce_source:'annual_report', workforce_confidence:0.88,
    market_cap_usd:11000000000, pe_ratio:22, revenue_ttm_usd:3500000000,
    financials_source:'annual_report', financials_confidence:0.82,
    recent_layoff_count:0, layoff_confidence:0.72, hiring_velocity_score:0.2, total_open_roles:400, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'tis inc', display_name:'TIS Inc.', ticker:null, exchange:'TYO',
    industry:'IT Services / Payment Systems / Systems Integration / Cloud / Japan Financial IT', sector:'Technology',
    is_public:true, country_code:'JP', workforce_count:21000, workforce_source:'annual_report', workforce_confidence:0.88,
    market_cap_usd:10000000000, pe_ratio:20, revenue_ttm_usd:3500000000,
    financials_source:'annual_report', financials_confidence:0.82,
    recent_layoff_count:0, layoff_confidence:0.72, hiring_velocity_score:0.2, total_open_roles:400, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'biprogy inc', display_name:'BIPROGY Inc.', ticker:null, exchange:'TYO',
    industry:'IT Services / Systems Integration / Digital / formerly Nihon Unisys / Japan Enterprise IT', sector:'Technology',
    is_public:true, country_code:'JP', workforce_count:8000, workforce_source:'annual_report', workforce_confidence:0.85,
    market_cap_usd:3500000000, pe_ratio:18, revenue_ttm_usd:2400000000,
    financials_source:'annual_report', financials_confidence:0.80,
    recent_layoff_count:0, layoff_confidence:0.72, hiring_velocity_score:0.1, total_open_roles:200, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'otsuka corporation', display_name:'Otsuka Corporation', ticker:null, exchange:'TYO',
    industry:'IT Solutions / Office Systems / SMB IT / Cloud / Japan IT Distribution & Services', sector:'Technology',
    is_public:true, country_code:'JP', workforce_count:9500, workforce_source:'annual_report', workforce_confidence:0.85,
    market_cap_usd:8000000000, pe_ratio:18, revenue_ttm_usd:6500000000,
    financials_source:'annual_report', financials_confidence:0.80,
    recent_layoff_count:0, layoff_confidence:0.72, hiring_velocity_score:0.2, total_open_roles:200, data_quality_tier:'verified', enrichment_version:V },

  // ── Korea ──────────────────────────────────────────────────────────────────
  { canonical_name:'lg cns co ltd', display_name:'LG CNS Co., Ltd.', ticker:null, exchange:'KRX',
    industry:'IT Services / Cloud / AI / Smart Logistics / Digital Transformation / LG Group IT Korea', sector:'Technology',
    is_public:true, country_code:'KR', workforce_count:9000, workforce_source:'annual_report', workforce_confidence:0.82,
    market_cap_usd:4500000000, pe_ratio:18, revenue_ttm_usd:4000000000,
    financials_source:'annual_report', financials_confidence:0.75,
    recent_layoff_count:0, layoff_confidence:0.70, hiring_velocity_score:0.3, total_open_roles:300, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'douzone bizon co ltd', display_name:'Douzone Bizon Co., Ltd.', ticker:null, exchange:'KRX',
    industry:'ERP / Accounting Software / Cloud Business Platform / SMB SaaS / Korea Enterprise Software', sector:'Technology',
    is_public:true, country_code:'KR', workforce_count:2500, workforce_source:'annual_report', workforce_confidence:0.82,
    market_cap_usd:1500000000, pe_ratio:25, revenue_ttm_usd:900000000,
    financials_source:'annual_report', financials_confidence:0.75,
    recent_layoff_count:0, layoff_confidence:0.70, hiring_velocity_score:0.3, total_open_roles:100, data_quality_tier:'verified', enrichment_version:V },

  // ── Taiwan / SEA software & IT services ────────────────────────────────────
  { canonical_name:'systex corporation', display_name:'Systex Corporation', ticker:null, exchange:'TPE',
    industry:'IT Services / Systems Integration / Cloud / Big Data / Taiwan Enterprise IT', sector:'Technology',
    is_public:true, country_code:'TW', workforce_count:6000, workforce_source:'annual_report', workforce_confidence:0.82,
    market_cap_usd:1500000000, pe_ratio:20, revenue_ttm_usd:900000000,
    financials_source:'annual_report', financials_confidence:0.75,
    recent_layoff_count:0, layoff_confidence:0.70, hiring_velocity_score:0.2, total_open_roles:200, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'ncs pte ltd', display_name:'NCS Pte. Ltd.', ticker:null, exchange:null,
    industry:'IT Services / Digital / Cloud / Government IT / Telco IT / Singtel Group / SEA IT Services', sector:'Technology',
    is_public:false, country_code:'SG', workforce_count:13000, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:null, pe_ratio:null, revenue_ttm_usd:2000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:0, layoff_confidence:0.70, hiring_velocity_score:0.5, total_open_roles:600, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'pccw solutions limited', display_name:'PCCW Solutions Limited', ticker:null, exchange:null,
    industry:'IT Services / Cloud / Managed Services / Government IT / Hong Kong & China IT Services', sector:'Technology',
    is_public:false, country_code:'HK', workforce_count:6000, workforce_source:'news_rss_scrape', workforce_confidence:0.75,
    market_cap_usd:null, pe_ratio:null, revenue_ttm_usd:1300000000,
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.2, total_open_roles:200, data_quality_tier:'seed', enrichment_version:V },
];

runBatch('GT37: Chinese & East-Asian IT / Software (2026)', V, companies)
  .catch(e=>{ console.error(e); process.exit(1); });
