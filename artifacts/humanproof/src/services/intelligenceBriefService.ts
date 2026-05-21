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
import type { CareerPathMarket } from './careerPathMarket';
import { resolveRegionalMarket, type ResolvedRegionalMarket } from './careerPathMarket';
import { buildRegionalLlmContext, type RegionalLlmContextResult } from './regionalLlmContext';

export interface IntelligenceBriefResult {
  paragraphs: [string, string, string];
  urgencyLevel: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  keyRiskDriver: string;
  topActionThisWeek: string;
  generatedAt: string;
  cachedUntil: string;
  modelUsed: string;
  fromCache: boolean;
  /**
   * true when topActionThisWeek contains at least one number sourced from
   * careerPathMarket data (indiaOpenings, successRate12mPct, weeksToFirstInterview).
   * false when the LLM response failed the number-citation check and a
   * generated fallback was substituted. UI can show a "market data cited"
   * badge when true.
   */
  marketGrounded: boolean;
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
  // v39.0 B2: profile signature ensures two users at the same company + role
  // don't share a brief if their personal circumstances differ.
  profileSignature?: string | null,
): Promise<IntelligenceBriefResult | null> {
  try {
    let query = supabase
      .from('intelligence_briefs')
      .select('*')
      .eq('company_name', companyName.toLowerCase())
      .eq('role_title', roleTitle.toLowerCase())
      .gt('expires_at', new Date().toISOString())
      .order('generated_at', { ascending: false })
      .limit(1);

    // Only require matching profile_signature when one is provided. Audits
    // without a profile (anonymous / pre-profile-setup) still benefit from
    // the shared cache.
    if (profileSignature) {
      query = query.eq('profile_signature', profileSignature);
    }

    const { data, error } = await query.maybeSingle();

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
      // Infer marketGrounded from the cached action text — if it contains a digit,
      // it was likely grounded. Accurate for actions generated after v40.0.
      marketGrounded: actionContainsNumber(cached.top_action ?? ''),
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
  profileSignature?: string | null,
  cohort?: string | null,
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
      // v39.0 B2 — profile-aware cache keys
      profile_signature: profileSignature ?? null,
      cohort_at_generation: cohort ?? null,
    });
  } catch {
    // Cache write failure is non-fatal
  }
}

/**
 * v39.0 B2 — Compact profile signature for cache keying.
 *
 * Format: `v:{visa},r:{runwayTier},dep:{0|1},dim:{0|1},res:{0|1}`
 *
 * Example: `v:h1b,r:critical,dep:1,dim:0,res:0` for an H-1B holder with
 * <3mo runway, dependents, single income, no prior layoff survival.
 *
 * Stable across runs for the same profile inputs. Returned as null when
 * the user has no profile signals (anonymous / pre-setup audits).
 */
export function buildProfileSignature(uf: Record<string, any> | null | undefined): string | null {
  if (!uf) return null;
  const visa = uf.visaStatus ?? 'na';
  const r = uf.savingsMonthsRunway;
  const runwayTier = r == null ? 'u' : r < 3 ? 'c' : r < 6 ? 'e' : 'k';
  const dep = uf.hasDependents ? 1 : 0;
  const dim = uf.dualIncomeHousehold ? 1 : 0;
  const res = uf.priorLayoffSurvived ? 1 : 0;
  // If literally nothing is set, treat as no-signature so anonymous audits
  // can share the cache.
  if (visa === 'na' && runwayTier === 'u' && !dep && !dim && !res) return null;
  return `v:${visa},r:${runwayTier},dep:${dep},dim:${dim},res:${res}`;
}

/**
 * Formats the CareerPathMarket data into a structured block for the LLM prompt.
 * The LLM is instructed to cite at least one of these numbers in oneActionThisWeek.
 *
 * REGION-AWARE: chooses the appropriate opening count + job-board source for the
 * user's region. For a Berlin-based audit, surfaces StepStone/XING context — not
 * Naukri (which would be hallucinatory for a German user). When region-specific
 * data is missing, explicitly tells the LLM to disclose that gap rather than
 * fabricate a number.
 */
