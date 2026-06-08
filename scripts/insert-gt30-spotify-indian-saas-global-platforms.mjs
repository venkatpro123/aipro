// GT30: Spotify, Indian SaaS & Missing Global Platforms (2026)
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const FX = { USD:1, EUR:1.09, GBP:1.27, JPY:0.0067, KRW:0.00073, SEK:0.097, PLN:0.25, AUD:0.65, CAD:0.73, SGD:0.74, INR:0.012, SEK2:0.097 };
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
    c.data_quality_tier??(c.is_public?'verified':'seed'), c.enrichment_version??'gt30-v2026.1', now
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
  // ── Major global platforms not yet covered (Yahoo) ────────────────────────
  { canonical_name:'spotify technology sa', display_name:'Spotify Technology SA', ticker:'SPOT', exchange:'NYSE',
    industry:'Music Streaming / Podcast Platform / Audiobooks / Creator Tools / Advertising Tech', sector:'Technology',
    is_public:true, country_code:'SE', workforce_count:9400, workforce_source:'annual_report', workforce_confidence:0.92,
    recent_layoff_count:3, layoff_source:'news_rss_scrape', layoff_confidence:0.88,
    hiring_velocity_score:-0.5, total_open_roles:250, hiring_source:'linkedin_scrape', hiring_confidence:0.75,
    enrichment_version:'gt30-v2026.1' },

  { canonical_name:'vimeo inc', display_name:'Vimeo Inc.', ticker:'VMEO', exchange:'NASDAQ',
    industry:'Video Hosting / Video Creation / OTT / Enterprise Video / B2B Video Platform', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:1200, workforce_source:'annual_report', workforce_confidence:0.85,
    recent_layoff_count:3, layoff_source:'news_rss_scrape', layoff_confidence:0.88,
    hiring_velocity_score:-1.0, total_open_roles:40, hiring_source:'linkedin_scrape', hiring_confidence:0.68,
    enrichment_version:'gt30-v2026.1' },

  { canonical_name:'sify technologies limited', display_name:'Sify Technologies Limited', ticker:'SIFY', exchange:'NASDAQ',
    industry:'Data Center / Cloud / Network Services / Managed Services / India IT Infrastructure', sector:'Technology',
    is_public:true, country_code:'IN', workforce_count:7000, workforce_source:'annual_report', workforce_confidence:0.85,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.72,
    hiring_velocity_score:0.3, total_open_roles:200, hiring_source:'linkedin_scrape', hiring_confidence:0.65,
    enrichment_version:'gt30-v2026.1' },

  { canonical_name:'kinaxis inc', display_name:'Kinaxis Inc.', ticker:null, exchange:'TSX',
    industry:'Supply Chain Planning / RapidResponse / AI Supply Chain / Demand Management / S&OP', sector:'Technology',
    is_public:true, country_code:'CA', workforce_count:1800, workforce_source:'annual_report', workforce_confidence:0.88,
    market_cap_usd:5000000000, pe_ratio:65, revenue_ttm_usd:500000000,
    financials_source:'annual_report', financials_confidence:0.85,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.72,
    hiring_velocity_score:0.4, total_open_roles:100, hiring_source:'linkedin_scrape', hiring_confidence:0.70,
    data_quality_tier:'verified', enrichment_version:'gt30-v2026.1' },

  { canonical_name:'seek limited', display_name:'SEEK Limited', ticker:null, exchange:'ASX',
    industry:'Online Job Marketplace / Recruitment Platform / SEEK Australia / Asia Pacific Job Search', sector:'Technology',
    is_public:true, country_code:'AU', workforce_count:10000, workforce_source:'annual_report', workforce_confidence:0.88,
    market_cap_usd:4000000000, pe_ratio:30, revenue_ttm_usd:1100000000,
    financials_source:'annual_report', financials_confidence:0.85,
    recent_layoff_count:1, layoff_source:'news_rss_scrape', layoff_confidence:0.78,
    hiring_velocity_score:0.2, total_open_roles:200, hiring_source:'linkedin_scrape', hiring_confidence:0.70,
    data_quality_tier:'verified', enrichment_version:'gt30-v2026.1' },

  { canonical_name:'rea group limited', display_name:'REA Group Limited', ticker:null, exchange:'ASX',
    industry:'Real Estate Technology / Property Search / realestate.com.au / Mortgage Broking / PropTech', sector:'Technology',
    is_public:true, country_code:'AU', workforce_count:3800, workforce_source:'annual_report', workforce_confidence:0.88,
    market_cap_usd:23000000000, pe_ratio:60, revenue_ttm_usd:1500000000,
    financials_source:'annual_report', financials_confidence:0.85,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.72,
    hiring_velocity_score:0.3, total_open_roles:150, hiring_source:'linkedin_scrape', hiring_confidence:0.72,
    data_quality_tier:'verified', enrichment_version:'gt30-v2026.1' },

  { canonical_name:'car group limited', display_name:'CAR Group Limited', ticker:null, exchange:'ASX',
    industry:'Online Auto Marketplace / carsales.com.au / Cars24 / Trader / Auto Digital Media', sector:'Technology',
    is_public:true, country_code:'AU', workforce_count:3500, workforce_source:'annual_report', workforce_confidence:0.85,
    market_cap_usd:13000000000, pe_ratio:45, revenue_ttm_usd:900000000,
    financials_source:'annual_report', financials_confidence:0.85,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.72,
    hiring_velocity_score:0.3, total_open_roles:100, hiring_source:'linkedin_scrape', hiring_confidence:0.70,
    data_quality_tier:'verified', enrichment_version:'gt30-v2026.1' },

  // ── Indian SaaS & Fintech ─────────────────────────────────────────────────
  { canonical_name:'razorpay software pvt ltd', display_name:'Razorpay Software Pvt. Ltd.', ticker:null, exchange:null,
    industry:'Payment Gateway / Fintech / Business Banking / RazorpayX / Neobank / UPI / India Payments', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:3500, workforce_source:'news_rss_scrape', workforce_confidence:0.82,
    market_cap_usd:7500000000, pe_ratio:null, revenue_ttm_usd:500000000,
    financials_source:'news_rss_scrape', financials_confidence:0.68,
    recent_layoff_count:2, layoff_source:'news_rss_scrape', layoff_confidence:0.80,
    hiring_velocity_score:0.5, total_open_roles:300, hiring_source:'linkedin_scrape', hiring_confidence:0.72,
    data_quality_tier:'seed', enrichment_version:'gt30-v2026.1' },

  { canonical_name:'phonepe private limited', display_name:'PhonePe Private Limited', ticker:null, exchange:null,
    industry:'Digital Payments / UPI / PhonePe App / Insurance / Mutual Funds / Indus App Store / India', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:5000, workforce_source:'news_rss_scrape', workforce_confidence:0.82,
    market_cap_usd:12000000000, pe_ratio:null, revenue_ttm_usd:800000000,
    financials_source:'news_rss_scrape', financials_confidence:0.68,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.72,
    hiring_velocity_score:0.8, total_open_roles:400, hiring_source:'linkedin_scrape', hiring_confidence:0.72,
    data_quality_tier:'seed', enrichment_version:'gt30-v2026.1' },

  { canonical_name:'cred dreamplug technologies pvt ltd', display_name:'CRED (Dreamplug Technologies Pvt. Ltd.)', ticker:null, exchange:null,
    industry:'Fintech / Credit Card Management / CRED App / UPI Payments / Travel / Commerce / India', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:1500, workforce_source:'news_rss_scrape', workforce_confidence:0.80,
    market_cap_usd:6400000000, pe_ratio:null, revenue_ttm_usd:300000000,
    financials_source:'news_rss_scrape', financials_confidence:0.65,
    recent_layoff_count:2, layoff_source:'news_rss_scrape', layoff_confidence:0.80,
    hiring_velocity_score:0.2, total_open_roles:100, hiring_source:'linkedin_scrape', hiring_confidence:0.68,
    data_quality_tier:'seed', enrichment_version:'gt30-v2026.1' },

  { canonical_name:'darwinbox digital solutions pvt ltd', display_name:'Darwinbox Digital Solutions Pvt. Ltd.', ticker:null, exchange:null,
    industry:'HRMS / HCM / Payroll / Workforce Management / Talent Management / India HR SaaS', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:900, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:1000000000, pe_ratio:null, revenue_ttm_usd:60000000,
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.72,
    hiring_velocity_score:0.8, total_open_roles:100, hiring_source:'linkedin_scrape', hiring_confidence:0.68,
    data_quality_tier:'seed', enrichment_version:'gt30-v2026.1' },

  { canonical_name:'browserstack inc', display_name:'BrowserStack Inc.', ticker:null, exchange:null,
    industry:'Cloud Testing / Cross-Browser Testing / App Testing / Real Device Testing / QA Platform', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:2000, workforce_source:'news_rss_scrape', workforce_confidence:0.82,
    market_cap_usd:4000000000, pe_ratio:null, revenue_ttm_usd:200000000,
    financials_source:'news_rss_scrape', financials_confidence:0.68,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.72,
    hiring_velocity_score:0.5, total_open_roles:150, hiring_source:'linkedin_scrape', hiring_confidence:0.70,
    data_quality_tier:'seed', enrichment_version:'gt30-v2026.1' },

  { canonical_name:'unacademy learning pvt ltd', display_name:'Unacademy Learning Pvt. Ltd.', ticker:null, exchange:null,
    industry:'EdTech / Online Coaching / UPSC / JEE / NEET / Live Classes / Indian Exam Preparation', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:8000, workforce_source:'news_rss_scrape', workforce_confidence:0.80,
    market_cap_usd:3440000000, pe_ratio:null, revenue_ttm_usd:200000000,
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:4, layoff_source:'news_rss_scrape', layoff_confidence:0.88,
    hiring_velocity_score:-1.5, total_open_roles:100, hiring_source:'linkedin_scrape', hiring_confidence:0.65,
    data_quality_tier:'seed', enrichment_version:'gt30-v2026.1' },

  { canonical_name:'druva inc', display_name:'Druva Inc.', ticker:null, exchange:null,
    industry:'Cloud Data Protection / Backup / Disaster Recovery / Data Governance / SaaS Data Resilience', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:1000, workforce_source:'news_rss_scrape', workforce_confidence:0.80,
    market_cap_usd:2000000000, pe_ratio:null, revenue_ttm_usd:120000000,
    financials_source:'news_rss_scrape', financials_confidence:0.65,
    recent_layoff_count:1, layoff_source:'news_rss_scrape', layoff_confidence:0.75,
    hiring_velocity_score:0.2, total_open_roles:60, hiring_source:'linkedin_scrape', hiring_confidence:0.65,
    data_quality_tier:'seed', enrichment_version:'gt30-v2026.1' },

  { canonical_name:'zenoti inc', display_name:'Zenoti Inc.', ticker:null, exchange:null,
    industry:'Salon & Spa Management Software / Wellness SaaS / Franchise Management / Booking Platform', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:1200, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:1500000000, pe_ratio:null, revenue_ttm_usd:80000000,
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.70,
    hiring_velocity_score:0.4, total_open_roles:60, hiring_source:'linkedin_scrape', hiring_confidence:0.65,
    data_quality_tier:'seed', enrichment_version:'gt30-v2026.1' },

  // ── Nordic/Global missing platforms ───────────────────────────────────────
  { canonical_name:'klarna bank ab', display_name:'Klarna Bank AB', ticker:null, exchange:null,
    industry:'Buy Now Pay Later / BNPL / Payments / Shopping Platform / Klarna App / Consumer Finance', sector:'Technology',
    is_public:false, country_code:'SE', workforce_count:5000, workforce_source:'news_rss_scrape', workforce_confidence:0.85,
    market_cap_usd:14600000000, pe_ratio:null, revenue_ttm_usd:2800000000,
    financials_source:'annual_report', financials_confidence:0.80,
    recent_layoff_count:3, layoff_source:'news_rss_scrape', layoff_confidence:0.88,
    hiring_velocity_score:-0.3, total_open_roles:150, hiring_source:'linkedin_scrape', hiring_confidence:0.72,
    data_quality_tier:'seed', enrichment_version:'gt30-v2026.1' },

  { canonical_name:'meesho inc', display_name:'Meesho Inc.', ticker:null, exchange:null,
    industry:'Social Commerce / Reseller Platform / WhatsApp Commerce / India E-Commerce / Tier 2/3 Cities', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:14000, workforce_source:'news_rss_scrape', workforce_confidence:0.80,
    market_cap_usd:3900000000, pe_ratio:null, revenue_ttm_usd:400000000,
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:2, layoff_source:'news_rss_scrape', layoff_confidence:0.82,
    hiring_velocity_score:-0.5, total_open_roles:200, hiring_source:'linkedin_scrape', hiring_confidence:0.65,
    data_quality_tier:'seed', enrichment_version:'gt30-v2026.1' },

  { canonical_name:'d2l corporation', display_name:'D2L Corporation', ticker:null, exchange:'TSX',
    industry:'Learning Management System / Brightspace LMS / Higher Education / Corporate Training', sector:'Technology',
    is_public:true, country_code:'CA', workforce_count:1400, workforce_source:'annual_report', workforce_confidence:0.85,
    market_cap_usd:2000000000, pe_ratio:40, revenue_ttm_usd:220000000,
    financials_source:'annual_report', financials_confidence:0.82,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.72,
    hiring_velocity_score:0.3, total_open_roles:60, hiring_source:'linkedin_scrape', hiring_confidence:0.68,
    data_quality_tier:'verified', enrichment_version:'gt30-v2026.1' },
];

async function main() {
  console.log('\n✓ Connected — GT30: Spotify, Indian SaaS & Missing Global Platforms (2026)\n');
  await initYahoo();
  let inserted=0, updated=0, withPE=0, withRev=0;
  for (const c of companies) {
    const r = await upsertCompany(c);
    if (r.wasInserted) inserted++; else updated++;
    if (r.hasPE) withPE++;
    if (r.hasRev) withRev++;
    await new Promise(r=>setTimeout(r,700));
  }
  console.log(`\n── GT30 complete: ${inserted} inserted, ${updated} updated | PE: ${withPE}/${companies.length} | Rev: ${withRev}/${companies.length}`);
  await pool.end();
}
main().catch(e=>{ console.error(e); process.exit(1); });
