// marketPriorityEngine.ts — Market expansion prioritization and revenue density analysis.
//
// CORE QUESTION: Which 3 markets beyond India have the lowest localization cost
// and highest revenue density per localization investment dollar?
//
// ANSWER (derived from TECH_MARKET_PROFILES data):
//
//   Rank | Market    | Revenue density | Localization cost | Why
//   ─────┼───────────┼─────────────────┼───────────────────┼───────────────────────────────────
//   1    | US        | 100 (baseline)  | $0                | Already built. WARN + H1B + WARN.
//   2    | India     | 91              | $10K (mostly done)| Volume × English. GCC moat.
//   3    | UK        | 87              | $15K              | English native + Skilled Worker visa.
//   4    | Singapore | 72              | $12K              | English + EP high-anxiety + APAC GCC.
//   5    | Canada    | 64              | $20K              | English + LMIA = maximum anxiety.
//   6    | Ireland   | 55              | $12K              | FAANG EU HQ = parent-contagion use case.
//   7    | Australia | 52              | $18K              | English + TSS visa.
//
// TOP 3 BEYOND INDIA:
//   UK → SG → CA (by revenue density). Bundle IE with UK for near-zero marginal cost.
//
// REVENUE-PER-USER CEILING BY MARKET:
//   US:  $119.88/year (tested at $9.99/mo)
//   AU:  $87.12/year
//   IE:  $116.04/year
//   CA:  $78.72/year
//   SG:  $80.16/year
//   UK:  $106.32/year
//   IN:  $43.20/year  (volume market — compensates with scale)

import {
  TECH_MARKET_PROFILES,
  getMarketsByRevenueDensity,
  getMarketsByTier,
  computeMarketSummary,
  type TechMarketProfile,
} from '../data/marketIntelligence';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MarketExpansionRanking {
  rank: number;
  market: TechMarketProfile;
  revenueDensityScore: number;
  /** Revenue density rank within English-capability markets only */
  englishMarketRank: number | null;
  /** Estimated payback period: localizationCost / (TAM × monthlyConversionRate) in months */
  paybackPeriodMonths: number;
  /** Key insight for expansion decision */
  expansionInsight: string;
}

export interface MarketExpansionReport {
  /** All markets ranked by revenue density */
  rankings: MarketExpansionRanking[];
  /** Top 3 markets beyond India (English-capable, highest revenue density) */
  top3BeyondIndia: TechMarketProfile[];
  /** Revenue-per-user ceiling by market, USD/year */
  revenuePerUserCeilingByMarket: Array<{ countryCode: string; countryName: string; annualRevenuePerUserUSD: number; flagEmoji: string }>;
  /** Aggregate TAM across all Tier 1 markets */
  tier1TotalTAMMillionsUSD: number;
  /** Aggregate TAM across all tracked markets */
  totalTAMMillionsUSD: number;
  summary: string;
}

// ── Computation ───────────────────────────────────────────────────────────────

export function computeMarketExpansionReport(): MarketExpansionReport {
  const sorted = getMarketsByRevenueDensity();

  // English-capable markets ranked separately for localization-cost analysis
  const englishMarkets = sorted.filter(
    m => m.englishCapability === 'native' || m.englishCapability === 'high',
  );

  const rankings: MarketExpansionRanking[] = sorted.map((market, i) => {
    const englishRank = englishMarkets.findIndex(m => m.countryCode === market.countryCode);

    // Payback: localizationCost / (TAM_monthly_run_rate)
    // TAM monthly = TAM_reachable_annual / 12
    const monthlyRunRateMillions = market.tamReachableMillionsUSD / 12;
    const payback = market.localizationCostEstimateUSD === 0
      ? 0
      : Math.round(market.localizationCostEstimateUSD / (monthlyRunRateMillions * 1_000_000) * 10) / 10;

    return {
      rank: i + 1,
      market,
      revenueDensityScore: market.revenueDensityScore,
      englishMarketRank: englishRank >= 0 ? englishRank + 1 : null,
      paybackPeriodMonths: payback,
      expansionInsight: buildExpansionInsight(market, payback),
    };
  });

  // Top 3 beyond India — English-capable, excluding US (already built) and IN (separate)
  const beyondIndia = TECH_MARKET_PROFILES
    .filter(m => m.countryCode !== 'US' && m.countryCode !== 'IN')
    .filter(m => m.englishCapability === 'native' || m.englishCapability === 'high')
    .sort((a, b) => b.revenueDensityScore - a.revenueDensityScore);
  const top3 = beyondIndia.slice(0, 3);

  const tier1Markets = getMarketsByTier('tier_1');
  const tier1TAM = tier1Markets.reduce((s, m) => s + m.tamReachableMillionsUSD, 0);
  const totalTAM = TECH_MARKET_PROFILES.reduce((s, m) => s + m.tamReachableMillionsUSD, 0);

  const revenuePerUserCeiling = [...TECH_MARKET_PROFILES]
    .sort((a, b) => b.annualRevenuePerUserUSD - a.annualRevenuePerUserUSD)
    .map(m => ({
      countryCode: m.countryCode,
      countryName: m.countryName,
      flagEmoji: m.flagEmoji,
      annualRevenuePerUserUSD: m.annualRevenuePerUserUSD,
    }));

  const top3Names = top3.map(m => m.countryName).join(', ');
  const summary =
    `Tier 1 TAM: $${tier1TAM.toFixed(0)}M across US+UK+India+SG+CA. ` +
    `Total tracked: $${totalTAM.toFixed(0)}M across 12 markets. ` +
    `Top 3 English markets beyond India by revenue density: ${top3Names}. ` +
    `UK: ${top3[0]?.revenueDensityScore ?? 0}/100 density, $${top3[0]?.localizationCostEstimateUSD.toLocaleString() ?? 0} localization. ` +
    `SG: ${top3[1]?.revenueDensityScore ?? 0}/100 density, $${top3[1]?.localizationCostEstimateUSD.toLocaleString() ?? 0} localization. ` +
    `CA: ${top3[2]?.revenueDensityScore ?? 0}/100 density, $${top3[2]?.localizationCostEstimateUSD.toLocaleString() ?? 0} localization.`;

  return {
    rankings,
    top3BeyondIndia: top3,
    revenuePerUserCeilingByMarket: revenuePerUserCeiling,
    tier1TotalTAMMillionsUSD: Math.round(tier1TAM * 10) / 10,
    totalTAMMillionsUSD: Math.round(totalTAM * 10) / 10,
    summary,
  };
}

