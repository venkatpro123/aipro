// India Wave IN2 — NBFCs, MFIs, Capital Markets, AMCs, Brokers
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'india-in2-v2026.1';
const g = mapRows(V);

const nbfcMfi = g([
  ['spandana sphoorty','Spandana Sphoorty Financial Limited','SPANDANA','NSE','IN','Financials','Microfinance / India',7000,1100,820,true,0],
  ['jana small finance','Jana Small Finance Bank Limited','JANASFB','NSE','IN','Financials','Small Finance Banking / India',18000,1600,950,true,0],
  ['angel one','Angel One Limited','ANGELONE','NSE','IN','Financial Technology','Discount Broking / India',5000,3200,600,true,0],
  ['iifl finance','IIFL Finance Limited','IIFL','NSE','IN','Financials','Non-Banking Finance / India',8000,2800,1400,true,0],
  ['motilal oswal financial','Motilal Oswal Financial Services Limited','MOTILALOFS','NSE','IN','Financials','Investment Banking & Broking / India',12000,6500,1100,true,0],
  ['iifl securities','IIFL Securities Limited','IIFLSEC','NSE','IN','Financial Technology','Retail Broking / India',4500,1600,500,true,0],
  ['geojit financial','Geojit Financial Services Limited','GEOJIT','NSE','IN','Financial Technology','Retail Broking / India',3500,500,220,true,0],
]);

const amc = g([
  ['hdfc amc','HDFC Asset Management Company Limited','HDFCAMC','NSE','IN','Financials','Asset Management / India',2000,15200,620,true,0],
  ['nippon india amc','Nippon Life India Asset Management','NAM-INDIA','NSE','IN','Financials','Asset Management / India',1200,5300,380,true,0],
  ['uti asset management','UTI Asset Management Company Limited','UTIAMC','NSE','IN','Financials','Asset Management / India',2500,2100,310,true,0],
  ['nuvama wealth','Nuvama Wealth Management Limited','NUVAMA','NSE','IN','Financials','Wealth Management / India',3000,2800,450,true,0],
  ['360 one wam','360 ONE WAM Limited','360ONE','NSE','IN','Financials','Wealth & Asset Management / India',2500,4200,500,true,0],
]);

const capitalMarkets = g([
  ['bse limited','BSE Limited','BSE','NSE','IN','Financials','Stock Exchange / India',1100,6200,280,true,0],
  ['cdsl limited','Central Depository Services (India) Ltd','CDSL','NSE','IN','Financials','Securities Depository / India',800,8500,210,true,0],
  ['multi commodity exchange','Multi Commodity Exchange of India Limited','MCX','NSE','IN','Financials','Commodity Exchange / India',600,1600,110,true,0],
  ['crisil limited','CRISIL Limited','CRISIL','NSE','IN','Financials','Credit Rating & Research / India',4000,5100,350,true,0],
  ['icra limited','ICRA Limited','ICRA','NSE','IN','Financials','Credit Rating / India',1200,950,120,true,0],
  ['care ratings','CARE Ratings Limited','CARERATING','NSE','IN','Financials','Credit Rating / India',600,500,90,true,0],
  ['computer age management','CAMS - Computer Age Management Services','CAMS','NSE','IN','Financial Technology','Mutual Fund RTA / India',1400,3100,240,true,0],
]);

runWaves('INDIA IN2', V, [
  ['NBFCs & MFIs', nbfcMfi],
  ['Asset Management', amc],
  ['Capital Markets & Exchanges', capitalMarkets],
]);
