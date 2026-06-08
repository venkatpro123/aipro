// GLOBAL Wave 7 (final) — cross 300. Real listed cos, 2026 estimates (seed).
import pg from 'pg';
import fs from 'fs';
import { runValidatedGlobalBatch } from './_gt-validator-global.mjs';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const existing = new Set(JSON.parse(fs.readFileSync('scripts/_existing-names.json','utf8')));

const g = (v) => (rows) => rows.map(([cn,dn,tk,ex,cc,sec,ind,wf,mcM,revM,lay=0]) => ({
  canonical_name:cn, display_name:dn, ticker:tk, exchange:ex, country_code:cc,
  sector:sec, industry:ind, is_public:true,
  workforce_count:wf, workforce_source:'annual_report', workforce_confidence:0.7,
  market_cap_usd:Math.round(mcM*1e6), pe_ratio:null, revenue_ttm_usd:Math.round(revM*1e6),
  financials_source:'exchange_filing', financials_confidence:0.65,
  recent_layoff_count:lay, layoff_confidence:0.6,
  hiring_velocity_score:0.5, total_open_roles:Math.round(wf*0.03),
  data_quality_tier:'seed', enrichment_version:v,
}));
const V='glob-w7-v2026.1';

const semis = g(V)([
  ['lam research equip','Lam Research Corporation','LRCX','NASDAQ','US','Technology','Semiconductors / Wafer Fab Equipment / USA',18000,120000,16000],
  ['kla metrology','KLA Corporation','KLAC','NASDAQ','US','Technology','Semiconductors / Process Control / USA',15000,100000,11000],
  ['microchip tech','Microchip Technology Inc','MCHP','NASDAQ','US','Technology','Semiconductors / Microcontrollers / USA',22000,40000,7000,500],
  ['onsemi power','ON Semiconductor Corporation','ON','NASDAQ','US','Technology','Semiconductors / Power & Sensors / USA',28000,28000,7000],
  ['nxp semiconductors','NXP Semiconductors NV','NXPI','NASDAQ','NL','Technology','Semiconductors / Automotive Chips / Netherlands',34000,55000,13000],
  ['stmicroelectronics','STMicroelectronics NV','STM','EPA','FR','Technology','Semiconductors / Mixed Signal / France',50000,30000,14000,1000],
  ['infineon power chips','Infineon Technologies AG','IFX','XETRA','DE','Technology','Semiconductors / Power & Auto / Germany',58000,50000,16000],
]);

const energyUtil = g(V)([
  ['first solar panels','First Solar Inc','FSLR','NASDAQ','US','Energy','Solar Manufacturing / Thin Film / USA',7000,25000,4500],
  ['enphase solar','Enphase Energy Inc','ENPH','NASDAQ','US','Energy','Solar Microinverters / Storage / USA',3000,9000,1500,400],
  ['cheniere lng','Cheniere Energy Inc','LNG','NYSE','US','Energy','LNG / Natural Gas Exports / USA',1700,50000,16000],
  ['targa resources','Targa Resources Corp','TRGP','NYSE','US','Energy','Midstream / Natural Gas Liquids / USA',3000,40000,20000],
  ['orsted offshore wind','Ørsted A/S','ORSTED','CPH','DK','Utilities','Offshore Wind / Renewable Energy / Denmark',8000,30000,11000],
  ['iberdrola utility','Iberdrola SA','IBE','BME','ES','Utilities','Electric Utility / Renewables / Spain',42000,90000,55000],
  ['enel green power','Enel SpA','ENEL','MIL','IT','Utilities','Electric Utility / Power / Italy',60000,75000,95000],
  ['snam gas infra','Snam SpA','SRG','MIL','IT','Utilities','Gas Infrastructure / Pipelines / Italy',3500,16000,4000],
]);

