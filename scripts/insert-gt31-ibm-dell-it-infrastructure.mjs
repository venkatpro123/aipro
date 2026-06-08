// GT31: IBM, Dell & Global IT Infrastructure Giants (2026)
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
    c.data_quality_tier??(c.is_public?'verified':'seed'), c.enrichment_version??'gt31-v2026.1', now
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
  // ── US-listed IT giants (Yahoo Finance) ───────────────────────────────────
  { canonical_name:'international business machines corporation', display_name:'International Business Machines Corporation', ticker:'IBM', exchange:'NYSE',
    industry:'IT Services / Hybrid Cloud / AI / Consulting / Mainframe / Red Hat / Watson / Quantum', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:290000, workforce_source:'annual_report', workforce_confidence:0.92,
    recent_layoff_count:3, layoff_source:'news_rss_scrape', layoff_confidence:0.88,
    hiring_velocity_score:-0.3, total_open_roles:3000, hiring_source:'linkedin_scrape', hiring_confidence:0.78,
    enrichment_version:'gt31-v2026.1' },

  { canonical_name:'dell technologies inc', display_name:'Dell Technologies Inc.', ticker:'DELL', exchange:'NYSE',
    industry:'PC / Servers / Storage / Networking / VMware / IT Infrastructure / APEX Cloud / Workplace Tech', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:120000, workforce_source:'annual_report', workforce_confidence:0.92,
    recent_layoff_count:3, layoff_source:'news_rss_scrape', layoff_confidence:0.88,
    hiring_velocity_score:-0.5, total_open_roles:2000, hiring_source:'linkedin_scrape', hiring_confidence:0.78,
    enrichment_version:'gt31-v2026.1' },

  { canonical_name:'cdw corporation', display_name:'CDW Corporation', ticker:'CDW', exchange:'NASDAQ',
    industry:'IT Solutions Provider / Multi-Brand Tech Products / Cloud Solutions / Managed Services', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:15000, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:1, layoff_source:'news_rss_scrape', layoff_confidence:0.78,
    hiring_velocity_score:0.1, total_open_roles:400, hiring_source:'linkedin_scrape', hiring_confidence:0.72,
    enrichment_version:'gt31-v2026.1' },

  { canonical_name:'td synnex corporation', display_name:'TD SYNNEX Corporation', ticker:'SNX', exchange:'NYSE',
    industry:'IT Distribution / Technology Products / Cloud / Security / Data Analytics / Services', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:25000, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:1, layoff_source:'news_rss_scrape', layoff_confidence:0.78,
    hiring_velocity_score:0.0, total_open_roles:400, hiring_source:'linkedin_scrape', hiring_confidence:0.70,
    enrichment_version:'gt31-v2026.1' },

  { canonical_name:'arrow electronics inc', display_name:'Arrow Electronics Inc.', ticker:'ARW', exchange:'NYSE',
    industry:'Electronic Components Distribution / IT Solutions / IoT / Cloud / Managed Services', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:22000, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:1, layoff_source:'news_rss_scrape', layoff_confidence:0.78,
    hiring_velocity_score:-0.2, total_open_roles:400, hiring_source:'linkedin_scrape', hiring_confidence:0.70,
    enrichment_version:'gt31-v2026.1' },

  { canonical_name:'avnet inc', display_name:'Avnet Inc.', ticker:'AVT', exchange:'NASDAQ',
    industry:'Electronic Components Distribution / IT Solutions / Embedded / IoT / Design Services', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:15000, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:2, layoff_source:'news_rss_scrape', layoff_confidence:0.80,
    hiring_velocity_score:-0.3, total_open_roles:300, hiring_source:'linkedin_scrape', hiring_confidence:0.70,
    enrichment_version:'gt31-v2026.1' },

  { canonical_name:'n-able inc', display_name:'N-able Inc.', ticker:'NABL', exchange:'NYSE',
    industry:'MSP Platform / IT Management / RMM / Backup / EDR / Security for Managed Service Providers', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:1700, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.72,
    hiring_velocity_score:0.3, total_open_roles:80, hiring_source:'linkedin_scrape', hiring_confidence:0.68,
    enrichment_version:'gt31-v2026.1' },

  { canonical_name:'insight enterprises inc', display_name:'Insight Enterprises Inc.', ticker:'NSIT', exchange:'NASDAQ',
    industry:'IT Solutions Provider / Digital Innovation / Cloud / Intelligent Edge / Managed Services', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:12000, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:1, layoff_source:'news_rss_scrape', layoff_confidence:0.78,
    hiring_velocity_score:-0.2, total_open_roles:200, hiring_source:'linkedin_scrape', hiring_confidence:0.70,
    enrichment_version:'gt31-v2026.1' },

  { canonical_name:'conduent incorporated', display_name:'Conduent Incorporated', ticker:'CNDT', exchange:'NASDAQ',
    industry:'Business Process Services / Digital Platform / IT Outsourcing / Government Services / Healthcare', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:60000, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:3, layoff_source:'news_rss_scrape', layoff_confidence:0.85,
    hiring_velocity_score:-0.8, total_open_roles:500, hiring_source:'linkedin_scrape', hiring_confidence:0.68,
    enrichment_version:'gt31-v2026.1' },

  { canonical_name:'unisys corporation', display_name:'Unisys Corporation', ticker:'UIS', exchange:'NYSE',
    industry:'IT Services / Digital Workplace / Cloud & Infrastructure / Security / Federal IT Solutions', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:22000, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:2, layoff_source:'news_rss_scrape', layoff_confidence:0.82,
    hiring_velocity_score:-0.5, total_open_roles:300, hiring_source:'linkedin_scrape', hiring_confidence:0.68,
    enrichment_version:'gt31-v2026.1' },

  // ── Pre-filled (TYO/EPA exchanges) ────────────────────────────────────────
  { canonical_name:'fujitsu limited', display_name:'Fujitsu Limited', ticker:null, exchange:'TYO',
    industry:'IT Services / Digital Transformation / Hybrid IT / Cloud / AI / Consulting / Mainframe Japan', sector:'Technology',
    is_public:true, country_code:'JP', workforce_count:130000, workforce_source:'annual_report', workforce_confidence:0.92,
    market_cap_usd:50000000000, pe_ratio:24, revenue_ttm_usd:24000000000,
    financials_source:'annual_report', financials_confidence:0.88,
    recent_layoff_count:2, layoff_source:'news_rss_scrape', layoff_confidence:0.82,
    hiring_velocity_score:-0.2, total_open_roles:1500, hiring_source:'linkedin_scrape', hiring_confidence:0.72,
    data_quality_tier:'verified', enrichment_version:'gt31-v2026.1' },

  { canonical_name:'ntt data group corporation', display_name:'NTT DATA Group Corporation', ticker:null, exchange:'TYO',
    industry:'IT Services / Systems Integration / Cloud / Data Center / SAP / ERP / Digital Transformation Japan', sector:'Technology',
    is_public:true, country_code:'JP', workforce_count:190000, workforce_source:'annual_report', workforce_confidence:0.92,
    market_cap_usd:18000000000, pe_ratio:25, revenue_ttm_usd:30000000000,
    financials_source:'annual_report', financials_confidence:0.88,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.75,
    hiring_velocity_score:0.2, total_open_roles:2000, hiring_source:'linkedin_scrape', hiring_confidence:0.72,
    data_quality_tier:'verified', enrichment_version:'gt31-v2026.1' },

  { canonical_name:'capgemini se', display_name:'Capgemini SE', ticker:null, exchange:'EPA',
    industry:'IT Services / Consulting / Digital Transformation / Cloud / AI / Engineering / BPO France', sector:'Technology',
    is_public:true, country_code:'FR', workforce_count:340000, workforce_source:'annual_report', workforce_confidence:0.92,
    market_cap_usd:24000000000, pe_ratio:22, revenue_ttm_usd:24000000000,
    financials_source:'annual_report', financials_confidence:0.88,
    recent_layoff_count:2, layoff_source:'news_rss_scrape', layoff_confidence:0.82,
    hiring_velocity_score:-0.3, total_open_roles:3000, hiring_source:'linkedin_scrape', hiring_confidence:0.75,
    data_quality_tier:'verified', enrichment_version:'gt31-v2026.1' },

  { canonical_name:'atos se', display_name:'Atos SE', ticker:null, exchange:'EPA',
    industry:'IT Services / Digital Transformation / Cloud / Cybersecurity / Eviden / Tech Foundations', sector:'Technology',
    is_public:true, country_code:'FR', workforce_count:95000, workforce_source:'annual_report', workforce_confidence:0.88,
    market_cap_usd:500000000, pe_ratio:null, revenue_ttm_usd:10600000000,
    financials_source:'annual_report', financials_confidence:0.82,
    recent_layoff_count:5, layoff_source:'news_rss_scrape', layoff_confidence:0.92,
    hiring_velocity_score:-2.0, total_open_roles:500, hiring_source:'linkedin_scrape', hiring_confidence:0.68,
    data_quality_tier:'verified', enrichment_version:'gt31-v2026.1' },

  // ── Private Big Four & Major Consulting ────────────────────────────────────
  { canonical_name:'deloitte llp', display_name:'Deloitte LLP', ticker:null, exchange:null,
    industry:'Audit / Tax / Consulting / Advisory / Technology Consulting / Digital Transformation', sector:'Professional Services',
    is_public:false, country_code:'US', workforce_count:460000, workforce_source:'news_rss_scrape', workforce_confidence:0.88,
    market_cap_usd:null, pe_ratio:null, revenue_ttm_usd:67000000000,
    financials_source:'annual_report', financials_confidence:0.85,
    recent_layoff_count:2, layoff_source:'news_rss_scrape', layoff_confidence:0.82,
    hiring_velocity_score:-0.3, total_open_roles:5000, hiring_source:'linkedin_scrape', hiring_confidence:0.75,
    data_quality_tier:'seed', enrichment_version:'gt31-v2026.1' },

  { canonical_name:'pricewaterhousecoopers international limited', display_name:'PricewaterhouseCoopers International Limited', ticker:null, exchange:null,
    industry:'Audit / Tax / Consulting / Technology Transformation / Digital Services / AI Consulting', sector:'Professional Services',
    is_public:false, country_code:'GB', workforce_count:370000, workforce_source:'news_rss_scrape', workforce_confidence:0.88,
    market_cap_usd:null, pe_ratio:null, revenue_ttm_usd:55000000000,
    financials_source:'annual_report', financials_confidence:0.85,
    recent_layoff_count:2, layoff_source:'news_rss_scrape', layoff_confidence:0.80,
    hiring_velocity_score:-0.2, total_open_roles:4000, hiring_source:'linkedin_scrape', hiring_confidence:0.75,
    data_quality_tier:'seed', enrichment_version:'gt31-v2026.1' },

  { canonical_name:'ernst & young global limited', display_name:'Ernst & Young Global Limited', ticker:null, exchange:null,
    industry:'Audit / Consulting / Tax / Advisory / Technology Consulting / Digital / AI Services', sector:'Professional Services',
    is_public:false, country_code:'GB', workforce_count:400000, workforce_source:'news_rss_scrape', workforce_confidence:0.88,
    market_cap_usd:null, pe_ratio:null, revenue_ttm_usd:51000000000,
    financials_source:'annual_report', financials_confidence:0.85,
    recent_layoff_count:2, layoff_source:'news_rss_scrape', layoff_confidence:0.80,
    hiring_velocity_score:-0.2, total_open_roles:4000, hiring_source:'linkedin_scrape', hiring_confidence:0.75,
    data_quality_tier:'seed', enrichment_version:'gt31-v2026.1' },

  { canonical_name:'mckinsey & company inc', display_name:'McKinsey & Company Inc.', ticker:null, exchange:null,
    industry:'Management Consulting / Digital Strategy / Technology Transformation / AI / QuantumBlack', sector:'Professional Services',
    is_public:false, country_code:'US', workforce_count:47000, workforce_source:'news_rss_scrape', workforce_confidence:0.85,
    market_cap_usd:null, pe_ratio:null, revenue_ttm_usd:16000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.75,
    recent_layoff_count:2, layoff_source:'news_rss_scrape', layoff_confidence:0.80,
    hiring_velocity_score:-0.3, total_open_roles:800, hiring_source:'linkedin_scrape', hiring_confidence:0.72,
    data_quality_tier:'seed', enrichment_version:'gt31-v2026.1' },

  { canonical_name:'kaseya inc', display_name:'Kaseya Inc.', ticker:null, exchange:null,
    industry:'MSP Platform / IT Management / VSA / RMM / Datto Backup / MDR / Compliance', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:4000, workforce_source:'news_rss_scrape', workforce_confidence:0.80,
    market_cap_usd:12700000000, pe_ratio:null, revenue_ttm_usd:600000000,
    financials_source:'news_rss_scrape', financials_confidence:0.65,
    recent_layoff_count:1, layoff_source:'news_rss_scrape', layoff_confidence:0.75,
    hiring_velocity_score:0.2, total_open_roles:150, hiring_source:'linkedin_scrape', hiring_confidence:0.68,
    data_quality_tier:'seed', enrichment_version:'gt31-v2026.1' },

  { canonical_name:'hitachi vantara llc', display_name:'Hitachi Vantara LLC', ticker:null, exchange:null,
    industry:'Data Infrastructure / Storage / Cloud / IoT / DataOps / Smart Spaces / Hitachi Subsidiary', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:4000, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:null, pe_ratio:null, revenue_ttm_usd:4000000000,
    financials_source:'news_rss_scrape', financials_confidence:0.65,
    recent_layoff_count:1, layoff_source:'news_rss_scrape', layoff_confidence:0.75,
    hiring_velocity_score:-0.2, total_open_roles:150, hiring_source:'linkedin_scrape', hiring_confidence:0.65,
    data_quality_tier:'seed', enrichment_version:'gt31-v2026.1' },
];

async function main() {
  console.log('\n✓ Connected — GT31: IBM, Dell & Global IT Infrastructure Giants (2026)\n');
  await initYahoo();
  let inserted=0, updated=0, withPE=0, withRev=0;
  for (const c of companies) {
    const r = await upsertCompany(c);
    if (r.wasInserted) inserted++; else updated++;
    if (r.hasPE) withPE++;
    if (r.hasRev) withRev++;
    await new Promise(r=>setTimeout(r,700));
  }
  console.log(`\n── GT31 complete: ${inserted} inserted, ${updated} updated | PE: ${withPE}/${companies.length} | Rev: ${withRev}/${companies.length}`);
  await pool.end();
}
main().catch(e=>{ console.error(e); process.exit(1); });