function buildMarketContextBlock(
  market: CareerPathMarket,
  resolved: ResolvedRegionalMarket,
): string {
  const sourceLine = resolved.isRegionSpecific
    ? `Active openings (${resolved.regionLabel} — ${resolved.source}): ${resolved.count.toLocaleString()} as of ${resolved.asOf}.`
    : `Active openings (global aggregate): ${resolved.count.toLocaleString()}. ` +
      `REGION-SPECIFIC DATA UNAVAILABLE FOR ${resolved.regionLabel.toUpperCase()} — ` +
      `if you cite this number, you MUST disclose that it is a global figure and ` +
      `recommend the user verify on ${resolved.suggestedSources.slice(0, 2).join(' / ')}.`;

  const lines: string[] = [
    `Target role: ${market.targetRole}`,
    `User's market region: ${resolved.regionLabel}`,
    `Region-appropriate job-board sources: ${resolved.suggestedSources.join(', ')}`,
    sourceLine,
    `Hiring bar: ${market.hiringBar}`,
    `Proof of competency (what interviewers want to see): ${market.proofOfCompetency}`,
    `Time to first interview from dedicated effort: ${market.weeksToFirstInterview} weeks`,
    `12-month transition success rate: ${market.successRate12mPct}%`,
  ];
  if (market.demandTrend) {
    lines.push(`Demand trend: ${market.demandTrend}`);
  }
  return lines.join('\n');
}

/**
 * Validates that the LLM's oneActionThisWeek contains at least one digit —
 * a necessary (though not sufficient) condition for it to cite market data.
 *
 * "build a project in your target field" → false (no number)
 * "Data Engineering has 12,000 openings — build X" → true
 */
function actionContainsNumber(action: string): boolean {
  return /\d/.test(action);
}

/**
 * Generates a market-grounded fallback when the LLM response fails validation.
 * Always contains numbers from market data so users get an actionable output
 * even when the model ignores the citation instruction.
 *
 * REGION-AWARE: phrases the opening count using the user's actual region.
 * A Berlin user never receives "X active openings in India" — they get
 * StepStone/XING-attributed figures, or an explicit "global aggregate" caveat
 * with a recommendation to verify on region-appropriate boards.
 */
