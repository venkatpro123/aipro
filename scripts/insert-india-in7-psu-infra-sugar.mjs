// India Wave IN7 — PSU/Govt Enterprises + Infrastructure + Sugar + Agro
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'india-in7-v2026.1';
const g = mapRows(V);

const psuGovt = g([
  ['rvnl rail vikas','Rail Vikas Nigam Limited','RVNL','NSE','IN','Industrials','Railway Infrastructure / India',5000,8500,4100,true,0],
  ['irfc india','Indian Railway Finance Corporation Limited','IRFC','NSE','IN','Financials','Infrastructure Finance / India',100,22000,820,true,0],
  ['rites limited','RITES Limited','RITES','NSE','IN','Industrials','Railway Consulting & Export / India',3000,3100,620,true,0],
  ['ircon international','IRCON International Limited','IRCON','NSE','IN','Industrials','Railway Infrastructure EPC / India',4500,3200,2100,true,0],
  ['hudco housing','Housing & Urban Development Corporation','HUDCO','NSE','IN','Financials','Housing Finance / India',1000,6100,2100,true,0],
  ['sjvn power','SJVN Limited','SJVN','NSE','IN','Utilities','Hydropower Generation / India',2000,7200,620,true,0],
  ['moil limited','MOIL Limited','MOIL','NSE','IN','Materials','Manganese Ore Mining / India',2000,2100,520,true,0],
  ['hindustan copper','Hindustan Copper Limited','HINDCOPPER','NSE','IN','Materials','Copper Mining & Smelting / India',5000,4200,1600,true,0],
  ['engineers india','Engineers India Limited','ENGINERSIN','NSE','IN','Industrials','Engineering Consultancy / India',3500,1600,520,true,0],
  ['cpcl refinery','Chennai Petroleum Corporation Limited','CPCL','NSE','IN','Energy','Oil Refining / India',3000,3600,10500,true,0],
  ['mrpl oil','Mangalore Refinery and Petrochemicals Ltd','MRPL','NSE','IN','Energy','Oil Refining / India',3000,3200,15000,true,0],
]);

const infrastructure = g([
  ['ncc limited','NCC Limited','NCC','NSE','IN','Industrials','Civil Construction & EPC / India',15000,3200,3600,true,0],
  ['irb infrastructure','IRB Infrastructure Developers Limited','IRB','NSE','IN','Industrials','Roads & Highways / India',9000,3600,2500,true,0],
  ['ahluwalia contracts','Ahluwalia Contracts (India) Limited','AHLUCONT','NSE','IN','Industrials','Building Construction / India',7000,1600,1050,true,0],
  ['hg infra engineering','H.G. Infra Engineering Limited','HGINFRA','NSE','IN','Industrials','Highways EPC / India',5000,2100,1400,true,0],
  ['ashoka buildcon','Ashoka Buildcon Limited','ASHOKA','NSE','IN','Industrials','Roads BOT / India',8000,2100,1700,true,0],
  ['j kumar infraprojects','J.Kumar Infraprojects Limited','JKUMAR','NSE','IN','Industrials','Urban Infrastructure EPC / India',6000,1050,900,true,0],
]);

const sugarAgro = g([
  ['balrampur chini','Balrampur Chini Mills Limited','BALRAMCHIN','NSE','IN','Consumer Staples','Sugar & Ethanol / India',8000,2100,1600,true,0],
  ['triveni engineering','Triveni Engineering & Industries Limited','TRIVENIENG','NSE','IN','Consumer Staples','Sugar & Engineering / India',10000,2100,1050,true,0],
  ['eid parry','EID Parry (India) Limited','EIDPARRY','NSE','IN','Consumer Staples','Sugar & Distillery / India',6000,1600,1600,true,0],
  ['chambal fertilizers','Chambal Fertilizers & Chemicals Limited','CHAMBLFERT','NSE','IN','Materials','Urea & DAP Fertilizers / India',2000,1600,2100,true,0],
  ['dhanuka agritech','Dhanuka Agritech Limited','DHANUKA','NSE','IN','Materials','Agrochemicals Distribution / India',1500,1050,420,true,0],
  ['sharda cropchem','Sharda Cropchem Limited','SHARDACROP','NSE','IN','Materials','Crop Protection Chemicals / India',800,520,420,true,0],
]);

runWaves('INDIA IN7', V, [
  ['PSU & Government Enterprises', psuGovt],
  ['Infrastructure & Construction', infrastructure],
  ['Sugar & Agro Chemicals', sugarAgro],
]);
