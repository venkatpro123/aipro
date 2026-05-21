// companyPeers.ts — Explicit peer company mapping
// v37.0: Expanded from 34 to 200+ companies, 81 to 350+ edges.
// Covers: India IT, Global Tech, Finance, Healthcare, Pharma, Manufacturing,
// Retail, Consulting, Telecom, Energy, Media, Automotive, Indian Consumer.
// Populates sectorContagionAgent for cross-sector wave detection.

export type PeerRelationshipType =
  | 'direct_competitor'      // same product market, same buyer
  | 'adjacent_market'        // same sector, different buyer / adjacent product
  | 'same_sector_large_cap'  // sector peers by market-cap tier
  | 'same_sector_mid_cap';

export interface PeerRelationship {
  companyId: string;         // normalised lowercase company name key
  peerCompanyId: string;
  relationshipType: PeerRelationshipType;
  confidence: 'high' | 'medium';
  source: 'manual' | 'analyst_report' | 'clustering';
}

// ── Indian IT Services ────────────────────────────────────────────────────────
const INDIA_IT: PeerRelationship[] = [
  { companyId: 'tcs', peerCompanyId: 'infosys', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'tcs', peerCompanyId: 'wipro', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'tcs', peerCompanyId: 'hcl technologies', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'tcs', peerCompanyId: 'cognizant', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'tcs', peerCompanyId: 'tech mahindra', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'tcs', peerCompanyId: 'ltimindtree', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'tcs', peerCompanyId: 'mphasis', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'tcs', peerCompanyId: 'hexaware', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'infosys', peerCompanyId: 'tcs', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'infosys', peerCompanyId: 'wipro', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'infosys', peerCompanyId: 'hcl technologies', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'infosys', peerCompanyId: 'cognizant', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'wipro', peerCompanyId: 'tcs', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'wipro', peerCompanyId: 'infosys', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'wipro', peerCompanyId: 'hcl technologies', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'wipro', peerCompanyId: 'ltimindtree', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'hcl technologies', peerCompanyId: 'tcs', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'hcl technologies', peerCompanyId: 'infosys', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'hcl technologies', peerCompanyId: 'wipro', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'cognizant', peerCompanyId: 'tcs', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'cognizant', peerCompanyId: 'infosys', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'cognizant', peerCompanyId: 'wipro', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'tech mahindra', peerCompanyId: 'tcs', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'tech mahindra', peerCompanyId: 'wipro', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'ltimindtree', peerCompanyId: 'tcs', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'ltimindtree', peerCompanyId: 'wipro', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'accenture', peerCompanyId: 'tcs', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'accenture', peerCompanyId: 'infosys', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'accenture', peerCompanyId: 'wipro', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'accenture', peerCompanyId: 'cognizant', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'accenture', peerCompanyId: 'capgemini', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'capgemini', peerCompanyId: 'accenture', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'capgemini', peerCompanyId: 'tcs', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'capgemini', peerCompanyId: 'infosys', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'mphasis', peerCompanyId: 'hexaware', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'mphasis', peerCompanyId: 'ltimindtree', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'hexaware', peerCompanyId: 'mphasis', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'hexaware', peerCompanyId: 'coforge', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'coforge', peerCompanyId: 'hexaware', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'coforge', peerCompanyId: 'mphasis', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'persistent systems', peerCompanyId: 'mphasis', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'persistent systems', peerCompanyId: 'coforge', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
];

// ── Global Tech ──────────────────────────────────────────────────────────────
const GLOBAL_TECH: PeerRelationship[] = [
  { companyId: 'google', peerCompanyId: 'meta', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'google', peerCompanyId: 'microsoft', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'google', peerCompanyId: 'amazon', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'google', peerCompanyId: 'apple', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'meta', peerCompanyId: 'google', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'meta', peerCompanyId: 'snap', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'meta', peerCompanyId: 'tiktok', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'meta', peerCompanyId: 'pinterest', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'amazon', peerCompanyId: 'microsoft', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'amazon', peerCompanyId: 'google', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'amazon', peerCompanyId: 'walmart', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'microsoft', peerCompanyId: 'google', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'microsoft', peerCompanyId: 'amazon', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'microsoft', peerCompanyId: 'salesforce', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'apple', peerCompanyId: 'google', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'apple', peerCompanyId: 'samsung', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'apple', peerCompanyId: 'microsoft', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'salesforce', peerCompanyId: 'microsoft', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'salesforce', peerCompanyId: 'oracle', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'salesforce', peerCompanyId: 'sap', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'salesforce', peerCompanyId: 'hubspot', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'oracle', peerCompanyId: 'salesforce', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'oracle', peerCompanyId: 'sap', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'oracle', peerCompanyId: 'microsoft', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'sap', peerCompanyId: 'oracle', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'sap', peerCompanyId: 'salesforce', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'ibm', peerCompanyId: 'accenture', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'ibm', peerCompanyId: 'tcs', relationshipType: 'adjacent_market', confidence: 'medium', source: 'manual' },
  { companyId: 'ibm', peerCompanyId: 'infosys', relationshipType: 'adjacent_market', confidence: 'medium', source: 'manual' },
  { companyId: 'intel', peerCompanyId: 'amd', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'intel', peerCompanyId: 'nvidia', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'nvidia', peerCompanyId: 'amd', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'nvidia', peerCompanyId: 'intel', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'amd', peerCompanyId: 'intel', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'amd', peerCompanyId: 'nvidia', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'snap', peerCompanyId: 'meta', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'snap', peerCompanyId: 'tiktok', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'uber', peerCompanyId: 'lyft', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'uber', peerCompanyId: 'airbnb', relationshipType: 'adjacent_market', confidence: 'medium', source: 'manual' },
  { companyId: 'lyft', peerCompanyId: 'uber', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'airbnb', peerCompanyId: 'booking.com', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'stripe', peerCompanyId: 'paypal', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'stripe', peerCompanyId: 'adyen', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'paypal', peerCompanyId: 'stripe', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'paypal', peerCompanyId: 'square', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'twilio', peerCompanyId: 'messagebird', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'twilio', peerCompanyId: 'vonage', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'shopify', peerCompanyId: 'bigcommerce', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'shopify', peerCompanyId: 'woocommerce', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'workday', peerCompanyId: 'sap', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'workday', peerCompanyId: 'oracle', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
];

// ── Global Finance & Banking ──────────────────────────────────────────────────
const GLOBAL_FINANCE: PeerRelationship[] = [
  { companyId: 'jp morgan', peerCompanyId: 'goldman sachs', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'jp morgan', peerCompanyId: 'morgan stanley', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'jp morgan', peerCompanyId: 'bank of america', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'jp morgan', peerCompanyId: 'citigroup', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'jp morgan', peerCompanyId: 'wells fargo', relationshipType: 'same_sector_large_cap', confidence: 'high', source: 'manual' },
  { companyId: 'goldman sachs', peerCompanyId: 'jp morgan', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'goldman sachs', peerCompanyId: 'morgan stanley', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'goldman sachs', peerCompanyId: 'barclays', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'morgan stanley', peerCompanyId: 'goldman sachs', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'morgan stanley', peerCompanyId: 'jp morgan', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'morgan stanley', peerCompanyId: 'ubs', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'bank of america', peerCompanyId: 'jp morgan', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'bank of america', peerCompanyId: 'citigroup', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'bank of america', peerCompanyId: 'wells fargo', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'citigroup', peerCompanyId: 'jp morgan', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'citigroup', peerCompanyId: 'hsbc', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'citigroup', peerCompanyId: 'bank of america', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'wells fargo', peerCompanyId: 'jp morgan', relationshipType: 'same_sector_large_cap', confidence: 'high', source: 'manual' },
  { companyId: 'wells fargo', peerCompanyId: 'bank of america', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'hsbc', peerCompanyId: 'citigroup', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'hsbc', peerCompanyId: 'barclays', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'hsbc', peerCompanyId: 'deutsche bank', relationshipType: 'same_sector_large_cap', confidence: 'high', source: 'manual' },
  { companyId: 'barclays', peerCompanyId: 'hsbc', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'barclays', peerCompanyId: 'lloyds banking group', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'barclays', peerCompanyId: 'natwest', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'deutsche bank', peerCompanyId: 'ubs', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'deutsche bank', peerCompanyId: 'hsbc', relationshipType: 'same_sector_large_cap', confidence: 'high', source: 'manual' },
  { companyId: 'ubs', peerCompanyId: 'credit suisse', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'ubs', peerCompanyId: 'deutsche bank', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'blackrock', peerCompanyId: 'vanguard', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'blackrock', peerCompanyId: 'fidelity', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'blackrock', peerCompanyId: 'state street', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'vanguard', peerCompanyId: 'blackrock', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'vanguard', peerCompanyId: 'fidelity', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'fidelity', peerCompanyId: 'blackrock', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'fidelity', peerCompanyId: 'charles schwab', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'charles schwab', peerCompanyId: 'fidelity', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'charles schwab', peerCompanyId: 'td ameritrade', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'american express', peerCompanyId: 'visa', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'american express', peerCompanyId: 'mastercard', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'visa', peerCompanyId: 'mastercard', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'visa', peerCompanyId: 'american express', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'mastercard', peerCompanyId: 'visa', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
];

// ── Indian Financial Services ─────────────────────────────────────────────────
const INDIA_FINANCE: PeerRelationship[] = [
  { companyId: 'hdfc bank', peerCompanyId: 'icici bank', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'hdfc bank', peerCompanyId: 'axis bank', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'hdfc bank', peerCompanyId: 'kotak mahindra bank', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'hdfc bank', peerCompanyId: 'sbi', relationshipType: 'same_sector_large_cap', confidence: 'high', source: 'manual' },
  { companyId: 'icici bank', peerCompanyId: 'hdfc bank', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'icici bank', peerCompanyId: 'axis bank', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'axis bank', peerCompanyId: 'hdfc bank', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'axis bank', peerCompanyId: 'icici bank', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'bajaj finserv', peerCompanyId: 'hdfc bank', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'bajaj finserv', peerCompanyId: 'icici bank', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'zerodha', peerCompanyId: 'upstox', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'zerodha', peerCompanyId: 'groww', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'paytm', peerCompanyId: 'phonepe', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'paytm', peerCompanyId: 'razorpay', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'razorpay', peerCompanyId: 'paytm', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'razorpay', peerCompanyId: 'cashfree', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'phonepe', peerCompanyId: 'paytm', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'phonepe', peerCompanyId: 'google pay india', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
];

// ── Global Healthcare & Pharma ────────────────────────────────────────────────
const GLOBAL_HEALTHCARE: PeerRelationship[] = [
  { companyId: 'unitedhealth group', peerCompanyId: 'cigna', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'unitedhealth group', peerCompanyId: 'aetna', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'unitedhealth group', peerCompanyId: 'anthem', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'cigna', peerCompanyId: 'unitedhealth group', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'cigna', peerCompanyId: 'aetna', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'aetna', peerCompanyId: 'unitedhealth group', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'aetna', peerCompanyId: 'cigna', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'cvs health', peerCompanyId: 'walgreens', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'cvs health', peerCompanyId: 'unitedhealth group', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'walgreens', peerCompanyId: 'cvs health', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'hca healthcare', peerCompanyId: 'tenet health', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'hca healthcare', peerCompanyId: 'community health systems', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'tenet health', peerCompanyId: 'hca healthcare', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'pfizer', peerCompanyId: 'johnson & johnson', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'pfizer', peerCompanyId: 'novartis', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'pfizer', peerCompanyId: 'merck', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'pfizer', peerCompanyId: 'astrazeneca', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'novartis', peerCompanyId: 'pfizer', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'novartis', peerCompanyId: 'roche', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'novartis', peerCompanyId: 'astrazeneca', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'merck', peerCompanyId: 'pfizer', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'merck', peerCompanyId: 'eli lilly', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'merck', peerCompanyId: 'bristol-myers squibb', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'astrazeneca', peerCompanyId: 'pfizer', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'astrazeneca', peerCompanyId: 'novartis', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'eli lilly', peerCompanyId: 'merck', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'eli lilly', peerCompanyId: 'novo nordisk', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'roche', peerCompanyId: 'novartis', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'roche', peerCompanyId: 'abbvie', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'abbvie', peerCompanyId: 'roche', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'abbvie', peerCompanyId: 'johnson & johnson', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'johnson & johnson', peerCompanyId: 'pfizer', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'johnson & johnson', peerCompanyId: 'abbvie', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'bristol-myers squibb', peerCompanyId: 'merck', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'bristol-myers squibb', peerCompanyId: 'roche', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'medtronic', peerCompanyId: 'abbott', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'medtronic', peerCompanyId: 'boston scientific', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'abbott', peerCompanyId: 'medtronic', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'abbott', peerCompanyId: 'roche', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
];

// ── Indian Healthcare ─────────────────────────────────────────────────────────
const INDIA_HEALTHCARE: PeerRelationship[] = [
  { companyId: 'apollo hospitals', peerCompanyId: 'fortis healthcare', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'apollo hospitals', peerCompanyId: 'manipal hospitals', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'apollo hospitals', peerCompanyId: 'max healthcare', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'fortis healthcare', peerCompanyId: 'apollo hospitals', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'fortis healthcare', peerCompanyId: 'max healthcare', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'sun pharma', peerCompanyId: 'cipla', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'sun pharma', peerCompanyId: 'dr reddys', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'sun pharma', peerCompanyId: 'lupin', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'cipla', peerCompanyId: 'sun pharma', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'cipla', peerCompanyId: 'dr reddys', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'dr reddys', peerCompanyId: 'cipla', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'dr reddys', peerCompanyId: 'sun pharma', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'lupin', peerCompanyId: 'sun pharma', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'lupin', peerCompanyId: 'cipla', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
];

// ── Global Manufacturing ──────────────────────────────────────────────────────
const GLOBAL_MANUFACTURING: PeerRelationship[] = [
  { companyId: 'ge', peerCompanyId: 'siemens', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'ge', peerCompanyId: 'honeywell', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'ge', peerCompanyId: 'emerson electric', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'siemens', peerCompanyId: 'ge', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'siemens', peerCompanyId: 'abb', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'siemens', peerCompanyId: 'honeywell', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'honeywell', peerCompanyId: 'ge', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'honeywell', peerCompanyId: 'siemens', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'honeywell', peerCompanyId: '3m', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: '3m', peerCompanyId: 'honeywell', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: '3m', peerCompanyId: 'dupont', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'caterpillar', peerCompanyId: 'deere & company', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'caterpillar', peerCompanyId: 'komatsu', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'deere & company', peerCompanyId: 'caterpillar', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'boeing', peerCompanyId: 'airbus', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'boeing', peerCompanyId: 'lockheed martin', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'airbus', peerCompanyId: 'boeing', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'foxconn', peerCompanyId: 'flex', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'foxconn', peerCompanyId: 'jabil', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'foxconn', peerCompanyId: 'celestica', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'flex', peerCompanyId: 'foxconn', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'flex', peerCompanyId: 'jabil', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'jabil', peerCompanyId: 'foxconn', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'jabil', peerCompanyId: 'flex', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'bosch', peerCompanyId: 'continental', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'bosch', peerCompanyId: 'denso', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
];

// ── Automotive ────────────────────────────────────────────────────────────────
const AUTOMOTIVE: PeerRelationship[] = [
  { companyId: 'toyota', peerCompanyId: 'honda', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'toyota', peerCompanyId: 'volkswagen', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'toyota', peerCompanyId: 'ford', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'toyota', peerCompanyId: 'gm', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'toyota', peerCompanyId: 'tesla', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'volkswagen', peerCompanyId: 'toyota', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'volkswagen', peerCompanyId: 'stellantis', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'volkswagen', peerCompanyId: 'bmw', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'gm', peerCompanyId: 'ford', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'gm', peerCompanyId: 'toyota', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'gm', peerCompanyId: 'stellantis', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'ford', peerCompanyId: 'gm', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'ford', peerCompanyId: 'tesla', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'ford', peerCompanyId: 'stellantis', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'tesla', peerCompanyId: 'rivian', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'tesla', peerCompanyId: 'lucid motors', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'tesla', peerCompanyId: 'byd', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'tesla', peerCompanyId: 'volkswagen', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'rivian', peerCompanyId: 'tesla', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'rivian', peerCompanyId: 'lucid motors', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'bmw', peerCompanyId: 'mercedes-benz', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'bmw', peerCompanyId: 'audi', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'mercedes-benz', peerCompanyId: 'bmw', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'mercedes-benz', peerCompanyId: 'audi', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
];

// ── Global Retail & E-commerce ────────────────────────────────────────────────
const GLOBAL_RETAIL: PeerRelationship[] = [
  { companyId: 'walmart', peerCompanyId: 'amazon', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'walmart', peerCompanyId: 'target', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'walmart', peerCompanyId: 'costco', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'target', peerCompanyId: 'walmart', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'target', peerCompanyId: 'amazon', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'target', peerCompanyId: 'costco', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'costco', peerCompanyId: 'walmart', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'costco', peerCompanyId: 'sams club', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'home depot', peerCompanyId: 'lowes', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'lowes', peerCompanyId: 'home depot', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'kroger', peerCompanyId: 'albertsons', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'kroger', peerCompanyId: 'walmart', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'best buy', peerCompanyId: 'amazon', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'best buy', peerCompanyId: 'walmart', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'alibaba', peerCompanyId: 'jd.com', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'alibaba', peerCompanyId: 'amazon', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'alibaba', peerCompanyId: 'pinduoduo', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'jd.com', peerCompanyId: 'alibaba', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'h&m', peerCompanyId: 'zara', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'h&m', peerCompanyId: 'uniqlo', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'zara', peerCompanyId: 'h&m', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'zara', peerCompanyId: 'uniqlo', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
];

// ── Indian Consumer / E-commerce ──────────────────────────────────────────────
const INDIA_CONSUMER: PeerRelationship[] = [
  { companyId: 'flipkart', peerCompanyId: 'amazon india', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'flipkart', peerCompanyId: 'meesho', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'amazon india', peerCompanyId: 'flipkart', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'amazon india', peerCompanyId: 'meesho', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'swiggy', peerCompanyId: 'zomato', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'zomato', peerCompanyId: 'swiggy', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'ola', peerCompanyId: 'uber india', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'uber india', peerCompanyId: 'ola', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'nykaa', peerCompanyId: 'purplle', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'myntra', peerCompanyId: 'ajio', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'myntra', peerCompanyId: 'flipkart', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'ajio', peerCompanyId: 'myntra', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'byjus', peerCompanyId: 'unacademy', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'byjus', peerCompanyId: 'vedantu', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'unacademy', peerCompanyId: 'byjus', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'freshworks', peerCompanyId: 'zoho', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'freshworks', peerCompanyId: 'salesforce', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'zoho', peerCompanyId: 'freshworks', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
];

// ── Global Consulting ─────────────────────────────────────────────────────────
const GLOBAL_CONSULTING: PeerRelationship[] = [
  { companyId: 'mckinsey', peerCompanyId: 'bcg', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'mckinsey', peerCompanyId: 'bain', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'mckinsey', peerCompanyId: 'deloitte', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'bcg', peerCompanyId: 'mckinsey', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'bcg', peerCompanyId: 'bain', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'bain', peerCompanyId: 'mckinsey', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'bain', peerCompanyId: 'bcg', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'deloitte', peerCompanyId: 'pwc', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'deloitte', peerCompanyId: 'kpmg', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'deloitte', peerCompanyId: 'ey', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'deloitte', peerCompanyId: 'accenture', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'pwc', peerCompanyId: 'deloitte', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'pwc', peerCompanyId: 'kpmg', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'pwc', peerCompanyId: 'ey', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'kpmg', peerCompanyId: 'deloitte', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'kpmg', peerCompanyId: 'pwc', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'kpmg', peerCompanyId: 'ey', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'ey', peerCompanyId: 'deloitte', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'ey', peerCompanyId: 'pwc', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'ey', peerCompanyId: 'kpmg', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'booz allen hamilton', peerCompanyId: 'accenture', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'booz allen hamilton', peerCompanyId: 'leidos', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'leidos', peerCompanyId: 'booz allen hamilton', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
];

// ── Telecom ───────────────────────────────────────────────────────────────────
const TELECOM: PeerRelationship[] = [
  { companyId: 'at&t', peerCompanyId: 'verizon', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'at&t', peerCompanyId: 't-mobile', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'verizon', peerCompanyId: 'at&t', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'verizon', peerCompanyId: 't-mobile', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 't-mobile', peerCompanyId: 'at&t', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 't-mobile', peerCompanyId: 'verizon', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'vodafone', peerCompanyId: 'deutsche telekom', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'vodafone', peerCompanyId: 'orange', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'deutsche telekom', peerCompanyId: 'vodafone', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'deutsche telekom', peerCompanyId: 't-mobile', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'nokia', peerCompanyId: 'ericsson', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'nokia', peerCompanyId: 'huawei', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'ericsson', peerCompanyId: 'nokia', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'ericsson', peerCompanyId: 'huawei', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'airtel', peerCompanyId: 'jio', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'airtel', peerCompanyId: 'vodafone idea', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'jio', peerCompanyId: 'airtel', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'jio', peerCompanyId: 'vodafone idea', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
];

// ── Energy ────────────────────────────────────────────────────────────────────
const ENERGY: PeerRelationship[] = [
  { companyId: 'exxonmobil', peerCompanyId: 'shell', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'exxonmobil', peerCompanyId: 'chevron', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'exxonmobil', peerCompanyId: 'bp', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'exxonmobil', peerCompanyId: 'totalenergies', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'shell', peerCompanyId: 'exxonmobil', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'shell', peerCompanyId: 'bp', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'shell', peerCompanyId: 'totalenergies', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'bp', peerCompanyId: 'shell', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'bp', peerCompanyId: 'exxonmobil', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'chevron', peerCompanyId: 'exxonmobil', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'chevron', peerCompanyId: 'conocophillips', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'totalenergies', peerCompanyId: 'shell', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'totalenergies', peerCompanyId: 'bp', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'nextera energy', peerCompanyId: 'duke energy', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'nextera energy', peerCompanyId: 'dominion energy', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'duke energy', peerCompanyId: 'nextera energy', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'reliance industries', peerCompanyId: 'ongc', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'reliance industries', peerCompanyId: 'adani group', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'adani group', peerCompanyId: 'reliance industries', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
];

// ── Media & Entertainment ─────────────────────────────────────────────────────
const MEDIA: PeerRelationship[] = [
  { companyId: 'netflix', peerCompanyId: 'disney+', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'netflix', peerCompanyId: 'amazon prime video', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'netflix', peerCompanyId: 'hbo max', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'netflix', peerCompanyId: 'paramount+', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'disney', peerCompanyId: 'netflix', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'disney', peerCompanyId: 'warner bros discovery', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'disney', peerCompanyId: 'comcast', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'warner bros discovery', peerCompanyId: 'disney', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'warner bros discovery', peerCompanyId: 'netflix', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'comcast', peerCompanyId: 'disney', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'comcast', peerCompanyId: 'at&t', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'news corp', peerCompanyId: 'new york times', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'spotify', peerCompanyId: 'apple music', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'spotify', peerCompanyId: 'amazon music', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'youtube', peerCompanyId: 'tiktok', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'youtube', peerCompanyId: 'twitch', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
];

// ── Insurance ─────────────────────────────────────────────────────────────────
const INSURANCE: PeerRelationship[] = [
  { companyId: 'berkshire hathaway', peerCompanyId: 'allstate', relationshipType: 'adjacent_market', confidence: 'high', source: 'manual' },
  { companyId: 'allstate', peerCompanyId: 'state farm', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'allstate', peerCompanyId: 'progressive', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'state farm', peerCompanyId: 'allstate', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'state farm', peerCompanyId: 'progressive', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'progressive', peerCompanyId: 'allstate', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'progressive', peerCompanyId: 'geico', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'aig', peerCompanyId: 'chubb', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'aig', peerCompanyId: 'zurich', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'munich re', peerCompanyId: 'swiss re', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'munich re', peerCompanyId: 'hannover re', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'swiss re', peerCompanyId: 'munich re', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'lic', peerCompanyId: 'hdfc life', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'lic', peerCompanyId: 'sbi life', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'hdfc life', peerCompanyId: 'lic', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
  { companyId: 'hdfc life', peerCompanyId: 'sbi life', relationshipType: 'direct_competitor', confidence: 'high', source: 'manual' },
];

// ── Master exports ────────────────────────────────────────────────────────────

export const COMPANY_PEERS_DB: PeerRelationship[] = [
  ...INDIA_IT,
  ...GLOBAL_TECH,
  ...GLOBAL_FINANCE,
  ...INDIA_FINANCE,
  ...GLOBAL_HEALTHCARE,
  ...INDIA_HEALTHCARE,
  ...GLOBAL_MANUFACTURING,
  ...AUTOMOTIVE,
  ...GLOBAL_RETAIL,
  ...INDIA_CONSUMER,
  ...GLOBAL_CONSULTING,
  ...TELECOM,
  ...ENERGY,
  ...MEDIA,
  ...INSURANCE,
];

/**
 * Get all peers of a company.
 * Returns only direct_competitor and adjacent_market peers by default.
 * Normalises company name to lowercase for matching.
 */
export function getCompanyPeers(
  companyName: string,
  includeTypes: PeerRelationshipType[] = ['direct_competitor', 'adjacent_market'],
): string[] {
  const normalized = companyName.toLowerCase().trim();
  return COMPANY_PEERS_DB
    .filter(p => p.companyId === normalized && includeTypes.includes(p.relationshipType))
    .map(p => p.peerCompanyId);
}

/**
 * Check if a company has explicitly mapped peers.
 * Used to determine whether sectorContagionAgent can use hard signals vs heuristics.
 */
export function hasExplicitPeers(companyName: string): boolean {
  const normalized = companyName.toLowerCase().trim();
  return COMPANY_PEERS_DB.some(p => p.companyId === normalized);
}

/** Count of peer relationships — used in metrics/transparency. */
export function getPeerCount(): number {
  return COMPANY_PEERS_DB.length;
}

// ── Metro Tech Cluster Registry ───────────────────────────────────────────────
//
// Named tech clusters where geographic co-location amplifies peer contagion.
// When 2+ members of the same cluster announce layoffs within 90 days:
//   • sectorContagionAgent applies CLUSTER_CONTAGION_AMPLIFIER=1.25 to signal
//   • jobMarketLiquidityService adds METRO_REEMPLOYMENT_DELAY_WEEKS=3 to timeline
//
// Company names are lowercase keyword substrings — matching against layoff event
// company names is case-insensitive partial match.
//
// SOURCE: User-specified clusters from engineering team research (2026-05-21).
// LABELED: ESTIMATED — membership reflects known co-location, not exhaustive lists.
//
// DESIGN NOTE: These lists are intentionally simpler than techClusterMetros.ts
// (which has headcount/presence-mode metadata for the geo supply-surge engine).
// This registry is optimised for fast string-matching in the swarm contagion agent.

export const METRO_TECH_CLUSTER: Readonly<Record<string, readonly string[]>> = {
  // ── United States ─────────────────────────────────────────────────────────
  'Seattle-Bellevue': [
    'amazon', 'microsoft', 'meta', 'google', 'salesforce',
    'expedia', 'zillow', 'tableau',
  ],
  'San Francisco Bay Area': [
    'google', 'apple', 'meta', 'salesforce', 'oracle', 'adobe',
    'stripe', 'airbnb', 'linkedin', 'twitter', 'x corp', 'uber', 'lyft',
  ],
  'New York': [
    'goldman sachs', 'goldman', 'jpmorgan', 'jp morgan', 'bloomberg',
    'snap', 'spotify', 'tiktok',
  ],
  // ── Europe ────────────────────────────────────────────────────────────────
  'London': [
    'amazon', 'google', 'meta', 'microsoft',
    'revolut', 'monzo', 'deepmind', 'wayve',
  ],
  'Berlin': [
    'zalando', 'delivery hero', 'hellofresh', 'sumup', 'auto1', 'n26',
  ],
  // ── Asia-Pacific ──────────────────────────────────────────────────────────
  'Singapore': [
    'grab', 'sea limited', 'sea group', 'lazada', 'shopee',
    'gojek', 'razer', 'propertyguru',
  ],
};

/** Identify which metro cluster a company belongs to (if any).
 *  Returns the cluster name, or null if not found. */
export function getMetroCluster(companyName: string): string | null {
  const lower = companyName.toLowerCase().trim();
  for (const [metroName, members] of Object.entries(METRO_TECH_CLUSTER)) {
    if (members.some(m => lower.includes(m) || m.includes(lower.split(' ')[0]))) {
      return metroName;
    }
  }
  return null;
}

/** Given a list of company names (e.g., from layoff events), count how many
 *  belong to each metro cluster. Returns only clusters with >= minCount members. */
export function detectActiveMetroClusters(
  companyNames: string[],
  windowDays: number,
  minCount: number = 2,
): Array<{ metroName: string; matchedCompanies: string[]; count: number }> {
  const results: Array<{ metroName: string; matchedCompanies: string[]; count: number }> = [];

  for (const [metroName, members] of Object.entries(METRO_TECH_CLUSTER)) {
    const matched = companyNames.filter(name => {
      const lower = name.toLowerCase().trim();
      return members.some(m => lower.includes(m) || m.includes(lower.split(' ')[0]));
    });
    if (matched.length >= minCount) {
      results.push({ metroName, matchedCompanies: matched, count: matched.length });
    }
  }

  return results.sort((a, b) => b.count - a.count);
}
