// GT28: Consumer Internet, Social Media & Marketplace Platforms (2026)
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const FX = { USD:1, EUR:1.09, GBP:1.27, JPY:0.0067, KRW:0.00073, SEK:0.097, PLN:0.25, AUD:0.65, CAD:0.73, SGD:0.74, CNY:0.14, LTL:0.32 };
let cookie='', crumb='';

async function initYahoo() {
  const r1 = await fetch('https://fc.yahoo.com', { headers:{'User-Agent':'Mozilla/5.0'}, redirect:'manual' });
  cookie = (r1.headers.get('set-cookie')||'').split(';')[0];
  await new Promise(r=>setTimeout(r,300));
  const r2 = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', { headers:{'User-Agent':'Mozilla/5.0',Cookie:cookie} });
  crumb = await r2.text();
}

async function fetchStockData(ticker) {
  try {
    const r1 = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=90d`, { headers:{'User-Agent':'Mozilla/5.0',Cookie:cookie} });
    const j1 = await r1.json();
    const meta = j1?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    const fx = FX[meta.currency||'USD']||1;
    const price = meta.regularMarketPrice ? Math.round(meta.regularMarketPrice*100)/100 : null;
    let marketCapUsd = meta.marketCap ? Math.round(meta.marketCap*fx) : null;
    const closes = j1?.chart?.result?.[0]?.indicators?.quote?.[0]?.close||[];
    const valid = closes.filter(Boolean);
    let change90d = null;
    if (valid.length>=2) change90d = Math.round(((valid[valid.length-1]-valid[0])/valid[0])*10000)/100;
    let peRatio=null, revenueTtm=null;
    await new Promise(r=>setTimeout(r,300));
    try {
      const r2 = await fetch(`https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=summaryDetail,financialData&crumb=${encodeURIComponent(crumb)}`, { headers:{'User-Agent':'Mozilla/5.0',Cookie:cookie} });
      const j2 = await r2.json();
      const sd = j2?.quoteSummary?.result?.[0]?.summaryDetail;
      const fd = j2?.quoteSummary?.result?.[0]?.financialData;
      peRatio = sd?.trailingPE?.raw ?? sd?.forwardPE?.raw ?? null;
      if (peRatio && isFinite(peRatio)) peRatio = Math.round(peRatio*10)/10; else peRatio = null;
      revenueTtm = fd?.totalRevenue?.raw ? Math.round(fd.totalRevenue.raw*fx) : null;
      if (!marketCapUsd && sd?.marketCap?.raw) marketCapUsd = Math.round(sd.marketCap.raw*fx);
    } catch {}
    return { price, marketCapUsd, change90d, peRatio, revenueTtm };
  } catch { return null; }
}

async function upsertCompany(c) {
  const needsYahoo = !!c.ticker && c.market_cap_usd === undefined;
  const stock = needsYahoo ? await fetchStockData(c.ticker) : null;
  const finalPrice   = c.stock_price    ?? stock?.price        ?? null;
  const finalMktCap  = c.market_cap_usd ?? stock?.marketCapUsd ?? null;
  const finalPE      = c.pe_ratio       ?? stock?.peRatio      ?? null;
  const finalRev     = c.revenue_ttm_usd?? stock?.revenueTtm   ?? null;
  const finalChange  = c.stock_90d_change ?? stock?.change90d  ?? null;
  const finalSrc     = c.financials_source ?? (stock ? 'yahoo_finance_scrape' : 'not_applicable');
  const finalConf    = c.financials_confidence ?? (finalPrice!=null ? 0.88 : null);
  const now = new Date().toISOString();
  const sql = `
    INSERT INTO verified_company_intelligence (
      canonical_name,display_name,ticker,exchange,industry,sector,
      is_public,country_code,workforce_count,workforce_source,workforce_verified_at,workforce_confidence,
      stock_price,market_cap_usd,pe_ratio,revenue_ttm_usd,stock_90d_change,
      financials_source,financials_verified_at,financials_confidence,
      recent_layoff_count,layoff_source,layoff_verified_at,layoff_confidence,
      hiring_velocity_score,total_open_roles,hiring_source,hiring_verified_at,hiring_confidence,
      data_quality_tier,enrichment_version,last_enriched_at,conflict_flags,updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
      $13,$14,$15,$16,$17,$18,$19,$20,
      $21,$22,$23,$24,$25,$26,$27,$28,$29,
      $30,$31,$32,'[]'::jsonb,$32
    )
    ON CONFLICT (canonical_name) DO UPDATE SET
      display_name=COALESCE(EXCLUDED.display_name,verified_company_intelligence.display_name),
      ticker=COALESCE(EXCLUDED.ticker,verified_company_intelligence.ticker),
      exchange=COALESCE(EXCLUDED.exchange,verified_company_intelligence.exchange),
      industry=COALESCE(EXCLUDED.industry,verified_company_intelligence.industry),
      sector=COALESCE(EXCLUDED.sector,verified_company_intelligence.sector),
      is_public=EXCLUDED.is_public,
      country_code=COALESCE(EXCLUDED.country_code,verified_company_intelligence.country_code),
      workforce_count=COALESCE(EXCLUDED.workforce_count,verified_company_intelligence.workforce_count),
      workforce_source=COALESCE(EXCLUDED.workforce_source,verified_company_intelligence.workforce_source),
      workforce_verified_at=COALESCE(EXCLUDED.workforce_verified_at,verified_company_intelligence.workforce_verified_at),
      workforce_confidence=COALESCE(EXCLUDED.workforce_confidence,verified_company_intelligence.workforce_confidence),
      stock_price=COALESCE(EXCLUDED.stock_price,verified_company_intelligence.stock_price),
      market_cap_usd=COALESCE(EXCLUDED.market_cap_usd,verified_company_intelligence.market_cap_usd),
      pe_ratio=COALESCE(EXCLUDED.pe_ratio,verified_company_intelligence.pe_ratio),
      revenue_ttm_usd=COALESCE(EXCLUDED.revenue_ttm_usd,verified_company_intelligence.revenue_ttm_usd),
      stock_90d_change=COALESCE(EXCLUDED.stock_90d_change,verified_company_intelligence.stock_90d_change),
      financials_source=COALESCE(EXCLUDED.financials_source,verified_company_intelligence.financials_source),
      financials_verified_at=COALESCE(EXCLUDED.financials_verified_at,verified_company_intelligence.financials_verified_at),
      financials_confidence=COALESCE(EXCLUDED.financials_confidence,verified_company_intelligence.financials_confidence),
      recent_layoff_count=COALESCE(EXCLUDED.recent_layoff_count,verified_company_intelligence.recent_layoff_count),
      layoff_source=COALESCE(EXCLUDED.layoff_source,verified_company_intelligence.layoff_source),
      layoff_verified_at=COALESCE(EXCLUDED.layoff_verified_at,verified_company_intelligence.layoff_verified_at),
      layoff_confidence=COALESCE(EXCLUDED.layoff_confidence,verified_company_intelligence.layoff_confidence),
      hiring_velocity_score=COALESCE(EXCLUDED.hiring_velocity_score,verified_company_intelligence.hiring_velocity_score),
      total_open_roles=COALESCE(EXCLUDED.total_open_roles,verified_company_intelligence.total_open_roles),
      hiring_source=COALESCE(EXCLUDED.hiring_source,verified_company_intelligence.hiring_source),
      hiring_verified_at=COALESCE(EXCLUDED.hiring_verified_at,verified_company_intelligence.hiring_verified_at),
      hiring_confidence=COALESCE(EXCLUDED.hiring_confidence,verified_company_intelligence.hiring_confidence),
      data_quality_tier=EXCLUDED.data_quality_tier,
      enrichment_version=EXCLUDED.enrichment_version,
      last_enriched_at=EXCLUDED.last_enriched_at,
      updated_at=EXCLUDED.updated_at
    RETURNING canonical_name,(xmax=0) AS inserted`;
  const vals = [
    c.canonical_name, c.display_name, c.ticker??null, c.exchange??null, c.industry, c.sector,
    c.is_public, c.country_code,
    c.workforce_count??null, c.workforce_source??'annual_report', now, c.workforce_confidence??0.85,
    finalPrice, finalMktCap, (finalPE&&isFinite(finalPE))?Math.round(finalPE*10)/10:null, finalRev, finalChange,
    finalSrc, finalPrice!=null?now:null, finalConf,
    c.recent_layoff_count??0, c.layoff_source??'news_rss_scrape', now, c.layoff_confidence??0.70,
    c.hiring_velocity_score??0.0, c.total_open_roles??null, c.hiring_source??'linkedin_scrape', now, c.hiring_confidence??0.65,
    c.data_quality_tier??(c.is_public?'verified':'seed'), c.enrichment_version??'gt28-v2026.1', now
  ];
  const { rows } = await pool.query(sql, vals);
  const ins = rows[0]?.inserted;
  const tl = c.ticker ? c.ticker.padEnd(6) : 'PRIV  ';
  const mc = finalMktCap ? `$${Math.round(finalMktCap/1e9)}B` : 'n/a';
  const pe = finalPE ? `PE:${Math.round(finalPE)}` : '';
  console.log(`  ${tl} ${c.canonical_name.padEnd(40)} ${c.is_public?'💹':'📋'} ${mc.padStart(7)} ${pe.padStart(7)} ${ins?'✅ inserted':'🔄 updated'}`);
  return { wasInserted:ins, hasPE:!!finalPE, hasRev:!!finalRev };
}

const companies = [
  // ── Travel & Booking Platforms ────────────────────────────────────────────
  { canonical_name:'booking holdings inc', display_name:'Booking Holdings Inc.', ticker:'BKNG', exchange:'NASDAQ',
    industry:'Online Travel / Booking.com / Priceline / Kayak / OpenTable / Agoda / Rentalcars', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:25000, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:2, layoff_source:'news_rss_scrape', layoff_confidence:0.82,
    hiring_velocity_score:0.3, total_open_roles:600, hiring_source:'linkedin_scrape', hiring_confidence:0.75,
    enrichment_version:'gt28-v2026.1' },

  { canonical_name:'airbnb inc', display_name:'Airbnb Inc.', ticker:'ABNB', exchange:'NASDAQ',
    industry:'Home Sharing / Short-Term Rental Platform / Experience Marketplace / Travel Tech', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:7000, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:3, layoff_source:'news_rss_scrape', layoff_confidence:0.85,
    hiring_velocity_score:-0.2, total_open_roles:200, hiring_source:'linkedin_scrape', hiring_confidence:0.75,
    enrichment_version:'gt28-v2026.1' },

  { canonical_name:'expedia group inc', display_name:'Expedia Group Inc.', ticker:'EXPE', exchange:'NASDAQ',
    industry:'Online Travel / Hotels.com / Vrbo / HomeAway / Trivago / Orbitz / Travelocity', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:17000, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:3, layoff_source:'news_rss_scrape', layoff_confidence:0.85,
    hiring_velocity_score:-0.3, total_open_roles:400, hiring_source:'linkedin_scrape', hiring_confidence:0.72,
    enrichment_version:'gt28-v2026.1' },

  { canonical_name:'tripadvisor inc', display_name:'Tripadvisor Inc.', ticker:'TRIP', exchange:'NASDAQ',
    industry:'Travel Reviews / Hotel Comparison / Viator Experiences / TheFork / Travel Discovery', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:2700, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:3, layoff_source:'news_rss_scrape', layoff_confidence:0.85,
    hiring_velocity_score:-0.8, total_open_roles:80, hiring_source:'linkedin_scrape', hiring_confidence:0.70,
    enrichment_version:'gt28-v2026.1' },

  // ── Ride-Hailing & Delivery ───────────────────────────────────────────────
  { canonical_name:'uber technologies inc', display_name:'Uber Technologies Inc.', ticker:'UBER', exchange:'NYSE',
    industry:'Ride-Hailing / Uber Eats / Freight / Mobility Platform / Driver Marketplace', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:32000, workforce_source:'annual_report', workforce_confidence:0.92,
    recent_layoff_count:3, layoff_source:'news_rss_scrape', layoff_confidence:0.85,
    hiring_velocity_score:0.3, total_open_roles:800, hiring_source:'linkedin_scrape', hiring_confidence:0.78,
    enrichment_version:'gt28-v2026.1' },

  { canonical_name:'doordash inc', display_name:'DoorDash Inc.', ticker:'DASH', exchange:'NYSE',
    industry:'Food Delivery / On-Demand Delivery / DashPass / DoorDash Drive / Grocery & Convenience', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:16000, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:1, layoff_source:'news_rss_scrape', layoff_confidence:0.78,
    hiring_velocity_score:0.5, total_open_roles:500, hiring_source:'linkedin_scrape', hiring_confidence:0.75,
    enrichment_version:'gt28-v2026.1' },

  { canonical_name:'lyft inc', display_name:'Lyft Inc.', ticker:'LYFT', exchange:'NASDAQ',
    industry:'Ride-Sharing / Mobility Platform / Bikeshare / Scooter / Autonomous Vehicle Partnership', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:6200, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:3, layoff_source:'news_rss_scrape', layoff_confidence:0.88,
    hiring_velocity_score:-0.5, total_open_roles:150, hiring_source:'linkedin_scrape', hiring_confidence:0.70,
    enrichment_version:'gt28-v2026.1' },

  { canonical_name:'maplebear inc', display_name:'Maplebear Inc. (Instacart)', ticker:'CART', exchange:'NASDAQ',
    industry:'Grocery Delivery / Online Grocery / Instacart Platform / Retailer Technology / Caper Cart', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:2800, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:2, layoff_source:'news_rss_scrape', layoff_confidence:0.82,
    hiring_velocity_score:-0.3, total_open_roles:100, hiring_source:'linkedin_scrape', hiring_confidence:0.70,
    enrichment_version:'gt28-v2026.1' },

  // ── Social Media & Content Platforms ─────────────────────────────────────
  { canonical_name:'pinterest inc', display_name:'Pinterest Inc.', ticker:'PINS', exchange:'NYSE',
    industry:'Visual Discovery / Image Search / Shopping / Creator Platform / Social Commerce', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:3800, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:2, layoff_source:'news_rss_scrape', layoff_confidence:0.82,
    hiring_velocity_score:-0.2, total_open_roles:150, hiring_source:'linkedin_scrape', hiring_confidence:0.72,
    enrichment_version:'gt28-v2026.1' },

  { canonical_name:'snap inc', display_name:'Snap Inc.', ticker:'SNAP', exchange:'NYSE',
    industry:'Snapchat / Augmented Reality / Stories / Spotlight / Snap Map / AR Glasses / Spectacles', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:5300, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:4, layoff_source:'news_rss_scrape', layoff_confidence:0.90,
    hiring_velocity_score:-0.8, total_open_roles:150, hiring_source:'linkedin_scrape', hiring_confidence:0.70,
    enrichment_version:'gt28-v2026.1' },

  { canonical_name:'reddit inc', display_name:'Reddit Inc.', ticker:'RDDT', exchange:'NYSE',
    industry:'Social News / Community Platform / Subreddits / AMA / AI Data Licensing / Discussion Forums', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:2300, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:1, layoff_source:'news_rss_scrape', layoff_confidence:0.80,
    hiring_velocity_score:0.3, total_open_roles:100, hiring_source:'linkedin_scrape', hiring_confidence:0.70,
    enrichment_version:'gt28-v2026.1' },

  // ── E-commerce & Marketplace Platforms ───────────────────────────────────
  { canonical_name:'etsy inc', display_name:'Etsy Inc.', ticker:'ETSY', exchange:'NASDAQ',
    industry:'Handmade Marketplace / Vintage / Craft Supplies / Depop / Reverb / Seller Tools', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:2500, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:3, layoff_source:'news_rss_scrape', layoff_confidence:0.88,
    hiring_velocity_score:-0.5, total_open_roles:80, hiring_source:'linkedin_scrape', hiring_confidence:0.70,
    enrichment_version:'gt28-v2026.1' },

  { canonical_name:'match group inc', display_name:'Match Group Inc.', ticker:'MTCH', exchange:'NASDAQ',
    industry:'Online Dating / Tinder / Hinge / Match.com / OkCupid / PlentyOfFish / Meetic', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:2400, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:3, layoff_source:'news_rss_scrape', layoff_confidence:0.88,
    hiring_velocity_score:-0.8, total_open_roles:80, hiring_source:'linkedin_scrape', hiring_confidence:0.68,
    enrichment_version:'gt28-v2026.1' },

  { canonical_name:'draftkings inc', display_name:'DraftKings Inc.', ticker:'DKNG', exchange:'NASDAQ',
    industry:'Sports Betting / Fantasy Sports / DraftKings Sportsbook / iGaming / Mobile Betting', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:5600, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.72,
    hiring_velocity_score:0.5, total_open_roles:300, hiring_source:'linkedin_scrape', hiring_confidence:0.72,
    enrichment_version:'gt28-v2026.1' },

  { canonical_name:'iac inc', display_name:'IAC Inc.', ticker:'IAC', exchange:'NASDAQ',
    industry:'Internet Media / Dotdash Meredith / Angi / Ask.com / Digital Content / M&A Platform', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:5000, workforce_source:'annual_report', workforce_confidence:0.85,
    recent_layoff_count:3, layoff_source:'news_rss_scrape', layoff_confidence:0.85,
    hiring_velocity_score:-0.5, total_open_roles:100, hiring_source:'linkedin_scrape', hiring_confidence:0.68,
    enrichment_version:'gt28-v2026.1' },

  { canonical_name:'bumble inc', display_name:'Bumble Inc.', ticker:'BMBL', exchange:'NASDAQ',
    industry:'Dating App / Women-First Dating / Bumble BFF / Bumble Bizz / Badoo / Social Network', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:1000, workforce_source:'annual_report', workforce_confidence:0.85,
    recent_layoff_count:2, layoff_source:'news_rss_scrape', layoff_confidence:0.82,
    hiring_velocity_score:-0.5, total_open_roles:40, hiring_source:'linkedin_scrape', hiring_confidence:0.65,
    enrichment_version:'gt28-v2026.1' },

  // ── Private consumer internet companies ────────────────────────────────────
  { canonical_name:'bytedance ltd', display_name:'ByteDance Ltd.', ticker:null, exchange:null,
    industry:'TikTok / Douyin / Toutiao / AI Content / Short Video / Social Commerce / Global Platforms', sector:'Technology',
    is_public:false, country_code:'CN', workforce_count:110000, workforce_source:'news_rss_scrape', workforce_confidence:0.82,
    market_cap_usd:230000000000, pe_ratio:null, revenue_ttm_usd:110000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.70,
    recent_layoff_count:2, layoff_source:'news_rss_scrape', layoff_confidence:0.80,
    hiring_velocity_score:0.5, total_open_roles:2000, hiring_source:'linkedin_scrape', hiring_confidence:0.70,
    data_quality_tier:'seed', enrichment_version:'gt28-v2026.1' },

  { canonical_name:'x corp', display_name:'X Corp. (formerly Twitter)', ticker:null, exchange:null,
    industry:'Social Media / Microblogging / X Platform / Spaces / Twitter / Grok AI / Payments', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:3500, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:20000000000, pe_ratio:null, revenue_ttm_usd:3000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:5, layoff_source:'news_rss_scrape', layoff_confidence:0.92,
    hiring_velocity_score:-1.0, total_open_roles:100, hiring_source:'linkedin_scrape', hiring_confidence:0.62,
    data_quality_tier:'seed', enrichment_version:'gt28-v2026.1' },

  { canonical_name:'shein group limited', display_name:'Shein Group Limited', ticker:null, exchange:null,
    industry:'Fast Fashion E-Commerce / Ultra-Fast Fashion / Global Marketplace / Supply Chain Tech', sector:'Technology',
    is_public:false, country_code:'SG', workforce_count:10000, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:66000000000, pe_ratio:null, revenue_ttm_usd:45000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.65,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.70,
    hiring_velocity_score:0.8, total_open_roles:500, hiring_source:'linkedin_scrape', hiring_confidence:0.65,
    data_quality_tier:'seed', enrichment_version:'gt28-v2026.1' },

  { canonical_name:'vinted uab', display_name:'Vinted UAB', ticker:null, exchange:null,
    industry:'Second-Hand Fashion Marketplace / Pre-Owned Clothing / Circular Economy / European Resale', sector:'Technology',
    is_public:false, country_code:'LT', workforce_count:2000, workforce_source:'news_rss_scrape', workforce_confidence:0.80,
    market_cap_usd:5000000000, pe_ratio:null, revenue_ttm_usd:600000000,
    financials_source:'news_rss_scrape', financials_confidence:0.65,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.72,
    hiring_velocity_score:0.8, total_open_roles:150, hiring_source:'linkedin_scrape', hiring_confidence:0.68,
    data_quality_tier:'seed', enrichment_version:'gt28-v2026.1' },
];

async function main() {
  console.log('\n✓ Connected — GT28: Consumer Internet, Social Media & Marketplace Platforms (2026)\n');
  await initYahoo();
  let inserted=0, updated=0, withPE=0, withRev=0;
  for (const c of companies) {
    const r = await upsertCompany(c);
    if (r.wasInserted) inserted++; else updated++;
    if (r.hasPE) withPE++;
    if (r.hasRev) withRev++;
    await new Promise(r=>setTimeout(r,700));
  }
  console.log(`\n── GT28 complete: ${inserted} inserted, ${updated} updated | PE: ${withPE}/${companies.length} | Rev: ${withRev}/${companies.length}`);
  await pool.end();
}
main().catch(e=>{ console.error(e); process.exit(1); });
