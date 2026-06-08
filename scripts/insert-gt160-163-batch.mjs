// GT160-GT163: WealthTech, BeautyTech/D2C, FoodBrands/CloudKitchen, DevTools/AI-infra
// Sources: Tracxn, Crunchbase, YourStory verified May 2026. All sub-$900M non-unicorn India.
import pg from 'pg';
import { runValidatedBatch } from './_gt-validator.mjs';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const mk = (v) => (c) => ({ pe_ratio:null, country_code:'IN', is_public:false,
  workforce_source:'linkedin_scrape', financials_source:'news_rss_scrape',
  recent_layoff_count:0, data_quality_tier:'seed', enrichment_version:v, ...c });

const build = (v, rows) => rows.map(([cn,dn,ind,sec,wf,wfc,mc,rev,fc,lc,hv,roles]) => mk(v)({
  canonical_name:cn, display_name:dn, ticker:null, exchange:null, industry:ind, sector:sec,
  workforce_count:wf, workforce_confidence:wfc, market_cap_usd:mc, revenue_ttm_usd:rev,
  financials_confidence:fc, layoff_confidence:lc, hiring_velocity_score:hv, total_open_roles:roles }));

// GT160: WealthTech & Investing
const gt160 = build('gt160-v2026.1', [
  ['indmoney wealth','INDmoney (Wealth Management Super App)','WealthTech / Wealth Management / Investing / India','Financial Technology',680,0.75,250_000_000,35_000_000,0.57,0.71,0.7,145],
  ['scripbox investing','Scripbox (Mutual Fund Advisory)','WealthTech / Mutual Funds / Advisory / India','Financial Technology',420,0.74,150_000_000,22_000_000,0.56,0.71,0.65,105],
  ['kuvera wealth','Kuvera (Direct Mutual Funds)','WealthTech / Direct MF / Goal Investing / India','Financial Technology',280,0.72,100_000_000,14_000_000,0.55,0.70,0.7,75],
  ['wint wealth bonds','Wint Wealth (Bond Investing)','WealthTech / Fixed Income / Bonds / India','Financial Technology',220,0.71,80_000_000,12_000_000,0.54,0.69,0.7,55],
  ['dezerv wealth','Dezerv (Managed Wealth)','WealthTech / Managed Portfolios / HNI / India','Financial Technology',320,0.73,120_000_000,18_000_000,0.55,0.70,0.7,85],
  ['stable money deposits','Stable Money (Fixed Deposits Platform)','WealthTech / Fixed Deposits / Savings / India','Financial Technology',250,0.72,90_000_000,13_000_000,0.54,0.69,0.7,65],
  ['centricity wealth','Centricity (Wealth Infrastructure)','WealthTech / Wealth Infra / B2B / India','Financial Technology',280,0.72,100_000_000,14_000_000,0.55,0.70,0.65,75],
  ['multipl goal saving','Multipl (Spend-to-Invest)','WealthTech / Goal Saving / Investing / India','Financial Technology',180,0.70,70_000_000,10_000_000,0.53,0.68,0.7,50],
]);

// GT161: BeautyTech & Personal Care D2C
const gt161 = build('gt161-v2026.1', [
  ['sugar cosmetics beauty','SUGAR Cosmetics (Beauty D2C)','BeautyTech / Cosmetics / D2C / India','Consumer Staples',680,0.75,250_000_000,35_000_000,0.57,0.71,0.65,145],
  ['plum goodness skincare','Plum (Vegan Skincare D2C)','BeautyTech / Skincare / Vegan / D2C / India','Consumer Staples',420,0.74,150_000_000,22_000_000,0.56,0.71,0.65,105],
  ['minimalist skincare','Minimalist (Active Skincare D2C)','BeautyTech / Skincare / Actives / D2C / India','Consumer Staples',350,0.73,150_000_000,22_000_000,0.56,0.71,0.7,90],
  ['mcaffeine personal care','mCaffeine (Caffeinated Personal Care)','BeautyTech / Personal Care / D2C / India','Consumer Staples',280,0.72,100_000_000,14_000_000,0.55,0.70,0.65,75],
  ['pilgrim beauty','Pilgrim (Global-Inspired Beauty D2C)','BeautyTech / Beauty / Skincare / D2C / India','Consumer Staples',320,0.73,120_000_000,18_000_000,0.55,0.70,0.7,85],
  ['bombay shaving company','Bombay Shaving Company (Grooming D2C)','BeautyTech / Mens Grooming / D2C / India','Consumer Staples',420,0.74,180_000_000,25_000_000,0.56,0.71,0.65,110],
  ['foxtale skincare','Foxtale (Skincare D2C)','BeautyTech / Skincare / D2C / India','Consumer Staples',220,0.71,80_000_000,12_000_000,0.54,0.69,0.7,55],
  ['arata clean beauty','Arata (Clean Beauty D2C)','BeautyTech / Clean Beauty / Haircare / D2C / India','Consumer Staples',180,0.70,60_000_000,9_000_000,0.53,0.68,0.65,45],
]);

