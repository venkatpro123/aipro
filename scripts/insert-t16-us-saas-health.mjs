// Tech Wave T16 — US SaaS + Health Tech + Payments (top-up)
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 't16-us-saas-health-v2026.1';
const g = mapRows(V);

const usSaas = g([
  ['blackline','BlackLine Inc','BL','NASDAQ','US','Financial Technology','Finance & Accounting Automation / USA',1900,3200,650,true,0],
  ['docebo','Docebo Inc','DCBO','NASDAQ','CA','Technology','AI Learning Management SaaS / Canada',900,1300,220,true,0],
  ['instructure','Instructure Holdings Inc','INST','NYSE','US','EducationTech','Canvas Learning Platform / USA',2000,4200,650,true,0],
  ['squarespace','Squarespace Inc','SQSP','NYSE','US','Technology','Website Building Platform / USA',1700,6200,1200,true,0],
  ['cvent','Cvent Holding Corp','CVT','NASDAQ','US','Technology','Event Management Software / USA',4500,3200,750,true,0],
  ['e2open','E2open Parent Holdings Inc','ETWO','NYSE','US','Technology','Supply Chain SaaS / USA',3500,820,650,true,0],
  ['alkami technology','Alkami Technology Inc','ALKT','NASDAQ','US','Financial Technology','Digital Banking Platform / USA',1100,3200,350,true,0],
  ['sprout social','Sprout Social Inc','SPT','NASDAQ','US','Technology','Social Media Management SaaS / USA',1300,1600,420,true,0],
  ['yext','Yext Inc','YEXT','NYSE','US','Technology','Digital Presence Management / USA',1000,820,420,true,0],
  ['bigcommerce','BigCommerce Holdings Inc','BIGC','NASDAQ','US','Technology','E-Commerce SaaS Platform / USA',1300,520,330,true,0],
  ['kaltura','Kaltura Inc','KLTR','NASDAQ','US','Technology','Video Experience Cloud / USA',700,320,180,true,0],
  ['enfusion','Enfusion Inc','ENFN','NYSE','US','Financial Technology','Investment Management SaaS / USA',900,1100,200,true,0],
]);

const healthTech = g([
  ['phreesia','Phreesia Inc','PHR','NYSE','US','Healthcare','Patient Intake & Engagement SaaS / USA',3000,1600,420,true,0],
  ['evolent health','Evolent Health Inc','EVH','NYSE','US','Healthcare','Value-Based Care Technology / USA',4500,1600,2600,true,0],
  ['hims hers','Hims & Hers Health Inc','HIMS','NYSE','US','Healthcare','Telehealth & Wellness Platform / USA',1500,12000,1800,true,0],
  ['teladoc','Teladoc Health Inc','TDOC','NYSE','US','Healthcare','Telehealth Platform / USA',5000,1600,2600,true,0],
  ['gohealth','GoHealth Inc','GOCO','NASDAQ','US','Healthcare','Health Insurance Marketplace / USA',1500,320,720,true,0],
]);

const paymentsExtra = g([
  ['toast','Toast Inc','TOST','NYSE','US','Financial Technology','Restaurant Commerce Platform / USA',5500,22000,5000,true,0],
  ['sezzle','Sezzle Inc','SEZL','NASDAQ','US','Financial Technology','Buy-Now-Pay-Later / USA',500,3200,320,true,0],
  ['vontier','Vontier Corporation','VNT','NYSE','US','Technology','Mobility & Retail Tech / USA',8000,5200,3000,true,0],
  ['cricut','Cricut Inc','CRCT','NASDAQ','US','Technology','Connected Crafting Machines / USA',1000,1300,700,true,0],
]);

runWaves('T16', V, [
  ['US SaaS', usSaas],
  ['Health Tech', healthTech],
  ['Payments & Connected Devices', paymentsExtra],
]);
