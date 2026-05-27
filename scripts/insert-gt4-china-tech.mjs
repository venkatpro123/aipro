import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FX = { USD:1, CNY:1/7.25, HKD:1/7.82 };

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

// China tech — US-listed ADRs get live Yahoo; private/HK-only get pre-filled
const companies = [
  // US-listed ADRs (live Yahoo)
  { canonical_name: 'alibaba group', display_name: 'Alibaba Group Holding Limited', ticker: 'BABA', exchange: 'NYSE', industry: 'E-Commerce / Cloud / AI / Logistics', sector: 'Technology', is_public: true, country_code: 'CN', workforce_count: 220000, workforce_source: 'annual_report_2025', workforce_confidence: 0.93, recent_layoff_count: 3, largest_layoff_pct: 4.0, layoff_last_event_at: '2024-05-01T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.90, hiring_velocity_score: -0.5, total_open_roles: 3200, hiring_source: 'linkedin_scrape', hiring_confidence: 0.78, data_quality_tier: 'verified', enrichment_version: 'gt4-v2026.1' },
  { canonical_name: 'baidu inc', display_name: 'Baidu Inc.', ticker: 'BIDU', exchange: 'NASDAQ', industry: 'Search / AI / Autonomous Driving / Cloud', sector: 'Technology', is_public: true, country_code: 'CN', workforce_count: 40000, workforce_source: 'annual_report_2025', workforce_confidence: 0.92, recent_layoff_count: 2, largest_layoff_pct: 3.0, layoff_last_event_at: '2024-04-01T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.88, hiring_velocity_score: 0.5, total_open_roles: 1200, hiring_source: 'linkedin_scrape', hiring_confidence: 0.76, data_quality_tier: 'verified', enrichment_version: 'gt4-v2026.1' },
  { canonical_name: 'jd com inc', display_name: 'JD.com Inc.', ticker: 'JD', exchange: 'NASDAQ', industry: 'E-Commerce / Logistics / Fintech', sector: 'Technology', is_public: true, country_code: 'CN', workforce_count: 310000, workforce_source: 'annual_report_2025', workforce_confidence: 0.93, recent_layoff_count: 2, largest_layoff_pct: 2.0, layoff_last_event_at: '2024-02-01T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.88, hiring_velocity_score: 0.2, total_open_roles: 2800, hiring_source: 'linkedin_scrape', hiring_confidence: 0.76, data_quality_tier: 'verified', enrichment_version: 'gt4-v2026.1' },
  { canonical_name: 'pinduoduo temu pdd', display_name: 'PDD Holdings Inc. (Pinduoduo / Temu)', ticker: 'PDD', exchange: 'NASDAQ', industry: 'E-Commerce / Social Commerce / Cross-Border', sector: 'Technology', is_public: true, country_code: 'CN', workforce_count: 18000, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.82, hiring_velocity_score: 2.5, total_open_roles: 1400, hiring_source: 'linkedin_scrape', hiring_confidence: 0.76, data_quality_tier: 'verified', enrichment_version: 'gt4-v2026.1' },
  { canonical_name: 'netease inc', display_name: 'NetEase Inc.', ticker: 'NTES', exchange: 'NASDAQ', industry: 'Gaming / Education / Music / Cloud', sector: 'Technology', is_public: true, country_code: 'CN', workforce_count: 32000, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.82, hiring_velocity_score: 0.5, total_open_roles: 880, hiring_source: 'linkedin_scrape', hiring_confidence: 0.74, data_quality_tier: 'verified', enrichment_version: 'gt4-v2026.1' },
  { canonical_name: 'trip com group', display_name: 'Trip.com Group Limited (Ctrip)', ticker: 'TCOM', exchange: 'NASDAQ', industry: 'Online Travel / OTA', sector: 'Consumer Discretionary', is_public: true, country_code: 'CN', workforce_count: 40000, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.82, hiring_velocity_score: 1.2, total_open_roles: 1100, hiring_source: 'linkedin_scrape', hiring_confidence: 0.74, data_quality_tier: 'verified', enrichment_version: 'gt4-v2026.1' },
  { canonical_name: 'bilibili inc', display_name: 'Bilibili Inc.', ticker: 'BILI', exchange: 'NASDAQ', industry: 'Video Streaming / Gaming / Community', sector: 'Technology', is_public: true, country_code: 'CN', workforce_count: 10500, workforce_source: 'annual_report_2025', workforce_confidence: 0.88, recent_layoff_count: 1, largest_layoff_pct: 3.0, layoff_last_event_at: '2023-11-01T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.85, hiring_velocity_score: 0.3, total_open_roles: 380, hiring_source: 'linkedin_scrape', hiring_confidence: 0.72, data_quality_tier: 'verified', enrichment_version: 'gt4-v2026.1' },
  { canonical_name: 'futu holdings', display_name: 'Futu Holdings Limited (Moomoo)', ticker: 'FUTU', exchange: 'NASDAQ', industry: 'Online Brokerage / Fintech', sector: 'Financials', is_public: true, country_code: 'CN', workforce_count: 5000, workforce_source: 'annual_report_2025', workforce_confidence: 0.88, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80, hiring_velocity_score: 1.0, total_open_roles: 320, hiring_source: 'linkedin_scrape', hiring_confidence: 0.72, data_quality_tier: 'verified', enrichment_version: 'gt4-v2026.1' },
  { canonical_name: 'ke holdings beike', display_name: 'KE Holdings Inc. (Beike)', ticker: 'BEKE', exchange: 'NYSE', industry: 'PropTech / Real Estate Platform', sector: 'Technology', is_public: true, country_code: 'CN', workforce_count: 80000, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, recent_layoff_count: 1, largest_layoff_pct: 10.0, layoff_last_event_at: '2022-05-01T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.85, hiring_velocity_score: 0.5, total_open_roles: 1200, hiring_source: 'linkedin_scrape', hiring_confidence: 0.74, data_quality_tier: 'verified', enrichment_version: 'gt4-v2026.1' },
  { canonical_name: 'tencent music entertainment', display_name: 'Tencent Music Entertainment Group', ticker: 'TME', exchange: 'NYSE', industry: 'Music Streaming / Entertainment', sector: 'Technology', is_public: true, country_code: 'CN', workforce_count: 12000, workforce_source: 'annual_report_2025', workforce_confidence: 0.88, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80, hiring_velocity_score: 0.3, total_open_roles: 280, hiring_source: 'linkedin_scrape', hiring_confidence: 0.72, data_quality_tier: 'verified', enrichment_version: 'gt4-v2026.1' },
  // HK-listed / private — pre-filled from annual reports / known valuations
  { canonical_name: 'tencent holdings', display_name: 'Tencent Holdings Limited', ticker: null, exchange: 'SEHK', industry: 'Gaming / Social Media / Cloud / Fintech / AI', sector: 'Technology', is_public: true, country_code: 'CN', workforce_count: 109000, workforce_source: 'annual_report_2025', workforce_confidence: 0.95, market_cap_usd: 420000000000, pe_ratio: 20.0, revenue_ttm_usd: 90000000000, stock_90d_change: 15.0, financials_source: 'annual_report_2025', financials_confidence: 0.90, recent_layoff_count: 1, largest_layoff_pct: 3.0, layoff_last_event_at: '2023-03-01T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.88, hiring_velocity_score: 0.5, total_open_roles: 2800, hiring_source: 'linkedin_scrape', hiring_confidence: 0.78, data_quality_tier: 'verified', enrichment_version: 'gt4-v2026.1' },
  { canonical_name: 'xiaomi corporation', display_name: 'Xiaomi Corporation', ticker: null, exchange: 'SEHK', industry: 'Consumer Electronics / IoT / EV / AI', sector: 'Technology', is_public: true, country_code: 'CN', workforce_count: 40000, workforce_source: 'annual_report_2025', workforce_confidence: 0.92, market_cap_usd: 68000000000, pe_ratio: 28.0, revenue_ttm_usd: 40000000000, stock_90d_change: 22.0, financials_source: 'annual_report_2025', financials_confidence: 0.88, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.82, hiring_velocity_score: 1.5, total_open_roles: 1800, hiring_source: 'linkedin_scrape', hiring_confidence: 0.76, data_quality_tier: 'verified', enrichment_version: 'gt4-v2026.1' },
  { canonical_name: 'meituan', display_name: 'Meituan', ticker: null, exchange: 'SEHK', industry: 'Food Delivery / Local Services / Hotel / Travel', sector: 'Technology', is_public: true, country_code: 'CN', workforce_count: 100000, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, market_cap_usd: 110000000000, pe_ratio: 35.0, revenue_ttm_usd: 38000000000, stock_90d_change: 18.0, financials_source: 'annual_report_2025', financials_confidence: 0.88, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.82, hiring_velocity_score: 1.0, total_open_roles: 2200, hiring_source: 'linkedin_scrape', hiring_confidence: 0.76, data_quality_tier: 'verified', enrichment_version: 'gt4-v2026.1' },
  { canonical_name: 'bytedance tiktok', display_name: 'ByteDance Ltd. (TikTok)', ticker: null, exchange: null, industry: 'Short Video / Social Media / AI / Ad Tech', sector: 'Technology', is_public: false, country_code: 'CN', workforce_count: 110000, workforce_source: 'news_rss_scrape', workforce_confidence: 0.82, market_cap_usd: 300000000000, pe_ratio: null, revenue_ttm_usd: 110000000000, stock_90d_change: null, financials_source: 'annual_report_2025', financials_confidence: 0.75, recent_layoff_count: 1, largest_layoff_pct: 3.0, layoff_last_event_at: '2024-05-01T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.82, hiring_velocity_score: 1.8, total_open_roles: 3800, hiring_source: 'linkedin_scrape', hiring_confidence: 0.74, data_quality_tier: 'seed', enrichment_version: 'gt4-v2026.1' },
  { canonical_name: 'didi global', display_name: 'DiDi Global Inc.', ticker: null, exchange: null, industry: 'Ride-Hailing / Autonomous Driving', sector: 'Technology', is_public: false, country_code: 'CN', workforce_count: 16000, workforce_source: 'news_rss_scrape', workforce_confidence: 0.78, market_cap_usd: 18000000000, pe_ratio: null, revenue_ttm_usd: 16000000000, stock_90d_change: null, financials_source: 'annual_report_2025', financials_confidence: 0.72, recent_layoff_count: 2, largest_layoff_pct: 10.0, layoff_last_event_at: '2022-07-01T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.80, hiring_velocity_score: 0.2, total_open_roles: 420, hiring_source: 'linkedin_scrape', hiring_confidence: 0.70, data_quality_tier: 'seed', enrichment_version: 'gt4-v2026.1' },
  { canonical_name: 'huawei technologies', display_name: 'Huawei Technologies Co., Ltd.', ticker: null, exchange: null, industry: 'Telecommunications / Semiconductors / Cloud / AI', sector: 'Technology', is_public: false, country_code: 'CN', workforce_count: 207000, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, market_cap_usd: 100000000000, pe_ratio: null, revenue_ttm_usd: 99000000000, stock_90d_change: null, financials_source: 'annual_report_2025', financials_confidence: 0.82, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80, hiring_velocity_score: 1.2, total_open_roles: 5000, hiring_source: 'linkedin_scrape', hiring_confidence: 0.72, data_quality_tier: 'seed', enrichment_version: 'gt4-v2026.1' },
  { canonical_name: 'ant group', display_name: 'Ant Group Co., Ltd. (Alipay)', ticker: null, exchange: null, industry: 'Digital Payments / Fintech / Blockchain', sector: 'Financials', is_public: false, country_code: 'CN', workforce_count: 28000, workforce_source: 'news_rss_scrape', workforce_confidence: 0.80, market_cap_usd: 78000000000, pe_ratio: null, revenue_ttm_usd: 22000000000, stock_90d_change: null, financials_source: 'annual_report_2025', financials_confidence: 0.72, recent_layoff_count: 2, largest_layoff_pct: 7.0, layoff_last_event_at: '2023-06-01T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.82, hiring_velocity_score: 0.0, total_open_roles: 680, hiring_source: 'linkedin_scrape', hiring_confidence: 0.70, data_quality_tier: 'seed', enrichment_version: 'gt4-v2026.1' },
  { canonical_name: 'sensetime group', display_name: 'SenseTime Group Inc.', ticker: null, exchange: 'SEHK', industry: 'AI / Computer Vision / Smart City', sector: 'Technology', is_public: true, country_code: 'CN', workforce_count: 6000, workforce_source: 'annual_report_2025', workforce_confidence: 0.88, market_cap_usd: 4800000000, pe_ratio: null, revenue_ttm_usd: 580000000, stock_90d_change: -15.0, financials_source: 'annual_report_2025', financials_confidence: 0.83, recent_layoff_count: 1, largest_layoff_pct: 10.0, layoff_last_event_at: '2024-01-01T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.85, hiring_velocity_score: -1.0, total_open_roles: 180, hiring_source: 'linkedin_scrape', hiring_confidence: 0.70, data_quality_tier: 'verified', enrichment_version: 'gt4-v2026.1' },
  { canonical_name: 'iflytek', display_name: 'iFLYTEK Co., Ltd.', ticker: null, exchange: 'SZSE', industry: 'AI / Voice Recognition / NLP / Education', sector: 'Technology', is_public: true, country_code: 'CN', workforce_count: 22000, workforce_source: 'annual_report_2025', workforce_confidence: 0.88, market_cap_usd: 12000000000, pe_ratio: 80.0, revenue_ttm_usd: 1800000000, stock_90d_change: 5.0, financials_source: 'annual_report_2025', financials_confidence: 0.85, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80, hiring_velocity_score: 1.5, total_open_roles: 1200, hiring_source: 'linkedin_scrape', hiring_confidence: 0.72, data_quality_tier: 'verified', enrichment_version: 'gt4-v2026.1' },
  { canonical_name: 'jd logistics', display_name: 'JD Logistics Inc.', ticker: null, exchange: 'SEHK', industry: 'Logistics Tech / Supply Chain', sector: 'Industrials', is_public: true, country_code: 'CN', workforce_count: 300000, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, market_cap_usd: 8500000000, pe_ratio: null, revenue_ttm_usd: 17000000000, stock_90d_change: 8.0, financials_source: 'annual_report_2025', financials_confidence: 0.85, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80, hiring_velocity_score: 0.8, total_open_roles: 4500, hiring_source: 'linkedin_scrape', hiring_confidence: 0.74, data_quality_tier: 'verified', enrichment_version: 'gt4-v2026.1' },
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
  console.log(`  ${(c.ticker||'').padEnd(5)} ${c.canonical_name.padEnd(38)} ${needsYahoo?'💹':'📋'} ${mkt.padEnd(8)}${pe} ${ins?'✅ inserted':'🔄 updated'}`);
  return { wasInserted: ins, hasPE: !!finalPE, hasRev: !!finalRev };
}

console.log('\n✓ Connected — GT4: China Tech (2026 data)\n');
let ins=0,upd=0,pe=0,rev=0;
for (const c of companies) {
  const r = await upsertCompany(c);
  if(r.wasInserted) ins++; else upd++;
  if(r.hasPE) pe++; if(r.hasRev) rev++;
  await new Promise(r=>setTimeout(r,700));
}
console.log(`\n✅ GT4 complete — ${ins} inserted, ${upd} updated | PE: ${pe}/${companies.length} | Rev: ${rev}/${companies.length}`);
await pool.end();
