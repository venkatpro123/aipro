// monitoringService.ts — Phase 2 Continuous Monitoring Engine
// Aggregates signals across company / role / market / personal categories
// into a unified MonitoringFeedItem[] sorted by severity + recency.

import { supabase } from '../utils/supabase';
import type { MonitoringFeedItem } from '../types/careerOS';
import type { HybridResult } from '../types/hybridResult';

// ── Watchlist helpers ─────────────────────────────────────────────────────────

export async function getWatchlist(): Promise<string[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data } = await supabase
      .from('user_monitoring_watchlist')
      .select('company_name')
      .eq('user_id', user.id)
      .order('added_at', { ascending: false });
    return (data ?? []).map((r: { company_name: string }) => r.company_name);
  } catch { return []; }
}

export async function addToWatchlist(companyName: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('user_monitoring_watchlist').upsert(
    { user_id: user.id, company_name: companyName },
    { onConflict: 'user_id,company_name' }
  );
}

export async function removeFromWatchlist(companyName: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('user_monitoring_watchlist')
    .delete()
    .eq('user_id', user.id)
    .eq('company_name', companyName);
}

// ── Dismissal helpers ─────────────────────────────────────────────────────────

export async function getDismissedAlertKeys(): Promise<Set<string>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Set();
    const { data } = await supabase
      .from('monitoring_alert_dismissals')
      .select('alert_key')
      .eq('user_id', user.id);
    return new Set((data ?? []).map((r: { alert_key: string }) => r.alert_key));
  } catch { return new Set(); }
}

export async function dismissAlert(alertKey: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('monitoring_alert_dismissals').upsert(
      { user_id: user.id, alert_key: alertKey },
      { onConflict: 'user_id,alert_key' }
    );
  } catch { /* ignore */ }
}

// ── Company signal feed ───────────────────────────────────────────────────────

async function getCompanySignals(watchlist: string[]): Promise<MonitoringFeedItem[]> {
  if (watchlist.length === 0) return [];
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const { data } = await supabase
      .from('breaking_news_events')
      .select('id, company_name, headline, event_date, confidence, percent_cut, source')
      .in('company_name', watchlist)
      .gte('event_date', sevenDaysAgo.slice(0, 10))
      .order('event_date', { ascending: false })
      .limit(30);

    return (data ?? []).map((row: {
      id: string; company_name: string; headline: string;
      event_date: string; confidence: string; percent_cut: number | null; source: string;
    }) => {
      const severity: MonitoringFeedItem['severity'] =
        row.confidence === 'high' ? 'CRITICAL' :
        row.percent_cut != null && row.percent_cut >= 10 ? 'HIGH' : 'INFO';
      return {
        id: `company-${row.id}`,
        category: 'company' as const,
        severity,
        headline: row.headline ?? 'Layoff signal detected',
        detail: row.company_name,
        source: row.source ?? 'Intelligence',
        timestamp: `${row.event_date}T00:00:00Z`,
        toolLink: '/terminal',
        dismissed: false,
      };
    });
  } catch { return []; }
}

// ── Role signal feed ──────────────────────────────────────────────────────────

