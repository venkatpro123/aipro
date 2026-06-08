// GLOBAL Wave 9 — real listed mid/large-cap companies (US + Europe) not yet in DB.
// All publicly listed, real tickers/exchanges, 2026 seed-tier estimates.
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'glob-w9-v2026.1';
const g = mapRows(V);

// [cn, dn, tk, ex, cc, sec, ind, wf, mcM, revM, isPublic?, lay?]
const usIndustrials = g([
  ['lincoln electric','Lincoln Electric Holdings Inc','LECO','NASDAQ','US','Industrials','Welding & Cutting Equipment / USA',12000,12000,4200],
  ['nordson dispensing','Nordson Corporation','NDSN','NASDAQ','US','Industrials','Precision Dispensing Equipment / USA',7600,13000,2700],
  ['ametek instruments','AMETEK Inc','AME','NYSE','US','Industrials','Electronic Instruments / USA',21000,42000,6900],
  ['dover diversified','Dover Corporation','DOV','NYSE','US','Industrials','Diversified Industrials / USA',24000,26000,8700],
  ['zebra technologies','Zebra Technologies Corporation','ZBRA','NASDAQ','US','Technology','Barcode & Enterprise Mobility / USA',10000,16000,4900],
  ['trimble positioning','Trimble Inc','TRMB','NASDAQ','US','Technology','GPS & Positioning Software / USA',12000,16000,3700],
  ['jabil manufacturing','Jabil Inc','JBL','NYSE','US','Technology','Electronics Manufacturing Services / USA',140000,16000,28000],
  ['flex ems','Flex Ltd','FLEX','NASDAQ','US','Technology','Electronics Manufacturing / USA',150000,14000,26000],
  ['keysight test','Keysight Technologies Inc','KEYS','NYSE','US','Technology','Electronic Test & Measurement / USA',15000,28000,5400],
  ['teledyne instruments','Teledyne Technologies Inc','TDY','NYSE','US','Industrials','Instrumentation & Imaging / USA',13000,22000,5600],
  ['generac power','Generac Holdings Inc','GNRC','NYSE','US','Industrials','Backup Power Generators / USA',9000,9000,4200],
  ['ao smith water','A. O. Smith Corporation','AOS','NYSE','US','Industrials','Water Heaters & Treatment / USA',12000,12000,3900],
  ['snap-on tools','Snap-on Incorporated','SNA','NYSE','US','Industrials','Professional Tools / USA',13000,17000,4700],
  ['stanley black decker','Stanley Black & Decker Inc','SWK','NYSE','US','Industrials','Power Tools & Hardware / USA',50000,13000,15500,true,1000],
  ['masco building','Masco Corporation','MAS','NYSE','US','Industrials','Building Products / USA',18000,16000,7800],
  ['mohawk flooring','Mohawk Industries Inc','MHK','NYSE','US','Consumer Discretionary','Flooring Manufacturing / USA',42000,8000,11000],
  ['pool corp','Pool Corporation','POOL','NASDAQ','US','Consumer Discretionary','Pool Supplies Distribution / USA',6000,14000,5300],
  ['allegion access','Allegion plc','ALLE','NYSE','IE','Industrials','Security & Access Control / Ireland',12000,12000,3800],
  ['fortune brands','Fortune Brands Innovations Inc','FBIN','NYSE','US','Industrials','Home & Security Products / USA',12000,8000,4600],
  ['wabtec rail','Westinghouse Air Brake Technologies','WAB','NYSE','US','Industrials','Rail Equipment & Brakes / USA',27000,30000,10000],
  ['donaldson filtration','Donaldson Company Inc','DCI','NYSE','US','Industrials','Filtration Systems / USA',14000,9000,3600],
  ['nvent electrical','nVent Electric plc','NVT','NYSE','GB','Industrials','Electrical Connection & Protection / UK',11000,12000,3300],
]);

