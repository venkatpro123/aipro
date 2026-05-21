// parentSubsidiaryRegistry.ts — Global parent→subsidiary footprint registry.
//
// Maps parent company name patterns to their known subsidiary offices by region,
// with office function classification and entity dependence scores.
//
// WHY OFFICE FUNCTION MATTERS:
//   Google London (EMEA revenue/sales) and Google Hyderabad (engineering GCC)
//   face fundamentally different propagation risk from a Sunnyvale announcement.
//   London protects EMEA deals in-flight — cutting it kills revenue. Hyderabad
//   is a cost centre building core product — cutting requires project cancellation.
//   Singapore (APAC operations) is consolidatable — intermediate vulnerability.
//
// KEY DESIGN: dependenceScore (0–1) × functionMultiplier × parentRiskSignal
//   = subsidiary propagation risk.
//
// ESTIMATED — all profiles derived from published headcount data, company
// filings, and documented GCC/subsidiary patterns (2024–2026).

export type OfficeFunction =
  | 'engineering_hub'      // building core parent product: GCC software/AI/platform teams
  | 'engineering_rd'       // R&D lab: research, not yet product (lower headcount risk from restructuring)
  | 'regional_revenue'     // generating local market revenue: EMEA/APAC sales, account management
  | 'regional_operations'  // operating regional processes: APAC ops, EMEA ops, delivery
  | 'shared_services'      // finance, HR, IT, admin — no direct revenue or product link
  | 'support_operations'   // customer support, success, implementation
  | 'eu_hq'                // European HQ with legal autonomy (Dublin, Amsterdam, Zurich)
  | 'sales_office'         // small/mid sales office, revenue-generating but smaller scale
  | 'mixed';               // multi-function; risk averaged

export type EntityIndependence =
  | 'captive'           // wholly owned, decisions made by parent
  | 'semi_independent'  // local leadership, some autonomy (especially on legal/regulatory)
  | 'independent';      // local entity with own P&L, parent is investor not operator

export interface SubsidiaryProfile {
  region: string;                  // ISO country code: 'IN', 'GB', 'SG', 'DE', 'IE', 'IL', etc.
  /** City/location patterns that identify this specific subsidiary (lowercase) */
  cityHints: readonly string[];
  officeFunction: OfficeFunction;
  independence: EntityIndependence;
  /** 0–1: how much this subsidiary follows parent workforce decisions (1 = fully captive) */
  dependenceScore: number;
  /** ESTIMATED local headcount (order of magnitude) */
  estimatedHeadcount: 'small' | 'medium' | 'large';
  /** How much revenue this location generates in its local market */
  revenueContribution: 'none' | 'low' | 'medium' | 'high';
  /** Key protection factors specific to this location's function */
  protectionFactors: readonly string[];
  /** Key vulnerability factors specific to this location's function */
  vulnerabilityFactors: readonly string[];
}

export interface ParentCompanyProfile {
  parentName: string;
  parentCountry: 'US' | 'UK' | 'EU' | 'JP' | 'KR' | 'IN';
  /** Name patterns that identify any entity in this corporate family (lowercase) */
  companyKeys: readonly string[];
  /** Countries where this parent has material subsidiary presence */
  subsidiaries: readonly SubsidiaryProfile[];
}

// ── Office function propagation profiles ─────────────────────────────────────

export interface OfficeFunctionPropagationProfile {
  /** 0–1: fraction of parent risk transmitted to this function. 0.40 = 40% of parent risk score. */
  propagationMultiplier: number;
  /** Expected months from parent announcement to subsidiary action */
  lagMonthsMin: number;
  lagMonthsMax: number;
  /** Human narrative for the UI */
  narrative: string;
}