function getRoleSignals(hybridResult: HybridResult | null): MonitoringFeedItem[] {
  if (!hybridResult) return [];
  const items: MonitoringFeedItem[] = [];
  const now = new Date().toISOString();

  // Tech stack obsolescence signals
  const tech = hybridResult.techStackObsolescence;
  if (tech) {
    const obsolete = tech.primaryStackStatus === 'OBSOLETE' || tech.primaryStackStatus === 'LEGACY';
    if (obsolete) {
      items.push({
        id: `role-tech-${tech.primaryStackStatus}`,
        category: 'role',
        severity: tech.primaryStackStatus === 'OBSOLETE' ? 'CRITICAL' : 'HIGH',
        headline: `Your primary tech stack status: ${tech.primaryStackStatus} — ${tech.stackStatusNote}`,
        detail: tech.bridgeSkillPriority.slice(0, 3).length > 0
          ? `Recommended bridge skills: ${tech.bridgeSkillPriority.slice(0, 3).join(', ')}`
          : tech.stackHealthLabel,
        source: 'Tech Stack Analysis',
        timestamp: now,
        toolLink: '/tools/ai-defense',
        dismissed: false,
      });
    }
  }

  // Skill portfolio signals
  const skill = hybridResult.skillPortfolioFit;
  if (skill && typeof skill.fitScore === 'number' && skill.fitScore < 50) {
    items.push({
      id: `role-skill-gap-${Math.round(skill.fitScore)}`,
      category: 'role',
      severity: skill.fitScore < 30 ? 'HIGH' : 'INFO',
      headline: `Skill portfolio fit score is ${Math.round(skill.fitScore)} — below market average`,
      detail: 'Your skills may not match current demand for your role category',
      source: 'Skill Portfolio Engine',
      timestamp: now,
      toolLink: '/tools/career-readiness',
      dismissed: false,
    });
  }

  // AI displacement signal — read from dimensions array (D1 key)
  const d1Dim = hybridResult.dimensions?.find(d => d.key === 'D1');
  const d1Score = d1Dim?.score ?? 0;
  if (d1Score > 60) {
    items.push({
      id: `role-ai-d1-${Math.round(d1Score)}`,
      category: 'role',
      severity: d1Score > 75 ? 'CRITICAL' : 'HIGH',
      headline: `AI displacement risk at ${Math.round(d1Score)} — above safe threshold`,
      detail: 'AI tooling is actively automating tasks in your role category',
      source: 'AI Displacement Engine',
      timestamp: now,
      toolLink: '/tools/ai-defense',
      dismissed: false,
    });
  }

  return items;
}

// ── Market signal feed ────────────────────────────────────────────────────────

function getMarketSignals(hybridResult: HybridResult | null): MonitoringFeedItem[] {
  if (!hybridResult) return [];
  const items: MonitoringFeedItem[] = [];
  const now = new Date().toISOString();

  const macro = hybridResult.macroEconomicRisk;
  if (macro) {
    if (macro.riskTier === 'STRESS' || macro.riskTier === 'CRISIS') {
      items.push({
        id: `market-macro-${macro.riskTier}`,
        category: 'market',
        severity: macro.riskTier === 'CRISIS' ? 'CRITICAL' : 'HIGH',
        headline: `Macro environment: ${macro.riskTier} — elevated hiring risk across your sector`,
        detail: `Regime: ${macro.regime} · Rates: ${macro.rateCyclePhase}`,
        source: 'Macro Economic Engine',
        timestamp: now,
        toolLink: '/tools/market-intel',
        dismissed: false,
      });
    } else if (macro.riskTier === 'ELEVATED') {
      items.push({
        id: `market-macro-elevated`,
        category: 'market',
        severity: 'INFO',
        headline: 'Macro environment elevated — monitor sector conditions closely',
        detail: `Current regime: ${macro.regime}`,
        source: 'Macro Economic Engine',
        timestamp: now,
        toolLink: '/tools/market-intel',
        dismissed: false,
      });
    }
  }

  const geo = hybridResult.geographicOptionality;
  if (geo) {
    // geographicOptionalityScore 0=poor options, 100=many options.
    // Surface it only when optionality is HIGH (score > 70) as an opportunity signal
    if (geo.geographicOptionalityScore > 70) {
      items.push({
        id: `market-geo-optionality-${Math.round(geo.geographicOptionalityScore)}`,
        category: 'market',
        severity: 'INFO',
        headline: `Strong geographic optionality detected — multiple markets open for your role`,
        detail: `Optionality score: ${Math.round(geo.geographicOptionalityScore)}/100 · ${geo.optionalityLabel}`,
        source: 'Geographic Intelligence',
        timestamp: now,
        toolLink: '/tools/market-intel',
        dismissed: false,
      });
    }
  }

  const liquidity = hybridResult.jobMarketLiquidity;
  if (liquidity && typeof liquidity.score === 'number' && liquidity.score < 35) {
    items.push({
      id: `market-liquidity-${Math.round(liquidity.score)}`,
      category: 'market',
      severity: liquidity.score < 20 ? 'HIGH' : 'INFO',
      headline: `Job market liquidity is low (${Math.round(liquidity.score)}/100) in your sector`,
      detail: 'Fewer open roles than normal — competition for positions is high',
      source: 'Job Market Liquidity Engine',
      timestamp: now,
      toolLink: '/tools/career-readiness',
      dismissed: false,
    });
  }

  return items;
}

