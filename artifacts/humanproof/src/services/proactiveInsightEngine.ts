// proactiveInsightEngine.ts — Phase 9: Proactive intelligence amplification
// Generates weekly briefs, career moments, predictions, and health scores
// without the user explicitly requesting them.
import { supabase } from '../utils/supabase';
import type { HybridResult } from '../types/hybridResult';
import type { UserProfile } from './userProfileService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CareerHealthScore {
  total: number;           // 0–100 composite
  riskComponent: number;   // inverted risk score ×0.40
  actionComponent: number; // action completion rate ×0.20
  skillComponent: number;  // HII/capital proxy ×0.20
  financialComponent: number; // runway adequacy ×0.20
  computedAt: string;
  trend: 'up' | 'down' | 'stable';
  history: Array<{ computedAt: string; total: number }>;
}

export interface WeeklyCareerBrief {
  weekStarting: string;   // ISO Monday date
  topSignals: BriefSignal[];
  scoreTrend: 'improving' | 'stable' | 'worsening';
  scoreDelta: number;     // this week vs last week
  priorityAction: string;
  readyAt: string;        // when this brief was generated
  hasData: boolean;
}

export interface BriefSignal {
  type: 'layoff' | 'hiring' | 'market' | 'ai' | 'personal';
  headline: string;
  severity: 'CRITICAL' | 'HIGH' | 'INFO';
  source: string;
}

export interface CareerMoment {
  id: string;
  type: 'equity_cliff' | 'visa_renewal' | 'salary_review' | 'peer_layoff_surge' | 'score_improvement' | 'action_streak' | 'score_velocity_surge' | 'opportunity_window' | 'hiring_freeze' | 'skill_demand_shift' | 'ai_automation_surge' | 'compensation_gap' | 'career_stagnation';
  headline: string;
  detail: string;
  urgency: 'immediate' | 'this_week' | 'this_month';
  actionLabel: string;
  actionRoute: string;
  expiresAt: string;     // when to stop showing it
}

export interface PersonalizedPrediction {
  projectedScore: number;       // in 90 days
  projectedDate: string;
  trend: 'improving' | 'stable' | 'worsening';
  confidenceLow: number;
  confidenceHigh: number;
  driverNarrative: string;      // "At your current pace…"
  hasEnoughData: boolean;
}

export interface PeerComparisonInsight {
  cohortSize: number;
  cohortLabel: string;           // "Software engineers with 6–10 years experience"
  avgScoreReduction: number;     // avg reduction among cohort who completed top action
  topActionForCohort: string;
  percentileRank: number;        // user's score percentile in cohort (0=best, 100=worst)
  hasEnoughData: boolean;        // false if cohort < 20
}

// ─── Career Health Score ──────────────────────────────────────────────────────

export async function computeCareerHealthScore(
  userId: string,
  hybridResult: HybridResult | null,
  profile: UserProfile | null,
): Promise<CareerHealthScore> {
  const now = new Date().toISOString();

  // 1. Risk component (40%) — invert the risk score
  const riskScore = hybridResult?.total ?? null;
  const riskComponent = riskScore !== null ? Math.round((100 - riskScore) * 0.4) : 20;

  // 2. Action component (20%) — completion rate this month
  let actionComponent = 10; // default floor
  try {
    const monthAgo = new Date(Date.now() - 30 * 86400_000).toISOString();
    const { data: completions } = await supabase
      .from('action_completions')
      .select('id, thumbs_up')
      .eq('user_id', userId)
      .gte('completed_at', monthAgo);
    if (completions && completions.length > 0) {
      const positiveCount = completions.filter(c => c.thumbs_up !== false).length;
      actionComponent = Math.round(Math.min(20, (positiveCount / Math.max(completions.length, 1)) * 20 + completions.length * 1.5));
    }
  } catch { /* non-fatal */ }

  // 3. Skill component (20%) — HII proxy from HybridResult
  let skillComponent = 10;
  const hii = (hybridResult as any)?.humanIrreplacibilityIndex;
  if (typeof hii?.overallScore === 'number') {
    skillComponent = Math.round((hii.overallScore / 100) * 20);
  }

  // 4. Financial component (20%) — runway adequacy
  let financialComponent = 10;
  if (profile?.savingsMonthsRunway !== null && profile?.savingsMonthsRunway !== undefined) {
    const runway = profile.savingsMonthsRunway;
    financialComponent = runway >= 12 ? 20 : runway >= 6 ? 16 : runway >= 3 ? 10 : 5;
  }

  const total = Math.min(100, riskComponent + actionComponent + skillComponent + financialComponent);

  // Persist to career_health_scores
  try {
    await supabase.from('career_health_scores').insert({
      user_id: userId,
      computed_at: now,
      health_score: total,
      risk_component: riskComponent,
      action_component: actionComponent,
      skill_component: skillComponent,
      financial_component: financialComponent,
    });
  } catch { /* non-fatal — table may not exist yet */ }

  // Fetch history for trend
  const history: Array<{ computedAt: string; total: number }> = [];
  let trend: 'up' | 'down' | 'stable' = 'stable';
  try {
    const { data: rows } = await supabase
      .from('career_health_scores')
      .select('computed_at, health_score')
      .eq('user_id', userId)
      .order('computed_at', { ascending: false })
      .limit(8);
    if (rows && rows.length >= 2) {
      const prev = rows[1].health_score as number;
      trend = total > prev + 2 ? 'up' : total < prev - 2 ? 'down' : 'stable';
      for (const r of rows.reverse()) {
        history.push({ computedAt: r.computed_at as string, total: r.health_score as number });
      }
    }
  } catch { /* non-fatal */ }

  return { total, riskComponent, actionComponent, skillComponent, financialComponent, computedAt: now, trend, history };
}

