// detectors/index.ts — Phase 3 (Detection Network): pure change-detectors.
//
// Rule 3 ("predict less, detect more") + Rule 11 ("monitor forever"): each
// detector compares a stored baseline to a current signal and returns an alert
// ONLY when something meaningfully CHANGED — never on sustained state. Every
// alert carries causal evidence (what happened / why), so it slots straight into
// the one-alert UI. Pure + deterministic → unit-testable and reused by both the
// client (audit-derived signals) and the edge function (its own Deno copy of the
// news/stagnation logic, kept in lock-step with these).

export type AlertSeverity = 'critical' | 'high' | 'info';
export type AlertCategory = 'company' | 'market' | 'skill' | 'financial' | 'score' | 'opportunity';

export interface DetectedAlert {
  detector: string;
  dedupeKey: string;
  severity: AlertSeverity;
  category: AlertCategory;
  headline: string;
  detail: string;
  evidence: string;       // causal "what happened / why" (Rule 3)
  toolLink?: string;
}

/** Baselines persisted per user on career_twin_state.detector_baselines. */
export interface DetectorBaselines {
  lastNewsAtMs?: number;       // detected_at of the latest news event we alerted on
  demandIndex?: number;        // last role-market demand index seen
  compDeltaPct?: number;       // last pay-vs-market delta
  fitScore?: number;           // last skill-market fit
  stagnationKey?: string;      // dedupe window we last flagged
}

// ── Demand shift ───────────────────────────────────────────────────────────────
// Fires when role-market demand moves >= 8 points since the last audit.
export function demandShiftDetector(
  baseline: number | undefined,
  current: number | undefined,
  trend?: string,
): DetectedAlert | null {
  if (baseline == null || current == null) return null;
  const delta = Math.round(current - baseline);
  if (Math.abs(delta) < 8) return null;
  const up = delta > 0;
  return {
    detector: 'demand_shift',
    dedupeKey: `demand:${Math.round(baseline)}->${Math.round(current)}`,
    severity: up ? 'info' : Math.abs(delta) >= 15 ? 'high' : 'info',
    category: 'market',
    headline: up
      ? `Demand for your role jumped ${delta} points`
      : `Demand for your role dropped ${Math.abs(delta)} points`,
    detail: up
      ? `The market for your role is heating up — a stronger window to move or negotiate.`
      : `The market for your role is cooling — build optionality before it tightens further.`,
    evidence: `Role-market demand moved from ${Math.round(baseline)}/100 to ${Math.round(current)}/100${trend ? ` (trend: ${trend})` : ''} since your last audit.`,
    toolLink: '/tools/market-intel',
  };
}

// ── Compensation gap crossing ──────────────────────────────────────────────────
// Fires when pay-vs-market crosses into materially-underpaid territory.
export function compGapDetector(
  baseline: number | undefined,
  current: number | undefined,
): DetectedAlert | null {
  if (current == null) return null;
  // Only fire on the downward crossing past -15% (avoids nagging while sustained).
  const crossed = (baseline == null || baseline > -15) && current <= -15;
  if (!crossed) return null;
  return {
    detector: 'comp_gap',
    dedupeKey: `comp:${Math.round(current)}`,
    severity: current <= -25 ? 'high' : 'info',
    category: 'financial',
    headline: `You're now ${Math.abs(Math.round(current))}% below market pay`,
    detail: `A widening pay gap is both a retention risk for you and leverage in a negotiation or a move.`,
    evidence: `Your pay-vs-market estimate crossed below −15% (now ${Math.round(current)}%) since your last audit.`,
    toolLink: '/tools/strategy',
  };
}

// ── Career stagnation ──────────────────────────────────────────────────────────
// Fires when score has plateaued across the last 3+ audits and no outcomes were
// logged — the user is monitoring but not moving (Rule 8: solve adaptation).
export function stagnationDetector(
  history: Array<{ date: string; score: number }>,
  outcomesLogged: number,
): DetectedAlert | null {
  if (history.length < 3) return null;
  const last3 = history.slice(-3);
  const scores = last3.map(h => h.score);
  const range = Math.max(...scores) - Math.min(...scores);
  if (range > 3) return null;            // still moving — not stagnant
  if (outcomesLogged > 0) return null;   // taking action — not stagnant
  const windowKey = `${last3[0].date}_${last3[2].date}`;
  return {
    detector: 'stagnation',
    dedupeKey: `stagnation:${windowKey}`,
    severity: 'info',
    category: 'score',
    headline: `Your risk score has been flat across your last 3 audits`,
    detail: `Monitoring without action keeps you exactly where you are. One concrete move this week changes the trajectory.`,
    evidence: `Scores ${scores.join(' → ')} (range ${range} pts) with no outcomes logged — a plateau, not progress.`,
    toolLink: '/tools/strategy',
  };
}

// ── News event → alert (shape only; the EF queries breaking_news_events) ───────
export function newsEventToAlert(event: {
  id: string; company_name: string; headline: string; event_date: string;
  percent_cut: number | null; confidence: string;
}): DetectedAlert {
  const pct = event.percent_cut ?? null;
  const severity: AlertSeverity =
    event.confidence === 'high' || (pct != null && pct >= 10) ? 'critical'
    : pct != null && pct >= 3 ? 'high' : 'info';
  return {
    detector: 'news_event',
    dedupeKey: `news:${event.id}`,
    severity,
    category: 'company',
    headline: `Layoff signal at ${event.company_name}`,
    detail: event.headline,
    evidence: `Detected ${event.event_date}${pct != null ? ` · ~${pct}% cut` : ''} · confidence ${event.confidence}. This is a company on your watchlist.`,
    toolLink: '/tools/layoff-defense',
  };
}

const SEVERITY_WEIGHT: Record<AlertSeverity, number> = { critical: 3, high: 2, info: 1 };

/** Sort alerts most-severe first (UI shows one at a time). */
export function rankAlerts<T extends { severity: AlertSeverity }>(alerts: T[]): T[] {
  return [...alerts].sort((a, b) => SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity]);
}
