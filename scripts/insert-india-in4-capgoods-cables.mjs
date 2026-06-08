// India Wave IN4 — Capital Goods, Engineering, Cables & Electricals
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'india-in4-v2026.1';
const g = mapRows(V);

const capGoods = g([
  ['thermax limited','Thermax Limited','THERMAX','NSE','IN','Industrials','Industrial Energy Solutions / India',6500,4600,1350,true,0],
  ['kalpataru projects','Kalpataru Projects International Limited','KPIL','NSE','IN','Industrials','EPC Infrastructure Projects / India',30000,4100,3600,true,0],
  ['kec international','KEC International Limited','KEC','NSE','IN','Industrials','Power Transmission & Infrastructure / India',22000,3700,3200,true,0],
  ['bharat heavy electricals','Bharat Heavy Electricals Limited','BHEL','NSE','IN','Industrials','Power Equipment Manufacturing / India',27500,8200,4700,true,0],
  ['va tech wabag','VA Tech Wabag Limited','WABAG','NSE','IN','Industrials','Water Treatment / India',3500,1300,720,true,0],
  ['elecon engineering','Elecon Engineering Company Limited','ELECON','NSE','IN','Industrials','Gears & Material Handling / India',5000,1600,520,true,0],
  ['triveni turbine','Triveni Turbine Limited','TRIVENI','NSE','IN','Industrials','Steam Turbines / India',2000,2600,400,true,0],
  ['elgi equipments','Elgi Equipments Limited','ELGIEQUIP','NSE','IN','Industrials','Air Compressors / India',3000,2600,620,true,0],
  ['kirloskar brothers','Kirloskar Brothers Limited','KIRLOSBROS','NSE','IN','Industrials','Pumps & Fluid Management / India',6000,2100,820,true,0],
  ['ingersoll rand india','Ingersoll Rand (India) Limited','INGERRAND','NSE','IN','Industrials','Industrial Machinery / India',3000,1900,520,true,0],
]);

const cablesElec = g([
  ['polycab india','Polycab India Limited','POLYCAB','NSE','IN','Industrials','Cables & Wires / India',7000,10800,3200,true,0],
  ['kei industries','KEI Industries Limited','KEI','NSE','IN','Industrials','Cables & Wires / India',8000,5100,2600,true,0],
  ['v-guard industries','V-Guard Industries Limited','VGUARD','NSE','IN','Consumer Discretionary','Consumer Electricals / India',4500,2600,920,true,0],
  ['finolex cables','Finolex Cables Limited','FINCABLES','NSE','IN','Industrials','Cables & Wires / India',4500,2100,920,true,0],
  ['apar industries','APAR Industries Limited','APARINDS','NSE','IN','Industrials','Cables & Conductors / India',5000,3600,2600,true,0],
  ['crompton greaves consumer','Crompton Greaves Consumer Electricals','CROMPTON','NSE','IN','Consumer Discretionary','Consumer Fans & Pumps / India',3000,3100,1250,true,0],
  ['orient electric','Orient Electric Limited','ORIENTELEC','NSE','IN','Consumer Discretionary','Fans & Lighting / India',2500,1000,620,true,0],
  ['sterlite technologies','Sterlite Technologies Limited','STRTECH','NSE','IN','Technology','Optical Fibre Cables / India',4000,620,520,true,0],
]);

runWaves('INDIA IN4', V, [
  ['Capital Goods & Engineering', capGoods],
  ['Cables & Electricals', cablesElec],
]);
