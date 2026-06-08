// GLOBAL Wave 1 — Europe + ANZ + Canada. Real listed companies, 2026 estimates (seed tier).
// Pre-filters against existing canonical_names so every insert is genuinely new.
import pg from 'pg';
import fs from 'fs';
import { runValidatedGlobalBatch } from './_gt-validator-global.mjs';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const existing = new Set(JSON.parse(fs.readFileSync('scripts/_existing-names.json','utf8')));

// compact builder: [canonical, display, ticker, exchange, cc, sector, industry, wf, mcM, revM, layoffs]
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

// ── Germany / DACH ───────────────────────────────────────────────
const deach = g('glob-w1-v2026.1')([
  ['rheinmetall defense','Rheinmetall AG','RHM','XETRA','DE','Industrials','Defense / Weapons / Military Vehicles / Germany',30000,28000,9800],
  ['hannover re','Hannover Rück SE','HNR1','XETRA','DE','Financials','Insurance / Reinsurance / Germany',3500,27000,28000],
  ['knorr bremse','Knorr-Bremse AG','KBX','XETRA','DE','Industrials','Braking Systems / Rail & Truck / Germany',32000,9000,8200],
  ['carl zeiss meditec','Carl Zeiss Meditec AG','AFX','XETRA','DE','Healthcare','Medical Devices / Ophthalmology / Germany',5200,9500,2400],
  ['nemetschek software','Nemetschek SE','NEM','XETRA','DE','Technology','Software / AEC / Construction Software / Germany',3700,11000,1000],
  ['gea group','GEA Group AG','G1A','XETRA','DE','Industrials','Machinery / Food Processing / Germany',18500,9000,5600],
  ['kion group','KION Group AG','KGX','XETRA','DE','Industrials','Material Handling / Forklifts / Germany',42000,8500,11800],
  ['ams osram','ams OSRAM AG','AMS','SIX','AT','Technology','Semiconductors / Optical / Sensors / Austria',20000,3000,3600,1500],
]);

// ── France ───────────────────────────────────────────────────────
const fr = g('glob-w1-v2026.1')([
  ['thales group','Thales SA','HO','EPA','FR','Industrials','Defense / Aerospace / Electronics / France',81000,42000,21000],
  ['legrand electrical','Legrand SA','LR','EPA','FR','Industrials','Electrical Infrastructure / Wiring / France',39000,52000,9200],
  ['dassault systemes','Dassault Systèmes SE','DSY','EPA','FR','Technology','Software / 3D Design / PLM / France',24000,55000,6800],
  ['edenred payments','Edenred SE','EDEN','EPA','FR','Financial Technology','Payments / Employee Benefits / France',12000,11000,2900],
  ['teleperformance bpo','Teleperformance SE','TEP','EPA','FR','Industrials','BPO / Customer Experience / France',410000,11000,10500,3000],
  ['ipsen pharma','Ipsen SA','IPN','EPA','FR','Healthcare','Pharmaceuticals / Oncology / France',5700,4200,3700],
  ['soitec semiconductors','Soitec SA','SOI','EPA','FR','Technology','Semiconductors / SOI Wafers / France',2200,2000,1100],
]);

// ── Netherlands / Benelux ────────────────────────────────────────
const benelux = g('glob-w1-v2026.1')([
  ['besi semiconductors','BE Semiconductor Industries NV','BESI','AMS','NL','Technology','Semiconductors / Assembly Equipment / Netherlands',2000,11000,650],
  ['aalberts industrial','Aalberts NV','AALB','AMS','NL','Industrials','Industrial Technology / Flow Control / Netherlands',16000,4500,3400],
  ['arcadis engineering','Arcadis NV','ARCAD','AMS','NL','Industrials','Engineering / Design Consultancy / Netherlands',36000,6500,5200],
  ['galapagos biotech','Galapagos NV','GLPG','AMS','BE','Healthcare','Biotech / Immunology / Belgium',1100,3500,500],
  ['umicore materials','Umicore SA','UMI','EBR','BE','Materials','Materials Technology / Battery Materials / Belgium',11500,3000,4100],
  ['azelis chemicals','Azelis Group NV','AZE','EBR','BE','Materials','Specialty Chemicals / Distribution / Belgium',4200,2500,4900],
]);

