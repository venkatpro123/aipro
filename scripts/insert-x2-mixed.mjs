// Wave X2 — US EMS/semis + India IT + China hardware + Europe software/semis
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'x2-mixed-v2026.1';
const g = mapRows(V);

const usEmsHealth = g([
  ['privia health','Privia Health Group','PRVA','NASDAQ','US','Healthcare','Physician Enablement Platform / USA',1500,2600,1700,true,0],
  ['ichor','Ichor Holdings','ICHR','NASDAQ','US','Technology','Semiconductor Fluid Delivery / USA',2500,820,820,true,0],
  ['ultra clean','Ultra Clean Holdings','UCTT','NASDAQ','US','Technology','Semiconductor Subsystems / USA',6000,1600,2000,true,0],
  ['veeco','Veeco Instruments','VECO','NASDAQ','US','Technology','Semiconductor Process Equipment / USA',1400,1600,720,true,0],
  ['sanmina','Sanmina Corporation','SANM','NASDAQ','US','Technology','Electronics Manufacturing Services / USA',35000,4200,7500,true,0],
  ['jabil','Jabil Inc','JBL','NYSE','US','Technology','Electronics Manufacturing Services / USA',140000,16500,28000,true,0],
  ['flex','Flex Ltd','FLEX','NASDAQ','SG','Technology','Electronics Manufacturing Services / Singapore',150000,16500,26000,true,0],
  ['celestica','Celestica Inc','CLS','NYSE','CA','Technology','Electronics & AI Hardware Manufacturing / Canada',28000,16500,9600,true,0],
  ['benchmark electronics','Benchmark Electronics','BHE','NYSE','US','Technology','Electronics Manufacturing Services / USA',11000,1600,2700,true,0],
  ['plexus','Plexus Corp','PLXS','NASDAQ','US','Technology','Electronics Manufacturing Services / USA',20000,4200,3900,true,0],
]);

const indiaIT2 = g([
  ['latentview','LatentView Analytics','LATENTVIEW','NSE','IN','Technology','Data Analytics & AI Services / India',1400,820,90,true,0],
  ['cigniti','Cigniti Technologies','CIGNITITEC','NSE','IN','Technology','Software Testing & QA / India',4000,520,220,true,0],
  ['tanla','Tanla Platforms Limited','TANLA','NSE','IN','Technology','CPaaS Messaging Platform / India',1500,820,500,true,0],
  ['affle','Affle India Limited','AFFLE','NSE','IN','Technology','Mobile Advertising AI / India',2000,3200,250,true,0],
  ['firstsource','Firstsource Solutions','FSL','NSE','IN','Technology','Business Process Services / India',28000,2600,900,true,0],
  ['sasken','Sasken Technologies','SASKEN','NSE','IN','Technology','Product Engineering Services / India',2500,210,60,true,0],
  ['kellton','Kellton Tech Solutions','KELLTONTEC','NSE','IN','Technology','Digital Transformation Services / India',2000,210,150,true,0],
  ['netweb','Netweb Technologies','NETWEB','NSE','IN','Technology','HPC & AI Server Systems / India',1000,3200,150,true,0],
  ['expleo','Expleo Solutions','EXPLEOSOL','NSE','IN','Technology','Engineering & QA Services / India',3000,520,150,true,0],
]);

const chinaHardware = g([
  ['lenovo','Lenovo Group Limited','0992','HKSE','CN','Technology','PCs, Servers & AI Devices / China',77000,16500,62000,true,0],
  ['xiaomi','Xiaomi Corporation','1810','HKSE','CN','Technology','Smartphones, IoT & EVs / China',43000,135000,52000,true,0],
  ['aac technologies','AAC Technologies Holdings','2018','HKSE','CN','Technology','Acoustic & Optical Components / China',30000,5200,3200,true,0],
  ['byd electronic','BYD Electronic International','0285','HKSE','CN','Technology','Electronics Manufacturing & Assembly / China',130000,8200,22000,true,0],
  ['zhongji innolight','Zhongji Innolight','300308','SZSE','CN','Technology','Optical Transceivers for AI / China',8000,28000,3600,true,0],
  ['eoptolink','Eoptolink Technology','300502','SZSE','CN','Technology','Optical Transceiver Modules / China',5000,18500,2200,true,0],
  ['luxshare','Luxshare Precision','002475','SZSE','CN','Technology','Connectors & Apple Assembly / China',200000,42000,35000,true,0],
  ['goertek','GoerTek Inc','002241','SZSE','CN','Technology','Acoustics & AR/VR Components / China',90000,12000,14000,true,0],
]);

const taiwanEurope = g([
  ['aspeed','ASPEED Technology','5274','TWSE','TW','Technology','Server Management Chips (BMC) / Taiwan',400,8200,250,true,0],
  ['elan microelectronics','Elan Microelectronics','2458','TWSE','TW','Technology','Touch & Fingerprint Controllers / Taiwan',1200,2600,520,true,0],
  ['alten','Alten SA','ATE','EPA','FR','Technology','Engineering & IT Consulting / France',57000,4200,4500,true,0],
  ['sii group','SII SA','SII','EPA','FR','Technology','IT & Engineering Services / France',16000,1050,1100,true,0],
  ['neurones','Neurones SA','NRO','EPA','FR','Technology','IT Consulting Services / France',7000,1300,750,true,0],
  ['wallix','WALLIX Group','ALLIX','EPA','FR','Technology','Cybersecurity & Access Management / France',300,210,52,true,0],
  ['lectra','Lectra SA','LSS','EPA','FR','Technology','Industrial Design & Cutting Software / France',2800,1300,580,true,0],
  ['ekinops','Ekinops SA','EKI','EPA','FR','Technology','Optical Networking Equipment / France',600,210,160,true,0],
  ['qt group','Qt Group Oyj','QTCOM','HEL','FI','Technology','Cross-Platform Software Dev Tools / Finland',900,3200,250,true,0],
  ['remedy entertainment','Remedy Entertainment','REMEDY','HEL','FI','Technology','Video Game Development / Finland',400,210,60,true,0],
  ['withsecure','WithSecure Oyj','WITH','HEL','FI','Technology','Enterprise Cybersecurity / Finland',1500,520,150,true,0],
  ['admicom','Admicom Oyj','ADMCM','HEL','FI','Technology','Construction ERP SaaS / Finland',300,210,40,true,0],
  ['also holding','ALSO Holding AG','ALSN','SIX','CH','Technology','IT Distribution & Cloud / Switzerland',4000,5200,14000,true,0],
  ['secunet','secunet Security Networks','YSN','XETRA','DE','Technology','High-Security IT & Encryption / Germany',1100,2100,420,true,0],
  ['pva tepla','PVA TePla AG','TPE','XETRA','DE','Technology','Semiconductor Metrology & Crystal Growth / Germany',1000,820,300,true,0],
  ['suss microtec','SUSS MicroTec SE','SMHN','XETRA','DE','Technology','Semiconductor Lithography Equipment / Germany',1500,2100,450,true,0],
  ['init se','init innovation in traffic','IXX','XETRA','DE','Technology','Public Transport IT Systems / Germany',1200,820,250,true,0],
]);

runWaves('X2', V, [
  ['US EMS & Semis & Health', usEmsHealth],
  ['India IT', indiaIT2],
  ['China Hardware', chinaHardware],
  ['Taiwan & Europe', taiwanEurope],
]);
