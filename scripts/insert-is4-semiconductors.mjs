// IT/Software Wave IS4 — Semiconductors (memory, analog, foundry, RF, IP)
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'is4-semiconductors-v2026.1';
const g = mapRows(V);

const majorSemis = g([
  ['micron technology','Micron Technology Inc','MU','NASDAQ','US','Technology','Memory & Storage Semiconductors / USA',48000,135000,32000,true,0],
  ['analog devices','Analog Devices Inc','ADI','NASDAQ','US','Technology','Analog & Mixed-Signal Chips / USA',24000,118000,10000,true,0],
  ['stmicroelectronics','STMicroelectronics NV','STM','NYSE','CH','Technology','Semiconductors & Microcontrollers / Switzerland',50000,26000,13500,true,0],
  ['infineon technologies','Infineon Technologies AG','IFX','XETRA','DE','Technology','Power & Automotive Semiconductors / Germany',58000,46000,16500,true,0],
  ['globalfoundries','GlobalFoundries Inc','GFS','NASDAQ','US','Technology','Semiconductor Foundry / USA',13000,26000,6700,true,0],
  ['mediatek','MediaTek Inc','2454','TWSE','TW','Technology','Mobile & Connectivity Chips / Taiwan',22000,72000,17500,true,0],
  ['united microelectronics','United Microelectronics Corp','UMC','NYSE','TW','Technology','Semiconductor Foundry / Taiwan',20000,18500,7200,true,0],
]);

const rfAnalogChips = g([
  ['qorvo','Qorvo Inc','QRVO','NASDAQ','US','Technology','RF Semiconductors / USA',8000,8200,3800,true,0],
  ['silicon labs','Silicon Laboratories Inc','SLAB','NASDAQ','US','Technology','IoT Wireless Chips / USA',1500,4200,820,true,0],
  ['power integrations','Power Integrations Inc','POWI','NASDAQ','US','Technology','High-Voltage Power Chips / USA',900,3200,450,true,0],
  ['semtech','Semtech Corporation','SMTC','NASDAQ','US','Technology','Analog & IoT Semiconductors / USA',1500,3200,920,true,0],
  ['allegro microsystems','Allegro MicroSystems Inc','ALGM','NASDAQ','US','Technology','Magnetic Sensing & Power Chips / USA',4000,5200,1050,true,0],
  ['rambus','Rambus Inc','RMBS','NASDAQ','US','Technology','Memory Interface & Security IP / USA',800,5200,560,true,0],
  ['ceva','CEVA Inc','CEVA','NASDAQ','US','Technology','Wireless & Edge AI IP / USA',450,620,110,true,0],
]);

const semiEquipment = g([
  ['asm international','ASM International NV','ASM','AMS','NL','Technology','Semiconductor ALD Equipment / Netherlands',5000,28000,3200,true,0],
  ['besi','BE Semiconductor Industries NV','BESI','AMS','NL','Technology','Semiconductor Assembly Equipment / Netherlands',1800,11000,650,true,0],
]);

runWaves('IS4', V, [
  ['Major Semiconductors', majorSemis],
  ['RF & Analog Chips', rfAnalogChips],
  ['Semiconductor Equipment', semiEquipment],
]);
