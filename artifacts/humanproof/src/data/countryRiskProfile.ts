// ═══════════════════════════════════════════════════════════════════════
// countryRiskProfile.ts — D5 Country Exposure Engine
// Expanded to 65 countries. Replaces 4-country hardcoded switch.
//
// Risk factors weighted:
//   aiAdoptionSpeed   — How fast enterprises in this country adopt AI tools
//   labourFlexibility — How easy it is to replace workers (regulatory)
//   offshoreVulnerability — Can this role be replaced by cheaper remote workers?
//   techHubBonus      — Offset: strong tech job markets buffer displacement
// ═══════════════════════════════════════════════════════════════════════

export interface CountryRiskProfile {
  d5Score: number;          // 0–100 (100 = highest exposure)
  label: string;
  aiAdoptionSpeed: number;  // 0–1
  labourFlexibility: number; // 0–1 (1 = easy to fire = high risk)
  offshoreVulnerability: number; // 0–1
  techHubBonus: number;     // 0–1 (reduces d5 score)
  note?: string;
}

// D5 calculation: (adoptionSpeed * 35 + labourFlex * 30 + offshoreVuln * 25) - techHubBonus * 20
// Clamped 0–100
function d5(adoption: number, flex: number, offshore: number, hub: number, note?: string): CountryRiskProfile {
  const raw = (adoption * 35) + (flex * 30) + (offshore * 25) - (hub * 20);
  return {
    d5Score: Math.min(100, Math.max(0, Math.round(raw))),
    label: '',
    aiAdoptionSpeed: adoption,
    labourFlexibility: flex,
    offshoreVulnerability: offshore,
    techHubBonus: hub,
    note,
  };
}

