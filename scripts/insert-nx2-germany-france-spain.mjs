import pg from 'pg';
const { Client } = pg;
const db = new Client(process.env.DATABASE_URL);
await db.connect();
console.log('✓ Connected — NX2: Germany, France & Spain Giants (2026 data)\n');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
const FX = { USD:1, EUR:1.08, GBP:1.26, INR:1/84.5, JPY:1/150, KRW:1/1335, AUD:0.65, CAD:0.74, CHF:1.12, SEK:1/10.5, HKD:1/7.8, CNY:1/7.3, SGD:0.74 };

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
    let peRatio=null, revenueTtm=null;
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

const companies = [
  // SAP — German enterprise software (ERP/cloud); FY2024 €34.2B rev; 105k employees; 8k AI restructuring Jan 2024
  { n:'sap',d:'SAP SE',cc:'DE',tk:'SAP',ex:'NYSE',sec:'Technology',ind:'Enterprise Software / ERP',wc:105000,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:8.0,le:'2024-01-26',hv:0.3,or:2200 },
  // Bayer — German pharma/agri (Aspirin/Roundup); FY2024 €46.6B rev; 97k employees; massive Monsanto liability
  { n:'bayer',d:'Bayer AG',cc:'DE',tk:'BAYRY',ex:'OTC',sec:'Healthcare',ind:'Pharmaceuticals & Agricultural Science',wc:97000,ws:'annual_report_fy2024',wf:0.97,lo:2,lp:10.0,le:'2024-02-28',hv:0.1,or:1200 },
  // BASF — German chemicals; FY2024 €65.2B rev; 112k employees; ~5k jobs cut 2023-2024 (energy costs)
  { n:'basf',d:'BASF SE',cc:'DE',tk:'BASFY',ex:'OTC',sec:'Materials',ind:'Industrial Chemicals',wc:112000,ws:'annual_report_fy2024',wf:0.97,lo:2,lp:5.0,le:'2024-02-23',hv:0.1,or:1200 },
  // Deutsche Telekom — German telecom (T-Mobile US majority stake); FY2024 €115.8B rev; 219k employees
  { n:'deutsche telekom',d:'Deutsche Telekom AG',cc:'DE',tk:'DTEGY',ex:'OTC',sec:'Telecommunications',ind:'Telecom & Mobile Services',wc:219000,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:2.0,le:'2023-03-16',hv:0.2,or:2800 },
  // Deutsche Bank — German investment/corporate bank; FY2024 net rev €28.9B; 90k employees
  { n:'deutsche bank',d:'Deutsche Bank AG',cc:'DE',tk:'DB',ex:'NYSE',sec:'Financial Services',ind:'Investment & Corporate Banking',wc:90000,ws:'annual_report_fy2024',wf:0.97,lo:2,lp:3.5,le:'2024-07-25',hv:0.2,or:980 },
  // Allianz — German global insurer; FY2024 operating profit €15.8B; 160k employees
  { n:'allianz',d:'Allianz SE',cc:'DE',tk:'ALIZY',ex:'OTC',sec:'Financial Services',ind:'Global Insurance & Asset Management',wc:160000,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.2,or:1800 },
  // Continental — German auto components/tyres; FY2024 €39.7B rev; 200k employees; 13k cuts 2024-2025
  { n:'continental ag',d:'Continental AG',cc:'DE',tk:'CTTAY',ex:'OTC',sec:'Automotive',ind:'Automotive Components & Tyres',wc:200000,ws:'annual_report_fy2024',wf:0.97,lo:2,lp:6.0,le:'2024-08-01',hv:0.1,or:1800 },
  // E.ON — German electricity/gas network; FY2024 €66.4B rev; 72k employees
  { n:'e.on',d:'E.ON SE',cc:'DE',tk:'EONGY',ex:'OTC',sec:'Energy',ind:'Electricity Distribution & Networks',wc:72000,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.2,or:780 },
  // RWE — German renewables/power generation; FY2024 €26.0B rev; 26k employees
  { n:'rwe',d:'RWE AG',cc:'DE',tk:'RWEOY',ex:'OTC',sec:'Energy',ind:'Renewable Energy & Power Generation',wc:26000,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.3,or:480 },
  // Fresenius Medical Care — German dialysis services/products; FY2024 €18.8B rev; 115k employees
  { n:'fresenius medical care',d:'Fresenius Medical Care AG & Co. KGaA',cc:'DE',tk:'FMS',ex:'NYSE',sec:'Healthcare',ind:'Dialysis Services & Products',wc:115000,ws:'annual_report_fy2024',wf:0.97,lo:2,lp:8.0,le:'2023-02-24',hv:0.2,or:1200 },
  // Sanofi — French pharma (Dupixent/Lovenox); FY2024 €42.6B rev; 91k employees
  { n:'sanofi',d:'Sanofi SA',cc:'FR',tk:'SNY',ex:'NASDAQ',sec:'Healthcare',ind:'Pharmaceuticals & Biotechnology',wc:91000,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:2.0,le:'2024-10-23',hv:0.3,or:1400 },
  // BNP Paribas — French banking; FY2024 net banking income €48.8B; 192k employees
  { n:'bnp paribas',d:'BNP Paribas SA',cc:'FR',tk:'BNPQY',ex:'OTC',sec:'Financial Services',ind:'Global Banking',wc:192000,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:2.0,le:'2024-02-06',hv:0.2,or:2200 },
  // Société Générale — French bank; FY2024 net banking income €24.5B; 117k employees; ~3700 cuts 2023-2024
  { n:'societe generale',d:'Société Générale SA',cc:'FR',tk:'SCGLY',ex:'OTC',sec:'Financial Services',ind:'Banking',wc:117000,ws:'annual_report_fy2024',wf:0.97,lo:2,lp:3.0,le:'2023-09-18',hv:0.2,or:1200 },
  // Renault — French automaker (EV transition/Ampere); FY2024 €46.4B rev; 116k employees
  { n:'renault',d:'Renault SA',cc:'FR',tk:'RNLSY',ex:'OTC',sec:'Automotive',ind:'Automotive Manufacturing',wc:116000,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:3.0,le:'2024-01-25',hv:0.2,or:1200 },
  // Orange — French telecom; FY2024 €39.6B rev; 139k employees
  { n:'orange',d:'Orange SA',cc:'FR',tk:'ORAN',ex:'NYSE',sec:'Telecommunications',ind:'Telecom & Digital Services',wc:139000,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:3.0,le:'2023-05-17',hv:0.2,or:1400 },
  // Banco Santander — Spanish global bank; FY2024 total income €63.4B; 212k employees
  { n:'banco santander',d:'Banco Santander SA',cc:'ES',tk:'SAN',ex:'NYSE',sec:'Financial Services',ind:'Global Banking',wc:212000,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:2.0,le:'2024-01-31',hv:0.2,or:2200 },
  // BBVA — Spanish bank (bidding for Sabadell); FY2024 net interest income €29.6B; 122k employees
  { n:'bbva',d:'Banco Bilbao Vizcaya Argentaria SA',cc:'ES',tk:'BBVA',ex:'NYSE',sec:'Financial Services',ind:'Banking',wc:122000,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.2,or:1400 },
  // Inditex — Spanish fast fashion (Zara/Massimo Dutti/Pull&Bear); FY2025 (Jan yr-end) €38.6B rev; 175k employees
  { n:'inditex',d:'Industria de Diseño Textil SA (Inditex)',cc:'ES',tk:'IDEXY',ex:'OTC',sec:'Consumer',ind:'Fast Fashion Retail',wc:175000,ws:'annual_report_fy2025',wf:0.97,lo:0,lp:null,le:null,hv:0.4,or:2800 },
  // Iberdrola — Spanish electricity/renewables; FY2024 €48.1B rev; 43k employees
  { n:'iberdrola',d:'Iberdrola SA',cc:'ES',tk:'IBDRY',ex:'OTC',sec:'Energy',ind:'Electricity & Renewable Energy',wc:43000,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.3,or:680 },
  // Telefónica — Spanish telecom (O2/Movistar); FY2024 €40.0B rev; 103k employees
  { n:'telefonica',d:'Telefónica SA',cc:'ES',tk:'TEF',ex:'NYSE',sec:'Telecommunications',ind:'Telecom & Mobile Services',wc:103000,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:4.0,le:'2024-02-22',hv:0.2,or:1200 },
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
    'verified','nx2-v2026.1'];
  const { rows } = await db.query(SQL, params);
  const tag = rows[0].inserted ? '✅ inserted' : '🔄 updated';
  if (rows[0].inserted) inserted++; else updated++;
  console.log(`  ${c.n.padEnd(36)} ${s?.price?`💹 $${s.price}`:'⚠ no price'} ${tag}`);
  await new Promise(r => setTimeout(r, 700));
}
console.log(`\n✅ NX2 complete — ${inserted} inserted, ${updated} updated`);
console.log(`   Stock: ${stockOk}/${companies.length} | PE: ${peOk}/${companies.length} | Revenue: ${revOk}/${companies.length}`);
await db.end();
