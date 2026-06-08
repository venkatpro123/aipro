// Tech Wave T2 — US SaaS / Vertical Software
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 't2-us-saas-v2026.1';
const g = mapRows(V);

const saasA = g([
  ['workiva','Workiva Inc','WK','NYSE','US','Technology','Cloud Compliance & Reporting SaaS / USA',2800,5200,720,true,0],
  ['n-able','N-able Inc','NABL','NYSE','US','Technology','IT Management Software / USA',1700,2100,470,true,0],
  ['sps commerce','SPS Commerce Inc','SPSC','NASDAQ','US','Technology','Retail Supply Chain SaaS / USA',2500,7200,650,true,0],
  ['envestnet','Envestnet Inc','ENV','NYSE','US','Financial Technology','Wealth Management Software / USA',4000,4200,1350,true,0],
  ['q2 holdings','Q2 Holdings Inc','QTWO','NYSE','US','Financial Technology','Digital Banking Software / USA',2500,5200,720,true,0],
  ['agilysys','Agilysys Inc','AGYS','NASDAQ','US','Technology','Hospitality Software / USA',2000,3200,280,true,0],
  ['clearwater analytics','Clearwater Analytics Holdings','CWAN','NYSE','US','Financial Technology','Investment Accounting SaaS / USA',1800,6200,450,true,0],
  ['definitive healthcare','Definitive Healthcare Corp','DH','NASDAQ','US','Healthcare','Healthcare Commercial Intelligence / USA',900,820,260,true,0],
  ['simulations plus','Simulations Plus Inc','SLP','NASDAQ','US','Healthcare','Pharma Simulation Software / USA',500,820,70,true,0],
  ['olo','Olo Inc','OLO','NYSE','US','Technology','Restaurant Ordering SaaS / USA',750,1600,290,true,0],
]);

const saasB = g([
  ['weave communications','Weave Communications Inc','WEAV','NYSE','US','Technology','SMB Customer Communications / USA',1100,820,210,true,0],
  ['jamf holding','Jamf Holding Corp','JAMF','NASDAQ','US','Technology','Apple Device Management / USA',2500,2100,650,true,0],
  ['rimini street','Rimini Street Inc','RMNI','NASDAQ','US','Technology','Enterprise Software Support / USA',1900,520,430,true,0],
  ['amplitude','Amplitude Inc','AMPL','NASDAQ','US','Technology','Product Analytics SaaS / USA',800,1600,300,true,0],
  ['semrush','Semrush Holdings Inc','SEMR','NYSE','US','Technology','SEO & Marketing Analytics SaaS / USA',1500,2100,400,true,0],
  ['zeta global','Zeta Global Holdings Corp','ZETA','NYSE','US','Technology','AI Marketing Cloud / USA',2000,3600,1000,true,0],
  ['paymentus','Paymentus Holdings Inc','PAY','NYSE','US','Financial Technology','Bill Payment SaaS / USA',1000,3600,900,true,0],
  ['expensify','Expensify Inc','EXFY','NASDAQ','US','Financial Technology','Expense Management SaaS / USA',700,320,150,true,0],
  ['intapp','Intapp Inc','INTA','NASDAQ','US','Technology','Professional Services SaaS / USA',1300,4200,500,true,0],
  ['varonis systems','Varonis Systems Inc','VRNS','NASDAQ','US','Technology','Data Security Platform / USA',2500,6200,600,true,0],
]);

runWaves('T2', V, [
  ['US SaaS (Vertical A)', saasA],
  ['US SaaS (Vertical B)', saasB],
]);