function buildExpansionInsight(market: TechMarketProfile, paybackMonths: number): string {
  if (market.localizationCostEstimateUSD === 0) {
    return `No localization investment required. Full TAM accessible from day one. Revenue density is the system baseline.`;
  }
  const paybackStr = paybackMonths < 1 ? '<1 month' : `${paybackMonths.toFixed(1)} months`;
  const densityLabel = market.revenueDensityScore >= 80 ? 'Tier 1 density' :
    market.revenueDensityScore >= 55 ? 'Tier 2 density' : 'Tier 3 density';
  return `${densityLabel}. $${market.localizationCostEstimateUSD.toLocaleString()} localization investment. ` +
    `Payback at 100% TAM conversion: ${paybackStr}. ` +
    `${market.englishCapability === 'native' || market.englishCapability === 'high'
      ? 'English-capable — lowest marginal content cost.'
      : `${market.primaryLanguage} localization required — higher content investment barrier.`}`;
}

// ── Salary ceiling by market (for salaryPreservation calibration) ─────────────
//
// The jobMarketLiquidityService currently uses a crude seniority-only table.
// These salary anchors calibrate salaryPreservation to market-specific ceilings:
// a UK tech professional at £65K can preserve more salary than an Indian IT
// professional at ₹15L when both have equivalent seniority profiles.

export const SALARY_PRESERVATION_BY_MARKET: Record<string, {
  medianSalaryUSD: number;
  preservationFloor: number;   // minimum preservation% at any seniority (senior roles in downturns)
  preservationCeiling: number; // maximum preservation% (strong market, high demand)
  currencyNote: string;
}> = {
  US: { medianSalaryUSD: 140_000, preservationFloor: 72, preservationCeiling: 95, currencyNote: 'USD' },
  GB: { medianSalaryUSD: 82_000,  preservationFloor: 68, preservationCeiling: 90, currencyNote: 'GBP (£65K median)' },
  SG: { medianSalaryUSD: 78_000,  preservationFloor: 65, preservationCeiling: 92, currencyNote: 'SGD (SGD 105K median)' },
  CA: { medianSalaryUSD: 78_000,  preservationFloor: 66, preservationCeiling: 90, currencyNote: 'CAD (CAD 107K median)' },
  AU: { medianSalaryUSD: 86_000,  preservationFloor: 65, preservationCeiling: 88, currencyNote: 'AUD (AUD 130K median)' },
  IE: { medianSalaryUSD: 90_000,  preservationFloor: 68, preservationCeiling: 93, currencyNote: 'EUR (€83K median)' },
  DE: { medianSalaryUSD: 82_000,  preservationFloor: 64, preservationCeiling: 88, currencyNote: 'EUR (€70K median)' },
  NL: { medianSalaryUSD: 81_000,  preservationFloor: 63, preservationCeiling: 88, currencyNote: 'EUR (€75K median)' },
  FR: { medianSalaryUSD: 65_000,  preservationFloor: 60, preservationCeiling: 85, currencyNote: 'EUR (€60K median)' },
  IN: { medianSalaryUSD: 18_000,  preservationFloor: 45, preservationCeiling: 72, currencyNote: 'INR (₹15L median — high supply, competitive)' },
  AE: { medianSalaryUSD: 95_000,  preservationFloor: 62, preservationCeiling: 88, currencyNote: 'AED (AED 350K median) — no tax distortion' },
  JP: { medianSalaryUSD: 58_000,  preservationFloor: 70, preservationCeiling: 92, currencyNote: 'JPY (¥8.5M median — lifetime employment norm inflates preservation)' },
};

/** Get salary preservation calibration for a country code.
 *  Falls back to US profile when country not in registry. */
export function getSalaryPreservationProfile(countryCode: string): typeof SALARY_PRESERVATION_BY_MARKET['US'] {
  return SALARY_PRESERVATION_BY_MARKET[countryCode.toUpperCase()]
    ?? SALARY_PRESERVATION_BY_MARKET['US'];
}
