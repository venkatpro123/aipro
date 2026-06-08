// Tech Wave T10 — European Software, Fintech & Semiconductors
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 't10-europe-tech-v2026.1';
const g = mapRows(V);

const euSoftware = g([
  ['darktrace','Darktrace plc','DARK','LSE','GB','Technology','AI Cybersecurity / UK',2400,5200,720,true,0],
  ['aveva','AVEVA Group plc','AVV','LSE','GB','Technology','Industrial Software / UK',6500,11000,1700,true,0],
  ['software ag','Software AG','SOW','XETRA','DE','Technology','Enterprise Integration Software / Germany',5000,3200,950,true,0],
  ['suse','SUSE S.A.','SUSE','XETRA','DE','Technology','Enterprise Linux & Cloud / Germany',2500,3200,720,true,0],
  ['believe music','Believe SA','BLV','EPA','FR','Technology','Digital Music Distribution / France',1700,1600,1050,true,0],
  ['esker','Esker SA','ALESK','EPA','FR','Technology','Document Process Automation / France',1000,2100,220,true,0],
  ['pexip','Pexip Holding ASA','PEXIP','OSLO','NO','Technology','Video Conferencing Software / Norway',500,520,140,true,0],
  ['crayon group','Crayon Group Holding ASA','CRAYON','OSLO','NO','Technology','IT Software & Cloud Advisory / Norway',4000,1600,4500,true,0],
  ['fortnox','Fortnox AB','FNOX','OMX','SE','Financial Technology','SMB Accounting Software / Sweden',600,8200,300,true,0],
  ['sinch','Sinch AB','SINCH','OMX','SE','Technology','Cloud Communications APIs / Sweden',4000,1900,2600,true,0],
]);

const euFintechGaming = g([
  ['nexi spa','Nexi S.p.A.','NEXI','BIT','IT','Financial Technology','Digital Payments / Italy',10000,9500,3800,true,0],
  ['worldline','Worldline SA','WLN','EPA','FR','Financial Technology','Payment Services / France',18000,2100,4900,true,2000],
  ['edenred','Edenred SE','EDEN','EPA','FR','Financial Technology','Prepaid Corporate Services / France',12000,11000,2900,true,0],
  ['evolution ab','Evolution AB','EVO','OMX','SE','Technology','Live Casino Gaming Tech / Sweden',20000,18500,2300,true,0],
  ['embracer group','Embracer Group AB','EMBRAC-B','OMX','SE','Technology','Video Game Publishing / Sweden',13000,3200,3600,true,1000],
]);

const euSemis = g([
  ['nordic semiconductor','Nordic Semiconductor ASA','NOD','OSLO','NO','Technology','Bluetooth & Wireless Chips / Norway',1500,3200,650,true,0],
  ['soitec','Soitec SA','SOI','EPA','FR','Technology','Engineered Semiconductor Substrates / France',2200,3200,1050,true,0],
  ['aixtron','AIXTRON SE','AIXA','XETRA','DE','Technology','Semiconductor Deposition Equipment / Germany',1000,2100,650,true,0],
  ['siltronic','Siltronic AG','WAF','XETRA','DE','Technology','Silicon Wafers / Germany',4000,2100,1600,true,0],
  ['vat group','VAT Group AG','VACN','SIX','CH','Technology','Vacuum Valves for Semiconductors / Switzerland',3000,12000,1050,true,0],
  ['u-blox','u-blox Holding AG','UBXN','SIX','CH','Technology','GPS & Wireless Modules / Switzerland',1500,520,350,true,0],
  ['logitech intl','Logitech International SA','LOGI','SIX','CH','Technology','Computer Peripherals / Switzerland',8000,12000,4400,true,0],
  ['mycronic','Mycronic AB','MYCR','OMX','SE','Technology','Electronics Production Equipment / Sweden',2000,5200,820,true,0],
]);

runWaves('T10', V, [
  ['EU Software', euSoftware],
  ['EU Fintech & Gaming', euFintechGaming],
  ['EU Semiconductors', euSemis],
]);
