// AI Wave AR8 — AI Cybersecurity platforms
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'ai-ar8-v2026.1';
const g = mapRows(V);

const cyberAI = g([
  ['crowdstrike','CrowdStrike Holdings Inc','CRWD','NASDAQ','US','Technology','AI-Native Endpoint Security / USA',8500,92000,4200,true,0],
  ['palo alto networks','Palo Alto Networks Inc','PANW','NASDAQ','US','Technology','AI-Powered Network Security / USA',15000,122000,9200,true,0],
  ['zscaler','Zscaler Inc','ZS','NASDAQ','US','Technology','Zero Trust AI Security / USA',6500,32000,2850,true,0],
  ['okta','Okta Inc','OKTA','NASDAQ','US','Technology','AI Identity & Access Management / USA',6000,16500,2650,true,0],
  ['rapid7','Rapid7 Inc','RPD','NASDAQ','US','Technology','AI Threat Detection & Response / USA',2500,1900,822,true,0],
  ['tenable holdings','Tenable Holdings Inc','TENB','NASDAQ','US','Technology','AI Vulnerability Management / USA',2500,5200,1020,true,0],
]);

const privateCyber = g([
  ['illumio','Illumio Inc','ILLUMIO','PRIVATE','US','Technology','Zero Trust Segmentation AI / USA',800,2800,320,false,0],
  ['orca security','Orca Security Inc','ORCA','PRIVATE','IL','Technology','Agentless Cloud Security AI / Israel',500,1800,180,false,0],
  ['lacework','Lacework Inc','LACEWORK','PRIVATE','US','Technology','AI Data-Driven Cloud Security / USA',600,1200,150,false,0],
]);

runWaves('AI AR8', V, [
  ['AI Cybersecurity', cyberAI],
  ['Private Cybersecurity AI', privateCyber],
]);