export const OFFICE_FUNCTION_PROPAGATION: Record<OfficeFunction, OfficeFunctionPropagationProfile> = {
  engineering_hub: {
    propagationMultiplier: 0.52,
    lagMonthsMin: 6,
    lagMonthsMax: 12,
    narrative:
      'Engineering GCCs building core parent product are the most protected type of subsidiary. ' +
      'Cuts require project cancellations at the parent — not just efficiency targets. ' +
      'Historical pattern (Google, Microsoft, Amazon 2023): engineering GCCs followed 6–12 months ' +
      'after the HQ announcement, and at lower depth (2–4% vs parent 5–10%).',
  },
  engineering_rd: {
    propagationMultiplier: 0.42,
    lagMonthsMin: 9,
    lagMonthsMax: 18,
    narrative:
      'R&D labs (not yet in product) are among the most protected. Research is long-horizon; ' +
      'cutting a lab destroys 3–5 years of investment. Labs are cut only in existential restructurings. ' +
      'Examples: Google DeepMind London, Microsoft Research Cambridge — minimal cuts in 2023 waves.',
  },
  regional_revenue: {
    propagationMultiplier: 0.38,
    lagMonthsMin: 8,
    lagMonthsMax: 18,
    narrative:
      'Revenue-generating EMEA/APAC offices are the last cut in most restructurings. ' +
      'Cutting London EMEA mid-sales-cycle destroys deals in progress. Client relationships ' +
      'cannot be instantly transferred remotely. Protected while the region hits revenue targets; ' +
      'vulnerable if the region misses OR if parent exits the market entirely.',
  },
  regional_operations: {
    propagationMultiplier: 0.66,
    lagMonthsMin: 3,
    lagMonthsMax: 9,
    narrative:
      'Regional operations hubs (Singapore APAC ops) are moderately vulnerable. ' +
      'Operations can be consolidated into fewer, larger hubs — this is a common cost-reduction lever. ' +
      'Cuts typically happen in the second phase of a restructuring (6 months after HQ announcement) ' +
      'as the parent optimises its operational footprint.',
  },
  shared_services: {
    propagationMultiplier: 0.84,
    lagMonthsMin: 1,
    lagMonthsMax: 5,
    narrative:
      'Shared services (finance, HR, admin, IT) are the first cut in any restructuring. ' +
      'No direct revenue or product link. Highly automatable with AI tools. ' +
      'Consolidatable across regions into a single global team. ' +
      'If parent announces cuts and your role is shared services, treat this as a high-urgency signal.',
  },
  support_operations: {
    propagationMultiplier: 0.76,
    lagMonthsMin: 2,
    lagMonthsMax: 7,
    narrative:
      'Customer support and success operations face rapid AI displacement (Tier-1 support) ' +
      'and offshore consolidation. When parent restructures, support headcount is typically ' +
      'in the second wave (2–4 months after announcement).',
  },
  eu_hq: {
    propagationMultiplier: 0.52,
    lagMonthsMin: 6,
    lagMonthsMax: 15,
    narrative:
      'EU headquarters entities (Dublin, Amsterdam, Zurich) are legally distinct — parent ' +
      'workforce decisions must navigate local Works Councils, GDPR compliance mandates, ' +
      'and country-specific notice periods. EU AI Act compliance creates new demand for ' +
      'retained legal/technical expertise. Expected lag: 6–15 months vs parent announcement.',
  },
  sales_office: {
    propagationMultiplier: 0.46,
    lagMonthsMin: 4,
    lagMonthsMax: 12,
    narrative:
      'Sales offices follow revenue performance, not parent headcount decisions. ' +
      'Protected while quota is met; vulnerable when the region misses or the parent ' +
      'shifts to PLG (product-led growth) reducing the sales-assist model. ' +
      'Cuts are typically quota-performance-driven, not contagion-driven.',
  },
  mixed: {
    propagationMultiplier: 0.60,
    lagMonthsMin: 3,
    lagMonthsMax: 10,
    narrative:
      'This office has mixed functions — engineering, operations, and sales coexist. ' +
      'Propagation risk is averaged across function types. Individual role function ' +
      'is the stronger predictor than office-level classification.',
  },
};

// ── Parent company registry ───────────────────────────────────────────────────