const usHealthcare = g([
  ['resmed sleep','ResMed Inc','RMD','NYSE','US','Healthcare','Sleep Apnea & Respiratory Devices / USA',10000,35000,4700],
  ['steris sterilization','STERIS plc','STE','NYSE','US','Healthcare','Sterilization & Surgical / USA',17000,22000,5500],
  ['hologic diagnostics','Hologic Inc','HOLX','NASDAQ','US','Healthcare','Womens Health Diagnostics / USA',7000,18000,4000],
  ['cooper companies','The Cooper Companies Inc','COO','NASDAQ','US','Healthcare','Contact Lenses & Medical / USA',15000,20000,3900],
  ['bio-techne','Bio-Techne Corporation','TECH','NASDAQ','US','Healthcare','Life Science Reagents / USA',3000,11000,1200],
  ['waters analytical','Waters Corporation','WAT','NYSE','US','Healthcare','Analytical Instruments / USA',7800,20000,3000],
  ['mettler toledo','Mettler-Toledo International Inc','MTD','NYSE','US','Healthcare','Precision Instruments & Scales / USA',17000,28000,3800],
  ['west pharma','West Pharmaceutical Services Inc','WST','NYSE','US','Healthcare','Drug Containment & Delivery / USA',10000,22000,3000],
  ['charles river labs','Charles River Laboratories Intl','CRL','NYSE','US','Healthcare','Preclinical Drug Research / USA',21000,10000,4100],
  ['masimo monitoring','Masimo Corporation','MASI','NASDAQ','US','Healthcare','Patient Monitoring / USA',8000,7000,2100],
]);

const usConsumer = g([
  ['tractor supply','Tractor Supply Company','TSCO','NASDAQ','US','Consumer Discretionary','Rural Lifestyle Retail / USA',50000,28000,15000],
  ['ulta beauty','Ulta Beauty Inc','ULTA','NASDAQ','US','Consumer Discretionary','Beauty Retail / USA',55000,18000,11000],
  ['burlington stores','Burlington Stores Inc','BURL','NYSE','US','Consumer Discretionary','Off-Price Retail / USA',45000,16000,10000],
  ['ross stores','Ross Stores Inc','ROST','NASDAQ','US','Consumer Discretionary','Off-Price Retail / USA',100000,50000,21000],
  ['tapestry luxury','Tapestry Inc','TPR','NYSE','US','Consumer Discretionary','Accessible Luxury Handbags / USA',16000,14000,6700],
  ['ralph lauren','Ralph Lauren Corporation','RL','NYSE','US','Consumer Discretionary','Apparel & Lifestyle / USA',13000,13000,6600],
  ['yeti outdoor','YETI Holdings Inc','YETI','NYSE','US','Consumer Discretionary','Outdoor Drinkware & Coolers / USA',1100,3000,1800],
  ['crocs footwear','Crocs Inc','CROX','NASDAQ','US','Consumer Discretionary','Casual Footwear / USA',6000,7000,4000],
  ['skechers footwear','Skechers U.S.A. Inc','SKX','NYSE','US','Consumer Discretionary','Footwear / USA',12000,10000,8000],
  ['carters apparel','Carter\'s Inc','CRI','NYSE','US','Consumer Discretionary','Childrens Apparel / USA',16000,3000,3000],
]);

const euSpecialists = g([
  ['schindler elevators','Schindler Holding AG','SCHP','SIX','CH','Industrials','Elevators & Escalators / Switzerland',70000,30000,12000],
  ['sika construction','Sika AG','SIKA','SIX','CH','Materials','Construction Chemicals / Switzerland',33000,40000,12000],
  ['straumann dental','Straumann Holding AG','STMN','SIX','CH','Healthcare','Dental Implants / Switzerland',11000,18000,2900],
  ['lonza cdmo','Lonza Group AG','LONN','SIX','CH','Healthcare','Pharma CDMO / Switzerland',18000,45000,7000],
  ['givaudan flavors','Givaudan SA','GIVN','SIX','CH','Materials','Flavors & Fragrances / Switzerland',16000,38000,7500],
  ['kuehne nagel','Kuehne + Nagel International AG','KNIN','SIX','CH','Industrials','Logistics & Freight / Switzerland',80000,28000,25000],
  ['adecco staffing','Adecco Group AG','ADEN','SIX','CH','Industrials','Staffing & Workforce / Switzerland',30000,6000,24000,true,800],
  ['carl zeiss meditec','Carl Zeiss Meditec AG','AFX','XETRA','DE','Healthcare','Ophthalmic & Surgical Optics / Germany',5500,9000,2200],
  ['rational ovens','Rational AG','RAA','XETRA','DE','Industrials','Commercial Cooking Systems / Germany',2600,9000,1200],
  ['brenntag chemicals','Brenntag SE','BNR','XETRA','DE','Materials','Chemical Distribution / Germany',17000,10000,17000],
  ['knorr bremse','Knorr-Bremse AG','KBX','XETRA','DE','Industrials','Braking Systems Rail & Truck / Germany',32000,11000,8000],
  ['kion forklifts','KION Group AG','KGX','XETRA','DE','Industrials','Forklifts & Warehouse Automation / Germany',42000,6000,12000],
]);

runWaves('GLOBAL W9', V, [
  ['US Industrials', usIndustrials],
  ['US Healthcare', usHealthcare],
  ['US Consumer', usConsumer],
  ['EU Specialists', euSpecialists],
]);
