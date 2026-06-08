// GT56: Gaming & Game Development (2026)
import { runBatch } from './_gt-upsert-lib.mjs';
const V = 'gt56-v2026.1';

const companies = [
  { canonical_name:'unity software inc', display_name:'Unity Software Inc.', ticker:'U', exchange:'NYSE',
    industry:'Gaming / Game Engine / 3D / Development / Creator Economy / Monetization', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:3500, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:3, layoff_confidence:0.85, hiring_velocity_score:-0.3, total_open_roles:300, enrichment_version:V },

  { canonical_name:'take two interactive software', display_name:'Take-Two Interactive', ticker:'TTWO', exchange:'NASDAQ',
    industry:'Gaming / Game Publisher / GTA / Rockstar / Mobile Games / Esports', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:11000, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:500, enrichment_version:V },

  { canonical_name:'electronic arts inc', display_name:'Electronic Arts Inc.', ticker:'EA', exchange:'NASDAQ',
    industry:'Gaming / Game Publisher / EA Sports / Apex Legends / Battlefield / Streaming', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:13500, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:0.0, total_open_roles:600, enrichment_version:V },

  { canonical_name:'activision blizzard inc', display_name:'Activision Blizzard Inc.', ticker:'ATVI', exchange:'NASDAQ',
    industry:'Gaming / Game Publisher / Blizzard / King / Activision / World of Warcraft', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:14600, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:3, layoff_confidence:0.85, hiring_velocity_score:-0.2, total_open_roles:400, enrichment_version:V },

  { canonical_name:'ubisoft entertainment', display_name:'Ubisoft Entertainment', ticker:null, exchange:'EPA',
    industry:'Gaming / Game Publisher / Assassins Creed / Far Cry / Tom Clancy / France', sector:'Technology',
    is_public:true, country_code:'FR', workforce_count:20500, workforce_source:'annual_report', workforce_confidence:0.88,
    market_cap_usd:9500000000, pe_ratio:null, revenue_ttm_usd:2800000000,
    financials_source:'annual_report', financials_confidence:0.82,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:-0.3, total_open_roles:600, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'roblox corporation', display_name:'Roblox Corporation', ticker:'RBLX', exchange:'NYSE',
    industry:'Gaming / UGC Platform / User-Generated / Metaverse / Developer Platform', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:2700, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.3, total_open_roles:300, enrichment_version:V },

  { canonical_name:'zynga inc', display_name:'Zynga (Take-Two)', ticker:null, exchange:null,
    industry:'Gaming / Mobile Games / Social Games / FarmVille / Words with Friends', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:3000, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:12700000000, pe_ratio:null, revenue_ttm_usd:1000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:250, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'king digital entertainment', display_name:'King Digital Entertainment', ticker:null, exchange:null,
    industry:'Gaming / Mobile Games / Candy Crush / Activision Blizzard / Game Publishing', sector:'Technology',
    is_public:false, country_code:'GB', workforce_count:3500, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:20000000000, pe_ratio:null, revenue_ttm_usd:2500000000,
    financials_source:'news_rss_scrape', financials_confidence:0.64,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.1, total_open_roles:300, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'epic games inc', display_name:'Epic Games Inc.', ticker:null, exchange:null,
    industry:'Gaming / Game Engine / Unreal / Fortnite / Creator / Developer Platform', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:15000, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:32000000000, pe_ratio:null, revenue_ttm_usd:6200000000,
    financials_source:'news_rss_scrape', financials_confidence:0.65,
    recent_layoff_count:3, layoff_confidence:0.85, hiring_velocity_score:-0.4, total_open_roles:500, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'capcom co ltd', display_name:'Capcom Co Ltd', ticker:null, exchange:'TYO',
    industry:'Gaming / Game Publisher / Resident Evil / Street Fighter / Monster Hunter / Japan', sector:'Technology',
    is_public:true, country_code:'JP', workforce_count:3700, workforce_source:'annual_report', workforce_confidence:0.85,
    market_cap_usd:15000000000, pe_ratio:28, revenue_ttm_usd:2100000000,
    financials_source:'annual_report', financials_confidence:0.82,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.4, total_open_roles:350, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'nintendo co ltd', display_name:'Nintendo Co Ltd', ticker:null, exchange:'TYO',
    industry:'Gaming / Game Publisher / Nintendo Switch / Mario / Zelda / Japan', sector:'Technology',
    is_public:true, country_code:'JP', workforce_count:8000, workforce_source:'annual_report', workforce_confidence:0.88,
    market_cap_usd:55000000000, pe_ratio:12, revenue_ttm_usd:17000000000,
    financials_source:'annual_report', financials_confidence:0.88,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.3, total_open_roles:500, data_quality_tier:'verified', enrichment_version:V },

  { canonical_name:'sony interactive entertainment', display_name:'Sony (Gaming Division)', ticker:null, exchange:'TYO',
    industry:'Gaming / PlayStation / Console / Game Publisher / Japan / Esports', sector:'Technology',
    is_public:false, country_code:'JP', workforce_count:4500, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:130000000000, pe_ratio:null, revenue_ttm_usd:25000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.65,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:400, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'microsoft gaming', display_name:'Microsoft (Xbox/Gaming)', ticker:null, exchange:null,
    industry:'Gaming / Xbox / Game Pass / Gaming Platform / Cloud Gaming / Bethesda', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:20000, workforce_source:'news_rss_scrape', workforce_confidence:0.76,
    market_cap_usd:3100000000000, pe_ratio:null, revenue_ttm_usd:60000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.68,
    recent_layoff_count:2, layoff_confidence:0.80, hiring_velocity_score:0.1, total_open_roles:800, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'bandcamp inc', display_name:'Bandcamp', ticker:null, exchange:null,
    industry:'Gaming / Music / Indie Creator / Distribution / Artist Platform', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:150, workforce_source:'news_rss_scrape', workforce_confidence:0.72,
    market_cap_usd:500000000, pe_ratio:null, revenue_ttm_usd:30000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:30, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'itch.io', display_name:'itch.io', ticker:null, exchange:null,
    industry:'Gaming / Indie Games / Distribution / Creator Platform / Game Marketplace', sector:'Technology',
    is_public:false, country_code:'CA', workforce_count:50, workforce_source:'news_rss_scrape', workforce_confidence:0.68,
    market_cap_usd:100000000, pe_ratio:null, revenue_ttm_usd:5000000,
    financials_source:'news_rss_scrape', financials_confidence:0.45,
    recent_layoff_count:0, layoff_confidence:0.68, hiring_velocity_score:0.3, total_open_roles:10, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'scopely inc', display_name:'Scopely Inc.', ticker:null, exchange:null,
    industry:'Gaming / Mobile Games / Star Trek / WWE / Competitive / US', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:1200, workforce_source:'news_rss_scrape', workforce_confidence:0.74,
    market_cap_usd:3500000000, pe_ratio:null, revenue_ttm_usd:400000000,
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.2, total_open_roles:150, data_quality_tier:'seed', enrichment_version:V },

  { canonical_name:'miniclip sa', display_name:'Miniclip SA', ticker:null, exchange:null,
    industry:'Gaming / Mobile Games / 8 Ball Pool / Casual Games / Luxembourg', sector:'Technology',
    is_public:false, country_code:'LU', workforce_count:700, workforce_source:'news_rss_scrape', workforce_confidence:0.74,
    market_cap_usd:5600000000, pe_ratio:null, revenue_ttm_usd:400000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:1, layoff_confidence:0.75, hiring_velocity_score:0.1, total_open_roles:150, data_quality_tier:'seed', enrichment_version:V },
];

runBatch('GT56: Gaming & Game Development (2026)', V, companies)
  .catch(e=>{ console.error(e); process.exit(1); });
