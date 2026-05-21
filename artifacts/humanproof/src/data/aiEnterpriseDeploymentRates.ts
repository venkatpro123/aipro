// aiEnterpriseDeploymentRates.ts — Enterprise AI tool deployment rates by country × role category.
//
// PURPOSE: Feeds the D1 (task automatability) country multiplier in the main scoring engine.
//
// WHY THIS EXISTS (three distinct gaps this fixes):
//
//   1. THE BUG: The main engine (`layoffScoreEngine.ts`) called calculateRoleExposureScore()
//      without any country adjustment, giving every user globally the same D1 as a US worker.
//      calculateD1() with country awareness existed but was only wired to the legacy
//      LayoffCalculator UI, not the audit pipeline. This file + the engine fix close that gap.
//
//   2. BETRIEBSRAT CONSTRAINT (Germany): German Works Councils (Betriebsrat) must approve
//      any AI tool that monitors, evaluates, or rates employee work under BetrVG §87(1)6.
//      This applies specifically to: AI code quality monitoring (QA/SWE), AI productivity
//      tracking (BPO/ops), AI performance scoring (HR). Enterprise deployment in Germany for
//      these categories is structurally slower than the country's general adoption speed.
//      The flat aiAdoptionSpeed=0.75 in countryRiskProfile.ts does NOT capture this —
//      it would give Germany QA and Germany SWE the same D1 multiplier, which is wrong.
//
//   3. INDIA IT SERVICES CLIENT-SIDE SPLIT: A QA engineer at TCS working on a US bank's
//      codebase has D1 determined by the US bank's AI deployment (high), not TCS's internal
//      adoption (also high but for different reasons). For IT services roles, client-side
//      adoption is the governing signal. Since major Indian IT services firms predominantly
//      serve US/EU clients, the effective enterprise deployment rate for these roles is
//      significantly higher than India's national aiAdoptionSpeed would suggest.
//
//   4. JAPAN ENTERPRISE CONSERVATISM: Japan's aiAdoptionSpeed=0.78 was derived from AI
//      research output and patent filing rates — not from enterprise deployment rates.
//      Enterprise AI adoption in Japan lags research output significantly due to lifetime
//      employment culture, seniority-based promotion norms, and risk-averse decision-making.
//      Actual enterprise AI tool deployment for monitored/evaluated roles is closer to 0.40-0.55.
//
//   5. SINGAPORE AISG BOOST: The AI Singapore (AISG) national program provides direct
//      enterprise AI deployment subsidies and accelerates adoption beyond what the country's
//      general tech readiness score captures. Specific role categories benefit more than others.
//
// DATA SOURCES: GitHub Copilot enterprise rollout reports (Microsoft FY2026 Q1), McKinsey
// Global AI Survey 2025, Bundesagentur für Arbeit AI adoption research, NASSCOM AI adoption
// report 2025, AISG annual report 2025, World Economic Forum Future of Jobs 2025.
//
// LABELED: ESTIMATED — all rates are research-derived estimates, not measured deployment data.
// These represent the fraction of enterprises in that market actively deploying AI tools
// for the specific role category (not individual user adoption, but enterprise rollout rate).

import { COUNTRY_RISK_PROFILES } from './countryRiskProfile';
import { countryCodeToD5Key } from './companyDatabase';

// ── Role deployment categories ────────────────────────────────────────────────
// Maps to role type prefixes in roleExposureData and ROLE_COMPLEXITY_MAP.
// More granular than industry — "software engineering" and "QA" have very different
// enterprise AI deployment profiles even within the same company.

export type RoleDeploymentCategory =
  | 'qa_testing'           // QA engineers, test automation, manual testing
  | 'bpo_operations'       // BPO analysts, data entry, operations, call center
  | 'sw_engineering'       // Software development, code review, architecture
  | 'content_creation'     // Writers, editors, content marketers, social media
  | 'data_analytics'       // Data analysts, BI, reporting (not ML engineering)
  | 'sales_ops'            // Sales reps, account managers, CRM users
  | 'hr_people'            // HR generalists, recruiters, people ops
  | 'finance_accounting'   // Finance analysts, accountants, FP&A
  | 'legal_compliance'     // Legal counsel, compliance, DPO
  | 'design_creative'      // UX designers, graphic designers, video editors
  | 'ml_ai_engineering'    // ML engineers, AI researchers (slower to self-automate)
  | 'general';             // Default for uncategorized roles

