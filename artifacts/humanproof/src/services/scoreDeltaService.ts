// ═══════════════════════════════════════════════════════════════════════
// scoreDeltaService.ts — Score History, Delta Tracking & Attribution
// Tracks user risk scores over time and explains WHY scores changed.
// The explanation quality is what drives re-engagement.
// ═══════════════════════════════════════════════════════════════════════

import { KEY_REGISTRY } from '../data/riskData';
import { getCareerIntelligence } from '../data/intelligence/index';

export interface ScoreHistoryEntry {
  roleKey: string;
  industryKey: string;
  countryKey: string;
  experience: string;
  score: number;
  timestamp: number; // unix ms
  isGrounded: boolean;
  // Generic breakdown — works for both L1-L5 (Layoff Audit) and D1-D6 (Oracle)
  // Values are 0–1 (raw engine output, multiplied by 100 in the attribution display)
  breakdown?: Record<string, number>;
  companyName?: string;
  // v6.0 Fix 3: Snapshot of company data signals at time of scoring.
  // Used by explainDimensionDelta() to produce specific driver text (actual field values)
  // rather than generic "financial signals worsened" prose.
  companySnapshot?: {
    stock90DayChange?: number | null;
    revenueGrowthYoY?: number | null;
    layoffRounds?: number;
    lastLayoffPercent?: number | null;
    aiInvestmentSignal?: string;
    employeeCount?: number;
    revenuePerEmployee?: number;
  };
}

export interface ScoreDelta {
  previous: number;
  current: number;
  delta: number;         // positive = risk increased, negative = risk decreased
  daysAgo: number;
  label: string;
  direction: 'up' | 'down' | 'same';
  // Enhanced: dimension-level attribution
  dimensionDeltas?: DimensionDelta[];
}

export interface DimensionDelta {
  key: string;
  label: string;
  previous: number;  // 0–100
  current: number;   // 0–100
  delta: number;     // points changed
  driver: string;    // human explanation of what drove this change
  /** Priority 7: "Had you built X skill, you could have offset Y% of this increase." */
  counterfactual?: string;
}

// ── Signal change detectors — map dimension changes to explanations ──────────
// These explanations are what turn a bare delta number into a decision-making tool.

const DIMENSION_LABELS: Record<string, string> = {
  L1: 'Company Financial Health',
  L2: 'Layoff & Instability History',
  L3: 'Role Displacement Risk',
  L4: 'Industry Headwinds',
  L5: 'Personal Protection',
  D6: 'AI Agent Capability',
  D7: 'Unified Company Health',
};

/**
 * Generates a human-readable explanation for why a specific dimension changed.
 * The explanation references the actual score values and direction.
 */