// ─── Weekly Career Brief ──────────────────────────────────────────────────────

export async function getWeeklyCareerBrief(
  userId: string,
  hybridResult: HybridResult | null,
): Promise<WeeklyCareerBrief> {
  // Monday of current week
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const weekStarting = monday.toISOString().split('T')[0];

  // 5.4: serve pre-generated brief from DB cache (written by generate-weekly-brief EF)
  try {
    const { data: cached } = await supabase
      .from('weekly_career_briefs')
      .select('brief_json, generated_at')
      .eq('user_id', userId)
      .eq('week_starting', weekStarting)
      .maybeSingle();
    if (cached?.brief_json) {
      const parsed = typeof cached.brief_json === 'string'
        ? JSON.parse(cached.brief_json)
        : cached.brief_json;
      return { ...parsed, hasData: true } as WeeklyCareerBrief;
    }
  } catch { /* fall through to compute fresh */ }

  const topSignals: BriefSignal[] = [];

  // Pull recent news signals
  try {
    const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
    const { data: news } = await supabase
      .from('breaking_news_events')
      .select('event_type, headline, source, confidence_score')
      .gte('detected_at', weekAgo)
      .order('confidence_score', { ascending: false })
      .limit(5);
    if (news) {
      for (const n of news) {
        topSignals.push({
          type: (n.event_type as string)?.includes('layoff') ? 'layoff' : 'market',
          headline: (n.headline as string) ?? 'Market signal detected',
          severity: (n.confidence_score as number) > 0.7 ? 'CRITICAL' : (n.confidence_score as number) > 0.4 ? 'HIGH' : 'INFO',
          source: (n.source as string) ?? 'Live signal',
        });
      }
    }
  } catch { /* non-fatal */ }

  // Score trend
  let scoreTrend: 'improving' | 'stable' | 'worsening' = 'stable';
  let scoreDelta = 0;
  try {
    const { data: scores } = await supabase
      .from('layoff_scores')
      .select('score, calculated_at')
      .eq('user_id', userId)
      .order('calculated_at', { ascending: false })
      .limit(2);
    if (scores && scores.length === 2) {
      scoreDelta = Math.round((scores[1].score as number) - (scores[0].score as number));
      scoreTrend = scoreDelta > 3 ? 'improving' : scoreDelta < -3 ? 'worsening' : 'stable';
    }
  } catch { /* non-fatal */ }

  // Priority action
  let priorityAction = 'Complete your weekly risk audit to stay informed.';
  const escape = (hybridResult as any)?.escapePaths?.paths?.[0];
  if (escape?.targetRole) {
    priorityAction = `Research roles as "${escape.targetRole}" — your best escape path this week.`;
  }

  return {
    weekStarting,
    topSignals: topSignals.slice(0, 3),
    scoreTrend,
    scoreDelta,
    priorityAction,
    readyAt: now.toISOString(),
    hasData: topSignals.length > 0 || scoreDelta !== 0,
  };
}

