// Wave X7 — US 3D-printing/lidar + India aerospace/staffing + Japan imaging + EU + Poland/Turkey
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'x7-mixed-v2026.1';
const g = mapRows(V);

const usAdvanced = g([
  ['vericel','Vericel Corporation','VCEL','NASDAQ','US','Healthcare','Cell Therapy & Regenerative Medicine / USA',700,2600,250,true,0],
  ['airgain','Airgain Inc','AIRG','NASDAQ','US','Technology','Wireless Antenna Systems / USA',200,52,60,true,0],
  ['cepton','Cepton Inc','CPTN','NASDAQ','US','Technology','Automotive LiDAR / USA',300,210,30,true,0],
  ['aeva','Aeva Technologies','AEVA','NYSE','US','Technology','FMCW LiDAR Sensors / USA',400,1600,30,true,0],
  ['microvision','MicroVision Inc','MVIS','NASDAQ','US','Technology','LiDAR & MEMS Scanning / USA',400,520,12,true,0],
  ['3d systems','3D Systems Corp','DDD','NYSE','US','Technology','3D Printing Systems / USA',2000,520,440,true,0],
  ['stratasys','Stratasys Ltd','SSYS','NASDAQ','IL','Technology','3D Printing Systems / Israel',3000,820,580,true,0],
  ['proto labs','Protolabs Inc','PRLB','NYSE','US','Technology','Digital Manufacturing Services / USA',2500,1900,500,true,0],
  ['materialise','Materialise NV','MTLS','NASDAQ','BE','Technology','3D Printing Software & Services / Belgium',2400,520,290,true,0],
  ['nano dimension','Nano Dimension','NNDM','NASDAQ','IL','Technology','Additive Electronics Manufacturing / Israel',900,520,60,true,0],
]);

const indiaAeroStaffing = g([
  ['mtar','MTAR Technologies','MTARTECH','NSE','IN','Industrials','Precision Engineering for Aerospace & Nuclear / India',2500,1600,90,true,0],
  ['azad engineering','Azad Engineering','AZAD','NSE','IN','Industrials','Aerospace & Energy Components / India',1000,2600,55,true,0],
  ['unimech','Unimech Aerospace','UNIMECH','NSE','IN','Industrials','Aerospace Tooling & Precision Parts / India',500,820,30,true,0],
  ['genesys international','Genesys International','GENESYS','NSE','IN','Technology','Geospatial & Mapping AI / India',1500,1300,80,true,0],
  ['sis limited','SIS Limited','SIS','NSE','IN','Industrials','Security & Facility Tech Services / India',230000,820,1500,true,0],
]);

const japanImaging = g([
  ['konica minolta','Konica Minolta','4902','TYO','JP','Technology','Imaging & Digital Workplace / Japan',39000,2600,7000,true,0],
  ['brother industries','Brother Industries','6448','TYO','JP','Technology','Printers & Machinery / Japan',38000,8200,6000,true,0],
  ['casio','Casio Computer','6952','TYO','JP','Technology','Electronics & Timepieces / Japan',10000,3200,1900,true,0],
  ['anritsu','Anritsu Corporation','6754','TYO','JP','Technology','Test & Measurement Instruments / Japan',4000,3200,1000,true,0],
  ['oki electric','Oki Electric Industry','6703','TYO','JP','Technology','Info & Telecom Systems / Japan',14000,1300,3200,true,0],
  ['ricoh','Ricoh Company','7752','TYO','JP','Technology','Office Imaging & Digital Services / Japan',79000,8200,15000,true,0],
  ['seiko epson','Seiko Epson','6724','TYO','JP','Technology','Printers & Precision Tech / Japan',78000,12000,9000,true,0],
]);

const europe = g([
  ['carl zeiss','Carl Zeiss Meditec','AFX','XETRA','DE','Healthcare','Medical Optics & Devices / Germany',5500,12000,2400,true,0],
  ['stratec','Stratec SE','SBS','XETRA','DE','Healthcare','Diagnostic Lab Automation / Germany',1500,1050,280,true,0],
  ['cenit','CENIT AG','CSH','XETRA','DE','Technology','PLM & Digitalization Software / Germany',900,210,200,true,0],
  ['all for one','All for One Group','A1OS','XETRA','DE','Technology','SAP Consulting & IT Services / Germany',2800,520,580,true,0],
  ['kudelski','Kudelski SA','KUD','SIX','CH','Technology','Digital Security & Content Protection / Switzerland',3500,520,900,true,0],
  ['nordnet','Nordnet AB','SAVE','OMX','SE','Financial Technology','Digital Investment Platform / Sweden',900,8200,650,true,0],
  ['paradox interactive','Paradox Interactive','PDX','OMX','SE','Technology','Strategy Game Publishing / Sweden',700,2100,250,true,0],
  ['stillfront','Stillfront Group','SF','OMX','SE','Technology','Mobile Gaming / Sweden',1500,520,650,true,0],
  ['g5 entertainment','G5 Entertainment','G5EN','OMX','SE','Technology','Mobile Casual Gaming / Sweden',600,210,280,true,0],
  ['truecaller','Truecaller AB','TRUE-B','OMX','SE','Technology','Caller ID & Communication App / Sweden',400,2100,180,true,0],
]);

const easternEurope = g([
  ['allegro pl','Allegro.eu','ALE','WSE','PL','Technology','E-Commerce Marketplace / Poland',7000,12000,2800,true,0],
  ['ten square games','Ten Square Games','TEN','WSE','PL','Technology','Free-to-Play Mobile Games / Poland',500,210,140,true,0],
  ['huuuge','Huuuge Inc','HUG','WSE','PL','Technology','Social Casino Games / Poland',600,520,290,true,0],
  ['logo yazilim','Logo Yazilim','LOGO','BIST','TR','Technology','Business Management Software / Turkey',1200,820,180,true,0],
  ['aselsan','Aselsan','ASELS','BIST','TR','Industrials','Defense Electronics / Turkey',10000,18500,3600,true,0],
]);

runWaves('X7', V, [
  ['US Advanced Manufacturing & LiDAR', usAdvanced],
  ['India Aerospace & Staffing', indiaAeroStaffing],
  ['Japan Imaging', japanImaging],
  ['Europe', europe],
  ['Eastern Europe & Turkey', easternEurope],
]);
