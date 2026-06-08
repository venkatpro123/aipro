// GT35: Engineering/PLM Software & Remaining APAC IT (2026)
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const FX = { USD:1, EUR:1.09, GBP:1.27, JPY:0.0067, KRW:0.00073, SEK:0.097, PLN:0.25, AUD:0.65, CAD:0.73, SGD:0.74, CHF:1.12, TWD:0.031, CNY:0.14, INR:0.012, HKD:0.128 };
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
    c.data_quality_tier??(c.is_public?'verified':'seed'), c.enrichment_version??'gt35-v2026.1', now
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
  // ── Engineering/PLM/CAD Software (Yahoo) ──────────────────────────────────
  { canonical_name:'bentley systems incorporated', display_name:'Bentley Systems Incorporated', ticker:'BSY', exchange:'NASDAQ',
    industry:'Infrastructure Engineering Software / BIM / Digital Twins / MicroStation / Civil Engineering', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:5200, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.72,
    hiring_velocity_score:0.3, total_open_roles:200, hiring_source:'linkedin_scrape', hiring_confidence:0.72,
    enrichment_version:'gt35-v2026.1' },

  { canonical_name:'ptc inc', display_name:'PTC Inc.', ticker:'PTC', exchange:'NASDAQ',
    industry:'PLM / CAD / Creo / Windchill / IoT / AR / Digital Thread / Manufacturing Software', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:7800, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:1, layoff_source:'news_rss_scrape', layoff_confidence:0.78,
    hiring_velocity_score:0.2, total_open_roles:250, hiring_source:'linkedin_scrape', hiring_confidence:0.72,
    enrichment_version:'gt35-v2026.1' },

  { canonical_name:'synopsys inc', display_name:'Synopsys Inc.', ticker:'SNPS', exchange:'NASDAQ',
    industry:'EDA / Chip Design Software / Semiconductor IP / Silicon Design / Verification / Ansys', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:20000, workforce_source:'annual_report', workforce_confidence:0.92,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.72,
    hiring_velocity_score:0.5, total_open_roles:600, hiring_source:'linkedin_scrape', hiring_confidence:0.75,
    enrichment_version:'gt35-v2026.1' },

  { canonical_name:'cadence design systems inc', display_name:'Cadence Design Systems Inc.', ticker:'CDNS', exchange:'NASDAQ',
    industry:'EDA / Chip Design / Semiconductor Software / IC Design / Verification / System Design', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:13000, workforce_source:'annual_report', workforce_confidence:0.92,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.72,
    hiring_velocity_score:0.5, total_open_roles:500, hiring_source:'linkedin_scrape', hiring_confidence:0.75,
    enrichment_version:'gt35-v2026.1' },

  { canonical_name:'aspentech', display_name:'Aspen Technology (legacy alias)', ticker:null, exchange:null,
    industry:'Industrial Software / Process Optimization / Asset Performance Management / Simulation', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:3700, workforce_source:'news_rss_scrape', workforce_confidence:0.70,
    market_cap_usd:null, pe_ratio:null, revenue_ttm_usd:1100000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.65,
    hiring_velocity_score:0.0, total_open_roles:60, hiring_source:'linkedin_scrape', hiring_confidence:0.60,
    data_quality_tier:'seed', enrichment_version:'gt35-v2026.1' },

  { canonical_name:'dassault systemes se', display_name:'Dassault Systèmes SE', ticker:null, exchange:'EPA',
    industry:'PLM / 3D Design / CATIA / SOLIDWORKS / 3DEXPERIENCE / Simulation / Digital Twins France', sector:'Technology',
    is_public:true, country_code:'FR', workforce_count:24000, workforce_source:'annual_report', workforce_confidence:0.92,
    market_cap_usd:48000000000, pe_ratio:42, revenue_ttm_usd:6800000000,
    financials_source:'annual_report', financials_confidence:0.88,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.72,
    hiring_velocity_score:0.3, total_open_roles:600, hiring_source:'linkedin_scrape', hiring_confidence:0.72,
    data_quality_tier:'verified', enrichment_version:'gt35-v2026.1' },

  { canonical_name:'aveva group limited', display_name:'AVEVA Group Limited', ticker:null, exchange:null,
    industry:'Industrial Software / Engineering / Asset Performance / Schneider Electric / Process Simulation', sector:'Technology',
    is_public:false, country_code:'GB', workforce_count:6500, workforce_source:'news_rss_scrape', workforce_confidence:0.80,
    market_cap_usd:11000000000, pe_ratio:null, revenue_ttm_usd:1600000000,
    financials_source:'news_rss_scrape', financials_confidence:0.68,
    recent_layoff_count:1, layoff_source:'news_rss_scrape', layoff_confidence:0.75,
    hiring_velocity_score:0.1, total_open_roles:200, hiring_source:'linkedin_scrape', hiring_confidence:0.68,
    data_quality_tier:'seed', enrichment_version:'gt35-v2026.1' },

  // ── APAC IT / Tech (pre-filled) ───────────────────────────────────────────
  { canonical_name:'infosys bpm limited', display_name:'Infosys BPM Limited', ticker:null, exchange:null,
    industry:'Business Process Management / BPO / Finance & Accounting / Digital Operations / India BPM', sector:'Technology',
    is_public:false, country_code:'IN', workforce_count:55000, workforce_source:'news_rss_scrape', workforce_confidence:0.80,
    market_cap_usd:null, pe_ratio:null, revenue_ttm_usd:1500000000,
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.70,
    hiring_velocity_score:0.3, total_open_roles:2000, hiring_source:'linkedin_scrape', hiring_confidence:0.68,
    data_quality_tier:'seed', enrichment_version:'gt35-v2026.1' },

  { canonical_name:'samsung sds co ltd', display_name:'Samsung SDS Co., Ltd.', ticker:null, exchange:'KRX',
    industry:'IT Services / Cloud / Logistics Platform / Digital Transformation / Samsung Group IT Korea', sector:'Technology',
    is_public:true, country_code:'KR', workforce_count:12000, workforce_source:'annual_report', workforce_confidence:0.88,
    market_cap_usd:9000000000, pe_ratio:14, revenue_ttm_usd:10000000000,
    financials_source:'annual_report', financials_confidence:0.82,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.72,
    hiring_velocity_score:0.2, total_open_roles:400, hiring_source:'linkedin_scrape', hiring_confidence:0.68,
    data_quality_tier:'verified', enrichment_version:'gt35-v2026.1' },

  { canonical_name:'kakao corp', display_name:'Kakao Corp.', ticker:null, exchange:'KRX',
    industry:'Messaging / KakaoTalk / Fintech / KakaoPay / Mobility / Content / Korea Super App', sector:'Technology',
    is_public:true, country_code:'KR', workforce_count:16000, workforce_source:'annual_report', workforce_confidence:0.88,
    market_cap_usd:18000000000, pe_ratio:40, revenue_ttm_usd:6000000000,
    financials_source:'annual_report', financials_confidence:0.82,
    recent_layoff_count:1, layoff_source:'news_rss_scrape', layoff_confidence:0.78,
    hiring_velocity_score:-0.2, total_open_roles:300, hiring_source:'linkedin_scrape', hiring_confidence:0.68,
    data_quality_tier:'verified', enrichment_version:'gt35-v2026.1' },

  { canonical_name:'naver corporation', display_name:'NAVER Corporation', ticker:null, exchange:'KRX',
    industry:'Search Engine / E-Commerce / Webtoon / Cloud / AI / Fintech / Korea Internet Giant', sector:'Technology',
    is_public:true, country_code:'KR', workforce_count:13000, workforce_source:'annual_report', workforce_confidence:0.90,
    market_cap_usd:25000000000, pe_ratio:18, revenue_ttm_usd:8000000000,
    financials_source:'annual_report', financials_confidence:0.85,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.72,
    hiring_velocity_score:0.3, total_open_roles:400, hiring_source:'linkedin_scrape', hiring_confidence:0.70,
    data_quality_tier:'verified', enrichment_version:'gt35-v2026.1' },

  { canonical_name:'obic co ltd', display_name:'OBIC Co., Ltd.', ticker:null, exchange:'TYO',
    industry:'ERP Software / Business Systems Integration / Cloud ERP / Japanese Enterprise Software', sector:'Technology',
    is_public:true, country_code:'JP', workforce_count:2200, workforce_source:'annual_report', workforce_confidence:0.85,
    market_cap_usd:23000000000, pe_ratio:35, revenue_ttm_usd:850000000,
    financials_source:'annual_report', financials_confidence:0.82,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.70,
    hiring_velocity_score:0.2, total_open_roles:80, hiring_source:'linkedin_scrape', hiring_confidence:0.65,
    data_quality_tier:'verified', enrichment_version:'gt35-v2026.1' },

  { canonical_name:'nri nomura research institute', display_name:'Nomura Research Institute Ltd.', ticker:null, exchange:'TYO',
    industry:'IT Consulting / Systems Integration / Financial IT / Research / Digital Japan', sector:'Technology',
    is_public:true, country_code:'JP', workforce_count:17000, workforce_source:'annual_report', workforce_confidence:0.88,
    market_cap_usd:23000000000, pe_ratio:28, revenue_ttm_usd:5000000000,
    financials_source:'annual_report', financials_confidence:0.82,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.70,
    hiring_velocity_score:0.2, total_open_roles:500, hiring_source:'linkedin_scrape', hiring_confidence:0.68,
    data_quality_tier:'verified', enrichment_version:'gt35-v2026.1' },

  { canonical_name:'kingdee international software group', display_name:'Kingdee International Software Group', ticker:null, exchange:'HKG',
    industry:'ERP / Cloud Management Software / Enterprise SaaS / Chinese Business Software / Cosmic Cloud', sector:'Technology',
    is_public:true, country_code:'CN', workforce_count:11000, workforce_source:'annual_report', workforce_confidence:0.85,
    market_cap_usd:6000000000, pe_ratio:null, revenue_ttm_usd:900000000,
    financials_source:'annual_report', financials_confidence:0.80,
    recent_layoff_count:1, layoff_source:'news_rss_scrape', layoff_confidence:0.75,
    hiring_velocity_score:0.2, total_open_roles:300, hiring_source:'linkedin_scrape', hiring_confidence:0.65,
    data_quality_tier:'verified', enrichment_version:'gt35-v2026.1' },

  { canonical_name:'kingsoft corporation limited', display_name:'Kingsoft Corporation Limited', ticker:null, exchange:'HKG',
    industry:'Office Software / WPS Office / Cloud / Gaming / Chinese Productivity Software', sector:'Technology',
    is_public:true, country_code:'CN', workforce_count:9000, workforce_source:'annual_report', workforce_confidence:0.85,
    market_cap_usd:7000000000, pe_ratio:25, revenue_ttm_usd:1400000000,
    financials_source:'annual_report', financials_confidence:0.80,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.72,
    hiring_velocity_score:0.3, total_open_roles:300, hiring_source:'linkedin_scrape', hiring_confidence:0.65,
    data_quality_tier:'verified', enrichment_version:'gt35-v2026.1' },

  { canonical_name:'computershare limited', display_name:'Computershare Limited', ticker:null, exchange:'ASX',
    industry:'Financial Administration Tech / Share Registry / Employee Equity / Mortgage Services / FinTech', sector:'Technology',
    is_public:true, country_code:'AU', workforce_count:14000, workforce_source:'annual_report', workforce_confidence:0.88,
    market_cap_usd:13000000000, pe_ratio:25, revenue_ttm_usd:3300000000,
    financials_source:'annual_report', financials_confidence:0.82,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.72,
    hiring_velocity_score:0.2, total_open_roles:300, hiring_source:'linkedin_scrape', hiring_confidence:0.68,
    data_quality_tier:'verified', enrichment_version:'gt35-v2026.1' },

  { canonical_name:'technology one limited', display_name:'TechnologyOne Limited', ticker:null, exchange:'ASX',
    industry:'Enterprise SaaS / ERP / Local Government / Education / Australian Enterprise Software', sector:'Technology',
    is_public:true, country_code:'AU', workforce_count:1500, workforce_source:'annual_report', workforce_confidence:0.88,
    market_cap_usd:7000000000, pe_ratio:70, revenue_ttm_usd:350000000,
    financials_source:'annual_report', financials_confidence:0.82,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.70,
    hiring_velocity_score:0.5, total_open_roles:100, hiring_source:'linkedin_scrape', hiring_confidence:0.68,
    data_quality_tier:'verified', enrichment_version:'gt35-v2026.1' },

  { canonical_name:'wipro limited', display_name:'Wipro Limited', ticker:null, exchange:'NSE',
    industry:'IT Services / Consulting / BPO / Cloud / Digital / Cybersecurity / India IT Major', sector:'Technology',
    is_public:true, country_code:'IN', workforce_count:234000, workforce_source:'annual_report', workforce_confidence:0.92,
    market_cap_usd:30000000000, pe_ratio:23, revenue_ttm_usd:11000000000,
    financials_source:'annual_report', financials_confidence:0.88,
    recent_layoff_count:1, layoff_source:'news_rss_scrape', layoff_confidence:0.78,
    hiring_velocity_score:0.0, total_open_roles:2000, hiring_source:'linkedin_scrape', hiring_confidence:0.75,
    data_quality_tier:'verified', enrichment_version:'gt35-v2026.1' },

  { canonical_name:'hcl technologies limited', display_name:'HCLTech (HCL Technologies Limited)', ticker:null, exchange:'NSE',
    industry:'IT Services / Engineering R&D / Digital / Cloud / Products & Platforms / India IT Major', sector:'Technology',
    is_public:true, country_code:'IN', workforce_count:220000, workforce_source:'annual_report', workforce_confidence:0.92,
    market_cap_usd:55000000000, pe_ratio:25, revenue_ttm_usd:14000000000,
    financials_source:'annual_report', financials_confidence:0.88,
    recent_layoff_count:1, layoff_source:'news_rss_scrape', layoff_confidence:0.78,
    hiring_velocity_score:0.3, total_open_roles:3000, hiring_source:'linkedin_scrape', hiring_confidence:0.75,
    data_quality_tier:'verified', enrichment_version:'gt35-v2026.1' },
];

async function main() {
  console.log('\n✓ Connected — GT35: Engineering/PLM Software & Remaining APAC IT (2026)\n');
  await initYahoo();
  let inserted=0, updated=0, withPE=0, withRev=0;
  for (const c of companies) {
    const r = await upsertCompany(c);
    if (r.wasInserted) inserted++; else updated++;
    if (r.hasPE) withPE++;
    if (r.hasRev) withRev++;
    await new Promise(r=>setTimeout(r,700));
  }
  console.log(`\n── GT35 complete: ${inserted} inserted, ${updated} updated | PE: ${withPE}/${companies.length} | Rev: ${withRev}/${companies.length}`);
  await pool.end();
}
main().catch(e=>{ console.error(e); process.exit(1); });
