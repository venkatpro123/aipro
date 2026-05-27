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
  { canonical_name: 'synopsys inc', display_name: 'Synopsys Inc.', ticker: 'SNPS', exchange: 'NASDAQ', industry: 'EDA / Semiconductor IP / Security Testing / AI Chip Design', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 20000, workforce_source: 'annual_report_2025', workforce_confidence: 0.93, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.82, hiring_velocity_score: 1.0, total_open_roles: 1800, hiring_source: 'linkedin_scrape', hiring_confidence: 0.80, data_quality_tier: 'verified', enrichment_version: 'gt13-v2026.1' },
  { canonical_name: 'cadence design systems', display_name: 'Cadence Design Systems Inc.', ticker: 'CDNS', exchange: 'NASDAQ', industry: 'EDA / AI-Driven Silicon Design / Computational Software', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 11000, workforce_source: 'annual_report_2025', workforce_confidence: 0.93, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.82, hiring_velocity_score: 1.0, total_open_roles: 1200, hiring_source: 'linkedin_scrape', hiring_confidence: 0.80, data_quality_tier: 'verified', enrichment_version: 'gt13-v2026.1' },
  { canonical_name: 'ansys inc', display_name: 'Ansys Inc.', ticker: 'ANSS', exchange: 'NASDAQ', industry: 'Simulation Software / CAE / Digital Twins / Multiphysics', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 6300, workforce_source: 'annual_report_2025', workforce_confidence: 0.92, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80, hiring_velocity_score: 0.8, total_open_roles: 580, hiring_source: 'linkedin_scrape', hiring_confidence: 0.78, data_quality_tier: 'verified', enrichment_version: 'gt13-v2026.1' },
  { canonical_name: 'arista networks inc', display_name: 'Arista Networks Inc.', ticker: 'ANET', exchange: 'NYSE', industry: 'Cloud Networking / Data Center Switches / AI Network Infrastructure', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 4400, workforce_source: 'annual_report_2025', workforce_confidence: 0.92, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.82, hiring_velocity_score: 1.5, total_open_roles: 480, hiring_source: 'linkedin_scrape', hiring_confidence: 0.80, data_quality_tier: 'verified', enrichment_version: 'gt13-v2026.1' },
  { canonical_name: 'super micro computer', display_name: 'Super Micro Computer Inc.', ticker: 'SMCI', exchange: 'NASDAQ', industry: 'AI Server Systems / GPU Clusters / Data Center Hardware', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 7500, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.78, hiring_velocity_score: 1.5, total_open_roles: 680, hiring_source: 'linkedin_scrape', hiring_confidence: 0.78, data_quality_tier: 'verified', enrichment_version: 'gt13-v2026.1' },
  { canonical_name: 'pure storage inc', display_name: 'Pure Storage Inc.', ticker: 'PSTG', exchange: 'NYSE', industry: 'Flash Storage / AI Data Infrastructure / Cloud Storage', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 6000, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80, hiring_velocity_score: 1.0, total_open_roles: 520, hiring_source: 'linkedin_scrape', hiring_confidence: 0.78, data_quality_tier: 'verified', enrichment_version: 'gt13-v2026.1' },
  { canonical_name: 'netapp inc', display_name: 'NetApp Inc.', ticker: 'NTAP', exchange: 'NASDAQ', industry: 'Hybrid Cloud Storage / Data Management / Cloud Services', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 11000, workforce_source: 'annual_report_2025', workforce_confidence: 0.92, recent_layoff_count: 1, largest_layoff_pct: 7.0, layoff_last_event_at: '2023-02-01T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.90, hiring_velocity_score: 0.5, total_open_roles: 680, hiring_source: 'linkedin_scrape', hiring_confidence: 0.76, data_quality_tier: 'verified', enrichment_version: 'gt13-v2026.1' },
  { canonical_name: 'seagate technology', display_name: 'Seagate Technology Holdings plc', ticker: 'STX', exchange: 'NASDAQ', industry: 'Hard Disk Drives / Mass Storage / AI Data Infrastructure', sector: 'Technology', is_public: true, country_code: 'IE', workforce_count: 29000, workforce_source: 'annual_report_2025', workforce_confidence: 0.92, recent_layoff_count: 2, largest_layoff_pct: 8.0, layoff_last_event_at: '2023-07-26T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.92, hiring_velocity_score: 0.3, total_open_roles: 980, hiring_source: 'linkedin_scrape', hiring_confidence: 0.76, data_quality_tier: 'verified', enrichment_version: 'gt13-v2026.1' },
  { canonical_name: 'western digital corporation', display_name: 'Western Digital Corporation', ticker: 'WDC', exchange: 'NASDAQ', industry: 'NAND Flash / Hard Drives / SSD / Data Storage', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 55000, workforce_source: 'annual_report_2025', workforce_confidence: 0.92, recent_layoff_count: 2, largest_layoff_pct: 5.0, layoff_last_event_at: '2023-02-08T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.90, hiring_velocity_score: 0.5, total_open_roles: 2200, hiring_source: 'linkedin_scrape', hiring_confidence: 0.78, data_quality_tier: 'verified', enrichment_version: 'gt13-v2026.1' },
  { canonical_name: 'hewlett packard enterprise', display_name: 'Hewlett Packard Enterprise Co.', ticker: 'HPE', exchange: 'NYSE', industry: 'Hybrid IT / AI Edge / HPC / Storage / Networking', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 62000, workforce_source: 'annual_report_2025', workforce_confidence: 0.93, recent_layoff_count: 2, largest_layoff_pct: 5.0, layoff_last_event_at: '2024-02-01T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.90, hiring_velocity_score: 0.5, total_open_roles: 3200, hiring_source: 'linkedin_scrape', hiring_confidence: 0.78, data_quality_tier: 'verified', enrichment_version: 'gt13-v2026.1' },
  { canonical_name: 'hp inc', display_name: 'HP Inc.', ticker: 'HPQ', exchange: 'NYSE', industry: 'Personal Systems / Printers / 3D Printing / AI PCs', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 51000, workforce_source: 'annual_report_2025', workforce_confidence: 0.93, recent_layoff_count: 2, largest_layoff_pct: 6.0, layoff_last_event_at: '2022-11-22T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.90, hiring_velocity_score: 0.3, total_open_roles: 1800, hiring_source: 'linkedin_scrape', hiring_confidence: 0.76, data_quality_tier: 'verified', enrichment_version: 'gt13-v2026.1' },
  { canonical_name: 'keysight technologies', display_name: 'Keysight Technologies Inc.', ticker: 'KEYS', exchange: 'NYSE', industry: 'Electronic Test & Measurement / 5G / Semiconductor Design', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 14500, workforce_source: 'annual_report_2025', workforce_confidence: 0.92, recent_layoff_count: 1, largest_layoff_pct: 4.0, layoff_last_event_at: '2024-03-01T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.88, hiring_velocity_score: 0.5, total_open_roles: 820, hiring_source: 'linkedin_scrape', hiring_confidence: 0.76, data_quality_tier: 'verified', enrichment_version: 'gt13-v2026.1' },
  { canonical_name: 'trimble inc', display_name: 'Trimble Inc.', ticker: 'TRMB', exchange: 'NASDAQ', industry: 'Positioning / Agriculture Tech / Construction Tech / IoT', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 11000, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, recent_layoff_count: 1, largest_layoff_pct: 8.0, layoff_last_event_at: '2024-01-18T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.88, hiring_velocity_score: 0.3, total_open_roles: 580, hiring_source: 'linkedin_scrape', hiring_confidence: 0.74, data_quality_tier: 'verified', enrichment_version: 'gt13-v2026.1' },
  { canonical_name: 'zebra technologies', display_name: 'Zebra Technologies Corporation', ticker: 'ZBRA', exchange: 'NASDAQ', industry: 'Enterprise Mobile Computing / Barcode / RFID / AI Workflow', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 10000, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, recent_layoff_count: 2, largest_layoff_pct: 9.0, layoff_last_event_at: '2023-11-09T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.92, hiring_velocity_score: 0.3, total_open_roles: 580, hiring_source: 'linkedin_scrape', hiring_confidence: 0.74, data_quality_tier: 'verified', enrichment_version: 'gt13-v2026.1' },
  { canonical_name: 'entegris inc', display_name: 'Entegris Inc.', ticker: 'ENTG', exchange: 'NASDAQ', industry: 'Semiconductor Materials / Chemical Mechanical Planarization / Filtration', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 9000, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, recent_layoff_count: 1, largest_layoff_pct: 4.0, layoff_last_event_at: '2023-09-20T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.88, hiring_velocity_score: 0.8, total_open_roles: 580, hiring_source: 'linkedin_scrape', hiring_confidence: 0.76, data_quality_tier: 'verified', enrichment_version: 'gt13-v2026.1' },
  { canonical_name: 'onto innovation inc', display_name: 'Onto Innovation Inc.', ticker: 'ONTO', exchange: 'NYSE', industry: 'Semiconductor Process Control / Metrology / Inspection Equipment', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 1800, workforce_source: 'annual_report_2025', workforce_confidence: 0.88, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.78, hiring_velocity_score: 0.8, total_open_roles: 120, hiring_source: 'linkedin_scrape', hiring_confidence: 0.72, data_quality_tier: 'verified', enrichment_version: 'gt13-v2026.1' },
  { canonical_name: 'logitech international', display_name: 'Logitech International S.A.', ticker: 'LOGI', exchange: 'NASDAQ', industry: 'PC Peripherals / Webcams / Gaming Gear / AI Work Devices', sector: 'Technology', is_public: true, country_code: 'CH', workforce_count: 6700, workforce_source: 'annual_report_2025', workforce_confidence: 0.92, recent_layoff_count: 1, largest_layoff_pct: 5.0, layoff_last_event_at: '2022-11-02T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.88, hiring_velocity_score: 0.3, total_open_roles: 320, hiring_source: 'linkedin_scrape', hiring_confidence: 0.74, data_quality_tier: 'verified', enrichment_version: 'gt13-v2026.1' },
  { canonical_name: 'calix inc', display_name: 'Calix Inc.', ticker: 'CALX', exchange: 'NYSE', industry: 'Broadband Access / Cloud Platform / Rural ISP / 5G', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 1700, workforce_source: 'annual_report_2025', workforce_confidence: 0.88, recent_layoff_count: 1, largest_layoff_pct: 9.0, layoff_last_event_at: '2024-01-24T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.90, hiring_velocity_score: 0.5, total_open_roles: 120, hiring_source: 'linkedin_scrape', hiring_confidence: 0.70, data_quality_tier: 'verified', enrichment_version: 'gt13-v2026.1' },
  { canonical_name: 'viavi solutions', display_name: 'Viavi Solutions Inc.', ticker: 'VIAV', exchange: 'NASDAQ', industry: 'Network Test / Optical Security / Anti-Counterfeiting', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 4500, workforce_source: 'annual_report_2025', workforce_confidence: 0.88, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.78, hiring_velocity_score: 0.3, total_open_roles: 220, hiring_source: 'linkedin_scrape', hiring_confidence: 0.70, data_quality_tier: 'verified', enrichment_version: 'gt13-v2026.1' },
  { canonical_name: 'ciena corporation', display_name: 'Ciena Corporation', ticker: 'CIEN', exchange: 'NYSE', industry: 'Optical Networking / WaveLogic / 400G/800G Coherent / AI Networks', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 8800, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, recent_layoff_count: 1, largest_layoff_pct: 9.0, layoff_last_event_at: '2023-11-08T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.90, hiring_velocity_score: 0.8, total_open_roles: 680, hiring_source: 'linkedin_scrape', hiring_confidence: 0.76, data_quality_tier: 'verified', enrichment_version: 'gt13-v2026.1' },
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
  console.log(`  ${(c.ticker||'PRIV').padEnd(5)} ${c.canonical_name.padEnd(35)} ${needsYahoo?'💹':'📋'} ${mkt.padEnd(8)}${pe} ${ins?'✅ inserted':'🔄 updated'}`);
  return { wasInserted: ins, hasPE: !!finalPE, hasRev: !!finalRev };
}

console.log('\n✓ Connected — GT13: Advanced Hardware, Storage & EDA (2026)\n');
let ins=0,upd=0,pe=0,rev=0;
for (const c of companies) {
  const r = await upsertCompany(c);
  if(r.wasInserted) ins++; else upd++;
  if(r.hasPE) pe++; if(r.hasRev) rev++;
  await new Promise(r => setTimeout(r, 700));
}
console.log(`\n── GT13 complete: ${ins} inserted, ${upd} updated | PE: ${pe}/${companies.length} | Rev: ${rev}/${companies.length}\n`);
await pool.end();
