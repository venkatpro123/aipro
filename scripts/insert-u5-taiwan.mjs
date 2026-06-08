// Wave U5 — Taiwan semiconductors, ODM, components
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'u5-taiwan-v2026.1';
const g = mapRows(V);

const twSemis = g([
  ['realtek','Realtek Semiconductor Corp','2379','TWSE','TW','Technology','Connectivity & Audio Chips / Taiwan',6000,18500,3600,true,0],
  ['phison','Phison Electronics Corp','8299','TWSE','TW','Technology','NAND Flash Controllers / Taiwan',4500,8200,2000,true,0],
  ['vanguard intl','Vanguard International Semiconductor','5347','TWSE','TW','Technology','Specialty Foundry / Taiwan',5000,12000,1300,true,0],
  ['macronix','Macronix International','2337','TWSE','TW','Technology','Non-Volatile Memory / Taiwan',6000,3200,1300,true,0],
  ['nanya technology','Nanya Technology Corp','2408','TWSE','TW','Technology','DRAM Memory / Taiwan',3500,6200,1600,true,0],
  ['chipbond','Chipbond Technology','6147','TWSE','TW','Technology','Display Driver Packaging / Taiwan',5000,2600,950,true,0],
  ['king yuan electronics','King Yuan Electronics','2449','TWSE','TW','Technology','Semiconductor Test Services / Taiwan',9000,3200,1300,true,0],
  ['unimicron','Unimicron Technology','3037','TWSE','TW','Technology','PCB & IC Substrates / Taiwan',30000,8200,3600,true,0],
  ['nan ya pcb','Nan Ya Printed Circuit Board','8046','TWSE','TW','Technology','IC Substrates & PCB / Taiwan',12000,3200,2100,true,0],
]);

const twHardware = g([
  ['gigabyte','GIGABYTE Technology','2376','TWSE','TW','Technology','Motherboards & AI Servers / Taiwan',8000,12000,12000,true,0],
  ['asustek','ASUSTeK Computer Inc','2357','TWSE','TW','Technology','PCs & Components / Taiwan',16000,18500,17000,true,0],
  ['acer','Acer Inc','2353','TWSE','TW','Technology','PCs & Devices / Taiwan',8000,3600,9000,true,0],
  ['micro star','Micro-Star International (MSI)','2377','TWSE','TW','Technology','Gaming Hardware & Motherboards / Taiwan',8000,8200,7000,true,0],
  ['pegatron','Pegatron Corporation','4938','TWSE','TW','Technology','Electronics Manufacturing / Taiwan',120000,8200,42000,true,0],
  ['inventec','Inventec Corporation','2356','TWSE','TW','Technology','Server & Notebook ODM / Taiwan',30000,8200,18000,true,0],
  ['lite-on','Lite-On Technology','2301','TWSE','TW','Technology','Power & Optoelectronics / Taiwan',35000,8200,7500,true,0],
  ['airtac','Airtac International Group','1590','TWSE','TW','Industrials','Pneumatic Automation Components / Taiwan',9000,12000,1100,true,0],
]);

runWaves('U5', V, [
  ['Taiwan Semiconductors', twSemis],
  ['Taiwan Hardware & ODM', twHardware],
]);
