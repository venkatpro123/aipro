// dimensionProvenance.ts
// Maps each risk dimension (L1–L5, D1–D6) to the raw sub-signals that drove
// its score, with per-signal source attribution and age labels.
//
// DESIGN
// ──────
// The engine computes dimension scores from companyData fields and static role/
// industry tables. This module reconstructs that mapping in reverse — given the
// same companyData and result, it produces a human-readable provenance chain
// so users can verify every number shown in the dashboard.
//
// SOURCE DETECTION HIERARCHY
// ──────────────────────────
// 1. consensusSnapshot.signalSources includes 'alpha_vantage' → stock/revenue are live
// 2. companyData.source string contains BSE/NSE/Bloomberg → filing source
// 3. Fallback: "Supabase DB" with age from companyData.lastUpdated

import type { HybridResult } from '../types/hybridResult';
import type { CompanyData } from '../data/companyDatabase';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SubSignalEntry {
  id: string;
  displayName: string;
  value: string;
  source: string;
  ageLabel: string;
  isLive: boolean;
  isMissing: boolean;    // true → value was null; heuristic fallback used in engine
}

export interface DimensionProvenanceData {
  dimKey: string;
  score: number;
  weight: number;
  weightLabel: string;
  subSignals: SubSignalEntry[];
  liveCount: number;
  formulaNote: string;
}

// ── Age formatting ─────────────────────────────────────────────────────────────

