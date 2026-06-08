// IT/Software Wave IS6 — Payments & Fintech Software
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'is6-fintech-payments-v2026.1';
const g = mapRows(V);

const payments = g([
  ['paypal','PayPal Holdings Inc','PYPL','NASDAQ','US','Financial Technology','Digital Payments / USA',24000,72000,32000,true,0],
  ['marqeta','Marqeta Inc','MQ','NASDAQ','US','Financial Technology','Card Issuing Platform / USA',1000,2600,520,true,0],
  ['flywire','Flywire Corporation','FLYW','NASDAQ','US','Financial Technology','Global Payments Software / USA',1500,2600,500,true,0],
  ['payoneer','Payoneer Global Inc','PAYO','NASDAQ','US','Financial Technology','Cross-Border Payments / USA',2500,3200,950,true,0],
  ['remitly','Remitly Global Inc','RELY','NASDAQ','US','Financial Technology','Digital Remittances / USA',2800,4200,1450,true,0],
]);

const semiComponents = g([
  ['wolfspeed','Wolfspeed Inc','WOLF','NYSE','US','Technology','Silicon Carbide Semiconductors / USA',5000,820,820,true,1000],
  ['amkor technology','Amkor Technology Inc','AMKR','NASDAQ','US','Technology','Semiconductor Packaging & Test / USA',30000,7200,6500,true,0],
  ['mks instruments','MKS Instruments Inc','MKSI','NASDAQ','US','Technology','Semiconductor Process Instruments / USA',26000,8200,3700,true,0],
  ['cirrus logic','Cirrus Logic Inc','CRUS','NASDAQ','US','Technology','Audio & Mixed-Signal Chips / USA',1700,5200,1900,true,0],
]);

runWaves('IS6', V, [
  ['Payments & Fintech', payments],
  ['Semiconductor Packaging & Components', semiComponents],
]);
