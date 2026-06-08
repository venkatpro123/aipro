// IT/Software Wave IS2 — Enterprise Software & EDA & Design
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'is2-enterprise-sw-v2026.1';
const g = mapRows(V);

const enterpriseSoftware = g([
  ['oracle','Oracle Corporation','ORCL','NYSE','US','Technology','Database & Enterprise Cloud Software / USA',160000,520000,57000,true,0],
  ['microsoft software','Microsoft Corporation','MSFT','NASDAQ','US','Technology','Software, Cloud & AI / USA',228000,3200000,270000,true,0],
  ['intuit','Intuit Inc','INTU','NASDAQ','US','Technology','Financial & Accounting Software / USA',18000,182000,17000,true,0],
  ['vmware','VMware LLC (Broadcom)','VMW','NYSE','US','Technology','Virtualization & Cloud Infrastructure / USA',38000,62000,13500,true,0],
  ['citrix systems','Citrix Systems (Cloud Software Group)','CTXS','NASDAQ','US','Technology','Virtualization & Workspace Software / USA',9000,16500,3500,true,0],
]);

const edaDesign = g([
  ['ansys','ANSYS Inc','ANSS','NASDAQ','US','Technology','Engineering Simulation Software / USA',6500,30000,2350,true,0],
  ['cadence design','Cadence Design Systems Inc','CDNS','NASDAQ','US','Technology','Electronic Design Automation / USA',13000,82000,4500,true,0],
  ['synopsys','Synopsys Inc','SNPS','NASDAQ','US','Technology','EDA & Semiconductor IP / USA',20000,85000,6500,true,0],
  ['nemetschek','Nemetschek SE','NEM','XETRA','DE','Technology','AEC Design Software / Germany',3500,12000,1050,true,0],
  ['temenos','Temenos AG','TEMN','SIX','CH','Technology','Core Banking Software / Switzerland',7500,5200,1050,true,0],
  ['blackbaud','Blackbaud Inc','BLKB','NASDAQ','US','Technology','Nonprofit & Social-Good Software / USA',3000,3200,1150,true,0],
]);

const fintechSoftware = g([
  ['fiserv','Fiserv Inc','FI','NYSE','US','Financial Technology','Payments & Financial Technology / USA',38000,92000,20500,true,0],
  ['fidelity national info','Fidelity National Information Services','FIS','NYSE','US','Financial Technology','Banking & Payments Technology / USA',55000,42000,10200,true,0],
  ['fair isaac','Fair Isaac Corporation (FICO)','FICO','NYSE','US','Financial Technology','Credit Scoring & Analytics / USA',3500,46000,1800,true,0],
  ['gartner','Gartner Inc','IT','NYSE','US','Technology','IT Research & Advisory / USA',21000,38000,6500,true,0],
  ['fleetcor','Corpay Inc (FleetCor)','CPAY','NYSE','US','Financial Technology','Corporate Payments / USA',10000,24000,4100,true,0],
  ['aci worldwide','ACI Worldwide Inc','ACIW','NASDAQ','US','Financial Technology','Real-Time Payments Software / USA',4000,5200,1600,true,0],
]);

runWaves('IS2', V, [
  ['Enterprise Software', enterpriseSoftware],
  ['EDA & Design Software', edaDesign],
  ['Fintech & Research Software', fintechSoftware],
]);