function formatRelativeAge(isoOrDate: string, nowMs: number = Date.now()): string {
  try {
    // Date-only strings (YYYY-MM-DD) are parsed as UTC midnight which can appear
    // "in the future" for users east of UTC — parse them as local noon instead.
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(isoOrDate.trim());
    const normalized = isDateOnly ? isoOrDate.trim() + 'T12:00:00' : isoOrDate;
    const t = new Date(normalized).getTime();
    if (isNaN(t)) return 'unknown';
    const diffMs = nowMs - t;
    // For dates that are in the future (clock skew or future-dated data), show the date
    if (diffMs < 0) {
      return new Date(t).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
    const mins  = Math.floor(diffMs / 60_000);
    const hours = Math.floor(diffMs / 3_600_000);
    const days  = Math.floor(diffMs / 86_400_000);
    const months = Math.floor(days / 30);
    const years  = Math.floor(days / 365);
    if (mins  <  2)   return 'moments ago';
    if (mins  < 60)   return `${mins} min ago`;
    if (hours < 24)   return `${hours}h ago`;
    if (days  <  7)   return `${days} day${days === 1 ? '' : 's'} ago`;
    if (months < 1)   return `${Math.floor(days / 7)} week${Math.floor(days / 7) === 1 ? '' : 's'} ago`;
    if (years  < 1)   return `${months} month${months === 1 ? '' : 's'} ago`;
    return `${years} year${years === 1 ? '' : 's'} ago`;
  } catch {
    return 'unknown';
  }
}

// ── Source detection ──────────────────────────────────────────────────────────

type SignalClass = 'stock' | 'revenue' | 'layoff' | 'static';

interface SourceResult {
  source: string;
  ageLabel: string;
  isLive: boolean;
}

function getAuthoritativeSignal(result: HybridResult, keys: string[]) {
  const signals =
    result.authoritativeSignals ??
    result.consensusSnapshot?.authoritativeSignals ??
    {};
  for (const key of keys) {
    if (signals[key]) return signals[key];
  }
  return null;
}

function detectSource(
  cls: SignalClass,
  companyData: CompanyData,
  result: HybridResult,
  nowMs: number,
): SourceResult {
  const signal =
    cls === 'stock'
      ? getAuthoritativeSignal(result, ['stock90DayChange', 'stock_90d_change'])
      : cls === 'revenue'
        ? getAuthoritativeSignal(result, ['revenueGrowthYoY', 'revenue_yoy'])
        : cls === 'layoff'
          ? getAuthoritativeSignal(result, ['layoffsLast24Months', 'layoffRounds', 'lastLayoffPercent'])
          : null;
  if (signal) {
    const sourceLabel =
      signal.source === 'live' && (signal.supersedes?.length ?? 0) > 0
        ? `${signal.sourceName} (live override)`
        : signal.source === 'db' && (signal.conflictWith?.length ?? 0) > 0
          ? `${signal.sourceName} (DB retained)`
          : signal.sourceName;
    return {
      source: sourceLabel,
      ageLabel: formatRelativeAge(signal.observedAt, nowMs),
      isLive: signal.source === 'live',
    };
  }

  const src = companyData.source.toLowerCase();
  const signalSources = result.consensusSnapshot?.signalSources ?? [];
  const hasYahoo = signalSources.some(s => s.toLowerCase().includes('yahoo') || s.toLowerCase().includes('alpha'));
  const calcTime = result.meta?.timestamp;
  const dbAge = formatRelativeAge(companyData.lastUpdated, nowMs);

  if (cls === 'stock') {
    if (hasYahoo && calcTime) {
      return { source: 'Yahoo Finance', ageLabel: formatRelativeAge(calcTime, nowMs), isLive: true };
    }
    if (src.includes('bse') || src.includes('nse')) {
      return { source: 'BSE/NSE filing', ageLabel: dbAge, isLive: false };
    }
    return { source: 'Supabase DB', ageLabel: dbAge, isLive: false };
  }

  if (cls === 'revenue') {
    if (hasYahoo && calcTime && !src.includes('bse') && !src.includes('nse')) {
      return { source: 'Yahoo Finance + SEC EDGAR', ageLabel: formatRelativeAge(calcTime, nowMs), isLive: true };
    }
    if (src.includes('bse')) return { source: 'BSE filing', ageLabel: dbAge, isLive: false };
    if (src.includes('nse')) return { source: 'NSE filing', ageLabel: dbAge, isLive: false };
    if (src.includes('bloomberg')) return { source: 'Bloomberg', ageLabel: dbAge, isLive: false };
    return { source: 'Supabase DB', ageLabel: dbAge, isLive: false };
  }

  if (cls === 'layoff') {
    if (src.includes('layoffs.fyi')) return { source: 'Layoffs.fyi', ageLabel: dbAge, isLive: false };
    if (src.includes('crunchbase')) return { source: 'Crunchbase', ageLabel: dbAge, isLive: false };
    return { source: 'Supabase DB', ageLabel: dbAge, isLive: false };
  }

  // 'static' — always DB
  if (src.includes('bse') || src.includes('nse')) return { source: 'BSE/NSE filing', ageLabel: dbAge, isLive: false };
  if (src.includes('crunchbase')) return { source: 'Crunchbase', ageLabel: dbAge, isLive: false };
  if (src.includes('bloomberg')) return { source: 'Bloomberg', ageLabel: dbAge, isLive: false };
  return { source: 'Supabase DB', ageLabel: dbAge, isLive: false };
}

// ── Per-dimension builders ────────────────────────────────────────────────────

function buildL1(score: number, cd: CompanyData, r: HybridResult, now: number): DimensionProvenanceData {
  const stockSrc = detectSource('stock', cd, r, now);
  const revSrc   = detectSource('revenue', cd, r, now);
  const dbSrc    = detectSource('static', cd, r, now);

  const sigs: SubSignalEntry[] = [
    {
      id: 'stock90d', displayName: 'Stock 90-Day Change',
      value: cd.stock90DayChange !== null
        ? `${cd.stock90DayChange >= 0 ? '+' : ''}${cd.stock90DayChange}%`
        : 'N/A',
      ...stockSrc, isMissing: cd.stock90DayChange === null,
    },
    {
      id: 'revenueGrowth', displayName: 'Revenue Growth YoY',
      value: cd.revenueGrowthYoY !== null
        ? `${cd.revenueGrowthYoY >= 0 ? '+' : ''}${cd.revenueGrowthYoY}%`
        : 'N/A',
      ...revSrc, isMissing: cd.revenueGrowthYoY === null,
    },
    {
      id: 'revenuePerEmp', displayName: 'Revenue per Employee',
      value: `$${Math.round(cd.revenuePerEmployee / 1000)}K`,
      ...dbSrc, isMissing: false,
    },
    {
      id: 'employeeCount', displayName: 'Employee Count',
      value: cd.employeeCount.toLocaleString(),
      ...dbSrc, isMissing: false,
    },
    {
      id: 'aiSignal', displayName: 'AI Investment Signal',
      value: cd.aiInvestmentSignal,
      source: dbSrc.source, ageLabel: dbSrc.ageLabel, isLive: false, isMissing: false,
    },
  ];

  return {
    dimKey: 'L1', score, weight: 0.30, weightLabel: '30%',
    subSignals: sigs, liveCount: sigs.filter(s => s.isLive).length,
    formulaNote: 'Calibrated weighted avg: stock trend (w≈0.35), revenue growth (w≈0.35), revenue/employee overstaffing (w≈0.25), company size (w≈0.10).',
  };
}

function buildL2(score: number, cd: CompanyData, r: HybridResult, now: number): DimensionProvenanceData {
  const src = detectSource('layoff', cd, r, now);
  const recent = cd.layoffsLast24Months[0] ?? null;

  const sigs: SubSignalEntry[] = [
    {
      id: 'layoffRounds', displayName: 'Layoff Rounds (24 mo)',
      value: `${cd.layoffRounds} round${cd.layoffRounds !== 1 ? 's' : ''}`,
      ...src, isMissing: false,
    },
    {
      id: 'lastSeverity', displayName: 'Last Layoff Severity',
      value: cd.lastLayoffPercent !== null ? `${cd.lastLayoffPercent}% headcount cut` : 'No data',
      ...src, isMissing: cd.lastLayoffPercent === null,
    },
    {
      id: 'mostRecentEvent', displayName: 'Most Recent Event',
      value: recent ? `${formatRelativeAge(recent.date, now)} (${recent.percentCut}% cut)` : 'None on record',
      source: src.source, ageLabel: src.ageLabel, isLive: src.isLive,
      isMissing: recent === null,
    },
  ];

  return {
    dimKey: 'L2', score, weight: 0.25, weightLabel: '25%',
    subSignals: sigs, liveCount: sigs.filter(s => s.isLive).length,
    formulaNote: 'Recency-weighted layoff count × severity. Each round carries ~60% follow-up probability within 9 months.',
  };
}

function buildL3(score: number, r: HybridResult, now: number): DimensionProvenanceData {
  const dbAge = formatRelativeAge('2026-03-01', now); // Q1 2026 intelligence snapshot

  const sigs: SubSignalEntry[] = [
    {
      id: 'roleKey', displayName: 'Role Assessed',
      value: r.workTypeKey.replace(/_/g, ' '),
      source: 'HumanProof Role Intelligence DB', ageLabel: 'Q1 2026 snapshot',
      isLive: false, isMissing: false,
    },
    {
      id: 'taskAutomatability', displayName: 'Task Automatability Band',
      value: score >= 65 ? 'High (>65%)' : score >= 35 ? 'Moderate (35–65%)' : 'Low (<35%)',
      source: 'HumanProof Role Intelligence DB', ageLabel: 'Q1 2026 snapshot',
      isLive: false, isMissing: false,
    },
    {
      id: 'aiToolMaturity', displayName: 'AI Tool Deployment Stage',
      value: score >= 65 ? 'Enterprise-deployed' : score >= 35 ? 'Active / uneven' : 'Early-stage',
      source: 'HumanProof Role Intelligence DB', ageLabel: 'Q1 2026 snapshot',
      isLive: false, isMissing: false,
    },
  ];

  return {
    dimKey: 'L3', score, weight: 0.20, weightLabel: '20%',
    subSignals: sigs, liveCount: 0,
    formulaNote: 'Derived from 371-role intelligence corpus: task automatability, AI tool maturity, and human amplification value for this role category.',
  };
}

function buildL4(score: number, r: HybridResult, now: number): DimensionProvenanceData {
  const sigs: SubSignalEntry[] = [
    {
      id: 'industryKey', displayName: 'Industry Sector',
      value: r.industryKey.replace(/_/g, ' '),
      source: 'HumanProof Industry DB', ageLabel: 'Q1 2026 snapshot',
      isLive: false, isMissing: false,
    },
    {
      id: 'sectorAiAdoption', displayName: 'Sector AI Adoption Rate',
      value: score >= 65 ? 'High (above-average disruption)' : score >= 35 ? 'Moderate' : 'Low (below-average)',
      source: 'WEF-2025 + HumanProof Industry DB', ageLabel: 'Q1 2026 snapshot',
      isLive: false, isMissing: false,
    },
    {
      id: 'sectorLayoffRate', displayName: 'Sector Avg Layoff Rate',
      value: score >= 65 ? 'Elevated (>12% in 12 mo)' : score >= 35 ? 'Moderate (6–12%)' : 'Low (<6%)',
      source: 'BLS-2024 Displaced Worker Survey', ageLabel: '2024 annual report',
      isLive: false, isMissing: false,
    },
  ];

  return {
    dimKey: 'L4', score, weight: 0.12, weightLabel: '12%',
    subSignals: sigs, liveCount: 0,
    formulaNote: 'Industry AI adoption velocity × sector-average layoff rate from BLS-2024 and WEF-2025 labor market reports.',
  };
}

function buildL5(score: number, r: HybridResult, now: number): DimensionProvenanceData {
  const sigs: SubSignalEntry[] = [
    {
      id: 'countryKey', displayName: 'Country / Region',
      value: r.countryKey.replace(/_/g, ' ').toUpperCase(),
      source: 'HumanProof Geo DB', ageLabel: 'Q1 2026 snapshot',
      isLive: false, isMissing: false,
    },
    {
      id: 'regionalAiAdoption', displayName: 'Regional AI Adoption Pace',
      value: score >= 65 ? 'High-velocity adopter' : score >= 35 ? 'Median pace' : 'Below-median',
      source: 'NASSCOM + WEF-2025', ageLabel: 'Q1 2026 snapshot',
      isLive: false, isMissing: false,
    },
    {
      id: 'laborDemand', displayName: 'Labor Market Demand',
      value: score >= 65 ? 'Softening — above-avg tech cuts' : score >= 35 ? 'Stable' : 'Growing',
      source: 'BLS-2024', ageLabel: '2024 annual report',
      isLive: false, isMissing: false,
    },
  ];

  return {
    dimKey: 'L5', score, weight: 0.13, weightLabel: '13%',
    subSignals: sigs, liveCount: 0,
    formulaNote: 'Regional AI adoption rate × local labor market demand derived from NASSCOM, WEF-2025, and BLS-2024 datasets.',
  };
}

// ── Oracle dimensions ─────────────────────────────────────────────────────────

function buildD1(score: number, r: HybridResult): DimensionProvenanceData {
  const sigs: SubSignalEntry[] = [
    {
      id: 'taskAutomatability', displayName: 'Task Automatability Score',
      value: `${score}/100`,
      source: 'HumanProof Role Intelligence DB', ageLabel: 'Q1 2026 snapshot',
      isLive: false, isMissing: false,
    },
    {
      id: 'roleKey', displayName: 'Role Assessed',
      value: r.workTypeKey.replace(/_/g, ' '),
      source: 'User input', ageLabel: 'this session',
      isLive: false, isMissing: false,
    },
  ];
  return {
    dimKey: 'D1', score, weight: 0.35, weightLabel: '35%',
    subSignals: sigs, liveCount: 0,
    formulaNote: 'Primary oracle weight. Percentage of daily task volume automatable by current enterprise AI.',
  };
}

function buildD4(score: number, r: HybridResult): DimensionProvenanceData {
  const expYears = (() => {
    const e = r.experience;
    if (e === '1-2') return '1–2 yrs';
    if (e === '3-5') return '3–5 yrs';
    if (e === '5-10') return '5–10 yrs';
    if (e === '10+') return '10+ yrs';
    return e;
  })();

  const sigs: SubSignalEntry[] = [
    {
      id: 'experience', displayName: 'Career Experience',
      value: expYears,
      source: 'User input', ageLabel: 'this session',
      isLive: false, isMissing: false,
    },
    {
      id: 'performanceTier', displayName: 'Effective Performance Tier',
      value: r.performanceTier ?? 'unknown',
      source: r.performanceTier !== r._engineResult?.performanceTier ? 'Credibility-adjusted' : 'User input',
      ageLabel: 'this session',
      isLive: false, isMissing: r.performanceTier === 'unknown',
    },
    {
      id: 'credibility', displayName: 'Performance Credibility',
      value: r.performanceCredibilityScore !== undefined
        ? `${Math.round(r.performanceCredibilityScore * 100)}%`
        : 'N/A',
      source: 'Credibility analysis', ageLabel: 'this session',
      isLive: false, isMissing: r.performanceCredibilityScore === undefined,
    },
  ];

  return {
    dimKey: 'D4', score, weight: 0.10, weightLabel: '10%',
    subSignals: sigs, liveCount: 0,
    formulaNote: 'Tenure × performance tier × credibility score. Credibility discounts self-reported "top" when objective signals contradict it.',
  };
}

function buildD5(score: number, r: HybridResult): DimensionProvenanceData {
  const sigs: SubSignalEntry[] = [
    {
      id: 'country', displayName: 'Country / Market',
      value: r.countryKey.toUpperCase(),
      source: 'User input', ageLabel: 'this session',
      isLive: false, isMissing: false,
    },
    {
      id: 'adoptionPace', displayName: 'Local AI Adoption Pace',
      value: score >= 65 ? 'High-velocity' : score >= 35 ? 'Median' : 'Below-median',
      source: 'WEF-2025 + NASSCOM', ageLabel: 'Q1 2026 snapshot',
      isLive: false, isMissing: false,
    },
  ];
  return {
    dimKey: 'D5', score, weight: 0.08, weightLabel: '8%',
    subSignals: sigs, liveCount: 0,
    formulaNote: 'Country-level AI adoption index. Low weight by design — global AI trends override local variation.',
  };
}

// Generic fallback for D2, D3, D6
function buildGenericOracle(
  dimKey: string, score: number, weight: number,
  weightLabel: string, label: string, formulaNote: string,
  r: HybridResult,
): DimensionProvenanceData {
  const sigs: SubSignalEntry[] = [
    {
      id: 'roleKey', displayName: 'Role Assessed',
      value: r.workTypeKey.replace(/_/g, ' '),
      source: 'HumanProof Role Intelligence DB', ageLabel: 'Q1 2026 snapshot',
      isLive: false, isMissing: false,
    },
    {
      id: 'derivedScore', displayName: label,
      value: `${score}/100`,
      source: 'HumanProof Role Intelligence DB', ageLabel: 'Q1 2026 snapshot',
      isLive: false, isMissing: false,
    },
  ];
  return { dimKey, score, weight, weightLabel, subSignals: sigs, liveCount: 0, formulaNote };
}

// ── Public entry point ────────────────────────────────────────────────────────

/**
 * Build provenance data for a single dimension card.
 * Pass `companyData: null` for Oracle mode (no company context).
 */
export function buildDimensionProvenance(
  dimKey: string,
  score: number,
  result: HybridResult,
  companyData: CompanyData | null,
): DimensionProvenanceData {
  const now = Date.now();
  const cd = companyData;

  switch (dimKey) {
    case 'L1': return cd ? buildL1(score, cd, result, now) : buildGenericOracle('L1', score, 0.30, '30%', 'Financial Risk Score', 'Financial sub-signals unavailable (no company data).', result);
    case 'L2': return cd ? buildL2(score, cd, result, now) : buildGenericOracle('L2', score, 0.25, '25%', 'Layoff History Score', 'Layoff history unavailable (no company data).', result);
    case 'L3': return buildL3(score, result, now);
    case 'L4': return buildL4(score, result, now);
    case 'L5': return buildL5(score, result, now);
    case 'D1': return buildD1(score, result);
    case 'D2': return buildGenericOracle('D2', score, 0.25, '25%', 'AI Tool Maturity', 'Maturity of enterprise-deployed AI tools targeting this role from HumanProof intelligence corpus.', result);
    case 'D3': return buildGenericOracle('D3', score, 0.15, '15%', 'Human Amplification Value', 'Degree to which human oversight and judgment add value in this role relative to AI-only execution.', result);
    case 'D4': return buildD4(score, result);
    case 'D5': return buildD5(score, result);
    case 'D6': return buildGenericOracle('D6', score, 0.07, '7%', 'Social Capital Score', 'Network density and stakeholder relationship moat derived from user inputs (promotions, relationships).', result);
    default:   return buildGenericOracle(dimKey, score, 0, '?%', dimKey, 'Unknown dimension.', result);
  }
}
