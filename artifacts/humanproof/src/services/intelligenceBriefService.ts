// intelligenceBriefService.ts — Layer 52 (v35.0)
// Generates AI-powered strategic intelligence briefs by calling the deployed
// llm-analyze edge function with full pipeline context. Results are cached in
// the intelligence_briefs table with a 24-hour TTL. Cache is invalidated when
// the base score shifts more than 5 points.
// GAP D: structured signal payload now passes specific WARN locations/counts,
// cohort reason, vulnerable+protective signals, and peer contagion details
// so the LLM can produce specific narratives instead of generic risk statements.

import { supabase } from '../utils/supabase';
import { invokeEdgeFunction } from '../infrastructure/requestId';

export interface IntelligenceBriefResult {
  paragraphs: [string, string, string];
  urgencyLevel: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  keyRiskDriver: string;
  topActionThisWeek: string;
  generatedAt: string;
  cachedUntil: string;
  modelUsed: string;
  fromCache: boolean;
}

interface CachedBrief {
  paragraph_situation: string;
  paragraph_risks: string;
  paragraph_actions: string;
  urgency_level: string;
  key_risk_driver: string;
  top_action: string;
  model_used: string;
  generated_at: string;
  expires_at: string;
  score_at_generation: number;
}

interface LlmAnalyzeResponse {
  primaryRiskDriver?: string;
  synthesis?: string;
  urgencyLevel?: string;
  oneActionThisWeek?: string;
  whatChangesRiskMost?: string;
  estimatedTimeline?: string;
}

const SCORE_DRIFT_THRESHOLD = 5;

async function checkCache(
  userId: string | null,
  companyName: string,
  roleTitle: string,
  currentScore: number,
  warnFilingDate?: string | null,
  currentCohort?: string | null,
): Promise<IntelligenceBriefResult | null> {
  try {
    const { data, error } = await supabase
      .from('intelligence_briefs')
      .select('*')
      .eq('company_name', companyName.toLowerCase())
      .eq('role_title', roleTitle.toLowerCase())
      .gt('expires_at', new Date().toISOString())
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    const cached = data as CachedBrief;
    if (Math.abs(cached.score_at_generation - currentScore) > SCORE_DRIFT_THRESHOLD) {
      return null;
    }

    // Invalidate if a WARN filing appeared after the cached brief was generated.
    if (warnFilingDate && warnFilingDate > cached.generated_at) {
      return null;
    }

    // Invalidate if the cohort classification has changed (e.g. STABLE → DISTRESS).
    const cachedCohort: string | undefined = (cached as any).cohort_at_generation;
    if (currentCohort && cachedCohort && currentCohort !== cachedCohort) {
      return null;
    }

    const urgency = (cached.urgency_level?.toUpperCase() ?? 'MODERATE') as IntelligenceBriefResult['urgencyLevel'];
    return {
      paragraphs: [cached.paragraph_situation, cached.paragraph_risks, cached.paragraph_actions],
      urgencyLevel: ['CRITICAL', 'HIGH', 'MODERATE', 'LOW'].includes(urgency) ? urgency : 'MODERATE',
      keyRiskDriver: cached.key_risk_driver,
      topActionThisWeek: cached.top_action,
      generatedAt: cached.generated_at,
      cachedUntil: cached.expires_at,
      modelUsed: cached.model_used,
      fromCache: true,
    };
  } catch {
    return null;
  }
}

async function saveToCache(
  userId: string | null,
  companyName: string,
  roleTitle: string,
  score: number,
  brief: IntelligenceBriefResult,
): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await supabase.from('intelligence_briefs').insert({
      user_id: userId,
      company_name: companyName.toLowerCase(),
      role_title: roleTitle.toLowerCase(),
      engine_score: score,
      score_at_generation: score,
      paragraph_situation: brief.paragraphs[0],
      paragraph_risks: brief.paragraphs[1],
      paragraph_actions: brief.paragraphs[2],
      urgency_level: brief.urgencyLevel,
      key_risk_driver: brief.keyRiskDriver,
      top_action: brief.topActionThisWeek,
      model_used: brief.modelUsed,
      generated_at: brief.generatedAt,
      expires_at: expiresAt,
    });
  } catch {
    // Cache write failure is non-fatal
  }
}

function buildEngineBreakdown(hybridResult: Record<string, unknown>): string {
  const parts: string[] = [];
  if (typeof hybridResult.total === 'number') parts.push(`Score: ${hybridResult.total}/100`);

  const breakdown = hybridResult.breakdown as Record<string, number> | undefined;
  if (breakdown) {
    if (typeof breakdown.L1 === 'number') parts.push(`Financial health risk: ${Math.round(breakdown.L1 * 100)}%`);
    if (typeof breakdown.L2 === 'number') parts.push(`Layoff history risk: ${Math.round(breakdown.L2 * 100)}%`);
  }

  const warn = hybridResult.warnSignal as { hasActiveWARN?: boolean; daysUntilEffective?: number } | undefined;
  if (warn?.hasActiveWARN) parts.push(`WARN Act filed — ${warn.daysUntilEffective ?? '?'} days until effective`);

  const trajectory = hybridResult.scoreTrajectory as { velocityPtsPerMonth?: number } | undefined;
  if (trajectory?.velocityPtsPerMonth) {
    const dir = trajectory.velocityPtsPerMonth > 0 ? 'rising' : 'falling';
    parts.push(`Risk ${dir} at ${Math.abs(trajectory.velocityPtsPerMonth).toFixed(1)} pts/month`);
  }

  return parts.join('; ');
}

