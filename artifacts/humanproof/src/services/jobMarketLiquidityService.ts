// jobMarketLiquidityService.ts
// Re-employment velocity engine — answers "If I get laid off today, how long
// until I land a comparable role?" This is the #2 user anxiety after risk score.
//
// Score 0–100: higher = faster re-employment.
// monthsToReemploy: median months to next comparable role given current market.
//
// v40.1: Geographic supply-surge Factor 9.
// When co-located peer companies in the same metro are cutting simultaneously,
// thousands of engineers flood one local job market. A Seattle SWE competing
// against displaced Amazon, Microsoft, Meta, and Google Kirkland engineers
// faces a categorically harder market than a non-cluster engineer in the same
// role. Factor 9 applies:
//   - Static metro concentration penalty (always, based on city)
//   - Dynamic supply-surge penalty (scales with geoClusterActiveCuts)
//
// DESIGN: Entirely deterministic — no API calls. All factors derived from
// existing scoring inputs. The result is injected into HybridResult so every
// audit automatically includes job-market liquidity intelligence.

import type { CompanyData } from '../data/companyDatabase';
import { resolveMetro } from '../data/techClusterMetros';
import { getSalaryPreservationProfile } from './marketPriorityEngine';
import {
  resolveUSCityMarket,
  resolveRoleCategoryKey,
  computeCityDepthMultiplier,
  type USCityMarketProfile,
} from '../data/usCityMarketIntelligence';

// ─── Output Types ─────────────────────────────────────────────────────────────

export interface LiquidityFactor {
  name: string;
  value: number;     // 0–1 component score (higher = better liquidity)
  weight: number;    // weight in composite formula
  label: string;     // human-readable assessment
  detail: string;    // 1-sentence explanation
}

export interface JobMarketLiquidityResult {
  score: number;                     // 0–100 (higher = faster re-employment)
  monthsToReemploy: number;          // median months estimate
  tier: 'Fast' | 'Moderate' | 'Slow' | 'Very Slow';
  tierColor: string;
  factors: LiquidityFactor[];
  keyBarriers: string[];             // top 2 blockers for this user
  keyAccelerators: string[];         // top 2 speed-ups for this user
  salaryPreservation: number;        // 0–100: how much comp can they preserve (vs taking cut)
  marketDemandTrend: 'rising' | 'stable' | 'falling';
  confidenceNote: string | null;     // surfaced when confidence is low
  /** Geographic supply-surge analysis — present when user's city maps to a known tech cluster. */
  geoSupplySurge?: {
    metroName: string;
    geoConcentrationScore: number;     // 0–1 static metro tech density (ESTIMATED)
    geoClusterActiveCuts: number;      // peer companies in same metro currently cutting
    surgeMonthsAdded: number;          // additional months added to timeline by supply surge
    surgeNarrative: string;
  };
  /** City-level job market intelligence — present when user's city matches a US profile.
   *  Uses city-specific employer counts and avg placement weeks rather than national averages.
   *  LABELED: ESTIMATED from LinkedIn Workforce Report 2024, Indeed US Hiring Lab 2024-2025. */
  cityMarketIntelligence?: {
    cityName: string;
    tier: 1 | 2 | 3;
    marketDepthScore: number;          // 0–1 relative to SF Bay Area reference
    employerCount: number;             // active employers for this role in this city (ESTIMATED)
    avgPlacementWeeks: number;         // median weeks from first app to offer (ESTIMATED)
    salaryPremiumPct: number;          // % vs national median (ESTIMATED)
    relocationPressure: string;        // 'none'|'low'|'moderate'|'high'
    post2023FreezeAdjustment: number;  // post-freeze market depth multiplier
    cityNarrative: string;
    labeledAs: 'ESTIMATED';
  };
  /** Remote-first market access — present when isRemoteFirst=true.
   *  Converts L9 from local-market to global-market access for distributed workers.
   *  A Phoenix SWE (~780 local openings, 22-week placement) marked remote-first
   *  sees ~14,700 globally accessible openings + 14-week placement instead.
   *  LABELED: ESTIMATED — 35% international hiring friction discount + 35% timeline
   *  reduction derived from We Work Remotely + Remote OK 2024 hiring data and
   *  Hired.com remote vs onsite placement studies. */
  remoteFirstAdvantage?: {
    /** Global openings × 0.35 (international hiring friction discount) */
    accessibleOpenings: number;
    /** City local openings (for the delta narrative) */
    localOpenings: number;
    /** Lift factor: accessibleOpenings / localOpenings */
    accessLift: number;
    /** Timeline reduction factor applied to monthsToReemploy (0.65 = 35% shorter) */
    timelineFactor: number;
    /** Baseline months before remote adjustment */
    monthsBeforeAdjustment: number;
    /** Months after remote adjustment */
    monthsAfterAdjustment: number;
    /** User-facing actionable narrative (cites specific numbers per Principle 4) */
    narrative: string;
    labeledAs: 'ESTIMATED';
  };
}

