// GLOBAL Wave 8 (closeout) — cross 300. Real listed cos, 2026 estimates (seed).
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
const V='glob-w8-v2026.1';

const closeout = g(V)([
  ['fortnox accounting','Fortnox AB','FNOX','OMX','SE','Technology','Accounting Software / SMB / Sweden',900,8000,300],
  ['nemak auto parts','Nemak SAB de CV','NMK','BMV','MX','Consumer Discretionary','Automotive Components / Aluminium / Mexico',23000,1500,5000],
  ['kpn telecom','Koninklijke KPN NV','KPN','AMS','NL','Communications','Telecom / Fixed & Mobile / Netherlands',10000,16000,6000],
  ['wolters kluwer','Wolters Kluwer NV','WKL','AMS','NL','Technology','Information Services / Professional / Netherlands',21000,45000,6500],
  ['geberit sanitary','Geberit AG','GEBN','SIX','CH','Industrials','Sanitary Products / Plumbing / Switzerland',12000,22000,3500],
  ['novonesis enzymes','Novonesis (Novozymes) A/S','NSIS-B','CPH','DK','Materials','Biosolutions / Enzymes / Denmark',10000,30000,4000],
  ['tryg insurance','Tryg A/S','TRYG','CPH','DK','Financials','Insurance / Non-Life / Denmark',7000,12000,5000],
  ['bank rakyat indonesia','PT Bank Rakyat Indonesia Tbk','BBRI','IDX','ID','Financials','Banking / Microfinance / Indonesia',120000,55000,14000],
  ['woodside energy','Woodside Energy Group Ltd','WDS','ASX','AU','Energy','Oil & Gas / LNG / Australia',6000,40000,13000],
  ['fortescue iron ore','Fortescue Ltd','FMG','ASX','AU','Materials','Iron Ore Mining / Green Energy / Australia',15000,55000,18000],
]);

(async () => {
  let totalNew=0, totalSkip=0;
  try {
    const fresh = closeout.filter(c => !existing.has(c.canonical_name));
    totalSkip = closeout.length - fresh.length;
    if (fresh.length) {
      const { ins } = await runValidatedGlobalBatch(pool, 'GLOBAL W8 — Closeout', V, fresh);
      totalNew = ins;
    }
    console.log(`\n═══ WAVE 8 TOTAL: ${totalNew} new, ${totalSkip} skipped ═══`);
  } catch (e) { console.error('Error:', e.message); process.exit(1); }
  finally { await pool.end(); }
})();