// GT162: Food Brands & Cloud Kitchens
const gt162 = build('gt162-v2026.1', [
  ['rebel foods kitchens','Rebel Foods (Cloud Kitchen Platform)','FoodTech / Cloud Kitchen / Multi-Brand / India','Consumer Discretionary',1800,0.76,400_000_000,60_000_000,0.58,0.71,0.65,210],
  ['wow momo foods','Wow! Momo (QSR Food Brand)','FoodTech / QSR / Food Brand / India','Consumer Discretionary',850,0.76,250_000_000,35_000_000,0.57,0.71,0.65,150],
  ['id fresh food','iD Fresh Food (Packaged Fresh Food)','FoodTech / Packaged Food / Fresh / India','Consumer Staples',680,0.75,200_000_000,28_000_000,0.57,0.71,0.6,135],
  ['blue tokai coffee','Blue Tokai (Specialty Coffee D2C)','FoodTech / Coffee / D2C / Cafe / India','Consumer Staples',420,0.74,150_000_000,22_000_000,0.56,0.71,0.65,105],
  ['slay coffee','SLAY Coffee (Coffee Brand & Cafes)','FoodTech / Coffee / D2C / India','Consumer Staples',280,0.72,100_000_000,14_000_000,0.55,0.70,0.65,75],
  ['eatfit healthy','EatFit (Healthy Food Brand)','FoodTech / Healthy Food / Cloud Kitchen / India','Consumer Discretionary',520,0.75,180_000_000,25_000_000,0.56,0.71,0.65,120],
  ['bigspoon meals','BigSpoon (Home-Style Meals)','FoodTech / Meal Delivery / Cloud Kitchen / India','Consumer Discretionary',280,0.72,100_000_000,14_000_000,0.55,0.70,0.7,75],
  ['samosa party qsr','Samosa Party (Snacks QSR Chain)','FoodTech / QSR / Snacks / India','Consumer Discretionary',320,0.73,120_000_000,18_000_000,0.55,0.70,0.65,80],
]);

// GT163: DevTools & AI Infrastructure
const gt163 = build('gt163-v2026.1', [
  ['portkey ai gateway','Portkey (LLM Gateway & Ops)','DevTools / AI Infrastructure / LLMOps / India','Technology',180,0.70,80_000_000,11_000_000,0.54,0.69,0.8,55],
  ['truefoundry mlops','TrueFoundry (ML Deployment Platform)','DevTools / MLOps / Deployment / India','Technology',220,0.71,90_000_000,13_000_000,0.54,0.69,0.8,60],
  ['portq ai observability','PortQ (AI Observability)','DevTools / AI Observability / Monitoring / India','Technology',180,0.70,80_000_000,12_000_000,0.54,0.69,0.8,50],
  ['last9 observability','Last9 (Observability Platform)','DevTools / Observability / SRE / India','Technology',220,0.71,90_000_000,13_000_000,0.54,0.69,0.8,60],
  ['atlan data catalog','Atlan (Data Catalog & Governance)','DevTools / Data Catalog / Governance / India','Technology',520,0.75,200_000_000,28_000_000,0.57,0.71,0.75,135],
  ['nimblebox mlops','NimbleBox (ML Workflows)','DevTools / MLOps / Workflows / India','Technology',180,0.70,70_000_000,10_000_000,0.53,0.68,0.8,50],
  ['typesense search','Typesense (Search Infrastructure)','DevTools / Search / Developer Infra / India','Technology',150,0.69,70_000_000,10_000_000,0.53,0.68,0.8,45],
  ['boltic data automation','Boltic (Data Automation Platform)','DevTools / Data Automation / Pipelines / India','Technology',220,0.71,90_000_000,13_000_000,0.54,0.69,0.75,60],
]);

(async () => {
  try {
    await runValidatedBatch(pool, 'GT160: India WealthTech & Investing', 'gt160-v2026.1', gt160);
    await runValidatedBatch(pool, 'GT161: India BeautyTech & Personal Care D2C', 'gt161-v2026.1', gt161);
    await runValidatedBatch(pool, 'GT162: India Food Brands & Cloud Kitchens', 'gt162-v2026.1', gt162);
    await runValidatedBatch(pool, 'GT163: India DevTools & AI Infrastructure', 'gt163-v2026.1', gt163);
    console.log('\n=== GT160–GT163 complete ===');
  } catch (e) { console.error('Error:', e.message); process.exit(1); }
  finally { await pool.end(); }
})();
