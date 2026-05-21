// sectorRegionStability.ts — Generic sector × region L4 stability multiplier.
//
// PURPOSE: The existing bankingRegulatoryStability.ts module covers banking sector
// per ISO country code. This module is a parallel, ops-adjustable layer keyed by
// {sector}_{region} pairs (e.g. banking_canada, telecom_us). It:
//
//   1. Extends sector coverage BEYOND banking — telecom_canada (CRTC oligopoly),
//      telecom_us (Verizon/AT&T/T-Mobile cost pressure), and future sectors.
//   2. Provides authoritative ops-overridable multipliers via engine_calibration_constants
//      keys (sectorRegionStability.banking_canada, etc.) so multipliers can be
//      tuned from prediction-outcome data without a redeploy.
//   3. Takes PRECEDENCE over bankingRegulatoryStability when both match — its
//      values represent the freshest calibration target.
//
// MATCH RULES:
//   - Industry is normalised to a lowercase token: "banking" / "telecom".
//     Banking aliases: banking, financial services, investment banking,
//     commercial banking, retail banking, wealth management.
//     Telecom aliases: telecom, telecommunications, wireless, mobile carrier.
//   - Region is normalised to a lowercase short token: "canada" / "us" / "uk" /
//     "eu" — accepting ISO codes (CA/US/UK/GB/DE/FR/IT/ES/NL/BE/AT/IE/PT/FI/SE/
//     DK/PL/...) and country names. EU bucket fires for all listed EU member
//     codes when no country-specific entry exists.
//
// APPLY ORDER:
//   L4 raw baseline → bankingRegulatoryStability (country-specific banking) →
//   sectorRegionStability (this layer, generic sector × region). When both fire,
//   sectorRegionStability wins because it's the more recent calibration target.
//
// LABELED: ESTIMATED — bootstrap values seeded from manual_seed_sector_research;
// will move to manual_seed_calibration_data once 200+ verified events accumulate
// per sector-region pair via the prediction ledger.

import { getConstant } from '../services/calibration/calibrationConstants';

export interface SectorRegionStabilityEntry {
  /** Composite key (e.g. 'banking_canada') */
  key: string;
  /** Sector token */
  sector: 'banking' | 'telecom';
  /** Region bucket token */
  region: 'canada' | 'us' | 'uk' | 'eu';
  /** Multiplier on L4 baseline. <1.0 = more stable than US ref; >1.0 = more volatile. */
  defaultMultiplier: number;
  /** Short rationale string surfaced in TransparencyTab */
  rationale: string;
  /** Calibration constant key for ops override (e.g. 'sectorRegionStability.banking_canada') */
  constantKey: string;
}

// ── Sector × Region stability registry ────────────────────────────────────────
// Per v40.0 spec: banking + telecom across CA / US / UK / EU buckets.
// Bootstrap multipliers come from documented systemic stability research;
// runtime values can be overridden via engine_calibration_constants.

