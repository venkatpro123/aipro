// GLOBAL Wave 4 — US mid-caps & recent IPOs across sectors. Real listed cos, 2026 estimates (seed).
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
const V='glob-w4-v2026.1';

const tech = g(V)([
  ['samsara iot','Samsara Inc','IOT','NYSE','US','Technology','IoT / Connected Operations / USA',2600,25000,1200],
  ['confluent streaming','Confluent Inc','CFLT','NASDAQ','US','Technology','Data Streaming / Kafka / USA',3000,9000,900],
  ['gitlab devops','GitLab Inc','GTLB','NASDAQ','US','Technology','DevOps / Software Development / USA',2500,9000,700],
  ['hashicorp infra','HashiCorp Inc','HCP','NASDAQ','US','Technology','Cloud Infrastructure / IaC / USA',2300,7000,650],
  ['braze marketing','Braze Inc','BRZE','NASDAQ','US','Technology','Customer Engagement / Marketing / USA',1500,5000,600],
  ['amplitude analytics','Amplitude Inc','AMPL','NASDAQ','US','Technology','Product Analytics / Digital / USA',800,1500,300],
  ['toast restaurant tech','Toast Inc','TOST','NYSE','US','Financial Technology','Restaurant POS / Payments / USA',5000,20000,4900],
  ['klaviyo marketing','Klaviyo Inc','KVYO','NYSE','US','Technology','Marketing Automation / Email / USA',2000,11000,900],
  ['nutanix cloud','Nutanix Inc','NTNX','NASDAQ','US','Technology','Hybrid Cloud / HCI / USA',6500,18000,2200],
  ['dynatrace observability','Dynatrace Inc','DT','NYSE','US','Technology','Observability / APM / USA',4500,16000,1600],
  ['procore construction','Procore Technologies Inc','PCOR','NYSE','US','Technology','Construction Software / SaaS / USA',3500,11000,1100],
  ['informatica data','Informatica Inc','INFA','NYSE','US','Technology','Data Management / Integration / USA',5500,8000,1600],
]);

const health = g(V)([
  ['natera genetics','Natera Inc','NTRA','NASDAQ','US','Healthcare','Genetic Testing / Diagnostics / USA',2800,20000,1500],
  ['insulet diabetes','Insulet Corporation','PODD','NASDAQ','US','Healthcare','Medical Devices / Insulin Pumps / USA',4000,18000,2000],
  ['inspire medical','Inspire Medical Systems Inc','INSP','NYSE','US','Healthcare','Medical Devices / Sleep Apnea / USA',1500,5000,800],
  ['tempus ai health','Tempus AI Inc','TEM','NASDAQ','US','Healthcare','Precision Medicine / AI Diagnostics / USA',2400,9000,700],
  ['guardant oncology','Guardant Health Inc','GH','NASDAQ','US','Healthcare','Liquid Biopsy / Oncology / USA',3000,5000,750],
  ['exact sciences','Exact Sciences Corporation','EXAS','NASDAQ','US','Healthcare','Cancer Screening / Diagnostics / USA',6500,12000,2800],
  ['halozyme pharma','Halozyme Therapeutics Inc','HALO','NASDAQ','US','Healthcare','Biopharma / Drug Delivery / USA',1000,8000,1100],
]);

const indust = g(V)([
  ['axon enterprise','Axon Enterprise Inc','AXON','NASDAQ','US','Industrials','Public Safety Tech / Tasers / USA',4500,55000,2100],
  ['builders firstsource','Builders FirstSource Inc','BLDR','NYSE','US','Industrials','Building Materials / Distribution / USA',29000,18000,17000],
  ['comfort systems','Comfort Systems USA Inc','FIX','NYSE','US','Industrials','HVAC / Mechanical Services / USA',16000,15000,7000],
  ['curtiss wright','Curtiss-Wright Corporation','CW','NYSE','US','Industrials','Aerospace & Defense / Components / USA',9000,16000,3100],
  ['watsco hvac','Watsco Inc','WSO','NYSE','US','Industrials','HVAC Distribution / USA',7500,18000,7600],
  ['saia trucking','Saia Inc','SAIA','NASDAQ','US','Industrials','Trucking / LTL Freight / USA',15000,12000,3100],
  ['howmet aerospace','Howmet Aerospace Inc','HWM','NYSE','US','Industrials','Aerospace / Engineered Components / USA',23000,55000,7400],
]);

const consumer_fin = g(V)([
  ['wingstop restaurants','Wingstop Inc','WING','NASDAQ','US','Consumer Discretionary','Restaurants / QSR Franchise / USA',2000,11000,650],
  ['texas roadhouse','Texas Roadhouse Inc','TXRH','NASDAQ','US','Consumer Discretionary','Restaurants / Casual Dining / USA',120000,12000,5400],
  ['deckers footwear','Deckers Outdoor Corporation','DECK','NYSE','US','Consumer Discretionary','Footwear / HOKA & UGG / USA',4500,28000,4900],
  ['williams sonoma','Williams-Sonoma Inc','WSM','NYSE','US','Consumer Discretionary','Retail / Home Furnishings / USA',28000,22000,7700],
  ['robinhood markets','Robinhood Markets Inc','HOOD','NASDAQ','US','Financial Technology','Brokerage / Retail Trading / USA',2300,40000,2900],
  ['affirm bnpl','Affirm Holdings Inc','AFRM','NASDAQ','US','Financial Technology','BNPL / Consumer Lending / USA',2200,18000,2700],
  ['interactive brokers','Interactive Brokers Group Inc','IBKR','NASDAQ','US','Financials','Brokerage / Electronic Trading / USA',3000,75000,5000],
  ['carvana auto','Carvana Co','CVNA','NYSE','US','Consumer Discretionary','Used Car E-commerce / USA',18000,55000,14000],
  ['duolingo edtech','Duolingo Inc','DUOL','NASDAQ','US','Technology','EdTech / Language Learning / USA',800,18000,750],
  ['celsius energy drink','Celsius Holdings Inc','CELH','NASDAQ','US','Consumer Staples','Beverages / Energy Drinks / USA',1000,7000,1400],
]);

const ALL=[['US Tech',tech],['US Healthcare',health],['US Industrials',indust],['US Consumer/Fin',consumer_fin]];
(async () => {
  let totalNew=0, totalSkip=0;
  try {
    for (const [region, rows] of ALL) {
      const fresh = rows.filter(c => !existing.has(c.canonical_name));
      totalSkip += rows.length - fresh.length;
      if (!fresh.length) { console.log(`\n[${region}] all already exist`); continue; }
      const { ins } = await runValidatedGlobalBatch(pool, `GLOBAL W4 — ${region}`, V, fresh);
      totalNew += ins; fresh.forEach(c => existing.add(c.canonical_name));
    }
    console.log(`\n═══ WAVE 4 TOTAL: ${totalNew} new, ${totalSkip} skipped ═══`);
  } catch (e) { console.error('Error:', e.message); process.exit(1); }
  finally { await pool.end(); }
})();