function explainDimensionDelta(
  key: string,
  prev: number,
  curr: number,
  delta: number,
  companyName?: string,
  roleKey?: string,
  prevSnapshot?: ScoreHistoryEntry['companySnapshot'],
  currSnapshot?: ScoreHistoryEntry['companySnapshot'],
): { driver: string; counterfactual?: string } {
  const dir = delta > 0 ? 'increased' : 'decreased';
  const abs = Math.abs(delta);
  const co = companyName ?? 'your company';

  let driver: string;
  let counterfactual: string | undefined;

  switch (key) {
    case 'L1': {
      // v6.0 Fix 3: Use actual field values when snapshots are available
      const prevStock = prevSnapshot?.stock90DayChange;
      const currStock = currSnapshot?.stock90DayChange;
      const prevRev = prevSnapshot?.revenueGrowthYoY;
      const currRev = currSnapshot?.revenueGrowthYoY;

      if (currStock != null && prevStock != null && currStock !== prevStock) {
        const stockDir = currStock < prevStock ? 'worsened' : 'improved';
        driver = `${co}'s financial health ${dir} by ${abs} pts. Primary driver: stock 90-day return ${stockDir} from ${prevStock > 0 ? '+' : ''}${prevStock}% to ${currStock > 0 ? '+' : ''}${currStock}%.`;
        if (currRev != null && prevRev != null && currRev !== prevRev) {
          driver += ` Revenue growth also shifted from ${prevRev > 0 ? '+' : ''}${prevRev}% to ${currRev > 0 ? '+' : ''}${currRev}% YoY.`;
        }
      } else if (delta > 8) driver = `${co}'s financial health signals deteriorated significantly (+${abs} pts). Primary drivers: revenue deceleration, stock drawdown, or reduced cash runway detected in the latest OSINT pull.`;
      else if (delta > 3) driver = `${co}'s financial health weakened moderately (+${abs} pts). Revenue-per-employee or funding signals may have updated.`;
      else if (delta < -5) driver = `${co}'s financial health improved (${abs} pts lower risk). Likely driven by positive revenue trend or reduced overstaffing signals.`;
      else driver = `${co}'s financial health ${dir} by ${abs} pts. Latest financial signals reflect a minor shift.`;
      break;
    }

    case 'L2': {
      const prevRounds = prevSnapshot?.layoffRounds ?? 0;
      const currRounds = currSnapshot?.layoffRounds ?? 0;
      const currPct = currSnapshot?.lastLayoffPercent;

      if (currRounds > prevRounds && currPct != null) {
        driver = `A new layoff event was detected for ${co} (+${abs} pts). The event represented approximately ${currPct}% of the workforce, bringing the total to ${currRounds} layoff round${currRounds !== 1 ? 's' : ''} in the past 24 months. Documented cuts raise near-term risk sharply.`;
      } else if (delta > 8) driver = `A new layoff event was detected for ${co} (+${abs} pts). This is the most significant driver — documented cuts in the last 24 months raise near-term risk sharply.`;
      else if (delta > 3) driver = `Layoff history signals for ${co} ${dir} (+${abs} pts). A recent event may have been added to the tracking window or sector contagion increased.`;
      else if (delta < -5) driver = `${co}'s layoff history risk dropped (${abs} pts lower) as a prior event aged out of the 24-month tracking window.`;
      else driver = `Layoff history for ${co} ${dir} by ${abs} pts. Minor signal updates from the layoff tracking database.`;
      break;
    }

    case 'L3': {
      if (delta > 5) driver = `AI displacement risk for your role category ${dir} (+${abs} pts). AI tool maturity in your domain likely advanced — new enterprise deployments detected in sector intelligence.`;
      else if (delta < -5) driver = `Role displacement risk ${dir} (${abs} pts lower). New intelligence shows higher human-augmentation value for this role than previously modeled.`;
      else driver = `Role displacement risk ${dir} by ${abs} pts. Industry AI adoption rate updates may have affected this dimension.`;

      // Priority 7: Counterfactual — what skill would have offset this L3 increase?
      if (delta > 5 && roleKey) {
        try {
          const intel = getCareerIntelligence(roleKey);
          const topSafe = intel?.skills?.safe?.[0];
          if (topSafe) {
            const offsetPts = Math.min(abs, Math.round((topSafe.longTermValue / 100) * 12));
            const offsetPct = Math.round((offsetPts / abs) * 100);
            const hypotheticalScore = Math.round(curr - offsetPts);
            counterfactual = `Counterfactual: had you developed "${topSafe.skill}" (long-term value: ${topSafe.longTermValue}/100) to proficiency before this reassessment, your L3 score would be approximately ${hypotheticalScore}/100 — offsetting ${offsetPct}% of this ${abs}-point increase. This is the upskilling action with the highest return on the next audit.`;
          }
        } catch { /* role intelligence unavailable — skip counterfactual */ }
      }
      break;
    }

    case 'L4':
      if (delta > 5) driver = `Industry headwinds increased (+${abs} pts). More peer companies in your sector announced workforce reductions in the last 180 days, raising the sector contagion signal.`;
      else if (delta < -5) driver = `Industry headwinds decreased (${abs} pts lower). Fewer sector-wide layoff events were recorded, improving the sector contagion baseline.`;
      else driver = `Industry conditions ${dir} by ${abs} pts. Sector AI adoption rate or growth outlook may have been revised.`;
      break;

    case 'L5':
      if (delta > 3) driver = `Personal protection score ${dir} (+${abs} pts risk increase). This may reflect updated tenure bracket calculations or a change in performance-tier weighting.`;
      else if (delta < -3) driver = `Personal protection improved (${abs} pts lower risk). Tenure accumulation, promotion signals, or relationship capital changes contributed.`;
      else driver = `Personal protection factors ${dir} by ${abs} pts.`;
      break;

    case 'D6':
      if (delta > 5) driver = `AI agent capability for your role ${dir} (+${abs} pts). Autonomous AI systems are demonstrating increased coverage of tasks in your role category.`;
      else driver = `AI agent capability ${dir} by ${abs} pts as enterprise AI deployment patterns updated.`;
      break;

    case 'D7': {
      // v6.0 Fix 3: D7 = Unified Company Health Risk (L1 + L2 + AI adoption + leadership proxy)
      const prevCsuite = prevSnapshot?.stock90DayChange; // proxy — use snapshot fields available
      if (delta > 5) {
        driver = `Company health risk ${dir} (+${abs} pts). D7 blends financial health, layoff history, AI adoption speed, and leadership stability. A significant increase typically reflects: CEO tenure change, C-suite departures, or accelerated AI investment signal. Check the Company Profile tab for the specific leadership stability signals.`;
      } else if (delta < -5) {
        driver = `Company health risk improved (${abs} pts lower). Leadership stability or financial health signals moved favourably since last assessment.`;
      } else {
        driver = `Unified company health risk ${dir} by ${abs} pts. Minor updates to financial, layoff history, AI adoption, or leadership signals.`;
      }
      break;
    }

    default:
      driver = `${DIMENSION_LABELS[key] ?? key} ${dir} by ${abs} pts.`;
  }

  return { driver, counterfactual };
}

