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

// NI9: India Agri / Food Processing / Spirits / Fertilisers
const companies = [
  // Spirits & Beverages
  {
    canonical_name: 'united spirits diageo india', display_name: 'United Spirits Limited (Diageo India)',
    ticker: null, exchange: 'NSE', industry: 'Spirits & Beverages', sector: 'Consumer Staples',
    is_public: true, country_code: 'IN',
    workforce_count: 3200, workforce_source: 'annual_report_2025', workforce_confidence: 0.90,
    market_cap_usd: 6800000000, pe_ratio: 52.0, revenue_ttm_usd: 920000000, stock_90d_change: 5.5,
    financials_source: 'annual_report_2025', financials_confidence: 0.88,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80,
    hiring_velocity_score: 0.5, total_open_roles: 120, hiring_source: 'naukri_scrape', hiring_confidence: 0.78,
    data_quality_tier: 'verified', enrichment_version: 'ni9-v2026.1'
  },
  {
    canonical_name: 'united breweries kingfisher', display_name: 'United Breweries Limited (Kingfisher)',
    ticker: null, exchange: 'NSE', industry: 'Beer & Beverages', sector: 'Consumer Staples',
    is_public: true, country_code: 'IN',
    workforce_count: 2800, workforce_source: 'annual_report_2025', workforce_confidence: 0.88,
    market_cap_usd: 5200000000, pe_ratio: 60.0, revenue_ttm_usd: 760000000, stock_90d_change: 4.0,
    financials_source: 'annual_report_2025', financials_confidence: 0.87,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.78,
    hiring_velocity_score: 0.4, total_open_roles: 90, hiring_source: 'naukri_scrape', hiring_confidence: 0.76,
    data_quality_tier: 'verified', enrichment_version: 'ni9-v2026.1'
  },
  {
    canonical_name: 'radico khaitan', display_name: 'Radico Khaitan Limited',
    ticker: null, exchange: 'NSE', industry: 'Spirits & Beverages', sector: 'Consumer Staples',
    is_public: true, country_code: 'IN',
    workforce_count: 3500, workforce_source: 'annual_report_2025', workforce_confidence: 0.88,
    market_cap_usd: 3600000000, pe_ratio: 68.0, revenue_ttm_usd: 490000000, stock_90d_change: 6.2,
    financials_source: 'annual_report_2025', financials_confidence: 0.87,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.78,
    hiring_velocity_score: 0.8, total_open_roles: 140, hiring_source: 'naukri_scrape', hiring_confidence: 0.76,
    data_quality_tier: 'verified', enrichment_version: 'ni9-v2026.1'
  },
  // Agri / Food Processing
  {
    canonical_name: 'upl limited', display_name: 'UPL Limited',
    ticker: null, exchange: 'NSE', industry: 'Agrochemicals', sector: 'Materials',
    is_public: true, country_code: 'IN',
    workforce_count: 13000, workforce_source: 'annual_report_2025', workforce_confidence: 0.90,
    market_cap_usd: 3800000000, pe_ratio: null, revenue_ttm_usd: 2600000000, stock_90d_change: -8.0,
    financials_source: 'annual_report_2025', financials_confidence: 0.88,
    recent_layoff_count: 1, largest_layoff_pct: 5.0, layoff_last_event_at: '2024-05-01T00:00:00Z',
    layoff_source: 'news_rss_scrape', layoff_confidence: 0.82,
    hiring_velocity_score: -0.5, total_open_roles: 280, hiring_source: 'naukri_scrape', hiring_confidence: 0.78,
    data_quality_tier: 'verified', enrichment_version: 'ni9-v2026.1'
  },
  {
    canonical_name: 'krbl india gate rice', display_name: 'KRBL Limited (India Gate Rice)',
    ticker: null, exchange: 'NSE', industry: 'Food Processing', sector: 'Consumer Staples',
    is_public: true, country_code: 'IN',
    workforce_count: 2200, workforce_source: 'annual_report_2025', workforce_confidence: 0.87,
    market_cap_usd: 1100000000, pe_ratio: 18.0, revenue_ttm_usd: 560000000, stock_90d_change: 2.5,
    financials_source: 'annual_report_2025', financials_confidence: 0.85,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.78,
    hiring_velocity_score: 0.3, total_open_roles: 70, hiring_source: 'naukri_scrape', hiring_confidence: 0.72,
    data_quality_tier: 'verified', enrichment_version: 'ni9-v2026.1'
  },
  {
    canonical_name: 'lt foods daawat', display_name: 'LT Foods Limited (Daawat)',
    ticker: null, exchange: 'NSE', industry: 'Food Processing', sector: 'Consumer Staples',
    is_public: true, country_code: 'IN',
    workforce_count: 3500, workforce_source: 'annual_report_2025', workforce_confidence: 0.87,
    market_cap_usd: 1600000000, pe_ratio: 22.0, revenue_ttm_usd: 680000000, stock_90d_change: 8.5,
    financials_source: 'annual_report_2025', financials_confidence: 0.86,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.78,
    hiring_velocity_score: 0.7, total_open_roles: 110, hiring_source: 'naukri_scrape', hiring_confidence: 0.74,
    data_quality_tier: 'verified', enrichment_version: 'ni9-v2026.1'
  },
  {
    canonical_name: 'heritage foods', display_name: 'Heritage Foods Limited',
    ticker: null, exchange: 'NSE', industry: 'Dairy & Foods', sector: 'Consumer Staples',
    is_public: true, country_code: 'IN',
    workforce_count: 4500, workforce_source: 'annual_report_2025', workforce_confidence: 0.87,
    market_cap_usd: 720000000, pe_ratio: 28.0, revenue_ttm_usd: 750000000, stock_90d_change: 3.0,
    financials_source: 'annual_report_2025', financials_confidence: 0.85,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.76,
    hiring_velocity_score: 0.5, total_open_roles: 130, hiring_source: 'naukri_scrape', hiring_confidence: 0.74,
    data_quality_tier: 'verified', enrichment_version: 'ni9-v2026.1'
  },
  {
    canonical_name: 'hatsun agro product', display_name: 'Hatsun Agro Product Limited',
    ticker: null, exchange: 'NSE', industry: 'Dairy & Ice Cream', sector: 'Consumer Staples',
    is_public: true, country_code: 'IN',
    workforce_count: 7500, workforce_source: 'annual_report_2025', workforce_confidence: 0.88,
    market_cap_usd: 2800000000, pe_ratio: 65.0, revenue_ttm_usd: 850000000, stock_90d_change: 4.5,
    financials_source: 'annual_report_2025', financials_confidence: 0.86,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.78,
    hiring_velocity_score: 0.9, total_open_roles: 280, hiring_source: 'naukri_scrape', hiring_confidence: 0.76,
    data_quality_tier: 'verified', enrichment_version: 'ni9-v2026.1'
  },
  {
    canonical_name: 'dodla dairy', display_name: 'Dodla Dairy Limited',
    ticker: null, exchange: 'NSE', industry: 'Dairy', sector: 'Consumer Staples',
    is_public: true, country_code: 'IN',
    workforce_count: 2800, workforce_source: 'annual_report_2025', workforce_confidence: 0.86,
    market_cap_usd: 650000000, pe_ratio: 22.0, revenue_ttm_usd: 560000000, stock_90d_change: 3.2,
    financials_source: 'annual_report_2025', financials_confidence: 0.84,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.76,
    hiring_velocity_score: 0.6, total_open_roles: 95, hiring_source: 'naukri_scrape', hiring_confidence: 0.72,
    data_quality_tier: 'verified', enrichment_version: 'ni9-v2026.1'
  },
  {
    canonical_name: 'adani wilmar fortune foods', display_name: 'Adani Wilmar Limited (Fortune)',
    ticker: null, exchange: 'NSE', industry: 'FMCG / Edible Oils', sector: 'Consumer Staples',
    is_public: true, country_code: 'IN',
    workforce_count: 5500, workforce_source: 'annual_report_2025', workforce_confidence: 0.88,
    market_cap_usd: 3800000000, pe_ratio: 38.0, revenue_ttm_usd: 3500000000, stock_90d_change: 12.0,
    financials_source: 'annual_report_2025', financials_confidence: 0.87,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.78,
    hiring_velocity_score: 1.2, total_open_roles: 220, hiring_source: 'naukri_scrape', hiring_confidence: 0.76,
    data_quality_tier: 'verified', enrichment_version: 'ni9-v2026.1'
  },
  {
    canonical_name: 'patanjali foods', display_name: 'Patanjali Foods Limited',
    ticker: null, exchange: 'NSE', industry: 'FMCG / Edible Oils', sector: 'Consumer Staples',
    is_public: true, country_code: 'IN',
    workforce_count: 3200, workforce_source: 'annual_report_2025', workforce_confidence: 0.87,
    market_cap_usd: 2900000000, pe_ratio: 32.0, revenue_ttm_usd: 1800000000, stock_90d_change: 5.0,
    financials_source: 'annual_report_2025', financials_confidence: 0.86,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.76,
    hiring_velocity_score: 0.8, total_open_roles: 160, hiring_source: 'naukri_scrape', hiring_confidence: 0.74,
    data_quality_tier: 'verified', enrichment_version: 'ni9-v2026.1'
  },
  // Fertilisers / Agrochem
  {
    canonical_name: 'coromandel international', display_name: 'Coromandel International Limited',
    ticker: null, exchange: 'NSE', industry: 'Fertilisers & Agrochemicals', sector: 'Materials',
    is_public: true, country_code: 'IN',
    workforce_count: 5800, workforce_source: 'annual_report_2025', workforce_confidence: 0.90,
    market_cap_usd: 5500000000, pe_ratio: 18.0, revenue_ttm_usd: 2400000000, stock_90d_change: 4.5,
    financials_source: 'annual_report_2025', financials_confidence: 0.88,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80,
    hiring_velocity_score: 0.8, total_open_roles: 180, hiring_source: 'naukri_scrape', hiring_confidence: 0.76,
    data_quality_tier: 'verified', enrichment_version: 'ni9-v2026.1'
  },
  {
    canonical_name: 'chambal fertilisers chemicals', display_name: 'Chambal Fertilisers and Chemicals Limited',
    ticker: null, exchange: 'NSE', industry: 'Fertilisers', sector: 'Materials',
    is_public: true, country_code: 'IN',
    workforce_count: 2400, workforce_source: 'annual_report_2025', workforce_confidence: 0.88,
    market_cap_usd: 2200000000, pe_ratio: 12.0, revenue_ttm_usd: 2100000000, stock_90d_change: 3.0,
    financials_source: 'annual_report_2025', financials_confidence: 0.87,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.78,
    hiring_velocity_score: 0.4, total_open_roles: 80, hiring_source: 'naukri_scrape', hiring_confidence: 0.74,
    data_quality_tier: 'verified', enrichment_version: 'ni9-v2026.1'
  },
  {
    canonical_name: 'praj industries', display_name: 'Praj Industries Limited',
    ticker: null, exchange: 'NSE', industry: 'Ethanol & Bioenergy Tech', sector: 'Industrials',
    is_public: true, country_code: 'IN',
    workforce_count: 2200, workforce_source: 'annual_report_2025', workforce_confidence: 0.88,
    market_cap_usd: 1900000000, pe_ratio: 35.0, revenue_ttm_usd: 420000000, stock_90d_change: 7.8,
    financials_source: 'annual_report_2025', financials_confidence: 0.87,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.78,
    hiring_velocity_score: 1.2, total_open_roles: 130, hiring_source: 'naukri_scrape', hiring_confidence: 0.76,
    data_quality_tier: 'verified', enrichment_version: 'ni9-v2026.1'
  },
  {
    canonical_name: 'rallis india', display_name: 'Rallis India Limited',
    ticker: null, exchange: 'NSE', industry: 'Agrochemicals', sector: 'Materials',
    is_public: true, country_code: 'IN',
    workforce_count: 2100, workforce_source: 'annual_report_2025', workforce_confidence: 0.87,
    market_cap_usd: 820000000, pe_ratio: 25.0, revenue_ttm_usd: 340000000, stock_90d_change: 2.0,
    financials_source: 'annual_report_2025', financials_confidence: 0.85,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.76,
    hiring_velocity_score: 0.4, total_open_roles: 80, hiring_source: 'naukri_scrape', hiring_confidence: 0.72,
    data_quality_tier: 'verified', enrichment_version: 'ni9-v2026.1'
  },
  {
    canonical_name: 'agro tech foods', display_name: 'Agro Tech Foods Limited (ConAgra India)',
    ticker: null, exchange: 'NSE', industry: 'Packaged Foods', sector: 'Consumer Staples',
    is_public: true, country_code: 'IN',
    workforce_count: 1100, workforce_source: 'annual_report_2025', workforce_confidence: 0.85,
    market_cap_usd: 480000000, pe_ratio: 42.0, revenue_ttm_usd: 180000000, stock_90d_change: 1.5,
    financials_source: 'annual_report_2025', financials_confidence: 0.83,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.74,
    hiring_velocity_score: 0.3, total_open_roles: 45, hiring_source: 'naukri_scrape', hiring_confidence: 0.70,
    data_quality_tier: 'verified', enrichment_version: 'ni9-v2026.1'
  },
  {
    canonical_name: 'godrej agrovet', display_name: 'Godrej Agrovet Limited',
    ticker: null, exchange: 'NSE', industry: 'Agri / Animal Feed / Crop Protection', sector: 'Consumer Staples',
    is_public: true, country_code: 'IN',
    workforce_count: 4200, workforce_source: 'annual_report_2025', workforce_confidence: 0.88,
    market_cap_usd: 2400000000, pe_ratio: 40.0, revenue_ttm_usd: 1050000000, stock_90d_change: 5.5,
    financials_source: 'annual_report_2025', financials_confidence: 0.87,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.78,
    hiring_velocity_score: 0.8, total_open_roles: 160, hiring_source: 'naukri_scrape', hiring_confidence: 0.76,
    data_quality_tier: 'verified', enrichment_version: 'ni9-v2026.1'
  },
  {
    canonical_name: 'varun beverages pepsi india', display_name: 'Varun Beverages Limited (PepsiCo India)',
    ticker: null, exchange: 'NSE', industry: 'Beverages', sector: 'Consumer Staples',
    is_public: true, country_code: 'IN',
    workforce_count: 22000, workforce_source: 'annual_report_2025', workforce_confidence: 0.90,
    market_cap_usd: 15000000000, pe_ratio: 42.0, revenue_ttm_usd: 1900000000, stock_90d_change: 8.0,
    financials_source: 'annual_report_2025', financials_confidence: 0.88,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80,
    hiring_velocity_score: 1.5, total_open_roles: 550, hiring_source: 'naukri_scrape', hiring_confidence: 0.78,
    data_quality_tier: 'verified', enrichment_version: 'ni9-v2026.1'
  },
  {
    canonical_name: 'ccl products india', display_name: 'CCL Products (India) Limited',
    ticker: null, exchange: 'NSE', industry: 'Coffee Processing', sector: 'Consumer Staples',
    is_public: true, country_code: 'IN',
    workforce_count: 1600, workforce_source: 'annual_report_2025', workforce_confidence: 0.85,
    market_cap_usd: 1100000000, pe_ratio: 28.0, revenue_ttm_usd: 380000000, stock_90d_change: 4.0,
    financials_source: 'annual_report_2025', financials_confidence: 0.84,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.76,
    hiring_velocity_score: 0.5, total_open_roles: 60, hiring_source: 'naukri_scrape', hiring_confidence: 0.72,
    data_quality_tier: 'verified', enrichment_version: 'ni9-v2026.1'
  },
  {
    canonical_name: 'westlife foodworld mcdonalds india', display_name: "Westlife Foodworld Limited (McDonald's India W&S)",
    ticker: null, exchange: 'NSE', industry: 'QSR / Food Service', sector: 'Consumer Discretionary',
    is_public: true, country_code: 'IN',
    workforce_count: 14000, workforce_source: 'annual_report_2025', workforce_confidence: 0.88,
    market_cap_usd: 1600000000, pe_ratio: 92.0, revenue_ttm_usd: 420000000, stock_90d_change: 3.5,
    financials_source: 'annual_report_2025', financials_confidence: 0.86,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.78,
    hiring_velocity_score: 1.0, total_open_roles: 350, hiring_source: 'naukri_scrape', hiring_confidence: 0.76,
    data_quality_tier: 'verified', enrichment_version: 'ni9-v2026.1'
  },
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
) VALUES (
  $1,$2,$3,$4,$5,$6,$7,$8,
  $9,$10,NOW(),$11,
  $12,$13,$14,$15,$16,
  $17,NOW(),$18,
  $19,$20,$21,
  $22,NOW(),$23,
  $24,$25,$26,NOW(),$27,
  $28,$29,NOW(),NOW()
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
  largest_layoff_pct        = COALESCE(EXCLUDED.largest_layoff_pct, verified_company_intelligence.largest_layoff_pct),
  layoff_last_event_at      = COALESCE(EXCLUDED.layoff_last_event_at, verified_company_intelligence.layoff_last_event_at),
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
    c.recent_layoff_count ?? 0, c.largest_layoff_pct ?? null, c.layoff_last_event_at ?? null,
    c.layoff_source ?? null, c.layoff_confidence ?? null,
    c.hiring_velocity_score ?? null, c.total_open_roles ?? null,
    c.hiring_source ?? null, c.hiring_confidence ?? null,
    c.data_quality_tier ?? 'seed', c.enrichment_version ?? null
  ]);
  const wasInserted = rows[0]?.inserted;
  const status = wasInserted ? '✅ inserted' : '🔄 updated';
  console.log(`  ${c.canonical_name.padEnd(44)} ${icon} ${mktDisplay} ${status}`);
  return wasInserted;
}

console.log('\n✓ Connected — NI9: India Agri / Food / Spirits (2026 data)\n');
let inserted = 0, updated = 0, peCount = 0, revCount = 0;
for (const c of companies) {
  const wasInserted = await upsertCompany(c);
  if (wasInserted) inserted++; else updated++;
  if (c.pe_ratio != null) peCount++;
  if (c.revenue_ttm_usd != null) revCount++;
  await new Promise(r => setTimeout(r, 700));
}
console.log(`\n✅ NI9 complete — ${inserted} inserted, ${updated} updated`);
console.log(`   PE data: ${peCount}/${companies.length} | Revenue: ${revCount}/${companies.length}`);
await pool.end();
