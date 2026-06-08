// Tech Wave T8 — Taiwan & Korea Technology
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 't8-taiwan-korea-v2026.1';
const g = mapRows(V);

const taiwan = g([
  ['ase technology','ASE Technology Holding Co Ltd','ASX','NYSE','TW','Technology','Semiconductor Assembly & Test / Taiwan',95000,28000,20000,true,0],
  ['himax technologies','Himax Technologies Inc','HIMX','NASDAQ','TW','Technology','Display Driver ICs / Taiwan',2000,1600,950,true,0],
  ['novatek microelectronics','Novatek Microelectronics Corp','3034','TWSE','TW','Technology','Display Driver & SoC / Taiwan',4000,18500,3600,true,0],
  ['compal electronics','Compal Electronics Inc','2324','TWSE','TW','Technology','Contract Electronics Manufacturing / Taiwan',64000,8200,30000,true,0],
  ['wiwynn','Wiwynn Corporation','6669','TWSE','TW','Technology','AI Server Manufacturing / Taiwan',8000,26000,18000,true,0],
  ['accton technology','Accton Technology Corporation','2345','TWSE','TW','Technology','Networking Equipment ODM / Taiwan',5000,12000,3600,true,0],
  ['silergy','Silergy Corp','6415','TWSE','TW','Technology','Analog Power Chips / Taiwan',1500,5200,650,true,0],
  ['global unichip','Global Unichip Corp','3443','TWSE','TW','Technology','ASIC Design Services / Taiwan',1200,8200,950,true,0],
  ['win semiconductors','Win Semiconductors Corp','3105','TWSE','TW','Technology','GaAs RF Foundry / Taiwan',6000,5200,800,true,0],
  ['alchip technologies','Alchip Technologies Ltd','3661','TWSE','TW','Technology','AI ASIC Design / Taiwan',800,12000,1600,true,0],
]);

const korea = g([
  ['kakao','Kakao Corp','035720','KRX','KR','Technology','Messaging & Internet Platform / Korea',15000,16500,5800,true,0],
  ['sk square','SK Square Co Ltd','402340','KRX','KR','Technology','Tech Investment Holding / Korea',200,8200,520,true,0],
  ['ls electric','LS Electric Co Ltd','010120','KRX','KR','Industrials','Power & Automation Equipment / Korea',5000,5200,3200,true,0],
  ['hanmi semiconductor','Hanmi Semiconductor Co Ltd','042700','KRX','KR','Technology','HBM Packaging Equipment / Korea',1200,8200,520,true,0],
  ['lg display','LG Display Co Ltd','034220','KRX','KR','Technology','OLED & LCD Panels / Korea',30000,8200,18000,true,0],
  ['lg innotek','LG Innotek Co Ltd','011070','KRX','KR','Technology','Camera Modules & Substrates / Korea',13000,5200,15000,true,0],
  ['silicon works','LX Semicon Co Ltd','108320','KRX','KR','Technology','Display Driver ICs / Korea',1200,1600,1500,true,0],
  ['wonik ips','Wonik IPS Co Ltd','240810','KRX','KR','Technology','Semiconductor Equipment / Korea',1500,2100,820,true,0],
  ['douzone bizon','Douzone Bizon Co Ltd','012510','KRX','KR','Technology','Enterprise ERP Software / Korea',2500,2100,820,true,0],
  ['kakao games','Kakao Games Corp','293490','KRX','KR','Technology','Mobile & PC Gaming / Korea',1500,1050,650,true,0],
]);

runWaves('T8', V, [
  ['Taiwan Technology', taiwan],
  ['Korea Technology', korea],
]);
