// regionalLlmContext.ts — v40.0 Phase 25
//
// Region-aware LLM prompt context builder.
//
// PURPOSE: For each market we serve, inject the LABOR-MARKET signals the LLM
// can ground its action recommendation in. Different markets have categorically
// different signal stacks:
//
//   India       → Naukri openings, NASSCOM hiring intent, EPFO growth,
//                 Q1 seasonal flag, GCC archetype
//   US          → LinkedIn metro counts, Indeed signal, BLS JOLTS,
//                 WARN Act status, metro tech-cluster contagion flag
//   UK          → LinkedIn UK + Reed counts, DWP employment statistics,
//                 ONS vacancy survey, UK statutory redundancy rights
//   Germany     → StepStone + XING counts, IAB employment statistics,
//                 Betriebsrat consultation timeline, Blue Card extension rights
//   Singapore   → JobStreet SG + JobsDB counts, MOM employment survey,
//                 EP / S Pass / job-seeker pass availability
//   Canada     → Job Bank Canada, Statistics Canada, LMIA open work
//                 permit bridge rights
//
// The LLM receives the block via the `regionalMarketContext` field on the
// llm-analyze payload (alongside `careerMarketContext`). The prompt instruction
// then requires `oneActionThisWeek` to cite at least one number from the
// REGION-APPROPRIATE source (Naukri only for India users, StepStone only for
// German users, etc.), eliminating the cross-region hallucination bug we
// closed in Phase 19.

import type { CareerPathMarket, ResolvedRegionalMarket } from './careerPathMarket';
import { normaliseRegionKey, regionDisplayLabel, MARKET_DATA_SOURCES_BY_REGION } from './careerPathMarket';
import type { CompanyData } from '../data/companyDatabase';

// ── Labor-law bridge mechanisms (static, jurisdiction-specific) ──────────────
//
// These are the post-termination "what happens to my work authorization?"
// safety nets the user needs to know about *tonight*. They differ structurally
// per region and are not derived from any live signal — they're statutory.

interface LaborLawBridge {
  /** One-line summary of the user's statutory rights after termination */
  postTerminationRights: string;
  /** Suggested next-step verification source */
  verifyAt: string;
  /** Optional: consultation / notice-period timeline (statutory window) */
  consultationTimeline?: string;
  /** Optional: visa / work-permit bridge if applicable */
  workPermitBridge?: string;
}

