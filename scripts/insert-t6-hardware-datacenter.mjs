// Tech Wave T6 — Hardware, Storage & AI Datacenter Infrastructure
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 't6-hardware-dc-v2026.1';
const g = mapRows(V);

const hardware = g([
  ['super micro computer','Super Micro Computer Inc','SMCI','NASDAQ','US','Technology','AI Server Systems / USA',6000,26000,22000,true,0],
  ['hewlett packard enterprise','Hewlett Packard Enterprise Co','HPE','NYSE','US','Technology','Enterprise Servers & Networking / USA',62000,28000,30000,true,0],
  ['netapp','NetApp Inc','NTAP','NASDAQ','US','Technology','Data Storage & Cloud / USA',12000,24000,6700,true,0],
  ['corsair gaming','Corsair Gaming Inc','CRSR','NASDAQ','US','Technology','Gaming Peripherals & Components / USA',2000,820,1400,true,0],
  ['sonos','Sonos Inc','SONO','NASDAQ','US','Technology','Wireless Audio Systems / USA',1800,1300,1600,true,0],
  ['garmin','Garmin Ltd','GRMN','NYSE','CH','Technology','GPS & Wearable Devices / Switzerland',20000,42000,6300,true,0],
  ['ubiquiti','Ubiquiti Inc','UI','NYSE','US','Technology','Networking Hardware / USA',1500,22000,2300,true,0],
]);

const aiDatacenter = g([
  ['vertiv holdings','Vertiv Holdings Co','VRT','NYSE','US','Technology','Datacenter Cooling & Power Infrastructure / USA',32000,52000,8500,true,0],
  ['coreweave','CoreWeave Inc','CRWV','NASDAQ','US','Technology','AI Cloud GPU Infrastructure / USA',1000,42000,2300,true,0],
  ['nebius group','Nebius Group NV','NBIS','NASDAQ','NL','Technology','AI Cloud Infrastructure / Netherlands',1500,8200,420,true,0],
  ['applied digital','Applied Digital Corporation','APLD','NASDAQ','US','Technology','AI Datacenter Hosting / USA',300,3200,300,true,0],
  ['core scientific','Core Scientific Inc','CORZ','NASDAQ','US','Technology','AI & Crypto Datacenter / USA',400,3600,1200,true,0],
]);

runWaves('T6', V, [
  ['Hardware & Devices', hardware],
  ['AI Datacenter Infrastructure', aiDatacenter],
]);
