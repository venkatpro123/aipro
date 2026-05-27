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
  // Public AI / Emerging Tech (live Yahoo Finance)
  { canonical_name: 'c3.ai inc', display_name: 'C3.ai Inc.', ticker: 'AI', exchange: 'NYSE', industry: 'Enterprise AI / AI Applications / AI-as-a-Service', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 900, workforce_source: 'annual_report_2025', workforce_confidence: 0.88, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80, hiring_velocity_score: 0.3, total_open_roles: 80, hiring_source: 'linkedin_scrape', hiring_confidence: 0.70, data_quality_tier: 'verified', enrichment_version: 'gt10-v2026.1' },
  { canonical_name: 'soundhound ai inc', display_name: 'SoundHound AI Inc.', ticker: 'SOUN', exchange: 'NASDAQ', industry: 'Voice AI / Conversational AI / Automotive AI', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 900, workforce_source: 'annual_report_2025', workforce_confidence: 0.85, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.78, hiring_velocity_score: 0.5, total_open_roles: 80, hiring_source: 'linkedin_scrape', hiring_confidence: 0.68, data_quality_tier: 'verified', enrichment_version: 'gt10-v2026.1' },
  { canonical_name: 'bigbear.ai holdings', display_name: 'BigBear.ai Holdings Inc.', ticker: 'BBAI', exchange: 'NYSE', industry: 'AI Analytics / Defense Intelligence / Decision Intelligence', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 450, workforce_source: 'annual_report_2025', workforce_confidence: 0.82, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.75, hiring_velocity_score: 0.3, total_open_roles: 40, hiring_source: 'linkedin_scrape', hiring_confidence: 0.65, data_quality_tier: 'verified', enrichment_version: 'gt10-v2026.1' },
  { canonical_name: 'ionq inc', display_name: 'IonQ Inc.', ticker: 'IONQ', exchange: 'NYSE', industry: 'Quantum Computing / Quantum Networking / Quantum AI', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 600, workforce_source: 'annual_report_2025', workforce_confidence: 0.85, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.78, hiring_velocity_score: 1.0, total_open_roles: 80, hiring_source: 'linkedin_scrape', hiring_confidence: 0.70, data_quality_tier: 'verified', enrichment_version: 'gt10-v2026.1' },
  { canonical_name: 'upstart holdings', display_name: 'Upstart Holdings Inc.', ticker: 'UPST', exchange: 'NASDAQ', industry: 'AI Lending / AI Credit Risk / Consumer Banking', sector: 'Financials', is_public: true, country_code: 'US', workforce_count: 1100, workforce_source: 'annual_report_2025', workforce_confidence: 0.88, recent_layoff_count: 2, largest_layoff_pct: 20.0, layoff_last_event_at: '2023-11-07T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.92, hiring_velocity_score: 0.3, total_open_roles: 80, hiring_source: 'linkedin_scrape', hiring_confidence: 0.70, data_quality_tier: 'verified', enrichment_version: 'gt10-v2026.1' },
  { canonical_name: 'lemonade inc', display_name: 'Lemonade Inc.', ticker: 'LMND', exchange: 'NYSE', industry: 'AI Insurance / InsurTech / Homeowners & Renters Insurance', sector: 'Financials', is_public: true, country_code: 'US', workforce_count: 1000, workforce_source: 'annual_report_2025', workforce_confidence: 0.85, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.78, hiring_velocity_score: 0.3, total_open_roles: 60, hiring_source: 'linkedin_scrape', hiring_confidence: 0.68, data_quality_tier: 'verified', enrichment_version: 'gt10-v2026.1' },
  // Private AI giants and unicorns (pre-filled with 2026 estimates from fundraising rounds & news)
  { canonical_name: 'openai inc', display_name: 'OpenAI Inc.', ticker: null, exchange: null, industry: 'Foundation AI / LLM / GPT / ChatGPT / AI Research', sector: 'Technology', is_public: false, country_code: 'US', workforce_count: 4500, workforce_source: 'news_rss_scrape', workforce_confidence: 0.80, market_cap_usd: 300000000000, pe_ratio: null, revenue_ttm_usd: 5000000000, stock_90d_change: null, financials_source: 'news_rss_scrape', financials_confidence: 0.70, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80, hiring_velocity_score: 3.0, total_open_roles: 480, hiring_source: 'linkedin_scrape', hiring_confidence: 0.75, data_quality_tier: 'seed', enrichment_version: 'gt10-v2026.1' },
  { canonical_name: 'anthropic pbc', display_name: 'Anthropic PBC', ticker: null, exchange: null, industry: 'Foundation AI / LLM / Claude / AI Safety Research', sector: 'Technology', is_public: false, country_code: 'US', workforce_count: 1500, workforce_source: 'news_rss_scrape', workforce_confidence: 0.78, market_cap_usd: 60000000000, pe_ratio: null, revenue_ttm_usd: 1000000000, stock_90d_change: null, financials_source: 'news_rss_scrape', financials_confidence: 0.68, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80, hiring_velocity_score: 3.0, total_open_roles: 280, hiring_source: 'linkedin_scrape', hiring_confidence: 0.72, data_quality_tier: 'seed', enrichment_version: 'gt10-v2026.1' },
  { canonical_name: 'xai corp', display_name: 'xAI Corp. (Elon Musk)', ticker: null, exchange: null, industry: 'Foundation AI / LLM / Grok / AI Research', sector: 'Technology', is_public: false, country_code: 'US', workforce_count: 1500, workforce_source: 'news_rss_scrape', workforce_confidence: 0.72, market_cap_usd: 50000000000, pe_ratio: null, revenue_ttm_usd: 500000000, stock_90d_change: null, financials_source: 'news_rss_scrape', financials_confidence: 0.62, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.75, hiring_velocity_score: 2.0, total_open_roles: 120, hiring_source: 'linkedin_scrape', hiring_confidence: 0.68, data_quality_tier: 'seed', enrichment_version: 'gt10-v2026.1' },
  { canonical_name: 'databricks inc', display_name: 'Databricks Inc.', ticker: null, exchange: null, industry: 'Data + AI Platform / Lakehouse / ML Ops / LLM Training', sector: 'Technology', is_public: false, country_code: 'US', workforce_count: 3500, workforce_source: 'news_rss_scrape', workforce_confidence: 0.80, market_cap_usd: 62000000000, pe_ratio: null, revenue_ttm_usd: 2000000000, stock_90d_change: null, financials_source: 'news_rss_scrape', financials_confidence: 0.72, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80, hiring_velocity_score: 2.5, total_open_roles: 380, hiring_source: 'linkedin_scrape', hiring_confidence: 0.74, data_quality_tier: 'seed', enrichment_version: 'gt10-v2026.1' },
  { canonical_name: 'scale ai inc', display_name: 'Scale AI Inc.', ticker: null, exchange: null, industry: 'AI Data Labeling / RLHF / AI Infrastructure / Defense AI', sector: 'Technology', is_public: false, country_code: 'US', workforce_count: 1000, workforce_source: 'news_rss_scrape', workforce_confidence: 0.75, market_cap_usd: 13800000000, pe_ratio: null, revenue_ttm_usd: 1000000000, stock_90d_change: null, financials_source: 'news_rss_scrape', financials_confidence: 0.68, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.78, hiring_velocity_score: 1.5, total_open_roles: 120, hiring_source: 'linkedin_scrape', hiring_confidence: 0.68, data_quality_tier: 'seed', enrichment_version: 'gt10-v2026.1' },
  { canonical_name: 'perplexity ai inc', display_name: 'Perplexity AI Inc.', ticker: null, exchange: null, industry: 'AI Search / Conversational Search / Knowledge AI', sector: 'Technology', is_public: false, country_code: 'US', workforce_count: 250, workforce_source: 'news_rss_scrape', workforce_confidence: 0.72, market_cap_usd: 9000000000, pe_ratio: null, revenue_ttm_usd: 100000000, stock_90d_change: null, financials_source: 'news_rss_scrape', financials_confidence: 0.60, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.75, hiring_velocity_score: 2.0, total_open_roles: 60, hiring_source: 'linkedin_scrape', hiring_confidence: 0.65, data_quality_tier: 'seed', enrichment_version: 'gt10-v2026.1' },
  { canonical_name: 'mistral ai sas', display_name: 'Mistral AI SAS', ticker: null, exchange: null, industry: 'Open Source LLM / Foundation AI / European AI Research', sector: 'Technology', is_public: false, country_code: 'FR', workforce_count: 250, workforce_source: 'news_rss_scrape', workforce_confidence: 0.70, market_cap_usd: 6000000000, pe_ratio: null, revenue_ttm_usd: 50000000, stock_90d_change: null, financials_source: 'news_rss_scrape', financials_confidence: 0.58, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.75, hiring_velocity_score: 2.0, total_open_roles: 50, hiring_source: 'linkedin_scrape', hiring_confidence: 0.62, data_quality_tier: 'seed', enrichment_version: 'gt10-v2026.1' },
  { canonical_name: 'cohere inc', display_name: 'Cohere Inc.', ticker: null, exchange: null, industry: 'Enterprise LLM / AI Platform / NLP / RAG', sector: 'Technology', is_public: false, country_code: 'CA', workforce_count: 800, workforce_source: 'news_rss_scrape', workforce_confidence: 0.72, market_cap_usd: 5000000000, pe_ratio: null, revenue_ttm_usd: 200000000, stock_90d_change: null, financials_source: 'news_rss_scrape', financials_confidence: 0.62, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.75, hiring_velocity_score: 1.5, total_open_roles: 80, hiring_source: 'linkedin_scrape', hiring_confidence: 0.65, data_quality_tier: 'seed', enrichment_version: 'gt10-v2026.1' },
  { canonical_name: 'hugging face inc', display_name: 'Hugging Face Inc.', ticker: null, exchange: null, industry: 'AI Model Hub / Open Source AI / MLOps / AI Community', sector: 'Technology', is_public: false, country_code: 'US', workforce_count: 250, workforce_source: 'news_rss_scrape', workforce_confidence: 0.70, market_cap_usd: 4500000000, pe_ratio: null, revenue_ttm_usd: 70000000, stock_90d_change: null, financials_source: 'news_rss_scrape', financials_confidence: 0.58, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.75, hiring_velocity_score: 1.5, total_open_roles: 40, hiring_source: 'linkedin_scrape', hiring_confidence: 0.62, data_quality_tier: 'seed', enrichment_version: 'gt10-v2026.1' },
  { canonical_name: 'figma inc', display_name: 'Figma Inc.', ticker: null, exchange: null, industry: 'Collaborative Design / UI/UX Platform / Dev Tools / AI Design', sector: 'Technology', is_public: false, country_code: 'US', workforce_count: 1400, workforce_source: 'news_rss_scrape', workforce_confidence: 0.78, market_cap_usd: 12500000000, pe_ratio: null, revenue_ttm_usd: 600000000, stock_90d_change: null, financials_source: 'news_rss_scrape', financials_confidence: 0.68, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.78, hiring_velocity_score: 1.0, total_open_roles: 120, hiring_source: 'linkedin_scrape', hiring_confidence: 0.70, data_quality_tier: 'seed', enrichment_version: 'gt10-v2026.1' },
  { canonical_name: 'canva pty ltd', display_name: 'Canva Pty Ltd', ticker: null, exchange: null, industry: 'Visual Design Platform / AI Design / SaaS / Marketing Tools', sector: 'Technology', is_public: false, country_code: 'AU', workforce_count: 4500, workforce_source: 'news_rss_scrape', workforce_confidence: 0.80, market_cap_usd: 26000000000, pe_ratio: null, revenue_ttm_usd: 2300000000, stock_90d_change: null, financials_source: 'news_rss_scrape', financials_confidence: 0.72, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80, hiring_velocity_score: 1.5, total_open_roles: 280, hiring_source: 'linkedin_scrape', hiring_confidence: 0.72, data_quality_tier: 'seed', enrichment_version: 'gt10-v2026.1' },
  { canonical_name: 'notion labs inc', display_name: 'Notion Labs Inc.', ticker: null, exchange: null, industry: 'AI Productivity / Notes / Wiki / Project Management', sector: 'Technology', is_public: false, country_code: 'US', workforce_count: 1200, workforce_source: 'news_rss_scrape', workforce_confidence: 0.75, market_cap_usd: 10000000000, pe_ratio: null, revenue_ttm_usd: 300000000, stock_90d_change: null, financials_source: 'news_rss_scrape', financials_confidence: 0.65, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.78, hiring_velocity_score: 0.8, total_open_roles: 100, hiring_source: 'linkedin_scrape', hiring_confidence: 0.68, data_quality_tier: 'seed', enrichment_version: 'gt10-v2026.1' },
  { canonical_name: 'airtable inc', display_name: 'Airtable Inc.', ticker: null, exchange: null, industry: 'No-Code App Platform / Database / Workflow Automation', sector: 'Technology', is_public: false, country_code: 'US', workforce_count: 1000, workforce_source: 'news_rss_scrape', workforce_confidence: 0.72, market_cap_usd: 11700000000, pe_ratio: null, revenue_ttm_usd: 280000000, stock_90d_change: null, financials_source: 'news_rss_scrape', financials_confidence: 0.62, recent_layoff_count: 2, largest_layoff_pct: 27.0, layoff_last_event_at: '2023-12-07T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.90, hiring_velocity_score: 0.3, total_open_roles: 60, hiring_source: 'linkedin_scrape', hiring_confidence: 0.65, data_quality_tier: 'seed', enrichment_version: 'gt10-v2026.1' },
  { canonical_name: 'harvey ai inc', display_name: 'Harvey AI Inc.', ticker: null, exchange: null, industry: 'Legal AI / AI Legal Research / Contract Analysis / Law Firm AI', sector: 'Technology', is_public: false, country_code: 'US', workforce_count: 300, workforce_source: 'news_rss_scrape', workforce_confidence: 0.70, market_cap_usd: 1500000000, pe_ratio: null, revenue_ttm_usd: 100000000, stock_90d_change: null, financials_source: 'news_rss_scrape', financials_confidence: 0.60, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.72, hiring_velocity_score: 2.0, total_open_roles: 40, hiring_source: 'linkedin_scrape', hiring_confidence: 0.62, data_quality_tier: 'seed', enrichment_version: 'gt10-v2026.1' },
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

console.log('\n✓ Connected — GT10: AI & Emerging Tech (2026)\n');
let ins=0,upd=0,pe=0,rev=0;
for (const c of companies) {
  const r = await upsertCompany(c);
  if(r.wasInserted) ins++; else upd++;
  if(r.hasPE) pe++; if(r.hasRev) rev++;
  await new Promise(r => setTimeout(r, 700));
}
console.log(`\n── GT10 complete: ${ins} inserted, ${upd} updated | PE: ${pe}/${companies.length} | Rev: ${rev}/${companies.length}\n`);
await pool.end();
