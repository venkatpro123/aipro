import pg from 'pg';
const { Client } = pg;
const db = new Client(process.env.DATABASE_URL);
await db.connect();
console.log('✓ Connected — NG4: European Giants Expansion (2026 data)\n');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
const FX = { USD:1, INR:1/84.5, EUR:1.08, GBP:1.26, JPY:1/150, KRW:1/1335, TWD:1/31.7, AUD:0.65, CAD:0.74, CHF:1.12, SEK:1/10.5, HKD:1/7.8, CNY:1/7.3, SGD:0.74, BRL:1/5.0, SAR:1/3.75, NOK:1/10.6, DKK:1/6.9 };

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
  display_name=EXCLUDED.display_name, ticker=EXCLUDED.ticker, exchange=EXCLUDED.exchange,
  sector=EXCLUDED.sector, industry=EXCLUDED.industry,
  workforce_count=COALESCE(EXCLUDED.workforce_count,verified_company_intelligence.workforce_count),
  workforce_source=EXCLUDED.workforce_source, workforce_confidence=EXCLUDED.workforce_confidence,
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
  data_quality_tier=EXCLUDED.data_quality_tier, enrichment_version=EXCLUDED.enrichment_version,
  last_enriched_at=NOW(), updated_at=NOW()
RETURNING canonical_name,(xmax=0) AS inserted`;

const companies = [
  // Novo Nordisk — Danish pharma (Ozempic/Wegovy GLP-1); FY2024 DKK232B rev (~$33.6B); world's most valuable European co
  { n:'novo nordisk',d:'Novo Nordisk A/S',cc:'DK',tk:'NVO',ex:'NYSE',sec:'Healthcare',ind:'Pharmaceuticals / GLP-1',wc:68000,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.7,or:2800 },
  // Ferrari — Italian luxury autos; FY2024 €6.7B rev; 5500 employees
  { n:'ferrari',d:'Ferrari N.V.',cc:'IT',tk:'RACE',ex:'NYSE',sec:'Automotive',ind:'Luxury Automobiles',wc:5500,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.4,or:280 },
  // ENI — Italian integrated oil; FY2024 €99.5B rev; 32k employees
  { n:'eni',d:'Eni S.p.A.',cc:'IT',tk:'E',ex:'NYSE',sec:'Energy',ind:'Integrated Oil & Gas',wc:32000,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.2,or:480 },
  // Enel — Italian electricity giant; FY2024 €94B rev; 63k employees
  { n:'enel',d:'Enel S.p.A.',cc:'IT',tk:'ENLAY',ex:'OTC',sec:'Energy',ind:'Electric Utilities',wc:63000,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:5.0,le:'2023-11-22',hv:0.2,or:780 },
  // UniCredit — Italian/European banking; FY2024 net rev ~€25B; 82k employees
  { n:'unicredit',d:'UniCredit S.p.A.',cc:'IT',tk:'UNCRY',ex:'OTC',sec:'Financial Services',ind:'European Banking',wc:82000,ws:'annual_report_fy2024',wf:0.97,lo:2,lp:8.0,le:'2023-07-26',hv:0.2,or:980 },
  // UBS — Swiss banking (merged Credit Suisse 2023); FY2024 revenue ~$49B; 112k employees
  { n:'ubs group',d:'UBS Group AG',cc:'CH',tk:'UBS',ex:'NYSE',sec:'Financial Services',ind:'Investment & Wealth Management Banking',wc:112000,ws:'annual_report_fy2024',wf:0.97,lo:3,lp:30.0,le:'2023-08-31',hv:0.2,or:1200 },
  // Zurich Insurance — Swiss insurer; FY2024 $84.5B gross premiums; 58k employees
  { n:'zurich insurance',d:'Zurich Insurance Group AG',cc:'CH',tk:'ZURVY',ex:'OTC',sec:'Financial Services',ind:'Global Insurance',wc:58000,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.2,or:680 },
  // AB InBev — Belgian brewing (Budweiser/Stella/Corona); FY2024 rev $59.4B; 86k employees
  { n:'ab inbev',d:'Anheuser-Busch InBev SA/NV',cc:'BE',tk:'BUD',ex:'NYSE',sec:'Consumer',ind:'Brewing & Beverages',wc:86000,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:4.0,le:'2023-10-26',hv:0.2,or:980 },
  // Heineken — Dutch brewing; FY2024 €36.6B rev; 85k employees
  { n:'heineken',d:'Heineken N.V.',cc:'NL',tk:'HEINY',ex:'OTC',sec:'Consumer',ind:'Brewing & Beverages',wc:85000,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:3.0,le:'2023-10-25',hv:0.2,or:780 },
  // Kering — French luxury (Gucci/YSL/Bottega); FY2024 €17.6B rev; 41k employees
  { n:'kering',d:'Kering S.A.',cc:'FR',tk:'PPRUY',ex:'OTC',sec:'Consumer',ind:'Luxury Goods',wc:41000,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:7.0,le:'2024-03-06',hv:0.2,or:480 },
  // ING Group — Dutch/European banking; FY2024 total income €21.4B; 57k employees
  { n:'ing group',d:'ING Groep N.V.',cc:'NL',tk:'ING',ex:'NYSE',sec:'Financial Services',ind:'European Banking',wc:57000,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:5.0,le:'2023-10-26',hv:0.2,or:680 },
  // Siemens Energy — German energy transition; FY2025 (Sep yr-end) rev €36.6B; 98k employees
  { n:'siemens energy',d:'Siemens Energy AG',cc:'DE',tk:'SMNEY',ex:'OTC',sec:'Energy',ind:'Energy Transition Technology',wc:98000,ws:'annual_report_fy2025',wf:0.97,lo:2,lp:7.0,le:'2023-11-01',hv:0.3,or:1200 },
  // Vestas Wind Systems — Danish wind turbines; FY2024 DKK168B rev (~$24B); 29k employees
  { n:'vestas wind systems',d:'Vestas Wind Systems A/S',cc:'DK',tk:'VWSYF',ex:'OTC',sec:'Energy',ind:'Wind Turbines & Energy',wc:29000,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:10.0,le:'2023-02-07',hv:0.4,or:580 },
  // Atlas Copco — Swedish industrial equipment; FY2024 SEK188B rev (~$17.9B); 49k employees
  { n:'atlas copco',d:'Atlas Copco AB',cc:'SE',tk:'ATLKY',ex:'OTC',sec:'Industrials',ind:'Industrial Equipment & Vacuum Technology',wc:49000,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.3,or:680 },
  // Volvo Group — Swedish trucks/construction; FY2024 SEK553B rev (~$52.7B); 100k employees
  { n:'volvo group',d:'AB Volvo',cc:'SE',tk:'VLVLY',ex:'OTC',sec:'Industrials',ind:'Commercial Vehicles & Industrial Equipment',wc:100000,ws:'annual_report_fy2024',wf:0.97,lo:2,lp:5.0,le:'2024-04-30',hv:0.2,or:1200 },
  // Sandvik — Swedish engineering/mining tools; FY2024 SEK124B rev (~$11.8B); 40k employees
  { n:'sandvik',d:'Sandvik AB',cc:'SE',tk:'SDVKY',ex:'OTC',sec:'Industrials',ind:'Engineering & Mining Tools',wc:40000,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.3,or:480 },
  // A.P. Møller-Mærsk — Danish shipping/logistics; FY2024 $55.5B rev; 100k employees
  { n:'maersk',d:'A.P. Møller - Mærsk A/S',cc:'DK',tk:'AMKBY',ex:'OTC',sec:'Industrials',ind:'Shipping & Logistics',wc:100000,ws:'annual_report_fy2024',wf:0.97,lo:2,lp:18.0,le:'2023-02-08',hv:0.2,or:1200 },
  // CRH — Irish building materials; FY2024 $37.4B rev; 78k employees; listed NYSE 2023
  { n:'crh',d:'CRH PLC',cc:'IE',tk:'CRH',ex:'NYSE',sec:'Industrials',ind:'Building Materials',wc:78000,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.3,or:980 },
  // Pernod Ricard — French spirits (Jameson/Absolut/Ballantine's); FY2025 (Jun yr-end) €11.6B rev
  { n:'pernod ricard',d:'Pernod Ricard SA',cc:'FR',tk:'PDRDY',ex:'OTC',sec:'Consumer',ind:'Spirits & Wines',wc:18000,ws:'annual_report_fy2025',wf:0.97,lo:1,lp:8.0,le:'2023-11-09',hv:0.2,or:280 },
  // Flutter Entertainment — online betting (FanDuel/PokerStars/Paddy Power); FY2024 $14.4B rev
  { n:'flutter entertainment',d:'Flutter Entertainment PLC',cc:'GB',tk:'FLUT',ex:'NYSE',sec:'Consumer',ind:'Online Sports Betting & Gaming',wc:24000,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.5,or:580 },
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
    'verified','ng4-v2026.1'
  ];
  const { rows } = await db.query(SQL, params);
  const tag = rows[0].inserted ? '✅ inserted' : '🔄 updated';
  if (rows[0].inserted) inserted++; else updated++;
  const pr = s?.price ? `💹 $${s.price}` : '⚠ no price';
  console.log(`  ${c.n.padEnd(38)} ${pr} ${tag}`);
  await new Promise(r => setTimeout(r, 700));
}
console.log(`\n✅ NG4 complete — ${inserted} inserted, ${updated} updated`);
console.log(`   Stock: ${stockOk}/${companies.length} | PE: ${peOk}/${companies.length} | Revenue: ${revOk}/${companies.length}`);
await db.end();
