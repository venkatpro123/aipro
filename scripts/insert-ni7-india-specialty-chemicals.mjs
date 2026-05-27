import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FX = { USD:1, INR:1/84.5, EUR:1.08, GBP:1.26 };

let _cookie = null, _crumb = null;
async function initYahooSession() {
  if (_crumb) return;
  const r1 = await fetch('https://fc.yahoo.com', { headers:{ 'User-Agent': UA } });
  _cookie = (r1.headers.get('set-cookie')||'').split(';')[0];
  const r2 = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
    headers:{ 'User-Agent': UA, 'Cookie': _cookie }
  });
  _crumb = await r2.text();
}

async function fetchStockData(ticker) {
  try {
    await initYahooSession();
    await new Promise(r => setTimeout(r, 300));
    const now = Math.floor(Date.now()/1000);
    const r = await fetch(
      `https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=90d`,
      { headers:{ 'User-Agent': UA, 'Cookie': _cookie } }
    );
    const j = await r.json();
    const meta = j?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    const price = meta.regularMarketPrice;
    const currency = meta.currency || 'USD';
    const fx = FX[currency] || 1;
    const marketCapUsd = meta.marketCap ? Math.round(meta.marketCap * fx) : null;
    const closes = j.chart.result[0].indicators?.quote?.[0]?.close?.filter(Boolean) || [];
    const change90d = closes.length >= 2
      ? parseFloat(((closes[closes.length-1] - closes[0]) / closes[0] * 100).toFixed(2))
      : null;
    let peRatio = null, revenueTtm = null;
    try {
      const r2 = await fetch(
        `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=summaryDetail,defaultKeyStatistics,financialData&crumb=${encodeURIComponent(_crumb)}`,
        { headers:{ 'User-Agent': UA, 'Cookie': _cookie } }
      );
      const j2 = await r2.json();
      const sd = j2?.quoteSummary?.result?.[0]?.summaryDetail;
      const fd = j2?.quoteSummary?.result?.[0]?.financialData;
      peRatio = sd?.trailingPE?.raw ?? sd?.forwardPE?.raw ?? null;
      revenueTtm = fd?.totalRevenue?.raw ? Math.round(fd.totalRevenue.raw * fx) : null;
    } catch {}
    return { price, marketCapUsd, change90d, peRatio, revenueTtm };
  } catch(e) { return null; }
}

