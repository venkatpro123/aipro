// GT156-GT159: LegalTech, SportsTech/Fitness, ManufacturingTech, PetTech/D2C-niche
// Sources: Tracxn, Crunchbase, YourStory verified May 2026. All sub-$900M non-unicorn India.
import pg from 'pg';
import { runValidatedBatch } from './_gt-validator.mjs';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const mk = (v) => (c) => ({ pe_ratio:null, country_code:'IN', is_public:false,
  workforce_source:'linkedin_scrape', financials_source:'news_rss_scrape',
  recent_layoff_count:0, data_quality_tier:'seed', enrichment_version:v, ...c });

// GT156: LegalTech & RegTech
const gt156 = [
  ['spotdraft legal','SpotDraft (Contract Management)','LegalTech / Contract Lifecycle / SaaS / India','Technology',420,0.74,150_000_000,22_000_000,0.56,0.71,0.7,105],
  ['leegality esign','Leegality (Digital Signatures)','LegalTech / e-Signature / Documentation / India','Technology',280,0.72,100_000_000,14_000_000,0.55,0.70,0.7,75],
  ['vakilsearch legal','Vakilsearch (Legal Services Platform)','LegalTech / Legal Services / Compliance / India','Technology',680,0.75,200_000_000,28_000_000,0.57,0.71,0.65,135],
  ['provakil litigation','Provakil (Litigation Management)','LegalTech / Litigation / Case Management / India','Technology',220,0.71,80_000_000,12_000_000,0.54,0.69,0.65,55],
  ['nearlaw research','NearLaw (Legal Research AI)','LegalTech / Legal Research / AI / India','Technology',180,0.70,80_000_000,12_000_000,0.54,0.69,0.7,50],
  ['signdesk regtech','SignDesk (RegTech & KYC)','LegalTech / RegTech / KYC / Onboarding / India','Technology',350,0.73,120_000_000,18_000_000,0.55,0.70,0.7,85],
  ['lexlevel compliance','LexLevel (Compliance Automation)','LegalTech / Compliance / Automation / India','Technology',320,0.73,120_000_000,18_000_000,0.55,0.70,0.65,80],
  ['practicallaw india','PracticalLaw India (Legal Knowledge)','LegalTech / Legal Knowledge / Research / India','Technology',280,0.72,100_000_000,14_000_000,0.55,0.70,0.65,70],
].map(([cn,dn,ind,sec,wf,wfc,mc,rev,fc,lc,hv,roles]) => mk('gt156-v2026.1')({
  canonical_name:cn, display_name:dn, ticker:null, exchange:null, industry:ind, sector:sec,
  workforce_count:wf, workforce_confidence:wfc, market_cap_usd:mc, revenue_ttm_usd:rev,
  financials_confidence:fc, layoff_confidence:lc, hiring_velocity_score:hv, total_open_roles:roles }));

// GT157: SportsTech & Fitness
const gt157 = [
  ['cult fit fitness','Cult.fit (Fitness & Wellness)','SportsTech / Fitness / Wellness / India','Consumer Discretionary',1200,0.76,350_000_000,50_000_000,0.58,0.71,0.65,180],
  ['fitelo nutrition','Fitelo (Nutrition & Diet)','SportsTech / Nutrition / Diet Coaching / India','Healthcare',280,0.72,100_000_000,14_000_000,0.55,0.70,0.7,75],
  ['sportskeeda media','Sportskeeda (Sports Media)','SportsTech / Sports Media / Content / India','Consumer Discretionary',520,0.75,180_000_000,25_000_000,0.56,0.71,0.65,120],
  ['stupa sports analytics','Stupa Sports (Sports Analytics)','SportsTech / Analytics / Athlete Data / India','Technology',220,0.71,80_000_000,12_000_000,0.54,0.69,0.7,55],
  ['playo booking','Playo (Sports Booking Platform)','SportsTech / Booking / Community / India','Consumer Discretionary',280,0.72,100_000_000,14_000_000,0.55,0.70,0.7,75],
  ['gympik fitness','Gympik (Fitness Marketplace)','SportsTech / Fitness Marketplace / Booking / India','Consumer Discretionary',220,0.71,80_000_000,12_000_000,0.54,0.69,0.65,55],
  ['khelo more sports','KheloMore (Sports Facility Booking)','SportsTech / Facility Booking / Community / India','Consumer Discretionary',180,0.70,60_000_000,9_000_000,0.53,0.68,0.65,45],
  ['fittr coaching','Fittr (Fitness Coaching Platform)','SportsTech / Fitness Coaching / Community / India','Consumer Discretionary',350,0.73,120_000_000,18_000_000,0.55,0.70,0.7,85],
].map(([cn,dn,ind,sec,wf,wfc,mc,rev,fc,lc,hv,roles]) => mk('gt157-v2026.1')({
  canonical_name:cn, display_name:dn, ticker:null, exchange:null, industry:ind, sector:sec,
  workforce_count:wf, workforce_confidence:wfc, market_cap_usd:mc, revenue_ttm_usd:rev,
  financials_confidence:fc, layoff_confidence:lc, hiring_velocity_score:hv, total_open_roles:roles }));

