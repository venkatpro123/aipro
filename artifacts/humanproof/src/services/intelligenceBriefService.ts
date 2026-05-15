// intelligenceBriefService.ts — Layer 52 (v17.0)
// Generates AI-powered strategic intelligence briefs by calling the deployed
// llm-analyze edge function with full pipeline context. Results are cached in
// the intelligence_briefs table with a 24-hour TTL. Cache is invalidated when
// the base score shifts more than 5 points.

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

function buildSignalContext(hybridResult: Record<string, unknown>): string {
  const ctx: string[] = [];

  const cohort = hybridResult.cohortClassification as { primaryCohort?: string } | undefined;
  if (cohort?.primaryCohort) ctx.push(`Cohort: ${cohort.primaryCohort}`);

  const macro = hybridResult.blsMacroSignal as { riskTier?: string } | undefined;
  // Audit v35: tag macro as heuristic in the LLM prompt so the model knows it
  // CANNOT draw real-time macro conclusions from it.
  if (macro?.riskTier) ctx.push(`Macro risk tier: ${macro.riskTier} (HEURISTIC — May 2026 calibrated constant, not live BLS/FRED data)`);

  const glassdoor = hybridResult.glassdoorVelocity as { tier?: string } | undefined;
  if (glassdoor?.tier) ctx.push(`Glassdoor velocity: ${glassdoor.tier}`);

  const scenario = hybridResult.scenarioPlan as { dominantUncertainty?: string } | undefined;
  if (scenario?.dominantUncertainty) ctx.push(`Key uncertainty: ${scenario.dominantUncertainty}`);

  // Audit v35: inject live-signal provenance so the model knows which signals are
  // grounded in real-time data vs. seeded/heuristic baselines. This prevents
  // hallucination of "real-time macro headwinds" or "live Glassdoor deterioration"
  // when those signals are actually static calibrated constants.
  const sq = hybridResult.signalQuality as Record<string, unknown> | undefined;
  const liveSignals = typeof sq?.liveSignals === 'number' ? sq.liveSignals : 0;
  const heuristicSignals = typeof sq?.heuristicSignals === 'number' ? sq.heuristicSignals : 7;
  const dataSource = hybridResult.dataSource as string | undefined;

  ctx.push(
    `Signal provenance: ${liveSignals} live API signals, ${heuristicSignals} heuristic/seeded signals.`
    + (dataSource === 'live'
      ? ' Intelligence is primarily live-sourced.'
      : dataSource === 'db' || dataSource === 'stale_db'
        ? ' Intelligence is primarily from the company intelligence database (not real-time). Do NOT imply real-time data in the narrative.'
        : ' Intelligence is from fallback/heuristic defaults. Only state what can be confirmed from the score breakdown; do not speculate about company-specific live signals.'),
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

  // Check cache first
  const cached = await checkCache(userId, companyName, roleTitle, currentScore);
  if (cached) return cached;

  // Call llm-analyze edge function
  try {
    const { data, error } = await invokeEdgeFunction<any>('llm-analyze', {
      body: {
        companyName,
        roleTitle,
        engineScore: currentScore,
        engineBreakdown: buildEngineBreakdown(hybridResult),
        signalContext: buildSignalContext(hybridResult),
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