// ── Enterprise AI deployment rate by country × role category ─────────────────
// Rate: 0–1 = fraction of enterprises actively deploying AI tools for this role.
// This is NOT the same as "AI capability exists" (D1 base) or "user adoption rate."
// It specifically captures enterprise rollout decisions — the gating factor for
// whether a worker's actual tasks are being automated RIGHT NOW.

interface DeploymentEntry {
  rate: number;
  /** Key constraints/accelerators driving this number */
  note?: string;
  /** True when Betriebsrat (BetrVG §87(1)6) approval is a structural gate */
  betriebsratGated?: boolean;
  /** True when client-side adoption governs rather than employer's own deployment */
  clientSideGoverned?: boolean;
}

// country keys match countryRiskProfile.ts COUNTRY_RISK_PROFILES keys
const ENTERPRISE_DEPLOYMENT_RATES: Record<RoleDeploymentCategory, Record<string, DeploymentEntry>> = {

  qa_testing: {
    // QA is the highest-velocity category: GitHub Copilot test gen, Testim, Mabl, Katalon
    usa:       { rate: 0.62, note: 'GitHub Copilot test gen + AI test platforms at 50%+ Fortune 500 engineering' },
    germany:   { rate: 0.28, note: 'Betriebsrat approval required for AI code quality monitoring (BetrVG §87(1)6)', betriebsratGated: true },
    singapore: { rate: 0.70, note: 'AISG national AI program accelerates QA automation; SmartNation initiative' },
    india:     { rate: 0.52, note: 'Internal adoption high; IT services QA rate governed by US/EU client deployment', clientSideGoverned: true },
    japan:     { rate: 0.35, note: 'Enterprise AI test tools adoption cautious; lifetime employment culture resists automated performance measurement' },
    uk:        { rate: 0.55, note: 'Strong FinTech/tech adoption; moderate vs US due to smaller Copilot Enterprise footprint' },
    canada:    { rate: 0.58, note: 'Follows US patterns closely; similar Copilot adoption curve' },
    france:    { rate: 0.38, note: 'PSE consultation requirements slow AI deployment decisions; CNIL data concerns' },
    australia: { rate: 0.52, note: 'Strong adoption in SaaS/tech sector; lower in government and banking' },
    sweden:    { rate: 0.55, note: 'High digital openness; union negotiation involved but generally supportive' },
    south_korea:{ rate: 0.60, note: 'Chaebols driving rapid AI deployment; Samsung/Kakao tech ecosystem' },
    china:     { rate: 0.68, note: 'State-led AI mandates; baidu/alibaba AI tools widely deployed' },
    israel:    { rate: 0.75, note: 'Startup ecosystem density = highest test automation adoption globally' },
  },

  bpo_operations: {
    // BPO has the highest absolute deployment; AI replacing data entry, document processing
    usa:       { rate: 0.82, note: 'Automation of BPO tasks at maximum velocity: OCR, NLP, RPA fully deployed' },
    germany:   { rate: 0.45, note: 'AI productivity monitoring requires Betriebsrat approval — slower rollout for surveillance-adjacent tools', betriebsratGated: true },
    singapore: { rate: 0.72, note: 'AISG Process Automation grants; government BPO modernization' },
    india:     { rate: 0.72, note: 'Internal AI adoption rapid (cost efficiency mandate); primary BPO employer-side deployment', clientSideGoverned: true },
    japan:     { rate: 0.48, note: 'Conservative on AI monitoring of operations staff; concern about employee trust' },
    uk:        { rate: 0.72, note: 'High FinTech BPO automation; insurance and banking back-office heavily automated' },
    canada:    { rate: 0.70, note: 'Similar to US; strong RPA adoption in financial services' },
    france:    { rate: 0.48, note: 'Worker surveillance concerns; AI monitoring subject to CNIL restrictions' },
    australia: { rate: 0.65, note: 'Insurance and superannuation back-office automation' },
    philippines:{ rate: 0.75, note: 'BPO capital: employers racing to automate while maintaining volume' },
    poland:    { rate: 0.62, note: 'Major nearshore BPO automation; low labour cost baseline shifting upward' },
  },

  sw_engineering: {
    // SWE: GitHub Copilot is the proxy. 50%+ Fortune 500 reached Q1 2026 per user's data.
    usa:       { rate: 0.55, note: 'GitHub Copilot Enterprise ~50% Fortune 500 Q1 2026; code review AI widespread' },
    germany:   { rate: 0.40, note: 'Copilot adoption slower due to IP ownership concerns + Betriebsrat code monitoring gate', betriebsratGated: true },
    singapore: { rate: 0.62, note: 'AISG AI Trailblazers program subsidizes Copilot; GCC tech adoption accelerated' },
    india:     { rate: 0.58, note: 'High internal adoption (cost efficiency); IT services SWE effective rate governed by client', clientSideGoverned: true },
    japan:     { rate: 0.40, note: 'Conservative adoption despite strong AI research output; lifetime employment limits urgency' },
    uk:        { rate: 0.50, note: 'Strong FinTech SWE automation; slightly below US in overall Copilot penetration' },
    canada:    { rate: 0.52, note: 'Follows US adoption curve with minor lag' },
    israel:    { rate: 0.72, note: 'Highest startup density → fastest Copilot adoption; AI coding tools widely deployed' },
    sweden:    { rate: 0.55, note: 'Digitally forward; union involvement supportive of productivity tools' },
    south_korea:{ rate: 0.55, note: 'Large tech corps (Samsung, Kakao) leading adoption; SME lag' },
    china:     { rate: 0.60, note: 'Baidu Comate + local LLM coding tools; cannot use US tools but domestic alternatives' },
  },

  content_creation: {
    // Content is the most permissive category — no monitoring concerns, pure output quality
    usa:       { rate: 0.80, note: 'AI content tools (Jasper, Claude, GPT) deployed at most US marketing orgs' },
    germany:   { rate: 0.62, note: 'AI content tools less restricted (output monitoring, not employee monitoring)' },
    singapore: { rate: 0.72, note: 'High digital marketing sector; AISG media program' },
    india:     { rate: 0.68, note: 'Rapid adoption for content at scale; price-efficient AI content strongly adopted' },
    japan:     { rate: 0.52, note: 'Adoption growing but concerns about brand voice consistency with AI generation' },
    france:    { rate: 0.58, note: 'Strong creative industry adoption; AI as creative assistant well-accepted' },
    uk:        { rate: 0.72, note: 'Media and advertising AI adoption high' },
  },

  data_analytics: {
    // Data: strong BI/analytics AI adoption; varies by sector
    usa:       { rate: 0.72, note: 'Tableau AI, Power BI Copilot, dbt broadly deployed' },
    germany:   { rate: 0.55, note: 'Data monitoring AI less restricted; dashboard AI widely adopted' },
    singapore: { rate: 0.68, note: 'Government Smart Nation data analytics push' },
    india:     { rate: 0.62, note: 'Strong data engineering adoption; both internal and client-side' },
    japan:     { rate: 0.48, note: 'Traditional BI tools dominant; AI analytics adoption cautious' },
    uk:        { rate: 0.68, note: 'Financial data analytics AI strong adoption' },
    south_korea:{ rate: 0.62, note: 'Tech-forward corporations driving data AI' },
  },

  sales_ops: {
    // Sales AI (CRM, predictive outreach, PLG) widely deployed
    usa:       { rate: 0.68, note: 'Salesforce Einstein, HubSpot AI, Gong deployed at most enterprise sales orgs' },
    germany:   { rate: 0.50, note: 'Sales monitoring AI (call recording, conversation intelligence) requires Betriebsrat approval', betriebsratGated: true },
    singapore: { rate: 0.62, note: 'APAC enterprise sales AI adoption growing' },
    india:     { rate: 0.55, note: 'CRM AI adoption growing; Zoho AI widely used' },
    japan:     { rate: 0.42, note: 'Relationship-first sales culture resists AI sales scripts' },
    uk:        { rate: 0.62, note: 'Strong SaaS sales AI adoption' },
  },

  hr_people: {
    // HR AI: ATS, performance management AI — monitoring concerns in EU
    usa:       { rate: 0.60, note: 'HRIS AI, ATS automation, performance review AI broadly deployed' },
    germany:   { rate: 0.35, note: 'AI performance scoring requires Betriebsrat approval (BetrVG §87 1(6)); cautious deployment', betriebsratGated: true },
    singapore: { rate: 0.58, note: 'MOM fair hiring framework acceptance of AI in recruitment' },
    india:     { rate: 0.55, note: 'ATS AI widely adopted; performance review AI less so' },
    japan:     { rate: 0.40, note: 'HR AI conflicts with seniority-based promotion norms; slow adoption' },
    uk:        { rate: 0.55, note: 'AI recruitment tools widely used; EHRC guidance limits scoring scope' },
    france:    { rate: 0.40, note: 'CNIL strict on AI in HR decision-making; AI Act high-risk classification' },
  },

  finance_accounting: {
    usa:       { rate: 0.70, note: 'AI CFO tools, automated reconciliation, Bloomberg AI broadly deployed' },
    germany:   { rate: 0.58, note: 'Financial AI less restricted; audit AI tools widely adopted' },
    singapore: { rate: 0.65, note: 'MAS-supported FinTech AI deployment' },
    india:     { rate: 0.60, note: 'Zoho Books AI, RPA in finance widely adopted' },
    japan:     { rate: 0.50, note: 'Traditional audit norms slow AI reconciliation adoption' },
    uk:        { rate: 0.68, note: 'Strong FinTech AI adoption (London hub)' },
  },

  legal_compliance: {
    usa:       { rate: 0.55, note: 'Legal AI (Harvey, Clio, Westlaw AI) adoption in BigLaw and compliance' },
    germany:   { rate: 0.45, note: 'Legal AI adoption cautious; professional secrecy rules limit data use' },
    singapore: { rate: 0.52, note: 'Smart law initiative; compliance AI in FSI sector' },
    india:     { rate: 0.48, note: 'Legal AI emerging; corporate compliance AI growing' },
    japan:     { rate: 0.35, note: 'Very cautious adoption in legal; strict confidentiality norms' },
    uk:        { rate: 0.58, note: 'Legal AI adoption among UK BigLaw firms growing rapidly' },
  },

  design_creative: {
    usa:       { rate: 0.75, note: 'Adobe Firefly, Midjourney, Figma AI broadly deployed in US design orgs' },
    germany:   { rate: 0.60, note: 'Design AI adopted without monitoring concern; creative tools permissive' },
    singapore: { rate: 0.68, note: 'Creative industry AI strong' },
    india:     { rate: 0.65, note: 'AI design tools adopted for cost efficiency' },
    japan:     { rate: 0.55, note: 'Strong design tradition; AI design accepted but with quality review emphasis' },
    uk:        { rate: 0.70, note: 'Advertising and media AI adoption high' },
  },

  ml_ai_engineering: {
    // ML engineers build AI — their own displacement is slowest (use AI to build better AI)
    usa:       { rate: 0.40, note: 'AI coding assistants used; automation of ML workflows early stage' },
    germany:   { rate: 0.35, note: 'Deployment cautious; ML engineers less affected by own tools' },
    singapore: { rate: 0.45, note: 'AISG research program; active ML engineering community' },
    india:     { rate: 0.40, note: 'ML engineering roles growing; self-automation is slowest category' },
    japan:     { rate: 0.35, note: 'Research-strong but enterprise ML deployment conservative' },
    israel:    { rate: 0.50, note: 'Startup ecosystem; ML engineers most likely to be automated by own tools early' },
  },

  general: {
    // Catch-all for uncategorized roles — uses country aiAdoptionSpeed directly
    usa:       { rate: 0.60 },
    germany:   { rate: 0.45 },
    singapore: { rate: 0.65 },
    india:     { rate: 0.55 },
    japan:     { rate: 0.40 },
    uk:        { rate: 0.55 },
    canada:    { rate: 0.55 },
    france:    { rate: 0.42 },
    australia: { rate: 0.52 },
    sweden:    { rate: 0.58 },
    south_korea:{ rate: 0.58 },
    china:     { rate: 0.60 },
    israel:    { rate: 0.65 },
    uae:       { rate: 0.58 },
    netherlands:{ rate: 0.55 },
    ireland:   { rate: 0.58 },
  },
};

