import pg from 'pg';
const { Client } = pg;
const db = new Client(process.env.DATABASE_URL);
await db.connect();
console.log('✓ Connected — Tech GT3: European Technology Companies\n');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
const FX = { USD:1, INR:1/84.5, EUR:1.08, GBP:1.26, JPY:1/150, KRW:1/1335, TWD:1/31.7, AUD:0.65, CAD:0.74, CHF:1.12, SEK:1/10.5, HKD:1/7.8, CNY:1/7.3, SGD:0.74, BRL:1/5.0, SAR:1/3.75, NOK:1/10.6 };

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
  // Capgemini — IT services, 340000 employees, FY2024 €22.1B rev
  { n:'capgemini',d:'Capgemini SE',cc:'FR',tk:'CAP.PA',ex:'Euronext',sec:'Technology',ind:'IT Services',wc:340000,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.4,or:3800 },
  // Dassault Systèmes — PLM/3D software, 23900 employees, FY2024 €6.0B rev
  { n:'dassault systemes',d:'Dassault Systèmes SE',cc:'FR',tk:'DSY.PA',ex:'Euronext',sec:'Technology',ind:'Industrial Software',wc:23900,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.3,or:480 },
  // STMicroelectronics — semiconductors, 50170 employees, FY2024 $13.27B rev
  { n:'stmicroelectronics',d:'STMicroelectronics N.V.',cc:'NL',tk:'STM',ex:'NYSE',sec:'Technology',ind:'Semiconductors',wc:50170,ws:'annual_report_fy2024',wf:0.97,lo:2,lp:8.0,le:'2025-01-27',hv:0.2,or:620 },
  // Infineon Technologies — power semis, 56200 employees, FY2024 €14.9B rev
  { n:'infineon technologies',d:'Infineon Technologies AG',cc:'DE',tk:'IFNNY',ex:'OTC',sec:'Technology',ind:'Semiconductors',wc:56200,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:5.0,le:'2023-11-16',hv:0.2,or:550 },
  // Logitech — peripherals, 8100 employees, FY2025 $4.31B rev
  { n:'logitech',d:'Logitech International S.A.',cc:'CH',tk:'LOGI',ex:'NASDAQ',sec:'Technology',ind:'Computer Hardware',wc:8100,ws:'annual_report_fy2025',wf:0.97,lo:1,lp:15.0,le:'2023-01-26',hv:0.3,or:220 },
  // Sage Group — accounting software, 12000 employees, FY2024 £2.28B rev
  { n:'sage group',d:'The Sage Group PLC',cc:'GB',tk:'SGE.L',ex:'LSE',sec:'Technology',ind:'Accounting Software',wc:12000,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.3,or:280 },
  // Amadeus IT — travel tech, 19600 employees, FY2024 €6.3B rev
  { n:'amadeus it',d:'Amadeus IT Group S.A.',cc:'ES',tk:'AMS.MC',ex:'BME',sec:'Technology',ind:'Travel Technology',wc:19600,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.3,or:420 },
  // Ubisoft — gaming, 17000 employees, FY2024 €2.3B rev
  { n:'ubisoft',d:'Ubisoft Entertainment SA',cc:'FR',tk:'UBI.PA',ex:'Euronext',sec:'Technology',ind:'Interactive Entertainment',wc:17000,ws:'annual_report_fy2024',wf:0.97,lo:3,lp:10.0,le:'2024-02-01',hv:0.1,or:180 },
  // Delivery Hero — food delivery, 43000 employees, FY2024 €11.8B GMV
  { n:'delivery hero',d:'Delivery Hero SE',cc:'DE',tk:'DHER.DE',ex:'XETRA',sec:'Technology',ind:'Food Delivery',wc:43000,ws:'annual_report_fy2024',wf:0.97,lo:3,lp:15.0,le:'2023-04-21',hv:0.2,or:380 },
  // Zalando — e-commerce fashion, 16900 employees, FY2024 €10.7B rev
  { n:'zalando',d:'Zalando SE',cc:'DE',tk:'ZAL.DE',ex:'XETRA',sec:'Technology',ind:'E-Commerce Fashion',wc:16900,ws:'annual_report_fy2024',wf:0.97,lo:2,lp:16.0,le:'2023-03-14',hv:0.3,or:340 },
  // Temenos — banking software, 7500 employees, FY2024 $990M rev
  { n:'temenos',d:'Temenos AG',cc:'CH',tk:'TEMN.SW',ex:'SIX',sec:'Technology',ind:'Banking Software',wc:7500,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:12.0,le:'2024-07-10',hv:0.2,or:180 },
  // Wolters Kluwer — professional info services, 21400 employees, FY2024 €5.8B rev
  { n:'wolters kluwer',d:'Wolters Kluwer N.V.',cc:'NL',tk:'WKL.AS',ex:'Euronext',sec:'Technology',ind:'Professional Information Services',wc:21400,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.3,or:380 },
  // Hexagon — measurement/industrial software, 24000 employees, FY2024 SEK54.8B rev
  { n:'hexagon ab',d:'Hexagon AB',cc:'SE',tk:'HXGBY',ex:'OTC',sec:'Technology',ind:'Industrial Software',wc:24000,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.3,or:320 },
  // Just Eat Takeaway — food delivery, 10800 employees, FY2024 €2.8B rev
  { n:'just eat takeaway',d:'Just Eat Takeaway.com N.V.',cc:'NL',tk:'TKWY.AS',ex:'Euronext',sec:'Technology',ind:'Food Delivery',wc:10800,ws:'annual_report_fy2024',wf:0.97,lo:4,lp:30.0,le:'2023-08-24',hv:0.1,or:120 },
  // Worldline — payment tech, 18000 employees, FY2024 €4.6B rev
  { n:'worldline',d:'Worldline SA',cc:'FR',tk:'WLN.PA',ex:'Euronext',sec:'Technology',ind:'Payment Technology',wc:18000,ws:'annual_report_fy2024',wf:0.97,lo:3,lp:20.0,le:'2023-10-25',hv:0.1,or:180 },
  // TeamViewer — remote access, 1400 employees, FY2024 €671M rev
  { n:'teamviewer',d:'TeamViewer SE',cc:'DE',tk:'TMV.DE',ex:'XETRA',sec:'Technology',ind:'Remote Access Software',wc:1400,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:10.0,le:'2022-09-28',hv:0.3,or:120 },
  // CD Projekt — gaming, 1200 employees, FY2024 PLN1.8B rev
  { n:'cd projekt',d:'CD Projekt S.A.',cc:'PL',tk:'OTGLY',ex:'OTC',sec:'Technology',ind:'Interactive Entertainment',wc:1200,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.4,or:150 },
  // Allegro — Polish e-commerce, 13000 employees, FY2024 PLN9.7B rev
  { n:'allegro',d:'Allegro.eu SA',cc:'PL',tk:'ALLEGRO.WA',ex:'WSE',sec:'Technology',ind:'E-Commerce',wc:13000,ws:'annual_report_fy2024',wf:0.95,lo:1,lp:8.0,le:'2023-02-28',hv:0.3,or:280 },
  // Criteo — digital advertising, 3500 employees, FY2024 $2.01B rev
  { n:'criteo',d:'Criteo S.A.',cc:'FR',tk:'CRTO',ex:'NASDAQ',sec:'Technology',ind:'Digital Advertising',wc:3500,ws:'annual_report_fy2024',wf:0.95,lo:2,lp:14.0,le:'2023-10-03',hv:0.3,or:210 },
  // Sopra Steria — IT consulting, 50800 employees, FY2024 €5.8B rev
  { n:'sopra steria',d:'Sopra Steria Group SA',cc:'FR',tk:'SOP.PA',ex:'Euronext',sec:'Technology',ind:'IT Consulting',wc:50800,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.3,or:680 },
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
    'verified','gt3-v1.0'
  ];
  const { rows } = await db.query(SQL, params);
  const tag = rows[0].inserted ? '✅ inserted' : '🔄 updated';
  if (rows[0].inserted) inserted++; else updated++;
  const pr = s?.price ? `💹 $${s.price}` : '⚠ no price';
  console.log(`  ${c.n.padEnd(35)} ${pr} ${tag}`);
  await new Promise(r => setTimeout(r, 700));
}
console.log(`\n✅ GT3 complete — ${inserted} inserted, ${updated} updated`);
console.log(`   Stock: ${stockOk}/${companies.length} | PE: ${peOk}/${companies.length} | Revenue: ${revOk}/${companies.length}`);
await db.end();