// ── Switzerland ──────────────────────────────────────────────────
const ch = g('glob-w1-v2026.1')([
  ['straumann dental','Straumann Holding AG','STMN','SIX','CH','Healthcare','Medical Devices / Dental Implants / Switzerland',11000,24000,2900],
  ['sonova hearing','Sonova Holding AG','SOON','SIX','CH','Healthcare','Medical Devices / Hearing Aids / Switzerland',17500,18000,4000],
  ['vat group vacuum','VAT Group AG','VACN','SIX','CH','Technology','Semiconductors / Vacuum Valves / Switzerland',3000,15000,1100],
  ['logitech peripherals','Logitech International SA','LOGN','SIX','CH','Technology','Consumer Electronics / Peripherals / Switzerland',7500,16000,4300],
  ['barry callebaut chocolate','Barry Callebaut AG','BARN','SIX','CH','Consumer Staples','Food / Chocolate Manufacturing / Switzerland',13000,9000,12500],
]);

// ── Nordics ──────────────────────────────────────────────────────
const nordics = g('glob-w1-v2026.1')([
  ['evolution gaming','Evolution AB','EVO','OMX','SE','Consumer Discretionary','Gaming / Live Casino Software / Sweden',20000,28000,2200],
  ['hexagon metrology','Hexagon AB','HEXA-B','OMX','SE','Technology','Industrial Tech / Metrology / Sweden',24000,30000,5400],
  ['sinch communications','Sinch AB','SINCH','OMX','SE','Technology','Communications / CPaaS / Messaging / Sweden',4000,3000,7800],
  ['vestas wind','Vestas Wind Systems A/S','VWS','CPH','DK','Energy','Renewable Energy / Wind Turbines / Denmark',30000,18000,17800],
  ['genmab biotech','Genmab A/S','GMAB','CPH','DK','Healthcare','Biotech / Antibody Therapeutics / Denmark',2700,42000,2900],
  ['kongsberg gruppen','Kongsberg Gruppen ASA','KOG','OSL','NO','Industrials','Defense / Maritime / Aerospace / Norway',14000,15000,4200],
  ['nibe industrier','NIBE Industrier AB','NIBE-B','OMX','SE','Industrials','Climate Solutions / Heat Pumps / Sweden',21000,9000,4400],
  ['kone elevators','KONE Oyj','KNEBV','HEL','FI','Industrials','Machinery / Elevators & Escalators / Finland',60000,22000,11600],
]);

// ── UK ───────────────────────────────────────────────────────────
const uk = g('glob-w1-v2026.1')([
  ['games workshop','Games Workshop Group plc','GAW','LSE','GB','Consumer Discretionary','Tabletop Games / Miniatures / UK',2800,5500,650],
  ['halma safety','Halma plc','HLMA','LSE','GB','Technology','Safety & Environmental Tech / UK',8000,14000,2800],
  ['intertek testing','Intertek Group plc','ITRK','LSE','GB','Industrials','Testing Inspection Certification / UK',44000,11000,4200],
  ['spirax sarco','Spirax-Sarco Engineering plc','SPX','LSE','GB','Industrials','Engineering / Steam & Fluid Control / UK',11000,9000,2100],
  ['weir mining','The Weir Group plc','WEIR','LSE','GB','Industrials','Mining Technology / Equipment / UK',12000,7000,3300],
  ['oxford instruments','Oxford Instruments plc','OXIG','LSE','GB','Technology','Scientific Instruments / Nanotech / UK',2400,2000,650],
  ['renishaw metrology','Renishaw plc','RSW','LSE','GB','Technology','Precision Metrology / Manufacturing / UK',5300,4500,900],
]);

// ── Southern Europe ──────────────────────────────────────────────
const seur = g('glob-w1-v2026.1')([
  ['amadeus travel tech','Amadeus IT Group SA','AMS','BME','ES','Technology','Travel Technology / GDS / Spain',19000,30000,6300],
  ['cellnex towers','Cellnex Telecom SA','CLNX','BME','ES','Communications','Telecom Infrastructure / Towers / Spain',3000,30000,4400],
  ['fluidra pools','Fluidra SA','FDR','BME','ES','Consumer Discretionary','Pool Equipment / Water Solutions / Spain',7500,5000,2200],
  ['interpump hydraulics','Interpump Group SpA','IP','MIL','IT','Industrials','Hydraulics / Pumps / Italy',13000,5500,2300],
  ['brembo brakes','Brembo NV','BRE','MIL','IT','Consumer Discretionary','Automotive / Braking Systems / Italy',15000,5000,4200],
  ['recordati pharma','Recordati Industria Chimica SpA','REC','MIL','IT','Healthcare','Pharmaceuticals / Rare Diseases / Italy',4500,12000,2400],
  ['galp energia','Galp Energia SGPS SA','GALP','ELI','PT','Energy','Oil & Gas / Energy / Portugal',6500,12000,19000],
]);