export const PARENT_SUBSIDIARY_REGISTRY: readonly ParentCompanyProfile[] = [

  // ── Alphabet / Google ─────────────────────────────────────────────────────
  {
    parentName: 'Alphabet / Google',
    parentCountry: 'US',
    companyKeys: ['google', 'alphabet', 'deepmind', 'waymo'],
    subsidiaries: [
      {
        region: 'IN',
        cityHints: ['hyderabad', 'bangalore', 'bengaluru', 'mumbai', 'gurgaon', 'pune', 'india'],
        officeFunction: 'engineering_hub',
        independence: 'captive',
        dependenceScore: 0.72,
        estimatedHeadcount: 'large',
        revenueContribution: 'none',
        protectionFactors: [
          'Core search, YouTube, Cloud infrastructure engineering',
          'Android and Maps platform teams based in Hyderabad/Bangalore',
          'Lower cost basis than US — Google India SWE is cost-efficient, not redundant',
        ],
        vulnerabilityFactors: [
          'Project cancellations or product sunsetting at HQ (e.g. Stadia, Jamboard)',
          'AI code generation reducing headcount requirements for augmentation roles',
          'Consolidation into fewer India cities (Bangalore-primary model)',
        ],
      },
      {
        region: 'GB',
        cityHints: ['london', 'uk', 'england', 'manchester', 'edinburgh'],
        officeFunction: 'mixed',  // London: both EMEA revenue + DeepMind R&D
        independence: 'semi_independent',
        dependenceScore: 0.55,
        estimatedHeadcount: 'large',
        revenueContribution: 'high',
        protectionFactors: [
          'Google DeepMind HQ in London — R&D lab, minimal cut risk',
          'EMEA advertising revenue sold through London entity (high revenue contribution)',
          'GDPR/AI Act compliance requires retained EU/UK legal expertise',
        ],
        vulnerabilityFactors: [
          'Non-DeepMind roles (ops, finance, HR) follow standard GCC vulnerability',
          'Google UK revenue tied to broader EMEA advertising market conditions',
        ],
      },
      {
        region: 'SG',
        cityHints: ['singapore', 'sg'],
        officeFunction: 'regional_operations',
        independence: 'semi_independent',
        dependenceScore: 0.62,
        estimatedHeadcount: 'medium',
        revenueContribution: 'medium',
        protectionFactors: [
          'APAC regional hub — timezone coverage and local market knowledge',
          'Google Cloud APAC expansion hub (growing revenue function)',
        ],
        vulnerabilityFactors: [
          'Operations roles consolidatable to Hyderabad or Tokyo hub',
          'Singapore costs are high relative to alternatives — a cost-efficiency target',
        ],
      },
      {
        region: 'IE',
        cityHints: ['dublin', 'ireland'],
        officeFunction: 'eu_hq',
        independence: 'semi_independent',
        dependenceScore: 0.50,
        estimatedHeadcount: 'medium',
        revenueContribution: 'high',
        protectionFactors: [
          'EU headquarters entity — legal autonomy under GDPR and EU AI Act',
          'EU Works Council provisions delay any workforce decisions 6+ months',
          'Tax structure tied to Ireland entity — structural change is expensive',
        ],
        vulnerabilityFactors: [
          'Non-revenue functions (HR, finance, support) at Dublin still cut in downturns',
        ],
      },
      {
        region: 'DE',
        cityHints: ['munich', 'hamburg', 'berlin', 'frankfurt', 'germany'],
        officeFunction: 'regional_revenue',
        independence: 'semi_independent',
        dependenceScore: 0.50,
        estimatedHeadcount: 'medium',
        revenueContribution: 'high',
        protectionFactors: [
          'Germany is EMEA\'s largest ad market — cutting Germany sales destroys EMEA revenue',
          'Betriebsrat (BetrVG) adds 90–180 days to any dismissal process',
        ],
        vulnerabilityFactors: [
          'Germany advertising market cyclicality — cuts follow revenue misses, not HQ decisions',
        ],
      },
    ],
  },

  // ── Microsoft ─────────────────────────────────────────────────────────────
  {
    parentName: 'Microsoft',
    parentCountry: 'US',
    companyKeys: ['microsoft', 'ms azure', 'github', 'linkedin'],
    subsidiaries: [
      {
        region: 'IN',
        cityHints: ['hyderabad', 'bangalore', 'bengaluru', 'noida', 'pune', 'india'],
        officeFunction: 'engineering_hub',
        independence: 'captive',
        dependenceScore: 0.70,
        estimatedHeadcount: 'large',
        revenueContribution: 'none',
        protectionFactors: [
          'Azure cloud infrastructure engineering (critical path)',
          'Microsoft IDC (India Development Centre) — core Windows, Office, Azure teams',
          'Scale AI and Responsible AI teams expanding in Hyderabad (2024–2026)',
        ],
        vulnerabilityFactors: [
          'Augmentation/support roles for US teams most at risk',
          'Jan 2023: Microsoft cut ~800 India roles alongside 10k global (8% local)',
        ],
      },
      {
        region: 'GB',
        cityHints: ['london', 'reading', 'uk', 'england', 'edinburgh', 'manchester'],
        officeFunction: 'mixed',
        independence: 'semi_independent',
        dependenceScore: 0.55,
        estimatedHeadcount: 'medium',
        revenueContribution: 'high',
        protectionFactors: [
          'Microsoft Research Cambridge (R&D lab, minimal cut risk)',
          'UK is Microsoft\'s largest European revenue market',
        ],
        vulnerabilityFactors: [
          'Non-R&D roles follow EMEA headcount decisions from HQ',
        ],
      },
      {
        region: 'SG',
        cityHints: ['singapore'],
        officeFunction: 'regional_operations',
        independence: 'semi_independent',
        dependenceScore: 0.62,
        estimatedHeadcount: 'medium',
        revenueContribution: 'medium',
        protectionFactors: ['APAC Azure expansion hub (growing)'],
        vulnerabilityFactors: ['Operations and sales roles consolidatable to India hub'],
      },
      {
        region: 'IE',
        cityHints: ['dublin', 'ireland'],
        officeFunction: 'eu_hq',
        independence: 'semi_independent',
        dependenceScore: 0.48,
        estimatedHeadcount: 'medium',
        revenueContribution: 'high',
        protectionFactors: ['EU HQ legal structure provides 6-15 month protection window'],
        vulnerabilityFactors: ['Support and HR functions still at risk in restructurings'],
      },
      {
        region: 'IL',
        cityHints: ['israel', 'tel aviv', 'herzliya', 'netanya'],
        officeFunction: 'engineering_rd',
        independence: 'semi_independent',
        dependenceScore: 0.55,
        estimatedHeadcount: 'medium',
        revenueContribution: 'none',
        protectionFactors: [
          'Microsoft Israel develops core security technology (CyberX acquisition)',
          'Deep R&D integration — cutting creates capability gap, not cost saving',
        ],
        vulnerabilityFactors: ['Geopolitical risk premium in hiring/retaining talent adds pressure'],
      },
    ],
  },

  // ── Amazon / AWS ──────────────────────────────────────────────────────────
  {
    parentName: 'Amazon / AWS',
    parentCountry: 'US',
    companyKeys: ['amazon', 'aws', 'amazon web services', 'whole foods tech', 'twitch'],
    subsidiaries: [
      {
        region: 'IN',
        cityHints: ['hyderabad', 'bangalore', 'bengaluru', 'chennai', 'pune', 'india'],
        officeFunction: 'engineering_hub',
        independence: 'captive',
        dependenceScore: 0.73,
        estimatedHeadcount: 'large',
        revenueContribution: 'none',
        protectionFactors: [
          'AWS India engineering teams: EC2, S3 core infra',
          'Alexa and Prime Video India technology teams (product engineering)',
          'Amazon India Pay and Logistics tech teams (local revenue product)',
        ],
        vulnerabilityFactors: [
          'Jan 2023: Amazon cut ~1,000 India roles alongside 18k global (~5.5%)',
          'Augmentation roles for US-based teams most exposed',
          'Amazon Hyderabad office reportedly has higher proportion of support-augmentation',
        ],
      },
      {
        region: 'GB',
        cityHints: ['london', 'manchester', 'edinburgh', 'uk'],
        officeFunction: 'regional_revenue',
        independence: 'semi_independent',
        dependenceScore: 0.58,
        estimatedHeadcount: 'medium',
        revenueContribution: 'high',
        protectionFactors: [
          'Amazon UK is a major e-commerce market — fourth largest globally',
          'AWS EMEA headquarters — direct revenue generation',
        ],
        vulnerabilityFactors: [
          'Non-technical roles (marketing, ops) follow headcount cycles',
          'Amazon UK logistics headcount (warehouse) and tech headcount are separate risk profiles',
        ],
      },
      {
        region: 'SG',
        cityHints: ['singapore'],
        officeFunction: 'regional_operations',
        independence: 'semi_independent',
        dependenceScore: 0.63,
        estimatedHeadcount: 'medium',
        revenueContribution: 'medium',
        protectionFactors: [
          'AWS APAC operations hub — growing revenue function',
          'Regional supply chain and logistics coordination for APAC',
        ],
        vulnerabilityFactors: [
          'High cost of Singapore operations relative to India alternatives',
          'Operations roles consolidatable into Bangalore hub',
        ],
      },
      {
        region: 'DE',
        cityHints: ['berlin', 'munich', 'frankfurt', 'germany'],
        officeFunction: 'regional_revenue',
        independence: 'semi_independent',
        dependenceScore: 0.52,
        estimatedHeadcount: 'medium',
        revenueContribution: 'high',
        protectionFactors: [
          'Germany is Amazon\'s largest European e-commerce market',
          'Betriebsrat protection (90–180 days) for all positions',
        ],
        vulnerabilityFactors: ['Amazon Germany faced works council disputes in 2022-2023'],
      },
    ],
  },

  // ── Meta Platforms ────────────────────────────────────────────────────────
  {
    parentName: 'Meta Platforms',
    parentCountry: 'US',
    companyKeys: ['meta', 'facebook', 'instagram tech', 'whatsapp engineering'],
    subsidiaries: [
      {
        region: 'IN',
        cityHints: ['hyderabad', 'bangalore', 'bengaluru', 'india'],
        officeFunction: 'engineering_hub',
        independence: 'captive',
        dependenceScore: 0.71,
        estimatedHeadcount: 'medium',
        revenueContribution: 'none',
        protectionFactors: [
          'WhatsApp India engineering team (WhatsApp HQ for payments is in India)',
          'Responsible AI and trust & safety teams (India-based, growing)',
        ],
        vulnerabilityFactors: [
          'Meta India is smaller than Google/Microsoft India — more concentrated risk',
          'Augmentation teams for core US product cut first in restructurings',
          '2023 Meta layoffs: India office saw similar depth to global (~13%)',
        ],
      },
      {
        region: 'GB',
        cityHints: ['london', 'uk'],
        officeFunction: 'regional_revenue',
        independence: 'semi_independent',
        dependenceScore: 0.56,
        estimatedHeadcount: 'medium',
        revenueContribution: 'high',
        protectionFactors: [
          'UK advertising market — significant EMEA revenue contribution',
          'Meta UK regulatory team required for UK ICO compliance',
        ],
        vulnerabilityFactors: [
          'Meta UK cost base: London salaries are high relative to EMEA revenue share',
        ],
      },
      {
        region: 'SG',
        cityHints: ['singapore'],
        officeFunction: 'regional_operations',
        independence: 'semi_independent',
        dependenceScore: 0.64,
        estimatedHeadcount: 'medium',
        revenueContribution: 'medium',
        protectionFactors: ['APAC user growth strategy hub'],
        vulnerabilityFactors: ['Operations consolidatable; high cost relative to India alternative'],
      },
      {
        region: 'IE',
        cityHints: ['dublin', 'ireland'],
        officeFunction: 'eu_hq',
        independence: 'semi_independent',
        dependenceScore: 0.50,
        estimatedHeadcount: 'large',
        revenueContribution: 'high',
        protectionFactors: [
          'EU data protection HQ — GDPR compliance requires this entity',
          'Meta Ireland processes EU user data — structural disruption is regulatory risk',
        ],
        vulnerabilityFactors: [
          'Meta EU faces €1.2B GDPR fines — regulatory pressure creates instability',
        ],
      },
    ],
  },

  // ── Apple ─────────────────────────────────────────────────────────────────
  {
    parentName: 'Apple Inc.',
    parentCountry: 'US',
    companyKeys: ['apple india', 'apple singapore', 'apple uk', 'apple germany'],
    subsidiaries: [
      {
        region: 'IN',
        cityHints: ['hyderabad', 'bangalore', 'bengaluru', 'india'],
        officeFunction: 'engineering_hub',
        independence: 'captive',
        dependenceScore: 0.65,
        estimatedHeadcount: 'medium',
        revenueContribution: 'none',
        protectionFactors: [
          'Apple Maps India data team (local product)',
          'Siri and on-device AI engineering team (Hyderabad)',
          'Apple Pay India and UPI integration engineering',
        ],
        vulnerabilityFactors: [
          'Apple has historically low India GCC headcount vs peers — more concentrated',
          'Apple\'s culture of secrecy means India layoffs often unreported until complete',
        ],
      },
      {
        region: 'GB',
        cityHints: ['london', 'uk'],
        officeFunction: 'mixed',
        independence: 'semi_independent',
        dependenceScore: 0.52,
        estimatedHeadcount: 'medium',
        revenueContribution: 'high',
        protectionFactors: ['Apple UK: major retail and financial services market'],
        vulnerabilityFactors: ['Apple UK had minimal 2023 layoffs — stronger protection historically'],
      },
      {
        region: 'SG',
        cityHints: ['singapore'],
        officeFunction: 'regional_operations',
        independence: 'semi_independent',
        dependenceScore: 0.58,
        estimatedHeadcount: 'medium',
        revenueContribution: 'medium',
        protectionFactors: ['Apple Singapore: APAC logistics and supply chain hub'],
        vulnerabilityFactors: ['Apple supply chain centralised in Asia — SG role changes with supply strategy'],
      },
    ],
  },

  // ── Goldman Sachs ─────────────────────────────────────────────────────────
  {
    parentName: 'Goldman Sachs',
    parentCountry: 'US',
    companyKeys: ['goldman sachs', 'goldman', 'gs'],
    subsidiaries: [
      {
        region: 'IN',
        cityHints: ['bangalore', 'bengaluru', 'hyderabad', 'india'],
        officeFunction: 'engineering_hub',
        independence: 'captive',
        dependenceScore: 0.75,
        estimatedHeadcount: 'large',
        revenueContribution: 'none',
        protectionFactors: [
          'Marquee trading platform engineering (proprietary system)',
          'Risk management and compliance technology (regulatory requirement)',
          'GS India: 5,000+ engineers — strategic not marginal',
        ],
        vulnerabilityFactors: [
          'Goldman 2023: India office bore ~proportional share of global 6% cut (~300 India roles)',
          'Middle-office and operations roles (not core trading systems) more exposed',
          'Cost-per-FTE review vs cheaper Indian IT services providers',
        ],
      },
      {
        region: 'GB',
        cityHints: ['london', 'uk'],
        officeFunction: 'regional_revenue',
        independence: 'semi_independent',
        dependenceScore: 0.62,
        estimatedHeadcount: 'large',
        revenueContribution: 'high',
        protectionFactors: [
          'Goldman London is the EMEA primary revenue entity — primary IB revenue',
          'EU passporting rights (pre-Brexit) and UK FCA authorisation',
          'Fixed income and equities trading revenue generated from London',
        ],
        vulnerabilityFactors: [
          'Goldman London cut 5–8% in 2023 alongside global restructuring',
          'UK banking licence requires maintained headcount — floors the cut',
        ],
      },
      {
        region: 'SG',
        cityHints: ['singapore'],
        officeFunction: 'regional_revenue',
        independence: 'semi_independent',
        dependenceScore: 0.60,
        estimatedHeadcount: 'medium',
        revenueContribution: 'high',
        protectionFactors: ['APAC wealth management and IB revenue — Singapore is the hub'],
        vulnerabilityFactors: ['APAC market slowdown triggers Singapore cuts before India or London'],
      },
    ],
  },

  // ── JPMorgan Chase ────────────────────────────────────────────────────────
  {
    parentName: 'JPMorgan Chase',
    parentCountry: 'US',
    companyKeys: ['jpmorgan', 'jp morgan', 'chase', 'jpmorganchase'],
    subsidiaries: [
      {
        region: 'IN',
        cityHints: ['bangalore', 'bengaluru', 'hyderabad', 'mumbai', 'india'],
        officeFunction: 'engineering_hub',
        independence: 'captive',
        dependenceScore: 0.72,
        estimatedHeadcount: 'large',
        revenueContribution: 'none',
        protectionFactors: [
          'JPMorgan India: 50,000+ employees — single largest GCC in India for finance',
          'Core banking platform (Quorum blockchain, Chase mobile) engineering',
          'Risk, compliance, and AML systems — regulatory requirement',
        ],
        vulnerabilityFactors: [
          'Retail banking platform migration to cloud reducing legacy headcount',
          'Operations and call-centre roles (non-engineering) most exposed',
        ],
      },
      {
        region: 'GB',
        cityHints: ['london', 'uk'],
        officeFunction: 'regional_revenue',
        independence: 'semi_independent',
        dependenceScore: 0.60,
        estimatedHeadcount: 'large',
        revenueContribution: 'high',
        protectionFactors: [
          'JPMorgan London: primary EMEA trading entity, FCA regulated',
          'IB revenue from EMEA M&A, ECM, DCM, Fixed income',
          'Chase UK retail bank (new growth initiative — protected)',
        ],
        vulnerabilityFactors: ['EMEA trading revenue tied to deal flow — cuts follow M&A droughts'],
      },
      {
        region: 'SG',
        cityHints: ['singapore'],
        officeFunction: 'regional_revenue',
        independence: 'semi_independent',
        dependenceScore: 0.58,
        estimatedHeadcount: 'medium',
        revenueContribution: 'high',
        protectionFactors: ['APAC wealth management and treasury solutions hub'],
        vulnerabilityFactors: ['APAC private banking revenue tightly correlated with China market health'],
      },
    ],
  },

  // ── Salesforce ────────────────────────────────────────────────────────────
  {
    parentName: 'Salesforce',
    parentCountry: 'US',
    companyKeys: ['salesforce', 'tableau', 'mulesoft', 'slack', 'einstein ai'],
    subsidiaries: [
      {
        region: 'IN',
        cityHints: ['hyderabad', 'bangalore', 'bengaluru', 'india'],
        officeFunction: 'engineering_hub',
        independence: 'captive',
        dependenceScore: 0.68,
        estimatedHeadcount: 'large',
        revenueContribution: 'none',
        protectionFactors: [
          'Salesforce India: Einstein AI and Platform engineering',
          'MuleSoft India integration platform engineering',
          'Tableau India: visualization and analytics engineering',
        ],
        vulnerabilityFactors: [
          'Salesforce 2023: cut 10% globally, India office proportionate (~800-1000 roles)',
          'Product consolidation post-acquisition (Slack, MuleSoft) reducing duplication',
        ],
      },
      {
        region: 'IE',
        cityHints: ['dublin', 'ireland'],
        officeFunction: 'eu_hq',
        independence: 'semi_independent',
        dependenceScore: 0.50,
        estimatedHeadcount: 'medium',
        revenueContribution: 'high',
        protectionFactors: ['EU entity with Works Council considerations'],
        vulnerabilityFactors: ['Salesforce EMEA revenue tied to enterprise SaaS spending cycles'],
      },
      {
        region: 'GB',
        cityHints: ['london', 'uk'],
        officeFunction: 'regional_revenue',
        independence: 'semi_independent',
        dependenceScore: 0.54,
        estimatedHeadcount: 'medium',
        revenueContribution: 'high',
        protectionFactors: ['UK is Salesforce\'s largest EMEA revenue market'],
        vulnerabilityFactors: ['Enterprise SaaS sales headcount scaling down as AI replaces SDR roles'],
      },
    ],
  },

  // ── Samsung ────────────────────────────────────────────────────────────────
  {
    parentName: 'Samsung Electronics',
    parentCountry: 'KR',
    companyKeys: ['samsung', 'samsung electronics', 'samsung research'],
    subsidiaries: [
      {
        region: 'IN',
        cityHints: ['noida', 'bangalore', 'bengaluru', 'india'],
        officeFunction: 'engineering_hub',
        independence: 'semi_independent',
        dependenceScore: 0.65,
        estimatedHeadcount: 'large',
        revenueContribution: 'low',
        protectionFactors: [
          'Samsung Research India: core R&D for Exynos chip, Tizen, Galaxy AI',
          'India is Samsung\'s second largest global manufacturing hub',
          'Local market revenue from Samsung India consumer electronics',
        ],
        vulnerabilityFactors: [
          'Samsung Korea parent headcount decisions filter through slowly',
          'Korean parent culture: restructuring less frequent but deep when it happens',
        ],
      },
      {
        region: 'GB',
        cityHints: ['london', 'uk'],
        officeFunction: 'regional_revenue',
        independence: 'semi_independent',
        dependenceScore: 0.55,
        estimatedHeadcount: 'medium',
        revenueContribution: 'high',
        protectionFactors: ['UK is Samsung\'s largest European consumer electronics market'],
        vulnerabilityFactors: ['Consumer electronics cycle — revenue-driven cuts rather than parent contagion'],
      },
      {
        region: 'SG',
        cityHints: ['singapore'],
        officeFunction: 'regional_operations',
        independence: 'semi_independent',
        dependenceScore: 0.58,
        estimatedHeadcount: 'medium',
        revenueContribution: 'medium',
        protectionFactors: ['APAC operations hub for semiconductors and consumer electronics'],
        vulnerabilityFactors: ['Semiconductor cycle drives headcount decisions independently of parent HQ'],
      },
    ],
  },
];

