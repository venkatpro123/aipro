// signalCompressionService.ts — v34.0 UX redesign
//
// Compresses fragmented intelligence signals into executive-summary verdicts.
// The goal is to remove the cognitive overhead of reading 15+ signal cards.
// Each compressed block:
//   • produces ONE verdict label (Stable / Softening / Distressed / Critical)
//   • exposes the TOP 3 contributing signals as chips
//   • carries a tier (1–5) for adaptive ordering
//   • carries a severity (0–100) for sort-by-urgency
//
// This service is pure (no I/O). Reads from HybridResult + CompanyData.
//
// IMPORTANT: `companyData` is intentionally a separate argument rather than
// being read from `result.companyData`. The audit pipeline returns them as
// two separate fields (result + companyData) and they are passed to the dashboard
// as two separate props. Reading from `result.companyData` was the v34 bug
// that produced empty verdicts on every audit.

import type { HybridResult } from '../types/hybridResult';
import type { CompanyData } from '../data/companyDatabase';

// ── Public types ──────────────────────────────────────────────────────────────

export type CompressionTier = 1 | 2 | 3 | 4 | 5;

export type VerdictLabel =
  | 'critical'
  | 'distressed'
  | 'softening'
  | 'stable'
  | 'healthy'
  | 'stable-confirmed'   // signals checked, none triggered → positive confirmation
  | 'data-unavailable'   // live attempt made but no quorum / coverage → amber warning
  | 'unknown';           // no attempt made — profile/company not found

export interface SignalChip {
  label: string;
  value: string;
  tone: 'critical' | 'warning' | 'caution' | 'ok' | 'neutral';
}

