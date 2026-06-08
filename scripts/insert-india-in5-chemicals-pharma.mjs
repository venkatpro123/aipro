// India Wave IN5 — Specialty Chemicals + Pharma + Healthcare extras
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'india-in5-v2026.1';
const g = mapRows(V);

const chemicals = g([
  ['navin fluorine','Navin Fluorine International Limited','NAVINFLUOR','NSE','IN','Materials','Specialty Fluorochemicals / India',2200,3600,510,true,0],
  ['clean science technology','Clean Science and Technology Limited','CLEANSCIENCE','NSE','IN','Materials','Green Chemistry / India',800,2100,320,true,0],
  ['fine organic','Fine Organic Industries Limited','FINEORG','NSE','IN','Materials','Oleo Chemicals / India',700,2100,410,true,0],
  ['laxmi organic','Laxmi Organic Industries Limited','LXCHEM','NSE','IN','Materials','Specialty Organics / India',1200,720,420,true,0],
  ['camlin fine sciences','Camlin Fine Sciences Limited','CAMLINFINE','NSE','IN','Materials','Specialty Antioxidants / India',600,520,320,true,0],
  ['sudarshan chemical','Sudarshan Chemical Industries Limited','SUDARSCHEM','NSE','IN','Materials','Pigments & Dyes / India',2500,1600,520,true,0],
  ['indigo paints','Indigo Paints Limited','INDIGOPNTS','NSE','IN','Materials','Decorative Paints / India',1200,1600,420,true,0],
]);

const pharmaExtras = g([
  ['eris lifesciences','Eris Lifesciences Limited','ERIS','NSE','IN','Healthcare','Branded Pharma India / India',5000,2100,420,true,0],
  ['granules india','Granules India Limited','GRANULES','NSE','IN','Healthcare','API & Formulations / India',3500,1300,520,true,0],
  ['ajanta pharma','Ajanta Pharma Limited','AJANTPHARM','NSE','IN','Healthcare','Specialty Pharma / India',4000,3600,520,true,0],
  ['suven pharmaceuticals','Suven Pharmaceuticals Limited','SUVENPHAR','NSE','IN','Healthcare','CRAMS Pharma / India',700,1600,210,true,0],
  ['sequent scientific','Sequent Scientific Limited','SEQUENT','NSE','IN','Healthcare','Animal Health Pharma / India',3000,520,310,true,0],
  ['piramal pharma','Piramal Pharma Limited','PPLPHARMA','NSE','IN','Healthcare','CDMO & Pharma / India',8000,2600,650,true,0],
  ['jb chemicals','JB Chemicals & Pharmaceuticals Limited','JBCHEPHARM','NSE','IN','Healthcare','Branded Generic Pharma / India',4000,3100,420,true,0],
  ['strides pharma','Strides Pharma Science Limited','STAR','NSE','IN','Healthcare','Regulated Market Generics / India',7000,800,720,true,0],
  ['shilpa medicare','Shilpa Medicare Limited','SHILPAMED','NSE','IN','Healthcare','Oncology API / India',2000,620,320,true,0],
]);

const healthcareServices = g([
  ['global health','Global Health Limited (Medanta Hospitals)','MEDANTA','NSE','IN','Healthcare','Multi-Specialty Hospitals / India',10000,2600,650,true,0],
  ['max healthcare india','Max Healthcare Institute Limited','MAXHEALTH','NSE','IN','Healthcare','Private Hospitals / India',14000,10500,1000,true,0],
  ['rainbow childrens','Rainbow Children Medicare Limited','RAINBOW','NSE','IN','Healthcare','Paediatric Hospitals / India',8000,1600,400,true,0],
  ['thyrocare technologies','Thyrocare Technologies Limited','THYROCARE','NSE','IN','Healthcare','Diagnostic Labs / India',2000,720,160,true,0],
  ['krsnaa diagnostics','Krsnaa Diagnostics Limited','KRSNAA','NSE','IN','Healthcare','Diagnostic Services / India',3500,420,210,true,0],
  ['hester biosciences','Hester Biosciences Limited','HESTERBIO','NSE','IN','Healthcare','Animal & Poultry Vaccines / India',600,520,110,true,0],
]);

runWaves('INDIA IN5', V, [
  ['Specialty Chemicals', chemicals],
  ['Pharma extras', pharmaExtras],
  ['Healthcare Services', healthcareServices],
]);
