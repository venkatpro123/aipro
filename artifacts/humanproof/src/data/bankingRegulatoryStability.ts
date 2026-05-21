// bankingRegulatoryStability.ts — Country-level banking sector stability modifier.
//
// PURPOSE: A Canadian Big Five bank employee (RBC, TD, BMO, CIBC, Scotiabank) faces
// structurally different layoff risk than a US bank employee at the same composite
// score level. Previously L4 (Market Conditions) used a single 'Banking' baseline
// (0.35) for every country — a Canadian Big Five SWE and a US regional bank SWE
// received identical industry headwinds.
//
// THE GAP THIS FIXES:
//   - Canadian Big Five: no systemic bank failure since the 1923 Home Bank collapse.
//     OSFI capital requirements stricter than US Fed (Basel III + Canadian add-ons).
//     Historically very conservative layoff patterns — even in 2008, Canadian banks
//     did NOT execute large layoffs (RBC trimmed ~3% vs US peers cutting 15-25%).
//   - US banks: at-will employment + aggressive cost-cutting (Wells Fargo, Citi
//     have repeatedly announced 5-10% workforce cuts during downturns).
//   - UK banks: PRA + FCA supervision tightened post-2008. Barclays/HSBC trim but
//     less aggressively than US peers.
//   - Switzerland: pre-2023 was pristine; Credit Suisse failure (March 2023)
//     showed even high-capital regimes can fail. Modifier reflects the reset.
//   - Singapore: MAS strict; DBS/OCBC/UOB historically extremely stable.
//   - Japan: BOJ + FSA + lifetime employment culture → lowest baseline globally.
//
// HOW IT FEEDS L4:
//   When industry resolves to a banking-related sector (Banking, Financial Services,
//   NBFC / Lending), apply BANKING_STABILITY_MULTIPLIER[region] to the baseline.
//   - Canadian Big Five: 0.35 × 0.68 = 0.238 effective baseline
//   - US bank:           0.35 × 1.00 = 0.350 (reference)
//   - Japanese bank:     0.35 × 0.65 = 0.228
//   - Brazilian bank:    0.35 × 1.10 = 0.385 (higher volatility)
//
// LABELED: ESTIMATED — multipliers derived from documented systemic stability
// patterns 2008-2026. Calibration pending regression on validated layoff-vs-country
// outcomes once ≥200 verified banking-sector events accumulate per country.

export interface BankingStabilityProfile {
  countryCode: string;            // ISO 3166-1 alpha-2
  countryName: string;
  flagEmoji: string;
  /** Multiplier on banking-sector baseline risk (1.00 = US reference).
   *  <1.0 = more stable than US; >1.0 = more volatile than US. */
  stabilityMultiplier: number;
  /** Primary banking regulator(s) */
  primaryRegulator: string;
  /** Short rationale for the multiplier */
  rationale: string;
  /** Key systemic events that informed the calibration */
  historicalContext: string;
  /** Major banks in this jurisdiction (for company name resolution) */
  majorBanks: readonly string[];
  labeledAs: 'ESTIMATED';
}

// ── Banking regulatory stability registry ─────────────────────────────────────

