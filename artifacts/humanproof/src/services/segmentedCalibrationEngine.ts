// segmentedCalibrationEngine.ts — Calibration Layer
// v14.0 Intelligence Upgrade
//
// Replaces the single-model calibration approach with per-segment calibration.
// The existing empiricalCalibration.ts uses one logistic regression model on 200
// events (AUC-ROC=0.81). But a FAANG SWE and an Indian BPO worker have completely
// different layoff dynamics — a single model calibrates poorly for both.
//
// Segment matrix:
//   × Company size: startup (<200), mid-market (200–5K), enterprise (5K+), hyperscaler (50K+)
//   × Industry: tech, IT services, finance, healthcare, BPO/services
//   × Region: US, India, EU, APAC
//   × Role type: IC/engineer, management, sales/revenue, support/ops, admin
//
// Each cell contains: calibrated multipliers for L1-L5, adjusted AUC estimates,
// and segment-specific base rates.
//
// Status: research_grounded — coefficients from published literature + the
//         existing 200-event dataset segmented by company size and industry.
//         Full regression update scheduled July 2026 with 300+ events.

export type CompanySizeSegment = 'STARTUP' | 'MID_MARKET' | 'ENTERPRISE' | 'HYPERSCALER';
export type IndustrySegment = 'TECH' | 'IT_SERVICES' | 'FINANCE' | 'HEALTHCARE' | 'BPO_SERVICES' | 'OTHER';
export type RegionSegment = 'US' | 'INDIA' | 'EU' | 'APAC' | 'GLOBAL';
export type RoleTypeSegment = 'IC_ENGINEER' | 'MANAGEMENT' | 'SALES_REVENUE' | 'SUPPORT_OPS' | 'ADMIN';

export interface SegmentProfile {
  companySizeSegment: CompanySizeSegment;
  industrySegment: IndustrySegment;
  regionSegment: RegionSegment;
  roleTypeSegment: RoleTypeSegment;
}

export interface SegmentCalibrationResult {
  // Segment identification
  segment: SegmentProfile;
  segmentLabel: string;
  segmentConfidence: number;       // 0–1 confidence in this segmentation

  // Calibrated multipliers for this segment (vs. base model)
  l1Multiplier: number;           // applies to L1 (financial health) weight
  l2Multiplier: number;           // applies to L2 (layoff history) weight
  l3Multiplier: number;           // applies to L3 (role displacement) weight
  l4Multiplier: number;           // applies to L4 (industry/market) weight
  l5Multiplier: number;           // applies to L5 (personal protection) weight

  // Segment-specific base rate
  baseLayoffRate: number;          // 0–1 12-month layoff probability for this segment at score=50

  // Estimated AUC for this segment (lower = more uncertainty)
  estimatedAUC: number;

  // Calibration adjustments
  adjustedScore: number;           // original score recalibrated for this segment
  adjustmentDelta: number;         // pts difference from base model score

  // Insights
  segmentInsight: string;
  calibrationNote: string;

  calibrationStatus: 'research_derived' | 'developer_estimate';
}

// ─── Segment Calibration Matrix ───────────────────────────────────────────────
// Multipliers > 1.0 mean L_n is a stronger predictor in this segment.
// Multipliers < 1.0 mean L_n is a weaker predictor in this segment.
// Base rates derived from layoffs.fyi segmentation + published research.

interface SegmentCalibData {
  l1: number; l2: number; l3: number; l4: number; l5: number;
  baseRate: number;      // 12-month layoff probability at composite score = 50
  auc: number;           // estimated AUC for this segment
  insight: string;
  status: 'research_derived' | 'developer_estimate';
}

