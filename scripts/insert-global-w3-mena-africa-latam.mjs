// GLOBAL Wave 3 — MENA + Africa + LATAM. Real listed cos, 2026 estimates (seed).
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
const V='glob-w3-v2026.1';

const mena = g(V)([
  ['acwa power','ACWA Power Company','2082','TADAWUL','SA','Utilities','Power & Water / Renewables / Saudi Arabia',4000,55000,5000],
  ['almarai food','Almarai Company','2280','TADAWUL','SA','Consumer Staples','Dairy & Food / FMCG / Saudi Arabia',43000,30000,5400],
  ['jarir bookstore','Jarir Marketing Company','4190','TADAWUL','SA','Consumer Discretionary','Retail / Electronics & Books / Saudi Arabia',5000,9000,2700],
  ['emaar properties','Emaar Properties PJSC','EMAAR','DFM','AE','Real Estate','Real Estate / Development / UAE',8000,32000,8000],
  ['dubai islamic bank','Dubai Islamic Bank PJSC','DIB','DFM','AE','Financials','Banking / Islamic Banking / UAE',9000,22000,5000],
  ['salik toll','Salik Company PJSC','SALIK','DFM','AE','Industrials','Toll Infrastructure / Roads / UAE',300,8000,650],
  ['americana restaurants','Americana Restaurants International','AMR','ADX','AE','Consumer Discretionary','Restaurants / QSR Franchises / UAE',40000,6000,2400],
  ['industries qatar','Industries Qatar QSC','IQCD','QSE','QA','Materials','Petrochemicals / Steel / Fertilizers / Qatar',6000,20000,4800],
  ['nice systems israel','Nice Ltd','NICE','TASE','IL','Technology','Software / Customer Experience AI / Israel',8500,11000,2700],
  ['camtek inspection','Camtek Ltd','CAMT','TASE','IL','Technology','Semiconductors / Inspection / Israel',900,4000,450],
]);

const africa = g(V)([
  ['dangote cement','Dangote Cement plc','DANGCEM','NGX','NG','Materials','Cement / Building Materials / Nigeria',18000,8000,4500],
  ['mtn nigeria','MTN Nigeria Communications plc','MTNN','NGX','NG','Communications','Telecom / Mobile Network / Nigeria',6500,7000,4500],
  ['guaranty trust','Guaranty Trust Holding Company plc','GTCO','NGX','NG','Financials','Banking / Financial Services / Nigeria',12000,4000,3000],
  ['safaricom telecom','Safaricom plc','SCOM','NSE','KE','Communications','Telecom / Mobile & M-Pesa / Kenya',6000,9000,2400],
  ['equity group kenya','Equity Group Holdings plc','EQTY','NSE','KE','Financials','Banking / Financial Services / Kenya',13000,3500,1800],
  ['capitec bank','Capitec Bank Holdings Ltd','CPI','JSE','ZA','Financials','Banking / Retail Banking / South Africa',15000,28000,4500],
  ['clicks group','Clicks Group Ltd','CLS','JSE','ZA','Consumer Staples','Retail / Pharmacy & Health / South Africa',18000,4500,3200],
  ['commercial intl bank egypt','Commercial International Bank','COMI','EGX','EG','Financials','Banking / Commercial Bank / Egypt',8000,6000,3500],
]);

const latam = g(V)([
  ['nu holdings','Nu Holdings Ltd','NU','NYSE','BR','Financial Technology','Digital Banking / Neobank / Brazil',8000,60000,11000],
  ['weg motors','WEG SA','WEGE3','B3','BR','Industrials','Electric Motors / Industrial Equipment / Brazil',45000,30000,7500],
  ['localiza rental','Localiza Rent a Car SA','RENT3','B3','BR','Consumer Discretionary','Car Rental / Fleet Management / Brazil',25000,12000,6000],
  ['totvs software','TOTVS SA','TOTS3','B3','BR','Technology','Enterprise Software / ERP / Brazil',12000,5000,1100],
  ['raia drogasil','Raia Drogasil SA','RADL3','B3','BR','Consumer Staples','Retail / Pharmacy / Brazil',55000,9000,8000],
  ['arcos dorados','Arcos Dorados Holdings Inc','ARCO','NYSE','AR','Consumer Discretionary','Restaurants / McDonalds LatAm / Argentina',95000,2500,4500],
  ['globant software','Globant SA','GLOB','NYSE','AR','Technology','IT Services / Software Development / Argentina',28000,8000,2400,500],
  ['mercadolibre commerce','MercadoLibre Inc','MELI','NASDAQ','AR','Technology','E-commerce / Fintech / Argentina',58000,95000,19000],
  ['falabella retail','SACI Falabella','FALABELLA','BCS','CL','Consumer Discretionary','Retail / Department Stores / Chile',95000,6000,13000],
  ['sociedad quimica minera','Sociedad Química y Minera de Chile','SQM','NYSE','CL','Materials','Lithium / Specialty Chemicals / Chile',8000,12000,5000],
  ['bancolombia','Bancolombia SA','CIB','NYSE','CO','Financials','Banking / Commercial Bank / Colombia',32000,10000,7000],
  ['gruma tortillas','Gruma SAB de CV','GRUMAB','BMV','MX','Consumer Staples','Food / Corn Flour & Tortillas / Mexico',23000,9000,6500],
  ['grupo bimbo','Grupo Bimbo SAB de CV','BIMBOA','BMV','MX','Consumer Staples','Food / Bakery / Mexico',148000,18000,21000],
  ['arca continental','Arca Continental SAB de CV','AC','BMV','MX','Consumer Staples','Beverages / Coca-Cola Bottler / Mexico',75000,14000,12000],
]);

const ALL=[['MENA',mena],['Africa',africa],['LATAM',latam]];
(async () => {
  let totalNew=0, totalSkip=0;
  try {
    for (const [region, rows] of ALL) {
      const fresh = rows.filter(c => !existing.has(c.canonical_name));
      totalSkip += rows.length - fresh.length;
      if (!fresh.length) { console.log(`\n[${region}] all already exist`); continue; }
      const { ins } = await runValidatedGlobalBatch(pool, `GLOBAL W3 — ${region}`, V, fresh);
      totalNew += ins; fresh.forEach(c => existing.add(c.canonical_name));
    }
    console.log(`\n═══ WAVE 3 TOTAL: ${totalNew} new, ${totalSkip} skipped ═══`);
  } catch (e) { console.error('Error:', e.message); process.exit(1); }
  finally { await pool.end(); }
})();