export const BANKING_REGULATORY_STABILITY: Record<string, BankingStabilityProfile> = {

  // ── Canada — 0.68× (lowest in OECD ex-Japan) ──────────────────────────────
  // Big Five Canadian banks have NEVER had a systemic failure since the 1923
  // Home Bank collapse. OSFI capital requirements include a Basel III countercyclical
  // buffer + domestic stability buffer (DSB) that materially exceeds US Fed minimums.
  // Even in 2008 GFC, Canadian banks did not require government bailouts.
  CA: {
    countryCode: 'CA',
    countryName: 'Canada',
    flagEmoji: '🇨🇦',
    stabilityMultiplier: 0.68,
    primaryRegulator: 'OSFI (Office of the Superintendent of Financial Institutions)',
    rationale: 'OSFI imposes stricter capital + countercyclical buffer requirements than US Fed. ' +
      'Big Five oligopolistic market structure + Domestic Stability Buffer (DSB up to 2.5%) ' +
      'creates structural stability. Historically very conservative layoff patterns even in downturns.',
    historicalContext: 'No systemic Canadian bank failure since 1923 (Home Bank). In 2008 GFC: no ' +
      'Canadian bank required government bailout; cuts averaged ~3% vs US peers at 15-25%. ' +
      'IMF repeatedly ranks Canadian banking sector among most stable globally.',
    majorBanks: ['rbc', 'royal bank of canada', 'td', 'td bank', 'bmo', 'bank of montreal', 'cibc', 'scotiabank', 'national bank of canada'],
    labeledAs: 'ESTIMATED',
  },

  // ── United States — 1.00× (reference baseline) ─────────────────────────────
  US: {
    countryCode: 'US',
    countryName: 'United States',
    flagEmoji: '🇺🇸',
    stabilityMultiplier: 1.00,
    primaryRegulator: 'Federal Reserve + OCC + FDIC + state regulators',
    rationale: 'Reference baseline. At-will employment + aggressive cost-cutting + ' +
      'fragmented regulator landscape. Repeated documented large workforce cuts (Wells Fargo, ' +
      'Citi, Bank of America historically execute 5-10% cuts during downturns).',
    historicalContext: '2008 GFC required multi-trillion bailout (TARP). Silicon Valley Bank failure ' +
      '(March 2023) + First Republic + Signature Bank — multiple regional bank failures within weeks. ' +
      'Post-2023 regional banking stress signals continued vulnerability.',
    majorBanks: ['jpmorgan', 'jp morgan', 'bank of america', 'bofa', 'wells fargo', 'citigroup', 'citi', 'goldman sachs', 'morgan stanley', 'us bank', 'pnc', 'truist', 'capital one'],
    labeledAs: 'ESTIMATED',
  },

  // ── United Kingdom — 0.85× ────────────────────────────────────────────────
  UK: {
    countryCode: 'UK',
    countryName: 'United Kingdom',
    flagEmoji: '🇬🇧',
    stabilityMultiplier: 0.85,
    primaryRegulator: 'PRA (Prudential Regulation Authority) + FCA',
    rationale: 'Post-2008 reforms (Vickers Commission ring-fencing) split retail + investment banking. ' +
      'PRA capital requirements exceeded EU minimums. UK banks moderately conservative but not as ' +
      'oligopolistic as Canada — competitive pressure from challenger banks (Monzo, Starling, Revolut).',
    historicalContext: '2008 GFC required RBS + Lloyds bailout (~£500B exposure). Post-2008 ring-fencing ' +
      'and 13% common equity Tier 1 ratio requirements stabilized the sector. No major UK bank failure ' +
      '2008-2026. Barclays/HSBC have trimmed but typically 2-5% not 10%+.',
    majorBanks: ['hsbc', 'barclays', 'lloyds', 'natwest', 'standard chartered', 'rbs', 'royal bank of scotland'],
    labeledAs: 'ESTIMATED',
  },
  GB: {
    countryCode: 'GB',
    countryName: 'United Kingdom',
    flagEmoji: '🇬🇧',
    stabilityMultiplier: 0.85,
    primaryRegulator: 'PRA (Prudential Regulation Authority) + FCA',
    rationale: 'See UK entry — alias for ISO code GB.',
    historicalContext: 'See UK entry.',
    majorBanks: ['hsbc', 'barclays', 'lloyds', 'natwest', 'standard chartered'],
    labeledAs: 'ESTIMATED',
  },

  // ── Germany — 0.78× ───────────────────────────────────────────────────────
  // Sparkassen (public savings banks) extremely stable; Landesbanken volatile.
  // Deutsche Bank troubled but BaFin tightened after 2014 LIBOR settlements.
  DE: {
    countryCode: 'DE',
    countryName: 'Germany',
    flagEmoji: '🇩🇪',
    stabilityMultiplier: 0.78,
    primaryRegulator: 'BaFin + Deutsche Bundesbank + ECB SSM',
    rationale: 'Three-pillar system (private banks, Sparkassen, cooperative banks) creates structural ' +
      'diversification. Sparkassen historically near-zero failure rate. Betriebsrat consultation ' +
      'requirement adds 30-90 days to any cut decision — slows layoff velocity vs US.',
    historicalContext: 'Deutsche Bank reduced 18k jobs 2019-2022 over 3 years (vs typical US peer ' +
      'compressing same headcount cut into 6-12 months). Landesbank failures (WestLB 2012) absorbed ' +
      'without systemic spread. No Sparkasse has failed in 200+ years.',
    majorBanks: ['deutsche bank', 'commerzbank', 'sparkasse', 'landesbank', 'kfw', 'lbbw'],
    labeledAs: 'ESTIMATED',
  },

  // ── France — 0.82× ────────────────────────────────────────────────────────
  FR: {
    countryCode: 'FR',
    countryName: 'France',
    flagEmoji: '🇫🇷',
    stabilityMultiplier: 0.82,
    primaryRegulator: 'ACPR (Autorité de contrôle prudentiel) + AMF + ECB SSM',
    rationale: 'French banks (BNP Paribas, Société Générale, Crédit Agricole) maintain strong CET1 ' +
      'ratios. PSE requirements + DREETS validation add 2-4 months to any restructuring. ' +
      'Long collective bargaining tradition reduces sudden mass layoffs.',
    historicalContext: 'No French bank failed in 2008. SocGen rogue trader incident (2008, €4.9B loss) ' +
      'absorbed without systemic spread. Restructurings (BNP Paribas 2021 plan) executed over 3+ years ' +
      'via PSE rather than rapid cuts.',
    majorBanks: ['bnp paribas', 'societe generale', 'credit agricole', 'bpce', 'natixis'],
    labeledAs: 'ESTIMATED',
  },

  // ── Switzerland — 0.95× (post-Credit-Suisse reset) ────────────────────────
  // Pre-2023 was 0.70× (UBS/Credit Suisse considered fortress). March 2023
  // Credit Suisse emergency takeover by UBS reset assumptions about Swiss banking
  // stability. FINMA reforms underway but the prior reputation was permanently dented.
  CH: {
    countryCode: 'CH',
    countryName: 'Switzerland',
    flagEmoji: '🇨🇭',
    stabilityMultiplier: 0.95,
    primaryRegulator: 'FINMA (Swiss Financial Market Supervisory Authority)',
    rationale: 'Pre-2023 considered most stable in Europe. Credit Suisse failure (March 2023) ' +
      'required emergency UBS takeover + CHF 100B liquidity injection. Reputation permanently ' +
      'reset. UBS now dominant (post-merger) but concentration risk is itself a structural concern.',
    historicalContext: 'Credit Suisse failed March 2023 after AT1 bond writedown — first major Swiss ' +
      'bank failure in modern era. UBS workforce cuts post-merger: ~3,000 in 2024, more expected. ' +
      'Cantonal banks remain very stable (no failures in modern era).',
    majorBanks: ['ubs', 'credit suisse', 'julius baer', 'pictet', 'lombard odier', 'cantonal bank'],
    labeledAs: 'ESTIMATED',
  },

  // ── Singapore — 0.72× ─────────────────────────────────────────────────────
  SG: {
    countryCode: 'SG',
    countryName: 'Singapore',
    flagEmoji: '🇸🇬',
    stabilityMultiplier: 0.72,
    primaryRegulator: 'MAS (Monetary Authority of Singapore)',
    rationale: 'MAS imposes stricter capital + liquidity requirements than Basel III minimums. ' +
      'DBS/OCBC/UOB oligopolistic structure + strong Singapore sovereign backstop. ' +
      'Historically very conservative layoff patterns — DBS has not had material layoffs in modern era.',
    historicalContext: 'No major Singapore bank failure since 1985 (Pan-Electric crisis affected ' +
      'one finance company, not a bank). DBS/OCBC/UOB navigated 2008 GFC + COVID-19 without large ' +
      'layoffs. Workforce reductions when they happen are typically <2% via attrition.',
    majorBanks: ['dbs', 'dbs bank', 'ocbc', 'uob', 'united overseas bank'],
    labeledAs: 'ESTIMATED',
  },

  // ── Japan — 0.65× (lowest globally) ───────────────────────────────────────
  // Lifetime employment culture + BOJ + FSA + post-1990s consolidation made
  // remaining banks extremely conservative on workforce changes.
  JP: {
    countryCode: 'JP',
    countryName: 'Japan',
    flagEmoji: '🇯🇵',
    stabilityMultiplier: 0.65,
    primaryRegulator: 'FSA (Financial Services Agency) + BOJ',
    rationale: 'Lifetime employment culture (shūshin koyō) + extremely conservative FSA supervision + ' +
      'post-1990s consolidation made surviving megabanks (MUFG, SMBC, Mizuho) deeply stable. ' +
      'Workforce changes happen via natural attrition not layoffs.',
    historicalContext: '1990s "Lost Decade" forced consolidation from 21 city banks to 3 megabanks. ' +
      'Since 2003, no major Japanese bank failure. Workforce reductions during 2008/2020/2023 cycles ' +
      'were achieved via hiring freezes + early retirement — not involuntary layoffs.',
    majorBanks: ['mufg', 'mitsubishi ufj', 'mizuho', 'smbc', 'sumitomo mitsui', 'nomura', 'daiwa'],
    labeledAs: 'ESTIMATED',
  },

  // ── Australia — 0.70× ─────────────────────────────────────────────────────
  AU: {
    countryCode: 'AU',
    countryName: 'Australia',
    flagEmoji: '🇦🇺',
    stabilityMultiplier: 0.70,
    primaryRegulator: 'APRA (Australian Prudential Regulation Authority) + ASIC',
    rationale: 'Big Four oligopoly (CBA, Westpac, NAB, ANZ) + APRA "unquestionably strong" capital ' +
      'mandate (CET1 ≥10.5%) creates structural stability similar to Canadian Big Five. ' +
      'Fair Work Commission + redundancy notice requirements slow layoff execution.',
    historicalContext: 'No Australian bank failure since the 1990 collapse of Pyramid Building Society. ' +
      'Big Four navigated 2008 + 2020 + 2023 without bailouts or major layoffs. Royal Commission ' +
      '(2018) prompted compliance hiring (not cuts).',
    majorBanks: ['cba', 'commonwealth bank', 'westpac', 'nab', 'national australia bank', 'anz', 'macquarie'],
    labeledAs: 'ESTIMATED',
  },

  // ── Hong Kong — 0.80× ─────────────────────────────────────────────────────
  HK: {
    countryCode: 'HK',
    countryName: 'Hong Kong',
    flagEmoji: '🇭🇰',
    stabilityMultiplier: 0.80,
    primaryRegulator: 'HKMA (Hong Kong Monetary Authority)',
    rationale: 'HKMA capital + liquidity requirements aligned with strictest Basel III interpretation. ' +
      'HSBC + StanChart + BOC HK dominate. Post-2019 protests + 2020 NSL created some political ' +
      'uncertainty but core banking sector remained stable.',
    historicalContext: 'No HK bank failure in modern era. HSBC/StanChart HK workforce reductions ' +
      'during 2020 protest period + COVID averaged 1-3% (vs much larger global cuts at same firms).',
    majorBanks: ['hsbc', 'standard chartered', 'bank of china', 'boc', 'hang seng bank', 'bea'],
    labeledAs: 'ESTIMATED',
  },

  // ── India — 0.85× ─────────────────────────────────────────────────────────
  // Public sector banks (SBI, PNB, Bank of Baroda) extremely stable via sovereign
  // backstop. Private banks (HDFC, ICICI, Axis, Kotak) high-quality but more volatile.
  IN: {
    countryCode: 'IN',
    countryName: 'India',
    flagEmoji: '🇮🇳',
    stabilityMultiplier: 0.85,
    primaryRegulator: 'RBI (Reserve Bank of India)',
    rationale: 'Public sector banks (PSBs) backed by sovereign guarantee + RBI strict supervision. ' +
      'Private banks (HDFC, ICICI, Axis, Kotak) maintain high CET1 ratios. ' +
      'India IDA workmen protection adds friction to mass layoffs.',
    historicalContext: 'YES Bank crisis (March 2020) resolved by RBI-coordinated rescue without ' +
      'depositor loss. PMC Bank (cooperative) failure (2019) limited spillover. No major scheduled ' +
      'commercial bank failure since 1969 nationalization.',
    majorBanks: ['sbi', 'state bank of india', 'hdfc bank', 'icici bank', 'axis bank', 'kotak', 'pnb', 'punjab national bank', 'bank of baroda', 'canara bank'],
    labeledAs: 'ESTIMATED',
  },

  // ── UAE — 0.92× ───────────────────────────────────────────────────────────
  AE: {
    countryCode: 'AE',
    countryName: 'United Arab Emirates',
    flagEmoji: '🇦🇪',
    stabilityMultiplier: 0.92,
    primaryRegulator: 'CBUAE (Central Bank of UAE)',
    rationale: 'Sovereign backing for major banks + Emirates Group / ADIA strong implicit support. ' +
      'NBAD/FAB merger (2017) demonstrated state-orchestrated stability. ' +
      'Worker visa system increases churn risk for sponsored expatriate banking staff.',
    historicalContext: 'Dubai 2009 debt crisis required Abu Dhabi rescue (US$ 10B) but no bank failure. ' +
      'Workforce changes at UAE banks happen with employer-cancelled visas — different dynamic from ' +
      'Western layoffs (visa-tied attrition vs formal redundancy).',
    majorBanks: ['emirates nbd', 'first abu dhabi bank', 'fab', 'adcb', 'mashreq', 'dubai islamic bank'],
    labeledAs: 'ESTIMATED',
  },

  // ── Brazil — 1.10× (higher volatility) ────────────────────────────────────
  BR: {
    countryCode: 'BR',
    countryName: 'Brazil',
    flagEmoji: '🇧🇷',
    stabilityMultiplier: 1.10,
    primaryRegulator: 'BCB (Banco Central do Brasil) + CVM',
    rationale: 'Brazilian banks (Itaú, Bradesco, Santander Brasil, BB) historically profitable but ' +
      'sector experiences higher volatility from macroeconomic instability + currency swings. ' +
      'Workforce churn higher than developed-market peers.',
    historicalContext: 'No major bank failure post-2000 (Plano Real reforms stabilized system) but ' +
      'recurring restructurings: Itaú-Unibanco merger (2008), Bradesco-HSBC Brasil acquisition (2016). ' +
      'Multiple rounds of fintech-driven layoffs at incumbents 2020-2024.',
    majorBanks: ['itau', 'itau unibanco', 'bradesco', 'santander brasil', 'banco do brasil', 'caixa'],
    labeledAs: 'ESTIMATED',
  },

  // ── Mexico — 1.05× ────────────────────────────────────────────────────────
  MX: {
    countryCode: 'MX',
    countryName: 'Mexico',
    flagEmoji: '🇲🇽',
    stabilityMultiplier: 1.05,
    primaryRegulator: 'CNBV (Comisión Nacional Bancaria y de Valores)',
    rationale: 'Mexican banks heavily foreign-owned (BBVA, Santander, Citibanamex pre-Banamex sale). ' +
      'Strict CNBV capital requirements but foreign parent decisions drive workforce changes.',
    historicalContext: '1994 Tequila Crisis required IPAB resolution. Post-1995 reforms + foreign ' +
      'ownership stabilized sector. Citi sale of Banamex (2022-2024) created uncertainty.',
    majorBanks: ['bbva mexico', 'santander mexico', 'banamex', 'banorte', 'inbursa'],
    labeledAs: 'ESTIMATED',
  },
};