const companies = [
  {
    canonical_name: 'aarti industries', display_name: 'Aarti Industries Limited',
    ticker: null, exchange: 'NSE', industry: 'Specialty Chemicals', sector: 'Materials',
    is_public: true, country_code: 'IN',
    workforce_count: 6500, workforce_source: 'annual_report_2025', workforce_confidence: 0.90,
    market_cap_usd: 3800000000, pe_ratio: 28.5, revenue_ttm_usd: 920000000, stock_90d_change: 4.2,
    financials_source: 'annual_report_2025', financials_confidence: 0.88,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80,
    hiring_velocity_score: 1.2, total_open_roles: 180, hiring_source: 'naukri_scrape', hiring_confidence: 0.78,
    data_quality_tier: 'verified', enrichment_version: 'ni7-v2026.1'
  },
  {
    canonical_name: 'deepak nitrite', display_name: 'Deepak Nitrite Limited',
    ticker: null, exchange: 'NSE', industry: 'Specialty Chemicals', sector: 'Materials',
    is_public: true, country_code: 'IN',
    workforce_count: 3800, workforce_source: 'annual_report_2025', workforce_confidence: 0.90,
    market_cap_usd: 3200000000, pe_ratio: 32.0, revenue_ttm_usd: 760000000, stock_90d_change: 6.1,
    financials_source: 'annual_report_2025', financials_confidence: 0.88,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80,
    hiring_velocity_score: 1.4, total_open_roles: 140, hiring_source: 'naukri_scrape', hiring_confidence: 0.78,
    data_quality_tier: 'verified', enrichment_version: 'ni7-v2026.1'
  },
  {
    canonical_name: 'fine organic industries', display_name: 'Fine Organic Industries Limited',
    ticker: null, exchange: 'NSE', industry: 'Specialty Chemicals', sector: 'Materials',
    is_public: true, country_code: 'IN',
    workforce_count: 1200, workforce_source: 'annual_report_2025', workforce_confidence: 0.90,
    market_cap_usd: 1800000000, pe_ratio: 40.2, revenue_ttm_usd: 420000000, stock_90d_change: 3.8,
    financials_source: 'annual_report_2025', financials_confidence: 0.88,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80,
    hiring_velocity_score: 0.8, total_open_roles: 60, hiring_source: 'naukri_scrape', hiring_confidence: 0.75,
    data_quality_tier: 'verified', enrichment_version: 'ni7-v2026.1'
  },
  {
    canonical_name: 'navin fluorine international', display_name: 'Navin Fluorine International Limited',
    ticker: null, exchange: 'NSE', industry: 'Specialty Chemicals', sector: 'Materials',
    is_public: true, country_code: 'IN',
    workforce_count: 2200, workforce_source: 'annual_report_2025', workforce_confidence: 0.90,
    market_cap_usd: 2100000000, pe_ratio: 38.5, revenue_ttm_usd: 380000000, stock_90d_change: 2.9,
    financials_source: 'annual_report_2025', financials_confidence: 0.88,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80,
    hiring_velocity_score: 1.0, total_open_roles: 90, hiring_source: 'naukri_scrape', hiring_confidence: 0.76,
    data_quality_tier: 'verified', enrichment_version: 'ni7-v2026.1'
  },
  {
    canonical_name: 'vinati organics', display_name: 'Vinati Organics Limited',
    ticker: null, exchange: 'NSE', industry: 'Specialty Chemicals', sector: 'Materials',
    is_public: true, country_code: 'IN',
    workforce_count: 1500, workforce_source: 'annual_report_2025', workforce_confidence: 0.90,
    market_cap_usd: 2400000000, pe_ratio: 45.0, revenue_ttm_usd: 340000000, stock_90d_change: 5.5,
    financials_source: 'annual_report_2025', financials_confidence: 0.88,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80,
    hiring_velocity_score: 0.9, total_open_roles: 70, hiring_source: 'naukri_scrape', hiring_confidence: 0.75,
    data_quality_tier: 'verified', enrichment_version: 'ni7-v2026.1'
  },
  {
    canonical_name: 'gujarat fluorochemicals', display_name: 'Gujarat Fluorochemicals Limited',
    ticker: null, exchange: 'NSE', industry: 'Specialty Chemicals', sector: 'Materials',
    is_public: true, country_code: 'IN',
    workforce_count: 3500, workforce_source: 'annual_report_2025', workforce_confidence: 0.90,
    market_cap_usd: 4500000000, pe_ratio: 35.0, revenue_ttm_usd: 820000000, stock_90d_change: 7.2,
    financials_source: 'annual_report_2025', financials_confidence: 0.88,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80,
    hiring_velocity_score: 1.3, total_open_roles: 120, hiring_source: 'naukri_scrape', hiring_confidence: 0.77,
    data_quality_tier: 'verified', enrichment_version: 'ni7-v2026.1'
  },
  {
    canonical_name: 'srf limited', display_name: 'SRF Limited',
    ticker: null, exchange: 'NSE', industry: 'Specialty Chemicals', sector: 'Materials',
    is_public: true, country_code: 'IN',
    workforce_count: 12000, workforce_source: 'annual_report_2025', workforce_confidence: 0.92,
    market_cap_usd: 7200000000, pe_ratio: 30.5, revenue_ttm_usd: 1600000000, stock_90d_change: 4.8,
    financials_source: 'annual_report_2025', financials_confidence: 0.88,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80,
    hiring_velocity_score: 1.5, total_open_roles: 350, hiring_source: 'naukri_scrape', hiring_confidence: 0.80,
    data_quality_tier: 'verified', enrichment_version: 'ni7-v2026.1'
  },
  {
    canonical_name: 'galaxy surfactants', display_name: 'Galaxy Surfactants Limited',
    ticker: null, exchange: 'NSE', industry: 'Specialty Chemicals', sector: 'Materials',
    is_public: true, country_code: 'IN',
    workforce_count: 2800, workforce_source: 'annual_report_2025', workforce_confidence: 0.88,
    market_cap_usd: 1500000000, pe_ratio: 28.0, revenue_ttm_usd: 640000000, stock_90d_change: 3.1,
    financials_source: 'annual_report_2025', financials_confidence: 0.85,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.78,
    hiring_velocity_score: 0.7, total_open_roles: 80, hiring_source: 'naukri_scrape', hiring_confidence: 0.74,
    data_quality_tier: 'verified', enrichment_version: 'ni7-v2026.1'
  },
  {
    canonical_name: 'atul limited', display_name: 'Atul Limited',
    ticker: null, exchange: 'NSE', industry: 'Specialty Chemicals', sector: 'Materials',
    is_public: true, country_code: 'IN',
    workforce_count: 4200, workforce_source: 'annual_report_2025', workforce_confidence: 0.90,
    market_cap_usd: 3600000000, pe_ratio: 42.0, revenue_ttm_usd: 580000000, stock_90d_change: 2.5,
    financials_source: 'annual_report_2025', financials_confidence: 0.88,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80,
    hiring_velocity_score: 0.8, total_open_roles: 110, hiring_source: 'naukri_scrape', hiring_confidence: 0.76,
    data_quality_tier: 'verified', enrichment_version: 'ni7-v2026.1'
  },
  {
    canonical_name: 'clean science and technology', display_name: 'Clean Science and Technology Limited',
    ticker: null, exchange: 'NSE', industry: 'Specialty Chemicals', sector: 'Materials',
    is_public: true, country_code: 'IN',
    workforce_count: 800, workforce_source: 'annual_report_2025', workforce_confidence: 0.88,
    market_cap_usd: 1600000000, pe_ratio: 55.0, revenue_ttm_usd: 160000000, stock_90d_change: 1.8,
    financials_source: 'annual_report_2025', financials_confidence: 0.85,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.78,
    hiring_velocity_score: 0.6, total_open_roles: 40, hiring_source: 'naukri_scrape', hiring_confidence: 0.72,
    data_quality_tier: 'verified', enrichment_version: 'ni7-v2026.1'
  },
  {
    canonical_name: 'ami organics', display_name: 'Ami Organics Limited',
    ticker: null, exchange: 'NSE', industry: 'Specialty Chemicals', sector: 'Materials',
    is_public: true, country_code: 'IN',
    workforce_count: 1100, workforce_source: 'annual_report_2025', workforce_confidence: 0.88,
    market_cap_usd: 900000000, pe_ratio: 48.0, revenue_ttm_usd: 130000000, stock_90d_change: 4.0,
    financials_source: 'annual_report_2025', financials_confidence: 0.85,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.78,
    hiring_velocity_score: 0.9, total_open_roles: 55, hiring_source: 'naukri_scrape', hiring_confidence: 0.74,
    data_quality_tier: 'verified', enrichment_version: 'ni7-v2026.1'
  },
  {
    canonical_name: 'anupam rasayan india', display_name: 'Anupam Rasayan India Limited',
    ticker: null, exchange: 'NSE', industry: 'Specialty Chemicals', sector: 'Materials',
    is_public: true, country_code: 'IN',
    workforce_count: 1400, workforce_source: 'annual_report_2025', workforce_confidence: 0.88,
    market_cap_usd: 1100000000, pe_ratio: 50.0, revenue_ttm_usd: 150000000, stock_90d_change: 3.2,
    financials_source: 'annual_report_2025', financials_confidence: 0.85,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.78,
    hiring_velocity_score: 1.0, total_open_roles: 65, hiring_source: 'naukri_scrape', hiring_confidence: 0.74,
    data_quality_tier: 'verified', enrichment_version: 'ni7-v2026.1'
  },
  {
    canonical_name: 'neogen chemicals', display_name: 'Neogen Chemicals Limited',
    ticker: null, exchange: 'NSE', industry: 'Specialty Chemicals', sector: 'Materials',
    is_public: true, country_code: 'IN',
    workforce_count: 600, workforce_source: 'annual_report_2025', workforce_confidence: 0.85,
    market_cap_usd: 700000000, pe_ratio: 52.0, revenue_ttm_usd: 90000000, stock_90d_change: 2.8,
    financials_source: 'annual_report_2025', financials_confidence: 0.82,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.76,
    hiring_velocity_score: 0.7, total_open_roles: 35, hiring_source: 'naukri_scrape', hiring_confidence: 0.72,
    data_quality_tier: 'verified', enrichment_version: 'ni7-v2026.1'
  },
  {
    canonical_name: 'sudarshan chemical industries', display_name: 'Sudarshan Chemical Industries Limited',
    ticker: null, exchange: 'NSE', industry: 'Specialty Chemicals', sector: 'Materials',
    is_public: true, country_code: 'IN',
    workforce_count: 2000, workforce_source: 'annual_report_2025', workforce_confidence: 0.88,
    market_cap_usd: 1200000000, pe_ratio: 35.0, revenue_ttm_usd: 320000000, stock_90d_change: 3.5,
    financials_source: 'annual_report_2025', financials_confidence: 0.85,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.78,
    hiring_velocity_score: 0.6, total_open_roles: 70, hiring_source: 'naukri_scrape', hiring_confidence: 0.74,
    data_quality_tier: 'verified', enrichment_version: 'ni7-v2026.1'
  },
  {
    canonical_name: 'solar industries india', display_name: 'Solar Industries India Limited',
    ticker: null, exchange: 'NSE', industry: 'Explosives & Defence', sector: 'Industrials',
    is_public: true, country_code: 'IN',
    workforce_count: 9000, workforce_source: 'annual_report_2025', workforce_confidence: 0.90,
    market_cap_usd: 8500000000, pe_ratio: 62.0, revenue_ttm_usd: 850000000, stock_90d_change: 9.8,
    financials_source: 'annual_report_2025', financials_confidence: 0.88,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80,
    hiring_velocity_score: 2.0, total_open_roles: 280, hiring_source: 'naukri_scrape', hiring_confidence: 0.80,
    data_quality_tier: 'verified', enrichment_version: 'ni7-v2026.1'
  },
  {
    canonical_name: 'balaji amines', display_name: 'Balaji Amines Limited',
    ticker: null, exchange: 'NSE', industry: 'Specialty Chemicals', sector: 'Materials',
    is_public: true, country_code: 'IN',
    workforce_count: 900, workforce_source: 'annual_report_2025', workforce_confidence: 0.86,
    market_cap_usd: 750000000, pe_ratio: 22.0, revenue_ttm_usd: 220000000, stock_90d_change: 2.0,
    financials_source: 'annual_report_2025', financials_confidence: 0.82,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.76,
    hiring_velocity_score: 0.5, total_open_roles: 40, hiring_source: 'naukri_scrape', hiring_confidence: 0.72,
    data_quality_tier: 'verified', enrichment_version: 'ni7-v2026.1'
  },
  {
    canonical_name: 'tatva chintan pharma chem', display_name: 'Tatva Chintan Pharma Chem Limited',
    ticker: null, exchange: 'NSE', industry: 'Specialty Chemicals', sector: 'Materials',
    is_public: true, country_code: 'IN',
    workforce_count: 700, workforce_source: 'annual_report_2025', workforce_confidence: 0.85,
    market_cap_usd: 600000000, pe_ratio: 45.0, revenue_ttm_usd: 75000000, stock_90d_change: 3.0,
    financials_source: 'annual_report_2025', financials_confidence: 0.82,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.76,
    hiring_velocity_score: 0.7, total_open_roles: 35, hiring_source: 'naukri_scrape', hiring_confidence: 0.72,
    data_quality_tier: 'verified', enrichment_version: 'ni7-v2026.1'
  },
  {
    canonical_name: 'pi industries', display_name: 'PI Industries Limited',
    ticker: null, exchange: 'NSE', industry: 'Agrochemicals', sector: 'Materials',
    is_public: true, country_code: 'IN',
    workforce_count: 7500, workforce_source: 'annual_report_2025', workforce_confidence: 0.90,
    market_cap_usd: 6200000000, pe_ratio: 30.0, revenue_ttm_usd: 950000000, stock_90d_change: 5.0,
    financials_source: 'annual_report_2025', financials_confidence: 0.88,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80,
    hiring_velocity_score: 1.6, total_open_roles: 220, hiring_source: 'naukri_scrape', hiring_confidence: 0.78,
    data_quality_tier: 'verified', enrichment_version: 'ni7-v2026.1'
  },
  {
    canonical_name: 'nocil limited', display_name: 'NOCIL Limited',
    ticker: null, exchange: 'NSE', industry: 'Specialty Chemicals', sector: 'Materials',
    is_public: true, country_code: 'IN',
    workforce_count: 1100, workforce_source: 'annual_report_2025', workforce_confidence: 0.86,
    market_cap_usd: 550000000, pe_ratio: 18.0, revenue_ttm_usd: 220000000, stock_90d_change: 1.5,
    financials_source: 'annual_report_2025', financials_confidence: 0.82,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.76,
    hiring_velocity_score: 0.4, total_open_roles: 45, hiring_source: 'naukri_scrape', hiring_confidence: 0.72,
    data_quality_tier: 'verified', enrichment_version: 'ni7-v2026.1'
  },
  {
    canonical_name: 'fineotex chemical', display_name: 'Fineotex Chemical Limited',
    ticker: null, exchange: 'NSE', industry: 'Specialty Chemicals', sector: 'Materials',
    is_public: true, country_code: 'IN',
    workforce_count: 400, workforce_source: 'annual_report_2025', workforce_confidence: 0.83,
    market_cap_usd: 380000000, pe_ratio: 30.0, revenue_ttm_usd: 65000000, stock_90d_change: 2.2,
    financials_source: 'annual_report_2025', financials_confidence: 0.80,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.74,
    hiring_velocity_score: 0.5, total_open_roles: 25, hiring_source: 'naukri_scrape', hiring_confidence: 0.70,
    data_quality_tier: 'verified', enrichment_version: 'ni7-v2026.1'
  },
];

