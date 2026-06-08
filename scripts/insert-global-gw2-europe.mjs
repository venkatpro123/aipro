// GIANTS Wave 2 — European national champions (banks, insurers, energy, defense, autos, retail). All >= $10B.
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'glob-gw2-v2026.1';
const g = mapRows(V);

const euFinancials = g([
  ['banco santander','Banco Santander SA','SAN','BME','ES','Financials','Commercial Banking / Spain',210000,70000,60000],
  ['intesa sanpaolo','Intesa Sanpaolo SpA','ISP','MIL','IT','Financials','Commercial Banking / Italy',95000,60000,30000],
  ['credit agricole','Crédit Agricole SA','ACA','EPA','FR','Financials','Commercial Banking / France',75000,45000,40000],
  ['societe generale','Société Générale SA','GLE','EPA','FR','Financials','Commercial Banking / France',120000,25000,28000],
  ['lloyds banking','Lloyds Banking Group plc','LLOY','LSE','GB','Financials','Retail Banking / UK',60000,45000,25000],
  ['barclays bank','Barclays PLC','BARC','LSE','GB','Financials','Universal Banking / UK',90000,45000,30000],
  ['natwest group','NatWest Group plc','NWG','LSE','GB','Financials','Commercial Banking / UK',60000,40000,18000],
  ['standard chartered','Standard Chartered PLC','STAN','LSE','GB','Financials','International Banking / UK',85000,30000,18000],
  ['ubs group','UBS Group AG','UBSG','SIX','CH','Financials','Wealth Management & Banking / Switzerland',110000,90000,45000,true,3000],
  ['nordea bank','Nordea Bank Abp','NDA','HEL','FI','Financials','Commercial Banking / Finland',30000,45000,12000],
  ['munich re','Münchener Rückversicherungs AG','MUV2','XETRA','DE','Financials','Reinsurance / Germany',43000,70000,70000],
  ['swiss re','Swiss Re AG','SREN','SIX','CH','Financials','Reinsurance / Switzerland',14000,35000,45000],
  ['aviva insurance','Aviva plc','AV','LSE','GB','Financials','Insurance & Pensions / UK',23000,15000,40000],
  ['legal general','Legal & General Group plc','LGEN','LSE','GB','Financials','Insurance & Asset Mgmt / UK',10000,18000,30000],
  ['prudential plc','Prudential plc','PRU','LSE','GB','Financials','Life Insurance Asia / UK',18000,25000,25000],
  ['generali insurance','Assicurazioni Generali SpA','G','MIL','IT','Financials','Insurance / Italy',82000,45000,90000],
]);

const euEnergyMaterials = g([
  ['eni energy','Eni SpA','ENI','MIL','IT','Energy','Integrated Oil & Gas / Italy',32000,55000,100000],
  ['repsol energy','Repsol SA','REP','BME','ES','Energy','Integrated Oil & Gas / Spain',24000,18000,60000],
  ['equinor energy','Equinor ASA','EQNR','OSL','NO','Energy','Integrated Oil & Gas / Norway',23000,75000,100000],
  ['engie utility','ENGIE SA','ENGI','EPA','FR','Utilities','Multi-Energy Utility / France',97000,45000,90000],
  ['eon utility','E.ON SE','EOAN','XETRA','DE','Utilities','Electric & Gas Utility / Germany',72000,35000,95000],
  ['rwe utility','RWE AG','RWE','XETRA','DE','Utilities','Power Generation / Germany',20000,25000,30000],
  ['fortum utility','Fortum Oyj','FORTUM','HEL','FI','Utilities','Power Generation / Finland',5000,15000,8000],
  ['basf chemicals','BASF SE','BAS','XETRA','DE','Materials','Diversified Chemicals / Germany',110000,45000,70000,true,2000],
  ['air liquide','L\'Air Liquide SA','AI','EPA','FR','Materials','Industrial Gases / France',67000,100000,30000],
  ['holcim cement','Holcim Ltd','HOLN','SIX','CH','Materials','Cement & Building Materials / Switzerland',63000,55000,28000],
  ['arcelormittal steel','ArcelorMittal SA','MT','AMS','LU','Materials','Steel Manufacturing / Luxembourg',126000,25000,65000],
  ['antofagasta copper','Antofagasta plc','ANTO','LSE','GB','Materials','Copper Mining / UK',6000,20000,6000],
  ['aurubis copper','Aurubis AG','AURUBIS','XETRA','DE','Materials','Copper Smelting & Recycling / Germany',7000,5000,18000],
  ['k+s potash','K+S Aktiengesellschaft','SDF','XETRA','DE','Materials','Potash & Salt / Germany',11000,3000,5000],
]);