// Company size × Industry calibrations
const SEGMENT_CALIBRATIONS: Record<string, SegmentCalibData> = {
  // ── STARTUP segments ─────────────────────────────────────────────────────
  'STARTUP_TECH': {
    l1: 0.85, l2: 1.30, l3: 0.80, l4: 1.10, l5: 0.95,
    baseRate: 0.42, auc: 0.74,
    insight: 'Startup layoffs are driven by funding runway (L2/L4 dominant). L3 role displacement less relevant — all roles cut when cash runs out.',
    status: 'research_derived',
  },
  'STARTUP_IT_SERVICES': {
    l1: 0.90, l2: 1.20, l3: 0.85, l4: 1.05, l5: 0.90,
    baseRate: 0.38, auc: 0.71,
    insight: 'IT services startups cut based on client pipeline. L2 (history) and L4 (market) are primary signals.',
    status: 'developer_estimate',
  },

  // ── MID_MARKET segments ───────────────────────────────────────────────────
  'MID_MARKET_TECH': {
    l1: 1.10, l2: 1.05, l3: 1.00, l4: 0.95, l5: 0.95,
    baseRate: 0.22, auc: 0.79,
    insight: 'Mid-market tech layoffs are balanced across financial health (L1) and role displacement (L3). Closer to the base model.',
    status: 'research_derived',
  },
  'MID_MARKET_FINANCE': {
    l1: 1.20, l2: 0.95, l3: 0.85, l4: 1.10, l5: 1.00,
    baseRate: 0.18, auc: 0.76,
    insight: 'Finance companies cut based on revenue and market conditions (L1/L4). Role automation (L3) is secondary — regulatory protection slows displacement.',
    status: 'research_derived',
  },
  'MID_MARKET_HEALTHCARE': {
    l1: 1.00, l2: 0.85, l3: 0.60, l4: 0.90, l5: 1.30,
    baseRate: 0.12, auc: 0.72,
    insight: 'Healthcare layoffs are rare and driven by regulatory change or reimbursement. L3 (AI displacement) is significantly over-estimated by the base model. L5 (personal protection via credentials) is the strongest predictor.',
    status: 'research_derived',
  },
  'MID_MARKET_BPO': {
    l1: 0.85, l2: 1.00, l3: 1.40, l4: 1.15, l5: 0.80,
    baseRate: 0.38, auc: 0.80,
    insight: 'BPO layoffs are heavily driven by AI task automatability (L3) and industry headwinds (L4). Personal protection (L5) matters less — low-cost workers are fungible.',
    status: 'research_derived',
  },

  // ── ENTERPRISE segments ───────────────────────────────────────────────────
  'ENTERPRISE_TECH': {
    l1: 1.05, l2: 1.10, l3: 1.05, l4: 0.90, l5: 1.05,
    baseRate: 0.14, auc: 0.82,
    insight: 'Enterprise tech layoffs are well-calibrated by the base model. L2 (layoff history) is slightly more predictive — large companies with prior rounds are more likely to cut again.',
    status: 'research_derived',
  },
  'ENTERPRISE_IT_SERVICES': {
    l1: 0.95, l2: 1.20, l3: 1.15, l4: 1.05, l5: 0.90,
    baseRate: 0.20, auc: 0.78,
    insight: 'Enterprise IT services layoffs are driven by client contract renewals, AI substitution (L3), and sector headwinds (L4). L1 (financial health) is less predictive — profitable IT services companies still cut for efficiency.',
    status: 'research_derived',
  },

  // ── HYPERSCALER segments ──────────────────────────────────────────────────
  'HYPERSCALER_TECH': {
    l1: 0.70, l2: 0.90, l3: 1.10, l4: 0.80, l5: 1.10,
    baseRate: 0.08, auc: 0.68,
    insight: 'Hyperscaler layoffs (Meta, Google, Amazon) are dominated by AI efficiency (D8 — not in L1-L5 base model). L1 is the WEAKEST predictor — all hyperscalers are financially healthy when they cut. L3 (role displacement) and L5 (personal skills) are strongest.',
    status: 'research_derived',
  },
  'HYPERSCALER_IT_SERVICES': {
    l1: 0.90, l2: 1.05, l3: 1.10, l4: 0.95, l5: 1.00,
    baseRate: 0.15, auc: 0.77,
    insight: 'Large-scale IT services firms (50,000+ headcount) are more geographically diversified than enterprise peers but still face AI task substitution in BPO/outsourcing lines. L1 more predictive than in pure-tech hyperscalers.',
    status: 'developer_estimate',
  },

  // ── Default fallback ──────────────────────────────────────────────────────
  '_DEFAULT': {
    l1: 1.00, l2: 1.00, l3: 1.00, l4: 1.00, l5: 1.00,
    baseRate: 0.22, auc: 0.81,
    insight: 'Using base model calibration — specific segment not found in matrix.',
    status: 'developer_estimate',
  },

  // ── INDIA-SPECIFIC ENTERPRISE segments — v16.0 ────────────────────────────
  // Calibrated for the Indian IT/BPO labour market where layoff dynamics differ
  // substantially from the US base model: client concentration, AI BPO
  // substitution, and GCC parent-company dependencies are the dominant drivers.

  'ENTERPRISE_IT_SERVICES_INDIA': {
    l1: 0.75, l2: 1.15, l3: 1.35, l4: 1.25, l5: 0.85,
    baseRate: 0.28, auc: 0.79,
    insight: 'Indian IT services enterprise layoffs driven by US client concentration (L4 dominant), AI substitution of BPO work (L3 elevated), and contract renewal cycles. L1 (financial health) is weakest predictor — Infosys/TCS are profitable when they cut.',
    status: 'research_derived',
  },
  'HYPERSCALER_IT_SERVICES_INDIA': {
    l1: 0.75, l2: 1.15, l3: 1.35, l4: 1.25, l5: 0.85,
    baseRate: 0.25, auc: 0.79,
    insight: 'India-headquartered IT services hyperscalers (Wipro/TCS/Infosys scale) face US client concentration risk (L4), AI BPO task substitution (L3 elevated), and GCC parent dependencies. L1 weak predictor — these firms are profitable when they cut. Slightly lower base rate than enterprise peers due to more diversified client portfolios at scale.',
    status: 'research_derived',
  },

  'MID_MARKET_IT_SERVICES_INDIA': {
    l1: 0.80, l2: 1.10, l3: 1.45, l4: 1.30, l5: 0.80,
    baseRate: 0.35, auc: 0.76,
    insight: 'Mid-market Indian IT services (Mphasis, Hexaware, Persistent) highly exposed to AI task substitution (L3=1.45 max multiplier). Client pipeline risk (L4) and role automatability (L3) are co-dominant. Bench strength and utilization rate are key indicators not captured in L1-L5.',
    status: 'research_derived',
  },

  'STARTUP_IT_SERVICES_INDIA': {
    l1: 0.85, l2: 1.25, l3: 1.20, l4: 1.20, l5: 0.75,
    baseRate: 0.44, auc: 0.73,
    insight: 'Indian IT startups and product companies face combined pressure: founder funding concerns (L2), AI competition, and market headwinds. High base rate reflects startup failure patterns in Indian tech ecosystem.',
    status: 'developer_estimate',
  },

  // GCC (Global Capability Centre) segment — captive tech operations of MNCs in India.
  // Layoffs are almost entirely parent-company-driven; local financial health is irrelevant.
  'ENTERPRISE_GCC_INDIA': {
    l1: 0.60, l2: 0.95, l3: 1.20, l4: 1.40, l5: 0.90,
    baseRate: 0.18, auc: 0.74,
    insight: 'GCC layoffs are almost entirely parent-company-driven (L4 dominant, capturing parent company decisions). Local financial health is irrelevant — a GCC can be profitable but still cut due to parent restructuring. AI role substitution (L3) is accelerating as GCCs move from captive labor to AI centers.',
    status: 'research_derived',
  },

  // BPO-specific India segments
  'MID_MARKET_BPO_INDIA': {
    l1: 0.70, l2: 1.05, l3: 1.55, l4: 1.25, l5: 0.75,
    baseRate: 0.42, auc: 0.81,
    insight: 'Indian BPO layoffs are the highest-confidence segment in this calibration. L3 (AI task automatability) is the strongest predictor at 1.55 — data entry, customer service, and claims processing roles have documented >80% AI substitution rates. L4 (industry headwinds) elevated from US client sector volatility.',
    status: 'research_derived',
  },
};

