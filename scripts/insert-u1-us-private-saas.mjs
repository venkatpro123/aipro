// Wave U1 — US Private SaaS unicorns (is_public=false, valuation as market_cap)
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'u1-us-private-saas-v2026.1';
const g = mapRows(V);

const privateSaas = g([
  ['airtable','Airtable Inc','AIRTBL','PRIVATE','US','Technology','No-Code Database Platform / USA',1100,11700,375,false,0],
  ['miro','Miro (RealtimeBoard Inc)','MIRO','PRIVATE','US','Technology','Visual Collaboration Whiteboard / USA',1800,17500,400,false,0],
  ['calendly','Calendly LLC','CALDLY','PRIVATE','US','Technology','Scheduling Automation SaaS / USA',700,3000,200,false,0],
  ['gusto','Gusto Inc','GUSTO','PRIVATE','US','Financial Technology','SMB Payroll & HR Platform / USA',2800,9500,600,false,0],
  ['brex','Brex Inc','BREX','PRIVATE','US','Financial Technology','Corporate Cards & Spend / USA',1200,12300,350,false,0],
  ['ramp','Ramp Business Corporation','RAMP','PRIVATE','US','Financial Technology','Corporate Spend Management / USA',1000,22500,700,false,0],
  ['deel','Deel Inc','DEEL','PRIVATE','US','Technology','Global Payroll & EOR Platform / USA',5000,12600,800,false,0],
  ['conga','Conga (Apttus)','CONGA','PRIVATE','US','Technology','Revenue Operations Software / USA',2000,2700,400,false,0],
  ['gainsight','Gainsight Inc','GNSGHT','PRIVATE','US','Technology','Customer Success Platform / USA',1100,1900,250,false,0],
  ['highspot','Highspot Inc','HISPOT','PRIVATE','US','Technology','Sales Enablement Platform / USA',1000,3700,200,false,0],
  ['outreach','Outreach Corporation','OTRCH','PRIVATE','US','Technology','Sales Engagement Platform / USA',1100,4400,250,false,0],
  ['certinia','Certinia Inc','CRT','PRIVATE','US','Technology','Services-as-a-Business ERP / USA',900,1500,200,false,0],
  ['medallia','Medallia Inc','MDLA','PRIVATE','US','Technology','Experience Management SaaS / USA',2500,6400,650,false,0],
  ['anaplan','Anaplan Inc','PLAN','PRIVATE','US','Technology','Connected Planning Platform / USA',2500,10700,750,false,0],
  ['coupa','Coupa Software Inc','COUP','PRIVATE','US','Technology','Business Spend Management / USA',3500,8000,900,false,0],
  ['model n','Model N Inc','MODN','PRIVATE','US','Technology','Revenue Management Software / USA',1700,1250,250,false,0],
  ['solera','Solera Holdings Inc','SLRA','PRIVATE','US','Technology','Automotive & Insurance Software / USA',6500,15000,2200,false,0],
  ['perficient','Perficient Inc','PRFT','PRIVATE','US','Technology','Digital Consulting & Engineering / USA',6000,3000,920,false,0],
]);

runWaves('U1', V, [['US Private SaaS Unicorns', privateSaas]]);
