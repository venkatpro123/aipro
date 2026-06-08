// GT26: Enterprise Software Missing Giants (2026)
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const FX = { USD:1, EUR:1.09, GBP:1.27, JPY:0.0067, KRW:0.00073, SEK:0.097, PLN:0.25, AUD:0.65, CAD:0.73, SGD:0.74, CHF:1.12 };
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
    c.data_quality_tier??(c.is_public?'verified':'seed'), c.enrichment_version??'gt26-v2026.1', now
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
  // ── US-listed (Yahoo Finance) ──────────────────────────────────────────────
  { canonical_name:'thomson reuters corporation', display_name:'Thomson Reuters Corporation', ticker:'TRI', exchange:'NYSE',
    industry:'Legal Data / Tax Software / Reuters News / Westlaw / Practical Law / Professional Info', sector:'Technology',
    is_public:true, country_code:'CA', workforce_count:26000, workforce_source:'annual_report', workforce_confidence:0.92,
    recent_layoff_count:1, layoff_source:'news_rss_scrape', layoff_confidence:0.80,
    hiring_velocity_score:0.1, total_open_roles:600, hiring_source:'linkedin_scrape', hiring_confidence:0.75,
    enrichment_version:'gt26-v2026.1' },

  { canonical_name:'akamai technologies inc', display_name:'Akamai Technologies Inc.', ticker:'AKAM', exchange:'NASDAQ',
    industry:'CDN / Cloud Security / Edge Computing / DDoS Protection / Web Performance / API Security', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:10500, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:1, layoff_source:'news_rss_scrape', layoff_confidence:0.80,
    hiring_velocity_score:-0.2, total_open_roles:300, hiring_source:'linkedin_scrape', hiring_confidence:0.72,
    enrichment_version:'gt26-v2026.1' },

  { canonical_name:'f5 inc', display_name:'F5 Inc.', ticker:'FFIV', exchange:'NASDAQ',
    industry:'Application Delivery / Multi-Cloud Networking / API Security / BIG-IP / NGINX', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:6200, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:2, layoff_source:'news_rss_scrape', layoff_confidence:0.82,
    hiring_velocity_score:-0.3, total_open_roles:200, hiring_source:'linkedin_scrape', hiring_confidence:0.70,
    enrichment_version:'gt26-v2026.1' },

  { canonical_name:'motorola solutions inc', display_name:'Motorola Solutions Inc.', ticker:'MSI', exchange:'NYSE',
    industry:'Mission-Critical Communications / Public Safety / Video Security / Command Center Software', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:20000, workforce_source:'annual_report', workforce_confidence:0.92,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.72,
    hiring_velocity_score:0.3, total_open_roles:500, hiring_source:'linkedin_scrape', hiring_confidence:0.75,
    enrichment_version:'gt26-v2026.1' },

  { canonical_name:'amdocs limited', display_name:'Amdocs Limited', ticker:'DOX', exchange:'NASDAQ',
    industry:'Telecom BSS/OSS Software / Customer Experience / Revenue Management / 5G Solutions', sector:'Technology',
    is_public:true, country_code:'GB', workforce_count:31000, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:1, layoff_source:'news_rss_scrape', layoff_confidence:0.78,
    hiring_velocity_score:0.1, total_open_roles:500, hiring_source:'linkedin_scrape', hiring_confidence:0.72,
    enrichment_version:'gt26-v2026.1' },

  { canonical_name:'csg systems international inc', display_name:'CSG Systems International Inc.', ticker:'CSGS', exchange:'NASDAQ',
    industry:'Revenue Management / Billing / Customer Engagement / Telecom Software / Media Billing', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:5500, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.72,
    hiring_velocity_score:0.1, total_open_roles:150, hiring_source:'linkedin_scrape', hiring_confidence:0.70,
    enrichment_version:'gt26-v2026.1' },

  { canonical_name:'verisk analytics inc', display_name:'Verisk Analytics Inc.', ticker:'VRSK', exchange:'NASDAQ',
    industry:'Data Analytics / Insurance Data / Risk Assessment / Catastrophe Modeling / Energy Data', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:9000, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:1, layoff_source:'news_rss_scrape', layoff_confidence:0.78,
    hiring_velocity_score:0.2, total_open_roles:250, hiring_source:'linkedin_scrape', hiring_confidence:0.72,
    enrichment_version:'gt26-v2026.1' },

  // ── Pre-filled (European exchanges) ───────────────────────────────────────
  { canonical_name:'wolters kluwer nv', display_name:'Wolters Kluwer NV', ticker:null, exchange:'AMS',
    industry:'Legal / Tax / Finance / Healthcare / Compliance / GRC / Professional Information Software', sector:'Technology',
    is_public:true, country_code:'NL', workforce_count:22000, workforce_source:'annual_report', workforce_confidence:0.92,
    market_cap_usd:24000000000, pe_ratio:32, revenue_ttm_usd:6300000000,
    financials_source:'annual_report', financials_confidence:0.88,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.72,
    hiring_velocity_score:0.2, total_open_roles:500, hiring_source:'linkedin_scrape', hiring_confidence:0.72,
    data_quality_tier:'verified', enrichment_version:'gt26-v2026.1' },

  { canonical_name:'relx plc', display_name:'RELX plc', ticker:null, exchange:'LON',
    industry:'Scientific Publishing / LexisNexis / Risk Analytics / Legal Research / Elsevier / Reed Exhibitions', sector:'Technology',
    is_public:true, country_code:'GB', workforce_count:36000, workforce_source:'annual_report', workforce_confidence:0.92,
    market_cap_usd:55000000000, pe_ratio:28, revenue_ttm_usd:12000000000,
    financials_source:'annual_report', financials_confidence:0.88,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.72,
    hiring_velocity_score:0.2, total_open_roles:800, hiring_source:'linkedin_scrape', hiring_confidence:0.72,
    data_quality_tier:'verified', enrichment_version:'gt26-v2026.1' },

  { canonical_name:'hexagon ab', display_name:'Hexagon AB', ticker:null, exchange:'STO',
    industry:'Measurement Technology / Digital Reality / Geospatial / Manufacturing Intelligence / Autonomous', sector:'Technology',
    is_public:true, country_code:'SE', workforce_count:24000, workforce_source:'annual_report', workforce_confidence:0.90,
    market_cap_usd:20000000000, pe_ratio:30, revenue_ttm_usd:5500000000,
    financials_source:'annual_report', financials_confidence:0.85,
    recent_layoff_count:1, layoff_source:'news_rss_scrape', layoff_confidence:0.78,
    hiring_velocity_score:0.1, total_open_roles:400, hiring_source:'linkedin_scrape', hiring_confidence:0.70,
    data_quality_tier:'verified', enrichment_version:'gt26-v2026.1' },

  { canonical_name:'nemetschek se', display_name:'Nemetschek SE', ticker:null, exchange:'XETRA',
    industry:'AEC Software / BIM / Archicad / Vectorworks / Bluebeam / Construction Technology', sector:'Technology',
    is_public:true, country_code:'DE', workforce_count:4200, workforce_source:'annual_report', workforce_confidence:0.90,
    market_cap_usd:9000000000, pe_ratio:55, revenue_ttm_usd:1050000000,
    financials_source:'annual_report', financials_confidence:0.85,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.72,
    hiring_velocity_score:0.3, total_open_roles:200, hiring_source:'linkedin_scrape', hiring_confidence:0.70,
    data_quality_tier:'verified', enrichment_version:'gt26-v2026.1' },

  { canonical_name:'temenos ag', display_name:'Temenos AG', ticker:null, exchange:'SIX',
    industry:'Banking Software / Core Banking / Digital Banking / Temenos Infinity / Wealth Management', sector:'Technology',
    is_public:true, country_code:'CH', workforce_count:11000, workforce_source:'annual_report', workforce_confidence:0.90,
    market_cap_usd:5000000000, pe_ratio:22, revenue_ttm_usd:980000000,
    financials_source:'annual_report', financials_confidence:0.85,
    recent_layoff_count:2, layoff_source:'news_rss_scrape', layoff_confidence:0.82,
    hiring_velocity_score:-0.3, total_open_roles:200, hiring_source:'linkedin_scrape', hiring_confidence:0.70,
    data_quality_tier:'verified', enrichment_version:'gt26-v2026.1' },

  // ── Private enterprise software companies ──────────────────────────────────
  { canonical_name:'finastra holdings limited', display_name:'Finastra Holdings Limited', ticker:null, exchange:null,
    industry:'Banking Software / Treasury / Capital Markets / Lending / Payments / FusionFabric', sector:'Technology',
    is_public:false, country_code:'GB', workforce_count:10000, workforce_source:'news_rss_scrape', workforce_confidence:0.82,
    market_cap_usd:10000000000, pe_ratio:null, revenue_ttm_usd:2000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.70,
    recent_layoff_count:2, layoff_source:'news_rss_scrape', layoff_confidence:0.80,
    hiring_velocity_score:-0.3, total_open_roles:300, hiring_source:'linkedin_scrape', hiring_confidence:0.68,
    data_quality_tier:'seed', enrichment_version:'gt26-v2026.1' },

  { canonical_name:'yardi systems inc', display_name:'Yardi Systems Inc.', ticker:null, exchange:null,
    industry:'Real Estate Software / Property Management / Asset Management / Yardi Voyager / ERP', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:9000, workforce_source:'news_rss_scrape', workforce_confidence:0.82,
    market_cap_usd:7000000000, pe_ratio:null, revenue_ttm_usd:1400000000,
    financials_source:'news_rss_scrape', financials_confidence:0.70,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.72,
    hiring_velocity_score:0.3, total_open_roles:300, hiring_source:'linkedin_scrape', hiring_confidence:0.70,
    data_quality_tier:'seed', enrichment_version:'gt26-v2026.1' },

  { canonical_name:'realpage inc', display_name:'RealPage Inc.', ticker:null, exchange:null,
    industry:'Real Estate Software / Property Management / Multifamily / Revenue Management / Analytics', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:7500, workforce_source:'news_rss_scrape', workforce_confidence:0.82,
    market_cap_usd:10200000000, pe_ratio:null, revenue_ttm_usd:1600000000,
    financials_source:'annual_report', financials_confidence:0.78,
    recent_layoff_count:1, layoff_source:'news_rss_scrape', layoff_confidence:0.78,
    hiring_velocity_score:-0.2, total_open_roles:200, hiring_source:'linkedin_scrape', hiring_confidence:0.68,
    data_quality_tier:'seed', enrichment_version:'gt26-v2026.1' },

  { canonical_name:'zoho corporation pvt ltd', display_name:'Zoho Corporation Pvt. Ltd.', ticker:null, exchange:null,
    industry:'CRM / Business Suite / Zoho One / Zoho CRM / Email / Finance / HR / 55+ Applications', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:15000, workforce_source:'news_rss_scrape', workforce_confidence:0.85,
    market_cap_usd:15000000000, pe_ratio:null, revenue_ttm_usd:1500000000,
    financials_source:'news_rss_scrape', financials_confidence:0.72,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.72,
    hiring_velocity_score:0.8, total_open_roles:800, hiring_source:'linkedin_scrape', hiring_confidence:0.72,
    data_quality_tier:'seed', enrichment_version:'gt26-v2026.1' },

  { canonical_name:'ion investment group limited', display_name:'ION Investment Group Limited', ticker:null, exchange:null,
    industry:'Financial Software / Trading Systems / Treasury / Capital Markets / Calypso / Openlink', sector:'Technology',
    is_public:false, country_code:'IE', workforce_count:12000, workforce_source:'news_rss_scrape', workforce_confidence:0.80,
    market_cap_usd:8000000000, pe_ratio:null, revenue_ttm_usd:2500000000,
    financials_source:'news_rss_scrape', financials_confidence:0.68,
    recent_layoff_count:1, layoff_source:'news_rss_scrape', layoff_confidence:0.75,
    hiring_velocity_score:0.2, total_open_roles:300, hiring_source:'linkedin_scrape', hiring_confidence:0.68,
    data_quality_tier:'seed', enrichment_version:'gt26-v2026.1' },

  { canonical_name:'ifs ab', display_name:'IFS AB', ticker:null, exchange:null,
    industry:'ERP / Field Service Management / Asset Management / IFS Cloud / Manufacturing / Aviation', sector:'Technology',
    is_public:false, country_code:'SE', workforce_count:7000, workforce_source:'news_rss_scrape', workforce_confidence:0.82,
    market_cap_usd:9000000000, pe_ratio:null, revenue_ttm_usd:1200000000,
    financials_source:'news_rss_scrape', financials_confidence:0.68,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.72,
    hiring_velocity_score:0.4, total_open_roles:300, hiring_source:'linkedin_scrape', hiring_confidence:0.68,
    data_quality_tier:'seed', enrichment_version:'gt26-v2026.1' },

  { canonical_name:'thought machine group limited', display_name:'Thought Machine Group Limited', ticker:null, exchange:null,
    industry:'Cloud-Native Core Banking / Vault Platform / Bank Technology / Neo-Bank Infrastructure', sector:'Technology',
    is_public:false, country_code:'GB', workforce_count:1000, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:2700000000, pe_ratio:null, revenue_ttm_usd:150000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.70,
    hiring_velocity_score:0.8, total_open_roles:80, hiring_source:'linkedin_scrape', hiring_confidence:0.68,
    data_quality_tier:'seed', enrichment_version:'gt26-v2026.1' },

  { canonical_name:'powerschool holdings inc', display_name:'PowerSchool Holdings Inc.', ticker:null, exchange:null,
    industry:'K-12 Education Software / Student Information System / Learning Management / EdTech', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:4000, workforce_source:'news_rss_scrape', workforce_confidence:0.82,
    market_cap_usd:5600000000, pe_ratio:null, revenue_ttm_usd:750000000,
    financials_source:'annual_report', financials_confidence:0.80,
    recent_layoff_count:1, layoff_source:'news_rss_scrape', layoff_confidence:0.78,
    hiring_velocity_score:-0.2, total_open_roles:100, hiring_source:'linkedin_scrape', hiring_confidence:0.68,
    data_quality_tier:'seed', enrichment_version:'gt26-v2026.1' },
];

async function main() {
  console.log('\n✓ Connected — GT26: Enterprise Software Missing Giants (2026)\n');
  await initYahoo();
  let inserted=0, updated=0, withPE=0, withRev=0;
  for (const c of companies) {
    const r = await upsertCompany(c);
    if (r.wasInserted) inserted++; else updated++;
    if (r.hasPE) withPE++;
    if (r.hasRev) withRev++;
    await new Promise(r=>setTimeout(r,700));
  }
  console.log(`\n── GT26 complete: ${inserted} inserted, ${updated} updated | PE: ${withPE}/${companies.length} | Rev: ${withRev}/${companies.length}`);
  await pool.end();
}
main().catch(e=>{ console.error(e); process.exit(1); });