const LABOR_LAW_BRIDGE: Record<string, LaborLawBridge> = {
  india: {
    postTerminationRights:
      'Industrial Disputes Act 1947 + IT Sector Standing Orders: 30-90 day notice + gratuity (15 days pay × years of service after 5yr tenure).',
    verifyAt: 'labour.gov.in (Ministry of Labour & Employment)',
    consultationTimeline: 'No formal works-council; "Standing Orders" require 30-day notice for >100-employee firms.',
    workPermitBridge: 'Not applicable — Indian citizens unaffected; expats on Employment Visa have 30-day departure window post-termination.',
  },
  us: {
    postTerminationRights:
      'At-will employment baseline. WARN Act: 60-day advance notice required for layoffs >50 employees at sites of >100 staff. COBRA: 18-month health insurance bridge at full premium + 2% admin.',
    verifyAt: 'dol.gov + state DOL portal for WARN filings',
    consultationTimeline: '60-day WARN notice (federal); some states (CA, NY, NJ) extend to 90 days.',
    workPermitBridge:
      'H1B: 60-day grace period post-termination to find sponsor or change status. L1: 60-day grace. F1 OPT: 60-day unemployment cap. EAD-based status: grace varies by category.',
  },
  uk: {
    postTerminationRights:
      'UK statutory redundancy: 1 week pay per year of service (age 22-40), 1.5 weeks (41+), 0.5 weeks (under 22). Capped at 20 years + £700/week cap (2026 rate). + statutory notice period (min 1 week per year, capped 12 weeks).',
    verifyAt: 'gov.uk/redundancy-your-rights + acas.org.uk',
    consultationTimeline: 'Collective redundancy consultation: 30 days (20-99 employees) or 45 days (100+ employees) before any dismissal takes effect.',
    workPermitBridge:
      'Skilled Worker visa: 60-day grace period to find new sponsor OR switch visa category. Health & Care Worker visa: same 60 days. Graduate visa: not affected by sponsor change.',
  },
  germany: {
    postTerminationRights:
      'Kündigungsschutzgesetz (KSchG): termination requires legally valid reason after 6mo probation. Statutory severance not mandatory but Sozialplan via Betriebsrat typically provides 0.5-1.2 monthly salaries × tenure years.',
    verifyAt: 'arbeitsagentur.de + ig-metall.de or ver.di for sector-specific',
    consultationTimeline:
      'Betriebsrat (works council) consultation: 7 days minimum, typically 30-90 days for collective dismissals (>5 employees + 30% workforce, >20 employees + 25%, etc. per §17 KSchG).',
    workPermitBridge:
      'EU Blue Card: 12-month job-search extension if previously held Blue Card. Standard work visa: 6-month job-search residence permit (§20 AufenthG) available for skilled workers.',
  },
  france: {
    postTerminationRights:
      'PSE (Plan de Sauvegarde de l\'Emploi) required for collective dismissals >10 employees in 30 days. Statutory severance: 25% × monthly salary × years of service (>10yr: 33%).',
    verifyAt: 'travail-emploi.gouv.fr + dreets.gouv.fr',
    consultationTimeline: 'CSE (Comité Social et Économique) consultation: 1-4 months depending on plan scope; DREETS validation adds 21 days.',
    workPermitBridge: 'Passeport Talent: 4-month grace period. Other categories: 3-month residence permit allows job search.',
  },
  netherlands: {
    postTerminationRights:
      'Transition payment (transitievergoeding): 1/3 monthly salary × year of service, capped at €98K (2026). UWV approval required for unilateral termination.',
    verifyAt: 'werk.nl + uwv.nl',
    consultationTimeline: 'OR (works council) consultation + UWV approval typically 4-8 weeks before termination effective.',
    workPermitBridge: 'Highly Skilled Migrant: 3-month orientation year. Search Year visa: 1-year job-search residence after graduation.',
  },
  singapore: {
    postTerminationRights:
      'Tripartite Standards on Retrenchment: notice 1-4 weeks (tenure-based), retrenchment benefit typically 2-4 weeks per year of service (industry norm, not statutory).',
    verifyAt: 'mom.gov.sg + tafep.sg',
    consultationTimeline: 'No mandatory consultation period; MOM strongly encourages 1-3 months notice + tripartite consultation for >5 retrenchments.',
    workPermitBridge:
      'EP holder: Long-Term Visit Pass for job search (up to 6 months via MOM application). Tech.Pass: 2-year validity, work-permit-flexible. S Pass: 30-day grace period after termination.',
  },
  australia: {
    postTerminationRights:
      'National Employment Standards redundancy pay: 4 weeks (1-2yr tenure) up to 16 weeks (9-10yr). Fair Work Commission supervises consultation requirements.',
    verifyAt: 'fairwork.gov.au',
    consultationTimeline: 'Modern Award + enterprise agreement consultation: typically 1-4 weeks before termination notice.',
    workPermitBridge: 'TSS 482: 60-day grace period to find new sponsor or apply for new visa.',
  },
  canada: {
    postTerminationRights:
      'Employment Standards Act (province-varying): 1 week notice/severance per year of service, min 8 weeks notice for terminations of 50+ employees in Ontario. Common-law severance via Wallace damages often exceeds statutory minimum.',
    verifyAt: 'jobbank.gc.ca + canada.ca/en/employment-social-development',
    consultationTimeline:
      'Mass termination notice: 8-16 weeks depending on province + headcount. Ontario: 50+ in same location requires 8 weeks.',
    workPermitBridge:
      'LMIA-based work permits: implied status for up to 90 days post-termination IF maintained status filing. Open work permit bridge available for IEC + Spouses of skilled workers. PGWP: no employer-tie, no bridge needed.',
  },
  uae: {
    postTerminationRights:
      'UAE Federal Decree-Law 33/2021: end-of-service gratuity at 21 days/yr for first 5yr, 30 days/yr after (capped 2yr salary). Notice 30 days minimum.',
    verifyAt: 'mohre.gov.ae',
    consultationTimeline: 'No statutory works-council. Notice can be unilateral within contract terms.',
    workPermitBridge: 'UAE Employment Visa: 30-day grace period post-cancellation (extendable on application). Golden Visa: 5-10 years independent of employer.',
  },
  saudi_arabia: {
    postTerminationRights:
      'Saudi Labor Law Article 84: gratuity 15 days/yr for first 5yr, 30 days/yr after. Notice 60 days minimum for unlimited contracts.',
    verifyAt: 'hrsd.gov.sa',
    consultationTimeline: 'No works-council; Nitaqat (Saudization) quotas constrain employer-side decisions.',
    workPermitBridge: 'Iqama: 60-day grace period. Transfer requires NOC unless employer-driven termination.',
  },
};