/** GAP D: builds a specific, numbered context block so LLM can name signals rather than being generic */
function buildStructuredSignalPayload(hybridResult: Record<string, unknown>): string {
  const lines: string[] = [];

  // WARN Act — exact locations, affected count, days
  const warn = hybridResult.warnSignal as {
    hasActiveWARN?: boolean;
    daysUntilLayoff?: number | null;
    totalAffectedCount?: number;
    affectedLocations?: string[];
    warnFilings?: { filingState?: string; affectedCount?: number }[];
  } | undefined;

  if (warn?.hasActiveWARN) {
    const locs = (warn.affectedLocations ?? []).slice(0, 3).join(', ') || 'unspecified locations';
    const count = warn.totalAffectedCount ?? '?';
    const days = warn.daysUntilLayoff != null ? `${warn.daysUntilLayoff} days` : 'unknown timeline';
    lines.push(`GROUND TRUTH — WARN Act filing confirmed: ${count} affected employees at ${locs}. Layoff effective in ${days}.`);
  }

  // Cohort classification with confidence + reason
  const cohort = hybridResult.cohortClassification as {
    primaryCohort?: string; confidence?: number; reason?: string; secondaryCohort?: string
  } | undefined;
  if (cohort?.primaryCohort) {
    const conf = cohort.confidence != null ? ` (${Math.round(cohort.confidence * 100)}% confidence)` : '';
    const why = cohort.reason ? ` — reason: ${cohort.reason}` : '';
    lines.push(`Cohort: ${cohort.primaryCohort}${conf}${why}.`);
  }

  // Layoff history — exact rounds and percent cuts
  const layoffRounds = (hybridResult as any).layoffRounds as Array<{ date?: string; percentCut?: number; source?: string }> | undefined;
  if (Array.isArray(layoffRounds) && layoffRounds.length > 0) {
    const formatted = layoffRounds.slice(0, 3).map(r => {
      const pct = r.percentCut != null ? `${r.percentCut}% headcount cut` : 'headcount cut';
      return r.date ? `${r.date.slice(0, 7)} ${pct}` : pct;
    }).join('; ');
    lines.push(`Layoff history: ${formatted}.`);
  }

  // Personal modifier: vulnerable signals
  const pm = hybridResult.personalRiskModifier as {
    rawModifier?: number; transparencyLines?: string[]
  } | undefined;
  if (pm && (pm.rawModifier ?? 0) >= 2 && (pm.transparencyLines ?? []).length > 0) {
    lines.push(`User vulnerable signals: ${pm.transparencyLines!.slice(0, 2).join(' | ')}`);
  } else if (pm && (pm.rawModifier ?? 0) <= -2 && (pm.transparencyLines ?? []).length > 0) {
    lines.push(`User protective signals: ${pm.transparencyLines!.slice(0, 2).join(' | ')}`);
  }

  // Peer contagion — specific probability + active peers
  const contagion = hybridResult.peerContagion as {
    contagionProbability?: number; activePeerLayoffs?: number; sectorLabel?: string
  } | undefined;
  if (contagion?.contagionProbability != null && contagion.contagionProbability >= 0.25) {
    const active = contagion.activePeerLayoffs != null ? `${contagion.activePeerLayoffs} active peer layoffs` : 'multiple sector layoffs';
    const sector = contagion.sectorLabel ? ` in ${contagion.sectorLabel}` : '';
    lines.push(`Sector contagion: ${Math.round(contagion.contagionProbability * 100)}% probability${sector} (${active}).`);
  }

  // Network + career protective signals (from personal modifier components)
  const pmComp = (pm as any)?.components;
  if (pmComp?.networkComponent <= -2) {
    lines.push('Protective: strong professional network — warm referral channels available.');
  }
  if (pmComp?.velocityComponent <= -2) {
    lines.push('Protective: accelerating career trajectory — harder-to-displace profile.');
  }

  return lines.join('\n');
}