// ─── Role demand velocity by oracle prefix ───────────────────────────────────
// Higher = faster placement (roles with >1000 active openings on Naukri/LinkedIn
// and rising demand get 0.80+). Derived from market_intelligence_cache and
// roleExposureData.demandTrend as of May 2026.

const ROLE_DEMAND_VELOCITY: Record<string, number> = {
  // High demand — fast placement
  ml_engineer:                0.90,
  ai_llm_systems_engineer:    0.92,
  platform_engineer:          0.85,
  security_engineer:          0.88,
  data_engineer:              0.82,
  devops:                     0.83,
  cloud_engineer:             0.84,
  sre:                        0.85,
  product_manager:            0.72,
  sw_backend:                 0.75,
  sw_fullstack:               0.74,
  sw_frontend:                0.70,
  sw_mobile:                  0.71,
  sw_arch:                    0.68,

  // Moderate demand — normal placement timeline
  data_scientist:             0.65,
  data_analyst:               0.62,
  ux_designer:                0.60,
  qa_automation_engineer:     0.58,
  business_analyst:           0.55,
  product_designer:           0.58,
  finance_manager:            0.55,
  fp_a_ai_analyst:            0.60,
  risk_ai_analyst:            0.58,
  operations_manager:         0.52,
  project_manager:            0.54,
  people_analytics_specialist:0.56,
  hrbp_ai_specialist:         0.52,
  marketing_manager:          0.50,
  account_manager:            0.52,
  sales_rep:                  0.55,

  // Shrinking demand — slow placement
  qa_manual:                  0.32,
  cnt_seo_content:            0.28,
  technical_writer:           0.35,
  recruiter:                  0.38,
  hr_generalist:              0.36,
  fin_account_junior:         0.35,
  graphic_designer:           0.30,
  content_writer:             0.25,
  data_entry:                 0.15,
  bpo_agent:                  0.18,
  telemarketer:               0.12,
  admin_assistant:            0.22,
};

// ─── Industry demand multipliers ─────────────────────────────────────────────
// Industries with active hiring get a multiplier > 1; contracting industries < 1.

const INDUSTRY_DEMAND_MULTIPLIER: Record<string, number> = {
  'ai / machine learning':       1.30,
  'cybersecurity':               1.25,
  'cloud computing':             1.20,
  'healthcare technology':       1.15,
  'fintech':                     1.10,
  'technology':                  1.05,
  'software':                    1.03,
  'ecommerce':                   0.95,
  'banking':                     0.90,
  'media':                       0.82,
  'retail':                      0.80,
  'bpo / ites':                  0.70,
  'manufacturing':               0.75,
  'telecom':                     0.72,
  'edtech':                      0.68,
  'real estate':                 0.75,
};

// ─── Region placement speed modifiers ────────────────────────────────────────
// Reflects market depth, density of employers, and hiring cycle speed.

const REGION_PLACEMENT_SPEED: Record<string, number> = {
  'US':     1.0,    // deepest market, fastest cycle
  'IN':     0.85,   // large market but high supply vs demand for some roles
  'GB':     0.90,
  'DE':     0.82,
  'SG':     0.88,
  'AU':     0.85,
  'CA':     0.88,
  'EU':     0.80,
};

// ─── Seniority placement curve ───────────────────────────────────────────────
// Senior roles take longer to place (fewer openings, more selective processes)
// but preserve more salary. Junior roles place faster but may need comp cuts.

interface SeniorityPlacementProfile {
  velocityMultiplier: number;   // effect on placement speed
  salaryPreservation: number;   // 0–100: how much salary can be preserved
}

const SENIORITY_PLACEMENT: Record<string, SeniorityPlacementProfile> = {
  '0-2':   { velocityMultiplier: 1.10, salaryPreservation: 55 },   // fast but takes pay cut
  '2-5':   { velocityMultiplier: 1.05, salaryPreservation: 65 },
  '5-10':  { velocityMultiplier: 0.95, salaryPreservation: 78 },
  '10-15': { velocityMultiplier: 0.82, salaryPreservation: 85 },
  '15+':   { velocityMultiplier: 0.70, salaryPreservation: 88 },   // slow but preserves comp
};

// ── Market-adjusted salary preservation ──────────────────────────────────────
// The seniority-only table (55–88%) is calibrated on US market norms.
// A senior SWE in India cannot preserve 85% of salary when changing roles —
// the Indian tech market is more competitive and salaries are lower in USD terms.
// Conversely, a Singapore EP holder at a major tech firm has strong leverage.
//
// Algorithm: map the seniority preservation score (55–88%) onto the market-
// specific floor/ceiling range from SALARY_PRESERVATION_BY_MARKET.
//
// Example:
//   India senior SWE (seniority=85, floor=45, ceiling=72):
//     norm = (85-55)/(88-55) = 0.91 → result = 45 + 0.91×(72-45) = 70%
//   US senior SWE (seniority=85, floor=72, ceiling=95):
//     norm = 0.91 → result = 72 + 0.91×(95-72) = 93%
function computeMarketAdjustedSalaryPreservation(
  seniorityBasePreservation: number,   // from SENIORITY_PLACEMENT (55–88)
  regionKey: string,
): number {
  const profile = getSalaryPreservationProfile(regionKey);
  const SENIORITY_MIN = 55;  // minimum seniority preservation (0-2yr)
  const SENIORITY_MAX = 88;  // maximum seniority preservation (15+yr)

  // Normalize the seniority score to 0–1
  const norm = Math.max(0, Math.min(1,
    (seniorityBasePreservation - SENIORITY_MIN) / (SENIORITY_MAX - SENIORITY_MIN),
  ));

  // Map to market-specific floor/ceiling
  const marketAdjusted = profile.preservationFloor + norm * (profile.preservationCeiling - profile.preservationFloor);
  return Math.round(marketAdjusted);
}