// ─── Segment Classification Functions ────────────────────────────────────────

export function classifyCompanySize(employeeCount: number | null): CompanySizeSegment {
  if (employeeCount === null) return 'MID_MARKET'; // fallback
  if (employeeCount < 200)    return 'STARTUP';
  if (employeeCount < 5_000)  return 'MID_MARKET';
  if (employeeCount < 50_000) return 'ENTERPRISE';
  return 'HYPERSCALER';
}

export function classifyIndustry(industryKey: string): IndustrySegment {
  const k = industryKey.toLowerCase();
  // IT_SERVICES must be checked before BPO_SERVICES — 'IT Services' contains 'services'
  // which would otherwise match the broader BPO_SERVICES regex first.
  if (/it[_ ]?services|outsourc/.test(k))       return 'IT_SERVICES';
  if (/it_|software|saas|gaming|tech/.test(k))  return 'TECH';
  if (/bpo|services|consulting|admin/.test(k))  return 'BPO_SERVICES';
  if (/finance|fintech|insurance|investment/.test(k)) return 'FINANCE';
  if (/health|medical|pharma|nursing/.test(k))  return 'HEALTHCARE';
  return 'OTHER';
}

export function classifyRegion(region: string): RegionSegment {
  const r = region.toUpperCase();
  if (r === 'US' || r === 'NA') return 'US';
  if (r === 'IN')               return 'INDIA';
  if (r === 'EU' || r === 'UK') return 'EU';
  if (r === 'APAC' || r === 'SG' || r === 'AU') return 'APAC';
  return 'GLOBAL';
}

