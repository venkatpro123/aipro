// Tech Wave T12 — India Electronics, Networking, Power & Renewables Tech
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 't12-india-tech-v2026.1';
const g = mapRows(V);

const indiaElectronics = g([
  ['tejas networks','Tejas Networks Limited','TEJASNET','NSE','IN','Technology','Optical & Wireless Networking / India',2500,3200,1100,true,0],
  ['hbl power','HBL Power Systems Limited','HBLPOWER','NSE','IN','Industrials','Batteries & Defence Electronics / India',5000,2600,620,true,0],
  ['honeywell automation india','Honeywell Automation India Limited','HONAUT','NSE','IN','Technology','Industrial Automation / India',5000,5200,1300,true,0],
  ['genus power','Genus Power Infrastructures Limited','GENUSPOWER','NSE','IN','Industrials','Smart Metering Systems / India',4000,2100,520,true,0],
  ['sterling tools','Sterling Tools Limited','STERTOOLS','NSE','IN','Consumer Discretionary','Auto Fasteners & EV Components / India',3000,520,320,true,0],
  ['rir power','RIR Power Electronics Limited','RIRPOWER','NSE','IN','Technology','Power Semiconductor Devices / India',800,320,52,true,0],
]);

const indiaRenewables = g([
  ['inox wind','Inox Wind Limited','INOXWIND','NSE','IN','Utilities','Wind Turbine Manufacturing / India',3000,8200,1100,true,0],
  ['suzlon energy','Suzlon Energy Limited','SUZLON','NSE','IN','Utilities','Wind Energy Solutions / India',6000,12000,1600,true,0],
  ['inox green energy','Inox Green Energy Services Limited','INOXGREEN','NSE','IN','Utilities','Wind Energy O&M Services / India',1500,1600,120,true,0],
]);

const indiaITServices = g([
  ['kfin technologies','KFin Technologies Limited','KFINTECH','NSE','IN','Financial Technology','Investor & Fund Solutions / India',6000,2600,320,true,0],
  ['quick heal','Quick Heal Technologies Limited','QUICKHEAL','NSE','IN','Technology','Cybersecurity Software / India',1500,320,80,true,0],
  ['rsystems','R Systems International Limited','RSYSTEMS','NSE','IN','Technology','Product Engineering Services / India',5000,1050,250,true,0],
  ['expleo solutions','Expleo Solutions Limited','EXPLEOSOL','NSE','IN','Technology','Engineering & QA Services / India',3000,520,150,true,0],
  ['cms info systems','CMS Info Systems Limited','CMSINFO','NSE','IN','Technology','ATM & Cash Management Tech / India',30000,1600,300,true,0],
  ['protean egov','Protean eGov Technologies Limited','PROTEAN','NSE','IN','Technology','Digital Public Infrastructure / India',2000,820,150,true,0],
  ['netweb technologies','Netweb Technologies India Limited','NETWEB','NSE','IN','Technology','High-End Computing & AI Servers / India',1000,3200,150,true,0],
]);

runWaves('T12', V, [
  ['India Electronics & Automation', indiaElectronics],
  ['India Renewables Tech', indiaRenewables],
  ['India IT Services & Fintech', indiaITServices],
]);
