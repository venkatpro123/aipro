// Wave U4 — China HK majors + A-share semiconductors & software
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'u4-china-tech-v2026.1';
const g = mapRows(V);

const chinaHK = g([
  ['xiaomi','Xiaomi Corporation','1810','HKSE','CN','Technology','Smartphones, IoT & EVs / China',48000,165000,55000,true,0],
  ['lenovo','Lenovo Group Limited','0992','HKSE','CN','Technology','PCs, Servers & Devices / China',77000,18500,62000,true,0],
  ['netease','NetEase Inc','NTES','NASDAQ','CN','Technology','Online Games & Services / China',32000,72000,15000,true,0],
  ['jd com','JD.com Inc','JD','NASDAQ','CN','Technology','E-Commerce & Logistics / China',520000,52000,160000,true,0],
  ['byd electronic','BYD Electronic International','0285','HKSE','CN','Technology','Electronics Manufacturing / China',130000,12000,22000,true,0],
  ['aac technologies','AAC Technologies Holdings','2018','HKSE','CN','Technology','Acoustic & Optics Components / China',40000,5200,3200,true,0],
  ['sunny optical','Sunny Optical Technology','2382','HKSE','CN','Technology','Optical Lenses & Modules / China',28000,12000,5200,true,0],
]);

const chinaSemis = g([
  ['goertek','GoerTek Inc','002241','SZSE','CN','Technology','Acoustic & VR/AR Components / China',90000,12000,14000,true,0],
  ['luxshare precision','Luxshare Precision Industry','002475','SZSE','CN','Technology','Electronics & Connectors / China',200000,42000,35000,true,0],
  ['jcet group','JCET Group Co Ltd','600584','SHSE','CN','Technology','Semiconductor Assembly & Test / China',25000,12000,5000,true,0],
  ['montage technology','Montage Technology','688008','SHSE','CN','Technology','Memory Interface Chips / China',1000,12000,520,true,0],
  ['hygon','Hygon Information Technology','688041','SHSE','CN','Technology','x86 CPUs & DCU Accelerators / China',2000,52000,1300,true,0],
  ['amlogic','Amlogic Shanghai','688099','SHSE','CN','Technology','SoC Chips for Media Devices / China',1500,5200,900,true,0],
  ['advanced micro-fabrication','AMEC (Advanced Micro-Fabrication)','688012','SHSE','CN','Technology','Semiconductor Etching Equipment / China',2500,28000,1300,true,0],
  ['wingtech','Wingtech Technology','600745','SHSE','CN','Technology','ODM & Semiconductors / China',30000,12000,9000,true,0],
  ['lens technology','Lens Technology','300433','SZSE','CN','Technology','Cover Glass & Modules / China',120000,18500,9500,true,0],
]);

const chinaSoftware = g([
  ['inspur','Inspur Electronic Information','000977','SHSE','CN','Technology','AI Servers & Cloud Hardware / China',30000,18500,20000,true,0],
  ['sugon','Dawning Information (Sugon)','603019','SHSE','CN','Technology','HPC & AI Servers / China',10000,12000,6500,true,0],
  ['yonyou','Yonyou Network Technology','600588','SHSE','CN','Technology','Enterprise ERP & Cloud / China',23000,8200,1400,true,0],
]);

runWaves('U4', V, [
  ['China HK Majors', chinaHK],
  ['China A-share Semiconductors', chinaSemis],
  ['China Software & Servers', chinaSoftware],
]);
