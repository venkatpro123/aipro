// AI Wave AR7 — AI-Powered Enterprise SaaS & CRM Platforms
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'ai-ar7-v2026.1';
const g = mapRows(V);

const enterprisePlatforms = g([
  ['servicenow','ServiceNow Inc','NOW','NYSE','US','Technology','AI-Powered IT & Workflow Automation / USA',22000,228000,12000,true,0],
  ['salesforce','Salesforce Inc','CRM','NYSE','US','Technology','AI CRM & Einstein Platform / USA',72000,242000,36500,true,0],
  ['workday','Workday Inc','WDAY','NASDAQ','US','Technology','AI HR & Finance Cloud / USA',19000,48000,8200,true,0],
  ['hubspot','HubSpot Inc','HUBS','NYSE','US','Technology','AI Marketing & CRM Platform / USA',7500,26000,2650,true,0],
  ['bill com','Bill.com Holdings Inc','BILL','NYSE','US','Financial Technology','AI Financial Operations Platform / USA',3200,5200,1420,true,0],
  ['paylocity','Paylocity Holding Corporation','PCTY','NASDAQ','US','Technology','AI-Driven Payroll & HCM / USA',5500,7200,1220,true,0],
  ['dun bradstreet','Dun & Bradstreet Holdings Inc','DNB','NYSE','US','Technology','AI Business Data & Analytics / USA',7000,4200,2320,true,0],
]);

const privateEnterprise = g([
  ['rippling','Rippling Inc','RIPPLING','PRIVATE','US','Technology','AI HR & IT Platform / USA',3000,13500,1050,false,0],
  ['gong io','Gong.io Inc','GONG','PRIVATE','IL','Technology','Revenue Intelligence AI / Israel',2000,7200,350,false,0],
]);

runWaves('AI AR7', V, [
  ['AI Enterprise Platforms', enterprisePlatforms],
  ['Private Enterprise AI', privateEnterprise],
]);