function generateGroundedFallback(
  market: CareerPathMarket,
  resolved: ResolvedRegionalMarket,
): string {
  const openingsClause = resolved.isRegionSpecific
    ? `${market.targetRole} has ${resolved.count.toLocaleString()} active openings in ${resolved.regionLabel} ` +
      `(${resolved.source}, as of ${resolved.asOf}) — the hiring bar is: ${market.hiringBar}.`
    : `${market.targetRole} has ${resolved.count.toLocaleString()} active openings globally — ` +
      `region-specific data for ${resolved.regionLabel} is not yet available; verify on ` +
      `${resolved.suggestedSources.slice(0, 2).join(' / ')} before pivoting. ` +
      `The hiring bar is: ${market.hiringBar}.`;

  return (
    `Build ${market.proofOfCompetency} this week and push to GitHub. ` +
    `${openingsClause} ` +
    `${market.successRate12mPct}% of people who make this transition land a role within 12 months ` +
    `(typically ${market.weeksToFirstInterview} weeks to first interview from dedicated effort).`
  );
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
  market: CareerPathMarket | null,
  resolvedMarket: ResolvedRegionalMarket | null,
): IntelligenceBriefResult {
  const urgencyRaw = (response.urgencyLevel ?? 'Moderate').toUpperCase();
  const urgency: IntelligenceBriefResult['urgencyLevel'] =
    urgencyRaw.startsWith('CRIT') ? 'CRITICAL' :
    urgencyRaw.startsWith('HIGH') ? 'HIGH' :
    urgencyRaw.startsWith('LOW')  ? 'LOW' : 'MODERATE';

  const situation = response.synthesis ?? 'Risk analysis complete. See breakdown for details.';
  const risks = response.primaryRiskDriver ?? 'Multiple risk factors identified. Review score breakdown.';

  // Validate that oneActionThisWeek contains a real number from market data.
  // If the LLM ignored the citation instruction, substitute a generated fallback
  // that is guaranteed to include market numbers. An action without a number
  // is generic and therefore useless ("build a project in your target field").
  const rawAction = response.oneActionThisWeek ?? response.whatChangesRiskMost ?? '';
  let topActionThisWeek: string;
  let marketGrounded: boolean;

  if (market && rawAction && actionContainsNumber(rawAction)) {
    // LLM cited a number — use its response (capped at 420 chars)
    topActionThisWeek = rawAction.slice(0, 420);
    marketGrounded    = true;
  } else if (market && resolvedMarket) {
    // LLM failed the citation check — substitute a region-grounded fallback
    topActionThisWeek = generateGroundedFallback(market, resolvedMarket).slice(0, 420);
    marketGrounded    = true;
    console.info(
      '[intelligenceBriefService] oneActionThisWeek failed number-citation check — ' +
      'substituted market-grounded fallback.',
    );
  } else {
    // No market data available — use LLM response or generic fallback as-is
    topActionThisWeek = rawAction.slice(0, 420) ||
      'Review your action plan and prioritize the highest-impact items this week.';
    marketGrounded    = actionContainsNumber(topActionThisWeek);
  }

  const actions = topActionThisWeek;
  const now = new Date().toISOString();

  return {
    paragraphs: [situation, risks, actions],
    urgencyLevel: urgency,
    keyRiskDriver: response.primaryRiskDriver?.slice(0, 200) ?? 'See breakdown',
    topActionThisWeek,
    generatedAt: now,
    cachedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    modelUsed,
    fromCache: false,
    marketGrounded,
  };
}

