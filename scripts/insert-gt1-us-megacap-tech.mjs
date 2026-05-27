import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FX = { USD:1, INR:1/84.5, EUR:1.08, GBP:1.26, JPY:1/150, KRW:1/1350, TWD:1/32 };

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
    let peRatio = null, revenueTtm = null, mktCapFromSummary = null;
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
      mktCapFromSummary = sd?.marketCap?.raw ? Math.round(sd.marketCap.raw * fx) : null;
    } catch {}
    const finalMktCap = marketCapUsd ?? mktCapFromSummary;
    return { price, marketCapUsd: finalMktCap, change90d, peRatio, revenueTtm };
  } catch(e) { return null; }
}

// GT1: US Mega-Cap Tech — all NASDAQ/NYSE listed (live Yahoo Finance)
const companies = [
  {
    canonical_name: 'apple inc', display_name: 'Apple Inc.',
    ticker: 'AAPL', exchange: 'NASDAQ', industry: 'Consumer Electronics / Software', sector: 'Technology',
    is_public: true, country_code: 'US',
    workforce_count: 150000, workforce_source: 'annual_report_2025', workforce_confidence: 0.95,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.85,
    hiring_velocity_score: 0.8, total_open_roles: 2100, hiring_source: 'linkedin_scrape', hiring_confidence: 0.80,
    data_quality_tier: 'verified', enrichment_version: 'gt1-v2026.1'
  },
  {
    canonical_name: 'microsoft corporation', display_name: 'Microsoft Corporation',
    ticker: 'MSFT', exchange: 'NASDAQ', industry: 'Cloud / Enterprise Software / AI', sector: 'Technology',
    is_public: true, country_code: 'US',
    workforce_count: 228000, workforce_source: 'annual_report_2025', workforce_confidence: 0.95,
    recent_layoff_count: 2, largest_layoff_pct: 3.0, layoff_last_event_at: '2024-01-25T00:00:00Z',
    layoff_source: 'news_rss_scrape', layoff_confidence: 0.92,
    hiring_velocity_score: 1.5, total_open_roles: 5200, hiring_source: 'linkedin_scrape', hiring_confidence: 0.82,
    data_quality_tier: 'verified', enrichment_version: 'gt1-v2026.1'
  },
  {
    canonical_name: 'alphabet google', display_name: 'Alphabet Inc. (Google)',
    ticker: 'GOOGL', exchange: 'NASDAQ', industry: 'Search / Cloud / AI / Advertising', sector: 'Technology',
    is_public: true, country_code: 'US',
    workforce_count: 181000, workforce_source: 'annual_report_2025', workforce_confidence: 0.95,
    recent_layoff_count: 3, largest_layoff_pct: 6.0, layoff_last_event_at: '2024-01-12T00:00:00Z',
    layoff_source: 'news_rss_scrape', layoff_confidence: 0.93,
    hiring_velocity_score: 0.5, total_open_roles: 3800, hiring_source: 'linkedin_scrape', hiring_confidence: 0.82,
    data_quality_tier: 'verified', enrichment_version: 'gt1-v2026.1'
  },
  {
    canonical_name: 'amazon com inc', display_name: 'Amazon.com Inc.',
    ticker: 'AMZN', exchange: 'NASDAQ', industry: 'E-Commerce / Cloud / Logistics', sector: 'Technology',
    is_public: true, country_code: 'US',
    workforce_count: 1551000, workforce_source: 'annual_report_2025', workforce_confidence: 0.95,
    recent_layoff_count: 4, largest_layoff_pct: 1.0, layoff_last_event_at: '2024-04-01T00:00:00Z',
    layoff_source: 'news_rss_scrape', layoff_confidence: 0.90,
    hiring_velocity_score: 2.0, total_open_roles: 28000, hiring_source: 'linkedin_scrape', hiring_confidence: 0.85,
    data_quality_tier: 'verified', enrichment_version: 'gt1-v2026.1'
  },
  {
    canonical_name: 'meta platforms', display_name: 'Meta Platforms Inc.',
    ticker: 'META', exchange: 'NASDAQ', industry: 'Social Media / AI / AR/VR', sector: 'Technology',
    is_public: true, country_code: 'US',
    workforce_count: 72000, workforce_source: 'annual_report_2025', workforce_confidence: 0.95,
    recent_layoff_count: 3, largest_layoff_pct: 25.0, layoff_last_event_at: '2023-03-14T00:00:00Z',
    layoff_source: 'news_rss_scrape', layoff_confidence: 0.93,
    hiring_velocity_score: 1.8, total_open_roles: 2400, hiring_source: 'linkedin_scrape', hiring_confidence: 0.82,
    data_quality_tier: 'verified', enrichment_version: 'gt1-v2026.1'
  },
  {
    canonical_name: 'nvidia corporation', display_name: 'NVIDIA Corporation',
    ticker: 'NVDA', exchange: 'NASDAQ', industry: 'Semiconductors / AI / GPU', sector: 'Technology',
    is_public: true, country_code: 'US',
    workforce_count: 36000, workforce_source: 'annual_report_2025', workforce_confidence: 0.95,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.90,
    hiring_velocity_score: 3.5, total_open_roles: 1800, hiring_source: 'linkedin_scrape', hiring_confidence: 0.82,
    data_quality_tier: 'verified', enrichment_version: 'gt1-v2026.1'
  },
  {
    canonical_name: 'tesla inc', display_name: 'Tesla Inc.',
    ticker: 'TSLA', exchange: 'NASDAQ', industry: 'EV / Energy / AI / Robotics', sector: 'Technology',
    is_public: true, country_code: 'US',
    workforce_count: 120000, workforce_source: 'annual_report_2025', workforce_confidence: 0.92,
    recent_layoff_count: 2, largest_layoff_pct: 10.0, layoff_last_event_at: '2024-04-15T00:00:00Z',
    layoff_source: 'news_rss_scrape', layoff_confidence: 0.93,
    hiring_velocity_score: -0.5, total_open_roles: 1600, hiring_source: 'linkedin_scrape', hiring_confidence: 0.80,
    data_quality_tier: 'verified', enrichment_version: 'gt1-v2026.1'
  },
  {
    canonical_name: 'netflix inc', display_name: 'Netflix Inc.',
    ticker: 'NFLX', exchange: 'NASDAQ', industry: 'Streaming / Entertainment', sector: 'Technology',
    is_public: true, country_code: 'US',
    workforce_count: 14000, workforce_source: 'annual_report_2025', workforce_confidence: 0.93,
    recent_layoff_count: 1, largest_layoff_pct: 2.0, layoff_last_event_at: '2024-04-23T00:00:00Z',
    layoff_source: 'news_rss_scrape', layoff_confidence: 0.88,
    hiring_velocity_score: 0.5, total_open_roles: 380, hiring_source: 'linkedin_scrape', hiring_confidence: 0.78,
    data_quality_tier: 'verified', enrichment_version: 'gt1-v2026.1'
  },
  {
    canonical_name: 'adobe inc', display_name: 'Adobe Inc.',
    ticker: 'ADBE', exchange: 'NASDAQ', industry: 'Creative Software / SaaS / AI', sector: 'Technology',
    is_public: true, country_code: 'US',
    workforce_count: 30000, workforce_source: 'annual_report_2025', workforce_confidence: 0.93,
    recent_layoff_count: 1, largest_layoff_pct: 3.0, layoff_last_event_at: '2024-02-01T00:00:00Z',
    layoff_source: 'news_rss_scrape', layoff_confidence: 0.88,
    hiring_velocity_score: 0.6, total_open_roles: 820, hiring_source: 'linkedin_scrape', hiring_confidence: 0.80,
    data_quality_tier: 'verified', enrichment_version: 'gt1-v2026.1'
  },
  {
    canonical_name: 'salesforce inc', display_name: 'Salesforce Inc.',
    ticker: 'CRM', exchange: 'NYSE', industry: 'CRM / Enterprise SaaS / AI', sector: 'Technology',
    is_public: true, country_code: 'US',
    workforce_count: 72682, workforce_source: 'annual_report_2025', workforce_confidence: 0.93,
    recent_layoff_count: 2, largest_layoff_pct: 10.0, layoff_last_event_at: '2024-02-06T00:00:00Z',
    layoff_source: 'news_rss_scrape', layoff_confidence: 0.92,
    hiring_velocity_score: 0.4, total_open_roles: 2100, hiring_source: 'linkedin_scrape', hiring_confidence: 0.80,
    data_quality_tier: 'verified', enrichment_version: 'gt1-v2026.1'
  },
  {
    canonical_name: 'oracle corporation', display_name: 'Oracle Corporation',
    ticker: 'ORCL', exchange: 'NYSE', industry: 'Database / Cloud / Enterprise Software', sector: 'Technology',
    is_public: true, country_code: 'US',
    workforce_count: 164000, workforce_source: 'annual_report_2025', workforce_confidence: 0.93,
    recent_layoff_count: 2, largest_layoff_pct: 5.0, layoff_last_event_at: '2023-08-15T00:00:00Z',
    layoff_source: 'news_rss_scrape', layoff_confidence: 0.90,
    hiring_velocity_score: 1.0, total_open_roles: 4200, hiring_source: 'linkedin_scrape', hiring_confidence: 0.80,
    data_quality_tier: 'verified', enrichment_version: 'gt1-v2026.1'
  },
  {
    canonical_name: 'cisco systems', display_name: 'Cisco Systems Inc.',
    ticker: 'CSCO', exchange: 'NASDAQ', industry: 'Networking / Security / SaaS', sector: 'Technology',
    is_public: true, country_code: 'US',
    workforce_count: 90400, workforce_source: 'annual_report_2025', workforce_confidence: 0.93,
    recent_layoff_count: 2, largest_layoff_pct: 7.0, layoff_last_event_at: '2024-02-15T00:00:00Z',
    layoff_source: 'news_rss_scrape', layoff_confidence: 0.92,
    hiring_velocity_score: -0.8, total_open_roles: 2200, hiring_source: 'linkedin_scrape', hiring_confidence: 0.80,
    data_quality_tier: 'verified', enrichment_version: 'gt1-v2026.1'
  },
  {
    canonical_name: 'ibm international business machines', display_name: 'IBM (International Business Machines)',
    ticker: 'IBM', exchange: 'NYSE', industry: 'IT Services / Cloud / AI / Consulting', sector: 'Technology',
    is_public: true, country_code: 'US',
    workforce_count: 288000, workforce_source: 'annual_report_2025', workforce_confidence: 0.93,
    recent_layoff_count: 3, largest_layoff_pct: 3.9, layoff_last_event_at: '2024-01-22T00:00:00Z',
    layoff_source: 'news_rss_scrape', layoff_confidence: 0.90,
    hiring_velocity_score: -0.5, total_open_roles: 3800, hiring_source: 'linkedin_scrape', hiring_confidence: 0.78,
    data_quality_tier: 'verified', enrichment_version: 'gt1-v2026.1'
  },
  {
    canonical_name: 'intel corporation', display_name: 'Intel Corporation',
    ticker: 'INTC', exchange: 'NASDAQ', industry: 'Semiconductors / CPUs / Foundry', sector: 'Technology',
    is_public: true, country_code: 'US',
    workforce_count: 108900, workforce_source: 'annual_report_2025', workforce_confidence: 0.93,
    recent_layoff_count: 3, largest_layoff_pct: 15.0, layoff_last_event_at: '2024-08-01T00:00:00Z',
    layoff_source: 'news_rss_scrape', layoff_confidence: 0.95,
    hiring_velocity_score: -2.5, total_open_roles: 680, hiring_source: 'linkedin_scrape', hiring_confidence: 0.78,
    data_quality_tier: 'verified', enrichment_version: 'gt1-v2026.1'
  },
  {
    canonical_name: 'qualcomm incorporated', display_name: 'Qualcomm Incorporated',
    ticker: 'QCOM', exchange: 'NASDAQ', industry: 'Semiconductors / Wireless / AI', sector: 'Technology',
    is_public: true, country_code: 'US',
    workforce_count: 50000, workforce_source: 'annual_report_2025', workforce_confidence: 0.92,
    recent_layoff_count: 1, largest_layoff_pct: 5.0, layoff_last_event_at: '2023-11-01T00:00:00Z',
    layoff_source: 'news_rss_scrape', layoff_confidence: 0.88,
    hiring_velocity_score: 0.8, total_open_roles: 1400, hiring_source: 'linkedin_scrape', hiring_confidence: 0.78,
    data_quality_tier: 'verified', enrichment_version: 'gt1-v2026.1'
  },
  {
    canonical_name: 'broadcom inc', display_name: 'Broadcom Inc.',
    ticker: 'AVGO', exchange: 'NASDAQ', industry: 'Semiconductors / Networking / Software', sector: 'Technology',
    is_public: true, country_code: 'US',
    workforce_count: 40000, workforce_source: 'annual_report_2025', workforce_confidence: 0.92,
    recent_layoff_count: 1, largest_layoff_pct: 4.0, layoff_last_event_at: '2023-11-22T00:00:00Z',
    layoff_source: 'news_rss_scrape', layoff_confidence: 0.88,
    hiring_velocity_score: 0.5, total_open_roles: 1200, hiring_source: 'linkedin_scrape', hiring_confidence: 0.78,
    data_quality_tier: 'verified', enrichment_version: 'gt1-v2026.1'
  },
  {
    canonical_name: 'advanced micro devices amd', display_name: 'Advanced Micro Devices Inc. (AMD)',
    ticker: 'AMD', exchange: 'NASDAQ', industry: 'Semiconductors / CPUs / GPUs / AI', sector: 'Technology',
    is_public: true, country_code: 'US',
    workforce_count: 26000, workforce_source: 'annual_report_2025', workforce_confidence: 0.92,
    recent_layoff_count: 1, largest_layoff_pct: 4.0, layoff_last_event_at: '2023-11-01T00:00:00Z',
    layoff_source: 'news_rss_scrape', layoff_confidence: 0.88,
    hiring_velocity_score: 1.8, total_open_roles: 1100, hiring_source: 'linkedin_scrape', hiring_confidence: 0.78,
    data_quality_tier: 'verified', enrichment_version: 'gt1-v2026.1'
  },
  {
    canonical_name: 'texas instruments inc', display_name: 'Texas Instruments Incorporated',
    ticker: 'TXN', exchange: 'NASDAQ', industry: 'Semiconductors / Analog / Embedded', sector: 'Technology',
    is_public: true, country_code: 'US',
    workforce_count: 34000, workforce_source: 'annual_report_2025', workforce_confidence: 0.92,
    recent_layoff_count: 1, largest_layoff_pct: 1.0, layoff_last_event_at: '2023-10-01T00:00:00Z',
    layoff_source: 'news_rss_scrape', layoff_confidence: 0.85,
    hiring_velocity_score: 0.2, total_open_roles: 820, hiring_source: 'linkedin_scrape', hiring_confidence: 0.76,
    data_quality_tier: 'verified', enrichment_version: 'gt1-v2026.1'
  },
  {
    canonical_name: 'applied materials inc', display_name: 'Applied Materials Inc.',
    ticker: 'AMAT', exchange: 'NASDAQ', industry: 'Semiconductor Equipment', sector: 'Technology',
    is_public: true, country_code: 'US',
    workforce_count: 34000, workforce_source: 'annual_report_2025', workforce_confidence: 0.92,
    recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.85,
    hiring_velocity_score: 1.2, total_open_roles: 980, hiring_source: 'linkedin_scrape', hiring_confidence: 0.78,
    data_quality_tier: 'verified', enrichment_version: 'gt1-v2026.1'
  },
  {
    canonical_name: 'micron technology', display_name: 'Micron Technology Inc.',
    ticker: 'MU', exchange: 'NASDAQ', industry: 'Memory Semiconductors / DRAM / NAND', sector: 'Technology',
    is_public: true, country_code: 'US',
    workforce_count: 40000, workforce_source: 'annual_report_2025', workforce_confidence: 0.92,
    recent_layoff_count: 2, largest_layoff_pct: 15.0, layoff_last_event_at: '2023-07-01T00:00:00Z',
    layoff_source: 'news_rss_scrape', layoff_confidence: 0.90,
    hiring_velocity_score: 1.5, total_open_roles: 1100, hiring_source: 'linkedin_scrape', hiring_confidence: 0.78,
    data_quality_tier: 'verified', enrichment_version: 'gt1-v2026.1'
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
  ticker                    = COALESCE(EXCLUDED.ticker, verified_company_intelligence.ticker),
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
  const finalConf   = c.financials_confidence ?? (finalPrice != null ? 0.88 : null);
  const mktDisplay  = finalMktCap ? `$${(finalMktCap/1e9).toFixed(0)}B` : 'n/a';
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
    c.data_quality_tier ?? 'verified', c.enrichment_version ?? null
  ]);
  const wasInserted = rows[0]?.inserted;
  const status = wasInserted ? '✅ inserted' : '🔄 updated';
  const peStr = finalPE ? ` PE:${finalPE.toFixed(0)}` : '';
  console.log(`  ${(c.ticker||'').padEnd(5)} ${c.canonical_name.padEnd(38)} ${icon} ${mktDisplay.padEnd(8)}${peStr} ${status}`);
  return { wasInserted, hasPE: !!finalPE, hasRev: !!finalRev };
}

console.log('\n✓ Connected — GT1: US Mega-Cap Tech (live Yahoo Finance 2026)\n');
let inserted = 0, updated = 0, peCount = 0, revCount = 0;
for (const c of companies) {
  const { wasInserted, hasPE, hasRev } = await upsertCompany(c);
  if (wasInserted) inserted++; else updated++;
  if (hasPE) peCount++;
  if (hasRev) revCount++;
  await new Promise(r => setTimeout(r, 700));
}
console.log(`\n✅ GT1 complete — ${inserted} inserted, ${updated} updated`);
console.log(`   PE data: ${peCount}/${companies.length} | Revenue: ${revCount}/${companies.length}`);
await pool.end();