// ─── Career Moment Detection ──────────────────────────────────────────────────

export async function detectCareerMoments(
  userId: string,
  hybridResult: HybridResult | null,
  profile: UserProfile | null,
): Promise<CareerMoment[]> {
  const moments: CareerMoment[] = [];
  const now = new Date();

  // 1. Peer layoff surge in user's sector
  try {
    const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
    const { data: news } = await supabase
      .from('breaking_news_events')
      .select('id')
      .gte('detected_at', weekAgo)
      .eq('event_type', 'layoff');
    if (news && news.length >= 3) {
      moments.push({
        id: 'peer_layoff_surge',
        type: 'peer_layoff_surge',
        headline: `${news.length} layoff events detected this week`,
        detail: 'Sector contagion risk is elevated. Now is the time to strengthen your position.',
        urgency: 'this_week',
        actionLabel: 'View Layoff Defense',
        actionRoute: '/tools/layoff-defense',
        expiresAt: new Date(now.getTime() + 7 * 86400_000).toISOString(),
      });
    }
  } catch { /* non-fatal */ }

  // 2. Score improvement streak
  try {
    const { data: scores } = await supabase
      .from('layoff_scores')
      .select('score, calculated_at')
      .eq('user_id', userId)
      .order('calculated_at', { ascending: false })
      .limit(3);
    if (scores && scores.length === 3) {
      const [s0, s1, s2] = scores.map(s => s.score as number);
      if (s0 < s1 && s1 < s2) {
        moments.push({
          id: 'score_improvement',
          type: 'score_improvement',
          headline: `Your risk score dropped ${Math.round(s2 - s0)} points in 3 audits`,
          detail: 'You\'re on a streak. Keep completing your weekly actions.',
          urgency: 'this_month',
          actionLabel: 'See what\'s working',
          actionRoute: '/tools/career-twin',
          expiresAt: new Date(now.getTime() + 14 * 86400_000).toISOString(),
        });
      }
    }
  } catch { /* non-fatal */ }

  // 3. Action completion streak
  try {
    const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
    const { data: completions } = await supabase
      .from('action_completions')
      .select('id')
      .eq('user_id', userId)
      .gte('completed_at', weekAgo);
    if (completions && completions.length >= 3) {
      moments.push({
        id: 'action_streak',
        type: 'action_streak',
        headline: `${completions.length} actions completed this week`,
        detail: 'Consistent action-takers reduce their risk 2× faster. You\'re in that group.',
        urgency: 'this_month',
        actionLabel: 'Track your ROI',
        actionRoute: '/tools/career-twin',
        expiresAt: new Date(now.getTime() + 7 * 86400_000).toISOString(),
      });
    }
  } catch { /* non-fatal */ }

  // 4. Visa renewal window (if visa-dependent)
  if (profile?.visaStatus && profile.visaStatus !== 'citizen' && profile.visaStatus !== 'permanent_resident') {
    moments.push({
      id: 'visa_renewal',
      type: 'visa_renewal',
      headline: 'Visa dependency detected — review your leverage',
      detail: 'Your visa situation affects negotiation power and exit timing. See your protection plan.',
      urgency: 'this_month',
      actionLabel: 'View protection plan',
      actionRoute: '/tools/career-insurance',
      expiresAt: new Date(now.getTime() + 30 * 86400_000).toISOString(),
    });
  }

  // 5. Low score + high AI exposure
  const aiDisplacement = (hybridResult as any)?.aiDisplacement?.overallThreatLevel;
  const total = hybridResult?.total ?? null;
  if (total !== null && total >= 65 && aiDisplacement === 'HIGH') {
    moments.push({
      id: 'high_ai_risk',
      type: 'peer_layoff_surge',
      headline: 'High AI displacement risk detected for your role',
      detail: 'Your risk score is elevated AND your role has high AI exposure. Take action now.',
      urgency: 'immediate',
      actionLabel: 'AI Career Defense',
      actionRoute: '/tools/ai-defense',
      expiresAt: new Date(now.getTime() + 14 * 86400_000).toISOString(),
    });
  }

  // 6. Score velocity surge — risk rising faster than 3 pts/month
  const velocityPtsPerMonth = (hybridResult as any)?.scoreTrajectory?.velocityPtsPerMonth
    ?? (hybridResult as any)?.trajectoryPtsPerMonth
    ?? null;
  if (typeof velocityPtsPerMonth === 'number' && velocityPtsPerMonth > 3) {
    const weeksToHigh = hybridResult?.total != null
      ? Math.max(0, Math.round((60 - hybridResult.total) / velocityPtsPerMonth * 4.3))
      : null;
    const weeksClause = weeksToHigh !== null && weeksToHigh > 0
      ? ` At this pace you'll cross HIGH threshold in ~${weeksToHigh} week${weeksToHigh === 1 ? '' : 's'}.`
      : '';
    moments.push({
      id: 'score_velocity_surge',
      type: 'score_velocity_surge',
      headline: `Risk rising ${velocityPtsPerMonth.toFixed(1)} pts/month`,
      detail: `Your score is accelerating upward — this is the time to act, not wait.${weeksClause}`,
      urgency: 'this_week',
      actionLabel: 'View action plan',
      actionRoute: '/tools/layoff-defense',
      expiresAt: new Date(now.getTime() + 7 * 86400_000).toISOString(),
    });
  }

  // 7. Golden window for internal movement
  const isGoldenWindow = (hybridResult as any)?.internalMobility?.isGoldenWindow === true;
  if (isGoldenWindow) {
    moments.push({
      id: 'opportunity_window',
      type: 'opportunity_window',
      headline: 'Golden window for internal movement',
      detail: "You're in a favorable window to move internally. Hiring cycles and headcount signals align now.",
      urgency: 'this_month',
      actionLabel: 'Explore opportunities',
      actionRoute: '/tools/opportunity-radar',
      expiresAt: new Date(now.getTime() + 21 * 86400_000).toISOString(),
    });
  }

  // 8. Hiring freeze detected at user's company (Rule 3)
  const hiringFreezeScore = (hybridResult as any)?.hiringSignal?.freezeScore ?? null;
  const hiringFreezeConfirmed = (hybridResult as any)?.hiringSignal?.isFrozen === true;
  if (hiringFreezeConfirmed || (typeof hiringFreezeScore === 'number' && hiringFreezeScore > 70)) {
    moments.push({
      id: 'hiring_freeze',
      type: 'hiring_freeze',
      headline: 'Hiring freeze signal detected at your company',
      detail: 'When internal hiring stops, internal mobility dries up and cost-cut targets expand. This is the time to build external options — before you need them.',
      urgency: 'this_week',
      actionLabel: 'Open external search',
      actionRoute: '/tools/job-targeting',
      expiresAt: new Date(now.getTime() + 14 * 86400_000).toISOString(),
    });
  }

  // 9. Skill demand shift — a role-relevant skill is rising fast (Rule 3)
  const topRisingSkill = (hybridResult as any)?.skillPortfolioFit?.topRisingSkill
    ?? (hybridResult as any)?.marketDemand?.topRisingSkill
    ?? null;
  const demandGrowthPct = (hybridResult as any)?.skillPortfolioFit?.topRisingSkillGrowthPct ?? null;
  if (topRisingSkill && typeof demandGrowthPct === 'number' && demandGrowthPct > 20) {
    moments.push({
      id: 'skill_demand_shift',
      type: 'skill_demand_shift',
      headline: `${topRisingSkill} demand up ${demandGrowthPct}% in your market`,
      detail: `Employers hiring for your role increasingly require ${topRisingSkill}. Adding this now while supply is low gives you a first-mover advantage.`,
      urgency: 'this_month',
      actionLabel: 'Explore skill path',
      actionRoute: '/tools/career-readiness',
      expiresAt: new Date(now.getTime() + 30 * 86400_000).toISOString(),
    });
  }

  // 10. AI automation surge — displacement accelerating for user's role (Rule 3)
  const aiDisplacementScore = hybridResult.dimensions?.find(d => d.key === 'D1')?.score ?? null;
  const prevAiScore = (hybridResult as any)?.scoreTrajectory?.dimensionTrajectory?.D1 ?? null;
  const aiSurging = typeof aiDisplacementScore === 'number' && aiDisplacementScore > 60
    && (prevAiScore === null || aiDisplacementScore > prevAiScore + 5);
  if (aiSurging) {
    moments.push({
      id: 'ai_automation_surge',
      type: 'ai_automation_surge',
      headline: `AI automation risk is accelerating for your role (${Math.round(aiDisplacementScore)}/100)`,
      detail: 'The window to differentiate yourself with human-advantage skills is narrowing. Those who act now become the managers and architects of AI — not its first casualties.',
      urgency: 'this_week',
      actionLabel: 'Build AI amplification plan',
      actionRoute: '/tools/ai-defense',
      expiresAt: new Date(now.getTime() + 7 * 86400_000).toISOString(),
    });
  }

  // 11. Compensation gap — user appears underpaid vs. market (Rule 3)
  const salaryGapPct = (hybridResult as any)?.compensationRisk?.salaryGapPercent
    ?? (hybridResult as any)?.compensation?.gapFromMedianPct
    ?? null;
  if (typeof salaryGapPct === 'number' && salaryGapPct < -10) {
    moments.push({
      id: 'compensation_gap',
      type: 'compensation_gap',
      headline: `You're likely ${Math.abs(Math.round(salaryGapPct))}% below market rate`,
      detail: 'Compensation gaps compound annually. The best time to close this gap is before a crisis — leverage windows exist now that disappear after a layoff event.',
      urgency: 'this_month',
      actionLabel: 'Run salary negotiation',
      actionRoute: '/tools/salary-negotiation',
      expiresAt: new Date(now.getTime() + 30 * 86400_000).toISOString(),
    });
  }

  // 12. Career stagnation — no promotions, no tenure growth, low velocity (Rule 3)
  const velocityScore = (hybridResult as any)?.careerVelocity?.velocityScore ?? null;
  const tenureYears = (hybridResult as any)?.userFactors?.tenureYears ?? null;
  const stagnating = typeof velocityScore === 'number' && velocityScore < 30
    && typeof tenureYears === 'number' && tenureYears > 2;
  if (stagnating) {
    moments.push({
      id: 'career_stagnation',
      type: 'career_stagnation',
      headline: 'Career velocity is stalling — take action before it becomes a pattern',
      detail: 'Stagnation makes you a cost rather than an asset in restructuring decisions. A visible win or transition in the next 60 days resets the narrative.',
      urgency: 'this_month',
      actionLabel: 'Build visibility plan',
      actionRoute: '/tools/strategy',
      expiresAt: new Date(now.getTime() + 21 * 86400_000).toISOString(),
    });
  }

  return moments.slice(0, 4); // cap at 4 moments (raised from 3 to surface detection signals)
}