// ── India static signals (NASSCOM, EPFO, Q1 seasonal flag) ────────────────────

interface IndiaStaticSnapshot {
  nasscomHiringIntent: number;     // % companies net-positive (FY26 reported)
  epfoGrowthYoy: number;           // % new EPFO subscribers YoY (formal-sector proxy)
  currentQuarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  isQ1SeasonalWindow: boolean;     // Jan-Mar = Q1 = peak appraisal-cycle restructuring window
  asOf: string;
}

function getIndiaStaticSnapshot(): IndiaStaticSnapshot {
  const m = new Date().getUTCMonth(); // 0=Jan
  const quarter =
    m <= 2 ? 'Q1' :
    m <= 5 ? 'Q2' :
    m <= 8 ? 'Q3' : 'Q4';
  return {
    // Per NASSCOM Strategic Review 2025-26 + Mercer Talent Trends Q1 FY26.
    // These are research-grounded statics; runtime override via
    // engine_calibration_constants would be the next layer.
    nasscomHiringIntent:   68,
    epfoGrowthYoy:         11.2,
    currentQuarter:        quarter,
    isQ1SeasonalWindow:    quarter === 'Q1',
    asOf:                  '2026-05',
  };
}

// ── Region-block builder ──────────────────────────────────────────────────────

export interface RegionalLlmContextResult {
  regionKey: string;
  regionLabel: string;
  /** The full multi-line block to inject into the LLM prompt */
  text: string;
  /** Top-priority source(s) the LLM is REQUIRED to cite from in oneActionThisWeek */
  primaryRequiredSource: string;
  /** Full list of suggested sources for this region */
  suggestedSources: string[];
}

/**
 * Build a region-aware LLM context block. Combines:
 *   - The resolved per-region opening count from CareerPathMarket
 *   - Live HybridResult signals appropriate for the region (warnSignal,
 *     blsMacroSignal, indiaRiskEnrichment, peerContagion.geoCluster)
 *   - Static labor-law bridges (statutory rights, consultation timelines,
 *     work-permit grace periods)
 *
 * The output is a multi-line string ready to drop into the llm-analyze body.
 */