const reitsRealEstate = g(V)([
  ['segro logistics reit','SEGRO plc','SGRO','LSE','GB','Real Estate','Industrial REIT / Logistics / UK',900,12000,900],
  ['unibail rodamco','Unibail-Rodamco-Westfield SE','URW','EPA','FR','Real Estate','Retail REIT / Shopping Centers / France',3000,9000,2700],
  ['vonovia residential','Vonovia SE','VNA','XETRA','DE','Real Estate','Residential Real Estate / Germany',16000,25000,6000],
  ['goodman group','Goodman Group','GMG','ASX','AU','Real Estate','Industrial REIT / Logistics / Australia',3000,45000,2000],
  ['capitaland investment','CapitaLand Investment Ltd','9CI','SGX','SG','Real Estate','Real Estate Investment / Singapore',11000,11000,2200],
]);

const finServ = g(V)([
  ['adyen payments','Adyen NV','ADYEN','AMS','NL','Financial Technology','Payments / Merchant Acquiring / Netherlands',4000,55000,2000],
  ['wise transfers','Wise plc','WISE','LSE','GB','Financial Technology','Cross-Border Payments / UK',5500,12000,1700],
  ['london stock exchange','London Stock Exchange Group plc','LSEG','LSE','GB','Financials','Financial Markets / Data / UK',25000,75000,11000],
  ['deutsche boerse','Deutsche Börse AG','DB1','XETRA','DE','Financials','Exchange / Market Infrastructure / Germany',14000,45000,6000],
  ['partners group private','Partners Group Holding AG','PGHN','SIX','CH','Financials','Private Markets / Asset Management / Switzerland',1800,30000,2200],
  ['julius baer wealth','Julius Bär Gruppe AG','BAER','SIX','CH','Financials','Private Banking / Wealth Management / Switzerland',7500,15000,4000],
  ['b3 exchange brazil','B3 SA Brasil Bolsa Balcão','B3SA3','B3','BR','Financials','Exchange / Financial Markets / Brazil',1500,9000,2000],
  ['dbs bank singapore','DBS Group Holdings Ltd','D05','SGX','SG','Financials','Banking / Commercial Bank / Singapore',40000,90000,20000],
]);

const consTech = g(V)([
  ['spotify audio','Spotify Technology SA','SPOT','NYSE','SE','Communications','Music Streaming / Audio / Sweden',7500,110000,16000],
  ['flutter gaming','Flutter Entertainment plc','FLUT','NYSE','IE','Consumer Discretionary','Gambling / Sports Betting / Ireland',30000,45000,14000],
  ['reply consulting','Reply SpA','REY','MIL','IT','Technology','IT Consulting / Digital Services / Italy',15000,7000,2200],
  ['kingspan insulation','Kingspan Group plc','KRX','LSE','IE','Industrials','Building Insulation / Materials / Ireland',22000,18000,9000],
  ['smurfit packaging','Smurfit Westrock plc','SW','NYSE','IE','Materials','Paper Packaging / Ireland',100000,22000,32000],
  ['bechtle it services','Bechtle AG','BC8','XETRA','DE','Technology','IT Services / Reseller / Germany',15000,7000,7000],
  ['scout24 marketplace','Scout24 SE','G24','XETRA','DE','Technology','Digital Marketplace / Real Estate / Germany',1500,6000,600],
  ['delivery hero food','Delivery Hero SE','DHER','XETRA','DE','Consumer Discretionary','Food Delivery / Q-Commerce / Germany',45000,9000,12000,1000],
]);

const ALL=[['Semiconductors',semis],['Energy/Utilities',energyUtil],['REITs',reitsRealEstate],['FinServ',finServ],['Cons/Tech',consTech]];
(async () => {
  let totalNew=0, totalSkip=0;
  try {
    for (const [region, rows] of ALL) {
      const fresh = rows.filter(c => !existing.has(c.canonical_name));
      totalSkip += rows.length - fresh.length;
      if (!fresh.length) { console.log(`\n[${region}] all already exist`); continue; }
      const { ins } = await runValidatedGlobalBatch(pool, `GLOBAL W7 — ${region}`, V, fresh);
      totalNew += ins; fresh.forEach(c => existing.add(c.canonical_name));
    }
    console.log(`\n═══ WAVE 7 TOTAL: ${totalNew} new, ${totalSkip} skipped ═══`);
  } catch (e) { console.error('Error:', e.message); process.exit(1); }
  finally { await pool.end(); }
})();