// ── Personal signal feed ──────────────────────────────────────────────────────

function getPersonalSignals(
  hybridResult: HybridResult | null,
  actionsCompleted: number,
  actionsDue: number,
  financialRunwayMonths: number | null,
): MonitoringFeedItem[] {
  const items: MonitoringFeedItem[] = [];
  const now = new Date().toISOString();

  // Action momentum
  const momentum = actionsDue > 0 ? (actionsCompleted / actionsDue) * 100 : 100;
  if (actionsDue > 0 && momentum < 30) {
    items.push({
      id: `personal-momentum-${Math.round(momentum)}`,
      category: 'personal',
      severity: 'HIGH',
      headline: `Only ${Math.round(momentum)}% of this week's career actions completed`,
      detail: `${actionsDue - actionsCompleted} action${actionsDue - actionsCompleted > 1 ? 's' : ''} overdue — staying on track matters`,
      source: 'Career Momentum',
      timestamp: now,
      toolLink: '/os',
      dismissed: false,
    });
  }

  // Financial runway
  if (financialRunwayMonths != null && financialRunwayMonths < 3) {
    items.push({
      id: `personal-runway-${Math.round(financialRunwayMonths * 10)}`,
      category: 'personal',
      severity: financialRunwayMonths < 1 ? 'CRITICAL' : 'HIGH',
      headline: `Financial runway is critically low — ${financialRunwayMonths.toFixed(1)} months of savings`,
      detail: 'Building a 3–6 month emergency fund reduces career risk significantly',
      source: 'Financial Resilience',
      timestamp: now,
      toolLink: '/tools/career-insurance',
      dismissed: false,
    });
  }

  // Network leverage — uses networkScore field
  if (hybridResult) {
    const net = hybridResult.networkLeverage;
    if (net && net.networkScore < 30) {
      items.push({
        id: `personal-network-${Math.round(net.networkScore)}`,
        category: 'personal',
        severity: 'INFO',
        headline: `Network leverage score is ${Math.round(net.networkScore)} — below recommended threshold`,
        detail: net.networkHeadline ?? 'A stronger professional network directly reduces layoff exposure',
        source: 'Network Intelligence',
        timestamp: now,
        toolLink: '/tools/networking',
        dismissed: false,
      });
    }
  }

  return items;
}

// ── Severity sort weight ──────────────────────────────────────────────────────

const SEVERITY_WEIGHT: Record<MonitoringFeedItem['severity'], number> = {
  CRITICAL: 3,
  HIGH: 2,
  INFO: 1,
};

// ── Main aggregation ──────────────────────────────────────────────────────────

export interface MonitoringContext {
  hybridResult: HybridResult | null;
  watchlist: string[];
  actionsCompleted?: number;
  actionsDue?: number;
  financialRunwayMonths?: number | null;
}

export async function getMonitoringFeed(
  ctx: MonitoringContext,
  dismissedKeys?: Set<string>,
): Promise<MonitoringFeedItem[]> {
  const [companySignals] = await Promise.all([
    getCompanySignals(ctx.watchlist),
  ]);

  const roleSignals   = getRoleSignals(ctx.hybridResult);
  const marketSignals = getMarketSignals(ctx.hybridResult);
  const personalSignals = getPersonalSignals(
    ctx.hybridResult,
    ctx.actionsCompleted ?? 0,
    ctx.actionsDue ?? 0,
    ctx.financialRunwayMonths ?? null,
  );

  const all = [...companySignals, ...roleSignals, ...marketSignals, ...personalSignals]
    .filter(item => !dismissedKeys?.has(item.id))
    .sort((a, b) => {
      const severityDiff = SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity];
      if (severityDiff !== 0) return severityDiff;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

  return all;
}
