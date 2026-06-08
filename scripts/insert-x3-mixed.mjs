// Wave X3 — US comms/components + Japan/Korea semis + India + LATAM/SEA/MEA/EU
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'x3-mixed-v2026.1';
const g = mapRows(V);

const usCommsComponents = g([
  ['viasat','Viasat Inc','VSAT','NASDAQ','US','Communications','Satellite Communications / USA',7000,1300,4500,true,0],
  ['iridium','Iridium Communications','IRDM','NASDAQ','US','Communications','Satellite Voice & Data Network / USA',650,3200,830,true,0],
  ['comtech','Comtech Telecommunications','CMTL','NASDAQ','US','Communications','Satellite & Terrestrial Comms / USA',2000,210,520,true,0],
  ['netgear','NETGEAR Inc','NTGR','NASDAQ','US','Technology','Networking Hardware / USA',700,820,680,true,0],
  ['cambium networks','Cambium Networks','CMBM','NASDAQ','US','Technology','Wireless Networking / USA',700,210,250,true,0],
  ['harmonic','Harmonic Inc','HLIT','NASDAQ','US','Technology','Video & Broadband Delivery / USA',1300,1300,560,true,0],
  ['adtran','ADTRAN Holdings','ADTN','NASDAQ','US','Technology','Fiber Networking Solutions / USA',3500,820,920,true,0],
  ['clearfield','Clearfield Inc','CLFD','NASDAQ','US','Technology','Fiber Management Products / USA',700,520,170,true,0],
  ['knowles','Knowles Corporation','KN','NYSE','US','Technology','MEMS Microphones & Acoustics / USA',7000,1600,870,true,0],
  ['bel fuse','Bel Fuse Inc','BELFB','NASDAQ','US','Technology','Electronic Components / USA',2500,1300,580,true,0],
  ['methode electronics','Methode Electronics','MEI','NYSE','US','Technology','Custom Electronic Components / USA',6000,520,1050,true,0],
  ['rogers corp','Rogers Corporation','ROG','NYSE','US','Technology','Engineered Materials & Circuits / USA',3500,2100,840,true,0],
  ['cts corp','CTS Corporation','CTS','NYSE','US','Technology','Sensors & Electronic Components / USA',3500,1600,520,true,0],
  ['littelfuse','Littelfuse Inc','LFUS','NASDAQ','US','Technology','Circuit Protection & Sensing / USA',17000,5200,2200,true,0],
  ['esco technologies','ESCO Technologies','ESE','NYSE','US','Industrials','Engineered Filtration & Test / USA',3000,5200,1100,true,0],
  ['mesa labs','Mesa Laboratories','MLAB','NASDAQ','US','Healthcare','Calibration & Sterilization Instruments / USA',800,820,230,true,0],
]);

const japanKorea = g([
  ['fujitsu general','Fujitsu General','6755','TYO','JP','Technology','Air Conditioning & Electronics / Japan',9000,3200,3000,true,0],
  ['nichicon','Nichicon Corporation','6996','TYO','JP','Technology','Capacitors & Energy Storage / Japan',7000,1300,1200,true,0],
  ['hirose electric','Hirose Electric','6806','TYO','JP','Technology','Precision Connectors / Japan',5000,12000,1100,true,0],
  ['japan display','Japan Display Inc','6740','TYO','JP','Technology','LCD & OLED Displays / Japan',9000,520,1800,true,0],
  ['socionext','Socionext Inc','6526','TYO','JP','Technology','Custom SoC Design / Japan',2500,8200,1500,true,0],
  ['gmo payment','GMO Payment Gateway','3769','TYO','JP','Financial Technology','Online Payment Processing / Japan',1200,12000,520,true,0],
  ['raksul','Raksul Inc','4384','TYO','JP','Technology','Cloud Printing & Logistics Platform / Japan',900,820,400,true,0],
  ['base inc','BASE Inc','4477','TYO','JP','Technology','E-Commerce Platform for SMBs / Japan',300,210,90,true,0],
  ['sumco','SUMCO Corporation','3436','TYO','JP','Technology','Silicon Wafers / Japan',9000,5200,2800,true,0],
  ['hybe','HYBE Co Ltd','352820','KRX','KR','Communications','Entertainment & Music Tech Platform / Korea',3000,5200,1800,true,0],
  ['koh young','Koh Young Technology','098460','KRX','KR','Technology','3D Inspection Equipment / Korea',1200,2100,260,true,0],
  ['park systems','Park Systems Corp','140860','KRX','KR','Technology','Atomic Force Microscopes / Korea',700,2100,180,true,0],
  ['jusung engineering','Jusung Engineering','036930','KRX','KR','Technology','Semiconductor Deposition Equipment / Korea',1200,2100,350,true,0],
  ['isc co','ISC Co Ltd','095340','KRX','KR','Technology','Semiconductor Test Sockets / Korea',900,2100,180,true,0],
]);

