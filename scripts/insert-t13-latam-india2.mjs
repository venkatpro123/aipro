// Tech Wave T13 — LATAM Tech + India Internet/Fintech (more)
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 't13-latam-india2-v2026.1';
const g = mapRows(V);

const latam = g([
  ['mercadolibre','MercadoLibre Inc','MELI','NASDAQ','AR','Technology','E-Commerce & Fintech Platform / Argentina',58000,105000,20000,true,0],
  ['dlocal','DLocal Limited','DLO','NASDAQ','UY','Financial Technology','Cross-Border Payments / Uruguay',1000,3200,750,true,0],
  ['stoneco','StoneCo Ltd','STNE','NASDAQ','BR','Financial Technology','Payments & Financial Software / Brazil',13000,3600,2600,true,0],
  ['pagseguro','PagSeguro Digital Ltd','PAGS','NYSE','BR','Financial Technology','Digital Payments / Brazil',16000,3200,3200,true,0],
  ['totvs','TOTVS SA','TOTS3','B3','BR','Technology','Enterprise Software / Brazil',12000,4200,1100,true,0],
  ['locaweb','Locaweb Servicos de Internet SA','LWSA3','B3','BR','Technology','Cloud Hosting & SaaS / Brazil',3000,520,420,true,0],
  ['bemobi','Bemobi Mobile Tech SA','BMOB3','B3','BR','Technology','Mobile Apps & Digital Services / Brazil',1000,320,180,true,0],
]);

const indiaInternet = g([
  ['mobikwik','One MobiKwik Systems Limited','MOBIKWIK','NSE','IN','Financial Technology','Digital Wallet & BNPL / India',1500,520,120,true,0],
  ['blackbuck','Zinka Logistics Solutions (BlackBuck)','BLACKBUCK','NSE','IN','Technology','Trucking & Logistics Platform / India',1500,1600,120,true,0],
  ['niva bupa','Niva Bupa Health Insurance Company','NIVABUPA','NSE','IN','Financial Technology','Health Insurance Tech / India',8000,3200,820,true,0],
]);

runWaves('T13', V, [
  ['LATAM Tech', latam],
  ['India Internet & Fintech', indiaInternet],
]);