// ─── Main computation ─────────────────────────────────────────────────────────

export interface LiquidityInputs {
  oracleKey: string;           // resolved role key (e.g. 'sw_backend')
  industry: string;
  tenureYears: number;
  region: string;
  companySize: 'small' | 'mid' | 'large' | 'mega' | string;
  isPublic: boolean;
  riskScore: number;           // current layoff risk (0–100)
  uniquenessDepth?: 'generic' | 'functional_specialist' | 'critical_knowledge';
  performanceTier?: 'top' | 'average' | 'below' | 'unknown';
  /** User's city of work — enables geo supply-surge Factor 9 (static metro concentration). */
  city?: string;
  /** Number of peer companies in the same metro currently cutting — from peerContagionResult.geoCluster.
   *  Drives the dynamic supply-surge penalty beyond the static metro concentration. */
  geoClusterActiveCuts?: number;
  /** 0–1 tech density of the user's metro — from peerContagionResult.geoCluster. */
  geoConcentrationScore?: number;
  /** Remote-first work status — converts L9 from local-market to global-market access.
   *  When true: accessible market = globalOpenings × 0.35 (international hiring friction
   *  discount), and re-employment timeline shrinks by 35% (remoteFirstTimelineFactor=0.65).
   *  Maps from userFactors.remoteEligibility = 'FULLY_REMOTE' in auditDataPipeline. */
  isRemoteFirst?: boolean;
  /** Global openings count for the role (from careerPathMarket or roleMarketDemand).
   *  When isRemoteFirst=true, accessibleOpenings = globalOpenings × 0.35. */
  globalOpenings?: number;
}