export interface CompressedSignal {
  /** Stable id used for memo + animation keys */
  id: string;
  /** Tier 1 = mission-critical (always visible), Tier 5 = deep transparency */
  tier: CompressionTier;
  /** 0–100 — higher = more urgent. Used for adaptive ordering. */
  severity: number;
  /** Plain-language verdict ("Distressed", "Stable", "No data"). */
  verdict: VerdictLabel;
  /** Short headline label ("Workforce Stability", "Financial Health"). */
  headline: string;
  /** One-sentence rationale (≤120 chars). */
  rationale: string;
  /** Top 3 driving chips. */
  chips: SignalChip[];
  /** Hex tone driven by verdict. */
  tone: string;
  /** Group key for clustering with related blocks. */
  group: 'company' | 'career' | 'market' | 'meta';
  /** Whether this signal came from a live API, the seeded DB, or a heuristic baseline. */
  sourceKind: 'live' | 'db' | 'heuristic';
  /** ISO timestamp when live data was fetched. Null for db/heuristic. */
  fetchedAt: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const VERDICT_TONE: Record<VerdictLabel, string> = {
  critical:         '#dc2626',
  distressed:       '#f97316',
  softening:        '#f59e0b',
  stable:           '#10b981',
  healthy:          '#10b981',
  'stable-confirmed': '#10b981',
  'data-unavailable': '#f59e0b',
  unknown:          '#64748b',
};

/** Helper: derive sourceKind from companyData _liveDataCoverage */
function deriveSourceKind(cd: any): 'live' | 'db' | 'heuristic' {
  const overallSource: string = cd?._liveDataCoverage?.overallSource ?? '';
  if (overallSource === 'live') return 'live';
  if (overallSource === 'heuristic') return 'heuristic';
  return 'db';
}

function deriveFetchedAt(cd: any): string | null {
  return cd?._liveDataCoverage?.fetchedAt ?? null;
}

function verdictFromSeverity(severity: number): VerdictLabel {
  if (severity >= 60) return 'critical';
  if (severity >= 35) return 'distressed';
  if (severity >= 15) return 'softening';
  return 'stable';
}

function take<T>(arr: T[], n: number): T[] {
  return arr.slice(0, n);
}

// ── Workforce Stability compression ──────────────────────────────────────────
// Subsumes: WARN, layoffs, hiring trend, headcount velocity, Glassdoor velocity

export function compressWorkforceSignal(result: HybridResult, companyData?: CompanyData): CompressedSignal {
  const r = result as any;
  const cd = (companyData ?? (r.companyData as CompanyData | undefined)) as any;
  const warnActive     = r.warnSignal?.hasActiveWARN === true;
  const layoffRounds   = cd?.layoffRounds ?? r.layoffRounds ?? 0;
  const hiringTrend    = r.hiringSignal?.trend ?? cd?._hiringPostingTrend;
  const headcountDelta = r.headcountVelocity?.deltaPct90d ?? r.headcountVelocity?.delta90Day ?? null;
  const glassdoorTrend = r.glassdoorVelocity?.ratingTrend ?? null;

  let severity = 0;
  const reasons: string[] = [];
  const chips: SignalChip[] = [];

  if (warnActive) { severity += 40; reasons.push('Active WARN filing'); chips.push({ label: 'WARN', value: 'Active', tone: 'critical' }); }

  // Apply freshness decay to layoff history — rounds older than 12 months carry less signal weight.
  const layoffRoundsArr: Array<{ date?: string }> = r.layoffRounds ?? [];
  const mostRecentLayoffDate = layoffRoundsArr
    .filter(lr => lr.date)
    .map(lr => new Date(lr.date!).getTime())
    .sort((a, b) => b - a)[0] ?? null;
  const layoffAgeDays = mostRecentLayoffDate
    ? Math.floor((Date.now() - mostRecentLayoffDate) / (24 * 60 * 60 * 1000))
    : null;
  const layoffFreshnessMult = layoffAgeDays != null && layoffAgeDays > 365 ? 0.5
    : layoffAgeDays != null && layoffAgeDays > 180 ? 0.7
    : 1.0;

  if (layoffRounds >= 2)       { severity += Math.round(25 * layoffFreshnessMult); reasons.push(`${layoffRounds} layoff rounds`); chips.push({ label: 'Layoffs', value: `${layoffRounds}×`, tone: layoffFreshnessMult < 0.7 ? 'warning' : 'critical' }); }
  else if (layoffRounds === 1) { severity += Math.round(15 * layoffFreshnessMult); reasons.push('Recent layoff round'); chips.push({ label: 'Layoffs', value: '1×', tone: 'warning' }); }
  if (hiringTrend === 'frozen')         { severity += 25; reasons.push('Hiring freeze active'); chips.push({ label: 'Hiring', value: 'Frozen', tone: 'critical' }); }
  else if (hiringTrend === 'declining') { severity += 12; reasons.push('Hiring slowdown'); chips.push({ label: 'Hiring', value: 'Slowing', tone: 'caution' }); }
  else if (hiringTrend === 'growing')   { chips.push({ label: 'Hiring', value: 'Active', tone: 'ok' }); }
  if (typeof headcountDelta === 'number') {
    if (headcountDelta <= -10)     { severity += 22; reasons.push(`Headcount ${headcountDelta}% (90d)`); chips.push({ label: 'HC Δ', value: `${headcountDelta}%`, tone: 'critical' }); }
    else if (headcountDelta <= -5) { severity += 12; reasons.push(`Headcount ${headcountDelta}% (90d)`); chips.push({ label: 'HC Δ', value: `${headcountDelta}%`, tone: 'warning' }); }
  }
  if (glassdoorTrend === 'falling-sharp') { severity += 12; reasons.push('Glassdoor falling sharply'); }
  else if (glassdoorTrend === 'falling')  { severity += 6;  reasons.push('Glassdoor softening'); }

  const sourceKind = deriveSourceKind(cd);
  const fetchedAt  = deriveFetchedAt(cd);

  const hasAnyData = warnActive || layoffRounds > 0 || hiringTrend || typeof headcountDelta === 'number' || glassdoorTrend;
  if (!hasAnyData) {
    return {
      id: 'workforce',
      tier: 2,
      severity: 0,
      verdict: 'unknown',
      headline: 'Workforce Stability',
      rationale: 'No workforce signals surfaced for this company.',
      chips: [],
      tone: VERDICT_TONE.unknown,
      group: 'company',
      sourceKind,
      fetchedAt,
    };
  }

  // GAP I fix: distinguish "we checked live and found no distress" (stable-confirmed,
  // green) from "live was unavailable / quorum not reached" (data-unavailable, amber).
  if (severity === 0 && chips.length === 0) {
    const liveUnavailable = (cd as any)?._liveUnavailable === true || (cd as any)?._dataFreshnessScore === 0;
    const gapIVerdict: VerdictLabel = liveUnavailable ? 'data-unavailable' : 'stable-confirmed';
    return {
      id: 'workforce',
      tier: 2,
      severity: 0,
      verdict: gapIVerdict,
      headline: 'Workforce Stability',
      rationale: liveUnavailable
        ? 'Unable to verify workforce status — treat as elevated until live data confirmed.'
        : 'No distress signals found in live workforce data.',
      chips: [],
      tone: VERDICT_TONE[gapIVerdict],
      group: 'company',
      sourceKind,
      fetchedAt,
    };
  }

  const verdict = verdictFromSeverity(severity);
  return {
    id: 'workforce',
    tier: severity >= 35 ? 1 : 2,
    severity,
    verdict,
    headline: 'Workforce Stability',
    rationale: reasons.length ? take(reasons, 3).join(' · ') : 'No distress signals confirmed.',
    chips: take(chips, 3),
    tone: VERDICT_TONE[verdict],
    group: 'company',
    sourceKind,
    fetchedAt,
  };
}

// ── Financial Health compression ─────────────────────────────────────────────
// Subsumes: stock 90d, revenue YoY, funding, SEC enhanced signals

function fmtMarketCap(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}

export function compressFinancialSignal(result: HybridResult, companyData?: CompanyData): CompressedSignal {
  const r = result as any;
  const cd = (companyData ?? (r.companyData as CompanyData | undefined)) as any;
  const stock           = cd?.stock90DayChange ?? null;
  const revYoy          = cd?.revenueGrowthYoY ?? null;
  const isPublic        = cd?.isPublic === true;
  const monthsSinceRaise = cd?.monthsSinceLastRaise ?? null;
  const fundingStage    = cd?.lastFundingStage ?? null;
  const marketCap       = typeof cd?.marketCap === 'number' && isFinite(cd.marketCap) ? cd.marketCap as number : null;
  const peRatio         = typeof cd?.peRatio   === 'number' && isFinite(cd.peRatio)   ? cd.peRatio   as number : null;
  const secMaterial     = r.secEnhancedSignals?.has8kMaterialEvent === true
                       || r.secEnhancedSignals?.goingConcernFlag === true;

  let severity = 0;
  const reasons: string[] = [];
  const chips: SignalChip[] = [];

  if (isPublic) {
    if (typeof stock === 'number') {
      if (stock <= -30)       { severity += 35; reasons.push(`Stock ${stock}% (90d)`); chips.push({ label: 'Stock', value: `${stock}%`, tone: 'critical' }); }
      else if (stock <= -15)  { severity += 22; reasons.push(`Stock ${stock}% (90d)`); chips.push({ label: 'Stock', value: `${stock}%`, tone: 'warning' }); }
      else if (stock <= -5)   { severity += 10; reasons.push(`Stock ${stock}% (90d)`); chips.push({ label: 'Stock', value: `${stock}%`, tone: 'caution' }); }
      else if (stock >= 10)   { reasons.push(`Stock +${stock}% (90d)`); chips.push({ label: 'Stock', value: `+${stock}%`, tone: 'ok' }); }
    }
    if (typeof revYoy === 'number') {
      if (revYoy <= -10)     { severity += 22; reasons.push(`Revenue ${revYoy}% YoY`); chips.push({ label: 'Revenue', value: `${revYoy}%`, tone: 'critical' }); }
      else if (revYoy < 0)   { severity += 12; reasons.push(`Revenue ${revYoy}% YoY`); chips.push({ label: 'Revenue', value: `${revYoy}%`, tone: 'warning' }); }
      else if (revYoy >= 10) { chips.push({ label: 'Revenue', value: `+${revYoy}%`, tone: 'ok' }); }
    }
    // Informational chips — non-scored display signals from Finnhub/Yahoo Finance
    if (marketCap != null) chips.push({ label: 'Mkt Cap', value: fmtMarketCap(marketCap), tone: 'neutral' });
    if (peRatio   != null) chips.push({ label: 'P/E', value: `${peRatio.toFixed(1)}×`, tone: 'neutral' });
  } else if (typeof monthsSinceRaise === 'number') {
    if (monthsSinceRaise >= 24)      { severity += 28; reasons.push(`${monthsSinceRaise}mo since last raise`); chips.push({ label: 'Raise', value: `${monthsSinceRaise}mo`, tone: 'critical' }); }
    else if (monthsSinceRaise >= 18) { severity += 18; reasons.push(`${monthsSinceRaise}mo since last raise`); chips.push({ label: 'Raise', value: `${monthsSinceRaise}mo`, tone: 'warning' }); }
    else if (monthsSinceRaise >= 12) { severity += 8;  reasons.push(`${monthsSinceRaise}mo since last raise`); chips.push({ label: 'Raise', value: `${monthsSinceRaise}mo`, tone: 'caution' }); }
  }
  if (secMaterial) { severity += 25; reasons.push('SEC material event filed'); chips.push({ label: 'SEC', value: 'Material', tone: 'critical' }); }

  const sourceKind = deriveSourceKind(cd);
  const fetchedAt  = deriveFetchedAt(cd);

  const hasAnyData = stock != null || revYoy != null || fundingStage != null || monthsSinceRaise != null || secMaterial || marketCap != null || peRatio != null;
  if (!hasAnyData) {
    return {
      id: 'financial',
      tier: 2,
      severity: 0,
      verdict: 'unknown',
      headline: 'Financial Health',
      rationale: 'Live financial signals unavailable.',
      chips: [],
      tone: VERDICT_TONE.unknown,
      group: 'company',
      sourceKind,
      fetchedAt,
    };
  }

  // GAP I fix: normal-range financials are positive (stable-confirmed), not unknown.
  if (severity === 0 && chips.length === 0) {
    const liveUnavailable = (cd as any)?._liveUnavailable === true || (cd as any)?._dataFreshnessScore === 0;
    const gapIVerdict: VerdictLabel = liveUnavailable ? 'data-unavailable' : 'stable-confirmed';
    return {
      id: 'financial',
      tier: 2,
      severity: 0,
      verdict: gapIVerdict,
      headline: 'Financial Health',
      rationale: liveUnavailable
        ? 'Unable to verify financial status — treat as elevated until live data confirmed.'
        : 'Financial signals within normal range — no distress confirmed.',
      chips: [],
      tone: VERDICT_TONE[gapIVerdict],
      group: 'company',
      sourceKind,
      fetchedAt,
    };
  }

  const verdict = verdictFromSeverity(severity);
  return {
    id: 'financial',
    tier: severity >= 35 ? 1 : 2,
    severity,
    verdict,
    headline: 'Financial Health',
    rationale: reasons.length ? take(reasons, 3).join(' · ') : 'Financial signals nominal.',
    chips: take(chips, 3),
    tone: VERDICT_TONE[verdict],
    group: 'company',
    sourceKind,
    fetchedAt,
  };
}

// ── Market Pressure compression ─────────────────────────────────────────────
// Subsumes: role-market demand, peer contagion, macro economic risk

export function compressMarketSignal(result: HybridResult, _companyData?: CompanyData): CompressedSignal {
  const r = result as any;
  const roleDemand    = r.roleMarketDemand;
  const peerContagion = r.peerContagion;
  const macro         = r.macroEconomicRisk;

  let severity = 0;
  const reasons: string[] = [];
  const chips: SignalChip[] = [];

  // role market — lower demand = higher severity
  const demandScore = roleDemand?.demandScore ?? roleDemand?.score ?? null;
  if (typeof demandScore === 'number') {
    if (demandScore < 30)      { severity += 25; reasons.push('Role demand soft'); chips.push({ label: 'Demand', value: `${demandScore}/100`, tone: 'warning' }); }
    else if (demandScore < 50) { severity += 12; reasons.push('Role demand mixed'); chips.push({ label: 'Demand', value: `${demandScore}/100`, tone: 'caution' }); }
    else                       { chips.push({ label: 'Demand', value: `${demandScore}/100`, tone: 'ok' }); }
  }

  // peer contagion — higher contagion = higher severity
  const peerScore = peerContagion?.contagionScore ?? peerContagion?.score ?? null;
  if (typeof peerScore === 'number' && peerScore > 30) {
    severity += Math.min(20, Math.round(peerScore / 3));
    reasons.push('Peer-sector layoffs spreading');
    chips.push({ label: 'Peers', value: `${peerScore}/100`, tone: peerScore >= 60 ? 'critical' : 'warning' });
  }

  // macro
  const macroScore = macro?.macroRiskScore ?? macro?.score ?? null;
  if (typeof macroScore === 'number' && macroScore > 40) {
    severity += Math.min(15, Math.round(macroScore / 6));
    reasons.push('Macro environment deteriorating');
    chips.push({ label: 'Macro', value: `${macroScore}/100`, tone: macroScore >= 70 ? 'critical' : 'warning' });
  }

  // Market signals (macro, peer contagion, role demand) are calibrated baselines
  // not real-time API feeds — always marked as heuristic.
  const hasAnyData = roleDemand || peerContagion || macro;
  if (!hasAnyData) {
    return {
      id: 'market',
      tier: 3,
      severity: 0,
      verdict: 'unknown',
      headline: 'Market Environment',
      rationale: 'Market signals not loaded.',
      chips: [],
      tone: VERDICT_TONE.unknown,
      group: 'market',
      sourceKind: 'heuristic',
      fetchedAt: null,
    };
  }

  const verdict = verdictFromSeverity(severity);
  return {
    id: 'market',
    tier: severity >= 35 ? 2 : 3,
    severity,
    verdict,
    headline: 'Market Environment',
    rationale: reasons.length ? take(reasons, 3).join(' · ') : 'Market conditions stable.',
    chips: take(chips, 3),
    tone: VERDICT_TONE[verdict],
    group: 'market',
    sourceKind: 'heuristic',
    fetchedAt: null,
  };
}

// ── Career Resilience compression ───────────────────────────────────────────
// Subsumes: preparedness, career-confidence, career resilience

export function compressCareerSignal(result: HybridResult, _companyData?: CompanyData): CompressedSignal {
  const r = result as any;
  const prep       = r.preparednessScore;
  const confidence = r.careerConfidence;
  const resilience = r.careerResilience;

  const prepScore = prep?.overallScore ?? null;
  const confScore = confidence?.score ?? null;
  const resScore  = resilience?.resilienceScore ?? null;

  const chips: SignalChip[] = [];
  if (typeof prepScore === 'number') chips.push({ label: 'Ready', value: `${prepScore}`, tone: prepScore >= 70 ? 'ok' : prepScore >= 45 ? 'caution' : 'warning' });
  if (typeof confScore === 'number') chips.push({ label: 'Confident', value: `${confScore}`, tone: confScore >= 70 ? 'ok' : confScore >= 45 ? 'caution' : 'warning' });
  if (typeof resScore === 'number') chips.push({ label: 'Resilient', value: `${resScore}`, tone: resScore >= 70 ? 'ok' : resScore >= 45 ? 'caution' : 'warning' });

  // Combine — career strength is INVERSE to severity
  const strengths = [prepScore, confScore, resScore].filter((s): s is number => typeof s === 'number');
  if (strengths.length === 0) {
    return {
      id: 'career',
      tier: 3,
      severity: 0,
      verdict: 'unknown',
      headline: 'Career Strength',
      rationale: 'Complete your profile to unlock this signal.',
      chips: [],
      tone: VERDICT_TONE.unknown,
      group: 'career',
      sourceKind: 'heuristic',
      fetchedAt: null,
    };
  }

  const avgStrength = strengths.reduce((a, b) => a + b, 0) / strengths.length;
  const severity = Math.max(0, Math.round(100 - avgStrength));

  let verdict: VerdictLabel;
  let headline: string;
  if (avgStrength >= 75)      { verdict = 'healthy';  headline = 'Career Strength'; }
  else if (avgStrength >= 55) { verdict = 'stable';   headline = 'Career Strength'; }
  else if (avgStrength >= 35) { verdict = 'softening';headline = 'Career Strength'; }
  else                        { verdict = 'distressed'; headline = 'Career Strength'; }

  const rationale = avgStrength >= 70
    ? 'You have strong defensive capital — keep building.'
    : avgStrength >= 45
    ? 'Mixed readiness — close gaps before they matter.'
    : 'Limited defensive capital — start building reserves now.';

  return {
    id: 'career',
    tier: avgStrength < 45 ? 1 : 2,
    severity,
    verdict,
    headline,
    rationale,
    chips: take(chips, 3),
    tone: VERDICT_TONE[verdict],
    group: 'career',
    sourceKind: 'heuristic',
    fetchedAt: null,
  };
}

// ── Top-level: compress everything for the audit ────────────────────────────

export interface CompressedIntel {
  workforce: CompressedSignal;
  financial: CompressedSignal;
  market:    CompressedSignal;
  career:    CompressedSignal;
  /** Sorted by tier ASC, severity DESC. The order the dashboard should render in. */
  ordered:   CompressedSignal[];
  /** True when at least one signal is Tier-1 critical. Drives Emergency Mode. */
  hasTier1Critical: boolean;
}

export function compressAllSignals(result: HybridResult, companyData?: CompanyData): CompressedIntel {
  const workforce = compressWorkforceSignal(result, companyData);
  const financial = compressFinancialSignal(result, companyData);
  const market    = compressMarketSignal(result, companyData);
  const career    = compressCareerSignal(result, companyData);

  const all = [workforce, financial, market, career];
  const ordered = [...all].sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    return b.severity - a.severity;
  });

  const hasTier1Critical = all.some(
    s => s.tier === 1 && (s.verdict === 'critical' || s.verdict === 'distressed'),
  );

  return { workforce, financial, market, career, ordered, hasTier1Critical };
}

// ── Tone → CSS color mapping for chips ──────────────────────────────────────

export function chipToneColor(tone: SignalChip['tone']): string {
  switch (tone) {
    case 'critical': return '#dc2626';
    case 'warning':  return '#f97316';
    case 'caution':  return '#f59e0b';
    case 'ok':       return '#10b981';
    case 'neutral':
    default:         return '#94a3b8';
  }
}