export const SECTOR_REGION_STABILITY: Record<string, SectorRegionStabilityEntry> = {
  banking_canada: {
    key:               'banking_canada',
    sector:            'banking',
    region:            'canada',
    defaultMultiplier: 0.65,
    rationale:
      'OSFI supervision + Big Five oligopoly (RBC, TD, BMO, CIBC, Scotiabank) + no systemic ' +
      'bank failure since the 1923 Home Bank collapse. Domestic Stability Buffer (DSB up to 2.5%) ' +
      'and countercyclical buffer exceed US Fed minimums. Canadian banks did not require ' +
      'government bailouts in 2008 GFC; workforce cuts averaged ~3% vs US peers at 15-25%.',
    constantKey: 'sectorRegionStability.banking_canada',
  },
  banking_us: {
    key:               'banking_us',
    sector:            'banking',
    region:            'us',
    defaultMultiplier: 1.00,
    rationale:
      'Reference baseline. At-will employment + aggressive cost-cutting + fragmented regulator ' +
      'landscape (Fed + OCC + FDIC + state). Post-SVB scrutiny tightened capital requirements ' +
      'but did not change layoff velocity. Wells Fargo, Citi, Bank of America repeatedly ' +
      'execute 5-10% workforce cuts during downturns.',
    constantKey: 'sectorRegionStability.banking_us',
  },
  banking_uk: {
    key:               'banking_uk',
    sector:            'banking',
    region:            'uk',
    defaultMultiplier: 0.85,
    rationale:
      'Regulated by PRA + FCA with Vickers Commission ring-fencing (separates retail + investment ' +
      'banking). UK banks moderately conservative but aggressive restructuring around challenger ' +
      'bank competition (Monzo, Starling, Revolut). Barclays/HSBC trim but typically 2-5%, ' +
      'not 10%+. CET1 ratio requirements ≥13%.',
    constantKey: 'sectorRegionStability.banking_uk',
  },
  banking_eu: {
    key:               'banking_eu',
    sector:            'banking',
    region:            'eu',
    defaultMultiplier: 0.80,
    rationale:
      'Strong employment protections (works councils, PSE in France, Betriebsrat in Germany) + ' +
      'Basel III implementation via CRD V + ECB SSM supervision for significant institutions. ' +
      'Restructurings executed over 3+ years rather than rapid cuts. Deutsche Bank reduced 18k ' +
      'jobs over 2019-2022 in three tranches. No major EU bank failure 2010-2026.',
    constantKey: 'sectorRegionStability.banking_eu',
  },
  telecom_canada: {
    key:               'telecom_canada',
    sector:            'telecom',
    region:            'canada',
    defaultMultiplier: 0.70,
    rationale:
      'CRTC-regulated oligopoly (Rogers, Bell, Telus) with protected foreign-ownership rules + ' +
      'highest ARPU in OECD ($65+ vs US $48). Spectrum auction restrictions favor incumbents. ' +
      'Layoffs happen but are heavily structured via voluntary severance + collective ' +
      'bargaining (USW, Unifor). Historically <2% workforce reductions per cycle.',
    constantKey: 'sectorRegionStability.telecom_canada',
  },
  telecom_us: {
    key:               'telecom_us',
    sector:            'telecom',
    region:            'us',
    defaultMultiplier: 0.90,
    rationale:
      'AT&T, Verizon, T-Mobile face aggressive 5G capex + cord-cutting + spectrum cost pressure. ' +
      'FCC regulation lighter than CRTC; at-will employment. T-Mobile/Sprint integration drove ' +
      '~5,000 cuts (2020-2022). Verizon BlueJeans shutdown + AT&T media spinoff produced ' +
      'workforce churn. Moderate volatility but less than US banking baseline.',
    constantKey: 'sectorRegionStability.telecom_us',
  },
};

// ── Industry → sector normalisation ──────────────────────────────────────────

const BANKING_ALIASES = new Set([
  'banking', 'financial services', 'investment banking', 'commercial banking',
  'retail banking', 'private banking', 'wealth management', 'nbfc / lending',
  'nbfc', 'asset management',
]);

const TELECOM_ALIASES = new Set([
  'telecom', 'telecommunications', 'telecoms', 'wireless', 'mobile carrier',
  'cellular', 'internet service provider', 'isp', 'broadband', 'fixed line',
]);

function normaliseSector(industry: string | null | undefined): 'banking' | 'telecom' | null {
  if (!industry) return null;
  const k = industry.toLowerCase().trim();
  if (BANKING_ALIASES.has(k)) return 'banking';
  if (TELECOM_ALIASES.has(k)) return 'telecom';
  return null;
}

// ── Region → bucket normalisation ────────────────────────────────────────────

const REGION_BUCKETS: Record<string, 'canada' | 'us' | 'uk' | 'eu'> = {
  // Canada
  ca: 'canada', can: 'canada', canada: 'canada',
  // US
  us: 'us', usa: 'us', 'united states': 'us', america: 'us',
  // UK
  uk: 'uk', gb: 'uk', gbr: 'uk', 'united kingdom': 'uk', britain: 'uk', england: 'uk',
  // EU bucket — countries WITHOUT a country-specific banking entry in
  // bankingRegulatoryStability fall through to this. DE/FR ARE specific there
  // but the sectorRegion layer overrides them with the EU multiplier 0.80,
  // which is the v40.0 spec.
  de: 'eu', deu: 'eu', germany: 'eu',
  fr: 'eu', fra: 'eu', france: 'eu',
  it: 'eu', ita: 'eu', italy: 'eu',
  es: 'eu', esp: 'eu', spain: 'eu',
  nl: 'eu', nld: 'eu', netherlands: 'eu',
  be: 'eu', bel: 'eu', belgium: 'eu',
  at: 'eu', aut: 'eu', austria: 'eu',
  ie: 'eu', irl: 'eu', ireland: 'eu',
  pt: 'eu', prt: 'eu', portugal: 'eu',
  fi: 'eu', fin: 'eu', finland: 'eu',
  se: 'eu', swe: 'eu', sweden: 'eu',
  dk: 'eu', dnk: 'eu', denmark: 'eu',
  pl: 'eu', pol: 'eu', poland: 'eu',
  gr: 'eu', grc: 'eu', greece: 'eu',
  cz: 'eu', cze: 'eu', czechia: 'eu', 'czech republic': 'eu',
  hu: 'eu', hun: 'eu', hungary: 'eu',
  ro: 'eu', rou: 'eu', romania: 'eu',
  lu: 'eu', lux: 'eu', luxembourg: 'eu',
};

