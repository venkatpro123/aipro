// industryRiskData.ts
// ⚠️  DEPRECATED DATA OBJECT — Do not read `industryRiskData` directly in new code.
//     Production data is served from Supabase via src/services/db/staticDataService.ts
//     (getIndustryRiskSync, getAllIndustryRisk). This file is the offline fallback.
//     The IndustryRisk interface remains here and should continue to be imported.
//
// Industry-level baseline risk scores — expanded to 81 sectors.
// Sources: layoffs.fyi 2024-2025 dataset, WEF Future of Jobs 2025, NASSCOM AI Readiness 2025.
// avgLayoffRate2025: observed fraction of sector workforce displaced in 2025.

export interface IndustryRisk {
  baselineRisk: number;
  aiAdoptionRate: number;       // 0–1 scale (was string, now numeric for formula usage)
  growthOutlook: 'growing' | 'stable' | 'volatile' | 'declining';
  avgLayoffRate2025: number;    // observed % of industry that laid off in 2025
}

export const industryRiskData: Record<string, IndustryRisk> = {
  // Tech & Digital
  'Technology':            { baselineRisk: 0.58, aiAdoptionRate: 0.80, growthOutlook: 'volatile',  avgLayoffRate2025: 0.07 },
  'E-commerce':            { baselineRisk: 0.55, aiAdoptionRate: 0.75, growthOutlook: 'stable',    avgLayoffRate2025: 0.05 },
  'Gaming':                { baselineRisk: 0.65, aiAdoptionRate: 0.70, growthOutlook: 'declining', avgLayoffRate2025: 0.09 },
  'Cybersecurity':         { baselineRisk: 0.19, aiAdoptionRate: 0.65, growthOutlook: 'growing',   avgLayoffRate2025: 0.02 },

  // Finance & Services
  'Financial Services':    { baselineRisk: 0.52, aiAdoptionRate: 0.72, growthOutlook: 'stable',    avgLayoffRate2025: 0.04 },
  'Insurance':             { baselineRisk: 0.48, aiAdoptionRate: 0.55, growthOutlook: 'stable',    avgLayoffRate2025: 0.03 },
  'Consulting':            { baselineRisk: 0.48, aiAdoptionRate: 0.68, growthOutlook: 'stable',    avgLayoffRate2025: 0.04 },
  'Real Estate':           { baselineRisk: 0.42, aiAdoptionRate: 0.35, growthOutlook: 'volatile',  avgLayoffRate2025: 0.05 },

  // Traditional Industries
  'Healthcare':            { baselineRisk: 0.28, aiAdoptionRate: 0.40, growthOutlook: 'growing',   avgLayoffRate2025: 0.015 },
  'Biotech/Pharma':        { baselineRisk: 0.33, aiAdoptionRate: 0.45, growthOutlook: 'growing',   avgLayoffRate2025: 0.03 },
  'Manufacturing':         { baselineRisk: 0.44, aiAdoptionRate: 0.50, growthOutlook: 'stable',    avgLayoffRate2025: 0.04 },
  'Energy':                { baselineRisk: 0.38, aiAdoptionRate: 0.30, growthOutlook: 'stable',    avgLayoffRate2025: 0.03 },
  'Construction':          { baselineRisk: 0.35, aiAdoptionRate: 0.15, growthOutlook: 'stable',    avgLayoffRate2025: 0.02 },
  'Agriculture':           { baselineRisk: 0.25, aiAdoptionRate: 0.20, growthOutlook: 'stable',    avgLayoffRate2025: 0.01 },

  // Communication & Media
  'Media & Publishing':    { baselineRisk: 0.71, aiAdoptionRate: 0.85, growthOutlook: 'declining', avgLayoffRate2025: 0.12 },
  'Telecom':               { baselineRisk: 0.50, aiAdoptionRate: 0.55, growthOutlook: 'stable',    avgLayoffRate2025: 0.04 },

  // Services & People
  'Education':             { baselineRisk: 0.35, aiAdoptionRate: 0.30, growthOutlook: 'stable',    avgLayoffRate2025: 0.02 },
  'Government':            { baselineRisk: 0.31, aiAdoptionRate: 0.20, growthOutlook: 'stable',    avgLayoffRate2025: 0.01 },
  'Hospitality':           { baselineRisk: 0.40, aiAdoptionRate: 0.25, growthOutlook: 'volatile',  avgLayoffRate2025: 0.05 },
  'Retail':                { baselineRisk: 0.62, aiAdoptionRate: 0.60, growthOutlook: 'volatile',  avgLayoffRate2025: 0.06 },
  'Legal':                 { baselineRisk: 0.55, aiAdoptionRate: 0.70, growthOutlook: 'declining', avgLayoffRate2025: 0.05 },
  'Transportation':        { baselineRisk: 0.47, aiAdoptionRate: 0.45, growthOutlook: 'stable',    avgLayoffRate2025: 0.03 },

  // Startups (by stage)
  'Startups (pre-seed)':   { baselineRisk: 0.72, aiAdoptionRate: 0.50, growthOutlook: 'volatile',  avgLayoffRate2025: 0.15 },
  'Startups (seed)':       { baselineRisk: 0.65, aiAdoptionRate: 0.50, growthOutlook: 'volatile',  avgLayoffRate2025: 0.12 },
  'Startups (Series A)':   { baselineRisk: 0.52, aiAdoptionRate: 0.50, growthOutlook: 'volatile',  avgLayoffRate2025: 0.08 },
  'Startups (Series B+)':  { baselineRisk: 0.44, aiAdoptionRate: 0.50, growthOutlook: 'stable',    avgLayoffRate2025: 0.05 },

  // Nonprofit & Other
  'Nonprofit':             { baselineRisk: 0.30, aiAdoptionRate: 0.15, growthOutlook: 'stable',    avgLayoffRate2025: 0.02 },

  // ── India-specific sectors ────────────────────────────────────────────────
  'IT Services':           { baselineRisk: 0.55, aiAdoptionRate: 0.75, growthOutlook: 'volatile',  avgLayoffRate2025: 0.06 },
  'BPO':                   { baselineRisk: 0.72, aiAdoptionRate: 0.85, growthOutlook: 'declining', avgLayoffRate2025: 0.14 },
  'ITES':                  { baselineRisk: 0.65, aiAdoptionRate: 0.80, growthOutlook: 'declining', avgLayoffRate2025: 0.10 },
  'Banking':               { baselineRisk: 0.35, aiAdoptionRate: 0.68, growthOutlook: 'growing',   avgLayoffRate2025: 0.02 },
  'FinTech':               { baselineRisk: 0.52, aiAdoptionRate: 0.78, growthOutlook: 'volatile',  avgLayoffRate2025: 0.07 },
  'EdTech':                { baselineRisk: 0.68, aiAdoptionRate: 0.65, growthOutlook: 'declining', avgLayoffRate2025: 0.13 },
  'Food Tech':             { baselineRisk: 0.58, aiAdoptionRate: 0.55, growthOutlook: 'stable',    avgLayoffRate2025: 0.06 },
  'Quick Commerce':        { baselineRisk: 0.60, aiAdoptionRate: 0.50, growthOutlook: 'volatile',  avgLayoffRate2025: 0.08 },
  'AgriTech':              { baselineRisk: 0.55, aiAdoptionRate: 0.40, growthOutlook: 'stable',    avgLayoffRate2025: 0.05 },
  'HealthTech':            { baselineRisk: 0.40, aiAdoptionRate: 0.55, growthOutlook: 'growing',   avgLayoffRate2025: 0.03 },
  'PropTech':              { baselineRisk: 0.48, aiAdoptionRate: 0.40, growthOutlook: 'stable',    avgLayoffRate2025: 0.04 },
  'Mobility':              { baselineRisk: 0.62, aiAdoptionRate: 0.50, growthOutlook: 'volatile',  avgLayoffRate2025: 0.08 },
  'Logistics':             { baselineRisk: 0.45, aiAdoptionRate: 0.55, growthOutlook: 'stable',    avgLayoffRate2025: 0.04 },
  'Media':                 { baselineRisk: 0.68, aiAdoptionRate: 0.80, growthOutlook: 'declining', avgLayoffRate2025: 0.10 },
  'Social Media':          { baselineRisk: 0.65, aiAdoptionRate: 0.85, growthOutlook: 'volatile',  avgLayoffRate2025: 0.09 },
  'NBFC / Lending':        { baselineRisk: 0.45, aiAdoptionRate: 0.60, growthOutlook: 'stable',    avgLayoffRate2025: 0.03 },
  'Conglomerate':          { baselineRisk: 0.32, aiAdoptionRate: 0.45, growthOutlook: 'stable',    avgLayoffRate2025: 0.02 },
  'FMCG / Conglomerate':   { baselineRisk: 0.30, aiAdoptionRate: 0.40, growthOutlook: 'stable',    avgLayoffRate2025: 0.02 },
  'D2C / FMCG':            { baselineRisk: 0.55, aiAdoptionRate: 0.45, growthOutlook: 'volatile',  avgLayoffRate2025: 0.06 },
  'D2C / Retail':          { baselineRisk: 0.52, aiAdoptionRate: 0.50, growthOutlook: 'volatile',  avgLayoffRate2025: 0.06 },
  'Home Services':         { baselineRisk: 0.58, aiAdoptionRate: 0.35, growthOutlook: 'stable',    avgLayoffRate2025: 0.07 },
  'Engineering & Construction': { baselineRisk: 0.32, aiAdoptionRate: 0.30, growthOutlook: 'stable', avgLayoffRate2025: 0.02 },
  'Energy / Utilities':    { baselineRisk: 0.28, aiAdoptionRate: 0.35, growthOutlook: 'stable',    avgLayoffRate2025: 0.01 },
  'EV / Manufacturing':    { baselineRisk: 0.55, aiAdoptionRate: 0.55, growthOutlook: 'volatile',  avgLayoffRate2025: 0.07 },

  // ── US / Global tech categories ───────────────────────────────────────────
  'SaaS':                  { baselineRisk: 0.54, aiAdoptionRate: 0.82, growthOutlook: 'volatile',  avgLayoffRate2025: 0.07 },
  'Enterprise Software':   { baselineRisk: 0.48, aiAdoptionRate: 0.80, growthOutlook: 'stable',    avgLayoffRate2025: 0.05 },
  'Enterprise SaaS':       { baselineRisk: 0.46, aiAdoptionRate: 0.82, growthOutlook: 'stable',    avgLayoffRate2025: 0.05 },
  'Marketing SaaS':        { baselineRisk: 0.55, aiAdoptionRate: 0.88, growthOutlook: 'volatile',  avgLayoffRate2025: 0.07 },
  'Design SaaS':           { baselineRisk: 0.50, aiAdoptionRate: 0.90, growthOutlook: 'volatile',  avgLayoffRate2025: 0.06 },
  'E-commerce SaaS':       { baselineRisk: 0.52, aiAdoptionRate: 0.80, growthOutlook: 'stable',    avgLayoffRate2025: 0.06 },
  'Communications SaaS':   { baselineRisk: 0.58, aiAdoptionRate: 0.82, growthOutlook: 'volatile',  avgLayoffRate2025: 0.08 },
  'Productivity SaaS':     { baselineRisk: 0.50, aiAdoptionRate: 0.88, growthOutlook: 'stable',    avgLayoffRate2025: 0.06 },
  'SaaS / Legal Tech':     { baselineRisk: 0.52, aiAdoptionRate: 0.85, growthOutlook: 'volatile',  avgLayoffRate2025: 0.06 },
  'SaaS / Video':          { baselineRisk: 0.60, aiAdoptionRate: 0.82, growthOutlook: 'declining', avgLayoffRate2025: 0.09 },
  'AI Research':           { baselineRisk: 0.15, aiAdoptionRate: 0.99, growthOutlook: 'growing',   avgLayoffRate2025: 0.01 },
  'AI Infrastructure':     { baselineRisk: 0.12, aiAdoptionRate: 0.99, growthOutlook: 'growing',   avgLayoffRate2025: 0.01 },
  'Data + AI Platform':    { baselineRisk: 0.18, aiAdoptionRate: 0.98, growthOutlook: 'growing',   avgLayoffRate2025: 0.01 },
  'Data Platform':         { baselineRisk: 0.22, aiAdoptionRate: 0.95, growthOutlook: 'growing',   avgLayoffRate2025: 0.02 },
  'DevOps / Observability':{ baselineRisk: 0.20, aiAdoptionRate: 0.90, growthOutlook: 'growing',   avgLayoffRate2025: 0.02 },
  'Semiconductors':        { baselineRisk: 0.30, aiAdoptionRate: 0.65, growthOutlook: 'growing',   avgLayoffRate2025: 0.03 },
  'Crypto':                { baselineRisk: 0.72, aiAdoptionRate: 0.70, growthOutlook: 'volatile',  avgLayoffRate2025: 0.12 },
  'Payments Infrastructure':{ baselineRisk: 0.42, aiAdoptionRate: 0.75, growthOutlook: 'stable',   avgLayoffRate2025: 0.03 },
  'Beauty E-commerce':     { baselineRisk: 0.55, aiAdoptionRate: 0.50, growthOutlook: 'volatile',  avgLayoffRate2025: 0.06 },
  'Super-app':             { baselineRisk: 0.58, aiAdoptionRate: 0.70, growthOutlook: 'volatile',  avgLayoffRate2025: 0.08 },
  'Social Media / AI':     { baselineRisk: 0.50, aiAdoptionRate: 0.92, growthOutlook: 'volatile',  avgLayoffRate2025: 0.06 },
  'Grocery Delivery':      { baselineRisk: 0.55, aiAdoptionRate: 0.60, growthOutlook: 'stable',    avgLayoffRate2025: 0.05 },
  'Gaming / Sports':       { baselineRisk: 0.45, aiAdoptionRate: 0.65, growthOutlook: 'stable',    avgLayoffRate2025: 0.04 },

  // ── APAC / Global ─────────────────────────────────────────────────────────
  'Automotive':            { baselineRisk: 0.48, aiAdoptionRate: 0.60, growthOutlook: 'volatile',  avgLayoffRate2025: 0.05 },
  'Aerospace':             { baselineRisk: 0.42, aiAdoptionRate: 0.45, growthOutlook: 'stable',    avgLayoffRate2025: 0.04 },
  'Industrial':            { baselineRisk: 0.38, aiAdoptionRate: 0.50, growthOutlook: 'stable',    avgLayoffRate2025: 0.03 },
  'Industrial Automation': { baselineRisk: 0.30, aiAdoptionRate: 0.65, growthOutlook: 'growing',   avgLayoffRate2025: 0.02 },
  'Biotech':               { baselineRisk: 0.38, aiAdoptionRate: 0.55, growthOutlook: 'volatile',  avgLayoffRate2025: 0.05 },
  'Healthcare Technology': { baselineRisk: 0.32, aiAdoptionRate: 0.65, growthOutlook: 'growing',   avgLayoffRate2025: 0.02 },
};
