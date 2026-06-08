// IT/Software Wave IS3 — SaaS & Cloud Software
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'is3-saas-cloud-v2026.1';
const g = mapRows(V);

const saasCloud = g([
  ['atlassian','Atlassian Corporation','TEAM','NASDAQ','US','Technology','Developer Collaboration Software / USA',12000,52000,4900,true,0],
  ['shopify','Shopify Inc','SHOP','NYSE','CA','Technology','E-Commerce Platform / Canada',8200,135000,9200,true,0],
  ['twilio','Twilio Inc','TWLO','NYSE','US','Technology','Cloud Communications APIs / USA',5500,16500,4400,true,0],
  ['zoom video','Zoom Communications Inc','ZM','NASDAQ','US','Technology','Video Communications / USA',7500,22000,4700,true,0],
  ['docusign','DocuSign Inc','DOCU','NASDAQ','US','Technology','E-Signature & Agreement Cloud / USA',7000,16500,3000,true,0],
  ['dropbox','Dropbox Inc','DBX','NASDAQ','US','Technology','Cloud Storage & Collaboration / USA',2700,8200,2550,true,0],
  ['smartsheet','Smartsheet Inc','SMAR','NYSE','US','Technology','Work Management SaaS / USA',3500,8200,1100,true,0],
  ['gitlab','GitLab Inc','GTLB','NASDAQ','US','Technology','DevSecOps Platform / USA',2200,8500,820,true,0],
  ['hashicorp','HashiCorp Inc (IBM)','HCP','NASDAQ','US','Technology','Cloud Infrastructure Automation / USA',2500,6800,680,true,0],
  ['jfrog','JFrog Ltd','FROG','NASDAQ','IL','Technology','DevOps Software Supply Chain / Israel',1600,4200,460,true,0],
]);

const cloudInfra = g([
  ['akamai','Akamai Technologies Inc','AKAM','NASDAQ','US','Technology','CDN & Edge Security / USA',10500,16500,4100,true,0],
  ['fastly','Fastly Inc','FSLY','NYSE','US','Technology','Edge Cloud Platform / USA',1200,1050,580,true,0],
  ['digitalocean','DigitalOcean Holdings Inc','DOCN','NYSE','US','Technology','Cloud Hosting for Developers / USA',1200,3600,780,true,0],
  ['nutanix','Nutanix Inc','NTNX','NASDAQ','US','Technology','Hybrid Cloud Infrastructure / USA',6500,18500,2350,true,0],
  ['commvault','Commvault Systems Inc','CVLT','NASDAQ','US','Technology','Data Protection & Management / USA',2900,8200,920,true,0],
  ['verisign','VeriSign Inc','VRSN','NASDAQ','US','Technology','Domain Name Registry Infrastructure / USA',900,26000,1600,true,0],
  ['gen digital','Gen Digital Inc (Norton/Avast)','GEN','NASDAQ','US','Technology','Consumer Cyber Safety / USA',4000,18500,3900,true,0],
  ['dolby laboratories','Dolby Laboratories Inc','DLB','NYSE','US','Technology','Audio/Visual Technology Licensing / USA',2300,7200,1300,true,0],
]);

const hcmSoftware = g([
  ['paycom','Paycom Software Inc','PAYC','NYSE','US','Technology','Payroll & HCM Software / USA',7000,12000,1850,true,0],
  ['paychex','Paychex Inc','PAYX','NASDAQ','US','Technology','Payroll & HR Services / USA',16000,52000,5500,true,0],
  ['paycor','Paycor HCM Inc','PYCR','NASDAQ','US','Technology','HCM Software / USA',2800,3200,650,true,0],
  ['freshworks','Freshworks Inc','FRSH','NASDAQ','US','Technology','Customer & Employee Experience SaaS / USA',5000,5200,720,true,0],
  ['zuora','Zuora Inc','ZUO','NYSE','US','Technology','Subscription Management Software / USA',1500,1600,460,true,0],
  ['qualtrics','Qualtrics LLC','XM','NASDAQ','US','Technology','Experience Management Software / USA',5000,12500,1850,false,0],
]);

runWaves('IS3', V, [
  ['SaaS & Cloud Software', saasCloud],
  ['Cloud Infrastructure', cloudInfra],
  ['HCM & Experience Software', hcmSoftware],
]);