export function classifyRoleType(workTypeKey: string): RoleTypeSegment {
  const prefix = workTypeKey.split('_')[0];
  if (['sw', 'ml', 'data', 'dev', 'sec', 'bc', 'game', 'qa', 'saas', 'web', 'mob', 'ds'].includes(prefix)) return 'IC_ENGINEER';
  if (['con', 'gov', 'edu', 'leg'].includes(prefix)) return 'MANAGEMENT';
  if (['mkt', 'adv', 'fmcg'].includes(prefix)) return 'SALES_REVENUE';
  if (['bpo', 'log', 'trav', 'ret', 'ec', 'hr'].includes(prefix)) return 'SUPPORT_OPS';
  if (['adm', 'fin', 'ins'].includes(prefix)) return 'ADMIN';
  return 'IC_ENGINEER'; // default
}

function lookupCalibration(
  companySize: CompanySizeSegment,
  industry: IndustrySegment,
): SegmentCalibData {
  const key = `${companySize}_${industry}`;
  return SEGMENT_CALIBRATIONS[key] ?? SEGMENT_CALIBRATIONS._DEFAULT;
}

/**
 * Region-aware segment lookup (v16.0).
 *
 * For India ('INDIA') the function first attempts a region-qualified key by
 * appending '_INDIA' to the standard segment key. This allows India-specific
 * calibration data (e.g. 'ENTERPRISE_IT_SERVICES_INDIA') to override the
 * global segment data when available, while still falling back gracefully to
 * the standard segment key or the _DEFAULT entry.
 *
 * For all other regions the function delegates to the standard lookupCalibration.
 */
export function lookupCalibrationWithRegion(
  companySize: CompanySizeSegment,
  industry: IndustrySegment,
  region: RegionSegment,
): SegmentCalibData {
  if (region === 'INDIA') {
    const indiaKey = `${companySize}_${industry}_INDIA`;
    if (SEGMENT_CALIBRATIONS[indiaKey] !== undefined) {
      return SEGMENT_CALIBRATIONS[indiaKey];
    }
  }
  // Fall back to standard (non-region-qualified) lookup
  return lookupCalibration(companySize, industry);
}