export function buildRegionalLlmContext(
  companyRegion: string | null | undefined,
  marketContext: CareerPathMarket | null | undefined,
  resolvedMarket: ResolvedRegionalMarket | null | undefined,
  hybridResult: Record<string, unknown> | null | undefined,
  companyData: CompanyData | null | undefined,
): RegionalLlmContextResult {
  const regionKey = normaliseRegionKey(companyRegion);
  const regionLabel = regionDisplayLabel(regionKey);
  const suggestedSources = MARKET_DATA_SOURCES_BY_REGION[regionKey] ?? ['LinkedIn (global)'];
  const primaryRequiredSource = suggestedSources[0];
  const bridge = LABOR_LAW_BRIDGE[regionKey];

  const r = (hybridResult ?? {}) as any;
  const warn = r.warnSignal as
    | { hasActiveWARN?: boolean; daysUntilEffective?: number; affectedCount?: number; affectedLocations?: string[] }
    | undefined;
  const bls = r.blsMacroSignal as
    | { riskTier?: string; sectorGrowth?: number; unemployment?: number; joltsHires?: number }
    | undefined;
  const peer = r.peerContagion as
    | { geoCluster?: { metroName?: string; localSupplySurgeRisk?: string; geoClusteredCuts?: number } }
    | undefined;
  const indiaEnrich = r.indiaRiskEnrichment as
    | {
        isIndiaPrimary?: boolean;
        gccArchetype?: string;
        gccRiskProfile?: { archetype?: string; parentCountryExposure?: string };
        sectorPulse?: { naukriIndexRelative?: number; pulseTrend?: string };
        seasonalRisk?: { window?: { riskMultiplier?: number; months?: string } };
        sectorBenchmark?: { sector?: string };
      }
    | undefined;

  const lines: string[] = [];
  lines.push(`Region: ${regionLabel} (${regionKey})`);
  lines.push(`Authoritative job-board sources for this region: ${suggestedSources.join(', ')}`);
  lines.push(`PRIMARY source the LLM must cite for openings: ${primaryRequiredSource}`);

  // Opening count line — sourced from the per-region resolver.
  if (resolvedMarket) {
    if (resolvedMarket.isRegionSpecific) {
      lines.push(`Active openings (${resolvedMarket.regionLabel} — ${resolvedMarket.source}): ${resolvedMarket.count.toLocaleString()} as of ${resolvedMarket.asOf}.`);
    } else {
      lines.push(`Active openings (global aggregate): ${resolvedMarket.count.toLocaleString()}. REGION-SPECIFIC count for ${regionLabel} unavailable — recommend verification on ${suggestedSources.slice(0, 2).join(' / ')}.`);
    }
  }

  // ── Region-specific signal blocks ──────────────────────────────────────────
  switch (regionKey) {
    case 'india': {
      const s = getIndiaStaticSnapshot();
      lines.push(`India context (NASSCOM + EPFO + seasonal):`);
      lines.push(`  • NASSCOM hiring intent: ${s.nasscomHiringIntent}% of surveyed companies net-positive on hiring (${s.asOf}).`);
      lines.push(`  • EPFO formal-sector growth: +${s.epfoGrowthYoy.toFixed(1)}% YoY new subscribers (proxy for organized-sector employment trend).`);
      lines.push(`  • Current quarter: ${s.currentQuarter}${s.isQ1SeasonalWindow ? ' — Q1 (Jan-Mar) is the PEAK Indian-IT appraisal-cycle restructuring window; risk multiplier elevated.' : '.'}`);
      if (indiaEnrich?.sectorPulse?.naukriIndexRelative != null) {
        const idx = Math.round(indiaEnrich.sectorPulse.naukriIndexRelative * 100);
        lines.push(`  • Naukri sector index: ${idx}% of 6-month baseline (trend: ${indiaEnrich.sectorPulse.pulseTrend ?? 'unknown'}).`);
      }
      if (indiaEnrich?.gccArchetype && indiaEnrich.gccArchetype !== 'not_gcc') {
        lines.push(`  • GCC archetype: ${indiaEnrich.gccArchetype}` +
          (indiaEnrich.gccRiskProfile?.parentCountryExposure ? ` (parent country exposure: ${indiaEnrich.gccRiskProfile.parentCountryExposure})` : ''));
      }
      if (indiaEnrich?.seasonalRisk?.window?.riskMultiplier && indiaEnrich.seasonalRisk.window.riskMultiplier > 1.0) {
        const mult = Math.round((indiaEnrich.seasonalRisk.window.riskMultiplier - 1) * 100);
        lines.push(`  • Seasonal risk window: +${mult}% over base (months: ${indiaEnrich.seasonalRisk.window.months ?? 'current cycle'}).`);
      }
      break;
    }

    case 'us': {
      lines.push(`US context (LinkedIn + Indeed + BLS JOLTS + WARN + metro contagion):`);
      if (bls) {
        if (bls.joltsHires != null)      lines.push(`  • BLS JOLTS hires: ${bls.joltsHires.toLocaleString()}.`);
        if (bls.sectorGrowth != null)    lines.push(`  • BLS sector growth: ${bls.sectorGrowth > 0 ? '+' : ''}${bls.sectorGrowth.toFixed(1)}% YoY.`);
        if (bls.unemployment != null)    lines.push(`  • Sector unemployment: ${bls.unemployment.toFixed(1)}%.`);
        if (bls.riskTier)                lines.push(`  • BLS macro risk tier: ${bls.riskTier}.`);
      }
      if (warn?.hasActiveWARN) {
        const loc = (warn.affectedLocations ?? []).slice(0, 2).join(', ') || 'unspecified location';
        const days = warn.daysUntilEffective != null ? `${warn.daysUntilEffective} days` : 'unknown';
        const cnt = warn.affectedCount != null ? `${warn.affectedCount.toLocaleString()} affected` : 'count unknown';
        lines.push(`  • WARN Act ACTIVE: ${cnt} at ${loc}, effective in ${days}. Ground truth — confidence floor applies.`);
      } else {
        lines.push(`  • WARN Act: no active filing detected (verify state DOL portal for current quarter).`);
      }
      if (peer?.geoCluster?.metroName) {
        lines.push(`  • Metro tech cluster (${peer.geoCluster.metroName}): ${peer.geoCluster.geoClusteredCuts ?? 0} peer co-located cuts; local supply surge risk: ${peer.geoCluster.localSupplySurgeRisk ?? 'unknown'}.`);
      }
      break;
    }

    case 'uk': {
      lines.push(`UK context (LinkedIn UK + Reed + DWP + ONS):`);
      lines.push(`  • DWP employment statistics: verify on gov.uk/government/statistics/dwp-statistical-summaries for the current quarter.`);
      lines.push(`  • ONS Vacancies and Jobs survey: verify on ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/bulletins/vacanciesandjobsintheuk.`);
      if (bls?.riskTier) lines.push(`  • Sector risk tier (cross-walked from global macro): ${bls.riskTier}.`);
      break;
    }

    case 'germany': {
      lines.push(`Germany context (StepStone + XING + IAB + Bundesagentur):`);
      lines.push(`  • IAB employment statistics: verify on iab.de + bundesagentur-fuer-arbeit.de for current state of the labor market.`);
      lines.push(`  • Skilled-trades / engineering shortages are documented annually in the IAB Fachkräftemonitor.`);
      break;
    }

    case 'singapore': {
      lines.push(`Singapore context (JobStreet SG + JobsDB + MOM):`);
      lines.push(`  • MOM Employment Situation report: stats.mom.gov.sg for quarterly vacancy + retrenchment figures.`);
      lines.push(`  • MyCareersFuture (gov-operated): mycareersfuture.gov.sg for matching against SG-citizen hiring quotas.`);
      break;
    }

    case 'canada': {
      lines.push(`Canada context (Job Bank Canada + Statistics Canada):`);
      lines.push(`  • Statistics Canada Labour Force Survey: statcan.gc.ca/en/subjects-start/labour for current sector + provincial unemployment.`);
      lines.push(`  • Job Bank Canada: jobbank.gc.ca — official federal job posting platform with wage data + NOC classification.`);
      break;
    }

    case 'australia': {
      lines.push(`Australia context (SEEK + LinkedIn AU + ABS):`);
      lines.push(`  • ABS Labour Force survey: abs.gov.au/statistics/labour for monthly unemployment + participation.`);
      break;
    }

    case 'uae':
    case 'saudi_arabia': {
      lines.push(`MENA context (${regionLabel}):`);
      lines.push(`  • Bayt + Naukrigulf + GulfTalent: primary job-search channels for GCC professionals.`);
      lines.push(`  • Visa-tied employment means employer cancellation effectively terminates work authorization — bridge mechanisms below.`);
      break;
    }

    default: {
      lines.push(`Regional signal stack for ${regionLabel}: standard global market sources apply.`);
    }
  }

  // ── Labor-law bridge (statutory rights, consultation, work-permit) ─────────
  if (bridge) {
    lines.push(`Statutory labor-law bridge (${regionLabel}):`);
    lines.push(`  • Post-termination rights: ${bridge.postTerminationRights}`);
    if (bridge.consultationTimeline) {
      lines.push(`  • Consultation / notice timeline: ${bridge.consultationTimeline}`);
    }
    if (bridge.workPermitBridge) {
      lines.push(`  • Work-permit / visa bridge: ${bridge.workPermitBridge}`);
    }
    lines.push(`  • Verify at: ${bridge.verifyAt}`);
  }

  return {
    regionKey,
    regionLabel,
    text: lines.join('\n'),
    primaryRequiredSource,
    suggestedSources,
  };
}
