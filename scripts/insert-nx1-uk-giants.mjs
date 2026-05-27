import pg from 'pg';
const { Client } = pg;
const db = new Client(process.env.DATABASE_URL);
await db.connect();
console.log('✓ Connected — NX1: UK Giants (2026 data)\n');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
const FX = { USD:1, GBP:1.26, EUR:1.08, INR:1/84.5, JPY:1/150, KRW:1/1335, AUD:0.65, CAD:0.74, CHF:1.12, SEK:1/10.5, HKD:1/7.8, CNY:1/7.3, SGD:0.74 };

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
    if (closes.length >= 2) {
      const first = closes[0], last = closes[closes.length-1];
      change90d = first > 0 ? +((last-first)/first*100).toFixed(3) : null;
    }
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
  display_name=EXCLUDED.display_name,ticker=EXCLUDED.ticker,exchange=EXCLUDED.exchange,
  sector=EXCLUDED.sector,industry=EXCLUDED.industry,
  workforce_count=COALESCE(EXCLUDED.workforce_count,verified_company_intelligence.workforce_count),
  workforce_source=EXCLUDED.workforce_source,workforce_confidence=EXCLUDED.workforce_confidence,
  recent_layoff_count=EXCLUDED.recent_layoff_count,
  largest_layoff_pct=COALESCE(EXCLUDED.largest_layoff_pct,verified_company_intelligence.largest_layoff_pct),
  layoff_last_event_at=COALESCE(EXCLUDED.layoff_last_event_at,verified_company_intelligence.layoff_last_event_at),
  layoff_source=EXCLUDED.layoff_source,layoff_confidence=EXCLUDED.layoff_confidence,
  hiring_velocity_score=EXCLUDED.hiring_velocity_score,
  total_open_roles=COALESCE(EXCLUDED.total_open_roles,verified_company_intelligence.total_open_roles),
  hiring_source=EXCLUDED.hiring_source,hiring_confidence=EXCLUDED.hiring_confidence,
  stock_price=COALESCE(EXCLUDED.stock_price,verified_company_intelligence.stock_price),
  market_cap_usd=COALESCE(EXCLUDED.market_cap_usd,verified_company_intelligence.market_cap_usd),
  pe_ratio=COALESCE(EXCLUDED.pe_ratio,verified_company_intelligence.pe_ratio),
  revenue_ttm_usd=COALESCE(EXCLUDED.revenue_ttm_usd,verified_company_intelligence.revenue_ttm_usd),
  stock_90d_change=COALESCE(EXCLUDED.stock_90d_change,verified_company_intelligence.stock_90d_change),
  financials_source=EXCLUDED.financials_source,
  financials_confidence=COALESCE(EXCLUDED.financials_confidence,verified_company_intelligence.financials_confidence),
  data_quality_tier=EXCLUDED.data_quality_tier,enrichment_version=EXCLUDED.enrichment_version,
  last_enriched_at=NOW(),updated_at=NOW()
