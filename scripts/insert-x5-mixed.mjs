// Wave X5 — US adtech/genomics + India + Japan precision + Korea/Taiwan + EU
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'x5-mixed-v2026.1';
const g = mapRows(V);

const usSmallCap = g([
  ['xperi','Xperi Inc','XPER','NYSE','US','Technology','Media & Semiconductor IP / USA',2000,820,500,true,0],
  ['immersion','Immersion Corporation','IMMR','NASDAQ','US','Technology','Haptic Technology Licensing / USA',150,820,180,true,0],
  ['cardlytics','Cardlytics Inc','CDLX','NASDAQ','US','Technology','Purchase-Based Ad Intelligence / USA',800,210,310,true,0],
  ['marchex','Marchex Inc','MCHX','NASDAQ','US','Technology','Conversational Analytics AI / USA',300,52,200,true,0],
  ['grindr','Grindr Inc','GRND','NYSE','US','Technology','Social Networking Platform / USA',700,3200,370,true,0],
  ['fulgent','Fulgent Genetics','FLGT','NASDAQ','US','Healthcare','Genomic Testing & Diagnostics / USA',1000,620,300,true,0],
  ['careDx','CareDx Inc','CDNA','NASDAQ','US','Healthcare','Transplant Diagnostics / USA',1200,1300,340,true,0],
  ['castle biosciences','Castle Biosciences','CSTL','NASDAQ','US','Healthcare','Molecular Diagnostics / USA',900,820,330,true,0],
  ['neogenomics','NeoGenomics Inc','NEO','NASDAQ','US','Healthcare','Cancer Genetic Testing / USA',2200,1900,660,true,0],
  ['myriad genetics','Myriad Genetics','MYGN','NASDAQ','US','Healthcare','Molecular Diagnostics / USA',2700,1300,840,true,0],
]);

const india = g([
  ['inventurus','Inventurus Knowledge Solutions','IKS','NSE','IN','Healthcare','Healthcare RCM & Tech Services / India',13000,5200,290,true,0],
  ['indegene','Indegene Limited','INDGN','NSE','IN','Healthcare','Life Sciences Digital Services / India',5000,2600,330,true,0],
  ['emudhra','eMudhra Limited','EMUDHRA','NSE','IN','Technology','Digital Identity & Trust Services / India',1000,1300,120,true,0],
  ['sterlite tech','Sterlite Technologies','STLTECH','NSE','IN','Technology','Optical Fiber & Network Solutions / India',20000,820,650,true,0],
  ['hfcl','HFCL Limited','HFCL','NSE','IN','Technology','Telecom Equipment & Optical Fiber / India',7000,2100,550,true,0],
  ['optiemus','Optiemus Infracom','OPTIEMUS','NSE','IN','Technology','Electronics Manufacturing / India',3000,1300,200,true,0],
  ['moschip','MosChip Technologies','MOSCHIP','NSE','IN','Technology','Semiconductor & IoT Design / India',1500,1050,60,true,0],
]);

const japanPrecision = g([
  ['ushio','Ushio Inc','6925','TYO','JP','Technology','Light Sources & Photonics / Japan',5000,3200,1100,true,0],
  ['nippon ceramic','Nippon Ceramic','6929','TYO','JP','Technology','Sensors & Ceramic Components / Japan',2000,820,300,true,0],
  ['optex','Optex Group','6914','TYO','JP','Technology','Sensing & Detection Systems / Japan',2000,820,420,true,0],
  ['harmonic drive','Harmonic Drive Systems','6324','TYO','JP','Industrials','Precision Robot Gears / Japan',2500,3200,520,true,0],
  ['thk co','THK Co Ltd','6481','TYO','JP','Industrials','Linear Motion Guides / Japan',13000,5200,2200,true,0],
  ['smc corp','SMC Corporation','6273','TYO','JP','Industrials','Pneumatic Automation Components / Japan',23000,42000,5500,true,0],
  ['misumi','MISUMI Group','9962','TYO','JP','Industrials','Factory Automation Parts Distribution / Japan',14000,12000,8000,true,0],
  ['nabtesco','Nabtesco Corporation','6268','TYO','JP','Industrials','Precision Reduction Gears & Motion / Japan',8000,3200,2200,true,0],
  ['nitto denko','Nitto Denko Corp','6988','TYO','JP','Technology','Optical Films & Materials / Japan',28000,18500,6000,true,0],
]);

const koreaTaiwan = g([
  ['solbrain','Soulbrain Co','357780','KRX','KR','Technology','Semiconductor Process Materials / Korea',1500,3200,750,true,0],
  ['dongjin semichem','Dongjin Semichem','005290','KRX','KR','Technology','Semiconductor & Display Chemicals / Korea',2500,2100,1100,true,0],
  ['posco dx','POSCO DX','022100','KRX','KR','Technology','Industrial AI & Automation / Korea',3000,3200,1100,true,0],
  ['nhn corp','NHN Corporation','181710','KRX','KR','Technology','Gaming & Cloud Platform / Korea',5000,1300,1800,true,0],
  ['afreecatv','SOOP (AfreecaTV)','067160','KRX','KR','Technology','Live Streaming Platform / Korea',1000,2100,700,true,0],
  ['chroma ate','Chroma ATE','2360','TWSE','TW','Technology','Test & Measurement Instruments / Taiwan',3000,8200,1100,true,0],
  ['voltronic','Voltronic Power Technology','6409','TWSE','TW','Technology','Power Conversion & UPS / Taiwan',2000,8200,950,true,0],
  ['sinbon','Sinbon Electronics','3023','TWSE','TW','Technology','Cable & Connector Solutions / Taiwan',8000,3200,1100,true,0],
  ['lotes','Lotes Co','3533','TWSE','TW','Technology','Connectors & Sockets / Taiwan',12000,8200,1300,true,0],
  ['elite material','Elite Material Co','2383','TWSE','TW','Technology','Copper-Clad Laminates for PCBs / Taiwan',10000,12000,2600,true,0],
  ['wpg holdings','WPG Holdings','3702','TWSE','TW','Technology','Semiconductor Distribution / Taiwan',6000,5200,28000,true,0],
]);

const europe = g([
  ['fabasoft','Fabasoft AG','FAA','XETRA','AT','Technology','Document & Workflow Cloud / Austria',700,210,90,true,0],
  ['multitude','Multitude SE','FRU','XETRA','FI','Financial Technology','Digital Consumer & SME Lending / Finland',700,520,280,true,0],
  ['nexus ag','Nexus AG','NXU','XETRA','DE','Healthcare','Hospital Information Systems / Germany',2000,1600,260,true,0],
  ['adesso','adesso SE','ADN1','XETRA','DE','Technology','IT Services & Consulting / Germany',10000,1050,1200,true,0],
  ['gft technologies','GFT Technologies','GFT','XETRA','DE','Technology','Digital Banking IT Services / Germany',12000,820,950,true,0],
  ['datagroup','Datagroup SE','D6H','XETRA','DE','Technology','IT Services & Managed Services / Germany',3500,520,550,true,0],
]);

runWaves('X5', V, [
  ['US Small-Cap & Genomics', usSmallCap],
  ['India', india],
  ['Japan Precision', japanPrecision],
  ['Korea & Taiwan', koreaTaiwan],
  ['Europe', europe],
]);