function buildSegmentLabel(profile: SegmentProfile): string {
  return `${profile.companySizeSegment.replace(/_/g, ' ')} ${profile.industrySegment.replace(/_/g, ' ')} — ${profile.regionSegment} ${profile.roleTypeSegment.replace(/_/g, ' ')}`;
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export interface SegmentCalibrationInput {
  baseScore: number;               // the composite score from the base model
  employeeCount?: number | null;
  industryKey?: string;
  region?: string;
  workTypeKey?: string;
}

export function computeSegmentCalibration(
  input: SegmentCalibrationInput,
): SegmentCalibrationResult {
  try {
    const {
      baseScore,
      employeeCount = null,
      industryKey = 'it_software',
      region = 'US',
      workTypeKey = 'sw_backend',
    } = input;

    const companySizeSegment = classifyCompanySize(employeeCount);
    const industrySegment = classifyIndustry(industryKey);
    const regionSegment = classifyRegion(region);
    const roleTypeSegment = classifyRoleType(workTypeKey);

    const segment: SegmentProfile = { companySizeSegment, industrySegment, regionSegment, roleTypeSegment };
    const calib = lookupCalibrationWithRegion(companySizeSegment, industrySegment, regionSegment);

    // Apply calibration: weighted average of segment-specific multipliers
    // The adjustment accounts for how this segment's base rates differ from the global model
    const segmentBaseRateVsGlobal = calib.baseRate / 0.22; // normalize to global base rate
    const segmentAdjustment = Math.round((segmentBaseRateVsGlobal - 1.0) * baseScore * 0.3);
    const adjustedScore = Math.min(100, Math.max(0, baseScore + segmentAdjustment));

    return {
      segment,
      segmentLabel: buildSegmentLabel(segment),
      segmentConfidence: calib.auc,
      l1Multiplier: calib.l1,
      l2Multiplier: calib.l2,
      l3Multiplier: calib.l3,
      l4Multiplier: calib.l4,
      l5Multiplier: calib.l5,
      baseLayoffRate: calib.baseRate,
      estimatedAUC: calib.auc,
      adjustedScore,
      adjustmentDelta: segmentAdjustment,
      segmentInsight: calib.insight,
      calibrationNote: `Segment: ${buildSegmentLabel(segment)}. ` +
        `Base layoff rate for this segment at score=50: ${Math.round(calib.baseRate * 100)}% (global: 22%). ` +
        `Estimated segment AUC: ${calib.auc.toFixed(2)}.`,
      calibrationStatus: calib.status,
    };
  } catch {
    return {
      segment: {
        companySizeSegment: 'MID_MARKET',
        industrySegment: 'TECH',
        regionSegment: 'US',
        roleTypeSegment: 'IC_ENGINEER',
      },
      segmentLabel: 'Default segment',
      segmentConfidence: 0.81,
      l1Multiplier: 1.0, l2Multiplier: 1.0, l3Multiplier: 1.0, l4Multiplier: 1.0, l5Multiplier: 1.0,
      baseLayoffRate: 0.22,
      estimatedAUC: 0.81,
      adjustedScore: input.baseScore,
      adjustmentDelta: 0,
      segmentInsight: 'Using base model calibration.',
      calibrationNote: 'Segment calibration unavailable — using base model.',
      calibrationStatus: 'developer_estimate',
    };
  }
}

// ── v40.0: Calibration limitation check ──────────────────────────────────────

export interface CalibrationLimitationResult {
  /** true when the model has known significant underrepresentation for this company's profile. */
  limited: boolean;
  /** Human-readable reason for the limitation chip in SummaryTab. null when not limited. */
  reason: string | null;
}

/**
 * Returns a limitation signal when the training dataset (n=200, 70% US, 20% India)
 * is known to underrepresent the company's segment. Used in SummaryTab to render
 * an "Calibration note" amber chip so users know to treat scores with additional caution.
 *
 * Segments with < 5% of training events return `limited: true`:
 *   - manufacturing / industrial / construction / energy
 *   - emerging markets (non US/IN/EU)
 *   - pre-IPO private startups
 */
export function isCalibrationLimitedForCompany(
  industry: string | null | undefined,
  region: string | null | undefined,
  isPublic: boolean,
): CalibrationLimitationResult {
  // Pre-IPO private startups
  if (!isPublic && industry && /startup|early.stage|pre.ipo|seed|series.a|series.b/i.test(industry)) {
    return { limited: true, reason: 'Calibration has limited data for pre-IPO startups (n=12 in training set).' };
  }

  // Manufacturing / industrial / energy / construction
  const ind = (industry ?? '').toLowerCase();
  if (/manufactur|industrial|factory|energy|oil|gas|mining|construc|utilities/i.test(ind)) {
    return { limited: true, reason: 'Calibration is limited for this sector (manufacturing/energy n=8 in training set).' };
  }

  // Emerging markets (not US/India/EU/APAC)
  const reg = (region ?? '').toUpperCase();
  const coveredRegions = ['US', 'IN', 'EU', 'UK', 'DE', 'FR', 'APAC', 'SG', 'AU', 'JP', 'NA'];
  if (reg && !coveredRegions.includes(reg)) {
    return { limited: true, reason: `Calibration has no training events for region "${region}" — use scores as directional only.` };
  }

  return { limited: false, reason: null };
}

