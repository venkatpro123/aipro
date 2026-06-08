// GIANTS Wave 16 — Japan transport/shipping/materials/retail/pharma (all confirmed-missing, real listed).
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'glob-gw16-v2026.1';
const g = mapRows(V);

const japanTransport = g([
  ['east japan railway','East Japan Railway Company','9020','TYO','JP','Industrials','Passenger Rail / Japan',75000,18000,18000],
  ['west japan railway','West Japan Railway Company','9021','TYO','JP','Industrials','Passenger Rail / Japan',47000,10000,10000],
  ['central japan railway','Central Japan Railway Company','9022','TYO','JP','Industrials','Shinkansen Rail / Japan',28000,25000,7000],
  ['tokyu corporation','Tokyu Corporation','9005','TYO','JP','Industrials','Railway & Real Estate / Japan',35000,8000,8000],
  ['hankyu hanshin','Hankyu Hanshin Holdings Inc','9042','TYO','JP','Industrials','Railway & Tourism / Japan',45000,8000,12000],
  ['odakyu electric','Odakyu Electric Railway Co Ltd','9007','TYO','JP','Industrials','Railway & Hotels / Japan',25000,5000,6000],
  ['tobu railway','Tobu Railway Co Ltd','9001','TYO','JP','Industrials','Railway & Retail / Japan',30000,6000,8000],
  ['nippon yusen','Nippon Yusen Kabushiki Kaisha','9101','TYO','JP','Industrials','Ocean Shipping / Japan',35000,15000,25000],
  ['mitsui osk lines','Mitsui O.S.K. Lines Ltd','9104','TYO','JP','Industrials','Ocean Shipping / Japan',32000,15000,20000],
  ['kawasaki kisen','Kawasaki Kisen Kaisha Ltd','9107','TYO','JP','Industrials','Container Shipping / Japan',9000,10000,12000],
  ['nippon express','Nippon Express Holdings Inc','9147','TYO','JP','Industrials','Logistics & Freight / Japan',73000,8000,22000],
]);

const japanMaterials = g([
  ['ihi corporation','IHI Corporation','7013','TYO','JP','Industrials','Aerospace & Machinery / Japan',32000,10000,13000],
  ['kawasaki heavy','Kawasaki Heavy Industries Ltd','7012','TYO','JP','Industrials','Aerospace & Marine / Japan',37000,12000,15000],
  ['mitsubishi materials','Mitsubishi Materials Corporation','5711','TYO','JP','Materials','Copper & Cement / Japan',32000,7000,12000],
  ['dowa holdings','DOWA Holdings Co Ltd','5714','TYO','JP','Materials','Mining & Metal Recycling / Japan',14000,6000,5000],
  ['asahi glass agc','AGC Inc','5201','TYO','JP','Materials','Glass & Chemicals / Japan',60000,12000,15000],
  ['nippon sheet glass','Nippon Sheet Glass Co Ltd','5202','TYO','JP','Materials','Glass Products / Japan',28000,5000,7000],
  ['daiwa house','Daiwa House Industry Co Ltd','1925','TYO','JP','Real Estate','Residential & Commercial Construction / Japan',62000,20000,18000],
  ['sumitomo realty','Sumitomo Realty & Development Co Ltd','8830','TYO','JP','Real Estate','Real Estate Development / Japan',30000,18000,5000],
]);

const japanRetailPharma = g([
  ['nitori furniture','Nitori Holdings Co Ltd','9843','TYO','JP','Consumer Discretionary','Furniture & Home Goods Retail / Japan',48000,18000,9000],
  ['lawson convenience','Lawson Inc','2651','TYO','JP','Consumer Staples','Convenience Store Chain / Japan',10000,12000,9000],
  ['familymart','FamilyMart Co Ltd','8028','TYO','JP','Consumer Staples','Convenience Store Chain / Japan',14000,10000,10000],
  ['rohto pharma','Rohto Pharmaceutical Co Ltd','4527','TYO','JP','Healthcare','OTC Pharmaceuticals / Japan',6000,6000,2000],
  ['eisai pharma','Eisai Co Ltd','4523','TYO','JP','Healthcare','Pharmaceuticals / Japan',10000,12000,5000],
  ['ono pharma','Ono Pharmaceutical Co Ltd','4528','TYO','JP','Healthcare','Specialty Pharmaceuticals / Japan',4500,25000,2500],
  ['shionogi pharma','Shionogi & Co Ltd','4507','TYO','JP','Healthcare','Pharmaceuticals / Japan',6000,12000,3000],
]);

runWaves('GIANTS GW16', V, [
  ['Japan Transport & Shipping', japanTransport],
  ['Japan Materials & Real Estate', japanMaterials],
  ['Japan Retail & Pharma', japanRetailPharma],
]);
