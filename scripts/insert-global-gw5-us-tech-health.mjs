// GIANTS Wave 5 — US tech & healthcare large-caps not yet in DB. All >= $10B.
// Drug distributors McKesson/Cencora deliberately excluded (RPE ~$6.5M > $5M non-cap ceiling — genuine model outliers).
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'glob-gw5-v2026.1';
const g = mapRows(V);

const usTech = g([
  ['arista networks','Arista Networks Inc','ANET','NYSE','US','Technology','Cloud Networking / USA',4000,120000,7000],
  ['fortinet security','Fortinet Inc','FTNT','NASDAQ','US','Technology','Network Security / USA',14000,75000,6000],
  ['datadog observability','Datadog Inc','DDOG','NASDAQ','US','Technology','Cloud Observability / USA',7000,45000,2700],
  ['fiserv fintech','Fiserv Inc','FI','NYSE','US','Technology','Payments & FinTech / USA',40000,90000,20000],
  ['fis fintech','Fidelity National Information Services','FIS','NYSE','US','Technology','Banking & Payments Tech / USA',50000,45000,10000],
  ['global payments','Global Payments Inc','GPN','NYSE','US','Technology','Payment Processing / USA',27000,25000,10000],
  ['paychex payroll','Paychex Inc','PAYX','NASDAQ','US','Technology','Payroll & HR Services / USA',16000,50000,5500],
  ['verisk analytics','Verisk Analytics Inc','VRSK','NASDAQ','US','Technology','Insurance Data Analytics / USA',7000,40000,3000],
  ['motorola solutions','Motorola Solutions Inc','MSI','NYSE','US','Technology','Public Safety Communications / USA',21000,75000,11000],
  ['corning glass','Corning Incorporated','GLW','NYSE','US','Technology','Specialty Glass & Optics / USA',55000,40000,14000],
  ['te connectivity','TE Connectivity plc','TEL','NYSE','US','Technology','Connectors & Sensors / USA',85000,45000,16000],
  ['amphenol connectors','Amphenol Corporation','APH','NYSE','US','Technology','Electronic Connectors / USA',90000,90000,15000],
  ['seagate storage','Seagate Technology Holdings plc','STX','NASDAQ','US','Technology','Data Storage HDD / USA',30000,25000,8000],
  ['western digital','Western Digital Corporation','WDC','NASDAQ','US','Technology','Data Storage / USA',50000,25000,14000],
  ['hp inc','HP Inc','HPQ','NYSE','US','Technology','PCs & Printers / USA',58000,30000,54000],
  ['hp enterprise','Hewlett Packard Enterprise Company','HPE','NYSE','US','Technology','Enterprise IT Infrastructure / USA',60000,25000,30000],
  ['dell technologies','Dell Technologies Inc','DELL','NYSE','US','Technology','PCs & Servers / USA',120000,90000,95000],
  ['netapp storage','NetApp Inc','NTAP','NASDAQ','US','Technology','Data Storage & Cloud / USA',12000,25000,6500],
  ['cognizant it','Cognizant Technology Solutions Corp','CTSH','NASDAQ','US','Technology','IT Services / USA',340000,40000,20000],
  ['roper technologies','Roper Technologies Inc','ROP','NASDAQ','US','Technology','Vertical Software & Products / USA',24000,65000,8800],
  ['take two games','Take-Two Interactive Software Inc','TTWO','NASDAQ','US','Technology','Video Games / USA',12000,30000,6000],
  ['electronic arts','Electronic Arts Inc','EA','NASDAQ','US','Technology','Video Games / USA',13000,40000,7500],
  ['garmin navigation','Garmin Ltd','GRMN','NYSE','US','Technology','GPS & Wearables / USA',20000,40000,6000],
  ['akamai cdn','Akamai Technologies Inc','AKAM','NASDAQ','US','Technology','Content Delivery & Security / USA',10000,15000,4000],
  ['verisign domains','VeriSign Inc','VRSN','NASDAQ','US','Technology','Domain Registry / USA',1000,20000,1500],
  ['gen digital security','Gen Digital Inc','GEN','NASDAQ','US','Technology','Consumer Cybersecurity / USA',3000,18000,4000],
  ['ansys simulation','ANSYS Inc','ANSS','NASDAQ','US','Technology','Engineering Simulation Software / USA',6500,30000,2500],
]);

const usHealth = g([
  ['hca healthcare','HCA Healthcare Inc','HCA','NYSE','US','Healthcare','Hospital Operator / USA',290000,90000,70000],
  ['cigna health','The Cigna Group','CI','NYSE','US','Healthcare','Health Insurance & PBM / USA',70000,90000,240000],
  ['elevance health','Elevance Health Inc','ELV','NYSE','US','Healthcare','Health Insurance / USA',100000,100000,175000],
  ['humana health','Humana Inc','HUM','NYSE','US','Healthcare','Health Insurance Medicare / USA',65000,35000,115000],
  ['centene health','Centene Corporation','CNC','NYSE','US','Healthcare','Managed Care Medicaid / USA',70000,30000,160000],
  ['cvs health','CVS Health Corporation','CVS','NYSE','US','Healthcare','Pharmacy & Health Insurance / USA',300000,80000,370000],
  ['cardinal health','Cardinal Health Inc','CAH','NYSE','US','Healthcare','Pharmaceutical Distribution / USA',48000,30000,220000],
  ['becton dickinson','Becton Dickinson and Company','BDX','NYSE','US','Healthcare','Medical Devices / USA',75000,65000,20000],
  ['edwards lifesciences','Edwards Lifesciences Corporation','EW','NYSE','US','Healthcare','Heart Valve Devices / USA',19000,45000,6000],
  ['iqvia research','IQVIA Holdings Inc','IQV','NYSE','US','Healthcare','Clinical Research & Data / USA',88000,40000,15000],
  ['zoetis animal health','Zoetis Inc','ZTS','NYSE','US','Healthcare','Animal Health / USA',14000,75000,9000],
  ['idexx vet','IDEXX Laboratories Inc','IDXX','NASDAQ','US','Healthcare','Veterinary Diagnostics / USA',11000,40000,4000],
  ['regeneron pharma','Regeneron Pharmaceuticals Inc','REGN','NASDAQ','US','Healthcare','Biopharmaceuticals / USA',12000,100000,14000],
  ['vertex pharma','Vertex Pharmaceuticals Inc','VRTX','NASDAQ','US','Healthcare','Cystic Fibrosis Drugs / USA',5500,120000,11000],
  ['moderna biotech','Moderna Inc','MRNA','NASDAQ','US','Healthcare','mRNA Vaccines / USA',5000,15000,3000,true,500],
  ['baxter medical','Baxter International Inc','BAX','NYSE','US','Healthcare','Medical Products / USA',60000,18000,15000,true,1000],
]);

runWaves('GIANTS GW5', V, [
  ['US Tech Large-Caps', usTech],
  ['US Healthcare Large-Caps', usHealth],
]);