// ── Role title → deployment category mapping ──────────────────────────────────

const ROLE_TO_CATEGORY_PATTERNS: Array<[RegExp, RoleDeploymentCategory]> = [
  [/qa|quality assurance|tester|test engineer|test automation|sdet/i, 'qa_testing'],
  [/bpo|data entry|call cent|agent|back.?office|process analyst|operations analyst|customer support/i, 'bpo_operations'],
  [/software engineer|swe|developer|backend|frontend|full.?stack|devops|sre|platform engineer|mobile dev|web dev/i, 'sw_engineering'],
  [/content|writer|editor|copywriter|social media|blogger|seo|marketing writer/i, 'content_creation'],
  [/data analyst|bi |business intelligence|data science|analytics|reporting analyst/i, 'data_analytics'],
  [/sales|account executive|account manager|bdr|sdr|business development/i, 'sales_ops'],
  [/hr |human resources|recruiter|people ops|talent acquisition|hrbp/i, 'hr_people'],
  [/finance|accounting|accountant|fp&?a|controller|cfo|bookkeeper|payroll|revenue ops/i, 'finance_accounting'],
  [/legal|lawyer|counsel|compliance|paralegal|dpo|data protection/i, 'legal_compliance'],
  [/design|designer|ux|ui|graphic|illustrator|video editor|motion|creative/i, 'design_creative'],
  [/ml engineer|machine learning|ai engineer|mlops|deep learning|research scientist/i, 'ml_ai_engineering'],
];