const indiaSmes = g([
  ['cms info','CMS Info Systems','CMSINFO','NSE','IN','Technology','ATM & Cash Management Tech / India',30000,1600,300,true,0],
  ['protean','Protean eGov Technologies','PROTEAN','NSE','IN','Technology','Digital Public Infrastructure / India',2000,820,150,true,0],
  ['blackbox','Black Box Limited','BBOX','NSE','IN','Technology','IT Infrastructure Services / India',3500,1050,650,true,0],
  ['dlinkindia','D-Link India','DLINKINDIA','NSE','IN','Technology','Networking Products Distribution / India',500,520,150,true,0],
  ['allied digital','Allied Digital Services','ADSL','NSE','IN','Technology','IT Infrastructure Management / India',3000,320,90,true,0],
  ['aurionpro','Aurionpro Solutions','AURIONPRO','NSE','IN','Technology','Banking & Transit Tech / India',2500,1600,180,true,0],
]);

const emerging = g([
  ['positivo','Positivo Tecnologia','POSI3','B3','BR','Technology','Computers & Electronics / Brazil',7000,520,1100,true,0],
  ['intelbras','Intelbras SA','INTB3','B3','BR','Technology','Security & Networking Electronics / Brazil',5000,1600,920,true,0],
  ['ci&t','CI&T Inc','CINT','NYSE','BR','Technology','Digital & AI Software Services / Brazil',6000,1050,440,true,0],
  ['delta thailand','Delta Electronics Thailand','DELTA','SET','TH','Technology','Power Electronics & AI Infrastructure / Thailand',12000,42000,4200,true,0],
  ['hana microelectronics','Hana Microelectronics','HANA','SET','TH','Technology','Electronics Manufacturing / Thailand',12000,3200,750,true,0],
  ['kce electronics','KCE Electronics','KCE','SET','TH','Technology','Printed Circuit Boards / Thailand',5000,2100,650,true,0],
  ['fawry','Fawry for Banking Technology','FWRY','EGX','EG','Financial Technology','Digital Payments / Egypt',2500,1300,160,true,0],
  ['jahez','Jahez International','JAHEZ','TADAWUL','SA','Technology','Food Delivery Platform / Saudi Arabia',2000,3200,800,true,0],
]);

const europe = g([
  ['gn store nord','GN Store Nord','GN','OMX','DK','Technology','Hearing & Audio Tech / Denmark',7000,5200,4500,true,0],
  ['netcompany','Netcompany Group','NETC','OMX','DK','Technology','IT Consulting & Software / Denmark',8000,3200,1100,true,0],
  ['spectris','Spectris plc','SXS','LSE','GB','Technology','Precision Instrumentation / UK',8500,5200,1900,true,0],
  ['renishaw','Renishaw plc','RSW','LSE','GB','Technology','Metrology & Precision Measurement / UK',5500,4200,900,true,0],
  ['halma','Halma plc','HLMA','LSE','GB','Technology','Safety & Sensor Technology / UK',8000,16500,2700,true,0],
  ['diploma plc','Diploma plc','DPLM','LSE','GB','Industrials','Specialized Technical Products / UK',4000,8200,1700,true,0],
  ['team17','Team17 Group','TM17','LSE','GB','Technology','Video Game Publishing / UK',700,520,200,true,0],
]);

runWaves('X3', V, [
  ['US Comms & Components', usCommsComponents],
  ['Japan & Korea Tech', japanKorea],
  ['India SMEs', indiaSmes],
  ['Emerging Markets', emerging],
  ['Europe', europe],
]);