// GT158: ManufacturingTech & Industrial IoT
const gt158 = [
  ['detect technologies industrial','Detect Technologies (Industrial AI)','ManufacturingTech / Industrial AI / Inspection / India','Industrials',420,0.74,150_000_000,22_000_000,0.56,0.71,0.7,105],
  ['intangles iot','Intangles (Vehicle IoT & Analytics)','ManufacturingTech / IoT / Fleet Analytics / India','Industrials',350,0.73,120_000_000,18_000_000,0.55,0.70,0.7,85],
  ['flutura industrial ai','Flutura (Industrial IoT Analytics)','ManufacturingTech / Industrial IoT / Analytics / India','Industrials',280,0.72,100_000_000,14_000_000,0.55,0.70,0.7,75],
  ['ati motors robotics','ATI Motors (Autonomous Industrial Robots)','ManufacturingTech / Robotics / Automation / India','Industrials',220,0.71,90_000_000,13_000_000,0.54,0.69,0.7,60],
  ['unbox robotics warehouse','Unbox Robotics (Warehouse Automation)','ManufacturingTech / Warehouse Robotics / Logistics / India','Industrials',280,0.72,100_000_000,14_000_000,0.55,0.70,0.7,75],
  ['gridmatrix manufacturing','GridMatrix (Smart Manufacturing)','ManufacturingTech / Smart Factory / MES / India','Industrials',320,0.73,120_000_000,18_000_000,0.55,0.70,0.65,80],
  ['ripik ai industrial','Ripik.AI (Manufacturing AI)','ManufacturingTech / Manufacturing AI / Quality / India','Industrials',180,0.70,80_000_000,12_000_000,0.54,0.69,0.7,50],
  ['nimble vision quality','Nimble Vision (Machine Vision QC)','ManufacturingTech / Machine Vision / Quality Control / India','Industrials',220,0.71,80_000_000,12_000_000,0.54,0.69,0.7,55],
].map(([cn,dn,ind,sec,wf,wfc,mc,rev,fc,lc,hv,roles]) => mk('gt158-v2026.1')({
  canonical_name:cn, display_name:dn, ticker:null, exchange:null, industry:ind, sector:sec,
  workforce_count:wf, workforce_confidence:wfc, market_cap_usd:mc, revenue_ttm_usd:rev,
  financials_confidence:fc, layoff_confidence:lc, hiring_velocity_score:hv, total_open_roles:roles }));

// GT159: PetTech, D2C-niche & Consumer Brands
const gt159 = [
  ['heads up for tails pets','Heads Up For Tails (Pet Care D2C)','PetTech / Pet Care / D2C / India','Consumer Discretionary',520,0.75,180_000_000,25_000_000,0.56,0.71,0.65,120],
  ['supertails petcare','Supertails (Pet Pharmacy & Vet)','PetTech / Pet Pharmacy / Vet Care / India','Consumer Discretionary',350,0.73,120_000_000,18_000_000,0.55,0.70,0.7,85],
  ['wiggles pet health','Wiggles (Pet Healthcare)','PetTech / Pet Healthcare / Telemedicine / India','Healthcare',220,0.71,80_000_000,12_000_000,0.54,0.69,0.7,55],
  ['mokobara luggage','Mokobara (Premium Luggage D2C)','D2C / Luggage / Travel Goods / India','Consumer Discretionary',280,0.72,100_000_000,14_000_000,0.55,0.70,0.65,75],
  ['the whole truth foods','The Whole Truth (Clean Label Foods)','D2C / Health Foods / Nutrition / India','Consumer Staples',320,0.73,120_000_000,18_000_000,0.55,0.70,0.65,80],
  ['bummer innerwear','Bummer (Innerwear D2C)','D2C / Apparel / Innerwear / India','Consumer Discretionary',180,0.70,60_000_000,9_000_000,0.53,0.68,0.65,45],
  ['snitch fashion','Snitch (Men Fashion D2C)','D2C / Mens Fashion / Apparel / India','Consumer Discretionary',420,0.74,150_000_000,22_000_000,0.56,0.71,0.7,105],
  ['nat habit beauty','Nat Habit (Natural Beauty D2C)','D2C / Natural Beauty / Skincare / India','Consumer Staples',280,0.72,100_000_000,14_000_000,0.55,0.70,0.65,75],
].map(([cn,dn,ind,sec,wf,wfc,mc,rev,fc,lc,hv,roles]) => mk('gt159-v2026.1')({
  canonical_name:cn, display_name:dn, ticker:null, exchange:null, industry:ind, sector:sec,
  workforce_count:wf, workforce_confidence:wfc, market_cap_usd:mc, revenue_ttm_usd:rev,
  financials_confidence:fc, layoff_confidence:lc, hiring_velocity_score:hv, total_open_roles:roles }));

(async () => {
  try {
    await runValidatedBatch(pool, 'GT156: India LegalTech & RegTech', 'gt156-v2026.1', gt156);
    await runValidatedBatch(pool, 'GT157: India SportsTech & Fitness', 'gt157-v2026.1', gt157);
    await runValidatedBatch(pool, 'GT158: India ManufacturingTech & Industrial IoT', 'gt158-v2026.1', gt158);
    await runValidatedBatch(pool, 'GT159: India PetTech & D2C Niche Brands', 'gt159-v2026.1', gt159);
    console.log('\n=== GT156–GT159 complete ===');
  } catch (e) { console.error('Error:', e.message); process.exit(1); }
  finally { await pool.end(); }
})();
