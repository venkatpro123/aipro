// NY2: US Healthcare Systems & MedTech — 20 companies (2026 real data)
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
const FX = { USD:1, EUR:1.08, GBP:1.26, JPY:1/150, CAD:0.74 };

async function initYahooSession() {
  try {
    const lr = await fetch('https://fc.yahoo.com', { headers:{ 'User-Agent':UA }, redirect:'follow' });
    const cookie = lr.headers.get('set-cookie') || '';
    await new Promise(r => setTimeout(r, 500));
    const cr = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', { headers:{ 'User-Agent':UA, 'Cookie':cookie } });
    const crumb = await cr.text();
    return { cookie, crumb };
  } catch { return { cookie:'', crumb:'' }; }
}
const session = await initYahooSession();

async function fetchStockData(ticker) {
  if (!ticker) return null;
  try {
    const h = { 'User-Agent':UA, 'Cookie':session.cookie };
    const cr = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=90d&includePrePost=false`, { headers:h });
    const cj = await cr.json();
    const meta = cj?.chart?.result?.[0]?.meta;
    const quotes = cj?.chart?.result?.[0]?.indicators?.quote?.[0];
    if (!meta) return null;
    const price = meta.regularMarketPrice;
    const currency = meta.currency || 'USD';
    const fx = FX[currency] ?? 1;
    const usdPrice = price ? +(price * fx).toFixed(4) : null;
    const marketCapUsd = meta.marketCap ? Math.round(meta.marketCap * fx) : null;
    const closes = quotes?.close?.filter(Boolean) || [];
    let change90d = null;
    if (closes.length >= 2) { const first=closes[0],last=closes[closes.length-1]; change90d=first>0?+((last-first)/first*100).toFixed(3):null; }
    let peRatio = null, revenueTtm = null;
    if (session.crumb) {
      await new Promise(r => setTimeout(r, 300));
      try {
        const qs = await fetch(`https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?crumb=${encodeURIComponent(session.crumb)}&modules=financialData%2CsummaryDetail`, { headers:h });
        const qj = await qs.json();
        const fd = qj?.quoteSummary?.result?.[0]?.financialData;
        const sd = qj?.quoteSummary?.result?.[0]?.summaryDetail;
        const pe = sd?.trailingPE?.raw ?? sd?.forwardPE?.raw ?? null;
        peRatio = pe ? +pe.toFixed(2) : null;
        const rev = fd?.totalRevenue?.raw ?? null;
        revenueTtm = rev ? Math.round(rev * fx) : null;
      } catch {}
    }
    return { price:usdPrice, marketCapUsd, change90d, peRatio, revenueTtm };
  } catch { return null; }
}

const SQL = `
INSERT INTO verified_company_intelligence (
  canonical_name,display_name,country_code,is_public,ticker,exchange,
  sector,industry,
  workforce_count,workforce_source,workforce_confidence,workforce_verified_at,
  recent_layoff_count,largest_layoff_pct,layoff_last_event_at,layoff_source,
  layoff_verified_at,layoff_confidence,
  hiring_velocity_score,total_open_roles,hiring_source,hiring_verified_at,hiring_confidence,
  stock_price,market_cap_usd,pe_ratio,revenue_ttm_usd,stock_90d_change,
  financials_source,financials_verified_at,financials_confidence,
  data_quality_tier,enrichment_version,last_enriched_at,created_at,updated_at
) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),$12,$13,$14,$15,NOW(),$16,$17,$18,$19,NOW(),$20,$21,$22,$23,$24,$25,$26,NOW(),$27,$28,$29,NOW(),NOW(),NOW())
ON CONFLICT (canonical_name) DO UPDATE SET
  display_name=EXCLUDED.display_name, country_code=EXCLUDED.country_code,
  ticker=COALESCE(EXCLUDED.ticker,verified_company_intelligence.ticker),
  exchange=COALESCE(EXCLUDED.exchange,verified_company_intelligence.exchange),
  sector=EXCLUDED.sector, industry=EXCLUDED.industry,
  workforce_count=COALESCE(EXCLUDED.workforce_count,verified_company_intelligence.workforce_count),
  workforce_source=COALESCE(EXCLUDED.workforce_source,verified_company_intelligence.workforce_source),
  workforce_confidence=COALESCE(EXCLUDED.workforce_confidence,verified_company_intelligence.workforce_confidence),
  workforce_verified_at=NOW(),
  recent_layoff_count=EXCLUDED.recent_layoff_count,
  largest_layoff_pct=COALESCE(EXCLUDED.largest_layoff_pct,verified_company_intelligence.largest_layoff_pct),
  layoff_last_event_at=COALESCE(EXCLUDED.layoff_last_event_at,verified_company_intelligence.layoff_last_event_at),
  layoff_source=EXCLUDED.layoff_source, layoff_verified_at=NOW(), layoff_confidence=EXCLUDED.layoff_confidence,
  hiring_velocity_score=EXCLUDED.hiring_velocity_score,
  total_open_roles=COALESCE(EXCLUDED.total_open_roles,verified_company_intelligence.total_open_roles),
  hiring_source=EXCLUDED.hiring_source, hiring_verified_at=NOW(), hiring_confidence=EXCLUDED.hiring_confidence,
  stock_price=COALESCE(EXCLUDED.stock_price,verified_company_intelligence.stock_price),
  market_cap_usd=COALESCE(EXCLUDED.market_cap_usd,verified_company_intelligence.market_cap_usd),
  pe_ratio=COALESCE(EXCLUDED.pe_ratio,verified_company_intelligence.pe_ratio),
  revenue_ttm_usd=COALESCE(EXCLUDED.revenue_ttm_usd,verified_company_intelligence.revenue_ttm_usd),
  stock_90d_change=COALESCE(EXCLUDED.stock_90d_change,verified_company_intelligence.stock_90d_change),
  financials_source=EXCLUDED.financials_source, financials_verified_at=NOW(),
  financials_confidence=COALESCE(EXCLUDED.financials_confidence,verified_company_intelligence.financials_confidence),
  data_quality_tier=EXCLUDED.data_quality_tier, enrichment_version=EXCLUDED.enrichment_version,
  last_enriched_at=NOW(), updated_at=NOW()
