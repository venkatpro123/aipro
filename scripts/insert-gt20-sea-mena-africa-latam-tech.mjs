// GT20: SE Asia, Middle East, Africa & LatAm Tech (2026)
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const FX = { USD:1, EUR:1.09, GBP:1.27, JPY:0.0067, KRW:0.00073, SEK:0.097, PLN:0.25, AUD:0.65, CAD:0.73, SGD:0.74, IDR:0.000062, BRL:0.19, MXN:0.058, COP:0.00024 };
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
      if (peRatio) peRatio = Math.round(peRatio*10)/10;
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
      is_public,country_code,
      workforce_count,workforce_source,workforce_verified_at,workforce_confidence,
      stock_price,market_cap_usd,pe_ratio,revenue_ttm_usd,stock_90d_change,
      financials_source,financials_verified_at,financials_confidence,
      recent_layoff_count,layoff_source,layoff_verified_at,layoff_confidence,
      hiring_velocity_score,total_open_roles,hiring_source,hiring_verified_at,hiring_confidence,
      data_quality_tier,enrichment_version,last_enriched_at,conflict_flags,updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,
      $9,$10,$11,$12,
      $13,$14,$15,$16,$17,
      $18,$19,$20,
      $21,$22,$23,$24,
      $25,$26,$27,$28,$29,
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
    finalPrice, finalMktCap, finalPE?Math.round(finalPE*10)/10:null, finalRev, finalChange,
    finalSrc, finalPrice!=null?now:null, finalConf,
    c.recent_layoff_count??0, c.layoff_source??'news_rss_scrape', now, c.layoff_confidence??0.70,
    c.hiring_velocity_score??0.0, c.total_open_roles??null, c.hiring_source??'linkedin_scrape', now, c.hiring_confidence??0.65,
    c.data_quality_tier??(c.is_public?'verified':'seed'), c.enrichment_version??'gt20-v2026.1', now
  ];
  const { rows } = await pool.query(sql, vals);
  const ins = rows[0]?.inserted;
  const tl = c.ticker ? c.ticker.padEnd(5) : 'PRIV ';
  const mc = finalMktCap ? `$${Math.round(finalMktCap/1e9)}B` : 'n/a';
  const pe = finalPE ? `PE:${Math.round(finalPE)}` : '';
  console.log(`  ${tl} ${c.canonical_name.padEnd(42)} ${c.is_public?'💹':'📋'} ${mc.padStart(7)} ${pe.padStart(6)} ${ins?'✅ inserted':'🔄 updated'}`);
  return { wasInserted:ins, hasPE:!!finalPE, hasRev:!!finalRev };
}