const euIndustrialsConsumer = g([
  ['thales defense','Thales SA','HO','EPA','FR','Industrials','Defense & Aerospace / France',80000,35000,22000],
  ['bae systems','BAE Systems plc','BA','LSE','GB','Industrials','Defense & Aerospace / UK',100000,55000,35000],
  ['rheinmetall defense','Rheinmetall AG','RHM','XETRA','DE','Industrials','Defense & Automotive / Germany',30000,60000,12000],
  ['volvo trucks','AB Volvo','VOLV-B','OMX','SE','Industrials','Commercial Trucks / Sweden',100000,60000,55000],
  ['daimler truck','Daimler Truck Holding AG','DTG','XETRA','DE','Industrials','Commercial Trucks / Germany',100000,30000,60000],
  ['traton trucks','TRATON SE','8TRA','XETRA','DE','Industrials','Commercial Trucks / Germany',100000,15000,50000],
  ['michelin tires','Compagnie Générale des Établissements Michelin','ML','EPA','FR','Consumer Discretionary','Tires / France',130000,25000,30000],
  ['continental auto','Continental AG','CON','XETRA','DE','Consumer Discretionary','Automotive Parts & Tires / Germany',200000,15000,45000,true,5000],
  ['adidas sportswear','adidas AG','ADS','XETRA','DE','Consumer Discretionary','Sportswear / Germany',60000,40000,25000],
  ['carrefour retail','Carrefour SA','CA','EPA','FR','Consumer Staples','Grocery Retail / France',310000,12000,90000],
  ['tesco retail','Tesco PLC','TSCO','LSE','GB','Consumer Staples','Grocery Retail / UK',330000,25000,85000],
  ['telia telecom','Telia Company AB','TELIA','OMX','SE','Communications','Telecom / Sweden',17000,12000,9000],
  ['telenor telecom','Telenor ASA','TEL','OSL','NO','Communications','Telecom / Norway',12000,15000,12000],
  ['richemont luxury','Compagnie Financière Richemont SA','CFR','SIX','CH','Consumer Discretionary','Luxury Goods Cartier / Switzerland',38000,90000,22000],
  ['pirelli tires','Pirelli & C SpA','PIRC','MIL','IT','Consumer Discretionary','Premium Tires / Italy',31000,7000,7000],
  ['cnh industrial','CNH Industrial NV','CNHI','MIL','GB','Industrials','Agricultural & Construction Equip / UK',40000,15000,24000],
  ['man energy','MAN Energy Solutions SE','MAN','XETRA','DE','Industrials','Marine & Power Engines / Germany',15000,5000,4000],
  ['ssab steel','SSAB AB','SSAB-A','OMX','SE','Materials','Steel Manufacturing / Sweden',14000,8000,11000],
  ['outokumpu steel','Outokumpu Oyj','OUT1V','HEL','FI','Materials','Stainless Steel / Finland',9000,3000,8000],
  ['valmet machinery','Valmet Oyj','VALMT','HEL','FI','Industrials','Pulp & Paper Machinery / Finland',19000,5000,6000],
]);

runWaves('GIANTS GW2', V, [
  ['EU Financials', euFinancials],
  ['EU Energy & Materials', euEnergyMaterials],
  ['EU Industrials & Consumer', euIndustrialsConsumer],
]);