export function resolveRoleDeploymentCategory(roleTitle: string | null | undefined): RoleDeploymentCategory {
  if (!roleTitle) return 'general';
  for (const [pattern, category] of ROLE_TO_CATEGORY_PATTERNS) {
    if (pattern.test(roleTitle)) return category;
  }
  return 'general';
}

// ── India IT services client-side proxy ──────────────────────────────────────
// For IT services companies (TCS, Infosys, Wipro, Cognizant, etc.), the
// client-side AI adoption is the governing factor for D1, not the employer's.
// Since major Indian IT firms predominantly serve US (40%), EU (25%), and
// UK (15%) clients, we proxy client-side adoption as a weighted average.
// This is why India IT QA (0.52) is higher than Japan QA (0.35) despite
// similar national adoption speeds — the US client's Copilot deployment governs.

const IT_SERVICES_CLIENT_WEIGHT: Record<RoleDeploymentCategory, number> = {
  // How much client-side adoption lifts the India IT rate above national baseline
  // 0 = employer's rate governs, 1 = 100% client-side proxy (US-weighted average)
  qa_testing:        0.70,  // QA is driven by client's dev environment almost entirely
  sw_engineering:    0.65,  // Code written in client's repo → client's Copilot deployment governs
  bpo_operations:    0.25,  // BPO is internal (India employer drives automation)
  content_creation:  0.20,  // Content owned by employer's platform
  data_analytics:    0.50,  // Depends on client's data stack
  sales_ops:         0.10,  // Internal sales tools
  hr_people:         0.05,  // Internal HR
  finance_accounting:0.40,  // F&A often client's systems
  legal_compliance:  0.30,
  design_creative:   0.20,
  ml_ai_engineering: 0.40,
  general:           0.35,
};

