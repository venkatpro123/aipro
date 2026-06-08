// Tech Wave T4 — US Internet Media + Fintech / Insurtech
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 't4-media-fintech-v2026.1';
const g = mapRows(V);

const internetMedia = g([
  ['shutterstock','Shutterstock Inc','SSTK','NYSE','US','Technology','Stock Media & Creative Platform / USA',1500,1300,950,true,0],
  ['ziff davis','Ziff Davis Inc','ZD','NASDAQ','US','Technology','Digital Media & Internet / USA',3800,2100,1400,true,0],
  ['cargurus','CarGurus Inc','CARG','NASDAQ','US','Technology','Online Auto Marketplace / USA',1100,3200,950,true,0],
  ['cars com','Cars.com Inc','CARS','NYSE','US','Technology','Automotive Marketplace / USA',700,820,720,true,0],
  ['thryv','Thryv Holdings Inc','THRY','NASDAQ','US','Technology','SMB Marketing Software / USA',2500,520,820,true,0],
  ['vimeo','Vimeo Inc','VMEO','NASDAQ','US','Technology','Video Hosting Platform / USA',1000,820,420,true,0],
]);

const fintech = g([
  ['affirm','Affirm Holdings Inc','AFRM','NASDAQ','US','Financial Technology','Buy-Now-Pay-Later / USA',2500,22000,2800,true,0],
  ['robinhood','Robinhood Markets Inc','HOOD','NASDAQ','US','Financial Technology','Retail Trading Platform / USA',2300,42000,3000,true,0],
  ['coinbase','Coinbase Global Inc','COIN','NASDAQ','US','Financial Technology','Crypto Exchange Platform / USA',3700,72000,6500,true,0],
  ['dave inc','Dave Inc','DAVE','NASDAQ','US','Financial Technology','Neobank & Cash Advance / USA',400,3200,420,true,0],
]);

const insurtech = g([
  ['lemonade','Lemonade Inc','LMND','NYSE','US','Financial Technology','AI Insurance / USA',1500,2600,520,true,0],
  ['root insurance','Root Inc','ROOT','NASDAQ','US','Financial Technology','Telematics Auto Insurance / USA',1200,2100,1200,true,0],
  ['hippo holdings','Hippo Holdings Inc','HIPO','NYSE','US','Financial Technology','Home Insurance Tech / USA',500,620,370,true,0],
]);

runWaves('T4', V, [
  ['US Internet Media', internetMedia],
  ['Fintech', fintech],
  ['Insurtech', insurtech],
]);
