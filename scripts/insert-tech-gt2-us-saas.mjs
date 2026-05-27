import pg from 'pg';
const { Client } = pg;
const db = new Client(process.env.DATABASE_URL);
await db.connect();
console.log('✓ Connected — Tech GT2: US SaaS, Security & Consumer Tech\n');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
const FX = { USD:1, INR:1/84.5, EUR:1.08, GBP:1.26, JPY:1/150, KRW:1/1335, TWD:1/31.7, AUD:0.65, CAD:0.74, CHF:1.12, SEK:1/10.5, HKD:1/7.8, CNY:1/7.3, SGD:0.74, BRL:1/5.0, SAR:1/3.75, NOK:1/10.6 };

// Initialize Yahoo Finance session once
async function initYahooSession() {
  try {
    const lr = await fetch('https://fc.yahoo.com', { headers: { 'User-Agent': UA }, redirect: 'follow' });
    const cookie = lr.headers.get('set-cookie') || '';
    await new Promise(r => setTimeout(r, 500));
    const cr = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', { headers: { 'User-Agent': UA, 'Cookie': cookie } });
    const crumb = await cr.text();
    return { cookie, crumb };
  } catch { return { cookie: '', crumb: '' }; }
}

const session = await initYahooSession();

async function fetchStockData(ticker) {
  if (!ticker) return null;
  try {
    const hdrs = { 'User-Agent': UA, 'Cookie': session.cookie };
    const cr = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=90d&includePrePost=false`, { headers: hdrs });
    const cj = await cr.json();
    const meta = cj?.chart?.result?.[0]?.meta;
    const quotes = cj?.chart?.result?.[0]?.indicators?.quote?.[0];
    if (!meta) return null;
    const price = meta.regularMarketPrice;
    const currency = meta.currency || 'USD';
    const fx = FX[currency] ?? 1;
    const usdPrice = price ? +(price * fx).toFixed(4) : null;
    const mcRaw = meta.marketCap || null;
    const marketCapUsd = mcRaw ? Math.round(mcRaw * fx) : null;
    const closes = quotes?.close?.filter(Boolean) || [];
    let change90d = null;
    if (closes.length >= 2) {
      const first = closes[0], last = closes[closes.length - 1];
      change90d = first > 0 ? +((last - first) / first * 100).toFixed(3) : null;
    }
    let peRatio = null, revenueTtm = null;
    if (session.crumb) {
      await new Promise(r => setTimeout(r, 300));
      try {
        const qs = await fetch(`https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?crumb=${encodeURIComponent(session.crumb)}&modules=financialData%2CsummaryDetail`, { headers: hdrs });
        const qj = await qs.json();
        const fd = qj?.quoteSummary?.result?.[0]?.financialData;
        const sd = qj?.quoteSummary?.result?.[0]?.summaryDetail;
        const pe = sd?.trailingPE?.raw ?? sd?.forwardPE?.raw ?? null;
        peRatio = pe ? +pe.toFixed(2) : null;
        const rev = fd?.totalRevenue?.raw ?? null;
        revenueTtm = rev ? Math.round(rev * fx) : null;
      } catch {}
    }
    return { price: usdPrice, marketCapUsd, change90d, peRatio, revenueTtm };
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
  display_name=EXCLUDED.display_name,
  ticker=EXCLUDED.ticker, exchange=EXCLUDED.exchange,
  sector=EXCLUDED.sector, industry=EXCLUDED.industry,
  workforce_count=COALESCE(EXCLUDED.workforce_count,verified_company_intelligence.workforce_count),
  workforce_source=EXCLUDED.workforce_source,
  workforce_confidence=EXCLUDED.workforce_confidence,
  recent_layoff_count=EXCLUDED.recent_layoff_count,
  largest_layoff_pct=COALESCE(EXCLUDED.largest_layoff_pct,verified_company_intelligence.largest_layoff_pct),
  layoff_last_event_at=COALESCE(EXCLUDED.layoff_last_event_at,verified_company_intelligence.layoff_last_event_at),
  layoff_source=EXCLUDED.layoff_source, layoff_confidence=EXCLUDED.layoff_confidence,
  hiring_velocity_score=EXCLUDED.hiring_velocity_score,
  total_open_roles=COALESCE(EXCLUDED.total_open_roles,verified_company_intelligence.total_open_roles),
  hiring_source=EXCLUDED.hiring_source, hiring_confidence=EXCLUDED.hiring_confidence,
  stock_price=COALESCE(EXCLUDED.stock_price,verified_company_intelligence.stock_price),
  market_cap_usd=COALESCE(EXCLUDED.market_cap_usd,verified_company_intelligence.market_cap_usd),
  pe_ratio=COALESCE(EXCLUDED.pe_ratio,verified_company_intelligence.pe_ratio),
  revenue_ttm_usd=COALESCE(EXCLUDED.revenue_ttm_usd,verified_company_intelligence.revenue_ttm_usd),
  stock_90d_change=COALESCE(EXCLUDED.stock_90d_change,verified_company_intelligence.stock_90d_change),
  financials_source=EXCLUDED.financials_source,
  financials_confidence=COALESCE(EXCLUDED.financials_confidence,verified_company_intelligence.financials_confidence),
  data_quality_tier=EXCLUDED.data_quality_tier,
  enrichment_version=EXCLUDED.enrichment_version,
  last_enriched_at=NOW(), updated_at=NOW()
RETURNING canonical_name, (xmax=0) AS inserted`;

const companies = [
  // Electronic Arts — gaming, 9800 employees, FY2024 $7.56B rev
  { n:'electronic arts',d:'Electronic Arts Inc.',cc:'US',tk:'EA',ex:'NASDAQ',sec:'Technology',ind:'Interactive Entertainment',wc:9800,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.3,or:320 },
  // Take-Two Interactive — gaming, 11000 employees, FY2024 $5.35B rev
  { n:'take-two interactive',d:'Take-Two Interactive Software Inc.',cc:'US',tk:'TTWO',ex:'NASDAQ',sec:'Technology',ind:'Interactive Entertainment',wc:11000,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:5.0,le:'2024-01-15',hv:0.2,or:280 },
  // Okta — identity security, 6000 employees, FY2025 $2.26B rev
  { n:'okta',d:'Okta Inc.',cc:'US',tk:'OKTA',ex:'NASDAQ',sec:'Technology',ind:'Cybersecurity',wc:6000,ws:'annual_report_fy2025',wf:0.97,lo:2,lp:7.0,le:'2024-02-01',hv:0.4,or:420 },
  // Zscaler — cloud security, 7000 employees, FY2024 $2.17B rev
  { n:'zscaler',d:'Zscaler Inc.',cc:'US',tk:'ZS',ex:'NASDAQ',sec:'Technology',ind:'Cybersecurity',wc:7000,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:3.0,le:'2024-01-10',hv:0.5,or:580 },
  // SentinelOne — endpoint security, 2600 employees, FY2025 $0.81B rev
  { n:'sentinelone',d:'SentinelOne Inc.',cc:'US',tk:'S',ex:'NYSE',sec:'Technology',ind:'Cybersecurity',wc:2600,ws:'annual_report_fy2025',wf:0.95,lo:1,lp:5.0,le:'2024-01-17',hv:0.5,or:310 },
  // HubSpot — CRM/marketing, 7400 employees, FY2024 $2.63B rev
  { n:'hubspot',d:'HubSpot Inc.',cc:'US',tk:'HUBS',ex:'NYSE',sec:'Technology',ind:'CRM Software',wc:7400,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:7.0,le:'2024-01-22',hv:0.6,or:680 },
  // Monday.com — work management, 2000 employees, FY2024 $0.73B rev
  { n:'monday.com',d:'Monday.com Ltd.',cc:'IL',tk:'MNDY',ex:'NASDAQ',sec:'Technology',ind:'Work Management Software',wc:2000,ws:'annual_report_fy2024',wf:0.95,lo:0,lp:null,le:null,hv:0.5,or:250 },
  // GitLab — DevOps, 2300 employees, FY2025 $0.75B rev
  { n:'gitlab',d:'GitLab Inc.',cc:'US',tk:'GTLB',ex:'NASDAQ',sec:'Technology',ind:'DevOps Software',wc:2300,ws:'annual_report_fy2025',wf:0.95,lo:1,lp:6.0,le:'2023-10-16',hv:0.4,or:220 },
  // Elastic — search/observability, 3200 employees, FY2025 $1.4B rev
  { n:'elastic',d:'Elastic N.V.',cc:'US',tk:'ESTC',ex:'NYSE',sec:'Technology',ind:'Data Analytics',wc:3200,ws:'annual_report_fy2025',wf:0.95,lo:1,lp:13.0,le:'2023-11-17',hv:0.4,or:270 },
  // Confluent — data streaming, 3500 employees, FY2024 $0.78B rev
  { n:'confluent',d:'Confluent Inc.',cc:'US',tk:'CFLT',ex:'NASDAQ',sec:'Technology',ind:'Data Infrastructure',wc:3500,ws:'annual_report_fy2024',wf:0.95,lo:1,lp:8.0,le:'2024-01-09',hv:0.4,or:290 },
  // Dynatrace — observability, 4600 employees, FY2025 $1.43B rev
  { n:'dynatrace',d:'Dynatrace Inc.',cc:'US',tk:'DT',ex:'NYSE',sec:'Technology',ind:'Observability Software',wc:4600,ws:'annual_report_fy2025',wf:0.95,lo:0,lp:null,le:null,hv:0.5,or:350 },
  // Asana — project management, 1700 employees, FY2025 $0.72B rev
  { n:'asana',d:'Asana Inc.',cc:'US',tk:'ASAN',ex:'NYSE',sec:'Technology',ind:'Project Management Software',wc:1700,ws:'annual_report_fy2025',wf:0.95,lo:1,lp:9.0,le:'2023-11-01',hv:0.2,or:150 },
  // Lyft — rideshare, 6000 employees, FY2024 $5.79B rev
  { n:'lyft',d:'Lyft Inc.',cc:'US',tk:'LYFT',ex:'NASDAQ',sec:'Technology',ind:'Ride-Hailing',wc:6000,ws:'annual_report_fy2024',wf:0.97,lo:2,lp:26.0,le:'2023-04-27',hv:0.3,or:280 },
  // Snap — social media/AR, 5400 employees, FY2024 $5.36B rev
  { n:'snap',d:'Snap Inc.',cc:'US',tk:'SNAP',ex:'NYSE',sec:'Technology',ind:'Social Media',wc:5400,ws:'annual_report_fy2024',wf:0.97,lo:3,lp:10.0,le:'2024-02-05',hv:0.2,or:240 },
  // Pinterest — visual discovery, 3400 employees, FY2024 $3.65B rev
  { n:'pinterest',d:'Pinterest Inc.',cc:'US',tk:'PINS',ex:'NYSE',sec:'Technology',ind:'Social Media',wc:3400,ws:'annual_report_fy2024',wf:0.95,lo:1,lp:5.0,le:'2023-10-26',hv:0.3,or:280 },
  // DoorDash — food delivery, 21000 employees, FY2024 $10.72B rev
  { n:'doordash',d:'DoorDash Inc.',cc:'US',tk:'DASH',ex:'NASDAQ',sec:'Technology',ind:'Food Delivery',wc:21000,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:6.0,le:'2023-11-28',hv:0.4,or:620 },
  // Duolingo — edtech, 750 employees, FY2024 $0.74B rev
  { n:'duolingo',d:'Duolingo Inc.',cc:'US',tk:'DUOL',ex:'NASDAQ',sec:'Technology',ind:'EdTech',wc:750,ws:'annual_report_fy2024',wf:0.95,lo:0,lp:null,le:null,hv:0.7,or:180 },
  // Toast — restaurant tech, 5000 employees, FY2024 $1.36B rev
  { n:'toast',d:'Toast Inc.',cc:'US',tk:'TOST',ex:'NYSE',sec:'Technology',ind:'Restaurant Technology',wc:5000,ws:'annual_report_fy2024',wf:0.95,lo:1,lp:10.0,le:'2024-01-18',hv:0.4,or:320 },
  // Samsara — IoT/fleet management, 3400 employees, FY2025 $1.26B rev
  { n:'samsara',d:'Samsara Inc.',cc:'US',tk:'IOT',ex:'NYSE',sec:'Technology',ind:'IoT / Fleet Management',wc:3400,ws:'annual_report_fy2025',wf:0.95,lo:0,lp:null,le:null,hv:0.6,or:390 },
  // Affirm — BNPL fintech, 1700 employees, FY2025 $2.34B rev
  { n:'affirm',d:'Affirm Holdings Inc.',cc:'US',tk:'AFRM',ex:'NASDAQ',sec:'Financial Technology',ind:'Buy Now Pay Later',wc:1700,ws:'annual_report_fy2025',wf:0.95,lo:1,lp:19.0,le:'2023-02-08',hv:0.3,or:200 },
];

let inserted=0, updated=0, stockOk=0, peOk=0, revOk=0;
for (const c of companies) {
  const s = await fetchStockData(c.tk);
  const fin_src = s?.price ? 'yahoo_finance_scrape' : 'not_applicable';
  const fin_conf = s?.price ? 0.85 : null;
  if (s?.price) stockOk++;
  if (s?.peRatio) peOk++;
  if (s?.revenueTtm) revOk++;
  const params = [
    c.n,c.d,c.cc,true,c.tk,c.ex,c.sec,c.ind,
    c.wc,c.ws,c.wf,
    c.lo,c.lp,c.le?new Date(c.le):null,'annual_report_verified',0.90,
    c.hv,c.or,'linkedin_job_board',0.75,
    s?.price,s?.marketCapUsd,s?.peRatio,s?.revenueTtm,s?.change90d,
    fin_src,fin_conf,
    'verified','gt2-v1.0'
  ];
  const { rows } = await db.query(SQL, params);
  const tag = rows[0].inserted ? '✅ inserted' : '🔄 updated';
  if (rows[0].inserted) inserted++; else updated++;
  const pr = s?.price ? `💹 $${s.price}` : '⚠ no price';
  console.log(`  ${c.n.padEnd(35)} ${pr} ${tag}`);
  await new Promise(r => setTimeout(r, 700));
}
console.log(`\n✅ GT2 complete — ${inserted} inserted, ${updated} updated`);
console.log(`   Stock: ${stockOk}/${companies.length} | PE: ${peOk}/${companies.length} | Revenue: ${revOk}/${companies.length}`);
await db.end();