export const COUNTRY_RISK_PROFILES: Record<string, CountryRiskProfile> = {
  // ── North America ──────────────────────────────────────────────
  usa:          { ...d5(0.92, 0.80, 0.55, 0.95), label: 'United States', note: 'Highest AI enterprise adoption globally; strong tech hub offsets displacement' },
  canada:       { ...d5(0.80, 0.60, 0.48, 0.80), label: 'Canada' },
  mexico:       { ...d5(0.55, 0.70, 0.78, 0.35), label: 'Mexico', note: 'High offshore vulnerability; manufacturing + services risk' },
  colombia:     { ...d5(0.45, 0.65, 0.82, 0.25), label: 'Colombia' },
  argentina:    { ...d5(0.40, 0.60, 0.80, 0.22), label: 'Argentina' },
  brazil:       { ...d5(0.52, 0.72, 0.75, 0.35), label: 'Brazil' },
  chile:        { ...d5(0.50, 0.68, 0.72, 0.30), label: 'Chile' },
  peru:         { ...d5(0.38, 0.62, 0.80, 0.20), label: 'Peru' },

  // ── Europe — Western ──────────────────────────────────────────
  uk:           { ...d5(0.82, 0.65, 0.50, 0.88), label: 'United Kingdom', note: 'Strong FinTech hub; high adoption in professional services' },
  germany:      { ...d5(0.75, 0.40, 0.38, 0.85), label: 'Germany', note: 'Betriebsrat (BetrVG §87(1)6) must approve AI tools that monitor/evaluate employees — creates a structural gate for QA, HR, and performance-monitoring AI. Enterprise AI adoption is slower for monitored-role categories. Role-specific penalty applied in aiEnterpriseDeploymentRates.ts.' },
  france:       { ...d5(0.72, 0.35, 0.40, 0.78), label: 'France', note: 'Regulatory environment slows displacement vs USA' },
  netherlands:  { ...d5(0.80, 0.55, 0.45, 0.82), label: 'Netherlands' },
  belgium:      { ...d5(0.70, 0.45, 0.42, 0.72), label: 'Belgium' },
  switzerland:  { ...d5(0.78, 0.50, 0.38, 0.88), label: 'Switzerland', note: 'High wages attract AI investment; financial sector highly exposed' },
  austria:      { ...d5(0.68, 0.48, 0.40, 0.72), label: 'Austria' },
  ireland:      { ...d5(0.78, 0.60, 0.45, 0.85), label: 'Ireland', note: 'Strong tech hub (Google, Meta, Microsoft HQs)' },
  spain:        { ...d5(0.62, 0.50, 0.55, 0.65), label: 'Spain' },
  italy:        { ...d5(0.58, 0.45, 0.52, 0.60), label: 'Italy' },
  portugal:     { ...d5(0.62, 0.52, 0.58, 0.62), label: 'Portugal', note: 'Growing tech hub; offshore destination for EU firms' },

  // ── Europe — Nordic ───────────────────────────────────────────
  sweden:       { ...d5(0.85, 0.55, 0.40, 0.90), label: 'Sweden', note: 'Highest social safety net; displacement softened by strong welfare' },
  norway:       { ...d5(0.80, 0.50, 0.38, 0.88), label: 'Norway' },
  denmark:      { ...d5(0.82, 0.58, 0.40, 0.88), label: 'Denmark' },
  finland:      { ...d5(0.80, 0.55, 0.42, 0.88), label: 'Finland', note: 'Strong digital government adoption' },

  // ── Europe — Eastern ─────────────────────────────────────────
  poland:       { ...d5(0.58, 0.58, 0.65, 0.52), label: 'Poland', note: 'Major nearshore BPO target — high offshore vulnerability' },
  czechia:      { ...d5(0.62, 0.55, 0.62, 0.55), label: 'Czech Republic' },
  romania:      { ...d5(0.52, 0.60, 0.72, 0.42), label: 'Romania', note: 'Major outsourcing hub; high BPO risk' },
  ukraine:      { ...d5(0.48, 0.62, 0.78, 0.40), label: 'Ukraine' },
  hungary:      { ...d5(0.55, 0.58, 0.65, 0.48), label: 'Hungary' },
  estonia:      { ...d5(0.75, 0.60, 0.55, 0.70), label: 'Estonia', note: 'Most digitalised government in EU; tech-forward' },
  latvia:       { ...d5(0.58, 0.58, 0.62, 0.50), label: 'Latvia' },
  turkey:       { ...d5(0.52, 0.65, 0.70, 0.42), label: 'Turkey' },
  russia:       { ...d5(0.45, 0.55, 0.55, 0.45), label: 'Russia' },

  // ── Asia-Pacific ─────────────────────────────────────────────
  china:        { ...d5(0.85, 0.85, 0.30, 0.72), label: 'China', note: 'Mass state-led AI adoption; labour market highly dynamic' },
  japan:        { ...d5(0.68, 0.38, 0.28, 0.80), label: 'Japan', note: 'Lifetime employment culture = cautious enterprise AI tool adoption (0.68 vs 0.78 research output). Strong AI research does not translate to enterprise deployment speed. Seniority norms resist AI performance monitoring.' },
  south_korea:  { ...d5(0.82, 0.60, 0.35, 0.82), label: 'South Korea', note: 'Extremely high tech adoption; chaebols driving rapid AI deployment' },
  taiwan:       { ...d5(0.75, 0.55, 0.32, 0.80), label: 'Taiwan', note: 'Semiconductor leadership provides long-term job buffer' },
  singapore:    { ...d5(0.88, 0.70, 0.42, 0.92), label: 'Singapore', note: 'Highest AI readiness in Asia; government-funded reskilling programs' },
  hong_kong:    { ...d5(0.80, 0.72, 0.45, 0.82), label: 'Hong Kong', note: 'Financial hub with high FinTech AI adoption' },
  australia:    { ...d5(0.80, 0.62, 0.48, 0.82), label: 'Australia', note: 'High English proficiency offshore risk; strong commodity/resource base' },
  nz:           { ...d5(0.72, 0.60, 0.50, 0.70), label: 'New Zealand' },
  india:        { ...d5(0.70, 0.75, 0.95, 0.55), label: 'India', note: 'Highest offshore vulnerability: IT and BPO are dominant industries AND the offshore destination. Double exposure.' },
  pakistan:     { ...d5(0.42, 0.70, 0.88, 0.28), label: 'Pakistan' },
  bangladesh:   { ...d5(0.35, 0.72, 0.90, 0.20), label: 'Bangladesh', note: 'Garment sector highly exposed to automation; freelance market growing' },
  srilanka:     { ...d5(0.38, 0.68, 0.85, 0.22), label: 'Sri Lanka' },
  nepal:        { ...d5(0.30, 0.65, 0.88, 0.15), label: 'Nepal' },
  malaysia:     { ...d5(0.62, 0.68, 0.75, 0.52), label: 'Malaysia' },
  indonesia:    { ...d5(0.55, 0.70, 0.80, 0.40), label: 'Indonesia' },
  philippines:  { ...d5(0.58, 0.72, 0.92, 0.38), label: 'Philippines', note: 'BPO capital of Asia — extremely high offshore vulnerability as AI replaces outsourced services' },
  vietnam:      { ...d5(0.52, 0.70, 0.82, 0.42), label: 'Vietnam', note: 'Fast-growing tech workforce; significant nearshore software risk' },
  thailand:     { ...d5(0.50, 0.65, 0.75, 0.40), label: 'Thailand' },
  myanmar:      { ...d5(0.32, 0.68, 0.85, 0.18), label: 'Myanmar' },
  cambodia:     { ...d5(0.28, 0.65, 0.88, 0.15), label: 'Cambodia' },
  israel:       { ...d5(0.88, 0.65, 0.40, 0.95), label: 'Israel', note: 'Highest startup density globally; tech hub strongly offsets exposure' },

  // ── Middle East ───────────────────────────────────────────────
  uae:          { ...d5(0.82, 0.75, 0.50, 0.80), label: 'UAE', note: 'Major AI national strategy; government AI adoption is highest in region' },
  saudi:        { ...d5(0.75, 0.78, 0.55, 0.65), label: 'Saudi Arabia', note: 'Vision 2030 AI investment; high public sector AI automation plan' },
  qatar:        { ...d5(0.72, 0.72, 0.52, 0.62), label: 'Qatar' },
  kuwait:       { ...d5(0.65, 0.70, 0.55, 0.52), label: 'Kuwait' },
  bahrain:      { ...d5(0.62, 0.68, 0.52, 0.52), label: 'Bahrain' },
  oman:         { ...d5(0.58, 0.68, 0.55, 0.45), label: 'Oman' },
  egypt:        { ...d5(0.45, 0.72, 0.80, 0.32), label: 'Egypt' },
  jordan:       { ...d5(0.42, 0.65, 0.78, 0.30), label: 'Jordan' },

  // ── Africa ───────────────────────────────────────────────────
  south_africa: { ...d5(0.55, 0.65, 0.72, 0.42), label: 'South Africa', note: 'Significant BPO sector; high unemployment intensifies AI displacement' },
  nigeria:      { ...d5(0.42, 0.70, 0.78, 0.30), label: 'Nigeria' },
  kenya:        { ...d5(0.45, 0.65, 0.75, 0.32), label: 'Kenya', note: 'Growing tech hub (Silicon Savannah); M-Pesa fintech innovation' },
  ghana:        { ...d5(0.38, 0.62, 0.76, 0.28), label: 'Ghana' },
  ethiopia:     { ...d5(0.28, 0.60, 0.78, 0.18), label: 'Ethiopia' },
  morocco:      { ...d5(0.42, 0.63, 0.75, 0.30), label: 'Morocco', note: 'Growing nearshore destination for EU; high BPO risk' },

  // ── Fallback ──────────────────────────────────────────────────
  other:        { ...d5(0.55, 0.60, 0.65, 0.45), label: 'Other' },
};

/**
 * Get the D5 score for a country key.
 * Returns 50 (moderate) for unknown keys.
 */
export const getCountryD5Score = (countryKey: string): number => {
  const profile = COUNTRY_RISK_PROFILES[countryKey];
  if (!profile) return 50;
  return profile.d5Score;
};

/**
 * Get full country profile for display purposes.
 */
export const getCountryProfile = (countryKey: string): CountryRiskProfile | null => {
  return COUNTRY_RISK_PROFILES[countryKey] ?? null;
};