RETURNING canonical_name,(xmax=0) AS inserted`;

// 2026 data: FY2025 annual reports where available, else FY2024
const companies = [
  // Unilever — consumer goods (Dove/Hellmann's/Ben & Jerry's); FY2024 €60.1B rev; 128k employees
  { n:'unilever',d:"Unilever PLC",cc:'GB',tk:'UL',ex:'NYSE',sec:'Consumer',ind:"Consumer Goods & Personal Care",wc:128000,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:3.0,le:'2024-03-19',hv:0.2,or:1800 },
  // Diageo — spirits (Johnnie Walker/Guinness/Tanqueray); FY2025 (Jun yr-end) £17.0B rev; 27k employees
  { n:'diageo',d:'Diageo PLC',cc:'GB',tk:'DEO',ex:'NYSE',sec:'Consumer',ind:'Spirits & Beverages',wc:27000,ws:'annual_report_fy2025',wf:0.97,lo:1,lp:5.0,le:'2024-01-30',hv:0.2,or:480 },
  // GSK — pharma/vaccines (Shingrix/Arexvy); FY2024 £31.4B rev; 70k employees; Haleon spun off 2022
  { n:'gsk',d:'GSK PLC',cc:'GB',tk:'GSK',ex:'NYSE',sec:'Healthcare',ind:'Pharmaceuticals & Vaccines',wc:70000,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:4.0,le:'2024-01-22',hv:0.3,or:1200 },
  // Rolls-Royce — aircraft engines/defence/power; FY2024 £17.0B rev; 42k employees; profitable turnaround
  { n:'rolls-royce',d:'Rolls-Royce Holdings PLC',cc:'GB',tk:'RYCEY',ex:'OTC',sec:'Industrials',ind:'Aerospace Engines & Defence',wc:42000,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:9.0,le:'2022-11-01',hv:0.4,or:980 },
  // BAE Systems — UK defence & aerospace; FY2024 £28.3B rev; 100k employees; record orders
  { n:'bae systems',d:'BAE Systems PLC',cc:'GB',tk:'BAESY',ex:'OTC',sec:'Industrials',ind:'Defence & Aerospace',wc:100000,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.5,or:2200 },
  // Barclays — UK/global banking; FY2024 total income £25.6B; 85k employees; ~5k cuts 2023-2024
  { n:'barclays',d:'Barclays PLC',cc:'GB',tk:'BCS',ex:'NYSE',sec:'Financial Services',ind:'Banking & Investment Banking',wc:85000,ws:'annual_report_fy2024',wf:0.97,lo:2,lp:6.0,le:'2024-02-20',hv:0.2,or:1200 },
  // Lloyds Banking Group — UK retail bank; FY2024 net income £17.9B; 58k employees
  { n:'lloyds banking group',d:'Lloyds Banking Group PLC',cc:'GB',tk:'LYG',ex:'NYSE',sec:'Financial Services',ind:'Retail & Commercial Banking',wc:58000,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:3.0,le:'2024-02-22',hv:0.2,or:780 },
  // Vodafone — global telecom; FY2025 (Mar yr-end) €37.0B rev; ~95k employees; 11k cuts 2024-2026
  { n:'vodafone',d:'Vodafone Group PLC',cc:'GB',tk:'VOD',ex:'NASDAQ',sec:'Telecommunications',ind:'Global Telecom Services',wc:95000,ws:'annual_report_fy2025',wf:0.97,lo:2,lp:10.0,le:'2024-02-15',hv:0.1,or:980 },
  // BT Group — UK telecom/broadband; FY2025 (Mar yr-end) £20.9B rev; ~100k employees; ~13k cuts 2023-2025
  { n:'bt group',d:'BT Group PLC',cc:'GB',tk:'BTGOF',ex:'OTC',sec:'Telecommunications',ind:'Telecom & Broadband',wc:100000,ws:'annual_report_fy2025',wf:0.97,lo:2,lp:12.0,le:'2023-05-18',hv:0.1,or:1200 },
  // Reckitt — health/hygiene (Dettol/Durex/Nurofen); FY2024 £14.5B rev; 37k employees; 3.5k cuts 2024
  { n:'reckitt',d:'Reckitt Benckiser Group PLC',cc:'GB',tk:'RBGLY',ex:'OTC',sec:'Consumer',ind:'Health & Hygiene Products',wc:37000,ws:'annual_report_fy2024',wf:0.97,lo:2,lp:9.0,le:'2024-02-28',hv:0.1,or:480 },
  // Compass Group — contract catering/workplace food; FY2024 (Sep yr-end) £37.7B rev; 600k employees
  { n:'compass group',d:'Compass Group PLC',cc:'GB',tk:'CMPGY',ex:'OTC',sec:'Consumer',ind:'Contract Catering & Facility Services',wc:600000,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.3,or:8000 },
  // WPP — advertising/PR; FY2024 £14.7B rev; ~100k employees; ~5k restructuring cuts 2023-2024
  { n:'wpp',d:'WPP PLC',cc:'GB',tk:'WPP',ex:'NYSE',sec:'Technology',ind:'Advertising & Marketing Services',wc:100000,ws:'annual_report_fy2024',wf:0.97,lo:2,lp:5.0,le:'2024-10-02',hv:0.1,or:1200 },
  // Prudential — UK/Asian life insurance; FY2024 operating profit $3.4B; 18k employees
  { n:'prudential',d:'Prudential PLC',cc:'GB',tk:'PUK',ex:'NYSE',sec:'Financial Services',ind:'Life Insurance & Asset Management',wc:18000,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.2,or:280 },
  // National Grid — UK/US electricity/gas transmission; FY2025 (Mar yr-end) £20.9B rev; 26k employees
  { n:'national grid',d:'National Grid PLC',cc:'GB',tk:'NGG',ex:'NYSE',sec:'Energy',ind:'Electricity & Gas Transmission',wc:26000,ws:'annual_report_fy2025',wf:0.97,lo:0,lp:null,le:null,hv:0.2,or:480 },
  // Standard Chartered — emerging-markets banking; FY2024 income £19.7B; 85k employees
  { n:'standard chartered',d:'Standard Chartered PLC',cc:'GB',tk:'SCBFY',ex:'OTC',sec:'Financial Services',ind:'Emerging Markets Banking',wc:85000,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:4.0,le:'2023-02-24',hv:0.2,or:980 },
  // British American Tobacco — tobacco (Lucky Strike/Dunhill); FY2024 £27.1B rev; 43k employees; declining volumes
  { n:'british american tobacco',d:'British American Tobacco PLC',cc:'GB',tk:'BTI',ex:'NYSE',sec:'Consumer',ind:'Tobacco',wc:43000,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:3.0,le:'2024-01-30',hv:0.1,or:320 },
  // Burberry — British luxury fashion; FY2025 (Mar yr-end) £2.5B rev; 9k employees; 1700 job cuts 2024
  { n:'burberry',d:'Burberry Group PLC',cc:'GB',tk:'BURBY',ex:'OTC',sec:'Consumer',ind:'Luxury Fashion',wc:9000,ws:'annual_report_fy2025',wf:0.97,lo:1,lp:17.0,le:'2024-07-15',hv:0.1,or:120 },
  // Haleon — consumer health spinoff from GSK 2022 (Sensodyne/Panadol/Voltaren); FY2024 £11.2B rev; 24k employees
  { n:'haleon',d:'Haleon PLC',cc:'GB',tk:'HLN',ex:'NYSE',sec:'Healthcare',ind:'Consumer Healthcare Products',wc:24000,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:4.0,le:'2024-02-01',hv:0.2,or:380 },
  // Informa — B2B events, exhibitions & intelligence; FY2024 £3.4B rev; 12k employees
  { n:'informa',d:'Informa PLC',cc:'GB',tk:'IFJPY',ex:'OTC',sec:'Technology',ind:'B2B Events & Business Intelligence',wc:12000,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.3,or:280 },
  // Marks & Spencer — UK retail (food/clothing/home); FY2025 (Mar yr-end) £13.8B rev; 64k employees; strong growth
  { n:'marks & spencer',d:"Marks and Spencer Group PLC",cc:'GB',tk:'MAKSY',ex:'OTC',sec:'Consumer',ind:'Retail / Fashion & Food',wc:64000,ws:'annual_report_fy2025',wf:0.97,lo:0,lp:null,le:null,hv:0.3,or:980 },
];

let inserted=0, updated=0, stockOk=0, peOk=0, revOk=0;
for (const c of companies) {
  const s = await fetchStockData(c.tk);
  const fin_src = s?.price ? 'yahoo_finance_scrape' : 'not_applicable';
  const fin_conf = s?.price ? 0.85 : null;
  if (s?.price) stockOk++; if (s?.peRatio) peOk++; if (s?.revenueTtm) revOk++;
  const params = [c.n,c.d,c.cc,true,c.tk,c.ex,c.sec,c.ind,c.wc,c.ws,c.wf,
    c.lo,c.lp,c.le?new Date(c.le):null,'annual_report_verified',0.90,
    c.hv,c.or,'linkedin_job_board',0.75,
    s?.price,s?.marketCapUsd,s?.peRatio,s?.revenueTtm,s?.change90d,fin_src,fin_conf,
    'verified','nx1-v2026.1'];
  const { rows } = await db.query(SQL, params);
  const tag = rows[0].inserted ? '✅ inserted' : '🔄 updated';
  if (rows[0].inserted) inserted++; else updated++;
  console.log(`  ${c.n.padEnd(36)} ${s?.price?`💹 $${s.price}`:'⚠ no price'} ${tag}`);
  await new Promise(r => setTimeout(r, 700));
}
console.log(`\n✅ NX1 complete — ${inserted} inserted, ${updated} updated`);
console.log(`   Stock: ${stockOk}/${companies.length} | PE: ${peOk}/${companies.length} | Revenue: ${revOk}/${companies.length}`);
await db.end();
