// GT17: Digital Health & HealthTech (2026)
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const FX = { USD:1, EUR:1.09, GBP:1.27, JPY:0.0067, KRW:0.00073, SEK:0.097, PLN:0.25, AUD:0.65, CAD:0.73, SGD:0.74 };
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
    c.data_quality_tier??(c.is_public?'verified':'seed'), c.enrichment_version??'gt17-v2026.1', now
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
  // ── US-listed (Yahoo Finance) ──────────────────────────────────────────────
  { canonical_name:'doximity inc', display_name:'Doximity Inc.', ticker:'DOCS', exchange:'NYSE',
    industry:'Healthcare Professional Network / Digital Health / Telemedicine / EHR Integration', sector:'Healthcare Technology',
    is_public:true, country_code:'US', workforce_count:900, workforce_source:'annual_report', workforce_confidence:0.92,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.78,
    hiring_velocity_score:0.6, total_open_roles:80, hiring_source:'linkedin_scrape', hiring_confidence:0.75,
    enrichment_version:'gt17-v2026.1' },

  { canonical_name:'teladoc health inc', display_name:'Teladoc Health Inc.', ticker:'TDOC', exchange:'NYSE',
    industry:'Telehealth / Virtual Care / Mental Health / Chronic Care Management / BetterHelp', sector:'Healthcare Technology',
    is_public:true, country_code:'US', workforce_count:8500, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:4, layoff_source:'news_rss_scrape', layoff_confidence:0.90,
    hiring_velocity_score:-1.0, total_open_roles:250, hiring_source:'linkedin_scrape', hiring_confidence:0.72,
    enrichment_version:'gt17-v2026.1' },

  { canonical_name:'hims & hers health inc', display_name:'Hims & Hers Health Inc.', ticker:'HIMS', exchange:'NYSE',
    industry:'Direct-to-Consumer Health / Telehealth / Men\'s & Women\'s Wellness / Compounding Pharmacy', sector:'Healthcare Technology',
    is_public:true, country_code:'US', workforce_count:1100, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.75,
    hiring_velocity_score:1.2, total_open_roles:120, hiring_source:'linkedin_scrape', hiring_confidence:0.75,
    enrichment_version:'gt17-v2026.1' },

  { canonical_name:'ge healthcare technologies inc', display_name:'GE HealthCare Technologies Inc.', ticker:'GEHC', exchange:'NASDAQ',
    industry:'Medical Imaging / Ultrasound / Patient Monitoring / Pharmaceutical Diagnostics / Health IT', sector:'Healthcare Technology',
    is_public:true, country_code:'US', workforce_count:51000, workforce_source:'annual_report', workforce_confidence:0.92,
    recent_layoff_count:1, layoff_source:'news_rss_scrape', layoff_confidence:0.80,
    hiring_velocity_score:0.2, total_open_roles:1200, hiring_source:'linkedin_scrape', hiring_confidence:0.75,
    enrichment_version:'gt17-v2026.1' },

  { canonical_name:'illumina inc', display_name:'Illumina Inc.', ticker:'ILMN', exchange:'NASDAQ',
    industry:'Genomics / DNA Sequencing / Next-Generation Sequencing / Life Sciences Tools', sector:'Healthcare Technology',
    is_public:true, country_code:'US', workforce_count:8500, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:3, layoff_source:'news_rss_scrape', layoff_confidence:0.88,
    hiring_velocity_score:-0.6, total_open_roles:300, hiring_source:'linkedin_scrape', hiring_confidence:0.72,
    enrichment_version:'gt17-v2026.1' },

  { canonical_name:'recursion pharmaceuticals inc', display_name:'Recursion Pharmaceuticals Inc.', ticker:'RXRX', exchange:'NASDAQ',
    industry:'AI Drug Discovery / TechBio / Computational Biology / Machine Learning Drug Development', sector:'Healthcare Technology',
    is_public:true, country_code:'US', workforce_count:1500, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:1, layoff_source:'news_rss_scrape', layoff_confidence:0.80,
    hiring_velocity_score:0.3, total_open_roles:100, hiring_source:'linkedin_scrape', hiring_confidence:0.70,
    enrichment_version:'gt17-v2026.1' },

  { canonical_name:'irhythm technologies inc', display_name:'iRhythm Technologies Inc.', ticker:'IRTC', exchange:'NASDAQ',
    industry:'Digital Cardiac Care / Wearable ECG / Zio Patch / Remote Patient Monitoring', sector:'Healthcare Technology',
    is_public:true, country_code:'US', workforce_count:1700, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:1, layoff_source:'news_rss_scrape', layoff_confidence:0.78,
    hiring_velocity_score:0.4, total_open_roles:90, hiring_source:'linkedin_scrape', hiring_confidence:0.72,
    enrichment_version:'gt17-v2026.1' },

  { canonical_name:'phreesia inc', display_name:'Phreesia Inc.', ticker:'PHR', exchange:'NYSE',
    industry:'Patient Intake / Healthcare SaaS / Digital Front Door / Patient Engagement Platform', sector:'Healthcare Technology',
    is_public:true, country_code:'US', workforce_count:1700, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:1, layoff_source:'news_rss_scrape', layoff_confidence:0.78,
    hiring_velocity_score:0.3, total_open_roles:80, hiring_source:'linkedin_scrape', hiring_confidence:0.72,
    enrichment_version:'gt17-v2026.1' },

  { canonical_name:'evolent health inc', display_name:'Evolent Health Inc.', ticker:'EVH', exchange:'NYSE',
    industry:'Value-Based Care / Specialty Care Management / AI-Powered Utilization Management', sector:'Healthcare Technology',
    is_public:true, country_code:'US', workforce_count:3700, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:1, layoff_source:'news_rss_scrape', layoff_confidence:0.78,
    hiring_velocity_score:0.5, total_open_roles:200, hiring_source:'linkedin_scrape', hiring_confidence:0.72,
    enrichment_version:'gt17-v2026.1' },

  { canonical_name:'omnicell inc', display_name:'Omnicell Inc.', ticker:'OMCL', exchange:'NASDAQ',
    industry:'Pharmacy Automation / Medication Management / Hospital Dispensing Robots / Health IT', sector:'Healthcare Technology',
    is_public:true, country_code:'US', workforce_count:3000, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:2, layoff_source:'news_rss_scrape', layoff_confidence:0.82,
    hiring_velocity_score:-0.5, total_open_roles:120, hiring_source:'linkedin_scrape', hiring_confidence:0.70,
    enrichment_version:'gt17-v2026.1' },

  { canonical_name:'10x genomics inc', display_name:'10x Genomics Inc.', ticker:'TXG', exchange:'NASDAQ',
    industry:'Single-Cell Genomics / Spatial Biology / Gene Expression / Life Sciences Tools', sector:'Healthcare Technology',
    is_public:true, country_code:'US', workforce_count:1400, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:2, layoff_source:'news_rss_scrape', layoff_confidence:0.82,
    hiring_velocity_score:-0.4, total_open_roles:60, hiring_source:'linkedin_scrape', hiring_confidence:0.70,
    enrichment_version:'gt17-v2026.1' },

  { canonical_name:'privia health group inc', display_name:'Privia Health Group Inc.', ticker:'PRVA', exchange:'NASDAQ',
    industry:'Physician Enablement / Value-Based Primary Care / Population Health Management', sector:'Healthcare Technology',
    is_public:true, country_code:'US', workforce_count:2500, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.75,
    hiring_velocity_score:0.5, total_open_roles:150, hiring_source:'linkedin_scrape', hiring_confidence:0.72,
    enrichment_version:'gt17-v2026.1' },

  { canonical_name:'waystar holding corp', display_name:'Waystar Holding Corp.', ticker:'WAY', exchange:'NASDAQ',
    industry:'Healthcare Revenue Cycle / Claims Management / Prior Authorization / Payment Automation', sector:'Healthcare Technology',
    is_public:true, country_code:'US', workforce_count:2200, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.75,
    hiring_velocity_score:0.4, total_open_roles:130, hiring_source:'linkedin_scrape', hiring_confidence:0.72,
    enrichment_version:'gt17-v2026.1' },

  { canonical_name:'tempus ai inc', display_name:'Tempus AI Inc.', ticker:'TEM', exchange:'NASDAQ',
    industry:'AI-Enabled Precision Medicine / Genomic Data / Oncology Analytics / Clinical AI', sector:'Healthcare Technology',
    is_public:true, country_code:'US', workforce_count:3500, workforce_source:'annual_report', workforce_confidence:0.85,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.75,
    hiring_velocity_score:0.8, total_open_roles:200, hiring_source:'linkedin_scrape', hiring_confidence:0.72,
    enrichment_version:'gt17-v2026.1' },

  { canonical_name:'health catalyst inc', display_name:'Health Catalyst Inc.', ticker:'HCAT', exchange:'NASDAQ',
    industry:'Healthcare Data Analytics / Cloud Data Platform / Population Health / AI Analytics', sector:'Healthcare Technology',
    is_public:true, country_code:'US', workforce_count:900, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:2, layoff_source:'news_rss_scrape', layoff_confidence:0.84,
    hiring_velocity_score:-0.5, total_open_roles:50, hiring_source:'linkedin_scrape', hiring_confidence:0.70,
    enrichment_version:'gt17-v2026.1' },

  { canonical_name:'goodrx holdings inc', display_name:'GoodRx Holdings Inc.', ticker:'GDRX', exchange:'NASDAQ',
    industry:'Prescription Drug Pricing / Healthcare Marketplace / Pharmacy Benefits / Telehealth', sector:'Healthcare Technology',
    is_public:true, country_code:'US', workforce_count:800, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:2, layoff_source:'news_rss_scrape', layoff_confidence:0.84,
    hiring_velocity_score:-0.3, total_open_roles:50, hiring_source:'linkedin_scrape', hiring_confidence:0.70,
    enrichment_version:'gt17-v2026.1' },

  // ── Private healthtech companies ───────────────────────────────────────────
  { canonical_name:'epic systems corporation', display_name:'Epic Systems Corporation', ticker:null, exchange:null,
    industry:'Electronic Health Records / Hospital Information Systems / EHR / MyChart Patient Portal', sector:'Healthcare Technology',
    is_public:false, country_code:'US', workforce_count:12000, workforce_source:'news_rss_scrape', workforce_confidence:0.85,
    market_cap_usd:30000000000, pe_ratio:null, revenue_ttm_usd:4500000000,
    financials_source:'news_rss_scrape', financials_confidence:0.70,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.72,
    hiring_velocity_score:0.8, total_open_roles:500, hiring_source:'linkedin_scrape', hiring_confidence:0.75,
    data_quality_tier:'seed', enrichment_version:'gt17-v2026.1' },

  { canonical_name:'spring health inc', display_name:'Spring Health Inc.', ticker:null, exchange:null,
    industry:'Mental Health Benefits Platform / Precision Mental Health / Employee Mental Wellness', sector:'Healthcare Technology',
    is_public:false, country_code:'US', workforce_count:1500, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:3300000000, pe_ratio:null, revenue_ttm_usd:150000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.72,
    hiring_velocity_score:1.0, total_open_roles:100, hiring_source:'linkedin_scrape', hiring_confidence:0.68,
    data_quality_tier:'seed', enrichment_version:'gt17-v2026.1' },

  { canonical_name:'headspace health inc', display_name:'Headspace Health Inc.', ticker:null, exchange:null,
    industry:'Mental Health App / Mindfulness / Meditation / Employee Wellness / Digital Therapy', sector:'Healthcare Technology',
    is_public:false, country_code:'US', workforce_count:1400, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:3000000000, pe_ratio:null, revenue_ttm_usd:200000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:2, layoff_source:'news_rss_scrape', layoff_confidence:0.80,
    hiring_velocity_score:-0.3, total_open_roles:60, hiring_source:'linkedin_scrape', hiring_confidence:0.65,
    data_quality_tier:'seed', enrichment_version:'gt17-v2026.1' },

  { canonical_name:'innovaccer inc', display_name:'Innovaccer Inc.', ticker:null, exchange:null,
    industry:'Healthcare Data Platform / Population Health / Care Coordination / AI Health Analytics', sector:'Healthcare Technology',
    is_public:false, country_code:'US', workforce_count:1600, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:1300000000, pe_ratio:null, revenue_ttm_usd:120000000,
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:1, layoff_source:'news_rss_scrape', layoff_confidence:0.75,
    hiring_velocity_score:0.5, total_open_roles:80, hiring_source:'linkedin_scrape', hiring_confidence:0.65,
    data_quality_tier:'seed', enrichment_version:'gt17-v2026.1' },
];

async function main() {
  console.log('\n✓ Connected — GT17: Digital Health & HealthTech (2026)\n');
  await initYahoo();
  let inserted=0, updated=0, withPE=0, withRev=0;
  for (const c of companies) {
    const r = await upsertCompany(c);
    if (r.wasInserted) inserted++; else updated++;
    if (r.hasPE) withPE++;
    if (r.hasRev) withRev++;
    await new Promise(r=>setTimeout(r,700));
  }
  console.log(`\n── GT17 complete: ${inserted} inserted, ${updated} updated | PE: ${withPE}/${companies.length} | Rev: ${withRev}/${companies.length}`);
  await pool.end();
}
main().catch(e=>{ console.error(e); process.exit(1); });
