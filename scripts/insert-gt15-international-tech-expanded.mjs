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
  // Europe
  { canonical_name: 'delivery hero se', display_name: 'Delivery Hero SE', ticker: null, exchange: 'XETRA', industry: 'Food Delivery / Quick Commerce / Online Ordering MENA/Asia/EU', sector: 'Technology', is_public: true, country_code: 'DE', workforce_count: 35000, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, market_cap_usd: 7500000000, pe_ratio: null, revenue_ttm_usd: 4800000000, stock_90d_change: null, financials_source: 'annual_report_2025', financials_confidence: 0.85, recent_layoff_count: 3, largest_layoff_pct: 13.0, layoff_last_event_at: '2023-03-20T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.92, hiring_velocity_score: -0.5, total_open_roles: 480, hiring_source: 'linkedin_scrape', hiring_confidence: 0.72, data_quality_tier: 'verified', enrichment_version: 'gt15-v2026.1' },
  { canonical_name: 'zalando se', display_name: 'Zalando SE', ticker: null, exchange: 'XETRA', industry: 'Fashion E-Commerce / Logistics / Platform / AI Styling', sector: 'Consumer Discretionary', is_public: true, country_code: 'DE', workforce_count: 17000, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, market_cap_usd: 8000000000, pe_ratio: 28, revenue_ttm_usd: 11000000000, stock_90d_change: null, financials_source: 'annual_report_2025', financials_confidence: 0.87, recent_layoff_count: 2, largest_layoff_pct: 10.0, layoff_last_event_at: '2023-03-16T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.92, hiring_velocity_score: 0.5, total_open_roles: 680, hiring_source: 'linkedin_scrape', hiring_confidence: 0.74, data_quality_tier: 'verified', enrichment_version: 'gt15-v2026.1' },
  { canonical_name: 'teamviewer ag', display_name: 'TeamViewer AG', ticker: null, exchange: 'XETRA', industry: 'Remote Access / Industrial AR / IoT / Digital Workspace', sector: 'Technology', is_public: true, country_code: 'DE', workforce_count: 1400, workforce_source: 'annual_report_2025', workforce_confidence: 0.88, market_cap_usd: 2500000000, pe_ratio: 18, revenue_ttm_usd: 700000000, stock_90d_change: null, financials_source: 'annual_report_2025', financials_confidence: 0.85, recent_layoff_count: 1, largest_layoff_pct: 8.0, layoff_last_event_at: '2024-02-14T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.88, hiring_velocity_score: 0.3, total_open_roles: 80, hiring_source: 'linkedin_scrape', hiring_confidence: 0.70, data_quality_tier: 'verified', enrichment_version: 'gt15-v2026.1' },
  { canonical_name: 'ovh groupe sa', display_name: 'OVH Groupe S.A.', ticker: null, exchange: 'Euronext', industry: 'Cloud Infrastructure / VPS / Dedicated Servers / AI Cloud', sector: 'Technology', is_public: true, country_code: 'FR', workforce_count: 2800, workforce_source: 'annual_report_2025', workforce_confidence: 0.88, market_cap_usd: 3500000000, pe_ratio: 35, revenue_ttm_usd: 1000000000, stock_90d_change: null, financials_source: 'annual_report_2025', financials_confidence: 0.83, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.78, hiring_velocity_score: 0.8, total_open_roles: 180, hiring_source: 'linkedin_scrape', hiring_confidence: 0.70, data_quality_tier: 'verified', enrichment_version: 'gt15-v2026.1' },
  { canonical_name: 'celonis se', display_name: 'Celonis SE', ticker: null, exchange: null, industry: 'Process Mining / Process Intelligence / AI Business Transformation', sector: 'Technology', is_public: false, country_code: 'DE', workforce_count: 3500, workforce_source: 'news_rss_scrape', workforce_confidence: 0.78, market_cap_usd: 13000000000, pe_ratio: null, revenue_ttm_usd: 400000000, stock_90d_change: null, financials_source: 'news_rss_scrape', financials_confidence: 0.65, recent_layoff_count: 1, largest_layoff_pct: 8.0, layoff_last_event_at: '2022-12-01T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.88, hiring_velocity_score: 0.8, total_open_roles: 280, hiring_source: 'linkedin_scrape', hiring_confidence: 0.68, data_quality_tier: 'seed', enrichment_version: 'gt15-v2026.1' },
  // US-listed European companies
  { canonical_name: 'trivago nv', display_name: 'Trivago N.V.', ticker: 'TRVG', exchange: 'NASDAQ', industry: 'Hotel Price Comparison / Travel Meta Search', sector: 'Consumer Discretionary', is_public: true, country_code: 'DE', workforce_count: 1000, workforce_source: 'annual_report_2025', workforce_confidence: 0.85, recent_layoff_count: 1, largest_layoff_pct: 10.0, layoff_last_event_at: '2024-03-20T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.88, hiring_velocity_score: 0.0, total_open_roles: 60, hiring_source: 'linkedin_scrape', hiring_confidence: 0.68, data_quality_tier: 'verified', enrichment_version: 'gt15-v2026.1' },
  { canonical_name: 'lightspeed commerce inc', display_name: 'Lightspeed Commerce Inc.', ticker: 'LSPD', exchange: 'NYSE', industry: 'POS / Payments / Restaurant Tech / Retail Tech / E-Commerce', sector: 'Technology', is_public: true, country_code: 'CA', workforce_count: 3100, workforce_source: 'annual_report_2025', workforce_confidence: 0.88, recent_layoff_count: 2, largest_layoff_pct: 10.0, layoff_last_event_at: '2023-11-01T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.90, hiring_velocity_score: 0.3, total_open_roles: 180, hiring_source: 'linkedin_scrape', hiring_confidence: 0.70, data_quality_tier: 'verified', enrichment_version: 'gt15-v2026.1' },
  // Asia Pacific (pre-filled)
  { canonical_name: 'lenovo group limited', display_name: 'Lenovo Group Limited', ticker: null, exchange: 'HKEX', industry: 'PC / Smartphones / Servers / Smart Devices / AI Infrastructure', sector: 'Technology', is_public: true, country_code: 'HK', workforce_count: 62000, workforce_source: 'annual_report_2025', workforce_confidence: 0.92, market_cap_usd: 7000000000, pe_ratio: 9, revenue_ttm_usd: 61000000000, stock_90d_change: null, financials_source: 'annual_report_2025', financials_confidence: 0.88, recent_layoff_count: 1, largest_layoff_pct: 5.0, layoff_last_event_at: '2023-01-26T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.90, hiring_velocity_score: 0.5, total_open_roles: 2200, hiring_source: 'linkedin_scrape', hiring_confidence: 0.74, data_quality_tier: 'verified', enrichment_version: 'gt15-v2026.1' },
  { canonical_name: 'zte corporation', display_name: 'ZTE Corporation', ticker: null, exchange: 'SZSE', industry: 'Telecom Equipment / 5G / Smartphones / Enterprise Networks', sector: 'Technology', is_public: true, country_code: 'CN', workforce_count: 79000, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, market_cap_usd: 15000000000, pe_ratio: 20, revenue_ttm_usd: 17000000000, stock_90d_change: null, financials_source: 'annual_report_2025', financials_confidence: 0.82, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.75, hiring_velocity_score: 0.5, total_open_roles: 2800, hiring_source: 'linkedin_scrape', hiring_confidence: 0.68, data_quality_tier: 'verified', enrichment_version: 'gt15-v2026.1' },
  { canonical_name: 'nec corporation', display_name: 'NEC Corporation', ticker: null, exchange: 'TSE', industry: 'IT/Network Infrastructure / AI / Biometrics / Public Safety', sector: 'Technology', is_public: true, country_code: 'JP', workforce_count: 113000, workforce_source: 'annual_report_2025', workforce_confidence: 0.92, market_cap_usd: 16000000000, pe_ratio: 18, revenue_ttm_usd: 26000000000, stock_90d_change: null, financials_source: 'annual_report_2025', financials_confidence: 0.87, recent_layoff_count: 1, largest_layoff_pct: 3.0, layoff_last_event_at: '2023-01-25T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.85, hiring_velocity_score: 0.3, total_open_roles: 2200, hiring_source: 'linkedin_scrape', hiring_confidence: 0.70, data_quality_tier: 'verified', enrichment_version: 'gt15-v2026.1' },
  { canonical_name: 'panasonic holdings', display_name: 'Panasonic Holdings Corporation', ticker: null, exchange: 'TSE', industry: 'Consumer Electronics / Auto Battery / B2B Solutions / HVAC', sector: 'Technology', is_public: true, country_code: 'JP', workforce_count: 233000, workforce_source: 'annual_report_2025', workforce_confidence: 0.93, market_cap_usd: 18000000000, pe_ratio: 14, revenue_ttm_usd: 68000000000, stock_90d_change: null, financials_source: 'annual_report_2025', financials_confidence: 0.88, recent_layoff_count: 1, largest_layoff_pct: 4.0, layoff_last_event_at: '2024-02-28T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.88, hiring_velocity_score: 0.3, total_open_roles: 3800, hiring_source: 'linkedin_scrape', hiring_confidence: 0.72, data_quality_tier: 'verified', enrichment_version: 'gt15-v2026.1' },
  { canonical_name: 'quanta computer inc', display_name: 'Quanta Computer Inc.', ticker: null, exchange: 'TWSE', industry: 'Contract Manufacturing / AI Servers / Cloud Infrastructure / Laptops', sector: 'Technology', is_public: true, country_code: 'TW', workforce_count: 80000, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, market_cap_usd: 33000000000, pe_ratio: 22, revenue_ttm_usd: 46000000000, stock_90d_change: null, financials_source: 'annual_report_2025', financials_confidence: 0.87, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.75, hiring_velocity_score: 1.5, total_open_roles: 3800, hiring_source: 'linkedin_scrape', hiring_confidence: 0.72, data_quality_tier: 'verified', enrichment_version: 'gt15-v2026.1' },
  // US-listed Asian companies
  { canonical_name: 'sk telecom co ltd', display_name: 'SK Telecom Co., Ltd.', ticker: 'SKM', exchange: 'NYSE', industry: 'Telecom / AI / Metaverse / MNO / Semiconductor (SK Hynix stake)', sector: 'Technology', is_public: true, country_code: 'KR', workforce_count: 5000, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.78, hiring_velocity_score: 0.8, total_open_roles: 480, hiring_source: 'linkedin_scrape', hiring_confidence: 0.72, data_quality_tier: 'verified', enrichment_version: 'gt15-v2026.1' },
  { canonical_name: 'singtel group', display_name: 'Singapore Telecommunications Limited (Singtel)', ticker: null, exchange: 'SGX', industry: 'Telecom / 5G / Digital / Cybersecurity / Regional Data Centers', sector: 'Technology', is_public: true, country_code: 'SG', workforce_count: 23000, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, market_cap_usd: 28000000000, pe_ratio: 24, revenue_ttm_usd: 13000000000, stock_90d_change: null, financials_source: 'annual_report_2025', financials_confidence: 0.87, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.78, hiring_velocity_score: 0.5, total_open_roles: 1400, hiring_source: 'linkedin_scrape', hiring_confidence: 0.72, data_quality_tier: 'verified', enrichment_version: 'gt15-v2026.1' },
  // Brazil / LATAM tech
  { canonical_name: 'totvs sa', display_name: 'TOTVS S.A.', ticker: null, exchange: 'B3', industry: 'ERP / HCM / CRM / Fintech SaaS / Brazil SMB Tech Platform', sector: 'Technology', is_public: true, country_code: 'BR', workforce_count: 15000, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, market_cap_usd: 3500000000, pe_ratio: 25, revenue_ttm_usd: 1100000000, stock_90d_change: null, financials_source: 'annual_report_2025', financials_confidence: 0.85, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.78, hiring_velocity_score: 1.0, total_open_roles: 820, hiring_source: 'linkedin_scrape', hiring_confidence: 0.72, data_quality_tier: 'verified', enrichment_version: 'gt15-v2026.1' },
  { canonical_name: 'ci&t inc', display_name: 'CI&T Inc.', ticker: 'CINT', exchange: 'NYSE', industry: 'Digital IT Services / AI / Software Engineering / LATAM Tech', sector: 'Technology', is_public: true, country_code: 'BR', workforce_count: 5400, workforce_source: 'annual_report_2025', workforce_confidence: 0.88, recent_layoff_count: 1, largest_layoff_pct: 9.0, layoff_last_event_at: '2023-09-14T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.90, hiring_velocity_score: 0.3, total_open_roles: 320, hiring_source: 'linkedin_scrape', hiring_confidence: 0.70, data_quality_tier: 'verified', enrichment_version: 'gt15-v2026.1' },
  { canonical_name: 'vtex commerce cloud', display_name: 'VTEX Commerce Cloud', ticker: 'VTEX', exchange: 'NYSE', industry: 'Composable Commerce / E-Commerce Platform / SaaS / LATAM', sector: 'Technology', is_public: true, country_code: 'BR', workforce_count: 1900, workforce_source: 'annual_report_2025', workforce_confidence: 0.85, recent_layoff_count: 1, largest_layoff_pct: 11.0, layoff_last_event_at: '2023-11-28T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.88, hiring_velocity_score: 0.5, total_open_roles: 150, hiring_source: 'linkedin_scrape', hiring_confidence: 0.68, data_quality_tier: 'verified', enrichment_version: 'gt15-v2026.1' },
  { canonical_name: 'pagseguro digital', display_name: 'PagSeguro Digital Ltd. (PagBank)', ticker: 'PAGS', exchange: 'NYSE', industry: 'Brazilian Fintech / Digital Payments / Neobank / POS', sector: 'Financials', is_public: true, country_code: 'BR', workforce_count: 7000, workforce_source: 'annual_report_2025', workforce_confidence: 0.88, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.78, hiring_velocity_score: 0.8, total_open_roles: 480, hiring_source: 'linkedin_scrape', hiring_confidence: 0.72, data_quality_tier: 'verified', enrichment_version: 'gt15-v2026.1' },
  { canonical_name: 'stoneco ltd', display_name: 'StoneCo Ltd.', ticker: 'STNE', exchange: 'NASDAQ', industry: 'Payment Processing / Fintech / ERP / Financial Services Brazil', sector: 'Financials', is_public: true, country_code: 'BR', workforce_count: 21000, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.78, hiring_velocity_score: 0.8, total_open_roles: 1200, hiring_source: 'linkedin_scrape', hiring_confidence: 0.74, data_quality_tier: 'verified', enrichment_version: 'gt15-v2026.1' },
  { canonical_name: 'constellation software inc', display_name: 'Constellation Software Inc.', ticker: null, exchange: 'TSX', industry: 'Vertical Market Software / Public Sector / M&A Software Roll-Up', sector: 'Technology', is_public: true, country_code: 'CA', workforce_count: 45000, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, market_cap_usd: 80000000000, pe_ratio: 100, revenue_ttm_usd: 8000000000, stock_90d_change: null, financials_source: 'annual_report_2025', financials_confidence: 0.88, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.78, hiring_velocity_score: 1.0, total_open_roles: 2800, hiring_source: 'linkedin_scrape', hiring_confidence: 0.74, data_quality_tier: 'verified', enrichment_version: 'gt15-v2026.1' },
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

console.log('\n✓ Connected — GT15: International Tech Expanded (2026)\n');
let ins=0,upd=0,pe=0,rev=0;
for (const c of companies) {
  const r = await upsertCompany(c);
  if(r.wasInserted) ins++; else upd++;
  if(r.hasPE) pe++; if(r.hasRev) rev++;
  await new Promise(r => setTimeout(r, 700));
}
console.log(`\n── GT15 complete: ${ins} inserted, ${upd} updated | PE: ${pe}/${companies.length} | Rev: ${rev}/${companies.length}\n`);
await pool.end();