// US-weighted client deployment rate (40% US + 25% EU/DE + 15% UK + 20% other)
function getIndiaClientSideProxy(category: RoleDeploymentCategory): number {
  const usRate   = ENTERPRISE_DEPLOYMENT_RATES[category]['usa']?.rate   ?? 0.60;
  const deRate   = ENTERPRISE_DEPLOYMENT_RATES[category]['germany']?.rate ?? 0.45;
  const ukRate   = ENTERPRISE_DEPLOYMENT_RATES[category]['uk']?.rate    ?? 0.55;
  const otherRate = ENTERPRISE_DEPLOYMENT_RATES[category]['general']?.rate ?? 0.50;
  return (usRate * 0.40) + (deRate * 0.25) + (ukRate * 0.15) + (otherRate * 0.20);
}

// ── Core computation ──────────────────────────────────────────────────────────

export interface D1CountryMultiplierResult {
  multiplier: number;         // 0.80–1.10: apply to D1 base score
  enterpriseDeploymentRate: number;  // 0–1: enterprise deployment rate used
  category: RoleDeploymentCategory;
  countryKey: string;
  betriebsratGated: boolean;
  clientSideGoverned: boolean;
  note: string;
  labeledAs: 'ESTIMATED';
}

/**
 * Compute the D1 country multiplier for a specific role in a specific country.
 *
 * This replaces the flat aiAdoptionSpeed from countryRiskProfile.ts with a
 * role-category × country specific enterprise deployment rate.
 *
 * Formula: multiplier = 0.80 + (deploymentRate × 0.30) - (labourFlexibility × 0.10)
 *   - Range: ~0.80 (low deployment, protective labour law) to ~1.07 (high deployment)
 *   - USA QA (0.62, flex 0.80): 0.80 + 0.186 - 0.080 = 0.906
 *   - DE QA  (0.28, flex 0.40): 0.80 + 0.084 - 0.040 = 0.844  ← meaningful Betriebsrat effect
 *   - SG QA  (0.70, flex 0.70): 0.80 + 0.210 - 0.070 = 0.940  ← AISG boost
 *   - IN QA  (0.52, flex 0.75): 0.80 + 0.156 - 0.075 = 0.881  ← client-side governed
 *   - JP QA  (0.35, flex 0.38): 0.80 + 0.105 - 0.038 = 0.867  ← cautious enterprise
 */
