// careerDefenseBriefingService.ts — Career OS: Daily Career Defense Briefing
//
// "Every day generate: Today's Career Signals … Career Defense Actions …
//  Protection Score Impact. This becomes a daily habit loop."
//
// Distinct from TodaysIntelligenceBrief (an LLM narrative) and from the alert
// center (a single state warning). This produces a FEED of discrete, dated,
// causal defense events — each with a signed protection-score impact — generated
// from real signals: the 8-trajectory Twin model, the monitoring feed, and the
// score-change detector. Every event answers: what changed, why, and does it
// make me safer or more exposed today?
//
// Grounded only in signals we actually have — no fabricated market figures.

import type { HybridResult } from '../types/hybridResult';
import type { UserProfile } from './userProfileService';
import { computeCareerTrajectories, type CareerTrajectory } from './careerTwinTrajectoryService';
import { getMonitoringFeed } from './monitoringService';
import { getPreviousAuditScore, detectScoreChange } from './scoreChangeDetectionService';

export type DefenseEventCategory = 'score' | 'ai' | 'market' | 'skill' | 'company' | 'financial' | 'opportunity';
export type DefenseEventTone = 'positive' | 'neutral' | 'warning' | 'critical';

export interface CareerDefenseEvent {
  id: string;
  date: string;                 // ISO
  category: DefenseEventCategory;
  tone: DefenseEventTone;
  headline: string;
  detail: string;               // causal body
  protectionImpact: number;     // signed pts (+ = safer, − = more exposed)
  evidence: string;             // source engine / signal
  toolLink?: string;
}

export interface CareerDefenseBriefing {
  date: string;
  /** Net protection-score change implied by today's signals. */
  netProtectionImpact: number;
  /** "You are safer today" / "Your exposure increased today" / steady. */
  verdict: 'safer' | 'steady' | 'exposed';
  summary: string;
  events: CareerDefenseEvent[];
  /** Today's recommended defensive moves, most impactful first. */
  defenseActions: string[];
}

// Map a trajectory's favorable/adverse motion to a signed protection impact.
function trajectoryImpact(t: CareerTrajectory): number {
  const magnitude = Math.min(4, Math.max(1, Math.round(Math.abs(t.projection6mo - t.currentValue) / 3)));
  const favorable = (t.isRisk && t.direction === 'falling') || (!t.isRisk && t.direction === 'rising');
  const adverse = (t.isRisk && t.direction === 'rising') || (!t.isRisk && t.direction === 'falling');
  if (favorable) return magnitude;
  if (adverse) return -magnitude;
  return 0;
}

const CATEGORY_FOR_TRAJECTORY: Record<string, DefenseEventCategory> = {
  layoff_probability: 'score', ai_displacement: 'ai', market_demand: 'market',
  skill_growth: 'skill', career_momentum: 'opportunity', salary: 'financial',
  promotion: 'opportunity', financial_resilience: 'financial',
};

const TOOLLINK_FOR_CATEGORY: Record<DefenseEventCategory, string> = {
  score: '/tools/layoff-defense', ai: '/tools/ai-defense', market: '/tools/market-intel',
  skill: '/tools/ai-defense', company: '/tools/layoff-defense', financial: '/tools/career-insurance',
  opportunity: '/tools/strategy',
};