const MAX_HISTORY = 50;

export function loadScoreHistory(): ScoreHistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY_REGISTRY.SCORE_HISTORY);
    if (!raw) return [];
    return JSON.parse(raw) as ScoreHistoryEntry[];
  } catch {
    return [];
  }
}

export function recordScore(entry: ScoreHistoryEntry): void {
  try {
    const history = loadScoreHistory();
    const oneDayAgo = Date.now() - 86_400_000;

    const filtered = history.filter(h =>
      !(h.roleKey === entry.roleKey &&
        h.countryKey === entry.countryKey &&
        h.experience === entry.experience &&
        h.timestamp > oneDayAgo)
    );

    filtered.unshift(entry);
    const trimmed = filtered.slice(0, MAX_HISTORY);
    localStorage.setItem(KEY_REGISTRY.SCORE_HISTORY, JSON.stringify(trimmed));
  } catch { /* localStorage unavailable */ }
}

/**
 * Get score delta with full dimension-level attribution.
 * This is the function that turns "your score went from 68 to 74" into
 * "here is exactly which signals changed and why."
 */
export function getScoreDelta(
  roleKey: string,
  currentScore: number,
  experience: string,
  countryKey: string,
): ScoreDelta | null {
  try {
    const history = loadScoreHistory();
    const sameRole = history.filter(h =>
      h.roleKey === roleKey &&
      h.experience === experience &&
      h.countryKey === countryKey
    );

    if (sameRole.length < 2) return null;

    const previous = sameRole[1];
    const delta = currentScore - previous.score;
    const daysAgo = Math.round((Date.now() - previous.timestamp) / 86_400_000);

    let label: string;
    let direction: 'up' | 'down' | 'same';

    if (Math.abs(delta) < 1) {
      label = 'No change vs last assessment';
      direction = 'same';
    } else if (delta > 0) {
      label = `↑${Math.abs(delta)} pts vs ${daysAgo}d ago`;
      direction = 'up';
    } else {
      label = `↓${Math.abs(delta)} pts vs ${daysAgo}d ago`;
      direction = 'down';
    }

    return { previous: previous.score, current: currentScore, delta, daysAgo, label, direction };
  } catch {
    return null;
  }
}

/**
 * Get full attributed delta comparing current HybridResult against previous stored entry.
 * Returns null if no previous assessment exists for this role/country/experience.
 */
export function getAttributedDelta(
  roleKey: string,
  currentScore: number,
  currentBreakdown: Record<string, number>,
  experience: string,
  countryKey: string,
  companyName?: string,
): ScoreDelta | null {
  try {
    const history = loadScoreHistory();
    const sameRole = history.filter(h =>
      h.roleKey === roleKey &&
      h.experience === experience &&
      h.countryKey === countryKey
    );

    if (sameRole.length < 2) return null;

    const previous = sameRole[1];
    const delta = Math.round(currentScore - previous.score);
    const daysAgo = Math.round((Date.now() - previous.timestamp) / 86_400_000);

    let direction: 'up' | 'down' | 'same' = 'same';
    let label = 'No change vs last assessment';
    if (Math.abs(delta) >= 1) {
      direction = delta > 0 ? 'up' : 'down';
      label = delta > 0
        ? `↑${Math.abs(delta)} pts vs ${daysAgo}d ago — risk increased`
        : `↓${Math.abs(delta)} pts vs ${daysAgo}d ago — risk improved`;
    }

    // Build dimension-level attribution if we have previous breakdown
    const dimensionDeltas: DimensionDelta[] = [];
    if (previous.breakdown) {
      const KEYS = ['L1', 'L2', 'L3', 'L4', 'L5', 'D6', 'D7'] as const;
      for (const k of KEYS) {
        const prevVal = (previous.breakdown as any)[k];
        const currVal = currentBreakdown[k];
        if (prevVal == null || currVal == null) continue;
        // Breakdown stored as 0–1, display as 0–100
        const prevScore = Math.round(prevVal * 100);
        const currScore = Math.round(currVal * 100);
        const dimDelta = currScore - prevScore;
        if (Math.abs(dimDelta) < 2) continue; // filter noise
        dimensionDeltas.push({
          key: k,
          label: DIMENSION_LABELS[k] ?? k,
          previous: prevScore,
          current: currScore,
          delta: dimDelta,
          ...explainDimensionDelta(k, prevScore, currScore, dimDelta, companyName, roleKey, previous.companySnapshot, undefined),
        });
      }
      // Sort by absolute delta descending — show biggest drivers first
      dimensionDeltas.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    }

    return {
      previous: previous.score,
      current: currentScore,
      delta,
      daysAgo,
      label,
      direction,
      dimensionDeltas: dimensionDeltas.length > 0 ? dimensionDeltas : undefined,
    };
  } catch {
    return null;
  }
}