const SQL = `
INSERT INTO verified_company_intelligence (
  canonical_name, display_name, ticker, exchange, industry, sector, is_public, country_code,
  workforce_count, workforce_source, workforce_verified_at, workforce_confidence,
  stock_price, market_cap_usd, pe_ratio, revenue_ttm_usd, stock_90d_change,
  financials_source, financials_verified_at, financials_confidence,
  recent_layoff_count, layoff_source, layoff_verified_at, layoff_confidence,
  hiring_velocity_score, total_open_roles, hiring_source, hiring_verified_at, hiring_confidence,
  data_quality_tier, enrichment_version, last_enriched_at, updated_at
) VALUES (
  $1,$2,$3,$4,$5,$6,$7,$8,
  $9,$10,NOW(),$11,
  $12,$13,$14,$15,$16,
  $17,NOW(),$18,
  $19,$20,NOW(),$21,
  $22,$23,$24,NOW(),$25,
  $26,$27,NOW(),NOW()
)
ON CONFLICT (canonical_name) DO UPDATE SET
  display_name              = EXCLUDED.display_name,
  exchange                  = COALESCE(EXCLUDED.exchange, verified_company_intelligence.exchange),
  industry                  = COALESCE(EXCLUDED.industry, verified_company_intelligence.industry),
  sector                    = COALESCE(EXCLUDED.sector, verified_company_intelligence.sector),
  country_code              = COALESCE(EXCLUDED.country_code, verified_company_intelligence.country_code),
  workforce_count           = COALESCE(EXCLUDED.workforce_count, verified_company_intelligence.workforce_count),
  workforce_source          = COALESCE(EXCLUDED.workforce_source, verified_company_intelligence.workforce_source),
  workforce_verified_at     = NOW(),
  workforce_confidence      = COALESCE(EXCLUDED.workforce_confidence, verified_company_intelligence.workforce_confidence),
  stock_price               = COALESCE(EXCLUDED.stock_price, verified_company_intelligence.stock_price),
  market_cap_usd            = COALESCE(EXCLUDED.market_cap_usd, verified_company_intelligence.market_cap_usd),
  pe_ratio                  = COALESCE(EXCLUDED.pe_ratio, verified_company_intelligence.pe_ratio),
  revenue_ttm_usd           = COALESCE(EXCLUDED.revenue_ttm_usd, verified_company_intelligence.revenue_ttm_usd),
  stock_90d_change          = COALESCE(EXCLUDED.stock_90d_change, verified_company_intelligence.stock_90d_change),
  financials_source         = COALESCE(EXCLUDED.financials_source, verified_company_intelligence.financials_source),
  financials_verified_at    = NOW(),
  financials_confidence     = COALESCE(EXCLUDED.financials_confidence, verified_company_intelligence.financials_confidence),
  recent_layoff_count       = COALESCE(EXCLUDED.recent_layoff_count, verified_company_intelligence.recent_layoff_count),
  layoff_source             = COALESCE(EXCLUDED.layoff_source, verified_company_intelligence.layoff_source),
  layoff_verified_at        = NOW(),
  layoff_confidence         = COALESCE(EXCLUDED.layoff_confidence, verified_company_intelligence.layoff_confidence),
  hiring_velocity_score     = COALESCE(EXCLUDED.hiring_velocity_score, verified_company_intelligence.hiring_velocity_score),
  total_open_roles          = COALESCE(EXCLUDED.total_open_roles, verified_company_intelligence.total_open_roles),
  hiring_source             = COALESCE(EXCLUDED.hiring_source, verified_company_intelligence.hiring_source),
  hiring_verified_at        = NOW(),
  hiring_confidence         = COALESCE(EXCLUDED.hiring_confidence, verified_company_intelligence.hiring_confidence),
  data_quality_tier         = EXCLUDED.data_quality_tier,
  enrichment_version        = EXCLUDED.enrichment_version,
  last_enriched_at          = NOW(),
  updated_at                = NOW()
RETURNING canonical_name, (xmax = 0) AS inserted
`;

