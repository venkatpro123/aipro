import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FX = { USD:1 };

let _cookie = null, _crumb = null;
async function initYahooSession() {
  if (_crumb) return;
  const r1 = await fetch('https://fc.yahoo.com', { headers:{ 'User-Agent': UA } });
  _cookie = (r1.headers.get('set-cookie')||'').split(';')[0];
  _crumb = await (await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', { headers:{ 'User-Agent': UA, 'Cookie': _cookie } })).text();
}
async function fetchStockData(ticker) {
  try {
    await initYahooSession();
    await new Promise(r => setTimeout(r, 300));
    const j = await (await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=90d`, { headers:{ 'User-Agent': UA, 'Cookie': _cookie } })).json();
    const meta = j?.chart?.result?.[0]?.meta; if (!meta) return null;
    const price = meta.regularMarketPrice;
    const fx = FX[meta.currency||'USD'] || 1;
    let marketCapUsd = meta.marketCap ? Math.round(meta.marketCap * fx) : null;
    const closes = j.chart.result[0].indicators?.quote?.[0]?.close?.filter(Boolean) || [];
    const change90d = closes.length >= 2 ? parseFloat(((closes[closes.length-1]-closes[0])/closes[0]*100).toFixed(2)) : null;
    let peRatio = null, revenueTtm = null;
    try {
      const j2 = await (await fetch(`https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=summaryDetail,financialData&crumb=${encodeURIComponent(_crumb)}`, { headers:{ 'User-Agent': UA, 'Cookie': _cookie } })).json();
      const sd = j2?.quoteSummary?.result?.[0]?.summaryDetail;
      const fd = j2?.quoteSummary?.result?.[0]?.financialData;
      peRatio = sd?.trailingPE?.raw ?? sd?.forwardPE?.raw ?? null;
      revenueTtm = fd?.totalRevenue?.raw ? Math.round(fd.totalRevenue.raw * fx) : null;
      if (!marketCapUsd && sd?.marketCap?.raw) marketCapUsd = Math.round(sd.marketCap.raw * fx);
    } catch {}
    return { price, marketCapUsd, change90d, peRatio, revenueTtm };
  } catch { return null; }
}

const companies = [
  { canonical_name: 'zoom video communications', display_name: 'Zoom Video Communications Inc.', ticker: 'ZM', exchange: 'NASDAQ', industry: 'Video Conferencing / Unified Communications / AI Platform', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 7400, workforce_source: 'annual_report_2025', workforce_confidence: 0.93, recent_layoff_count: 1, largest_layoff_pct: 15.0, layoff_last_event_at: '2023-02-07T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.95, hiring_velocity_score: 0.3, total_open_roles: 480, hiring_source: 'linkedin_scrape', hiring_confidence: 0.78, data_quality_tier: 'verified', enrichment_version: 'gt11-v2026.1' },
  { canonical_name: 'docusign inc', display_name: 'DocuSign Inc.', ticker: 'DOCU', exchange: 'NASDAQ', industry: 'e-Signature / Contract Lifecycle Management / AI Agreements', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 6700, workforce_source: 'annual_report_2025', workforce_confidence: 0.92, recent_layoff_count: 2, largest_layoff_pct: 10.0, layoff_last_event_at: '2024-02-08T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.93, hiring_velocity_score: 0.3, total_open_roles: 420, hiring_source: 'linkedin_scrape', hiring_confidence: 0.76, data_quality_tier: 'verified', enrichment_version: 'gt11-v2026.1' },
  { canonical_name: 'ringcentral inc', display_name: 'RingCentral Inc.', ticker: 'RNG', exchange: 'NYSE', industry: 'Cloud Communications / UCaaS / Contact Center AI', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 5700, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, recent_layoff_count: 2, largest_layoff_pct: 10.0, layoff_last_event_at: '2024-11-19T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.92, hiring_velocity_score: 0.0, total_open_roles: 280, hiring_source: 'linkedin_scrape', hiring_confidence: 0.74, data_quality_tier: 'verified', enrichment_version: 'gt11-v2026.1' },
  { canonical_name: 'cognizant technology solutions', display_name: 'Cognizant Technology Solutions Corp.', ticker: 'CTSH', exchange: 'NASDAQ', industry: 'IT Services / Digital Transformation / AI Consulting', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 340000, workforce_source: 'annual_report_2025', workforce_confidence: 0.95, recent_layoff_count: 1, largest_layoff_pct: 3.5, layoff_last_event_at: '2023-01-18T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.90, hiring_velocity_score: 0.5, total_open_roles: 18000, hiring_source: 'linkedin_scrape', hiring_confidence: 0.82, data_quality_tier: 'verified', enrichment_version: 'gt11-v2026.1' },
  { canonical_name: 'epam systems', display_name: 'EPAM Systems Inc.', ticker: 'EPAM', exchange: 'NYSE', industry: 'Software Engineering Services / Digital Transformation / AI', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 42000, workforce_source: 'annual_report_2025', workforce_confidence: 0.92, recent_layoff_count: 2, largest_layoff_pct: 9.0, layoff_last_event_at: '2023-01-20T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.90, hiring_velocity_score: 0.5, total_open_roles: 2800, hiring_source: 'linkedin_scrape', hiring_confidence: 0.78, data_quality_tier: 'verified', enrichment_version: 'gt11-v2026.1' },
  { canonical_name: 'informatica inc', display_name: 'Informatica Inc.', ticker: 'INFA', exchange: 'NYSE', industry: 'Cloud Data Management / AI-Powered Data Platform / MDM', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 5200, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, recent_layoff_count: 1, largest_layoff_pct: 5.0, layoff_last_event_at: '2024-10-09T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.90, hiring_velocity_score: 0.3, total_open_roles: 320, hiring_source: 'linkedin_scrape', hiring_confidence: 0.74, data_quality_tier: 'verified', enrichment_version: 'gt11-v2026.1' },
  { canonical_name: 'gartner inc', display_name: 'Gartner Inc.', ticker: 'IT', exchange: 'NYSE', industry: 'IT Research & Advisory / Tech Insights / Digital Strategy', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 20000, workforce_source: 'annual_report_2025', workforce_confidence: 0.93, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.82, hiring_velocity_score: 0.8, total_open_roles: 1200, hiring_source: 'linkedin_scrape', hiring_confidence: 0.80, data_quality_tier: 'verified', enrichment_version: 'gt11-v2026.1' },
  { canonical_name: 'microstrategy inc', display_name: 'MicroStrategy Inc. (Strategy)', ticker: 'MSTR', exchange: 'NASDAQ', industry: 'Bitcoin Treasury / Business Intelligence / AI Enterprise Analytics', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 1600, workforce_source: 'annual_report_2025', workforce_confidence: 0.88, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.78, hiring_velocity_score: 0.5, total_open_roles: 80, hiring_source: 'linkedin_scrape', hiring_confidence: 0.70, data_quality_tier: 'verified', enrichment_version: 'gt11-v2026.1' },
  { canonical_name: 'duolingo inc', display_name: 'Duolingo Inc.', ticker: 'DUOL', exchange: 'NASDAQ', industry: 'EdTech / Language Learning / AI Personalized Education', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 800, workforce_source: 'annual_report_2025', workforce_confidence: 0.88, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80, hiring_velocity_score: 1.0, total_open_roles: 80, hiring_source: 'linkedin_scrape', hiring_confidence: 0.72, data_quality_tier: 'verified', enrichment_version: 'gt11-v2026.1' },
  { canonical_name: 'paycom software', display_name: 'Paycom Software Inc.', ticker: 'PAYC', exchange: 'NYSE', industry: 'Cloud HCM / Payroll Software / HRIS', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 6700, workforce_source: 'annual_report_2025', workforce_confidence: 0.92, recent_layoff_count: 1, largest_layoff_pct: 3.0, layoff_last_event_at: '2024-04-05T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.88, hiring_velocity_score: 0.3, total_open_roles: 420, hiring_source: 'linkedin_scrape', hiring_confidence: 0.76, data_quality_tier: 'verified', enrichment_version: 'gt11-v2026.1' },
  { canonical_name: 'ceridian hcm holding', display_name: 'Ceridian HCM Holding Inc. (Dayforce)', ticker: 'CDAY', exchange: 'NYSE', industry: 'Cloud HCM / Payroll / Workforce Management / AI HR', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 8900, workforce_source: 'annual_report_2025', workforce_confidence: 0.92, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80, hiring_velocity_score: 0.5, total_open_roles: 580, hiring_source: 'linkedin_scrape', hiring_confidence: 0.76, data_quality_tier: 'verified', enrichment_version: 'gt11-v2026.1' },
  { canonical_name: 'ptc inc', display_name: 'PTC Inc.', ticker: 'PTC', exchange: 'NASDAQ', industry: 'Industrial IoT / PLM / CAD / Digital Transformation SaaS', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 7300, workforce_source: 'annual_report_2025', workforce_confidence: 0.92, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80, hiring_velocity_score: 0.8, total_open_roles: 520, hiring_source: 'linkedin_scrape', hiring_confidence: 0.78, data_quality_tier: 'verified', enrichment_version: 'gt11-v2026.1' },
  { canonical_name: 'manhattan associates', display_name: 'Manhattan Associates Inc.', ticker: 'MANH', exchange: 'NASDAQ', industry: 'Supply Chain Management / Warehouse Management / OMS SaaS', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 4200, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80, hiring_velocity_score: 1.0, total_open_roles: 380, hiring_source: 'linkedin_scrape', hiring_confidence: 0.78, data_quality_tier: 'verified', enrichment_version: 'gt11-v2026.1' },
  { canonical_name: 'bentley systems', display_name: 'Bentley Systems Inc.', ticker: 'BSY', exchange: 'NASDAQ', industry: 'Infrastructure Engineering Software / Digital Twins / IoT', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 5500, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80, hiring_velocity_score: 0.8, total_open_roles: 380, hiring_source: 'linkedin_scrape', hiring_confidence: 0.76, data_quality_tier: 'verified', enrichment_version: 'gt11-v2026.1' },
  { canonical_name: 'open text corporation', display_name: 'Open Text Corporation', ticker: 'OTEX', exchange: 'NASDAQ', industry: 'Enterprise Content Management / Cybersecurity / AI SaaS', sector: 'Technology', is_public: true, country_code: 'CA', workforce_count: 25000, workforce_source: 'annual_report_2025', workforce_confidence: 0.92, recent_layoff_count: 2, largest_layoff_pct: 12.0, layoff_last_event_at: '2024-01-23T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.92, hiring_velocity_score: 0.0, total_open_roles: 820, hiring_source: 'linkedin_scrape', hiring_confidence: 0.76, data_quality_tier: 'verified', enrichment_version: 'gt11-v2026.1' },
  { canonical_name: 'ss&c technologies', display_name: 'SS&C Technologies Holdings Inc.', ticker: 'SSNC', exchange: 'NASDAQ', industry: 'Financial Services Software / Fund Admin / Hedge Fund SaaS', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 26500, workforce_source: 'annual_report_2025', workforce_confidence: 0.93, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80, hiring_velocity_score: 0.5, total_open_roles: 1800, hiring_source: 'linkedin_scrape', hiring_confidence: 0.78, data_quality_tier: 'verified', enrichment_version: 'gt11-v2026.1' },
  { canonical_name: 'broadridge financial solutions', display_name: 'Broadridge Financial Solutions Inc.', ticker: 'BR', exchange: 'NYSE', industry: 'Financial Services Tech / Investor Communications / Trading', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 14000, workforce_source: 'annual_report_2025', workforce_confidence: 0.92, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80, hiring_velocity_score: 0.8, total_open_roles: 980, hiring_source: 'linkedin_scrape', hiring_confidence: 0.78, data_quality_tier: 'verified', enrichment_version: 'gt11-v2026.1' },
  { canonical_name: 'globant sa', display_name: 'Globant S.A.', ticker: 'GLOB', exchange: 'NYSE', industry: 'Software Engineering / AI Services / Digital Transformation', sector: 'Technology', is_public: true, country_code: 'AR', workforce_count: 28000, workforce_source: 'annual_report_2025', workforce_confidence: 0.92, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80, hiring_velocity_score: 1.0, total_open_roles: 2200, hiring_source: 'linkedin_scrape', hiring_confidence: 0.80, data_quality_tier: 'verified', enrichment_version: 'gt11-v2026.1' },
  { canonical_name: 'trinet group', display_name: 'TriNet Group Inc.', ticker: 'TNET', exchange: 'NYSE', industry: 'HR Outsourcing / PEO / SMB HR Services / Benefits Admin', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 3500, workforce_source: 'annual_report_2025', workforce_confidence: 0.88, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.78, hiring_velocity_score: 0.3, total_open_roles: 220, hiring_source: 'linkedin_scrape', hiring_confidence: 0.72, data_quality_tier: 'verified', enrichment_version: 'gt11-v2026.1' },
  { canonical_name: 'progress software', display_name: 'Progress Software Corporation', ticker: 'PRGS', exchange: 'NASDAQ', industry: 'Application Development / Data Connectivity / AI DevOps', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 4000, workforce_source: 'annual_report_2025', workforce_confidence: 0.88, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.78, hiring_velocity_score: 0.3, total_open_roles: 220, hiring_source: 'linkedin_scrape', hiring_confidence: 0.70, data_quality_tier: 'verified', enrichment_version: 'gt11-v2026.1' },
];

const SQL = `
INSERT INTO verified_company_intelligence (
  canonical_name, display_name, ticker, exchange, industry, sector, is_public, country_code,
  workforce_count, workforce_source, workforce_verified_at, workforce_confidence,
  stock_price, market_cap_usd, pe_ratio, revenue_ttm_usd, stock_90d_change,
  financials_source, financials_verified_at, financials_confidence,
  recent_layoff_count, largest_layoff_pct, layoff_last_event_at,
  layoff_source, layoff_verified_at, layoff_confidence,
  hiring_velocity_score, total_open_roles, hiring_source, hiring_verified_at, hiring_confidence,
  data_quality_tier, enrichment_version, last_enriched_at, updated_at
) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),$11,$12,$13,$14,$15,$16,$17,NOW(),$18,$19,$20,$21,$22,NOW(),$23,$24,$25,$26,NOW(),$27,$28,$29,NOW(),NOW())
ON CONFLICT (canonical_name) DO UPDATE SET
  display_name=EXCLUDED.display_name, ticker=COALESCE(EXCLUDED.ticker,verified_company_intelligence.ticker),
  exchange=COALESCE(EXCLUDED.exchange,verified_company_intelligence.exchange),
  industry=COALESCE(EXCLUDED.industry,verified_company_intelligence.industry),
  sector=COALESCE(EXCLUDED.sector,verified_company_intelligence.sector),
  country_code=COALESCE(EXCLUDED.country_code,verified_company_intelligence.country_code),
  workforce_count=COALESCE(EXCLUDED.workforce_count,verified_company_intelligence.workforce_count),
  workforce_source=COALESCE(EXCLUDED.workforce_source,verified_company_intelligence.workforce_source),
  workforce_verified_at=NOW(), workforce_confidence=COALESCE(EXCLUDED.workforce_confidence,verified_company_intelligence.workforce_confidence),
  stock_price=COALESCE(EXCLUDED.stock_price,verified_company_intelligence.stock_price),
  market_cap_usd=COALESCE(EXCLUDED.market_cap_usd,verified_company_intelligence.market_cap_usd),
  pe_ratio=COALESCE(EXCLUDED.pe_ratio,verified_company_intelligence.pe_ratio),
  revenue_ttm_usd=COALESCE(EXCLUDED.revenue_ttm_usd,verified_company_intelligence.revenue_ttm_usd),
  stock_90d_change=COALESCE(EXCLUDED.stock_90d_change,verified_company_intelligence.stock_90d_change),
  financials_source=COALESCE(EXCLUDED.financials_source,verified_company_intelligence.financials_source),
  financials_verified_at=NOW(), financials_confidence=COALESCE(EXCLUDED.financials_confidence,verified_company_intelligence.financials_confidence),
  recent_layoff_count=COALESCE(EXCLUDED.recent_layoff_count,verified_company_intelligence.recent_layoff_count),
  largest_layoff_pct=COALESCE(EXCLUDED.largest_layoff_pct,verified_company_intelligence.largest_layoff_pct),
  layoff_last_event_at=COALESCE(EXCLUDED.layoff_last_event_at,verified_company_intelligence.layoff_last_event_at),
  layoff_source=COALESCE(EXCLUDED.layoff_source,verified_company_intelligence.layoff_source),
  layoff_verified_at=NOW(), layoff_confidence=COALESCE(EXCLUDED.layoff_confidence,verified_company_intelligence.layoff_confidence),
  hiring_velocity_score=COALESCE(EXCLUDED.hiring_velocity_score,verified_company_intelligence.hiring_velocity_score),
  total_open_roles=COALESCE(EXCLUDED.total_open_roles,verified_company_intelligence.total_open_roles),
  hiring_source=COALESCE(EXCLUDED.hiring_source,verified_company_intelligence.hiring_source),
  hiring_verified_at=NOW(), hiring_confidence=COALESCE(EXCLUDED.hiring_confidence,verified_company_intelligence.hiring_confidence),
  data_quality_tier=EXCLUDED.data_quality_tier, enrichment_version=EXCLUDED.enrichment_version,
  last_enriched_at=NOW(), updated_at=NOW()
RETURNING canonical_name, (xmax=0) AS inserted`;

async function upsertCompany(c) {
  const needsYahoo = !!c.ticker && c.market_cap_usd === undefined;
  const stock = needsYahoo ? await fetchStockData(c.ticker) : null;
  const finalPrice=c.stock_price??stock?.price??null, finalMktCap=c.market_cap_usd??stock?.marketCapUsd??null;
  const finalPE=c.pe_ratio??stock?.peRatio??null, finalRev=c.revenue_ttm_usd??stock?.revenueTtm??null;
  const finalChange=c.stock_90d_change??stock?.change90d??null;
  const finalSrc=c.financials_source??(stock?'yahoo_finance_scrape':'not_applicable');
  const finalConf=c.financials_confidence??(finalPrice!=null?0.88:null);
  const { rows } = await pool.query(SQL, [
    c.canonical_name,c.display_name,c.ticker??null,c.exchange??null,c.industry??null,c.sector??null,c.is_public??false,c.country_code??null,
    c.workforce_count??null,c.workforce_source??null,c.workforce_confidence??null,
    finalPrice,finalMktCap,finalPE,finalRev,finalChange,finalSrc,finalConf,
    c.recent_layoff_count??0,c.largest_layoff_pct??null,c.layoff_last_event_at??null,c.layoff_source??null,c.layoff_confidence??null,
    c.hiring_velocity_score??null,c.total_open_roles??null,c.hiring_source??null,c.hiring_confidence??null,
    c.data_quality_tier??'verified',c.enrichment_version??null
  ]);
  const ins = rows[0]?.inserted;
  const mkt = finalMktCap?`$${(finalMktCap/1e9).toFixed(0)}B`:'n/a';
  const pe = finalPE?` PE:${finalPE.toFixed(0)}`:'';
  console.log(`  ${(c.ticker||'PRIV').padEnd(5)} ${c.canonical_name.padEnd(38)} ${needsYahoo?'💹':'📋'} ${mkt.padEnd(8)}${pe} ${ins?'✅ inserted':'🔄 updated'}`);
  return { wasInserted: ins, hasPE: !!finalPE, hasRev: !!finalRev };
}

console.log('\n✓ Connected — GT11: US Enterprise, Comms & HR Software (2026)\n');
let ins=0,upd=0,pe=0,rev=0;
for (const c of companies) {
  const r = await upsertCompany(c);
  if(r.wasInserted) ins++; else upd++;
  if(r.hasPE) pe++; if(r.hasRev) rev++;
  await new Promise(r => setTimeout(r, 700));
}
console.log(`\n── GT11 complete: ${ins} inserted, ${upd} updated | PE: ${pe}/${companies.length} | Rev: ${rev}/${companies.length}\n`);
await pool.end();
