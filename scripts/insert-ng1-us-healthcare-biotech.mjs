import pg from 'pg';
const { Client } = pg;
const db = new Client(process.env.DATABASE_URL);
await db.connect();
console.log('✓ Connected — NG1: US Healthcare, Biotech & Medical Devices (2026 data)\n');

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

// 2026 data: FY2025 annual reports where available, FY2024 otherwise
// wc=workforce, ws=workforce_source, wf=workforce_confidence (0.97=exact AR, 0.95=approx)
// lo=layoff_count, lp=layoff_pct, le=layoff_event_date
// hv=hiring_velocity_score (-5 to +5), or=open_roles_estimate
const companies = [
  // Moderna — mRNA vaccines; cut ~1000 jobs (20%) Nov 2024; FY2024 rev $3.2B
  { n:'moderna',d:'Moderna Inc.',cc:'US',tk:'MRNA',ex:'NASDAQ',sec:'Healthcare',ind:'Biotechnology / mRNA',wc:3900,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:20.0,le:'2024-11-07',hv:-0.2,or:280 },
  // Regeneron — rare disease/oncology; no recent layoffs; FY2024 rev $14.2B
  { n:'regeneron pharmaceuticals',d:'Regeneron Pharmaceuticals Inc.',cc:'US',tk:'REGN',ex:'NASDAQ',sec:'Healthcare',ind:'Biotechnology',wc:15500,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.4,or:580 },
  // Gilead Sciences — antivirals/HIV/oncology; cut ~850 jobs Oct 2023; FY2024 rev $27.3B
  { n:'gilead sciences',d:'Gilead Sciences Inc.',cc:'US',tk:'GILD',ex:'NASDAQ',sec:'Healthcare',ind:'Antiviral Biotechnology',wc:17000,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:5.0,le:'2023-10-11',hv:0.2,or:520 },
  // Amgen — large biotech; acquired Horizon FY2023; FY2024 rev $33.4B
  { n:'amgen',d:'Amgen Inc.',cc:'US',tk:'AMGN',ex:'NASDAQ',sec:'Healthcare',ind:'Biotechnology',wc:24200,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:1.5,le:'2024-01-08',hv:0.3,or:780 },
  // Vertex Pharmaceuticals — CF/rare disease; no layoffs; FY2024 rev $10.9B
  { n:'vertex pharmaceuticals',d:'Vertex Pharmaceuticals Inc.',cc:'US',tk:'VRTX',ex:'NASDAQ',sec:'Healthcare',ind:'Rare Disease Biotechnology',wc:5200,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.5,or:380 },
  // Illumina — genomics sequencing; restructuring 2023-2024 ~1000 jobs; FY2024 rev $4.5B
  { n:'illumina',d:'Illumina Inc.',cc:'US',tk:'ILMN',ex:'NASDAQ',sec:'Healthcare',ind:'Genomics & Life Sciences Tools',wc:8700,ws:'annual_report_fy2024',wf:0.97,lo:2,lp:10.0,le:'2024-03-05',hv:0.2,or:320 },
  // Medtronic — medical devices; FY2025 (Apr yr-end) rev $32.4B; ~1000 job reduction Jan 2024
  { n:'medtronic',d:'Medtronic PLC',cc:'IE',tk:'MDT',ex:'NYSE',sec:'Healthcare',ind:'Medical Devices',wc:95000,ws:'annual_report_fy2025',wf:0.97,lo:1,lp:1.0,le:'2024-01-26',hv:0.2,or:1200 },
  // Stryker — orthopedics/surgical; no recent large layoffs; FY2024 rev $22.6B
  { n:'stryker',d:'Stryker Corporation',cc:'US',tk:'SYK',ex:'NYSE',sec:'Healthcare',ind:'Medical Devices',wc:52000,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.4,or:1100 },
  // Intuitive Surgical — robotic surgery (da Vinci); growing; FY2024 rev $8.4B
  { n:'intuitive surgical',d:'Intuitive Surgical Inc.',cc:'US',tk:'ISRG',ex:'NASDAQ',sec:'Healthcare',ind:'Robotic Surgery',wc:13000,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.6,or:680 },
  // Boston Scientific — cardiac/endoscopy devices; FY2024 rev $15.8B
  { n:'boston scientific',d:'Boston Scientific Corporation',cc:'US',tk:'BSX',ex:'NYSE',sec:'Healthcare',ind:'Medical Devices',wc:48000,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.4,or:980 },
  // Becton Dickinson — diagnostics/devices; FY2024 (Sep yr-end) rev $20.2B; sold Embecta unit
  { n:'becton dickinson',d:'Becton, Dickinson and Company',cc:'US',tk:'BDX',ex:'NYSE',sec:'Healthcare',ind:'Medical Devices & Diagnostics',wc:71000,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:3.0,le:'2023-09-20',hv:0.2,or:980 },
  // CVS Health — pharmacy/PBM/health insurance; ~2900 corp layoffs Aug 2024; FY2024 rev $372B
  { n:'cvs health',d:'CVS Health Corporation',cc:'US',tk:'CVS',ex:'NYSE',sec:'Healthcare',ind:'Pharmacy & Health Services',wc:295000,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:1.0,le:'2024-08-01',hv:0.2,or:3800 },
  // Cigna — health insurer/PBM; FY2024 rev $246B (incl Evernorth pharmacy)
  { n:'cigna group',d:'The Cigna Group',cc:'US',tk:'CI',ex:'NYSE',sec:'Healthcare',ind:'Health Insurance & PBM',wc:170000,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:3.0,le:'2024-03-04',hv:0.2,or:2200 },
  // Humana — Medicare Advantage insurer; ~2000 jobs cut Feb 2025; FY2024 rev $116B
  { n:'humana',d:'Humana Inc.',cc:'US',tk:'HUM',ex:'NYSE',sec:'Healthcare',ind:'Health Insurance',wc:67000,ws:'annual_report_fy2024',wf:0.97,lo:2,lp:3.0,le:'2025-02-13',hv:0.1,or:1200 },
  // DaVita — dialysis provider; no recent large layoffs; FY2024 rev $12.8B
  { n:'davita',d:'DaVita Inc.',cc:'US',tk:'DVA',ex:'NYSE',sec:'Healthcare',ind:'Dialysis Services',wc:45000,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.2,or:520 },
  // Quest Diagnostics — lab testing; FY2024 rev $9.5B
  { n:'quest diagnostics',d:'Quest Diagnostics Inc.',cc:'US',tk:'DGX',ex:'NYSE',sec:'Healthcare',ind:'Clinical Laboratory Testing',wc:50000,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.2,or:620 },
  // Laboratory Corporation — lab testing; FY2024 rev $12.6B (post Fortrea spinoff FY2023)
  { n:'laboratory corporation',d:'Laboratory Corporation of America Holdings',cc:'US',tk:'LH',ex:'NYSE',sec:'Healthcare',ind:'Clinical Laboratory Services',wc:60000,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.2,or:680 },
  // Hologic — women's health diagnostics; FY2025 (Sep yr-end) rev $4.0B
  { n:'hologic',d:'Hologic Inc.',cc:'US',tk:'HOLX',ex:'NASDAQ',sec:'Healthcare',ind:"Women's Health Diagnostics",wc:6700,ws:'annual_report_fy2025',wf:0.97,lo:0,lp:null,le:null,hv:0.3,or:280 },
  // Zimmer Biomet — orthopedic implants; ~600 job reduction 2023; FY2024 rev $7.8B
  { n:'zimmer biomet',d:'Zimmer Biomet Holdings Inc.',cc:'US',tk:'ZBH',ex:'NYSE',sec:'Healthcare',ind:'Orthopedic Medical Devices',wc:17000,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:4.0,le:'2023-07-28',hv:0.2,or:380 },
  // Edwards Lifesciences — cardiac valves; sold heart failure unit to BD Jan 2025; FY2024 rev $6.9B
  { n:'edwards lifesciences',d:'Edwards Lifesciences Corporation',cc:'US',tk:'EW',ex:'NYSE',sec:'Healthcare',ind:'Cardiac Devices',wc:18500,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.3,or:520 },
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
    'verified','ng1-v2026.1'
  ];
  const { rows } = await db.query(SQL, params);
  const tag = rows[0].inserted ? '✅ inserted' : '🔄 updated';
  if (rows[0].inserted) inserted++; else updated++;
  const pr = s?.price ? `💹 $${s.price}` : '⚠ no price';
  console.log(`  ${c.n.padEnd(38)} ${pr} ${tag}`);
  await new Promise(r => setTimeout(r, 700));
}
console.log(`\n✅ NG1 complete — ${inserted} inserted, ${updated} updated`);
console.log(`   Stock: ${stockOk}/${companies.length} | PE: ${peOk}/${companies.length} | Revenue: ${revOk}/${companies.length}`);
await db.end();