export function computeJobMarketLiquidity(inputs: LiquidityInputs): JobMarketLiquidityResult {
  const {
    oracleKey,
    industry,
    tenureYears,
    region,
    companySize,
    isPublic,
    riskScore,
    uniquenessDepth = 'functional_specialist',
    performanceTier = 'average',
    city,
    geoClusterActiveCuts = 0,
    geoConcentrationScore,
    isRemoteFirst = false,
    globalOpenings,
  } = inputs;

  // ── Factor 1: Role demand velocity (0–1) ──────────────────────────────────
  const normalizedKey = oracleKey.toLowerCase().replace(/-/g, '_');
  const rawDemand = lookupRoleDemand(normalizedKey);
  const roleFoundInTable = ROLE_DEMAND_VELOCITY[normalizedKey] !== undefined ||
    Object.keys(ROLE_DEMAND_VELOCITY).some(k =>
      normalizedKey.startsWith(k) || k.startsWith(normalizedKey.split('_')[0])
    );
  const industryKey = industry.toLowerCase();
  const industryMult = lookupIndustryMultiplier(industryKey);
  const roleDemandScore = Math.min(1, rawDemand * industryMult);

  const roleDemandLabel = roleDemandScore >= 0.75 ? 'Very High Demand'
    : roleDemandScore >= 0.55 ? 'Good Demand'
    : roleDemandScore >= 0.38 ? 'Moderate Demand'
    : 'Low Demand';

  // ── Factor 2: Skills transferability (0–1) ────────────────────────────────
  // Roles with broader applicability across industries place faster.
  const transferabilityScore = computeTransferability(normalizedKey, industry);

  // ── Factor 3: Seniority velocity (0–1) ───────────────────────────────────
  const experienceBracket = deriveExperienceBracket(tenureYears);
  const seniorityProfile = SENIORITY_PLACEMENT[experienceBracket] ?? SENIORITY_PLACEMENT['5-10'];
  const seniorityVelocityScore = Math.min(1, 0.7 * seniorityProfile.velocityMultiplier);

  // ── Factor 4: Market cycle health (0–1) ──────────────────────────────────
  // When the user's own company is cutting (high riskScore), the sector is
  // likely in a downturn — more supply, harder to place.
  const marketCycleScore = riskScore >= 75 ? 0.35
    : riskScore >= 55 ? 0.52
    : riskScore >= 35 ? 0.68
    : 0.80;

  // ── Factor 5: Geographic market depth (0–1) ───────────────────────────────
  // L9 now uses city-level employer counts and avg placement weeks for US cities
  // instead of national averages (US=1.0 for all cities was the bug — Phoenix and
  // SF previously received identical geoScores).
  const regionKey = normaliseRegion(region);
  const baseGeoScore = REGION_PLACEMENT_SPEED[regionKey] ?? REGION_PLACEMENT_SPEED['US'];

  // US city-level depth adjustment. For non-US regions: no city data, use national avg.
  // computeCityDepthMultiplier() folds in post-2023 hiring freeze effects.
  const usCityProfile: USCityMarketProfile | null =
    (regionKey === 'US') ? resolveUSCityMarket(city) : null;
  const roleCategoryKey = resolveRoleCategoryKey(normalizedKey);
  const cityRoleData = usCityProfile?.roles[roleCategoryKey] ?? usCityProfile?.roles['general'] ?? null;

  // City depth multiplier: 0.70 (shallow/Phoenix) to 1.05 (deep/SF post-freeze).
  // Applied to baseGeoScore before the supply-surge penalty.
  const cityDepthMultiplier = usCityProfile ? computeCityDepthMultiplier(usCityProfile) : 1.0;

  // ── Factor 9: Geographic supply-surge penalty ─────────────────────────────
  // Two components:
  //   A. Static metro concentration: even with no active layoffs, a high-
  //      concentration metro (Seattle=0.92, Bay Area=1.0) has more engineers
  //      competing for the same roles year-round. Small baseline reduction.
  //   B. Dynamic surge penalty: each active co-located peer company cutting
  //      floods the local market. A Seattle engineer with Amazon+Microsoft
  //      both cutting faces ~10,000 displaced peers in the same metro.
  //      Each additional co-located cut reduces the geo score by 8%.
  //
  // The combined effect is applied to geoScore rather than as a separate
  // formula weight — conceptually it is a geo-depth modifier, not a new
  // dimension. The supply surge narrative is surfaced separately in the result.
  const metro = resolveMetro(city);
  const effectiveConcentration = geoConcentrationScore ?? metro?.concentrationScore ?? 0;

  // Static penalty: high-concentration metros have 0–4% baseline drag
  const staticConcentrationPenalty = effectiveConcentration * 0.04;

  // Dynamic surge penalty: each co-located active cut = -8% (cap at -32%)
  const dynamicSurgePenalty = Math.min(0.32, geoClusterActiveCuts * 0.08);

  // Combined geo score: city depth multiplier applied first, then surge penalties.
  // Phoenix: 1.0 × 0.782 × (1 - 0.011 - 0) = 0.773  (was 1.0 before city fix)
  // SF Bay Area: 1.0 × 0.989 × (1 - 0.04 - 0) = 0.949 (was 0.96 before)
  // Austin: 1.0 × 0.912 × (1 - 0.029 - 0) = 0.885
  const geoScore = Math.max(0.30, baseGeoScore * cityDepthMultiplier * (1 - staticConcentrationPenalty - dynamicSurgePenalty));

  // ── METRO_REEMPLOYMENT_DELAY_WEEKS — supply surge timeline extension ─────────
  // When 2+ metro cluster members announce layoffs within 90 days, the local
  // job market floods with engineers competing for the same roles. The discrete
  // 3-week delay (METRO_REEMPLOYMENT_DELAY_WEEKS) captures the market-clearing
  // time above the base model, plus 0.75 months per additional cluster cut beyond 2.
  //
  // Formula (per spec):
  //   geoClusterActiveCuts >= 2:  3 weeks (base cluster bonus) + 0.75mo per extra cut
  //   geoClusterActiveCuts  = 1:  0.75 months (per-cut formula only)
  //   geoClusterActiveCuts  = 0:  0 months
  //
  // The "3 weeks" constant equals METRO_REEMPLOYMENT_DELAY_WEEKS / 4.333 months.
  // Supply surge narrative surfaced in geoSupplySurge.surgeNarrative.
  const METRO_REEMPLOYMENT_DELAY_WEEKS = 3;      // per spec — discrete bonus when 2+ cluster cuts
  const METRO_DELAY_MONTHS = METRO_REEMPLOYMENT_DELAY_WEEKS / 4.333; // 0.692 months

  const surgeMonthsAdded = Math.min(3.0,
    geoClusterActiveCuts >= 2
      ? METRO_DELAY_MONTHS + (geoClusterActiveCuts - 2) * 0.75  // 3wk base + 0.75mo per extra
      : geoClusterActiveCuts * 0.75,                             // < 2 cuts: per-cut only
  );

  // ── Factor 6: Brand halo from company ────────────────────────────────────
  // Coming from a well-known or public company speeds up placement.
  const brandScore = isPublic ? 0.72
    : companySize === 'mega' || companySize === 'large' ? 0.65
    : companySize === 'mid' ? 0.55
    : 0.45;

  // ── Factor 7: Performance signal ─────────────────────────────────────────
  const perfScore = performanceTier === 'top' ? 0.80
    : performanceTier === 'average' ? 0.60
    : performanceTier === 'below' ? 0.40
    : 0.55;

  // ── Factor 8: Uniqueness depth — negotiating leverage modifier ────────────
  // critical_knowledge holders have stronger negotiating position even in a
  // difficult market — employers pay a premium to avoid losing institutional knowledge.
  // This is a small but real liquidity booster: faster offer decision, less comp pressure.
  const uniquenessBonus = uniquenessDepth === 'critical_knowledge' ? 0.08
    : uniquenessDepth === 'functional_specialist' ? 0.03
    : 0;

  // ── Composite liquidity score (0–100) ─────────────────────────────────────
  // Weights reflect empirical contribution to time-to-placement.
  const W = {
    roleDemand:       0.30,  // reduced by 0.02 to make room for uniqueness
    transferability:  0.18,
    seniority:        0.14,
    marketCycle:      0.16,
    geo:              0.10,
    brand:            0.06,
    perf:             0.04,
    uniqueness:       0.02,  // small but directionally correct signal
  };

  const raw =
    W.roleDemand       * roleDemandScore +
    W.transferability  * transferabilityScore +
    W.seniority        * seniorityVelocityScore +
    W.marketCycle      * marketCycleScore +
    W.geo              * geoScore +
    W.brand            * brandScore +
    W.perf             * perfScore +
    W.uniqueness       * (0.50 + uniquenessBonus); // base 0.5 + depth bonus

  const score = Math.round(Math.min(100, Math.max(0, raw * 100)));

  // ── Months-to-reemploy model ──────────────────────────────────────────────
  // Inverse sigmoid: high liquidity → short time, low liquidity → long time.
  // Calibrated: score 80 → ~1.5 months, score 50 → ~4 months, score 20 → ~9 months.
  // surgeMonthsAdded: additional time from simultaneous co-located peer layoffs.
  //
  // City-level avgPlacementWeeks anchor: when US city data is available, blend
  // the model estimate (60%) with the empirical city anchor (40%). This ensures
  // Phoenix (~24 weeks = 5.5mo) and SF (~12 weeks = 2.8mo) produce meaningfully
  // different timelines even before score differences are accounted for.
  const baseMonthsToReemploy = computeMonthsToReemploy(score, tenureYears);
  const cityAnchorMonths = cityRoleData ? cityRoleData.avgPlacementWeeks / 4.333 : null;
  const blendedBaseMonths = cityAnchorMonths
    ? (baseMonthsToReemploy * 0.60 + cityAnchorMonths * 0.40)
    : baseMonthsToReemploy;
  // Remote-first timeline reduction: 35% shorter than location-constrained search.
  // Derived from We Work Remotely + Remote OK + Hired.com 2024 data showing
  // distributed-team candidates close offers ~35% faster than location-tied peers
  // (parallel pipelines across timezones; no relocation friction).
  const REMOTE_FIRST_TIMELINE_FACTOR = 0.65;
  const preRemoteMonths = blendedBaseMonths + surgeMonthsAdded;
  const monthsToReemploy = isRemoteFirst
    ? Math.round(preRemoteMonths * REMOTE_FIRST_TIMELINE_FACTOR * 2) / 2
    : Math.round(preRemoteMonths * 2) / 2;

  // ── Tier classification ───────────────────────────────────────────────────
  const tier = score >= 68 ? 'Fast'
    : score >= 48 ? 'Moderate'
    : score >= 32 ? 'Slow'
    : 'Very Slow';

  const tierColor = tier === 'Fast' ? 'emerald'
    : tier === 'Moderate' ? 'amber'
    : tier === 'Slow' ? 'orange'
    : 'red';

  // ── Barriers and accelerators ─────────────────────────────────────────────
  const factorScores = [
    { key: 'roleDemand', score: roleDemandScore, name: 'Role Market Demand' },
    { key: 'transferability', score: transferabilityScore, name: 'Skills Transferability' },
    { key: 'seniority', score: seniorityVelocityScore, name: 'Seniority Placement Speed' },
    { key: 'marketCycle', score: marketCycleScore, name: 'Sector Hiring Cycle' },
    { key: 'geo', score: geoScore, name: 'Geographic Market Depth' },
    { key: 'brand', score: brandScore, name: 'Company Brand Halo' },
    { key: 'perf', score: perfScore, name: 'Performance Track Record' },
  ];

  const sorted = [...factorScores].sort((a, b) => a.score - b.score);
  const keyBarriers = sorted.slice(0, 2).map(f => buildBarrierMessage(f.key, f.score, inputs));
  const keyAccelerators = sorted.slice(-2).reverse().map(f => buildAcceleratorMessage(f.key, f.score, inputs));

  // ── Market demand trend ───────────────────────────────────────────────────
  const marketDemandTrend: 'rising' | 'stable' | 'falling' =
    roleDemandScore >= 0.72 ? 'rising'
    : roleDemandScore >= 0.45 ? 'stable'
    : 'falling';

  // ── Detailed factors for UI breakdown ─────────────────────────────────────
  const factors: LiquidityFactor[] = [
    {
      name: 'Role Market Demand',
      value: roleDemandScore,
      weight: W.roleDemand,
      label: roleDemandLabel,
      detail: buildDemandDetail(normalizedKey, roleDemandScore, industry),
    },
    {
      name: 'Skills Transferability',
      value: transferabilityScore,
      weight: W.transferability,
      label: transferabilityScore >= 0.65 ? 'Highly Transferable' : transferabilityScore >= 0.45 ? 'Moderately Transferable' : 'Niche Skills',
      detail: `Skills applicable across ${Math.round(transferabilityScore * 10)} of 10 major industry verticals.`,
    },
    {
      name: 'Seniority Fit',
      value: seniorityVelocityScore,
      weight: W.seniority,
      label: tenureYears >= 12 ? 'Principal/Expert (slower search, higher comp)' : tenureYears >= 5 ? 'Mid-Senior (balanced speed/comp)' : 'Early Career (fast placement, comp variance)',
      detail: `${experienceBracket} years experience. Senior roles take longer to fill but preserve more compensation.`,
    },
    {
      name: 'Sector Hiring Cycle',
      value: marketCycleScore,
      weight: W.marketCycle,
      label: marketCycleScore >= 0.65 ? 'Sector Actively Hiring' : marketCycleScore >= 0.50 ? 'Mixed Signals' : 'Sector Downturn Underway',
      detail: `Current layoff risk of ${riskScore}/100 at your company reflects broader sector conditions — ${marketCycleScore < 0.5 ? 'elevated supply of available talent compresses offers' : 'sector is still absorbing talent'}.`,
    },
    {
      name: 'Geographic Depth',
      value: geoScore,
      weight: W.geo,
      label: geoScore >= 0.90 ? 'Deep Market' : geoScore >= 0.78 ? 'Good Depth' : geoScore >= 0.60 ? 'Crowded Market' : 'Supply-Surge Risk',
      detail: geoClusterActiveCuts > 0
        ? `${metro?.metroName ?? usCityProfile?.cityName ?? regionKey} market: ${geoClusterActiveCuts} co-located peer company layoffs flooding local supply. `
          + `Static depth reduced by ${Math.round((dynamicSurgePenalty + staticConcentrationPenalty) * 100)}% — consider remote roles to escape local competition.`
        : usCityProfile && cityRoleData
        ? `${usCityProfile.cityName} (Tier ${usCityProfile.tier}): ~${cityRoleData.employerCount.toLocaleString()} active employers for this role, `
          + `median ${cityRoleData.avgPlacementWeeks} weeks to offer. `
          + (usCityProfile.relocationPressure === 'high' ? 'Many Staff+ roles require relocation or targeting remote positions. ' : '')
          + (cityRoleData.salaryPremiumPct > 0 ? `Salary premium +${cityRoleData.salaryPremiumPct}% vs national median.` : `Salary ${Math.abs(cityRoleData.salaryPremiumPct)}% below national median.`)
          + ' ESTIMATED from Hired.com / LinkedIn Workforce Report 2024.'
        : `${regionKey} market has ${geoScore >= 0.90 ? 'the highest' : geoScore >= 0.80 ? 'strong' : 'moderate'} employer density for this role type.`,
    },
    {
      name: 'Company Brand Halo',
      value: brandScore,
      weight: W.brand,
      label: isPublic ? 'Public Company Alumni' : companySize === 'large' || companySize === 'mega' ? 'Large Company Pedigree' : 'Startup/Mid-Market',
      detail: `${isPublic ? 'Public company' : companySize === 'large' ? 'Large company' : 'Your company size'} pedigree ${brandScore >= 0.65 ? 'accelerates recruiter inbound' : 'provides modest advantage'}.`,
    },
  ];

  // Role not found: rawDemand fallback is 0.55 (industry median). Flag this clearly.
  const confidenceNote = !roleFoundInTable
    ? `Role "${oracleKey}" not in demand velocity database — liquidity score estimated from ${industry} industry median. Accuracy: ±15 pts.`
    : null;

  // Build supply-surge narrative for the result
  const geoSupplySurge = metro ? {
    metroName: metro.metroName,
    geoConcentrationScore: effectiveConcentration,
    geoClusterActiveCuts,
    surgeMonthsAdded,
    surgeNarrative: geoClusterActiveCuts > 0
      ? `${metro.metroName} supply surge: ${geoClusterActiveCuts} co-located peer company layoff${geoClusterActiveCuts > 1 ? 's' : ''} ` +
        `competing for the same local roles. ESTIMATED ${surgeMonthsAdded.toFixed(1)} additional months on re-employment timeline. ` +
        `Targeting remote-first or out-of-metro roles reduces this penalty by up to ${Math.round(dynamicSurgePenalty * 100)}%.`
      : `${metro.metroName} is a high-concentration tech cluster (${Math.round(effectiveConcentration * 100)}/100 density). ` +
        `No co-located peers currently cutting — local supply is stable. ` +
        `If a wave hits, supply surge would add ${(1 * 0.75).toFixed(1)}–${(3 * 0.75).toFixed(1)} months per co-located layoff.`,
  } : undefined;

  // Build city-level market intelligence object for the result
  const cityMarketIntelligence = usCityProfile && cityRoleData ? {
    cityName:                 usCityProfile.cityName,
    tier:                     usCityProfile.tier,
    marketDepthScore:         usCityProfile.marketDepthScore,
    employerCount:            cityRoleData.employerCount,
    avgPlacementWeeks:        cityRoleData.avgPlacementWeeks,
    salaryPremiumPct:         cityRoleData.salaryPremiumPct,
    relocationPressure:       usCityProfile.relocationPressure,
    post2023FreezeAdjustment: usCityProfile.post2023FreezeAdjustment,
    cityNarrative:            usCityProfile.marketNarrative,
    labeledAs:                'ESTIMATED' as const,
  } : undefined;

  // Build remote-first advantage object — converts L9 from local market to global access.
  // INTERNATIONAL_HIRING_FRICTION_DISCOUNT (0.35): empirical estimate from remote
  // hiring platforms showing ~35% of fully-remote roles are accessible to candidates
  // outside the company's primary timezone band (legal/tax structure, contractor vs
  // employee, payroll geography constraints reduce nominal "global" openings by ~65%).
  let remoteFirstAdvantage: JobMarketLiquidityResult['remoteFirstAdvantage'] = undefined;
  if (isRemoteFirst) {
    const INTERNATIONAL_HIRING_FRICTION_DISCOUNT = 0.35;
    const effectiveGlobal = globalOpenings ?? 0;
    const accessibleOpenings = Math.round(effectiveGlobal * INTERNATIONAL_HIRING_FRICTION_DISCOUNT);
    const localOpenings = cityRoleData?.employerCount ?? 0;
    const accessLift = localOpenings > 0
      ? Math.round((accessibleOpenings / localOpenings) * 10) / 10
      : (accessibleOpenings > 0 ? Infinity : 0);

    const monthsBeforeAdjustment = Math.round(preRemoteMonths * 2) / 2;
    const monthsAfterAdjustment = monthsToReemploy;

    const liftLabel = accessLift === Infinity
      ? 'global market access vs. no local market data'
      : accessLift >= 2
        ? `${accessLift}× the local-market access`
        : `comparable to local-market access`;

    const openingsLine = accessibleOpenings > 0 && localOpenings > 0
      ? `${accessibleOpenings.toLocaleString()} accessible openings globally vs ${localOpenings.toLocaleString()} locally (${liftLabel}).`
      : accessibleOpenings > 0
        ? `${accessibleOpenings.toLocaleString()} globally accessible openings for this role (ESTIMATED at 35% of ${effectiveGlobal.toLocaleString()} global postings — international hiring friction discount).`
        : `Global openings count unavailable for this role — verify on We Work Remotely, Remote OK, AngelList Talent.`;

    const timelineLine = monthsBeforeAdjustment > monthsAfterAdjustment
      ? `Re-employment timeline ${monthsBeforeAdjustment.toFixed(1)} → ${monthsAfterAdjustment.toFixed(1)} months (35% faster than location-tied search).`
      : `Re-employment timeline unchanged from baseline (data quality limits adjustment).`;

    const narrative =
      `Your remote-first status converts L9 from local-market to global-market access. ` +
      openingsLine + ' ' + timelineLine + ' ' +
      `Target companies with distributed engineering teams (Deel, Remote, Toptal alumni network) and document ` +
      `your previous remote work productivity (async output, written communication, on-call coverage metrics) ` +
      `in your resume's leadership section — this is the differentiator at remote-first employer screen. (ESTIMATED)`;

    remoteFirstAdvantage = {
      accessibleOpenings,
      localOpenings,
      accessLift: accessLift === Infinity ? 99 : accessLift,
      timelineFactor: 0.65,
      monthsBeforeAdjustment,
      monthsAfterAdjustment,
      narrative,
      labeledAs: 'ESTIMATED',
    };
  }

  return {
    score,
    monthsToReemploy,
    tier,
    tierColor,
    factors,
    keyBarriers,
    keyAccelerators,
    salaryPreservation: computeMarketAdjustedSalaryPreservation(seniorityProfile.salaryPreservation, regionKey),
    marketDemandTrend,
    confidenceNote,
    geoSupplySurge,
    cityMarketIntelligence,
    remoteFirstAdvantage,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normaliseRegion(region: string): string {
  const r = region.trim().toUpperCase();
  const aliases: Record<string, string> = {
    'INDIA': 'IN', 'UNITED STATES': 'US', 'USA': 'US', 'UNITED KINGDOM': 'GB',
    'UK': 'GB', 'GERMANY': 'DE', 'SINGAPORE': 'SG', 'AUSTRALIA': 'AU', 'CANADA': 'CA',
    'EUROPE': 'EU', 'EU': 'EU', 'GLOBAL': 'US',
  };
  return aliases[r] ?? r;
}

function lookupRoleDemand(key: string): number {
  if (ROLE_DEMAND_VELOCITY[key] !== undefined) return ROLE_DEMAND_VELOCITY[key];
  // Prefix match fallback
  for (const [prefix, val] of Object.entries(ROLE_DEMAND_VELOCITY)) {
    if (key.startsWith(prefix) || prefix.startsWith(key.split('_')[0])) return val;
  }
  return 0.55; // industry median fallback
}

function lookupIndustryMultiplier(industry: string): number {
  for (const [key, mult] of Object.entries(INDUSTRY_DEMAND_MULTIPLIER)) {
    if (industry.includes(key) || key.includes(industry.split(' ')[0])) return mult;
  }
  return 1.0;
}

function computeTransferability(roleKey: string, industry: string): number {
  // Tech/engineering roles are broadly transferable; specialist or niche roles less so
  const highTransfer = ['sw_', 'ml_', 'data_', 'security', 'devops', 'cloud', 'product_manager', 'platform'];
  const lowTransfer = ['bpo', 'cnt_', 'telemarket', 'data_entry', 'adm_', 'gcc_'];
  if (highTransfer.some(p => roleKey.startsWith(p))) return 0.78;
  if (lowTransfer.some(p => roleKey.startsWith(p))) return 0.30;
  // Industry specificity penalty
  const nicheIndustries = ['bpo', 'edtech', 'gaming', 'aviation'];
  if (nicheIndustries.some(n => industry.toLowerCase().includes(n))) return 0.42;
  return 0.58;
}

function computeMonthsToReemploy(score: number, tenureYears: number): number {
  // Base: inverse linear mapping score → months (score 100 = 0.8 months, score 0 = 12 months)
  const base = 0.8 + (100 - score) * 0.112;
  // Seniority premium: very senior roles take longer regardless of demand
  const seniorityPenalty = tenureYears >= 15 ? 1.5
    : tenureYears >= 10 ? 1.2
    : tenureYears >= 5 ? 1.0
    : 0.85;
  return Math.round(Math.min(18, Math.max(0.5, base * seniorityPenalty)) * 2) / 2; // nearest 0.5
}

function deriveExperienceBracket(years: number): string {
  if (years < 2) return '0-2';
  if (years < 5) return '2-5';
  if (years < 10) return '5-10';
  if (years < 15) return '10-15';
  return '15+';
}

function buildDemandDetail(roleKey: string, score: number, industry: string): string {
  if (score >= 0.80) return `Strong market demand — ${industry} companies are actively competing for this role type in 2026.`;
  if (score >= 0.60) return `Consistent demand — roles like yours appear regularly in major job platforms with moderate competition.`;
  if (score >= 0.40) return `Demand softening — AI tools are reducing new hire volumes for this role category.`;
  return `Structural decline — demand for this role type is falling as AI automates core tasks.`;
}

function buildBarrierMessage(key: string, score: number, inputs: LiquidityInputs): string {
  const map: Record<string, string> = {
    roleDemand: `Low market demand for ${inputs.oracleKey.replace(/_/g, ' ')} roles reduces inbound recruiter volume and extends active search time.`,
    transferability: `Niche skills limit cross-industry options — most open roles require industry-specific experience that does not transfer broadly.`,
    seniority: `Senior profiles take 20–40% longer to place — fewer openings, longer interview cycles, executive reference requirements.`,
    marketCycle: `Sector downturn means more qualified candidates competing for fewer open roles — expect compressed offers and longer process.`,
    geo: `Limited employer density in ${inputs.region} market — consider remote-first companies or geographic mobility to expand options.`,
    brand: `Smaller company pedigree means fewer automatic recruiter inbounds — proactive outreach is essential.`,
    perf: `Performance uncertainty reduces offer conversion rates at the final stage — document measurable achievements before interviews.`,
  };
  return map[key] ?? `${key} is a drag on placement speed.`;
}

function buildAcceleratorMessage(key: string, score: number, inputs: LiquidityInputs): string {
  const map: Record<string, string> = {
    roleDemand: `High market demand for your role type means recruiters are actively sourcing — a well-maintained LinkedIn profile will generate inbounds within days.`,
    transferability: `Broadly transferable skills open doors across industries — use this to target higher-growth verticals rather than same-sector roles.`,
    seniority: `Your ${inputs.tenureYears}+ years of experience lets you target senior positions with higher comp floors and stronger negotiating position.`,
    marketCycle: `Your sector is still absorbing talent despite some headwinds — your current company's signal is not yet reflected in hiring slowdowns across the industry.`,
    geo: `Deep employer market in ${inputs.region} gives you a shorter active search cycle — more qualified leads per week means faster close.`,
    brand: `Alumni from public/large companies have higher response rates — leverage your pedigree in outreach.`,
    perf: `Strong performance signals (visible in your record) accelerate offer decisions at the final stage.`,
  };
  return map[key] ?? `${key} is a strength that speeds placement.`;
}
