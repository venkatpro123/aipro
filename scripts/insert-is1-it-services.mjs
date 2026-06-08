// IT/Software Wave IS1 — Global IT Services & Consulting
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'is1-it-services-v2026.1';
const g = mapRows(V);

const itServices = g([
  ['accenture','Accenture plc','ACN','NYSE','IE','Technology','IT Consulting & Services / Ireland',775000,235000,67000,true,0],
  ['cognizant','Cognizant Technology Solutions Corp','CTSH','NASDAQ','US','Technology','IT Services & Outsourcing / USA',345000,38000,19800,true,0],
  ['capgemini','Capgemini SE','CAP','EPA','FR','Technology','IT Consulting & Services / France',340000,33000,24000,true,0],
  ['atos','Atos SE','ATO','EPA','FR','Technology','IT Services & Digital Transformation / France',82000,1600,9000,true,3000],
  ['globant','Globant SA','GLOB','NYSE','AR','Technology','Digital & AI Engineering Services / Argentina',29000,8200,2500,true,0],
  ['endava','Endava plc','DAVA','NYSE','GB','Technology','Digital Transformation Services / UK',12000,1600,820,true,0],
  ['genpact','Genpact Limited','G','NYSE','US','Technology','Business Process & AI Services / USA',125000,8200,4700,true,0],
  ['exlservice','ExlService Holdings Inc','EXLS','NASDAQ','US','Technology','Analytics & Digital Operations / USA',55000,8500,1850,true,0],
  ['unisys','Unisys Corporation','UIS','NYSE','US','Technology','IT Solutions & Services / USA',16000,520,2000,true,0],
]);

const itServicesGlobal = g([
  ['ntt data','NTT Data Group Corporation','9613','TYO','JP','Technology','IT Services & Consulting / Japan',195000,28000,30000,true,0],
  ['fujitsu','Fujitsu Limited','6702','TYO','JP','Technology','IT Services & Hardware / Japan',124000,32000,24000,true,0],
  ['tieto evry','Tietoevry Oyj','TIETO','HEL','FI','Technology','IT Services Nordic / Finland',24000,2100,3100,true,0],
  ['indra sistemas','Indra Sistemas SA','IDR','BME','ES','Technology','IT & Defence Systems / Spain',57000,5200,4900,true,0],
  ['bechtle','Bechtle AG','BC8','XETRA','DE','Technology','IT Systems Integration / Germany',15000,5200,6800,true,0],
  ['computacenter','Computacenter plc','CCC','LSE','GB','Technology','IT Infrastructure Services / UK',20000,3600,9500,true,0],
  ['softcat','Softcat plc','SCT','LSE','GB','Technology','IT Reseller & Services / UK',3000,3600,1600,true,0],
  ['kainos group','Kainos Group plc','KNOS','LSE','GB','Technology','Digital Services & Workday Consulting / UK',3000,1600,520,true,0],
]);

runWaves('IS1', V, [
  ['Global IT Services (Americas/EU)', itServices],
  ['Global IT Services (Japan/Nordic/EU)', itServicesGlobal],
]);