// ── Resolution utilities ──────────────────────────────────────────────────────

/** Find the parent company profile from a company name string. */
export function findParentProfile(companyName: string): ParentCompanyProfile | null {
  const lower = companyName.toLowerCase().trim();
  for (const profile of PARENT_SUBSIDIARY_REGISTRY) {
    if (profile.companyKeys.some(key => lower.includes(key) || key.includes(lower.split(' ')[0]))) {
      return profile;
    }
  }
  return null;
}

/** Find the subsidiary profile for a specific parent + region + city. */
export function findSubsidiaryProfile(
  parentProfile: ParentCompanyProfile,
  region: string,
  city: string | null | undefined,
): SubsidiaryProfile | null {
  const normRegion = region.trim().toUpperCase();
  const normCity = (city ?? '').toLowerCase().trim();

  // Priority 1: exact region + city match
  for (const sub of parentProfile.subsidiaries) {
    if (sub.region === normRegion) {
      if (normCity && sub.cityHints.some(h => normCity.includes(h) || h.includes(normCity.split(',')[0]))) {
        return sub;
      }
    }
  }

  // Priority 2: region match only (no city provided)
  for (const sub of parentProfile.subsidiaries) {
    if (sub.region === normRegion) return sub;
  }

  return null;
}

/** Refine office function based on role title — overrides registry when the role
 *  clearly indicates function (e.g. "Account Executive" → sales_office). */