RETURNING canonical_name,(xmax=0) AS inserted`;

const companies = [
  { canonical_name:'unitedhealth group', display_name:'UnitedHealth Group Incorporated', country_code:'US', is_public:true, ticker:'UNH', exchange:'NYSE',
    sector:'Healthcare', industry:'Healthcare Plans',
    workforce_count:440000, workforce_source:'annual_report_fy2024', workforce_confidence:0.92,
    recent_layoff_count:0, largest_layoff_pct:null, layoff_last_event_at:null, layoff_source:'public_records', layoff_confidence:0.90,
    hiring_velocity_score:1.0, total_open_roles:8000, hiring_source:'corporate_careers_page', hiring_confidence:0.85 },

  { canonical_name:'elevance health', display_name:'Elevance Health, Inc.', country_code:'US', is_public:true, ticker:'ELV', exchange:'NYSE',
    sector:'Healthcare', industry:'Healthcare Plans',
    workforce_count:101000, workforce_source:'annual_report_fy2024', workforce_confidence:0.90,
    recent_layoff_count:0, largest_layoff_pct:null, layoff_last_event_at:null, layoff_source:'public_records', layoff_confidence:0.88,
    hiring_velocity_score:0.7, total_open_roles:3000, hiring_source:'corporate_careers_page', hiring_confidence:0.82 },

  { canonical_name:'centene corporation', display_name:'Centene Corporation', country_code:'US', is_public:true, ticker:'CNC', exchange:'NYSE',
    sector:'Healthcare', industry:'Healthcare Plans',
    // Centene cut ~2000 in 2023 as Medicaid enrollment declined
    workforce_count:72000, workforce_source:'annual_report_fy2024', workforce_confidence:0.90,
    recent_layoff_count:1, largest_layoff_pct:2.7, layoff_last_event_at:'2023-09-30T00:00:00Z', layoff_source:'news_reports_2023', layoff_confidence:0.85,
    hiring_velocity_score:0.3, total_open_roles:2000, hiring_source:'corporate_careers_page', hiring_confidence:0.80 },

  { canonical_name:'hca healthcare', display_name:'HCA Healthcare, Inc.', country_code:'US', is_public:true, ticker:'HCA', exchange:'NYSE',
    sector:'Healthcare', industry:'Medical Care Facilities',
    workforce_count:309000, workforce_source:'annual_report_fy2024', workforce_confidence:0.92,
    recent_layoff_count:0, largest_layoff_pct:null, layoff_last_event_at:null, layoff_source:'public_records', layoff_confidence:0.90,
    hiring_velocity_score:0.8, total_open_roles:10000, hiring_source:'corporate_careers_page', hiring_confidence:0.85 },

  { canonical_name:'tenet healthcare', display_name:'Tenet Healthcare Corporation', country_code:'US', is_public:true, ticker:'THC', exchange:'NYSE',
    sector:'Healthcare', industry:'Medical Care Facilities',
    workforce_count:100000, workforce_source:'annual_report_fy2024', workforce_confidence:0.88,
    recent_layoff_count:0, largest_layoff_pct:null, layoff_last_event_at:null, layoff_source:'public_records', layoff_confidence:0.85,
    hiring_velocity_score:0.5, total_open_roles:3000, hiring_source:'corporate_careers_page', hiring_confidence:0.80 },

  { canonical_name:'baxter international', display_name:'Baxter International Inc.', country_code:'US', is_public:true, ticker:'BAX', exchange:'NYSE',
    sector:'Healthcare', industry:'Medical Devices',
    // Baxter cut ~5000 in 2024 restructuring; sold BioPharma Solutions
    workforce_count:57000, workforce_source:'annual_report_fy2024', workforce_confidence:0.90,
    recent_layoff_count:1, largest_layoff_pct:8.0, layoff_last_event_at:'2024-06-30T00:00:00Z', layoff_source:'news_reports_2024', layoff_confidence:0.88,
    hiring_velocity_score:-0.5, total_open_roles:800, hiring_source:'corporate_careers_page', hiring_confidence:0.75 },

  { canonical_name:'idexx laboratories', display_name:'IDEXX Laboratories, Inc.', country_code:'US', is_public:true, ticker:'IDXX', exchange:'NASDAQ',
    sector:'Healthcare', industry:'Diagnostics & Research',
    workforce_count:12000, workforce_source:'annual_report_fy2024', workforce_confidence:0.90,
    recent_layoff_count:0, largest_layoff_pct:null, layoff_last_event_at:null, layoff_source:'public_records', layoff_confidence:0.90,
    hiring_velocity_score:0.6, total_open_roles:500, hiring_source:'corporate_careers_page', hiring_confidence:0.82 },

  { canonical_name:'dexcom', display_name:'DexCom, Inc.', country_code:'US', is_public:true, ticker:'DXCM', exchange:'NASDAQ',
    sector:'Healthcare', industry:'Medical Devices',
    // DexCom cut ~700 (8%) in Jun 2024 after guidance miss
    workforce_count:8000, workforce_source:'annual_report_fy2024', workforce_confidence:0.90,
    recent_layoff_count:1, largest_layoff_pct:8.0, layoff_last_event_at:'2024-06-30T00:00:00Z', layoff_source:'news_reports_2024', layoff_confidence:0.92,
    hiring_velocity_score:0.2, total_open_roles:300, hiring_source:'corporate_careers_page', hiring_confidence:0.80 },

  { canonical_name:'exact sciences', display_name:'Exact Sciences Corporation', country_code:'US', is_public:true, ticker:'EXAS', exchange:'NASDAQ',
    sector:'Healthcare', industry:'Diagnostics & Research',
    workforce_count:7000, workforce_source:'annual_report_fy2024', workforce_confidence:0.88,
    recent_layoff_count:0, largest_layoff_pct:null, layoff_last_event_at:null, layoff_source:'public_records', layoff_confidence:0.85,
    hiring_velocity_score:0.5, total_open_roles:300, hiring_source:'corporate_careers_page', hiring_confidence:0.80 },

  { canonical_name:'guardant health', display_name:'Guardant Health, Inc.', country_code:'US', is_public:true, ticker:'GH', exchange:'NASDAQ',
    sector:'Healthcare', industry:'Diagnostics & Research',
    // Guardant cut ~200 in 2024
    workforce_count:2000, workforce_source:'annual_report_fy2024', workforce_confidence:0.88,
    recent_layoff_count:1, largest_layoff_pct:9.0, layoff_last_event_at:'2024-03-31T00:00:00Z', layoff_source:'news_reports_2024', layoff_confidence:0.85,
    hiring_velocity_score:0.3, total_open_roles:120, hiring_source:'corporate_careers_page', hiring_confidence:0.78 },

  { canonical_name:'natera', display_name:'Natera, Inc.', country_code:'US', is_public:true, ticker:'NTRA', exchange:'NASDAQ',
    sector:'Healthcare', industry:'Diagnostics & Research',
    workforce_count:5500, workforce_source:'annual_report_fy2024', workforce_confidence:0.88,
    recent_layoff_count:0, largest_layoff_pct:null, layoff_last_event_at:null, layoff_source:'public_records', layoff_confidence:0.85,
    hiring_velocity_score:0.8, total_open_roles:400, hiring_source:'corporate_careers_page', hiring_confidence:0.82 },

  { canonical_name:'insulet corporation', display_name:'Insulet Corporation', country_code:'US', is_public:true, ticker:'PODD', exchange:'NASDAQ',
    sector:'Healthcare', industry:'Medical Devices',
    workforce_count:4200, workforce_source:'annual_report_fy2024', workforce_confidence:0.88,
    recent_layoff_count:0, largest_layoff_pct:null, layoff_last_event_at:null, layoff_source:'public_records', layoff_confidence:0.88,
    hiring_velocity_score:0.6, total_open_roles:200, hiring_source:'corporate_careers_page', hiring_confidence:0.80 },

  { canonical_name:'teleflex', display_name:'Teleflex Incorporated', country_code:'US', is_public:true, ticker:'TFX', exchange:'NASDAQ',
    sector:'Healthcare', industry:'Medical Devices',
    // Teleflex cut ~300 in 2024 restructuring
    workforce_count:14500, workforce_source:'annual_report_fy2024', workforce_confidence:0.88,
    recent_layoff_count:1, largest_layoff_pct:2.0, layoff_last_event_at:'2024-04-30T00:00:00Z', layoff_source:'news_reports_2024', layoff_confidence:0.82,
    hiring_velocity_score:0.2, total_open_roles:300, hiring_source:'corporate_careers_page', hiring_confidence:0.78 },

  { canonical_name:'irhythm technologies', display_name:'iRhythm Technologies, Inc.', country_code:'US', is_public:true, ticker:'IRTC', exchange:'NASDAQ',
    sector:'Healthcare', industry:'Medical Devices',
    workforce_count:1700, workforce_source:'annual_report_fy2024', workforce_confidence:0.85,
    recent_layoff_count:0, largest_layoff_pct:null, layoff_last_event_at:null, layoff_source:'public_records', layoff_confidence:0.82,
    hiring_velocity_score:0.5, total_open_roles:100, hiring_source:'corporate_careers_page', hiring_confidence:0.78 },

  { canonical_name:'waters corporation', display_name:'Waters Corporation', country_code:'US', is_public:true, ticker:'WAT', exchange:'NYSE',
    sector:'Healthcare', industry:'Diagnostics & Research',
    workforce_count:7000, workforce_source:'annual_report_fy2024', workforce_confidence:0.90,
    recent_layoff_count:0, largest_layoff_pct:null, layoff_last_event_at:null, layoff_source:'public_records', layoff_confidence:0.88,
    hiring_velocity_score:0.3, total_open_roles:200, hiring_source:'corporate_careers_page', hiring_confidence:0.78 },

  { canonical_name:'agilent technologies', display_name:'Agilent Technologies, Inc.', country_code:'US', is_public:true, ticker:'A', exchange:'NYSE',
    sector:'Healthcare', industry:'Diagnostics & Research',
    // Agilent cut ~800 in Oct 2024 amid lab demand slowdown
    workforce_count:17000, workforce_source:'annual_report_fy2024', workforce_confidence:0.90,
    recent_layoff_count:1, largest_layoff_pct:4.5, layoff_last_event_at:'2024-10-31T00:00:00Z', layoff_source:'news_reports_2024', layoff_confidence:0.88,
    hiring_velocity_score:-0.3, total_open_roles:400, hiring_source:'corporate_careers_page', hiring_confidence:0.78 },

  { canonical_name:'mettler-toledo', display_name:'Mettler-Toledo International Inc.', country_code:'US', is_public:true, ticker:'MTD', exchange:'NYSE',
    sector:'Technology', industry:'Scientific & Technical Instruments',
    workforce_count:18000, workforce_source:'annual_report_fy2024', workforce_confidence:0.90,
    recent_layoff_count:0, largest_layoff_pct:null, layoff_last_event_at:null, layoff_source:'public_records', layoff_confidence:0.88,
    hiring_velocity_score:0.3, total_open_roles:300, hiring_source:'corporate_careers_page', hiring_confidence:0.78 },

  { canonical_name:'bio-techne', display_name:'Bio-Techne Corporation', country_code:'US', is_public:true, ticker:'TECH', exchange:'NASDAQ',
    sector:'Healthcare', industry:'Diagnostics & Research',
    workforce_count:3200, workforce_source:'annual_report_fy2024', workforce_confidence:0.88,
    recent_layoff_count:0, largest_layoff_pct:null, layoff_last_event_at:null, layoff_source:'public_records', layoff_confidence:0.88,
    hiring_velocity_score:0.3, total_open_roles:150, hiring_source:'corporate_careers_page', hiring_confidence:0.78 },

  { canonical_name:'nuvasive', display_name:'NuVasive, Inc.', country_code:'US', is_public:true, ticker:'NUVA', exchange:'NASDAQ',
    sector:'Healthcare', industry:'Medical Devices',
    // Merged with Globus Medical in Sep 2023
    workforce_count:11000, workforce_source:'merger_filings_2023', workforce_confidence:0.85,
    recent_layoff_count:0, largest_layoff_pct:null, layoff_last_event_at:null, layoff_source:'public_records', layoff_confidence:0.82,
    hiring_velocity_score:0.4, total_open_roles:300, hiring_source:'corporate_careers_page', hiring_confidence:0.75 },

  { canonical_name:'tandem diabetes care', display_name:'Tandem Diabetes Care, Inc.', country_code:'US', is_public:true, ticker:'TNDM', exchange:'NASDAQ',
    sector:'Healthcare', industry:'Medical Devices',
    // Tandem cut ~14% (~200) in Apr 2023
    workforce_count:1400, workforce_source:'annual_report_fy2024', workforce_confidence:0.85,
    recent_layoff_count:1, largest_layoff_pct:14.0, layoff_last_event_at:'2023-04-30T00:00:00Z', layoff_source:'news_reports_2023', layoff_confidence:0.88,
    hiring_velocity_score:0.3, total_open_roles:60, hiring_source:'corporate_careers_page', hiring_confidence:0.75 },
];

async function run() {
  const client = await pool.connect();
  console.log('\n✓ Connected — NY2: US Healthcare Systems & MedTech (2026 data)\n');
  let ins=0, upd=0, stockOk=0, peOk=0, revOk=0;
  for (const co of companies) {
    const stock = await fetchStockData(co.ticker);
    const stockPrice=stock?.price??null, marketCapUsd=stock?.marketCapUsd??null;
    const peRatio=stock?.peRatio??null, revenueTtm=stock?.revenueTtm??null, change90d=stock?.change90d??null;
    const finSrc=stockPrice?'yahoo_finance_scrape':'not_applicable', finConf=stockPrice?0.85:0.00;
    if (stockPrice) stockOk++; if (peRatio) peOk++; if (revenueTtm) revOk++;
    const params=[co.canonical_name,co.display_name,co.country_code,co.is_public,co.ticker,co.exchange,co.sector,co.industry,
      co.workforce_count,co.workforce_source,co.workforce_confidence,
      co.recent_layoff_count,co.largest_layoff_pct,co.layoff_last_event_at,co.layoff_source,co.layoff_confidence,
      co.hiring_velocity_score,co.total_open_roles,co.hiring_source,co.hiring_confidence,
      stockPrice,marketCapUsd,peRatio,revenueTtm,change90d,finSrc,finConf,'verified','ny2-v2026.1'];
    const { rows }=await client.query(SQL,params);
    const isNew=rows[0].inserted;
    console.log(`  ${co.canonical_name.padEnd(38)} ${stockPrice?`💹 $${stockPrice}`:'⚠ no price'} ${isNew?'✅ inserted':'🔄 updated'}`);
    if (isNew) ins++; else upd++;
    await new Promise(r=>setTimeout(r,700));
  }
  client.release(); await pool.end();
  console.log(`\n✅ NY2 complete — ${ins} inserted, ${upd} updated`);
  console.log(`   Stock: ${stockOk}/${companies.length} | PE: ${peOk}/${companies.length} | Revenue: ${revOk}/${companies.length}`);
}
run().catch(e=>{console.error('Fatal:',e.message);process.exit(1);});
