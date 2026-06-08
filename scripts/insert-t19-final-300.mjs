// Tech Wave T19 — Final top-up to reach 300 target
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 't19-final300-v2026.1';
const g = mapRows(V);

const usSaasFinal = g([
  ['workhuman','Workhuman (private)','WRKHMN','PRIVATE','IE','Technology','Employee Recognition SaaS / Ireland',700,1200,300,false,0],
  ['gusto','Gusto Inc (private)','GUSTO','PRIVATE','US','Technology','SMB Payroll & HR Platform / USA',2800,9500,500,false,0],
  ['notion labs','Notion Labs Inc (private)','NOTION','PRIVATE','US','Technology','Connected Workspace SaaS / USA',800,10000,400,false,0],
  ['airtable','Airtable Inc (private)','AIRTABLE','PRIVATE','US','Technology','No-Code Database Platform / USA',900,11000,400,false,0],
  ['miro','Miro (RealtimeBoard, private)','MIRO','PRIVATE','NL','Technology','Visual Collaboration Whiteboard / Netherlands',1800,17500,500,false,0],
  ['grammarly','Grammarly Inc (private)','GRAMMARLY','PRIVATE','US','Technology','AI Writing Assistant / USA',1000,13000,700,false,0],
  ['chime financial','Chime Financial Inc','CHYM','NASDAQ','US','Financial Technology','Consumer Neobank / USA',1500,11000,1700,true,0],
  ['circle internet','Circle Internet Group Inc','CRCL','NYSE','US','Financial Technology','USDC Stablecoin Infrastructure / USA',1000,30000,1700,true,0],
  ['klarna','Klarna Group plc','KLAR','NYSE','SE','Financial Technology','Buy-Now-Pay-Later / Sweden',5000,15000,2800,true,0],
]);

const globalMore = g([
  ['kaspi kz','Kaspi.kz JSC','KSPI','NASDAQ','KZ','Financial Technology','Super-App & Fintech / Kazakhstan',12000,18000,4500,true,0],
  ['infobip','Infobip Ltd (private)','INFOBIP','PRIVATE','HR','Technology','Cloud Communications (CPaaS) / Croatia',3500,2600,1700,false,0],
  ['bending spoons','Bending Spoons SpA (private)','BENDING','PRIVATE','IT','Technology','Consumer App Portfolio / Italy',500,2600,1000,false,0],
  ['personio','Personio GmbH (private)','PERSONIO','PRIVATE','DE','Technology','SMB HR Software / Germany',2000,8500,300,false,0],
  ['revolut','Revolut Group Holdings (private)','REVOLUT','PRIVATE','GB','Financial Technology','Global Neobank / UK',10000,45000,4000,false,0],
  ['monzo','Monzo Bank Ltd (private)','MONZO','PRIVATE','GB','Financial Technology','Digital Bank / UK',3500,6500,1100,false,0],
  ['n26','N26 GmbH (private)','N26','PRIVATE','DE','Financial Technology','Mobile Bank / Germany',1500,9000,500,false,0],
]);

const indiaFinal = g([
  ['ola consumer','ANI Technologies (Ola, private)','OLACONS','PRIVATE','IN','Technology','Ride-Hailing & Mobility / India',5000,5200,800,false,0],
  ['meesho','Meesho (private)','MEESHO','PRIVATE','IN','Technology','Social Commerce Platform / India',2000,5000,700,false,0],
  ['razorpay','Razorpay (private)','RAZORPAY','PRIVATE','IN','Financial Technology','Payments & Banking Platform / India',3500,7500,500,false,0],
  ['cred','Dreamplug Technologies (CRED, private)','CRED','PRIVATE','IN','Financial Technology','Credit Card Payments & Rewards / India',1000,6400,300,false,0],
  ['zoho corporation','Zoho Corporation (private)','ZOHO','PRIVATE','IN','Technology','Business Software Suite / India',18000,12000,1500,false,0],
]);

runWaves('T19', V, [
  ['US/Global Private SaaS', usSaasFinal],
  ['Global Fintech & Software', globalMore],
  ['India Private Tech', indiaFinal],
]);
