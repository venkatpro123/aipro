// India Wave IN12 — New-age Listed Tech + Consumer Internet + EMS
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'india-in12-v2026.1';
const g = mapRows(V);

const newAgeTech = g([
  ['campus activewear','Campus Activewear Limited','CAMPUS','NSE','IN','Consumer Discretionary','Sports Footwear / India',3500,820,520,true,0],
  ['brainbees solutions','Brainbees Solutions Limited (FirstCry)','BRAINBEES','NSE','IN','Consumer Discretionary','Baby & Kids E-commerce / India',8000,2100,820,true,0],
  ['medi assist','Medi Assist Healthcare Services Limited','MEDIASSIST','NSE','IN','Financial Technology','Health Insurance TPA / India',5000,820,410,true,0],
  ['emcure pharmaceuticals','Emcure Pharmaceuticals Limited','EMCURE','NSE','IN','Healthcare','Injectables & Formulations / India',12000,3600,1050,true,0],
  ['awfis space solutions','Awfis Space Solutions Limited','AWFIS','NSE','IN','Real Estate','Flexible Workspace / India',1200,820,220,true,0],
  ['honasa consumer','Honasa Consumer Limited (Mamaearth)','HONASA','NSE','IN','Consumer Staples','Direct-to-Consumer FMCG / India',2000,1050,420,true,0],
  ['unicommerce esolutions','Unicommerce eSolutions Limited','UNICOMM','NSE','IN','Technology','SaaS E-commerce Fulfilment / India',1000,820,120,true,0],
  ['ideaforge technology','ideaForge Technology Limited','IDEAFORGE','NSE','IN','Industrials','Drones & UAVs / India',800,520,120,true,0],
]);

const electronics = g([
  ['elin electronics','Elin Electronics Limited','ELIN','NSE','IN','Industrials','Electronic Manufacturing Services / India',4500,820,420,true,0],
  ['amber enterprises','Amber Enterprises India Limited','AMBER','NSE','IN','Industrials','AC & Electronics OEM / India',10000,5200,2100,true,0],
  ['dixon technologies','Dixon Technologies (India) Limited','DIXON','NSE','IN','Industrials','Contract Electronics Manufacturing / India',18000,9500,2600,true,0],
  ['pgel','PG Electroplast Limited','PGEL','NSE','IN','Industrials','Electronic Manufacturing Services / India',6000,1050,620,true,0],
  ['sona blw precision','Sona BLW Precision Forgings Limited','SONACOMS','NSE','IN','Industrials','Auto Components & EV Motors / India',6000,5500,520,true,0],
  ['cg power','CG Power and Industrial Solutions Ltd','CGPOWER','NSE','IN','Industrials','Electrical Equipment & Railways / India',12000,10500,1600,true,0],
]);

runWaves('INDIA IN12', V, [
  ['New-age Tech & Consumer Internet', newAgeTech],
  ['Electronics & Precision Manufacturing', electronics],
]);
