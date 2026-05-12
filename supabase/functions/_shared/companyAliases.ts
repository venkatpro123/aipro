// _shared/companyAliases.ts
//
// Canonical alias → primary-key map. Mirrors COMPANY_ALIASES in
// `artifacts/humanproof/src/data/companyIntelligenceDB.ts`. Edge Functions
// can't import from the React app's src/ tree (different tsconfig + JSX), so
// this is a deliberate data-only duplicate. Keep in lock-step.
//
// Used by ingest-news to canonicalise LLM-extracted company names before
// inserting into breaking_news_events — so "Tata Consultancy Services" and
// "TCS" both file under company_name='TCS'.

export const COMPANY_ALIASES: Record<string, string> = {
  // Big Tech
  "google llc": "google",
  "alphabet": "google",
  "alphabet inc": "google",
  "google inc": "google",
  "meta platforms": "meta",
  "facebook": "meta",
  "instagram": "meta",
  "whatsapp": "meta",
  "x corp": "twitter_x",
  "twitter": "twitter_x",
  "x.com": "twitter_x",
  "amazon web services": "amazon",
  "aws": "amazon",
  "amazon.com": "amazon",
  "amazon.com inc": "amazon",
  "microsoft corporation": "microsoft",
  "msft": "microsoft",
  "apple inc": "apple",
  "apple inc.": "apple",
  // Indian IT
  "infosys limited": "infosys",
  "infosys bpo": "infosys",
  "tata consultancy": "tcs",
  "tata consultancy services": "tcs",
  "tata consultancy services limited": "tcs",
  "tcs india": "tcs",
  "wipro limited": "wipro",
  "wipro technologies": "wipro",
  "hcl technologies": "hcl_tech",
  "hcl tech": "hcl_tech",
  "hcltech": "hcl_tech",
  "tech mahindra": "tech_mahindra",
  "techmahindra": "tech_mahindra",
  "cognizant technology": "cognizant",
  "cognizant technology solutions": "cognizant",
  "cts": "cognizant",
  "capgemini india": "capgemini",
  "dxc": "dxc_technology",
  "openai inc": "openai",
  "slack": "salesforce",
};

/**
 * Canonicalise a free-form company name to the internal primary key when
 * possible; otherwise return a lowercased / suffix-stripped version. Mirrors
 * `getCompanyAliases` semantics from the React app.
 */
export function canonicaliseCompanyName(name: string | null | undefined): string {
  if (!name || typeof name !== "string") return "";
  const lower = name.toLowerCase().trim();
  if (!lower) return "";
  if (COMPANY_ALIASES[lower]) return COMPANY_ALIASES[lower];
  // Strip common corporate suffixes
  return lower
    .replace(/\s+(inc|llc|ltd|limited|corp|corporation|technologies|technology|services|pvt|group|holdings|plc|sa)\.?$/i, "")
    .trim();
}
