// Wave X1 — US SaaS/HealthTech + India IT + China/Japan/Korea/EU automation & semis
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'x1-mixed-v2026.1';
const g = mapRows(V);

const usSaasHealth = g([
  ['ebix','Ebix Inc','EBIX','NASDAQ','US','Financial Technology','Insurance & Financial Software / USA',9000,520,1000,true,0],
  ['digital turbine','Digital Turbine Inc','APPS','NASDAQ','US','Technology','Mobile App Delivery & AdTech / USA',900,520,520,true,0],
  ['exponent','Exponent Inc','EXPO','NASDAQ','US','Technology','Engineering & Scientific Consulting / USA',1100,5200,520,true,0],
  ['csg systems','CSG Systems International','CSGS','NASDAQ','US','Technology','Revenue Management Software / USA',6000,2100,1200,true,0],
  ['verra mobility','Verra Mobility Corp','VRRM','NASDAQ','US','Technology','Smart Mobility & Tolling Tech / USA',1500,4200,880,true,0],
  ['mitek systems','Mitek Systems Inc','MITK','NASDAQ','US','Technology','Mobile Identity & Check Capture AI / USA',600,520,190,true,0],
  ['cerence','Cerence Inc','CRNC','NASDAQ','US','Technology','Automotive Conversational AI / USA',1200,520,330,true,0],
  ['progyny','Progyny Inc','PGNY','NASDAQ','US','Healthcare','Fertility Benefits Platform / USA',800,2100,1150,true,0],
  ['ziprecruiter','ZipRecruiter Inc','ZIP','NYSE','US','Technology','AI Job Marketplace / USA',1500,820,470,true,0],
  ['upwork','Upwork Inc','UPWK','NASDAQ','US','Technology','Freelance Work Marketplace / USA',1000,2100,770,true,0],
  ['life360','Life360 Inc','LIF','NASDAQ','US','Technology','Family Location & Safety App / USA',600,3200,370,true,0],
  ['veradigm','Veradigm Inc','MDRX','NASDAQ','US','Healthcare','Healthcare Data & EHR Software / USA',3000,1300,610,true,0],
  ['omnicell','Omnicell Inc','OMCL','NASDAQ','US','Healthcare','Medication Management Automation / USA',3000,1900,1100,true,0],
  ['american well','American Well Corp (Amwell)','AMWL','NYSE','US','Healthcare','Telehealth Platform / USA',900,210,250,true,0],
  ['talkspace','Talkspace Inc','TALK','NASDAQ','US','Healthcare','Online Behavioral Health / USA',500,520,190,true,0],
]);

const indiaIT = g([
  ['coforge','Coforge Limited','COFORGE','NSE','IN','Technology','Digital IT Services / India',32000,8200,1500,true,0],
  ['rategain','RateGain Travel Technologies','RATEGAIN','NSE','IN','Technology','Travel & Hospitality SaaS / India',1700,1600,140,true,0],
  ['nazara','Nazara Technologies Limited','NAZARA','NSE','IN','Technology','Mobile Gaming & Esports / India',1500,1600,170,true,0],
  ['intellect design','Intellect Design Arena Limited','INTELLECT','NSE','IN','Financial Technology','Banking & Insurance Software / India',5500,1600,290,true,0],
  ['birlasoft','Birlasoft Limited','BSOFT','NSE','IN','Technology','Enterprise Digital Services / India',12000,1600,650,true,0],
  ['zensar','Zensar Technologies Limited','ZENSARTECH','NSE','IN','Technology','Digital Engineering Services / India',10000,2100,580,true,0],
  ['eclerx','eClerx Services Limited','ECLERX','NSE','IN','Technology','Data Analytics & Operations / India',17000,2100,420,true,0],
  ['indiamart','IndiaMART InterMESH Limited','INDIAMART','NSE','IN','Technology','B2B E-Commerce Marketplace / India',5500,5200,170,true,0],
  ['info edge','Info Edge India Limited (Naukri)','NAUKRI','NSE','IN','Technology','Online Recruitment & Classifieds / India',6000,12000,330,true,0],
  ['onward technologies','Onward Technologies Limited','ONWARDTEC','NSE','IN','Technology','Engineering R&D Services / India',3000,320,60,true,0],
  ['zaggle','Zaggle Prepaid Ocean Services','ZAGGLE','NSE','IN','Financial Technology','Spend Management Fintech / India',600,520,150,true,0],
]);