export function refineOfficeFunctionFromRole(
  base: OfficeFunction,
  roleTitle: string | null | undefined,
): OfficeFunction {
  if (!roleTitle) return base;
  const r = roleTitle.toLowerCase();

  // Engineering signals
  if (/software engineer|swe|developer|data engineer|ml engineer|devops|sre|platform engineer|architect/i.test(r)) {
    return base === 'regional_revenue' || base === 'sales_office' ? 'engineering_hub' : base;
  }
  // Research signals
  if (/researcher|research scientist|research engineer|phd|principal scientist/i.test(r)) {
    return 'engineering_rd';
  }
  // Sales signals
  if (/account executive|ae |sales|business development|bdr|sdr|account manager|customer success/i.test(r)) {
    return 'sales_office';
  }
  // Shared services signals
  if (/finance|payroll|hr |human resources|recruiter|recruiting|legal|compliance officer|admin|office manager/i.test(r)) {
    return 'shared_services';
  }
  // Support signals
  if (/support|customer success|implementation|onboarding specialist|tier.?1|tier.?2/i.test(r)) {
    return 'support_operations';
  }
  // Operations signals
  if (/operations|ops|program manager|project manager|coordinator|analyst/i.test(r)) {
    return base === 'engineering_hub' ? base : 'regional_operations';
  }

  return base;
}
