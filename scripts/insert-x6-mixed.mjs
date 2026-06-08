// Wave X6 — US fintech-hardware + India + China/Taiwan/HK + Europe
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'x6-mixed-v2026.1';
const g = mapRows(V);

const usFintechHw = g([
  ['euronet','Euronet Worldwide','EEFT','NASDAQ','US','Financial Technology','Payments & Money Transfer / USA',10000,4200,3900,true,0],
  ['wex inc','WEX Inc','WEX','NYSE','US','Financial Technology','Corporate Payment Solutions / USA',6500,6200,2600,true,0],
  ['ncr voyix','NCR Voyix Corporation','VYX','NYSE','US','Technology','Retail & Hospitality Commerce Tech / USA',16000,1600,2800,true,0],
  ['ncr atleos','NCR Atleos','NATL','NYSE','US','Financial Technology','ATM & Self-Service Banking / USA',20000,2100,4300,true,0],
  ['diebold nixdorf','Diebold Nixdorf','DBD','NYSE','US','Financial Technology','ATM & Retail Systems / USA',21000,2100,3700,true,0],
  ['par technology','PAR Technology','PAR','NYSE','US','Technology','Restaurant Commerce Software / USA',2500,2600,450,true,0],
  ['lightpath','LightPath Technologies','LPTH','NASDAQ','US','Technology','Optical Components & Infrared / USA',500,210,38,true,0],
]);

const india = g([
  ['sagility','Sagility India','SAGILITY','NSE','IN','Healthcare','Healthcare BPM & Tech Services / India',38000,5200,600,true,0],
  ['fino payments','Fino Payments Bank','FINOPB','NSE','IN','Financial Technology','Digital Payments Bank / India',3000,520,180,true,0],
  ['tbo tek','TBO Tek Limited','TBOTEK','NSE','IN','Technology','Travel Distribution Platform / India',2000,2100,200,true,0],
  ['dronacharya','Drone Destination','DRONE','NSE','IN','Technology','Drone Services & Training / India',300,210,15,true,0],
  ['dcx systems','DCX Systems','DCXINDIA','NSE','IN','Industrials','Defense Electronics Manufacturing / India',600,820,400,true,0],
  ['unicommerce','Unicommerce eSolutions','UNICOMMERC','NSE','IN','Technology','E-Commerce Fulfillment SaaS / India',1000,820,120,true,0],
  ['trust fintech','Trust Fintech','TRUST','NSE','IN','Financial Technology','Banking Software Solutions / India',400,150,15,true,0],
]);

const chinaTaiwan = g([
  ['china literature','China Literature','0772','HKSE','CN','Technology','Online Literature Platform / China',3000,2600,1200,true,0],
  ['meitu','Meitu Inc','1357','HKSE','CN','Technology','Image & Video AI Apps / China',2000,4200,500,true,0],
  ['tongcheng','Tongcheng Travel','0780','HKSE','CN','Technology','Online Travel Platform / China',8000,5200,2400,true,0],
  ['zte','ZTE Corporation','0763','HKSE','CN','Technology','Telecom & Networking Equipment / China',75000,28000,18000,true,0],
  ['hongfa','Xiamen Hongfa Electroacoustic','600885','SHSE','CN','Industrials','Relays & Electrical Components / China',20000,8200,2100,true,0],
  ['e ink','E Ink Holdings','8069','TWSE','TW','Technology','Electronic Paper Displays / Taiwan',5000,12000,1100,true,0],
  ['fitipower','Fitipower Integrated Tech','4961','TWSE','TW','Technology','Display Driver & Power ICs / Taiwan',1200,2100,520,true,0],
]);

const europe = g([
  ['sword group','Sword Group','SWP','EPA','FR','Technology','IT Software & Services / France',12000,1050,380,true,0],
  ['pharmagest','Equasens (Pharmagest)','EQS','EPA','FR','Healthcare','Healthcare & Pharmacy Software / France',2000,1300,230,true,0],
  ['axway','Axway Software','AXW','EPA','FR','Technology','API & Integration Software / France',1800,820,330,true,0],
  ['bytes technology','Bytes Technology Group','BYIT','LSE','GB','Technology','IT Software Reseller / UK',1000,1600,2500,true,0],
  ['craneware','Craneware plc','CRW','LSE','GB','Healthcare','Healthcare Financial Software / UK',800,1050,200,true,0],
  ['alfen','Alfen NV','ALFEN','AMS','NL','Industrials','EV Charging & Smart Grid / Netherlands',1500,520,520,true,0],
  ['nedap','Nedap NV','NEDAP','AMS','NL','Technology','RFID & Identification Tech / Netherlands',1000,1050,260,true,0],
  ['tkh group','TKH Group NV','TWEKA','AMS','NL','Technology','Connectivity & Vision Systems / Netherlands',9000,2100,1900,true,0],
]);

runWaves('X6', V, [
  ['US Fintech & Hardware', usFintechHw],
  ['India', india],
  ['China & Taiwan', chinaTaiwan],
  ['Europe', europe],
]);
