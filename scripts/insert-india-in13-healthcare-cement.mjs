// India Wave IN13 — Hospitals + Pharma + Cement extra + Chemicals extra
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'india-in13-v2026.1';
const g = mapRows(V);

const hospitalsRetail = g([
  ['cipla','Cipla Limited','CIPLA','NSE','IN','Healthcare','Branded Generic Pharmaceuticals / India',26000,13500,2900,true,0],
  ['procter gamble hygiene','Procter & Gamble Hygiene & Health Care Ltd','PGHH','NSE','IN','Consumer Staples','Personal Care Products / India',1200,8500,820,true,0],
  ['krishna institute medical','Krishna Institute of Medical Sciences Ltd','KIMS','NSE','IN','Healthcare','Multi-Specialty Hospitals / India',7000,3600,620,true,0],
  ['yatharth hospital','Yatharth Hospital & Trauma Care Services','YATHARTH','NSE','IN','Healthcare','Hospitals / India',3500,1050,310,true,0],
  ['sagility india','Sagility India Limited','SAGILITY','NSE','IN','Technology','Healthcare IT Services / India',28000,1600,520,true,0],
  ['sai life sciences','Sai Life Sciences Limited','SAILIFE','NSE','IN','Healthcare','CRAMS Pharma / India',5000,2600,320,true,0],
  ['healthcare global enterprises','HealthCare Global Enterprises Limited','HCG','NSE','IN','Healthcare','Cancer Care Hospitals / India',5000,820,420,true,0],
  ['concord biotech','Concord Biotech Limited','CONCORDBIO','NSE','IN','Healthcare','Fermentation Pharma / India',2000,3200,320,true,0],
  ['innova captab','Innova Captab Limited','INNOVACAP','NSE','IN','Healthcare','Pharmaceutical Formulations / India',3500,820,320,true,0],
  ['medplus health services','Medplus Health Services Limited','MEDPLUS','NSE','IN','Healthcare','Pharmacy Retail / India',9000,1200,820,true,0],
]);

const cementMore = g([
  ['birla corporation','Birla Corporation Limited','BIRLACORPN','NSE','IN','Materials','Cement & Jute Manufacturing / India',8000,3600,1300,true,0],
  ['ramco cements','The Ramco Cements Limited','RAMCOCEM','NSE','IN','Materials','Cement Manufacturing / India',7000,4200,1400,true,0],
  ['jk cement','JK Cement Limited','JKCEMENT','NSE','IN','Materials','Cement & White Cement / India',6000,4500,1450,true,0],
  ['star cement','Star Cement Limited','STARCEMENT','NSE','IN','Materials','Cement Manufacturing / India',3500,820,520,true,0],
  ['mangalam cement','Mangalam Cement Limited','MANGLMCEM','NSE','IN','Materials','Cement Manufacturing / India',2000,520,420,true,0],
  ['sagar cement','Sagar Cement Limited','SAGCEM','NSE','IN','Materials','Cement Manufacturing / India',1500,520,420,true,0],
]);

runWaves('INDIA IN13', V, [
  ['Hospitals & Pharma extras', hospitalsRetail],
  ['Cement (more)', cementMore],
]);