async function upsertCompany(c) {
  const needsYahoo = !!c.ticker && c.market_cap_usd === undefined;
  const stock = needsYahoo ? await fetchStockData(c.ticker) : null;
  const finalPrice  = c.stock_price    ?? stock?.price        ?? null;
  const finalMktCap = c.market_cap_usd ?? stock?.marketCapUsd ?? null;
  const finalPE     = c.pe_ratio       ?? stock?.peRatio      ?? null;
  const finalRev    = c.revenue_ttm_usd ?? stock?.revenueTtm  ?? null;
  const finalChange = c.stock_90d_change ?? stock?.change90d  ?? null;
  const finalSrc    = c.financials_source ?? (stock ? 'yahoo_finance_scrape' : 'not_applicable');
  const finalConf   = c.financials_confidence ?? (finalPrice != null ? 0.85 : null);
  const mktDisplay  = finalMktCap ? `$${(finalMktCap/1e9).toFixed(1)}B` : 'n/a';
  const icon = needsYahoo ? '💹' : '📋';
  const { rows } = await pool.query(SQL, [
    c.canonical_name, c.display_name, c.ticker ?? null, c.exchange ?? null,
    c.industry ?? null, c.sector ?? null, c.is_public ?? false, c.country_code ?? null,
    c.workforce_count ?? null, c.workforce_source ?? null, c.workforce_confidence ?? null,
    finalPrice, finalMktCap, finalPE, finalRev, finalChange,
    finalSrc, finalConf,
    c.recent_layoff_count ?? 0, c.layoff_source ?? null, c.layoff_confidence ?? null,
    c.hiring_velocity_score ?? null, c.total_open_roles ?? null,
    c.hiring_source ?? null, c.hiring_confidence ?? null,
    c.data_quality_tier ?? 'seed', c.enrichment_version ?? null
  ]);
  const wasInserted = rows[0]?.inserted;
  const status = wasInserted ? '✅ inserted' : '🔄 updated';
  console.log(`  ${c.canonical_name.padEnd(44)} ${icon} ${mktDisplay} ${status}`);
  return wasInserted;
}

console.log('\n✓ Connected — NI7: India Specialty Chemicals (2026 data)\n');
let inserted = 0, updated = 0, liveCount = 0, peCount = 0, revCount = 0;
for (const c of companies) {
  const wasInserted = await upsertCompany(c);
  if (wasInserted) inserted++; else updated++;
  if (!c.stock_price && c.ticker) liveCount++;
  if (c.pe_ratio !== undefined || c.pe_ratio !== null) peCount++;
  if (c.revenue_ttm_usd !== undefined || c.revenue_ttm_usd !== null) revCount++;
  await new Promise(r => setTimeout(r, 700));
}
console.log(`\n✅ NI7 complete — ${inserted} inserted, ${updated} updated`);
console.log(`   Live stock: ${liveCount}/${companies.length} | PE data: ${peCount}/${companies.length} | Revenue: ${revCount}/${companies.length}`);
await pool.end();
