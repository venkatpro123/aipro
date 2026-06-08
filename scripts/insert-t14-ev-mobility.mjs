// Tech Wave T14 — EV / Mobility Tech + Charging Infrastructure
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 't14-ev-mobility-v2026.1';
const g = mapRows(V);

const evMakers = g([
  ['lucid group','Lucid Group Inc','LCID','NASDAQ','US','Consumer Discretionary','Luxury Electric Vehicles / USA',7000,8200,800,true,0],
  ['nio inc','NIO Inc','NIO','NYSE','CN','Consumer Discretionary','Electric Vehicles / China',33000,12000,9500,true,0],
  ['zeekr','ZEEKR Intelligent Technology Holding','ZK','NYSE','CN','Consumer Discretionary','Premium Electric Vehicles / China',12000,8200,9000,true,0],
  ['polestar','Polestar Automotive Holding','PSNY','NASDAQ','SE','Consumer Discretionary','Electric Performance Vehicles / Sweden',2500,2600,2500,true,0],
]);

const evCharging = g([
  ['chargepoint','ChargePoint Holdings Inc','CHPT','NYSE','US','Technology','EV Charging Network / USA',1500,520,420,true,0],
  ['evgo','EVgo Inc','EVGO','NASDAQ','US','Technology','EV Fast Charging Network / USA',600,820,260,true,0],
  ['wallbox','Wallbox NV','WBX','NYSE','ES','Technology','EV Charging Hardware / Spain',1000,210,180,true,0],
]);

runWaves('T14', V, [
  ['EV Makers', evMakers],
  ['EV Charging Infrastructure', evCharging],
]);
