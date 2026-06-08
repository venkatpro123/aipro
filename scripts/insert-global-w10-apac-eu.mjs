// GLOBAL Wave 10 — real listed APAC + European specialist mid/large-caps not yet in DB.
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'glob-w10-v2026.1';
const g = mapRows(V);

const japan = g([
  ['shimano cycling','Shimano Inc','7309','TYO','JP','Consumer Discretionary','Bicycle Components / Japan',12000,18000,3000],
  ['nidec motors','Nidec Corporation','6594','TYO','JP','Industrials','Precision Motors / Japan',110000,35000,16000],
  ['smc pneumatics','SMC Corporation','6273','TYO','JP','Industrials','Pneumatic Automation / Japan',22000,40000,5000],
  ['daikin hvac','Daikin Industries Ltd','6367','TYO','JP','Industrials','Air Conditioning Systems / Japan',96000,50000,30000],
  ['hoshizaki kitchen','Hoshizaki Corporation','6465','TYO','JP','Industrials','Commercial Kitchen Equipment / Japan',13000,8000,3000],
  ['yaskawa robotics','Yaskawa Electric Corporation','6506','TYO','JP','Industrials','Industrial Robots & Drives / Japan',15000,12000,4000],
  ['omron automation','OMRON Corporation','6645','TYO','JP','Technology','Industrial Automation / Japan',28000,12000,6000],
  ['kubota tractors','Kubota Corporation','6326','TYO','JP','Industrials','Agricultural Machinery / Japan',50000,20000,20000],
  ['komatsu construction','Komatsu Ltd','6301','TYO','JP','Industrials','Construction Equipment / Japan',64000,35000,28000],
  ['bridgestone tires','Bridgestone Corporation','5108','TYO','JP','Consumer Discretionary','Tires & Rubber / Japan',130000,30000,30000],
  ['tdk components','TDK Corporation','6762','TYO','JP','Technology','Electronic Components / Japan',100000,25000,15000],
  ['yokogawa instruments','Yokogawa Electric Corporation','6841','TYO','JP','Technology','Industrial Instruments / Japan',18000,7000,3500],
]);

const korea = g([
  ['hyundai mobis','Hyundai Mobis Co Ltd','012330','KRX','KR','Consumer Discretionary','Auto Parts & Modules / Korea',33000,18000,45000],
  ['lg chem','LG Chem Ltd','051910','KRX','KR','Materials','Chemicals & Batteries / Korea',20000,25000,40000],
  ['samsung sdi','Samsung SDI Co Ltd','006400','KRX','KR','Industrials','Batteries & Energy Storage / Korea',12000,25000,16000],
  ['kia motors','Kia Corporation','000270','KRX','KR','Consumer Discretionary','Automobiles / Korea',52000,35000,75000],
  ['posco steel','POSCO Holdings Inc','005490','KRX','KR','Materials','Steel Manufacturing / Korea',30000,25000,55000],
  ['kb financial','KB Financial Group Inc','105560','KRX','KR','Financials','Banking & Finance / Korea',26000,25000,30000],
]);

const taiwan = g([
  ['mediatek chips','MediaTek Inc','2454','TWSE','TW','Technology','Fabless Semiconductors / Taiwan',22000,70000,17000],
  ['delta electronics','Delta Electronics Inc','2308','TWSE','TW','Industrials','Power & Thermal Management / Taiwan',80000,30000,13000],
  ['ase packaging','ASE Technology Holding Co','3711','TWSE','TW','Technology','Semiconductor Packaging & Test / Taiwan',95000,20000,20000],
  ['largan optics','Largan Precision Co Ltd','3008','TWSE','TW','Technology','Optical Lens Modules / Taiwan',12000,10000,2000],
  ['uni-president foods','Uni-President Enterprises Corp','1216','TWSE','TW','Consumer Staples','Food & Beverage / Taiwan',80000,12000,18000],
]);