function normaliseRegion(region: string | null | undefined): 'canada' | 'us' | 'uk' | 'eu' | null {
  if (!region) return null;
  return REGION_BUCKETS[region.toLowerCase().trim()] ?? null;
}

export interface SectorRegionStabilityAdjustment {
  /** Multiplier applied (after ops override) */
  multiplier: number;
  /** Composite key — e.g. 'banking_canada' */
  key: string;
  sector: 'banking' | 'telecom';
  region: 'canada' | 'us' | 'uk' | 'eu';
  /** Original baseline value */
  baselineBefore: number;
  /** Adjusted baseline value */
  baselineAfter: number;
  /** Calibration provenance: 'manual_seed_sector_research' (bootstrap) or
   *  'manual_seed' / 'calibrated' / 'uncalibrated_placeholder' when ops override. */
  provenance: string;
  /** Disclosure narrative for TransparencyTab */
  disclosure: string;
  labeledAs: 'ESTIMATED';
}

/**
 * Compute the L4 sector-region stability adjustment.
 * Returns null when industry isn't a covered sector OR region isn't bucketed.
 */
export function computeSectorRegionStabilityAdjustment(
  industry: string | null | undefined,
  region: string | null | undefined,
  baselineL4: number,
): SectorRegionStabilityAdjustment | null {
  const sector = normaliseSector(industry);
  if (!sector) return null;
  const bucket = normaliseRegion(region);
  if (!bucket) return null;

  const key = `${sector}_${bucket}` as const;
  const entry = SECTOR_REGION_STABILITY[key];
  if (!entry) return null;

  // Pull the runtime multiplier from engine_calibration_constants. When the DB has
  // no row OR the flag is off, we fall back to defaultMultiplier with provenance
  // = 'manual_seed_sector_research'.
  const resolved = getConstant<number>(entry.constantKey, entry.defaultMultiplier);
  const multiplier = typeof resolved.value === 'number' ? resolved.value : entry.defaultMultiplier;
  const provenance = resolved.usedBootstrap ? 'manual_seed_sector_research' : resolved.provenance;

  const baselineAfter = Math.max(0.02, Math.min(0.98, baselineL4 * multiplier));
  const deltaPct = Math.round((multiplier - 1.0) * 100);
  const direction = multiplier < 1.0 ? 'reduced' : 'increased';
  const deltaLabel = multiplier < 1.0 ? `−${Math.abs(deltaPct)}%` : `+${deltaPct}%`;

  const disclosure =
    `Applied sector-region stability multiplier: ${key} (${multiplier.toFixed(2)}) — ` +
    `${entry.sector === 'banking' ? 'Banking' : 'Telecom'} in ${bucket.toUpperCase()} has structurally ` +
    `${multiplier < 1.0 ? 'lower' : 'higher'} layoff rates than the global ${entry.sector} baseline. ` +
    `${entry.rationale} L4 baseline ${direction} from ${baselineL4.toFixed(3)} to ${baselineAfter.toFixed(3)} (${deltaLabel}). ` +
    `Provenance: ${provenance}, planned calibration from ${bucket === 'canada' ? 'Canadian' : bucket.toUpperCase()} outcome data. (ESTIMATED)`;

  return {
    multiplier,
    key,
    sector,
    region: bucket,
    baselineBefore: baselineL4,
    baselineAfter,
    provenance,
    disclosure,
    labeledAs: 'ESTIMATED',
  };
}