const chinaTech = g([
  ['inspur','Inspur Electronic Information Industry','000977','SZSE','CN','Technology','AI Servers & Cloud Hardware / China',30000,12000,16000,true,0],
  ['unigroup guoxin','Unigroup Guoxin Microelectronics','002049','SZSE','CN','Technology','Integrated Circuit Chips / China',3000,8200,1100,true,0],
  ['montage technology','Montage Technology Co Ltd','688008','SHSE','CN','Technology','Memory Interface Chips / China',1000,11000,500,true,0],
  ['maxscend','Maxscend Microelectronics','300782','SZSE','CN','Technology','RF Front-End Chips / China',2000,8200,650,true,0],
  ['amlogic','Amlogic (Shanghai) Co','688099','SHSE','CN','Technology','Multimedia SoC Chips / China',2000,5200,1100,true,0],
  ['sg micro','SG Micro Corp','300661','SZSE','CN','Technology','Analog Integrated Circuits / China',1500,8200,500,true,0],
  ['rockchip','Rockchip Electronics','603893','SHSE','CN','Technology','AIoT Application Processors / China',1500,11000,500,true,0],
  ['kingsoft office','Beijing Kingsoft Office Software','688111','SHSE','CN','Technology','Office Productivity Software (WPS) / China',4000,18500,2000,true,0],
  ['yonyou','Yonyou Network Technology','600588','SHSE','CN','Technology','Enterprise Management Software / China',23000,8200,1300,true,0],
  ['shennan circuits','Shennan Circuits Co','002916','SZSE','CN','Technology','High-End PCB Manufacturing / China',12000,8200,2200,true,0],
  ['estun automation','Estun Automation Co','002747','SZSE','CN','Industrials','Industrial Robots & Motion Control / China',5000,5200,650,true,0],
  ['inovance','Shenzhen Inovance Technology','300124','SZSE','CN','Industrials','Industrial Automation & Drives / China',20000,42000,5200,true,0],
  ['siasun robot','SIASUN Robot & Automation','300024','SZSE','CN','Industrials','Industrial & Service Robots / China',4000,3200,500,true,0],
]);

const japanKorea = g([
  ['fujifilm','Fujifilm Holdings Corp','4901','TYO','JP','Technology','Imaging, Materials & Healthcare Tech / Japan',75000,42000,20000,true,0],
  ['omron','OMRON Corporation','6645','TYO','JP','Industrials','Factory Automation & Sensing / Japan',29000,12000,5500,true,0],
  ['azbil','Azbil Corporation','6845','TYO','JP','Industrials','Building & Industrial Automation / Japan',10000,5200,2000,true,0],
  ['yokogawa','Yokogawa Electric Corp','6841','TYO','JP','Industrials','Industrial Process Automation / Japan',18000,8200,3600,true,0],
  ['kokusai electric','Kokusai Electric Corp','6525','TYO','JP','Technology','Semiconductor Deposition Equipment / Japan',4000,12000,1600,true,0],
  ['ulvac','ULVAC Inc','6728','TYO','JP','Technology','Vacuum & Semiconductor Equipment / Japan',6500,5200,2200,true,0],
  ['tokyo seimitsu','Tokyo Seimitsu Co','7729','TYO','JP','Technology','Semiconductor & Metrology Equipment / Japan',5000,8200,2100,true,0],
  ['rorze','Rorze Corporation','6323','TYO','JP','Technology','Semiconductor Wafer Robotics / Japan',3000,5200,820,true,0],
  ['samsung electro','Samsung Electro-Mechanics','009150','KRX','KR','Technology','MLCC & Electronic Components / Korea',24000,8200,7000,true,0],
  ['hanwha systems','Hanwha Systems Co','272210','KRX','KR','Industrials','Defense Electronics & Systems / Korea',5000,5200,1900,true,0],
  ['kakaopay','Kakao Pay Corp','377300','KRX','KR','Financial Technology','Digital Payments / Korea',1000,5200,520,true,0],
]);

const europeAutomation = g([
  ['interroll','Interroll Holding AG','INRN','SIX','CH','Industrials','Material Handling Systems / Switzerland',2500,3200,650,true,0],
  ['inficon','INFICON Holding AG','IFCN','SIX','CH','Technology','Semiconductor Vacuum Instruments / Switzerland',2000,4200,650,true,0],
  ['bossard','Bossard Holding AG','BOSN','SIX','CH','Industrials','Fastening Technology & Logistics / Switzerland',3000,1600,1100,true,0],
  ['datalogic','Datalogic SpA','DAL','BIT','IT','Technology','Barcode & Machine Vision / Italy',3000,820,650,true,0],
  ['technogym','Technogym SpA','TGYM','BIT','IT','Technology','Connected Fitness Equipment / Italy',2500,2600,820,true,0],
  ['kongsberg','Kongsberg Gruppen ASA','KOG','OSLO','NO','Industrials','Defense & Maritime Technology / Norway',13000,22000,4500,true,0],
  ['tomra','TOMRA Systems ASA','TOM','OSLO','NO','Industrials','Recycling & Sensor-Based Sorting / Norway',5000,5200,1500,true,0],
  ['addtech','Addtech AB','ADDT-B','OMX','SE','Industrials','Industrial Technology Components / Sweden',4500,8200,2000,true,0],
  ['indutrade','Indutrade AB','INDT','OMX','SE','Industrials','Industrial Components & Tech / Sweden',8000,8200,3200,true,0],
  ['beijer ref','Beijer Ref AB','BEIJ-B','OMX','SE','Industrials','Refrigeration & HVAC Tech / Sweden',5500,8200,2800,true,0],
  ['nibe','NIBE Industrier AB','NIBE-B','OMX','SE','Industrials','Climate & Heat Pump Technology / Sweden',21000,12000,4200,true,0],
]);

runWaves('X1', V, [
  ['US SaaS & HealthTech', usSaasHealth],
  ['India IT', indiaIT],
  ['China Tech & Automation', chinaTech],
  ['Japan & Korea', japanKorea],
  ['Europe Automation', europeAutomation],
]);