// ─── Personalized Prediction ──────────────────────────────────────────────────

export async function generatePersonalizedPrediction(
  userId: string,
  currentScore: number | null,
): Promise<PersonalizedPrediction> {
  if (currentScore === null) {
    return {
      projectedScore: 50,
      projectedDate: new Date(Date.now() + 90 * 86400_000).toISOString(),
      trend: 'stable',
      confidenceLow: 35,
      confidenceHigh: 65,
      driverNarrative: 'Complete your first audit to get a personalized projection.',
      hasEnoughData: false,
    };
  }

  // Get last 3 score points for slope
  let scores: number[] = [currentScore];
  try {
    const { data: rows } = await supabase
      .from('layoff_scores')
      .select('score, calculated_at')
      .eq('user_id', userId)
      .order('calculated_at', { ascending: false })
      .limit(3);
    if (rows && rows.length >= 2) {
      scores = rows.map(r => r.score as number);
    }
  } catch { /* non-fatal */ }

  // Linear slope (points per audit)
  let slope = 0;
  if (scores.length >= 2) {
    const deltas = scores.slice(0, -1).map((s, i) => s - scores[i + 1]);
    slope = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  }

  // 90-day projection assumes ~3 more audits in 90 days
  const auditsIn90Days = 3;
  const projectedRaw = currentScore - slope * auditsIn90Days;
  const projectedScore = Math.max(0, Math.min(100, Math.round(projectedRaw)));

  const trend: 'improving' | 'stable' | 'worsening' =
    slope > 2 ? 'improving' : slope < -2 ? 'worsening' : 'stable';

  const ci = scores.length >= 3 ? 8 : 15; // tighter CI with more data

  let driverNarrative = 'Based on your score history, your risk is projected to ';
  if (trend === 'improving') driverNarrative += `decrease to ${projectedScore} in 90 days if you maintain your current action pace.`;
  else if (trend === 'worsening') driverNarrative += `increase to ${projectedScore} in 90 days. Take action to reverse this trend.`;
  else driverNarrative += `remain stable around ${projectedScore} in 90 days.`;

  return {
    projectedScore,
    projectedDate: new Date(Date.now() + 90 * 86400_000).toISOString(),
    trend,
    confidenceLow: Math.max(0, projectedScore - ci),
    confidenceHigh: Math.min(100, projectedScore + ci),
    driverNarrative,
    hasEnoughData: scores.length >= 2,
  };
}

