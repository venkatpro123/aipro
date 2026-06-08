// AI/Robotics Wave AR2 — AI Data Infrastructure & Analytics Platforms
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'ai-ar2-v2026.1';
const g = mapRows(V);

const dataInfra = g([
  ['snowflake','Snowflake Inc','SNOW','NYSE','US','Technology','AI Data Cloud Platform / USA',8500,42000,4200,true,0],
  ['datadog','Datadog Inc','DDOG','NASDAQ','US','Technology','AI Observability & Monitoring / USA',8000,48000,2850,true,0],
  ['dynatrace','Dynatrace Inc','DT','NYSE','US','Technology','AI-Powered Observability / USA',6000,16500,1820,true,0],
  ['mongodb','MongoDB Inc','MDB','NASDAQ','US','Technology','AI-Ready Developer Data Platform / USA',6200,26000,2120,true,0],
  ['informatica','Informatica Inc','INFA','NYSE','US','Technology','AI Data Management / USA',5200,7500,1620,true,0],
  ['teradata','Teradata Corporation','TDC','NYSE','US','Technology','AI Analytics Platform / USA',8000,2600,1820,true,0],
  ['domo','Domo Inc','DOMO','NASDAQ','US','Technology','Business Intelligence Cloud / USA',1000,520,350,true,0],
  ['couchbase','Couchbase Inc','BASE','NASDAQ','US','Technology','AI-Ready Multi-Cloud Database / USA',700,420,200,true,0],
  ['blend labs','Blend Labs Inc','BLND','NYSE','US','Financial Technology','AI Banking Software / USA',800,520,165,true,0],
]);

const analyticsAI = g([
  ['verint systems','Verint Systems Inc','VRNT','NASDAQ','US','Technology','AI Customer Engagement / USA',4000,2800,1320,true,0],
  ['five9','Five9 Inc','FIVN','NASDAQ','US','Technology','AI Cloud Contact Center / USA',2500,2600,750,true,0],
  ['sprinklr','Sprinklr Inc','CXM','NYSE','US','Technology','AI Unified Customer Experience / USA',4000,1600,750,true,0],
  ['liveperson','LivePerson Inc','LPSN','NASDAQ','US','Technology','Conversational AI Platform / USA',900,320,240,true,0],
]);

runWaves('AI AR2', V, [
  ['AI Data Infrastructure', dataInfra],
  ['AI Analytics & CX', analyticsAI],
]);