export async function fetchIntelligenceBrief(
  companyName: string,
  roleTitle: string,
  hybridResult: Record<string, unknown>,
  userId: string | null,
  marketContext?: CareerPathMarket | null,
  /** Company region — used to route market-data citation to region-appropriate
   *  job-board sources (StepStone/XING for Germany, Reed for UK, etc.) instead
   *  of defaulting to Naukri (India) for every user. Falls back to 'global' when
   *  absent, which triggers the LLM to disclose "region-specific data
   *  unavailable" rather than silently citing irrelevant numbers. */
  companyRegion?: string | null,
): Promise<IntelligenceBriefResult | null> {
  const currentScore = typeof hybridResult.total === 'number' ? hybridResult.total : 0;
  const warnSignalAny = hybridResult.warnSignal as any;
  const warnFilingDate: string | null = warnSignalAny?.filingDate ?? warnSignalAny?.effectiveDate ?? null;
  const currentCohort: string | null = (hybridResult.cohortClassification as any)?.primaryCohort ?? null;

  // v39.0 B2: compute the profile signature from the user-factors snapshot
  // attached to the hybrid result. This drives both the cache key (so two
  // different users at the same company + role don't share a brief) and
  // the LLM prompt (so the brief is written for THIS user's situation).
  const uf = (hybridResult as any).userFactors ?? {};
  const profileSignature = buildProfileSignature(uf);
  const profileContextBlock = buildProfileContextForLlm(uf);

  // Check cache first — keyed by profile signature so different profiles get
  // different briefs. Also invalidates on new WARN filing or cohort change.
  const cached = await checkCache(userId, companyName, roleTitle, currentScore, warnFilingDate, currentCohort, profileSignature);
  if (cached) return cached;

  // Call llm-analyze edge function
  try {
    const structuredContext   = buildStructuredSignalPayload(hybridResult);
    // Resolve region-appropriate market data BEFORE building the prompt so the
    // LLM never sees India numbers for a Berlin user (the bug this fixes).
    const resolvedMarket      = marketContext ? resolveRegionalMarket(marketContext, companyRegion ?? null) : null;
    const careerMarketContext = marketContext && resolvedMarket
      ? buildMarketContextBlock(marketContext, resolvedMarket)
      : '';
    // v40.0 Phase 25 — region-aware labor-market context block. Injects
    // market-appropriate signals (Naukri+NASSCOM+EPFO for India, BLS+WARN for US,
    // DWP+ONS for UK, IAB+Betriebsrat for Germany, MOM+EP for Singapore,
    // StatsCan+LMIA for Canada) and statutory labor-law bridges.
    const regionalContext: RegionalLlmContextResult = buildRegionalLlmContext(
      companyRegion,
      marketContext ?? null,
      resolvedMarket,
      hybridResult,
      null,
    );

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
        // v39.0 B2: profile context block tells the LLM about the specific
        // user's circumstances (visa, runway, dependents, prior layoff) so
        // the brief is framed for THEIR situation, not a templated one.
        userProfileContext: profileContextBlock,
        // v40.0: career market context — the LLM MUST cite at least one of
        // these numbers in oneActionThisWeek. Validated in mapLlmResponseToBrief;
        // a fallback is generated if the LLM ignores the instruction.
        careerMarketContext,
        // v40.0 Phase 25: region-aware market signals + statutory labor-law bridge.
        // The LLM uses this to ground action recommendations in region-appropriate
        // sources (StepStone/IAB for DE, Naukri/NASSCOM for IN, BLS/WARN for US, etc.).
        regionalMarketContext: regionalContext.text,
        analysisInstructions: [
          structuredContext
            ? `Be specific: use exact numbers and signal names from structuredContext. Name the cohort and explain why. List 1–2 specific vulnerable signals and 1–2 protective signals. Avoid generic phrases like "multiple risk factors identified".`
            : `State only what the score breakdown confirms. Do not speculate about live signals.`,
          profileContextBlock
            ? `Frame timing constraints (visa grace period, financial runway), recommended risk posture, and resilience framing around the user profile context.`
            : '',
          careerMarketContext && resolvedMarket
            ? `In oneActionThisWeek, cite at least one number from the REGION-APPROPRIATE market context provided ` +
              `for the user's region (${resolvedMarket.regionLabel}). ` +
              `The primary required source for this region is ${regionalContext.primaryRequiredSource}; ` +
              `acceptable alternatives: ${regionalContext.suggestedSources.slice(1, 3).join(' / ')}. ` +
              (resolvedMarket.isRegionSpecific
                ? `Example: "${marketContext?.targetRole ?? 'This role'} has ${resolvedMarket.count.toLocaleString()} active openings in ${resolvedMarket.regionLabel} ` +
                  `(source: ${resolvedMarket.source}). The hiring bar is ${marketContext?.hiringBar ?? 'a demonstrated project'} — not a tutorial. ` +
                  `Build ${marketContext?.proofOfCompetency ?? 'a portfolio artifact'} this week."`
                : `Example: "${marketContext?.targetRole ?? 'This role'} has ${resolvedMarket.count.toLocaleString()} active openings globally. ` +
                  `Region-specific data for ${resolvedMarket.regionLabel} is not yet in our cache, so verify on ` +
                  `${resolvedMarket.suggestedSources.slice(0, 2).join(' / ')} before pivoting. ` +
                  `Build ${marketContext?.proofOfCompetency ?? 'a portfolio artifact'} this week."`) +
              ` CRITICAL ROUTING RULES:` +
              ` (1) DO NOT cite Naukri or NASSCOM numbers unless the user's region IS India.` +
              ` (2) DO NOT cite BLS / WARN Act / LinkedIn US metro numbers unless the user's region IS the United States.` +
              ` (3) DO NOT cite StepStone / IAB / Betriebsrat / Blue Card numbers unless the user's region IS Germany.` +
              ` (4) DO NOT cite DWP / ONS / Reed numbers unless the user's region IS the United Kingdom.` +
              ` (5) DO NOT cite MOM / JobStreet SG / EP-pass numbers unless the user's region IS Singapore.` +
              ` (6) DO NOT cite Job Bank Canada / StatsCan / LMIA numbers unless the user's region IS Canada.` +
              ` (7) DO NOT invent a region-specific number that is not in the provided market context.` +
              ` If the user's region is uncovered by the provided market block, cite the global aggregate WITH explicit disclosure that region-specific data is unavailable.`
            : '',
          // v40.0 Phase 25 — explicit regional context instruction. The block is
          // already in `regionalMarketContext`; this tells the LLM what to do with it.
          regionalContext.text
            ? `REGIONAL CONTEXT: A region-aware signal block is provided in regionalMarketContext. ` +
              `For ${regionalContext.regionLabel} users you may cite: ${regionalContext.suggestedSources.join(', ')}. ` +
              `Additionally surface the statutory labor-law bridge in the brief's prose where relevant ` +
              `(post-termination rights, consultation timeline, work-permit grace period) — these change the user's available decision window materially.`
            : '',
          `CRITICAL: if a specific number, location, or date is not present in the provided data, do NOT estimate or infer it — use "data unavailable" instead. Never fabricate statistics.`,
        ].filter(Boolean).join(' '),
      },
    });

    if (error || !data) {
      console.warn('[intelligenceBriefService] llm-analyze failed:', error?.message);
      return null;
    }

    const brief = mapLlmResponseToBrief(data as LlmAnalyzeResponse, data.model ?? 'llm-analyze', marketContext ?? null, resolvedMarket);

    // Persist to cache (non-blocking) — keyed by profile_signature + cohort.
    saveToCache(userId, companyName, roleTitle, currentScore, brief, profileSignature, currentCohort).catch(() => {}); // arch-allow:R2 fire-and-forget cache-write; next call re-computes on miss

    return brief;
  } catch (e) {
    console.warn('[intelligenceBriefService] fetch failed:', e);
    return null;
  }
}