// ── Australia / NZ ───────────────────────────────────────────────
const anz = g('glob-w1-v2026.1')([
  ['wisetech logistics','WiseTech Global Ltd','WTC','ASX','AU','Technology','Logistics Software / Supply Chain / Australia',3500,28000,750],
  ['xero accounting','Xero Ltd','XRO','ASX','NZ','Technology','Accounting Software / SMB SaaS / New Zealand',4800,18000,1200],
  ['reece plumbing','Reece Ltd','REH','ASX','AU','Industrials','Plumbing & HVAC Distribution / Australia',9000,16000,6800],
  ['altium pcb','Altium Ltd','ALU','ASX','AU','Technology','EDA Software / PCB Design / Australia',1500,5000,300],
  ['fisher paykel healthcare','Fisher & Paykel Healthcare Corp','FPH','NZX','NZ','Healthcare','Medical Devices / Respiratory / New Zealand',6500,16000,1100],
  ['mineral resources','Mineral Resources Ltd','MIN','ASX','AU','Materials','Mining Services / Lithium & Iron Ore / Australia',7000,6000,3200],
  ['nextdc data centers','NEXTDC Ltd','NXT','ASX','AU','Technology','Data Centers / Cloud Infrastructure / Australia',900,7000,260],
]);

// ── Canada ───────────────────────────────────────────────────────
const ca = g('glob-w1-v2026.1')([
  ['constellation software','Constellation Software Inc','CSU','TSX','CA','Technology','Software / Vertical Market Roll-up / Canada',47000,55000,9500],
  ['descartes systems','The Descartes Systems Group Inc','DSG','TSX','CA','Technology','Logistics Software / Supply Chain / Canada',2400,9000,650],
  ['cgi consulting','CGI Inc','GIB','TSX','CA','Technology','IT Services / Consulting / Canada',91000,28000,11000],
  ['lightspeed commerce','Lightspeed Commerce Inc','LSPD','TSX','CA','Financial Technology','Commerce Platform / POS / Canada',3000,3500,900],
  ['stantec engineering','Stantec Inc','STN','TSX','CA','Industrials','Engineering / Design Consultancy / Canada',31000,12000,4800],
  ['ats automation','ATS Corporation','ATS','TSX','CA','Industrials','Automation Systems / Robotics / Canada',7500,3500,2300],
  ['celestica electronics','Celestica Inc','CLS','TSX','CA','Technology','Electronics Manufacturing / EMS / Canada',28000,11000,9600],
]);

const ALL = [
  ['Germany/DACH', deach], ['France', fr], ['Netherlands/Benelux', benelux],
  ['Switzerland', ch], ['Nordics', nordics], ['UK', uk],
  ['Southern Europe', seur], ['Australia/NZ', anz], ['Canada', ca],
];

(async () => {
  let totalNew = 0, totalSkip = 0;
  try {
    for (const [region, rows] of ALL) {
      const fresh = rows.filter(c => !existing.has(c.canonical_name));
      const skip = rows.length - fresh.length;
      totalSkip += skip;
      if (!fresh.length) { console.log(`\n[${region}] all ${rows.length} already exist — skipped`); continue; }
      const { ins } = await runValidatedGlobalBatch(pool, `GLOBAL W1 — ${region} (${skip} pre-existing skipped)`, 'glob-w1-v2026.1', fresh);
      totalNew += ins;
      fresh.forEach(c => existing.add(c.canonical_name));
    }
    console.log(`\n═══ WAVE 1 TOTAL: ${totalNew} new inserted, ${totalSkip} pre-existing skipped ═══`);
  } catch (e) { console.error('Error:', e.message); process.exit(1); }
  finally { await pool.end(); }
})();
