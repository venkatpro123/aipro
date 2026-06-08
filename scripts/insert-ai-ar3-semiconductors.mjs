// AI/Robotics Wave AR3 — AI Semiconductor / Hardware enabling companies
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'ai-ar3-v2026.1';
const g = mapRows(V);

const aiChips = g([
  ['qualcomm','Qualcomm Incorporated','QCOM','NASDAQ','US','Technology','Mobile AI Chips & Connectivity / USA',51000,168000,40500,true,0],
  ['broadcom','Broadcom Inc','AVGO','NASDAQ','US','Technology','AI Networking & Semiconductors / USA',40000,950000,56000,true,0],
  ['texas instruments','Texas Instruments Incorporated','TXN','NASDAQ','US','Technology','Analog & Embedded AI Chips / USA',34000,162000,18000,true,0],
  ['applied materials','Applied Materials Inc','AMAT','NASDAQ','US','Technology','Semiconductor Manufacturing Equipment / USA',34000,142000,28000,true,0],
  ['lam research','Lam Research Corporation','LRCX','NASDAQ','US','Technology','Etch & Deposition Equipment / USA',18000,92000,16000,true,0],
  ['marvell technology','Marvell Technology Inc','MRVL','NASDAQ','US','Technology','Custom AI & Networking Chips / USA',10000,62000,7200,true,0],
  ['monolithic power','Monolithic Power Systems Inc','MPWR','NASDAQ','US','Technology','Power Management AI / USA',2500,21000,2250,true,0],
  ['entegris','Entegris Inc','ENTG','NASDAQ','US','Technology','Semiconductor Materials / USA',10000,18500,3750,true,0],
  ['onto innovation','Onto Innovation Inc','ONTO','NYSE','US','Technology','Semiconductor Inspection & Metrology / USA',3000,4200,1020,true,0],
  ['axcelis technologies','Axcelis Technologies Inc','ACLS','NASDAQ','US','Technology','Ion Implant Equipment / USA',2200,3600,1100,true,0],
  ['camtek','Camtek Ltd','CAMT','NASDAQ','IL','Technology','Inspection & Metrology Equipment / Israel',1000,2100,420,true,0],
  ['indie semiconductor','indie Semiconductor Inc','INDI','NASDAQ','US','Technology','Automotive AI SoCs / USA',1200,1600,320,true,0],
]);

runWaves('AI AR3', V, [['AI Semiconductors & Equipment', aiChips]]);