const australia = g([
  ['cochlear implants','Cochlear Limited','COH','ASX','AU','Healthcare','Hearing Implants / Australia',5000,15000,2000],
  ['brambles pallets','Brambles Limited','BXB','ASX','AU','Industrials','Pallet Pooling & Logistics / Australia',12000,15000,6500],
  ['sonic healthcare','Sonic Healthcare Limited','SHL','ASX','AU','Healthcare','Pathology & Diagnostics / Australia',40000,10000,6000],
  ['ramsay health','Ramsay Health Care Limited','RHC','ASX','AU','Healthcare','Private Hospitals / Australia',88000,8000,10000],
  ['aristocrat gaming','Aristocrat Leisure Limited','ALL','ASX','AU','Consumer Discretionary','Gaming Machines & Content / Australia',7000,25000,4500],
  ['computershare registry','Computershare Limited','CPU','ASX','AU','Technology','Share Registry & Admin / Australia',14000,12000,3000],
  ['rea property','REA Group Ltd','REA','ASX','AU','Technology','Property Portal / Australia',3000,20000,1000],
  ['seek jobs','SEEK Limited','SEK','ASX','AU','Technology','Employment Marketplace / Australia',5000,6000,800],
  ['treasury wine','Treasury Wine Estates Limited','TWE','ASX','AU','Consumer Staples','Wine Production / Australia',3000,6000,2500],
  ['james hardie','James Hardie Industries plc','JHX','ASX','IE','Materials','Fiber Cement Building Products / Ireland',5000,18000,4000],
]);

const euSpecial2 = g([
  ['vat vacuum','VAT Group AG','VACN','SIX','CH','Industrials','Vacuum Valves Semiconductor / Switzerland',3000,12000,1000],
  ['belimo actuators','Belimo Holding AG','BEAN','SIX','CH','Industrials','HVAC Actuators & Sensors / Switzerland',2300,7000,1000],
  ['tecan lab','Tecan Group AG','TECN','SIX','CH','Healthcare','Lab Automation / Switzerland',3000,4000,1000],
  ['interroll conveyors','Interroll Holding AG','INRN','SIX','CH','Industrials','Material Handling Conveyors / Switzerland',2400,3000,600],
  ['wacker chemie','Wacker Chemie AG','WCH','XETRA','DE','Materials','Silicones & Polysilicon / Germany',16000,8000,7000],
  ['evonik chemicals','Evonik Industries AG','EVK','XETRA','DE','Materials','Specialty Chemicals / Germany',33000,9000,16000,true,1500],
  ['fuchs lubricants','Fuchs SE','FPE','XETRA','DE','Materials','Lubricants / Germany',6500,6000,3800],
  ['gerresheimer pharma','Gerresheimer AG','GXI','XETRA','DE','Healthcare','Pharma Packaging & Devices / Germany',11000,4000,2200],
  ['edenred payments','Edenred SE','EDEN','EPA','FR','Financial Technology','Prepaid Benefit Payments / France',12000,12000,2500],
  ['bureau veritas','Bureau Veritas SA','BVI','EPA','FR','Industrials','Testing Inspection Certification / France',83000,14000,6500],
  ['eurofins labs','Eurofins Scientific SE','ERF','EPA','FR','Healthcare','Bioanalytical Testing Labs / France',62000,12000,7000],
  ['legrand electrical','Legrand SA','LR','EPA','FR','Industrials','Electrical Wiring Devices / France',38000,28000,9000],
  ['sodexo services','Sodexo SA','SW','EPA','FR','Industrials','Food & Facilities Services / France',430000,12000,26000],
  ['teleperformance cx','Teleperformance SE','TEP','EPA','FR','Industrials','Customer Experience BPO / France',410000,8000,10000,true,3000],
  ['kingfisher diy','Kingfisher plc','KGF','LSE','GB','Consumer Discretionary','Home Improvement Retail / UK',76000,7000,16000],
  ['intertek testing','Intertek Group plc','ITRK','LSE','GB','Industrials','Testing & Inspection / UK',44000,10000,4000],
  ['halma safety','Halma plc','HLMA','LSE','GB','Industrials','Safety & Environmental Tech / UK',8000,15000,2700],
]);

runWaves('GLOBAL W10', V, [
  ['Japan', japan],
  ['Korea', korea],
  ['Taiwan', taiwan],
  ['Australia', australia],
  ['EU Specialists 2', euSpecial2],
]);
