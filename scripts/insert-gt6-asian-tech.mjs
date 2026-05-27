import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FX = { USD:1, JPY:1/150, KRW:1/1350, SGD:1/1.34, IDR:1/16000, TWD:1/32 };

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
  // US-listed (live Yahoo)
  { canonical_name: 'sony group corporation', display_name: 'Sony Group Corporation', ticker: 'SONY', exchange: 'NYSE', industry: 'Consumer Electronics / Gaming / Entertainment / Semiconductors', sector: 'Technology', is_public: true, country_code: 'JP', workforce_count: 113000, workforce_source: 'annual_report_2025', workforce_confidence: 0.95, recent_layoff_count: 1, largest_layoff_pct: 5.0, layoff_last_event_at: '2024-02-27T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.90, hiring_velocity_score: 0.5, total_open_roles: 1800, hiring_source: 'linkedin_scrape', hiring_confidence: 0.78, data_quality_tier: 'verified', enrichment_version: 'gt6-v2026.1' },
  { canonical_name: 'grab holdings', display_name: 'Grab Holdings Limited', ticker: 'GRAB', exchange: 'NASDAQ', industry: 'Super App / Ride-Hailing / Food Delivery / Fintech', sector: 'Technology', is_public: true, country_code: 'SG', workforce_count: 8000, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, recent_layoff_count: 2, largest_layoff_pct: 11.0, layoff_last_event_at: '2023-06-20T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.90, hiring_velocity_score: 0.8, total_open_roles: 420, hiring_source: 'linkedin_scrape', hiring_confidence: 0.74, data_quality_tier: 'verified', enrichment_version: 'gt6-v2026.1' },
  { canonical_name: 'sea limited shopee', display_name: 'Sea Limited (Shopee / Garena / SeaMoney)', ticker: 'SE', exchange: 'NYSE', industry: 'E-Commerce / Gaming / Digital Finance', sector: 'Technology', is_public: true, country_code: 'SG', workforce_count: 49000, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, recent_layoff_count: 3, largest_layoff_pct: 10.0, layoff_last_event_at: '2023-03-14T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.90, hiring_velocity_score: 0.5, total_open_roles: 980, hiring_source: 'linkedin_scrape', hiring_confidence: 0.76, data_quality_tier: 'verified', enrichment_version: 'gt6-v2026.1' },
  { canonical_name: 'hitachi limited', display_name: 'Hitachi, Ltd.', ticker: 'HTHIY', exchange: 'OTC', industry: 'IT Services / Digital Infrastructure / Industrial', sector: 'Technology', is_public: true, country_code: 'JP', workforce_count: 270000, workforce_source: 'annual_report_2025', workforce_confidence: 0.93, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80, hiring_velocity_score: 0.8, total_open_roles: 3800, hiring_source: 'linkedin_scrape', hiring_confidence: 0.76, data_quality_tier: 'verified', enrichment_version: 'gt6-v2026.1' },
  // Pre-filled — Japan
  { canonical_name: 'nintendo co ltd', display_name: 'Nintendo Co., Ltd.', ticker: null, exchange: 'TSE', industry: 'Video Games / Gaming Hardware / IP', sector: 'Technology', is_public: true, country_code: 'JP', workforce_count: 7300, workforce_source: 'annual_report_2025', workforce_confidence: 0.93, market_cap_usd: 52000000000, pe_ratio: 16.0, revenue_ttm_usd: 13000000000, stock_90d_change: -8.0, financials_source: 'annual_report_2025', financials_confidence: 0.88, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.82, hiring_velocity_score: 0.3, total_open_roles: 280, hiring_source: 'linkedin_scrape', hiring_confidence: 0.74, data_quality_tier: 'verified', enrichment_version: 'gt6-v2026.1' },
  { canonical_name: 'softbank group', display_name: 'SoftBank Group Corp.', ticker: null, exchange: 'TSE', industry: 'Tech Investment / Telecom / AI / Vision Fund', sector: 'Technology', is_public: true, country_code: 'JP', workforce_count: 70000, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, market_cap_usd: 65000000000, pe_ratio: null, revenue_ttm_usd: 58000000000, stock_90d_change: 8.0, financials_source: 'annual_report_2025', financials_confidence: 0.85, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80, hiring_velocity_score: 0.8, total_open_roles: 1200, hiring_source: 'linkedin_scrape', hiring_confidence: 0.74, data_quality_tier: 'verified', enrichment_version: 'gt6-v2026.1' },
  { canonical_name: 'keyence corporation', display_name: 'Keyence Corporation', ticker: null, exchange: 'TSE', industry: 'Industrial Automation / Sensors / Vision Systems', sector: 'Technology', is_public: true, country_code: 'JP', workforce_count: 10000, workforce_source: 'annual_report_2025', workforce_confidence: 0.92, market_cap_usd: 80000000000, pe_ratio: 38.0, revenue_ttm_usd: 6500000000, stock_90d_change: 2.0, financials_source: 'annual_report_2025', financials_confidence: 0.88, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.82, hiring_velocity_score: 0.5, total_open_roles: 320, hiring_source: 'linkedin_scrape', hiring_confidence: 0.76, data_quality_tier: 'verified', enrichment_version: 'gt6-v2026.1' },
  { canonical_name: 'fujitsu limited', display_name: 'Fujitsu Limited', ticker: null, exchange: 'TSE', industry: 'IT Services / Cloud / Digital Transformation', sector: 'Technology', is_public: true, country_code: 'JP', workforce_count: 124000, workforce_source: 'annual_report_2025', workforce_confidence: 0.93, market_cap_usd: 30000000000, pe_ratio: 24.0, revenue_ttm_usd: 24000000000, stock_90d_change: 0.0, financials_source: 'annual_report_2025', financials_confidence: 0.88, recent_layoff_count: 1, largest_layoff_pct: 3.0, layoff_last_event_at: '2024-01-01T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.85, hiring_velocity_score: 0.5, total_open_roles: 1800, hiring_source: 'linkedin_scrape', hiring_confidence: 0.76, data_quality_tier: 'verified', enrichment_version: 'gt6-v2026.1' },
  { canonical_name: 'ntt data corporation', display_name: 'NTT DATA Group Corporation', ticker: null, exchange: 'TSE', industry: 'IT Services / Systems Integration / Cloud', sector: 'Technology', is_public: true, country_code: 'JP', workforce_count: 190000, workforce_source: 'annual_report_2025', workforce_confidence: 0.92, market_cap_usd: 20000000000, pe_ratio: 22.0, revenue_ttm_usd: 21000000000, stock_90d_change: -2.0, financials_source: 'annual_report_2025', financials_confidence: 0.87, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80, hiring_velocity_score: 0.5, total_open_roles: 2800, hiring_source: 'linkedin_scrape', hiring_confidence: 0.76, data_quality_tier: 'verified', enrichment_version: 'gt6-v2026.1' },
  { canonical_name: 'rakuten group', display_name: 'Rakuten Group Inc.', ticker: null, exchange: 'TSE', industry: 'E-Commerce / Fintech / Telecom / AI', sector: 'Technology', is_public: true, country_code: 'JP', workforce_count: 32000, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, market_cap_usd: 8500000000, pe_ratio: null, revenue_ttm_usd: 17000000000, stock_90d_change: -5.0, financials_source: 'annual_report_2025', financials_confidence: 0.85, recent_layoff_count: 1, largest_layoff_pct: 4.0, layoff_last_event_at: '2024-01-01T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.85, hiring_velocity_score: 0.2, total_open_roles: 680, hiring_source: 'linkedin_scrape', hiring_confidence: 0.74, data_quality_tier: 'verified', enrichment_version: 'gt6-v2026.1' },
  { canonical_name: 'trend micro inc', display_name: 'Trend Micro Incorporated', ticker: null, exchange: 'TSE', industry: 'Cybersecurity / Endpoint / Cloud Security', sector: 'Technology', is_public: true, country_code: 'JP', workforce_count: 8900, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, market_cap_usd: 7800000000, pe_ratio: 28.0, revenue_ttm_usd: 2200000000, stock_90d_change: 2.0, financials_source: 'annual_report_2025', financials_confidence: 0.85, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80, hiring_velocity_score: 0.5, total_open_roles: 380, hiring_source: 'linkedin_scrape', hiring_confidence: 0.74, data_quality_tier: 'verified', enrichment_version: 'gt6-v2026.1' },
  // Pre-filled — Korea
  { canonical_name: 'naver corporation', display_name: 'Naver Corporation', ticker: null, exchange: 'KRX', industry: 'Search / E-Commerce / Webtoon / AI', sector: 'Technology', is_public: true, country_code: 'KR', workforce_count: 14000, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, market_cap_usd: 17000000000, pe_ratio: 28.0, revenue_ttm_usd: 2600000000, stock_90d_change: 3.0, financials_source: 'annual_report_2025', financials_confidence: 0.86, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80, hiring_velocity_score: 0.8, total_open_roles: 480, hiring_source: 'linkedin_scrape', hiring_confidence: 0.74, data_quality_tier: 'verified', enrichment_version: 'gt6-v2026.1' },
  { canonical_name: 'kakao corporation', display_name: 'Kakao Corp.', ticker: null, exchange: 'KRX', industry: 'Messaging / Fintech / Entertainment / AI', sector: 'Technology', is_public: true, country_code: 'KR', workforce_count: 12000, workforce_source: 'annual_report_2025', workforce_confidence: 0.88, market_cap_usd: 8500000000, pe_ratio: null, revenue_ttm_usd: 2200000000, stock_90d_change: -12.0, financials_source: 'annual_report_2025', financials_confidence: 0.83, recent_layoff_count: 1, largest_layoff_pct: 5.0, layoff_last_event_at: '2023-12-01T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.85, hiring_velocity_score: -0.5, total_open_roles: 280, hiring_source: 'linkedin_scrape', hiring_confidence: 0.72, data_quality_tier: 'verified', enrichment_version: 'gt6-v2026.1' },
  { canonical_name: 'lg electronics', display_name: 'LG Electronics Inc.', ticker: null, exchange: 'KRX', industry: 'Consumer Electronics / Home Appliances / EV Components', sector: 'Technology', is_public: true, country_code: 'KR', workforce_count: 74000, workforce_source: 'annual_report_2025', workforce_confidence: 0.92, market_cap_usd: 8200000000, pe_ratio: 8.0, revenue_ttm_usd: 65000000000, stock_90d_change: -5.0, financials_source: 'annual_report_2025', financials_confidence: 0.88, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80, hiring_velocity_score: 0.3, total_open_roles: 1200, hiring_source: 'linkedin_scrape', hiring_confidence: 0.76, data_quality_tier: 'verified', enrichment_version: 'gt6-v2026.1' },
  { canonical_name: 'krafton inc', display_name: 'Krafton Inc. (PUBG)', ticker: null, exchange: 'KRX', industry: 'Video Games / Battle Royale / AI Gaming', sector: 'Technology', is_public: true, country_code: 'KR', workforce_count: 4200, workforce_source: 'annual_report_2025', workforce_confidence: 0.88, market_cap_usd: 9500000000, pe_ratio: 18.0, revenue_ttm_usd: 1900000000, stock_90d_change: 8.0, financials_source: 'annual_report_2025', financials_confidence: 0.85, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80, hiring_velocity_score: 0.8, total_open_roles: 280, hiring_source: 'linkedin_scrape', hiring_confidence: 0.74, data_quality_tier: 'verified', enrichment_version: 'gt6-v2026.1' },
  // Southeast Asia
  { canonical_name: 'goto group indonesia', display_name: 'GoTo Group (Gojek / Tokopedia)', ticker: null, exchange: 'IDX', industry: 'Super App / E-Commerce / Fintech / Logistics', sector: 'Technology', is_public: true, country_code: 'ID', workforce_count: 10000, workforce_source: 'annual_report_2025', workforce_confidence: 0.85, market_cap_usd: 3200000000, pe_ratio: null, revenue_ttm_usd: 1800000000, stock_90d_change: -15.0, financials_source: 'annual_report_2025', financials_confidence: 0.80, recent_layoff_count: 3, largest_layoff_pct: 12.0, layoff_last_event_at: '2023-05-05T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.88, hiring_velocity_score: -0.5, total_open_roles: 280, hiring_source: 'linkedin_scrape', hiring_confidence: 0.70, data_quality_tier: 'verified', enrichment_version: 'gt6-v2026.1' },
  { canonical_name: 'bukalapak', display_name: 'Bukalapak.com Inc.', ticker: null, exchange: 'IDX', industry: 'E-Commerce / Financial Services', sector: 'Technology', is_public: true, country_code: 'ID', workforce_count: 2000, workforce_source: 'annual_report_2025', workforce_confidence: 0.80, market_cap_usd: 900000000, pe_ratio: null, revenue_ttm_usd: 180000000, stock_90d_change: -20.0, financials_source: 'annual_report_2025', financials_confidence: 0.75, recent_layoff_count: 2, largest_layoff_pct: 10.0, layoff_last_event_at: '2024-01-01T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.85, hiring_velocity_score: -1.5, total_open_roles: 60, hiring_source: 'linkedin_scrape', hiring_confidence: 0.68, data_quality_tier: 'seed', enrichment_version: 'gt6-v2026.1' },
  // Taiwan
  { canonical_name: 'asus asustek computer', display_name: 'ASUSTeK Computer Inc.', ticker: null, exchange: 'TWSE', industry: 'PCs / Motherboards / Gaming Hardware / AI', sector: 'Technology', is_public: true, country_code: 'TW', workforce_count: 16500, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, market_cap_usd: 12000000000, pe_ratio: 15.0, revenue_ttm_usd: 17000000000, stock_90d_change: 5.0, financials_source: 'annual_report_2025', financials_confidence: 0.87, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80, hiring_velocity_score: 0.8, total_open_roles: 580, hiring_source: 'linkedin_scrape', hiring_confidence: 0.74, data_quality_tier: 'verified', enrichment_version: 'gt6-v2026.1' },
  { canonical_name: 'acer inc', display_name: 'Acer Incorporated', ticker: null, exchange: 'TWSE', industry: 'PCs / Laptops / Monitors / Gaming', sector: 'Technology', is_public: true, country_code: 'TW', workforce_count: 8600, workforce_source: 'annual_report_2025', workforce_confidence: 0.88, market_cap_usd: 2800000000, pe_ratio: 12.0, revenue_ttm_usd: 8900000000, stock_90d_change: 2.0, financials_source: 'annual_report_2025', financials_confidence: 0.85, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.78, hiring_velocity_score: 0.2, total_open_roles: 280, hiring_source: 'linkedin_scrape', hiring_confidence: 0.72, data_quality_tier: 'verified', enrichment_version: 'gt6-v2026.1' },
  { canonical_name: 'foxconn hon hai precision', display_name: 'Hon Hai Precision Industry Co. (Foxconn)', ticker: null, exchange: 'TWSE', industry: 'Contract Manufacturing / EMS / EV / Semiconductors', sector: 'Technology', is_public: true, country_code: 'TW', workforce_count: 800000, workforce_source: 'annual_report_2025', workforce_confidence: 0.93, market_cap_usd: 52000000000, pe_ratio: 12.0, revenue_ttm_usd: 220000000000, stock_90d_change: 8.0, financials_source: 'annual_report_2025', financials_confidence: 0.88, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80, hiring_velocity_score: 0.5, total_open_roles: 5000, hiring_source: 'linkedin_scrape', hiring_confidence: 0.74, data_quality_tier: 'verified', enrichment_version: 'gt6-v2026.1' },
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

console.log('\n✓ Connected — GT6: Japan / Korea / SE Asia / Taiwan Tech (2026)\n');
let ins=0,upd=0,pe=0,rev=0;
for (const c of companies) {
  const r = await upsertCompany(c);
  if(r.wasInserted) ins++; else upd++;
  if(r.hasPE) pe++; if(r.hasRev) rev++;
  await new Promise(r=>setTimeout(r,700));
}
console.log(`\n✅ GT6 complete — ${ins} inserted, ${upd} updated | PE: ${pe}/${companies.length} | Rev: ${rev}/${companies.length}`);
await pool.end();
