// Tech Wave T11 — Israel Tech + Southeast Asia + extra Korea
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 't11-israel-sea-v2026.1';
const g = mapRows(V);

const israel = g([
  ['global-e online','Global-E Online Ltd','GLBE','NASDAQ','IL','Technology','Cross-Border E-Commerce SaaS / Israel',1200,3600,750,true,0],
  ['similarweb','Similarweb Ltd','SMWB','NYSE','IL','Technology','Digital Intelligence Analytics / Israel',1100,1050,280,true,0],
  ['riskified','Riskified Ltd','RSKD','NYSE','IL','Financial Technology','E-Commerce Fraud Prevention AI / Israel',750,820,330,true,0],
  ['cellebrite','Cellebrite DI Ltd','CLBT','NASDAQ','IL','Technology','Digital Forensics & Intelligence / Israel',1100,4200,420,true,0],
  ['nova ltd','Nova Ltd','NVMI','NASDAQ','IL','Technology','Semiconductor Metrology / Israel',1200,8200,720,true,0],
  ['sapiens','Sapiens International Corp','SPNS','NASDAQ','IL','Financial Technology','Insurance Software / Israel',5000,1600,560,true,0],
  ['kornit digital','Kornit Digital Ltd','KRNT','NASDAQ','IL','Technology','Digital Textile Printing / Israel',1000,1300,620,true,0],
  ['fiverr','Fiverr International Ltd','FVRR','NYSE','IL','Technology','Freelance Services Marketplace / Israel',1200,1050,420,true,0],
]);

const seaTech = g([
  ['goto gojek','GoTo Gojek Tokopedia Tbk','GOTO','IDX','ID','Technology','Super-App & Fintech / Indonesia',9000,8200,1100,true,0],
  ['nanofilm technologies','Nanofilm Technologies International','MZH','SGX','SG','Technology','Nanotech Coatings / Singapore',2500,520,200,true,0],
  ['fpt corporation','FPT Corporation','FPT','HOSE','VN','Technology','IT Services & Software / Vietnam',54000,12000,2400,true,0],
  ['advanced info service','Advanced Info Service PCL','ADVANC','SET','TH','Communications','Telecom & Digital Services / Thailand',13000,32000,5500,true,0],
]);

const koreaExtra = g([
  ['com2us','Com2uS Corporation','078340','KRX','KR','Technology','Mobile Gaming / Korea',2500,820,650,true,0],
  ['wemade','Wemade Co Ltd','112040','KRX','KR','Technology','Blockchain Gaming / Korea',1500,820,420,true,0],
  ['eo technics','EO Technics Co Ltd','039030','KRX','KR','Technology','Laser Semiconductor Equipment / Korea',1200,2100,420,true,0],
]);

runWaves('T11', V, [
  ['Israel Technology', israel],
  ['Southeast Asia Tech', seaTech],
  ['Korea (extra)', koreaExtra],
]);