/**
 * v39.0 B2 — Build a profile context block for the LLM prompt.
 *
 * Returns a human-readable description of the user's situation that the
 * LLM can use to frame the brief. Null when the user has no profile signals.
 */
function buildProfileContextForLlm(uf: Record<string, any> | null | undefined): string | null {
  if (!uf) return null;
  const parts: string[] = [];

  const visa = uf.visaStatus;
  if (visa === 'h1b' || visa === 'l1' || visa === 'opt') {
    parts.push(`Visa status: ${visa.toUpperCase()} (60-day post-termination grace period applies — timing-sensitive).`);
  } else if (visa === 'permanent_resident') {
    parts.push('Visa status: Permanent Resident (no employer-tied constraints).');
  }

  const r = uf.savingsMonthsRunway;
  if (typeof r === 'number') {
    if (r < 3)        parts.push(`Financial runway: ${r.toFixed(1)} months — CRITICAL (cash-on-offer within 8 weeks is the operative timeline).`);
    else if (r < 6)   parts.push(`Financial runway: ${r.toFixed(1)} months — elevated (room for one strategic bet, not two).`);
    else if (r >= 12) parts.push(`Financial runway: ${r.toFixed(1)} months — comfortable (strategic patience available).`);
    else              parts.push(`Financial runway: ${r.toFixed(1)} months.`);
  }

  if (uf.hasDependents && !uf.dualIncomeHousehold) {
    parts.push('Household: dependents present, single income — asymmetric downside cost, bias toward stability premiums.');
  } else if (uf.hasDependents && uf.dualIncomeHousehold) {
    parts.push('Household: dependents present, dual income — financial cushion expands risk tolerance.');
  } else if (uf.dualIncomeHousehold) {
    parts.push('Household: dual income — additional risk tolerance for single-cycle pay step-back.');
  }

  if (uf.priorLayoffSurvived) {
    parts.push('Prior layoff successfully navigated — resilient repeat (frame recovery experience as a hiring signal).');
  }

  if (uf.hasEquityVesting && uf.equityVestMonths) {
    parts.push(`Equity vesting: ${uf.equityVestMonths} months until next significant cliff — retention anchor; quantify before considering exit.`);
  }

  return parts.length > 0 ? `User profile: ${parts.join(' ')}` : null;
}
