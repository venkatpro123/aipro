// Canonical headcount map — mirrors `KNOWN_HEADCOUNTS` in
// `artifacts/humanproof/src/data/companyIntelligenceBridge.ts`.
//
// Deno can't import from the React app's src/ tree (different tsconfig, JSX,
// etc.), so this is a deliberate data-only duplicate. The shape and contents
// must stay in lock-step with the canonical map. If you add a company here,
// add it there too; if you change a value here, change it there too.
//
// Sourced from FY2024-25 public filings (10-K, annual reports, press releases).
export const KNOWN_HEADCOUNTS: Record<string, number> = {
  // Big Tech
  google: 182000, alphabet: 182000,
  microsoft: 228000, amazon: 1540000,
  meta: 72000, facebook: 72000,
  apple: 164000, tesla: 140000,
  netflix: 13000, nvidia: 36000,
  salesforce: 73000, oracle: 164000,
  ibm: 288000, intel: 124000,
  cisco: 84000, adobe: 30000,
  qualcomm: 51000, sap: 108000,
  // Indian IT Services (FY2024-25)
  "tata consultancy": 613000, tcs: 613000,
  infosys: 343000,
  wipro: 230000,
  "hcl tech": 218000, hcltech: 218000, hcl_tech: 218000,
  "tech mahindra": 152000, tech_mahindra: 152000,
  cognizant: 344000,
  accenture: 774000,
  capgemini: 342000,
  ltimindtree: 86000, lti: 86000,
  mphasis: 35000,
  // Other large
  "tata motors": 84000, tata_motors: 84000,
  "tata steel": 78000, tata_steel: 78000,
  // Mid-tier
  palantir: 3700, snowflake: 7000, datadog: 6500,
  cloudflare: 4000, crowdstrike: 7900, zoom: 7400,
  shopify: 11600, airbnb: 6900, uber: 32000,
  lyft: 4600, spotify: 10500, stripe: 8000,
  atlassian: 13000, twilio: 5600, docusign: 6700,
  dropbox: 2700, peloton: 3700,
};
