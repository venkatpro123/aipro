// userAlertsService.ts — Phase 3 (Detection Network): client side of user_alerts.
//
// Reads alerts the scheduled edge function persisted "while you were away", and
// runs the audit-derived detectors (demand/comp shifts — they need the live
// audit, so the EF can't) against per-user baselines, persisting any new alerts
// to the SAME table. CareerAlertCenter then renders one ranked alert. RLS gates
// reads/writes to the user's own rows; baselines live on career_twin_state.

import { supabase } from '../utils/supabase';
import type { HybridResult } from '../types/hybridResult';
import {
  demandShiftDetector,
  compGapDetector,
  type DetectedAlert,
  type DetectorBaselines,
  type AlertSeverity,
  type AlertCategory,
} from './detectors';

export interface UserAlert {
  id: string;
  detector: string;
  severity: AlertSeverity;
  category: AlertCategory;
  headline: string;
  detail: string;
  evidence: string | null;
  toolLink: string | null;
  detectedAt: string;
  seenAt: string | null;
}

const SEVERITY_WEIGHT: Record<AlertSeverity, number> = { critical: 3, high: 2, info: 1 };

function rowToAlert(r: Record<string, unknown>): UserAlert {
  return {
    id: r.id as string,
    detector: r.detector as string,
    severity: r.severity as AlertSeverity,
    category: r.category as AlertCategory,
    headline: r.headline as string,
    detail: r.detail as string,
    evidence: (r.evidence as string) ?? null,
    toolLink: (r.tool_link as string) ?? null,
    detectedAt: r.detected_at as string,
    seenAt: (r.seen_at as string) ?? null,
  };
}

/** Active (undismissed) alerts for the user, most-severe + newest first. */
export async function getUserAlerts(userId: string): Promise<UserAlert[]> {
  try {
    const { data } = await supabase
      .from('user_alerts')
      .select('id, detector, severity, category, headline, detail, evidence, tool_link, detected_at, seen_at')
      .eq('user_id', userId)
      .is('dismissed_at', null)
      .order('detected_at', { ascending: false })
      .limit(20);
    return ((data ?? []) as Record<string, unknown>[])
      .map(rowToAlert)
      .sort((a, b) => SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity]);
  } catch {
    return [];
  }
}

export async function markAlertSeen(id: string): Promise<void> {
  try { await supabase.from('user_alerts').update({ seen_at: new Date().toISOString() }).eq('id', id); } catch { /* */ }
}

export async function dismissUserAlert(id: string): Promise<void> {
  try { await supabase.from('user_alerts').update({ dismissed_at: new Date().toISOString() }).eq('id', id); } catch { /* */ }
}

async function getBaselines(userId: string): Promise<DetectorBaselines> {
  try {
    const { data } = await supabase
      .from('career_twin_state').select('detector_baselines').eq('user_id', userId).maybeSingle();
    return ((data as Record<string, unknown>)?.detector_baselines as DetectorBaselines) ?? {};
  } catch { return {}; }
}

async function mergeBaselines(userId: string, patch: Partial<DetectorBaselines>): Promise<void> {
  try {
    const current = await getBaselines(userId);
    await supabase.from('career_twin_state')
      .update({ detector_baselines: { ...current, ...patch } })
      .eq('user_id', userId);
  } catch { /* */ }
}

async function persistAlert(userId: string, a: DetectedAlert): Promise<void> {
  try {
    await supabase.from('user_alerts').upsert({
      user_id: userId, detector: a.detector, dedupe_key: a.dedupeKey, severity: a.severity,
      category: a.category, headline: a.headline, detail: a.detail, evidence: a.evidence,
      tool_link: a.toolLink ?? null,
    }, { onConflict: 'user_id,dedupe_key', ignoreDuplicates: true });
  } catch { /* */ }
}

/**
 * Run the audit-derived detectors against this user's baselines, persist any new
 * alerts, and advance the baselines. Called once per audit view. Returns the
 * count fired (for telemetry/debug).
 */
export async function runClientDetectors(userId: string, hr: HybridResult): Promise<number> {
  const anyHr = hr as any;
  const baselines = await getBaselines(userId);

  const curDemand = anyHr.roleMarketDemand?.demandIndex as number | undefined;
  const curComp = anyHr.compensationRisk?.marketDeltaPct as number | undefined;
  const trend = anyHr.roleMarketDemand?.demandTrend as string | undefined;

  let fired = 0;
  const demand = demandShiftDetector(baselines.demandIndex, curDemand, trend);
  if (demand) { await persistAlert(userId, demand); fired++; }
  const comp = compGapDetector(baselines.compDeltaPct, curComp);
  if (comp) { await persistAlert(userId, comp); fired++; }

  // Advance baselines to current so the next audit detects the NEXT change.
  const patch: Partial<DetectorBaselines> = {};
  if (curDemand != null) patch.demandIndex = curDemand;
  if (curComp != null) patch.compDeltaPct = curComp;
  if (Object.keys(patch).length) await mergeBaselines(userId, patch);

  return fired;
}
