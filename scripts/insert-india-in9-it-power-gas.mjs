// India Wave IN9 — IT Mid-cap + Power + Gas + Cement + Consumer Appliances
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'india-in9-v2026.1';
const g = mapRows(V);

const itMidcap = g([
  ['ltimindtree','LTIMindtree Limited','LTIM','NSE','IN','Technology','IT Services & Consulting / India',80000,22000,4200,true,0],
  ['sonata software','Sonata Software Limited','SONATSOFTW','NSE','IN','Technology','IT Services / India',7000,1600,620,true,0],
  ['mastek limited','Mastek Limited','MASTEK','NSE','IN','Technology','IT Services UK/US / India',7000,820,540,true,0],
  ['newgen software','Newgen Software Technologies Limited','NEWGEN','NSE','IN','Technology','BPM & Digital Transformation / India',4000,3100,320,true,0],
  ['nucleus software','Nucleus Software Exports Limited','NUCLEUSFIN','NSE','IN','Technology','Core Banking Software / India',1500,620,210,true,0],
  ['zensar technologies','Zensar Technologies Limited','ZENSARTECH','NSE','IN','Technology','IT Services / India',11000,1600,540,true,0],
  ['hexaware technologies','Hexaware Technologies Limited','HEXAWARE','BSE','IN','Technology','IT Services / India',32000,5200,1400,true,0],
  ['cigniti technologies','Cigniti Technologies Limited','CIGNITI','NSE','IN','Technology','Software Testing / India',5000,520,210,true,0],
  ['rategain travel','RateGain Travel Technologies Limited','RATEGAIN','NSE','IN','Technology','SaaS Travel Tech / India',2500,820,120,true,0],
  ['happiest minds','Happiest Minds Technologies Limited','HAPPSTMIND','NSE','IN','Technology','Digital IT Services / India',5000,820,220,true,0],
  ['mapmyindia','MapmyIndia - CE Info Systems Limited','MAPMYINDIA','NSE','IN','Technology','Maps & Geospatial SaaS / India',1500,1900,130,true,0],
  ['justdial','Just Dial Limited','JUSTDIAL','NSE','IN','Technology','Local Search Platform / India',5000,1050,230,true,0],
]);

const powerGas = g([
  ['adani total gas','Adani Total Gas Limited','ATGL','NSE','IN','Utilities','City Gas Distribution / India',4000,15500,1300,true,0],
  ['mahanagar gas','Mahanagar Gas Limited','MGL','NSE','IN','Utilities','City Gas Distribution / India',1700,2600,2000,true,0],
  ['gujarat gas','Gujarat Gas Limited','GUJGAS','NSE','IN','Utilities','City Gas Distribution / India',2500,5200,3600,true,0],
  ['indraprastha gas','Indraprastha Gas Limited','IGL','NSE','IN','Utilities','City Gas Distribution / India',1600,3200,2300,true,0],
  ['cesc limited','CESC Limited','CESC','NSE','IN','Utilities','Integrated Power Utility / India',15000,2100,2800,true,0],
  ['renew energy global','ReNew Energy Global plc','RENEWENERGY','NSE','IN','Utilities','Renewable Energy / India',8000,2100,1050,true,0],
]);

const cementAppliances = g([
  ['heidelberg cement india','HeidelbergCement India Limited','HEIDELBERG','NSE','IN','Materials','Cement Manufacturing / India',2500,1600,820,true,0],
  ['india cements','The India Cements Limited','INDIACEM','NSE','IN','Materials','Cement Manufacturing / India',12000,2600,1050,true,0],
  ['orient cement','Orient Cement Limited','ORIENTCEM','NSE','IN','Materials','Cement Manufacturing / India',4000,1600,820,true,0],
  ['whirlpool india','Whirlpool of India Limited','WHIRLPOOL','NSE','IN','Consumer Discretionary','White Goods Appliances / India',3500,1600,820,true,0],
  ['bluestar india','Blue Star Limited','BLUESTAR','NSE','IN','Consumer Discretionary','Air Conditioners & Commercial Refrigeration / India',7500,3600,1400,true,0],
  ['supreme industries','Supreme Industries Limited','SUPREMEIND','NSE','IN','Materials','Plastic Products / India',10000,4200,2000,true,0],
  ['astral limited','Astral Limited','ASTRAL','NSE','IN','Materials','CPVC Pipes & Adhesives / India',7000,6200,1300,true,0],
  ['finolex industries','Finolex Industries Limited','FINPIPE','NSE','IN','Materials','PVC Pipes / India',5000,2100,1050,true,0],
  ['cera sanitaryware','Cera Sanitaryware Limited','CERA','NSE','IN','Consumer Discretionary','Sanitary Ware & Tiles / India',2500,2600,620,true,0],
]);

runWaves('INDIA IN9', V, [
  ['IT Mid-cap', itMidcap],
  ['Power & Gas Distribution', powerGas],
  ['Cement & Consumer Appliances', cementAppliances],
]);
