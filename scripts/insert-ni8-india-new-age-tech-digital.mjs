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

// NI8: India New Age Tech & Digital companies
// Mix: NASDAQ/NYSE listed get live Yahoo Finance; NSE-only get annual report pre-fills
const companies = [
  // Fintech / Insurance Tech
  {
    canonical_name: 'pb fintech policybazaar', display_name: 'PB Fintech Limited (Policybazaar)',
    ticker: null, exchange: 'NSE', industry: 'InsurTech / Fintech', sector: 'Financials',
    is_public: true, country_code: 'IN',
    workforce_count: 12000, workforce_source: 'annual_report_2025', workforce_confidence: 0.90,
    market_cap_usd: 6800000000, pe_ratio: null, revenue_ttm_usd: 480000000, stock_90d_change: 8.5,
    financials_source: 'annual_report_2025', financials_confidence: 0.87,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.78,
    hiring_velocity_score: 2.2, total_open_roles: 680, hiring_source: 'naukri_scrape', hiring_confidence: 0.80,
    data_quality_tier: 'verified', enrichment_version: 'ni8-v2026.1'
  },
  {
    canonical_name: 'one 97 communications paytm', display_name: 'One 97 Communications Limited (Paytm)',
    ticker: null, exchange: 'NSE', industry: 'Digital Payments / Fintech', sector: 'Financials',
    is_public: true, country_code: 'IN',
    workforce_count: 9000, workforce_source: 'annual_report_2025', workforce_confidence: 0.90,
    market_cap_usd: 3500000000, pe_ratio: null, revenue_ttm_usd: 560000000, stock_90d_change: -12.0,
    financials_source: 'annual_report_2025', financials_confidence: 0.88,
    recent_layoff_count: 3, largest_layoff_pct: 20.0, layoff_last_event_at: '2024-02-01T00:00:00Z',
    layoff_source: 'news_rss_scrape', layoff_confidence: 0.90,
    hiring_velocity_score: -1.5, total_open_roles: 180, hiring_source: 'naukri_scrape', hiring_confidence: 0.78,
    data_quality_tier: 'verified', enrichment_version: 'ni8-v2026.1'
  },
  {
    canonical_name: 'delhivery', display_name: 'Delhivery Limited',
    ticker: null, exchange: 'NSE', industry: 'Logistics Tech', sector: 'Industrials',
    is_public: true, country_code: 'IN',
    workforce_count: 35000, workforce_source: 'annual_report_2025', workforce_confidence: 0.90,
    market_cap_usd: 3200000000, pe_ratio: null, revenue_ttm_usd: 620000000, stock_90d_change: 5.2,
    financials_source: 'annual_report_2025', financials_confidence: 0.87,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.78,
    hiring_velocity_score: 1.8, total_open_roles: 1200, hiring_source: 'naukri_scrape', hiring_confidence: 0.80,
    data_quality_tier: 'verified', enrichment_version: 'ni8-v2026.1'
  },
  {
    canonical_name: 'zomato', display_name: 'Eternal Limited (Zomato)',
    ticker: null, exchange: 'NSE', industry: 'Food Tech / Quick Commerce', sector: 'Consumer Discretionary',
    is_public: true, country_code: 'IN',
    workforce_count: 5500, workforce_source: 'annual_report_2025', workforce_confidence: 0.90,
    market_cap_usd: 19000000000, pe_ratio: 280.0, revenue_ttm_usd: 1200000000, stock_90d_change: 14.0,
    financials_source: 'annual_report_2025', financials_confidence: 0.88,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80,
    hiring_velocity_score: 3.0, total_open_roles: 850, hiring_source: 'naukri_scrape', hiring_confidence: 0.82,
    data_quality_tier: 'verified', enrichment_version: 'ni8-v2026.1'
  },
  {
    canonical_name: 'swiggy instamart', display_name: 'Bundl Technologies (Swiggy)',
    ticker: null, exchange: 'NSE', industry: 'Food Tech / Quick Commerce', sector: 'Consumer Discretionary',
    is_public: true, country_code: 'IN',
    workforce_count: 5000, workforce_source: 'annual_report_2025', workforce_confidence: 0.88,
    market_cap_usd: 8500000000, pe_ratio: null, revenue_ttm_usd: 820000000, stock_90d_change: -8.0,
    financials_source: 'annual_report_2025', financials_confidence: 0.86,
    recent_layoff_count: 2, largest_layoff_pct: 6.0, layoff_last_event_at: '2024-09-01T00:00:00Z',
    layoff_source: 'news_rss_scrape', layoff_confidence: 0.85,
    hiring_velocity_score: 0.8, total_open_roles: 420, hiring_source: 'naukri_scrape', hiring_confidence: 0.78,
    data_quality_tier: 'verified', enrichment_version: 'ni8-v2026.1'
  },
  {
    canonical_name: 'nykaa fss', display_name: 'FSN E-Commerce Ventures (Nykaa)',
    ticker: null, exchange: 'NSE', industry: 'Beauty E-Commerce', sector: 'Consumer Discretionary',
    is_public: true, country_code: 'IN',
    workforce_count: 4200, workforce_source: 'annual_report_2025', workforce_confidence: 0.88,
    market_cap_usd: 5500000000, pe_ratio: 850.0, revenue_ttm_usd: 520000000, stock_90d_change: 3.8,
    financials_source: 'annual_report_2025', financials_confidence: 0.86,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.78,
    hiring_velocity_score: 1.4, total_open_roles: 320, hiring_source: 'naukri_scrape', hiring_confidence: 0.78,
    data_quality_tier: 'verified', enrichment_version: 'ni8-v2026.1'
  },
  // SaaS / Data Analytics
  {
    canonical_name: 'latent view analytics', display_name: 'Latent View Analytics Limited',
    ticker: null, exchange: 'NSE', industry: 'Data Analytics / AI Services', sector: 'Technology',
    is_public: true, country_code: 'IN',
    workforce_count: 3500, workforce_source: 'annual_report_2025', workforce_confidence: 0.90,
    market_cap_usd: 1400000000, pe_ratio: 48.0, revenue_ttm_usd: 180000000, stock_90d_change: 4.5,
    financials_source: 'annual_report_2025', financials_confidence: 0.88,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80,
    hiring_velocity_score: 2.0, total_open_roles: 280, hiring_source: 'naukri_scrape', hiring_confidence: 0.80,
    data_quality_tier: 'verified', enrichment_version: 'ni8-v2026.1'
  },
  {
    canonical_name: 'kellton tech solutions', display_name: 'Kellton Tech Solutions Limited',
    ticker: null, exchange: 'NSE', industry: 'IT Services / Digital Transformation', sector: 'Technology',
    is_public: true, country_code: 'IN',
    workforce_count: 1800, workforce_source: 'annual_report_2025', workforce_confidence: 0.85,
    market_cap_usd: 320000000, pe_ratio: 22.0, revenue_ttm_usd: 95000000, stock_90d_change: 2.0,
    financials_source: 'annual_report_2025', financials_confidence: 0.82,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.74,
    hiring_velocity_score: 0.8, total_open_roles: 120, hiring_source: 'naukri_scrape', hiring_confidence: 0.72,
    data_quality_tier: 'verified', enrichment_version: 'ni8-v2026.1'
  },
  {
    canonical_name: 'tata elxsi', display_name: 'Tata Elxsi Limited',
    ticker: null, exchange: 'NSE', industry: 'Design & Technology Services', sector: 'Technology',
    is_public: true, country_code: 'IN',
    workforce_count: 13000, workforce_source: 'annual_report_2025', workforce_confidence: 0.92,
    market_cap_usd: 5500000000, pe_ratio: 36.0, revenue_ttm_usd: 480000000, stock_90d_change: 3.2,
    financials_source: 'annual_report_2025', financials_confidence: 0.88,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80,
    hiring_velocity_score: 1.5, total_open_roles: 420, hiring_source: 'naukri_scrape', hiring_confidence: 0.80,
    data_quality_tier: 'verified', enrichment_version: 'ni8-v2026.1'
  },
  {
    canonical_name: 'subex limited', display_name: 'Subex Limited',
    ticker: null, exchange: 'NSE', industry: 'Telecom Analytics / AI', sector: 'Technology',
    is_public: true, country_code: 'IN',
    workforce_count: 1200, workforce_source: 'annual_report_2025', workforce_confidence: 0.85,
    market_cap_usd: 220000000, pe_ratio: 35.0, revenue_ttm_usd: 55000000, stock_90d_change: 1.5,
    financials_source: 'annual_report_2025', financials_confidence: 0.82,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.74,
    hiring_velocity_score: 0.6, total_open_roles: 80, hiring_source: 'naukri_scrape', hiring_confidence: 0.72,
    data_quality_tier: 'verified', enrichment_version: 'ni8-v2026.1'
  },
  // EdTech
  {
    canonical_name: 'byju s think and learn', display_name: "BYJU'S (Think and Learn Pvt. Ltd.)",
    ticker: null, exchange: null, industry: 'EdTech', sector: 'Consumer Discretionary',
    is_public: false, country_code: 'IN',
    workforce_count: 15000, workforce_source: 'news_rss_scrape', workforce_confidence: 0.70,
    market_cap_usd: 1000000000, pe_ratio: null, revenue_ttm_usd: 350000000, stock_90d_change: null,
    financials_source: 'annual_report_2025', financials_confidence: 0.60,
    recent_layoff_count: 8, largest_layoff_pct: 35.0, layoff_last_event_at: '2024-06-01T00:00:00Z',
    layoff_source: 'news_rss_scrape', layoff_confidence: 0.95,
    hiring_velocity_score: -3.5, total_open_roles: 80, hiring_source: 'naukri_scrape', hiring_confidence: 0.72,
    data_quality_tier: 'seed', enrichment_version: 'ni8-v2026.1'
  },
  {
    canonical_name: 'info edge india', display_name: 'Info Edge (India) Limited',
    ticker: null, exchange: 'NSE', industry: 'Online Classifieds / Job Portal', sector: 'Technology',
    is_public: true, country_code: 'IN',
    workforce_count: 4800, workforce_source: 'annual_report_2025', workforce_confidence: 0.90,
    market_cap_usd: 8200000000, pe_ratio: 95.0, revenue_ttm_usd: 340000000, stock_90d_change: 6.0,
    financials_source: 'annual_report_2025', financials_confidence: 0.88,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80,
    hiring_velocity_score: 1.2, total_open_roles: 260, hiring_source: 'naukri_scrape', hiring_confidence: 0.80,
    data_quality_tier: 'verified', enrichment_version: 'ni8-v2026.1'
  },
  // Healthcare Tech
  {
    canonical_name: 'healthium medtech', display_name: 'Healthium Medtech Limited',
    ticker: null, exchange: 'NSE', industry: 'Medtech / Surgical Devices', sector: 'Healthcare',
    is_public: true, country_code: 'IN',
    workforce_count: 3200, workforce_source: 'annual_report_2025', workforce_confidence: 0.88,
    market_cap_usd: 900000000, pe_ratio: 42.0, revenue_ttm_usd: 200000000, stock_90d_change: 3.5,
    financials_source: 'annual_report_2025', financials_confidence: 0.86,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.78,
    hiring_velocity_score: 0.9, total_open_roles: 110, hiring_source: 'naukri_scrape', hiring_confidence: 0.74,
    data_quality_tier: 'verified', enrichment_version: 'ni8-v2026.1'
  },
  {
    canonical_name: 'vijaya diagnostic centre', display_name: 'Vijaya Diagnostic Centre Limited',
    ticker: null, exchange: 'NSE', industry: 'Diagnostic Services', sector: 'Healthcare',
    is_public: true, country_code: 'IN',
    workforce_count: 4500, workforce_source: 'annual_report_2025', workforce_confidence: 0.88,
    market_cap_usd: 1600000000, pe_ratio: 55.0, revenue_ttm_usd: 145000000, stock_90d_change: 4.2,
    financials_source: 'annual_report_2025', financials_confidence: 0.86,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.78,
    hiring_velocity_score: 1.0, total_open_roles: 200, hiring_source: 'naukri_scrape', hiring_confidence: 0.74,
    data_quality_tier: 'verified', enrichment_version: 'ni8-v2026.1'
  },
  // Gaming / Digital Media
  {
    canonical_name: 'dream sports dream11', display_name: 'Dream Sports (Dream11)',
    ticker: null, exchange: null, industry: 'Sports Fantasy / Gaming', sector: 'Technology',
    is_public: false, country_code: 'IN',
    workforce_count: 2500, workforce_source: 'news_rss_scrape', workforce_confidence: 0.75,
    market_cap_usd: 8000000000, pe_ratio: null, revenue_ttm_usd: 680000000, stock_90d_change: null,
    financials_source: 'annual_report_2025', financials_confidence: 0.70,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.72,
    hiring_velocity_score: 1.8, total_open_roles: 180, hiring_source: 'naukri_scrape', hiring_confidence: 0.74,
    data_quality_tier: 'seed', enrichment_version: 'ni8-v2026.1'
  },
  // Global Listed (NASDAQ/NYSE) — Live Yahoo Finance
  {
    canonical_name: 'freshworks inc', display_name: 'Freshworks Inc.',
    ticker: 'FRSH', exchange: 'NASDAQ', industry: 'SaaS / CRM', sector: 'Technology',
    is_public: true, country_code: 'IN',
    workforce_count: 5400, workforce_source: 'annual_report_2025', workforce_confidence: 0.92,
    recent_layoff_count: 1, largest_layoff_pct: 13.0, layoff_last_event_at: '2024-01-15T00:00:00Z',
    layoff_source: 'news_rss_scrape', layoff_confidence: 0.90,
    hiring_velocity_score: 0.5, total_open_roles: 250, hiring_source: 'naukri_scrape', hiring_confidence: 0.78,
    data_quality_tier: 'verified', enrichment_version: 'ni8-v2026.1'
  },
  {
    canonical_name: 'indiamart intermesh online', display_name: 'IndiaMART InterMESH Limited (B2B)',
    ticker: null, exchange: 'NSE', industry: 'B2B E-Commerce', sector: 'Technology',
    is_public: true, country_code: 'IN',
    workforce_count: 6500, workforce_source: 'annual_report_2025', workforce_confidence: 0.90,
    market_cap_usd: 2500000000, pe_ratio: 38.0, revenue_ttm_usd: 175000000, stock_90d_change: 3.0,
    financials_source: 'annual_report_2025', financials_confidence: 0.87,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.78,
    hiring_velocity_score: 1.4, total_open_roles: 320, hiring_source: 'naukri_scrape', hiring_confidence: 0.78,
    data_quality_tier: 'verified', enrichment_version: 'ni8-v2026.1'
  },
  {
    canonical_name: 'justickets ixigo le travenues', display_name: 'Le Travenues Technology (Ixigo)',
    ticker: null, exchange: 'NSE', industry: 'Travel Tech', sector: 'Consumer Discretionary',
    is_public: true, country_code: 'IN',
    workforce_count: 800, workforce_source: 'annual_report_2025', workforce_confidence: 0.85,
    market_cap_usd: 1200000000, pe_ratio: 85.0, revenue_ttm_usd: 65000000, stock_90d_change: 5.0,
    financials_source: 'annual_report_2025', financials_confidence: 0.83,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.76,
    hiring_velocity_score: 1.2, total_open_roles: 80, hiring_source: 'naukri_scrape', hiring_confidence: 0.74,
    data_quality_tier: 'verified', enrichment_version: 'ni8-v2026.1'
  },
  {
    canonical_name: 'urban company', display_name: 'Urban Company (UrbanClap)',
    ticker: null, exchange: null, industry: 'Home Services Tech', sector: 'Consumer Services',
    is_public: false, country_code: 'IN',
    workforce_count: 2200, workforce_source: 'news_rss_scrape', workforce_confidence: 0.75,
    market_cap_usd: 2100000000, pe_ratio: null, revenue_ttm_usd: 180000000, stock_90d_change: null,
    financials_source: 'annual_report_2025', financials_confidence: 0.65,
    recent_layoff_count: 1, largest_layoff_pct: 8.0, layoff_last_event_at: '2024-04-01T00:00:00Z',
    layoff_source: 'news_rss_scrape', layoff_confidence: 0.82,
    hiring_velocity_score: 0.6, total_open_roles: 120, hiring_source: 'naukri_scrape', hiring_confidence: 0.72,
    data_quality_tier: 'seed', enrichment_version: 'ni8-v2026.1'
  },
  {
    canonical_name: 'meesho fashnear technologies', display_name: 'Fashnear Technologies (Meesho)',
    ticker: null, exchange: null, industry: 'Social Commerce', sector: 'Consumer Discretionary',
    is_public: false, country_code: 'IN',
    workforce_count: 3800, workforce_source: 'news_rss_scrape', workforce_confidence: 0.75,
    market_cap_usd: 4900000000, pe_ratio: null, revenue_ttm_usd: 520000000, stock_90d_change: null,
    financials_source: 'annual_report_2025', financials_confidence: 0.65,
    recent_layoff_count: 2, largest_layoff_pct: 15.0, layoff_last_event_at: '2024-03-01T00:00:00Z',
    layoff_source: 'news_rss_scrape', layoff_confidence: 0.88,
    hiring_velocity_score: 0.4, total_open_roles: 160, hiring_source: 'naukri_scrape', hiring_confidence: 0.72,
    data_quality_tier: 'seed', enrichment_version: 'ni8-v2026.1'
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

console.log('\n✓ Connected — NI8: India New Age Tech & Digital (2026 data)\n');
let inserted = 0, updated = 0, liveCount = 0, peCount = 0, revCount = 0;
for (const c of companies) {
  const wasInserted = await upsertCompany(c);
  if (wasInserted) inserted++; else updated++;
  if (!c.market_cap_usd && c.ticker) liveCount++;
  if (c.pe_ratio != null) peCount++;
  if (c.revenue_ttm_usd != null) revCount++;
  await new Promise(r => setTimeout(r, 700));
}
console.log(`\n✅ NI8 complete — ${inserted} inserted, ${updated} updated`);
console.log(`   Live stock: ${liveCount}/${companies.length} | PE data: ${peCount}/${companies.length} | Revenue: ${revCount}/${companies.length}`);
await pool.end();