const companies = [
  // ── SE Asia — US/SG-listed (Yahoo Finance) ────────────────────────────────
  { canonical_name:'sea limited', display_name:'Sea Limited', ticker:'SE', exchange:'NYSE',
    industry:'E-Commerce / Shopee / Digital Entertainment / Garena / SeaMoney / Digital Financial Services', sector:'Technology',
    is_public:true, country_code:'SG', workforce_count:40000, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:3, layoff_source:'news_rss_scrape', layoff_confidence:0.85,
    hiring_velocity_score:-0.5, total_open_roles:800, hiring_source:'linkedin_scrape', hiring_confidence:0.72,
    enrichment_version:'gt20-v2026.1' },

  { canonical_name:'grab holdings limited', display_name:'Grab Holdings Limited', ticker:'GRAB', exchange:'NASDAQ',
    industry:'Ride-Hailing / Food Delivery / Digital Payments / GrabPay / SE Asia Super App', sector:'Technology',
    is_public:true, country_code:'SG', workforce_count:8000, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:3, layoff_source:'news_rss_scrape', layoff_confidence:0.85,
    hiring_velocity_score:-0.5, total_open_roles:300, hiring_source:'linkedin_scrape', hiring_confidence:0.70,
    enrichment_version:'gt20-v2026.1' },

  // ── Africa — NYSE-listed ──────────────────────────────────────────────────
  { canonical_name:'jumia technologies ag', display_name:'Jumia Technologies AG', ticker:'JMIA', exchange:'NYSE',
    industry:'E-Commerce Africa / Online Marketplace / Jumia Pay / Pan-African Tech', sector:'Technology',
    is_public:true, country_code:'NG', workforce_count:4000, workforce_source:'annual_report', workforce_confidence:0.82,
    recent_layoff_count:2, layoff_source:'news_rss_scrape', layoff_confidence:0.80,
    hiring_velocity_score:-0.5, total_open_roles:100, hiring_source:'linkedin_scrape', hiring_confidence:0.65,
    enrichment_version:'gt20-v2026.1' },

  // ── Central Asia — NASDAQ-listed ──────────────────────────────────────────
  { canonical_name:'kaspi kz jsc', display_name:'Kaspi.kz JSC', ticker:'KSPI', exchange:'NASDAQ',
    industry:'Super App / Digital Payments / E-Commerce / Kaspi Bank / Kazakhstan Fintech', sector:'Technology',
    is_public:true, country_code:'KZ', workforce_count:25000, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.72,
    hiring_velocity_score:0.8, total_open_roles:500, hiring_source:'linkedin_scrape', hiring_confidence:0.70,
    enrichment_version:'gt20-v2026.1' },

  // ── MENA — NASDAQ-listed ──────────────────────────────────────────────────
  { canonical_name:'anghami inc', display_name:'Anghami Inc.', ticker:'ANGH', exchange:'NASDAQ',
    industry:'Music Streaming / Arabic Music Platform / MENA Entertainment / Digital Media', sector:'Technology',
    is_public:true, country_code:'AE', workforce_count:350, workforce_source:'annual_report', workforce_confidence:0.82,
    recent_layoff_count:1, layoff_source:'news_rss_scrape', layoff_confidence:0.75,
    hiring_velocity_score:0.2, total_open_roles:20, hiring_source:'linkedin_scrape', hiring_confidence:0.62,
    enrichment_version:'gt20-v2026.1' },

  // ── SE Asia — pre-filled (IDX/private) ───────────────────────────────────
  { canonical_name:'goto gojek tokopedia tbk', display_name:'GoTo Gojek Tokopedia Tbk', ticker:null, exchange:'IDX',
    industry:'Ride-Hailing / E-Commerce / Digital Finance / Gojek / Tokopedia / GoPay Indonesia', sector:'Technology',
    is_public:true, country_code:'ID', workforce_count:14000, workforce_source:'annual_report', workforce_confidence:0.85,
    market_cap_usd:4500000000, pe_ratio:null, revenue_ttm_usd:1600000000,
    financials_source:'annual_report', financials_confidence:0.78,
    recent_layoff_count:4, layoff_source:'news_rss_scrape', layoff_confidence:0.88,
    hiring_velocity_score:-1.0, total_open_roles:300, hiring_source:'linkedin_scrape', hiring_confidence:0.68,
    data_quality_tier:'verified', enrichment_version:'gt20-v2026.1' },

  { canonical_name:'bukalapak com tbk', display_name:'Bukalapak.com Tbk', ticker:null, exchange:'IDX',
    industry:'E-Commerce / Marketplace / Warung Digitization / Financial Services / Indonesia', sector:'Technology',
    is_public:true, country_code:'ID', workforce_count:2500, workforce_source:'annual_report', workforce_confidence:0.82,
    market_cap_usd:2000000000, pe_ratio:null, revenue_ttm_usd:400000000,
    financials_source:'annual_report', financials_confidence:0.75,
    recent_layoff_count:3, layoff_source:'news_rss_scrape', layoff_confidence:0.85,
    hiring_velocity_score:-1.2, total_open_roles:80, hiring_source:'linkedin_scrape', hiring_confidence:0.65,
    data_quality_tier:'verified', enrichment_version:'gt20-v2026.1' },

  { canonical_name:'traveloka pte ltd', display_name:'Traveloka Pte. Ltd.', ticker:null, exchange:null,
    industry:'Online Travel / Hotel Booking / Flight Search / Southeast Asia OTA / Travel Fintech', sector:'Technology',
    is_public:false, country_code:'ID', workforce_count:4000, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:3000000000, pe_ratio:null, revenue_ttm_usd:900000000,
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:1, layoff_source:'news_rss_scrape', layoff_confidence:0.75,
    hiring_velocity_score:0.3, total_open_roles:150, hiring_source:'linkedin_scrape', hiring_confidence:0.65,
    data_quality_tier:'seed', enrichment_version:'gt20-v2026.1' },

  { canonical_name:'xendit pte ltd', display_name:'Xendit Pte. Ltd.', ticker:null, exchange:null,
    industry:'Payment Gateway / Digital Payments / SE Asia Fintech / Indonesia Philippines Payments', sector:'Technology',
    is_public:false, country_code:'ID', workforce_count:2000, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:1200000000, pe_ratio:null, revenue_ttm_usd:150000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:1, layoff_source:'news_rss_scrape', layoff_confidence:0.75,
    hiring_velocity_score:0.4, total_open_roles:80, hiring_source:'linkedin_scrape', hiring_confidence:0.65,
    data_quality_tier:'seed', enrichment_version:'gt20-v2026.1' },

  { canonical_name:'mynt gcash inc', display_name:'Mynt (GCash) Inc.', ticker:null, exchange:null,
    industry:'Mobile Wallet / Digital Finance / GCash Philippines / QR Payments / Micro-Lending', sector:'Technology',
    is_public:false, country_code:'PH', workforce_count:1200, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:5000000000, pe_ratio:null, revenue_ttm_usd:500000000,
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.72,
    hiring_velocity_score:0.8, total_open_roles:80, hiring_source:'linkedin_scrape', hiring_confidence:0.65,
    data_quality_tier:'seed', enrichment_version:'gt20-v2026.1' },

  // ── MENA — private ────────────────────────────────────────────────────────
  { canonical_name:'g42 holding llc', display_name:'G42 Holding LLC', ticker:null, exchange:null,
    industry:'AI / Cloud Computing / Genomics / Cybersecurity / UAE National AI Champion / Microsoft Partnership', sector:'Technology',
    is_public:false, country_code:'AE', workforce_count:5500, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:15000000000, pe_ratio:null, revenue_ttm_usd:1500000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.70,
    hiring_velocity_score:1.5, total_open_roles:400, hiring_source:'linkedin_scrape', hiring_confidence:0.65,
    data_quality_tier:'seed', enrichment_version:'gt20-v2026.1' },

  { canonical_name:'careem networks fz llc', display_name:'Careem Networks FZ LLC', ticker:null, exchange:null,
    industry:'Ride-Hailing / Food & Grocery Delivery / Payments / MENA Super App / Uber Subsidiary', sector:'Technology',
    is_public:false, country_code:'AE', workforce_count:2500, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:3100000000, pe_ratio:null, revenue_ttm_usd:500000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:2, layoff_source:'news_rss_scrape', layoff_confidence:0.80,
    hiring_velocity_score:-0.3, total_open_roles:100, hiring_source:'linkedin_scrape', hiring_confidence:0.62,
    data_quality_tier:'seed', enrichment_version:'gt20-v2026.1' },

  { canonical_name:'noon ecommerce llc', display_name:'Noon eCommerce LLC', ticker:null, exchange:null,
    industry:'E-Commerce / Online Marketplace / MENA Retail / Noon.com / Saudi UAE Egypt', sector:'Technology',
    is_public:false, country_code:'AE', workforce_count:5000, workforce_source:'news_rss_scrape', workforce_confidence:0.75,
    market_cap_usd:2000000000, pe_ratio:null, revenue_ttm_usd:500000000,
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:1, layoff_source:'news_rss_scrape', layoff_confidence:0.72,
    hiring_velocity_score:0.3, total_open_roles:200, hiring_source:'linkedin_scrape', hiring_confidence:0.62,
    data_quality_tier:'seed', enrichment_version:'gt20-v2026.1' },

  // ── Africa — private ──────────────────────────────────────────────────────
  { canonical_name:'flutterwave inc', display_name:'Flutterwave Inc.', ticker:null, exchange:null,
    industry:'African Payments Infrastructure / Cross-Border Payments / Payment Gateway / Fintech', sector:'Technology',
    is_public:false, country_code:'NG', workforce_count:900, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:3000000000, pe_ratio:null, revenue_ttm_usd:300000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:1, layoff_source:'news_rss_scrape', layoff_confidence:0.75,
    hiring_velocity_score:0.5, total_open_roles:60, hiring_source:'linkedin_scrape', hiring_confidence:0.62,
    data_quality_tier:'seed', enrichment_version:'gt20-v2026.1' },

  { canonical_name:'andela inc', display_name:'Andela Inc.', ticker:null, exchange:null,
    industry:'Global Tech Talent / African Developer Network / Remote Engineering Marketplace', sector:'Technology',
    is_public:false, country_code:'NG', workforce_count:1400, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:1500000000, pe_ratio:null, revenue_ttm_usd:150000000,
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:2, layoff_source:'news_rss_scrape', layoff_confidence:0.80,
    hiring_velocity_score:-0.3, total_open_roles:50, hiring_source:'linkedin_scrape', hiring_confidence:0.62,
    data_quality_tier:'seed', enrichment_version:'gt20-v2026.1' },

  // ── Latin America — private / LatAm-exchange ──────────────────────────────
  { canonical_name:'kavak com sapi de cv', display_name:'Kavak.com S.A.P.I. de C.V.', ticker:null, exchange:null,
    industry:'Used Car Marketplace / Automotive E-Commerce / LATAM Car Buying / Auto Financing', sector:'Technology',
    is_public:false, country_code:'MX', workforce_count:8000, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:8700000000, pe_ratio:null, revenue_ttm_usd:1500000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:2, layoff_source:'news_rss_scrape', layoff_confidence:0.78,
    hiring_velocity_score:0.2, total_open_roles:300, hiring_source:'linkedin_scrape', hiring_confidence:0.65,
    data_quality_tier:'seed', enrichment_version:'gt20-v2026.1' },

  { canonical_name:'rappi inc', display_name:'Rappi Inc.', ticker:null, exchange:null,
    industry:'On-Demand Delivery / Super App / Food Delivery / Colombia Latin America / RappiPay', sector:'Technology',
    is_public:false, country_code:'CO', workforce_count:4000, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:5250000000, pe_ratio:null, revenue_ttm_usd:800000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:2, layoff_source:'news_rss_scrape', layoff_confidence:0.78,
    hiring_velocity_score:0.3, total_open_roles:200, hiring_source:'linkedin_scrape', hiring_confidence:0.65,
    data_quality_tier:'seed', enrichment_version:'gt20-v2026.1' },

  { canonical_name:'opay digital services limited', display_name:'OPay Digital Services Limited', ticker:null, exchange:null,
    industry:'Mobile Money / Digital Payments / Nigeria Fintech / Agent Banking / OPay Wallet', sector:'Technology',
    is_public:false, country_code:'NG', workforce_count:3000, workforce_source:'news_rss_scrape', workforce_confidence:0.75,
    market_cap_usd:2000000000, pe_ratio:null, revenue_ttm_usd:300000000,
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.70,
    hiring_velocity_score:0.6, total_open_roles:120, hiring_source:'linkedin_scrape', hiring_confidence:0.62,
    data_quality_tier:'seed', enrichment_version:'gt20-v2026.1' },

  { canonical_name:'2c2p pte ltd', display_name:'2C2P Pte. Ltd.', ticker:null, exchange:null,
    industry:'Payment Platform / Digital Payments / SE Asia / Thailand Singapore / Cross-Border Payments', sector:'Technology',
    is_public:false, country_code:'TH', workforce_count:1000, workforce_source:'news_rss_scrape', workforce_confidence:0.75,
    market_cap_usd:700000000, pe_ratio:null, revenue_ttm_usd:200000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.70,
    hiring_velocity_score:0.5, total_open_roles:50, hiring_source:'linkedin_scrape', hiring_confidence:0.60,
    data_quality_tier:'seed', enrichment_version:'gt20-v2026.1' },
];

async function main() {
  console.log('\n✓ Connected — GT20: SE Asia, Middle East, Africa & LatAm Tech (2026)\n');
  await initYahoo();
  let inserted=0, updated=0, withPE=0, withRev=0;
  for (const c of companies) {
    const r = await upsertCompany(c);
    if (r.wasInserted) inserted++; else updated++;
    if (r.hasPE) withPE++;
    if (r.hasRev) withRev++;
    await new Promise(r=>setTimeout(r,700));
  }
  console.log(`\n── GT20 complete: ${inserted} inserted, ${updated} updated | PE: ${withPE}/${companies.length} | Rev: ${withRev}/${companies.length}`);
  await pool.end();
}
main().catch(e=>{ console.error(e); process.exit(1); });