function buildSignalContext(hybridResult: Record<string, unknown>): string {
  const ctx: string[] = [];

  const cohort = hybridResult.cohortClassification as { primaryCohort?: string } | undefined;
  if (cohort?.primaryCohort) ctx.push(`Cohort: ${cohort.primaryCohort}`);

  const macro = hybridResult.blsMacroSignal as { riskTier?: string } | undefined;
  // Tag macro as heuristic so the LLM cannot draw real-time macro conclusions from it.
  if (macro?.riskTier) ctx.push(`Macro risk tier: ${macro.riskTier} (HEURISTIC — May 2026 calibrated constant, not live BLS/FRED data)`);

  const glassdoor = hybridResult.glassdoorVelocity as { tier?: string } | undefined;
  if (glassdoor?.tier) ctx.push(`Glassdoor velocity: ${glassdoor.tier}`);

  const scenario = hybridResult.scenarioPlan as { dominantUncertainty?: string } | undefined;
  if (scenario?.dominantUncertainty) ctx.push(`Key uncertainty: ${scenario.dominantUncertainty}`);

  // Inject live-signal provenance so the model knows which signals are grounded
  // in real-time data vs. seeded/heuristic baselines.
  const sq = hybridResult.signalQuality as Record<string, unknown> | undefined;
  const liveSignals = typeof sq?.liveSignals === 'number' ? sq.liveSignals : 0;
  const heuristicSignals = typeof sq?.heuristicSignals === 'number' ? sq.heuristicSignals : 7;
  const dataSource = hybridResult.dataSource as string | undefined;

  ctx.push(
    `Signal provenance: ${liveSignals} live signals, ${heuristicSignals} heuristic/seeded signals.`
    + (dataSource === 'live'
      ? ' Intelligence primarily live-sourced.'
      : dataSource === 'db' || dataSource === 'stale_db'
        ? ' Intelligence from company database (not real-time). Do NOT imply real-time data.'
        : ' Intelligence from fallback/heuristic defaults. Only state what the score breakdown confirms.'),
  );

  return ctx.join('. ');
}

function mapLlmResponseToBrief(
  response: LlmAnalyzeResponse,
  modelUsed: string,
): IntelligenceBriefResult {
  const urgencyRaw = (response.urgencyLevel ?? 'Moderate').toUpperCase();
  const urgency: IntelligenceBriefResult['urgencyLevel'] =
    urgencyRaw.startsWith('CRIT') ? 'CRITICAL' :
    urgencyRaw.startsWith('HIGH') ? 'HIGH' :
    urgencyRaw.startsWith('LOW')  ? 'LOW' : 'MODERATE';

  const situation = response.synthesis ?? 'Risk analysis complete. See breakdown for details.';
  const risks = response.primaryRiskDriver ?? 'Multiple risk factors identified. Review score breakdown.';
  const actions = response.oneActionThisWeek ?? response.whatChangesRiskMost ??
    'Review your action plan and prioritize the highest-impact items this week.';

  const now = new Date().toISOString();
  return {
    paragraphs: [situation, risks, actions],
    urgencyLevel: urgency,
    keyRiskDriver: response.primaryRiskDriver?.slice(0, 200) ?? 'See breakdown',
    topActionThisWeek: response.oneActionThisWeek?.slice(0, 300) ?? actions,
    generatedAt: now,
    cachedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    modelUsed,
    fromCache: false,
  };
}

export async function fetchIntelligenceBrief(
  companyName: string,
  roleTitle: string,
  hybridResult: Record<string, unknown>,
  userId: string | null,
): Promise<IntelligenceBriefResult | null> {
  const currentScore = typeof hybridResult.total === 'number' ? hybridResult.total : 0;
  const warnSignalAny = hybridResult.warnSignal as any;
  const warnFilingDate: string | null = warnSignalAny?.filingDate ?? warnSignalAny?.effectiveDate ?? null;
  const currentCohort: string | null = (hybridResult.cohortClassification as any)?.primaryCohort ?? null;

  // Check cache first — also invalidates on new WARN filing or cohort change.
  const cached = await checkCache(userId, companyName, roleTitle, currentScore, warnFilingDate, currentCohort);
  if (cached) return cached;

  // Call llm-analyze edge function
  try {
    const structuredContext = buildStructuredSignalPayload(hybridResult);
    const { data, error } = await invokeEdgeFunction<any>('llm-analyze', {
      body: {
        companyName,
        roleTitle,
        engineScore: currentScore,
        engineBreakdown: buildEngineBreakdown(hybridResult),
        signalContext: buildSignalContext(hybridResult),
        // GAP D: specific signal details — WARN locations, affected counts, cohort reason,
        // vulnerable/protective signals. LLM should cite these instead of being generic.
        structuredContext,
        analysisInstructions: structuredContext
          ? 'Be specific: use exact numbers and signal names from structuredContext. Name the cohort and explain why. List 1–2 specific vulnerable signals and 1–2 protective signals. Avoid generic phrases like "multiple risk factors identified". CRITICAL: if a specific number, location, or date is not present in structuredContext, do NOT estimate or infer it — use "data unavailable" instead. Never fabricate statistics.'
          : 'State only what the score breakdown confirms. Do not speculate about live signals. Never fabricate statistics or specific numbers not present in the provided data.',
      },
    });

    if (error || !data) {
      console.warn('[intelligenceBriefService] llm-analyze failed:', error?.message);
      return null;
    }

    const brief = mapLlmResponseToBrief(data as LlmAnalyzeResponse, data.model ?? 'llm-analyze');

    // Persist to cache (non-blocking)
    saveToCache(userId, companyName, roleTitle, currentScore, brief).catch(() => {}); // arch-allow:R2 fire-and-forget cache-write; next call re-computes on miss

    return brief;
  } catch (e) {
    console.warn('[intelligenceBriefService] fetch failed:', e);
    return null;
  }
}
