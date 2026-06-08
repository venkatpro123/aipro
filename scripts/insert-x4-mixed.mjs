// Wave X4 — US genomics-tech + Canada + Australia + China A-share semis + EU
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'x4-mixed-v2026.1';
const g = mapRows(V);

const usLifeSciTech = g([
  ['illumina','Illumina Inc','ILMN','NASDAQ','US','Healthcare','DNA Sequencing Systems / USA',10000,16500,4400,true,0],
  ['adaptive biotech','Adaptive Biotechnologies','ADPT','NASDAQ','US','Healthcare','Immune-Driven Genomics / USA',900,820,180,true,0],
  ['quantum-si','Quantum-Si Inc','QSI','NASDAQ','US','Healthcare','Protein Sequencing Tech / USA',300,320,8,true,0],
  ['nano-x','Nano-X Imaging','NNOX','NASDAQ','IL','Healthcare','Digital X-Ray & AI Imaging / Israel',400,520,12,true,0],
  ['inari medical','Inari Medical','NARI','NASDAQ','US','Healthcare','Vascular Thrombectomy Devices / USA',1700,3200,600,true,0],
  ['pros holdings','PROS Holdings','PRO','NYSE','US','Technology','AI Pricing & Revenue Optimization / USA',1500,1600,330,true,0],
]);

const canada = g([
  ['kinaxis','Kinaxis Inc','KXS','TSX','CA','Technology','Supply Chain Planning SaaS / Canada',1800,4200,500,true,0],
  ['dye durham','Dye & Durham','DND','TSX','CA','Technology','Legal & Business Cloud Software / Canada',1100,520,340,true,0],
  ['coveo','Coveo Solutions','CVO','TSX','CA','Technology','AI Search & Recommendations / Canada',800,520,150,true,0],
  ['enghouse','Enghouse Systems','ENGH','TSX','CA','Technology','Enterprise Communications Software / Canada',2000,1600,360,true,0],
  ['blackberry','BlackBerry Limited','BB','NYSE','CA','Technology','IoT & Cybersecurity Software / Canada',3000,2600,580,true,0],
  ['payfare','Payfare Inc','PAY','TSX','CA','Financial Technology','Gig Worker Banking / Canada',300,320,180,true,0],
]);

const australia = g([
  ['wisetech','WiseTech Global','WTC','ASX','AU','Technology','Logistics Software (CargoWise) / Australia',3500,42000,800,true,0],
  ['xero','Xero Limited','XRO','ASX','AU','Technology','Cloud Accounting SaaS / Australia',5000,22000,1300,true,0],
  ['technology one','TechnologyOne','TNE','ASX','AU','Technology','Enterprise SaaS / Australia',1500,5200,350,true,0],
  ['nextdc','NEXTDC Limited','NXT','ASX','AU','Technology','Data Centers / Australia',600,8200,300,true,0],
  ['megaport','Megaport Limited','MP1','ASX','AU','Technology','Network-as-a-Service / Australia',400,1600,150,true,0],
  ['appen','Appen Limited','APX','ASX','AU','Technology','AI Training Data Services / Australia',2000,210,250,true,0],
  ['dicker data','Dicker Data','DDR','ASX','AU','Technology','IT Distribution / Australia',900,1300,2000,true,0],
]);

const chinaSemis = g([
  ['hygon','Hygon Information Technology','688041','SHSE','CN','Technology','x86 CPUs & AI Accelerators / China',2500,42000,1400,true,0],
  ['loongson','Loongson Technology','688047','SHSE','CN','Technology','Domestic CPU Chips / China',1500,8200,150,true,0],
  ['empyrean','Empyrean Technology','301269','SZSE','CN','Technology','EDA Software / China',1200,8200,150,true,0],
  ['piotech','Piotech Inc','688072','SHSE','CN','Technology','Semiconductor Deposition Equipment / China',1500,8200,520,true,0],
  ['hwatsing','Hwatsing Technology','688120','SHSE','CN','Technology','CMP Polishing Equipment / China',1200,5200,500,true,0],
  ['jcet','JCET Group','600584','SHSE','CN','Technology','Semiconductor Packaging & Test / China',23000,12000,5000,true,0],
  ['tongfu micro','Tongfu Microelectronics','002156','SZSE','CN','Technology','Semiconductor Assembly & Test / China',18000,5200,3200,true,0],
  ['ingenic','Ingenic Semiconductor','300223','SZSE','CN','Technology','AIoT & Automotive Chips / China',1500,5200,750,true,0],
  ['china greatwall','China Greatwall Technology','000066','SZSE','CN','Technology','Domestic Computing & Servers / China',16000,5200,2200,true,0],
  ['dawning info','Dawning Information (Sugon)','603019','SHSE','CN','Technology','HPC & AI Servers / China',8000,12000,2000,true,0],
  ['hand enterprise','Hand Enterprise Solutions','300170','SZSE','CN','Technology','Enterprise IT Services / China',12000,1600,750,true,0],
]);

const europeNordic = g([
  ['vitec software','Vitec Software Group','VIT-B','OMX','SE','Technology','Vertical Market Software / Sweden',1200,2100,300,true,0],
  ['enea','Enea AB','ENEA','OMX','SE','Technology','Telecom & Cybersecurity Software / Sweden',600,320,120,true,0],
  ['mips ab','MIPS AB','MIPS','OMX','SE','Technology','Helmet Safety Technology / Sweden',200,2100,90,true,0],
  ['biotage','Biotage AB','BIOT','OMX','SE','Healthcare','Life Science Lab Tools / Sweden',700,2100,200,true,0],
  ['atea','Atea ASA','ATEA','OSLO','NO','Technology','IT Infrastructure Services Nordic / Norway',7800,1600,4200,true,0],
  ['bouvet','Bouvet ASA','BOUVET','OSLO','NO','Technology','IT & Digital Consulting / Norway',2000,820,350,true,0],
  ['kitron','Kitron ASA','KIT','OSLO','NO','Technology','Electronics Manufacturing Services / Norway',2500,1300,700,true,0],
  ['paramount comm','Paramount Communications','PARACABLES','NSE','IN','Technology','Telecom & Power Cables / India',2500,520,300,true,0],
]);

runWaves('X4', V, [
  ['US Life-Science Tech', usLifeSciTech],
  ['Canada Tech', canada],
  ['Australia Tech', australia],
  ['China Semiconductors', chinaSemis],
  ['Europe Nordic & India', europeNordic],
]);
