// Tech Wave T3 — US Cybersecurity + more SaaS
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 't3-saas-cyber-v2026.1';
const g = mapRows(V);

const cyberMore = g([
  ['cloudflare','Cloudflare Inc','NET','NYSE','US','Technology','Edge Cloud & Security Platform / USA',4000,52000,1700,true,0],
  ['fortinet','Fortinet Inc','FTNT','NASDAQ','US','Technology','Network Security Appliances / USA',14000,72000,6000,true,0],
  ['sailpoint','SailPoint Technologies Inc','SAIL','NASDAQ','US','Technology','Identity Governance / USA',2900,12000,920,true,0],
  ['onespan','OneSpan Inc','OSPN','NASDAQ','US','Technology','Digital Identity & Anti-Fraud / USA',650,620,250,true,0],
  ['radware','Radware Ltd','RDWR','NASDAQ','IL','Technology','Application & Network Security / Israel',1500,1050,300,true,0],
]);

const saasC = g([
  ['appfolio','AppFolio Inc','APPF','NASDAQ','US','Technology','Property Management SaaS / USA',1500,8200,800,true,0],
  ['clear secure','Clear Secure Inc','YOU','NYSE','US','Technology','Biometric Identity Verification / USA',1000,3200,750,true,0],
  ['klaviyo','Klaviyo Inc','KVYO','NYSE','US','Technology','Marketing Automation SaaS / USA',2000,9500,1000,true,0],
  ['servicetitan','ServiceTitan Inc','TTAN','NASDAQ','US','Technology','Trades Business Management SaaS / USA',3000,9500,800,true,0],
  ['pagerduty','PagerDuty Inc','PD','NYSE','US','Technology','Digital Operations Management / USA',1200,1600,470,true,0],
  ['sumo logic','Sumo Logic Inc','SUMO','NASDAQ','US','Technology','Cloud Log Analytics / USA',1000,1050,320,true,0],
  ['dayforce','Dayforce Inc','DAY','NYSE','US','Technology','Cloud HCM Platform / USA',8500,9500,1750,true,0],
  ['godaddy','GoDaddy Inc','GDDY','NYSE','US','Technology','Domains & Website Hosting / USA',6800,26000,4600,true,0],
  ['ncino','nCino Inc','NCNO','NASDAQ','US','Financial Technology','Cloud Banking Software / USA',1700,3600,540,true,0],
  ['avalara','Avalara Inc','AVLR','NYSE','US','Financial Technology','Tax Compliance Automation / USA',4500,8200,1100,false,0],
]);

runWaves('T3', V, [
  ['Cybersecurity (more)', cyberMore],
  ['US SaaS (Vertical C)', saasC],
]);