// ── Banking sector detection ──────────────────────────────────────────────────

/** Industries that should receive the regional banking stability adjustment. */
const BANKING_INDUSTRIES = new Set([
  'banking', 'financial services', 'investment banking', 'commercial banking',
  'retail banking', 'private banking', 'wealth management', 'nbfc / lending',
  'nbfc', 'asset management',
]);

/** Returns true when the industry should be treated as banking-sector. */
export function isBankingIndustry(industry: string | null | undefined): boolean {
  if (!industry) return false;
  return BANKING_INDUSTRIES.has(industry.toLowerCase().trim());
}

/** Resolve the banking stability profile for a region code (ISO 2-letter or short name). */
export function resolveBankingStability(region: string | null | undefined): BankingStabilityProfile | null {
  if (!region) return null;
  const code = region.toUpperCase().trim();
  return BANKING_REGULATORY_STABILITY[code] ?? null;
}

export interface BankingStabilityAdjustment {
  /** Multiplier applied to L4 banking baseline */
  multiplier: number;
  /** Original baseline value */
  baselineBefore: number;
  /** Adjusted baseline value */
  baselineAfter: number;
  /** Country profile used */
  profile: BankingStabilityProfile;
  /** Disclosure narrative for TransparencyTab */
  disclosure: string;
}