export function getBestScore(): ScoreHistoryEntry | null {
  const history = loadScoreHistory();
  if (!history.length) return null;
  return history.reduce((best, curr) => curr.score < best.score ? curr : best);
}

export function getAssessedRoles(): string[] {
  const history = loadScoreHistory();
  return [...new Set(history.map(h => h.roleKey))];
}

// ── Score Velocity (v7.0 Fix 2) ───────────────────────────────────────────────
// Score velocity answers: "Am I getting worse faster than I thought?"
// A +12pt jump in 30 days warrants a different action plan than a stable 58.

export type ScoreVelocityDirection = 'accelerating' | 'stable' | 'improving';

export interface ScoreVelocity {
  /** Score change in the last 30 days (positive = risk increased) */
  delta30d:    number | null;
  /** Score change in the last 90 days */
  delta90d:    number | null;
  /** Characterisation of velocity direction */
  direction:   ScoreVelocityDirection;
  /** Extra risk added by rate-of-change (0–0.08) — fed into final score as a small modifier */
  velocityRiskAddon: number;
}

/**
 * Compute score velocity for a specific role/experience/country combination.
 * Returns null when history is insufficient (< 2 entries matching the profile).
 *
 * velocityRiskAddon:
 *   +0.06  delta30d > 10  (rapidly deteriorating — tighten action timeline)
 *   +0.03  delta30d 5–10 (moderately deteriorating)
 *   0.00   delta30d ±5   (stable)
 *  -0.02   delta30d < -5  (improving — small credit, don't over-reward)
 */
export function computeScoreVelocity(
  roleKey: string,
  currentScore: number,
  experience: string,
  countryKey: string,
): ScoreVelocity | null {
  try {
    const history = loadScoreHistory();
    const sameRole = history
      .filter(h => h.roleKey === roleKey && h.experience === experience && h.countryKey === countryKey)
      .sort((a, b) => b.timestamp - a.timestamp);  // newest first

    if (sameRole.length < 2) return null;

    const now   = Date.now();
    const MS30  = 30  * 86_400_000;
    const MS90  = 90  * 86_400_000;

    // Find the most recent entry at ≥25 days ago (allow small timing variance)
    const baseline30 = sameRole.find(h => (now - h.timestamp) >= 25 * 86_400_000);
    const baseline90 = sameRole.find(h => (now - h.timestamp) >= 80 * 86_400_000);

    const delta30d = baseline30 ? currentScore - baseline30.score : null;
    const delta90d = baseline90 ? currentScore - baseline90.score : null;

    // Use 30d delta as the primary velocity signal; fall back to 90d
    const primaryDelta = delta30d ?? delta90d ?? 0;
    let direction: ScoreVelocityDirection;
    let velocityRiskAddon: number;

    if (primaryDelta > 5) {
      direction        = 'accelerating';
      velocityRiskAddon = primaryDelta > 10 ? 0.06 : 0.03;
    } else if (primaryDelta < -5) {
      direction        = 'improving';
      velocityRiskAddon = -0.02;
    } else {
      direction        = 'stable';
      velocityRiskAddon = 0;
    }

    return { delta30d, delta90d, direction, velocityRiskAddon };
  } catch {
    return null;
  }
}

/**
 * Returns the user's "return type" — used to frame Tier A LLM responses
 * differently for first-time vs returning users, and to suppress
 * already-completed actions from the action plan.
 */
export type UserReturnType =
  | 'first_time'        // no prior audits for this role
  | 'stable_returner'   // returning, score unchanged (±4 pts)
  | 'improving'         // returning, score improved (>4 pts lower)
  | 'declining'         // returning, score worsened (>4 pts higher)
  | 'crisis';           // returning + score worsened rapidly (>10 pts in 30d)

export function getUserReturnType(
  roleKey: string,
  currentScore: number,
  experience: string,
  countryKey: string,
): UserReturnType {
  const history = loadScoreHistory()
    .filter(h => h.roleKey === roleKey && h.experience === experience && h.countryKey === countryKey)
    .sort((a, b) => b.timestamp - a.timestamp);

  if (history.length < 2) return 'first_time';

  const velocity = computeScoreVelocity(roleKey, currentScore, experience, countryKey);
  const delta    = history[0].score - (history[1]?.score ?? history[0].score);

  if (velocity?.direction === 'accelerating' && (velocity.delta30d ?? 0) > 10) return 'crisis';
  if (delta > 4)  return 'declining';
  if (delta < -4) return 'improving';
  return 'stable_returner';
}
