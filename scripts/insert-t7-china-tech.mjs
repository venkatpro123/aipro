// Tech Wave T7 — China Internet, Software & Semiconductors
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 't7-china-tech-v2026.1';
const g = mapRows(V);

const chinaInternet = g([
  ['pinduoduo','PDD Holdings Inc','PDD','NASDAQ','CN','Technology','E-Commerce & Temu Platform / China',17000,165000,55000,true,0],
  ['trip com','Trip.com Group Limited','TCOM','NASDAQ','CN','Technology','Online Travel Platform / China',35000,42000,8200,true,0],
  ['tuya','Tuya Inc','TUYA','NYSE','CN','Technology','IoT Cloud Platform / China',2000,1900,300,true,0],
  ['kingsoft','Kingsoft Corporation','3888','HKSE','CN','Technology','Software & Gaming / China',8000,8200,3600,true,0],
  ['kingsoft cloud','Kingsoft Cloud Holdings Ltd','KC','NASDAQ','CN','Technology','Cloud Computing Services / China',5000,3200,1100,true,0],
  ['autohome','Autohome Inc','ATHM','NYSE','CN','Technology','Auto Online Platform / China',4500,3600,950,true,0],
  ['hello group','Hello Group Inc (Momo)','MOMO','NASDAQ','CN','Technology','Social & Dating Platform / China',2000,1300,1500,true,0],
  ['daqo new energy','Daqo New Energy Corp','DQ','NYSE','CN','Materials','Polysilicon for Solar / China',5000,1600,1500,true,0],
]);

const chinaSemis = g([
  ['semiconductor manufacturing','Semiconductor Manufacturing Intl (SMIC)','0981','HKSE','CN','Technology','Semiconductor Foundry / China',20000,42000,8000,true,0],
  ['hua hong semiconductor','Hua Hong Semiconductor Limited','1347','HKSE','CN','Technology','Semiconductor Foundry / China',6000,8200,2200,true,0],
  ['will semiconductor','Will Semiconductor (OmniVision)','603501','SHSE','CN','Technology','CMOS Image Sensors / China',5000,18500,3500,true,0],
  ['naura technology','NAURA Technology Group Co Ltd','002371','SZSE','CN','Technology','Semiconductor Equipment / China',8000,42000,4200,true,0],
  ['gigadevice','GigaDevice Semiconductor Inc','603986','SHSE','CN','Technology','Memory & MCU Chips / China',2000,11000,1100,true,0],
]);

const chinaSoftware = g([
  ['ming yuan cloud','Ming Yuan Cloud Group Holdings','0909','HKSE','CN','Technology','Real Estate SaaS / China',5000,820,420,true,0],
  ['weimob','Weimob Inc','2013','HKSE','CN','Technology','SaaS & Digital Commerce / China',4000,820,320,true,0],
  ['glodon','Glodon Company Limited','002410','SZSE','CN','Technology','Construction Software / China',14000,8200,1100,true,0],
  ['hundsun tech','Hundsun Technologies Inc','600570','SHSE','CN','Financial Technology','Financial Software / China',12000,8200,950,true,0],
  ['sangfor technologies','Sangfor Technologies Inc','300454','SZSE','CN','Technology','Cybersecurity & Cloud / China',9000,5200,1100,true,0],
  ['venustech','Venustech Group Inc','002439','SZSE','CN','Technology','Network Security / China',6000,2100,620,true,0],
]);

runWaves('T7', V, [
  ['China Internet', chinaInternet],
  ['China Semiconductors', chinaSemis],
  ['China Software', chinaSoftware],
]);