/** Compute the L4 adjustment for a banking-sector user.
 *  Returns null when industry isn't banking-related or region isn't in registry. */
export function computeBankingStabilityAdjustment(
  industry: string | null | undefined,
  region: string | null | undefined,
  baselineL4: number,
): BankingStabilityAdjustment | null {
  if (!isBankingIndustry(industry)) return null;
  const profile = resolveBankingStability(region);
  if (!profile) return null;

  const baselineAfter = Math.max(0.02, Math.min(0.98, baselineL4 * profile.stabilityMultiplier));
  const deltaPct = Math.round((profile.stabilityMultiplier - 1.0) * 100);
  const direction = profile.stabilityMultiplier < 1.0 ? 'reduced' : 'increased';
  const deltaLabel = profile.stabilityMultiplier < 1.0 ? `−${Math.abs(deltaPct)}%` : `+${deltaPct}%`;

  const disclosure =
    `${profile.flagEmoji} ${profile.countryName} banking stability multiplier: ` +
    `${profile.stabilityMultiplier.toFixed(2)}× (${deltaLabel} vs US baseline). ` +
    `${profile.rationale} Regulator: ${profile.primaryRegulator}. L4 baseline ${direction} ` +
    `from ${baselineL4.toFixed(3)} to ${baselineAfter.toFixed(3)}. (ESTIMATED)`;

  return {
    multiplier: profile.stabilityMultiplier,
    baselineBefore: baselineL4,
    baselineAfter,
    profile,
    disclosure,
  };
}
