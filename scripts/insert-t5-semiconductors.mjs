// Tech Wave T5 — US Semiconductors & Semi Equipment
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 't5-semis-v2026.1';
const g = mapRows(V);

const semiEquip = g([
  ['kulicke soffa','Kulicke and Soffa Industries Inc','KLIC','NASDAQ','US','Technology','Semiconductor Assembly Equipment / USA',2800,2100,720,true,0],
  ['ichor holdings','Ichor Holdings Ltd','ICHR','NASDAQ','US','Technology','Semiconductor Fluid Delivery / USA',2500,820,820,true,0],
  ['ultra clean holdings','Ultra Clean Holdings Inc','UCTT','NASDAQ','US','Technology','Semiconductor Subsystems / USA',6000,1600,2000,true,0],
  ['photronics','Photronics Inc','PLAB','NASDAQ','US','Technology','Photomask Manufacturing / USA',2200,1600,890,true,0],
  ['veeco instruments','Veeco Instruments Inc','VECO','NASDAQ','US','Technology','Semiconductor Process Equipment / USA',1400,1600,720,true,0],
  ['cohu','Cohu Inc','COHU','NASDAQ','US','Technology','Semiconductor Test & Handling / USA',2000,1050,520,true,0],
  ['formfactor','FormFactor Inc','FORM','NASDAQ','US','Technology','Semiconductor Test Probe Cards / USA',2200,3200,820,true,0],
  ['aehr test systems','Aehr Test Systems','AEHR','NASDAQ','US','Technology','Semiconductor Burn-In Test / USA',150,520,60,true,0],
]);

const fablessChips = g([
  ['ambarella','Ambarella Inc','AMBA','NASDAQ','US','Technology','Edge AI Vision SoCs / USA',900,3200,280,true,0],
  ['synaptics','Synaptics Incorporated','SYNA','NASDAQ','US','Technology','Human Interface & IoT Chips / USA',1700,3200,1050,true,0],
  ['diodes incorporated','Diodes Incorporated','DIOD','NASDAQ','US','Technology','Discrete & Analog Semiconductors / USA',9000,3200,1400,true,0],
  ['vishay intertechnology','Vishay Intertechnology Inc','VSH','NYSE','US','Technology','Discrete & Passive Components / USA',24000,2600,3000,true,0],
  ['navitas semiconductor','Navitas Semiconductor Corp','NVTS','NASDAQ','US','Technology','GaN & SiC Power Chips / USA',300,820,90,true,0],
  ['credo technology','Credo Technology Group','CRDO','NASDAQ','US','Technology','High-Speed Connectivity Chips / USA',900,8200,350,true,0],
  ['astera labs','Astera Labs Inc','ALAB','NASDAQ','US','Technology','AI Connectivity Semiconductors / USA',500,12000,500,true,0],
  ['impinj','Impinj Inc','PI','NASDAQ','US','Technology','RAIN RFID Chips / USA',900,3600,340,true,0],
  ['sitime','SiTime Corporation','SITM','NASDAQ','US','Technology','MEMS Timing Chips / USA',800,5200,250,true,0],
]);

runWaves('T5', V, [
  ['Semiconductor Equipment', semiEquip],
  ['Fabless & Component Chips', fablessChips],
]);