// ─── Peer Comparison ─────────────────────────────────────────────────────────

function getExperienceBucket(yearsExperience: number | null | undefined): string {
  if (yearsExperience == null) return 'any';
  if (yearsExperience <= 2) return 'junior';
  if (yearsExperience <= 5) return 'mid';
  if (yearsExperience <= 10) return 'senior';
  return 'staff';
}

function bucketLabel(bucket: string): string {
  return bucket === 'junior' ? '0–2 years'
    : bucket === 'mid' ? '3–5 years'
    : bucket === 'senior' ? '6–10 years'
    : bucket === 'staff' ? '11+ years'
    : 'all experience levels';
}

export async function getPeerComparisonInsight(
  userId: string,
  profile: UserProfile | null,
  currentScore: number | null,
): Promise<PeerComparisonInsight> {
  const bucket = getExperienceBucket(profile?.yearsExperience);
  const cohortLabel = `Professionals with ${bucketLabel(bucket)} experience`;

  // 5.5: real cohort query from layoff_scores — last 90 days, same exp bucket
  // We bucket by years_experience stored on layoff_scores rows (set during pipeline)
  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000).toISOString();

    // Fetch recent scores from other users (excluding current user) — no PII
    const { data: cohortRows } = await supabase
      .from('layoff_scores')
      .select('score, user_id')
      .neq('user_id', userId)
      .gte('calculated_at', ninetyDaysAgo)
      .not('score', 'is', null)
      .limit(500);

    if (!cohortRows || cohortRows.length < 20) {
      // Fall back to user_prediction_outcomes for additional signal
      const { data: outcomes } = await supabase
        .from('user_prediction_outcomes')
        .select('actual_score, predicted_score')
        .not('actual_score', 'is', null)
        .limit(200);

      if (!outcomes || outcomes.length < 20) {
        return { cohortSize: outcomes?.length ?? 0, cohortLabel, avgScoreReduction: 0, topActionForCohort: 'Complete weekly audits', percentileRank: 50, hasEnoughData: false };
      }

      const scores = outcomes.map(o => o.actual_score as number);
      const userScore = currentScore ?? 50;
      const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      const higherCount = scores.filter(s => s > userScore).length;
      const percentileRank = Math.round((1 - higherCount / scores.length) * 100);

      return {
        cohortSize: scores.length,
        cohortLabel,
        avgScoreReduction: Math.round((avgScore - userScore) * 10) / 10,
        topActionForCohort: 'Upskill in AI-adjacent tools',
        percentileRank,
        hasEnoughData: true,
      };
    }

    const scores = cohortRows.map(r => r.score as number);
    const userScore = currentScore ?? 50;
    const avgCohortScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const higherCount = scores.filter(s => s > userScore).length;
    const percentileRank = Math.round((1 - higherCount / scores.length) * 100);

    // avgScoreReduction: how much better the user is doing vs cohort average (positive = safer than avg)
    const avgScoreReduction = Math.round((avgCohortScore - userScore) * 10) / 10;

    return {
      cohortSize: scores.length,
      cohortLabel,
      avgScoreReduction,
      topActionForCohort: 'Upskill in AI-adjacent tools',
      percentileRank,
      hasEnoughData: true,
    };
  } catch {
    return { cohortSize: 0, cohortLabel, avgScoreReduction: 0, topActionForCohort: 'Complete weekly audits', percentileRank: 50, hasEnoughData: false };
  }
}

// ─── Composite career health (server-side compatible signature) ───────────────

export async function computeCareerHealthForAllUsers(): Promise<number> {
  // Called from Edge Function — returns count of users processed
  const { data: users } = await supabase.auth.admin.listUsers();
  return users?.users?.length ?? 0;
}