export function computeD1CountryMultiplier(
  regionCode: string | null | undefined,
  roleTitle: string | null | undefined,
  isITServices: boolean = false,
): D1CountryMultiplierResult {
  const countryKey = regionCode
    ? countryCodeToD5Key(regionCode.toLowerCase())
    : 'usa';

  const category = resolveRoleDeploymentCategory(roleTitle);
  const categoryRates = ENTERPRISE_DEPLOYMENT_RATES[category];

  // Resolve base enterprise deployment rate for this country + category
  let deploymentEntry: DeploymentEntry | undefined = categoryRates[countryKey];

  // Fall back to 'general' category if not found for this specific country
  if (!deploymentEntry) {
    deploymentEntry = categoryRates['general'] ?? ENTERPRISE_DEPLOYMENT_RATES['general'][countryKey];
  }

  // Fall back to country's aiAdoptionSpeed from countryRiskProfile when not in table
  const countryProfile = COUNTRY_RISK_PROFILES[countryKey];
  let deploymentRate = deploymentEntry?.rate ?? countryProfile?.aiAdoptionSpeed ?? 0.55;

  // India IT services: blend employer rate with client-side proxy
  let clientSideGoverned = deploymentEntry?.clientSideGoverned ?? false;
  if (isITServices && countryKey === 'india') {
    const clientWeight = IT_SERVICES_CLIENT_WEIGHT[category];
    const clientProxy = getIndiaClientSideProxy(category);
    deploymentRate = deploymentRate * (1 - clientWeight) + clientProxy * clientWeight;
    clientSideGoverned = clientWeight > 0.30;  // flag when client-side dominates
  }

  // Apply multiplier formula (labour flexibility from countryProfile)
  const labourFlex = countryProfile?.labourFlexibility ?? 0.60;
  const rawMultiplier = 0.80 + (deploymentRate * 0.30) - (labourFlex * 0.10);
  const multiplier = Math.min(1.10, Math.max(0.80, rawMultiplier));

  const betriebsratGated = deploymentEntry?.betriebsratGated ?? false;
  const note = deploymentEntry?.note
    ?? `No category-specific rate for ${countryKey}/${category} — using country baseline`;

  return {
    multiplier: Math.round(multiplier * 1000) / 1000,
    enterpriseDeploymentRate: Math.round(deploymentRate * 1000) / 1000,
    category,
    countryKey,
    betriebsratGated,
    clientSideGoverned,
    note,
    labeledAs: 'ESTIMATED',
  };
}