export async function buildCareerDefenseBriefing(
  hr: HybridResult,
  profile: UserProfile | null,
  companyName: string | null,
): Promise<CareerDefenseBriefing> {
  const today = new Date().toISOString();
  const events: CareerDefenseEvent[] = [];
  // Fetch prior-audit signals once; reused for the score-change event AND for the
  // monitoring change-detection signals (skills decay / financial crossing).
  const prev = await getPreviousAuditScore().catch(() => null);

  // ── 1. Score-change event (vs. last audit) ──────────────────────────────────
  try {
    const change = detectScoreChange(hr, prev?.score ?? null);
    if (change && change.changeType === 'significant') {
      const safer = change.direction === 'down';
      events.push({
        id: `def-score-${Math.round(change.delta)}-${change.currentScore}`,
        date: today, category: 'score',
        tone: safer ? 'positive' : change.delta >= 10 ? 'critical' : 'warning',
        headline: safer
          ? `Your protection improved ${Math.abs(Math.round(change.delta))} points since your last audit`
          : `Your risk rose ${Math.abs(Math.round(change.delta))} points since your last audit`,
        detail: change.causalEvidence,
        protectionImpact: -change.delta, // risk down = protection up
        evidence: 'Score Change Detection',
        toolLink: '/tools/layoff-defense',
      });
    }
  } catch { /* no prior score — skip */ }

  // ── 2. Trajectory-driven events (the Twin's moving fronts) ───────────────────
  try {
    const model = computeCareerTrajectories(hr, profile, []);
    for (const t of model.trajectories) {
      const impact = trajectoryImpact(t);
      if (impact === 0) continue; // only surface what's actually moving
      const favorable = impact > 0;
      const category = CATEGORY_FOR_TRAJECTORY[t.key] ?? 'opportunity';
      events.push({
        id: `def-traj-${t.key}-${t.currentValue}-${t.projection6mo}`,
        date: today, category,
        tone: favorable ? 'positive' : t.status === 'weak' ? 'critical' : 'warning',
        headline: favorable
          ? `${t.label} is ${t.isRisk ? 'easing' : 'strengthening'} — improves your protection`
          : `${t.label} is ${t.isRisk ? 'rising' : 'softening'} — increases your exposure`,
        detail: t.drivers[0] ?? `${t.label} is trending ${t.direction}.`,
        protectionImpact: impact,
        evidence: 'Career Twin Trajectories',
        toolLink: TOOLLINK_FOR_CATEGORY[category],
      });
    }
  } catch { /* trajectory model unavailable — skip */ }

  // ── 3. Monitoring-feed events (live company/market/personal signals) ─────────
  try {
    const feed = await getMonitoringFeed({
      hybridResult: hr,
      watchlist: companyName ? [companyName] : [],
      financialRunwayMonths: hr.financialRunwayMonths ?? null,
      previous: prev ? { skillFitScore: prev.skillFit ?? null, financialRunwayMonths: prev.runway ?? null } : undefined,
    });
    for (const item of feed.filter(f => f.severity !== 'INFO').slice(0, 3)) {
      // Avoid duplicating a trajectory event of the same category.
      if (events.some(e => e.headline === item.headline)) continue;
      const impact = item.severity === 'CRITICAL' ? -4 : -2;
      events.push({
        id: `def-mon-${item.id}`,
        date: item.timestamp ?? today,
        category: item.category === 'role' ? 'skill' : item.category === 'market' ? 'market' : item.category === 'company' ? 'company' : 'financial',
        tone: item.severity === 'CRITICAL' ? 'critical' : 'warning',
        headline: item.headline,
        detail: item.detail,
        protectionImpact: impact,
        evidence: item.source,
        toolLink: item.toolLink,
      });
    }
  } catch { /* monitoring unavailable — skip */ }

  // ── Rank, cap, synthesize ─────────────────────────────────────────────────────
  events.sort((a, b) => Math.abs(b.protectionImpact) - Math.abs(a.protectionImpact));
  const top = events.slice(0, 6);

  const netProtectionImpact = top.reduce((s, e) => s + e.protectionImpact, 0);
  const verdict: CareerDefenseBriefing['verdict'] =
    netProtectionImpact >= 2 ? 'safer' : netProtectionImpact <= -2 ? 'exposed' : 'steady';

  const summary =
    top.length === 0
      ? 'No significant career signals today — your position is stable. Keep building.'
      : verdict === 'safer'
        ? `Net positive day: ${top.filter(e => e.protectionImpact > 0).length} signal(s) strengthened your protection.`
        : verdict === 'exposed'
          ? `Heads up: ${top.filter(e => e.protectionImpact < 0).length} signal(s) increased your exposure today. Act on the items below.`
          : 'Mixed signals today — net effect is roughly flat. Hold your line and keep monitoring.';

  // Defense actions: address the most negative events first, then the top rec.
  const defenseActions: string[] = [];
  for (const e of top.filter(e => e.protectionImpact < 0).slice(0, 2)) {
    if (e.category === 'ai' || e.category === 'skill') defenseActions.push('Spend 2 focused hours upskilling on an AI-augmented workflow in your role.');
    else if (e.category === 'market') defenseActions.push('Warm up 3 network contacts this week to build optionality before the market tightens.');
    else if (e.category === 'company') defenseActions.push('Review your 72-hour defense checklist and prepare your contingency plan.');
    else if (e.category === 'financial') defenseActions.push('Trim discretionary spend to extend your runway — leverage compounds under 4 months.');
    else if (e.category === 'score') defenseActions.push('Open Layoff Defense and action your highest-ROI lever today.');
  }
  const topRec = (hr.actionItems ?? hr.recommendations ?? [])[0]?.title;
  if (topRec && defenseActions.length < 3) defenseActions.push(topRec);
  if (defenseActions.length === 0) defenseActions.push('Maintain momentum — complete one career action and report its outcome.');

  return {
    date: today,
    netProtectionImpact,
    verdict,
    summary,
    events: top,
    defenseActions: [...new Set(defenseActions)].slice(0, 3),
  };
}
